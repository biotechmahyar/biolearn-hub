import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  real,
} from "drizzle-orm/pg-core";

// ── Auth ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }),
    passwordHash: varchar("password_hash", { length: 255 }),
    role: varchar("role", { length: 50 }).default("user"),
    secondaryRole: varchar("secondary_role", { length: 50 }),
    university: varchar("university", { length: 255 }),
    major: varchar("major", { length: 255 }),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    avatarUrl: varchar("avatar_url", { length: 1024 }),
    about: text("about"),
    suggestedCourseIds: jsonb("suggested_course_ids").$type<string[]>().default([]),
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
    telegramNotificationsEnabled: boolean("telegram_notifications_enabled").default(false),
    bankName: varchar("bank_name", { length: 255 }),
    bankAccountNumber: varchar("bank_account_number", { length: 255 }),
    bankCardNumber: varchar("bank_card_number", { length: 255 }),
    bankSheba: varchar("bank_sheba", { length: 255 }),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_users_email").on(t.email),
    index("idx_users_role").on(t.role),
    uniqueIndex("idx_users_telegram_id").on(t.telegramId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    token: varchar("token", { length: 512 }).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [index("idx_sessions_user_id").on(t.userId)],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    token: varchar("token", { length: 512 }).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [index("idx_refresh_tokens_user_id").on(t.userId)],
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    code: varchar("code", { length: 10 }).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    used: boolean("used").default(false),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [index("idx_otp_codes_email").on(t.email)],
);

export const authRateLimits = pgTable(
  "auth_rate_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    attempts: integer("attempts").default(0),
    expireAt: bigint("expire_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_auth_rate_limits_identifier").on(t.identifier)],
);

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
  },
  (t) => [uniqueIndex("idx_admins_email").on(t.email)],
);

export const superAdminSessions = pgTable(
  "super_admin_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_super_admin_sessions_user_id").on(t.userId)],
);

// ── Catalog ─────────────────────────────────────────────────────────────────

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description").default(""),
    icon: varchar("icon", { length: 100 }).default("Dna"),
    accent: varchar("accent", { length: 50 }).default("teal"),
    order: integer("order").default(0),
  },
  (t) => [uniqueIndex("idx_categories_slug").on(t.slug)],
);

export const instructors = pgTable(
  "instructors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }).default(""),
    bio: text("bio").default(""),
    education: jsonb("education").$type<string[]>().default([]),
    specialties: jsonb("specialties").$type<string[]>().default([]),
    accent: varchar("accent", { length: 50 }).default("teal"),
    verified: boolean("verified").default(false),
    userId: uuid("user_id").references(() => users.id),
  },
  (t) => [
    uniqueIndex("idx_instructors_slug").on(t.slug),
    index("idx_instructors_user_id").on(t.userId),
  ],
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    categoryId: uuid("category_id")
      .references(() => categories.id)
      .notNull(),
    instructorId: uuid("instructor_id")
      .references(() => instructors.id)
      .notNull(),
    summary: text("summary").default(""),
    description: text("description").default(""),
    audience: jsonb("audience").$type<string[]>().default([]),
    prerequisites: jsonb("prerequisites").$type<string[]>().default([]),
    syllabus: jsonb("syllabus")
      .$type<{ id: string; title: string; durationMin: number; free: boolean }[]>()
      .default([]),
    durationText: varchar("duration_text", { length: 100 }).default(""),
    mode: varchar("mode", { length: 20 }).default("recorded"),
    price: integer("price").default(0),
    discountPrice: integer("discount_price"),
    rating: real("rating").default(0),
    ratingCount: integer("rating_count").default(0),
    studentsCount: integer("students_count").default(0),
    accent: varchar("accent", { length: 50 }).default("teal"),
    bundle: varchar("bundle", { length: 20 }).default("economy"),
    includes: jsonb("includes").$type<string[]>().default([]),
    hasSampleVideo: boolean("has_sample_video").default(false),
    files: jsonb("files")
      .$type<{ name: string; size: string; type: string }[]>()
      .default([]),
    published: boolean("published").default(false),
    featured: boolean("featured").default(false),
    popular: boolean("popular").default(false),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
    packagePrices: jsonb("package_prices")
      .$type<{ tier: string; price: number; features: string[] }[]>()
      .default([]),
    authorId: uuid("author_id").references(() => users.id),
    status: varchar("status", { length: 20 }),
    reviewNote: text("review_note"),
  },
  (t) => [
    uniqueIndex("idx_courses_slug").on(t.slug),
    index("idx_courses_category_id").on(t.categoryId),
    index("idx_courses_published").on(t.published),
    index("idx_courses_featured").on(t.featured),
    index("idx_courses_author_id").on(t.authorId),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).default("flashcards"),
    description: text("description").default(""),
    price: integer("price").default(0),
    accent: varchar("accent", { length: 50 }).default("teal"),
    published: boolean("published").default(false),
    featured: boolean("featured").default(false),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [uniqueIndex("idx_products_slug").on(t.slug)],
);

