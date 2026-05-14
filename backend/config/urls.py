from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Aquí conectamos con el archivo urls.py que ya tenés
    path('api/auth/', include('users.urls')), 
]