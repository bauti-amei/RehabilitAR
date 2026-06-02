import os
from django.apps import AppConfig

class ClasesConfig(AppConfig):
    name = 'clases'

    def ready(self):
        if os.environ.get('RUN_MAIN') == 'true':
            from .cancelaciones import start
            start()