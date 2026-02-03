from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import RedirectResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.status_sync import sync_property_status
from app.core.uploads import contract_pdf_destination, save_pdf_upload
from app.core.utils import get_current_user, is_admin
from app.crud import contract as crud_contract
from app.db.session import get_db
from app.models.contract import Contract, ContractStatus
from app.models.property import Property, PropertyStatus
from app.models.tenant import Tenant
from app.schemas.contract import ContractCreate, ContractOut, ContractUpdate

router = APIRouter()


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
        c.status = ContractStatus.EXPIRED
        expired_count += 1

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


def _pdf_url(pdf_file: str | None) -> str | None:
    """
    pdf_file is stored as a relative path (e.g. "contracts/<file>.pdf") from upload_contract_pdf.
    Public URL is served by StaticFiles: /uploads/<relative-path>
    """
    if not pdf_file:
        return None

    rel = pdf_file.lstrip("/").replace("\\", "/")

    # Backward compatibility: if older rows store only filename
    if "/" not in rel:
        rel = f"contracts/{rel}"

    return f"/uploads/{rel}"


def _to_out(c: Contract) -> ContractOut:
    dto = ContractOut.model_validate(c)
    dto.pdf_url = _pdf_url(getattr(c, "pdf_file", None))
    return dto


@router.post("/", response_model=ContractOut)
def create_contract(
    request: Request, contract: ContractCreate, db: Session = Depends(get_db)
):
    user = get_current_user(request, db)

    property_obj = (
        db.query(Property).filter(Property.id == contract.property_id).first()
    )
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")

    if property_obj.owner_id != user.id and not is_admin(request, db):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to create contract for this property",
        )

    tenant_obj = db.query(Tenant).filter(Tenant.id == contract.tenant_id).first()
    if not tenant_obj:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if (not is_admin(request, db)) and tenant_obj.owner_id != user.id:
        raise HTTPException(
            status_code=403, detail="Tenant does not belong to current owner"
        )

    sync_property_status(db, property_obj.id)

    today = date.today()
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
        raise HTTPException(
            status_code=409, detail="Property already has an active running contract"
        )

    try:
        db_contract = crud_contract.create_contract(db, contract, created_by_id=user.id)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Property already has an ACTIVE contract"
        )

    sync_property_status(db, db_contract.property_id)
    db.refresh(db_contract)
    return _to_out(db_contract)


@router.get("/", response_model=list[ContractOut])
def list_contracts(
    request: Request,
    db: Session = Depends(get_db),
    owner_id: int | None = Query(
        default=None, description="Admin-only filter by property owner id"
    ),
    property_id: int | None = Query(default=None),
    tenant_id: int | None = Query(default=None),
    status: ContractStatus | None = Query(default=None),
    running_today: bool = Query(
        default=False, description="If true: start<=today<=end and status=ACTIVE"
    ),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
):
    user = get_current_user(request, db)
    admin = is_admin(request, db)

    if owner_id is not None and not admin:
        raise HTTPException(status_code=403, detail="owner_id filter is admin-only")

    effective_owner_id = (
        owner_id if admin and owner_id is not None else (None if admin else user.id)
    )

    # Keep the list fresh (UC-05 A3): expire overdue contracts before listing
    _auto_expire_contracts(db, owner_id=effective_owner_id)

    items = crud_contract.get_contracts(
        db,
        skip=skip,
        limit=limit,
        owner_id=effective_owner_id,
        property_id=property_id,
        tenant_id=tenant_id,
        status=status,
        running_today=running_today,
    )
    return [_to_out(c) for c in items]


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
        raise HTTPException(
            status_code=403, detail="Not authorized to view this contract"
        )

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

    return _to_out(db_contract)


