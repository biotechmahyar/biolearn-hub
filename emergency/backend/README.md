# Emergency Backend

This is the independent Python API for the Genova emergency site.

## Commands

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Endpoints

- `GET /` — service identity
- `GET /health` — service and SQLite readiness
- `POST /api/auth/login` — authenticate an imported or local password account
- `GET /api/auth/me` — resolve the current Bearer user and role
- `POST /api/auth/refresh` — rotate an opaque or imported refresh token
- `POST /api/auth/logout` — idempotently revoke an access token
- `GET /api/users/me` — current user, profile, and assigned roles
- `PUT /api/users/me/profile` — update the authenticated user's profile
- `GET /api/admin/users` — paginated/searchable user directory
- `GET /api/admin/users/{user_id}` — user, profile, and role assignments
- `GET /api/admin/roles` — role definitions and permissions
- `PUT /api/admin/users/{user_id}/roles` — assign a role
- `DELETE /api/admin/users/{user_id}/roles/{role_id}` — remove a role assignment
- `GET /api/content/courses` — published course catalog
- `GET /api/content/courses/{course_id}` — course with sections and lessons
- `GET /api/admin/content/courses` — all course states for administrators
- `GET /api/learning/me` — enrollments, progress, and study plans
- `POST /api/learning/me/enrollments` — enroll the current user
- `PUT /api/learning/me/progress/{lesson_id}` — update lesson progress
- `POST /api/learning/me/events` — record a learning event
- `POST /api/learning/me/plans` — create a study plan
- `GET /api/assessments/{assessment_id}` — learner-safe assessment definition
- `POST /api/assessments/{assessment_id}/attempts` — start an assessment attempt
- `POST /api/attempts/{attempt_id}/responses` — submit an answer
- `POST /api/attempts/{attempt_id}/complete` — finalize and score an attempt

The login and refresh responses contain an emergency-local opaque access/refresh
pair. The service keeps the raw token value in the local session/token tables
for snapshot compatibility and also stores SHA-256 lookup hashes.

## Snapshot import

The versioned data contract is defined in `app/snapshot_contract.py` and
documented in `../docs/snapshot-contract.md`. For authentication records, use
`AuthService.upsert_user`, `upsert_password_account`, `upsert_session`,
`upsert_token`, and `upsert_signing_key`.

For phase-four identity records, first insert the user with
`AuthService.upsert_user`, then feed `profiles` and `roles` records to
`UserDirectoryService.upsert_profile`, `upsert_role`, and `assign_role`.
Role assignments retain their source assignment IDs and can be replayed safely.
The service also exposes `list_users`, `get_user`, `get_profile`,
`get_user_roles`, and admin-protected assignment operations.

For phase-five records, use `LearningService.upsert_category`, `upsert_course`,
`upsert_section`, `upsert_lesson`, `upsert_enrollment`,
`upsert_lesson_progress`, `upsert_study_plan`, `record_learning_event`,
`upsert_assessment`, `upsert_question`, and `upsert_option`. Assessment
attempts and responses can be imported with `start_attempt`,
`submit_response`, and `complete_attempt`. These methods retain source IDs,
validate relationships, and are safe to replay. The operational
exporter/importer is a later phase; no import from the main Convex application
is performed here.

Supported portable password algorithms are `pbkdf2_sha256`, `scrypt`,
`sha256`, and `portable`; `plaintext` is accepted only for explicitly marked
legacy records. `bcrypt` and Argon2 are supported when the corresponding
runtime dependency is installed. JWT access tokens are verified against an
imported signing key, including `kid`, algorithm, issuer, audience, expiry,
and subject checks. PyJWT is installed by default; missing optional hash
runtimes produce an explicit unsupported-algorithm error rather than silently
accepting a credential.

## Configuration

The service reads these environment variables:

- `EMERGENCY_ENV`
- `EMERGENCY_HOST`
- `EMERGENCY_PORT`
- `EMERGENCY_DATABASE_PATH`
- `EMERGENCY_CORS_ORIGINS`

No environment file is required for local development.
