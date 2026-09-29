# 🚀 Deploy Guide — Docker + Nginx + HTTPS

---

## 1. Структура файлов деплоя

```
kafis/
├── docker-compose.yml          # основной файл
├── docker-compose.dev.yml      # для локальной разработки
├── .env                        # переменные окружения (не в git!)
├── .env.example                # шаблон (коммитить)
├── backend/
│   ├── Dockerfile
│   └── entrypoint.sh
├── frontend/
│   ├── Dockerfile
│   └── nginx.conf              # конфиг для фронтенда
└── nginx/
    └── default.conf            # основной reverse proxy
```

---

## 2. Docker Compose (production)

```yaml
# docker-compose.yml
version: '3.9'

services:
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups          # для pg_dump
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    restart: always
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - static_files:/app/staticfiles
      - media_files:/app/media
    expose:
      - "8000"
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3

  frontend:
    build: ./frontend
    restart: always
    expose:
      - "80"

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
      - static_files:/var/www/static
      - ./nginx/certs:/etc/nginx/certs    # SSL сертификаты
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
  redis_data:
  static_files:
  media_files:
```

---

## 3. Dockerfile для Backend

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Системные зависимости (для WeasyPrint и psycopg2)
RUN apt-get update && apt-get install -y \
    gcc libpq-dev \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --no-input

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

```bash
#!/bin/sh
# backend/entrypoint.sh

echo "Ожидание базы данных..."
while ! nc -z $DB_HOST 5432; do sleep 1; done
echo "База данных готова."

echo "Применение миграций..."
python manage.py migrate --no-input

echo "Запуск сервера..."
exec "$@"
```

---

## 4. Dockerfile для Frontend

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build        # создаёт /app/dist

# Production: Nginx раздаёт статику
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```nginx
# frontend/nginx.conf — для React Router (SPA)
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;  # важно для React Router
    }
}
```

---

## 5. Nginx Reverse Proxy

```nginx
# nginx/default.conf
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:80;
}

server {
    listen 80;
    server_name _;

    # Редирект на HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name _;

    # SSL (самоподписанный сертификат для внутреннего контура)
    ssl_certificate     /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    client_max_body_size 20M;   # для загрузки Excel-файлов

    # API запросы → Django
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 60s;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }

    # Django статика
    location /static/ {
        alias /var/www/static/;
        expires 30d;
    }

    # Всё остальное → React SPA
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
    }
}
```

---

## 6. Генерация самоподписанного SSL сертификата

```bash
# Создаём папку для сертификатов
mkdir -p nginx/certs

# Генерируем сертификат (для внутреннего контура)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/certs/server.key \
    -out nginx/certs/server.crt \
    -subj "/C=RU/ST=Orenburg/L=Novotroitsk/O=NITU MISIS/CN=kafis.local"
```

---

## 7. Docker Compose для разработки

```yaml
# docker-compose.dev.yml
version: '3.9'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: kafis_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"     # доступна локально для DBeaver/pgAdmin

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Backend и Frontend запускаются ЛОКАЛЬНО, не в Docker
  # django: python manage.py runserver
  # react:  npm run dev
```

```bash
# Запуск для разработки
docker-compose -f docker-compose.dev.yml up -d
cd backend && python manage.py runserver
# в другом терминале:
cd frontend && npm run dev
```

---

## 8. Пошаговый деплой на сервер

```bash
# 1. Клонировать репозиторий на сервере
git clone <repo_url> kafis
cd kafis

# 2. Создать .env из шаблона
cp .env.example .env
nano .env         # заполнить все значения

# 3. Создать SSL сертификат
mkdir -p nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/certs/server.key \
    -out nginx/certs/server.crt

# 4. Собрать и запустить
docker-compose build
docker-compose up -d

# 5. Создать суперпользователя
docker-compose exec backend python manage.py createsuperuser

# 6. Проверить что всё работает
docker-compose ps              # все сервисы Running
curl -k https://localhost/api/ # ответ от API
```

---

## 9. Обслуживание

```bash
# Посмотреть логи
docker-compose logs backend --tail=50
docker-compose logs nginx --tail=20

# Перезапустить конкретный сервис
docker-compose restart backend

# Применить новые миграции после обновления кода
docker-compose exec backend python manage.py migrate

# Обновить приложение
git pull
docker-compose build backend frontend
docker-compose up -d --no-deps backend frontend

# Ручной бэкап БД
docker-compose exec db pg_dump -U postgres kafis > backups/kafis_$(date +%Y%m%d).sql

# Очистить старые Docker-образы
docker system prune -f
```

---

## 10. Автоматический бэкап (cron)

```bash
# На сервере добавить в crontab (crontab -e):
# Каждый день в 3:00 ночи
0 3 * * * cd /path/to/kafis && docker-compose exec -T db pg_dump -U postgres kafis > backups/kafis_$(date +\%Y\%m\%d).sql

# Удалять бэкапы старше 30 дней
30 3 * * * find /path/to/kafis/backups -name "*.sql" -mtime +30 -delete
```

---

## 11. Мониторинг ошибок (Sentry — опционально)

```python
# backend/requirements.txt добавить:
sentry-sdk[django]==1.39.1

# config/settings.py
import sentry_sdk
if not DEBUG:
    sentry_sdk.init(
        dsn=os.environ.get('SENTRY_DSN', ''),
        traces_sample_rate=0.1,
    )
```

> Для on-premise можно поднять self-hosted Sentry через Docker или просто использовать ELK Stack для анализа логов.

---

## Итоговая команда запуска

```bash
docker-compose up -d && echo "KafIS запущен на https://localhost"
```
