import re

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.jwt import decode_access_token

PUBLIC_EXACT_PATHS = {
    "/health",
    "/metrics",
    "/login",
    "/login/",
    "/users/register",
    "/users/register/",
    "/openapi.json",
    "/auth/refresh",
    "/auth/refresh/",
    "/properties/search",
    "/properties/search/",
    # Public list of areas for dropdowns (must NOT make /areas/admin public)
    "/areas",
    "/areas/",
}

PUBLIC_PREFIX_PATHS = [
    # Swagger/ReDoc UIs
    "/docs",
    "/docs/",
    "/redoc",
    "/redoc/",
]

_PROPERTY_DETAIL_RE = re.compile(r"^/properties/\d+$")


class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Let CORS preflight requests pass through without auth.
        if request.method == "OPTIONS":
            return await call_next(request)

        # Always-public paths
        if path in PUBLIC_EXACT_PATHS or any(
            path.startswith(pub) for pub in PUBLIC_PREFIX_PATHS
        ):
            return await call_next(request)

        # UC-03: Public GET property details ONLY (prevents POST/PUT/DELETE becoming public)
        if request.method == "GET" and _PROPERTY_DETAIL_RE.match(path):
            # If a token is provided, decode it so the handler can authorize non-AVAILABLE details
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                payload = decode_access_token(token)
                if not payload:
                    return JSONResponse(
                        status_code=401, content={"detail": "Invalid token"}
                    )
                request.state.user = payload

            return await call_next(request)

        # All other routes require authentication
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401, content={"detail": "Not authenticated"}
            )

        token = auth_header.split(" ")[1]
        payload = decode_access_token(token)
        if not payload:
            return JSONResponse(status_code=401, content={"detail": "Invalid token"})

        request.state.user = payload
        return await call_next(request)