@router.put("/{contract_id}", response_model=ContractOut)
def update_contract(
    contract_id: int,
    contract: ContractUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)

    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if not is_admin(request, db) and db_contract.property.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if db_contract.status != ContractStatus.ACTIVE:
        raise HTTPException(
            status_code=409, detail="Only ACTIVE contracts can be updated"
        )

    if contract.pdf_file is not None:
        raise HTTPException(
            status_code=409, detail="pdf_file cannot be updated via PUT"
        )

    if (
        getattr(contract, "property_id", None) is not None
        and contract.property_id != db_contract.property_id
    ):
        raise HTTPException(
            status_code=409, detail="Changing property_id is not allowed"
        )

    if (
        getattr(contract, "tenant_id", None) is not None
        and contract.tenant_id != db_contract.tenant_id
    ):
        tenant_obj = db.query(Tenant).filter(Tenant.id == contract.tenant_id).first()
        if not tenant_obj:
            raise HTTPException(status_code=404, detail="Tenant not found")
        if (not is_admin(request, db)) and tenant_obj.owner_id != user.id:
            raise HTTPException(
                status_code=403, detail="Tenant does not belong to current owner"
            )

    new_start = contract.start_date or db_contract.start_date
    new_end = contract.end_date or db_contract.end_date
    if new_end <= new_start:
        raise HTTPException(status_code=422, detail="end_date must be after start_date")

    updated = crud_contract.update_contract(
        db, contract_id, contract, updated_by_id=user.id
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Contract not found")

    sync_property_status(db, updated.property_id)
    db.refresh(updated)
    return _to_out(updated)


@router.post("/{contract_id}/terminate", response_model=ContractOut)
def terminate_contract(
    contract_id: int, request: Request, db: Session = Depends(get_db)
):
    user = get_current_user(request, db)

    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if db_contract.property.owner_id != user.id and not is_admin(request, db):
        raise HTTPException(
            status_code=403, detail="Not authorized to terminate this contract"
        )

    if db_contract.status != ContractStatus.ACTIVE:
        raise HTTPException(status_code=409, detail="Contract is not active")

    db_contract.status = ContractStatus.TERMINATED
    db_contract.terminated_at = datetime.now(timezone.utc)
    db_contract.updated_by_id = user.id

    db.commit()
    db.refresh(db_contract)

    sync_property_status(db, db_contract.property_id)
    return _to_out(db_contract)


@router.post("/{contract_id}/upload", response_model=ContractOut)
async def upload_contract_pdf(
    contract_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)

    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if (not is_admin(request, db)) and db_contract.property.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if db_contract.pdf_file and not is_admin(request, db):
        raise HTTPException(status_code=409, detail="PDF already uploaded")

    dest_abs, rel = contract_pdf_destination(contract_id)
    await save_pdf_upload(file, dest_abs_path=dest_abs)

    db_contract.pdf_file = rel  # e.g. "contracts/<file>.pdf"
    db_contract.updated_by_id = user.id
    db.commit()
    db.refresh(db_contract)
    return _to_out(db_contract)


@router.get("/{contract_id}/pdf")
def get_contract_pdf_redirect(
    request: Request,
    contract_id: int,
    db: Session = Depends(get_db),
):
    """
    Auth-guarded PDF access:
    - checks ownership/admin like GET /contracts/{id}
    - redirects to the static /uploads/... URL
    """
    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    user = get_current_user(request, db)
    if db_contract.property.owner_id != user.id and not is_admin(request, db):
        raise HTTPException(status_code=403, detail="Not authorized")

    url = _pdf_url(getattr(db_contract, "pdf_file", None))
    if not url:
        raise HTTPException(status_code=404, detail="No PDF uploaded for this contract")

    return RedirectResponse(url=url, status_code=307)


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
    if (not is_admin(request, db)) and db_contract.property.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Policy: cannot delete ACTIVE; terminate it first
    if db_contract.status == ContractStatus.ACTIVE:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete ACTIVE contract; terminate it first",
        )

    property_id = db_contract.property_id
    db.delete(db_contract)
    db.commit()

    # Keep property status consistent (A3)
    sync_property_status(db, property_id)
    return {"ok": True}
