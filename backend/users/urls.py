from django.urls import path
from .views import ChangePasswordView, LoginView, RefreshView, MeView, LogoutView, RegisterView, UserListView, AdminRegisterView, DeleteUserView

urlpatterns = [
    path('login/',          LoginView.as_view(),         name='auth-login'),
    path('refresh/',        RefreshView.as_view(),       name='auth-refresh'),
    path('me/',             MeView.as_view(),            name='auth-me'),
    path('logout/',         LogoutView.as_view(),        name='auth-logout'),
    path('register/',       RegisterView.as_view(),      name='auth-register'),
    path('users/',          UserListView.as_view(),      name='auth-users'),
    path('users/<int:user_id>/', DeleteUserView.as_view(), name='delete-user'),
    path('admin-register/', AdminRegisterView.as_view(), name='auth-admin-register'),
    path('change-pass/', ChangePasswordView.as_view(), name='auth-change-pass')
]
