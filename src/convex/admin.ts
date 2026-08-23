import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./users";

export const isAdmin = async (ctx: QueryCtx) => {
  const user = await getCurrentUser(ctx);
  const email = user?.email;
  if (!email) return false;
  const admin = await ctx.db
    .query("admins")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  return !!admin;
};

export const amIAdmin = query({
  args: {},
  handler: async (ctx) => {
    return await isAdmin(ctx);
  },
});

// ── KPIs & analytics ────────────────────────────────────────────────────────
export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return null;

    const [users, orders, enrollments, attempts, courses, questions, tickets] =
      await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("orders").collect(),
        ctx.db.query("enrollments").collect(),
        ctx.db.query("examAttempts").collect(),
        ctx.db.query("courses").collect(),
        ctx.db.query("questions").collect(),
        ctx.db.query("tickets").collect(),
      ]);

    const paidOrders = orders.filter((o) => o.status === "paid");
    const revenue = paidOrders.reduce((acc, o) => acc + o.total, 0);
    const avgOrderValue = paidOrders.length === 0 ? 0 : Math.round(revenue / paidOrders.length);
    const repeatBuyers = new Set(paidOrders.map((o) => o.userId)).size;
    const repeatPurchase =
      repeatBuyers === 0 ? 0 : Math.round((paidOrders.length / repeatBuyers) * 10) / 10;
    const completedCourses = enrollments.filter(
      (e) => e.completedLessons.length > 0,
    ).length;
    const avgTestPercent =
      attempts.length === 0
        ? 0
        : Math.round(attempts.reduce((a, t) => a + t.percent, 0) / attempts.length);

    return {
      userCount: users.length,
      orderCount: orders.length,
      paidOrderCount: paidOrders.length,
      revenue,
      avgOrderValue,
      repeatPurchase,
      enrollmentCount: enrollments.length,
      completedCourseCount: completedCourses,
      attemptCount: attempts.length,
      avgTestPercent,
      courseCount: courses.length,
      questionCount: questions.length,
      openTicketCount: tickets.filter((t) => t.status === "open").length,
      conversionRate: users.length === 0 ? 0 : Math.round((paidOrders.length / users.length) * 1000) / 10,
    };
  },
});

export const getRevenueSeries = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return [];
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .collect();
    const byDay = new Map<string, number>();
    for (const o of orders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      byDay.set(key, (byDay.get(key) ?? 0) + o.total);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => ({ date, revenue }));
  },
});

export const getEnrollmentStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return [];
    const enrollments = await ctx.db.query("enrollments").collect();
    const byCourse = new Map<string, number>();
    for (const e of enrollments) {
      byCourse.set(e.courseId, (byCourse.get(e.courseId) ?? 0) + 1);
    }
    const out = [];
    for (const [courseId, count] of byCourse.entries()) {
      const course = (await ctx.db.get(courseId as any)) as any;
      if (course) out.push({ title: course.title, count });
    }
    return out.sort((a, b) => b.count - a.count).slice(0, 8);
  },
});

// ── Users & roles ───────────────────────────────────────────────────────────
export const adminGetUsers = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return [];
    const users = await ctx.db.query("users").collect();
    return users
      .map((u) => ({
        _id: u._id,
        name: u.name ?? null,
        email: u.email ?? null,
        role: u.role ?? null,
        university: u.university ?? null,
        major: u.major ?? null,
        isAnonymous: u.isAnonymous ?? false,
        createdAt: (u as any)._creationTime ?? null,
      }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },
});

export const adminSetRole = mutation({
  args: { userId: v.id("users"), role: v.string() },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.patch(args.userId, { role: args.role as any });
    return { ok: true };
  },
});

export const adminAddAdmin = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("ایمیل نامعتبر است.");
    const existing = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!existing) await ctx.db.insert("admins", { email });
    return { ok: true };
  },
});

// ── Orders ──────────────────────────────────────────────────────────────────
export const adminGetOrders = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return [];
    const orders = await ctx.db.query("orders").order("desc").collect();
    return Promise.all(
      orders.map(async (o) => {
        const u = await ctx.db.get(o.userId);
        return { ...o, user: u ? { name: u.name, email: u.email } : null };
      }),
    );
  },
});

export const adminUpdateOrderStatus = mutation({
  args: { orderId: v.id("orders"), status: v.string() },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.patch(args.orderId, { status: args.status as any });
    return { ok: true };
  },
});

// ── Coupons ─────────────────────────────────────────────────────────────────
export const adminGetCoupons = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return [];
    return await ctx.db.query("coupons").collect();
  },
});

