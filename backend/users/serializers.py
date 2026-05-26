from datetime import date

from rest_framework import serializers

from .models import User, AptoFisico


class UserSerializer(serializers.ModelSerializer):
    apto_estado = serializers.SerializerMethodField()
    apto_url = serializers.SerializerMethodField()

    apto_motivo_rechazo = serializers.SerializerMethodField() 
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'role', 'full_name', 'phone', 'birth_date', 'is_active',
            'address', 'address_number', 'address_floor', 'address_apt',
            'apto_estado', 'apto_url', 'apto_motivo_rechazo'
        ]
        read_only_fields = ['id', 'full_name']

        # Buscamos el último apto físico que subió este usuario
    def get_apto_estado(self, obj):
        apto = AptoFisico.objects.filter(usuario=obj).last()
        return apto.estado if apto else 'NO_SUBIDO'

    def get_apto_url(self, obj):
        apto = AptoFisico.objects.filter(usuario=obj).last()
        if apto and apto.documento:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(apto.documento.url)
            return apto.documento.url
        return None
    
    def get_apto_motivo_rechazo(self, obj):
        apto = AptoFisico.objects.filter(usuario=obj).last()
        if apto and apto.estado == 'RECHAZADO':
            return apto.motivo_rechazo or ""
        return ""


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
