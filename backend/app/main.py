from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import OperationalError, IntegrityError
from pydantic import ValidationError
from fastapi.encoders import jsonable_encoder

from app.routers import api_router
from app.core.jwt_middleware import JWTAuthMiddleware
from app.db.session import Base, engine
import app.models

load_dotenv()

app = FastAPI()

origins = [
    "http://localhost:3000",  # React dev
]

@app.on_event("startup")
def on_startup_create_tables():
    Base.metadata.create_all(bind=engine)

@app.exception_handler(OperationalError)
async def db_operational_error_handler(request: Request, exc: OperationalError):
    return JSONResponse(
        status_code=503,
        content={"detail": "Database connection error"}
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
async def request_validation_error_handler(request: Request, exc: RequestValidationError):
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

app.include_router(api_router)

app.mount("/uploads/contracts", StaticFiles(directory="uploads/contracts"), name="contracts")

@app.get("/")
def read_root():
    return {"message": "Welcome to the RentPro application!"}