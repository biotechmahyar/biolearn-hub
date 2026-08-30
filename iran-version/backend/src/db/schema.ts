import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ── Auth & Users ──────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }),
    passwordHash: varchar("password_hash", { length: 255 }),
    role: varchar("role", { length: 50 }),
    secondaryRole: varchar("secondary_role", { length: 50 }),
    university: varchar("university", { length: 255 }),
    major: varchar("major", { length: 255 }),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    avatarUrl: text("avatar_url"),
    about: text("about"),
    suggestedCourseIds: jsonb("suggested_course_ids").$type<string[]>(),
    pendingProfile: jsonb("pending_profile").$type<{
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      about?: string;
      submittedAt: number;
    }>(),
    telegramId: bigint("telegram_id", { mode: "number" }),
    telegramUsername: varchar("telegram_username", { length: 255 }),
    telegramFirstName: varchar("telegram_first_name", { length: 255 }),
    telegramLinkedAt: bigint("telegram_linked_at", { mode: "number" }),
    telegramNotificationsEnabled: boolean("telegram_notifications_enabled"),
    bankName: varchar("bank_name", { length: 255 }),
    bankAccountNumber: varchar("bank_account_number", { length: 255 }),
    bankCardNumber: varchar("bank_card_number", { length: 255 }),
    bankSheba: varchar("bank_sheba", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_users_email").on(table.email),
    index("idx_users_role").on(table.role),
    uniqueIndex("idx_users_telegram_id").on(table.telegramId),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_sessions_user").on(table.userId)]
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_refresh_tokens_user").on(table.userId)]
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    code: varchar("code", { length: 10 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_otp_email").on(table.email)]
);

export const authRateLimits = pgTable("auth_rate_limits", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  expireAt: timestamp("expire_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_admins_email").on(table.email)]
);

export const superAdminSessions = pgTable(
  "super_admin_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [index("idx_super_admin_sessions_user").on(table.userId)]
);

// ── Catalog ──────────────────────────────────────────────────────────────────

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description").default("").notNull(),
    icon: varchar("icon", { length: 100 }).default("Dna").notNull(),
    accent: varchar("accent", { length: 50 }).default("teal").notNull(),
    "order": integer("order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_categories_slug").on(table.slug)]
);

export const instructors = pgTable(
  "instructors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    bio: text("bio").default("").notNull(),
    education: jsonb("education").$type<string[]>().default([]).notNull(),
    specialties: jsonb("specialties").$type<string[]>().default([]).notNull(),
    accent: varchar("accent", { length: 50 }).default("teal").notNull(),
    verified: boolean("verified").default(false).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_instructors_slug").on(table.slug),
    index("idx_instructors_user").on(table.userId),
  ]
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 500 }).notNull(),
    categoryId: uuid("category_id")
      .references(() => categories.id, { onDelete: "restrict" })
      .notNull(),
    instructorId: uuid("instructor_id")
      .references(() => instructors.id, { onDelete: "restrict" })
      .notNull(),
    summary: text("summary").default("").notNull(),
    description: text("description").default("").notNull(),
    audience: jsonb("audience").$type<string[]>().default([]).notNull(),
    prerequisites: jsonb("prerequisites").$type<string[]>().default([]).notNull(),
    syllabus: jsonb("syllabus")
      .$type<{ id: string; title: string; durationMin: number; free: boolean }[]>()
      .default([])
      .notNull(),
    durationText: varchar("duration_text", { length: 100 }).default("به‌زودی").notNull(),
    mode: varchar("mode", { length: 20 }).default("hybrid").notNull(),
    price: integer("price").default(0).notNull(),
    discountPrice: integer("discount_price"),
    rating: integer("rating").default(0).notNull(),
    ratingCount: integer("rating_count").default(0).notNull(),
    studentsCount: integer("students_count").default(0).notNull(),
    accent: varchar("accent", { length: 50 }).default("teal").notNull(),
    bundle: varchar("bundle", { length: 20 }).default("basic").notNull(),
    includes: jsonb("includes").$type<string[]>().default([]).notNull(),
    hasSampleVideo: boolean("has_sample_video").default(false).notNull(),
    files: jsonb("files")
      .$type<{ name: string; size: string; type: string }[]>()
      .default([])
      .notNull(),
    published: boolean("published").default(false).notNull(),
    featured: boolean("featured").default(false).notNull(),
    popular: boolean("popular").default(false).notNull(),
    packagePrices: jsonb("package_prices")
      .$type<{ tier: string; price: number; features: string[] }[]>()
      .default([]),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    status: varchar("status", { length: 20 }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_courses_slug").on(table.slug),
    index("idx_courses_category").on(table.categoryId),
    index("idx_courses_instructor").on(table.instructorId),
    index("idx_courses_published").on(table.published),
    index("idx_courses_featured").on(table.featured),
    index("idx_courses_author").on(table.authorId),
  ]
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 500 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    description: text("description").default("").notNull(),
    price: integer("price").default(0).notNull(),
    accent: varchar("accent", { length: 50 }).default("teal").notNull(),
    published: boolean("published").default(false).notNull(),
    featured: boolean("featured").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_products_slug").on(table.slug)]
);

