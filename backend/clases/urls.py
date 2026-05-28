from django.urls import path
from .views import (
    ClaseListView, ClaseEnCursoListView, ClasePublicaListView,
    MisClasesView, ClasesOfertadasView, AsignarseClaseView, DesasignarseClaseView,
    AsignarProfesorView, DesasignarProfesorView,
    SalaListCreateView, ProfesoresPorEspecialidadView,
    HardDeleteUserView,
    ClasesFijasView, CalcularSuscripcionView, PagarSuscripcionView,
    MisReservasView, MisSuscripcionesView, ClasesParaReprogramarView,
    ClasesParaReservarView, ReservarClaseUnicaView,
    ListaEsperaFechasView,
)

urlpatterns = [
    path('',                           ClaseListView.as_view(),                 name='clase-list'),
    path('en-curso/',                  ClaseEnCursoListView.as_view(),           name='clase-en-curso'),
    path('publicas/',                  ClasePublicaListView.as_view(),           name='clase-publica'),
    path('fijas/',                     ClasesFijasView.as_view(),                name='clases-fijas'),
    path('mis-clases/',                MisClasesView.as_view(),                 name='mis-clases'),
    path('ofertadas/',                 ClasesOfertadasView.as_view(),            name='clases-ofertadas'),
    path('<int:pk>/lista-espera/',     ListaEsperaFechasView.as_view(),          name='lista-espera-fechas'),
    path('<int:pk>/asignarse/',        AsignarseClaseView.as_view(),             name='clase-asignarse'),
    path('<int:pk>/desasignarse/',     DesasignarseClaseView.as_view(),          name='clase-desasignarse'),
    path('<int:pk>/asignar-profesor/', AsignarProfesorView.as_view(),            name='clase-asignar-profesor'),
    path('<int:pk>/desasignar-profesor/', DesasignarProfesorView.as_view(), name='clase-desasignar-profesor'),
    path('salas/',                     SalaListCreateView.as_view(),             name='sala-list-create'),
    path('profesores/',                ProfesoresPorEspecialidadView.as_view(),  name='profesores-especialidad'),
    path('users/<int:pk>/hard-delete/', HardDeleteUserView.as_view(),            name='user-hard-delete'),
    # Suscripciones
    path('suscripciones/calcular/',    CalcularSuscripcionView.as_view(),        name='suscripcion-calcular'),
    path('suscripciones/pagar/',       PagarSuscripcionView.as_view(),           name='suscripcion-pagar'),
    path('suscripciones/mis-reservas/',      MisReservasView.as_view(),         name='mis-reservas'),
    path('suscripciones/mis-suscripciones/', MisSuscripcionesView.as_view(),    name='mis-suscripciones'),
    path('suscripciones/reprogramar/', ClasesParaReprogramarView.as_view(),      name='reprogramar'),
    # Reserva única
    path('para-reservar/',             ClasesParaReservarView.as_view(),          name='clases-para-reservar'),
    path('reservar-unica/',            ReservarClaseUnicaView.as_view(),          name='reservar-unica'),
]
