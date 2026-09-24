# Genova emergency snapshot contract

Contract version: `1`

The exporter will produce one versioned snapshot. The emergency service will
import the same contract without importing code from the main Vite/Convex
application.

## Sections

| Section | Contents |
|---|---|
| `manifest` | Snapshot ID, contract version, source version, creation time, counts, compatibility metadata |
| `identity` | Users, stable user IDs, usernames/emails, account status, role references, linked Telegram/Bale IDs |
| `auth_accounts` | Password credential records, provider references, credential algorithm metadata |
| `auth_sessions` | Active and historical session records required by the current auth implementation |
| `auth_tokens` | Access and refresh token records or JWT-compatible token metadata |
| `auth_secrets` | Session signing keys, JWT secrets, issuer/audience/cookie configuration, Convex/Freebuff runtime configuration |
| `profiles` | Names, contact fields, profile media references, resumes, skills, university and academic metadata |
| `roles` | Role definitions, permissions, role-to-user assignments, panel access rules |
| `content` | Categories, courses, sections, lessons, articles, workshops, products, academy paths, skills, instructors, page content |
| `learning` | Enrollments, lesson progress, attendance, study plans, downloads, bookmarks, certificates and learning activity |
| `assessments` | Exams, questions, options, answers, attempts, responses, scores, quiz records and reports |
| `commerce` | Orders, invoices, coupons, discounts, subscriptions, enrollment purchases and financial history |
| `communication` | Notifications, announcements, inbox messages, support tickets, ticket messages and mentor conversations |
| `platform_settings` | Site settings, branding, feature toggles, payment state, notification settings, popups and UI configuration |
| `bots` | Telegram/Bale bot configuration, command configuration, webhook metadata and bot-related user links |
| `payments` | Gateway configuration, merchant references, callback configuration, payment status history and provider metadata |
| `files` | File manifests, storage references, hashes, MIME types, sizes and local emergency payload references |
| `audit` | Admin actions, exports, imports, role changes, session changes and emergency operations |

## Relationship rules

1. Every exported record keeps its original source ID.
2. Foreign keys are represented by stable IDs, not only by display names.
3. A record is not silently dropped when a related record is missing; it is
   reported in the manifest/import diagnostics.
4. Import is idempotent: importing the same snapshot twice must not create
   duplicate users, courses, sessions or transactions.
5. Snapshot versions are ordered. An older snapshot cannot replace a newer
   imported snapshot without an explicit recovery operation.
6. Source timestamps and local emergency import timestamps are both retained.
7. Binary files are represented in the manifest and transferred as payloads;
   URLs alone are not considered a complete file transfer.

## Manifest shape

```json
{
  "contract_version": 1,
  "snapshot_id": "genova-YYYYMMDD-HHMMSS",
  "source": "genova-main",
  "created_at": "ISO-8601 timestamp",
  "source_version": "application version or deployment id",
  "sections": ["manifest", "identity", "auth_accounts"],
  "record_counts": {
    "identity": 0,
    "auth_accounts": 0,
    "content": 0
  },
  "compatibility": {
    "identity": "native",
    "sessions": "native",
    "tokens": "native",
    "content": "json",
    "files": "manifest-and-payload"
  }
}
```

## Implementation order

- Phase 2: this contract and validation tests
- Phase 3: auth/session/token compatibility
- Phase 4–5: users, content, learning and assessment data
- Phase 6: bots, payments and runtime configuration
- Phase 7+: actual export/import tooling and recovery operations
