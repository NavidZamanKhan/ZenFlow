from django.db import connection
from django.http import JsonResponse


def health(request):
    """Liveness/readiness probe used by Docker healthchecks and uptime monitors."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        database = "ok"
        status_code = 200
    except Exception:  # pragma: no cover - only reachable when the DB is down
        database = "unavailable"
        status_code = 503
    return JsonResponse({"status": "ok" if status_code == 200 else "degraded", "database": database}, status=status_code)
