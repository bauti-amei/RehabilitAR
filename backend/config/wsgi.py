import os
from django.core.wsgi import get_wsgi_application

# Asegurate de que esto coincida con la ruta a tus settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()