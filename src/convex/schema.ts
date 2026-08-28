import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// Role-based access: Student, Instructor, Mentor, Content Manager, Support, Admin
export const ROLES = {
  ADMIN: "admin",
  SITE_ADMIN: "site_admin",
  USER: "user",
  MEMBER: "member",
  INSTRUCTOR: "instructor",
  MENTOR: "mentor",
  CONTENT_MANAGER: "content_manager",
  SUPPORT: "support",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.SITE_ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
  v.literal(ROLES.INSTRUCTOR),
  v.literal(ROLES.MENTOR),
  v.literal(ROLES.CONTENT_MANAGER),
  v.literal(ROLES.SUPPORT),
);
export type Role = Infer<typeof roleValidator>;

// Course delivery model: Live / Recorded / Hybrid (In-person is future)
export const courseModeValidator = v.union(
  v.literal("live"),
  v.literal("recorded"),
  v.literal("hybrid"),
);
export type CourseMode = Infer<typeof courseModeValidator>;

// Bundle tiers: Basic / Plus / Premium
export const bundleValidator = v.union(
  v.literal("economy"),
  v.literal("basic"),
  v.literal("plus"),
  v.literal("premium"),
);
export type Bundle = Infer<typeof bundleValidator>;

// Course package tiers with configurable prices and features
export const coursePackageValidator = v.object({
  id: v.string(),
  name: v.string(),
  tier: bundleValidator,
  price: v.number(),
  features: v.array(v.string()),
  active: v.boolean(),
});
export type CoursePackage = Infer<typeof coursePackageValidator>;

// Physical product types
export const productTypeValidator = v.union(
  v.literal("flashcards"),
  v.literal("guide"),
  v.literal("poster"),
);
export type ProductType = Infer<typeof productTypeValidator>;

