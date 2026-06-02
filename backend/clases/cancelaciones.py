from datetime import date, datetime, timedelta, timezone
from django.conf import settings
from django.core.mail import send_mail

from .models import Clase, Credito, Reserva

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

MENSAJES_CANCELACION = {
    'sin_profesor':   'fue cancelada porque no hay profesor asignado para esa fecha.',
    'baja_ocupacion': 'fue cancelada por no alcanzar el mínimo de inscriptos requerido.',
    'admin':          'fue cancelada por el administrador.',
}

def _procesar_reembolso(reserva:Reserva):
    """
    Clientes abonados → crédito
    Clientes no abonados → devolver seña
    """
    usuario = reserva.usuario

    if reserva.tipo == Reserva.Tipo.SUSCRIPCION:
        hoy = date.today()
        total_creditos = Credito.objects.filter(
            usuario=usuario, mes=hoy.month, anio=hoy.year, usado=False
        ).count()
        if total_creditos < 3:
            Credito.objects.create(
                usuario=usuario,
                tipo_clase=reserva.clase.especialidad,
                mes=hoy.month,
                anio=hoy.year,
            )
    else:
        # TODO: Devolver seña: registrar devolución pendiente / llamar a pasarela
        pass

        


def cancelar_clase(clase_obj, motivo):
    clase_obj.estado = 'cancelada'
    clase_obj.motivo_cancelacion = motivo
    clase_obj.fecha_cancelacion = datetime.now()
    clase_obj.save(update_fields=['estado','motivo_cancelacion','fecha_cancelacion'])


    reservas = Reserva.objects.filter(clase=clase_obj, estado__in=['activa', 'lista_espera']).select_related('usuario')
    razon = MENSAJES_CANCELACION.get(motivo, 'fue cancelada.')
    count = 0
    for r in reservas:
        # Cancelar cada reserva
        was_active = r.estado == Reserva.Estado.ACTIVA
        r.estado = Reserva.Estado.CANCELADA
        r.save(update_fields=['estado'])
        count += 1

        if was_active:
            try:
                clase_obj.inscriptos.remove(r.usuario)
            except Exception:
                pass

        # Notificar a cada usuario
        try:
            send_mail(
                subject='Clase cancelada — RehabilitAR',
                message=(
                    f'Hola {r.usuario.first_name},\n\n'
                    f'La clase "{clase_obj.nombre}" del {clase_obj.fecha} {razon}\n\n'
                    f'Saludos,\nEquipo RehabilitAR'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[r.usuario.email],
                fail_silently=True,
            )
        except Exception:
            pass

        _procesar_reembolso(r)

    return count

def cancelar_sin_profesor_job():
    hoy = timezone.localdate()
    DIAS_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    dia_hoy = DIAS_ES[hoy.weekday()]

    clases = Clase.objects.filter(estado='activa', profesor__isnull=True)
    for clase in clases:
        if (clase.tipo_clase == 'individual' and clase.fecha == hoy) or \
           (clase.tipo_clase == 'fija' and clase.dias == dia_hoy):
            cancelar_clase(clase, 'sin_profesor')


def cancelar_baja_ocupacion_job():
    ahora = timezone.now()
    en_una_hora = ahora + timedelta(hours=1)

    clases = Clase.objects.filter(
        estado='activa',
        horario_inicio__range=(
            (en_una_hora - timedelta(minutes=10)).time(),
            (en_una_hora + timedelta(minutes=10)).time(),
        ),
    ).prefetch_related('inscriptos')

    for clase in clases:
        inscriptos = clase.inscriptos.count()
        if clase.cupo > 0 and inscriptos < (clase.cupo * 0.5):
            cancelar_clase(clase, 'baja_ocupacion')


# Automatización de las funciones de arriba
def start():
    scheduler = BackgroundScheduler(timezone=timezone.get_current_timezone())

    # Todos los días a las 00:00 checkea por profesor
    scheduler.add_job(
        cancelar_sin_profesor_job,
        IntervalTrigger(hours=12),
        id='cancelar_sin_profesor',
        replace_existing=True,
    )

    # Cada 10 minutos chequea por falta de quorum
    scheduler.add_job(
        cancelar_baja_ocupacion_job,
        IntervalTrigger(minutes=10),
        id='cancelar_baja_ocupacion',
        replace_existing=True,
    )

    scheduler.start()

