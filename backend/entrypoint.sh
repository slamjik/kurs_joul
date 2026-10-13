#!/bin/sh
set -e

echo "Ожидание доступности базы данных ${DB_HOST:-db}:${DB_PORT:-5432}..."
if [ -n "$DB_HOST" ]; then
  while ! nc -z "$DB_HOST" "${DB_PORT:-5432}"; do
    sleep 1
  done
  echo "База данных доступна."
fi

echo "Применение миграций базы данных..."
python manage.py migrate --no-input

echo "Проверка наличия данных в базе данных..."
python -c "
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from workload.models import Workload
if Workload.objects.count() == 0:
    print('База данных пуста. Автоматическое сидирование реальной нагрузки и пользователей...')
    from django.core.management import call_command
    call_command('seed_demo_data')
else:
    print(f'В базе данных уже есть {Workload.objects.count()} записей учебной нагрузки.')
" || true

echo "Сбор статических файлов..."
python manage.py collectstatic --no-input --clear || true

echo "Очистка журнала аудита старше ${AUDIT_LOG_RETENTION_DAYS:-30} дней..."
python manage.py cleanup_audit_logs --days "${AUDIT_LOG_RETENTION_DAYS:-30}" || true

echo "Запуск основного процесса..."
exec "$@"
