"""Independent emergency service for Genova.

This service is intentionally separate from the Vite/Convex application. It
provides a local SQLite auth store and compatibility endpoints for imported
identity/session records without importing the main application at runtime.
"""
from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from .auth_service import (
    AuthError,
    AuthenticatedUser,
    InvalidCredentials,
    InvalidToken,
    get_auth_service,
)
from .config import settings
from .db import database_is_ready

app = FastAPI(
    title="Genova Emergency Service",
    version="0.3.0",
    description="Independent fallback service for Genova.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    service: str
    status: str
    version: str
    database: str


class LoginRequest(BaseModel):
    identifier: str
    password: str


class RefreshRequest(BaseModel):
    refreshToken: str


class UserResponse(BaseModel):
    id: str
    username: str | None
    email: str | None
    role: str
    status: str


class SessionResponse(BaseModel):
    user: UserResponse
    sessionId: str
    accessToken: str
    refreshToken: str
    tokenType: str
    expiresIn: int


@app.get("/", tags=["system"])
async def root() -> dict[str, str]:
    return {
        "service": "genova-emergency",
        "status": "running",
        "message": "Emergency service is running independently.",
    }


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    database_status = "ready" if database_is_ready() else "unavailable"
    overall_status = "ok" if database_status == "ready" else "degraded"
    return HealthResponse(
        service="genova-emergency",
        status=overall_status,
        version="0.3.0",
        database=database_status,
    )


bearer_scheme = HTTPBearer(auto_error=False)


def _to_user_response(user: AuthenticatedUser) -> UserResponse:
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        status=user.status,
    )


@app.post("/api/auth/login", response_model=SessionResponse, tags=["auth"])
async def login(request: LoginRequest) -> SessionResponse:
    service = get_auth_service()
    try:
        user = service.authenticate(request.identifier, request.password)
        session = service.create_local_session(user)
    except InvalidCredentials as error:
        raise HTTPException(status_code=401, detail="invalid_credentials") from error
    except AuthError as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    return SessionResponse(user=_to_user_response(user), **session)


@app.get("/api/auth/me", response_model=UserResponse, tags=["auth"])
async def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> UserResponse:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="missing_token")
    try:
        user = get_auth_service().authenticate_bearer(credentials.credentials)
    except InvalidToken as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    return _to_user_response(user)


@app.post("/api/auth/refresh", response_model=SessionResponse, tags=["auth"])
async def refresh_session(request: RefreshRequest) -> SessionResponse:
    try:
        session = get_auth_service().refresh_session(request.refreshToken)
    except InvalidToken as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    user = get_auth_service().authenticate_bearer(session["accessToken"])
    return SessionResponse(user=_to_user_response(user), **session)


@app.post("/api/auth/logout", status_code=204, tags=["auth"])
async def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Response:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="missing_token")
    # Logout is intentionally idempotent: an already revoked token is still a
    # successful logout, while an unknown token does not reveal token state.
    get_auth_service().revoke_access_token(credentials.credentials)
    return Response(status_code=204)
