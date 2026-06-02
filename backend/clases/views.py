from datetime import datetime

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status

from django.core.mail import EmailMessage
from django.conf import settings

from .cancelaciones import cancelar_clase

from .models import Clase, Sala, Reserva, Suscripcion, Credito
from .serializers import (
    ClaseSerializer, ClaseCreateSerializer,
    ClaseProfesorSerializer,
    SalaSerializer, SalaCreateSerializer,
)
from users.models import User

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


def _calcular_precio(clase, ocurrencias, descuentos_feriado=0, descuento_cancelacion_pct=0):
    n = len(ocurrencias)
    precio_por_clase = float(clase.valor)
    precio_base = precio_por_clase * n
    descuento_mid = precio_base * 0.20 if n == 2 else 0
    descuento_feriados = precio_por_clase * descuentos_feriado
    subtotal = max(precio_base - descuento_mid - descuento_feriados, 0)
    descuento_cancelacion = round(subtotal * descuento_cancelacion_pct / 100, 2) if descuento_cancelacion_pct else 0
    total = max(subtotal - descuento_cancelacion, 0)
    return {
        'precio_por_clase': precio_por_clase,
        'num_clases': n,
        'precio_base': precio_base,
        'descuento_mid_month': descuento_mid,
        'descuento_feriados': descuento_feriados,
        'descuento_cancelacion': descuento_cancelacion,
        'descuento_cancelacion_pct': descuento_cancelacion_pct,
        'total': total,
    }


def _descuento_cancelacion_pct(usuario, clase, mes, anio):
    """Retorna el % de descuento por cancelaciones del mes anterior."""
    prev_mes  = mes - 1 if mes > 1 else 12
    prev_anio = anio   if mes > 1 else anio - 1
    prev = Suscripcion.objects.filter(
        usuario=usuario, clase=clase, mes=prev_mes, anio=prev_anio
    ).first()
    return prev.descuento_siguiente_mes if prev else 0


