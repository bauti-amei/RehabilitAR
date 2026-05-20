from rest_framework import serializers
from .models import Clase


class ListaEsperaUserSerializer(serializers.Serializer):
    id             = serializers.IntegerField()
    nombre         = serializers.SerializerMethodField()
    email          = serializers.EmailField()
    telefono       = serializers.CharField(source='phone')

    def get_nombre(self, obj):
        return obj.full_name


class ClaseSerializer(serializers.ModelSerializer):
    profesor_nombre     = serializers.SerializerMethodField()
    horario             = serializers.ReadOnlyField()
    cantidad_inscriptos = serializers.ReadOnlyField()
    lista_espera        = serializers.SerializerMethodField()
    en_curso            = serializers.ReadOnlyField()

    class Meta:
        model  = Clase
        fields = [
            'id', 'tipo', 'horario_inicio', 'horario_fin', 'horario',
            'dias', 'aula', 'cupo', 'profesor', 'profesor_nombre',
            'cantidad_inscriptos', 'lista_espera', 'en_curso',
        ]

    def get_profesor_nombre(self, obj):
        if obj.profesor:
            return obj.profesor.full_name
        return None

    def get_lista_espera(self, obj):
        return ListaEsperaUserSerializer(obj.lista_espera.all(), many=True).data
