"""
Абстрактный интерфейс для интеграции с LMS (Learning Management System).
Обеспечивает унификацию данных оценок и студентов из любой внешней системы.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class LMSGrade:
    """Единая структура данных академической оценки из LMS."""

    student_external_id: str
    student_name: str
    discipline_name: str
    grade: float
    max_grade: float
    date: str
    source: str


@dataclass
class LMSStudent:
    """Структура данных студента из LMS."""

    external_id: str
    full_name: str
    email: str
    group_name: Optional[str] = None


class LMSClient(ABC):
    """
    Абстрактный базовый класс клиента LMS.
    Все конкретные адаптеры (MockLMSClient, MoodleLMSClient) обязаны реализовывать этот контракт.
    """

    @abstractmethod
    def get_grades(self, course_id: str) -> List[LMSGrade]:
        """Получить список оценок по идентификатору курса в LMS."""
        pass

    @abstractmethod
    def get_students(self, group_name: Optional[str] = None) -> List[LMSStudent]:
        """Получить список студентов группы из LMS."""
        pass

    @abstractmethod
    def get_courses(self) -> List[dict]:
        """Получить список доступных курсов/дисциплин."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Проверить доступность и сетевую связь с сервером LMS."""
        pass
