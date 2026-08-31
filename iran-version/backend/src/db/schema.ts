// Drizzle Schema — Convex → PostgreSQL
// Maps all 65 Convex tables to PostgreSQL with proper relations

import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  real,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Auth & Users ────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash"),
    role: varchar("role", { length: 50 }).default("user").notNull(),
    secondaryRole: varchar("secondary_role", { length: 50 }),
    firstName: text("first_name"),
    lastName: text("last_name"),
    about: text("about"),
    avatarUrl: text("avatar_url"),
    university: text("university"),
    major: text("major"),
    telegramId: bigint("telegram_id", { mode: "number" }),
    telegramUsername: text("telegram_username"),
    bankName: text("bank_name"),
    bankAccountNumber: text("bank_account_number"),
    bankCardNumber: text("bank_card_number"),
    bankSheba: text("bank_sheba"),
    pendingProfile: jsonb("pending_profile"),
    suggestedCourseIds: jsonb("suggested_course_ids").$type<string[]>(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("idx_users_email").on(t.email),
    index("idx_users_role").on(t.role),
    index("idx_users_telegram").on(t.telegramId),
  ]
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const authRateLimits = pgTable("auth_rate_limits", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  expireAt: bigint("expire_at", { mode: "number" }).notNull(),
});

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
});

export const superAdminSessions = pgTable("super_admin_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// ─── Catalog ─────────────────────────────────────────────────────────────────

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    icon: text("icon"),
    color: text("color"),
    sortOrder: integer("sort_order").default(0),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_categories_slug").on(t.slug)]
);

