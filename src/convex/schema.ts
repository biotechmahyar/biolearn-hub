import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const ROLES = [
  "user",
  "member",
  "instructor",
  "mentor",
  "content_manager",
  "support",
  "site_admin",
  "admin",
] as const;

export const roleValidator = v.union(
  ...ROLES.map((r) => v.literal(r))
);

export default defineSchema({
  // ── Auth ────────────────────────────────────────────────────────────────
  authAccounts: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    providerAccountId: v.string(),
    secret: v.optional(v.string()),
  }).index("providerAndAccountId", ["provider", "providerAccountId"]),

  authSessions: defineTable({
    userId: v.id("users"),
    expiresAt: v.number(),
  }),

  authRefreshTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  authVerificationCodes: defineTable({
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
  }).index("by_email", ["email"]),

  admins: defineTable({
    email: v.string(),
  }).index("by_email", ["email"]),

  // ── Users ───────────────────────────────────────────────────────────────
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    secondaryRole: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    phone: v.optional(v.string()),
    university: v.optional(v.string()),
    major: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    telegramUsername: v.optional(v.string()),
    telegramChatId: v.optional(v.string()),
    telegramNotificationsEnabled: v.optional(v.boolean()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    pendingProfile: v.optional(v.any()),
    telegramId: v.optional(v.string()),
  }),

  // ── Presence ────────────────────────────────────────────────────────────
  presence: defineTable({
    userId: v.id("users"),
    name: v.string(),
    role: v.string(),
    location: v.optional(v.string()),
    lastSeen: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_lastSeen", ["lastSeen"]),

  // ── Profiles ────────────────────────────────────────────────────────────
  profiles: defineTable({
    userId: v.id("users"),
    suggestedCourses: v.optional(v.array(v.string())),
  }).index("by_user", ["userId"]),

  // ── Content ─────────────────────────────────────────────────────────────
  categories: defineTable({
    name: v.string(),
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    published: v.boolean(),
    order: v.optional(v.number()),
    icon: v.optional(v.string()),
    accent: v.optional(v.string()),
  }),

  instructors: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    title: v.string(),
    slug: v.string(),
    bio: v.string(),
    specialties: v.array(v.string()),
    accent: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    avatarUrl: v.optional(v.string()),
    education: v.optional(v.array(v.string())),
  }).index("by_slug", ["slug"]),

  courses: defineTable({
    title: v.string(),
    slug: v.string(),
    summary: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    instructorId: v.optional(v.id("instructors")),
    instructorName: v.optional(v.string()),
    status: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    duration: v.optional(v.string()),
    price: v.optional(v.number()),
    packages: v.optional(v.any()),
    published: v.optional(v.boolean()),
    featured: v.optional(v.boolean()),
    coverUrl: v.optional(v.string()),
    lessons: v.optional(v.array(v.any())),
    syllabus: v.optional(v.array(v.string())),
    prerequisites: v.optional(v.array(v.string())),
    learningObjectives: v.optional(v.array(v.string())),
    featuredImage: v.optional(v.string()),
    ogTitle: v.optional(v.string()),
    ogDescription: v.optional(v.string()),
    ogImage: v.optional(v.string()),
    rating: v.optional(v.number()),
    studentCount: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    popular: v.optional(v.boolean()),
    accent: v.optional(v.string()),
    audience: v.optional(v.array(v.string())),
    durationText: v.optional(v.string()),
    mode: v.optional(v.string()),
    rating: v.optional(v.number()),
    ratingCount: v.optional(v.number()),
    studentsCount: v.optional(v.number()),
    bundle: v.optional(v.any()),
    packagePrices: v.optional(v.any()),
    learningObjectives: v.optional(v.array(v.string())),
    status: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["published"])
    .index("by_status", ["status"]),

  articles: defineTable({
    title: v.string(),
    slug: v.string(),
    excerpt: v.optional(v.string()),
    body: v.string(),
    category: v.optional(v.string()),
    authorName: v.optional(v.string()),
    readTime: v.optional(v.number()),
    published: v.boolean(),
    featured: v.optional(v.boolean()),
    coverUrl: v.optional(v.string()),
    featuredImage: v.optional(v.string()),
    ogTitle: v.optional(v.string()),
    ogDescription: v.optional(v.string()),
    ogImage: v.optional(v.string()),
    accent: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    status: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.array(v.string())),
    seoCanonical: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["published"]),

  products: defineTable({
    title: v.string(),
    slug: v.string(),
    summary: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    type: v.optional(v.string()),
    accent: v.optional(v.string()),
    price: v.optional(v.number()),
    published: v.boolean(),
    featured: v.optional(v.boolean()),
    coverUrl: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    topic: v.optional(v.string()),
  })
    .index("by_slug", ["slug"]),

  workshops: defineTable({
    title: v.string(),
    slug: v.string(),
    summary: v.optional(v.string()),
    description: v.optional(v.string()),
    instructorId: v.optional(v.id("instructors")),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    price: v.optional(v.number()),
    published: v.boolean(),
    featured: v.optional(v.boolean()),
    coverUrl: v.optional(v.string()),
    topic: v.optional(v.string()),
    capacity: v.optional(v.number()),
    registeredCount: v.optional(v.number()),
    agenda: v.optional(v.string()),
    free: v.optional(v.boolean()),
  })
    .index("by_slug", ["slug"]),

  dictionaryTerms: defineTable({
    term: v.string(),
    slug: v.string(),
    definition: v.string(),
    category: v.string(),
    phonetic: v.optional(v.string()),
    relatedTerms: v.optional(v.array(v.string())),
    usageExample: v.optional(v.string()),
    scientificName: v.optional(v.string()),
    habitat: v.optional(v.string()),
    diseases: v.optional(v.array(v.string())),
    imageUrl: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"]),

  // ── Dictionary Likes ────────────────────────────────────────────────────
  dictionaryLikes: defineTable({
    userId: v.id("users"),
    termId: v.id("dictionaryTerms"),
  }).index("by_user_term", ["userId", "termId"]),

  // ── E-commerce ──────────────────────────────────────────────────────────
  orders: defineTable({
    userId: v.id("users"),
    items: v.array(v.any()),
    total: v.number(),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("cancelled"), v.literal("offline_paid")),
    paymentMethod: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  enrollments: defineTable({
    userId: v.id("users"),
    courseId: v.id("courses"),
    purchasedItemId: v.optional(v.id("orders")),
    enrolledAt: v.number(),
    completedLessons: v.array(v.string()),
  }).index("by_user", ["userId"])
    .index("by_course", ["courseId"]),

  // ── Exams ───────────────────────────────────────────────────────────────
  exams: defineTable({
    title: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    durationMinutes: v.number(),
    questionCount: v.number(),
    questionIds: v.optional(v.array(v.id("questions"))),
    free: v.boolean(),
    diagnostic: v.optional(v.boolean()),
    published: v.boolean(),
    featured: v.optional(v.boolean()),
    accent: v.optional(v.string()),
  }),

  questions: defineTable({
    text: v.string(),
    options: v.array(v.string()),
    correctIndex: v.number(),
    explanation: v.optional(v.string()),
    topicId: v.id("categories"),
    difficulty: v.number(),
  }).index("by_topic", ["topicId"]),

  examAttempts: defineTable({
    userId: v.id("users"),
    examId: v.id("exams"),
    answers: v.array(v.number()),
    score: v.number(),
    total: v.number(),
    percent: v.number(),
    startedAt: v.number(),
    finishedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_exam", ["examId"]),

  // ── Daily Quiz ──────────────────────────────────────────────────────────
  dailyQuizConfig: defineTable({
    date: v.string(),
    questions: v.array(v.id("questions")),
  }).index("by_date", ["date"]),

  // ── Bookmarks / Flashcards ──────────────────────────────────────────────
  bookmarks: defineTable({
    userId: v.id("users"),
    itemType: v.string(),
    itemId: v.string(),
    addedAt: v.number(),
  }).index("by_user", ["userId"]),

  flashcards: defineTable({
    userId: v.id("users"),
    front: v.string(),
    back: v.string(),
    category: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ── Tickets / Support ───────────────────────────────────────────────────
  tickets: defineTable({
    userId: v.id("users"),
    subject: v.string(),
    message: v.string(),
    status: v.union(v.literal("open"), v.literal("replied"), v.literal("closed")),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"]),

  ticketReplies: defineTable({
    ticketId: v.id("tickets"),
    userId: v.id("users"),
    message: v.string(),
    createdAt: v.number(),
  }).index("by_ticket", ["ticketId"]),

  // ── Comments ────────────────────────────────────────────────────────────
  comments: defineTable({
    userId: v.id("users"),
    itemType: v.string(),
    itemId: v.string(),    text: v.string(),
    userName: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_item", ["itemType", "itemId"])
    .index("by_user", ["userId"]),

  // ── Notifications ───────────────────────────────────────────────────────
  notifications: defineTable({
    title: v.string(),
    body: v.optional(v.string()),
    authorName: v.string(),
    targetType: v.union(v.literal("all"), v.literal("course"), v.literal("exam")),
    targetId: v.optional(v.string()),
    targetTitle: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_targetType", ["targetType"]),

  inbox: defineTable({
    userId: v.id("users"),
    title: v.string(),
    body: v.optional(v.string()),
    unread: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ── Direct Messages ─────────────────────────────────────────────────────
  messages: defineTable({
    senderId: v.id("users"),
    receiverId: v.id("users"),
    text: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_receiver", ["receiverId"])
    .index("by_sender", ["senderId"]),

  // ── Instructor Payments ─────────────────────────────────────────────────
  instructorPayments: defineTable({
    instructorId: v.id("users"),
    amount: v.number(),
    description: v.string(),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("rejected")),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    receiptUrl: v.optional(v.string()),
  }).index("by_instructor", ["instructorId"])
    .index("by_status", ["status"]),

  // ── Instructor Bank Info ────────────────────────────────────────────────
  instructorBankInfo: defineTable({
    instructorId: v.id("users"),
    bankCardNumber: v.string(),
    bankName: v.optional(v.string()),
    accountHolderName: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_instructor", ["instructorId"]),

  // ── Course Resources ────────────────────────────────────────────────────
  courseResources: defineTable({
    courseId: v.optional(v.id("courses")),
    roomId: v.optional(v.id("classRooms")),
    instructorId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    fileUrl: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    isFree: v.boolean(),
    price: v.optional(v.number()),
    commission: v.optional(v.number()),
    resourceType: v.optional(v.union(v.literal("file"), v.literal("link"))),
    linkUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_course", ["courseId"])
    .index("by_room", ["roomId"]),

  // ── Class Rooms ─────────────────────────────────────────────────────────
  classRooms: defineTable({
    instructorId: v.id("users"),
    instructorName: v.string(),
    title: v.string(),
    topic: v.string(),
    description: v.string(),
    status: v.union(v.literal("live"), v.literal("ended"), v.literal("scheduled")),
    broadcasting: v.boolean(),
    createdAt: v.number(),
    boardBg: v.optional(v.string()),
    broadcastKind: v.optional(v.string()),
    platformUrl: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
  })
    .index("by_instructor", ["instructorId"])
    .index("by_status", ["status"]),

  // Class creation requests from instructors → admin approval
  classRequests: defineTable({
    instructorId: v.id("users"),
    instructorName: v.string(),
    title: v.string(),
    topic: v.string(),
    description: v.string(),
    proposedDate: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    platformUrl: v.optional(v.string()),
  })
    .index("by_instructor", ["instructorId"])
    .index("by_status", ["status"]),

  // Instructor's whiteboard / screen-share annotations
  whiteboardStrokes: defineTable({
    roomId: v.id("classRooms"),
    layer: v.union(v.literal("board"), v.literal("screen")),
    tool: v.union(v.literal("pen"), v.literal("highlighter"), v.literal("eraser")),
    color: v.string(),
    size: v.number(),
    points: v.array(v.object({ x: v.number(), y: v.number() })),
    createdAt: v.number(),
  }).index("by_room_layer", ["roomId", "layer"]),

  // WebRTC signaling
  signals: defineTable({
    roomId: v.id("classRooms"),
    senderId: v.id("users"),
    targetId: v.optional(v.id("users")),
    type: v.string(),
    payload: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_room", ["roomId"]),

  // ── Room Messages ───────────────────────────────────────────────────────
  roomMessages: defineTable({
    roomId: v.id("classRooms"),
    userId: v.id("users"),
    name: v.string(),
    role: v.string(),
    type: v.union(v.literal("message"), v.literal("question")),
    text: v.string(),
    answer: v.optional(v.string()),
    createdAt: v.number(),
    attachmentType: v.optional(v.string()),
    attachmentName: v.optional(v.string()),
    attachmentStorageId: v.optional(v.string()),
    attachmentSize: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_room_created", ["roomId", "createdAt"]),

  // ── Attendance ──────────────────────────────────────────────────────────
  attendance: defineTable({
    roomId: v.id("classRooms"),
    instructorId: v.id("users"),
    studentId: v.id("users"),
    studentName: v.string(),
    present: v.boolean(),
    note: v.optional(v.string()),
    markedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_student", ["studentId"]),

  // ── Course Studio (Instructor Drafts) ───────────────────────────────────
  courseStudio: defineTable({
    instructorId: v.id("users"),
    title: v.string(),
    slug: v.string(),
    summary: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    duration: v.optional(v.string()),
    price: v.optional(v.number()),
    packages: v.optional(v.any()),
    published: v.boolean(),
    featured: v.optional(v.boolean()),
    coverUrl: v.optional(v.string()),
    lessons: v.optional(v.array(v.any())),
    syllabus: v.optional(v.array(v.string())),
    prerequisites: v.optional(v.array(v.string())),
    learningObjectives: v.optional(v.array(v.string())),
    status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
    submittedAt: v.optional(v.number()),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    reviewNote: v.optional(v.string()),
  })
    .index("by_instructor", ["instructorId"])
    .index("by_status", ["status"]),

  // ── Telegram Bot ────────────────────────────────────────────────────────
  telegramBotUsers: defineTable({
    userId: v.id("users"),
    telegramChatId: v.string(),
    telegramUsername: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_chatId", ["telegramChatId"]),

  // ── AI ──────────────────────────────────────────────────────────────────
  aiConfig: defineTable({
    key: v.optional(v.string()),
    value: v.optional(v.string()),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    apiKeyEncrypted: v.optional(v.string()),
    temperature: v.optional(v.number()),
    maxTokensPerRequest: v.optional(v.number()),
    systemPrompt: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),

  aiModels: defineTable({
    name: v.string(),
    provider: v.string(),
    sortOrder: v.optional(v.number()),
    baseUrl: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    modelId: v.string(),
    maxTokens: v.number(),
    temperature: v.number(),
    active: v.boolean(),
    isFree: v.boolean(),
    pricePerMessage: v.optional(v.number()),
    order: v.number(),
    createdAt: v.number(),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    dailyLimit: v.optional(v.number()),
    description: v.optional(v.string()),
  }),

  aiPrompts: defineTable({
    name: v.string(),
    category: v.string(),
    content: v.string(),
    isDefault: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  }),

  aiConversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    modelId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  aiMessages: defineTable({
    conversationId: v.id("aiConversations"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    modelId: v.optional(v.string()),
    tokensUsed: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  aiUsage: defineTable({
    userId: v.id("users"),
    modelId: v.string(),
    tokensUsed: v.number(),
    messagesCount: v.number(),
    messagesSent: v.optional(v.number()),
    date: v.string(),
    createdAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  aiTokenQuotas: defineTable({
    userId: v.id("users"),
    dailyLimit: v.number(),
    extraTokens: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ── Daily Quiz Answers ─────────────────────────────────────────────────
  dailyQuizAnswers: defineTable({
    userId: v.id("users"),
    quizDate: v.string(),
    answers: v.array(v.number()),
    score: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ── Mentor ─────────────────────────────────────────────────────────────
  mentorGroups: defineTable({
    name: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    instructorId: v.id("users"),
    mentorId: v.optional(v.id("users")),
    memberCount: v.optional(v.number()),
    capacity: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_instructor", ["instructorId"]),

  mentorQuestions: defineTable({
    userId: v.id("users"),
    groupId: v.optional(v.id("mentorGroups")),
    text: v.string(),
    answer: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_student", ["userId"]),

  mentorSessions: defineTable({
    mentorId: v.id("users"),
    mentorName: v.optional(v.string()),
    studentId: v.id("users"),
    title: v.optional(v.string()),
    date: v.string(),
    time: v.string(),
    topic: v.optional(v.string()),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_student", ["studentId"]),

  // ── Reminders ──────────────────────────────────────────────────────────
  reminders: defineTable({
    userId: v.id("users"),
    title: v.string(),
    body: v.optional(v.string()),
    link: v.optional(v.string()),
    kind: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ── Announcements (Instructor) — uses notifications table above ──────

  // ── Article Versions ───────────────────────────────────────────────────
  articleVersions: defineTable({
    articleId: v.id("articles"),
    body: v.string(),
    authorId: v.id("users"),
    createdAt: v.number(),
  }).index("by_article", ["articleId"]),

  // ── Class Enroll Requests ──────────────────────────────────────────────
  classEnrollRequests: defineTable({
    userId: v.id("users"),
    courseId: v.id("courses"),
    roomId: v.optional(v.id("classRooms")),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // ── Coupons ────────────────────────────────────────────────────────────
  coupons: defineTable({
    code: v.string(),
    discount: v.number(),
    percent: v.optional(v.number()),
    maxUses: v.number(),
    usedCount: v.number(),
    active: v.boolean(),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_code", ["code"]),

  // ── Exam Reports ───────────────────────────────────────────────────────
  examReports: defineTable({
    examId: v.id("exams"),
    userId: v.id("users"),
    reason: v.string(),
    status: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  // ── Group Announcements ────────────────────────────────────────────────
  groupAnnouncements: defineTable({
    groupId: v.id("mentorGroups"),
    authorId: v.id("users"),
    title: v.string(),
    body: v.optional(v.string()),
    createdAt: v.number(),
  }),

  groupMembers: defineTable({
    groupId: v.id("mentorGroups"),
    userId: v.id("users"),
    joinedAt: v.number(),
  }),

  // ── Inbox Messages ─────────────────────────────────────────────────────
  inboxMessages: defineTable({
    userId: v.id("users"),
    title: v.string(),
    body: v.optional(v.string()),
    unread: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ── Media Items ────────────────────────────────────────────────────────
  mediaItems: defineTable({
    storageId: v.string(),
    url: v.string(),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  }),

  // ── Offline Payments ──────────────────────────────────────────────────
  offlinePayments: defineTable({
    userId: v.id("users"),
    orderId: v.id("orders"),
    courseId: v.optional(v.id("courses")),
    amount: v.number(),
    receiptUrl: v.optional(v.string()),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // ── Site Pages ─────────────────────────────────────────────────────────
  sitePages: defineTable({
    slug: v.string(),
    title: v.string(),
    body: v.string(),
    published: v.boolean(),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  siteTexts: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  // ── Super Admin Sessions ───────────────────────────────────────────────
  superAdminSessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  }),

  // ── Telegram ───────────────────────────────────────────────────────────
  telegramBot: defineTable({
    chatId: v.string(),
    userId: v.id("users"),
    active: v.boolean(),
    tokenEncrypted: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_chatId", ["chatId"])
    .index("by_user", ["userId"]),

  telegramLinkingCodes: defineTable({
    code: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
    used: v.boolean(),
  }),

  telegramNotifLog: defineTable({
    userId: v.id("users"),
    title: v.string(),
    sentAt: v.number(),
  }),

  telegramNotifPrefs: defineTable({
    userId: v.id("users"),
    enabled: v.boolean(),
    types: v.optional(v.array(v.string())),
  }).index("by_user", ["userId"]),

  // ── Testimonials ───────────────────────────────────────────────────────
  testimonials: defineTable({
    userId: v.id("users"),
    name: v.string(),
    text: v.string(),
    rating: v.optional(v.number()),
    published: v.boolean(),
    createdAt: v.number(),
  }),

  directMessages: defineTable({
    senderId: v.id("users"),
    receiverId: v.id("users"),
    text: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_receiver", ["receiverId"])
    .index("by_sender", ["senderId"]),
});
