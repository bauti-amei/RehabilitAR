from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clases', '0005_add_credito_and_suscripcion_cancelacion'),
    ]

    operations = [
        # Campos de pago en Reserva
        migrations.AddField(
            model_name='reserva',
            name='monto_total',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='reserva',
            name='monto_pagado',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='reserva',
            name='estado_pago',
            field=models.CharField(
                blank=True, max_length=20, null=True,
                choices=[('pagado', 'Pagado'), ('pendiente_pago', 'Pendiente de pago')],
            ),
        ),
        # Campo de pago en Suscripcion
        migrations.AddField(
            model_name='suscripcion',
            name='monto_pagado',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
    ]
