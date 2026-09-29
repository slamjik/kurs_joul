"""
Модели модуля «Журнал аудита»:
- AuditLog: фиксация действий пользователей (создание, изменение, удаление, импорт, экспорт).
"""

from django.db import models
from core.models import TimestampedModel


class AuditLog(TimestampedModel):
    """
    Запись в журнале аудита безопасности и изменений данных системы KafIS.
    Хранит информацию о пользователе, действии, объекте, снимках данных (JSON) и IP-адресе.
    """

    ACTION_CHOICES = [
        ("CREATE", "Создание записи"),
        ("UPDATE", "Изменение записи"),
        ("DELETE", "Удаление записи"),
        ("LOGIN", "Вход в систему"),
        ("IMPORT", "Импорт данных"),
        ("EXPORT", "Экспорт данных"),
    ]

    user = models.ForeignKey(
        "auth_app.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        verbose_name="Пользователь",
    )
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        verbose_name="Тип действия",
    )
    table_name = models.CharField(
        max_length=100,
        verbose_name="Таблица / сущность",
        help_text="Например: Workload, Grade, Student",
    )
    object_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Идентификатор объекта",
    )
    old_value = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Предыдущее состояние (JSON)",
    )
    new_value = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Новое состояние (JSON)",
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="IP-адрес клиента",
    )

    class Meta:
        verbose_name = "Запись аудита"
        verbose_name_plural = "Журнал аудита"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user"], name="audit_user_idx"),
            models.Index(fields=["action"], name="audit_action_idx"),
            models.Index(fields=["table_name"], name="audit_table_idx"),
            models.Index(fields=["created_at"], name="audit_date_idx"),
        ]

    def __str__(self):
        username = self.user.username if self.user else "Система"
        return f"[{self.get_action_display()}] {self.table_name}:{self.object_id} ({username})"
