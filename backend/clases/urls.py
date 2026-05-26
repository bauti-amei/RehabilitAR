from django.urls import path
from .views import (
    ClaseListView, ClaseEnCursoListView, ClasePublicaListView,
    MisClasesView, ClasesOfertadasView, AsignarseClaseView, DesasignarseClaseView,
    AsignarProfesorView, ListaEsperaView, CambiarCapacidadView,
    SalaListCreateView, ProfesoresPorEspecialidadView,
    MisSuscripcionesView, CancelarSuscripcionView, CambiarTurnoView,
    ClasesDisponiblesParaCambioView,
)

urlpatterns = [
    path('',                           ClaseListView.as_view(),                 name='clase-list'),
    path('en-curso/',                  ClaseEnCursoListView.as_view(),          name='clase-en-curso'),
    path('publicas/',                  ClasePublicaListView.as_view(),          name='clase-publica'),
    path('mis-clases/',                MisClasesView.as_view(),                 name='mis-clases'),
    path('ofertadas/',                 ClasesOfertadasView.as_view(),           name='clases-ofertadas'),
    path('<int:pk>/asignarse/',        AsignarseClaseView.as_view(),            name='clase-asignarse'),
    path('<int:pk>/desasignarse/',     DesasignarseClaseView.as_view(),         name='clase-desasignarse'),
    path('<int:pk>/asignar-profesor/', AsignarProfesorView.as_view(),           name='clase-asignar-profesor'),
    path('<int:pk>/lista-espera/',     ListaEsperaView.as_view(),               name='clase-lista-espera'),
    path('<int:pk>/cambiar-capacidad/', CambiarCapacidadView.as_view(),          name='clase-cambiar-capacidad'),
    path('salas/',                     SalaListCreateView.as_view(),            name='sala-list-create'),
    path('profesores/',                ProfesoresPorEspecialidadView.as_view(), name='profesores-especialidad'),
    # Suscripciones del cliente
    path('mis-suscripciones/',                                    MisSuscripcionesView.as_view(),            name='mis-suscripciones'),
    path('mis-suscripciones/<int:pk>/cancelar/',                  CancelarSuscripcionView.as_view(),         name='suscripcion-cancelar'),
    path('mis-suscripciones/<int:pk>/cambiar-turno/',             CambiarTurnoView.as_view(),                name='suscripcion-cambiar-turno'),
    path('mis-suscripciones/<int:pk>/clases-disponibles/',        ClasesDisponiblesParaCambioView.as_view(), name='suscripcion-clases-disponibles'),
]