export const workshops = pgTable(
  "workshops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 500 }).notNull(),
    instructorId: uuid("instructor_id")
      .references(() => instructors.id, { onDelete: "restrict" })
      .notNull(),
    topic: varchar("topic", { length: 255 }).notNull(),
    date: varchar("date", { length: 50 }).notNull(),
    time: varchar("time", { length: 50 }).notNull(),
    capacity: integer("capacity").default(0).notNull(),
    registeredCount: integer("registered_count").default(0).notNull(),
    price: integer("price").default(0).notNull(),
    description: text("description").default("").notNull(),
    agenda: jsonb("agenda").$type<string[]>().default([]).notNull(),
    free: boolean("free").default(false).notNull(),
    expertTalk: boolean("expert_talk").default(false).notNull(),
    published: boolean("published").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_workshops_slug").on(table.slug)]
);

// ── Articles ─────────────────────────────────────────────────────────────────

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 500 }).notNull(),
    subtitle: varchar("subtitle", { length: 500 }),
    category: varchar("category", { length: 255 }).default("عمومی").notNull(),
    tags: jsonb("tags").$type<string[]>(),
    excerpt: text("excerpt").default("").notNull(),
    body: text("body").default("").notNull(),
    authorName: varchar("author_name", { length: 255 }).default("تیم NIBRC").notNull(),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    featuredImage: text("featured_image"),
    accent: varchar("accent", { length: 50 }).default("teal").notNull(),
    readTime: integer("read_time").default(5).notNull(),
    level: varchar("level", { length: 20 }),
    status: varchar("status", { length: 20 }).default("draft"),
    scheduledAt: bigint("scheduled_at", { mode: "number" }),
    published: boolean("published").default(false).notNull(),
    featured: boolean("featured").default(false).notNull(),
    seoTitle: varchar("seo_title", { length: 500 }),
    seoDescription: text("seo_description"),
    seoKeywords: jsonb("seo_keywords").$type<string[]>(),
    seoCanonical: text("seo_canonical"),
    ogTitle: varchar("og_title", { length: 500 }),
    ogDescription: text("og_description"),
    ogImage: text("og_image"),
    references: jsonb("references").$type<
      { title: string; authors: string; journal: string; year: number; doi?: string; url?: string }[]
    >(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    uniqueIndex("idx_articles_slug").on(table.slug),
    index("idx_articles_status").on(table.status),
    index("idx_articles_author").on(table.authorId),
  ]
);

export const articleVersions = pgTable(
  "article_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .references(() => articles.id, { onDelete: "cascade" })
      .notNull(),
    body: text("body").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    savedBy: uuid("saved_by")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("idx_article_versions_article").on(table.articleId)]
);

// ── Dictionary ───────────────────────────────────────────────────────────────

export const dictionaryTerms = pgTable(
  "dictionary_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    term: varchar("term", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 500 }).notNull(),
    gramStatus: varchar("gram_status", { length: 100 }).default("").notNull(),
    shape: varchar("shape", { length: 100 }).default("").notNull(),
    oxygen: varchar("oxygen", { length: 100 }).default("").notNull(),
    habitat: varchar("habitat", { length: 255 }).default("").notNull(),
    diseases: jsonb("diseases").$type<string[]>().default([]).notNull(),
    virulence: jsonb("virulence").$type<string[]>().default([]).notNull(),
    diagnosis: text("diagnosis").default("").notNull(),
    characteristics: jsonb("characteristics").$type<string[]>().default([]).notNull(),
    examNotes: jsonb("exam_notes").$type<string[]>().default([]).notNull(),
    sources: jsonb("sources").$type<string[]>().default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_dict_slug").on(table.slug),
    index("idx_dict_term").on(table.term),
  ]
);

