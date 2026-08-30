import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  bigint,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ══════════════════════════════════════════════════════════════════════════════
// ── Users ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").unique(),
    passwordHash: text("password_hash"),
    image: text("image"),
    role: text("role").default("user"), // admin | site_admin | user | member | instructor | mentor | content_manager | support
    secondaryRole: text("secondary_role"),
    university: text("university"),
    major: text("major"),

    // Profile
    firstName: text("first_name"),
    lastName: text("last_name"),
    avatarUrl: text("avatar_url"),
    about: text("about"),
    suggestedCourseIds: jsonb("suggested_course_ids").$type<string[]>(),

    // Telegram
    telegramId: bigint("telegram_id", { mode: "number" }).unique(),
    telegramUsername: text("telegram_username"),
    telegramFirstName: text("telegram_first_name"),
    telegramLinkedAt: bigint("telegram_linked_at", { mode: "number" }),
    telegramNotificationsEnabled: boolean("telegram_notifications_enabled").default(false),

    // Bank
    bankName: text("bank_name"),
    bankAccountNumber: text("bank_account_number"),
    bankCardNumber: text("bank_card_number"),
    bankSheba: text("bank_sheba"),

    isAnonymous: boolean("is_anonymous").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_users_email").on(table.email),
    index("idx_users_role").on(table.role),
    index("idx_users_telegram_id").on(table.telegramId),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── Sessions (JWT access tokens) ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_sessions_user_id").on(table.userId),
    index("idx_sessions_token").on(table.token),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── Refresh Tokens ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_refresh_tokens_user_id").on(table.userId),
    index("idx_refresh_tokens_token").on(table.token),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── OTP Codes ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    used: boolean("used").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_otp_email").on(table.email),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── Admin allowlist ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
  },
  (table) => [
    index("idx_admins_email").on(table.email),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── Categories ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    icon: text("icon").notNull(),
    accent: text("accent").notNull(),
    order: integer("order").notNull().default(0),
  },
  (table) => [
    index("idx_categories_slug").on(table.slug),
  ]
);
