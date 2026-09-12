import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ── Role-check helpers ──────────────────────────────────────────────────────
export async function isAnyAdmin(ctx: any) {
  const user = await getCurrentUser(ctx);
  return !!user && (user.role === "admin" || user.role === "site_admin");
}

export async function isContentStaff(ctx: any) {
  const user = await getCurrentUser(ctx);
  return (
    !!user &&
    (user.role === "admin" ||
      user.role === "site_admin" ||
      user.role === "content_manager")
  );
}

export async function isAdmin(ctx: any) {
  const user = await getCurrentUser(ctx);
  return !!user && user.role === "admin";
}

export async function isSiteAdmin(ctx: any) {
  const user = await getCurrentUser(ctx);
  return !!user && user.role === "site_admin";
}

export async function isSystemAdmin(ctx: any) {
  const user = await getCurrentUser(ctx);
  return !!user && user.role === "admin";
}

// ── Am I Admin? ─────────────────────────────────────────────────────────────
export const amIAdmin = query({
  args: {},
  handler: async (ctx) => {
    return await isAnyAdmin(ctx);
  },
});

// ── Admin Stats Overview ────────────────────────────────────────────────────
export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return null;
    const users = await ctx.db.query("users").collect();
    const courses = await ctx.db.query("courses").collect();
    const questions = await ctx.db.query("questions").collect();
    const orders = await ctx.db.query("orders").collect();
    const exams = await ctx.db.query("examAttempts").collect();
    const tickets = await ctx.db.query("tickets").collect();
    const paidOrders = orders.filter((o: any) => o.status === "paid");
    const revenue = paidOrders.reduce((s: number, o: any) => s + (o.total ?? 0), 0);
    const avgOrderValue = paidOrders.length === 0 ? 0 : Math.round(revenue / paidOrders.length);
    const byUser = new Map<string, number>();
    for (const o of paidOrders) {
      byUser.set(o.userId, (byUser.get(o.userId) ?? 0) + 1);
    }
    const repeatCount = [...byUser.values()].filter((c) => c > 1).length;
    const repeatPurchase = users.length === 0 ? 0 : Math.round((repeatCount / users.length) * 100);
    const avgPercent = exams.length === 0 ? 0 : Math.round(exams.reduce((s: number, a: any) => s + (a.percent ?? 0), 0) / exams.length);
    const openTicketCount = tickets.filter((t: any) => t.status === "open").length;
    return { userCount: users.length, revenue, paidOrderCount: paidOrders.length, avgOrderValue, repeatPurchase, attemptCount: exams.length, avgTestPercent: avgPercent, courseCount: courses.length, questionCount: questions.length, openTicketCount };
  },
});

// ── Revenue Series ──────────────────────────────────────────────────────────
export const getRevenueSeries = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const orders = await ctx.db.query("orders").collect();
    const paid = orders.filter((o: any) => o.status === "paid");
    const byDate = new Map<string, number>();
    for (const o of paid) {
      const d = new Date(o.createdAt).toISOString().slice(0, 10);
      byDate.set(d, (byDate.get(d) ?? 0) + (o.total ?? 0));
    }
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([date, revenue]) => ({ date, revenue }));
  },
});

// ── Enrollment Stats ────────────────────────────────────────────────────────
export const getEnrollmentStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const courses = await ctx.db.query("courses").collect();
    const enriched = await Promise.all(
      courses.map(async (c) => {
        const enrollments = await ctx.db.query("enrollments").filter((q: any) => q.eq(q.field("courseId"), c._id)).collect();
        return { title: c.title, count: enrollments.length };
      }),
    );
    return enriched.sort((a, b) => b.count - a.count).slice(0, 10);
  },
});