export const adminCreateCoupon = mutation({
  args: {
    code: v.string(),
    percent: v.number(),
    maxUses: v.number(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const code = args.code.trim().toUpperCase();
    const existing = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (existing) throw new Error("این کد قبلاً ثبت شده است.");
    if (args.percent <= 0 || args.percent > 100) throw new Error("درصد نامعتبر است.");
    await ctx.db.insert("coupons", {
      code,
      percent: args.percent,
      active: true,
      maxUses: args.maxUses,
      usedCount: 0,
      expiresAt: args.expiresAt,
    });
    return { ok: true };
  },
});

export const adminToggleCoupon = mutation({
  args: { couponId: v.id("coupons"), active: v.boolean() },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.patch(args.couponId, { active: args.active });
    return { ok: true };
  },
});

// ── Courses ─────────────────────────────────────────────────────────────────
export const adminListCourses = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return [];
    const courses = await ctx.db.query("courses").order("desc").collect();
    return Promise.all(
      courses.map(async (c) => ({
        ...c,
        category: (await ctx.db.get(c.categoryId))?.name ?? null,
        instructor: (await ctx.db.get(c.instructorId))?.name ?? null,
      })),
    );
  },
});

export const adminCreateCourse = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    categoryId: v.id("categories"),
    instructorId: v.id("instructors"),
    summary: v.string(),
    price: v.number(),
    mode: v.string(),
    bundle: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const slug = args.slug.trim() || args.title.trim().replace(/\s+/g, "-").toLowerCase();
    await ctx.db.insert("courses", {
      title: args.title.trim(),
      slug,
      categoryId: args.categoryId,
      instructorId: args.instructorId,
      summary: args.summary.trim(),
      description: args.summary.trim(),
      audience: [],
      prerequisites: [],
      syllabus: [],
      durationText: "به‌زودی",
      mode: args.mode as any,
      price: args.price,
      rating: 0,
      ratingCount: 0,
      studentsCount: 0,
      accent: "teal",
      bundle: args.bundle as any,
      includes: [],
      hasSampleVideo: false,
      files: [],
      published: false,
      featured: false,
      popular: false,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const adminTogglePublish = mutation({
  args: { collection: v.string(), id: v.string(), published: v.boolean() },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.patch(args.id as any, { published: args.published } as any);
    return { ok: true };
  },
});

export const adminDeleteCourse = mutation({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Questions ───────────────────────────────────────────────────────────────
export const adminGetQuestions = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return [];
    const questions = await ctx.db.query("questions").collect();
    return Promise.all(
      questions.map(async (q) => ({
        ...q,
        topic: (await ctx.db.get(q.topicId))?.name ?? null,
      })),
    );
  },
});

export const adminCreateQuestion = mutation({
  args: {
    text: v.string(),
    options: v.array(v.string()),
    correctIndex: v.number(),
    explanation: v.string(),
    topicId: v.id("categories"),
    difficulty: v.number(),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    if (args.options.length < 2) throw new Error("حداقل دو گزینه لازم است.");
    await ctx.db.insert("questions", {
      text: args.text.trim(),
      options: args.options,
      correctIndex: args.correctIndex,
      explanation: args.explanation.trim(),
      topicId: args.topicId,
      difficulty: args.difficulty,
    });
    return { ok: true };
  },
});

// ── Articles ────────────────────────────────────────────────────────────────
export const adminCreateArticle = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    category: v.string(),
    excerpt: v.string(),
    body: v.string(),
    authorName: v.string(),
    readTime: v.number(),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.insert("articles", {
      title: args.title.trim(),
      slug: args.slug.trim() || args.title.trim().replace(/\s+/g, "-"),
      category: args.category.trim() || "عمومی",
      excerpt: args.excerpt.trim(),
      body: args.body,
      authorName: args.authorName.trim() || "تیم Genova",
      accent: "teal",
      readTime: args.readTime || 5,
      published: true,
      featured: false,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

// ── Workshops ───────────────────────────────────────────────────────────────
export const adminCreateWorkshop = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    instructorId: v.id("instructors"),
    topic: v.string(),
    date: v.string(),
    time: v.string(),
    capacity: v.number(),
    price: v.number(),
    description: v.string(),
    free: v.boolean(),
    expertTalk: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.insert("workshops", {
      title: args.title.trim(),
      slug: args.slug.trim() || args.title.trim().replace(/\s+/g, "-"),
      instructorId: args.instructorId,
      topic: args.topic.trim(),
      date: args.date,
      time: args.time,
      capacity: args.capacity,
      registeredCount: 0,
      price: args.price,
      description: args.description,
      agenda: [],
      free: args.free,
      expertTalk: args.expertTalk,
      published: true,
    });
    return { ok: true };
  },
});
