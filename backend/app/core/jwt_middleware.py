from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.jwt import decode_access_token

PUBLIC_PATHS = [
    "/login",
    "/users/register",
    "/openapi.json",
    "/docs",
    "/docs/",
    "/redoc",
    "/redoc/",
    "/",
]

class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if any(path.startswith(pub) for pub in PUBLIC_PATHS):
            return await call_next(request)
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Not authenticated"},
            )
        token = auth_header.split(" ")[1]
        payload = decode_access_token(token)
        if not payload:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid token"},
            )
        request.state.user = payload
        return await call_next(request)