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


class ClaseListView(APIView):
    """GET /api/clases/ — lista todas las clases (admin)
       POST /api/clases/ — crea una clase nueva (admin)"""
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
    """GET /api/clases/profesores/?especialidad=tren_superior — (admin)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({'detail': 'No tenés permiso.'}, status=403)
        especialidad = request.query_params.get('especialidad', '')
        profesores = User.objects.filter(role=User.Role.TEACHER, is_active=True)
        if especialidad:
            profesores = [p for p in profesores if especialidad in [e.strip() for e in p.especialidades.split(',') if e.strip()]]
        data = [{'id': p.id, 'nombre': p.full_name, 'email': p.email, 'especialidades': p.especialidades} for p in profesores]
        return Response(data)


class MisClasesView(APIView):
    """GET /api/clases/mis-clases/ — clases donde el profesor logueado está asignado."""
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
    """GET /api/clases/ofertadas/ — clases ofertadas sin profesor, filtradas por especialidad del profesor logueado."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.TEACHER:
            return Response({'detail': 'Solo profesores pueden acceder a este endpoint.'}, status=403)
        mis_especialidades = [e.strip() for e in request.user.especialidades.split(',') if e.strip()]
        clases = Clase.objects.filter(ofertada=True, profesor__isnull=True).select_related('sala').prefetch_related('inscriptos')
        if mis_especialidades:
            clases = clases.filter(especialidad__in=mis_especialidades)
        return Response(ClaseProfesorSerializer(clases, many=True).data)


class AsignarseClaseView(APIView):
    """POST /api/clases/<id>/asignarse/ — el profesor se auto-asigna a una clase ofertada."""
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
        mis_especialidades = [e.strip() for e in request.user.especialidades.split(',') if e.strip()]
        if mis_especialidades and clase.especialidad not in mis_especialidades:
            return Response({'detail': 'No tenés la especialidad requerida para esta clase.'}, status=400)
        clase.profesor = request.user
        clase.ofertada = False
        clase.save(update_fields=['profesor', 'ofertada'])
        return Response({'detail': 'Te asignaste correctamente a la clase.'}, status=200)


class AsignarProfesorView(APIView):
    """PATCH /api/clases/<id>/asignar-profesor/ — el admin asigna un profesor a una clase."""
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
        especialidades_prof = [e.strip() for e in profesor.especialidades.split(',') if e.strip()]
        if especialidades_prof and clase.especialidad not in especialidades_prof:
            return Response(
                {'detail': f'{profesor.full_name} no tiene la especialidad requerida para esta clase.'},
                status=400
            )
        clase.profesor = profesor
        clase.ofertada = False
        clase.save(update_fields=['profesor', 'ofertada'])
        return Response(ClaseSerializer(clase).data, status=200)


class SalaListCreateView(APIView):
    """GET /api/clases/salas/ — lista salas (admin)
       POST /api/clases/salas/ — crea sala (admin)"""
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
