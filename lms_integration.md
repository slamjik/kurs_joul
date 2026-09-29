# 🔌 LMS Integration Guide
## Moodle REST API — абстракция + заглушка

---

## Архитектура интеграции

> **Принцип:** LMS-клиент скрыт за интерфейсом. Приложению всё равно,  
> откуда пришли данные — из заглушки или из реального Moodle.

```
Django Service
    │
    ▼
LMSClient (абстрактный интерфейс)
    ├── MockLMSClient         ← сейчас, для разработки
    └── MoodleLMSClient       ← когда будет реальный доступ
```

Чтобы переключиться с заглушки на Moodle — меняешь **одну строку** в `settings.py`.

---

## 1. Интерфейс (абстрактный класс)

```python
# apps/imports/lms/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class LMSGrade:
    """Единая структура оценки из любой LMS."""
    student_external_id: str    # ID студента в LMS
    student_name: str
    discipline_name: str
    grade: float                # числовое значение
    max_grade: float            # максимально возможная оценка
    date: str                   # ISO-дата '2024-03-15'
    source: str                 # 'moodle', 'mock', etc.


@dataclass
class LMSStudent:
    """Студент из LMS."""
    external_id: str
    full_name: str
    email: str
    group_name: Optional[str] = None


class LMSClient(ABC):
    """Абстрактный клиент LMS — интерфейс для любой системы."""

    @abstractmethod
    def get_grades(self, course_id: str) -> list[LMSGrade]:
        """Получить все оценки по курсу."""
        ...

    @abstractmethod
    def get_students(self, group_name: str) -> list[LMSStudent]:
        """Получить список студентов группы."""
        ...

    @abstractmethod
    def get_courses(self) -> list[dict]:
        """Получить список доступных курсов/дисциплин."""
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Проверить доступность LMS."""
        ...
```

---

## 2. Заглушка (Mock) — для разработки

```python
# apps/imports/lms/mock_client.py
import random
from datetime import date, timedelta
from .base import LMSClient, LMSGrade, LMSStudent


# Реалистичные тестовые данные
MOCK_STUDENTS = [
    ('s001', 'Александров Иван Сергеевич',   'БПИ-23'),
    ('s002', 'Белова Екатерина Дмитриевна',  'БПИ-23'),
    ('s003', 'Волков Андрей Павлович',        'БПИ-23'),
    ('s004', 'Громова Мария Ивановна',        'ЭКМ-22'),
    ('s005', 'Дмитриев Алексей Николаевич',   'ЭКМ-22'),
    ('s006', 'Ефимова Светлана Юрьевна',      'БПИ-23'),
]

MOCK_COURSES = [
    {'id': 'c001', 'name': 'Математика', 'discipline_code': 'Б1.О.01'},
    {'id': 'c002', 'name': 'Экономика предприятия', 'discipline_code': 'Б1.О.05'},
    {'id': 'c003', 'name': 'Управление проектами', 'discipline_code': 'Б1.О.12'},
]


class MockLMSClient(LMSClient):
    """
    Заглушка LMS — генерирует реалистичные данные для разработки.
    Полностью совместима с интерфейсом LMSClient.
    """

    def get_grades(self, course_id: str) -> list[LMSGrade]:
        course = next((c for c in MOCK_COURSES if c['id'] == course_id), MOCK_COURSES[0])
        grades = []
        base_date = date.today() - timedelta(days=60)

        for student_id, student_name, group in MOCK_STUDENTS:
            # Имитируем реальное распределение оценок
            grade_value = round(random.gauss(3.8, 0.8), 1)
            grade_value = max(2.0, min(5.0, grade_value))

            grades.append(LMSGrade(
                student_external_id=student_id,
                student_name=student_name,
                discipline_name=course['name'],
                grade=grade_value,
                max_grade=5.0,
                date=(base_date + timedelta(days=random.randint(0, 50))).isoformat(),
                source='mock',
            ))

        return grades

    def get_students(self, group_name: str) -> list[LMSStudent]:
        filtered = [
            LMSStudent(external_id=sid, full_name=name, email=f'{sid}@misis.ru', group_name=group)
            for sid, name, group in MOCK_STUDENTS
            if group == group_name or not group_name
        ]
        return filtered

    def get_courses(self) -> list[dict]:
        return MOCK_COURSES

    def is_available(self) -> bool:
        return True  # Заглушка всегда доступна
```

---

## 3. Реальный Moodle клиент — шаблон для будущего

