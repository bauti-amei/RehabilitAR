import re
import requests
from django.conf import settings


def validate_dni(image_file) -> bool:
    """
    Envía la imagen del DNI a la API de OCR.space y verifica que el texto
    extraído contenga marcadores propios de un DNI argentino.

    Si DNI_VALIDATION_MOCK=True en settings, siempre retorna True (desarrollo).
    """
    if getattr(settings, 'DNI_VALIDATION_MOCK', False):
        return True

    api_key = getattr(settings, 'OCR_SPACE_API_KEY', 'helloworld')

    try:
        response = requests.post(
            'https://api.ocr.space/parse/image',
            files={'file': (image_file.name, image_file.read(), image_file.content_type)},
            data={
                'apikey': api_key,
                'language': 'spa',
                'isOverlayRequired': False,
            },
            timeout=15,
        )
        result = response.json()
    except Exception:
        return False

    if result.get('IsErroredOnProcessing'):
        return False

    parsed_results = result.get('ParsedResults', [])
    if not parsed_results:
        return False

    text = parsed_results[0].get('ParsedText', '').upper()

    dni_markers = [
        r'ARGENTINA',
        r'DOCUMENTO\s+NACIONAL',
        r'\bDNI\b',
        r'\d{7,8}',
    ]

    matches = sum(1 for pattern in dni_markers if re.search(pattern, text))
    return matches >= 2
