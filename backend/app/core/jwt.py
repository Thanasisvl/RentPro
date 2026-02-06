import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

def _strict_config_enabled() -> bool:
    return os.getenv("RENTPRO_STRICT_CONFIG", "").strip() == "1"


def _get_env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default

    raw = raw.strip()
    if raw == "":
        return default

    try:
        value = int(raw)
    except ValueError as e:
        raise RuntimeError(f"{name} must be an integer (got {raw!r})") from e

    if value <= 0:
        raise RuntimeError(f"{name} must be > 0 (got {value})")

    return value


def _get_env_str(name: str, default: str) -> str:
    raw = os.getenv(name)
    if raw is None:
        return default

    raw = raw.strip()
    if raw == "":
        raise RuntimeError(f"{name} must not be empty")

    return raw


# Secret key for encoding/decoding JWTs (use a strong, random value in production)
SECRET_KEY = _get_env_str("RENTPRO_SECRET_KEY", "your-secret-key")
if _strict_config_enabled() and SECRET_KEY == "your-secret-key":
    raise RuntimeError(
        "RENTPRO_SECRET_KEY must be set when RENTPRO_STRICT_CONFIG=1 "
        "(do not rely on the default development key)"
    )

ALGORITHM = _get_env_str("RENTPRO_JWT_ALGORITHM", "HS256")
if _strict_config_enabled() and ALGORITHM not in {"HS256", "HS384", "HS512"}:
    raise RuntimeError(
        "RENTPRO_JWT_ALGORITHM must be one of HS256/HS384/HS512 when "
        f"RENTPRO_STRICT_CONFIG=1 (got {ALGORITHM!r})"
    )

ACCESS_TOKEN_EXPIRE_MINUTES_DEFAULT = _get_env_int("ACCESS_TOKEN_EXPIRE_MINUTES", 60)
REFRESH_TOKEN_EXPIRE_DAYS_DEFAULT = _get_env_int("REFRESH_TOKEN_EXPIRE_DAYS", 7)


def _to_timestamp(dt: datetime) -> int:
    # Ensure exp is interpreted as UTC, not local time
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp())


def create_access_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Create JWT access token.
    - subject: user identifier (e.g. user.id or username)
    - token includes 'sub', 'type'='access', 'exp', plus any extra_claims
    """
    if expires_delta is None:
        minutes = _get_env_int(
            "ACCESS_TOKEN_EXPIRE_MINUTES", ACCESS_TOKEN_EXPIRE_MINUTES_DEFAULT
        )
        expires_delta = timedelta(minutes=minutes)

    expire = datetime.utcnow() + expires_delta
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "type": "access",
        "exp": _to_timestamp(expire),
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(
    subject: str, expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create JWT refresh token (stateless).
    - Contains 'sub', 'type'='refresh', 'exp'.
    """
    if expires_delta is None:
        days = _get_env_int("REFRESH_TOKEN_EXPIRE_DAYS", REFRESH_TOKEN_EXPIRE_DAYS_DEFAULT)
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
    except JWTError:
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
