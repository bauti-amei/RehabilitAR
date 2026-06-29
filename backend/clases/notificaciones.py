from clases.models import Notificacion

def enviar_notificacion_a_usuarios(usuarios, titulo, mensaje):
    """
    Crea notificaciones masivas en la BD para una lista de usuarios.
    """
    notificaciones = [
        Notificacion(usuario=user, titulo=titulo, mensaje=mensaje, leida=False)
        for user in usuarios
    ]
    Notificacion.objects.bulk_create(notificaciones)