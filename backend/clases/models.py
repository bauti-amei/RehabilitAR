from django.db import models
from django.conf import settings


class Sala(models.Model):
    nombre    = models.CharField(max_length=100, unique=True)
    capacidad = models.PositiveIntegerField()

    def __str__(self):
        return self.nombre


DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']


class Clase(models.Model):

    class Especialidad(models.TextChoices):
        TREN_SUPERIOR = 'tren_superior', 'Tren Superior'
        TREN_INFERIOR = 'tren_inferior', 'Tren Inferior'
        TREN_MEDIO    = 'tren_medio',    'Tren Medio'

    class TipoClase(models.TextChoices):
        FIJA       = 'fija',       'Fija'
        INDIVIDUAL = 'individual', 'Individual'

    # ── Identificación ────────────────────────────────
    nombre          = models.CharField(max_length=100, unique=True, default='')
    especialidad    = models.CharField(max_length=20, choices=Especialidad.choices, default=Especialidad.TREN_SUPERIOR)
    tipo_clase      = models.CharField(max_length=20, choices=TipoClase.choices, default=TipoClase.FIJA)

    # ── Horario ───────────────────────────────────────
    horario_inicio  = models.TimeField()
    horario_fin     = models.TimeField()
    dias            = models.CharField(max_length=50, default='')   # "Lunes" para fija; día de la fecha para individual
    fecha           = models.DateField(null=True, blank=True)  # solo para clases individuales

    # ── Económico ─────────────────────────────────────
    valor           = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # ── Info adicional ────────────────────────────────
    descripcion     = models.TextField(blank=True, default='')

    # ── Asignación de profesor ────────────────────────
    ofertada        = models.BooleanField(default=False)  # True → profesores pueden auto-asignarse

    sala            = models.ForeignKey(
        Sala,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='clases',
    )
    cupo            = models.PositiveIntegerField(default=10)
    profesor        = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='clases_como_profesor',
        limit_choices_to={'role': 'teacher'},
    )
    inscriptos   = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='clases_inscripto',
    )
    lista_espera = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='clases_en_espera',
    )

    def __str__(self):
        return f'{self.nombre} — {self.dias} {self.horario_inicio:%H:%M}-{self.horario_fin:%H:%M}'

    @property
    def aula(self):
        """Nombre del aula para compatibilidad con el serializer."""
        return self.sala.nombre if self.sala else None

    @property
    def horario(self):
        return f'{self.horario_inicio.strftime("%H:%M")} - {self.horario_fin.strftime("%H:%M")}'

    @property
    def cantidad_inscriptos(self):
        return self.inscriptos.count()

    @property
    def en_curso(self):
        from datetime import datetime
        ahora = datetime.now().time()
        return self.horario_inicio <= ahora <= self.horario_fin


class Reserva(models.Model):
    class Estado(models.TextChoices):
        ACTIVA       = 'activa',       'Activa'
        LISTA_ESPERA = 'lista_espera', 'En lista de espera'
        CANCELADA    = 'cancelada',    'Cancelada'

    class Tipo(models.TextChoices):
        SUSCRIPCION = 'suscripcion', 'Suscripción'
        UNICA       = 'unica',       'Única'

    usuario    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservas')
    clase      = models.ForeignKey(Clase, on_delete=models.CASCADE, related_name='reservas')
    fecha      = models.DateField()
    estado     = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVA)
    tipo       = models.CharField(max_length=15, choices=Tipo.choices, default=Tipo.UNICA)
    # Reprogramación de feriado
    clase_alt  = models.ForeignKey(Clase, null=True, blank=True, on_delete=models.SET_NULL, related_name='reservas_alt')
    fecha_alt  = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['usuario', 'clase', 'fecha']]

    def __str__(self):
        return f'{self.usuario} — {self.clase.nombre} — {self.fecha}'


class Suscripcion(models.Model):
    class Estado(models.TextChoices):
        ACTIVA         = 'activa',         'Activa'
        PENDIENTE_PAGO = 'pendiente_pago', 'Pendiente de pago'

    usuario    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='suscripciones')
    clase      = models.ForeignKey(Clase, on_delete=models.CASCADE, related_name='suscripciones')
    mes        = models.PositiveSmallIntegerField()
    anio       = models.PositiveSmallIntegerField()
    monto      = models.DecimalField(max_digits=10, decimal_places=2)
    estado     = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVA)
    reservas   = models.ManyToManyField(Reserva, blank=True, related_name='suscripcion_set')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['usuario', 'clase', 'mes', 'anio']]

    def __str__(self):
        return f'{self.usuario} — {self.clase.nombre} — {self.mes}/{self.anio}'
