import {
  pgTable,
  uuid,
  text,
  varchar,
  bigint,
  integer,
  boolean,
  real,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Auth & Users ──────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: varchar("email", { length: 255 }),
    passwordHash: text("password_hash"),
    emailVerificationTime: bigint("email_verification_time", { mode: "number" }),
    role: varchar("role", { length: 30 }),
    secondaryRole: varchar("secondary_role", { length: 30 }),
    university: text("university"),
    major: text("major"),
    firstName: text("first_name"),
    lastName: text("last_name"),
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
    telegramUsername: text("telegram_username"),
    telegramFirstName: text("telegram_first_name"),
    telegramLinkedAt: bigint("telegram_linked_at", { mode: "number" }),
    telegramNotificationsEnabled: boolean("telegram_notifications_enabled"),
    bankName: text("bank_name"),
    bankAccountNumber: text("bank_account_number"),
    bankCardNumber: text("bank_card_number"),
    bankSheba: text("bank_sheba"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex("idx_users_email").on(t.email),
    telegramIdx: index("idx_users_telegram").on(t.telegramId),
    roleIdx: index("idx_users_role").on(t.role),
  })
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authRateLimits = pgTable("auth_rate_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  attempts: integer("attempts").default(1),
  expireAt: timestamp("expire_at").notNull(),
});

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
});

export const superAdminSessions = pgTable("super_admin_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Catalog ───────────────────────────────────────────────────────────────
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull(),
    accent: text("accent").notNull(),
    order: integer("order").notNull().default(0),
  },
  (t) => ({
    slugIdx: uniqueIndex("idx_categories_slug").on(t.slug),
  })
);

export const instructors = pgTable(
  "instructors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    bio: text("bio").notNull(),
    education: jsonb("education").$type<string[]>().default([]),
    specialties: jsonb("specialties").$type<string[]>().default([]),
    accent: text("accent").notNull(),
    verified: boolean("verified").default(false),
    userId: uuid("user_id").references(() => users.id),
  },
  (t) => ({
    slugIdx: uniqueIndex("idx_instructors_slug").on(t.slug),
    userIdx: index("idx_instructors_user").on(t.userId),
  })
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    instructorId: uuid("instructor_id")
      .notNull()
      .references(() => instructors.id),
    summary: text("summary").notNull(),
    description: text("description").notNull().default(""),
    audience: jsonb("audience").$type<string[]>().default([]),
    prerequisites: jsonb("prerequisites").$type<string[]>().default([]),
    syllabus: jsonb("syllabus")
      .$type<{ id: string; title: string; durationMin: number; free: boolean }[]>()
      .default([]),
    durationText: text("duration_text").notNull().default(""),
    mode: varchar("mode", { length: 20 }).notNull().default("recorded"),
    price: integer("price").notNull().default(0),
    discountPrice: integer("discount_price"),
    rating: real("rating").default(0),
    ratingCount: integer("rating_count").default(0),
    studentsCount: integer("students_count").default(0),
    accent: text("accent").notNull().default("teal"),
    bundle: varchar("bundle", { length: 20 }).notNull().default("basic"),
    includes: jsonb("includes").$type<string[]>().default([]),
    hasSampleVideo: boolean("has_sample_video").default(false),
    files: jsonb("files")
      .$type<{ name: string; size: string; type: string }[]>()
      .default([]),
    published: boolean("published").default(false),
    featured: boolean("featured").default(false),
    popular: boolean("popular").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    packagePrices: jsonb("package_prices")
      .$type<{ tier: string; price: number; features: string[] }[]>()
      .default([]),
    authorId: uuid("author_id").references(() => users.id),
    status: varchar("status", { length: 20 }).default("draft"),
  },
  (t) => ({
    slugIdx: uniqueIndex("idx_courses_slug").on(t.slug),
    categoryIdx: index("idx_courses_category").on(t.categoryId),
    instructorIdx: index("idx_courses_instructor").on(t.instructorId),
    publishedIdx: index("idx_courses_published").on(t.published),
    featuredIdx: index("idx_courses_featured").on(t.featured),
  })
);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull().default(0),
  imageUrl: text("image_url"),
  category: varchar("category", { length: 30 }),
  published: boolean("published").default(false),
  featured: boolean("featured").default(false),
  stock: integer("stock").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workshops = pgTable("workshops", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull().default(""),
  date: bigint("date", { mode: "number" }),
  time: text("time"),
  location: text("location"),
  price: integer("price").default(0),
  free: boolean("free").default(false),
  capacity: integer("capacity").default(0),
  registeredCount: integer("registered_count").default(0),
  agenda: jsonb("agenda").$type<{ time: string; topic: string }[]>().default([]),
  published: boolean("published").default(false),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Articles & Content ────────────────────────────────────────────────────
export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary").notNull(),
    content: text("content").notNull().default(""),
    authorId: uuid("author_id").references(() => users.id),
    authorName: text("author_name"),
    imageUrl: text("image_url"),
    category: varchar("category", { length: 50 }),
    tags: jsonb("tags").$type<string[]>().default([]),
    seoKeywords: jsonb("seo_keywords").$type<string[]>().default([]),
    references: jsonb("references")
      .$type<{ title: string; authors: string; journal: string; year: number; doi?: string; url?: string }[]>()
      .default([]),
    published: boolean("published").default(false),
    featured: boolean("featured").default(false),
    views: integer("views").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    slugIdx: uniqueIndex("idx_articles_slug").on(t.slug),
  })
);

