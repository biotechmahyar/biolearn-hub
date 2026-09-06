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
    return { support: openTickets.length, examReports: openReports.length, profiles: pendingProfiles, courses: pendingCourses, offlinePayments: pendingPayments.length, classRequests: pendingClassRequests, storeApproval: 0, comments: 0, inbox: 0 };
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
    title: v.string(), slug: v.string(), summary: v.string(), price: v.number(),
    categoryId: v.id("categories"), instructorId: v.id("instructors"), mode: v.string(), bundle: v.string(), published: v.boolean(),
    audience: v.optional(v.array(v.string())), prerequisites: v.optional(v.array(v.string())),
    syllabus: v.optional(v.array(v.object({ title: v.string(), durationMin: v.number(), free: v.boolean() }))),
    packagePrices: v.optional(v.array(v.object({ tier: v.union(v.literal("economy"), v.literal("basic"), v.literal("plus"), v.literal("premium")), price: v.number(), features: v.array(v.string()) }))),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const slug = args.slug || args.title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now().toString(36);
    return await ctx.db.insert("courses", { ...args, slug, status: "draft" as const, published: args.published, featured: false, popular: false, studentsCount: 0, createdAt: Date.now() });
  },
});

export const adminUpdateCourse = mutation({
  args: {
    id: v.id("courses"), title: v.optional(v.string()), slug: v.optional(v.string()), summary: v.optional(v.string()),
    price: v.optional(v.number()), categoryId: v.optional(v.id("categories")), instructorId: v.optional(v.id("instructors")),
    mode: v.optional(v.string()), bundle: v.optional(v.string()), published: v.optional(v.boolean()),
    audience: v.optional(v.array(v.string())), prerequisites: v.optional(v.array(v.string())),
    syllabus: v.optional(v.array(v.object({ title: v.string(), durationMin: v.number(), free: v.boolean() }))),
    packagePrices: v.optional(v.array(v.object({ tier: v.union(v.literal("economy"), v.literal("basic"), v.literal("plus"), v.literal("premium")), price: v.number(), features: v.array(v.string()) }))),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const { id, ...patch } = args;
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
    return await ctx.db.query("articles").collect();
  },
});

// ── Category Admin ──────────────────────────────────────────────────────────
export const adminDeleteCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

export const adminUpdateCategory = mutation({
  args: { id: v.id("categories"), name: v.optional(v.string()), description: v.optional(v.string()), icon: v.optional(v.string()), accent: v.optional(v.string()), order: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
    return { ok: true };
  },
});

// ── Exams Admin ─────────────────────────────────────────────────────────────
export const adminListExams = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    return await ctx.db.query("exams").collect();
  },
});

// ── Workshops Admin ─────────────────────────────────────────────────────────
export const adminListWorkshops = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    const workshops = await ctx.db.query("workshops").collect();
    const enriched = await Promise.all(workshops.map(async (w) => ({ ...w, instructor: await ctx.db.get(w.instructorId) })));
    return enriched;
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
      v.object({ text: v.string(), options: v.array(v.string()), correctIndex: v.number(), explanation: v.optional(v.string()), topicId: v.id("categories"), difficulty: v.number() }),
    ),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی غیرمجاز.");
    let count = 0;
    for (const q of args.questions) {
      await ctx.db.insert("questions", { ...q, explanation: q.explanation ?? "" });
      count++;
    }
    return { created: count };
  },
});
