from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status

from .models import Clase, Sala
from .serializers import (
    ClaseSerializer, ClaseCreateSerializer,
    ClaseProfesorSerializer,
    SalaSerializer, SalaCreateSerializer,
)
from users.models import User
from users.serializers import UserSerializer


class ClaseListView(APIView):
    """
    GET  /api/clases/          — lista todas las clases (admin)
    POST /api/clases/          — crea una clase nueva (admin)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)
        clases = Clase.objects.select_related('profesor', 'sala').prefetch_related('inscriptos', 'lista_espera').all()
        return Response(ClaseSerializer(clases, many=True).data)

    def post(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)
        serializer = ClaseCreateSerializer(data=request.data)
        if not serializer.is_valid():
            # Devolver el primer error como string
            errors = serializer.errors
            first = next(iter(errors.values()))
            msg = first[0] if isinstance(first, list) else str(first)
            return Response({'detail': str(msg)}, status=status.HTTP_400_BAD_REQUEST)
        clase = serializer.save()
        return Response(ClaseSerializer(clase).data, status=status.HTTP_201_CREATED)


class ClasePublicaListView(APIView):
    """GET /api/clases/publicas/ — acceso público."""
    permission_classes = [AllowAny]

    def get(self, request):
        clases = Clase.objects.select_related('profesor', 'sala').all()
        return Response(ClaseSerializer(clases, many=True).data)


class ClaseEnCursoListView(APIView):
    """GET /api/clases/en-curso/ — clases en curso ahora (admin)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)
        clases = Clase.objects.select_related('profesor', 'sala').prefetch_related('inscriptos', 'lista_espera').all()
        en_curso = [c for c in clases if c.en_curso]
        return Response(ClaseSerializer(en_curso, many=True).data)


class ProfesoresPorEspecialidadView(APIView):
    """
    GET /api/clases/profesores/?especialidad=tren_superior&tipo_clase=fija&dia=Lunes&horario_inicio=10:00&horario_fin=11:00
    GET /api/clases/profesores/?especialidad=tren_superior&tipo_clase=individual&fecha=2024-06-10&horario_inicio=10:00&horario_fin=11:00
    Devuelve profesores con esa especialidad y disponibles en el horario indicado (admin).
    """
    permission_classes = [IsAuthenticated]

    def _times_overlap(self, ini1, fin1, ini2, fin2):
        return ini1 < fin2 and ini2 < fin1

    def _profesor_ocupado(self, profesor, tipo_clase, dia, fecha, horario_inicio, horario_fin):
        """Devuelve True si el profesor tiene una clase que solapa con el horario dado.
        horario_inicio y horario_fin deben ser objetos datetime.time."""
        if not horario_inicio or not horario_fin:
            return False

        clases = Clase.objects.filter(profesor=profesor)
        for c in clases:
            if not self._times_overlap(horario_inicio, horario_fin, c.horario_inicio, c.horario_fin):
                continue
            # Hay solapamiento de horas — ahora verificar si es el mismo día
            if tipo_clase == 'fija':
                # Conflicto si la clase existente es fija en el mismo día,
                # o individual en una fecha que cae en ese día
                if c.tipo_clase == 'fija' and c.dias == dia:
                    return True
                if c.tipo_clase == 'individual' and c.fecha:
                    from datetime import date
                    DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
                    js_day = c.fecha.weekday()  # 0=Lun
                    if DIAS[js_day] == dia:
                        return True
            elif tipo_clase == 'individual':
                if not fecha:
                    continue
                from datetime import date
                DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
                try:
                    fecha_obj = date.fromisoformat(fecha)
                except ValueError:
                    continue
                dia_semana = DIAS[fecha_obj.weekday()]
                if c.tipo_clase == 'fija' and c.dias == dia_semana:
                    return True
                if c.tipo_clase == 'individual' and c.fecha and str(c.fecha) == fecha:
                    return True
        return False

    def get(self, request):
        from datetime import time as Time
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)

        especialidad    = request.query_params.get('especialidad', '')
        tipo_clase      = request.query_params.get('tipo_clase', '')
        dia             = request.query_params.get('dia', '')
        fecha           = request.query_params.get('fecha', '')
        horario_inicio  = request.query_params.get('horario_inicio', '')
        horario_fin     = request.query_params.get('horario_fin', '')

        profesores = list(User.objects.filter(role=User.Role.TEACHER, is_active=True))

        # Filtrar por especialidad
        if especialidad:
            profesores = [
                p for p in profesores
                if especialidad in [e.strip() for e in p.especialidades.split(',') if e.strip()]
            ]

        # Filtrar por disponibilidad de horario — convertir strings a time
        if horario_inicio and horario_fin and tipo_clase and (dia or fecha):
            try:
                h, m = horario_inicio.split(':')
                t_ini = Time(int(h), int(m))
                h, m = horario_fin.split(':')
                t_fin = Time(int(h), int(m))
                profesores = [
                    p for p in profesores
                    if not self._profesor_ocupado(p, tipo_clase, dia, fecha, t_ini, t_fin)
                ]
            except (ValueError, AttributeError):
                pass  # Si el formato es inválido, no filtrar por horario

        data = [{'id': p.id, 'nombre': p.full_name, 'email': p.email, 'especialidades': p.especialidades} for p in profesores]
        return Response(data)