export const instructors = pgTable("instructors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: text("title"),
  bio: text("bio"),
  education: jsonb("education").$type<string[]>(),
  specialties: jsonb("specialties").$type<string[]>(),
  avatarUrl: text("avatar_url"),
  sortOrder: integer("sort_order").default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    instructorId: uuid("instructor_id")
      .notNull()
      .references(() => instructors.id),
    summary: text("summary"),
    description: text("description"),
    image: text("image"),
    price: integer("price").default(0).notNull(),
    mode: varchar("mode", { length: 20 }).default("recorded"),
    bundle: varchar("bundle", { length: 20 }).default("basic"),
    published: boolean("published").default(false),
    featured: boolean("featured").default(false),
    popular: boolean("popular").default(false),
    sessionCount: integer("session_count").default(0),
    syllabus: jsonb("syllabus").$type<
      Array<{ title: string; durationMin: number; free: boolean }>
    >(),
    audience: jsonb("audience").$type<string[]>(),
    prerequisites: jsonb("prerequisites").$type<string[]>(),
    includes: jsonb("includes").$type<string[]>(),
    packagePrices: jsonb("package_prices").$type<
      Array<{ tier: string; price: number; features: string[] }>
    >(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("idx_courses_slug").on(t.slug),
    index("idx_courses_published").on(t.published),
    index("idx_courses_featured").on(t.featured),
    index("idx_courses_category").on(t.categoryId),
    index("idx_courses_instructor").on(t.instructorId),
  ]
);

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  image: text("image"),
  price: integer("price").default(0).notNull(),
  published: boolean("published").default(false),
  featured: boolean("featured").default(false),
  details: jsonb("details"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const workshops = pgTable("workshops", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  image: text("image"),
  instructorId: uuid("instructor_id").references(() => instructors.id),
  date: bigint("date", { mode: "number" }),
  time: text("time"),
  location: text("location"),
  capacity: integer("capacity").default(0),
  registeredCount: integer("registered_count").default(0),
  price: integer("price").default(0),
  published: boolean("published").default(false),
  agenda: jsonb("agenda").$type<string[]>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

// ─── Articles & Content ──────────────────────────────────────────────────────

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    content: text("content"),
    summary: text("summary"),
    image: text("image"),
    author: text("author"),
    published: boolean("published").default(false),
    featured: boolean("featured").default(false),
    category: text("category"),
    tags: jsonb("tags").$type<string[]>(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoKeywords: jsonb("seo_keywords").$type<string[]>(),
    references_: jsonb("references").$type<
      Array<{
        title: string;
        authors: string;
        journal: string;
        year: number;
        doi?: string;
        url?: string;
      }>
    >(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_articles_slug").on(t.slug)]
);

export const articleVersions = pgTable("article_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  content: text("content"),
  editedBy: text("edited_by"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const dictionaryTerms = pgTable("dictionary_terms", {
  id: uuid("id").defaultRandom().primaryKey(),
  term: text("term").notNull(),
  fullName: text("full_name"),
  gramStatus: text("gram_status"),
  shape: text("shape"),
  oxygen: text("oxygen"),
  habitat: text("habitat"),
  diseases: jsonb("diseases").$type<string[]>(),
  virulence: jsonb("virulence").$type<string[]>(),
  diagnosis: text("diagnosis"),
  characteristics: jsonb("characteristics").$type<string[]>(),
  examNotes: jsonb("exam_notes").$type<string[]>(),
  sources: jsonb("sources").$type<string[]>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const sitePages = pgTable("site_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: text("title"),
  content: text("content"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const siteTexts = pgTable("site_texts", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const mediaItems = pgTable("media_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  mimeType: varchar("mime_type", { length: 255 }),
  size: bigint("size", { mode: "number" }),
  url: text("url"),
  storageId: text("storage_id"),
  alt: text("alt"),
  caption: text("caption"),
  category: text("category"),
  uploaderId: uuid("uploader_id").references(() => users.id),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// ─── Assessment ──────────────────────────────────────────────────────────────

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    topicId: uuid("topic_id").references(() => categories.id),
    topicName: text("topic_name"),
    text: text("text").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation"),
    difficulty: integer("difficulty").default(1),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_questions_topic").on(t.topicId)]
);

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    questionIds: jsonb("question_ids").$type<string[]>().notNull(),
    published: boolean("published").default(false),
    timeLimit: integer("time_limit"),
    passingScore: integer("passing_score").default(50),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_exams_slug").on(t.slug)]
);

export const examAttempts = pgTable("exam_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  examId: uuid("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  answers: jsonb("answers").$type<
    Array<{ questionId: string; chosenIndex: number }>
  >(),
  score: integer("score"),
  total: integer("total"),
  percent: real("percent"),
  topicBreakdown: jsonb("topic_breakdown").$type<
    Array<{
      topicId: string;
      topicName: string;
      correct: number;
      total: number;
    }>
  >(),
  startedAt: bigint("started_at", { mode: "number" }),
  submittedAt: bigint("submitted_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const examReports = pgTable("exam_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  examId: uuid("exam_id").references(() => exams.id),
  questionId: uuid("question_id").references(() => questions.id),
  reason: text("reason"),
  resolved: boolean("resolved").default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const dailyQuiz = pgTable("daily_quiz", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id),
  date: varchar("date", { length: 10 }).notNull().unique(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const dailyQuizAnswers = pgTable(
  "daily_quiz_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => dailyQuiz.id),
    chosenIndex: integer("chosen_index").notNull(),
    correct: boolean("correct"),
    answeredAt: bigint("answered_at", { mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("idx_dqa_user_quiz").on(t.userId, t.quizId)]
);

// ─── Commerce ────────────────────────────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    subtotal: integer("subtotal").default(0),
    discount: integer("discount").default(0),
    total: integer("total").default(0),
    couponCode: text("coupon_code"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_orders_user").on(t.userId)]
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(),
  refId: uuid("ref_id").notNull(),
  price: integer("price").default(0),
});

export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountPercent: integer("discount_percent"),
  discountAmount: integer("discount_amount"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  expiresAt: bigint("expires_at", { mode: "number" }),
  active: boolean("active").default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    tier: varchar("tier", { length: 20 }),
    completedLessons: jsonb("completed_lessons").$type<string[]>(),
    enrolledAt: bigint("enrolled_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("idx_enrollments_user").on(t.userId),
    index("idx_enrollments_course").on(t.courseId),
    uniqueIndex("idx_enrollments_user_course").on(t.userId, t.courseId),
  ]
);

export const offlinePayments = pgTable("offline_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").references(() => courses.id),
  tier: varchar("tier", { length: 20 }),
  amount: integer("amount").default(0),
  receiptStorageId: text("receipt_storage_id"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  adminNote: text("admin_note"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

// ─── Live Collaboration ─────────────────────────────────────────────────────

export const presence = pgTable(
  "presence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => classRooms.id, {
      onDelete: "cascade",
    }),
    online: boolean("online").default(true),
    lastSeen: bigint("last_seen", { mode: "number" }).notNull(),
    socketId: text("socket_id"),
  },
  (t) => [uniqueIndex("idx_presence_user_room").on(t.userId, t.roomId)]
);

export const classRooms = pgTable(
  "class_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    courseId: uuid("course_id").references(() => courses.id),
    instructorId: uuid("instructor_id").references(() => instructors.id),
    status: varchar("status", { length: 20 }).default("scheduled").notNull(),
    scheduledAt: bigint("scheduled_at", { mode: "number" }),
    startedAt: bigint("started_at", { mode: "number" }),
    endedAt: bigint("ended_at", { mode: "number" }),
    boardBg: text("board_bg").default("#0f172a"),
    broadcastKind: varchar("broadcast_kind", { length: 20 }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_classrooms_course").on(t.courseId)]
);

export const classRequests = pgTable("class_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  instructorId: uuid("instructor_id")
    .notNull()
    .references(() => instructors.id),
  title: text("title"),
  description: text("description"),
  proposedAt: bigint("proposed_at", { mode: "number" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const whiteboardStrokes = pgTable(
  "whiteboard_strokes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => classRooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    points: jsonb("points").$type<Array<{ x: number; y: number }>>(),
    color: text("color"),
    width: real("width"),
    tool: varchar("tool", { length: 20 }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_wbs_room").on(t.roomId)]
);

export const roomMessages = pgTable(
  "room_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => classRooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name"),
    role: varchar("role", { length: 20 }),
    text: text("text"),
    type: varchar("type", { length: 20 }).default("message"),
    answer: text("answer"),
    attachmentUrl: text("attachment_url"),
    attachmentName: text("attachment_name"),
    attachmentType: varchar("attachment_type", { length: 20 }),
    attachmentSize: bigint("attachment_size", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_rm_room").on(t.roomId)]
);

export const signals = pgTable("signals", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id),
  toUserId: uuid("to_user_id")
    .notNull()
    .references(() => users.id),
  roomId: uuid("room_id").references(() => classRooms.id),
  type: varchar("type", { length: 20 }).notNull(),
  data: text("data"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// ─── Mentoring ───────────────────────────────────────────────────────────────

export const mentorGroups = pgTable("mentor_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  mentorId: uuid("mentor_id").references(() => users.id),
  maxMembers: integer("max_members").default(20),
  published: boolean("published").default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => mentorGroups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).default("member"),
    joinedAt: bigint("joined_at", { mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("idx_gm_group_user").on(t.groupId, t.userId)]
);

export const groupAnnouncements = pgTable("group_announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => mentorGroups.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  title: text("title"),
  body: text("body"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const mentorQuestions = pgTable("mentor_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => mentorGroups.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  text: text("text").notNull(),
  answer: text("answer"),
  answeredBy: uuid("answered_by").references(() => users.id),
  answeredAt: bigint("answered_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const mentorSessions = pgTable("mentor_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => mentorGroups.id, { onDelete: "cascade" }),
  mentorId: uuid("mentor_id")
    .notNull()
    .references(() => users.id),
  title: text("title"),
  scheduledAt: bigint("scheduled_at", { mode: "number" }),
  duration: integer("duration"),
  status: varchar("status", { length: 20 }).default("scheduled"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// ─── Support & Communication ─────────────────────────────────────────────────

export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  status: varchar("status", { length: 20 }).default("open").notNull(),
  priority: varchar("priority", { length: 20 }).default("normal"),
  messages: jsonb("messages").$type<
    Array<{ author: string; text: string; at: number }>
  >(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 20 }).notNull(),
    targetId: uuid("target_id").notNull(),
    text: text("text").notNull(),
    approved: boolean("approved").default(false),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_comments_target").on(t.targetType, t.targetId)]
);

export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body"),
  authorId: uuid("author_id").references(() => users.id),
  authorName: text("author_name"),
  targetType: varchar("target_type", { length: 20 }).default("all"),
  targetId: uuid("target_id"),
  targetTitle: text("target_title"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const directMessages = pgTable(
  "direct_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    read: boolean("read").default(false),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("idx_dm_sender").on(t.senderId),
    index("idx_dm_receiver_read").on(t.receiverId, t.read),
  ]
);

export const inboxMessages = pgTable("inbox_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body"),
  unread: boolean("unread").default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const reminders = pgTable("reminders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title"),
  body: text("body"),
  shown: boolean("shown").default(false),
  metadata: jsonb("metadata"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 20 }).notNull(),
    targetId: uuid("target_id").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("idx_bm_user_target").on(t.userId, t.targetType, t.targetId),
  ]
);

export const flashcards = pgTable("flashcards", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").references(() => courses.id),
  front: text("front").notNull(),
  back: text("back").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const testimonials = pgTable("testimonials", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  role: text("role"),
  text: text("text"),
  avatarUrl: text("avatar_url"),
  rating: integer("rating"),
  sortOrder: integer("sort_order").default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// ─── AI System ───────────────────────────────────────────────────────────────

export const aiConfig = pgTable("ai_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  enabled: boolean("enabled").default(false),
  model: text("model"),
  apiKey: text("api_key"),
  systemPrompt: text("system_prompt"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const aiModels = pgTable("ai_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  provider: text("provider"),
  enabled: boolean("enabled").default(true),
  config: jsonb("config"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const aiPrompts = pgTable("ai_prompts", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  template: text("template"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => aiConversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content"),
  tokens: integer("tokens"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  date: varchar("date", { length: 10 }).notNull(),
  tokens: integer("tokens").default(0),
  requests: integer("requests").default(0),
});

export const aiTokenQuotas = pgTable("ai_token_quotas", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  dailyLimit: integer("daily_limit").default(10000),
  used: integer("used").default(0),
  resetAt: bigint("reset_at", { mode: "number" }),
});

// ─── Telegram ────────────────────────────────────────────────────────────────

export const telegramBot = pgTable("telegram_bot", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token"),
  enabled: boolean("enabled").default(false),
  webhookUrl: text("webhook_url"),
  commands: jsonb("commands").$type<
    Array<{ command: string; description: string }>
  >(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const telegramLinkingCodes = pgTable("telegram_linking_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const telegramNotifPrefs = pgTable("telegram_notif_prefs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  enabled: boolean("enabled").default(true),
  examReminders: boolean("exam_reminders").default(true),
  classReminders: boolean("class_reminders").default(true),
  announcements: boolean("announcements").default(true),
});

export const telegramNotifLog = pgTable(
  "telegram_notif_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    type: varchar("type", { length: 50 }),
    sentAt: bigint("sent_at", { mode: "number" }).notNull(),
    success: boolean("success").default(true),
    messageId: text("message_id"),
  },
  (t) => [uniqueIndex("idx_tnl_unique").on(t.userId, t.type, t.sentAt)]
);

// ─── Payments & Resources ────────────────────────────────────────────────────

export const instructorPayments = pgTable("instructor_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  instructorId: uuid("instructor_id")
    .notNull()
    .references(() => instructors.id),
  courseId: uuid("course_id").references(() => courses.id),
  amount: integer("amount").default(0),
  status: varchar("status", { length: 20 }).default("pending"),
  note: text("note"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const courseResources = pgTable("course_resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url"),
  storageId: text("storage_id"),
  type: varchar("type", { length: 20 }),
  size: bigint("size", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => classRooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    status: varchar("status", { length: 20 }).default("present"),
    markedBy: uuid("marked_by").references(() => users.id),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("idx_attendance_room").on(t.roomId),
    uniqueIndex("idx_attendance_room_user").on(t.roomId, t.userId),
  ]
);

export const classEnrollRequests = pgTable("class_enroll_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roomId: uuid("room_id")
    .notNull()
    .references(() => classRooms.id),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// ─── Profiles (pending edits) ───────────────────────────────────────────────

export const profileEdits = pgTable("profile_edits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<{
    firstName?: string;
    lastName?: string;
    about?: string;
    avatarUrl?: string;
  }>(),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
