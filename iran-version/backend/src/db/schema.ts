/**
 * ══════════════════════════════════════════════════════════════════════════════
 * NIBRC Iran Version — Complete Database Schema
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Converted from Convex schema (src/convex/schema.ts) + actual usage analysis
 * of all queries, mutations, and actions.
 *
 * Design decisions:
 * - Fields only read/written as whole objects → JSONB
 * - Arrays never queried individually → JSONB
 * - Arrays with unique constraints or lookups → junction tables
 * - Convex v.id("table") → UUID FK references
 * - Convex timestamps (number) → BIGINT (epoch ms) to preserve compatibility
 * - Convex optional fields → nullable columns
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  bigint,
  doublePrecision,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

// ══════════════════════════════════════════════════════════════════════════════
// ── AUTHENTICATION ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").unique(),
    passwordHash: text("password_hash"),
    image: text("image"),
    emailVerificationTime: bigint("email_verification_time", { mode: "number" }),
    isAnonymous: boolean("is_anonymous").default(false),

    // Roles
    role: text("role"), // admin | site_admin | user | member | instructor | mentor | content_manager | support
    secondaryRole: text("secondary_role"),
    university: text("university"),
    major: text("major"),

    // Profile (pending approval system)
    firstName: text("first_name"),
    lastName: text("last_name"),
    avatarUrl: text("avatar_url"), // was avatarStorageId in Convex
    about: text("about"),
    suggestedCourseIds: jsonb("suggested_course_ids").$type<string[]>(),
    pendingProfile: jsonb("pending_profile").$type<{
      firstName?: string;
      lastName?: string;
      avatarStorageId?: string;
      submittedAt: number;
    }>(),

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

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_users_email").on(t.email),
    index("idx_users_role").on(t.role),
    index("idx_users_telegram_id").on(t.telegramId),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_sessions_user_id").on(t.userId),
    index("idx_sessions_token").on(t.token),
  ]
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_refresh_tokens_user_id").on(t.userId),
    index("idx_refresh_tokens_token").on(t.token),
  ]
);

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
  (t) => [index("idx_otp_email").on(t.email)]
);

export const authRateLimits = pgTable(
  "auth_rate_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    expireAt: timestamp("expire_at").notNull(),
  },
  (t) => [index("idx_rate_limits_identifier").on(t.identifier)]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── ADMIN ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
  },
  (t) => [index("idx_admins_email").on(t.email)]
);

export const superAdminSessions = pgTable(
  "super_admin_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_super_admin_sessions_user").on(t.userId)]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── CATALOG ──────────────────────────────────────────────────────────────────
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
  (t) => [index("idx_categories_slug").on(t.slug)]
);

export const instructors = pgTable(
  "instructors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    bio: text("bio").notNull(),
    education: jsonb("education").$type<string[]>().notNull(),
    specialties: jsonb("specialties").$type<string[]>().notNull(),
    accent: text("accent").notNull(),
    verified: boolean("verified").notNull().default(false),
    userId: uuid("user_id").references(() => users.id), // linked registered user
  },
  (t) => [
    index("idx_instructors_slug").on(t.slug),
    index("idx_instructors_user_id").on(t.userId),
  ]
);

// ── Courses ──────────────────────────────────────────────────────────────────
// syllabus[], packagePrices[], includes[], files[] → JSONB (never queried individually)
// audience[], prerequisites[] → JSONB (display only)

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    categoryId: uuid("category_id").notNull().references(() => categories.id),
    instructorId: uuid("instructor_id").notNull().references(() => instructors.id),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    audience: jsonb("audience").$type<string[]>().notNull(),
    prerequisites: jsonb("prerequisites").$type<string[]>().notNull(),

    // JSONB: [{ id, title, durationMin, free }]
    syllabus: jsonb("syllabus").$type<
      { id: string; title: string; durationMin: number; free: boolean }[]
    >().notNull(),

    durationText: text("duration_text").notNull(),
    mode: text("mode").notNull(), // live | recorded | hybrid
    price: doublePrecision("price").notNull(),
    discountPrice: doublePrecision("discount_price"),
    rating: doublePrecision("rating").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    studentsCount: integer("students_count").notNull().default(0),
    accent: text("accent").notNull(),
    bundle: text("bundle").notNull(), // economy | basic | plus | premium
    includes: jsonb("includes").$type<string[]>().notNull(),
    hasSampleVideo: boolean("has_sample_video").notNull().default(false),

    // JSONB: [{ name, size, type }]
    files: jsonb("files").$type<
      { name: string; size: string; type: string }[]
    >().notNull(),

    published: boolean("published").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    popular: boolean("popular").notNull().default(false),
    createdAt: bigint("created_at", { mode: "number" }),

    // JSONB: [{ tier, price, features }]
    packagePrices: jsonb("package_prices").$type<
      { tier: string; price: number; features: string[] }[]
    >(),

    // Instructor-designed course flow
    authorId: uuid("author_id").references(() => users.id),
    status: text("status"), // draft | pending | rejected
    reviewNote: text("review_note"),
  },
  (t) => [
    index("idx_courses_slug").on(t.slug),
    index("idx_courses_category").on(t.categoryId),
    index("idx_courses_published").on(t.published),
    index("idx_courses_featured").on(t.featured),
    index("idx_courses_author").on(t.authorId),
  ]
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    type: text("type").notNull(), // flashcards | guide | poster
    description: text("description").notNull(),
    price: doublePrecision("price").notNull(),
    accent: text("accent").notNull(),
    published: boolean("published").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [index("idx_products_slug").on(t.slug)]
);

export const workshops = pgTable(
  "workshops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    instructorId: uuid("instructor_id").notNull().references(() => instructors.id),
    topic: text("topic").notNull(),
    date: text("date").notNull(), // ISO date
    time: text("time").notNull(),
    capacity: integer("capacity").notNull(),
    registeredCount: integer("registered_count").notNull().default(0),
    price: doublePrecision("price").notNull(),
    description: text("description").notNull(),
    agenda: jsonb("agenda").$type<string[]>().notNull(),
    free: boolean("free").notNull().default(false),
    expertTalk: boolean("expert_talk").notNull().default(false),
    published: boolean("published").notNull().default(false),
  },
  (t) => [index("idx_workshops_slug").on(t.slug)]
);

// ── Articles ─────────────────────────────────────────────────────────────────
// references[] → JSONB (display only, never queried individually)
// tags[], seoKeywords[] → JSONB (display only)

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    subtitle: text("subtitle"),
    category: text("category").notNull(),
    tags: jsonb("tags").$type<string[]>(),
    excerpt: text("excerpt").notNull(),
    body: text("body").notNull(), // HTML from TipTap
    authorName: text("author_name").notNull(),
    authorId: uuid("author_id").references(() => users.id),
    featuredImage: text("featured_image"),
    accent: text("accent").notNull(),
    readTime: integer("read_time").notNull(),
    level: text("level"), // beginner | intermediate | advanced
    status: text("status"), // draft | in_review | scheduled | published | archived
    scheduledAt: bigint("scheduled_at", { mode: "number" }),
    published: boolean("published").notNull().default(false),
    featured: boolean("featured").notNull().default(false),

    // SEO fields
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoKeywords: jsonb("seo_keywords").$type<string[]>(),
    seoCanonical: text("seo_canonical"),
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImage: text("og_image"),

    // JSONB: [{ title, authors, journal, year, doi?, url? }]
    references: jsonb("references").$type<
      { title: string; authors: string; journal: string; year: number; doi?: string; url?: string }[]
    >(),

    createdAt: bigint("created_at", { mode: "number" }),
    updatedAt: bigint("updated_at", { mode: "number" }),
  },
  (t) => [
    index("idx_articles_slug").on(t.slug),
    index("idx_articles_status").on(t.status),
    index("idx_articles_author").on(t.authorId),
  ]
);

export const articleVersions = pgTable(
  "article_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    title: text("title").notNull(),
    savedBy: uuid("saved_by").notNull().references(() => users.id),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [index("idx_article_versions_article").on(t.articleId)]
);

// ── Dictionary ───────────────────────────────────────────────────────────────
// All arrays are display-only, never queried individually → JSONB

export const dictionaryTerms = pgTable(
  "dictionary_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    term: text("term").notNull(),
    slug: text("slug").notNull().unique(),
    fullName: text("full_name").notNull(),
    gramStatus: text("gram_status").notNull(),
    shape: text("shape").notNull(),
    oxygen: text("oxygen").notNull(),
    habitat: text("habitat").notNull(),
    diseases: jsonb("diseases").$type<string[]>().notNull(),
    virulence: jsonb("virulence").$type<string[]>().notNull(),
    diagnosis: text("diagnosis").notNull(),
    characteristics: jsonb("characteristics").$type<string[]>().notNull(),
    examNotes: jsonb("exam_notes").$type<string[]>().notNull(),
    sources: jsonb("sources").$type<string[]>().notNull(),
  },
  (t) => [
    index("idx_dict_slug").on(t.slug),
    index("idx_dict_term").on(t.term),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── ASSESSMENT ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    text: text("text").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation").notNull(),
    topicId: uuid("topic_id").notNull().references(() => categories.id),
    difficulty: integer("difficulty").notNull(), // 1 | 2 | 3
  },
  (t) => [index("idx_questions_topic").on(t.topicId)]
);

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    questionIds: jsonb("question_ids").$type<string[]>().notNull(),
    free: boolean("free").notNull().default(false),
    published: boolean("published").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    diagnostic: boolean("diagnostic").notNull().default(false),
    accent: text("accent").notNull(),
    order: integer("order").notNull().default(0),
  },
  (t) => [index("idx_exams_slug").on(t.slug)]
);

export const examReports = pgTable(
  "exam_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    examId: uuid("exam_id").notNull().references(() => exams.id),
    questionId: uuid("question_id").notNull().references(() => questions.id),
    comment: text("comment").notNull(),
    status: text("status").notNull(), // open | resolved
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_exam_reports_status").on(t.status),
    index("idx_exam_reports_user").on(t.userId),
    index("idx_exam_reports_exam").on(t.examId),
  ]
);

// answers[] and topicBreakdown[] → JSONB (written atomically, never queried inside)

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    examId: uuid("exam_id").notNull().references(() => exams.id),
    answers: jsonb("answers").$type<
      { questionId: string; chosenIndex: number }[]
    >().notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    percent: doublePrecision("percent").notNull(),
    topicBreakdown: jsonb("topic_breakdown").$type<
      { topicId: string; topicName: string; correct: number; total: number; percent: number }[]
    >().notNull(),
    startedAt: bigint("started_at", { mode: "number" }),
    finishedAt: bigint("finished_at", { mode: "number" }),
  },
  (t) => [
    index("idx_exam_attempts_user").on(t.userId),
    index("idx_exam_attempts_exam").on(t.examId),
  ]
);

export const dailyQuiz = pgTable(
  "daily_quiz",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: text("date").notNull(), // YYYY-MM-DD
    questionId: uuid("question_id").notNull().references(() => questions.id),
    points: integer("points").notNull(),
  },
  (t) => [index("idx_daily_quiz_date").on(t.date)]
);

export const dailyQuizAnswers = pgTable(
  "daily_quiz_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    date: text("date").notNull(),
    questionId: uuid("question_id").notNull().references(() => questions.id),
    chosenIndex: integer("chosen_index").notNull(),
    correct: boolean("correct").notNull(),
    points: integer("points").notNull(),
    answeredAt: bigint("answered_at", { mode: "number" }),
  },
  (t) => [
    index("idx_dqa_user").on(t.userId),
    index("idx_dqa_date").on(t.date),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── COMMERCE ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// order items → separate table (queryable by type/refId)
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // course | product | workshop
    refId: text("ref_id").notNull(),
    title: text("title").notNull(),
    price: doublePrecision("price").notNull(),
  },
  (t) => [index("idx_order_items_order").on(t.orderId)]
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    subtotal: doublePrecision("subtotal").notNull(),
    discountAmount: doublePrecision("discount_amount").notNull().default(0),
    total: doublePrecision("total").notNull(),
    couponCode: text("coupon_code"),
    status: text("status").notNull(), // paid | pending | cancelled
    invoiceNumber: text("invoice_number").notNull(),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_orders_user").on(t.userId),
    index("idx_orders_status").on(t.status),
    index("idx_orders_created").on(t.createdAt),
  ]
);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    percent: integer("percent").notNull(),
    active: boolean("active").notNull().default(true),
    maxUses: integer("max_uses").notNull(),
    usedCount: integer("used_count").notNull().default(0),
    expiresAt: bigint("expires_at", { mode: "number" }),
  },
  (t) => [index("idx_coupons_code").on(t.code)]
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    courseId: uuid("course_id").notNull().references(() => courses.id),
    completedLessons: jsonb("completed_lessons").$type<string[]>().notNull(),
    enrolledAt: bigint("enrolled_at", { mode: "number" }),
    lastActiveAt: bigint("last_active_at", { mode: "number" }),
  },
  (t) => [
    index("idx_enrollments_user").on(t.userId),
    index("idx_enrollments_course").on(t.courseId),
  ]
);

export const offlinePayments = pgTable(
  "offline_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    courseId: uuid("course_id").notNull().references(() => courses.id),
    tier: text("tier").notNull(), // economy | basic | plus | premium
    amount: doublePrecision("amount").notNull(),
    trackingNumber: text("tracking_number").notNull(),
    receiptStorageId: text("receipt_storage_id").notNull(),
    status: text("status").notNull(), // pending | approved | rejected
    note: text("note"),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_offline_payments_user").on(t.userId),
    index("idx_offline_payments_status").on(t.status),
    index("idx_offline_payments_course").on(t.courseId),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── ENGAGEMENT ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    kind: text("kind").notNull(), // exam_new | exam_next | course_nudge
    refId: text("ref_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link").notNull(),
    shownCount: integer("shown_count").notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_reminders_user").on(t.userId),
    index("idx_reminders_user_kind").on(t.userId, t.kind),
  ]
);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id").notNull().references(() => users.id),
    authorName: text("author_name").notNull(),
    authorRole: text("author_role").notNull(),
    targetType: text("target_type").notNull(), // all | course | exam
    targetId: text("target_id"),
    targetTitle: text("target_title"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_announcements_created").on(t.createdAt),
    index("idx_announcements_author").on(t.authorId),
  ]
);

// Unique constraint on (userId, contentType, contentId)
export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    contentType: text("content_type").notNull(),
    contentId: text("content_id").notNull(),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_bookmarks_user").on(t.userId),
    uniqueIndex("idx_bookmarks_user_content").on(t.userId, t.contentType, t.contentId),
  ]
);

export const flashcards = pgTable(
  "flashcards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    front: text("front").notNull(),
    back: text("back").notNull(),
    category: text("category").notNull(),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [index("idx_flashcards_user").on(t.userId)]
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentType: text("content_type").notNull(),
    contentId: text("content_id").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id),
    userName: text("user_name"),
    text: text("text").notNull(),
    approved: boolean("approved").notNull().default(false),
    rejected: boolean("rejected"),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_comments_content").on(t.contentType, t.contentId),
    index("idx_comments_user").on(t.userId),
    index("idx_comments_approved").on(t.approved),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── LIVE COLLABORATION ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const presence = pgTable(
  "presence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    name: text("name"),
    role: text("role"),
    location: text("location"),
    lastSeen: bigint("last_seen", { mode: "number" }).notNull(),
  },
  (t) => [
    index("idx_presence_user").on(t.userId),
    index("idx_presence_last_seen").on(t.lastSeen),
  ]
);

export const classRooms = pgTable(
  "class_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instructorId: uuid("instructor_id").notNull().references(() => users.id),
    instructorName: text("instructor_name").notNull(),
    title: text("title").notNull(),
    topic: text("topic").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull(), // live | scheduled | ended
    broadcasting: boolean("broadcasting").notNull().default(false),
    broadcastKind: text("broadcast_kind"), // camera | screen
    boardBg: text("board_bg"),
    createdAt: bigint("created_at", { mode: "number" }),
    platformUrl: text("platform_url"),
    scheduledDate: text("scheduled_date"),
  },
  (t) => [
    index("idx_class_rooms_instructor").on(t.instructorId),
    index("idx_class_rooms_status").on(t.status),
  ]
);

export const classRequests = pgTable(
  "class_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instructorId: uuid("instructor_id").notNull().references(() => users.id),
    instructorName: text("instructor_name").notNull(),
    title: text("title").notNull(),
    topic: text("topic").notNull(),
    description: text("description").notNull(),
    proposedDate: text("proposed_date").notNull(),
    status: text("status").notNull(), // pending | approved | rejected
    createdAt: bigint("created_at", { mode: "number" }),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: bigint("reviewed_at", { mode: "number" }),
    platformUrl: text("platform_url"),
  },
  (t) => [
    index("idx_class_requests_instructor").on(t.instructorId),
    index("idx_class_requests_status").on(t.status),
  ]
);

// whiteboardStrokes: points[] → JSONB (coordinate array)

export const whiteboardStrokes = pgTable(
  "whiteboard_strokes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id").notNull().references(() => classRooms.id, { onDelete: "cascade" }),
    layer: text("layer").notNull(), // board | screen
    tool: text("tool").notNull(), // pen | highlighter | eraser
    color: text("color").notNull(),
    size: doublePrecision("size").notNull(),
    points: jsonb("points").$type<{ x: number; y: number }[]>().notNull(),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_wb_strokes_room_layer").on(t.roomId, t.layer),
    index("idx_wb_strokes_room_layer_created").on(t.roomId, t.layer, t.createdAt),
  ]
);

export const roomMessages = pgTable(
  "room_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id").notNull().references(() => classRooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id),
    name: text("name").notNull(),
    role: text("role"),
    type: text("type").notNull(), // question | message | answer
    text: text("text").notNull(),
    answer: text("answer"),
    attachmentType: text("attachment_type"), // file | voice | image
    attachmentName: text("attachment_name"),
    attachmentStorageId: text("attachment_storage_id"),
    attachmentSize: integer("attachment_size"),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_room_messages_room").on(t.roomId),
    index("idx_room_messages_room_created").on(t.roomId, t.createdAt),
  ]
);

// signals: data is SDP/ICE JSON string

export const signals = pgTable(
  "signals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id").notNull().references(() => classRooms.id, { onDelete: "cascade" }),
    from: uuid("from_user").notNull().references(() => users.id),
    to: uuid("to_user").references(() => users.id),
    type: text("type").notNull(), // offer | answer | candidate
    data: text("data").notNull(), // JSON-encoded SDP or ICE
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [index("idx_signals_room").on(t.roomId)]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── MENTORING ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const mentorGroups = pgTable(
  "mentor_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mentorId: uuid("mentor_id").notNull().references(() => users.id),
    mentorName: text("mentor_name").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    meetingDay: text("meeting_day").notNull(),
    meetingTime: text("meeting_time").notNull(),
    capacity: integer("capacity").notNull(),
    memberCount: integer("member_count").notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_mentor_groups_mentor").on(t.mentorId),
    index("idx_mentor_groups_created").on(t.createdAt),
  ]
);

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id").notNull().references(() => mentorGroups.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id),
    userName: text("user_name").notNull(),
    joinedAt: bigint("joined_at", { mode: "number" }),
  },
  (t) => [
    index("idx_group_members_group").on(t.groupId),
    index("idx_group_members_user").on(t.userId),
    uniqueIndex("idx_group_members_group_user").on(t.groupId, t.userId),
  ]
);

export const groupAnnouncements = pgTable(
  "group_announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id").notNull().references(() => mentorGroups.id, { onDelete: "cascade" }),
    mentorId: uuid("mentor_id").notNull().references(() => users.id),
    mentorName: text("mentor_name").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [index("idx_group_announcements_group").on(t.groupId)]
);

export const mentorQuestions = pgTable(
  "mentor_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id").notNull().references(() => users.id),
    studentName: text("student_name").notNull(),
    topic: text("topic").notNull(),
    text: text("text").notNull(),
    status: text("status").notNull(), // open | answered
    answer: text("answer"),
    answeredByName: text("answered_by_name"),
    answeredAt: bigint("answered_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_mentor_questions_student").on(t.studentId),
    index("idx_mentor_questions_status").on(t.status),
    index("idx_mentor_questions_created").on(t.createdAt),
  ]
);

export const mentorSessions = pgTable(
  "mentor_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mentorId: uuid("mentor_id").notNull().references(() => users.id),
    mentorName: text("mentor_name").notNull(),
    studentId: uuid("student_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    date: text("date").notNull(),
    time: text("time").notNull(),
    notes: text("notes").notNull(),
    status: text("status").notNull(), // scheduled | done | cancelled
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_mentor_sessions_mentor").on(t.mentorId),
    index("idx_mentor_sessions_student").on(t.studentId),
    index("idx_mentor_sessions_created").on(t.createdAt),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── SUPPORT ──────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// tickets messages[] → JSONB (written atomically with push, read as whole)

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    subject: text("subject").notNull(),
    status: text("status").notNull(), // open | answered | closed
    createdAt: bigint("created_at", { mode: "number" }),
    updatedAt: bigint("updated_at", { mode: "number" }),
    messages: jsonb("messages").$type<
      { author: string; text: string; at: number }[]
    >().notNull(),
  },
  (t) => [
    index("idx_tickets_user").on(t.userId),
    index("idx_tickets_status").on(t.status),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── COURSE RESOURCES ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const courseResources = pgTable(
  "course_resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    instructorId: uuid("instructor_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    description: text("description"),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(),
    fileType: text("file_type").notNull(),
    isFree: boolean("is_free").notNull().default(false),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [index("idx_course_resources_course").on(t.courseId)]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── ATTENDANCE ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id").notNull().references(() => classRooms.id, { onDelete: "cascade" }),
    instructorId: uuid("instructor_id").notNull().references(() => users.id),
    studentId: uuid("student_id").notNull().references(() => users.id),
    studentName: text("student_name").notNull(),
    present: boolean("present").notNull(),
    note: text("note"),
    markedAt: bigint("marked_at", { mode: "number" }),
  },
  (t) => [
    index("idx_attendance_room").on(t.roomId),
    index("idx_attendance_student").on(t.studentId),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── INSTRUCTOR PAYMENTS ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const instructorPayments = pgTable(
  "instructor_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instructorId: uuid("instructor_id").notNull().references(() => users.id),
    amount: doublePrecision("amount").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull(), // pending | paid | rejected
    receiptUrl: text("receipt_url"),
    paidAt: bigint("paid_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [index("idx_instructor_payments_instructor").on(t.instructorId)]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── DIRECT MESSAGES ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const directMessages = pgTable(
  "direct_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderId: uuid("sender_id").notNull().references(() => users.id),
    receiverId: uuid("receiver_id").notNull().references(() => users.id),
    text: text("text").notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_dm_receiver").on(t.receiverId, t.read),
    index("idx_dm_sender").on(t.senderId),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── TESTIMONIALS ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const testimonials = pgTable("testimonials", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  text: text("text").notNull(),
  rating: integer("rating").notNull(),
  course: text("course").notNull(),
  accent: text("accent").notNull(),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── CLASS ENROLLMENT ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const classEnrollRequests = pgTable(
  "class_enroll_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    roomId: uuid("room_id").notNull().references(() => classRooms.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // pending | approved | rejected
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_class_enroll_room").on(t.roomId),
    index("idx_class_enroll_user").on(t.userId),
    index("idx_class_enroll_status").on(t.status),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── INBOX ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const inboxMessages = pgTable(
  "inbox_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readAt: bigint("read_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [
    index("idx_inbox_user").on(t.userId),
    index("idx_inbox_created").on(t.createdAt),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── AI SYSTEM ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const aiConfig = pgTable("ai_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  maxTokensPerRequest: integer("max_tokens_per_request").notNull(),
  temperature: doublePrecision("temperature").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const aiModels = pgTable("ai_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key").notNull(),
  isFree: boolean("is_free").notNull().default(false),
  dailyLimit: integer("daily_limit").notNull(),
  pricePerMessage: doublePrecision("price_per_message").notNull().default(0),
  description: text("description").notNull(),
  systemPrompt: text("system_prompt"),
  maxTokens: integer("max_tokens").notNull(),
  temperature: doublePrecision("temperature").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: bigint("created_at", { mode: "number" }),
});

export const aiPrompts = pgTable(
  "ai_prompts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    content: text("content").notNull(),
    category: text("category").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [index("idx_ai_prompts_category").on(t.category)]
);

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    promptId: uuid("prompt_id").references(() => aiPrompts.id),
    modelId: uuid("model_id").references(() => aiModels.id),
    createdAt: bigint("created_at", { mode: "number" }),
    updatedAt: bigint("updated_at", { mode: "number" }),
  },
  (t) => [index("idx_ai_conversations_user").on(t.userId)]
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | assistant | system
    content: text("content").notNull(),
    tokensUsed: integer("tokens_used").notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [index("idx_ai_messages_conversation").on(t.conversationId)]
);

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    date: text("date").notNull(), // YYYY-MM-DD
    messagesSent: integer("messages_sent").notNull().default(0),
    tokensUsed: integer("tokens_used").notNull().default(0),
  },
  (t) => [
    index("idx_ai_usage_user_date").on(t.userId, t.date),
    uniqueIndex("idx_ai_usage_unique").on(t.userId, t.date),
  ]
);

export const aiTokenQuotas = pgTable(
  "ai_token_quotas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    dailyLimit: integer("daily_limit").notNull(),
    extraTokens: integer("extra_tokens").notNull().default(0),
    grantedAt: bigint("granted_at", { mode: "number" }),
    grantedBy: uuid("granted_by").notNull().references(() => users.id),
    note: text("note"),
  },
  (t) => [index("idx_ai_token_quotas_user").on(t.userId)]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── TELEGRAM ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const telegramBot = pgTable("telegram_bot", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenEncrypted: text("token_encrypted").notNull(),
  botId: text("bot_id"),
  botName: text("bot_name"),
  botUsername: text("bot_username"),
  webhookUrl: text("webhook_url"),
  connected: boolean("connected").notNull().default(false),
  active: boolean("active").notNull().default(false),
  startMessage: text("start_message").notNull(),
  lastTestedAt: bigint("last_tested_at", { mode: "number" }),
  lastTestResult: text("last_test_result"),
  // commands → JSONB [{ command, description }]
  commands: jsonb("commands").$type<{ command: string; description: string }[]>(),
  commandsSyncedAt: bigint("commands_synced_at", { mode: "number" }),
  updatedBy: uuid("updated_by").notNull().references(() => users.id),
  updatedAt: bigint("updated_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }),
});

export const telegramLinkingCodes = pgTable(
  "telegram_linking_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    code: text("code").notNull(),
    createdAt: bigint("created_at", { mode: "number" }),
    expiresAt: bigint("expires_at", { mode: "number" }),
    usedAt: bigint("used_at", { mode: "number" }),
    telegramId: bigint("telegram_id", { mode: "number" }),
  },
  (t) => [
    index("idx_tl_linking_codes_code").on(t.code),
    index("idx_tl_linking_codes_user").on(t.userId),
  ]
);

export const telegramNotifPrefs = pgTable(
  "telegram_notif_prefs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id).unique(),
    mentorReplies: boolean("mentor_replies").notNull().default(true),
    tasks: boolean("tasks").notNull().default(true),
    deadlines: boolean("deadlines").notNull().default(true),
    meetings: boolean("meetings").notNull().default(true),
    groupNotifs: boolean("group_notifs").notNull().default(true),
    articles: boolean("articles").notNull().default(true),
    system: boolean("system").notNull().default(true),
  },
  (t) => [index("idx_tl_notif_prefs_user").on(t.userId)]
);

export const telegramNotifLog = pgTable(
  "telegram_notif_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    type: text("type").notNull(),
    key: text("key").notNull(),
    sentAt: bigint("sent_at", { mode: "number" }),
    success: boolean("success").notNull(),
  },
  (t) => [
    index("idx_tl_notif_log_key").on(t.key),
    index("idx_tl_notif_log_user_type").on(t.userId, t.type),
    uniqueIndex("idx_tl_notif_log_unique_key").on(t.key),
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── SITE CONTENT ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const sitePages = pgTable(
  "site_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    htmlContent: text("html_content").notNull(),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    updatedAt: bigint("updated_at", { mode: "number" }),
  },
  (t) => [index("idx_site_pages_slug").on(t.slug)]
);

export const siteTexts = pgTable(
  "site_texts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull().unique(),
    value: text("value").notNull(),
    updatedBy: uuid("updated_by").notNull().references(() => users.id),
    updatedAt: bigint("updated_at", { mode: "number" }),
  },
  (t) => [index("idx_site_texts_key").on(t.key)]
);

// ══════════════════════════════════════════════════════════════════════════════
// ── MEDIA LIBRARY ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const mediaItems = pgTable(
  "media_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull(),
    name: text("name").notNull(),
    alt: text("alt"),
    caption: text("caption"),
    category: text("category"),
    size: doublePrecision("size").notNull(),
    mimeType: text("mime_type").notNull(),
    uploadedBy: uuid("uploaded_by").notNull().references(() => users.id),
    createdAt: bigint("created_at", { mode: "number" }),
  },
  (t) => [index("idx_media_items_uploader").on(t.uploadedBy)]
);
