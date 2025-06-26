from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.schemas.property import PropertyCreate, PropertyOut, PropertyUpdate
from app.models.user import User
from app.crud import property as crud_property
from app.core.utils import is_admin, get_current_user_payload
from app.db.session import get_db
from typing import List

router = APIRouter()

@router.post("/", response_model=PropertyOut)
def create_property(
    request: Request,
    property: PropertyCreate, 
    db: Session = Depends(get_db)
    ):
    user_payload = get_current_user_payload(request)
    user = db.query(User).filter(User.username == user_payload["sub"]).first()
    if not user or user.role != "OWNER":
        raise HTTPException(status_code=401, detail="User not found")
    return crud_property.create_property(db=db, property=property, owner_id=user.id)

@router.get("/", response_model=List[PropertyOut])
def list_properties(
    request: Request,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
    ):
    user_payload = get_current_user_payload(request)
    user = db.query(User).filter(User.username == user_payload["sub"]).first()
    # Only return properties owned by the current user
    return db.query(crud_property.Property).filter(crud_property.Property.owner_id == user.id).offset(skip).limit(limit).all()

@router.get("/{property_id}", response_model=PropertyOut)
def get_property(
    request: Request,
    property_id: int, 
    db: Session = Depends(get_db)
    ):
    user_payload = get_current_user_payload(request)
    db_property = crud_property.get_property(db, property_id)
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    user = db.query(User).filter(User.username == user_payload["sub"]).first()
    if db_property.owner_id != user.id and not is_admin(request):
        raise HTTPException(status_code=403, detail="Not authorized to view this property")
    return db_property

@router.put("/{property_id}", response_model=PropertyOut)
def update_property(
    request: Request,
    property_id: int, 
    property: PropertyUpdate, 
    db: Session = Depends(get_db)
    ):
    db_property = crud_property.get_property(db, property_id)
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    # Check ownership
    user_payload = get_current_user_payload(request)
    user = db.query(User).filter(User.username == user_payload["sub"]).first()
    if db_property.owner_id != user.id and not is_admin(request):
        raise HTTPException(status_code=403, detail="Not authorized to update this property")
    db_property = crud_property.update_property(db, property_id, property)
    return db_property

@router.delete("/{property_id}", response_model=PropertyOut)
def delete_property(
    request: Request,
    property_id: int,
    db: Session = Depends(get_db)
    ):
    db_property = crud_property.get_property(db, property_id)
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    # Check ownership
    user_payload = get_current_user_payload(request)
    user = db.query(User).filter(User.username == user_payload["sub"]).first()
    if db_property.owner_id != user.id and not is_admin(request):
        raise HTTPException(status_code=403, detail="Not authorized to delete this property")
    db_property = crud_property.delete_property(db, property_id)
    return db_property