export const articleVersions = pgTable("article_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  title: text("title").notNull(),
  version: integer("version").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dictionaryTerms = pgTable(
  "dictionary_terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    term: text("term").notNull(),
    fullName: text("full_name").notNull().default(""),
    gramStatus: text("gram_status").notNull().default(""),
    shape: text("shape").notNull().default(""),
    oxygen: text("oxygen").notNull().default(""),
    habitat: text("habitat").notNull().default(""),
    diseases: jsonb("diseases").$type<string[]>().default([]),
    virulence: jsonb("virulence").$type<string[]>().default([]),
    diagnosis: text("diagnosis").notNull().default(""),
    characteristics: jsonb("characteristics").$type<string[]>().default([]),
    examNotes: jsonb("exam_notes").$type<string[]>().default([]),
    sources: jsonb("sources").$type<string[]>().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    termIdx: index("idx_dict_term").on(t.term),
  })
);

export const sitePages = pgTable("site_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  published: boolean("published").default(false),
});

export const siteTexts = pgTable("site_texts", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const mediaItems = pgTable("media_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  alt: text("alt"),
  caption: text("caption"),
  category: varchar("category", { length: 50 }),
  storageKey: text("storage_key").notNull(),
  uploaderId: uuid("uploader_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const testimonials = pgTable("testimonials", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  text: text("text").notNull(),
  rating: integer("rating").default(5),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Assessment ────────────────────────────────────────────────────────────
export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    text: text("text").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation").notNull().default(""),
    topicId: uuid("topic_id").references(() => categories.id),
    difficulty: varchar("difficulty", { length: 20 }).default("medium"),
  },
  (t) => ({
    topicIdx: index("idx_questions_topic").on(t.topicId),
  })
);

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    questionIds: jsonb("question_ids").$type<string[]>().default([]),
    published: boolean("published").default(false),
    featured: boolean("featured").default(false),
    free: boolean("free").default(false),
    order: integer("order").default(0),
    timeLimitMin: integer("time_limit_min").default(30),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("idx_exams_slug").on(t.slug),
  })
);

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    answers: jsonb("answers")
      .$type<{ questionId: string; chosenIndex: number }[]>()
      .default([]),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    percent: integer("percent").notNull(),
    topicBreakdown: jsonb("topic_breakdown")
      .$type<{ topicId: string; topicName: string; correct: number; total: number; percent: number }[]>()
      .default([]),
    startedAt: bigint("started_at", { mode: "number" }),
    finishedAt: bigint("finished_at", { mode: "number" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("idx_attempts_user").on(t.userId),
    examIdx: index("idx_attempts_exam").on(t.examId),
  })
);

export const examReports = pgTable(
  "exam_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    details: text("details"),
    status: varchar("status", { length: 20 }).default("open"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("idx_reports_status").on(t.status),
  })
);

export const dailyQuiz = pgTable(
  "daily_quiz",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: varchar("date", { length: 10 }).notNull(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    points: integer("points").default(10),
  },
  (t) => ({
    dateIdx: uniqueIndex("idx_dq_date").on(t.date),
  })
);

export const dailyQuizAnswers = pgTable(
  "daily_quiz_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    chosenIndex: integer("chosen_index").notNull(),
    correct: boolean("correct").notNull(),
    points: integer("points").default(0),
    answeredAt: bigint("answered_at", { mode: "number" }),
  },
  (t) => ({
    userIdx: index("idx_dq_answers_user").on(t.userId),
    dateIdx: index("idx_dq_answers_date").on(t.date),
  })
);