class ClaseListView(APIView):
    """
    GET  /api/clases/          — lista todas las clases (admin)
    POST /api/clases/          — crea una clase nueva (admin)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)
        clases = Clase.objects.select_related('profesor', 'sala').prefetch_related('inscriptos', 'lista_espera').exclude(estado='cancelada')
        return Response(ClaseSerializer(clases, many=True).data)

    def post(self, request):
        from datetime import date as date_type
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)

        # Validar que no sea fin de semana
        tipo_clase = request.data.get('tipo_clase')
        DIAS_FIN_SEMANA = {'Sábado', 'Domingo'}
        if tipo_clase == 'fija':
            dia = request.data.get('dias', '')
            if dia in DIAS_FIN_SEMANA:
                return Response({'detail': 'Las clases fijas solo pueden crearse de lunes a viernes.'}, status=400)
        elif tipo_clase == 'individual':
            fecha_str = request.data.get('fecha', '')
            if fecha_str:
                try:
                    from datetime import datetime
                    dow = datetime.strptime(fecha_str, '%Y-%m-%d').weekday()  # 0=Lun, 5=Sáb, 6=Dom
                    if dow >= 5:
                        return Response({'detail': 'Las clases individuales solo pueden crearse de lunes a viernes.'}, status=400)
                except ValueError:
                    pass

        serializer = ClaseCreateSerializer(data=request.data)
        if not serializer.is_valid():
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
        from users.models import AptoFisico
        apto_aprobado = AptoFisico.objects.filter(usuario=request.user, estado='APROBADO').exists()
        return Response({
            'clases': ClaseSerializer(disponibles, many=True).data,
            'apto_aprobado': apto_aprobado,
        })


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

        desc_pct    = _descuento_cancelacion_pct(request.user, clase, mes, anio)
        precio_info = _calcular_precio(clase, ocurrencias, descuento_cancelacion_pct=desc_pct)

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
        desc_pct    = _descuento_cancelacion_pct(request.user, clase, mes, anio)
        precio_info = _calcular_precio(clase, ocurrencias, descuentos_count, desc_pct)
        total_susc  = float(precio_info['total'])

        # Limpiar reservas canceladas previas para esta clase/usuario/mes
        # (evita IntegrityError por unique_together al re-suscribirse después de un cambio de turno)
        Reserva.objects.filter(
            usuario=request.user, clase=clase,
            fecha__in=ocurrencias, estado='cancelada',
        ).delete()

        # Las suscripciones siempre se pagan en su totalidad
        suscripcion = Suscripcion.objects.create(
            usuario=request.user,
            clase=clase,
            mes=mes,
            anio=anio,
            monto=precio_info['total'],
            monto_pagado=total_susc,
            estado='activa',
            valor_clase=clase.valor,  # precio unitario al momento de compra (para cambiar turno)
        )

        tiene_activa = False

        for fecha in ocurrencias:
            fecha_str = str(fecha)
            es_feriado = fecha_str in FERIADOS
            opcion = opciones_feriado.get(fecha_str) if es_feriado else None

            if es_feriado and opcion == 'descuento':
                reserva = Reserva.objects.create(
                    usuario=request.user, clase=clase, fecha=fecha,
                    estado='cancelada', tipo='suscripcion'
                )
            else:
                # Verificar cupo disponible para ESTA fecha específica
                activas_en_fecha = Reserva.objects.filter(
                    clase=clase, fecha=fecha, estado='activa'
                ).count()
                hay_cupo = activas_en_fecha < clase.cupo

                if es_feriado and isinstance(opcion, dict):
                    clase_alt_id  = opcion.get('clase_alt_id')
                    fecha_alt_str = opcion.get('fecha_alt')
                    clase_alt = None
                    fecha_alt = None
                    try:
                        clase_alt = Clase.objects.get(pk=clase_alt_id)
                        fecha_alt = Date.fromisoformat(fecha_alt_str)
                    except Exception:
                        pass
                    estado_r = 'activa' if hay_cupo else 'lista_espera'
                    reserva = Reserva.objects.create(
                        usuario=request.user, clase=clase, fecha=fecha,
                        estado=estado_r, clase_alt=clase_alt, fecha_alt=fecha_alt, tipo='suscripcion'
                    )
                else:
                    estado_r = 'activa' if hay_cupo else 'lista_espera'
                    reserva = Reserva.objects.create(
                        usuario=request.user, clase=clase, fecha=fecha,
                        estado=estado_r, tipo='suscripcion'
                    )

                if estado_r == 'activa':
                    tiene_activa = True

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
        mes  = request.query_params.get('mes')
        anio = request.query_params.get('anio')

        qs = (Reserva.objects
              .filter(usuario=request.user)
              .exclude(clase__estado='cancelada')
              .select_related('clase', 'clase__sala', 'clase__profesor')
              .prefetch_related('suscripcion_set'))
        if mes:
            qs = qs.filter(fecha__month=int(mes))
        if anio:
            qs = qs.filter(fecha__year=int(anio))

        data = []
        for r in qs.order_by('fecha'):
            # Pendiente de pago: suscripción con estado 'pendiente_pago' O reserva única con estado_pago='pendiente_pago'
            if r.tipo == 'suscripcion':
                pendiente_pago = r.suscripcion_set.filter(estado='pendiente_pago').exists()
            else:
                pendiente_pago = r.estado_pago == 'pendiente_pago'
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
                'monto_total':  float(r.monto_total)  if r.monto_total  is not None else None,
                'monto_pagado': float(r.monto_pagado) if r.monto_pagado is not None else None,
                'estado_pago':  r.estado_pago,
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
                         .exclude(clase__estado='cancelada')
                         .select_related('clase', 'clase__sala', 'clase__profesor')
                         .prefetch_related('reservas')
                         .order_by('-anio', '-mes'))

        data = []
        for s in suscripciones:
            reservas = s.reservas.filter(estado__in=['activa', 'lista_espera']).order_by('fecha')
            en_espera = s.reservas.filter(estado='lista_espera').exists()
            proxima = reservas.filter(fecha__gte=today).first()
            pendientes = reservas.filter(fecha__gte=today)

            # Suscripciones canceladas sin clases futuras:
            # mostrar si son del mes actual o futuro (para que el cliente vea el estado y espere su crédito/devolución);
            # ocultar solo si son de meses pasados y ya no tienen clases pendientes.
            if s.estado == 'cancelada' and not pendientes.exists():
                if (s.anio, s.mes) < (today.year, today.month):
                    continue

            # Última clase pendiente (para mostrar vigencia en canceladas)
            ultima_pendiente = pendientes.order_by('-fecha').first()
            vigente_hasta = str(ultima_pendiente.fecha) if ultima_pendiente and s.estado == 'cancelada' else None

            data.append({
                'id':             s.id,
                'clase_id':       s.clase.id,
                'clase_nombre':   s.clase.nombre,
                'especialidad':   s.clase.get_especialidad_display(),
                'tipo_clase':     s.clase.tipo_clase,
                'dias':           s.clase.dias,
                'horario':        s.clase.horario,
                'aula':           s.clase.aula,
                'profesor':       s.clase.profesor.full_name if s.clase.profesor else None,
                'mes':            s.mes,
                'anio':           s.anio,
                'monto':          float(s.monto),
                'monto_pagado':   float(s.monto_pagado) if s.monto_pagado is not None else None,
                'valor_clase':    float(s.valor_clase),  # precio al momento de la compra (para cambiar turno)
                'estado':         s.estado,
                'en_espera':      en_espera,
                'proxima_fecha':  str(proxima.fecha) if proxima else None,
                'vigente_hasta':  vigente_hasta,
                'total_clases':   reservas.count(),
                'reservas': [
                    {
                        'id':     r.id,
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
                if wd is not None and d.weekday() == wd and str(d) not in FERIADOS and d != fecha_feriado and c.estado != 'cancelada':
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
            return Response({'detail': 'Usuario eliminado definitivamente.'}, status=status.HTTP_200_OK)
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
            .exclude(estado='cancelada')
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


class PagarSaldoReservaView(APIView):
    """
    POST /api/clases/pagar-saldo-reserva/<pk>/
    Registra el pago del saldo restante de una reserva única pendiente de pago.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            reserva = Reserva.objects.get(pk=pk, usuario=request.user)
        except Reserva.DoesNotExist:
            return Response({'detail': 'Reserva no encontrada.'}, status=404)

        if reserva.estado_pago != 'pendiente_pago':
            return Response({'detail': 'Esta reserva ya está pagada en su totalidad.'}, status=400)

        saldo = round(float(reserva.monto_total or 0) - float(reserva.monto_pagado or 0), 2)

        reserva.monto_pagado = reserva.monto_total
        reserva.estado_pago  = 'pagado'
        reserva.save()

        return Response({
            'detail': 'Pago realizado con éxito.',
            'monto_pagado': float(reserva.monto_pagado),
            'saldo_abonado': saldo,
        }, status=200)


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

        # Validar monto de pago
        valor_clase = round(float(clase.valor), 2)
        monto_pagar_raw = request.data.get('monto_pagar')
        if monto_pagar_raw is not None:
            try:
                monto_pagar = round(float(monto_pagar_raw), 2)
            except (ValueError, TypeError):
                return Response({'detail': 'Monto inválido.'}, status=400)
            minimo = round(valor_clase * 0.5, 2)
            if monto_pagar < minimo - 0.005 or monto_pagar > valor_clase + 0.005:
                return Response(
                    {'detail': f'El monto debe ser entre ${minimo:.2f} (señal) y ${valor_clase:.2f} (total).'},
                    status=400,
                )
            monto_pagar = min(monto_pagar, valor_clase)  # clamp por seguridad
        else:
            monto_pagar = valor_clase  # por defecto: pago total

        estado_pago = 'pagado' if monto_pagar >= valor_clase - 0.005 else 'pendiente_pago'

        # Verificar que no tenga ya una reserva en esa fecha+clase
        if Reserva.objects.filter(
            usuario=request.user, clase=clase, fecha=fecha,
            estado__in=['activa', 'lista_espera']
        ).exists():
            return Response({'detail': 'Ya tenés una reserva para esta clase en esta fecha.'}, status=400)

        cupo_libre = clase.cupo - clase.inscriptos.count()

        # Reutilizar reserva cancelada si existe (evita IntegrityError por unique_together)
        reserva_existente = Reserva.objects.filter(
            usuario=request.user, clase=clase, fecha=fecha
        ).first()

        if cupo_libre > 0:
            if reserva_existente:
                reserva_existente.estado     = 'activa'
                reserva_existente.tipo       = 'unica'
                reserva_existente.monto_total  = valor_clase
                reserva_existente.monto_pagado = monto_pagar
                reserva_existente.estado_pago  = estado_pago
                reserva_existente.save()
            else:
                Reserva.objects.create(
                    usuario=request.user,
                    clase=clase,
                    fecha=fecha,
                    estado='activa',
                    tipo='unica',
                    monto_total=valor_clase,
                    monto_pagado=monto_pagar,
                    estado_pago=estado_pago,
                )
            clase.inscriptos.add(request.user)
            return Response({
                'detail': 'Reserva creada exitosamente.',
                'estado': 'activa',
                'valor': valor_clase,
                'monto_pagado': monto_pagar,
                'estado_pago': estado_pago,
            }, status=201)
        else:
            # Lista de espera — tipo unica tiene menor prioridad que suscripcion
            if reserva_existente:
                reserva_existente.estado     = 'lista_espera'
                reserva_existente.tipo       = 'unica'
                reserva_existente.monto_total  = valor_clase
                reserva_existente.monto_pagado = monto_pagar
                reserva_existente.estado_pago  = estado_pago
                reserva_existente.save()
            else:
                Reserva.objects.create(
                    usuario=request.user,
                    clase=clase,
                    fecha=fecha,
                    estado='lista_espera',
                    tipo='unica',
                    monto_total=valor_clase,
                    monto_pagado=monto_pagar,
                    estado_pago=estado_pago,
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
                'valor': valor_clase,
                'monto_pagado': monto_pagar,
                'estado_pago': estado_pago,
            }, status=201)
        
