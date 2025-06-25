from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantOut
from app.crud import tenant as crud_tenant
from app.core.jwt import get_current_user
from app.models.user import User
from app.db.session import get_db
from typing import List

router = APIRouter()

@router.post("/", response_model=TenantOut)
def create_tenant(
    tenant: TenantCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
    ):
    user = db.query(User).filter(User.username == current_user["sub"]).first()
    if not user or user.role != "TENANT":
        raise HTTPException(status_code=403, detail="Only users with TENANT role can create a tenant profile")
    tenant_data = tenant.model_dump()
    tenant_data["user_id"] = user.id
    return crud_tenant.create_tenant(db=db, tenant=TenantCreate(**tenant_data))


@router.get("/", response_model=List[TenantOut])
def list_tenants(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
    ):
    user = db.query(User).filter(User.username == current_user["sub"]).first()
    return db.query(crud_tenant.Tenant).filter(crud_tenant.Tenant.user_id == user.id).all()

@router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
    ):
    db_tenant = crud_tenant.get_tenant(db, tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    user = db.query(User).filter(User.username == current_user["sub"]).first()
    if db_tenant.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this tenant profile")
    return db_tenant

@router.put("/{tenant_id}", response_model=TenantOut)
def update_tenant(
    tenant_id: int,
    tenant: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
    ):
    db_tenant = crud_tenant.get_tenant(db, tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    user = db.query(User).filter(User.username == current_user["sub"]).first()
    if db_tenant.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this tenant profile")
    return crud_tenant.update_tenant(db, tenant_id, tenant)


@router.delete("/{tenant_id}", response_model=TenantOut)
def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
    ):
    db_tenant = crud_tenant.get_tenant(db, tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    user = db.query(User).filter(User.username == current_user["sub"]).first()
    if db_tenant.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this tenant profile")
    return crud_tenant.delete_tenant(db, tenant_id)