// ── Section Notifications ───────────────────────────────────────────────────
export const getSectionNotifications = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return {};
    const openTickets = await ctx.db.query("tickets").withIndex("by_status", (q: any) => q.eq("status", "open")).collect();
    const openReports = await ctx.db.query("examReports").withIndex("by_status", (q: any) => q.eq("status", "open")).collect();
    const allUsers = await ctx.db.query("users").collect();
    const pendingProfiles = allUsers.filter((u) => !!u.pendingProfile).length;
    const allCourses = await ctx.db.query("courses").collect();
    const pendingCourses = allCourses.filter((c) => c.status === "pending").length;
    const pendingPayments = await ctx.db.query("offlinePayments").withIndex("by_status", (q: any) => q.eq("status", "pending")).collect();
    const allClassRequests = await ctx.db.query("classRequests").collect();
    const pendingClassRequests = allClassRequests.filter((cr: any) => cr.status === "pending").length;
    // Marketplace: pending products
    const pendingProducts = await ctx.db.query("storeProducts").withIndex("by_status", (q: any) => q.eq("status", "pending")).collect();
    // Comments: unread comments
    const allComments = await ctx.db.query("comments").collect();
    const unreadComments = allComments.filter((c: any) => !c.approved).length;
    // Certificates: pending requests
    const pendingCerts = await ctx.db.query("certificates").withIndex("by_status", (q: any) => q.eq("status", "requested")).collect();
    // Workshop class requests
    const pendingClassReqs = allClassRequests.filter((cr: any) => cr.status === "pending").length;
    // Daily quiz: entries today without answers
    const today = new Date().toISOString().slice(0, 10);
    const todayEntries = await ctx.db.query("dailyQuiz").collect();
    const todayQuizCount = todayEntries.filter((e: any) => e.date === today).length;
    return {
      support: openTickets.length,
      examReports: openReports.length,
      profiles: pendingProfiles,
      courses: pendingCourses,
      offlinePayments: pendingPayments.length,
      classRequests: pendingClassReqs,
      storeApproval: pendingProducts.length,
      comments: unreadComments,
      certificates: pendingCerts.length,
      dailyQuiz: todayQuizCount,
      announcements: 0,
      pathSuggestions: (await ctx.db.query("academyPathSuggestions").withIndex("by_status", (q: any) => q.eq("status", "pending")).collect()).length,
    };
  },
});

// ── Courses Admin ───────────────────────────────────────────────────────────
export const adminListCourses = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    const courses = await ctx.db.query("courses").collect();
    const enriched = await Promise.all(
      courses.map(async (c: any) => {
        const instructor = c.instructorId ? await ctx.db.get(c.instructorId) : null;
        return { ...c, instructor: instructor ? (instructor as any).name : "—" };
      }),
    );
    return enriched.sort((a: any, b: any) => b.createdAt - a.createdAt);
  },
});

export const adminCreateCourse = mutation({
  args: {
    title: v.string(), slug: v.string(), summary: v.string(), description: v.optional(v.string()),
    price: v.number(), categoryId: v.id("categories"), instructorId: v.id("instructors"),
    mode: v.string(),
    bundle: v.string(),
    published: v.boolean(), accent: v.optional(v.string()), durationText: v.optional(v.string()),
    audience: v.optional(v.array(v.string())), prerequisites: v.optional(v.array(v.string())),
    includes: v.optional(v.array(v.string())),
    syllabus: v.optional(v.array(v.object({ id: v.optional(v.string()), title: v.string(), durationMin: v.number(), free: v.boolean() }))),
    packagePrices: v.optional(v.array(v.object({ tier: v.union(v.literal("economy"), v.literal("basic"), v.literal("plus"), v.literal("premium")), price: v.number(), features: v.array(v.string()) }))),
    coverImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const slug = args.slug || args.title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now().toString(36);
    const syllabusWithIds = (args.syllabus ?? []).map((s, i) => ({ ...s, id: s.id ?? `lesson-${i + 1}` }));
    return await ctx.db.insert("courses", {
      ...args,
      mode: args.mode as any,
      bundle: args.bundle as any,
      slug,
      description: args.description ?? args.summary,
      status: "draft" as const,
      published: args.published,
      featured: false,
      popular: false,
      studentsCount: 0,
      rating: 0,
      ratingCount: 0,
      accent: args.accent ?? "teal",
      durationText: args.durationText ?? "",
      audience: args.audience ?? [],
      prerequisites: args.prerequisites ?? [],
      includes: args.includes ?? [],
      syllabus: syllabusWithIds,
      hasSampleVideo: false,
      files: [],
      createdAt: Date.now(),
    });
  },
});

export const adminUpdateCourse = mutation({
  args: {
    id: v.id("courses"), title: v.optional(v.string()), slug: v.optional(v.string()), summary: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()), categoryId: v.optional(v.id("categories")), instructorId: v.optional(v.id("instructors")),
    mode: v.optional(v.string()),
    bundle: v.optional(v.string()),
    published: v.optional(v.boolean()),
    accent: v.optional(v.string()), durationText: v.optional(v.string()),
    audience: v.optional(v.array(v.string())), prerequisites: v.optional(v.array(v.string())),
    includes: v.optional(v.array(v.string())),
    syllabus: v.optional(v.array(v.object({ id: v.optional(v.string()), title: v.string(), durationMin: v.number(), free: v.boolean() }))),
    packagePrices: v.optional(v.array(v.object({ tier: v.union(v.literal("economy"), v.literal("basic"), v.literal("plus"), v.literal("premium")), price: v.number(), features: v.array(v.string()) }))),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const { id, ...raw } = args;
    const patch: Record<string, any> = { ...raw };
    if (patch.mode !== undefined) patch.mode = patch.mode as any;
    if (patch.bundle !== undefined) patch.bundle = patch.bundle as any;
    await ctx.db.patch(id, patch);
    return { ok: true };
  },
});