// ── Commerce ──────────────────────────────────────────────────────────────
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subtotal: integer("subtotal").notNull(),
    discountAmount: integer("discount_amount").default(0),
    total: integer("total").notNull(),
    couponCode: varchar("coupon_code", { length: 50 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    invoiceNumber: varchar("invoice_number", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("idx_orders_user").on(t.userId),
  })
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(),
  refId: uuid("ref_id").notNull(),
  title: text("title").notNull(),
  price: integer("price").notNull(),
});

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull(),
    percent: integer("percent").notNull(),
    maxUses: integer("max_uses").default(0),
    usedCount: integer("used_count").default(0),
    active: boolean("active").default(true),
    expiresAt: bigint("expires_at", { mode: "number" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    codeIdx: uniqueIndex("idx_coupons_code").on(t.code),
  })
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    completedLessons: jsonb("completed_lessons").$type<string[]>().default([]),
    enrolledAt: bigint("enrolled_at", { mode: "number" }),
    lastActiveAt: bigint("last_active_at", { mode: "number" }),
  },
  (t) => ({
    userIdx: index("idx_enrollments_user").on(t.userId),
    courseIdx: index("idx_enrollments_course").on(t.courseId),
  })
);

export const offlinePayments = pgTable("offline_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").references(() => courses.id),
  tier: varchar("tier", { length: 20 }),
  amount: integer("amount").notNull(),
  receiptStorageId: text("receipt_storage_id"),
  receiptUrl: text("receipt_url"),
  status: varchar("status", { length: 20 }).default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const classEnrollRequests = pgTable(
  "class_enroll_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => classRooms.id),
    status: varchar("status", { length: 20 }).default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("idx_cer_user").on(t.userId),
    roomIdx: index("idx_cer_room").on(t.roomId),
  })
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentType: varchar("content_type", { length: 30 }).notNull(),
    contentId: uuid("content_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("idx_bookmarks_user").on(t.userId),
  })
);

export const flashcards = pgTable(
  "flashcards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id),
    front: text("front").notNull(),
    back: text("back").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("idx_flashcards_user").on(t.userId),
  })
);

// ── Live Collaboration ────────────────────────────────────────────────────
export const classRooms = pgTable("class_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  instructorId: uuid("instructor_id").references(() => users.id),
  courseId: uuid("course_id").references(() => courses.id),
  status: varchar("status", { length: 20 }).default("scheduled"),
  scheduledAt: bigint("scheduled_at", { mode: "number" }),
  startedAt: bigint("started_at", { mode: "number" }),
  endedAt: bigint("ended_at", { mode: "number" }),
  meetingUrl: text("meeting_url"),
  maxStudents: integer("max_students").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const presence = pgTable(
  "presence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => classRooms.id, { onDelete: "cascade" }),
    online: boolean("online").default(false),
    lastSeen: bigint("last_seen", { mode: "number" }),
    heartbeat: bigint("heartbeat", { mode: "number" }),
  },
  (t) => ({
    userIdx: index("idx_presence_user").on(t.userId),
    roomIdx: index("idx_presence_room").on(t.roomId),
  })
);

export const roomMessages = pgTable(
  "room_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => classRooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text"),
    type: varchar("type", { length: 20 }).default("message"),
    name: text("name"),
    role: varchar("role", { length: 30 }),
    answer: text("answer"),
    attachmentType: varchar("attachment_type", { length: 20 }),
    attachmentUrl: text("attachment_url"),
    attachmentName: text("attachment_name"),
    attachmentSize: bigint("attachment_size", { mode: "number" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    roomIdx: index("idx_rm_room").on(t.roomId),
  })
);

export const whiteboardStrokes = pgTable("whiteboard_strokes", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => classRooms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id),
  color: text("color"),
  width: real("width"),
  points: jsonb("points").$type<{ x: number; y: number }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const signals = pgTable("signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").references(() => classRooms.id, { onDelete: "cascade" }),
  fromUser: uuid("from_user").references(() => users.id),
  toUser: uuid("to_user").references(() => users.id),
  type: varchar("type", { length: 30 }),
  data: text("data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Mentoring ─────────────────────────────────────────────────────────────
export const mentorGroups = pgTable("mentor_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  mentorId: uuid("mentor_id")
    .notNull()
    .references(() => users.id),
  capacity: integer("capacity").default(20),
  courseId: uuid("course_id").references(() => courses.id),
  published: boolean("published").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => mentorGroups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).default("member"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.groupId, t.userId] }),
  })
);

export const groupAnnouncements = pgTable("group_announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => mentorGroups.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mentorQuestions = pgTable("mentor_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => mentorGroups.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  text: text("text").notNull(),
  answer: text("answer"),
  answeredBy: uuid("answered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  answeredAt: timestamp("answered_at"),
});

