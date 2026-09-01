import { pgTable, text, integer, real, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

// ══════════════════════════════════════════════════════════════════════════════
// ── USERS ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  role: text("role").default("user"),
  secondaryRole: text("secondary_role"),
  avatarUrl: text("avatar_url"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  about: text("about"),
  phone: text("phone"),
  telegramId: text("telegram_id"),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── CATEGORIES ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  accent: text("accent"),
  order: integer("order"),
  published: boolean("published").default(true),
  title: text("title"),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── INSTRUCTORS ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const instructors = pgTable("instructors", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  bio: text("bio"),
  avatar: text("avatar"),
  education: text("education"),
  specialties: jsonb("specialties").$type<string[]>(),
  published: boolean("published").default(true),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── COURSES ──────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  categoryId: text("category_id"),
  instructorId: text("instructor_id"),
  price: integer("price").default(0),
  discountPrice: integer("discount_price"),
  coverImage: text("cover_image"),
  status: text("status").default("draft"),
  published: boolean("published").default(false),
  featured: boolean("featured").default(false),
  free: boolean("free").default(false),
  duration: text("duration"),
  durationText: text("duration_text"),
  level: text("level"),
  mode: text("mode"),
  summary: text("summary"),
  includes: jsonb("includes").$type<string[]>(),
  lessonsCount: integer("lessons_count"),
  studentsCount: integer("students_count"),
  rating: real("rating"),
  ratingCount: integer("rating_count"),
  popular: boolean("popular").default(false),
  accent: text("accent"),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
}, (table) => ({
  bySlug: index("courses_by_slug").on(table.slug),
  byCategory: index("courses_by_category").on(table.categoryId),
  byStatus: index("courses_by_status").on(table.status),
}));

// ══════════════════════════════════════════════════════════════════════════════
// ── ARTICLES ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const articles = pgTable("articles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content"),
  category: text("category"),
  authorId: text("author_id"),
  authorName: text("author_name"),
  coverImage: text("cover_image"),
  featuredImage: text("featured_image"),
  featured: boolean("featured").default(false),
  published: boolean("published").default(false),
  readTime: integer("read_time"),
  accent: text("accent"),
  status: text("status"),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
}, (table) => ({
  bySlug: index("articles_by_slug").on(table.slug),
  byPublished: index("articles_by_published").on(table.published),
}));

