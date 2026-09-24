"""Independent emergency service for Genova.

This service is intentionally separate from the Vite/Convex application. It
provides a local SQLite auth store and compatibility endpoints for imported
identity/session records without importing the main application at runtime.
"""
from fastapi import Depends, FastAPI, HTTPException, Query, Response
from pathlib import Path
import secrets
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
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
from .learning_service import LearningNotFound, LearningService, LearningValidationError
from .runtime_service import RuntimeNotFound, RuntimeService
from .snapshot_service import (
    SnapshotError,
    SnapshotImportError,
    SnapshotService,
    SnapshotValidationError,
)

app = FastAPI(
    title="Genova Emergency Service",
    version="0.7.0",
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


class EnrollmentRequest(BaseModel):
    courseId: str


class ProgressRequest(BaseModel):
    status: str = "in_progress"
    progressPercent: float = 0
    lastPosition: int | None = None
    completedAt: int | None = None


class StudyPlanRequest(BaseModel):
    title: str
    status: str = "active"
    metadata: dict[str, object] | None = None


class LearningEventRequest(BaseModel):
    eventType: str
    courseId: str | None = None
    lessonId: str | None = None
    payload: dict[str, object] | None = None
    occurredAt: int | None = None


class AssessmentResponseRequest(BaseModel):
    questionId: str
    optionId: str | None = None
    answerText: str | None = None


class SnapshotExportRequest(BaseModel):
    artifactName: str
    includeSecrets: bool = False
    sourceVersion: str = "emergency-0.7.0"


class SnapshotImportRequest(BaseModel):
    allowOlderRecovery: bool = False


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
        version="0.7.0",
        database=database_status,
    )


bearer_scheme = HTTPBearer(auto_error=False)
directory_service = UserDirectoryService()
learning_service = LearningService()
runtime_service = RuntimeService()
snapshot_service = SnapshotService()


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


def _require_admin(credentials: HTTPAuthorizationCredentials | None) -> AuthenticatedUser:
    user = _authenticated_user(credentials)
    try:
        directory_service.require_admin(user)
    except DirectoryPermissionDenied as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    return user


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


@app.get("/api/content/courses", tags=["content"])
async def list_content_courses() -> list[dict[str, object]]:
    return learning_service.list_courses(public_only=True)


@app.get("/api/content/courses/{course_id}", tags=["content"])
async def get_content_course(course_id: str) -> dict[str, object]:
    try:
        course = learning_service.get_course(course_id)
    except LearningNotFound as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    if course["status"] != "published":
        raise HTTPException(status_code=404, detail="course_not_found")
    return course


