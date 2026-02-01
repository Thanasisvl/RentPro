from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.role import UserRole


def get_current_user_payload(request: Request) -> dict:
    """
    Returns the auth payload stored in request.state.user.
    Raises 401 if missing/invalid.
    """
    user_payload = getattr(request.state, "user", None)
    if user_payload is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Guard: ensure payload contains the subject
    if not user_payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid authentication payload")

    return user_payload


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Loads and returns the authenticated User from DB.
    Raises 401 if user does not exist (e.g., deleted) even if token payload exists.
    """
    user_payload = get_current_user_payload(request)
    username = user_payload.get("sub")

    from app.models.user import User

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def is_admin(request: Request, db: Session) -> bool:
    """
    Returns True if the authenticated user is ADMIN, otherwise False.
    Does NOT open a new session; uses the provided db session.
    """
    user_payload = getattr(request.state, "user", None)
    if user_payload is None:
        return False

    username = user_payload.get("sub")
    if not username:
        return False

    from app.models.user import User

    user = db.query(User).filter(User.username == username).first()
    if not user:
        return False

    return user.role == UserRole.ADMIN


def require_admin(
    request: Request,
    db: Session = Depends(get_db),
    ):
    user = get_current_user(request, db)
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return user