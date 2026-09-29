# 🗄️ Database Guide — PostgreSQL + Redis

---

## 1. Полная схема таблиц

### Таблица `users` (кастомная User-модель)
```sql
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(150) UNIQUE NOT NULL,
    email         VARCHAR(254) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    role          VARCHAR(20) NOT NULL
                    CHECK (role IN ('head', 'teacher', 'admin')),
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);
```

### Таблица `departments` (кафедры)
```sql
CREATE TABLE departments (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(200) NOT NULL,
    code       VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Таблица `teachers` (преподаватели)
```sql
CREATE TABLE teachers (
    id          SERIAL PRIMARY KEY,
    user_id     INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    department_id INT REFERENCES departments(id) ON DELETE RESTRICT,
    full_name   VARCHAR(200) NOT NULL,
    position    VARCHAR(100) NOT NULL,
    hours_limit FLOAT DEFAULT 900,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_teachers_dept ON teachers(department_id);
```

### Таблица `study_groups` (учебные группы)
```sql
CREATE TABLE study_groups (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) UNIQUE NOT NULL,   -- 'БПИ-23'
    direction_code  VARCHAR(20) NOT NULL,           -- '09.03.01'
    direction_name  VARCHAR(200) NOT NULL,
    course          SMALLINT NOT NULL,
    year            SMALLINT NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

### Таблица `students` (студенты)
```sql
CREATE TABLE students (
    id         SERIAL PRIMARY KEY,
    group_id   INT REFERENCES study_groups(id) ON DELETE RESTRICT,
    full_name  VARCHAR(200) NOT NULL,
    email      VARCHAR(254),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_students_group ON students(group_id);
```

### Таблица `disciplines` (дисциплины)
```sql
CREATE TABLE disciplines (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(300) NOT NULL,
    code        VARCHAR(50) UNIQUE NOT NULL,
    total_hours INT NOT NULL,
    lesson_type VARCHAR(20) NOT NULL
                  CHECK (lesson_type IN ('lecture', 'practice', 'lab')),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

### Таблица `workloads` (учебная нагрузка) — главная
```sql
CREATE TABLE workloads (
    id            SERIAL PRIMARY KEY,
    teacher_id    INT NOT NULL REFERENCES teachers(id)    ON DELETE RESTRICT,
    discipline_id INT NOT NULL REFERENCES disciplines(id) ON DELETE RESTRICT,
    group_id      INT NOT NULL REFERENCES study_groups(id) ON DELETE RESTRICT,
    semester      VARCHAR(20) NOT NULL,      -- '2024-1', '2024-2'
    hours_plan    INT NOT NULL DEFAULT 0,
    hours_fact    INT NOT NULL DEFAULT 0,
    room          VARCHAR(20) DEFAULT '',
    day_of_week   SMALLINT,                  -- 1=Пн, 2=Вт, ... 6=Сб
    lesson_number SMALLINT,                  -- 1-7 (номер пары)
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE (teacher_id, discipline_id, group_id, semester)
);

-- Индексы для частых запросов
CREATE INDEX idx_workload_teacher_sem ON workloads(teacher_id, semester);
CREATE INDEX idx_workload_group_sem   ON workloads(group_id, semester);
-- Для поиска пересечений
CREATE INDEX idx_workload_schedule    ON workloads(semester, day_of_week, lesson_number);
```

### Таблица `grades` (оценки)
```sql
CREATE TABLE grades (
    id            SERIAL PRIMARY KEY,
    student_id    INT NOT NULL REFERENCES students(id)    ON DELETE CASCADE,
    discipline_id INT NOT NULL REFERENCES disciplines(id) ON DELETE RESTRICT,
    teacher_id    INT REFERENCES teachers(id)             ON DELETE SET NULL,
    semester      VARCHAR(20) NOT NULL,
    grade         FLOAT NOT NULL CHECK (grade >= 0 AND grade <= 5),
    date          DATE,
    source        VARCHAR(20) DEFAULT 'manual',  -- 'manual', 'excel', 'moodle', 'mock'
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_grades_student_sem    ON grades(student_id, semester);
CREATE INDEX idx_grades_discipline_sem ON grades(discipline_id, semester);
CREATE INDEX idx_grades_group          ON grades(student_id);  -- + JOIN со students
```

### Таблица `audit_logs` (журнал изменений)
```sql
CREATE TABLE audit_logs (
    id         BIGSERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(id) ON DELETE SET NULL,
    action     VARCHAR(20) NOT NULL,   -- 'create', 'update', 'delete', 'import'
    table_name VARCHAR(100) NOT NULL,
    object_id  INT,
    old_value  JSONB,
    new_value  JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Индекс для быстрого просмотра лога по времени
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_user    ON audit_logs(user_id, created_at DESC);
```

---

## 2. Важные запросы (ORM + SQL)

### Проверка пересечений по расписанию
```python
# Django ORM
from django.db.models import Q

def check_conflicts(teacher_id, room, semester, day_of_week, lesson_number, exclude_id=None):
    qs = Workload.objects.filter(
        semester=semester,
        day_of_week=day_of_week,
        lesson_number=lesson_number,
    ).filter(
        Q(teacher_id=teacher_id) | Q(room=room)
    )
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    return qs.exists()
```

### Студенты в зоне риска
```python
from django.db.models import Avg

risk_students = (
    Grade.objects
    .filter(semester='2024-1')
    .values('student_id', 'student__full_name', 'student__group__name')
    .annotate(avg_grade=Avg('grade'))
    .filter(avg_grade__lt=3.0)
    .order_by('avg_grade')
)
```

### Нагрузка преподавателя (план vs факт)
```python
from django.db.models import Sum

stats = (
    Workload.objects
    .filter(semester='2024-1')
    .values('teacher_id', 'teacher__full_name')
    .annotate(
        plan=Sum('hours_plan'),
        fact=Sum('hours_fact'),
    )
    .order_by('teacher__full_name')
)
```

### % успеваемости по направлениям
```python
from django.db.models import Avg, Count

by_direction = (
    Grade.objects
    .filter(semester='2024-1')
    .select_related('student__group')
    .values('student__group__direction_code', 'student__group__direction_name')
    .annotate(
        avg_grade=Avg('grade'),
        student_count=Count('student_id', distinct=True),
    )
)
```

---

## 3. Миграции — правила

```bash
# Создать миграцию после изменения модели
python manage.py makemigrations apps.workload

# Применить все миграции
python manage.py migrate

# Посмотреть SQL миграции перед применением
python manage.py sqlmigrate workload 0001
```

### Что нельзя делать с миграциями
- ❌ Не редактируй уже применённые миграции — создай новую
- ❌ Не удаляй миграционные файлы
- ❌ Не делай `makemigrations --merge` без понимания конфликта

### Как добавить начальные данные (фикстуры)
```python
# apps/workload/migrations/0002_initial_data.py
from django.db import migrations

def create_initial_data(apps, schema_editor):
    Department = apps.get_model('workload', 'Department')
    Department.objects.create(name='ГиСЭН', code='GISEN')

class Migration(migrations.Migration):
    dependencies = [('workload', '0001_initial')]
    operations = [
        migrations.RunPython(create_initial_data, migrations.RunPython.noop)
    ]
```

---

## 4. Redis — кэширование KPI

KPI-данные для дашборда считаются из большого количества записей. Кэшируем на 5 минут.

```python
# apps/kpi/services.py
from django.core.cache import cache
from django.db.models import Avg, Sum, Count


CACHE_TTL = 300  # 5 минут


def get_kpi_summary(semester: str) -> dict:
    """Сводка KPI — с кэшем."""
    cache_key = f'kpi_summary_{semester}'
    cached = cache.get(cache_key)
    if cached:
        return cached

    from apps.grades.models import Grade
    from apps.workload.models import Workload, Student

    total_students = Student.objects.count()

    # Студенты в зоне риска
    risk_count = (
        Grade.objects.filter(semester=semester)
        .values('student_id')
        .annotate(avg=Avg('grade'))
        .filter(avg__lt=3.0)
        .count()
    )

    # % закрытия часов
    workload_stats = Workload.objects.filter(semester=semester).aggregate(
        plan=Sum('hours_plan'), fact=Sum('hours_fact')
    )
    hours_completion = round(
        (workload_stats['fact'] or 0) / max(workload_stats['plan'] or 1, 1) * 100, 1
    )

    # Средняя успеваемость
    avg_grade = Grade.objects.filter(semester=semester).aggregate(avg=Avg('grade'))['avg'] or 0
    avg_grade_pct = round((avg_grade / 5.0) * 100, 1)

    result = {
        'total_students': total_students,
        'risk_count': risk_count,
        'hours_completion': hours_completion,
        'avg_grade_pct': avg_grade_pct,
    }

    cache.set(cache_key, result, CACHE_TTL)
    return result


def invalidate_kpi_cache(semester: str):
    """Вызывать после любого изменения оценок/нагрузки."""
    cache.delete(f'kpi_summary_{semester}')
    cache.delete_pattern(f'kpi_*_{semester}')  # если используешь django-redis
```

### Когда инвалидировать кэш
```python
# В сервисах после сохранения данных:
def save_grade(data):
    grade = Grade.objects.create(**data)
    invalidate_kpi_cache(data['semester'])  # ← сбрасываем кэш
    return grade
```

---

## 5. Настройка PostgreSQL (production)

```sql
-- Рекомендуемые настройки для небольшого сервера (4GB RAM)
-- postgresql.conf

shared_buffers = 1GB          -- 25% от RAM
effective_cache_size = 3GB    -- 75% от RAM
work_mem = 64MB
maintenance_work_mem = 256MB
max_connections = 100
log_min_duration_statement = 1000  -- логировать запросы > 1 сек
```

### Резервное копирование
```bash
# Ежедневный дамп (добавить в cron)
pg_dump -U postgres kafis > /backups/kafis_$(date +%Y%m%d).sql

# Восстановление
psql -U postgres kafis < /backups/kafis_20261015.sql
```

---

## 6. Переменные окружения (.env)

```bash
# .env (не коммитить в git!)
SECRET_KEY=your-very-secret-key-here
DEBUG=False

DB_NAME=kafis
DB_USER=postgres
DB_PASSWORD=strong_password_here
DB_HOST=db       # имя сервиса в docker-compose
DB_PORT=5432

REDIS_URL=redis://redis:6379/0

LMS_BACKEND=mock  # 'mock' или 'moodle'
MOODLE_URL=
MOODLE_TOKEN=

ALLOWED_HOSTS=localhost,127.0.0.1
```
