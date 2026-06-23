from django.db import models
from django.conf import settings


class Sala(models.Model):
    nombre    = models.CharField(max_length=100, unique=True)
    capacidad = models.PositiveIntegerField()

    def __str__(self):
        return self.nombre


DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']


class Clase(models.Model):

    ESTADOS = [
        ('activa', 'Activa'),
        ('cancelada', 'Cancelada'),
    ]
    
    MOTIVOS = [
        ('admin', 'Cancelada por administrador'),
        ('sin_profesor', 'Sin profesor asignado'),
        ('sin_cuorum', 'Sin cuórum'),
    ]

    class Especialidad(models.TextChoices):
        TREN_SUPERIOR = 'tren_superior', 'Tren Superior'
        TREN_INFERIOR = 'tren_inferior', 'Tren Inferior'
        TREN_MEDIO    = 'tren_medio',    'Tren Medio'

    class TipoClase(models.TextChoices):
        FIJA       = 'fija',       'Fija'
        INDIVIDUAL = 'individual', 'Individual'

    # ── Identificación ────────────────────────────────
    nombre          = models.CharField(max_length=100, default='')
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

    # -- Cancelación -----------------------------------
    estado = models.CharField(max_length=20, choices=ESTADOS, default='activa')
    motivo_cancelacion = models.CharField(max_length=20, choices=MOTIVOS, null=True, blank=True)
    fecha_cancelacion = models.DateTimeField(null=True, blank=True)

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
        DIAS_MAP = {
            'Lunes': 0, 'Martes': 1, 'Miércoles': 2,
            'Jueves': 3, 'Viernes': 4, 'Sábado': 5, 'Domingo': 6,
        }
        if self.estado == 'cancelada':
            return False
        ahora = datetime.now()
        hora_actual = ahora.time()
        if not (self.horario_inicio <= hora_actual <= self.horario_fin):
            return False
        if self.tipo_clase == self.TipoClase.FIJA:
            dias_list = [d.strip() for d in self.dias.replace('/', ',').split(',')]
            return ahora.weekday() in {DIAS_MAP[d] for d in dias_list if d in DIAS_MAP}
        else:  # individual
            return self.fecha == ahora.date()


class Asistencia(models.Model):
    clase   = models.ForeignKey(Clase, on_delete=models.CASCADE, related_name='asistencias')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='asistencias')
    fecha   = models.DateField()

    class Meta:
        unique_together = ('clase', 'usuario', 'fecha')

    def __str__(self):
        return f'{self.usuario} — {self.clase} — {self.fecha}'


class Reserva(models.Model):
    class Estado(models.TextChoices):
        ACTIVA       = 'activa',       'Activa'
        LISTA_ESPERA = 'lista_espera', 'En lista de espera'
        CANCELADA    = 'cancelada',    'Cancelada'

    class Tipo(models.TextChoices):
        SUSCRIPCION = 'suscripcion', 'Suscripción'
        UNICA       = 'unica',       'Única'

    usuario      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservas')
    clase        = models.ForeignKey(Clase, on_delete=models.CASCADE, related_name='reservas')
    fecha        = models.DateField()
    estado       = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVA)
    tipo         = models.CharField(max_length=15, choices=Tipo.choices, default=Tipo.UNICA)
    # Reprogramación de feriado
    clase_alt    = models.ForeignKey(Clase, null=True, blank=True, on_delete=models.SET_NULL, related_name='reservas_alt')
    fecha_alt    = models.DateField(null=True, blank=True)
    # Pago
    monto_total  = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    monto_pagado = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    estado_pago  = models.CharField(
        max_length=20,
        choices=[('pagado', 'Pagado'), ('pendiente_pago', 'Pendiente de pago')],
        null=True, blank=True,
    )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['usuario', 'clase', 'fecha']]

    def __str__(self):
        return f'{self.usuario} — {self.clase.nombre} — {self.fecha}'


class Suscripcion(models.Model):
    class Estado(models.TextChoices):
        ACTIVA         = 'activa',         'Activa'
        PENDIENTE_PAGO = 'pendiente_pago', 'Pendiente de pago'
        CANCELADA      = 'cancelada',      'Cancelada'

    usuario                = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='suscripciones')
    clase                  = models.ForeignKey(Clase, on_delete=models.CASCADE, related_name='suscripciones')
    mes                    = models.PositiveSmallIntegerField()
    anio                   = models.PositiveSmallIntegerField()
    monto                  = models.DecimalField(max_digits=10, decimal_places=2)
    valor_clase            = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # precio unitario al momento de la compra (para cambiar turno)
    estado                 = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVA)
    reservas               = models.ManyToManyField(Reserva, blank=True, related_name='suscripcion_set')
    # Cancelaciones en ventana 24-48h (para descuento en próximo mes)
    cancelaciones_24_48h   = models.PositiveSmallIntegerField(default=0)
    descuento_siguiente_mes = models.PositiveSmallIntegerField(default=0)   # 0, 20 o 30 %
    monto_pagado           = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at             = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['usuario', 'clase', 'mes', 'anio']]

    def __str__(self):
        return f'{self.usuario} — {self.clase.nombre} — {self.mes}/{self.anio}'


class Credito(models.Model):
    """Crédito generado por cancelación de clase de suscripción con > 48 h de anticipación."""
    usuario       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='creditos')
    tipo_clase    = models.CharField(max_length=20)   # 'tren_superior' | 'tren_inferior' | 'tren_medio'
    mes           = models.PositiveSmallIntegerField()
    anio          = models.PositiveSmallIntegerField()
    usado         = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.usuario} — {self.tipo_clase} — {self.mes}/{self.anio}'