export const adminTogglePublish = mutation({
  args: { collection: v.string(), id: v.string(), published: v.boolean() },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.patch(args.id as any, { published: args.published });
    return { ok: true };
  },
});

export const adminDeleteCourse = mutation({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Questions Admin ─────────────────────────────────────────────────────────
export const adminGetQuestions = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    const questions = await ctx.db.query("questions").collect();
    return Promise.all(questions.map(async (q) => ({ ...q, topic: (await ctx.db.get(q.topicId))?.name ?? null })));
  },
});

export const adminGetQuestionGroups = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    const categories = await ctx.db.query("categories").collect();
    const questions = await ctx.db.query("questions").collect();
    return categories.map((cat) => {
      const catQuestions = questions.filter((q: any) => q.topicId === cat._id);
      return { categoryId: cat._id, categoryName: cat.name, categorySlug: cat.slug, questionCount: catQuestions.length, questions: catQuestions };
    });
  },
});

export const adminCreateQuestion = mutation({
  args: { text: v.string(), options: v.array(v.string()), correctIndex: v.number(), explanation: v.optional(v.string()), topicId: v.id("categories"), difficulty: v.number() },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    return await ctx.db.insert("questions", { ...args, explanation: args.explanation ?? "" });
  },
});

export const adminDeleteQuestion = mutation({
  args: { id: v.id("questions") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

export const adminUpdateQuestion = mutation({
  args: { id: v.id("questions"), text: v.optional(v.string()), options: v.optional(v.array(v.string())), correctIndex: v.optional(v.number()), explanation: v.optional(v.string()), topicId: v.optional(v.id("categories")), difficulty: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
    return { ok: true };
  },
});

// ── Users Admin ─────────────────────────────────────────────────────────────
export const adminListUsers = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("users").collect();
  },
});

export const adminUpdateRole = mutation({
  args: { userId: v.id("users"), role: v.string() },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("فقط ادمین سیستم.");
    await ctx.db.patch(args.userId, { role: args.role as any });
    return { ok: true };
  },
});

// ── Articles Admin ──────────────────────────────────────────────────────────
export const adminListArticles = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    const articles = await ctx.db.query("articles").collect();
    return articles.map((a) => ({ ...a, categoryLabel: a.category }));
  },
});

export const adminCreateArticle = mutation({
  args: {
    title: v.string(), slug: v.optional(v.string()), subtitle: v.optional(v.string()),
    category: v.string(), tags: v.optional(v.array(v.string())),
    excerpt: v.string(), body: v.string(),
    authorName: v.optional(v.string()), authorId: v.optional(v.id("users")),
    featuredImage: v.optional(v.string()), accent: v.optional(v.string()),
    readTime: v.optional(v.number()), published: v.optional(v.boolean()),
    featured: v.optional(v.boolean()),
    seoTitle: v.optional(v.string()), seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.array(v.string())), seoCanonical: v.optional(v.string()),
    ogTitle: v.optional(v.string()), ogDescription: v.optional(v.string()), ogImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const slug = args.slug || args.title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now().toString(36);
    const now = Date.now();
    return await ctx.db.insert("articles", {
      title: args.title, slug, subtitle: args.subtitle,
      category: args.category, tags: args.tags,
      excerpt: args.excerpt, body: args.body,
      authorName: args.authorName ?? "", authorId: args.authorId,
      featuredImage: args.featuredImage,
      accent: args.accent ?? "teal",
      readTime: args.readTime ?? 5,
      published: args.published ?? false, featured: args.featured ?? false,
      status: (args.published ? "published" : "draft") as any,
      createdAt: now, updatedAt: now,
    });
  },
});

export const adminUpdateArticle = mutation({
  args: {
    id: v.id("articles"),
    title: v.optional(v.string()), slug: v.optional(v.string()), subtitle: v.optional(v.string()),
    category: v.optional(v.string()), tags: v.optional(v.array(v.string())),
    excerpt: v.optional(v.string()), body: v.optional(v.string()),
    authorName: v.optional(v.string()),
    featuredImage: v.optional(v.string()), accent: v.optional(v.string()),
    readTime: v.optional(v.number()), published: v.optional(v.boolean()),
    featured: v.optional(v.boolean()), status: v.optional(v.string()),
    seoTitle: v.optional(v.string()), seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.array(v.string())), seoCanonical: v.optional(v.string()),
    ogTitle: v.optional(v.string()), ogDescription: v.optional(v.string()), ogImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const { id, ...patch } = args;
    const updates: Record<string, any> = { ...patch, updatedAt: Date.now() };
    if (updates.published !== undefined) {
      updates.status = updates.published ? "published" : "draft";
    }
    await ctx.db.patch(id, updates);
    return { ok: true };
  },
});