// ══════════════════════════════════════════════════════════════════════════════
// ── DICTIONARY ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const dictionaryTerms = pgTable("dictionary_terms", {
  id: text("id").primaryKey(),
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
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── EXAMS ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const exams = pgTable("exams", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  durationMinutes: integer("duration_minutes"),
  questionCount: integer("question_count"),
  free: boolean("free").default(false),
  published: boolean("published").default(false),
  featured: boolean("featured").default(false),
  diagnostic: boolean("diagnostic").default(false),
  questionIds: jsonb("question_ids").$type<string[]>(),
  accent: text("accent"),
  category: text("category"),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── PRODUCTS (catalog) ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const products = pgTable("products", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: integer("price"),
  coverImage: text("cover_image"),
  category: text("category"),
  published: boolean("published").default(false),
  featured: boolean("featured").default(false),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── WORKSHOPS ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const workshops = pgTable("workshops", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  summary: text("summary"),
  instructorId: text("instructor_id"),
  price: integer("price"),
  free: boolean("free").default(false),
  published: boolean("published").default(false),
  time: text("time"),
  location: text("location"),
  topic: text("topic"),
  capacity: integer("capacity"),
  registeredCount: integer("registered_count"),
  coverImage: text("cover_image"),
  expertTalk: boolean("expert_talk").default(false),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── ENROLLMENTS ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const enrollments = pgTable("enrollments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  courseId: text("course_id").notNull(),
  status: text("status").default("active"),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── ORDERS ───────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  courseId: text("course_id"),
  productId: text("product_id"),
  workshopId: text("workshop_id"),
  amount: integer("amount"),
  status: text("status").default("pending"),
  paymentMethod: text("payment_method"),
  invoiceNumber: text("invoice_number"),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── CLASS ROOMS ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const classRooms = pgTable("class_rooms", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  topic: text("topic"),
  description: text("description"),
  instructorId: text("instructor_id"),
  courseId: text("course_id"),
  status: text("status").default("scheduled"),
  scheduledDate: text("scheduled_date"),
  platformUrl: text("platform_url"),
  platformUser: text("platform_user"),
  platformPass: text("platform_pass"),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── WALLET ───────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const wallet = pgTable("wallet", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  balance: integer("balance").default(0),
  frozenBalance: integer("frozen_balance").default(0),
  totalEarned: integer("total_earned").default(0),
  totalSpent: integer("total_spent").default(0),
  updatedAt: integer("updated_at"),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type"),
  amount: integer("amount"),
  description: text("description"),
  relatedOrderId: text("related_order_id"),
  relatedProductId: text("related_product_id"),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── STORE PRODUCTS (marketplace) ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const storeProducts = pgTable("store_products", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  category: text("category"),
  condition: text("condition"),
  price: integer("price"),
  images: jsonb("images").$type<string[]>(),
  coverImage: text("cover_image"),
  stock: integer("stock").default(0),
  soldCount: integer("sold_count").default(0),
  rating: real("rating").default(0),
  ratingCount: integer("rating_count").default(0),
  status: text("status").default("pending"),
  boostLevel: text("boost_level").default("none"),
  boostExpiresAt: integer("boost_expires_at"),
  deliveryCities: jsonb("delivery_cities").$type<string[]>(),
  tags: jsonb("tags").$type<string[]>(),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
}, (table) => ({
  bySeller: index("store_products_by_seller").on(table.sellerId),
  byStatus: index("store_products_by_status").on(table.status),
  byCategory: index("store_products_by_category").on(table.category),
}));

export const storeReviews = pgTable("store_reviews", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  userId: text("user_id").notNull(),
  rating: integer("rating"),
  text: text("text"),
  createdAt: integer("created_at"),
});

export const storeOrders = pgTable("store_orders", {
  id: text("id").primaryKey(),
  buyerId: text("buyer_id").notNull(),
  sellerId: text("seller_id").notNull(),
  productId: text("product_id").notNull(),
  quantity: integer("quantity"),
  unitPrice: integer("unit_price"),
  commission: integer("commission"),
  total: integer("total"),
  sellerEarning: integer("seller_earning"),
  status: text("status"),
  deliveryCity: text("delivery_city"),
  deliveryAddress: text("delivery_address"),
  deliveryNote: text("delivery_note"),
  paidWithWallet: boolean("paid_with_wallet"),
  invoiceNumber: text("invoice_number"),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

export const storeCart = pgTable("store_cart", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  productId: text("product_id").notNull(),
  quantity: integer("quantity"),
  createdAt: integer("created_at"),
});

export const storeWishlists = pgTable("store_wishlists", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  productId: text("product_id").notNull(),
  createdAt: integer("created_at"),
});

export const storeMessages = pgTable("store_messages", {
  id: text("id").primaryKey(),
  senderId: text("sender_id").notNull(),
  receiverId: text("receiver_id").notNull(),
  productId: text("product_id"),
  orderId: text("order_id"),
  text: text("text"),
  read: boolean("read").default(false),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── BOOKMARKS ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const bookmarks = pgTable("bookmarks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  itemType: text("item_type"),
  itemId: text("item_id"),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── ANNOUNCEMENTS ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const announcements = pgTable("announcements", {
  id: text("id").primaryKey(),
  title: text("title"),
  body: text("body"),
  link: text("link"),
  audience: text("audience"),
  published: boolean("published").default(false),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── FLASHCARDS ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const flashcards = pgTable("flashcards", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  category: text("category"),
  front: text("front"),
  back: text("back"),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── AI TABLES ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const aiConversations = pgTable("ai_conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title"),
  modelId: text("model_id"),
  createdAt: integer("created_at"),
});

export const aiMessages = pgTable("ai_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  role: text("role"),
  content: text("content"),
  modelId: text("model_id"),
  tokensUsed: integer("tokens_used"),
  createdAt: integer("created_at"),
});

export const aiModels = pgTable("ai_models", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  modelId: text("model_id"),
  provider: text("provider"),
  description: text("description"),
  isFree: boolean("is_free").default(true),
  active: boolean("active").default(true),
  sortOrder: integer("sort_order"),
  dailyLimit: integer("daily_limit"),
  pricePerMessage: integer("price_per_message"),
  baseUrl: text("base_url"),
  apiKey: text("api_key"),
  systemPrompt: text("system_prompt"),
  temperature: real("temperature"),
  maxTokens: integer("max_tokens"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── MISC ─────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const coupons = pgTable("coupons", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  percent: integer("percent"),
  active: boolean("active").default(true),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  expiresAt: integer("expires_at"),
  createdAt: integer("created_at"),
});

export const instructorPayments = pgTable("instructor_payments", {
  id: text("id").primaryKey(),
  instructorId: text("instructor_id").notNull(),
  amount: integer("amount"),
  status: text("status"),
  description: text("description"),
  approvedBy: text("approved_by"),
  receiptUrl: text("receipt_url"),
  createdAt: integer("created_at"),
});

export const sitePages = pgTable("site_pages", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title"),
  content: text("content"),
  updatedAt: integer("updated_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── NOTIFICATIONS ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  read: boolean("read").default(false),
  type: text("type"),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── SUPPORT TICKETS ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const supportTickets = pgTable("support_tickets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  subject: text("subject").notNull(),
  category: text("category"),
  priority: text("priority").default("normal"),
  status: text("status").default("open"),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

export const supportReplies = pgTable("support_replies", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull(),
  userId: text("user_id").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── EXAM RESULTS ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const examResults = pgTable("exam_results", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  examId: text("exam_id").notNull(),
  score: integer("score"),
  total: integer("total"),
  answers: jsonb("answers").$type<Record<string, string>>(),
  startedAt: integer("started_at"),
  completedAt: integer("completed_at"),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── QUESTIONS ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  options: jsonb("options").$type<string[]>(),
  correctAnswer: text("correct_answer"),
  explanation: text("explanation"),
  examId: text("exam_id"),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── CLASS RESOURCES ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const classResources = pgTable("class_resources", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default("file"),
  url: text("url"),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  price: integer("price").default(0),
  free: boolean("free").default(true),
  courseId: text("course_id"),
  classRoomId: text("class_room_id"),
  published: boolean("published").default(true),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── AI CONFIG & QUOTAS ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const aiConfig = pgTable("ai_config", {
  key: text("key").primaryKey(),
  value: text("value"),
});

export const aiTokenQuotas = pgTable("ai_token_quotas", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  dailyLimit: integer("daily_limit").default(50),
  extraTokens: integer("extra_tokens").default(0),
  createdAt: integer("created_at"),
});

export const aiUsage = pgTable("ai_usage", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  modelId: text("model_id"),
  messagesCount: integer("messages_count").default(0),
  tokensUsed: integer("tokens_used").default(0),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── INSTRUCTOR NOTES & SUGGESTED COURSES ─────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const instructorSuggestedCourses = pgTable("instructor_suggested_courses", {
  id: text("id").primaryKey(),
  instructorId: text("instructor_id").notNull(),
  courseId: text("course_id").notNull(),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── CLASS ENROLLMENTS ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const classEnrollments = pgTable("class_enrollments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  classRoomId: text("class_room_id").notNull(),
  status: text("status").default("enrolled"),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── DAILY QUIZ ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const dailyQuizzes = pgTable("daily_quizzes", {
  id: text("id").primaryKey(),
  date: text("date").notNull().unique(),
  questions: jsonb("questions").$type<Record<string, unknown>[]>(),
  createdAt: integer("created_at"),
});

export const dailyQuizResults = pgTable("daily_quiz_results", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  quizId: text("quiz_id").notNull(),
  score: integer("score"),
  answers: jsonb("answers").$type<Record<string, string>>(),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── TESTIMONIALS ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const testimonials = pgTable("testimonials", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role"),
  text: text("text"),
  avatar: text("avatar"),
  rating: integer("rating"),
  published: boolean("published").default(true),
  createdAt: integer("created_at"),
});

// ══════════════════════════════════════════════════════════════════════════════
// ── INBOX / DIRECT MESSAGES ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const inboxMessages = pgTable("inbox_messages", {
  id: text("id").primaryKey(),
  senderId: text("sender_id").notNull(),
  receiverId: text("receiver_id").notNull(),
  text: text("text"),
  read: boolean("read").default(false),
  createdAt: integer("created_at"),
});
