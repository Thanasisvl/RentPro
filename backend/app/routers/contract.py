from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
import os
from uuid import uuid4
from sqlalchemy.orm import Session
from datetime import datetime, timezone, date

from app.schemas.contract import ContractCreate, ContractUpdate, ContractOut
from app.models.property import Property, PropertyStatus
from app.models.contract import Contract, ContractStatus
from app.models.tenant import Tenant
from app.models.role import UserRole
from app.crud import contract as crud_contract
from app.core.utils import is_admin, get_current_user
from app.db.session import get_db
from typing import List

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
def create_contract(
    request: Request,
    contract: ContractCreate,
    db: Session = Depends(get_db)
    ):
    user = get_current_user(request, db)

    property_obj = db.query(Property).filter(Property.id == contract.property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")

    if property_obj.owner_id != user.id and not is_admin(request, db):
        raise HTTPException(status_code=403, detail="Not authorized to create contract for this property")

    tenant_obj = db.query(Tenant).filter(Tenant.id == contract.tenant_id).first()
    if not tenant_obj:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Option A (owner-scoped tenants)
    if (not is_admin(request, db)) and tenant_obj.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Tenant does not belong to current owner")

    if property_obj.status == PropertyStatus.RENTED:
        raise HTTPException(status_code=409, detail="Property is already rented")

    db_contract = crud_contract.create_contract(db=db, contract=contract)

    property_obj.status = PropertyStatus.RENTED
    db.commit()
    db.refresh(property_obj)

    return db_contract

@router.get("/", response_model=List[ContractOut])
def get_contracts(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    user = get_current_user(request, db)

    # auto-expire πριν τη λίστα
    if user.role == UserRole.ADMIN:
        _auto_expire_contracts(db, owner_id=None)
    else:
        _auto_expire_contracts(db, owner_id=user.id)

    q = db.query(Contract).join(Property, Contract.property_id == Property.id)

    if user.role == UserRole.ADMIN:
        return q.offset(skip).limit(limit).all()

    return (
        q.filter(Property.owner_id == user.id)
         .offset(skip)
         .limit(limit)
         .all()
    )

@router.get("/{contract_id}", response_model=ContractOut)
def get_contract(
    request: Request,
    contract_id: int,
    db: Session = Depends(get_db)
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
def update_contract(
    request: Request,
    contract_id: int,
    contract: ContractUpdate,
    db: Session = Depends(get_db)
):
    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    user = get_current_user(request, db)
    if db_contract.property.owner_id != user.id and not is_admin(request, db):
        raise HTTPException(status_code=403, detail="Not authorized to update this contract")
    return crud_contract.update_contract(db, contract_id, contract)

@router.delete("/{contract_id}", response_model=ContractOut)
def delete_contract(
    request: Request,
    contract_id: int,
    db: Session = Depends(get_db)
    ):
    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    user = get_current_user(request, db)
    if db_contract.property.owner_id != user.id and not is_admin(request, db):
        raise HTTPException(status_code=403, detail="Not authorized to delete this contract")

    property_obj = db_contract.property  # relationship
    deleted = crud_contract.delete_contract(db, contract_id)

    # UC-05: revert property status on contract deletion
    if property_obj is not None:
        property_obj.status = PropertyStatus.AVAILABLE
        db.commit()
        db.refresh(property_obj)

    return deleted

@router.post("/{contract_id}/terminate", response_model=ContractOut)
def terminate_contract(
    request: Request,
    contract_id: int,
    db: Session = Depends(get_db),
):
    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    user = get_current_user(request, db)
    if db_contract.property.owner_id != user.id and not is_admin(request, db):
        raise HTTPException(status_code=403, detail="Not authorized to terminate this contract")

    if db_contract.status != ContractStatus.ACTIVE:
        raise HTTPException(status_code=409, detail="Contract is not active")

    # mark contract terminated
    db_contract.status = ContractStatus.TERMINATED
    db_contract.terminated_at = datetime.now(timezone.utc)

    # business rule: termination frees the property
    db_contract.property.status = PropertyStatus.AVAILABLE

    db.commit()
    db.refresh(db_contract)
    return db_contract

@router.post("/{contract_id}/upload")
async def upload_contract_pdf(
    request: Request,
    contract_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
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