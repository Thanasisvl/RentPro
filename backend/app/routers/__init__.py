from fastapi import APIRouter
from .user import router as user_router
from .property import router as property_router

api_router = APIRouter()
api_router.include_router(user_router, prefix="/users", tags=["users"])
api_router.include_router(property_router, prefix="/properties", tags=["properties"])