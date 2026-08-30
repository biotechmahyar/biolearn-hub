# Database Migration Document — Convex → PostgreSQL

## Overview

| Metric | Count |
|--------|-------|
| Convex Tables | 65 |
| PostgreSQL Tables | 65 |
| Indexes Migrated | 85+ |
| Foreign Keys | 55+ |
| JSONB Columns | ~15 |
| Junction Tables Created | 2 |

---

## Design Decisions

### 1. Convex `v.id("table")` → PostgreSQL UUID Foreign Keys

Every Convex `v.id("tableName")` reference becomes a `uuid` column with a Drizzle `.references(() => tableName.id, { onDelete: "cascade" })` relation.

### 2. Convex Timestamps → `bigint` (epoch milliseconds)

Convex uses `v.number()` for timestamps (epoch ms). We preserve these as `bigint` columns for exact compatibility during migration. After full migration, new code can use `timestamp` columns with `defaultNow()`.

### 3. Convex Objects → `jsonb`

Fields that are only read/written as whole objects (never queried by sub-fields) use `jsonb`. Fields that are queried by sub-fields are flattened into proper columns.

### 4. Convex Arrays → `jsonb` or Junction Tables

- Arrays of simple values (strings, IDs) → `jsonb`
- Arrays with lookups/unique constraints → junction tables (`groupMembers`, `orderItems`)

### 5. Auth Tables

Convex Auth tables (`authAccounts`, `authSessions`, `authRefreshTokens`, `authVerificationCodes`, `authVerifiers`, `authRateLimits`) are replaced by a custom JWT + refresh token system:

| Convex Auth Table | PostgreSQL Equivalent |
|-------------------|----------------------|
| `authAccounts` | `users.password_hash` (simplified) |
| `authSessions` | `sessions` |
| `authRefreshTokens` | `refresh_tokens` |
| `authVerificationCodes` | `otp_codes` |
| `authVerifiers` | (merged into `otp_codes`) |
| `authRateLimits` | `auth_rate_limits` |

---

## Table-by-Table Mapping

### Authentication & Users

| Convex Table | PostgreSQL Table | PK | Key Fields | Notes |
|-------------|-----------------|-----|-----------|-------|
| `users` | `users` | UUID | name, email, password_hash, role, secondary_role, telegram_id, bank_* | Added `password_hash` for local auth; `avatar_url` replaces `avatarStorageId` |
| `authAccounts` | _(removed)_ | — | — | Replaced by `password_hash` on users |
| `authSessions` | `sessions` | UUID | user_id, token, expires_at | JWT-based session tracking |
| `authRefreshTokens` | `refresh_tokens` | UUID | session_id, token, expires_at | Token rotation support |
| `authVerificationCodes` | `otp_codes` | UUID | email, code, expires_at | 6-digit OTP for email login |
| `authVerifiers` | _(merged)_ | — | — | Merged into `otp_codes` |
| `authRateLimits` | `auth_rate_limits` | UUID | identifier, expire_at | Rate limiting for auth attempts |
| `admins` | `admins` | UUID | email | Email-based admin guard |
| `superAdminSessions` | `super_admin_sessions` | UUID | user_id, expires_at | Extra admin auth gate |

### Catalog

| Convex Table | PostgreSQL Table | JSONB Fields | Notes |
|-------------|-----------------|-------------|-------|
| `categories` | `categories` | — | Straightforward mapping |
| `instructors` | `instructors` | education (jsonb), specialties (jsonb) | `user_id` FK → users |
| `courses` | `courses` | syllabus (jsonb), audience (jsonb), prerequisites (jsonb), includes (jsonb), package_prices (jsonb) | `syllabus` is complex nested object array |
| `products` | `products` | — | — |
| `workshops` | `workshops` | agenda (jsonb) | — |

### Articles & Content

| Convex Table | PostgreSQL Table | JSONB Fields | Notes |
|-------------|-----------------|-------------|-------|
| `articles` | `articles` | tags (jsonb), seo_keywords (jsonb), references (jsonb) | `references` is complex nested object array |
| `articleVersions` | `article_versions` | — | Version history |
| `dictionaryTerms` | `dictionary_terms` | diseases (jsonb), virulence (jsonb), characteristics (jsonb), exam_notes (jsonb), sources (jsonb) | All arrays of strings |
| `sitePages` | `site_pages` | — | Custom HTML pages |
| `siteTexts` | `site_texts` | — | Text overrides |
| `mediaItems` | `media_items` | — | CMS media library |

### Assessment

