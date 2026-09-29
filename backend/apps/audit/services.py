"""
Сервисный слой модуля «Журнал аудита».
Обеспечивает безопасную фиксацию событий и действий пользователей.
"""

import logging
from typing import Any, Dict, Optional
from django.http import HttpRequest

from .models import AuditLog

logger = logging.getLogger(__name__)


def get_client_ip(request: HttpRequest) -> Optional[str]:
    """Извлекает реальный IP-адрес клиента с учётом обратного прокси Nginx."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


def record_audit_log(
    user: Optional[Any],
    action: str,
    table_name: str,
    object_id: str = "",
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> Optional[AuditLog]:
    """
    Безопасно создает запись в журнале аудита.
    Сбой логирования не должен приводить к ошибке основной бизнес-операции.
    """
    try:
        # Проверяем, что пользователь авторизован и валиден
        audit_user = user if user and user.is_authenticated else None

        entry = AuditLog.objects.create(
            user=audit_user,
            action=action,
            table_name=table_name,
            object_id=str(object_id),
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
        )
        return entry
    except Exception as e:
        logger.error(f"Не удалось записать аудит: {e}", exc_info=True)
        return None
