from django.urls import path
from .views import (
    ClaseListView, ClaseEnCursoListView, ClasePublicaListView,
    MisClasesView, ClasesOfertadasView, AsignarseClaseView, DesasignarseClaseView,
    AsignarProfesorView,
    SalaListCreateView, ProfesoresPorEspecialidadView,
    HardDeleteUserView,
)

urlpatterns = [
    path('',                          ClaseListView.as_view(),                name='clase-list'),
    path('en-curso/',                 ClaseEnCursoListView.as_view(),          name='clase-en-curso'),
    path('publicas/',                 ClasePublicaListView.as_view(),          name='clase-publica'),
    path('mis-clases/',               MisClasesView.as_view(),                name='mis-clases'),
    path('ofertadas/',                ClasesOfertadasView.as_view(),           name='clases-ofertadas'),
    path('<int:pk>/asignarse/',       AsignarseClaseView.as_view(),            name='clase-asignarse'),
    path('<int:pk>/asignar-profesor/', AsignarProfesorView.as_view(),          name='clase-asignar-profesor'),
    path('salas/',                    SalaListCreateView.as_view(),            name='sala-list-create'),
    path('profesores/',               ProfesoresPorEspecialidadView.as_view(), name='profesores-especialidad'),
    path('users/<int:pk>/hard-delete/', HardDeleteUserView.as_view(), name='user-hard-delete'),
]
