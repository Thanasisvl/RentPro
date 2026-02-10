from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.utils import is_admin
from app.db.session import get_db
from app.models.area import Area
from app.schemas.area import AreaAdminOut, AreaCreate, AreaOut, AreaUpdate

router = APIRouter()


@router.get("/", response_model=list[AreaOut])
def list_areas(db: Session = Depends(get_db)):
    # Public read-only list for UI dropdowns
    return (
        db.query(Area)
        .filter(Area.is_active)  # noqa: E712
        .order_by(Area.name.asc())
        .all()
    )


@router.get("/admin", response_model=list[AreaAdminOut])
def list_areas_admin(request: Request, db: Session = Depends(get_db)):
    if not is_admin(request, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )
    return db.query(Area).order_by(Area.name.asc()).all()


@router.post("/", response_model=AreaAdminOut, status_code=status.HTTP_201_CREATED)
def create_area(
    request: Request,
    payload: AreaCreate,
    db: Session = Depends(get_db),
):
    if not is_admin(request, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )

    area = Area(
        code=payload.code,
        name=payload.name,
        area_score=float(payload.area_score),
        is_active=bool(payload.is_active),
    )
    db.add(area)
    db.commit()
    db.refresh(area)
    return area


@router.put("/{area_id}", response_model=AreaAdminOut)
def update_area(
    request: Request,
    area_id: int,
    payload: AreaUpdate,
    db: Session = Depends(get_db),
):
    if not is_admin(request, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )

    area = db.query(Area).filter(Area.id == area_id).first()
    if area is None:
        raise HTTPException(status_code=404, detail="Area not found")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        area.name = str(data["name"]).strip()
    if "area_score" in data and data["area_score"] is not None:
        area.area_score = float(data["area_score"])
    if "is_active" in data and data["is_active"] is not None:
        area.is_active = bool(data["is_active"])

    db.commit()
    db.refresh(area)
    return area


@router.delete("/{area_id}", response_model=AreaAdminOut)
def delete_area(request: Request, area_id: int, db: Session = Depends(get_db)):
    """
    Admin "delete" for thesis/demo purposes:
    - soft-deactivates the area (sets is_active=False)
    - keeps referential integrity stable for existing properties
    """
    if not is_admin(request, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )

    area = db.query(Area).filter(Area.id == area_id).first()
    if area is None:
        raise HTTPException(status_code=404, detail="Area not found")

    area.is_active = False
    db.commit()
    db.refresh(area)
    return area
