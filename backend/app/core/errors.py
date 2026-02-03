from __future__ import annotations

from uuid import uuid4
from typing import Any

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError
from starlette.responses import JSONResponse


def _request_id(request: Request) -> str:
    # allow client-provided request id, else generate
    rid = request.headers.get("X-Request-ID")
    return rid or str(uuid4())


def _as_message(detail: Any) -> str:
    if isinstance(detail, str):
        return detail
    # FastAPI often uses list/dict for validation-like details
    return "Request failed"


def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    rid = _request_id(request)
    detail = exc.detail
    message = _as_message(detail)

    payload = {
        # backward compatible with existing tests/clients
        "detail": detail,
        # consistent envelope
        "error": {
            "code": f"HTTP_{exc.status_code}",
            "message": message,
            "details": detail if not isinstance(detail, str) else None,
        },
        "request_id": rid,
    }
    return JSONResponse(status_code=exc.status_code, content=payload, headers={"X-Request-ID": rid})


def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    rid = _request_id(request)
    errors = exc.errors()

    payload = {
        "detail": errors,  # keep FastAPI-compatible shape
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "Validation failed",
            "details": errors,
        },
        "request_id": rid,
    }
    return JSONResponse(status_code=422, content=payload, headers={"X-Request-ID": rid})


def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    rid = _request_id(request)

    # don't leak DB internals; keep message stable
    payload = {
        "detail": "Integrity constraint violated",
        "error": {
            "code": "INTEGRITY_ERROR",
            "message": "Integrity constraint violated",
            "details": None,
        },
        "request_id": rid,
    }
    return JSONResponse(status_code=409, content=payload, headers={"X-Request-ID": rid})


def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    rid = _request_id(request)
    payload = {
        "detail": "Internal server error",
        "error": {
            "code": "INTERNAL_ERROR",
            "message": "Internal server error",
            "details": None,
        },
        "request_id": rid,
    }
    return JSONResponse(status_code=500, content=payload, headers={"X-Request-ID": rid})