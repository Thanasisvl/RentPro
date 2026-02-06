import os

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.jwt import create_access_token, create_refresh_token, verify_refresh_token
from app.core.rate_limit import rate_limit_auth
from app.core.security import verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import Token, UserLogin

router = APIRouter()


def _cookie_secure(request: Request) -> bool:
    # Manual override (useful behind HTTPS / reverse proxies)
    override = os.getenv("RENTPRO_COOKIE_SECURE")
    if override is not None and override.strip() != "":
        return override.strip() == "1"

    # Behind reverse proxy: prefer X-Forwarded-Proto
    xfp = (request.headers.get("x-forwarded-proto") or "").lower().strip()
    if xfp:
        return xfp == "https"

    return request.url.scheme == "https"


def _cookie_samesite() -> str:
    v = (os.getenv("RENTPRO_COOKIE_SAMESITE", "lax") or "lax").lower().strip()
    return v if v in {"lax", "strict", "none"} else "lax"


def authenticate_user(db: Session, username: str, password: str):
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


@router.post("/login", response_model=Token)
def login(
    request: Request,
    user_in: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
):
    rate_limit_auth(request)
    user = authenticate_user(db, user_in.username, user_in.password)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    # create tokens - access token με ρόλο & username
    access_token = create_access_token(
        subject=str(user.username),
        extra_claims={
            "role": user.role.value,
            "username": user.username,
        },
    )
    refresh_token = create_refresh_token(str(user.username))
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        secure=_cookie_secure(request),
        samesite=_cookie_samesite(),
        path="/",
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/auth/refresh", summary="Refresh access token")
def refresh_access_token(
    request: Request, response: Response, db: Session = Depends(get_db)
):
    rate_limit_auth(request)
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token"
        )
    try:
        payload = verify_refresh_token(token)
    except Exception:
        response.delete_cookie("refresh_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    user = db.query(User).filter(User.username == subject).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    # νέο access token με ρόλο & username
    access_token = create_access_token(
        subject=str(user.username),
        extra_claims={
            "role": user.role.value,
            "username": user.username,
        },
    )
    response.set_cookie(
        "refresh_token",
        token,
        httponly=True,
        secure=_cookie_secure(request),
        samesite=_cookie_samesite(),
        path="/",
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(response: Response):
    """
    Logout endpoint: σβήνει το refresh token cookie.
    Το access token “λήγει μόνο του” (JWT), απλά το frontend το πετάει.
    """
    response.delete_cookie("refresh_token", path="/")
    return {"detail": "Logged out"}
