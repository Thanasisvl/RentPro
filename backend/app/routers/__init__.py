from fastapi import APIRouter

from .area import router as area_router
from .auth import router as auth_router
from .contract import router as contract_router
from .preference_profile import router as preference_profile_router
from .property import router as property_router
from .recommendation import router as recommendation_router
from .tenant import router as tenant_router
from .user import router as user_router

api_router = APIRouter()
api_router.include_router(area_router, prefix="/areas", tags=["areas"])
api_router.include_router(user_router, prefix="/users", tags=["users"])
api_router.include_router(property_router, prefix="/properties", tags=["properties"])
api_router.include_router(contract_router, prefix="/contracts", tags=["contracts"])
api_router.include_router(tenant_router, prefix="/tenants", tags=["tenants"])
api_router.include_router(auth_router, prefix="", tags=["auth"])
api_router.include_router(
    preference_profile_router,
    prefix="/preference-profiles",
    tags=["preference-profiles"],
)
api_router.include_router(
    recommendation_router, prefix="/recommendations", tags=["recommendations"]
)
