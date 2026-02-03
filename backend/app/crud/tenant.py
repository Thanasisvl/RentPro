from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.tenant import Tenant
from app.schemas.tenant import TenantCreate, TenantUpdate

def create_tenant(db: Session, tenant: TenantCreate, owner_id: int, *, created_by_id: int | None = None) -> Tenant:
    exists = (
        db.query(Tenant)
        .filter(Tenant.owner_id == owner_id, Tenant.afm == tenant.afm)
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Tenant with this AFM already exists for this owner")

    data = tenant.model_dump(exclude={"owner_id"})
    db_tenant = Tenant(**data, owner_id=owner_id)

    db_tenant.created_by_id = created_by_id
    db_tenant.updated_by_id = created_by_id

    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

def get_tenant(db: Session, tenant_id: int):
    return db.query(Tenant).filter(Tenant.id == tenant_id).first()

def list_tenants(db: Session, *, owner_id: int | None = None, skip: int = 0, limit: int = 100):
    q = db.query(Tenant)
    if owner_id is not None:
        q = q.filter(Tenant.owner_id == owner_id)
    return q.offset(skip).limit(limit).all()

def update_tenant(db: Session, tenant_id: int, tenant: TenantUpdate, *, updated_by_id: int | None = None):
    db_tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not db_tenant:
        return None

    data = tenant.model_dump(exclude_unset=True)

    if "afm" in data and data["afm"] != db_tenant.afm:
        exists = (
            db.query(Tenant)
            .filter(Tenant.owner_id == db_tenant.owner_id, Tenant.afm == data["afm"])
            .first()
        )
        if exists:
            raise HTTPException(status_code=409, detail="Tenant with this AFM already exists for this owner")

    for k, v in data.items():
        setattr(db_tenant, k, v)

    db_tenant.updated_by_id = updated_by_id

    db.commit()
    db.refresh(db_tenant)
    return db_tenant

def delete_tenant(db: Session, tenant_id: int):
    db_tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not db_tenant:
        return None
    db.delete(db_tenant)
    db.commit()
    return db_tenant