from datetime import date

from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'role', 'full_name', 'phone', 'birth_date', 'is_active',
        ]
        read_only_fields = ['id', 'full_name']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'password', 'first_name', 'last_name',
            'phone', 'birth_date',
            'address', 'address_number', 'address_floor', 'address_apt',
        ]
        extra_kwargs = {
            'birth_date':     {'required': True},
            'phone':          {'required': True},
            'address':        {'required': True},
            'address_number': {'required': True},
            'address_floor':  {'required': False, 'allow_blank': True},
            'address_apt':    {'required': False, 'allow_blank': True},
        }

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError('Este mail ya se encuentra registrado.')
        return value.lower()

    def validate_password(self, value):
        if len(value) < 8 or not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
            raise serializers.ValidationError('La contraseña no cumple con requisitos de seguridad.')
        return value

    def validate_birth_date(self, value):
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 18:
            raise serializers.ValidationError('Debe ser mayor de edad para poder registrarse en el sitio.')
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            role=User.Role.CLIENT,
            **validated_data,
        )


ESPECIALIDADES_VALIDAS = {'tren_superior', 'tren_inferior', 'tren_medio'}


class AdminRegisterSerializer(serializers.ModelSerializer):
    """Serializer para que un administrativo cree cualquier tipo de usuario."""
    # Sobrescribimos email para evitar el UniqueValidator automático
    # y dar nuestro mensaje custom en validate_email().
    email          = serializers.EmailField()
    password       = serializers.CharField(write_only=True)
    especialidades = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model  = User
        fields = [
            'email', 'password', 'first_name', 'last_name',
            'phone', 'birth_date',
            'address', 'address_number', 'address_floor', 'address_apt',
            'role', 'especialidades',
        ]
        extra_kwargs = {
            'birth_date':     {'required': True},
            'phone':          {'required': True},
            'address':        {'required': True},
            'address_number': {'required': True},
            'address_floor':  {'required': False, 'allow_blank': True},
            'address_apt':    {'required': False, 'allow_blank': True},
            'role':           {'required': True},
        }

    def validate_birth_date(self, value):
        from datetime import date
        hoy = date.today()
        edad = hoy.year - value.year - ((hoy.month, hoy.day) < (value.month, value.day))
        if edad < 18:
            raise serializers.ValidationError('El usuario debe ser mayor de edad.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError('El mail ya se encuentra registrado.')
        return value.lower()

    def validate_password(self, value):
        if (len(value) < 8
                or not any(c.isalpha() for c in value)
                or not any(c.isdigit() for c in value)):
            raise serializers.ValidationError(
                'La contraseña debe tener al menos 8 caracteres, una letra y un número.'
            )
        return value

    def validate_especialidades(self, value):
        if not value:
            return ''
        partes = [e.strip() for e in value.split(',') if e.strip()]
        invalidas = set(partes) - ESPECIALIDADES_VALIDAS
        if invalidas:
            raise serializers.ValidationError(f'Especialidades inválidas: {", ".join(invalidas)}')
        return ','.join(partes)

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