// ── Assessment ───────────────────────────────────────────────────────────────

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    text: text("text").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation").default("").notNull(),
    topicId: uuid("topic_id")
      .references(() => categories.id, { onDelete: "restrict" })
      .notNull(),
    difficulty: integer("difficulty").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_questions_topic").on(table.topicId)]
);

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 500 }).notNull(),
    description: text("description").default("").notNull(),
    durationMinutes: integer("duration_minutes").default(30).notNull(),
    questionIds: jsonb("question_ids").$type<string[]>().default([]).notNull(),
    free: boolean("free").default(false).notNull(),
    published: boolean("published").default(false).notNull(),
    featured: boolean("featured").default(false).notNull(),
    diagnostic: boolean("diagnostic").default(false).notNull(),
    accent: varchar("accent", { length: 50 }).default("teal").notNull(),
    "order": integer("order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_exams_slug").on(table.slug)]
);

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    examId: uuid("exam_id")
      .references(() => exams.id, { onDelete: "cascade" })
      .notNull(),
    answers: jsonb("answers").$type<{ questionId: string; chosenIndex: number }[]>().default([]).notNull(),
    score: integer("score").default(0).notNull(),
    total: integer("total").default(0).notNull(),
    percent: integer("percent").default(0).notNull(),
    topicBreakdown: jsonb("topic_breakdown")
      .$type<{ topicId: string; topicName: string; correct: number; total: number; percent: number }[]>()
      .default([])
      .notNull(),
    startedAt: bigint("started_at", { mode: "number" }).notNull(),
    finishedAt: bigint("finished_at", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_exam_attempts_user").on(table.userId),
    index("idx_exam_attempts_exam").on(table.examId),
  ]
);

export const examReports = pgTable(
  "exam_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    examId: uuid("exam_id")
      .references(() => exams.id, { onDelete: "cascade" })
      .notNull(),
    questionId: uuid("question_id")
      .references(() => questions.id, { onDelete: "cascade" })
      .notNull(),
    comment: text("comment").default("").notNull(),
    status: varchar("status", { length: 20 }).default("open").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_exam_reports_status").on(table.status),
    index("idx_exam_reports_user").on(table.userId),
    index("idx_exam_reports_exam").on(table.examId),
  ]
);

export const dailyQuiz = pgTable(
  "daily_quiz",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: varchar("date", { length: 10 }).notNull(),
    questionId: uuid("question_id")
      .references(() => questions.id, { onDelete: "cascade" })
      .notNull(),
    points: integer("points").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_daily_quiz_date").on(table.date)]
);

export const dailyQuizAnswers = pgTable(
  "daily_quiz_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    date: varchar("date", { length: 10 }).notNull(),
    questionId: uuid("question_id")
      .references(() => questions.id, { onDelete: "cascade" })
      .notNull(),
    chosenIndex: integer("chosen_index").notNull(),
    correct: boolean("correct").default(false).notNull(),
    points: integer("points").default(0).notNull(),
    answeredAt: bigint("answered_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_dqa_user").on(table.userId),
    index("idx_dqa_date").on(table.date),
  ]
);

// ── Commerce ─────────────────────────────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    items: jsonb("items")
      .$type<{ type: string; refId: string; title: string; price: number }[]>()
      .default([])
      .notNull(),
    subtotal: integer("subtotal").default(0).notNull(),
    discountAmount: integer("discount_amount").default(0).notNull(),
    total: integer("total").default(0).notNull(),
    couponCode: varchar("coupon_code", { length: 100 }),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_orders_user").on(table.userId),
    index("idx_orders_status").on(table.status),
    index("idx_orders_created").on(table.createdAt),
  ]
);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 100 }).notNull(),
    percent: integer("percent").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    maxUses: integer("max_uses").default(0).notNull(),
    usedCount: integer("used_count").default(0).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_coupons_code").on(table.code)]
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    courseId: uuid("course_id")
      .references(() => courses.id, { onDelete: "cascade" })
      .notNull(),
    completedLessons: jsonb("completed_lessons").$type<string[]>().default([]).notNull(),
    enrolledAt: bigint("enrolled_at", { mode: "number" }).notNull(),
    lastActiveAt: bigint("last_active_at", { mode: "number" }),
  },
  (table) => [
    index("idx_enrollments_user").on(table.userId),
    index("idx_enrollments_course").on(table.courseId),
  ]
);

