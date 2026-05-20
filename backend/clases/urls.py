from django.urls import path
from .views import ClaseListView, ClaseEnCursoListView

urlpatterns = [
    path('',         ClaseListView.as_view(),       name='clase-list'),
    path('en-curso/', ClaseEnCursoListView.as_view(), name='clase-en-curso'),
]