export const adminDeleteArticle = mutation({
  args: { id: v.id("articles") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Category Admin ──────────────────────────────────────────────────────────
export const adminDeleteCategory = mutation({
  args: { id: v.optional(v.id("categories")), categoryId: v.optional(v.id("categories")) } as any,
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete((args as any).categoryId ?? args.id);
    return { ok: true };
  },
});

export const adminUpdateCategory = mutation({
  args: { id: v.optional(v.id("categories")), categoryId: v.optional(v.id("categories")), name: v.optional(v.string()), description: v.optional(v.string()), icon: v.optional(v.string()), accent: v.optional(v.string()), order: v.optional(v.number()) } as any,
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const catId = (args as any).categoryId ?? args.id;
    const { id: _id, categoryId: _c, ...patch } = args as any;
    await ctx.db.patch(catId, patch);
    return { ok: true };
  },
});

// ── Exams Admin ─────────────────────────────────────────────────────────────
export const adminListExams = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    const exams = await ctx.db.query("exams").collect();
    return exams.map((e) => ({
      ...e,
      questionCount: e.questionIds.length,
      kindLabel: e.diagnostic ? "تشخیصی" : e.free ? "رایگان" : "پولی",
    }));
  },
});

export const adminCreateExam = mutation({
  args: {
    title: v.string(), description: v.string(), durationMinutes: v.number(),
    free: v.boolean(), diagnostic: v.boolean(),
    questionIds: v.optional(v.array(v.id("questions"))),
    topicId: v.optional(v.string()), count: v.optional(v.union(v.string(), v.number())),
    accent: v.optional(v.string()),
    published: v.optional(v.boolean()),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const slug = args.slug || args.title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now().toString(36);
    let questionIds = args.questionIds ?? [];
    // If topicId and count given, auto-select questions from that category
    if (args.topicId && questionIds.length === 0) {
      const count = Number(args.count) || 10;
      const allQ = await ctx.db.query("questions").filter((q: any) => q.eq(q.field("topicId"), args.topicId)).collect();
      questionIds = allQ.slice(0, count).map((q) => q._id);
    }
    return await ctx.db.insert("exams", {
      title: args.title, slug, description: args.description,
      durationMinutes: args.durationMinutes, free: args.free,
      diagnostic: args.diagnostic, questionIds,
      published: args.published ?? false, featured: false,
      accent: args.accent ?? "teal", order: 0,
    });
  },
});

export const adminToggleExamPublish = mutation({
  args: { id: v.id("exams"), published: v.boolean() },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.patch(args.id, { published: args.published });
    return { ok: true };
  },
});

export const adminDeleteExam = mutation({
  args: { id: v.id("exams") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Workshops Admin ─────────────────────────────────────────────────────────
export const adminListWorkshops = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    const workshops = await ctx.db.query("workshops").collect();
    const enriched = await Promise.all(workshops.map(async (w) => { const inst = w.instructorId ? await ctx.db.get(w.instructorId) : null; return { ...w, instructor: (inst as any)?.name ?? "—" }; }));
    return enriched;
  },
});

export const instructorListWorkshops = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const instructor = await ctx.db.query("instructors").withIndex("by_user", (q) => q.eq("userId", user._id)).first();
    if (!instructor) return [];
    return await ctx.db.query("workshops").collect();
  },
});

// ── Instructors Admin ───────────────────────────────────────────────────────
export const adminListInstructors = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    const instructors = await ctx.db.query("instructors").collect();
    const users = await ctx.db.query("users").collect();
    const enriched = instructors.map((i: any) => {
      const courseCount = 0;
      return { ...i, courseCount, userId: i.userId };
    });
    return enriched;
  },
});

// ── Products Admin ──────────────────────────────────────────────────────────
export const adminListProducts = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    return await ctx.db.query("products").collect();
  },
});

// ── Orders Admin ────────────────────────────────────────────────────────────
export const adminListOrders = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("orders").collect();
  },
});

// ── Coupons Admin ───────────────────────────────────────────────────────────
export const adminListCoupons = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("coupons").collect();
  },
});

// ── Tickets Admin ───────────────────────────────────────────────────────────
export const adminListTickets = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("tickets").collect();
  },
});

// ── Announcements Admin ─────────────────────────────────────────────────────
export const adminListAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("announcements").collect();
  },
});

// ── Save Generated Questions ────────────────────────────────────────────────
export const saveGeneratedQuestions = mutation({
  args: {
    questions: v.array(
      v.object({ text: v.string(), options: v.array(v.string()), correctIndex: v.number(), explanation: v.optional(v.string()), topicId: v.optional(v.id("categories")), difficulty: v.number() }),
    ),
    topicId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    let count = 0;
    for (const q of args.questions) {
      const tid = q.topicId ?? args.topicId;
      if (!tid) continue;
      await ctx.db.insert("questions", { text: q.text, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation ?? "", topicId: tid, difficulty: q.difficulty });
      count++;
    }
    return { created: count };
  },
});