export const workshops = pgTable(
  "workshops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    instructorId: uuid("instructor_id")
      .references(() => instructors.id)
      .notNull(),
    topic: varchar("topic", { length: 500 }).default(""),
    date: varchar("date", { length: 50 }).default(""),
    time: varchar("time", { length: 50 }).default(""),
    capacity: integer("capacity").default(0),
    registeredCount: integer("registered_count").default(0),
    price: integer("price").default(0),
    description: text("description").default(""),
    agenda: jsonb("agenda").$type<string[]>().default([]),
    free: boolean("free").default(false),
    expertTalk: boolean("expert_talk").default(false),
    published: boolean("published").default(false),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [uniqueIndex("idx_workshops_slug").on(t.slug)],
);

// ── Articles ────────────────────────────────────────────────────────────────

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    subtitle: varchar("subtitle", { length: 500 }),
    category: varchar("category", { length: 255 }).default(""),
    tags: jsonb("tags").$type<string[]>().default([]),
    excerpt: text("excerpt").default(""),
    body: text("body").default(""),
    authorName: varchar("author_name", { length: 255 }).default(""),
    authorId: uuid("author_id").references(() => users.id),
    featuredImage: varchar("featured_image", { length: 1024 }),
    accent: varchar("accent", { length: 50 }).default("teal"),
    readTime: integer("read_time").default(5),
    level: varchar("level", { length: 20 }),
    status: varchar("status", { length: 20 }).default("draft"),
    scheduledAt: bigint("scheduled_at", { mode: "number" }),
    published: boolean("published").default(false),
    featured: boolean("featured").default(false),
    seoTitle: varchar("seo_title", { length: 500 }),
    seoDescription: text("seo_description"),
    seoKeywords: jsonb("seo_keywords").$type<string[]>().default([]),
    seoCanonical: varchar("seo_canonical", { length: 1024 }),
    ogTitle: varchar("og_title", { length: 500 }),
    ogDescription: text("og_description"),
    ogImage: varchar("og_image", { length: 1024 }),
    references_: jsonb("references")
      .$type<{ title: string; authors: string; journal: string; year: number; doi?: string; url?: string }[]>()
      .default([]),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
    updatedAt: bigint("updated_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    uniqueIndex("idx_articles_slug").on(t.slug),
    index("idx_articles_status").on(t.status),
    index("idx_articles_author_id").on(t.authorId),
  ],
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
      .references(() => users.id)
      .notNull(),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [index("idx_article_versions_article_id").on(t.articleId)],
);

// ── Dictionary ──────────────────────────────────────────────────────────────

