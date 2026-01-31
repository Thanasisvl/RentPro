import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status

# Secret key for encoding/decoding JWTs (use a strong, random value in production)
SECRET_KEY = os.getenv("RENTPRO_SECRET_KEY", "your-secret-key")
ALGORITHM = os.getenv("RENTPRO_JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES_DEFAULT = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS_DEFAULT = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

def _to_timestamp(dt: datetime) -> int:
    # Ensure exp is interpreted as UTC, not local time
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp())

def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token.
    - subject: user identifier (e.g. user.id or username)
    - token includes 'sub', 'type'='access', 'exp'
    """
    if expires_delta is None:
        minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(ACCESS_TOKEN_EXPIRE_MINUTES_DEFAULT)))
        expires_delta = timedelta(minutes=minutes)

    expire = datetime.utcnow() + expires_delta
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "type": "access",
        "exp": _to_timestamp(expire),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT refresh token (stateless).
    - Contains 'sub', 'type'='refresh', 'exp'.
    """
    if expires_delta is None:
        days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", str(REFRESH_TOKEN_EXPIRE_DAYS_DEFAULT)))
        expires_delta = timedelta(days=days)

    expire = datetime.utcnow() + expires_delta
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "type": "refresh",
        "exp": _to_timestamp(expire),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_refresh_token(token: str) -> Dict[str, Any]:
    """
    Verify a refresh token and return decoded payload.
    - Raises JWTError on invalid/expired token.
    - Caller must check payload.get("sub").
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise
    if payload.get("type") != "refresh":
        raise JWTError("Invalid token type")
    return payload

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
    
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload