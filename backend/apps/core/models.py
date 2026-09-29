from django.db import models


class TimestampedModel(models.Model):
    """
    Абстрактный базовый класс для всех моделей проекта KafIS.
    Автоматически сохраняет время создания и последнего обновления сущности.
    """
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Дата обновления"
    )

    class Meta:
        abstract = True