class CancelarClaseView(APIView):
    """
    POST /api/clases/cancelar-clase/
    Cancela la clase recibida.
    Maneja notificaciones, reembolsos y la ejecución automática.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        clase_id = request.data.get('clase_id')
        if clase_id:
            if request.user.role != User.Role.ADMIN:
                return Response({'detail': 'Sólo administradores pueden cancelar una clase.'}, status=403)

            try:
                clase_obj = Clase.objects.get(pk=clase_id)
            except Clase.DoesNotExist:
                return Response({'detail': 'Clase no encontrada.'}, status=404)

            count = cancelar_clase(clase_obj,"admin")
            return Response({'detail': f'Clase cancelada. Se notificaron {count} reservas.'}, status=200)

        return Response({'detail': 'Parámetros inválidos. Enviar `clase_id`.'}, status=400)



class CancelarSuscripcionView(APIView):
    """
    POST /api/clases/cancelar-suscripcion/<pk>/
    Cancela una suscripción: queda en estado 'cancelada'.
    Las reservas del mes en curso permanecen activas.
    A partir del mes siguiente no se generan nuevas reservas.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            susc = Suscripcion.objects.select_related('clase').get(
                pk=pk, usuario=request.user
            )
        except Suscripcion.DoesNotExist:
            return Response({'detail': 'Suscripción no encontrada.'}, status=404)

        if susc.estado == 'cancelada':
            return Response({'detail': 'La suscripción ya fue cancelada.'}, status=400)

        susc.estado = 'cancelada'
        susc.save(update_fields=['estado'])

        return Response({'detail': 'Suscripción cancelada correctamente.'})


