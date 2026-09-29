from django.contrib.auth.models import AbstractUser
from django.db import models
from core.models import TimestampedModel


class User(AbstractUser, TimestampedModel):
    """
    Кастомная модель пользователя с поддержкой ролей:
    - head: Заведующий кафедрой (полный доступ к кафедре)
    - teacher: Преподаватель (доступ только к своим группам/нагрузке)
    - admin: Администратор системы
    """
    ROLE_CHOICES = [
        ("head", "Заведующий кафедрой"),
        ("teacher", "Преподаватель"),
        ("admin", "Администратор"),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="teacher",
        verbose_name="Роль в системе",
    )
    email = models.EmailField(
        unique=True,
        verbose_name="Email адрес",
    )

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"
        ordering = ["username"]

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_head(self):
        return self.role == "head"

    @property
    def is_teacher(self):
        return self.role == "teacher"

    @property
    def is_admin_role(self):
        return self.role == "admin" or self.is_superuser