// ── Alias: adminGetUsers → adminListUsers ──────────────────────────────────
export const adminGetUsers = adminListUsers;

// ── User Management Extended ───────────────────────────────────────────────
export const adminCreateUser = mutation({
  args: { email: v.string(), name: v.optional(v.string()), role: v.optional(v.string()), password: v.optional(v.string()) } as any,
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("فقط ادمین سیستم.");

    // NOTE: To create a user WITH a working password, use the action
    // api.adminAuthActions.adminCreateUserAction instead.
    // This mutation only creates the user profile (no auth credentials).
    const id = await ctx.db.insert("users", {
      email: args.email, name: args.name,
      role: (args.role as any) ?? "user",
    });
    return { ok: true, userId: id };
  },
});

export const adminUpdateUser = mutation({
  args: { userId: v.id("users"), name: v.optional(v.string()), email: v.optional(v.string()),
    role: v.optional(v.string()), university: v.optional(v.string()), major: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("فقط ادمین سیستم.");
    const { userId, ...patch } = args;
    const updates: Record<string, any> = { ...patch };
    if (updates.role) updates.role = updates.role as any;
    await ctx.db.patch(userId, updates);
    return { ok: true };
  },
});

export const adminDeleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("فقط ادمین سیستم.");
    await ctx.db.delete(args.userId);
    return { ok: true };
  },
});

export const adminSetRole = mutation({
  args: { userId: v.id("users"), role: v.string() } as any,
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("فقط ادمین سیستم.");
    await ctx.db.patch(args.userId, { role: args.role as any });
    return { ok: true };
  },
});

export const adminSetSecondaryRole = mutation({
  args: { userId: v.id("users"), role: v.optional(v.string()), secondaryRole: v.optional(v.string()) } as any,
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("فقط ادمین سیستم.");
    await ctx.db.patch(args.userId, { secondaryRole: args.role as any });
    return { ok: true };
  },
});

// adminSetPassword is deprecated — use api.adminAuthActions.adminSetPasswordAction instead.
// Kept as a no-op stub so the frontend doesn't break during migration.
export const adminSetPassword = mutation({
  args: { userId: v.id("users"), password: v.string() },
  handler: async (ctx, args) => {
    throw new Error("این تابع دیگر کار نمی‌کند. از action adminSetPasswordAction استفاده کنید.");
  },
});

// ── Instructor CRUD ────────────────────────────────────────────────────────
export const adminCreateInstructor = mutation({
  args: { name: v.string(), slug: v.optional(v.string()), title: v.string(), bio: v.string(),
    education: v.array(v.string()), specialties: v.array(v.string()),
    accent: v.optional(v.string()), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const slug = args.slug || args.name.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now().toString(36);
    return await ctx.db.insert("instructors", {
      ...args, slug, accent: args.accent ?? "teal", verified: false,
    });
  },
});

export const adminUpdateInstructor = mutation({
  args: { id: v.id("instructors"), name: v.optional(v.string()), title: v.optional(v.string()),
    bio: v.optional(v.string()), education: v.optional(v.array(v.string())),
    specialties: v.optional(v.array(v.string())), accent: v.optional(v.string()),
    verified: v.optional(v.boolean()), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
    return { ok: true };
  },
});

export const adminDeleteInstructor = mutation({
  args: { id: v.id("instructors") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Workshop CRUD ──────────────────────────────────────────────────────────
export const adminCreateWorkshop = mutation({
  args: { title: v.string(), slug: v.optional(v.string()), instructorId: v.id("instructors"),
    topic: v.string(), date: v.string(), time: v.string(),
    capacity: v.number(), price: v.number(), description: v.string(),
    agenda: v.optional(v.array(v.string())), free: v.boolean(), published: v.boolean(),
    expertTalk: v.optional(v.boolean()), coverImage: v.optional(v.string()),
    platformUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const slug = args.slug || args.title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now().toString(36);
    return await ctx.db.insert("workshops", {
      ...args, slug, registeredCount: 0, expertTalk: args.expertTalk ?? false,
      agenda: args.agenda ?? [],
    });
  },
});

export const quickCreateWorkshop = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const slug = args.title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now().toString(36);
    return await ctx.db.insert("workshops", {
      title: args.title,
      slug,
      instructorId: "" as any,
      topic: "",
      date: "",
      time: "",
      capacity: 0,
      price: 0,
      description: "",
      free: false,
      published: false,
      registeredCount: 0,
      expertTalk: false,
      agenda: [],
    });
  },
});

export const adminUpdateWorkshop = mutation({
  args: { id: v.id("workshops"), title: v.optional(v.string()), topic: v.optional(v.string()),
    date: v.optional(v.string()), time: v.optional(v.string()),
    instructorId: v.optional(v.any()),
    capacity: v.optional(v.number()), price: v.optional(v.number()),
    description: v.optional(v.string()), agenda: v.optional(v.array(v.string())),
    free: v.optional(v.boolean()), published: v.optional(v.boolean()), coverImage: v.optional(v.string()),
    platformUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
    return { ok: true };
  },
});

