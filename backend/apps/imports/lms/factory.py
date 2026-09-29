"""
Фабрика клиентов LMS (паттерн «Адаптер» / «Фабричный метод»).
Позволяет переключаться между Mock и реальным Moodle одной настройкой в settings.py.
"""

import os
from django.conf import settings

from .base import LMSClient
from .mock_client import MockLMSClient


def get_lms_client() -> LMSClient:
    """
    Возвращает экземпляр LMSClient согласно переменной LMS_BACKEND в settings.py.
    По умолчанию: MockLMSClient.
    """
    backend = getattr(settings, "LMS_BACKEND", "mock").lower()

    if backend == "moodle":
        from .moodle_client import MoodleLMSClient

        moodle_url = getattr(settings, "MOODLE_URL", os.getenv("MOODLE_URL", ""))
        moodle_token = getattr(settings, "MOODLE_TOKEN", os.getenv("MOODLE_TOKEN", ""))

        if not moodle_url or not moodle_token:
            # Предупреждение и безопасный возврат Mock если не указаны учетные данные
            return MockLMSClient()

        return MoodleLMSClient(base_url=moodle_url, token=moodle_token)

    return MockLMSClient()
