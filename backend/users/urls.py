from django.urls import path
from .views import LoginView, RefreshView, MeView, LogoutView, RegisterView, UserListView, DeleteUserView, ListarAptosPendientesView, ValidarAptoFisicoView, SubirAptoFisicoView

urlpatterns = [
    path('login/',    LoginView.as_view(),    name='auth-login'),
    path('refresh/',  RefreshView.as_view(),  name='auth-refresh'),
    path('me/',       MeView.as_view(),       name='auth-me'),
    path('logout/',   LogoutView.as_view(),   name='auth-logout'),
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('users/',    UserListView.as_view(), name='auth-users'),
    path('users/<int:user_id>/', DeleteUserView.as_view(), name='delete-user'),
    path('aptos/pendientes/', ListarAptosPendientesView.as_view(), name='aptos-pendientes'),
    path('aptos/<int:pk>/validar/', ValidarAptoFisicoView.as_view(), name='validar-apto'),
    path('aptos/subir/', SubirAptoFisicoView.as_view(), name='subir-apto'),
]
