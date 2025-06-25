from fastapi import APIRouter
from .user import router as user_router
from .property import router as property_router
from .contract import router as contract_router
from .tenant import router as tenant_router
from .auth import router as auth_router

api_router = APIRouter()
api_router.include_router(user_router, prefix="/users", tags=["users"])
api_router.include_router(property_router, prefix="/properties", tags=["properties"])
api_router.include_router(contract_router, prefix="/contracts", tags=["contracts"])
api_router.include_router(tenant_router, prefix="/tenants", tags=["tenants"])
api_router.include_router(auth_router, tags=["auth"])