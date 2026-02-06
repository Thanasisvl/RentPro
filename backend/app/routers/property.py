from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.status_sync import sync_overdue_contracts_global, sync_property_status
from app.core.utils import get_current_user, is_admin
from app.crud import property as crud_property
from app.db.session import get_db
from app.models.contract import Contract, ContractStatus
from app.models.property import Property, PropertyStatus
from app.models.role import UserRole
from app.schemas.property import (
    PropertyCreate,
    PropertyOut,
    PropertySearchFilters,
    PropertySearchMeta,
    PropertySearchResponse,
    PropertyUpdate,
)

router = APIRouter()


@router.post("/", response_model=PropertyOut)
def create_property(
    request: Request, property: PropertyCreate, db: Session = Depends(get_db)
):
    user = get_current_user(request, db)

    # OWNER: creates only for self
    if user.role == UserRole.OWNER:
        if property.owner_id is not None and property.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Owners cannot create properties for other users",
            )
        target_owner_id = user.id

    # ADMIN: must provide owner_id and it must belong to an OWNER user
    elif user.role == UserRole.ADMIN:
        if property.owner_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="owner_id is required for admins",
            )

        from app.models.user import User

        owner = db.query(User).filter(User.id == property.owner_id).first()
        if owner is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Owner not found",
            )
        if owner.role != UserRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="owner_id must refer to a user with role OWNER",
            )

        target_owner_id = owner.id

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners or admins can create properties",
        )

    return crud_property.create_property(
        db=db, property=property, owner_id=target_owner_id
    )


@router.get("/", response_model=List[PropertyOut])
def list_properties(
    request: Request,
    db: Session = Depends(get_db),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    owner_id: int
    | None = Query(default=None, description="Admin-only filter by property owner id"),
):
    user = get_current_user(request, db)

    if user.role == UserRole.ADMIN:
        q = db.query(Property)
        if owner_id is not None:
            q = q.filter(Property.owner_id == owner_id)
        items = q.order_by(Property.id.desc()).offset(skip).limit(limit).all()
        for p in items:
            sync_property_status(db, p.id)
        return items

    if user.role == UserRole.OWNER:
        if owner_id is not None:
            raise HTTPException(status_code=403, detail="owner_id filter is admin-only")
        items = (
            db.query(Property)
            .filter(Property.owner_id == user.id)
            .offset(skip)
            .limit(limit)
            .all()
        )
        for p in items:
            sync_property_status(db, p.id)
        return items

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only owners or admins can list properties",
    )


@router.get("/search", response_model=PropertySearchResponse)
def search_properties(
    filters: PropertySearchFilters = Depends(),
    db: Session = Depends(get_db),
):
    # Public endpoint (UC-03): no auth required
    # Ensure overdue ACTIVE contracts are expired so property availability is not stale.
    sync_overdue_contracts_global(db)

    items, total = crud_property.search_properties(db=db, filters=filters)
    return {
        "meta": PropertySearchMeta(
            total=total,
            count=len(items),
            offset=filters.offset,
            limit=filters.limit,
        ),
        "items": items,
    }


@router.get("/{property_id}", response_model=PropertyOut)
def get_property(
    request: Request,
    property_id: int,
    db: Session = Depends(get_db),
):
    db_property = crud_property.get_property(db, property_id)
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")

    # A3: sync on access so expired contracts flip property to AVAILABLE immediately.
    sync_property_status(db, property_id)
    db.refresh(db_property)

    if db_property.status == PropertyStatus.AVAILABLE:
        return db_property

    # Not AVAILABLE -> require auth; anonymous should not learn it exists
    user_payload = getattr(request.state, "user", None)
    if not user_payload or not user_payload.get("sub"):
        raise HTTPException(status_code=404, detail="Property not found")

    from app.models.user import User  # <-- ensure User is defined

    user = db.query(User).filter(User.username == user_payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if user.role == UserRole.ADMIN:
        return db_property

    if user.role == UserRole.OWNER and db_property.owner_id == user.id:
        return db_property

    raise HTTPException(status_code=403, detail="Not authorized to view this property")


@router.put("/{property_id}", response_model=PropertyOut)
def update_property(
    request: Request,
    property_id: int,
    property: PropertyUpdate,
    db: Session = Depends(get_db),
):
    db_property = crud_property.get_property(db, property_id)
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    # Check ownership
    user = get_current_user(request, db)
    if db_property.owner_id != user.id and not is_admin(request, db):
        raise HTTPException(
            status_code=403, detail="Not authorized to update this property"
        )
    db_property = crud_property.update_property(db, property_id, property)
    return db_property


@router.delete("/{property_id}", response_model=PropertyOut)
def delete_property(request: Request, property_id: int, db: Session = Depends(get_db)):
    db_property = crud_property.get_property(db, property_id)
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    # Check ownership
    user = get_current_user(request, db)
    if db_property.owner_id != user.id and not is_admin(request, db):
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this property"
        )

    # UC-06 A2: prevent deletion when there is an active association (ACTIVE contract).
    # Sync status first so overdue ACTIVE contracts become EXPIRED.
    sync_property_status(db, property_id, today=date.today())
    active_contract_exists = (
        db.query(Contract.id)
        .filter(
            Contract.property_id == property_id,
            Contract.status == ContractStatus.ACTIVE,
        )
        .first()
        is not None
    )
    if active_contract_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete property with an ACTIVE contract",
        )

    db_property = crud_property.delete_property(db, property_id)
    return db_property
