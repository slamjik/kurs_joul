"""
Django settings for KafIS project.
Информационная система кафедры «ГиСЭН» (НФ НИТУ МИСИС)
"""

import os
import sys
from datetime import timedelta
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Загрузка переменных окружения из .env файла
for env_candidate in [BASE_DIR.parent / ".env", BASE_DIR / ".env"]:
    if env_candidate.exists():
        with open(env_candidate, encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    os.environ.setdefault(_k.strip(), _v.strip())
        break

# Добавляем папку apps в путь поиска модулей, чтобы импортировать приложения напрямую
sys.path.insert(0, str(BASE_DIR / "apps"))

# ─── Security Settings ────────────────────────────────────────────────────────
SECRET_KEY = os.getenv(
    "SECRET_KEY", "django-insecure-kafis-gisen-dev-secret-key-2026-misis"
)

DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")

# ─── Application Definition ───────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Сторонние библиотеки
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    # Модули проекта KafIS
    "core.apps.CoreConfig",
    "auth_app.apps.AuthAppConfig",
    "workload.apps.WorkloadConfig",
    "grades.apps.GradesConfig",
    "kpi.apps.KpiConfig",
    "reports.apps.ReportsConfig",
    "imports.apps.ImportsConfig",
    "audit.apps.AuditConfig",
    "surveys.apps.SurveysConfig",
]

# Кастомная модель пользователя с ролевой моделью (head, teacher, admin)
AUTH_USER_MODEL = "auth_app.User"

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Middleware аудита действий пользователей (активируется в модуле audit)
    "audit.middleware.AuditMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ─── Database Configuration ───────────────────────────────────────────────────
# По умолчанию используется PostgreSQL. Если переменная USE_SQLITE=True,
# используется SQLite для легковесного локального тестирования без контейнера.
USE_SQLITE = os.getenv("USE_SQLITE", "False").lower() in ("true", "1", "yes")

if USE_SQLITE:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "kafis"),
            "USER": os.getenv("DB_USER", "postgres"),
            "PASSWORD": os.getenv("DB_PASSWORD", "postgres_password_dev"),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
        }
    }

# ─── Caches (Redis) ───────────────────────────────────────────────────────────
USE_LOCMEM_CACHE = os.getenv("USE_LOCMEM_CACHE", "False").lower() in ("true", "1", "yes")

if USE_LOCMEM_CACHE:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "unique-snowflake",
        }
    }
else:
    REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
    REDIS_PORT = os.getenv("REDIS_PORT", "6379")
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": f"redis://{REDIS_HOST}:{REDIS_PORT}/1",
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "SOCKET_CONNECT_TIMEOUT": 5,
                "SOCKET_TIMEOUT": 5,
            },
            "KEY_PREFIX": "kafis",
        }
    }

# ─── Password Validation ──────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 6}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ─── Internationalization & Timezone ──────────────────────────────────────────
LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Asia/Yekaterinburg"  # Часовой пояс Новотроицка/Оренбургской области (UTC+5)
USE_I18N = True
USE_TZ = True

# ─── Static & Media Files ─────────────────────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─── Django REST Framework & JWT ──────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/minute",
        "user": "500/minute",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ─── drf-spectacular (OpenAPI 3 / Swagger) ─────────────────────────────────────
SPECTACULAR_SETTINGS = {
    "TITLE": "KafIS API — Информационная система кафедры ГиСЭН",
    "DESCRIPTION": (
        "REST API информационной системы кафедры Гуманитарных и социально-экономических "
        "наук (ГиСЭН) НФ НИТУ МИСИС. Включает планирование учебной нагрузки, мониторинг "
        "успеваемости, расчёт KPI кафедры и экспорт отчётности."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVERS": [
        {"url": "http://127.0.0.1:8000", "description": "Локальный сервер KafIS"},
    ],
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
        "displayOperationId": True,
    },
    "ENUM_NAME_OVERRIDES": {
        "GradeSourceEnum": "grades.models.Grade.SOURCE_CHOICES",
        "RecommendationSourceEnum": "surveys.models.TeacherRecommendation.SOURCE_CHOICES",
    },
}

# ─── CORS Settings (Strict Origin Whitelist) ──────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

# ─── KafIS Business Constants ─────────────────────────────────────────────────
# Порог для определения студента в "зоне риска" (средний балл ниже 3.0)
RISK_THRESHOLD = 3.0

# Бэкенд LMS: 'mock' (по умолчанию для разработки) или 'moodle' (реальная интеграция)
LMS_BACKEND = os.getenv("LMS_BACKEND", "mock")

# ─── Audit Log Retention Policy ───────────────────────────────────────────────
# Срок хранения записей журнала аудита (по умолчанию 30 дней / 1 месяц)
AUDIT_LOG_RETENTION_DAYS = int(os.getenv("AUDIT_LOG_RETENTION_DAYS", "30"))

