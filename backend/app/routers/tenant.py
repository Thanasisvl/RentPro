from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.utils import get_current_user, is_admin
from app.crud import tenant as crud_tenant
from app.db.session import get_db
from app.models.contract import Contract, ContractStatus
from app.schemas.tenant import TenantCreate, TenantOut, TenantUpdate

router = APIRouter()


@router.post("/", response_model=TenantOut)
def create_tenant(
    request: Request, tenant: TenantCreate, db: Session = Depends(get_db)
):
    user = get_current_user(request, db)

    owner_id = user.id
    if getattr(tenant, "owner_id", None) is not None:
        if not is_admin(request, db):
            raise HTTPException(status_code=403, detail="Only admin can set owner_id")
        owner_id = tenant.owner_id

    return crud_tenant.create_tenant(db, tenant, owner_id, created_by_id=user.id)


@router.get("/", response_model=List[TenantOut])
def list_tenants(
    request: Request,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    owner_id: int
    | None = Query(default=None, description="Admin-only filter by owner id"),
):
    user = get_current_user(request, db)

    if is_admin(request, db):
        # admin can list all, and optionally filter by owner_id
        return crud_tenant.list_tenants(db, owner_id=owner_id, skip=skip, limit=limit)

    # non-admin cannot use owner_id filter
    if owner_id is not None:
        raise HTTPException(status_code=403, detail="owner_id filter is admin-only")

    return crud_tenant.list_tenants(db, owner_id=user.id, skip=skip, limit=limit)


@router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant(request: Request, tenant_id: int, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    t = crud_tenant.get_tenant(db, tenant_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if (not is_admin(request, db)) and t.owner_id != user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to view this tenant"
        )

    return t


@router.put("/{tenant_id}", response_model=TenantOut)
def update_tenant(
    tenant_id: int,
    request: Request,
    tenant: TenantUpdate,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)

    db_tenant = crud_tenant.get_tenant(db, tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if (not is_admin(request, db)) and db_tenant.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    updated = crud_tenant.update_tenant(db, tenant_id, tenant, updated_by_id=user.id)
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
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this tenant"
        )

    # UC-06 A2: prevent deletion when tenant participates in an ACTIVE contract.
    active_contract_exists = (
        db.query(Contract.id)
        .filter(
            Contract.tenant_id == tenant_id,
            Contract.status == ContractStatus.ACTIVE,
        )
        .first()
        is not None
    )
    if active_contract_exists:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete tenant with an ACTIVE contract",
        )

    deleted = crud_tenant.delete_tenant(db, tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return deleted