export const offlinePayments = pgTable(
  "offline_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    courseId: uuid("course_id")
      .references(() => courses.id, { onDelete: "cascade" })
      .notNull(),
    tier: varchar("tier", { length: 20 }).notNull(),
    amount: integer("amount").default(0).notNull(),
    trackingNumber: varchar("tracking_number", { length: 255 }).notNull(),
    receiptStorageId: text("receipt_storage_id").notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    note: text("note"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_offline_payments_user").on(table.userId),
    index("idx_offline_payments_status").on(table.status),
    index("idx_offline_payments_course").on(table.courseId),
  ]
);

export const classEnrollRequests = pgTable(
  "class_enroll_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    roomId: uuid("room_id")
      .references(() => classRooms.id, { onDelete: "cascade" })
      .notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_cer_room").on(table.roomId),
    index("idx_cer_user").on(table.userId),
    index("idx_cer_status").on(table.status),
  ]
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    contentType: varchar("content_type", { length: 50 }).notNull(),
    contentId: varchar("content_id", { length: 255 }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("idx_bookmarks_user").on(table.userId)]
);

export const flashcards = pgTable(
  "flashcards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    front: text("front").notNull(),
    back: text("back").notNull(),
    category: varchar("category", { length: 255 }).default("عمومی").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("idx_flashcards_user").on(table.userId)]
);

// ── Live Collaboration ───────────────────────────────────────────────────────

export const presence = pgTable(
  "presence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }),
    role: varchar("role", { length: 50 }),
    location: varchar("location", { length: 255 }),
    lastSeen: bigint("last_seen", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_presence_user").on(table.userId),
    index("idx_presence_last_seen").on(table.lastSeen),
  ]
);

export const classRooms = pgTable(
  "class_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instructorId: uuid("instructor_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    instructorName: varchar("instructor_name", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    topic: varchar("topic", { length: 500 }).default("").notNull(),
    description: text("description").default("").notNull(),
    status: varchar("status", { length: 20 }).default("scheduled").notNull(),
    broadcasting: boolean("broadcasting").default(false).notNull(),
    broadcastKind: varchar("broadcast_kind", { length: 20 }),
    boardBg: varchar("board_bg", { length: 50 }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    platformUrl: text("platform_url"),
    scheduledDate: varchar("scheduled_date", { length: 50 }),
  },
  (table) => [
    index("idx_class_rooms_instructor").on(table.instructorId),
    index("idx_class_rooms_status").on(table.status),
  ]
);

export const classRequests = pgTable(
  "class_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instructorId: uuid("instructor_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    instructorName: varchar("instructor_name", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    topic: varchar("topic", { length: 500 }).notNull(),
    description: text("description").default("").notNull(),
    proposedDate: varchar("proposed_date", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: bigint("reviewed_at", { mode: "number" }),
    platformUrl: text("platform_url"),
  },
  (table) => [
    index("idx_class_requests_instructor").on(table.instructorId),
    index("idx_class_requests_status").on(table.status),
  ]
);

export const whiteboardStrokes = pgTable(
  "whiteboard_strokes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .references(() => classRooms.id, { onDelete: "cascade" })
      .notNull(),
    layer: varchar("layer", { length: 20 }).notNull(),
    tool: varchar("tool", { length: 20 }).notNull(),
    color: varchar("color", { length: 50 }).notNull(),
    size: integer("size").notNull(),
    points: jsonb("points").$type<{ x: number; y: number }[]>().notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_wb_strokes_room_layer").on(table.roomId, table.layer),
    index("idx_wb_strokes_room_layer_created").on(table.roomId, table.layer, table.createdAt),
  ]
);

export const roomMessages = pgTable(
  "room_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .references(() => classRooms.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }),
    type: varchar("type", { length: 20 }).default("message").notNull(),
    text: text("text").default("").notNull(),
    answer: text("answer"),
    attachmentType: varchar("attachment_type", { length: 20 }),
    attachmentName: varchar("attachment_name", { length: 255 }),
    attachmentStorageId: text("attachment_storage_id"),
    attachmentSize: bigint("attachment_size", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_room_messages_room").on(table.roomId),
    index("idx_room_messages_room_created").on(table.roomId, table.createdAt),
  ]
);

export const signals = pgTable(
  "signals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .references(() => classRooms.id, { onDelete: "cascade" })
      .notNull(),
    from: uuid("from_user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    to: uuid("to_user_id").references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(),
    data: text("data").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("idx_signals_room").on(table.roomId)]
);

// ── Mentoring ────────────────────────────────────────────────────────────────

export const mentorGroups = pgTable(
  "mentor_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mentorId: uuid("mentor_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    mentorName: varchar("mentor_name", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description").default("").notNull(),
    meetingDay: varchar("meeting_day", { length: 50 }).notNull(),
    meetingTime: varchar("meeting_time", { length: 50 }).notNull(),
    capacity: integer("capacity").default(10).notNull(),
    memberCount: integer("member_count").default(0).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_mentor_groups_mentor").on(table.mentorId),
    index("idx_mentor_groups_created").on(table.createdAt),
  ]
);

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .references(() => mentorGroups.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    userName: varchar("user_name", { length: 255 }).notNull(),
    joinedAt: bigint("joined_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_group_members_group").on(table.groupId),
    index("idx_group_members_user").on(table.userId),
    uniqueIndex("idx_group_members_group_user").on(table.groupId, table.userId),
  ]
);

