# ⚙️ Backend Guide — Django + DRF

---

## 1. Настройка проекта

### Инициализация
```bash
# Создать виртуальное окружение
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate        # Linux/Mac

# Установить зависимости
pip install django djangorestframework djangorestframework-simplejwt \
            django-cors-headers drf-spectacular \
            psycopg2-binary redis django-redis \
            openpyxl pandas weasyprint \
            pytest-django factory-boy

# Создать проект
django-admin startproject config .
```

### requirements.txt
```
django==4.2.16
djangorestframework==3.15.2
djangorestframework-simplejwt==5.3.1
django-cors-headers==4.3.1
drf-spectacular==0.27.2
psycopg2-binary==2.9.9
redis==5.0.1
django-redis==5.4.0
openpyxl==3.1.2
pandas==2.1.4
weasyprint==62.3
pytest-django==4.7.0
factory-boy==3.3.0
```

### config/settings.py (ключевые блоки)
```python
import os
from datetime import timedelta

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    # наши приложения
    'apps.auth_app',
    'apps.workload',
    'apps.grades',
    'apps.kpi',
    'apps.reports',
    'apps.imports',
    'apps.audit',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # ... стандартные ...
    'apps.audit.middleware.AuditMiddleware',  # наш аудит
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'kafis'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': '5432',
    }
}

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/0'),
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',   # React dev server
    'http://localhost:80',     # Production
]
```

---

## 2. Модели БД

### Правила написания моделей
- Всегда добавляй `created_at`, `updated_at` через базовый класс
- Используй `verbose_name` и `verbose_name_plural` — для читаемости в Django Admin
- Индексы объявляй в `Meta.indexes` — не в полях
- Не используй `null=True` на строковых полях — используй `blank=True` и `default=''`

```python
# apps/core/models.py — базовый класс для всех моделей
from django.db import models

class TimestampedModel(models.Model):
    """Абстрактный базовый класс — добавляет created_at и updated_at."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
```

```python
# apps/workload/models.py
from django.db import models
from apps.core.models import TimestampedModel


class Department(TimestampedModel):
    name = models.CharField(max_length=200, verbose_name='Название')
    code = models.CharField(max_length=20, unique=True, verbose_name='Код')

    class Meta:
        verbose_name = 'Кафедра'
        verbose_name_plural = 'Кафедры'

    def __str__(self):
        return self.name


class Teacher(TimestampedModel):
    user = models.OneToOneField(
        'auth_app.User', on_delete=models.CASCADE,
        related_name='teacher_profile', verbose_name='Пользователь'
    )
    department = models.ForeignKey(
        Department, on_delete=models.PROTECT,
        related_name='teachers', verbose_name='Кафедра'
    )
    full_name = models.CharField(max_length=200, verbose_name='ФИО')
    position = models.CharField(max_length=100, verbose_name='Должность')
    hours_limit = models.FloatField(default=900, verbose_name='Лимит часов/год')

    class Meta:
        verbose_name = 'Преподаватель'
        verbose_name_plural = 'Преподаватели'
        indexes = [
            models.Index(fields=['department'], name='teacher_dept_idx'),
        ]

    def __str__(self):
        return self.full_name


class StudyGroup(TimestampedModel):
    name = models.CharField(max_length=50, unique=True, verbose_name='Название группы')
    direction_code = models.CharField(max_length=20, verbose_name='Код направления')
    direction_name = models.CharField(max_length=200, verbose_name='Направление')
    course = models.PositiveSmallIntegerField(verbose_name='Курс')
    year = models.PositiveSmallIntegerField(verbose_name='Год поступления')

    class Meta:
        verbose_name = 'Учебная группа'
        verbose_name_plural = 'Учебные группы'

    def __str__(self):
        return self.name


class Discipline(TimestampedModel):
    name = models.CharField(max_length=300, verbose_name='Название')
    code = models.CharField(max_length=50, unique=True, verbose_name='Код дисциплины')
    total_hours = models.PositiveIntegerField(verbose_name='Всего часов')

    LECTURE = 'lecture'
    PRACTICE = 'practice'
    LAB = 'lab'
    TYPE_CHOICES = [
        (LECTURE, 'Лекция'),
        (PRACTICE, 'Практика'),
        (LAB, 'Лабораторная'),
    ]
    lesson_type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, default=LECTURE,
        verbose_name='Тип занятия'
    )

    class Meta:
        verbose_name = 'Дисциплина'
        verbose_name_plural = 'Дисциплины'

    def __str__(self):
        return f'{self.code} — {self.name}'


class Workload(TimestampedModel):
    """Запись нагрузки: преподаватель → дисциплина → группа."""
    teacher = models.ForeignKey(
        Teacher, on_delete=models.PROTECT, related_name='workloads',
        verbose_name='Преподаватель'
    )
    discipline = models.ForeignKey(
        Discipline, on_delete=models.PROTECT, related_name='workloads',
        verbose_name='Дисциплина'
    )
    group = models.ForeignKey(
        StudyGroup, on_delete=models.PROTECT, related_name='workloads',
        verbose_name='Группа'
    )
    hours_plan = models.PositiveIntegerField(verbose_name='Часов по плану')
    hours_fact = models.PositiveIntegerField(default=0, verbose_name='Часов фактически')
    semester = models.CharField(max_length=20, verbose_name='Семестр')  # '2024-1', '2024-2'
    room = models.CharField(max_length=20, blank=True, verbose_name='Аудитория')
    day_of_week = models.PositiveSmallIntegerField(
        null=True, blank=True, verbose_name='День недели (1=Пн)'
    )
    lesson_number = models.PositiveSmallIntegerField(
        null=True, blank=True, verbose_name='Номер пары'
    )

    class Meta:
        verbose_name = 'Нагрузка'
        verbose_name_plural = 'Нагрузка'
        indexes = [
            models.Index(fields=['teacher', 'semester'], name='workload_teacher_semester_idx'),
            models.Index(fields=['group', 'semester'], name='workload_group_semester_idx'),
        ]

    def __str__(self):
        return f'{self.teacher} / {self.discipline} / {self.group}'
```

