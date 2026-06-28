import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('clases', '0011_add_motivo_cancelacion_reserva'),
    ]

    operations = [
        migrations.CreateModel(
            name='QrAsistencia',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha', models.DateField()),
                ('token', models.UUIDField(default=uuid.uuid4, unique=True)),
                ('clase', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='qr_tokens', to='clases.clase')),
            ],
            options={
                'unique_together': {('clase', 'fecha')},
            },
        ),
    ]