export const adminDeleteWorkshop = mutation({
  args: { id: v.id("workshops") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});


export const instructorNotifications = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return {};
    const instructor = await ctx.db.query("instructors").withIndex("by_user", (q) => q.eq("userId", user._id)).first();
    if (!instructor) return {};
    
    // Class requests from this instructor
    const myClassRequests = await ctx.db.query("classRequests")
      .withIndex("by_instructor", (q) => q.eq("instructorId", user._id)).collect();
    const pendingClassRequests = myClassRequests.filter((r: any) => r.status === "pending").length;
    const approvedClassRequests = myClassRequests.filter((r: any) => r.status === "approved").length;
    
    // Support tickets related to this instructor
    const supportTickets = await ctx.db.query("supportTickets")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id)).collect();
    const openSupportTickets = supportTickets.filter((t: any) => t.status !== "resolved" && t.status !== "closed").length;
    
    // Unread messages
    const unreadMessages = await ctx.db.query("directMessages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", user._id).eq("read", false)).collect();
    
    // Course submissions pending review
    const myCourses = await ctx.db.query("courses")
      .withIndex("by_author", (q) => q.eq("authorId", user._id)).collect();
    const pendingCourses = myCourses.filter((c: any) => c.status === "pending").length;
    const rejectedCourses = myCourses.filter((c: any) => c.status === "rejected").length;
    
    return {
      classRequests: pendingClassRequests,
      classApproved: approvedClassRequests,
      support: openSupportTickets,
      messages: unreadMessages.length,
      courses: pendingCourses,
      coursesRejected: rejectedCourses,
    };
  },
});

export const instructorUpdateWorkshopUrl = mutation({
  args: { id: v.id("workshops"), platformUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.patch(args.id, { platformUrl: args.platformUrl || undefined });
    return { ok: true };
  },
});

// ── Product CRUD ───────────────────────────────────────────────────────────
export const adminCreateProduct = mutation({
  args: { title: v.string(), slug: v.optional(v.string()), type: v.string(),
    description: v.string(), price: v.number(),
    accent: v.optional(v.string()), published: v.boolean() },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const slug = args.slug || args.title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now().toString(36);
    return await ctx.db.insert("products", {
      ...args, slug, accent: args.accent ?? "teal", featured: false,
      createdAt: Date.now(),
    } as any);
  },
});

export const adminUpdateProduct = mutation({
  args: { id: v.id("products"), title: v.optional(v.string()), description: v.optional(v.string()),
    price: v.optional(v.number()), published: v.optional(v.boolean()),
    featured: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
    return { ok: true };
  },
});

export const adminDeleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Articles CRUD Extended ─────────────────────────────────────────────────
export const adminSaveGeneratedArticles = mutation({
  args: {
    articles: v.array(v.object({
      title: v.string(), body: v.string(), excerpt: v.optional(v.string()),
      category: v.optional(v.string()), authorName: v.optional(v.string()),
    })),
    authorName: v.optional(v.string()),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const now = Date.now();
    const author = args.authorName ?? "تیم Genova";
    let count = 0;
    for (const a of args.articles) {
      const slug = a.title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "") + "-" + now.toString(36) + count;
      await ctx.db.insert("articles", {
        title: a.title, slug, body: a.body, excerpt: a.excerpt ?? "", category: a.category ?? "عمومی",
        authorName: a.authorName ?? author, readTime: 5, accent: "teal",
        published: args.published ?? false, featured: false, status: (args.published ? "published" : "draft") as any,
        createdAt: now, updatedAt: now,
      });
      count++;
    }
    return { created: count };
  },
});

// ── Coupons Extended ───────────────────────────────────────────────────────
export const adminCreateCoupon = mutation({
  args: { code: v.string(), percent: v.number(), maxUses: v.number(),
    expiresAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی غیرمجاز.");
    return await ctx.db.insert("coupons", {
      ...args, active: true, usedCount: 0,
    });
  },
});

export const adminGetCoupons = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("coupons").collect();
  },
});

export const adminToggleCoupon = mutation({
  args: { id: v.optional(v.id("coupons")), couponId: v.optional(v.id("coupons")), active: v.boolean() } as any,
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.patch(args.id, { active: args.active });
    return { ok: true };
  },
});

export const adminDeleteCoupon = mutation({
  args: { id: v.optional(v.id("coupons")), couponId: v.optional(v.id("coupons")) } as any,
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Payments / Offline Payments ────────────────────────────────────────────
export const adminListPayments = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("offlinePayments").collect();
  },
});

