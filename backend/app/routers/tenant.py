from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantOut
from app.crud import tenant as crud_tenant
from app.core.utils import is_admin, get_current_user
from app.models.tenant import Tenant
from app.db.session import get_db
from typing import List

router = APIRouter()

@router.post("/", response_model=TenantOut)
def create_tenant(
    request: Request,
    tenant: TenantCreate,
    db: Session = Depends(get_db)
    ):
    user = get_current_user(request, db)

    existing = db.query(Tenant).filter(Tenant.user_id == user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tenant profile already exists for this user")
    
    return crud_tenant.create_tenant(db=db, tenant=tenant, user_id=user.id)


@router.get("/", response_model=List[TenantOut])
def list_tenants(
    request: Request,
    db: Session = Depends(get_db)
    ):
    user = get_current_user(request, db)
    return db.query(Tenant).filter(Tenant.user_id == user.id).all()

@router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant(
    request: Request,
    tenant_id: int,
    db: Session = Depends(get_db)
    ):
    db_tenant = crud_tenant.get_tenant(db, tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    user = get_current_user(request, db)
    if db_tenant.user_id != user.id and not is_admin(request, db):
        raise HTTPException(status_code=403, detail="Not authorized to view this tenant profile")
    return db_tenant

@router.put("/{tenant_id}", response_model=TenantOut)
def update_tenant(
    request: Request,
    tenant_id: int,
    tenant: TenantUpdate,
    db: Session = Depends(get_db)
    ):
    db_tenant = crud_tenant.get_tenant(db, tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    user = get_current_user(request, db)
    if db_tenant.user_id != user.id and not is_admin(request, db):
        raise HTTPException(status_code=403, detail="Not authorized to update this tenant profile")
    return crud_tenant.update_tenant(db, tenant_id, tenant)


@router.delete("/{tenant_id}", response_model=TenantOut)
def delete_tenant(
    request: Request,
    tenant_id: int,
    db: Session = Depends(get_db)
    ):
    db_tenant = crud_tenant.get_tenant(db, tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    user = get_current_user(request, db)
    if db_tenant.user_id != user.id and not is_admin(request, db):
        raise HTTPException(status_code=403, detail="Not authorized to delete this tenant profile")
    return crud_tenant.delete_tenant(db, tenant_id)