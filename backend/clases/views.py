from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status

from django.core.mail import EmailMessage
from django.conf import settings

from .models import Clase, Sala, Reserva, Suscripcion
from .serializers import (
    ClaseSerializer, ClaseCreateSerializer,
    ClaseProfesorSerializer,
    SalaSerializer, SalaCreateSerializer,
)
from users.models import User
from users.serializers import UserSerializer

# ── Feriados Argentina 2025-2026 ──────────────────────────
FERIADOS = {
    '2025-01-01','2025-02-03','2025-02-04','2025-03-24','2025-04-02',
    '2025-04-18','2025-05-01','2025-05-25','2025-06-20','2025-07-09',
    '2025-08-18','2025-10-13','2025-11-24','2025-12-08','2025-12-25',
    '2026-01-01','2026-02-16','2026-02-17','2026-03-24','2026-04-02',
    '2026-04-03','2026-05-01','2026-05-25','2026-06-15','2026-07-09',
    '2026-08-17','2026-10-12','2026-11-20','2026-12-08','2026-12-25',
}

DIAS_A_WEEKDAY = {
    'Lunes': 0, 'Martes': 1, 'Miércoles': 2, 'Jueves': 3,
    'Viernes': 4, 'Sábado': 5, 'Domingo': 6,
}


def _ocurrencias_mes(clase, mes, anio):
    from datetime import date
    import calendar as cal_mod
    if clase.tipo_clase != 'fija':
        return []
    wd = DIAS_A_WEEKDAY.get(clase.dias)
    if wd is None:
        return []
    _, last = cal_mod.monthrange(anio, mes)
    return [date(anio, mes, d) for d in range(1, last + 1)
            if date(anio, mes, d).weekday() == wd]


def _ocurrencias_restantes(clase, mes, anio):
    from datetime import date
    today = date.today()
    return [d for d in _ocurrencias_mes(clase, mes, anio) if d >= today]


def _calcular_precio(clase, ocurrencias, descuentos_feriado=0):
    n = len(ocurrencias)
    precio_por_clase = float(clase.valor)
    precio_base = precio_por_clase * n
    descuento_mid = precio_base * 0.20 if n == 2 else 0
    descuento_feriados = precio_por_clase * descuentos_feriado
    total = max(precio_base - descuento_mid - descuento_feriados, 0)
    return {
        'precio_por_clase': precio_por_clase,
        'num_clases': n,
        'precio_base': precio_base,
        'descuento_mid_month': descuento_mid,
        'descuento_feriados': descuento_feriados,
        'total': total,
    }


class ClaseListView(APIView):
    """
    GET  /api/clases/          — lista todas las clases (admin)
    POST /api/clases/          — crea una clase nueva (admin)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)
        clases = Clase.objects.select_related('profesor', 'sala').prefetch_related('inscriptos', 'lista_espera').all()
        return Response(ClaseSerializer(clases, many=True).data)

    def post(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)
        serializer = ClaseCreateSerializer(data=request.data)
        if not serializer.is_valid():
            # Devolver el primer error como string
            errors = serializer.errors
            first = next(iter(errors.values()))
            msg = first[0] if isinstance(first, list) else str(first)
            return Response({'detail': str(msg)}, status=status.HTTP_400_BAD_REQUEST)
        clase = serializer.save()
        return Response(ClaseSerializer(clase).data, status=status.HTTP_201_CREATED)


class ClasePublicaListView(APIView):
    """GET /api/clases/publicas/ — acceso público."""
    permission_classes = [AllowAny]

    def get(self, request):
        clases = Clase.objects.select_related('profesor', 'sala').all()
        return Response(ClaseSerializer(clases, many=True).data)


class ClaseEnCursoListView(APIView):
    """GET /api/clases/en-curso/ — clases en curso ahora (admin)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)
        clases = Clase.objects.select_related('profesor', 'sala').prefetch_related('inscriptos', 'lista_espera').all()
        en_curso = [c for c in clases if c.en_curso]
        return Response(ClaseSerializer(en_curso, many=True).data)