export const adminDeletePayment = mutation({
  args: { id: v.optional(v.id("offlinePayments")), paymentId: v.optional(v.id("offlinePayments")) } as any,
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Orders Extended ────────────────────────────────────────────────────────
export const adminGetOrders = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const orders = await ctx.db.query("orders").collect();
    return Promise.all(orders.map(async (o) => {
      const user = await ctx.db.get(o.userId);
      return { ...o, userName: (user as any)?.name ?? "—", userEmail: (user as any)?.email ?? "—", user: user };
    }));
  },
});

export const adminDeleteOrder = mutation({
  args: { id: v.optional(v.id("orders")), orderId: v.optional(v.id("orders")) } as any,
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

export const adminUpdateOrderStatus = mutation({
  args: { id: v.optional(v.id("orders")), orderId: v.optional(v.id("orders")), status: v.string() } as any,
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.patch(args.id, { status: args.status as any });
    return { ok: true };
  },
});

// ── Class Rooms & Requests ─────────────────────────────────────────────────
export const adminListClassRooms = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("classRooms").collect();
  },
});

export const adminListClassRequests = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("classRequests").collect();
  },
});

export const adminReviewClassRequest = mutation({
  args: { id: v.optional(v.id("classRequests")), paymentId: v.optional(v.id("classRequests")), status: v.string(), platformUrl: v.optional(v.string()) } as any,
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی غیرمجاز.");
    const user = await getCurrentUser(ctx);
    const req: any = await ctx.db.get(args.id);
    if (!req) throw new Error("درخواست یافت نشد.");
    const updates: Record<string, any> = { status: args.status as any, reviewedBy: user?._id, reviewedAt: Date.now() };
    if (args.platformUrl) updates.platformUrl = args.platformUrl;
    // On approval, materialize the class as a real classroom so it appears in
    // the instructor studio and student dashboard (with the admin's link if set).
    if (args.status === "approved" && !req.createdRoomId) {
      const room = await ctx.db.insert("classRooms", {
        instructorId: req.instructorId,
        instructorName: req.instructorName,
        title: req.title,
        topic: req.topic || req.title,
        description: req.description || "",
        status: "live",
        broadcasting: false,
        createdAt: Date.now(),
        platformUrl: args.platformUrl || undefined,
        scheduledDate: req.proposedDate || undefined,
      });
      updates.createdRoomId = room;
    }
    await ctx.db.patch(args.id, updates);
    return { ok: true };
  },
});

// ── Enrollments Management ─────────────────────────────────────────────────
export const adminListEnrollments = query({
  args: { targetType: v.optional(v.string()), targetId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) return [];
    let enrollments = await ctx.db.query("enrollments").collect();
    return Promise.all(enrollments.map(async (e) => {
      const user = await ctx.db.get(e.userId);
      const course = await ctx.db.get(e.courseId);
      return { ...e, userName: (user as any)?.name ?? "—", userEmail: (user as any)?.email ?? "—",
        targetTitle: (course as any)?.title ?? "—", targetType: "course" as const,
        completedLessons: e.completedLessons.length };
    }));
  },
});

export const adminListEnrollTargets = query({
  args: { targetType: v.optional(v.string()), kind: v.optional(v.string()) } as any,
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const t = (args as any).targetType ?? (args as any).kind ?? "course";
    if (t === "course") return await ctx.db.query("courses").collect();
    if (t === "workshop") return await ctx.db.query("workshops").collect();
    if (t === "path") return await ctx.db.query("academyPaths").collect();
    return [];
  },
});

export const adminAddEnrollment = mutation({
  args: { targetType: v.string(), targetId: v.string(), userId: v.string(), kind: v.optional(v.string()) } as any,
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی غیرمجاز.");
    if (args.targetType === "course") {
      return await ctx.db.insert("enrollments", {
        userId: args.userId, courseId: args.targetId as any, completedLessons: [], enrolledAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

export const adminRemoveEnrollment = mutation({
  args: { targetType: v.string(), enrollmentId: v.string() },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.enrollmentId as any);
    return { ok: true };
  },
});

// ── Discount Management ────────────────────────────────────────────────────
export const adminListCoursesForDiscount = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("courses").collect();
  },
});

export const adminListProductsForDiscount = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("products").collect();
  },
});

export const adminSetCourseDiscount = mutation({
  args: { courseId: v.optional(v.id("courses")), id: v.optional(v.id("courses")), discountPercent: v.optional(v.number()), discountExpiresAt: v.optional(v.number()) } as any,
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی غیرمجاز.");
    const cid = (args as any).courseId ?? args.id;
    if (!cid) throw new Error("courseId لازم است");
    await ctx.db.patch(cid, { discountPrice: (args as any).discountPercent ?? 0, discountExpiresAt: (args as any).discountExpiresAt });
    return { ok: true };
  },
});

