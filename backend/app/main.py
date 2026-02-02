from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routers import api_router
from app.core.jwt_middleware import JWTAuthMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from pydantic import ValidationError
from fastapi.encoders import jsonable_encoder

app = FastAPI()

origins = [
    "http://localhost:3000",  # React dev
]

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