export const mentorSessions = pgTable("mentor_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => mentorGroups.id, { onDelete: "cascade" }),
  mentorId: uuid("mentor_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  scheduledAt: bigint("scheduled_at", { mode: "number" }),
  durationMin: integer("duration_min").default(60),
  meetingUrl: text("meeting_url"),
  status: varchar("status", { length: 20 }).default("scheduled"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Support & Communication ───────────────────────────────────────────────
export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    category: varchar("category", { length: 30 }).default("general"),
    status: varchar("status", { length: 20 }).default("open"),
    messages: jsonb("messages")
      .$type<{ author: string; text: string; at: number }[]>()
      .default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    userIdx: index("idx_tickets_user").on(t.userId),
    statusIdx: index("idx_tickets_status").on(t.status),
  })
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentType: varchar("content_type", { length: 30 }).notNull(),
    contentId: uuid("content_id").notNull(),
    text: text("text").notNull(),
    approved: boolean("approved").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    contentIdx: index("idx_comments_content").on(t.contentType, t.contentId),
  })
);

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  authorName: text("author_name"),
  title: text("title").notNull(),
  body: text("body"),
  targetType: varchar("target_type", { length: 20 }).default("all"),
  targetId: uuid("target_id"),
  targetTitle: text("target_title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const directMessages = pgTable(
  "direct_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    read: boolean("read").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    receiverReadIdx: index("idx_dm_receiver_read").on(t.receiverId, t.read),
    senderIdx: index("idx_dm_sender").on(t.senderId),
  })
);

export const inboxMessages = pgTable("inbox_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body"),
  unread: boolean("unread").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(),
  message: text("message").notNull(),
  shown: boolean("shown").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── AI System ─────────────────────────────────────────────────────────────
export const aiConfig = pgTable("ai_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  enabled: boolean("enabled").default(false),
  apiKey: text("api_key"),
  defaultModel: text("default_model"),
  systemPrompt: text("system_prompt"),
  updatedAt: timestamp("updated_at"),
});

export const aiModels = pgTable("ai_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  provider: text("provider"),
  modelId: text("model_id"),
  active: boolean("active").default(true),
  maxTokens: integer("max_tokens").default(4096),
  costPer1k: real("cost_per_1k"),
});

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  modelId: uuid("model_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => aiConversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  tokens: integer("tokens"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Telegram ──────────────────────────────────────────────────────────────
export const telegramBot = pgTable("telegram_bot", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token"),
  webhookUrl: text("webhook_url"),
  commands: jsonb("commands")
    .$type<{ command: string; description: string }[]>()
    .default([]),
  active: boolean("active").default(false),
});

export const telegramLinkingCodes = pgTable("telegram_linking_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
});

export const telegramNotifPrefs = pgTable("telegram_notif_prefs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  enabled: boolean("enabled").default(true),
  courseUpdates: boolean("course_updates").default(true),
  examReminders: boolean("exam_reminders").default(true),
  announcements: boolean("announcements").default(true),
});

// ── Instructor Tools ──────────────────────────────────────────────────────
export const instructorPayments = pgTable("instructor_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  instructorId: uuid("instructor_id").references(() => instructors.id),
  userId: uuid("user_id").references(() => users.id),
  amount: integer("amount").notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courseResources = pgTable("course_resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  url: text("url"),
  storageKey: text("storage_key"),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => classRooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    present: boolean("present").default(false),
    markedBy: uuid("marked_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.roomId, t.userId] }),
  })
);

// ── Relations ─────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  enrollments: many(enrollments),
  examAttempts: many(examAttempts),
  orders: many(orders),
  comments: many(comments),
  directMessages: many(directMessages),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  courses: many(courses),
}));

export const instructorsRelations = relations(instructors, ({ one, many }) => ({
  user: one(users, { fields: [instructors.userId], references: [users.id] }),
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  category: one(categories, { fields: [courses.categoryId], references: [categories.id] }),
  instructor: one(instructors, { fields: [courses.instructorId], references: [instructors.id] }),
  enrollments: many(enrollments),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, { fields: [enrollments.userId], references: [users.id] }),
  course: one(courses, { fields: [enrollments.courseId], references: [courses.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const classRoomsRelations = relations(classRooms, ({ many }) => ({
  messages: many(roomMessages),
  presence: many(presence),
  attendance: many(attendance),
}));

export const mentorGroupsRelations = relations(mentorGroups, ({ many }) => ({
  members: many(groupMembers),
  announcements: many(groupAnnouncements),
  questions: many(mentorQuestions),
  sessions: many(mentorSessions),
}));
