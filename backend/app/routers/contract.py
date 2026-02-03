from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Query
from uuid import uuid4
from sqlalchemy.orm import Session
from datetime import datetime, timezone, date
import os
from typing import List

from app.schemas.contract import ContractCreate, ContractUpdate, ContractOut
from app.models.property import Property, PropertyStatus
from app.models.contract import Contract, ContractStatus
from app.models.tenant import Tenant
from app.crud import contract as crud_contract
from app.core.utils import get_current_user, is_admin
from app.db.session import get_db
from app.core.status_sync import sync_property_status

router = APIRouter()

UPLOAD_DIR = "./uploads/contracts"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _auto_expire_contracts(db: Session, *, owner_id: int | None = None) -> int:
    """
    Auto-expire overdue ACTIVE contracts.
    If owner_id provided => only contracts of properties owned by that user.
    Returns number of contracts expired.
    """
    today = date.today()

    q = (
        db.query(Contract)
        .join(Property, Contract.property_id == Property.id)
        .filter(
            Contract.status == ContractStatus.ACTIVE,
            Contract.end_date < today,
        )
    )

    if owner_id is not None:
        q = q.filter(Property.owner_id == owner_id)

    overdue = q.all()
    if not overdue:
        return 0

    expired_count = 0
    for c in overdue:
        # expire contract
        c.status = ContractStatus.EXPIRED
        expired_count += 1

        # free property only if there isn't another "current" ACTIVE contract
        other_current_active_exists = (
            db.query(Contract.id)
            .filter(
                Contract.property_id == c.property_id,
                Contract.status == ContractStatus.ACTIVE,
                Contract.id != c.id,
                Contract.end_date >= today,
            )
            .first()
            is not None
        )
        if not other_current_active_exists:
            c.property.status = PropertyStatus.AVAILABLE

    db.commit()
    return expired_count

