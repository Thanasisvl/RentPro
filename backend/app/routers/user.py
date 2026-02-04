from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.utils import get_current_user, is_admin, require_admin
from app.crud import user as crud_user
from app.db.session import get_db
from app.schemas.user import UserCreate, UserOut, UserUpdate

router = APIRouter()


@router.post("/", response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    return crud_user.create_user(db=db, user=user)


@router.post("/register", response_model=UserOut)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Optionally, check if username/email already exists here
    existing_user = (
        db.query(crud_user.User)
        .filter(
            (crud_user.User.username == user.username)
            | (crud_user.User.email == user.email)
        )
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=400, detail="Username or email already registered"
        )

    # Το role (USER ή OWNER) έρχεται από το body.
    # Ο validator στο UserCreate μπλοκάρει ADMIN.
    return crud_user.create_user(db=db, user=user)


@router.get("/", response_model=List[UserOut])
def list_users(
    _: dict = Depends(require_admin),  # 403 αν δεν είναι admin
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return crud_user.get_users(db=db, skip=skip, limit=limit)


@router.get("/me", response_model=UserOut)
def get_me(request: Request, db: Session = Depends(get_db)):
    # request.state.user -> payload (από JWTAuthMiddleware)
    # get_current_user -> φορτώνει User από DB με βάση sub=username
    return get_current_user(request, db)


@router.put("/me", response_model=UserOut)
def update_me(request: Request, user: UserUpdate, db: Session = Depends(get_db)):
    current_user = get_current_user(request, db)

    # Reject forbidden updates explicitly (prototype constraint)
    forbidden = []
    if user.username is not None:
        forbidden.append("username")
    if user.role is not None:
        forbidden.append("role")

    if forbidden:
        detail = (
            f"{forbidden[0]} cannot be updated"
            if len(forbidden) == 1
            else f"{' and '.join(forbidden)} cannot be updated"
        )
        raise HTTPException(status_code=400, detail=detail)

    # Allow only email/full_name
    user_data = user.model_dump(exclude_unset=True)
    user_data.pop("role", None)
    user_data.pop("username", None)

    safe_update = UserUpdate(**user_data)
    updated = crud_user.update_user(db, current_user.id, safe_update)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


@router.get("/{user_id}", response_model=UserOut)
def get_user(request: Request, user_id: int, db: Session = Depends(get_db)):
    current_user = get_current_user(request, db)
    db_user = crud_user.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.username != current_user.username and not is_admin(request, db):
        raise HTTPException(status_code=403, detail="Not authorized to view this user")
    return db_user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    request: Request, user_id: int, user: UserUpdate, db: Session = Depends(get_db)
):
    current_user = get_current_user(request, db)
    db_user = crud_user.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.username != current_user.username and not is_admin(request, db):
        raise HTTPException(
            status_code=403, detail="Not authorized to update this user"
        )
    # Reject forbidden updates explicitly (prototype constraint)
    forbidden = []
    if user.username is not None:
        forbidden.append("username")
    if user.role is not None:
        forbidden.append("role")

    if forbidden:
        detail = (
            f"{forbidden[0]} cannot be updated"
            if len(forbidden) == 1
            else f"{' and '.join(forbidden)} cannot be updated"
        )
        raise HTTPException(status_code=400, detail=detail)

    # Allow only email/full_name
    user_data = user.model_dump(exclude_unset=True)
    user_data.pop("role", None)
    user_data.pop("username", None)

    safe_update = UserUpdate(**user_data)
    db_user = crud_user.update_user(db, user_id, safe_update)
    return db_user


@router.delete("/{user_id}", response_model=UserOut)
def delete_user(request: Request, user_id: int, db: Session = Depends(get_db)):
    current_user = get_current_user(request, db)
    db_user = crud_user.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.username != current_user.username and not is_admin(request, db):
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this user"
        )
    db_user = crud_user.delete_user(db, user_id)
    return db_user
