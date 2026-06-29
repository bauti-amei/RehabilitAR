from django.urls import path
from .views import (
    ClaseListView, ClaseEnCursoListView, ClasePublicaListView, PendientesDePagoView,
    MisClasesView, ClasesOfertadasView, AsignarseClaseView, DesasignarseClaseView,
    AsignarProfesorView, DesasignarProfesorView,
    SalaListCreateView, ProfesoresPorEspecialidadView,
    HardDeleteUserView,
    ClasesFijasView, CalcularSuscripcionView, PagarSuscripcionView,
    MisReservasView, MisSuscripcionesView, ClasesParaReprogramarView,
    ClasesParaReservarView, ReservarClaseUnicaView, PagarSaldoReservaView,
    ListaEsperaFechasView,
    MisCreditosView, CancelarReservaUnicaView, CancelarClaseSuscripcionView,
    CancelarSuscripcionView,
    CancelarClaseView,
    # Nuestras vistas: cambiar turno y cambiar capacidad
    CambiarCapacidadView, CambiarTurnoView, ClasesDisponiblesParaCambioView,
    # Canje de créditos
    ClasesParaCanjearView, CanjearCreditoView,
    # Asistencia
    ClaseInscriptosAsistenciaView, RegistrarAsistenciaView,
    GenerarQrView, ValidarQrAsistenciaView, MiAsistenciaClaseView,
    # Notificaciones
    NotificacionListView, MarcarNotificacionLeidaView,
)


urlpatterns = [
    path('',                           ClaseListView.as_view(),                 name='clase-list'),
    path('en-curso/',                  ClaseEnCursoListView.as_view(),          name='clase-en-curso'),
    path('publicas/',                  ClasePublicaListView.as_view(),          name='clase-publica'),
    path('fijas/',                     ClasesFijasView.as_view(),               name='clases-fijas'),
    path('mis-clases/',                MisClasesView.as_view(),                 name='mis-clases'),
    path('ofertadas/',                 ClasesOfertadasView.as_view(),           name='clases-ofertadas'),
    path('<int:pk>/lista-espera/',     ListaEsperaFechasView.as_view(),         name='lista-espera-fechas'),
    path('<int:pk>/asignarse/',        AsignarseClaseView.as_view(),            name='clase-asignarse'),
    path('<int:pk>/desasignarse/',     DesasignarseClaseView.as_view(),         name='clase-desasignarse'),
    path('<int:pk>/asignar-profesor/', AsignarProfesorView.as_view(),           name='clase-asignar-profesor'),
    path('<int:pk>/desasignar-profesor/', DesasignarProfesorView.as_view(),     name='clase-desasignar-profesor'),
    path('<int:pk>/cambiar-capacidad/', CambiarCapacidadView.as_view(),         name='clase-cambiar-capacidad'),
    path('salas/',                     SalaListCreateView.as_view(),            name='sala-list-create'),
    path('profesores/',                ProfesoresPorEspecialidadView.as_view(), name='profesores-especialidad'),
    path('users/<int:pk>/hard-delete/', HardDeleteUserView.as_view(),           name='user-hard-delete'),
    # Suscripciones
    path('suscripciones/calcular/',              CalcularSuscripcionView.as_view(),    name='suscripcion-calcular'),
    path('suscripciones/pagar/',                 PagarSuscripcionView.as_view(),       name='suscripcion-pagar'),
    path('suscripciones/mis-reservas/',          MisReservasView.as_view(),            name='mis-reservas'),
    path('suscripciones/mis-suscripciones/',     MisSuscripcionesView.as_view(),       name='mis-suscripciones'),
    path('suscripciones/reprogramar/',           ClasesParaReprogramarView.as_view(),  name='reprogramar'),
    # Reserva única
    path('para-reservar/',             ClasesParaReservarView.as_view(),         name='clases-para-reservar'),
    path('reservar-unica/',            ReservarClaseUnicaView.as_view(),         name='reservar-unica'),
    # Pago de saldo pendiente
    path('pagar-saldo-reserva/<int:pk>/',        PagarSaldoReservaView.as_view(),         name='pagar-saldo-reserva'),
    # Cancelaciones cliente y créditos
    path('mis-creditos/',                        MisCreditosView.as_view(),               name='mis-creditos'),
    path('cancelar-reserva-unica/<int:pk>/',     CancelarReservaUnicaView.as_view(),      name='cancelar-reserva-unica'),
    path('cancelar-clase-suscripcion/<int:pk>/', CancelarClaseSuscripcionView.as_view(),  name='cancelar-clase-suscripcion'),
    path('cancelar-suscripcion/<int:pk>/',       CancelarSuscripcionView.as_view(),       name='cancelar-suscripcion'),
    # Cancelar clase (admin)
    path('cancelar-clase/',                      CancelarClaseView.as_view(),             name='cancelar-clase'),
    # Cambiar turno (cliente)
    path('mis-suscripciones/<int:pk>/cambiar-turno/',      CambiarTurnoView.as_view(),                name='suscripcion-cambiar-turno'),
    path('mis-suscripciones/<int:pk>/clases-disponibles/', ClasesDisponiblesParaCambioView.as_view(), name='suscripcion-clases-disponibles'),
    # Registrar pago presencial
    path('clases-pendientes-pago/', PendientesDePagoView.as_view(), name='clases-pendientes-pago'),
    # Canje de créditos
    path('clases-para-canjear/',    ClasesParaCanjearView.as_view(),  name='clases-para-canjear'),
    path('canjear-credito/',        CanjearCreditoView.as_view(),     name='canjear-credito'),
    # Asistencia
    path('<int:pk>/inscriptos-asistencia/',  ClaseInscriptosAsistenciaView.as_view(), name='inscriptos-asistencia'),
    path('<int:pk>/registrar-asistencia/',   RegistrarAsistenciaView.as_view(),       name='registrar-asistencia'),
    path('<int:pk>/qr/',                     GenerarQrView.as_view(),                 name='generar-qr'),
    path('<int:pk>/mi-asistencia/',          MiAsistenciaClaseView.as_view(),         name='mi-asistencia'),
    path('validar-qr/',                      ValidarQrAsistenciaView.as_view(),       name='validar-qr'),
    path('notificaciones/',                  NotificacionListView.as_view(),          name='notificacion-list'),
    path('notificaciones/<int:pk>/leer/', MarcarNotificacionLeidaView.as_view(), name='marcar-leida'),
]
