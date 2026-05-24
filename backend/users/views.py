from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from django.contrib.auth import authenticate
from django.core.mail import EmailMessage
from django.conf import settings

from .serializers import UserSerializer, RegisterSerializer
from .models import User
from .services.dni_service import validate_dni


def get_tokens_for_user(user):
    """Genera par de tokens JWT para un usuario."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access':  str(refresh.access_token),
    }


class LoginView(APIView):
    """
    POST /api/auth/login/
    Body: { "email": "...", "password": "..." }
    Response: { "access", "refresh", "user": { id, name, email, role } }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email    = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        if not email or not password:
            return Response(
                {'detail': 'Email y contraseña son obligatorios.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=email, password=password)

        if user is None:
            return Response(
                {'detail': 'Credenciales incorrectas.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'detail': 'Tu cuenta está suspendida. Contactá al administrador.'},
                status=status.HTTP_403_FORBIDDEN
            )

        tokens = get_tokens_for_user(user)

        return Response({
            'access':  tokens['access'],
            'refresh': tokens['refresh'],
            'user':    UserSerializer(user).data,
        }, status=status.HTTP_200_OK)


class RefreshView(APIView):
    """
    POST /api/auth/refresh/
    Body: { "refresh": "..." }
    Response: { "access": "..." }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Token de refresco requerido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            refresh = RefreshToken(refresh_token)
            return Response({'access': str(refresh.access_token)})
        except TokenError:
            return Response(
                {'detail': 'Token inválido o expirado.'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class MeView(APIView):
    """
    GET /api/auth/me/
    Devuelve los datos del usuario logueado.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Body: { "refresh": "..." }
    Invalida el refresh token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Token de refresco requerido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass  # Si ya expiró, no importa
        return Response({'detail': 'Sesión cerrada correctamente.'})


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Body: multipart/form-data con los campos del usuario + archivo dni_photo
    """
    permission_classes = [AllowAny]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request):
        dni_photo = request.FILES.get('dni_photo')
        if not dni_photo:
            return Response(
                {'detail': 'Por favor, complete todos los campos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not validate_dni(dni_photo):
            return Response(
                {'detail': 'No pudimos verificar que tu DNI sea válido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))[0]
            return Response(
                {'detail': str(first_error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer.save()
        return Response(
            {'detail': 'Registro exitoso.'},
            status=status.HTTP_201_CREATED,
        )


class UserListView(APIView):
    """
    GET /api/auth/users/
    Devuelve la lista de todos los usuarios. Solo accesible para admins.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in (User.Role.ADMIN, User.Role.RECEPTIONIST):
            return Response(
                {'detail': 'No tenés permiso para ver esta información.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        users = User.objects.all().order_by('last_name', 'first_name')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class DeleteUserView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        # 1. Validar permisos de Admin
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # 2. 🚨 CLAVE: Buscar al usuario en la base de datos primero
            user = User.objects.get(id=user_id)
            
            # 3. Determinar acción según el estado actual
            if user.is_active:
                # ACCIÓN: SUSPENDER (Estaba activo, pasa a inactivo)
                reason = request.data.get('reason')
                if not reason:
                    return Response({'detail': 'Debe indicar un motivo.'}, status=status.HTTP_400_BAD_REQUEST)
                
                user.is_active = False  
                user.deleted_reason = reason
                user.save() # Guardamos en BD
                
                asunto = "Tu cuenta en RehabilitAR ha sido suspendida"
                mensaje = f"Hola {user.first_name},\n\nTe informamos que tu cuenta ha sido suspendida.\nMotivo:\n\"{reason}\""
            else:
                # ACCIÓN: ACTIVAR (Estaba inactivo, pasa a activo)
                user.is_active = True
                user.deleted_reason = None  
                user.save() # Guardamos en BD
                
                asunto = "Tu cuenta en RehabilitAR ha sido reactivada"
                mensaje = f"Hola {user.first_name},\n\n¡Buenas noticias! Tu cuenta ha sido reactivada por el administrador. Ya podés volver a ingresar a la plataforma."

            # 4. Enviar el mail de forma segura (Una sola vez, blindado contra ASCII/eñes)
            try:
                email = EmailMessage(
                    subject=asunto,
                    body=mensaje,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[user.email]
                )
                email.encoding = 'utf-8' # Forzamos UTF-8
                email.send(fail_silently=False)
                print("📧 ¡Mail enviado/impreso con éxito!")
            except Exception as mail_error:
                print(f"⚠️ Error al enviar el mail: {str(mail_error)}")

            # 5. Respuesta exitosa al frontend
            return Response(
                {'message': 'Estado del usuario actualizado', 'is_active': user.is_active},
                status=status.HTTP_200_OK
            )

        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)