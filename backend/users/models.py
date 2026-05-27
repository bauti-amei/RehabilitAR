from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.conf import settings

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', User.Role.ADMIN)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):

    class Role(models.TextChoices):
        ADMIN        = 'admin',        'Administrador'
        TEACHER      = 'teacher',      'Profesor'
        RECEPTIONIST = 'receptionist', 'Recepcionista'
        CLIENT       = 'client',       'Cliente'

    # ── Campos base ───────────────────────────────────
    email          = models.EmailField(unique=True)
    first_name     = models.CharField(max_length=100)
    last_name      = models.CharField(max_length=100)
    phone          = models.CharField(max_length=30, blank=True)
    birth_date     = models.DateField(null=True, blank=True)
    address        = models.CharField(max_length=200, blank=True)
    address_number = models.CharField(max_length=20, blank=True)
    address_floor  = models.CharField(max_length=20, blank=True)
    address_apt    = models.CharField(max_length=20, blank=True)
    role           = models.CharField(max_length=20, choices=Role.choices, default=Role.CLIENT)

    # ── Especialidades (solo para profesores) ─────────
    # Valores separados por coma: "tren_superior,tren_inferior,tren_medio"
    especialidades = models.CharField(max_length=200, blank=True, default='')

    # ── Estado ────────────────────────────────────────
    is_active   = models.BooleanField(default=True)
    is_staff    = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD  = 'email'       # login con email, no username
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name      = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.email})'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'

class AptoFisico(models.Model):
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('APROBADO', 'Aprobado'),
        ('RECHAZADO', 'Rechazado'),
    ]
    
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='aptos_fisicos')
    documento = models.FileField(upload_to='aptos_medicos/')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    motivo_rechazo = models.TextField(blank=True, null=True)
    fecha_subida = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Apto de {self.usuario.email} - {self.estado}"