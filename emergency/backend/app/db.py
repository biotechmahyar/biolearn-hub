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

CREATE TABLE IF NOT EXISTS emergency_runtime_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    is_secret INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_bots (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'inactive',
    webhook_url TEXT,
    config_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_bot_commands (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    command TEXT NOT NULL,
    description TEXT,
    payload_json TEXT NOT NULL DEFAULT '{}',
    enabled INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(bot_id) REFERENCES emergency_bots(id),
    UNIQUE(bot_id, command)
);

CREATE TABLE IF NOT EXISTS emergency_bot_user_links (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    external_user_id TEXT NOT NULL,
    linked_at INTEGER NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY(bot_id) REFERENCES emergency_bots(id),
    FOREIGN KEY(user_id) REFERENCES emergency_users(id),
    UNIQUE(bot_id, user_id),
    UNIQUE(bot_id, external_user_id)
);

CREATE TABLE IF NOT EXISTS emergency_payment_gateways (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    display_name TEXT NOT NULL,
    merchant_reference TEXT,
    status TEXT NOT NULL DEFAULT 'inactive',
    config_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_payment_transactions (
    id TEXT PRIMARY KEY,
    gateway_id TEXT NOT NULL,
    user_id TEXT,
    provider_reference TEXT,
    order_reference TEXT,
    amount_minor INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'IRR',
    status TEXT NOT NULL DEFAULT 'pending',
    paid_at INTEGER,
    refunded_at INTEGER,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(gateway_id) REFERENCES emergency_payment_gateways(id),
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_payment_status_history (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT,
    occurred_at INTEGER NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY(transaction_id) REFERENCES emergency_payment_transactions(id)
);

CREATE TABLE IF NOT EXISTS emergency_snapshot_imports (
    snapshot_id TEXT PRIMARY KEY,
    contract_version INTEGER NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL,
    source_version TEXT NOT NULL,
    imported_at INTEGER NOT NULL,
    contains_secrets INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS emergency_audit_events (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    occurred_at INTEGER NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS emergency_request_metrics (
    minute INTEGER NOT NULL,
    method TEXT NOT NULL,
    route TEXT NOT NULL,
    status_class INTEGER NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    duration_total_ms REAL NOT NULL DEFAULT 0,
    max_duration_ms REAL NOT NULL DEFAULT 0,
    PRIMARY KEY(minute, method, route, status_class)
);

CREATE TABLE IF NOT EXISTS emergency_error_events (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    occurred_at INTEGER NOT NULL,
    method TEXT NOT NULL,
    route TEXT NOT NULL,
    exception_type TEXT NOT NULL,
    message_fingerprint TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_commerce_products (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT,
    condition TEXT,
    price_minor INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'IRR',
    stock INTEGER NOT NULL DEFAULT 0,
    sold_count INTEGER NOT NULL DEFAULT 0,
    rating REAL NOT NULL DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(seller_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_commerce_coupons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_percent REAL NOT NULL DEFAULT 0,
    max_uses INTEGER NOT NULL DEFAULT 0,
    used_count INTEGER NOT NULL DEFAULT 0,
    minimum_amount_minor INTEGER NOT NULL DEFAULT 0,
    maximum_discount_minor INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    expires_at INTEGER,
    constraints_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_commerce_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    items_json TEXT NOT NULL DEFAULT '[]',
    subtotal_minor INTEGER NOT NULL DEFAULT 0,
    discount_amount_minor INTEGER NOT NULL DEFAULT 0,
    total_minor INTEGER NOT NULL DEFAULT 0,
    coupon_code TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    invoice_number TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_commerce_marketplace_orders (
    id TEXT PRIMARY KEY,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_minor INTEGER NOT NULL DEFAULT 0,
    commission_minor INTEGER NOT NULL DEFAULT 0,
    total_minor INTEGER NOT NULL DEFAULT 0,
    seller_earning_minor INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    delivery_json TEXT NOT NULL DEFAULT '{}',
    payment_json TEXT NOT NULL DEFAULT '{}',
    invoice_number TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(buyer_id) REFERENCES emergency_users(id),
    FOREIGN KEY(seller_id) REFERENCES emergency_users(id),
    FOREIGN KEY(product_id) REFERENCES emergency_commerce_products(id)
);

CREATE TABLE IF NOT EXISTS emergency_commerce_reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rating REAL NOT NULL DEFAULT 0,
    body TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(product_id) REFERENCES emergency_commerce_products(id),
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_commerce_wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    balance_minor INTEGER NOT NULL DEFAULT 0,
    frozen_balance_minor INTEGER NOT NULL DEFAULT 0,
    total_earned_minor INTEGER NOT NULL DEFAULT 0,
    total_spent_minor INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_commerce_wallet_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    amount_minor INTEGER NOT NULL DEFAULT 0,
    body TEXT,
    related_order_id TEXT,
    related_product_id TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_commerce_payment_records (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    kind TEXT NOT NULL,
    amount_minor INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'IRR',
    status TEXT NOT NULL DEFAULT 'pending',
    provider_reference TEXT,
    paid_at INTEGER,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_commerce_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tier TEXT NOT NULL,
    daily_limit INTEGER NOT NULL DEFAULT 0,
    order_reference TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    started_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_communication_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    read_at INTEGER,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_communication_announcements (
    id TEXT PRIMARY KEY,
    author_id TEXT,
    author_name TEXT,
    author_role TEXT,
    target_type TEXT NOT NULL DEFAULT 'all',
    target_id TEXT,
    target_title TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    FOREIGN KEY(author_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_communication_inbox_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    read_at INTEGER,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_communication_support_tickets (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT,
    teacher_id TEXT NOT NULL,
    course_id TEXT,
    course_name TEXT,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    unread_by_student INTEGER NOT NULL DEFAULT 0,
    unread_by_teacher INTEGER NOT NULL DEFAULT 0,
    last_message_at INTEGER NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(student_id) REFERENCES emergency_users(id),
    FOREIGN KEY(teacher_id) REFERENCES emergency_users(id),
    FOREIGN KEY(course_id) REFERENCES emergency_courses(id)
);

CREATE TABLE IF NOT EXISTS emergency_communication_support_messages (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT,
    sender_role TEXT,
    body TEXT NOT NULL,
    attachment_file_id TEXT,
    read_at INTEGER,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    FOREIGN KEY(ticket_id) REFERENCES emergency_communication_support_tickets(id),
    FOREIGN KEY(sender_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_communication_direct_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    read_at INTEGER,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    FOREIGN KEY(sender_id) REFERENCES emergency_users(id),
    FOREIGN KEY(receiver_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_communication_mentor_groups (
    id TEXT PRIMARY KEY,
    mentor_id TEXT NOT NULL,
    mentor_name TEXT,
    title TEXT NOT NULL,
    description TEXT,
    meeting_day TEXT,
    meeting_time TEXT,
    capacity INTEGER NOT NULL DEFAULT 0,
    member_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(mentor_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_communication_mentor_group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    joined_at INTEGER NOT NULL,
    FOREIGN KEY(group_id) REFERENCES emergency_communication_mentor_groups(id),
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_communication_mentor_questions (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT,
    topic TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    answer TEXT,
    answered_by_name TEXT,
    answered_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(student_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_communication_mentor_sessions (
    id TEXT PRIMARY KEY,
    mentor_id TEXT NOT NULL,
    mentor_name TEXT,
    student_id TEXT NOT NULL,
    title TEXT NOT NULL,
    session_date TEXT,
    session_time TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at INTEGER NOT NULL,
    FOREIGN KEY(mentor_id) REFERENCES emergency_users(id),
    FOREIGN KEY(student_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_communication_comments (
    id TEXT PRIMARY KEY,
    content_type TEXT NOT NULL,
    content_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    body TEXT NOT NULL,
    approved INTEGER NOT NULL DEFAULT 0,
    rejected INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_file_manifest (
    id TEXT PRIMARY KEY,
    source_system TEXT NOT NULL,
    storage_id TEXT,
    name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    sha256 TEXT,
    original_ref TEXT,
    local_path TEXT,
    status TEXT NOT NULL DEFAULT 'missing',
    is_sensitive INTEGER NOT NULL DEFAULT 1,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(source_system, storage_id)
);

CREATE TABLE IF NOT EXISTS emergency_migration_runs (
    id TEXT PRIMARY KEY,
    source_hash TEXT NOT NULL UNIQUE,
    source_exported_at TEXT,
    source_file_name TEXT NOT NULL,
    mode TEXT NOT NULL,
    status TEXT NOT NULL,
    record_counts_json TEXT NOT NULL DEFAULT '{}',
    diagnostics_json TEXT NOT NULL DEFAULT '[]',
    backup_path TEXT,
    started_at INTEGER NOT NULL,
    completed_at INTEGER
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
CREATE INDEX IF NOT EXISTS emergency_bot_commands_bot_idx ON emergency_bot_commands(bot_id);
CREATE INDEX IF NOT EXISTS emergency_bot_links_user_idx ON emergency_bot_user_links(user_id);
CREATE INDEX IF NOT EXISTS emergency_payment_transactions_user_idx ON emergency_payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS emergency_payment_transactions_gateway_idx ON emergency_payment_transactions(gateway_id);
CREATE INDEX IF NOT EXISTS emergency_payment_status_transaction_idx ON emergency_payment_status_history(transaction_id);
CREATE INDEX IF NOT EXISTS emergency_snapshot_imports_created_idx ON emergency_snapshot_imports(created_at);
CREATE INDEX IF NOT EXISTS emergency_audit_occurred_idx ON emergency_audit_events(occurred_at);
CREATE INDEX IF NOT EXISTS emergency_request_metrics_minute_idx ON emergency_request_metrics(minute);
CREATE INDEX IF NOT EXISTS emergency_error_events_occurred_idx ON emergency_error_events(occurred_at);
CREATE INDEX IF NOT EXISTS emergency_commerce_products_seller_idx ON emergency_commerce_products(seller_id);
CREATE INDEX IF NOT EXISTS emergency_commerce_orders_user_idx ON emergency_commerce_orders(user_id);
CREATE INDEX IF NOT EXISTS emergency_commerce_marketplace_product_idx ON emergency_commerce_marketplace_orders(product_id);
CREATE INDEX IF NOT EXISTS emergency_commerce_wallet_user_idx ON emergency_commerce_wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS emergency_communication_notifications_user_idx ON emergency_communication_notifications(user_id);
CREATE INDEX IF NOT EXISTS emergency_communication_support_ticket_idx ON emergency_communication_support_tickets(id);
CREATE INDEX IF NOT EXISTS emergency_communication_support_message_ticket_idx ON emergency_communication_support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS emergency_communication_direct_sender_idx ON emergency_communication_direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS emergency_communication_direct_receiver_idx ON emergency_communication_direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS emergency_file_manifest_storage_idx ON emergency_file_manifest(storage_id);
CREATE INDEX IF NOT EXISTS emergency_file_manifest_sha_idx ON emergency_file_manifest(sha256);
CREATE INDEX IF NOT EXISTS emergency_migration_runs_started_idx ON emergency_migration_runs(started_at);
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
