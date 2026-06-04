from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from django.contrib.auth import authenticate
from django.core.mail import send_mail, EmailMessage
from django.conf import settings

from .serializers import UserSerializer, RegisterSerializer, AdminRegisterSerializer
from .models import User, AptoFisico
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

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Credenciales incorrectas.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.check_password(password):
            return Response(
                {'detail': 'Credenciales incorrectas.'},
                status=status.HTTP_401_UNAUTHORIZED
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
    PUT  /api/auth/me/ — Actualiza los datos del usuario logueado.
    
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
    
    def put(self, request):
        # partial=True permite actualizar solo los campos que envías desde el formulario
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        
        if not serializer.is_valid():
            # Extrae el primer error para mantener el formato limpio que usás en las otras vistas
            first_error = next(iter(serializer.errors.values()))[0]
            return Response(
                {'detail': str(first_error)},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


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


class AdminRegisterView(APIView):
    """
    POST /api/auth/admin-register/
    Crea un usuario de cualquier rol. Solo accesible para administrativos.
    Envía un mail de bienvenida al nuevo usuario.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in (User.Role.ADMIN, User.Role.RECEPTIONIST):
            return Response(
                {'detail': 'No tenés permiso para registrar usuarios.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AdminRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))[0]
            return Response(
                {'detail': str(first_error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.save()

        try:
            send_mail(
                subject='Bienvenido/a a RehabilitAR',
                message=(
                    f'Hola {user.first_name},\n\n'
                    f'Tu cuenta fue creada exitosamente en RehabilitAR.\n'
                    f'Podés ingresar con tu correo: {user.email}\n\n'
                    f'Saludos,\nEquipo RehabilitAR'
                ),
                from_email='noreply@rehabilitar.com',
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response(
            {'detail': 'Usuario registrado exitosamente.'},
            status=status.HTTP_201_CREATED,
        )


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
                if user.role != User.Role.CLIENT:
                    return Response(
                        {'detail': 'Solo se puede suspender a clientes.'},
                        status=status.HTTP_403_FORBIDDEN,
                    )

                reason = request.data.get('reason')
                if not reason:
                    return Response({'detail': 'Debe indicar un motivo.'}, status=status.HTTP_400_BAD_REQUEST)

                user.is_active = False
                user.deleted_reason = reason
                user.save() # Guardamos en BD

                asunto = "Tu cuenta en RehabilitAR ha sido suspendida"
                mensaje = (
                    f"Hola {user.first_name},\n\n"
                    f"Tu cuenta en RehabilitAR ha sido suspendida.\n\n"
                    f"Motivo: {reason}\n\n"
                    f"Si creés que se trata de un error, comunicate con el administrador del centro.\n\n"
                    f"Saludos,\nEquipo RehabilitAR"
                )
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
        
class ChangePasswordView(APIView):
    """
    POST /api/auth/change-pass/
    Body: { "oldPass": "...", "newPass": "..." }
    Response: { "detail": "..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_pass = request.data.get('oldPass', '')
        new_pass = request.data.get('newPass', '')

        if not old_pass or not new_pass:
            return Response(
                {'detail': 'Faltan datos obligatorios.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_pass) < 8:
            return Response(
                {'detail': 'La nueva contraseña debe tener al menos 8 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=request.user.email, password=old_pass)

        if user is None:
            return Response(
                {'detail': 'La contraseña actual es incorrecta.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        request.user.set_password(new_pass)
        request.user.save()

        return Response(
            {'detail': 'Contraseña actualizada correctamente.'},
            status=status.HTTP_200_OK
        )


# ══════════════════════════════════════════════════════════
#  RECUPERAR CONTRASEÑA
# ══════════════════════════════════════════════════════════

class SolicitarCodigoView(APIView):
    """POST /api/auth/recuperar-password/ — envía código al mail."""
    permission_classes = [AllowAny]

    def post(self, request):
        from django.core.cache import cache
        import random, string

        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'detail': 'Ingresá un email.'}, status=status.HTTP_400_BAD_REQUEST)

        if not User.objects.filter(email=email).exists():
            return Response({'detail': 'Este mail no se encuentra registrado.'}, status=status.HTTP_404_NOT_FOUND)

        codigo = ''.join(random.choices(string.digits, k=6))
        cache.set(f'reset_code_{email}', codigo, timeout=600)  # 10 minutos

        try:
            send_mail(
                subject='Código para restablecer tu contraseña — RehabilitAR',
                message=f'Tu código de verificación es: {codigo}',
                from_email='noreply@rehabilitar.com',
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception:
            cache.delete(f'reset_code_{email}')
            return Response({'detail': 'Ocurrio un error, intente nuevamente.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'detail': 'Código enviado.'}, status=status.HTTP_200_OK)


class VerificarCodigoView(APIView):
    """POST /api/auth/verificar-codigo/ — verifica el código ingresado."""
    permission_classes = [AllowAny]

    def post(self, request):
        from django.core.cache import cache

        email  = request.data.get('email', '').strip().lower()
        codigo = request.data.get('codigo', '').strip()

        guardado = cache.get(f'reset_code_{email}')
        if not guardado or guardado != codigo:
            return Response({'detail': 'Código inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'detail': 'Código verificado.'}, status=status.HTTP_200_OK)


class NuevaPasswordView(APIView):
    """POST /api/auth/nueva-password/ — establece la nueva contraseña."""
    permission_classes = [AllowAny]

    def post(self, request):
        from django.core.cache import cache

        email    = request.data.get('email', '').strip().lower()
        codigo   = request.data.get('codigo', '').strip()
        password = request.data.get('password', '')

        guardado = cache.get(f'reset_code_{email}')
        if not guardado or guardado != codigo:
            return Response({'detail': 'Código inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        if (len(password) < 8
                or not any(c.isalpha() for c in password)
                or not any(c.isdigit() for c in password)):
            return Response(
                {'detail': 'La contraseña debe al menos un total de 8 caracteres, entre ellos numeros y letras.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Este mail no se encuentra registrado.'}, status=status.HTTP_404_NOT_FOUND)

        user.set_password(password)
        user.save()
        cache.delete(f'reset_code_{email}')

        return Response({'detail': 'Se restablecio la contraseña con exito.'}, status=status.HTTP_200_OK)


# ══════════════════════════════════════════════════════════
#  APTOS FÍSICOS
# ══════════════════════════════════════════════════════════

class ListarAptosPendientesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        aptos = AptoFisico.objects.filter(estado='PENDIENTE')
        data = [{
            'id': apto.id,
            'usuario_email': apto.usuario.email,
            'documento_url': request.build_absolute_uri(apto.documento.url),
            'fecha_subida': apto.fecha_subida
        } for apto in aptos]
        return Response(data, status=status.HTTP_200_OK)


class ValidarAptoFisicoView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            apto = AptoFisico.objects.get(pk=pk)
        except AptoFisico.DoesNotExist:
            return Response({'error': 'Apto físico no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        accion = request.data.get('accion')
        motivo = request.data.get('motivo_rechazo', '')

        if accion == 'APROBAR':
            apto.estado = 'APROBADO'
            apto.motivo_rechazo = None
            apto.save()
            return Response({'message': 'Apto físico aprobado con éxito y usuario notificado.'}, status=status.HTTP_200_OK)

        elif accion == 'RECHAZAR':
            if not motivo.strip():
                return Response({'error': 'Debe especificar un motivo para el rechazo.'}, status=status.HTTP_400_BAD_REQUEST)
            apto.estado = 'RECHAZADO'
            apto.motivo_rechazo = motivo
            apto.save()
            return Response({'message': 'Apto físico rechazado y usuario notificado.'}, status=status.HTTP_200_OK)

        return Response({'error': 'Acción no válida'}, status=status.HTTP_400_BAD_REQUEST)


class SubirAptoFisicoView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request):
        documento = request.FILES.get('documento')
        if not documento:
            return Response(
                {'detail': 'Por favor, adjunte un documento válido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            AptoFisico.objects.create(
                usuario=request.user,
                documento=documento,
                estado='PENDIENTE'
            )
            return Response(
                {'detail': 'Apto físico subido correctamente y listo para revisión.'},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            print(f"Error al guardar el apto: {str(e)}")
            return Response(
                {'detail': 'Hubo un problema interno al guardar el archivo.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