export const adminSetProductDiscount = mutation({
  args: { productId: v.optional(v.id("products")), id: v.optional(v.id("products")), discountPercent: v.optional(v.number()), discountExpiresAt: v.optional(v.number()) } as any,
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی غیرمجاز.");
    const pid = (args as any).productId ?? args.id;
    if (!pid) throw new Error("productId لازم است");
    await ctx.db.patch(pid, { discountPrice: (args as any).discountPercent ?? 0, discountExpiresAt: (args as any).discountExpiresAt });
    return { ok: true };
  },
});

// ── Store Admin ────────────────────────────────────────────────────────────
export const adminGetAllStoreProducts = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("storeProducts").collect();
  },
});

export const adminListPendingStoreProducts = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("storeProducts").withIndex("by_status", (q: any) => q.eq("status", "pending")).collect();
  },
});

export const adminApproveStoreProduct = mutation({
  args: { id: v.optional(v.id("storeProducts")), productId: v.optional(v.id("storeProducts")), status: v.string(), rejectionReason: v.optional(v.string()) } as any,
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی غیرمجاز.");
    const docId = args.id ?? args.productId;
    if (!docId) throw new Error("شناسه محصول الزامی است.");
    await ctx.db.patch(docId, { status: args.status as any, rejectionReason: args.rejectionReason });
    return { ok: true };
  },
});

// ── Admin Management ───────────────────────────────────────────────────────
export const adminAddAdmin = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("فقط ادمین سیستم.");
    const existing = await ctx.db.query("admins").withIndex("by_email", (q: any) => q.eq("email", args.email)).first();
    if (existing) return { ok: true, note: "already exists" };
    return await ctx.db.insert("admins", { email: args.email });
  },
});

// ── Export ─────────────────────────────────────────────────────────────────
export const exportBackup = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) throw new Error("فقط ادمین سیستم.");
    const tableNames = [
      "users", "courses", "workshops", "exams", "questions", "topics",
      "articles", "dictionaryTerms", "categories", "instructors",
      "storeProducts", "storeReviews", "storeOrders", "enrollments",
      "payments", "coupons", "announcements", "supportTickets",
      "dailyQuizEntries", "dailyQuizQuestions", "certificates",
      "aiChatConversations", "aiChatMessages", "aiSubscriptions",
      "wallets", "walletTransactions", "inboxMessages",
      "academyPaths", "academyPathItems", "classRequests",
      "collabRooms", "collabRoomMembers", "siteSettings",
      "sitePages", "siteAnnouncements", "notifications",
      "comments", "instructorPayments", "instructorProfiles",
      "courseStudioItems", "flashSaleItems", "savedCourseItems",
    ];
    const tables: Record<string, any[]> = {};
    for (const name of tableNames) {
      try {
        tables[name] = await ctx.db.query(name as any).collect();
      } catch {
        tables[name] = [];
      }
    }
    return { ok: true, tables, exportedAt: new Date().toISOString() };
  },
});

// ── Category Label Helper ──────────────────────────────────────────────────
export const categoryLabel = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const cat = await ctx.db.get(args.id);
    return cat?.name ?? "—";
  },
});

// ── Instructor request (used by both student + instructor panels) ───────────
export const listMyClassRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db.query("classRequests").filter((q: any) => q.eq(q.field("instructorId"), user._id)).collect();
  },
});

export const requestClass = mutation({
  args: { title: v.string(), topic: v.string(), description: v.string(),
    proposedDate: v.string(), immediate: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("لاگین کنید.");
    return await ctx.db.insert("classRequests", {
      instructorId: user._id, instructorName: user.name ?? "—",
      ...args, status: "pending" as const, createdAt: Date.now(),
    });
  },
});

// ── Admin-created classes (from class requests section) ─────────────────────
export const adminListUsersWithInstructorRole = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const users = await ctx.db.query("users").collect();
    return users.filter((u: any) => u.role === "instructor" || u.role === "admin" || u.role === "site_admin");
  },
});

export const adminCreateClass = mutation({
  args: { title: v.string(), topic: v.optional(v.string()), description: v.optional(v.string()),
    instructorId: v.id("users"), platformUrl: v.optional(v.string()), scheduledDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی غیرمجاز.");
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("مدرس یافت نشد.");
    if (!args.title.trim()) throw new Error("عنوان کلاس الزامی است.");
    return await ctx.db.insert("classRooms", {
      instructorId: args.instructorId,
      instructorName: (instructor as any).name ?? "مدرس",
      title: args.title.trim(),
      topic: (args.topic ?? "").trim(),
      description: (args.description ?? "").trim(),
      status: args.scheduledDate ? "scheduled" : "live",
      broadcasting: false,
      createdAt: Date.now(),
      platformUrl: args.platformUrl?.trim() || undefined,
      scheduledDate: args.scheduledDate?.trim() || undefined,
    });
  },
});
