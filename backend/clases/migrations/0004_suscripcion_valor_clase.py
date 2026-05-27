from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clases', '0003_reserva_tipo'),
    ]

    operations = [
        migrations.AddField(
            model_name='suscripcion',
            name='valor_clase',
            field=models.DecimalField(
                max_digits=10,
                decimal_places=2,
                default=0,
            ),
        ),
    ]
