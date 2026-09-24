import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";
// Compact validator aliases (this file is very large).
const OPT = v.optional, STR = v.string, NUM = v.number, L = v.literal, UN = v.union;
const ID = v.id, ARR = v.array, OBJ = v.object, BOOL = v.boolean;

// Role-based access: Student, Instructor, Mentor, Content Manager, Support, Admin
export const ROLES = {
  // role keys used across the platform
  ADMIN: "admin",
  SITE_ADMIN: "site_admin",
  USER: "user",
  MEMBER: "member",
  INSTRUCTOR: "instructor",
  MENTOR: "mentor",
  CONTENT_MANAGER: "content_manager",
  SUPPORT: "support",
} as const;

export const roleValidator = UN(
  L(ROLES.ADMIN),
  L(ROLES.SITE_ADMIN),
  L(ROLES.USER),
  L(ROLES.MEMBER),
  L(ROLES.INSTRUCTOR),
  L(ROLES.MENTOR),
  L(ROLES.CONTENT_MANAGER),
  L(ROLES.SUPPORT),
);
export type Role = Infer<typeof roleValidator>;

// Course delivery model: Live / Recorded / Hybrid (In-person is future)
export const courseModeValidator = UN(
  L("live"),
  L("recorded"),
  L("hybrid"),
);
export type CourseMode = Infer<typeof courseModeValidator>;

// Bundle tiers: Basic / Plus / Premium
export const bundleValidator = UN(
  L("economy"),
  L("basic"),
  L("plus"),
  L("premium"),
);
export type Bundle = Infer<typeof bundleValidator>;

// Course package tiers with configurable prices and features
export const coursePackageValidator = OBJ({
  id: STR(),
  name: STR(),
  tier: bundleValidator,
  price: NUM(),
  features: ARR(STR()),
  active: BOOL(),
});
export type CoursePackage = Infer<typeof coursePackageValidator>;

// Physical product types
export const productTypeValidator = UN(
  L("flashcards"),
  L("guide"),
  L("poster"),
  L("notes"),
  L("book"),
  L("package"),
  L("other"),
);
export type ProductType = Infer<typeof productTypeValidator>;