```python
# apps/imports/lms/moodle_client.py
import requests
from .base import LMSClient, LMSGrade, LMSStudent


class MoodleLMSClient(LMSClient):
    """
    Клиент Moodle REST API.
    Документация: https://docs.moodle.org/dev/Web_service_API_functions
    
    Для включения нужно:
    1. В настройках Moodle: Администрирование → Плагины → Web Services → Включить
    2. Создать токен: Администрирование → Плагины → Web Services → Управление токенами
    3. Добавить в .env: MOODLE_URL и MOODLE_TOKEN
    """

    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip('/')
        self.token = token
        self.endpoint = f'{self.base_url}/webservice/rest/server.php'

    def _call(self, function: str, **params) -> dict:
        """Базовый вызов Moodle Web Services API."""
        response = requests.get(self.endpoint, params={
            'wstoken': self.token,
            'wsfunction': function,
            'moodlewsrestformat': 'json',
            **params,
        }, timeout=10)
        response.raise_for_status()
        data = response.json()

        if isinstance(data, dict) and 'exception' in data:
            raise RuntimeError(f"Moodle error: {data.get('message', data)}")

        return data

    def get_grades(self, course_id: str) -> list[LMSGrade]:
        """gradereport_user_get_grade_items — оценки по курсу."""
        raw = self._call('gradereport_user_get_grade_items', courseid=int(course_id))
        grades = []
        for user_report in raw.get('usergrades', []):
            student_name = f"{user_report['userfullname']}"
            for item in user_report.get('gradeitems', []):
                if item.get('graderaw') is None:
                    continue
                grades.append(LMSGrade(
                    student_external_id=str(user_report['userid']),
                    student_name=student_name,
                    discipline_name=item.get('itemname', ''),
                    grade=float(item['graderaw']),
                    max_grade=float(item.get('grademax', 5.0)),
                    date=item.get('gradedategraded', ''),
                    source='moodle',
                ))
        return grades

    def get_students(self, group_name: str) -> list[LMSStudent]:
        """core_cohort_get_cohort_members или core_enrol_get_enrolled_users."""
        # TODO: реализовать по реальной структуре Moodle вуза
        raise NotImplementedError('Реализовать после получения доступа к Moodle')

    def get_courses(self) -> list[dict]:
        """core_course_get_courses — список курсов."""
        courses = self._call('core_course_get_courses')
        return [{'id': str(c['id']), 'name': c['fullname']} for c in courses]

    def is_available(self) -> bool:
        try:
            self._call('core_webservice_get_site_info')
            return True
        except Exception:
            return False
```

---

## 4. Фабрика — переключение одной строкой

```python
# apps/imports/lms/factory.py
from django.conf import settings
from .base import LMSClient
from .mock_client import MockLMSClient


def get_lms_client() -> LMSClient:
    """
    Возвращает нужного клиента в зависимости от настроек.
    
    В settings.py / .env:
      LMS_BACKEND=mock    → MockLMSClient (по умолчанию)
      LMS_BACKEND=moodle  → MoodleLMSClient
    """
    backend = getattr(settings, 'LMS_BACKEND', 'mock')

    if backend == 'moodle':
        from .moodle_client import MoodleLMSClient
        return MoodleLMSClient(
            base_url=settings.MOODLE_URL,
            token=settings.MOODLE_TOKEN,
        )

    return MockLMSClient()
```

```python
# В settings.py:
LMS_BACKEND = os.environ.get('LMS_BACKEND', 'mock')  # 'mock' или 'moodle'
MOODLE_URL   = os.environ.get('MOODLE_URL', '')
MOODLE_TOKEN = os.environ.get('MOODLE_TOKEN', '')
```

---

## 5. Сервис импорта оценок из LMS

```python
# apps/imports/services.py (часть, связанная с LMS)
from .lms.factory import get_lms_client
from apps.grades.models import Student, Grade
from apps.workload.models import Discipline
from django.db import transaction


def import_grades_from_lms(course_id: str, semester: str) -> dict:
    """
    Импортирует оценки из LMS в базу.
    Работает одинаково с Mock и с Moodle.
    """
    client = get_lms_client()

    if not client.is_available():
        return {'error': 'LMS недоступна', 'imported': 0}

    lms_grades = client.get_grades(course_id)
    imported = 0
    errors = []

    with transaction.atomic():
        for g in lms_grades:
            try:
                student = Student.objects.get(
                    full_name__iexact=g.student_name.strip()
                )
                discipline = Discipline.objects.filter(
                    name__icontains=g.discipline_name.strip()
                ).first()

                if not discipline:
                    errors.append(f'Дисциплина не найдена: {g.discipline_name}')
                    continue

                Grade.objects.update_or_create(
                    student=student,
                    discipline=discipline,
                    semester=semester,
                    source=g.source,
                    defaults={
                        'grade': g.grade,
                        'date': g.date or None,
                    }
                )
                imported += 1
            except Student.DoesNotExist:
                errors.append(f'Студент не найден: {g.student_name}')

    return {'imported': imported, 'errors': errors}
```

---

## 6. API-эндпоинт импорта из LMS

```python
# В apps/grades/views.py
@action(detail=False, methods=['post'])
def import_from_lms(self, request):
    course_id = request.data.get('course_id')
    semester = request.data.get('semester')

    if not course_id or not semester:
        return Response({'error': 'Нужны course_id и semester'}, status=400)

    from apps.imports.services import import_grades_from_lms
    result = import_grades_from_lms(course_id, semester)
    return Response(result)


@action(detail=False, methods=['get'])
def lms_courses(self, request):
    """Список курсов из LMS для выбора в интерфейсе."""
    from apps.imports.lms.factory import get_lms_client
    client = get_lms_client()
    return Response({
        'available': client.is_available(),
        'courses': client.get_courses(),
    })
```

---

## 7. Чеклист подключения реального Moodle

Когда появится реальный доступ к LMS вуза:

- [ ] Получить URL Moodle и токен у ИТ-службы вуза
- [ ] Добавить в `.env`: `LMS_BACKEND=moodle`, `MOODLE_URL=...`, `MOODLE_TOKEN=...`
- [ ] Проверить доступность: `GET /api/grades/lms_courses/`
- [ ] Убедиться, что имена студентов в Moodle совпадают с именами в БД
- [ ] Реализовать `get_students()` в `MoodleLMSClient` под структуру конкретного Moodle
- [ ] Запустить тестовый импорт на одном курсе

> Всё остальное — без изменений. Приложение не знает, откуда данные.
