"""
Кастомный обработчик исключений Django REST Framework.
Предотвращает утечку системной отладочной информации (CWE-200 / CWE-215).
"""

import logging
from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger("kafis.security")


def custom_exception_handler(exc, context):
    """
    Глобальный обработчик ошибок API:
    1. Для стандартных исключений DRF вызывает штатный handler.
    2. Для встроенных Django-ошибок (ValidationError) возвращает 400.
    3. Для ValueError (ошибки парсинга типов параметров) возвращает 400 Bad Request.
    4. Для всех непредвиденных системных исключений:
       - Логирует трейсбек на сервере.
       - Возвращает клиенту безопасный JSON со статусом 500 БЕЗ дампов ФС и переменных окружения.
    """
    response = exception_handler(exc, context)

    if response is not None:
        return response

    if isinstance(exc, DjangoValidationError):
        return Response(
            {"detail": exc.message if hasattr(exc, "message") else list(exc.messages)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if isinstance(exc, Http404):
        return Response(
            {"detail": "Запрашиваемый ресурс не найден."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if isinstance(exc, PermissionDenied):
        return Response(
            {"detail": "Доступ запрещен."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if isinstance(exc, ValueError):
        view_name = context.get("view").__class__.__name__ if context.get("view") else "UnknownView"
        logger.warning("Некорректный формат параметров в %s: %s", view_name, exc)
        return Response(
            {"detail": f"Некорректные параметры запроса: {str(exc)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    view_name = context.get("view").__class__.__name__ if context.get("view") else "UnknownView"
    logger.exception("Необработанное исключение в %s: %s", view_name, exc)

    return Response(
        {"detail": "Внутренняя ошибка сервера. Инцидент зафиксирован в системном журнале."},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
