"""Independent emergency service for Genova.

This service is intentionally separate from the Vite/Convex application. It
provides a local SQLite auth store and compatibility endpoints for imported
identity/session records without importing the main application at runtime.
"""
from fastapi import Depends, FastAPI, HTTPException, Query, Response
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
from .directory_service import DirectoryNotFound, DirectoryPermissionDenied, UserDirectoryService

app = FastAPI(
    title="Genova Emergency Service",
    version="0.4.0",
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


class ProfileRequest(BaseModel):
    displayName: str | None = None
    firstName: str | None = None
    lastName: str | None = None
    phone: str | None = None
    bio: str | None = None
    avatarUrl: str | None = None
    resumeUrl: str | None = None
    university: str | None = None
    fieldOfStudy: str | None = None
    graduationYear: int | None = None
    skills: list[str] | None = None
    metadata: dict[str, object] | None = None
    telegramId: str | None = None
    baleId: str | None = None


class RoleAssignmentRequest(BaseModel):
    roleId: str
    assignmentId: str | None = None


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
        version="0.4.0",
        database=database_status,
    )


bearer_scheme = HTTPBearer(auto_error=False)
directory_service = UserDirectoryService()


def _to_user_response(user: AuthenticatedUser) -> UserResponse:
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        status=user.status,
    )


def _authenticated_user(
    credentials: HTTPAuthorizationCredentials | None,
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="missing_token")
    try:
        return get_auth_service().authenticate_bearer(credentials.credentials)
    except InvalidToken as error:
        raise HTTPException(status_code=401, detail=str(error)) from error


def _model_dump(model: BaseModel, *, exclude_none: bool = False) -> dict[str, object]:
    if hasattr(model, "model_dump"):
        return model.model_dump(exclude_none=exclude_none)
    return model.dict(exclude_none=exclude_none)


def _profile_values(request: ProfileRequest) -> dict[str, object]:
    values = _model_dump(request, exclude_none=True)
    mapped = {
        "display_name": values.get("displayName"),
        "first_name": values.get("firstName"),
        "last_name": values.get("lastName"),
        "phone": values.get("phone"),
        "bio": values.get("bio"),
        "avatar_url": values.get("avatarUrl"),
        "resume_url": values.get("resumeUrl"),
        "university": values.get("university"),
        "field_of_study": values.get("fieldOfStudy"),
        "graduation_year": values.get("graduationYear"),
        "skills": values.get("skills"),
        "metadata": values.get("metadata"),
        "telegram_id": values.get("telegramId"),
        "bale_id": values.get("baleId"),
    }
    return {key: value for key, value in mapped.items() if value is not None}


@app.get("/api/users/me", tags=["directory"])
async def current_directory(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    user = _authenticated_user(credentials)
    return {
        "user": _model_dump(_to_user_response(user)),
        "profile": directory_service.get_profile(user.id),
        "roles": directory_service.get_user_roles(user.id),
    }


@app.put("/api/users/me/profile", tags=["directory"])
async def update_current_profile(
    request: ProfileRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    user = _authenticated_user(credentials)
    try:
        return directory_service.update_own_profile(user.id, _profile_values(request))
    except DirectoryNotFound as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.get("/api/admin/users", tags=["directory"])
async def list_users(
    search: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> list[dict[str, object]]:
    user = _authenticated_user(credentials)
    try:
        directory_service.require_admin(user)
    except DirectoryPermissionDenied as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    return directory_service.list_users(search=search, limit=limit, offset=offset)


@app.get("/api/admin/users/{user_id}", tags=["directory"])
async def get_directory_user(
    user_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    user = _authenticated_user(credentials)
    try:
        directory_service.require_admin(user)
        return {
            "user": directory_service.get_user(user_id),
            "profile": directory_service.get_profile(user_id),
            "roles": directory_service.get_user_roles(user_id),
        }
    except DirectoryPermissionDenied as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except DirectoryNotFound as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.get("/api/admin/roles", tags=["directory"])
async def list_roles(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> list[dict[str, object]]:
    user = _authenticated_user(credentials)
    try:
        directory_service.require_admin(user)
    except DirectoryPermissionDenied as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    return directory_service.list_roles()


@app.put("/api/admin/users/{user_id}/roles", tags=["directory"])
async def assign_user_role(
    user_id: str,
    request: RoleAssignmentRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    user = _authenticated_user(credentials)
    try:
        directory_service.require_admin(user)
        assignment_id = request.assignmentId or f"{user_id}:{request.roleId}"
        directory_service.assign_role(assignment_id=assignment_id, user_id=user_id, role_id=request.roleId)
        return {"userId": user_id, "roleId": request.roleId, "assignmentId": assignment_id}
    except DirectoryPermissionDenied as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except DirectoryNotFound as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.delete("/api/admin/users/{user_id}/roles/{role_id}", status_code=204, tags=["directory"])
async def remove_user_role(
    user_id: str,
    role_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Response:
    user = _authenticated_user(credentials)
    try:
        directory_service.require_admin(user)
        directory_service.remove_role(user_id=user_id, role_id=role_id)
    except DirectoryPermissionDenied as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    return Response(status_code=204)


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