```python
# apps/grades/models.py
from django.db import models
from apps.core.models import TimestampedModel


class Student(TimestampedModel):
    full_name = models.CharField(max_length=200, verbose_name='ФИО')
    email = models.EmailField(blank=True, default='', verbose_name='Email')
    group = models.ForeignKey(
        'workload.StudyGroup', on_delete=models.PROTECT,
        related_name='students', verbose_name='Группа'
    )

    class Meta:
        verbose_name = 'Студент'
        verbose_name_plural = 'Студенты'
        indexes = [
            models.Index(fields=['group'], name='student_group_idx'),
        ]

    def __str__(self):
        return f'{self.full_name} ({self.group.name})'


class Grade(TimestampedModel):
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name='grades',
        verbose_name='Студент'
    )
    discipline = models.ForeignKey(
        'workload.Discipline', on_delete=models.PROTECT, related_name='grades',
        verbose_name='Дисциплина'
    )
    teacher = models.ForeignKey(
        'workload.Teacher', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='given_grades', verbose_name='Преподаватель'
    )
    semester = models.CharField(max_length=20, verbose_name='Семестр')
    grade = models.FloatField(verbose_name='Оценка')
    date = models.DateField(null=True, blank=True, verbose_name='Дата')

    MANUAL = 'manual'
    EXCEL = 'excel'
    MOODLE = 'moodle'
    MOCK = 'mock'
    SOURCE_CHOICES = [
        (MANUAL, 'Вручную'),
        (EXCEL, 'Excel'),
        (MOODLE, 'Moodle'),
        (MOCK, 'Тестовые'),
    ]
    source = models.CharField(
        max_length=20, choices=SOURCE_CHOICES, default=MANUAL,
        verbose_name='Источник'
    )

    class Meta:
        verbose_name = 'Оценка'
        verbose_name_plural = 'Оценки'
        indexes = [
            models.Index(fields=['student', 'semester'], name='grade_student_sem_idx'),
            models.Index(fields=['discipline', 'semester'], name='grade_disc_sem_idx'),
        ]

    def __str__(self):
        return f'{self.student.full_name} / {self.discipline.name} = {self.grade}'
```

---

## 3. Serializers — правила написания

- Один сериализатор — одна задача. Не делай «универсальный»
- Для списков используй `ListSerializer` или облегчённый сериализатор
- Валидацию пиши в `validate_<field>` и `validate()`
- Никогда не пиши бизнес-логику в сериализаторе — только в `services.py`