export const dictionaryTerms = pgTable(
  "dictionary_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    term: varchar("term", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 500 }).default(""),
    gramStatus: varchar("gram_status", { length: 255 }).default(""),
    shape: varchar("shape", { length: 255 }).default(""),
    oxygen: varchar("oxygen", { length: 255 }).default(""),
    habitat: varchar("habitat", { length: 255 }).default(""),
    diseases: jsonb("diseases").$type<string[]>().default([]),
    virulence: jsonb("virulence").$type<string[]>().default([]),
    diagnosis: text("diagnosis").default(""),
    characteristics: jsonb("characteristics").$type<string[]>().default([]),
    examNotes: jsonb("exam_notes").$type<string[]>().default([]),
    sources: jsonb("sources").$type<string[]>().default([]),
  },
  (t) => [
    uniqueIndex("idx_dict_slug").on(t.slug),
    index("idx_dict_term").on(t.term),
  ],
);

// ── Assessment ──────────────────────────────────────────────────────────────

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    text: text("text").notNull(),
    options: jsonb("options").$type<string[]>().default([]),
    correctIndex: integer("correct_index").default(0),
    explanation: text("explanation").default(""),
    topicId: uuid("topic_id")
      .references(() => categories.id)
      .notNull(),
    difficulty: integer("difficulty").default(1),
  },
  (t) => [index("idx_questions_topic_id").on(t.topicId)],
);

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description").default(""),
    durationMinutes: integer("duration_minutes").default(30),
    questionIds: jsonb("question_ids").$type<string[]>().default([]),
    free: boolean("free").default(false),
    published: boolean("published").default(false),
    featured: boolean("featured").default(false),
    diagnostic: boolean("diagnostic").default(false),
    accent: varchar("accent", { length: 50 }).default("teal"),
    order: integer("order").default(0),
  },
  (t) => [uniqueIndex("idx_exams_slug").on(t.slug)],
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
    comment: text("comment").default(""),
    status: varchar("status", { length: 20 }).default("open"),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_exam_reports_status").on(t.status),
    index("idx_exam_reports_user_id").on(t.userId),
    index("idx_exam_reports_exam_id").on(t.examId),
  ],
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
    answers: jsonb("answers")
      .$type<{ questionId: string; chosenIndex: number }[]>()
      .default([]),
    score: integer("score").default(0),
    total: integer("total").default(0),
    percent: integer("percent").default(0),
    topicBreakdown: jsonb("topic_breakdown")
      .$type<{ topicId: string; topicName: string; correct: number; total: number; percent: number }[]>()
      .default([]),
    startedAt: bigint("started_at", { mode: "number" }),
    finishedAt: bigint("finished_at", { mode: "number" }),
  },
  (t) => [
    index("idx_exam_attempts_user_id").on(t.userId),
    index("idx_exam_attempts_exam_id").on(t.examId),
  ],
);

export const dailyQuiz = pgTable(
  "daily_quiz",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: varchar("date", { length: 10 }).notNull(),
    questionId: uuid("question_id")
      .references(() => questions.id, { onDelete: "cascade" })
      .notNull(),
    points: integer("points").default(1),
  },
  (t) => [index("idx_daily_quiz_date").on(t.date)],
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
    chosenIndex: integer("chosen_index").default(0),
    correct: boolean("correct").default(false),
    points: integer("points").default(0),
    answeredAt: bigint("answered_at", { mode: "number" }),
  },
  (t) => [
    index("idx_daily_quiz_answers_user_id").on(t.userId),
    index("idx_daily_quiz_answers_date").on(t.date),
  ],
);