// What an order item can point at
export const itemTypeValidator = UN(
  L("course"),
  L("product"),
  L("workshop"),
  L("path"),
  L("ai_subscription"),
);
export type ItemType = Infer<typeof itemTypeValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify
    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: OPT(STR()),
      image: OPT(STR()),
      email: OPT(STR()),
      emailVerificationTime: OPT(NUM()),
      isAnonymous: OPT(BOOL()),
      role: OPT(roleValidator),
      secondaryRole: OPT(roleValidator),
      university: OPT(STR()),
      major: OPT(STR()),
      // Member profiles (name parts, photo, academic bio). Edits are staged in
      // pendingProfile until a site admin approves them.
      firstName: OPT(STR()),
      lastName: OPT(STR()),
      firstNameLatin: OPT(STR()),
      lastNameLatin: OPT(STR()),
      avatarStorageId: OPT(STR()),
      about: OPT(STR()),
      phone: OPT(STR()),
      address: OPT(STR()),
      postalCode: OPT(STR()),
      suggestedCourseIds: OPT(ARR(ID("courses"))),
      pendingProfile: OPT(
        OBJ({
          firstName: OPT(STR()),
          lastName: OPT(STR()),
          avatarStorageId: OPT(STR()),
          about: OPT(STR()),
          submittedAt: NUM(),
        }),
      ),
      // Telegram account linking
      telegramId: OPT(NUM()),       // Telegram user numeric ID
      telegramUsername: OPT(STR()),  // @username from Telegram
      telegramFirstName: OPT(STR()), // First name from Telegram
      telegramLinkedAt: OPT(NUM()),  // When the account was linked
      telegramNotificationsEnabled: OPT(BOOL()), // Master toggle
      // Bale account linking (Bale Messenger — Iranian platform)
      baleId: OPT(NUM()),           // Bale user numeric ID
      baleUsername: OPT(STR()),       // @username from Bale
      baleFirstName: OPT(STR()),      // First name from Bale
      baleLinkedAt: OPT(NUM()),        // When the Bale account was linked
      // Bank account for instructor payments
      bankName: OPT(STR()),
      bankAccountNumber: OPT(STR()),
      bankCardNumber: OPT(STR()),
      bankSheba: OPT(STR()),
    }).index("email", ["email"]).index("by_telegramId", ["telegramId"]).index("by_baleId", ["baleId"]),
    // ── Catalog ──────────────────────────────────────────────────────────
    categories: defineTable({
      name: STR(), // Persian display name
      slug: STR(),
      description: STR(),
      icon: STR(), // lucide icon name
      accent: STR(), // teal | emerald | sky | amber | violet | rose | indigo
      order: NUM(),
    }).index("by_slug", ["slug"]),
    instructors: defineTable({
      name: STR(),
      slug: STR(),
      title: STR(), // e.g. "دانشجوی کارشناسی میکروبیولوژی"
      bio: STR(),
      education: ARR(STR()),
      specialties: ARR(STR()),
      accent: STR(),
      verified: BOOL(),
      userId: OPT(ID("users")), // linked registered user
      photoUrl: OPT(STR()), // instructor photo URL
      order: OPT(NUM()), // ترتیب نمایش در صفحه اصلی؛ عدد کمترتر بالاتر
    }).index("by_slug", ["slug"])
      .index("by_user", ["userId"]),
    courses: defineTable({
      title: STR(),
      slug: STR(),
      categoryId: ID("categories"),
      instructorId: ID("instructors"),
      summary: STR(),
      description: STR(),
      audience: ARR(STR()),
      prerequisites: ARR(STR()),
      syllabus: ARR(
        OBJ({
          id: STR(),
          title: STR(),
          durationMin: NUM(),
          free: BOOL(),
        }),
      ),
      durationText: STR(),
      mode: courseModeValidator,
      price: NUM(), // in Toman
      discountPrice: OPT(NUM()),
      discountExpiresAt: OPT(NUM()),
      rating: NUM(),
      ratingCount: NUM(),
      studentsCount: NUM(),
      accent: STR(),
      bundle: bundleValidator,
      includes: ARR(STR()),
      hasSampleVideo: BOOL(),
      files: ARR(
        OBJ({
          name: STR(),
          size: STR(),
          type: STR(),
        }),
      ),
      published: BOOL(),
      featured: BOOL(),
      popular: BOOL(),
      createdAt: NUM(),
      // Per-package pricing: each tier has its own price and features.
      packagePrices: OPT(
        ARR(
          OBJ({
            tier: bundleValidator,
            price: NUM(),
            features: ARR(STR()),
          }),
        ),
      ),
      // Instructor-designed course flow: authorId = the user who designed it,
      // status = draft → pending (sent to admin) → published / rejected.
      authorId: OPT(ID("users")),
      status: OPT(
        UN(L("draft"), L("pending"), L("approved"), L("rejected")),
      ),
      reviewNote: OPT(STR()),
      // ── Genova Plus & skills (backward-compatible optional) ──────────
      track: OPT(UN(L("standard"), L("genova_plus"))), // ژنوا پلاس track
      practical: OPT(BOOL()), // دوره عملی (executes labs — costs more)
      skillSlugs: OPT(ARR(STR())), // linked skill pages (skills table)
    })
      .index("by_slug", ["slug"])
      .index("by_category", ["categoryId"])
      .index("by_published", ["published"])
      .index("by_featured", ["featured"])
      .index("by_author", ["authorId"]),
    // ── Course Sections & Lessons (hierarchical curriculum) ────────────────
    courseSections: defineTable({
      courseId: ID("courses"),
      title: STR(),
      description: OPT(STR()),
      order: NUM(),
      createdAt: NUM(),
    })
      .index("by_course", ["courseId"])
      .index("by_course_order", ["courseId", "order"]),
    courseLessons: defineTable({
      courseId: ID("courses"),
      sectionId: ID("courseSections"),
      title: STR(),
      description: OPT(STR()),
      order: NUM(),
      contentType: OPT(UN(
        L("video"),
        L("videoUrl"),
        L("text"),
        L("file"),
        L("embedCode"),
      )),
      videoUrl: OPT(STR()),
      videoStorageId: OPT(STR()),
      textContent: OPT(STR()),
      embedCode: OPT(STR()),
      showVideo: OPT(BOOL()),
      showText: OPT(BOOL()),
      showFiles: OPT(BOOL()),
      attachments: OPT(ARR(OBJ({
        name: STR(),
        storageId: STR(),
        fileType: STR(),
        fileSize: NUM(),
      }))),
      durationMin: NUM(),
      isPreview: BOOL(),
      isPublished: BOOL(),
      createdAt: NUM(),
      updatedAt: NUM(),
    })
      .index("by_section", ["sectionId"])
      .index("by_course", ["courseId"])
      .index("by_course_section", ["courseId", "sectionId"])
      .index("by_section_order", ["sectionId", "order"]),
    products: defineTable({
      title: STR(),
      slug: STR(),
      type: productTypeValidator,
      description: STR(),
      price: NUM(),
      discountPrice: OPT(NUM()),
      discountExpiresAt: OPT(NUM()),
      accent: STR(),
      published: BOOL(),
      featured: BOOL(),
      coverImage: OPT(STR()),
      stock: OPT(NUM()),
      createdAt: NUM(),
    }).index("by_slug", ["slug"]),
    workshops: defineTable({
      title: STR(),
      slug: STR(),
      instructorId: ID("instructors"),
      topic: STR(),
      date: STR(), // ISO date
      time: STR(), // e.g. "۱۸:۰۰"
      capacity: NUM(),
      registeredCount: NUM(),
      price: NUM(),
      description: STR(),
      agenda: ARR(STR()),
      free: BOOL(),
      expertTalk: BOOL(),
      published: BOOL(),
      coverImage: OPT(STR()),
      platformUrl: OPT(STR()), // external platform link
    }).index("by_slug", ["slug"]),
    articles: defineTable({
      title: STR(),
      slug: STR(),
      subtitle: OPT(STR()),
      category: STR(),
      tags: OPT(ARR(STR())),
      excerpt: STR(),
      body: STR(), // HTML from TipTap
      authorName: STR(),
      authorId: OPT(ID("users")),
      featuredImage: OPT(STR()),
      accent: STR(),
      readTime: NUM(),
      level: OPT(UN(L("beginner"), L("intermediate"), L("advanced"))),
      status: OPT(UN(L("draft"), L("in_review"), L("scheduled"), L("published"), L("archived"))),
      scheduledAt: OPT(NUM()),
      published: BOOL(),
      featured: BOOL(),
      // SEO fields
      seoTitle: OPT(STR()),
      seoDescription: OPT(STR()),
      seoKeywords: OPT(ARR(STR())),
      seoCanonical: OPT(STR()),
      ogTitle: OPT(STR()),
      ogDescription: OPT(STR()),
      ogImage: OPT(STR()),
      // References / citations
      references: OPT(ARR(OBJ({
        title: STR(),
        authors: STR(),
        journal: STR(),
        year: NUM(),
        doi: OPT(STR()),
        url: OPT(STR()),
      }))),
      createdAt: NUM(),
      updatedAt: NUM(),
    })
      .index("by_slug", ["slug"])
      .index("by_status", ["status"])
      .index("by_author", ["authorId"]),
    dictionaryTerms: defineTable({
      term: STR(),
      slug: STR(),
      fullName: STR(),
      gramStatus: STR(),
      shape: STR(),
      oxygen: STR(),
      habitat: STR(),
      diseases: ARR(STR()),
      virulence: ARR(STR()),
      diagnosis: STR(),
      characteristics: ARR(STR()),
      examNotes: ARR(STR()),
      sources: ARR(STR()),
    })
      .index("by_slug", ["slug"])
      .index("by_term", ["term"]),
    // ── Assessment ───────────────────────────────────────────────────────
    questions: defineTable({
      text: STR(),
      options: ARR(STR()),
      correctIndex: NUM(),
      explanation: STR(),
      topicId: ID("categories"),
      difficulty: NUM(), // 1 | 2 | 3
    }).index("by_topic", ["topicId"]),
    exams: defineTable({
      title: STR(),
      slug: STR(),
      description: STR(),
      durationMinutes: NUM(),
      questionIds: ARR(ID("questions")),
      free: BOOL(),
      published: BOOL(),
      featured: BOOL(),
      diagnostic: BOOL(),
      accent: STR(),
      order: NUM(),
    }).index("by_slug", ["slug"]),
    examReports: defineTable({
      userId: ID("users"),
      examId: ID("exams"),
      questionId: ID("questions"),
      comment: STR(),
      status: UN(L("open"), L("resolved")),
      createdAt: NUM(),
    })
      .index("by_status", ["status"])
      .index("by_user", ["userId"])
      .index("by_exam", ["examId"]),
    examAttempts: defineTable({
      userId: ID("users"),
      examId: ID("exams"),
      answers: ARR(
        OBJ({
          questionId: ID("questions"),
          chosenIndex: NUM(),
        }),
      ),
      score: NUM(),
      total: NUM(),
      percent: NUM(),
      topicBreakdown: ARR(
        OBJ({
          topicId: ID("categories"),
          topicName: STR(),
          correct: NUM(),
          total: NUM(),
          percent: NUM(),
        }),
      ),
      startedAt: NUM(),
      finishedAt: NUM(),
    })
      .index("by_user", ["userId"])
      .index("by_exam", ["examId"]),
    dailyQuiz: defineTable({
      date: STR(), // YYYY-MM-DD
      questionId: ID("questions"),
      points: NUM(),
    }).index("by_date", ["date"]),
    dailyQuizAnswers: defineTable({
      userId: ID("users"),
      date: STR(),
      questionId: ID("questions"),
      chosenIndex: NUM(),
      correct: BOOL(),
      points: NUM(),
      answeredAt: NUM(),
    })
      .index("by_user", ["userId"])
      .index("by_date", ["date"]),
    // ── Commerce ──────────────────────────────────────────────────────────
    orders: defineTable({
      userId: ID("users"),
      items: ARR(
        OBJ({
          type: itemTypeValidator,
          refId: STR(),
          title: STR(),
          price: NUM(),
        }),
      ),
      subtotal: NUM(),
      discountAmount: NUM(),
      total: NUM(),
      couponCode: OPT(STR()),
      status: UN(L("paid"), L("pending"), L("cancelled")),
      payMethod: OPT(UN(L("wallet"), L("online"), L("offline"))),
      invoiceNumber: STR(),
      createdAt: NUM(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"])
      .index("by_created", ["createdAt"]),
    coupons: defineTable({
      code: STR(),
      percent: NUM(),
      active: BOOL(),
      maxUses: NUM(),
      usedCount: NUM(),
      expiresAt: OPT(NUM()),
    }).index("by_code", ["code"]),
    enrollments: defineTable({
      userId: ID("users"),
      courseId: ID("courses"),
      completedLessons: ARR(STR()),
      enrolledAt: NUM(),
      lastActiveAt: OPT(NUM()),
      // Enriched fields (backward-compatible optional)
      packageTier: OPT(STR()),
      orderId: OPT(ID("orders")),
      lastLessonId: OPT(STR()),
    })
      .index("by_user", ["userId"])
      .index("by_course", ["courseId"]),
    // Reminders shown to a user (exam deadlines, course nudges). Each row can
    // be shown up to 2 times before it is considered done.
    reminders: defineTable({
      userId: ID("users"),
      kind: UN(
        L("exam_new"),
        L("exam_next"),
        L("course_nudge"),
      ),
      refId: STR(), // exam/course id
      title: STR(),
      body: STR(),
      link: STR(), // route to open
      shownCount: NUM(),
      createdAt: NUM(),
    })
      .index("by_user", ["userId"])
      .index("by_user_kind", ["userId", "kind"]),
    // Announcements from site admins (everyone) or instructors (their own
    // students / courses).
    announcements: defineTable({
      authorId: ID("users"),
      authorName: STR(),
      authorRole: STR(),
      targetType: UN(
        L("all"),
        L("course"),
        L("exam"),
      ),
      targetId: OPT(STR()),
      targetTitle: OPT(STR()),
      title: STR(),
      body: STR(),
      createdAt: NUM(),
    })
      .index("by_created", ["createdAt"])
      .index("by_author", ["authorId"]),
    bookmarks: defineTable({
      userId: ID("users"),
      contentType: STR(), // course | article | product | workshop
      contentId: STR(),
      createdAt: NUM(),
    }).index("by_user", ["userId"]),
    flashcards: defineTable({
      userId: ID("users"),
      front: STR(),
      back: STR(),
      category: STR(),
      createdAt: NUM(),
    }).index("by_user", ["userId"]),
    // ── Live collaboration (rooms, presence, mentoring) ───────────────────
    presence: defineTable({
      userId: ID("users"),
      name: OPT(STR()),
      role: OPT(STR()),
      location: OPT(STR()),
      lastSeen: NUM(),
    })
      .index("by_user", ["userId"])
      .index("by_lastSeen", ["lastSeen"]),
    classRooms: defineTable({
      instructorId: ID("users"),
      instructorName: STR(),
      title: STR(),
      topic: STR(),
      description: STR(),
      status: UN(L("live"), L("scheduled"), L("ended")),
      broadcasting: BOOL(),
      broadcastKind: OPT(UN(L("camera"), L("screen"))),
      boardBg: OPT(STR()),
      speakers: OPT(ARR(ID("users"))), // approved speakers (students with active mic)
      createdAt: NUM(),
      platformUrl: OPT(STR()), // external platform link
      scheduledDate: OPT(STR()), // proposed date by instructor
    })
      .index("by_instructor", ["instructorId"])
      .index("by_status", ["status"]),
    // Class creation requests from instructors → admin approval
    classRequests: defineTable({
      instructorId: ID("users"),
      instructorName: STR(),
      title: STR(),
      topic: STR(),
      description: STR(),
      proposedDate: STR(), // instructor proposed date
      immediate: OPT(BOOL()), // urgent: no scheduled date
      status: UN(L("pending"), L("approved"), L("rejected")),
      createdAt: NUM(),
      reviewedBy: OPT(ID("users")),
      reviewedAt: OPT(NUM()),
      platformUrl: OPT(STR()), // admin sets the link
      createdRoomId: OPT(ID("classRooms")), // room created upon approval
    })
      .index("by_instructor", ["instructorId"])
      .index("by_status", ["status"]),
    // Instructor's whiteboard / screen-share annotations. Points are stored
    // normalized (0..1) so every client scales them to its own canvas size.
    whiteboardStrokes: defineTable({
      roomId: ID("classRooms"),
      layer: UN(L("board"), L("screen")),
      tool: UN(L("pen"), L("highlighter"), L("eraser")),
      color: STR(),
      size: NUM(), // fraction of the canvas min dimension
      points: ARR(OBJ({ x: NUM(), y: NUM() })),
      createdAt: NUM(),
    })
      .index("by_room_layer", ["roomId", "layer"])
      .index("by_room_layer_created", ["roomId", "layer", "createdAt"]),
    roomMessages: defineTable({
      roomId: ID("classRooms"),
      userId: ID("users"),
      name: STR(),
      role: OPT(STR()),
      type: UN(L("question"), L("message"), L("answer")),
      text: STR(),
      answer: OPT(STR()),
      attachmentType: OPT(
        UN(L("file"), L("voice"), L("image")),
      ),
      attachmentName: OPT(STR()),
      attachmentStorageId: OPT(STR()),
      attachmentSize: OPT(NUM()),
      createdAt: NUM(),
    })
      .index("by_room", ["roomId"])
      .index("by_room_created", ["roomId", "createdAt"]),
    // WebRTC signaling: offers/answers/ICE candidates for live broadcasts.
    signals: defineTable({
      roomId: ID("classRooms"),
      from: ID("users"),
      to: OPT(ID("users")),
      type: UN(L("offer"), L("answer"), L("candidate")),
      data: STR(), // JSON-encoded SDP or ICE candidate
      createdAt: NUM(),
    }).index("by_room", ["roomId"]),
    mentorGroups: defineTable({
      mentorId: ID("users"),
      mentorName: STR(),
      title: STR(),
      description: STR(),
      meetingDay: STR(),
      meetingTime: STR(),
      capacity: NUM(),
      memberCount: NUM(),
      createdAt: NUM(),
    })
      .index("by_mentor", ["mentorId"])
      .index("by_created", ["createdAt"]),
    mentorQuestions: defineTable({
      studentId: ID("users"),
      studentName: STR(),
      topic: STR(),
      text: STR(),
      status: UN(L("open"), L("answered")),
      answer: OPT(STR()),
      answeredByName: OPT(STR()),
      answeredAt: OPT(NUM()),
      createdAt: NUM(),
    })
      .index("by_student", ["studentId"])
      .index("by_status", ["status"])
      .index("by_created", ["createdAt"]),
    mentorSessions: defineTable({
      mentorId: ID("users"),
      mentorName: STR(),
      studentId: ID("users"),
      title: STR(),
      date: STR(),
      time: STR(),
      notes: STR(),
      status: UN(L("scheduled"), L("done"), L("cancelled")),
      createdAt: NUM(),
    })
      .index("by_mentor", ["mentorId"])
      .index("by_student", ["studentId"])
      .index("by_created", ["createdAt"]),
    // ── Mentor Group Members ───────────────────────────────────────────────
    groupMembers: defineTable({
      groupId: ID("mentorGroups"),
      userId: ID("users"),
      userName: STR(),
      joinedAt: NUM(),
    })
      .index("by_group", ["groupId"])
      .index("by_user", ["userId"])
      .index("by_group_user", ["groupId", "userId"]),
    // ── Group Announcements ────────────────────────────────────────────────
    groupAnnouncements: defineTable({
      groupId: ID("mentorGroups"),
      mentorId: ID("users"),
      mentorName: STR(),
      title: STR(),
      message: STR(),
      createdAt: NUM(),
    })
      .index("by_group", ["groupId"]),
    // ── Support ───────────────────────────────────────────────────────────
    tickets: defineTable({
      userId: ID("users"),
      subject: STR(),
      status: UN(L("open"), L("answered"), L("closed")),
      createdAt: NUM(),
      updatedAt: NUM(),
      messages: ARR(
        OBJ({
          author: STR(), // student | admin
          text: STR(),
          at: NUM(),
        }),
      ),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),
    // ── Comments (articles, courses, ...) ─────────────────────────────────
    comments: defineTable({
      contentType: STR(), // article | course
      contentId: STR(),
      userId: ID("users"),
      userName: OPT(STR()),
      text: STR(),
      approved: BOOL(),
      rejected: OPT(BOOL()),
      createdAt: NUM(),
    })
      .index("by_content", ["contentType", "contentId"])
      .index("by_user", ["userId"])
      .index("by_approved", ["approved"]),
    // ── Course resources / file uploads ──────────────────────────────────
    courseResources: defineTable({
      courseId: OPT(ID("courses")),
      roomId: OPT(ID("classRooms")),
      instructorId: ID("users"),
      title: STR(),
      description: OPT(STR()),
      fileUrl: STR(),
      fileName: STR(),
      fileSize: NUM(),
      fileType: STR(),
      isFree: BOOL(),
      price: OPT(NUM()), // base price in toman (0 = free)
      commission: OPT(NUM()), // 4% platform commission
      resourceType: OPT(UN(L("file"), L("link"))), // file upload or external link
      linkUrl: OPT(STR()), // external link URL
      createdAt: NUM(),
    }).index("by_course", ["courseId"])
      .index("by_room", ["roomId"]),
    // ── Class attendance ─────────────────────────────────────────────────
    attendance: defineTable({
      roomId: ID("classRooms"),
      instructorId: ID("users"),
      studentId: ID("users"),
      studentName: STR(),
      present: BOOL(),
      note: OPT(STR()),
      markedAt: NUM(),
    })
      .index("by_room", ["roomId"])
      .index("by_student", ["studentId"]),
    // ── Instructor payments ──────────────────────────────────────────────
    instructorPayments: defineTable({
      instructorId: ID("users"),
      amount: NUM(),
      description: STR(),
      status: UN(L("pending"), L("paid"), L("rejected")),
      receiptUrl: OPT(STR()),
      paidAt: OPT(NUM()),
      createdAt: NUM(),
    }).index("by_instructor", ["instructorId"]),
    // ── Direct messages (instructor ↔ student) ──────────────────────────
    directMessages: defineTable({
      senderId: ID("users"),
      receiverId: ID("users"),
      text: STR(),
      read: BOOL(),
      createdAt: NUM(),
    })
      .index("by_receiver", ["receiverId", "read"])
      .index("by_sender", ["senderId"]),
    // ── Trust & community ─────────────────────────────────────────────────
    testimonials: defineTable({
      name: STR(),
      role: STR(),
      text: STR(),
      rating: NUM(),
      course: STR(),
      accent: STR(),
    }),
    // Emails allowed into the admin panel (seedable; promotes via email match)
    admins: defineTable({
      email: STR(),
    }).index("by_email", ["email"]),
    // ── Offline payments ───────────────────────────────────────────────────
    offlinePayments: defineTable({
      userId: ID("users"),
      courseId: ID("courses"),
      tier: bundleValidator,
      amount: NUM(),
      trackingNumber: STR(),
      receiptStorageId: STR(),
      status: UN(
        L("pending"),
        L("approved"),
        L("rejected"),
      ),
      note: OPT(STR()),
      createdAt: NUM(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"])
      .index("by_course", ["courseId"]),
    // ── Class enrollment requests ──────────────────────────────────────────
    classEnrollRequests: defineTable({
      userId: ID("users"),
      roomId: ID("classRooms"),
      status: UN(
        L("pending"),
        L("approved"),
        L("rejected"),
      ),
      createdAt: NUM(),
    })
      .index("by_room", ["roomId"])
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),
    // Per-account inbox: messages the site admin sends to a specific user.
    inboxMessages: defineTable({
      userId: ID("users"),
      title: STR(),
      body: STR(),
      readAt: OPT(NUM()),
      createdAt: NUM(),
    })
      .index("by_user", ["userId"])
      .index("by_created", ["createdAt"]),
    // ── AI Chat system ─────────────────────────────────────────────────
    // Singleton row storing global AI config (API key, model, provider, base URL).
    aiConfig: defineTable({
      provider: STR(),            // e.g. "openai", "gapgpt", "anthropic"
      model: STR(),               // e.g. "gpt-4o", "gapgpt-qwen-3.5"
      baseUrl: STR(),             // API base URL
      apiKeyEncrypted: STR(),     // Encrypted API key (server-side only)
      maxTokensPerRequest: NUM(),
      temperature: NUM(),
      systemPrompt: STR(),        // Default system prompt
      updatedAt: NUM(),
      updatedBy: ID("users"),
    }),
    // ── Multi-model AI configuration ────────────────────────────────────
    aiModels: defineTable({
      name: STR(),                // Display name e.g. "GPT-4o Mini"
      provider: STR(),            // "openai" | "anthropic" | "google" | "custom"
      model: STR(),               // Model ID e.g. "gpt-4o-mini"
      baseUrl: STR(),             // API base URL
      apiKey: STR(),              // API key (server-side only)
      isFree: BOOL(),             // Free or paid?
      dailyLimit: NUM(),          // Daily message limit per user
      pricePerMessage: NUM(),     // Cost per message (0 = free)
      description: STR(),         // Description of what this model is good for
      systemPrompt: OPT(STR()), // Custom system prompt
      maxTokens: NUM(),           // Max tokens per request
      temperature: NUM(),         // Temperature
      active: BOOL(),             // Enabled/disabled
      sortOrder: NUM(),           // Display order
      createdBy: ID("users"),
      createdAt: NUM(),
    }),
    // Admin-managed prompt templates
    aiPrompts: defineTable({
      name: STR(),
      content: STR(),
      category: STR(),           // e.g. "general", "biology", "exam"
      isDefault: BOOL(),
      createdBy: ID("users"),
      createdAt: NUM(),
    })
      .index("by_category", ["category"]),
    // AI conversations per user
    aiConversations: defineTable({
      userId: ID("users"),
      title: STR(),
      promptId: OPT(ID("aiPrompts")),
      modelId: OPT(ID("aiModels")),
      createdAt: NUM(),
      updatedAt: NUM(),
    })
      .index("by_user", ["userId"]),
    // Individual messages in a conversation
    aiMessages: defineTable({
      conversationId: ID("aiConversations"),
      role: UN(L("user"), L("assistant"), L("system")),
      content: STR(),
      tokensUsed: NUM(),
      createdAt: NUM(),
    })
      .index("by_conversation", ["conversationId"]),
    // Daily usage tracking per user (resets each day)
    aiUsage: defineTable({
      userId: ID("users"),
      date: STR(),               // "YYYY-MM-DD"
      messagesSent: NUM(),
      tokensUsed: NUM(),
    })
      .index("by_user_date", ["userId", "date"]),
    // Per-user token quota overrides (admin can charge more tokens)
    aiTokenQuotas: defineTable({
      userId: ID("users"),
      dailyLimit: NUM(),          // Override daily message limit
      extraTokens: NUM(),         // Bonus tokens beyond free quota
      grantedAt: NUM(),
      grantedBy: ID("users"),
      note: OPT(STR()),
    })
      .index("by_user", ["userId"]),
    // ── AI Chat Subscriptions (paid tiers) ──────────────────────────────────
    aiSubscriptions: defineTable({
      userId: ID("users"),
      tier: UN(L("bronze"), L("silver"), L("gold")),
      dailyLimit: NUM(),           // Messages per day for this tier
      startedAt: NUM(),
      expiresAt: NUM(),             // Subscription expiry
      orderId: OPT(STR()),   // Reference to payment order
      active: BOOL(),
    })
      .index("by_user", ["userId"])
      .index("by_active", ["active"]),
    // ── Telegram Bot Configuration (admin-only) ─────────────────────────
    telegramBot: defineTable({
      tokenEncrypted: STR(),       // Encrypted bot token (server-side only)
      botId: OPT(STR()),    // Telegram bot numeric ID
      botName: OPT(STR()),  // Bot display name from getMe
      botUsername: OPT(STR()), // @username from getMe
      webhookUrl: OPT(STR()),  // Configured webhook URL
      connected: BOOL(),           // Is bot connected?
      active: BOOL(),              // Enabled/disabled
      startMessage: STR(),         // Welcome message for /start
      lastTestedAt: OPT(NUM()),
      lastTestResult: OPT(STR()), // "success" or error message
      commands: OPT(ARR(OBJ({ command: STR(), description: STR() }))),
      commandsSyncedAt: OPT(NUM()),
      updatedBy: ID("users"),
      updatedAt: NUM(),
      createdAt: NUM(),
    }),
    // ── Bale Bot Configuration ─────────────────────────────────────────
    baleBot: defineTable({
      tokenEncrypted: STR(),       // Encrypted Bale bot token (server-side only)
      botId: OPT(STR()),    // Bale bot numeric ID
      botName: OPT(STR()),  // Bot display name from getMe
      botUsername: OPT(STR()), // @username from getMe
      webhookUrl: OPT(STR()),  // Configured webhook URL
      connected: BOOL(),           // Is bot connected?
      active: BOOL(),              // Enabled/disabled
      startMessage: STR(),         // Welcome message for /start
      lastTestedAt: OPT(NUM()),
      lastTestResult: OPT(STR()),
      updatedBy: ID("users"),
      updatedAt: NUM(),
      createdAt: NUM(),
    }),
    // ── Super Admin access sessions ──────────────────────────────────────
    // Telegram account linking codes (one-time use, expiring) ────────────
    telegramLinkingCodes: defineTable({
      userId: ID("users"),
      code: STR(),             // Random linking code
      createdAt: NUM(),
      expiresAt: NUM(),        // 10 min expiry
      usedAt: OPT(NUM()), // null = unused
      telegramId: OPT(NUM()), // Set after linking
    }).index("by_code", ["code"]).index("by_user", ["userId"]),
    // Bot multi-step input state (e.g. user is expected to type a question,
    // an AI prompt or a session request) — one row per telegram user.
    botPendingInputs: defineTable({
      telegramId: NUM(),
      kind: STR(),          // "ask" | "ai" | "session_title" | "session_date" | "session_time"
      payload: OPT(v.any()),
      createdAt: NUM(),
    }).index("by_telegramId", ["telegramId"]),
    // Telegram notification preferences (per-user, per-category) ─────────
    telegramNotifPrefs: defineTable({
      userId: ID("users"),
      mentorReplies: BOOL(),
      tasks: BOOL(),
      deadlines: BOOL(),
      meetings: BOOL(),
      groupNotifs: BOOL(),
      articles: BOOL(),
      system: BOOL(),
    }).index("by_user", ["userId"]),

    // Telegram notification log (duplicate prevention) ─────────────────────
    telegramNotifLog: defineTable({
      userId: ID("users"),
      type: STR(),          // notification category
      key: STR(),           // unique event key for idempotency
      sentAt: NUM(),
      success: BOOL(),
    }).index("by_key", ["key"]).index("by_user_type", ["userId", "type"]),

    superAdminSessions: defineTable({
      userId: ID("users"),
      createdAt: NUM(),
      expiresAt: NUM(),
    }).index("by_user", ["userId"]),
    // ── Site content / custom pages ──────────────────────────────────────
    sitePages: defineTable({
      slug: STR(),
      title: STR(),
      htmlContent: STR(),
      createdBy: ID("users"),
      updatedAt: NUM(),
    }).index("by_slug", ["slug"]),
    // ── Site text overrides ──────────────────────────────────────────────
    siteTexts: defineTable({
      key: STR(),
      value: STR(),
      updatedBy: ID("users"),
      updatedAt: NUM(),
    }).index("by_key", ["key"]),
    // ── CMS Media Library ────────────────────────────────────────────────
    mediaItems: defineTable({
      url: STR(),
      name: STR(),
      alt: OPT(STR()),
      caption: OPT(STR()),
      category: OPT(STR()),
      size: NUM(),
      mimeType: STR(),
      uploadedBy: ID("users"),
      createdAt: NUM(),
    }).index("by_uploader", ["uploadedBy"]),
    // ── Article Version History ──────────────────────────────────────────
    articleVersions: defineTable({
      articleId: ID("articles"),
      body: STR(),
      title: STR(),
      savedBy: ID("users"),
      createdAt: NUM(),
    }).index("by_article", ["articleId"]),
    // ══════════════════════════════════════════════════════════════════════
    // ── MARKETPLACE / ONLINE STORE ──────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════
    // Digital wallet for all users
    wallet: defineTable({
      userId: ID("users"),
      balance: NUM(),          // available balance in toman
      frozenBalance: NUM(),    // escrowed for pending orders
      totalEarned: NUM(),      // lifetime earnings from sales
      totalSpent: NUM(),       // lifetime purchases
      updatedAt: NUM(),
    }).index("by_user", ["userId"]),
    // Wallet transaction history
    walletTransactions: defineTable({
      userId: ID("users"),
      type: UN(
        L("deposit"),       // admin deposited / top-up
        L("withdrawal"),    // user withdrew
        L("purchase"),      // bought from store
        L("sale"),          // earned from selling
        L("refund"),        // refund from cancelled order
        L("commission"),    // platform commission deducted
        L("boost"),         // paid for listing boost
      ),
      amount: NUM(),           // positive = credit, negative = debit
      description: STR(),
      relatedOrderId: OPT(STR()),
      relatedProductId: OPT(STR()),
      createdAt: NUM(),
    }).index("by_user", ["userId"]).index("by_user_date", ["userId", "createdAt"]),
    // Marketplace products (notes, flashcards, books, packages)
    storeProducts: defineTable({
      sellerId: ID("users"),
      title: STR(),
      slug: STR(),
      description: STR(),
      category: UN(
        L("notes"),         // جزوه
        L("flashcards"),    // فلش کارت
        L("book"),          // کتاب
        L("package"),       // بسته آموزشی
        L("other"),         // سایر
      ),
      condition: UN(
        L("new"),           // نو
        L("like_new"),      // تقریباً نو
        L("used"),          // کارکرده
      ),
      price: NUM(),           // price in toman
      images: ARR(STR()), // storage IDs of product images
      coverImage: OPT(STR()),
      stock: NUM(),           // available stock count
      soldCount: NUM(),
      rating: NUM(),          // average rating 0-5
      ratingCount: NUM(),
      status: UN(
        L("draft"),         // seller editing
        L("pending"),       // awaiting admin approval
        L("approved"),      // live on store
        L("rejected"),      // rejected by admin
        L("sold_out"),      // out of stock
      ),
      rejectionReason: OPT(STR()),
      // Boost/promotion system
      boostLevel: UN(
        L("none"),          // no boost
        L("silver"),        // 1 week boosted (+4.5%)
        L("gold"),          // 1 month boosted (+9%)
      ),
      boostExpiresAt: OPT(NUM()),
      // Delivery
      deliveryCities: ARR(STR()),  // e.g. ["tabriz"]
      // Tags and search
      tags: OPT(ARR(STR())),
      createdAt: NUM(),
      updatedAt: NUM(),
    })
      .index("by_seller", ["sellerId"])
      .index("by_status", ["status"])
      .index("by_category", ["category"])
      .index("by_boost", ["boostLevel", "boostExpiresAt"])
      .index("by_slug", ["slug"]),
    // Store product reviews/ratings
    storeReviews: defineTable({
      productId: ID("storeProducts"),
      userId: ID("users"),
      rating: NUM(),          // 1-5 stars
      text: OPT(STR()),
      createdAt: NUM(),
    }).index("by_product", ["productId"]).index("by_user_product", ["userId", "productId"]),
    // Store orders (marketplace purchases)
    storeOrders: defineTable({
      buyerId: ID("users"),
      sellerId: ID("users"),
      productId: ID("storeProducts"),
      quantity: NUM(),
      unitPrice: NUM(),
      commission: NUM(),      // platform commission in toman
      total: NUM(),           // buyer pays this
      sellerEarning: NUM(),   // seller receives this
      status: UN(
        L("pending_payment"),
        L("paid"),
        L("shipped"),
        L("delivered"),
        L("completed"),    // buyer confirmed receipt
        L("cancelled"),
        L("refunded"),
      ),
      // Delivery info
      deliveryCity: STR(),
      deliveryAddress: OPT(STR()),
      deliveryNote: OPT(STR()),
      // Payment
      paidWithWallet: BOOL(),
      payMethod: OPT(UN(L("wallet"), L("online"), L("offline"))),
      invoiceNumber: STR(),
      createdAt: NUM(),
      updatedAt: NUM(),
    })
      .index("by_buyer", ["buyerId"])
      .index("by_seller", ["sellerId"])
      .index("by_product", ["productId"])
      .index("by_status", ["status"]),
    // Boost transactions (for tracking boost payments)
    boostTransactions: defineTable({
      productId: ID("storeProducts"),
      sellerId: ID("users"),
      boostLevel: UN(
        L("silver"),
        L("gold"),
      ),
      amount: NUM(),          // boost cost in toman
      durationDays: NUM(),    // 7 or 30
      expiresAt: NUM(),
      createdAt: NUM(),
    }).index("by_product", ["productId"])      .index("by_seller", ["sellerId"]), // offers by seller
    // Admin store discount codes (separate from course coupons)
    storeCoupons: defineTable({
      code: STR(),
      percent: NUM(),
      maxDiscount: NUM(),     // max discount cap in toman
      minPurchase: NUM(),     // minimum purchase to apply
      active: BOOL(),
      maxUses: NUM(),
      usedCount: NUM(),
      expiresAt: OPT(NUM()),
      createdAt: NUM(),
    }).index("by_code", ["code"]),
    // Shopping cart items
    storeCart: defineTable({
      userId: ID("users"),
      productId: ID("storeProducts"),
      quantity: NUM(),
      createdAt: NUM(),
    }).index("by_user", ["userId"]).index("by_user_product", ["userId", "productId"]),
    // Wishlists / favorites
    storeWishlists: defineTable({
      userId: ID("users"),
      productId: ID("storeProducts"),
      createdAt: NUM(),
    }).index("by_user", ["userId"]).index("by_user_product", ["userId", "productId"]),
    // Buyer-Seller messages
    storeMessages: defineTable({
      senderId: ID("users"),
      receiverId: ID("users"),
      productId: OPT(ID("storeProducts")),
      orderId: OPT(ID("storeOrders")),
      text: STR(),
      read: BOOL(),
      createdAt: NUM(),
    }).index("by_receiver", ["receiverId"]).index("by_sender", ["senderId"]).index("by_product", ["productId"]),
    // Seller verification (blue tick)
    sellerProfiles: defineTable({
      userId: ID("users"),
      verified: BOOL(),
      bio: OPT(STR()),
      totalSales: NUM(),
      avgRating: NUM(),
      joinedAt: NUM(),
    }).index("by_user", ["userId"]),
    // ── Lesson content (video / text / files per syllabus item) ──────────
    lessonContent: defineTable({
      courseId: ID("courses"),
      lessonId: STR(),         // matches syllabus[].id
      videoUrl: OPT(STR()),
      textContent: OPT(STR()),
      attachments: OPT(ARR(OBJ({
        name: STR(),
        url: STR(),
        size: NUM(),
        type: STR(),
      }))),
      order: NUM(),
      updatedAt: NUM(),
    }).index("by_course", ["courseId"]).index("by_course_lesson", ["courseId", "lessonId"]),
    // ── Student lesson progress ──────────────────────────────────────────
    lessonProgress: defineTable({
      userId: ID("users"),
      courseId: ID("courses"),
      lessonId: STR(),
      completed: BOOL(),
      completedAt: OPT(NUM()),
      lastPositionSeconds: OPT(NUM()),
      lastViewedAt: OPT(NUM()),
    }).index("by_user_course", ["userId", "courseId"]).index("by_user_course_lesson", ["userId", "courseId", "lessonId"]),

    // ── Support System (Student ↔ Teacher) ──────────────────────────────
    supportTickets: defineTable({
      studentId: ID("users"),
      studentName: STR(),
      teacherId: ID("users"),
      courseId: OPT(ID("courses")),
      courseName: OPT(STR()),
      subject: STR(),
      status: UN(
        L("open"),
        L("waiting_for_teacher"),
        L("waiting_for_student"),
        L("resolved"),
        L("closed"),
      ),
      createdAt: NUM(),
      updatedAt: NUM(),
      lastMessageAt: NUM(),
      unreadByStudent: NUM(),
      unreadByTeacher: NUM(),
    })
      .index("by_student", ["studentId"])
      .index("by_teacher", ["teacherId"])
      .index("by_teacher_status", ["teacherId", "status"])
      .index("by_student_status", ["studentId", "status"]),
    supportMessages: defineTable({
      ticketId: ID("supportTickets"),
      senderId: ID("users"),
      senderName: STR(),
      senderRole: STR(),
      message: STR(),
      attachmentStorageId: OPT(STR()),
      attachmentName: OPT(STR()),
      attachmentSize: OPT(NUM()),
      createdAt: NUM(),
      readAt: OPT(NUM()),
    }).index("by_ticket", ["ticketId"]).index("by_ticket_created", ["ticketId", "createdAt"]),
    // ── Notifications (generic) ─────────────────────────────────────────
    notifications: defineTable({
      userId: ID("users"),
      type: STR(),
      title: STR(),
      body: STR(),
      entityType: OPT(STR()),
      entityId: OPT(STR()),
      isRead: BOOL(),
      createdAt: NUM(),
    }).index("by_user", ["userId"]).index("by_user_read", ["userId", "isRead"]),
    // ── Workshop Enrollments ───────────────────────────────────────────────
    workshopEnrollments: defineTable({
      userId: ID("users"),
      workshopId: ID("workshops"),
      enrolledAt: NUM(),
    })
      .index("by_user", ["userId"])
      .index("by_workshop", ["workshopId"]),
    // ── Academy Path full access (purchase of entire path) ─────────────────
    // One row per user per path; grants access to all current + future items.
    pathAccess: defineTable({
      userId: ID("users"),
      pathId: ID("academyPaths"),
      orderId: OPT(ID("orders")),
      purchasedAt: NUM(),
    }).index("by_user", ["userId"]).index("by_path", ["pathId"]),
    // ── Academy Path (سلسله کارگاه‌ها) ───────────────────────────────────────
    academyPaths: defineTable({
      title: STR(),
      slug: STR(),
      description: STR(),
      level: STR(), // beginner | intermediate | advanced | mixed
      color: OPT(STR()),
      published: BOOL(),
      instructorId: OPT(ID("instructors")),
      price: OPT(NUM()),
      free: OPT(BOOL()),
      discountPrice: OPT(NUM()),
      discountExpiresAt: OPT(NUM()),
      coverImage: OPT(STR()),
      createdAt: NUM(),
    }).index("by_published", ["published"]),
    academyPathItems: defineTable({
      pathId: ID("academyPaths"),
      workshopId: ID("workshops"),
      order: NUM(),
      instructorId: OPT(ID("users")),
    })
      .index("by_path", ["pathId"])
      .index("by_workshop", ["workshopId"]),
    // ── Flash Sales / Discount Campaigns ───────────────────────────────────
    flashSales: defineTable({
      title: STR(),
      targetType: UN(
        L("course"),
        L("workshop"),
        L("product"),
        L("all"),
      ),
      targetId: OPT(STR()), // specific item id, or null for all of type
      percent: NUM(), // discount percentage
      startsAt: NUM(),
      expiresAt: NUM(),
      active: BOOL(),
      createdBy: ID("users"),
      createdAt: NUM(),
    })
      .index("by_active", ["active"])
      .index("by_target", ["targetType", "targetId"]),
    // ── Promotional Banners (scrolling ticker under header) ────────────────
    promoBanners: defineTable({
      text: STR(),
      link: OPT(STR()),
      sticker: OPT(STR()), // emoji or icon name
      color: OPT(STR()),
      priority: NUM(),
      active: BOOL(),
      repeatCount: OPT(NUM()), // how many times text repeats in ticker
      startsAt: OPT(NUM()),
      expiresAt: OPT(NUM()),
      createdBy: ID("users"),
      createdAt: NUM(),
    }).index("by_active", ["active"]),
    // ── Certificates ───────────────────────────────────────────────────────
    certificates: defineTable({
      userId: ID("users"),
      courseId: ID("courses"),
      status: UN(
        L("requested"),
        L("draft"),
        L("approved"),
        L("rejected"),
        L("revoked"),
      ),
      // Certificate holder details (entered by admin during issuance)
      firstName: OPT(STR()),
      lastName: OPT(STR()),
      fatherName: OPT(STR()),
      nationalCode: OPT(STR()),
      courseName: OPT(STR()),
      courseDuration: OPT(STR()),
      instructorName: OPT(STR()),
      grade: OPT(STR()), // default: "عالی"
      certificateUrl: OPT(STR()), // uploaded by admin
      certificateStorageId: OPT(STR()),
      requestedAt: NUM(),
      resolvedAt: OPT(NUM()),
      resolvedBy: OPT(ID("users")),
      note: OPT(STR()),
      // Tracking / verification code (e.g. "GEN-XXXX-XXXX-XXXX"), generated
      // server-side at issuance time. Unique across the certificates table.
      verificationCode: OPT(STR()),
      certificateNumber: OPT(STR()),
      revokedAt: OPT(NUM()),
      revokedReason: OPT(STR()),
      revokedBy: OPT(ID("users")),
    })
      .index("by_user", ["userId"])
      .index("by_course", ["courseId"])
      .index("by_status", ["status"])
      .index("by_verification_code", ["verificationCode"]),
    // ── Student digital resumes (public page /u/<slug>) ──────────────────
    resumes: defineTable({
      userId: ID("users"),
      slug: STR(), // public handle, e.g. "g-abc123"
      headline: OPT(STR()),
      summary: OPT(STR()),
      skills: ARR(STR()),
      education: ARR(
        OBJ({
          degree: STR(),
          field: OPT(STR()),
          institute: OPT(STR()),
          year: OPT(STR()),
        }),
      ),
      experience: ARR(
        OBJ({
          title: STR(),
          org: OPT(STR()),
          period: OPT(STR()),
          description: OPT(STR()),
        }),
      ),
      achievements: ARR(STR()),
      projects: ARR(
        OBJ({
          name: STR(),
          description: OPT(STR()),
          link: OPT(STR()),
        }),
      ),
      languages: ARR(OBJ({ name: STR(), level: OPT(STR()) })),
      links: ARR(OBJ({ label: STR(), url: STR() })),
      isVisible: BOOL(),
      updatedAt: NUM(),
      createdAt: NUM(),
    })
      .index("by_user", ["userId"])
      .index("by_slug", ["slug"]),
    // ── Site popup announcements (modern dismissible cards) ─────────────
    sitePopups: defineTable({
      kind: UN(
        L("new_course"),
        L("new_instructor"),
        L("new_workshop"),
        L("published"),
        L("important"),
        L("custom"),
      ),
      title: STR(),
      body: STR(),
      icon: OPT(STR()),
      link: OPT(STR()),
      linkLabel: OPT(STR()),
      active: BOOL(),
      startsAt: OPT(NUM()),
      endsAt: OPT(NUM()),
      priority: OPT(NUM()),
      createdBy: ID("users"),
      createdAt: NUM(),
    }).index("by_active", ["active"]),
    // ── Skills (مهارت‌ها) — skill pages with related courses ─────────────
    skills: defineTable({
      name: STR(),
      slug: STR(),
      description: OPT(STR()),
      icon: OPT(STR()), // emoji or lucide icon name
      accent: OPT(STR()), // teal | emerald | sky | amber | violet | rose | indigo
      field: OPT(STR()), // microbiology | biotech | genetics | bioinformatics | lab | general
      order: NUM(),
      published: BOOL(),
      createdAt: NUM(),
    }).index("by_slug", ["slug"]),
    // ── Certificate Templates ─────────────────────────────────────────────
    certificateTemplates: defineTable({
      name: STR(),
      description: OPT(STR()),
      // Background image URL
      backgroundImageUrl: OPT(STR()),
      backgroundStorageId: OPT(STR()),
      // Template canvas dimensions (for PDF/export)
      width: NUM(),
      height: NUM(),
      // Field positions (x, y, fontSize, fontWeight, fontFamily, textAlign, maxWidth, color)
      fields: v.any(), // Record<string, { x: number; y: number; fontSize: number; fontWeight: string; fontFamily: string; textAlign: string; maxWidth: number; color: string; direction?: string }>
      // Static text content on the certificate
      staticTexts: OPT(v.any()),
      isActive: BOOL(),
      createdBy: ID("users"),
      createdAt: NUM(),
      updatedAt: NUM(),
    }).index("by_active", ["isActive"]),
    // ── Issued Certificates (new template-based system) ─────────────────────
    issuedCertificates: defineTable({
      templateId: ID("certificateTemplates"),
      userId: ID("users"),
      courseId: ID("courses"),
      instructorId: OPT(ID("instructors")),
      // Holder info
      firstName: STR(),
      lastName: STR(),
      fatherName: OPT(STR()),
      nationalCode: OPT(STR()),
      courseTitle: STR(),
      courseDuration: OPT(STR()),
      instructorName: OPT(STR()),
      honorific: OPT(STR()), // سرکار خانم / جناب آقای
      // Tracking
      trackingCode: STR(), // GEN-XXXX-XXXX-XXXX
      courseCode: OPT(STR()),
      issueDate: STR(), // Jalali date string
      // QR Code verification URL
      qrUrl: OPT(STR()),
      // PDF/image export URL
      pdfStorageId: OPT(STR()),
      pdfUrl: OPT(STR()),
      // Status
      status: UN(
        L("issued"),
        L("revoked"),
      ),
      issuedAt: NUM(),
      issuedBy: ID("users"),
      revokedAt: OPT(NUM()),
      revokedReason: OPT(STR()),
    })
      .index("by_tracking_code", ["trackingCode"])
      .index("by_user", ["userId"])
      .index("by_course", ["courseId"])
      .index("by_template", ["templateId"])
      .index("by_status", ["status"]),
    // ── Page Configs (real-page editable content) ────────────────────────
    // Stores per-section editable values for real React site pages.
    // Sections are keyed by their sectionId (e.g. "hero", "categories").
    // Only the "published" snapshot is read by the public site.
    // Draft edits live in "draft" and are promoted on publish.
    pageConfigs: defineTable({
      pageKey: STR(),          // matches real route key: "home", "courses", "about" …
      draft: v.any(),               // { sections: { [sectionId]: { ...props } } }
      published: v.any(),           // same shape, read by public site
      hasDraftChanges: BOOL(),
      updatedBy: OPT(ID("users")),
      updatedAt: NUM(),
    }).index("by_key", ["pageKey"]),
    //     // ── Site Studio (visual site builder) ──────────────────────────────────
    // Editable site pages. `key` is a stable identifier matching a real route
    // (e.g. "home", "about", "rules"). Content lives in studioElements.
    // Note: distinct from the legacy `sitePages` custom-HTML table above.
    studioPages: defineTable({
      key: STR(), // stable id: home | about | rules | ...
      title: STR(),
      route: STR(), // public route path (e.g. "/", "/about")
      description: OPT(STR()),
      published: BOOL(), // false = hidden from site until published
      updatedBy: OPT(ID("users")),
      updatedAt: OPT(NUM()),
    }).index("by_key", ["key"]),
    // One editable element/section on a page. Draft + published fields live
    // side by side so drafts never affect the public site until publish.
    studioElements: defineTable({
      pageId: ID("studioPages"),
      type: STR(), // block type: hero | heading | text | image | button | card | gallery | video | ...
      label: OPT(STR()), // admin-facing label, e.g. "Hero"
      order: NUM(),
      visible: BOOL(),
      // draft working copy (what the studio edits)
      props: OPT(v.any()),
      style: OPT(v.any()),
      // published snapshot (what the public site reads)
      publishedProps: OPT(v.any()),
      publishedStyle: OPT(v.any()),
      publishedVisible: OPT(BOOL()),
      publishedOrder: OPT(NUM()),
      hasDraftChanges: OPT(BOOL()),
      updatedBy: OPT(ID("users")),
      updatedAt: OPT(NUM()),
    })
      .index("by_page", ["pageId"])
      .index("by_page_order", ["pageId", "order"]),
    // Per-page global appearance: text/background colors, font, spacing,
    // radius, shadows — draft + published snapshots.
    studioThemes: defineTable({
      pageId: ID("studioPages"),
      draft: OPT(v.any()),
      published: OPT(v.any()),
      hasDraftChanges: OPT(BOOL()),
      updatedBy: OPT(ID("users")),
      updatedAt: OPT(NUM()),
    }).index("by_page", ["pageId"]),
    // Immutable published snapshots for version history / restore.
    studioVersions: defineTable({
      pageId: ID("studioPages"),
      version: NUM(),
      label: OPT(STR()),
      snapshot: v.any(), // { elements: [...], theme: {...} }
      createdBy: OPT(ID("users")),
      createdAt: NUM(),
    }).index("by_page", ["pageId"]),
    // Permission-based staff access (not just role checks).
    studioStaffPerms: defineTable({
      userId: ID("users"),
      perms: ARR(STR()), // siteStudio permission keys
      updatedBy: OPT(ID("users")),
      updatedAt: OPT(NUM()),
    }).index("by_user", ["userId"]),
    // Media library for the studio (images & videos uploaded by staff).
    // URL is resolved server-side from storageId on every read.
    studioMedia: defineTable({
      storageId: ID("_storage"),
      url: OPT(STR()),
      name: STR(),
      kind: UN(L("image"), L("video")),
      width: OPT(NUM()),
      height: OPT(NUM()),
      size: OPT(NUM()),
      createdAt: NUM(),
    }).index("by_kind", ["kind"]),
    // ── Site Settings (centralized key-value) ────────────────────────────────
    // Stores global settings like payment gateway toggle, site name, etc.
    // Key is a unique string identifier, value is JSON-encoded.
    siteSettings: defineTable({
      key: STR(),            // e.g. "payment.enabled", "site.name"
      value: STR(),          // JSON-encoded value
      description: OPT(STR()), // human-readable description
      updatedBy: OPT(ID("users")),
      updatedAt: NUM(),
    }).index("by_key", ["key"]),
    // ── Audit Log ────────────────────────────────────────────────────────────
    // Tracks sensitive admin/staff actions for accountability.
    auditLogs: defineTable({
      userId: ID("users"),      // who performed the action
      userName: OPT(STR()),
      action: STR(),          // e.g. "payment.toggle", "course.publish", "certificate.approve"
      entityType: STR(),      // e.g. "course", "workshop", "payment", "certificate"
      entityId: OPT(STR()),
      details: OPT(STR()), // JSON-encoded extra details
      createdAt: NUM(),
    }).index("by_user", ["userId"])
      .index("by_entity", ["entityType"])
      .index("by_created", ["createdAt"]),
    // ── Academy Path Pricing ──────────────────────────────────────────────────
    // Per-path pricing: full path price and individual workshop prices.
    // Extends existing academyPaths table with optional pricing fields.
    // These are added as optional fields on academyPaths via migration:
    //   price: OPT(NUM()),       // full path price (0 = free)
    //   discountPrice: OPT(NUM()),
    //   packageTier: OPT(STR()),
    // ── Workshop file uploads for whiteboard ──────────────────────────────────
    // Stores uploaded files (PDF/PPT) for display on whiteboard during live class
    whiteboardFiles: defineTable({
      roomId: ID("classRooms"),
      uploaderId: ID("users"),
      fileName: v.string(),
      fileStorageId: v.string(),
      fileType: v.string(),        // "pdf" | "pptx" | "image" etc.
      fileSize: v.number(),
      totalPages: v.optional(v.number()),
      currentPage: v.number(),
      // Rendered slide images (storage IDs) for pptx — one per slide.
      slideImages: v.optional(ARR(v.string())),
      createdAt: v.number(),
    }).index("by_room", ["roomId"]),
    // ── Academy Path Suggestions (from instructors) ─────────────────────────
    academyPathSuggestions: defineTable({
      instructorId: ID("users"),
      instructorName: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      level: v.optional(v.string()),
      steps: v.optional(ARR(OBJ({
        title: v.string(),
        description: v.optional(v.string()),
        durationMin: v.optional(v.number()),
      }))),
      status: UN(
        L("pending"),
        L("approved"),
        L("rejected"),
      ),
      adminNote: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_status", ["status"])
      .index("by_instructor", ["instructorId"]),
    // ── Site Demos (visual design prototypes) ─────────────────────────────
    siteDemos: defineTable({
      name: v.string(),                    // e.g. "Demo 01 — Clean Academy"
      slug: v.string(),                    // unique identifier, e.g. "demo_1"
      description: v.optional(v.string()),
      status: UN(L("active"), L("archived")),
      // Theme / design system tokens
      theme: v.optional(v.any()),           // JSON object with color tokens, etc.
      previewImage: v.optional(v.string()),
      // Metadata
      createdBy: ID("users"),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_slug", ["slug"])
      .index("by_status", ["status"]),
    // ── Virtual Lab (Genova Virtual Lab) ──────────────────────────────────
    // The experiment catalog lives as a versioned constant in convex/lab.ts;
    // only per-student progress and the lab notebook are stored here.
    labProgress: defineTable({ // student lab progress
      userId: ID("users"),
      experimentSlug: v.string(),
      status: UN(L("in_progress"), L("completed")),
      stepsDone: ARR(v.number()),
      score: v.optional(v.number()),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_experiment", ["userId", "experimentSlug"]),
    labNotes: defineTable({
      userId: ID("users"),
      experimentSlug: v.optional(v.string()),
      title: v.string(),
      body: v.string(),
      tags: ARR(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),
    // ── Genova Compute Game (blockchain-style token economy) ──────────────
    // Per-user wallet with a pseudo address plus an append-only hash-chained
    // ledger. Token amounts are integers (1 GVA = 1 unit).
    gameWallets: defineTable({ // token wallet
      userId: ID("users"),
      address: v.string(),
      balance: v.number(),
      totalEarned: v.number(),
      totalSpent: v.number(),
      jobsSolved: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_address", ["address"]),
    gameLedger: defineTable({
      userId: ID("users"),
      kind: UN(
        L("mint"),
        L("transfer_in"),
        L("transfer_out"),
        L("escrow_out"),
        L("escrow_in"),
        L("trade_in"),
      ),
      amount: v.number(),
      balanceAfter: v.number(),
      memo: v.optional(v.string()),
      counterpartyId: v.optional(ID("users")),
      jobId: v.optional(ID("gameJobs")),
      prevHash: v.string(),
      hash: v.string(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_created", ["createdAt"]),
    // Server-generated scientific computation jobs: the expected answer never
    // leaves the backend, so rewards cannot be claimed from the client.
    gameJobs: defineTable({
      userId: ID("users"),
      kind: v.string(),
      prompt: v.string(),
      params: v.any(),
      answer: v.string(),
      reward: v.number(),
      status: v.union(v.literal("open"), v.literal("solved"), v.literal("failed")),
      createdAt: v.number(),
      solvedAt: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    // Peer-to-peer exchange desk. Tokens are escrowed while an offer is open;
    // the fiat side is settled directly between the two students.
    gameOffers: defineTable({
      sellerId: v.id("users"),
      sellerName: v.string(),
      amount: v.number(),
      unitPriceToman: v.number(),
      status: v.union(v.literal("open"), v.literal("settled"), v.literal("cancelled")),
      buyerId: v.optional(v.id("users")),
      buyerName: v.optional(v.string()),
      note: v.optional(v.string()),
      createdAt: v.number(),
      closedAt: v.optional(v.number()),
    })
      .index("by_status", ["status"])
      .index("by_seller", ["sellerId"]),

  },
  {
    schemaValidation: false,
  },
);

export default schema;
