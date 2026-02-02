from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantOut
from app.crud import tenant as crud_tenant
from app.core.utils import is_admin, get_current_user
from app.db.session import get_db
from typing import List

router = APIRouter()

@router.post("/", response_model=TenantOut)
def create_tenant(request: Request, tenant: TenantCreate, db: Session = Depends(get_db)):
    user = get_current_user(request, db)

    owner_id = user.id
    if tenant.owner_id is not None:
        if not is_admin(request, db):
            raise HTTPException(status_code=403, detail="Only admin can set owner_id")
        owner_id = tenant.owner_id

    return crud_tenant.create_tenant(db=db, tenant=tenant, owner_id=owner_id)

@router.get("/", response_model=List[TenantOut])
def list_tenants(request: Request, db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    user = get_current_user(request, db)

    if is_admin(request, db):
        return crud_tenant.list_tenants(db=db, owner_id=None, skip=skip, limit=limit)

    return crud_tenant.list_tenants(db=db, owner_id=user.id, skip=skip, limit=limit)

@router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant(request: Request, tenant_id: int, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    t = crud_tenant.get_tenant(db, tenant_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if (not is_admin(request, db)) and t.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this tenant")

    return t

@router.put("/{tenant_id}", response_model=TenantOut)
def update_tenant(request: Request, tenant_id: int, tenant: TenantUpdate, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    t = crud_tenant.get_tenant(db, tenant_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if (not is_admin(request, db)) and t.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this tenant")

    updated = crud_tenant.update_tenant(db, tenant_id, tenant)
    if not updated:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return updated

@router.delete("/{tenant_id}", response_model=TenantOut)
def delete_tenant(request: Request, tenant_id: int, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    t = crud_tenant.get_tenant(db, tenant_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if (not is_admin(request, db)) and t.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this tenant")

    deleted = crud_tenant.delete_tenant(db, tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return deleted