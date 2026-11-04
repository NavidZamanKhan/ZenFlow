web: gunicorn config.wsgi:application
worker: celery -A config worker --loglevel=info
beat: celery -A config beat --loglevel=info
