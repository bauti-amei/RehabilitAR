"""
Management command: limpiar_suscripciones_canceladas

Ejecutar al inicio de cada mes (ej: cron el día 1 a las 00:05).

    python manage.py limpiar_suscripciones_canceladas

Qué hace:
  - Busca suscripciones con estado='cancelada' de meses anteriores al actual.
  - Para cada una, si el usuario NO tiene una suscripción activa/pendiente para
    esa misma clase en el mes actual, lo saca de clase.inscriptos.
  - Imprime un resumen de lo que hizo.
"""

from datetime import date
from django.core.management.base import BaseCommand
from clases.models import Suscripcion


class Command(BaseCommand):
    help = 'Libera el cupo de usuarios con suscripción cancelada del mes anterior.'

    def handle(self, *args, **options):
        hoy = date.today()
        mes_actual  = hoy.month
        anio_actual = hoy.year

        # Suscripciones canceladas de meses anteriores al actual
        canceladas_viejas = (
            Suscripcion.objects
            .filter(estado=Suscripcion.Estado.CANCELADA)
            .exclude(anio=anio_actual, mes=mes_actual)
            .exclude(anio__gt=anio_actual)
            .select_related('clase', 'usuario')
        )

        liberados = 0
        for susc in canceladas_viejas:
            usuario = susc.usuario
            clase   = susc.clase

            # ¿Tiene una suscripción activa/pendiente para esta clase en el mes actual?
            tiene_nueva = Suscripcion.objects.filter(
                usuario=usuario,
                clase=clase,
                mes=mes_actual,
                anio=anio_actual,
                estado__in=[Suscripcion.Estado.ACTIVA, Suscripcion.Estado.PENDIENTE_PAGO],
            ).exists()

            if not tiene_nueva and clase.inscriptos.filter(pk=usuario.pk).exists():
                clase.inscriptos.remove(usuario)
                liberados += 1
                self.stdout.write(
                    f'  Cupo liberado: {usuario.email} → {clase.nombre}'
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nListo. {liberados} cupo(s) liberado(s) de suscripciones canceladas de meses anteriores.'
            )
        )