// ── Commerce ────────────────────────────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    items: jsonb("items")
      .$type<{ type: string; refId: string; title: string; price: number }[]>()
      .default([]),
    subtotal: integer("subtotal").default(0),
    discountAmount: integer("discount_amount").default(0),
    total: integer("total").default(0),
    couponCode: varchar("coupon_code", { length: 50 }),
    status: varchar("status", { length: 20 }).default("pending"),
    invoiceNumber: varchar("invoice_number", { length: 50 }),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_orders_user_id").on(t.userId),
    index("idx_orders_status").on(t.status),
    index("idx_orders_created_at").on(t.createdAt),
  ],
);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    percent: integer("percent").default(0),
    active: boolean("active").default(true),
    maxUses: integer("max_uses").default(0),
    usedCount: integer("used_count").default(0),
    expiresAt: bigint("expires_at", { mode: "number" }),
  },
  (t) => [uniqueIndex("idx_coupons_code").on(t.code)],
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
    completedLessons: jsonb("completed_lessons").$type<string[]>().default([]),
    enrolledAt: bigint("enrolled_at", { mode: "number" }).default(Date.now()),
    lastActiveAt: bigint("last_active_at", { mode: "number" }),
  },
  (t) => [
    index("idx_enrollments_user_id").on(t.userId),
    index("idx_enrollments_course_id").on(t.courseId),
  ],
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
    tier: varchar("tier", { length: 20 }).default("basic"),
    amount: integer("amount").default(0),
    trackingNumber: varchar("tracking_number", { length: 100 }).default(""),
    receiptStorageId: varchar("receipt_storage_id", { length: 512 }).default(""),
    status: varchar("status", { length: 20 }).default("pending"),
    note: text("note"),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_offline_payments_user_id").on(t.userId),
    index("idx_offline_payments_status").on(t.status),
    index("idx_offline_payments_course_id").on(t.courseId),
  ],
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
    status: varchar("status", { length: 20 }).default("pending"),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_class_enroll_requests_room_id").on(t.roomId),
    index("idx_class_enroll_requests_user_id").on(t.userId),
    index("idx_class_enroll_requests_status").on(t.status),
  ],
);

// ── Bookmarks & Flashcards ──────────────────────────────────────────────────

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    contentType: varchar("content_type", { length: 50 }).default(""),
    contentId: varchar("content_id", { length: 255 }).default(""),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [index("idx_bookmarks_user_id").on(t.userId)],
);

export const flashcards = pgTable(
  "flashcards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    front: text("front").default(""),
    back: text("back").default(""),
    category: varchar("category", { length: 255 }).default("عمومی"),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [index("idx_flashcards_user_id").on(t.userId)],
);

// ── Live Collaboration ──────────────────────────────────────────────────────

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
    lastSeen: bigint("last_seen", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_presence_user_id").on(t.userId),
    index("idx_presence_last_seen").on(t.lastSeen),
  ],
);

export const classRooms = pgTable(
  "class_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instructorId: uuid("instructor_id")
      .references(() => users.id)
      .notNull(),
    instructorName: varchar("instructor_name", { length: 255 }).default(""),
    title: varchar("title", { length: 500 }).default(""),
    topic: varchar("topic", { length: 500 }).default(""),
    description: text("description").default(""),
    status: varchar("status", { length: 20 }).default("scheduled"),
    broadcasting: boolean("broadcasting").default(false),
    broadcastKind: varchar("broadcast_kind", { length: 20 }),
    boardBg: varchar("board_bg", { length: 50 }),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
    platformUrl: varchar("platform_url", { length: 1024 }),
    scheduledDate: varchar("scheduled_date", { length: 50 }),
  },
  (t) => [
    index("idx_class_rooms_instructor_id").on(t.instructorId),
    index("idx_class_rooms_status").on(t.status),
  ],
);

export const classRequests = pgTable(
  "class_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instructorId: uuid("instructor_id")
      .references(() => users.id)
      .notNull(),
    instructorName: varchar("instructor_name", { length: 255 }).default(""),
    title: varchar("title", { length: 500 }).default(""),
    topic: varchar("topic", { length: 500 }).default(""),
    description: text("description").default(""),
    proposedDate: varchar("proposed_date", { length: 50 }).default(""),
    status: varchar("status", { length: 20 }).default("pending"),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: bigint("reviewed_at", { mode: "number" }),
    platformUrl: varchar("platform_url", { length: 1024 }),
  },
  (t) => [
    index("idx_class_requests_instructor_id").on(t.instructorId),
    index("idx_class_requests_status").on(t.status),
  ],
);