```python
# apps/workload/serializers.py
from rest_framework import serializers
from .models import Workload, Teacher, Discipline, StudyGroup


class WorkloadListSerializer(serializers.ModelSerializer):
    """Облегчённый — только для списка."""
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    discipline_name = serializers.CharField(source='discipline.name', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model = Workload
        fields = ['id', 'teacher_name', 'discipline_name', 'group_name',
                  'hours_plan', 'hours_fact', 'semester']


class WorkloadDetailSerializer(serializers.ModelSerializer):
    """Полный — для создания/редактирования."""
    class Meta:
        model = Workload
        fields = '__all__'

    def validate(self, data):
        # Проверка пересечений вызывается из сервиса
        from .services import check_schedule_conflict
        conflicts = check_schedule_conflict(data, exclude_id=self.instance.pk if self.instance else None)
        if conflicts:
            raise serializers.ValidationError({
                'schedule': f'Пересечение с: {conflicts[0]}'
            })
        return data
```

---

## 4. Сервисный слой (бизнес-логика)

> ⚠️ **Правило:** вся бизнес-логика — только в `services.py`. ViewSet только вызывает сервис и возвращает ответ.

```python
# apps/workload/services.py
from django.db.models import Q
from .models import Workload


def check_schedule_conflict(data: dict, exclude_id=None) -> list:
    """
    Проверяет пересечения по аудитории и по преподавателю.
    Возвращает список конфликтующих записей.
    """
    if not data.get('day_of_week') or not data.get('lesson_number'):
        return []  # Без привязки ко времени — конфликтов нет

    qs = Workload.objects.filter(
        semester=data['semester'],
        day_of_week=data['day_of_week'],
        lesson_number=data['lesson_number'],
    ).filter(
        Q(teacher=data['teacher']) | Q(room=data.get('room', ''))
    )

    if exclude_id:
        qs = qs.exclude(pk=exclude_id)

    return list(qs.select_related('teacher', 'discipline', 'group'))


def calculate_teacher_workload_stats(teacher_id: int, semester: str) -> dict:
    """Считает план/факт нагрузки преподавателя за семестр."""
    from django.db.models import Sum
    result = Workload.objects.filter(
        teacher_id=teacher_id, semester=semester
    ).aggregate(
        total_plan=Sum('hours_plan'),
        total_fact=Sum('hours_fact'),
    )
    return {
        'hours_plan': result['total_plan'] or 0,
        'hours_fact': result['total_fact'] or 0,
        'completion_pct': round(
            (result['total_fact'] or 0) / (result['total_plan'] or 1) * 100, 1
        ),
    }
```

```python
# apps/grades/services.py
RISK_THRESHOLD = 3.0  # Порог зоны риска (настраиваемый)


def get_risk_zone_students(group_id=None, discipline_id=None, semester=None):
    """Возвращает студентов со средним баллом ниже порога."""
    from django.db.models import Avg
    from .models import Grade
    from apps.workload.models import Student

    qs = Grade.objects.filter(semester=semester) if semester else Grade.objects.all()
    if group_id:
        qs = qs.filter(student__group_id=group_id)
    if discipline_id:
        qs = qs.filter(discipline_id=discipline_id)

    return (
        qs.values('student_id', 'student__full_name', 'student__group__name')
        .annotate(avg_grade=Avg('grade'))
        .filter(avg_grade__lt=RISK_THRESHOLD)
        .order_by('avg_grade')
    )
```

---

## 5. ViewSets — правила написания

- Наследуй от `ModelViewSet` для стандартных CRUD
- Добавляй кастомные экшены через `@action`
- Права доступа — через `permission_classes` на уровне класса или экшена

```python
# apps/workload/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import Workload
from .serializers import WorkloadListSerializer, WorkloadDetailSerializer
from .services import check_schedule_conflict
from apps.auth_app.permissions import IsHeadOrAdmin


class WorkloadViewSet(viewsets.ModelViewSet):
    queryset = Workload.objects.select_related(
        'teacher', 'discipline', 'group'
    ).all()
    permission_classes = [IsHeadOrAdmin]

    def get_serializer_class(self):
        if self.action == 'list':
            return WorkloadListSerializer
        return WorkloadDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Фильтрация по query-параметрам
        teacher = self.request.query_params.get('teacher')
        semester = self.request.query_params.get('semester')
        group = self.request.query_params.get('group')
        if teacher:
            qs = qs.filter(teacher_id=teacher)
        if semester:
            qs = qs.filter(semester=semester)
        if group:
            qs = qs.filter(group_id=group)
        return qs

    @extend_schema(summary='Проверить пересечения в расписании')
    @action(detail=False, methods=['post'])
    def check_conflicts(self, request):
        conflicts = check_schedule_conflict(request.data)
        return Response({
            'has_conflicts': bool(conflicts),
            'conflicts': WorkloadListSerializer(conflicts, many=True).data,
        })

    @action(detail=False, methods=['post'])
    def import_excel(self, request):
        from apps.imports.services import import_workload_from_excel
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'Файл не передан'}, status=400)
        result = import_workload_from_excel(file)
        return Response(result)

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        from apps.reports.services import export_workload_excel
        return export_workload_excel(request.query_params)
```

