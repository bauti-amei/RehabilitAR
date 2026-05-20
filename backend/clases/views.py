from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Clase
from .serializers import ClaseSerializer
from users.models import User


class ClaseListView(APIView):
    """
    GET /api/clases/
    Devuelve todas las clases. Solo accesible para admins.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response(
                {'detail': 'No tenés permiso para ver esta información.'},
                status=403,
            )
        clases = Clase.objects.select_related('profesor').prefetch_related('inscriptos', 'lista_espera').all()
        serializer = ClaseSerializer(clases, many=True)
        return Response(serializer.data)


class ClaseEnCursoListView(APIView):
    """
    GET /api/clases/en-curso/
    Devuelve las clases que están ocurriendo ahora mismo. Solo admins.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response(
                {'detail': 'No tenés permiso para ver esta información.'},
                status=403,
            )
        clases = Clase.objects.select_related('profesor').prefetch_related('inscriptos', 'lista_espera').all()
        en_curso = [c for c in clases if c.en_curso]
        serializer = ClaseSerializer(en_curso, many=True)
        return Response(serializer.data)
