from __future__ import annotations

import contextvars
import json
import logging
import os
import threading
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

_request_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "rentpro_request_id", default=None
)


def get_request_id() -> str | None:
    return _request_id_ctx.get()


class _RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003
        record.request_id = get_request_id() or "-"
        return True


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    """
    Basic app logging configuration.

    - If RENTPRO_JSON_LOGS=1, use JSON lines (nice for demos/CI).
    - Otherwise use a consistent text format that includes request_id.
    """
    root = logging.getLogger()
    if root.handlers:
        # Don't double-configure if reloaded.
        return

    level = os.getenv("RENTPRO_LOG_LEVEL", "INFO").upper().strip() or "INFO"
    use_json = os.getenv("RENTPRO_JSON_LOGS", "").strip() == "1"

    handler = logging.StreamHandler()
    handler.addFilter(_RequestIdFilter())
    if use_json:
        handler.setFormatter(_JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                fmt="%(asctime)s %(levelname)s %(name)s request_id=%(request_id)s %(message)s"
            )
        )

    root.setLevel(level)
    root.addHandler(handler)


@dataclass
class _MetricsSnapshot:
    uptime_seconds: float
    requests_total: int
    by_status: Dict[str, int]
    by_path: Dict[str, int]


class InMemoryMetrics:
    """
    Very small in-memory metrics store (sufficient for demos).

    Notes:
    - Not shared across multiple processes/workers.
    - Resets on container restart.
    """

    def __init__(self) -> None:
        self._start = time.time()
        self._lock = threading.Lock()
        self._requests_total = 0
        self._by_status: Dict[str, int] = {}
        self._by_path: Dict[str, int] = {}

    def observe(self, *, path: str, status_code: int) -> None:
        with self._lock:
            self._requests_total += 1
            sk = str(int(status_code))
            self._by_status[sk] = self._by_status.get(sk, 0) + 1
            self._by_path[path] = self._by_path.get(path, 0) + 1

    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            snap = _MetricsSnapshot(
                uptime_seconds=time.time() - self._start,
                requests_total=self._requests_total,
                by_status=dict(self._by_status),
                by_path=dict(self._by_path),
            )
        # return plain dict (FastAPI JSON encodes)
        return {
            "uptime_seconds": round(snap.uptime_seconds, 3),
            "requests_total": snap.requests_total,
            "by_status": snap.by_status,
            "by_path": snap.by_path,
        }


class ObservabilityMiddleware(BaseHTTPMiddleware):
    """
    Adds:
    - X-Request-ID header (reuses incoming if provided)
    - request.state.request_id
    - request-scoped logging context (request_id)
    - basic metrics counting
    """

    def __init__(self, app, metrics: InMemoryMetrics | None = None):  # type: ignore[no-untyped-def]
        super().__init__(app)
        self._metrics = metrics
        self._log_requests = os.getenv("RENTPRO_LOG_REQUESTS", "").strip() == "1"
        self._logger = logging.getLogger("rentpro.request")

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        rid = request.headers.get("X-Request-ID")
        if not rid:
            rid = uuid.uuid4().hex

        token = _request_id_ctx.set(rid)
        request.state.request_id = rid

        start = time.perf_counter()
        try:
            response: Response = await call_next(request)
        finally:
            duration_ms = (time.perf_counter() - start) * 1000.0
            _request_id_ctx.reset(token)

        response.headers["X-Request-ID"] = rid

        if self._metrics is not None:
            try:
                self._metrics.observe(
                    path=request.url.path, status_code=response.status_code
                )
            except Exception:
                # Never fail the request due to metrics.
                pass

        if self._log_requests:
            self._logger.info(
                "%s %s -> %s (%.1fms)",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )

        return response