export const groupAnnouncements = pgTable(
  "group_announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .references(() => mentorGroups.id, { onDelete: "cascade" })
      .notNull(),
    mentorId: uuid("mentor_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    mentorName: varchar("mentor_name", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    message: text("message").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("idx_group_announcements_group").on(table.groupId)]
);

export const mentorQuestions = pgTable(
  "mentor_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    studentName: varchar("student_name", { length: 255 }).notNull(),
    topic: varchar("topic", { length: 255 }).default("عمومی").notNull(),
    text: text("text").notNull(),
    status: varchar("status", { length: 20 }).default("open").notNull(),
    answer: text("answer"),
    answeredByName: varchar("answered_by_name", { length: 255 }),
    answeredAt: bigint("answered_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_mentor_questions_student").on(table.studentId),
    index("idx_mentor_questions_status").on(table.status),
    index("idx_mentor_questions_created").on(table.createdAt),
  ]
);

export const mentorSessions = pgTable(
  "mentor_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mentorId: uuid("mentor_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    mentorName: varchar("mentor_name", { length: 255 }).notNull(),
    studentId: uuid("student_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    date: varchar("date", { length: 50 }).notNull(),
    time: varchar("time", { length: 50 }).notNull(),
    notes: text("notes").default("").notNull(),
    status: varchar("status", { length: 20 }).default("scheduled").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_mentor_sessions_mentor").on(table.mentorId),
    index("idx_mentor_sessions_student").on(table.studentId),
    index("idx_mentor_sessions_created").on(table.createdAt),
  ]
);

// ── Support ──────────────────────────────────────────────────────────────────

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    status: varchar("status", { length: 20 }).default("open").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    messages: jsonb("messages")
      .$type<{ author: string; text: string; at: number }[]>()
      .default([])
      .notNull(),
  },
  (table) => [
    index("idx_tickets_user").on(table.userId),
    index("idx_tickets_status").on(table.status),
  ]
);

// ── Comments ─────────────────────────────────────────────────────────────────

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentType: varchar("content_type", { length: 50 }).notNull(),
    contentId: varchar("content_id", { length: 255 }).notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    userName: varchar("user_name", { length: 255 }),
    text: text("text").notNull(),
    approved: boolean("approved").default(false).notNull(),
    rejected: boolean("rejected"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_comments_content").on(table.contentType, table.contentId),
    index("idx_comments_user").on(table.userId),
    index("idx_comments_approved").on(table.approved),
  ]
);

// ── Course Resources ─────────────────────────────────────────────────────────