export const whiteboardStrokes = pgTable(
  "whiteboard_strokes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .references(() => classRooms.id, { onDelete: "cascade" })
      .notNull(),
    layer: varchar("layer", { length: 20 }).default("board"),
    tool: varchar("tool", { length: 20 }).default("pen"),
    color: varchar("color", { length: 50 }).default("#000000"),
    size: real("size").default(2),
    points: jsonb("points").$type<{ x: number; y: number }[]>().default([]),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_wb_strokes_room_id").on(t.roomId),
    index("idx_wb_strokes_room_layer").on(t.roomId, t.layer),
  ],
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
    name: varchar("name", { length: 255 }).default(""),
    role: varchar("role", { length: 50 }),
    type: varchar("type", { length: 20 }).default("message"),
    text: text("text").default(""),
    answer: text("answer"),
    attachmentType: varchar("attachment_type", { length: 20 }),
    attachmentName: varchar("attachment_name", { length: 255 }),
    attachmentStorageId: varchar("attachment_storage_id", { length: 512 }),
    attachmentSize: bigint("attachment_size", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_room_messages_room_id").on(t.roomId),
    index("idx_room_messages_room_created").on(t.roomId, t.createdAt),
  ],
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
    to: uuid("to_user_id").references(() => users.id),
    type: varchar("type", { length: 20 }).default("offer"),
    data: text("data").default(""),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [index("idx_signals_room_id").on(t.roomId)],
);

// ── Mentoring ───────────────────────────────────────────────────────────────

export const mentorGroups = pgTable(
  "mentor_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mentorId: uuid("mentor_id")
      .references(() => users.id)
      .notNull(),
    mentorName: varchar("mentor_name", { length: 255 }).default(""),
    title: varchar("title", { length: 500 }).default(""),
    description: text("description").default(""),
    meetingDay: varchar("meeting_day", { length: 50 }).default(""),
    meetingTime: varchar("meeting_time", { length: 50 }).default(""),
    capacity: integer("capacity").default(10),
    memberCount: integer("member_count").default(0),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_mentor_groups_mentor_id").on(t.mentorId),
    index("idx_mentor_groups_created_at").on(t.createdAt),
  ],
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
    userName: varchar("user_name", { length: 255 }).default(""),
    joinedAt: bigint("joined_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_group_members_group_id").on(t.groupId),
    index("idx_group_members_user_id").on(t.userId),
    uniqueIndex("idx_group_members_group_user").on(t.groupId, t.userId),
  ],
);

export const groupAnnouncements = pgTable(
  "group_announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .references(() => mentorGroups.id, { onDelete: "cascade" })
      .notNull(),
    mentorId: uuid("mentor_id")
      .references(() => users.id)
      .notNull(),
    mentorName: varchar("mentor_name", { length: 255 }).default(""),
    title: varchar("title", { length: 500 }).default(""),
    message: text("message").default(""),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [index("idx_group_announcements_group_id").on(t.groupId)],
);

export const mentorQuestions = pgTable(
  "mentor_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    studentName: varchar("student_name", { length: 255 }).default(""),
    topic: varchar("topic", { length: 255 }).default(""),
    text: text("text").default(""),
    status: varchar("status", { length: 20 }).default("open"),
    answer: text("answer"),
    answeredByName: varchar("answered_by_name", { length: 255 }),
    answeredAt: bigint("answered_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_mentor_questions_student_id").on(t.studentId),
    index("idx_mentor_questions_status").on(t.status),
    index("idx_mentor_questions_created_at").on(t.createdAt),
  ],
);

