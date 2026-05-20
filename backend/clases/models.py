from django.db import models
from django.conf import settings


class Clase(models.Model):
    tipo            = models.CharField(max_length=100)
    horario_inicio  = models.TimeField()
    horario_fin     = models.TimeField()
    dias            = models.CharField(max_length=100)          # ej. "Lunes, Miércoles"
    aula            = models.CharField(max_length=50)
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
        return f'{self.tipo} — {self.dias} {self.horario_inicio:%H:%M}-{self.horario_fin:%H:%M}'

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