export const courseResources = pgTable(
  "course_resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .references(() => courses.id, { onDelete: "cascade" })
      .notNull(),
    instructorId: uuid("instructor_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    fileType: varchar("file_type", { length: 100 }).notNull(),
    isFree: boolean("is_free").default(false).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("idx_course_resources_course").on(table.courseId)]
);

// ── Attendance ───────────────────────────────────────────────────────────────

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .references(() => classRooms.id, { onDelete: "cascade" })
      .notNull(),
    instructorId: uuid("instructor_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    studentId: uuid("student_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    studentName: varchar("student_name", { length: 255 }).notNull(),
    present: boolean("present").default(false).notNull(),
    note: text("note"),
    markedAt: bigint("marked_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_attendance_room").on(table.roomId),
    index("idx_attendance_student").on(table.studentId),
  ]
);

// ── Instructor Payments ──────────────────────────────────────────────────────

export const instructorPayments = pgTable(
  "instructor_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instructorId: uuid("instructor_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    amount: integer("amount").default(0).notNull(),
    description: text("description").notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    receiptUrl: text("receipt_url"),
    paidAt: bigint("paid_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("idx_instructor_payments_instructor").on(table.instructorId)]
);

// ── Direct Messages ──────────────────────────────────────────────────────────

export const directMessages = pgTable(
  "direct_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderId: uuid("sender_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    receiverId: uuid("receiver_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    text: text("text").notNull(),
    read: boolean("read").default(false).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_dm_receiver_read").on(table.receiverId, table.read),
    index("idx_dm_sender").on(table.senderId),
  ]
);

// ── Notifications ────────────────────────────────────────────────────────────

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    kind: varchar("kind", { length: 50 }).notNull(),
    refId: varchar("ref_id", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    body: text("body").notNull(),
    link: varchar("link", { length: 500 }).notNull(),
    shownCount: integer("shown_count").default(0).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_reminders_user").on(table.userId),
    index("idx_reminders_user_kind").on(table.userId, table.kind),
  ]
);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    authorName: varchar("author_name", { length: 255 }).notNull(),
    authorRole: varchar("author_role", { length: 50 }).notNull(),
    targetType: varchar("target_type", { length: 20 }).default("all").notNull(),
    targetId: varchar("target_id", { length: 255 }),
    targetTitle: varchar("target_title", { length: 500 }),
    title: varchar("title", { length: 500 }).notNull(),
    body: text("body").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_announcements_created").on(table.createdAt),
    index("idx_announcements_author").on(table.authorId),
  ]
);

export const inboxMessages = pgTable(
  "inbox_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    body: text("body").notNull(),
    readAt: bigint("read_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_inbox_user").on(table.userId),
    index("idx_inbox_created").on(table.createdAt),
  ]
);

// ── Media / Storage ──────────────────────────────────────────────────────────

export const mediaItems = pgTable(
  "media_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull(),
    name: varchar("name", { length: 500 }).notNull(),
    alt: varchar("alt", { length: 500 }),
    caption: varchar("caption", { length: 500 }),
    category: varchar("category", { length: 100 }),
    size: bigint("size", { mode: "number" }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    uploadedBy: uuid("uploaded_by")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("idx_media_uploader").on(table.uploadedBy)]
);

// ── AI System ────────────────────────────────────────────────────────────────

export const aiModels = pgTable("ai_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 100 }).notNull(),
  model: varchar("model", { length: 255 }).notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key").notNull(),
  isFree: boolean("is_free").default(true).notNull(),
  dailyLimit: integer("daily_limit").default(50).notNull(),
  pricePerMessage: integer("price_per_message").default(0).notNull(),
  description: text("description").default("").notNull(),
  systemPrompt: text("system_prompt"),
  maxTokens: integer("max_tokens").default(2048).notNull(),
  temperature: integer("temperature").default(70).notNull(),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const aiPrompts = pgTable(
  "ai_prompts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    content: text("content").notNull(),
    category: varchar("category", { length: 100 }).default("general").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdBy: uuid("created_by")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("idx_ai_prompts_category").on(table.category)]
);

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 500 }).default("گفتگوی جدید").notNull(),
    promptId: uuid("prompt_id").references(() => aiPrompts.id, { onDelete: "set null" }),
    modelId: uuid("model_id").references(() => aiModels.id, { onDelete: "set null" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [index("idx_ai_conversations_user").on(table.userId)]
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .references(() => aiConversations.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content").notNull(),
    tokensUsed: integer("tokens_used").default(0).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("idx_ai_messages_conversation").on(table.conversationId)]
);

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    date: varchar("date", { length: 10 }).notNull(),
    messagesSent: integer("messages_sent").default(0).notNull(),
    tokensUsed: integer("tokens_used").default(0).notNull(),
  },
  (table) => [
    uniqueIndex("idx_ai_usage_user_date").on(table.userId, table.date),
  ]
);