export const mentorSessions = pgTable(
  "mentor_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mentorId: uuid("mentor_id")
      .references(() => users.id)
      .notNull(),
    mentorName: varchar("mentor_name", { length: 255 }).default(""),
    studentId: uuid("student_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 500 }).default(""),
    date: varchar("date", { length: 50 }).default(""),
    time: varchar("time", { length: 50 }).default(""),
    notes: text("notes").default(""),
    status: varchar("status", { length: 20 }).default("scheduled"),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_mentor_sessions_mentor_id").on(t.mentorId),
    index("idx_mentor_sessions_student_id").on(t.studentId),
    index("idx_mentor_sessions_created_at").on(t.createdAt),
  ],
);

// ── Support ─────────────────────────────────────────────────────────────────

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    subject: varchar("subject", { length: 500 }).default(""),
    status: varchar("status", { length: 20 }).default("open"),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
    updatedAt: bigint("updated_at", { mode: "number" }).default(Date.now()),
    messages: jsonb("messages")
      .$type<{ author: string; text: string; at: number }[]>()
      .default([]),
  },
  (t) => [
    index("idx_tickets_user_id").on(t.userId),
    index("idx_tickets_status").on(t.status),
  ],
);

// ── Comments ────────────────────────────────────────────────────────────────

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentType: varchar("content_type", { length: 50 }).default(""),
    contentId: varchar("content_id", { length: 255 }).default(""),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    userName: varchar("user_name", { length: 255 }),
    text: text("text").default(""),
    approved: boolean("approved").default(false),
    rejected: boolean("rejected"),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_comments_content").on(t.contentType, t.contentId),
    index("idx_comments_user_id").on(t.userId),
    index("idx_comments_approved").on(t.approved),
  ],
);

// ── Course Resources ────────────────────────────────────────────────────────

export const courseResources = pgTable(
  "course_resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .references(() => courses.id, { onDelete: "cascade" })
      .notNull(),
    instructorId: uuid("instructor_id")
      .references(() => users.id)
      .notNull(),
    title: varchar("title", { length: 500 }).default(""),
    description: text("description"),
    fileUrl: varchar("file_url", { length: 1024 }).default(""),
    fileName: varchar("file_name", { length: 255 }).default(""),
    fileSize: bigint("file_size", { mode: "number" }).default(0),
    fileType: varchar("file_type", { length: 100 }).default(""),
    isFree: boolean("is_free").default(false),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [index("idx_course_resources_course_id").on(t.courseId)],
);

// ── Attendance ──────────────────────────────────────────────────────────────

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .references(() => classRooms.id, { onDelete: "cascade" })
      .notNull(),
    instructorId: uuid("instructor_id")
      .references(() => users.id)
      .notNull(),
    studentId: uuid("student_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    studentName: varchar("student_name", { length: 255 }).default(""),
    present: boolean("present").default(false),
    note: text("note"),
    markedAt: bigint("marked_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_attendance_room_id").on(t.roomId),
    index("idx_attendance_student_id").on(t.studentId),
  ],
);

// ── Instructor Payments ─────────────────────────────────────────────────────

export const instructorPayments = pgTable(
  "instructor_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instructorId: uuid("instructor_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    amount: integer("amount").default(0),
    description: text("description").default(""),
    status: varchar("status", { length: 20 }).default("pending"),
    receiptUrl: varchar("receipt_url", { length: 1024 }),
    paidAt: bigint("paid_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [index("idx_instructor_payments_instructor_id").on(t.instructorId)],
);

// ── Direct Messages ─────────────────────────────────────────────────────────

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
    text: text("text").default(""),
    read: boolean("read").default(false),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_dm_receiver_read").on(t.receiverId, t.read),
    index("idx_dm_sender_id").on(t.senderId),
  ],
);

