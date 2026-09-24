"""SQLite access and the emergency backend schema."""
from pathlib import Path
import sqlite3

from .config import settings


SCHEMA = """
CREATE TABLE IF NOT EXISTS emergency_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_auth_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'password',
    identifier TEXT NOT NULL,
    password_hash TEXT,
    password_algorithm TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_auth_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_value TEXT,
    refresh_token_value TEXT,
    token_hash TEXT NOT NULL,
    refresh_token_hash TEXT,
    issued_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    refresh_expires_at INTEGER,
    revoked_at INTEGER,
    user_agent TEXT,
    ip_address TEXT,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_auth_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    token_value TEXT,
    token_hash TEXT NOT NULL,
    issued_at INTEGER NOT NULL,
    expires_at INTEGER,
    revoked_at INTEGER,
    session_id TEXT,
    metadata_json TEXT,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id),
    FOREIGN KEY(session_id) REFERENCES emergency_auth_sessions(id)
);

CREATE TABLE IF NOT EXISTS emergency_auth_keys (
    name TEXT PRIMARY KEY,
    key_id TEXT NOT NULL,
    value TEXT NOT NULL,
    algorithm TEXT NOT NULL,
    issuer TEXT,
    audience TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions_json TEXT NOT NULL DEFAULT '[]',
    panel_access_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_user_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    assigned_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id),
    FOREIGN KEY(role_id) REFERENCES emergency_roles(id),
    UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS emergency_profiles (
    user_id TEXT PRIMARY KEY,
    display_name TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    bio TEXT,
    avatar_url TEXT,
    resume_url TEXT,
    university TEXT,
    field_of_study TEXT,
    graduation_year INTEGER,
    skills_json TEXT NOT NULL DEFAULT '[]',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    telegram_id TEXT,
    bale_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_content_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_courses (
    id TEXT PRIMARY KEY,
    category_id TEXT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    summary TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    level TEXT,
    duration_minutes INTEGER,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(category_id) REFERENCES emergency_content_categories(id)
);

CREATE TABLE IF NOT EXISTS emergency_course_sections (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(course_id) REFERENCES emergency_courses(id)
);

CREATE TABLE IF NOT EXISTS emergency_lessons (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'lesson',
    body TEXT,
    duration_minutes INTEGER,
    position INTEGER NOT NULL DEFAULT 0,
    is_preview INTEGER NOT NULL DEFAULT 0,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(section_id) REFERENCES emergency_course_sections(id)
);

CREATE TABLE IF NOT EXISTS emergency_enrollments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    progress_percent REAL NOT NULL DEFAULT 0,
    enrolled_at INTEGER NOT NULL,
    completed_at INTEGER,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id),
    FOREIGN KEY(course_id) REFERENCES emergency_courses(id),
    UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS emergency_lesson_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    enrollment_id TEXT,
    status TEXT NOT NULL DEFAULT 'not_started',
    progress_percent REAL NOT NULL DEFAULT 0,
    last_position INTEGER,
    completed_at INTEGER,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id),
    FOREIGN KEY(lesson_id) REFERENCES emergency_lessons(id),
    FOREIGN KEY(enrollment_id) REFERENCES emergency_enrollments(id),
    UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS emergency_study_plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_learning_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT,
    lesson_id TEXT,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    occurred_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id),
    FOREIGN KEY(course_id) REFERENCES emergency_courses(id),
    FOREIGN KEY(lesson_id) REFERENCES emergency_lessons(id)
);

CREATE TABLE IF NOT EXISTS emergency_assessments (
    id TEXT PRIMARY KEY,
    course_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    kind TEXT NOT NULL DEFAULT 'quiz',
    time_limit_minutes INTEGER,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(course_id) REFERENCES emergency_courses(id)
);

CREATE TABLE IF NOT EXISTS emergency_assessment_questions (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'single_choice',
    points REAL NOT NULL DEFAULT 1,
    position INTEGER NOT NULL DEFAULT 0,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY(assessment_id) REFERENCES emergency_assessments(id)
);

CREATE TABLE IF NOT EXISTS emergency_assessment_options (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    text TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(question_id) REFERENCES emergency_assessment_questions(id)
);

CREATE TABLE IF NOT EXISTS emergency_assessment_attempts (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress',
    score REAL,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY(assessment_id) REFERENCES emergency_assessments(id),
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_assessment_responses (
    id TEXT PRIMARY KEY,
    attempt_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    option_id TEXT,
    answer_text TEXT,
    is_correct INTEGER,
    score REAL,
    answered_at INTEGER NOT NULL,
    FOREIGN KEY(attempt_id) REFERENCES emergency_assessment_attempts(id),
    FOREIGN KEY(question_id) REFERENCES emergency_assessment_questions(id),
    FOREIGN KEY(option_id) REFERENCES emergency_assessment_options(id),
    UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS emergency_accounts_user_idx ON emergency_auth_accounts(user_id);
CREATE INDEX IF NOT EXISTS emergency_sessions_token_idx ON emergency_auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS emergency_sessions_refresh_idx ON emergency_auth_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS emergency_tokens_hash_idx ON emergency_auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS emergency_roles_name_idx ON emergency_roles(name);
CREATE INDEX IF NOT EXISTS emergency_user_roles_user_idx ON emergency_user_roles(user_id);
CREATE INDEX IF NOT EXISTS emergency_user_roles_role_idx ON emergency_user_roles(role_id);
CREATE INDEX IF NOT EXISTS emergency_courses_category_idx ON emergency_courses(category_id);
CREATE INDEX IF NOT EXISTS emergency_courses_status_idx ON emergency_courses(status);
CREATE INDEX IF NOT EXISTS emergency_sections_course_idx ON emergency_course_sections(course_id);
CREATE INDEX IF NOT EXISTS emergency_lessons_section_idx ON emergency_lessons(section_id);
CREATE INDEX IF NOT EXISTS emergency_enrollments_user_idx ON emergency_enrollments(user_id);
CREATE INDEX IF NOT EXISTS emergency_progress_user_idx ON emergency_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS emergency_learning_events_user_idx ON emergency_learning_events(user_id);
CREATE INDEX IF NOT EXISTS emergency_attempts_user_idx ON emergency_assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS emergency_responses_attempt_idx ON emergency_assessment_responses(attempt_id);
"""


def connect() -> sqlite3.Connection:
    database_path = Path(settings.database_path)
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SCHEMA)
    token_columns = {
        row["name"]
        for row in connection.execute("PRAGMA table_info(emergency_auth_tokens)")
    }
    if "session_id" not in token_columns:
        connection.execute(
            "ALTER TABLE emergency_auth_tokens ADD COLUMN session_id TEXT REFERENCES emergency_auth_sessions(id)"
        )
    connection.execute(
        "CREATE INDEX IF NOT EXISTS emergency_tokens_session_idx ON emergency_auth_tokens(session_id)"
    )
    return connection


def database_is_ready() -> bool:
    try:
        with connect() as connection:
            connection.execute("SELECT 1").fetchone()
        return True
    except sqlite3.Error:
        return False
