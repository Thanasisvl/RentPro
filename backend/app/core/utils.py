from app.models.role import UserRole

def is_admin(request):
    user_payload = getattr(request.state, "user", None)
    if user_payload is None:
        return False
    return user_payload.get("role") == UserRole.ADMIN

def get_current_user_payload(request):
    user_payload = getattr(request.state, "user", None)
    if user_payload is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_payload