// ── Notifications ───────────────────────────────────────────────────────────

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    kind: varchar("kind", { length: 50 }).default("exam_new"),
    refId: varchar("ref_id", { length: 255 }).default(""),
    title: varchar("title", { length: 500 }).default(""),
    body: text("body").default(""),
    link: varchar("link", { length: 500 }).default(""),
    shownCount: integer("shown_count").default(0),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_reminders_user_id").on(t.userId),
    index("idx_reminders_user_kind").on(t.userId, t.kind),
  ],
);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    authorName: varchar("author_name", { length: 255 }).default(""),
    authorRole: varchar("author_role", { length: 50 }).default(""),
    targetType: varchar("target_type", { length: 20 }).default("all"),
    targetId: varchar("target_id", { length: 255 }),
    targetTitle: varchar("target_title", { length: 500 }),
    title: varchar("title", { length: 500 }).default(""),
    body: text("body").default(""),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_announcements_created_at").on(t.createdAt),
    index("idx_announcements_author_id").on(t.authorId),
  ],
);

export const inboxMessages = pgTable(
  "inbox_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 500 }).default(""),
    body: text("body").default(""),
    readAt: bigint("read_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [
    index("idx_inbox_messages_user_id").on(t.userId),
    index("idx_inbox_messages_created_at").on(t.createdAt),
  ],
);

// ── Trust & Community ───────────────────────────────────────────────────────

export const testimonials = pgTable("testimonials", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).default(""),
  role: varchar("role", { length: 255 }).default(""),
  text: text("text").default(""),
  rating: integer("rating").default(5),
  course: varchar("course", { length: 255 }).default(""),
  accent: varchar("accent", { length: 50 }).default("teal"),
});

// ── Site Content ────────────────────────────────────────────────────────────

export const sitePages = pgTable(
  "site_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }).default(""),
    htmlContent: text("html_content").default(""),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [uniqueIndex("idx_site_pages_slug").on(t.slug)],
);

export const siteTexts = pgTable(
  "site_texts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 255 }).notNull(),
    value: text("value").default(""),
    updatedBy: uuid("updated_by")
      .references(() => users.id)
      .notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [uniqueIndex("idx_site_texts_key").on(t.key)],
);

// ── Media Library ───────────────────────────────────────────────────────────

export const mediaItems = pgTable(
  "media_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: varchar("url", { length: 1024 }).default(""),
    name: varchar("name", { length: 255 }).default(""),
    alt: varchar("alt", { length: 500 }),
    caption: varchar("caption", { length: 1000 }),
    category: varchar("category", { length: 100 }),
    size: bigint("size", { mode: "number" }).default(0),
    mimeType: varchar("mime_type", { length: 100 }).default(""),
    uploadedBy: uuid("uploaded_by")
      .references(() => users.id)
      .notNull(),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [index("idx_media_items_uploaded_by").on(t.uploadedBy)],
);

// ── AI System ───────────────────────────────────────────────────────────────

export const aiConfig = pgTable("ai_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: varchar("provider", { length: 100 }).default(""),
  model: varchar("model", { length: 100 }).default(""),
  baseUrl: varchar("base_url", { length: 1024 }).default(""),
  apiKeyEncrypted: varchar("api_key_encrypted", { length: 1024 }).default(""),
  maxTokensPerRequest: integer("max_tokens_per_request").default(4096),
  temperature: real("temperature").default(0.7),
  systemPrompt: text("system_prompt").default(""),
  updatedAt: bigint("updated_at", { mode: "number" }).default(Date.now()),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const aiModels = pgTable("ai_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).default(""),
  provider: varchar("provider", { length: 100 }).default(""),
  model: varchar("model", { length: 100 }).default(""),
  baseUrl: varchar("base_url", { length: 1024 }).default(""),
  apiKey: varchar("api_key", { length: 1024 }).default(""),
  isFree: boolean("is_free").default(true),
  dailyLimit: integer("daily_limit").default(50),
  pricePerMessage: integer("price_per_message").default(0),
  description: text("description").default(""),
  systemPrompt: text("system_prompt"),
  maxTokens: integer("max_tokens").default(4096),
  temperature: real("temperature").default(0.7),
  active: boolean("active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
});

export const aiPrompts = pgTable(
  "ai_prompts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).default(""),
    content: text("content").default(""),
    category: varchar("category", { length: 100 }).default("general"),
    isDefault: boolean("is_default").default(false),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [index("idx_ai_prompts_category").on(t.category)],
);

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 500 }).default(""),
    promptId: uuid("prompt_id").references(() => aiPrompts.id),
    modelId: uuid("model_id").references(() => aiModels.id),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
    updatedAt: bigint("updated_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [index("idx_ai_conversations_user_id").on(t.userId)],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .references(() => aiConversations.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 20 }).default("user"),
    content: text("content").default(""),
    tokensUsed: integer("tokens_used").default(0),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
  },
  (t) => [index("idx_ai_messages_conversation_id").on(t.conversationId)],
);

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    date: varchar("date", { length: 10 }).default(""),
    messagesSent: integer("messages_sent").default(0),
    tokensUsed: integer("tokens_used").default(0),
  },
  (t) => [index("idx_ai_usage_user_date").on(t.userId, t.date)],
);

