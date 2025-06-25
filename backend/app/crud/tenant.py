from sqlalchemy.orm import Session
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import TenantCreate, TenantUpdate
from fastapi import HTTPException

def create_tenant(db: Session, tenant: TenantCreate):
    # Check if user exists
    user = db.query(User).filter(User.id == tenant.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User does not exist")
    # Optionally check role
    if user.role != "TENANT":
        raise HTTPException(status_code=400, detail="User is not a tenant")
    db_tenant = Tenant(**tenant.model_dump())
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

def get_tenant(db: Session, tenant_id: int):
    return db.query(Tenant).filter(Tenant.id == tenant_id).first()

def get_tenants(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Tenant).offset(skip).limit(limit).all()

def update_tenant(db: Session, tenant_id: int, tenant: TenantUpdate):
    db_tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not db_tenant:
        return None
    tenant_data = tenant.model_dump(exclude_unset=True)
    for key, value in tenant_data.items():
        setattr(db_tenant, key, value)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

def delete_tenant(db: Session, tenant_id: int):
    db_tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if db_tenant:
        db.delete(db_tenant)
        db.commit()
    return db_tenant