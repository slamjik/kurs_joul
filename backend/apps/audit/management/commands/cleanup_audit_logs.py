"""
Management command to clean up audit logs older than the retention threshold.
Default retention period: 30 days (1 month).

Usage:
  python manage.py cleanup_audit_logs
  python manage.py cleanup_audit_logs --days 14
"""

from datetime import timedelta
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from audit.models import AuditLog


class Command(BaseCommand):
    help = "Delete audit log records older than N days (default: AUDIT_LOG_RETENTION_DAYS or 30 days)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=getattr(settings, "AUDIT_LOG_RETENTION_DAYS", 30),
            help="Number of days to keep audit logs for (older records will be deleted).",
        )

    def handle(self, *args, **options):
        days = options["days"]
        cutoff_date = timezone.now() - timedelta(days=days)

        self.stdout.write(f"Удаление записей журнала аудита старше {days} дней (до {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')})...")

        deleted_count, _ = AuditLog.objects.filter(created_at__lt=cutoff_date).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"[OK] Очистка завершена. Удалено устаревших записей аудита: {deleted_count}."
            )
        )