@app.get("/api/admin/content/courses", tags=["content"])
async def list_admin_content_courses(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> list[dict[str, object]]:
    user = _authenticated_user(credentials)
    try:
        directory_service.require_admin(user)
    except DirectoryPermissionDenied as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    return learning_service.list_courses(public_only=False)


@app.get("/api/learning/me", tags=["learning"])
async def get_my_learning(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    user = _authenticated_user(credentials)
    return learning_service.get_learning_overview(user.id)


@app.post("/api/learning/me/enrollments", tags=["learning"])
async def enroll_in_course(
    request: EnrollmentRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    user = _authenticated_user(credentials)
    enrollment_id = f"{user.id}:{request.courseId}"
    try:
        learning_service.upsert_enrollment(
            enrollment_id=enrollment_id,
            user_id=user.id,
            course_id=request.courseId,
        )
    except LearningNotFound as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return {"id": enrollment_id, "userId": user.id, "courseId": request.courseId, "status": "active"}


@app.put("/api/learning/me/progress/{lesson_id}", tags=["learning"])
async def update_my_progress(
    lesson_id: str,
    request: ProgressRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    user = _authenticated_user(credentials)
    try:
        learning_service.upsert_lesson_progress(
            progress_id=f"{user.id}:{lesson_id}",
            user_id=user.id,
            lesson_id=lesson_id,
            status=request.status,
            progress_percent=max(0, min(100, request.progressPercent)),
            last_position=request.lastPosition,
            completed_at=request.completedAt,
        )
    except LearningNotFound as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return {"userId": user.id, "lessonId": lesson_id, "status": request.status}


@app.post("/api/learning/me/events", tags=["learning"])
async def record_learning_event(
    request: LearningEventRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    user = _authenticated_user(credentials)
    event_id = secrets.token_hex(16)
    try:
        learning_service.record_learning_event(
            event_id=event_id,
            user_id=user.id,
            event_type=request.eventType,
            course_id=request.courseId,
            lesson_id=request.lessonId,
            payload=request.payload,
            occurred_at=request.occurredAt,
        )
    except LearningNotFound as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return {"id": event_id, "userId": user.id, "eventType": request.eventType}


@app.post("/api/learning/me/plans", tags=["learning"])
async def create_study_plan(
    request: StudyPlanRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    user = _authenticated_user(credentials)
    plan_id = secrets.token_hex(16)
    learning_service.upsert_study_plan(
        plan_id=plan_id,
        user_id=user.id,
        title=request.title,
        status=request.status,
        metadata=request.metadata,
    )
    return {"id": plan_id, "userId": user.id, "title": request.title, "status": request.status}


@app.get("/api/assessments/{assessment_id}", tags=["assessments"])
async def get_assessment(assessment_id: str) -> dict[str, object]:
    try:
        return learning_service.get_assessment(assessment_id)
    except LearningNotFound as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.post("/api/assessments/{assessment_id}/attempts", tags=["assessments"])
async def start_assessment_attempt(
    assessment_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    user = _authenticated_user(credentials)
    attempt_id = secrets.token_hex(16)
    try:
        return learning_service.start_attempt(
            attempt_id=attempt_id,
            assessment_id=assessment_id,
            user_id=user.id,
        )
    except LearningNotFound as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.post("/api/attempts/{attempt_id}/responses", tags=["assessments"])
async def submit_assessment_response(
    attempt_id: str,
    request: AssessmentResponseRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    user = _authenticated_user(credentials)
    response_id = secrets.token_hex(16)
    try:
        return learning_service.submit_response(
            response_id=response_id,
            attempt_id=attempt_id,
            question_id=request.questionId,
            user_id=user.id,
            option_id=request.optionId,
            answer_text=request.answerText,
        )
    except LearningNotFound as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except LearningValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/api/attempts/{attempt_id}/complete", tags=["assessments"])
async def complete_assessment_attempt(
    attempt_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    user = _authenticated_user(credentials)
    try:
        return learning_service.complete_attempt(attempt_id=attempt_id, user_id=user.id)
    except LearningNotFound as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.get("/api/runtime/public-settings", tags=["runtime"])
async def public_runtime_settings() -> list[dict[str, object]]:
    return runtime_service.list_runtime_settings(include_secrets=False)


@app.get("/api/admin/runtime/settings", tags=["runtime"])
async def admin_runtime_settings(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> list[dict[str, object]]:
    user = _authenticated_user(credentials)
    try:
        directory_service.require_admin(user)
    except DirectoryPermissionDenied as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    return runtime_service.list_runtime_settings(include_secrets=False)


@app.get("/api/admin/bots", tags=["bots"])
async def admin_bots(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> list[dict[str, object]]:
    user = _authenticated_user(credentials)
    try:
        directory_service.require_admin(user)
    except DirectoryPermissionDenied as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    return runtime_service.list_bots(include_secrets=False)


@app.get("/api/admin/payments/gateways", tags=["payments"])
async def admin_payment_gateways(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> list[dict[str, object]]:
    user = _authenticated_user(credentials)
    try:
        directory_service.require_admin(user)
    except DirectoryPermissionDenied as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    return runtime_service.list_payment_gateways(include_secrets=False)


@app.get("/api/admin/payments/transactions", tags=["payments"])
async def admin_payment_transactions(
    gateway_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> list[dict[str, object]]:
    user = _authenticated_user(credentials)
    try:
        directory_service.require_admin(user)
    except DirectoryPermissionDenied as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    return runtime_service.list_payment_transactions(
        gateway_id=gateway_id, status=status_filter, limit=limit
    )


@app.get("/api/payments/me/transactions", tags=["payments"])
async def my_payment_transactions(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> list[dict[str, object]]:
    user = _authenticated_user(credentials)
    return runtime_service.list_payment_transactions(
        user_id=user.id, status=status_filter, limit=limit
    )


@app.get("/api/payments/me/transactions/{transaction_id}", tags=["payments"])
async def my_payment_transaction(
    transaction_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    user = _authenticated_user(credentials)
    try:
        transaction = runtime_service.get_payment_transaction(transaction_id)
    except RuntimeNotFound as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    if transaction["userId"] != user.id and user.role.lower() not in directory_service.admin_roles:
        raise HTTPException(status_code=404, detail="transaction_not_found")
    return transaction


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


@app.get("/api/admin/emergency/overview", tags=["emergency-admin"])
async def emergency_overview(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    _require_admin(credentials)
    return {
        "health": {
            "database": "ready" if database_is_ready() else "unavailable",
            "serviceVersion": app.version,
        },
        **snapshot_service.overview(),
    }


@app.get("/api/admin/snapshots", tags=["emergency-admin"])
async def list_snapshots(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> list[dict[str, object]]:
    _require_admin(credentials)
    return snapshot_service.list_artifacts()


@app.post("/api/admin/snapshots/export", status_code=201, tags=["emergency-admin"])
async def export_snapshot(
    request: SnapshotExportRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    _require_admin(credentials)
    try:
        return snapshot_service.export(
            request.artifactName,
            include_secrets=request.includeSecrets,
            source_version=request.sourceVersion,
        )
    except SnapshotValidationError as error:
        raise HTTPException(status_code=400, detail=error.errors) from error
    except SnapshotImportError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@app.post("/api/admin/snapshots/{artifact_name}/validate", tags=["emergency-admin"])
async def validate_snapshot(
    artifact_name: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    _require_admin(credentials)
    return snapshot_service.validate(artifact_name)


@app.post("/api/admin/snapshots/{artifact_name}/import", tags=["emergency-admin"])
async def import_snapshot(
    artifact_name: str,
    request: SnapshotImportRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    _require_admin(credentials)
    try:
        return snapshot_service.import_artifact(
            artifact_name,
            allow_older_recovery=request.allowOlderRecovery,
        )
    except SnapshotValidationError as error:
        raise HTTPException(status_code=400, detail=error.errors) from error
    except SnapshotError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


# This static panel has no Vite/React dependency. Mounting it last keeps every
# /api route above authoritative and independent from the main application.
_EMERGENCY_FRONTEND = Path(__file__).resolve().parents[2] / "frontend"
app.mount("/admin", StaticFiles(directory=_EMERGENCY_FRONTEND, html=True), name="emergency-admin")
