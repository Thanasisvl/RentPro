FROM python:3.11-slim@sha256:db27ce7778e5f581d5d97812ee577a01a9fffbfa612c47fc521fa684e3389c9b AS base

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Create non-root user (hardening) and a writable data dir for SQLite/uploads.
RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /data \
    && chown -R appuser:appuser /data

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS test

COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt

COPY app ./app
COPY tests ./tests
COPY alembic.ini ./alembic.ini
COPY alembic ./alembic

RUN chown -R appuser:appuser /app
USER appuser

CMD ["pytest", "-q", "--maxfail=1", "--disable-warnings", "--cov=app", "--cov-report=term-missing"]

FROM base AS runtime

COPY app ./app
COPY alembic.ini ./alembic.ini
COPY alembic ./alembic

RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/app"]

