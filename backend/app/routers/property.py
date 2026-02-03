from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.utils import get_current_user, is_admin
from app.crud import property as crud_property
from app.db.session import get_db
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
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
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
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
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
    request: Request, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    user = get_current_user(request, db)

    # ADMIN: βλέπει όλα
    if user.role == UserRole.ADMIN:
        return crud_property.get_properties(db=db, skip=skip, limit=limit)

    # OWNER: βλέπει μόνο τα δικά του
    if user.role == UserRole.OWNER:
        return (
            db.query(Property)
            .filter(Property.owner_id == user.id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    # USER: δεν έχει λόγο να βλέπει “private list” (υπάρχει public /search)
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

    # Public card: allow AVAILABLE without authentication
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
    db_property = crud_property.delete_property(db, property_id)
    return db_property
