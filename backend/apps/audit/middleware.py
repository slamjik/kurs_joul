"""
Middleware для автоматической фиксации действий пользователей в журнале аудита.
"""

from .services import get_client_ip, record_audit_log


class AuditMiddleware:
    """
    Middleware для сквозного аудита действий пользователей.
    Логирует операции изменения данных (POST, PUT, PATCH, DELETE) для авторизованных пользователей.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Фиксируем только успешные мутирующие запросы
        if (
            request.method in ("POST", "PUT", "PATCH", "DELETE")
            and hasattr(request, "user")
            and request.user.is_authenticated
            and 200 <= response.status_code < 400
        ):
            self._record_request_audit(request, response)

        return response

    def _record_request_audit(self, request, response):
        """Определяет тип действия и сущность по запросу и сохраняет запись."""
        action_map = {
            "POST": "CREATE",
            "PUT": "UPDATE",
            "PATCH": "UPDATE",
            "DELETE": "DELETE",
        }
        action = action_map.get(request.method, "UPDATE")

        # Разбор пути, например: /api/workload/ -> table_name: workload
        path_parts = [p for p in request.path.strip("/").split("/") if p]
        table_name = path_parts[1] if len(path_parts) > 1 else "api"
        object_id = path_parts[2] if len(path_parts) > 2 and path_parts[2].isdigit() else ""

        record_audit_log(
            user=request.user,
            action=action,
            table_name=table_name,
            object_id=object_id,
            new_value={"path": request.path, "status": response.status_code},
            ip_address=get_client_ip(request),
        )