| Convex Table | PostgreSQL Table | JSONB Fields | Notes |
|-------------|-----------------|-------------|-------|
| `questions` | `questions` | options (jsonb) | Array of strings |
| `exams` | `exams` | question_ids (jsonb) | Array of UUID references |
| `examReports` | `exam_reports` | — | — |
| `examAttempts` | `exam_attempts` | answers (jsonb), topic_breakdown (jsonb) | Complex nested arrays |
| `dailyQuiz` | `daily_quiz` | — | — |
| `dailyQuizAnswers` | `daily_quiz_answers` | — | — |

### Commerce

| Convex Table | PostgreSQL Table | JSONB Fields | Notes |
|-------------|-----------------|-------------|-------|
| `orders` | `orders` | — | `items` moved to junction table |
| _(inline in orders)_ | `order_items` | — | **New junction table** for order items |
| `coupons` | `coupons` | — | — |
| `enrollments` | `enrollments` | completed_lessons (jsonb) | Array of strings |
| `offlinePayments` | `offline_payments` | — | — |

### Live Collaboration

| Convex Table | PostgreSQL Table | JSONB Fields | Notes |
|-------------|-----------------|-------------|-------|
| `presence` | `presence` | — | Real-time presence tracking |
| `classRooms` | `class_rooms` | — | — |
| `classRequests` | `class_requests` | — | Instructor → admin class requests |
| `whiteboardStrokes` | `whiteboard_strokes` | points (jsonb) | Array of {x,y} objects |
| `roomMessages` | `room_messages` | — | Attachment fields flattened |
| `signals` | `signals` | data (text) | JSON-encoded SDP/ICE |

### Mentoring

| Convex Table | PostgreSQL Table | JSONB Fields | Notes |
|-------------|-----------------|-------------|-------|
| `mentorGroups` | `mentor_groups` | — | — |
| `groupMembers` | `group_members` | — | **Junction table** with unique constraint |
| `groupAnnouncements` | `group_announcements` | — | — |
| `mentorQuestions` | `mentor_questions` | — | — |
| `mentorSessions` | `mentor_sessions` | — | — |

### Support & Communication

| Convex Table | PostgreSQL Table | JSONB Fields | Notes |
|-------------|-----------------|-------------|-------|
| `tickets` | `tickets` | messages (jsonb) | Array of {author, text, at} objects |
| `comments` | `comments` | — | Added `approved` boolean |
| `announcements` | `announcements` | — | — |
| `directMessages` | `direct_messages` | — | — |
| `inboxMessages` | `inbox_messages` | — | — |
| `reminders` | `reminders` | — | — |
| `bookmarks` | `bookmarks` | — | — |
| `flashcards` | `flashcards` | — | — |
| `testimonials` | `testimonials` | — | — |

### AI System

| Convex Table | PostgreSQL Table | JSONB Fields | Notes |
|-------------|-----------------|-------------|-------|
| `aiConfig` | `ai_config` | — | Singleton row |
| `aiModels` | `ai_models` | — | Multi-model config |
| `aiPrompts` | `ai_prompts` | — | Prompt templates |
| `aiConversations` | `ai_conversations` | — | — |
| `aiMessages` | `ai_messages` | — | — |
| `aiUsage` | `ai_usage` | — | Daily tracking |
| `aiTokenQuotas` | `ai_token_quotas` | — | — |

### Telegram

| Convex Table | PostgreSQL Table | JSONB Fields | Notes |
|-------------|-----------------|-------------|-------|
| `telegramBot` | `telegram_bot` | commands (jsonb) | Array of {command, description} |
| `telegramLinkingCodes` | `telegram_linking_codes` | — | — |
| `telegramNotifPrefs` | `telegram_notif_prefs` | — | — |
| `telegramNotifLog` | `telegram_notif_log` | — | Unique key index for idempotency |

### Payments

| Convex Table | PostgreSQL Table | JSONB Fields | Notes |
|-------------|-----------------|-------------|-------|
| `instructorPayments` | `instructor_payments` | — | — |
| `courseResources` | `course_resources` | — | File uploads |
| `attendance` | `attendance` | — | — |
| `classEnrollRequests` | `class_enroll_requests` | — | — |

---

## Complex JSONB Fields — Conversion Notes