---

## 6. Права доступа (Permissions)

```python
# apps/auth_app/permissions.py
from rest_framework.permissions import BasePermission


class IsHeadOrAdmin(BasePermission):
    """Только завкафедрой или администратор."""
    def has_permission(self, request, view):
        return request.user.role in ('head', 'admin')


class IsTeacherOrAbove(BasePermission):
    """Преподаватель и выше."""
    def has_permission(self, request, view):
        return request.user.role in ('teacher', 'head', 'admin')

    def has_object_permission(self, request, view, obj):
        # Преподаватель видит только свои данные
        if request.user.role == 'teacher':
            if hasattr(obj, 'teacher'):
                return obj.teacher.user == request.user
        return True
```

---

## 7. Импорт Excel

```python
# apps/imports/services.py
import openpyxl
from django.db import transaction


# Маппинг колонок — легко менять под разные шаблоны вуза
WORKLOAD_COLUMN_MAP = {
    'ФИО преподавателя': 'teacher_name',
    'Дисциплина':        'discipline_name',
    'Группа':            'group_name',
    'Часов (план)':      'hours_plan',
    'Семестр':           'semester',
    'Аудитория':         'room',
}


def import_workload_from_excel(file) -> dict:
    """
    Импортирует нагрузку из Excel.
    Возвращает: {'created': N, 'errors': [...]}
    """
    wb = openpyxl.load_workbook(file)
    ws = wb.active

    # Читаем заголовки из первой строки
    headers = [str(cell.value).strip() for cell in ws[1]]
    col_map = {WORKLOAD_COLUMN_MAP.get(h): i for i, h in enumerate(headers)
               if h in WORKLOAD_COLUMN_MAP}

    created = 0
    errors = []

    with transaction.atomic():
        for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            try:
                _process_workload_row(row, col_map)
                created += 1
            except Exception as e:
                errors.append({'row': row_num, 'error': str(e)})

    return {'created': created, 'errors': errors}


def _process_workload_row(row, col_map):
    from apps.workload.models import Teacher, Discipline, StudyGroup, Workload

    teacher_name = row[col_map['teacher_name']]
    discipline_name = row[col_map['discipline_name']]
    group_name = row[col_map['group_name']]

    teacher = Teacher.objects.get(full_name__iexact=teacher_name.strip())
    discipline = Discipline.objects.get(name__iexact=discipline_name.strip())
    group = StudyGroup.objects.get(name__iexact=group_name.strip())

    Workload.objects.update_or_create(
        teacher=teacher,
        discipline=discipline,
        group=group,
        semester=str(row[col_map['semester']]).strip(),
        defaults={
            'hours_plan': int(row[col_map['hours_plan']] or 0),
            'room': str(row[col_map.get('room', -1)] or '').strip(),
        }
    )
```

---

## 8. Экспорт PDF и Excel

```python
# apps/reports/services.py
import openpyxl
from io import BytesIO
from django.http import HttpResponse
from django.template.loader import render_to_string
from weasyprint import HTML


def export_workload_excel(params) -> HttpResponse:
    """Экспорт нагрузки в .xlsx."""
    from apps.workload.models import Workload

    qs = Workload.objects.select_related('teacher', 'discipline', 'group')
    if params.get('semester'):
        qs = qs.filter(semester=params['semester'])

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Нагрузка'

    # Заголовки
    headers = ['Преподаватель', 'Дисциплина', 'Группа', 'Часов (план)', 'Часов (факт)', 'Семестр']
    ws.append(headers)

    # Стиль заголовка
    from openpyxl.styles import Font, PatternFill, Alignment
    header_font = Font(bold=True, color='FFFFFF')
    header_fill = PatternFill(fill_type='solid', fgColor='1a56db')
    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')

    # Данные
    for w in qs:
        ws.append([
            w.teacher.full_name,
            w.discipline.name,
            w.group.name,
            w.hours_plan,
            w.hours_fact,
            w.semester,
        ])

    # Автоширина колонок
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 50)

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    response = HttpResponse(
        buffer.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="workload.xlsx"'
    return response


def export_workload_pdf(params) -> HttpResponse:
    """Экспорт нагрузки в PDF через шаблон Django."""
    from apps.workload.models import Workload

    qs = Workload.objects.select_related('teacher', 'discipline', 'group')
    html_string = render_to_string('reports/workload_pdf.html', {'workloads': qs})
    pdf = HTML(string=html_string).write_pdf()

    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="workload.pdf"'
    return response
```

