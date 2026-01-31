from fastapi import Depends, HTTPException, Request, status
from app.models.role import UserRole

def is_admin(request: Request) -> bool:
    user_payload = getattr(request.state, "user", None)
    if user_payload is None:
        return False

    from app.db.session import SessionLocal
    from app.models.user import User

    db = SessionLocal()
    try:
        username = user_payload.get("sub")
        if not username:
            return False
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return False
        return user.role == UserRole.ADMIN
    finally:
        db.close()

def get_current_user_payload(request: Request):
    user_payload = getattr(request.state, "user", None)
    if user_payload is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_payload

def require_admin(
    request: Request,
    user_payload=Depends(get_current_user_payload),
):
    if not is_admin(request):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return user_payload