@router.post("/", response_model=ContractOut)
def create_contract(request: Request, contract: ContractCreate, db: Session = Depends(get_db)):
    user = get_current_user(request, db)

    property_obj = db.query(Property).filter(Property.id == contract.property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")

    if property_obj.owner_id != user.id and not is_admin(request, db):
        raise HTTPException(status_code=403, detail="Not authorized to create contract for this property")

    tenant_obj = db.query(Tenant).filter(Tenant.id == contract.tenant_id).first()
    if not tenant_obj:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if (not is_admin(request, db)) and tenant_obj.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Tenant does not belong to current owner")

    # A3 anti-drift: normalize property status before checks
    sync_property_status(db, property_obj.id)

    today = date.today()

    # A1: block if there is a running ACTIVE contract today (do NOT rely on property.status)
    running_exists = (
        db.query(Contract.id)
        .filter(
            Contract.property_id == property_obj.id,
            Contract.status == ContractStatus.ACTIVE,
            Contract.start_date <= today,
            Contract.end_date >= today,
        )
        .first()
        is not None
    )
    if running_exists:
        raise HTTPException(status_code=409, detail="Property already has an active running contract")

    db_contract = crud_contract.create_contract(db, contract, created_by_id=user.id)

    sync_property_status(db, db_contract.property_id)
    return db_contract

@router.get("/", response_model=List[ContractOut])
def list_contracts(
    request: Request,
    db: Session = Depends(get_db),
    owner_id: int | None = Query(default=None, description="Admin-only filter by property owner id"),
    property_id: int | None = Query(default=None),
    tenant_id: int | None = Query(default=None),
    status: ContractStatus | None = Query(default=None),
    running_today: bool | None = Query(default=None, description="If true: start<=today<=end and status=ACTIVE"),
    skip: int = 0,
    limit: int = 100,
):
    user = get_current_user(request, db)
    admin = is_admin(request, db)

    effective_owner_id = owner_id if admin else user.id

    return crud_contract.get_contracts(
        db,
        skip=skip,
        limit=limit,
        owner_id=effective_owner_id,
        property_id=property_id,
        tenant_id=tenant_id,
        status=status,
        running_today=running_today,
    )

@router.get("/{contract_id}", response_model=ContractOut)
def get_contract(
    request: Request,
    contract_id: int,
    db: Session = Depends(get_db),
):
    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    user = get_current_user(request, db)
    if db_contract.property.owner_id != user.id and not is_admin(request, db):
        raise HTTPException(status_code=403, detail="Not authorized to view this contract")

    # Gap #3: auto-expire on access (targeted)
    today = date.today()
    if db_contract.status == ContractStatus.ACTIVE and db_contract.end_date < today:
        db_contract.status = ContractStatus.EXPIRED

        other_current_active_exists = (
            db.query(Contract.id)
            .filter(
                Contract.property_id == db_contract.property_id,
                Contract.status == ContractStatus.ACTIVE,
                Contract.id != db_contract.id,
                Contract.end_date >= today,
            )
            .first()
            is not None
        )
        if not other_current_active_exists:
            db_contract.property.status = PropertyStatus.AVAILABLE

        db.commit()
        db.refresh(db_contract)

    return db_contract

@router.put("/{contract_id}", response_model=ContractOut)
def update_contract(contract_id: int, contract: ContractUpdate, request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)

    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if not is_admin(request, db) and db_contract.property.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if db_contract.status != ContractStatus.ACTIVE:
        raise HTTPException(status_code=409, detail="Only ACTIVE contracts can be updated")

    if contract.pdf_file is not None:
        raise HTTPException(status_code=409, detail="pdf_file cannot be updated via PUT")

    if getattr(contract, "property_id", None) is not None and contract.property_id != db_contract.property_id:
        raise HTTPException(status_code=409, detail="Changing property_id is not allowed")

    # Single tenant-change check (dedup)
    if getattr(contract, "tenant_id", None) is not None and contract.tenant_id != db_contract.tenant_id:
        tenant_obj = db.query(Tenant).filter(Tenant.id == contract.tenant_id).first()
        if not tenant_obj:
            raise HTTPException(status_code=404, detail="Tenant not found")
        if (not is_admin(request, db)) and tenant_obj.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Tenant does not belong to current owner")

    new_start = contract.start_date or db_contract.start_date
    new_end = contract.end_date or db_contract.end_date
    if new_end <= new_start:
        raise HTTPException(status_code=422, detail="end_date must be after start_date")

    updated = crud_contract.update_contract(db, contract_id, contract, updated_by_id=user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Contract not found")

    sync_property_status(db, updated.property_id)
    return updated

@router.delete("/{contract_id}")
def delete_contract(
    contract_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    user = get_current_user(request, db)
    if not is_admin(request, db) and db_contract.property.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if db_contract.status == ContractStatus.ACTIVE:
        raise HTTPException(status_code=409, detail="Cannot delete ACTIVE contract; terminate it instead")

    property_id = db_contract.property_id

    db.delete(db_contract)
    db.commit()

    sync_property_status(db, property_id)

    return {"ok": True}

@router.post("/{contract_id}/terminate", response_model=ContractOut)
def terminate_contract(contract_id: int, request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)

    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if db_contract.property.owner_id != user.id and not is_admin(request, db):
        raise HTTPException(status_code=403, detail="Not authorized to terminate this contract")

    if db_contract.status != ContractStatus.ACTIVE:
        raise HTTPException(status_code=409, detail="Contract is not active")

    db_contract.status = ContractStatus.TERMINATED
    db_contract.terminated_at = datetime.now(timezone.utc)
    db_contract.updated_by_id = user.id

    db.commit()
    db.refresh(db_contract)

    # A3: derive property.status from contracts (don’t hard-set AVAILABLE here)
    sync_property_status(db, db_contract.property_id)
    return db_contract

@router.post("/{contract_id}/upload")
async def upload_contract_pdf(
    request: Request,
    contract_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)
    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if db_contract.property.owner_id != user.id and not is_admin(request, db):
        raise HTTPException(status_code=403, detail="Not authorized to upload for this contract")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    content = await file.read()
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large")

    filename = f"{contract_id}_{uuid4().hex}.pdf"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(content)

    db_contract.pdf_file = f"/uploads/contracts/{filename}"
    db.commit()
    db.refresh(db_contract)
    return {"filename": filename, "url": db_contract.pdf_file}