def _promover_lista_espera(clase, fecha):
    """Si existe alguien en lista de espera para esta fecha, lo promueve a activa."""
    siguiente = (Reserva.objects
                 .filter(clase=clase, fecha=fecha, estado='lista_espera')
                 .select_related('usuario')
                 .order_by('created_at')
                 .first())
    if not siguiente:
        return
    siguiente.estado = 'activa'
    siguiente.save(update_fields=['estado'])
    # Actualizar M2M solo si ya no tiene más fechas en espera
    if not Reserva.objects.filter(clase=clase, usuario=siguiente.usuario, estado='lista_espera').exists():
        clase.lista_espera.remove(siguiente.usuario)
    clase.inscriptos.add(siguiente.usuario)
    try:
        from django.core.mail import send_mail
        send_mail(
            subject='¡Conseguiste un lugar! — RehabilitAR',
            message=(
                f'Hola {siguiente.usuario.first_name},\n\n'
                f'Se liberó un lugar en "{clase.nombre}" para el {fecha.strftime("%d/%m/%Y")}. '
                f'Tu reserva fue confirmada.\n\nSaludos,\nEquipo RehabilitAR'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[siguiente.usuario.email],
            fail_silently=True,
        )
    except Exception:
        pass


class MisCreditosView(APIView):
    """GET /api/clases/mis-creditos/ — créditos activos del mes en curso."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date
        hoy = date.today()
        creditos = Credito.objects.filter(
            usuario=request.user,
            mes=hoy.month,
            anio=hoy.year,
            usado=False,
        )
        DISPLAY = dict(Clase.Especialidad.choices)
        data = [{
            'id':                c.id,
            'tipo_clase':        c.tipo_clase,
            'tipo_clase_display': DISPLAY.get(c.tipo_clase, c.tipo_clase),
            'mes':               c.mes,
            'anio':              c.anio,
        } for c in creditos]
        return Response(data)


class CancelarReservaUnicaView(APIView):
    """POST /api/clases/cancelar-reserva-unica/<pk>/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from datetime import datetime
        from django.core.mail import send_mail

        try:
            reserva = (Reserva.objects
                       .select_related('clase', 'clase__sala')
                       .get(pk=pk, usuario=request.user, tipo='unica'))
        except Reserva.DoesNotExist:
            return Response({'detail': 'Reserva no encontrada.'}, status=404)

        if reserva.estado == 'cancelada':
            return Response({'detail': 'Esta reserva ya fue cancelada.'}, status=400)

        clase     = reserva.clase
        ahora     = datetime.now()
        dt_clase  = datetime.combine(reserva.fecha, clase.horario_inicio)
        horas     = (dt_clase - ahora).total_seconds() / 3600

        old_estado = reserva.estado
        reserva.estado = 'cancelada'
        reserva.save(update_fields=['estado'])

        # Limpiar inscriptos/espera si no quedan más reservas activas
        if not Reserva.objects.filter(clase=clase, usuario=request.user, estado='activa').exists():
            clase.inscriptos.remove(request.user)
        if not Reserva.objects.filter(clase=clase, usuario=request.user, estado='lista_espera').exists():
            clase.lista_espera.remove(request.user)

        # Promover lista de espera si la reserva era activa
        if old_estado == 'activa':
            _promover_lista_espera(clase, reserva.fecha)

        devolver_sena = horas > 24

        try:
            if devolver_sena:
                subject = 'Cancelación de clase — Seña acreditada — RehabilitAR'
                body = (
                    f'Hola {request.user.first_name},\n\n'
                    f'Cancelaste tu reserva de "{clase.nombre}" para el {reserva.fecha.strftime("%d/%m/%Y")}.\n\n'
                    f'Dado que cancelaste con más de 24 horas de anticipación, '
                    f'se te acreditará el importe de la seña.\n\nSaludos,\nEquipo RehabilitAR'
                )
            else:
                subject = 'Cancelación de clase — Seña no reintegrada — RehabilitAR'
                body = (
                    f'Hola {request.user.first_name},\n\n'
                    f'Cancelaste tu reserva de "{clase.nombre}" para el {reserva.fecha.strftime("%d/%m/%Y")}.\n\n'
                    f'Dado que cancelaste con menos de 24 horas de anticipación, '
                    f'la seña no puede ser reintegrada.\n\nSaludos,\nEquipo RehabilitAR'
                )
            send_mail(subject=subject, message=body,
                      from_email=settings.DEFAULT_FROM_EMAIL,
                      recipient_list=[request.user.email], fail_silently=True)
        except Exception:
            pass

        return Response({
            'detail': 'Reserva cancelada.',
            'devolver_sena': devolver_sena,
            'horas_hasta_clase': round(horas, 1),
        })


class CancelarClaseSuscripcionView(APIView):
    """POST /api/clases/cancelar-clase-suscripcion/<pk>/  (pk = reserva_id)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from datetime import datetime, date
        from django.core.mail import send_mail

        try:
            reserva = (Reserva.objects
                       .select_related('clase', 'clase__sala')
                       .get(pk=pk, usuario=request.user, tipo='suscripcion'))
        except Reserva.DoesNotExist:
            return Response({'detail': 'Reserva no encontrada.'}, status=404)

        if reserva.estado == 'cancelada':
            return Response({'detail': 'Esta clase ya fue cancelada.'}, status=400)

        clase    = reserva.clase
        ahora    = datetime.now()
        dt_clase = datetime.combine(reserva.fecha, clase.horario_inicio)
        horas    = (dt_clase - ahora).total_seconds() / 3600

        old_estado = reserva.estado
        reserva.estado = 'cancelada'
        reserva.save(update_fields=['estado'])

        # Limpiar M2M
        if not Reserva.objects.filter(clase=clase, usuario=request.user, estado='activa').exists():
            clase.inscriptos.remove(request.user)
        if not Reserva.objects.filter(clase=clase, usuario=request.user, estado='lista_espera').exists():
            clase.lista_espera.remove(request.user)

        if old_estado == 'activa':
            _promover_lista_espera(clase, reserva.fecha)

        # ── Reglas de negocio ──────────────────────────────
        resultado = 'sin_beneficio'
        hoy = date.today()

        if horas > 48:
            # Generar crédito si el total del mes < 3
            total_creditos = Credito.objects.filter(
                usuario=request.user, mes=hoy.month, anio=hoy.year, usado=False
            ).count()
            if total_creditos < 3:
                Credito.objects.create(
                    usuario=request.user,
                    tipo_clase=clase.especialidad,
                    mes=hoy.month,
                    anio=hoy.year,
                )
                resultado = 'credito_generado'
            else:
                resultado = 'limite_creditos'

        elif horas > 24:
            susc = Suscripcion.objects.filter(reservas=reserva).first()
            if susc:
                n = susc.cancelaciones_24_48h
                if n == 0:
                    susc.descuento_siguiente_mes = 20
                    resultado = 'descuento_20'
                elif n == 1:
                    susc.descuento_siguiente_mes = 30
                    resultado = 'descuento_30'
                else:
                    susc.descuento_siguiente_mes = 0
                    resultado = 'sin_beneficio'
                susc.cancelaciones_24_48h = n + 1
                susc.save(update_fields=['cancelaciones_24_48h', 'descuento_siguiente_mes'])
        # else: < 24h → sin_beneficio (ya asignado)

        try:
            MENSAJES = {
                'credito_generado': (
                    f'Cancelaste la clase de "{clase.nombre}" del {reserva.fecha.strftime("%d/%m/%Y")}.\n\n'
                    f'Como cancelaste con más de 48 horas de anticipación, se generó un crédito '
                    f'de {clase.get_especialidad_display()} válido para el mes en curso.'
                ),
                'limite_creditos': (
                    f'Cancelaste la clase de "{clase.nombre}" del {reserva.fecha.strftime("%d/%m/%Y")}.\n\n'
                    f'Alcanzaste el límite de 3 créditos activos, por lo que no se generó un nuevo crédito.'
                ),
                'descuento_20': (
                    f'Cancelaste la clase de "{clase.nombre}" del {reserva.fecha.strftime("%d/%m/%Y")}.\n\n'
                    f'Como cancelaste entre 24 y 48 horas antes, tendrás un 20 % de descuento '
                    f'en la próxima mensualidad.'
                ),
                'descuento_30': (
                    f'Cancelaste la clase de "{clase.nombre}" del {reserva.fecha.strftime("%d/%m/%Y")}.\n\n'
                    f'Segunda cancelación en la ventana de 24-48 h: tendrás un 30 % de descuento '
                    f'en la próxima mensualidad.'
                ),
                'sin_beneficio': (
                    f'Cancelaste la clase de "{clase.nombre}" del {reserva.fecha.strftime("%d/%m/%Y")}.\n\n'
                    f'La cancelación se realizó con menos de 24 horas de anticipación (o superaste '
                    f'el límite de cancelaciones con beneficio). No se aplica descuento ni crédito.'
                ),
            }
            send_mail(
                subject='Cancelación de clase — RehabilitAR',
                message=f'Hola {request.user.first_name},\n\n{MENSAJES.get(resultado, "")}\n\nSaludos,\nEquipo RehabilitAR',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[request.user.email],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response({
            'detail': 'Clase cancelada.',
            'resultado': resultado,
            'horas_hasta_clase': round(horas, 1),
        })


class ListaEsperaFechasView(APIView):
    """
    GET /api/clases/<pk>/lista-espera/
        → fechas de esa clase que tienen reservas en lista de espera + cantidad

    GET /api/clases/<pk>/lista-espera/?fecha=YYYY-MM-DD
        → usuarios en lista de espera para esa fecha específica
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if request.user.role not in [User.Role.ADMIN, User.Role.RECEPTIONIST]:
            return Response({'detail': 'No tenés permiso.'}, status=403)

        try:
            clase = Clase.objects.get(pk=pk)
        except Clase.DoesNotExist:
            return Response({'detail': 'Clase no encontrada.'}, status=404)

        fecha_param = request.query_params.get('fecha')

        if fecha_param:
            # Usuarios en espera para una fecha específica
            reservas = (Reserva.objects
                        .filter(clase=clase, fecha=fecha_param, estado='lista_espera')
                        .select_related('usuario')
                        .order_by('created_at'))
            data = [{
                'id': r.id,
                'usuario_id': r.usuario.id,
                'nombre': r.usuario.full_name,
                'email': r.usuario.email,
                'telefono': getattr(r.usuario, 'celular', None) or getattr(r.usuario, 'telefono', None),
            } for r in reservas]
            return Response(data)
        else:
            # Fechas con lista de espera y su cantidad
            from django.db.models import Count
            fechas = (Reserva.objects
                      .filter(clase=clase, estado='lista_espera')
                      .values('fecha')
                      .annotate(cantidad=Count('id'))
                      .order_by('fecha'))
            data = [{
                'fecha': str(f['fecha']),
                'cantidad': f['cantidad'],
                'nombre': clase.nombre,
                'horario': clase.horario,
            } for f in fechas]
            return Response(data)


# ══════════════════════════════════════════════════════════════════
# CAMBIAR TURNO — vistas propias (no en main)
# ══════════════════════════════════════════════════════════════════

def _asignar_cupo_lista_espera(clase):
    """
    Si hay cupo libre en `clase`, asigna el lugar al próximo en lista de espera
    con prioridad para abonados (clases fijas) o FIFO general (individuales).
    Activa sus reservas futuras y notifica por mail (EmailMessage UTF-8).
    Devuelve el usuario asignado o None.
    """
    from datetime import date as Date, datetime

    clase.refresh_from_db()
    if clase.inscriptos.count() >= clase.cupo:
        return None

    usuarios_espera = list(clase.lista_espera.all())
    if not usuarios_espera:
        return None

    def primera_reserva_espera(u):
        r = Reserva.objects.filter(
            usuario=u, clase=clase, estado='lista_espera',
        ).order_by('created_at').first()
        return r.created_at if r else datetime.max

    if clase.tipo_clase == Clase.TipoClase.FIJA:
        abonados, no_abonados = [], []
        for u in usuarios_espera:
            if Suscripcion.objects.filter(
                usuario=u, clase=clase,
                estado__in=[Suscripcion.Estado.ACTIVA, Suscripcion.Estado.PENDIENTE_PAGO],
            ).exists():
                abonados.append(u)
            else:
                no_abonados.append(u)
        abonados.sort(key=primera_reserva_espera)
        no_abonados.sort(key=primera_reserva_espera)
        grupo = abonados if abonados else no_abonados
        es_abonado = bool(abonados)
    else:
        usuarios_espera.sort(key=primera_reserva_espera)
        grupo = usuarios_espera
        es_abonado = False

    if not grupo:
        return None

    candidato = grupo[0]
    clase.lista_espera.remove(candidato)
    clase.inscriptos.add(candidato)

    hoy = Date.today()
    Reserva.objects.filter(
        usuario=candidato, clase=clase,
        estado='lista_espera', fecha__gte=hoy,
    ).update(estado='activa')

    try:
        if clase.tipo_clase == Clase.TipoClase.FIJA and not es_abonado:
            asunto = '¡Se liberó un cupo! — RehabilitAR'
            cuerpo = (
                f'Hola {candidato.first_name},\n\n'
                f'Se liberó un cupo en la clase "{clase.nombre}" ({clase.dias} {clase.horario}). '
                f'Quedaste asignado/a, pero recordá que debés abonar tu suscripción para confirmar el lugar.\n\n'
                f'Saludos,\nEquipo RehabilitAR'
            )
        else:
            asunto = '¡Tenés lugar! — RehabilitAR'
            cuerpo = (
                f'Hola {candidato.first_name},\n\n'
                f'¡Buenas noticias! Se liberó un cupo en la clase "{clase.nombre}" ({clase.dias} {clase.horario}) '
                f'y quedaste asignado/a. Tu lugar está confirmado.\n\n'
                f'Saludos,\nEquipo RehabilitAR'
            )
        mail = EmailMessage(
            subject=asunto, body=cuerpo,
            from_email=settings.DEFAULT_FROM_EMAIL, to=[candidato.email],
        )
        mail.encoding = 'utf-8'
        mail.send(fail_silently=True)
    except Exception:
        pass

    return candidato


class ClasesDisponiblesParaCambioView(APIView):
    """
    GET /api/clases/mis-suscripciones/<pk>/clases-disponibles/
    Devuelve las clases fijas de la misma especialidad con cupo libre, mismo
    precio o menor al valor_clase original, y con ocurrencias restantes en el mes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            suscripcion = Suscripcion.objects.select_related('clase').get(
                pk=pk, usuario=request.user
            )
        except Suscripcion.DoesNotExist:
            return Response({'detail': 'Suscripción no encontrada.'}, status=404)

        if suscripcion.estado == Suscripcion.Estado.CANCELADA:
            return Response({'detail': 'La suscripción está cancelada.'}, status=400)

        especialidad = suscripcion.clase.especialidad
        # techo: precio al momento de la compra; si es 0 (suscripciones antiguas) usa el valor actual de la clase
        precio_max   = suscripcion.valor_clase or suscripcion.clase.valor

        ya_suscripto_ids = set(
            Suscripcion.objects
            .filter(usuario=request.user, mes=suscripcion.mes, anio=suscripcion.anio)
            .values_list('clase_id', flat=True)
        )

        clases = (
            Clase.objects
            .filter(especialidad=especialidad, tipo_clase='fija', valor__lte=precio_max, estado='activa')
            .select_related('sala', 'profesor')
            .prefetch_related('inscriptos')
            .exclude(pk__in=ya_suscripto_ids)
        )

        mes, anio = suscripcion.mes, suscripcion.anio
        disponibles = [
            c for c in clases
            if c.inscriptos.count() < c.cupo
            and _ocurrencias_restantes(c, mes, anio)
        ]

        from .serializers import ClaseSerializer
        return Response(ClaseSerializer(disponibles, many=True).data)


class CambiarTurnoView(APIView):
    """
    POST /api/clases/mis-suscripciones/<pk>/cambiar-turno/
    Body: { "nueva_clase_id": <int> }
    Cambia la suscripción de clase dentro del mismo mes/año.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            suscripcion = Suscripcion.objects.select_related('clase').get(
                pk=pk, usuario=request.user
            )
        except Suscripcion.DoesNotExist:
            return Response({'detail': 'Suscripción no encontrada.'}, status=404)

        if suscripcion.estado == Suscripcion.Estado.CANCELADA:
            return Response({'detail': 'No podés cambiar el turno de una suscripción cancelada.'}, status=400)

        nueva_clase_id = request.data.get('nueva_clase_id')
        if not nueva_clase_id:
            return Response({'detail': 'Debés indicar la nueva clase.'}, status=400)

        try:
            nueva_clase = Clase.objects.select_related('sala', 'profesor').get(pk=nueva_clase_id, estado='activa')
        except Clase.DoesNotExist:
            return Response({'detail': 'Clase no encontrada.'}, status=404)

        vieja_clase = suscripcion.clase

        if nueva_clase == vieja_clase:
            return Response({'detail': 'Ya estás suscripto/a a esa clase.'}, status=400)

        if nueva_clase.inscriptos.count() >= nueva_clase.cupo:
            return Response({'detail': 'La clase seleccionada ya está llena.'}, status=400)

        if float(nueva_clase.valor) > float(suscripcion.valor_clase):
            return Response({'detail': 'Solo podés cambiar a una clase de igual o menor precio.'}, status=400)

        ocurrencias = _ocurrencias_restantes(nueva_clase, suscripcion.mes, suscripcion.anio)
        if not ocurrencias:
            return Response({'detail': 'No hay clases disponibles este mes para el nuevo turno.'}, status=400)

        from datetime import date as Date
        from django.db import transaction

        with transaction.atomic():
            # Cancelar reservas futuras de la clase vieja
            hoy = Date.today()
            reservas_viejas = suscripcion.reservas.filter(fecha__gte=hoy, estado='activa')
            for r in reservas_viejas:
                r.estado = 'cancelada'
                r.save(update_fields=['estado'])

            # Limpiar reservas canceladas previas de la nueva clase (evitar UNIQUE constraint)
            Reserva.objects.filter(
                usuario=request.user, clase=nueva_clase,
                fecha__in=ocurrencias, estado='cancelada',
            ).delete()

            # Crear reservas para la nueva clase
            nuevas_reservas = []
            for fecha in ocurrencias:
                reserva = Reserva.objects.create(
                    usuario=request.user,
                    clase=nueva_clase,
                    fecha=fecha,
                    estado='activa',
                    tipo='suscripcion',
                )
                nuevas_reservas.append(reserva)

            suscripcion.clase = nueva_clase
            suscripcion.save(update_fields=['clase'])
            suscripcion.reservas.add(*nuevas_reservas)

            vieja_clase.inscriptos.remove(request.user)
            nueva_clase.inscriptos.add(request.user)

            # Asignar el cupo liberado al próximo en lista de espera
            _asignar_cupo_lista_espera(vieja_clase)

        return Response({'detail': 'Turno cambiado exitosamente.'}, status=200)


class CambiarCapacidadView(APIView):
    """
    PATCH /api/clases/<pk>/cambiar-capacidad/
    Body: { "cupo": <int> }
    - Nueva capacidad >= inscriptos: actualiza cupo y asigna desde lista de espera si amplió.
    - Nueva capacidad < inscriptos: cancela la clase, notifica a inscriptos por mail (abonados→crédito, no abonados→seña).
    Solo admin.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)

        try:
            clase = Clase.objects.select_related('sala').prefetch_related('inscriptos').get(pk=pk)
        except Clase.DoesNotExist:
            return Response({'detail': 'Clase no encontrada.'}, status=404)

        nuevo_cupo = request.data.get('cupo')
        if nuevo_cupo is None:
            return Response({'detail': 'Debés indicar el nuevo cupo.'}, status=400)
        try:
            nuevo_cupo = int(nuevo_cupo)
            if nuevo_cupo <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'detail': 'El cupo debe ser un número entero positivo.'}, status=400)

        if clase.sala and nuevo_cupo > clase.sala.capacidad:
            return Response(
                {'detail': f'El cupo ({nuevo_cupo}) supera la capacidad máxima de la sala "{clase.sala.nombre}" ({clase.sala.capacidad}).'},
                status=400,
            )

        cantidad_inscriptos = clase.inscriptos.count()

        if nuevo_cupo >= cantidad_inscriptos:
            clase.cupo = nuevo_cupo
            clase.save(update_fields=['cupo'])
            while _asignar_cupo_lista_espera(clase):
                pass
            return Response({'detail': 'Capacidad actualizada con éxito.', 'cancelada': False}, status=200)

        # Reducción por debajo de inscriptos → cancelar clase
        from datetime import date as Date
        hoy = Date.today()

        nombre_clase = clase.nombre
        inscriptos   = list(clase.inscriptos.all())

        usuarios_abonados = set(
            Suscripcion.objects
            .filter(clase=clase, estado__in=[Suscripcion.Estado.ACTIVA, Suscripcion.Estado.PENDIENTE_PAGO])
            .values_list('usuario_id', flat=True)
        )

        for usuario in inscriptos:
            es_abonado = usuario.id in usuarios_abonados

            # Generar crédito para abonados (igual que CancelarClaseSuscripcionView)
            credito_generado = False
            if es_abonado:
                total_creditos = Credito.objects.filter(
                    usuario=usuario, mes=hoy.month, anio=hoy.year, usado=False
                ).count()
                if total_creditos < 3:
                    Credito.objects.create(
                        usuario=usuario,
                        tipo_clase=clase.especialidad,
                        mes=hoy.month,
                        anio=hoy.year,
                    )
                    credito_generado = True

            if es_abonado:
                if credito_generado:
                    detalle = (
                        f'Se generó automáticamente un crédito de {clase.get_especialidad_display()} '
                        f'válido para el mes en curso.'
                    )
                else:
                    detalle = (
                        f'Ya contás con 3 créditos activos este mes, '
                        f'por lo que no se generó un crédito adicional.'
                    )
            else:
                detalle = 'Se gestionará la devolución de tu seña a la brevedad.'

            cuerpo = (
                f'Hola {usuario.first_name},\n\n'
                f'Te informamos que la clase "{nombre_clase}" fue cancelada por el centro.\n\n'
                f'{detalle}\n\n'
                f'Saludos,\nEquipo RehabilitAR'
            )
            try:
                mail = EmailMessage(
                    subject=f'Clase cancelada: {nombre_clase} — RehabilitAR',
                    body=cuerpo,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[usuario.email],
                )
                mail.encoding = 'utf-8'
                mail.send(fail_silently=True)
            except Exception:
                pass

        clase.delete()
        return Response(
            {
                'detail': (
                    f'La clase "{nombre_clase}" fue cancelada porque la nueva capacidad '
                    f'({nuevo_cupo}) es menor a la cantidad de inscriptos actuales ({cantidad_inscriptos}).'
                ),
                'cancelada': True,
            },
            status=200,
        )