class ProfesoresPorEspecialidadView(APIView):
    """
    GET /api/clases/profesores/?especialidad=tren_superior&tipo_clase=fija&dia=Lunes&horario_inicio=10:00&horario_fin=11:00
    GET /api/clases/profesores/?especialidad=tren_superior&tipo_clase=individual&fecha=2024-06-10&horario_inicio=10:00&horario_fin=11:00
    Devuelve profesores con esa especialidad y disponibles en el horario indicado (admin).
    """
    permission_classes = [IsAuthenticated]

    def _times_overlap(self, ini1, fin1, ini2, fin2):
        return ini1 < fin2 and ini2 < fin1

    def _profesor_ocupado(self, profesor, tipo_clase, dia, fecha, horario_inicio, horario_fin):
        """Devuelve True si el profesor tiene una clase que solapa con el horario dado.
        horario_inicio y horario_fin deben ser objetos datetime.time."""
        if not horario_inicio or not horario_fin:
            return False

        clases = Clase.objects.filter(profesor=profesor)
        for c in clases:
            if not self._times_overlap(horario_inicio, horario_fin, c.horario_inicio, c.horario_fin):
                continue
            # Hay solapamiento de horas — ahora verificar si es el mismo día
            if tipo_clase == 'fija':
                # Conflicto si la clase existente es fija en el mismo día,
                # o individual en una fecha que cae en ese día
                if c.tipo_clase == 'fija' and c.dias == dia:
                    return True
                if c.tipo_clase == 'individual' and c.fecha:
                    from datetime import date
                    DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
                    js_day = c.fecha.weekday()  # 0=Lun
                    if DIAS[js_day] == dia:
                        return True
            elif tipo_clase == 'individual':
                if not fecha:
                    continue
                from datetime import date
                DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
                try:
                    fecha_obj = date.fromisoformat(fecha)
                except ValueError:
                    continue
                dia_semana = DIAS[fecha_obj.weekday()]
                if c.tipo_clase == 'fija' and c.dias == dia_semana:
                    return True
                if c.tipo_clase == 'individual' and c.fecha and str(c.fecha) == fecha:
                    return True
        return False

    def get(self, request):
        from datetime import time as Time
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)

        especialidad    = request.query_params.get('especialidad', '')
        tipo_clase      = request.query_params.get('tipo_clase', '')
        dia             = request.query_params.get('dia', '')
        fecha           = request.query_params.get('fecha', '')
        horario_inicio  = request.query_params.get('horario_inicio', '')
        horario_fin     = request.query_params.get('horario_fin', '')

        profesores = list(User.objects.filter(role=User.Role.TEACHER, is_active=True))

        # Filtrar por especialidad
        if especialidad:
            profesores = [
                p for p in profesores
                if especialidad in [e.strip() for e in p.especialidades.split(',') if e.strip()]
            ]

        # Filtrar por disponibilidad de horario — convertir strings a time
        if horario_inicio and horario_fin and tipo_clase and (dia or fecha):
            try:
                h, m = horario_inicio.split(':')
                t_ini = Time(int(h), int(m))
                h, m = horario_fin.split(':')
                t_fin = Time(int(h), int(m))
                profesores = [
                    p for p in profesores
                    if not self._profesor_ocupado(p, tipo_clase, dia, fecha, t_ini, t_fin)
                ]
            except (ValueError, AttributeError):
                pass  # Si el formato es inválido, no filtrar por horario

        data = [{'id': p.id, 'nombre': p.full_name, 'email': p.email, 'especialidades': p.especialidades} for p in profesores]
        return Response(data)


class MisClasesView(APIView):
    """
    GET /api/clases/mis-clases/
    Devuelve las clases donde el profesor logueado está asignado.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.TEACHER:
            return Response({'detail': 'Solo profesores pueden acceder a este endpoint.'}, status=403)
        clases = (
            Clase.objects
            .filter(profesor=request.user)
            .select_related('sala')
            .prefetch_related('inscriptos')
        )
        return Response(ClaseProfesorSerializer(clases, many=True).data)


class ClasesOfertadasView(APIView):
    """
    GET /api/clases/ofertadas/
    Devuelve clases ofertadas (sin profesor asignado) disponibles
    para que un profesor se auto-asigne.
    Solo muestra las que coinciden con la especialidad del profesor.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.TEACHER:
            return Response({'detail': 'Solo profesores pueden acceder a este endpoint.'}, status=403)

        mis_especialidades = [
            e.strip() for e in request.user.especialidades.split(',') if e.strip()
        ]

        clases = (
            Clase.objects
            .filter(ofertada=True, profesor__isnull=True)
            .select_related('sala')
            .prefetch_related('inscriptos')
        )

        # Filtrar por especialidad del profesor
        if mis_especialidades:
            clases = clases.filter(especialidad__in=mis_especialidades)

        return Response(ClaseProfesorSerializer(clases, many=True).data)