| Table | Field | Convex Type | PostgreSQL Type | Reason |
|-------|-------|------------|----------------|--------|
| `courses` | `syllabus` | Array<{id,title,durationMin,free}> | jsonb | Queried only as whole; never filtered by sub-field |
| `courses` | `audience` | string[] | jsonb | Display only |
| `courses` | `prerequisites` | string[] | jsonb | Display only |
| `courses` | `includes` | string[] | jsonb | Display only |
| `courses` | `package_prices` | Array<{tier,price,features}> | jsonb | Queried as whole |
| `articles` | `references` | Array<{title,authors,journal,year,doi,url}> | jsonb | Never queried by sub-field |
| `articles` | `tags` | string[] | jsonb | Display only |
| `articles` | `seo_keywords` | string[] | jsonb | Display only |
| `exam_attempts` | `answers` | Array<{questionId,chosenIndex}> | jsonb | Queried as whole per attempt |
| `exam_attempts` | `topic_breakdown` | Array<{topicId,topicName,...}> | jsonb | Display only |
| `tickets` | `messages` | Array<{author,text,at}> | jsonb | Append-only, queried as whole |
| `users` | `pending_profile` | Object | jsonb | Queried as whole |
| `users` | `suggested_course_ids` | id[] | jsonb | Display only |
| `telegram_bot` | `commands` | Array<{command,description}> | jsonb | Admin display only |
| `whiteboard_strokes` | `points` | Array<{x,y}> | jsonb | Canvas data, never filtered |

---

## Indexes Migration

All Convex `.index("name", [fields])` declarations are mapped to PostgreSQL B-tree indexes. Unique constraints are added where Convex semantics imply uniqueness (e.g., `groupMembers` by group+user, `users.telegramId`).

### Extra Indexes (Added for PostgreSQL Performance)

| Table | Index | Reason |
|-------|-------|--------|
| `users` | `idx_users_role` | Frequent role-based queries |
| `courses` | `idx_courses_published` | Public course listing |
| `courses` | `idx_courses_featured` | Featured course queries |
| `enrollments` | `idx_enrollments_user` + `idx_enrollments_course` | Frequent lookups |
| `direct_messages` | `idx_dm_receiver_read` | Composite for inbox queries |

---

## FK Relations Summary

| Parent Table | Child Table | FK Column | On Delete |
|-------------|-------------|-----------|-----------|
| `users` | `sessions` | `user_id` | CASCADE |
| `users` | `refresh_tokens` | `user_id` | CASCADE |
| `users` | `enrollments` | `user_id` | CASCADE |
| `users` | `exam_attempts` | `user_id` | CASCADE |
| `users` | `comments` | `user_id` | CASCADE |
| `users` | `ai_conversations` | `user_id` | CASCADE |
| `users` | `direct_messages.sender` | `sender_id` | CASCADE |
| `users` | `direct_messages.receiver` | `receiver_id` | CASCADE |
| `categories` | `courses` | `category_id` | RESTRICT |
| `categories` | `questions` | `topic_id` | RESTRICT |
| `instructors` | `courses` | `instructor_id` | RESTRICT |
| `courses` | `enrollments` | `course_id` | CASCADE |
| `courses` | `course_resources` | `course_id` | CASCADE |
| `class_rooms` | `whiteboard_strokes` | `room_id` | CASCADE |
| `class_rooms` | `room_messages` | `room_id` | CASCADE |
| `class_rooms` | `attendance` | `room_id` | CASCADE |
| `mentor_groups` | `group_members` | `group_id` | CASCADE |
| `mentor_groups` | `group_announcements` | `group_id` | CASCADE |
| `ai_conversations` | `ai_messages` | `conversation_id` | CASCADE |
| `articles` | `article_versions` | `article_id` | CASCADE |

---

## Auth System Migration

### Current Convex Auth Flow
```
Frontend → ConvexAuthProvider → signIn("password" | "email-otp" | "google")
  → Convex OIDC Token → JWT verification → Session
```

### New Auth Flow (PostgreSQL)
```
Frontend → REST API → /auth/login
  → bcrypt.compare(password, hash)
  → JWT access token (15min) + refresh token (7d)
  → Stored in httpOnly cookie
  → Middleware validates JWT on each request
```

### Password Storage
- Convex: Stored in `authAccounts.secret`
- PostgreSQL: `users.password_hash` with bcrypt (12 rounds)

### Session Management
- Convex: Server-managed sessions with OIDC
- PostgreSQL: JWT access tokens + refresh token rotation

---

## Execution Order

1. `docker compose up -d postgres` — Start PostgreSQL
2. `npx drizzle-kit migrate` — Apply schema
3. `npx tsx src/scripts/seed.ts` — Seed sample data
4. `npx tsx src/scripts/seed-admin.ts` — Create admin user (if needed)

---

## Unresolved / Needs Decision

| Item | Status | Decision Needed |
|------|--------|----------------|
| Convex Storage → PostgreSQL/MinIO | Deferred | File upload migration in later phase |
| Convex Realtime → Socket.IO | Deferred | WebSocket migration in later phase |
| Convex Scheduler/Cron → Node.js cron | Deferred | Background jobs migration in later phase |
| Google OAuth tokens | Deferred | Will be handled in auth migration phase |
| Convex HTTP Routes → Hono routes | Deferred | API migration in later phase |