class MisClasesView(APIView):
    """
    GET /api/clases/mis-clases/
    Devuelve las clases donde el profesor logueado está asignado.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.TEACHER:
            return Response({'detail': 'Solo profesores pueden acceder a este endpoint.'}, status=403)
        clases = (
            Clase.objects
            .filter(profesor=request.user)
            .select_related('sala')
            .prefetch_related('inscriptos')
        )
        return Response(ClaseProfesorSerializer(clases, many=True).data)


class ClasesOfertadasView(APIView):
    """
    GET /api/clases/ofertadas/
    Devuelve clases ofertadas (sin profesor asignado) disponibles
    para que un profesor se auto-asigne.
    Solo muestra las que coinciden con la especialidad del profesor.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.TEACHER:
            return Response({'detail': 'Solo profesores pueden acceder a este endpoint.'}, status=403)

        mis_especialidades = [
            e.strip() for e in request.user.especialidades.split(',') if e.strip()
        ]

        clases = (
            Clase.objects
            .filter(ofertada=True, profesor__isnull=True)
            .select_related('sala')
            .prefetch_related('inscriptos')
        )

        # Filtrar por especialidad del profesor
        if mis_especialidades:
            clases = clases.filter(especialidad__in=mis_especialidades)

        return Response(ClaseProfesorSerializer(clases, many=True).data)


class AsignarseClaseView(APIView):
    """
    POST /api/clases/<id>/asignarse/
    El profesor logueado se asigna a una clase ofertada.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != User.Role.TEACHER:
            return Response({'detail': 'Solo profesores pueden asignarse a clases.'}, status=403)

        try:
            clase = Clase.objects.get(pk=pk)
        except Clase.DoesNotExist:
            return Response({'detail': 'Clase no encontrada.'}, status=404)

        if not clase.ofertada:
            return Response({'detail': 'Esta clase no está disponible para asignación.'}, status=400)

        if clase.profesor is not None:
            return Response({'detail': 'Esta clase ya tiene un profesor asignado.'}, status=400)

        # Verificar especialidad
        mis_especialidades = [
            e.strip() for e in request.user.especialidades.split(',') if e.strip()
        ]
        if mis_especialidades and clase.especialidad not in mis_especialidades:
            return Response(
                {'detail': 'No tenés la especialidad requerida para esta clase.'},
                status=400
            )

        clase.profesor  = request.user
        clase.ofertada  = False   # ya no está disponible para otros
        clase.save(update_fields=['profesor', 'ofertada'])

        return Response({'detail': 'Te asignaste correctamente a la clase.'}, status=200)


class DesasignarseClaseView(APIView):
    """
    POST /api/clases/<id>/desasignarse/
    El profesor logueado se desasigna de una clase a la que estaba asignado.
    Regla de negocio: el profesor debe estar asignado a la clase.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != User.Role.TEACHER:
            return Response({'detail': 'Solo profesores pueden desasignarse de clases.'}, status=403)

        try:
            clase = Clase.objects.get(pk=pk)
        except Clase.DoesNotExist:
            return Response({'detail': 'Clase no encontrada.'}, status=404)

        if clase.profesor_id != request.user.id:
            return Response(
                {'detail': 'No estás asignado a esta clase.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        clase.profesor = None
        clase.ofertada = True    # vuelve a estar disponible para otros profesores
        clase.save(update_fields=['profesor', 'ofertada'])

        return Response(
            {'detail': 'Te desasignaste de la clase con éxito'},
            status=status.HTTP_200_OK,
        )


class AsignarProfesorView(APIView):
    """
    PATCH /api/clases/<id>/asignar-profesor/
    El admin asigna (o reasigna) un profesor a una clase existente.
    Body: { "profesor_id": <int> }
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)

        try:
            clase = Clase.objects.get(pk=pk)
        except Clase.DoesNotExist:
            return Response({'detail': 'Clase no encontrada.'}, status=404)

        profesor_id = request.data.get('profesor_id')
        if not profesor_id:
            return Response({'detail': 'Debés indicar un profesor.'}, status=400)

        try:
            profesor = User.objects.get(pk=profesor_id, role=User.Role.TEACHER, is_active=True)
        except User.DoesNotExist:
            return Response({'detail': 'Profesor no encontrado.'}, status=404)

        # Validar especialidad
        especialidades_prof = [e.strip() for e in profesor.especialidades.split(',') if e.strip()]
        if especialidades_prof and clase.especialidad not in especialidades_prof:
            return Response(
                {'detail': f'{profesor.full_name} no tiene la especialidad requerida para esta clase.'},
                status=400
            )

        clase.profesor = profesor
        clase.ofertada = False   # si estaba ofertada, ya no
        clase.save(update_fields=['profesor', 'ofertada'])

        return Response(ClaseSerializer(clase).data, status=200)


class SalaListCreateView(APIView):
    """
    GET  /api/clases/salas/ — lista salas (admin)
    POST /api/clases/salas/ — crea sala (admin)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)
        salas = Sala.objects.prefetch_related('clases').all().order_by('nombre')
        return Response(SalaSerializer(salas, many=True).data)

    def post(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)
        serializer = SalaCreateSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))[0]
            return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)
        sala = serializer.save()
        return Response(SalaSerializer(sala).data, status=status.HTTP_201_CREATED)

class HardDeleteUserView(APIView):
    """
    DELETE /api/clases/users/<int:pk>/hard-delete/
    Borra físicamente a un usuario de la base de datos (Admin).
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)
        try:
            usuario = User.objects.get(pk=pk)
            usuario.delete()  # 🟢 ¡ACÁ SÍ! Borrado físico real de la base de datos
            return Response({'detail': 'Usuario eliminado definitivamente.'}, status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=404)
