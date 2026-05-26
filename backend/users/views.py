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

<<<<<<< HEAD
from .serializers import UserSerializer, RegisterSerializer
from .models import User, AptoFisico
=======
from .serializers import UserSerializer, RegisterSerializer, AdminRegisterSerializer
from .models import User
>>>>>>> 735e7c4372bcfe42da509f3898aa1746fa73cdac
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
    PATCH /api/auth/me/ -> Actualiza los datos del usuario logueado.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        user = request.user
        # partial=True le dice a Django que solo vamos a actualizar algunos campos (PATCH)
        serializer = UserSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        # Si hay un error de validación (ej: celular mal puesto), devolvemos el error
        first_error = next(iter(serializer.errors.values()))[0]
        return Response(
            {'detail': str(first_error)},
            status=status.HTTP_400_BAD_REQUEST
        )

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
        
        data_completa = request.data.copy()
        
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
            # 2. Buscar al usuario
            user = User.objects.get(id=user_id)
<<<<<<< HEAD
            
            # 🟢 NUEVO: Leer el motivo enviado desde React
            reason = request.data.get('reason')

            # 🟢 NUEVO CONTROL: Si es un borrado físico definitivo
            if reason == "HARD_DELETE":
                try:
                    user.delete()  
                    return Response({'message': 'Usuario eliminado definitivamente de la base de datos'}, status=status.HTTP_200_OK)
                except Exception as db_error:
                    print(f"❌ Error de base de datos al borrar: {str(db_error)}")
                    return Response({'detail': 'No se puede borrar porque el usuario tiene turnos o clases asignadas.'}, status=status.HTTP_400_BAD_REQUEST)

            # 3. Determinar acción según el estado actual (Tu código original sigue igual abajo)
=======

            # 3. Determinar acción según el estado actual
>>>>>>> 735e7c4372bcfe42da509f3898aa1746fa73cdac
            if user.is_active:
                # ACCIÓN: SUSPENDER (Estaba activo, pasa a inactivo)
                if not reason:
                    return Response({'detail': 'Debe indicar un motivo.'}, status=status.HTTP_400_BAD_REQUEST)

                user.is_active = False
                user.deleted_reason = reason
<<<<<<< HEAD
                user.save() 
                
=======
                user.save() # Guardamos en BD

>>>>>>> 735e7c4372bcfe42da509f3898aa1746fa73cdac
                asunto = "Tu cuenta en RehabilitAR ha sido suspendida"
                mensaje = f"Hola {user.first_name},\n\nTe informamos que tu cuenta ha sido suspendida.\nMotivo:\n\"{reason}\""
            else:
                # ACCIÓN: ACTIVAR (Estaba inactivo, pasa a activo)
                user.is_active = True
<<<<<<< HEAD
                user.deleted_reason = None  
                user.save() 
                
=======
                user.deleted_reason = None
                user.save() # Guardamos en BD

>>>>>>> 735e7c4372bcfe42da509f3898aa1746fa73cdac
                asunto = "Tu cuenta en RehabilitAR ha sido reactivada"
                mensaje = f"Hola {user.first_name},\n\n¡Buenas noticias! Tu cuenta ha sido reactivada por el administrador. Ya podés volver a ingresar a la plataforma."

            try:
                email = EmailMessage(
                    subject=asunto,
                    body=mensaje,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[user.email]
                )
                email.encoding = 'utf-8'
                email.send(fail_silently=False)
                print("📧 ¡Mail enviado/impreso con éxito!")
            except Exception as mail_error:
                print(f"⚠️ Error al enviar el mail: {str(mail_error)}")

            return Response(
                {'message': 'Estado del usuario actualizado', 'is_active': user.is_active},
                status=status.HTTP_200_OK
            )

        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)
<<<<<<< HEAD

class ListarAptosPendientesView(APIView):
    permission_classes = [IsAdminUser]  # Solo administradores

    def get(self, request):
        # Escenario 1 y 2: Trae las tareas importantes (aptos pendientes)
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

        accion = request.data.get('accion')  # 'APROBAR' o 'RECHAZAR'
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
    
from rest_framework.parsers import MultiPartParser, FormParser

class SubirAptoFisicoView(APIView):
    """
    POST /api/auth/aptos/subir/
    Permite al paciente logueado subir su archivo de apto físico (PDF o imagen).
    """
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]  # 👈 Obligatorio para recibir archivos reales

    def post(self, request):
        documento = request.FILES.get('documento') # 👈 Lee el archivo que viene del frontend
        
        if not documento:
            return Response(
                {'detail': 'Por favor, adjunte un documento válido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Creamos el registro del apto físico asignado al paciente actual
            apto = AptoFisico.objects.create(
                usuario=request.user,
                documento=documento,
                estado='PENDIENTE' # Al crearse arranca pendiente para que el admin lo vea
            )
            return Response(
                {'detail': 'Apto físico subido correctamente y listo para revisión.'},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            print(f"❌ Error al guardar el apto: {str(e)}")
            return Response(
                {'detail': 'Hubo un problema interno al guardar el archivo.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
=======
>>>>>>> 735e7c4372bcfe42da509f3898aa1746fa73cdac