export const aiTokenQuotas = pgTable(
  "ai_token_quotas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    dailyLimit: integer("daily_limit").default(50),
    extraTokens: integer("extra_tokens").default(0),
    grantedAt: bigint("granted_at", { mode: "number" }).default(Date.now()),
    grantedBy: uuid("granted_by")
      .references(() => users.id)
      .notNull(),
    note: text("note"),
  },
  (t) => [index("idx_ai_token_quotas_user_id").on(t.userId)],
);

// ── Telegram ────────────────────────────────────────────────────────────────

export const telegramBot = pgTable("telegram_bot", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenEncrypted: varchar("token_encrypted", { length: 1024 }).default(""),
  botId: varchar("bot_id", { length: 100 }),
  botName: varchar("bot_name", { length: 255 }),
  botUsername: varchar("bot_username", { length: 255 }),
  webhookUrl: varchar("webhook_url", { length: 1024 }),
  connected: boolean("connected").default(false),
  active: boolean("active").default(false),
  startMessage: text("start_message").default(""),
  lastTestedAt: bigint("last_tested_at", { mode: "number" }),
  lastTestResult: varchar("last_test_result", { length: 255 }),
  commands: jsonb("commands").$type<{ command: string; description: string }[]>().default([]),
  commandsSyncedAt: bigint("commands_synced_at", { mode: "number" }),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: bigint("updated_at", { mode: "number" }).default(Date.now()),
  createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
});

export const telegramLinkingCodes = pgTable(
  "telegram_linking_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    code: varchar("code", { length: 20 }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).default(Date.now()),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    usedAt: bigint("used_at", { mode: "number" }),
    telegramId: bigint("telegram_id", { mode: "number" }),
  },
  (t) => [
    index("idx_telegram_linking_codes_code").on(t.code),
    index("idx_telegram_linking_codes_user_id").on(t.userId),
  ],
);

export const telegramNotifPrefs = pgTable(
  "telegram_notif_prefs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    mentorReplies: boolean("mentor_replies").default(true),
    tasks: boolean("tasks").default(true),
    deadlines: boolean("deadlines").default(true),
    meetings: boolean("meetings").default(true),
    groupNotifs: boolean("group_notifs").default(true),
    articles: boolean("articles").default(true),
    system: boolean("system").default(true),
  },
  (t) => [index("idx_telegram_notif_prefs_user_id").on(t.userId)],
);

export const telegramNotifLog = pgTable(
  "telegram_notif_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 100 }).default(""),
    key: varchar("key", { length: 255 }).default(""),
    sentAt: bigint("sent_at", { mode: "number" }).default(Date.now()),
    success: boolean("success").default(false),
  },
  (t) => [
    uniqueIndex("idx_telegram_notif_log_key").on(t.key),
    index("idx_telegram_notif_log_user_type").on(t.userId, t.type),
  ],
);
