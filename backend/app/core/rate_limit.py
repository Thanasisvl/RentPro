from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass

from fastapi import HTTPException, Request, status


def _enabled() -> bool:
    return os.getenv("RENTPRO_RATE_LIMIT_ENABLED", "").strip() == "1"


def _per_minute(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        v = int(raw)
    except ValueError as e:
        raise RuntimeError(f"{name} must be an integer (got {raw!r})") from e
    return max(0, v)


@dataclass
class _Bucket:
    window_start: float
    count: int


class FixedWindowRateLimiter:
    """
    Simple fixed-window rate limiter (in-memory).

    Good enough for demos. Not shared across multiple processes.
    """

    def __init__(self, window_seconds: int = 60):
        self._window_seconds = window_seconds
        self._lock = threading.Lock()
        self._buckets: dict[str, _Bucket] = {}

    def hit(self, key: str, *, limit: int) -> None:
        if limit <= 0:
            return

        now = time.time()
        window = float(self._window_seconds)

        with self._lock:
            b = self._buckets.get(key)
            if b is None or (now - b.window_start) >= window:
                b = _Bucket(window_start=now, count=0)
                self._buckets[key] = b

            b.count += 1
            if b.count > limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please retry later.",
                )


_limiter = FixedWindowRateLimiter(window_seconds=60)


def rate_limit_auth(request: Request) -> None:
    """
    Apply rate limiting to auth endpoints (login/refresh) when enabled.
    """
    if not _enabled():
        return

    ip = (request.client.host if request.client else "") or "unknown"
    path = request.url.path

    # Defaults are intentionally high to avoid breaking tests.
    if path.endswith("/login"):
        limit = _per_minute("RENTPRO_RATE_LIMIT_LOGIN_PER_MIN", 120)
        _limiter.hit(f"login:{ip}", limit=limit)
    elif path.endswith("/auth/refresh"):
        limit = _per_minute("RENTPRO_RATE_LIMIT_REFRESH_PER_MIN", 240)
        _limiter.hit(f"refresh:{ip}", limit=limit)

