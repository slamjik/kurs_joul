"""
Классы прав доступа (Permissions) для ролевой модели KafIS.
Роли:
- head: Заведующий кафедрой (видит всё, редактирует нагрузку, импорт/экспорт)
- teacher: Преподаватель (видит только свои данные и оценки своих групп)
- admin: Администратор (полный доступ, включая управление пользователями)
"""

from rest_framework.permissions import BasePermission


class IsHead(BasePermission):
    """Доступ разрешен только заведующему кафедрой."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "head"
        )


class IsTeacher(BasePermission):
    """Доступ разрешен только преподавателю."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "teacher"
        )


class IsAdminRole(BasePermission):
    """Доступ разрешен администратору системы либо суперпользователю Django."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == "admin" or request.user.is_superuser)
        )


class IsHeadOrAdmin(BasePermission):
    """Доступ разрешен заведующему кафедрой или администратору."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role in ("head", "admin")
                or request.user.is_superuser
            )
        )


class IsTeacherOrAbove(BasePermission):
    """
    Доступ разрешен преподавателю, завкафедрой и администратору.
    Для преподавателя действует ограничение на уровне объекта:
    доступ только к объектам, связанным с его профилем.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role in ("teacher", "head", "admin")
                or request.user.is_superuser
            )
        )

    def has_object_permission(self, request, view, obj):
        # Завкафедрой и администратор имеют доступ ко всем объектам
        if request.user.role in ("head", "admin") or request.user.is_superuser:
            return True

        # Преподаватель имеет доступ только к своим данным
        if request.user.role == "teacher":
            # Проверка для модели Teacher
            if hasattr(obj, "user") and obj.user == request.user:
                return True
            # Проверка для связанных с преподавателем моделей (Workload, Grade и т.д.)
            if hasattr(obj, "teacher") and hasattr(obj.teacher, "user"):
                return obj.teacher.user == request.user

        return False