class AsignarseClaseView(APIView):
    """
    POST /api/clases/<id>/asignarse/
    El profesor logueado se asigna a una clase ofertada.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != User.Role.TEACHER:
            return Response({'detail': 'Solo profesores pueden asignarse a clases.'}, status=403)

        try:
            clase = Clase.objects.get(pk=pk)
        except Clase.DoesNotExist:
            return Response({'detail': 'Clase no encontrada.'}, status=404)

        if not clase.ofertada:
            return Response({'detail': 'Esta clase no está disponible para asignación.'}, status=400)

        if clase.profesor is not None:
            return Response({'detail': 'Esta clase ya tiene un profesor asignado.'}, status=400)

        # Verificar especialidad
        mis_especialidades = [
            e.strip() for e in request.user.especialidades.split(',') if e.strip()
        ]
        if mis_especialidades and clase.especialidad not in mis_especialidades:
            return Response(
                {'detail': 'No tenés la especialidad requerida para esta clase.'},
                status=400
            )

        clase.profesor  = request.user
        clase.ofertada  = False   # ya no está disponible para otros
        clase.save(update_fields=['profesor', 'ofertada'])

        return Response({'detail': 'Te asignaste correctamente a la clase.'}, status=200)


class DesasignarseClaseView(APIView):
    """
    POST /api/clases/<id>/desasignarse/
    El profesor logueado se desasigna de una clase a la que estaba asignado.
    Regla de negocio: el profesor debe estar asignado a la clase.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != User.Role.TEACHER:
            return Response({'detail': 'Solo profesores pueden desasignarse de clases.'}, status=403)

        try:
            clase = Clase.objects.get(pk=pk)
        except Clase.DoesNotExist:
            return Response({'detail': 'Clase no encontrada.'}, status=404)

        if clase.profesor_id != request.user.id:
            return Response(
                {'detail': 'No estás asignado a esta clase.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        clase.profesor = None
        clase.ofertada = True    # vuelve a estar disponible para otros profesores
        clase.save(update_fields=['profesor', 'ofertada'])

        return Response(
            {'detail': 'Te desasignaste de la clase con éxito'},
            status=status.HTTP_200_OK,
        )


class AsignarProfesorView(APIView):
    """
    PATCH /api/clases/<id>/asignar-profesor/
    El admin asigna (o reasigna) un profesor a una clase existente.
    Body: { "profesor_id": <int> }
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)

        try:
            clase = Clase.objects.get(pk=pk)
        except Clase.DoesNotExist:
            return Response({'detail': 'Clase no encontrada.'}, status=404)

        profesor_id = request.data.get('profesor_id')
        if not profesor_id:
            return Response({'detail': 'Debés indicar un profesor.'}, status=400)

        try:
            profesor = User.objects.get(pk=profesor_id, role=User.Role.TEACHER, is_active=True)
        except User.DoesNotExist:
            return Response({'detail': 'Profesor no encontrado.'}, status=404)

        # Validar especialidad
        especialidades_prof = [e.strip() for e in profesor.especialidades.split(',') if e.strip()]
        if especialidades_prof and clase.especialidad not in especialidades_prof:
            return Response(
                {'detail': f'{profesor.full_name} no tiene la especialidad requerida para esta clase.'},
                status=400
            )

        clase.profesor = profesor
        clase.ofertada = False   # si estaba ofertada, ya no
        clase.save(update_fields=['profesor', 'ofertada'])

        return Response(ClaseSerializer(clase).data, status=200)

class DesasignarProfesorView(APIView):
    """
    PATCH /api/clases/<id>/desasignar-profesor/
    El admin quita al profesor asignado de una clase.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)

        try:
            clase = Clase.objects.get(pk=pk)
        except Clase.DoesNotExist:
            return Response({'detail': 'Clase no encontrada.'}, status=404)

        # Lógica exclusiva de desasignación
        clase.profesor = None
        clase.save(update_fields=['profesor'])

        return Response(ClaseSerializer(clase).data, status=200)

class SalaListCreateView(APIView):
    """
    GET  /api/clases/salas/ — lista salas (admin)
    POST /api/clases/salas/ — crea sala (admin)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)
        salas = Sala.objects.prefetch_related('clases').all().order_by('nombre')
        return Response(SalaSerializer(salas, many=True).data)

    def post(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)
        serializer = SalaCreateSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))[0]
            return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)
        sala = serializer.save()
        return Response(SalaSerializer(sala).data, status=status.HTTP_201_CREATED)

class ClasesFijasView(APIView):
    """
    GET /api/clases/fijas/
    Devuelve clases fijas disponibles para el usuario:
    excluye las que ya tiene suscripción activa y las que
    superponen horario con suscripciones existentes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clases = (Clase.objects.filter(tipo_clase='fija')
                  .select_related('profesor', 'sala')
                  .prefetch_related('inscriptos', 'lista_espera'))

        # Suscripciones activas del usuario (cualquier mes/año)
        suscripciones = (Suscripcion.objects
                         .filter(usuario=request.user, estado='activa')
                         .select_related('clase'))

        # IDs de clases a las que ya está suscripto
        ids_suscriptos = {s.clase_id for s in suscripciones}

        def tiene_conflicto(clase):
            # Ya suscripto a esta clase
            if clase.id in ids_suscriptos:
                return True
            # Superposición de día + horario con alguna suscripción activa
            wd_nueva = DIAS_A_WEEKDAY.get(clase.dias)
            if wd_nueva is None:
                return False
            for s in suscripciones:
                wd_existente = DIAS_A_WEEKDAY.get(s.clase.dias)
                if wd_existente == wd_nueva:
                    if (clase.horario_inicio < s.clase.horario_fin and
                            s.clase.horario_inicio < clase.horario_fin):
                        return True
            return False

        disponibles = [c for c in clases if not tiene_conflicto(c)]
        return Response(ClaseSerializer(disponibles, many=True).data)


class CalcularSuscripcionView(APIView):
    """GET /api/suscripciones/calcular/?clase_id=X&mes=5&anio=2026"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date
        from users.models import AptoFisico

        try:
            clase_id = int(request.query_params.get('clase_id', 0))
            mes      = int(request.query_params.get('mes',  date.today().month))
            anio     = int(request.query_params.get('anio', date.today().year))
        except (ValueError, TypeError):
            return Response({'detail': 'Parámetros inválidos.'}, status=400)

        try:
            clase = Clase.objects.select_related('profesor', 'sala').prefetch_related('inscriptos').get(pk=clase_id)
        except Clase.DoesNotExist:
            return Response({'detail': 'Clase no encontrada.'}, status=404)

        if clase.tipo_clase != 'fija':
            return Response({'detail': 'Solo se puede suscribir a clases fijas.'}, status=400)

        apto_aprobado = AptoFisico.objects.filter(usuario=request.user, estado='APROBADO').exists()
        ocurrencias   = _ocurrencias_restantes(clase, mes, anio)
        feriados_en   = [str(d) for d in ocurrencias if str(d) in FERIADOS]
        ya_suscripto  = Suscripcion.objects.filter(usuario=request.user, clase=clase, mes=mes, anio=anio).exists()

        conflictos = []
        for fecha in ocurrencias:
            for r in Reserva.objects.filter(usuario=request.user, fecha=fecha, estado='activa').select_related('clase'):
                if clase.horario_inicio < r.clase.horario_fin and r.clase.horario_inicio < clase.horario_fin:
                    conflictos.append({'fecha': str(fecha), 'clase_conflicto': r.clase.nombre})

        precio_info = _calcular_precio(clase, ocurrencias)

        return Response({
            'clase': ClaseSerializer(clase).data,
            'ocurrencias': [str(d) for d in ocurrencias],
            'feriados_en_ocurrencias': feriados_en,
            'apto_aprobado': apto_aprobado,
            'ya_suscripto': ya_suscripto,
            'conflictos': conflictos,
            **precio_info,
        })


class PagarSuscripcionView(APIView):
    """POST /api/suscripciones/pagar/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from datetime import date as Date
        from users.models import AptoFisico
        from django.core.mail import send_mail

        try:
            clase_id = int(request.data.get('clase_id', 0))
            mes      = int(request.data.get('mes', Date.today().month))
            anio     = int(request.data.get('anio', Date.today().year))
        except (ValueError, TypeError):
            return Response({'detail': 'Parámetros inválidos.'}, status=400)

        opciones_feriado = request.data.get('opciones_feriado', {})

        try:
            clase = Clase.objects.get(pk=clase_id, tipo_clase='fija')
        except Clase.DoesNotExist:
            return Response({'detail': 'Clase no encontrada.'}, status=404)

        if not AptoFisico.objects.filter(usuario=request.user, estado='APROBADO').exists():
            return Response({'detail': 'Necesitás un apto físico aprobado para suscribirte.'}, status=400)

        if Suscripcion.objects.filter(usuario=request.user, clase=clase, mes=mes, anio=anio).exists():
            return Response({'detail': 'Ya estás suscripto a esta clase este mes.'}, status=400)

        ocurrencias = _ocurrencias_restantes(clase, mes, anio)
        if not ocurrencias:
            return Response({'detail': 'No hay clases disponibles este mes.'}, status=400)

        descuentos_count = sum(
            1 for d in ocurrencias
            if str(d) in FERIADOS and opciones_feriado.get(str(d)) == 'descuento'
        )
        precio_info = _calcular_precio(clase, ocurrencias, descuentos_count)

        suscripcion = Suscripcion.objects.create(
            usuario=request.user,
            clase=clase,
            mes=mes,
            anio=anio,
            monto=precio_info['total'],
            estado='activa',
        )

        cupo_libre = clase.cupo - clase.inscriptos.count()
        tiene_activa = False

        for fecha in ocurrencias:
            fecha_str = str(fecha)
            es_feriado = fecha_str in FERIADOS
            opcion = opciones_feriado.get(fecha_str) if es_feriado else None

            if es_feriado and opcion == 'descuento':
                reserva = Reserva.objects.create(usuario=request.user, clase=clase, fecha=fecha, estado='cancelada', tipo='suscripcion')
            elif es_feriado and isinstance(opcion, dict):
                clase_alt_id  = opcion.get('clase_alt_id')
                fecha_alt_str = opcion.get('fecha_alt')
                clase_alt = None
                fecha_alt = None
                try:
                    clase_alt = Clase.objects.get(pk=clase_alt_id)
                    fecha_alt = Date.fromisoformat(fecha_alt_str)
                except Exception:
                    pass
                estado_r = 'activa' if cupo_libre > 0 else 'lista_espera'
                reserva = Reserva.objects.create(usuario=request.user, clase=clase, fecha=fecha,
                                                 estado=estado_r, clase_alt=clase_alt, fecha_alt=fecha_alt, tipo='suscripcion')
                if estado_r == 'activa':
                    cupo_libre -= 1
                    tiene_activa = True
            else:
                if cupo_libre > 0:
                    reserva = Reserva.objects.create(usuario=request.user, clase=clase, fecha=fecha, estado='activa', tipo='suscripcion')
                    cupo_libre -= 1
                    tiene_activa = True
                else:
                    reserva = Reserva.objects.create(usuario=request.user, clase=clase, fecha=fecha, estado='lista_espera', tipo='suscripcion')

            suscripcion.reservas.add(reserva)

        if tiene_activa:
            clase.inscriptos.add(request.user)
        else:
            clase.lista_espera.add(request.user)
            try:
                send_mail(
                    subject='Quedaste en lista de espera — RehabilitAR',
                    message=(
                        f'Hola {request.user.first_name},\n\n'
                        f'La clase "{clase.nombre}" está completa. '
                        f'Quedaste en lista de espera. Te avisaremos cuando se libere un lugar.\n\n'
                        f'Saludos,\nEquipo RehabilitAR'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[request.user.email],
                    fail_silently=True,
                )
            except Exception:
                pass

        return Response({'detail': 'Suscripción creada exitosamente.', 'total': precio_info['total']}, status=201)


class MisReservasView(APIView):
    """GET /api/suscripciones/mis-reservas/?mes=5&anio=2026"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date
        today = date.today()
        mes  = request.query_params.get('mes')
        anio = request.query_params.get('anio')

        qs = Reserva.objects.filter(usuario=request.user).select_related('clase', 'clase__sala', 'clase__profesor')
        if mes:
            qs = qs.filter(fecha__month=int(mes))
        if anio:
            qs = qs.filter(fecha__year=int(anio))

        data = []
        for r in qs.order_by('fecha'):
            pendiente_pago = (r.fecha.year > today.year or
                              (r.fecha.year == today.year and r.fecha.month > today.month))
            data.append({
                'id': r.id,
                'fecha': str(r.fecha),
                'clase_id': r.clase.id,
                'clase_nombre': r.clase.nombre,
                'horario': r.clase.horario,
                'horario_inicio': str(r.clase.horario_inicio),
                'horario_fin': str(r.clase.horario_fin),
                'aula': r.clase.aula,
                'profesor_nombre': r.clase.profesor.full_name if r.clase.profesor else None,
                'estado': r.estado,
                'tipo': r.tipo,
                'lista_espera': r.estado == 'lista_espera',
                'pendiente_pago': pendiente_pago,
            })
        return Response(data)


class MisSuscripcionesView(APIView):
    """GET /api/clases/suscripciones/mis-suscripciones/ — suscripciones del cliente."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date
        today = date.today()

        suscripciones = (Suscripcion.objects
                         .filter(usuario=request.user)
                         .select_related('clase', 'clase__sala', 'clase__profesor')
                         .prefetch_related('reservas')
                         .order_by('-anio', '-mes'))

        data = []
        for s in suscripciones:
            reservas = s.reservas.filter(estado__in=['activa', 'lista_espera']).order_by('fecha')
            en_espera = s.reservas.filter(estado='lista_espera').exists()
            # Próxima reserva de esta suscripción
            proxima = reservas.filter(fecha__gte=today).first()
            data.append({
                'id':            s.id,
                'clase_id':      s.clase.id,
                'clase_nombre':  s.clase.nombre,
                'especialidad':  s.clase.get_especialidad_display(),
                'dias':          s.clase.dias,
                'horario':       s.clase.horario,
                'aula':          s.clase.aula,
                'profesor':      s.clase.profesor.full_name if s.clase.profesor else None,
                'mes':           s.mes,
                'anio':          s.anio,
                'monto':         float(s.monto),
                'estado':        s.estado,
                'en_espera':     en_espera,
                'proxima_fecha': str(proxima.fecha) if proxima else None,
                'total_clases':  reservas.count(),
                'reservas': [
                    {
                        'fecha':  str(r.fecha),
                        'estado': r.estado,
                    }
                    for r in reservas
                ],
            })
        return Response(data)


class ClasesParaReprogramarView(APIView):
    """GET /api/suscripciones/reprogramar/?especialidad=X&fecha=2026-05-01"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date, timedelta
        especialidad = request.query_params.get('especialidad', '')
        fecha_str    = request.query_params.get('fecha', '')
        try:
            fecha_feriado = date.fromisoformat(fecha_str)
        except ValueError:
            return Response({'detail': 'Fecha inválida.'}, status=400)

        week_start = fecha_feriado - timedelta(days=fecha_feriado.weekday())
        week_end   = week_start + timedelta(days=6)

        clases = (Clase.objects.filter(tipo_clase='fija', especialidad=especialidad)
                  .select_related('profesor', 'sala').prefetch_related('inscriptos'))

        result = []
        d = week_start
        while d <= week_end:
            for c in clases:
                wd = DIAS_A_WEEKDAY.get(c.dias)
                if wd is not None and d.weekday() == wd and str(d) not in FERIADOS and d != fecha_feriado:
                    result.append({
                        'clase_id': c.id,
                        'clase_nombre': c.nombre,
                        'fecha': str(d),
                        'horario': c.horario,
                        'aula': c.aula,
                        'disponible': c.inscriptos.count() < c.cupo,
                    })
            d += timedelta(days=1)
        return Response(result)


class HardDeleteUserView(APIView):
    """
    DELETE /api/clases/users/<int:pk>/hard-delete/
    Borra físicamente a un usuario de la base de datos (Admin).
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)
        try:
            usuario = User.objects.get(pk=pk)

            tiene_inscripciones = Clase.objects.filter(inscriptos=usuario).exists()

            if tiene_inscripciones:
                mensaje = (
                    f"Hola {usuario.first_name},\n\n"
                    f"Tu cuenta en RehabilitAR ha sido eliminada.\n\n"
                    f"Dado que tenías clases o reservas activas, se realizó el reintegro del dinero correspondiente.\n\n"
                    f"Saludos,\nEquipo RehabilitAR"
                )
            else:
                mensaje = (
                    f"Hola {usuario.first_name},\n\n"
                    f"Tu cuenta en RehabilitAR ha sido eliminada.\n\n"
                    f"Saludos,\nEquipo RehabilitAR"
                )

            email_destino = usuario.email
            nombre = usuario.first_name

            try:
                mail = EmailMessage(
                    subject="Tu cuenta en RehabilitAR ha sido eliminada",
                    body=mensaje,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[email_destino],
                )
                mail.encoding = 'utf-8'
                mail.send(fail_silently=True)
            except Exception as e:
                print(f"Error al enviar mail de eliminacion: {e}")

            usuario.delete()
            return Response({'detail': 'Usuario eliminado definitivamente.'}, status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=404)


class ClasesParaReservarView(APIView):
    """
    GET /api/clases/para-reservar/?mes=5&anio=2026
    Devuelve todas las opciones de reserva única disponibles para el cliente
    en el mes indicado (clases fijas + individuales, sin conflictos de horario).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date, timedelta
        import calendar as cal_mod
        from users.models import AptoFisico

        today = date.today()
        try:
            mes  = int(request.query_params.get('mes',  today.month))
            anio = int(request.query_params.get('anio', today.year))
        except (ValueError, TypeError):
            return Response({'detail': 'Parámetros inválidos.'}, status=400)

        apto_aprobado = AptoFisico.objects.filter(usuario=request.user, estado='APROBADO').exists()

        # Reservas activas del usuario en ese mes (para detectar conflictos)
        mis_reservas_activas = (
            Reserva.objects
            .filter(usuario=request.user, fecha__month=mes, fecha__year=anio, estado='activa')
            .select_related('clase')
        )
        # conflict_map: fecha -> lista de (horario_inicio, horario_fin)
        conflict_map = {}
        for r in mis_reservas_activas:
            d = r.fecha
            conflict_map.setdefault(d, []).append((r.clase.horario_inicio, r.clase.horario_fin))

        # IDs de clases fijas a las que ya está suscripto este mes
        suscripciones_mes = set(
            Suscripcion.objects
            .filter(usuario=request.user, mes=mes, anio=anio)
            .values_list('clase_id', flat=True)
        )

        # Reservas ya existentes (activa o lista_espera) del usuario en ese mes
        mis_reservas_existentes = set(
            Reserva.objects
            .filter(usuario=request.user, fecha__month=mes, fecha__year=anio, estado__in=['activa', 'lista_espera'])
            .values_list('clase_id', 'fecha')
        )

        clases = (
            Clase.objects
            .select_related('profesor', 'sala')
            .prefetch_related('inscriptos')
            .all()
        )

        _, last_day = cal_mod.monthrange(anio, mes)
        opciones = []

        for dia in range(1, last_day + 1):
            fecha = date(anio, mes, dia)
            if fecha < today:
                continue

            for clase in clases:
                # ¿Ocurre esta clase en esta fecha?
                if clase.tipo_clase == 'fija':
                    wd = DIAS_A_WEEKDAY.get(clase.dias)
                    if wd is None or fecha.weekday() != wd:
                        continue
                    # Si ya tiene suscripción activa a esta clase este mes, no la muestra
                    if clase.id in suscripciones_mes:
                        continue
                elif clase.tipo_clase == 'individual':
                    if clase.fecha != fecha:
                        continue
                else:
                    continue

                # ¿Ya tiene reserva para esta clase en esta fecha?
                if (clase.id, fecha) in mis_reservas_existentes:
                    continue

                # ¿Hay conflicto de horario ese día?
                conflictos_dia = conflict_map.get(fecha, [])
                if any(clase.horario_inicio < fin and inicio < clase.horario_fin
                       for inicio, fin in conflictos_dia):
                    continue

                inscriptos_count = clase.inscriptos.count()
                cupo_disponible  = max(clase.cupo - inscriptos_count, 0)

                opciones.append({
                    'clase_id':       clase.id,
                    'clase_nombre':   clase.nombre,
                    'tipo_clase':     clase.tipo_clase,
                    'especialidad':   clase.get_especialidad_display(),
                    'fecha':          str(fecha),
                    'horario':        clase.horario,
                    'horario_inicio': str(clase.horario_inicio),
                    'horario_fin':    str(clase.horario_fin),
                    'valor':          float(clase.valor),
                    'cupo':           clase.cupo,
                    'inscriptos':     inscriptos_count,
                    'cupo_disponible': cupo_disponible,
                    'aula':           clase.aula,
                    'profesor_nombre': clase.profesor.full_name if clase.profesor else None,
                })

        return Response({'apto_aprobado': apto_aprobado, 'opciones': opciones})


class ReservarClaseUnicaView(APIView):
    """
    POST /api/clases/reservar-unica/
    Reserva una única ocurrencia de una clase para el cliente.
    Maneja capacidad, lista de espera con prioridad suscripción > única.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from datetime import date as Date
        from users.models import AptoFisico
        from django.core.mail import send_mail

        clase_id  = request.data.get('clase_id')
        fecha_str = request.data.get('fecha')

        if not clase_id or not fecha_str:
            return Response({'detail': 'Falta clase_id o fecha.'}, status=400)

        if not AptoFisico.objects.filter(usuario=request.user, estado='APROBADO').exists():
            return Response({'detail': 'Necesitás un apto físico aprobado para reservar una clase.'}, status=400)

        try:
            clase = Clase.objects.prefetch_related('inscriptos').get(pk=clase_id)
            fecha = Date.fromisoformat(fecha_str)
        except (Clase.DoesNotExist, ValueError):
            return Response({'detail': 'Clase o fecha inválida.'}, status=400)

        # Verificar que no tenga ya una reserva en esa fecha+clase
        if Reserva.objects.filter(
            usuario=request.user, clase=clase, fecha=fecha,
            estado__in=['activa', 'lista_espera']
        ).exists():
            return Response({'detail': 'Ya tenés una reserva para esta clase en esta fecha.'}, status=400)

        cupo_libre = clase.cupo - clase.inscriptos.count()

        if cupo_libre > 0:
            Reserva.objects.create(
                usuario=request.user,
                clase=clase,
                fecha=fecha,
                estado='activa',
                tipo='unica',
            )
            clase.inscriptos.add(request.user)
            return Response({
                'detail': 'Reserva creada exitosamente.',
                'estado': 'activa',
                'valor': float(clase.valor),
            }, status=201)
        else:
            # Lista de espera — tipo unica tiene menor prioridad que suscripcion
            Reserva.objects.create(
                usuario=request.user,
                clase=clase,
                fecha=fecha,
                estado='lista_espera',
                tipo='unica',
            )
            clase.lista_espera.add(request.user)
            try:
                send_mail(
                    subject='Quedaste en lista de espera — RehabilitAR',
                    message=(
                        f'Hola {request.user.first_name},\n\n'
                        f'La clase "{clase.nombre}" del {fecha.strftime("%d/%m/%Y")} está completa. '
                        f'Quedaste en lista de espera. Te avisaremos cuando se libere un lugar.\n\n'
                        f'Saludos,\nEquipo RehabilitAR'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[request.user.email],
                    fail_silently=True,
                )
            except Exception:
                pass
            return Response({
                'detail': 'La clase seleccionada no posee cupos disponibles, se lo ha agregado a la lista de espera.',
                'estado': 'lista_espera',
                'valor': float(clase.valor),
            }, status=201)