export const aiTokenQuotas = pgTable(
  "ai_token_quotas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    dailyLimit: integer("daily_limit").default(50).notNull(),
    extraTokens: integer("extra_tokens").default(0).notNull(),
    grantedAt: bigint("granted_at", { mode: "number" }).notNull(),
    grantedBy: uuid("granted_by")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    note: text("note"),
  },
  (table) => [index("idx_ai_token_quotas_user").on(table.userId)]
);

// ── Telegram ─────────────────────────────────────────────────────────────────

export const telegramBot = pgTable("telegram_bot", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenEncrypted: text("token_encrypted").notNull(),
  botId: varchar("bot_id", { length: 50 }),
  botName: varchar("bot_name", { length: 255 }),
  botUsername: varchar("bot_username", { length: 255 }),
  webhookUrl: text("webhook_url"),
  connected: boolean("connected").default(false).notNull(),
  active: boolean("active").default(false).notNull(),
  startMessage: text("start_message").default("خوش آمدید!").notNull(),
  lastTestedAt: bigint("last_tested_at", { mode: "number" }),
  lastTestResult: text("last_test_result"),
  commands: jsonb("commands").$type<{ command: string; description: string }[]>(),
  commandsSyncedAt: bigint("commands_synced_at", { mode: "number" }),
  updatedBy: uuid("updated_by")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const telegramLinkingCodes = pgTable(
  "telegram_linking_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    usedAt: bigint("used_at", { mode: "number" }),
    telegramId: bigint("telegram_id", { mode: "number" }),
  },
  (table) => [
    index("idx_telegram_linking_code").on(table.code),
    index("idx_telegram_linking_user").on(table.userId),
  ]
);

export const telegramNotifPrefs = pgTable(
  "telegram_notif_prefs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    mentorReplies: boolean("mentor_replies").default(true).notNull(),
    tasks: boolean("tasks").default(true).notNull(),
    deadlines: boolean("deadlines").default(true).notNull(),
    meetings: boolean("meetings").default(true).notNull(),
    groupNotifs: boolean("group_notifs").default(true).notNull(),
    articles: boolean("articles").default(true).notNull(),
    system: boolean("system").default(true).notNull(),
  },
  (table) => [index("idx_telegram_notif_prefs_user").on(table.userId)]
);

export const telegramNotifLog = pgTable(
  "telegram_notif_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 100 }).notNull(),
    key: varchar("key", { length: 255 }).notNull(),
    sentAt: bigint("sent_at", { mode: "number" }).notNull(),
    success: boolean("success").default(true).notNull(),
  },
  (table) => [
    uniqueIndex("idx_telegram_notif_log_key").on(table.key),
    index("idx_telegram_notif_log_user_type").on(table.userId, table.type),
  ]
);

// ── Site Content ─────────────────────────────────────────────────────────────

export const sitePages = pgTable(
  "site_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    htmlContent: text("html_content").notNull(),
    createdBy: uuid("created_by")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [uniqueIndex("idx_site_pages_slug").on(table.slug)]
);

export const siteTexts = pgTable(
  "site_texts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 255 }).notNull(),
    value: text("value").notNull(),
    updatedBy: uuid("updated_by")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [uniqueIndex("idx_site_texts_key").on(table.key)]
);

// ── Testimonials ─────────────────────────────────────────────────────────────

export const testimonials = pgTable("testimonials", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }).notNull(),
  text: text("text").notNull(),
  rating: integer("rating").default(5).notNull(),
  course: varchar("course", { length: 255 }).notNull(),
  accent: varchar("accent", { length: 50 }).default("teal").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
