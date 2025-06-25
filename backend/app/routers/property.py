from fastapi import APIRouter, Depends, HTTPException
from app.core.jwt import get_current_user
from sqlalchemy.orm import Session
from app.schemas.property import PropertyCreate, PropertyOut, PropertyUpdate
from app.models.user import User
from app.crud import property as crud_property
from app.db.session import get_db
from typing import List

router = APIRouter()

@router.post("/", response_model=PropertyOut)
def create_property(
    property: PropertyCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
    ):
    user = db.query(User).filter(User.username == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return crud_property.create_property(db=db, property=property, owner_id=user.id)

    return crud_property.create_property(db=db, property=property, owner_id=user.id)

@router.get("/", response_model=List[PropertyOut])
def list_properties(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
    ):
    user = db.query(User).filter(User.username == current_user["sub"]).first()
    # Only return properties owned by the current user
    return db.query(crud_property.Property).filter(crud_property.Property.owner_id == user.id).offset(skip).limit(limit).all()

@router.get("/{property_id}", response_model=PropertyOut)
def get_property(
    property_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
    ):
    db_property = crud_property.get_property(db, property_id)
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    user = db.query(User).filter(User.username == current_user["sub"]).first()
    if db_property.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this property")
    return db_property

@router.put("/{property_id}", response_model=PropertyOut)
def update_property(
    property_id: int, 
    property: PropertyUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
    ):
    db_property = crud_property.get_property(db, property_id)
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    # Check ownership
    user = db.query(User).filter(User.username == current_user["sub"]).first()
    if db_property.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this property")
    db_property = crud_property.update_property(db, property_id, property)
    return db_property

@router.delete("/{property_id}", response_model=PropertyOut)
def delete_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
    ):
    db_property = crud_property.get_property(db, property_id)
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    # Check ownership
    user = db.query(User).filter(User.username == current_user["sub"]).first()
    if db_property.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this property")
    db_property = crud_property.delete_property(db, property_id)
    return db_property