// What an order item can point at
export const itemTypeValidator = v.union(
  v.literal("course"),
  v.literal("product"),
  v.literal("workshop"),
);
export type ItemType = Infer<typeof itemTypeValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),

      role: v.optional(roleValidator),
      university: v.optional(v.string()),
      major: v.optional(v.string()),

      // Member profiles (name parts, photo, academic bio). Edits are staged in
      // pendingProfile until a site admin approves them.
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      avatarStorageId: v.optional(v.string()),
      about: v.optional(v.string()),
      suggestedCourseIds: v.optional(v.array(v.id("courses"))),
      pendingProfile: v.optional(
        v.object({
          firstName: v.optional(v.string()),
          lastName: v.optional(v.string()),
          avatarStorageId: v.optional(v.string()),
          about: v.optional(v.string()),
          submittedAt: v.number(),
        }),
      ),
    }).index("email", ["email"]),

    // ── Catalog ──────────────────────────────────────────────────────────
    categories: defineTable({
      name: v.string(), // Persian display name
      slug: v.string(),
      description: v.string(),
      icon: v.string(), // lucide icon name
      accent: v.string(), // teal | emerald | sky | amber | violet | rose | indigo
      order: v.number(),
    }).index("by_slug", ["slug"]),

    instructors: defineTable({
      name: v.string(),
      slug: v.string(),
      title: v.string(), // e.g. "دانشجوی کارشناسی میکروبیولوژی"
      bio: v.string(),
      education: v.array(v.string()),
      specialties: v.array(v.string()),
      accent: v.string(),
      verified: v.boolean(),
    }).index("by_slug", ["slug"]),

    courses: defineTable({
      title: v.string(),
      slug: v.string(),
      categoryId: v.id("categories"),
      instructorId: v.id("instructors"),
      summary: v.string(),
      description: v.string(),
      audience: v.array(v.string()),
      prerequisites: v.array(v.string()),
      syllabus: v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          durationMin: v.number(),
          free: v.boolean(),
        }),
      ),
      durationText: v.string(),
      mode: courseModeValidator,
      price: v.number(), // in Toman
      discountPrice: v.optional(v.number()),
      rating: v.number(),
      ratingCount: v.number(),
      studentsCount: v.number(),
      accent: v.string(),
      bundle: bundleValidator,
      includes: v.array(v.string()),
      hasSampleVideo: v.boolean(),
      files: v.array(
        v.object({
          name: v.string(),
          size: v.string(),
          type: v.string(),
        }),
      ),
      published: v.boolean(),
      featured: v.boolean(),
      popular: v.boolean(),
      createdAt: v.number(),

      // Per-package pricing: each tier has its own price and features.
      packagePrices: v.optional(
        v.array(
          v.object({
            tier: bundleValidator,
            price: v.number(),
            features: v.array(v.string()),
          }),
        ),
      ),

      // Instructor-designed course flow: authorId = the user who designed it,
      // status = draft → pending (sent to admin) → published / rejected.
      authorId: v.optional(v.id("users")),
      status: v.optional(
        v.union(v.literal("draft"), v.literal("pending"), v.literal("rejected")),
      ),
      reviewNote: v.optional(v.string()),
    })
      .index("by_slug", ["slug"])
      .index("by_category", ["categoryId"])
      .index("by_published", ["published"])
      .index("by_featured", ["featured"])
      .index("by_author", ["authorId"]),

    products: defineTable({
      title: v.string(),
      slug: v.string(),
      type: productTypeValidator,
      description: v.string(),
      price: v.number(),
      accent: v.string(),
      published: v.boolean(),
      featured: v.boolean(),
      createdAt: v.number(),
    }).index("by_slug", ["slug"]),

    workshops: defineTable({
      title: v.string(),
      slug: v.string(),
      instructorId: v.id("instructors"),
      topic: v.string(),
      date: v.string(), // ISO date
      time: v.string(), // e.g. "۱۸:۰۰"
      capacity: v.number(),
      registeredCount: v.number(),
      price: v.number(),
      description: v.string(),
      agenda: v.array(v.string()),
      free: v.boolean(),
      expertTalk: v.boolean(),
      published: v.boolean(),
    }).index("by_slug", ["slug"]),

    articles: defineTable({
      title: v.string(),
      slug: v.string(),
      category: v.string(),
      excerpt: v.string(),
      body: v.string(),
      authorName: v.string(),
      accent: v.string(),
      readTime: v.number(), // minutes
      published: v.boolean(),
      featured: v.boolean(),
      createdAt: v.number(),
    }).index("by_slug", ["slug"]),

    dictionaryTerms: defineTable({
      term: v.string(),
      slug: v.string(),
      fullName: v.string(),
      gramStatus: v.string(),
      shape: v.string(),
      oxygen: v.string(),
      habitat: v.string(),
      diseases: v.array(v.string()),
      virulence: v.array(v.string()),
      diagnosis: v.string(),
      characteristics: v.array(v.string()),
      examNotes: v.array(v.string()),
      sources: v.array(v.string()),
    })
      .index("by_slug", ["slug"])
      .index("by_term", ["term"]),

    // ── Assessment ───────────────────────────────────────────────────────
    questions: defineTable({
      text: v.string(),
      options: v.array(v.string()),
      correctIndex: v.number(),
      explanation: v.string(),
      topicId: v.id("categories"),
      difficulty: v.number(), // 1 | 2 | 3
    }).index("by_topic", ["topicId"]),

    exams: defineTable({
      title: v.string(),
      slug: v.string(),
      description: v.string(),
      durationMinutes: v.number(),
      questionIds: v.array(v.id("questions")),
      free: v.boolean(),
      published: v.boolean(),
      featured: v.boolean(),
      diagnostic: v.boolean(),
      accent: v.string(),
      order: v.number(),
    }).index("by_slug", ["slug"]),

    examReports: defineTable({
      userId: v.id("users"),
      examId: v.id("exams"),
      questionId: v.id("questions"),
      comment: v.string(),
      status: v.union(v.literal("open"), v.literal("resolved")),
      createdAt: v.number(),
    })
      .index("by_status", ["status"])
      .index("by_user", ["userId"])
      .index("by_exam", ["examId"]),

    examAttempts: defineTable({
      userId: v.id("users"),
      examId: v.id("exams"),
      answers: v.array(
        v.object({
          questionId: v.id("questions"),
          chosenIndex: v.number(),
        }),
      ),
      score: v.number(),
      total: v.number(),
      percent: v.number(),
      topicBreakdown: v.array(
        v.object({
          topicId: v.id("categories"),
          topicName: v.string(),
          correct: v.number(),
          total: v.number(),
          percent: v.number(),
        }),
      ),
      startedAt: v.number(),
      finishedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_exam", ["examId"]),

    dailyQuiz: defineTable({
      date: v.string(), // YYYY-MM-DD
      questionId: v.id("questions"),
      points: v.number(),
    }).index("by_date", ["date"]),

    dailyQuizAnswers: defineTable({
      userId: v.id("users"),
      date: v.string(),
      questionId: v.id("questions"),
      chosenIndex: v.number(),
      correct: v.boolean(),
      points: v.number(),
      answeredAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_date", ["date"]),

    // ── Commerce ──────────────────────────────────────────────────────────
    orders: defineTable({
      userId: v.id("users"),
      items: v.array(
        v.object({
          type: itemTypeValidator,
          refId: v.string(),
          title: v.string(),
          price: v.number(),
        }),
      ),
      subtotal: v.number(),
      discountAmount: v.number(),
      total: v.number(),
      couponCode: v.optional(v.string()),
      status: v.union(v.literal("paid"), v.literal("pending"), v.literal("cancelled")),
      invoiceNumber: v.string(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"])
      .index("by_created", ["createdAt"]),

    coupons: defineTable({
      code: v.string(),
      percent: v.number(),
      active: v.boolean(),
      maxUses: v.number(),
      usedCount: v.number(),
      expiresAt: v.optional(v.number()),
    }).index("by_code", ["code"]),

    enrollments: defineTable({
      userId: v.id("users"),
      courseId: v.id("courses"),
      completedLessons: v.array(v.string()),
      enrolledAt: v.number(),
      lastActiveAt: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_course", ["courseId"]),

    // Reminders shown to a user (exam deadlines, course nudges). Each row can
    // be shown up to 2 times before it is considered done.
    reminders: defineTable({
      userId: v.id("users"),
      kind: v.union(
        v.literal("exam_new"),
        v.literal("exam_next"),
        v.literal("course_nudge"),
      ),
      refId: v.string(), // exam/course id
      title: v.string(),
      body: v.string(),
      link: v.string(), // route to open
      shownCount: v.number(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_kind", ["userId", "kind"]),

    // Announcements from site admins (everyone) or instructors (their own
    // students / courses).
    announcements: defineTable({
      authorId: v.id("users"),
      authorName: v.string(),
      authorRole: v.string(),
      targetType: v.union(
        v.literal("all"),
        v.literal("course"),
        v.literal("exam"),
      ),
      targetId: v.optional(v.string()),
      targetTitle: v.optional(v.string()),
      title: v.string(),
      body: v.string(),
      createdAt: v.number(),
    })
      .index("by_created", ["createdAt"])
      .index("by_author", ["authorId"]),

    bookmarks: defineTable({
      userId: v.id("users"),
      contentType: v.string(), // course | article | product | workshop
      contentId: v.string(),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    flashcards: defineTable({
      userId: v.id("users"),
      front: v.string(),
      back: v.string(),
      category: v.string(),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // ── Live collaboration (rooms, presence, mentoring) ───────────────────
    presence: defineTable({
      userId: v.id("users"),
      name: v.optional(v.string()),
      role: v.optional(v.string()),
      location: v.optional(v.string()),
      lastSeen: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_lastSeen", ["lastSeen"]),

    classRooms: defineTable({
      instructorId: v.id("users"),
      instructorName: v.string(),
      title: v.string(),
      topic: v.string(),
      description: v.string(),
      status: v.union(v.literal("live"), v.literal("scheduled"), v.literal("ended")),
      broadcasting: v.boolean(),
      broadcastKind: v.optional(v.union(v.literal("camera"), v.literal("screen"))),
      boardBg: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_instructor", ["instructorId"])
      .index("by_status", ["status"]),

    // Instructor's whiteboard / screen-share annotations. Points are stored
    // normalized (0..1) so every client scales them to its own canvas size.
    whiteboardStrokes: defineTable({
      roomId: v.id("classRooms"),
      layer: v.union(v.literal("board"), v.literal("screen")),
      tool: v.union(v.literal("pen"), v.literal("highlighter"), v.literal("eraser")),
      color: v.string(),
      size: v.number(), // fraction of the canvas min dimension
      points: v.array(v.object({ x: v.number(), y: v.number() })),
      createdAt: v.number(),
    })
      .index("by_room_layer", ["roomId", "layer"])
      .index("by_room_layer_created", ["roomId", "layer", "createdAt"]),

    roomMessages: defineTable({
      roomId: v.id("classRooms"),
      userId: v.id("users"),
      name: v.string(),
      role: v.optional(v.string()),
      type: v.union(v.literal("question"), v.literal("message"), v.literal("answer")),
      text: v.string(),
      answer: v.optional(v.string()),
      attachmentType: v.optional(
        v.union(v.literal("file"), v.literal("voice"), v.literal("image")),
      ),
      attachmentName: v.optional(v.string()),
      attachmentStorageId: v.optional(v.string()),
      attachmentSize: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_room", ["roomId"])
      .index("by_room_created", ["roomId", "createdAt"]),

    // WebRTC signaling: offers/answers/ICE candidates for live broadcasts.
    signals: defineTable({
      roomId: v.id("classRooms"),
      from: v.id("users"),
      to: v.optional(v.id("users")),
      type: v.union(v.literal("offer"), v.literal("answer"), v.literal("candidate")),
      data: v.string(), // JSON-encoded SDP or ICE candidate
      createdAt: v.number(),
    }).index("by_room", ["roomId"]),

    mentorGroups: defineTable({
      mentorId: v.id("users"),
      mentorName: v.string(),
      title: v.string(),
      description: v.string(),
      meetingDay: v.string(),
      meetingTime: v.string(),
      capacity: v.number(),
      memberCount: v.number(),
      createdAt: v.number(),
    })
      .index("by_mentor", ["mentorId"])
      .index("by_created", ["createdAt"]),

    mentorQuestions: defineTable({
      studentId: v.id("users"),
      studentName: v.string(),
      topic: v.string(),
      text: v.string(),
      status: v.union(v.literal("open"), v.literal("answered")),
      answer: v.optional(v.string()),
      answeredByName: v.optional(v.string()),
      answeredAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_student", ["studentId"])
      .index("by_status", ["status"])
      .index("by_created", ["createdAt"]),

    mentorSessions: defineTable({
      mentorId: v.id("users"),
      mentorName: v.string(),
      studentId: v.id("users"),
      title: v.string(),
      date: v.string(),
      time: v.string(),
      notes: v.string(),
      status: v.union(v.literal("scheduled"), v.literal("done"), v.literal("cancelled")),
      createdAt: v.number(),
    })
      .index("by_mentor", ["mentorId"])
      .index("by_student", ["studentId"])
      .index("by_created", ["createdAt"]),

    // ── Support ───────────────────────────────────────────────────────────
    tickets: defineTable({
      userId: v.id("users"),
      subject: v.string(),
      status: v.union(v.literal("open"), v.literal("answered"), v.literal("closed")),
      createdAt: v.number(),
      updatedAt: v.number(),
      messages: v.array(
        v.object({
          author: v.string(), // student | admin
          text: v.string(),
          at: v.number(),
        }),
      ),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),

    // ── Comments (articles, courses, ...) ─────────────────────────────────
    comments: defineTable({
      contentType: v.string(), // article | course
      contentId: v.string(),
      userId: v.id("users"),
      text: v.string(),
      createdAt: v.number(),
    })
      .index("by_content", ["contentType", "contentId"])
      .index("by_user", ["userId"]),

    // ── Trust & community ─────────────────────────────────────────────────
    testimonials: defineTable({
      name: v.string(),
      role: v.string(),
      text: v.string(),
      rating: v.number(),
      course: v.string(),
      accent: v.string(),
    }),

    // Emails allowed into the admin panel (seedable; promotes via email match)
    admins: defineTable({
      email: v.string(),
    }).index("by_email", ["email"]),

    // ── Offline payments ───────────────────────────────────────────────────
    offlinePayments: defineTable({
      userId: v.id("users"),
      courseId: v.id("courses"),
      tier: bundleValidator,
      amount: v.number(),
      trackingNumber: v.string(),
      receiptStorageId: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
      note: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"])
      .index("by_course", ["courseId"]),

    // ── Class enrollment requests ──────────────────────────────────────────
    classEnrollRequests: defineTable({
      userId: v.id("users"),
      roomId: v.id("classRooms"),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
      createdAt: v.number(),
    })
      .index("by_room", ["roomId"])
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),

    // Per-account inbox: messages the site admin sends to a specific user.
    inboxMessages: defineTable({
      userId: v.id("users"),
      title: v.string(),
      body: v.string(),
      readAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_created", ["createdAt"]),

    // ── AI Chat system ─────────────────────────────────────────────────
    // Singleton row storing global AI config (API key, model, provider, base URL).
    aiConfig: defineTable({
      provider: v.string(),            // e.g. "openai", "gapgpt", "anthropic"
      model: v.string(),               // e.g. "gpt-4o", "gapgpt-qwen-3.5"
      baseUrl: v.string(),             // API base URL
      apiKeyEncrypted: v.string(),     // Encrypted API key (server-side only)
      maxTokensPerRequest: v.number(),
      temperature: v.number(),
      systemPrompt: v.string(),        // Default system prompt
      updatedAt: v.number(),
      updatedBy: v.id("users"),
    }),

    // ── Multi-model AI configuration ────────────────────────────────────
    aiModels: defineTable({
      name: v.string(),                // Display name e.g. "GPT-4o Mini"
      provider: v.string(),            // "openai" | "anthropic" | "google" | "custom"
      model: v.string(),               // Model ID e.g. "gpt-4o-mini"
      baseUrl: v.string(),             // API base URL
      apiKey: v.string(),              // API key (server-side only)
      isFree: v.boolean(),             // Free or paid?
      dailyLimit: v.number(),          // Daily message limit per user
      pricePerMessage: v.number(),     // Cost per message (0 = free)
      description: v.string(),         // Description of what this model is good for
      systemPrompt: v.optional(v.string()), // Custom system prompt
      maxTokens: v.number(),           // Max tokens per request
      temperature: v.number(),         // Temperature
      active: v.boolean(),             // Enabled/disabled
      sortOrder: v.number(),           // Display order
      createdBy: v.id("users"),
      createdAt: v.number(),
    }),

    // Admin-managed prompt templates
    aiPrompts: defineTable({
      name: v.string(),
      content: v.string(),
      category: v.string(),           // e.g. "general", "biology", "exam"
      isDefault: v.boolean(),
      createdBy: v.id("users"),
      createdAt: v.number(),
    })
      .index("by_category", ["category"]),

    // AI conversations per user
    aiConversations: defineTable({
      userId: v.id("users"),
      title: v.string(),
      promptId: v.optional(v.id("aiPrompts")),
      modelId: v.optional(v.id("aiModels")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"]),

    // Individual messages in a conversation
    aiMessages: defineTable({
      conversationId: v.id("aiConversations"),
      role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
      content: v.string(),
      tokensUsed: v.number(),
      createdAt: v.number(),
    })
      .index("by_conversation", ["conversationId"]),

    // Daily usage tracking per user (resets each day)
    aiUsage: defineTable({
      userId: v.id("users"),
      date: v.string(),               // "YYYY-MM-DD"
      messagesSent: v.number(),
      tokensUsed: v.number(),
    })
      .index("by_user_date", ["userId", "date"]),

    // Per-user token quota overrides (admin can charge more tokens)
    aiTokenQuotas: defineTable({
      userId: v.id("users"),
      dailyLimit: v.number(),          // Override daily message limit
      extraTokens: v.number(),         // Bonus tokens beyond free quota
      grantedAt: v.number(),
      grantedBy: v.id("users"),
      note: v.optional(v.string()),
    })
      .index("by_user", ["userId"]),

    // ── Super Admin access sessions ──────────────────────────────────────
    superAdminSessions: defineTable({
      userId: v.id("users"),
      createdAt: v.number(),
      expiresAt: v.number(),
    }).index("by_user", ["userId"]),

    // ── Site content / custom pages ──────────────────────────────────────
    sitePages: defineTable({
      slug: v.string(),
      title: v.string(),
      htmlContent: v.string(),
      createdBy: v.id("users"),
      updatedAt: v.number(),
    }).index("by_slug", ["slug"]),

    // ── Site text overrides ──────────────────────────────────────────────
    siteTexts: defineTable({
      key: v.string(),
      value: v.string(),
      updatedBy: v.id("users"),
      updatedAt: v.number(),
    }).index("by_key", ["key"]),

  },
  {
    schemaValidation: false,
  },
);

export default schema;
