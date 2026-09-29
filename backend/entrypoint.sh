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

echo "Сбор статических файлов..."
python manage.py collectstatic --no-input --clear || true

echo "Очистка журнала аудита старше ${AUDIT_LOG_RETENTION_DAYS:-30} дней..."
python manage.py cleanup_audit_logs --days "${AUDIT_LOG_RETENTION_DAYS:-30}" || true

echo "Запуск основного процесса..."
exec "$@"
