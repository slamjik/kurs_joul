"""
Сериализаторы для модуля импорта данных.
"""

from rest_framework import serializers


class FileUploadSerializer(serializers.Serializer):
    """Схема загрузки файла Excel (.xlsx)."""

    file = serializers.FileField(
        required=True,
        help_text="Файл Excel в формате .xlsx",
    )
    semester = serializers.CharField(
        required=False,
        default="2024-1",
        help_text="Семестр по умолчанию, если не указан внутри файла (например, 2024-1)",
    )

    def validate_file(self, value):
        ext = value.name.lower().split(".")[-1] if "." in value.name else ""
        if ext != "xlsx":
            raise serializers.ValidationError("Разрешена загрузка файлов только в формате Excel (.xlsx).")

        max_size = 10 * 1024 * 1024  # 10 MB limit
        if value.size > max_size:
            raise serializers.ValidationError("Размер файла не должен превышать 10 МБ.")

        return value


class LMSImportRequestSerializer(serializers.Serializer):
    """Схема параметров для запуска синхронизации с LMS."""

    course_id = serializers.CharField(
        required=False,
        default="c001",
        help_text="Идентификатор курса в LMS (например: c001)",
    )
    semester = serializers.CharField(
        required=False,
        default="2024-1",
        help_text="Семестр для привязки оценок (например: 2024-1)",
    )


class LMSCourseSerializer(serializers.Serializer):
    """Схема информации о курсе в LMS."""

    id = serializers.CharField(help_text="ID курса в LMS")
    name = serializers.CharField(help_text="Название курса")
    discipline_code = serializers.CharField(required=False, default="", help_text="Код дисциплины")


class LMSStatusResponseSerializer(serializers.Serializer):
    """Схема ответа статуса подключения к LMS."""

    backend = serializers.CharField(help_text="Имя активного класса бэкенда LMS")
    is_available = serializers.BooleanField(help_text="Флаг доступности LMS")
    courses = LMSCourseSerializer(many=True, help_text="Список курсов в LMS")


class ImportResultSerializer(serializers.Serializer):
    """Схема ответа после выполнения операции импорта."""

    success = serializers.BooleanField(help_text="Флаг успешности импорта")
    created = serializers.IntegerField(required=False, default=0, help_text="Количество созданных записей")
    synced = serializers.IntegerField(required=False, default=0, help_text="Количество синхронизированных записей")
    errors = serializers.ListField(
        child=serializers.CharField(),
        help_text="Список предупреждений или ошибок по строкам",
    )
    source = serializers.CharField(required=False, help_text="Источник данных (excel, mock, moodle)")
