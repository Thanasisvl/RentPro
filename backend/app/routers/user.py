from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, UserOut, UserUpdate, OwnerRegister, OwnerRegisterResponse
from app.models.role import UserRole
from app.crud import user as crud_user
from app.crud import property as crud_property
from app.core.utils import is_admin, get_current_user_payload
from app.db.session import get_db
from typing import List

router = APIRouter()

@router.post("/", response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    return crud_user.create_user(db=db, user=user)

@router.post("/register", response_model=UserOut)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Optionally, check if username/email already exists here
    existing_user = db.query(crud_user.User).filter(
        (crud_user.User.username == user.username) | (crud_user.User.email == user.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    user_data = user.model_dump()
    user_data['role'] = UserRole.USER
    return crud_user.create_user(db=db, user=UserCreate(**user_data))

@router.post("/register-owner", response_model=OwnerRegisterResponse)
def register_owner(data: OwnerRegister, db: Session = Depends(get_db)):
    # Check if username/email already exists
    existing_user = db.query(crud_user.User).filter(
        (crud_user.User.username == data.username) | (crud_user.User.email == data.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    # Create user with OWNER role
    user = crud_user.create_user(db, UserCreate(
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        password=data.password,
        role=UserRole.OWNER
    ))
    # Create property for this user
    property_obj = crud_property.create_property(db, data.property, owner_id=user.id)
    return OwnerRegisterResponse(user=user, property=property_obj)

@router.get("/", response_model=List[UserOut])
def list_users(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
    ):
    if not is_admin(request):
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud_user.get_users(db=db, skip=skip, limit=limit)

@router.get("/{user_id}", response_model=UserOut)
def get_user(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db)
    ):
    user_payload = get_current_user_payload(request)
    db_user = crud_user.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.username != user_payload["sub"] and not is_admin(request):
        raise HTTPException(status_code=403, detail="Not authorized to view this user")
    return db_user

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    request: Request,
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db)
    ):
    user_payload = get_current_user_payload(request)
    db_user = crud_user.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.username != user_payload["sub"] and not is_admin(request):
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    db_user = crud_user.update_user(db, user_id, user)
    return db_user

@router.delete("/{user_id}", response_model=UserOut)
def delete_user(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db)
    ):
    user_payload = get_current_user_payload(request)
    db_user = crud_user.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.username != user_payload["sub"] and not is_admin(request):
        raise HTTPException(status_code=403, detail="Not authorized to delete this user")
    db_user = crud_user.delete_user(db, user_id)
    return db_user