---

## 9. Тесты

> **Правило:** минимум один тест на каждый сервис. Используй фикстуры через `factory_boy`.

```python
# apps/auth_app/tests/factories.py
import factory
from django.contrib.auth import get_user_model

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'user{n}')
    email = factory.LazyAttribute(lambda o: f'{o.username}@misis.ru')
    role = 'teacher'
    is_active = True
```

```python
# apps/workload/tests/factories.py
import factory
from apps.workload.models import Department, Teacher, Discipline, StudyGroup, Workload
from apps.auth_app.tests.factories import UserFactory


class DepartmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Department

    name = 'ГиСЭН'
    code = factory.Sequence(lambda n: f'DEP-{n}')


class TeacherFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Teacher

    user = factory.SubFactory(UserFactory)
    department = factory.SubFactory(DepartmentFactory)
    full_name = factory.Sequence(lambda n: f'Преподаватель {n}')
    position = 'Доцент'
    hours_limit = 900


class DisciplineFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Discipline

    name = factory.Sequence(lambda n: f'Дисциплина {n}')
    code = factory.Sequence(lambda n: f'D-{n:03d}')
    total_hours = 72
    lesson_type = 'lecture'


class StudyGroupFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = StudyGroup

    name = factory.Sequence(lambda n: f'БПИ-{n}')
    direction_code = '09.03.01'
    direction_name = 'Информатика'
    course = 2
    year = 2023


class WorkloadFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Workload

    teacher = factory.SubFactory(TeacherFactory)
    discipline = factory.SubFactory(DisciplineFactory)
    group = factory.SubFactory(StudyGroupFactory)
    hours_plan = 36
    semester = '2024-1'
    room = '101'
    day_of_week = 1
    lesson_number = 1
```

```python
# apps/grades/tests/factories.py
import factory
from apps.grades.models import Student, Grade
from apps.workload.tests.factories import StudyGroupFactory, DisciplineFactory, TeacherFactory


class StudentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Student

    full_name = factory.Sequence(lambda n: f'Студент {n}')
    email = factory.LazyAttribute(lambda o: f'{o.full_name.lower().replace(" ", ".")}@misis.ru')
    group = factory.SubFactory(StudyGroupFactory)


class GradeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Grade

    student = factory.SubFactory(StudentFactory)
    discipline = factory.SubFactory(DisciplineFactory)
    teacher = factory.SubFactory(TeacherFactory)
    semester = '2024-1'
    grade = 4.0
    source = 'manual'
```

```python
# apps/workload/tests/test_services.py
import pytest
from apps.workload.services import check_schedule_conflict
from .factories import WorkloadFactory


@pytest.mark.django_db
class TestScheduleConflict:

    def test_no_conflict_different_time(self):
        """Нет пересечения если разное время."""
        WorkloadFactory(day_of_week=1, lesson_number=1, room='101', semester='2024-1')
        data = {'day_of_week': 1, 'lesson_number': 2, 'room': '101',
                'semester': '2024-1', 'teacher': WorkloadFactory().teacher}
        assert check_schedule_conflict(data) == []

    def test_conflict_same_room(self):
        """Конфликт: та же аудитория, то же время."""
        w = WorkloadFactory(day_of_week=2, lesson_number=3, room='202', semester='2024-1')
        data = {
            'day_of_week': 2, 'lesson_number': 3, 'room': '202',
            'semester': '2024-1', 'teacher': WorkloadFactory().teacher,
        }
        conflicts = check_schedule_conflict(data)
        assert len(conflicts) == 1
        assert conflicts[0].pk == w.pk
```

---

## 10. Правила написания кода

| Правило | Как делать |
|---------|-----------|
| **Именование** | `snake_case` для функций/переменных, `PascalCase` для классов |
| **Комментарии** | Пишем только для неочевидной логики, не для `x = x + 1` |
| **Импорты** | Сначала stdlib, потом Django, потом наши apps |
| **Длина функции** | Не более 30 строк — если больше, выноси в отдельную функцию |
| **Нет магических чисел** | `RISK_THRESHOLD = 3.0` вместо просто `3.0` в коде |
| **Транзакции** | Любой импорт данных — внутри `transaction.atomic()` |
| **select_related** | Всегда для FK-полей в QuerySet, который идёт в ответ API |
| **Не писать SQL вручную** | Используй ORM. Сырой SQL только если ORM не справляется |
