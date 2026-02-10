from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError, OperationalError
from pathlib import Path
import os

import app.models
from app.core.observability import (
    InMemoryMetrics,
    ObservabilityMiddleware,
    configure_logging,
)
from app.core.migrations import run_migrations
from app.core.uploads import get_upload_root
from app.core.jwt_middleware import JWTAuthMiddleware
from app.core.seed import seed_e2e_fixtures, seed_locked_areas, seed_locked_criteria
from app.db.session import SessionLocal
from app.routers import api_router

load_dotenv()
configure_logging()

app = FastAPI()
app.state.metrics = InMemoryMetrics()

origins = [
    "http://localhost:3000",  # React dev
    "http://127.0.0.1:3000",  # Playwright/webServer default
]


@app.on_event("startup")
def on_startup_migrate_and_seed():
    run_migrations()
    # Safe, idempotent seeds
    db = SessionLocal()
    try:
        seed_locked_areas(db)
        seed_locked_criteria(db)
        if os.getenv("RENTPRO_E2E_SEED", "").strip() == "1":
            pwd = os.getenv("RENTPRO_E2E_PASSWORD", "rentpro-e2e")
            seed_e2e_fixtures(db, password=pwd)
    finally:
        db.close()


@app.exception_handler(OperationalError)
async def db_operational_error_handler(request: Request, exc: OperationalError):
    return JSONResponse(
        status_code=503, content={"detail": "Database connection error"}
    )


@app.exception_handler(ValidationError)
async def pydantic_validation_error_handler(request: Request, exc: ValidationError):
    # Pydantic v2 may include non-JSON-serializable objects (e.g. ValueError) inside ctx.
    # jsonable_encoder makes the structure safe for JSONResponse.
    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors())},
    )


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(
    request: Request, exc: RequestValidationError
):
    # Pydantic v2 may include non-JSON-serializable objects (e.g. ValueError) inside ctx.
    # jsonable_encoder makes the structure safe for JSONResponse.
    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors())},
    )


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=400,
        content={"detail": "Integrity error"},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Unhandled exception"},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(JWTAuthMiddleware)
app.add_middleware(ObservabilityMiddleware, metrics=app.state.metrics)

app.include_router(api_router)

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = get_upload_root()

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.get("/")
def read_root():
    return {"message": "Welcome to the RentPro application!"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/metrics")
def metrics():
    return app.state.metrics.snapshot()
