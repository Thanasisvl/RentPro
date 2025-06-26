from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import api_router
from app.core.jwt_middleware import JWTAuthMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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