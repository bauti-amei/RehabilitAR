from datetime import datetime
from rest_framework import serializers
from .models import Clase, Sala, DIAS_SEMANA


class InscriptoSerializer(serializers.Serializer):
    """Usuario inscripto en una clase (para el panel del profesor)."""
    id       = serializers.IntegerField()
    nombre   = serializers.SerializerMethodField()
    email    = serializers.EmailField()
    telefono = serializers.CharField(source='phone')

    def get_nombre(self, obj):
        return obj.full_name


# Alias para lista de espera (mismos campos)
ListaEsperaUserSerializer = InscriptoSerializer


class ClaseProfesorSerializer(serializers.ModelSerializer):
    """Serializer completo para el panel del profesor: incluye inscriptos con detalle."""
    horario             = serializers.ReadOnlyField()
    aula                = serializers.ReadOnlyField()
    cantidad_inscriptos = serializers.ReadOnlyField()
    especialidad_display = serializers.SerializerMethodField()
    inscriptos_detalle  = serializers.SerializerMethodField()

    class Meta:
        model  = Clase
        fields = [
            'id', 'nombre', 'especialidad', 'especialidad_display',
            'tipo_clase', 'fecha', 'valor', 'descripcion',
            'horario_inicio', 'horario_fin', 'horario',
            'dias', 'aula', 'cupo', 'cantidad_inscriptos',
            'inscriptos_detalle', 'en_curso',
        ]

    def get_especialidad_display(self, obj):
        return obj.get_especialidad_display()

    def get_inscriptos_detalle(self, obj):
        return InscriptoSerializer(obj.inscriptos.all(), many=True).data


class ClaseSerializer(serializers.ModelSerializer):
    profesor_nombre     = serializers.SerializerMethodField()
    horario             = serializers.ReadOnlyField()
    aula                = serializers.ReadOnlyField()
    cantidad_inscriptos = serializers.ReadOnlyField()
    lista_espera        = serializers.SerializerMethodField()
    en_curso            = serializers.ReadOnlyField()
    especialidad_display = serializers.SerializerMethodField()

    class Meta:
        model  = Clase
        fields = [
            'id', 'nombre', 'especialidad', 'especialidad_display',
            'tipo_clase', 'fecha', 'valor', 'descripcion', 'ofertada',
            'horario_inicio', 'horario_fin', 'horario',
            'dias', 'sala', 'aula', 'cupo', 'profesor', 'profesor_nombre',
            'cantidad_inscriptos', 'lista_espera', 'en_curso',
        ]

    def get_profesor_nombre(self, obj):
        return obj.profesor.full_name if obj.profesor else None

    def get_lista_espera(self, obj):
        return ListaEsperaUserSerializer(obj.lista_espera.all(), many=True).data

    def get_especialidad_display(self, obj):
        return obj.get_especialidad_display()


# ── Clase resumida para el calendario de sala ─────────────
class ClaseCalendarioSerializer(serializers.ModelSerializer):
    horario = serializers.ReadOnlyField()

    class Meta:
        model  = Clase
        fields = ['id', 'nombre', 'horario_inicio', 'horario_fin', 'horario', 'dias', 'fecha', 'tipo_clase', 'cupo']


# ── Sala ──────────────────────────────────────────────────
class SalaSerializer(serializers.ModelSerializer):
    clases       = ClaseCalendarioSerializer(many=True, read_only=True)
    total_clases = serializers.SerializerMethodField()

    class Meta:
        model  = Sala
        fields = ['id', 'nombre', 'capacidad', 'total_clases', 'clases']

    def get_total_clases(self, obj):
        return obj.clases.count()


class SalaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Sala
        fields = ['id', 'nombre', 'capacidad']

    def validate_nombre(self, value):
        if Sala.objects.filter(nombre__iexact=value).exists():
            raise serializers.ValidationError('Ya existe una sala con ese nombre.')
        return value


# ── Crear clase ───────────────────────────────────────────
def _times_overlap(ini1, fin1, ini2, fin2):
    """True si los rangos horarios se superponen."""
    return ini1 < fin2 and ini2 < fin1


class ClaseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Clase
        fields = [
            'nombre', 'especialidad', 'tipo_clase',
            'horario_inicio', 'horario_fin',
            'dias', 'fecha',
            'sala', 'cupo', 'valor',
            'profesor', 'ofertada', 'descripcion',
        ]
        extra_kwargs = {
            'dias':        {'required': False},
            'fecha':       {'required': False, 'allow_null': True},
            'profesor':    {'required': False, 'allow_null': True},
            'descripcion': {'required': False, 'allow_blank': True},
            'ofertada':    {'required': False},
        }

    def validate_nombre(self, value):
        if Clase.objects.filter(nombre__iexact=value).exists():
            raise serializers.ValidationError('Ya existe una clase con ese nombre.')
        return value

    def validate(self, data):
        tipo         = data.get('tipo_clase')
        horario_ini  = data.get('horario_inicio')
        horario_fin  = data.get('horario_fin')
        dia          = data.get('dias')
        fecha        = data.get('fecha')
        sala         = data.get('sala')
        cupo         = data.get('cupo')
        especialidad = data.get('especialidad')
        profesor     = data.get('profesor')

        # Horario consistente
        if horario_ini and horario_fin and horario_ini >= horario_fin:
            raise serializers.ValidationError('El horario de inicio debe ser anterior al horario de fin.')

        # Tipo: fija requiere dia, individual requiere fecha
        if tipo == 'fija':
            if not dia:
                raise serializers.ValidationError('Para una clase fija debés indicar el día de la semana.')
            if dia not in DIAS_SEMANA:
                raise serializers.ValidationError(f'Día inválido. Opciones: {", ".join(DIAS_SEMANA)}')
            data['fecha'] = None   # limpia fecha para clases fijas
        elif tipo == 'individual':
            if not fecha:
                raise serializers.ValidationError('Para una clase individual debés indicar la fecha.')
            # Derivar el dia de la semana desde la fecha
            data['dias'] = DIAS_SEMANA[fecha.weekday()]

        # Cupo no puede superar la capacidad de la sala
        if sala and cupo and cupo > sala.capacidad:
            raise serializers.ValidationError(
                f'El cupo ({cupo}) supera la capacidad máxima de la sala "{sala.nombre}" ({sala.capacidad}).'
            )

        # Verificar disponibilidad de la sala
        if sala and horario_ini and horario_fin:
            clases_sala = Clase.objects.filter(sala=sala)
            dia_nuevo = data.get('dias')

            for c in clases_sala:
                if not _times_overlap(horario_ini, horario_fin, c.horario_inicio, c.horario_fin):
                    continue
                # Hay solapamiento de horario — verificar si es el mismo día
                if tipo == 'fija':
                    if c.tipo_clase == 'fija' and c.dias == dia_nuevo:
                        raise serializers.ValidationError(
                            f'La sala "{sala.nombre}" ya tiene la clase "{c.nombre}" el {dia_nuevo} en ese horario.'
                        )
                    if c.tipo_clase == 'individual' and c.fecha:
                        if DIAS_SEMANA[c.fecha.weekday()] == dia_nuevo:
                            raise serializers.ValidationError(
                                f'La sala "{sala.nombre}" tiene la clase "{c.nombre}" el {dia_nuevo} en ese horario.'
                            )
                elif tipo == 'individual':
                    if c.tipo_clase == 'individual' and c.fecha == fecha:
                        raise serializers.ValidationError(
                            f'La sala "{sala.nombre}" ya tiene la clase "{c.nombre}" ese día en ese horario.'
                        )
                    if c.tipo_clase == 'fija' and c.dias == dia_nuevo:
                        raise serializers.ValidationError(
                            f'La sala "{sala.nombre}" tiene la clase fija "{c.nombre}" los {dia_nuevo} en ese horario.'
                        )

        # Validar especialidad del profesor
        if profesor:
            prof_espec = [e.strip() for e in profesor.especialidades.split(',') if e.strip()]
            if especialidad and especialidad not in prof_espec:
                raise serializers.ValidationError(
                    f'El profesor {profesor.full_name} no tiene la especialidad requerida para esta clase.'
                )

        return data

    def create(self, validated_data):
        return Clase.objects.create(**validated_data)
