import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ── Flash Sales ──────────────────────────────────────────────────────────────

export const listActiveFlashSales = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db
      .query("flashSales")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return all.filter(
      (s) => s.startsAt <= now && s.expiresAt >= now,
    );
  },
});

export const listAllFlashSales = query({
  args: {},
  handler: async (ctx) => {
    // @ts-ignore - staff check done at call site
    return await ctx.db.query("flashSales").order("desc").collect();
  },
});

export const createFlashSale = mutation({
  args: {
    title: v.string(),
    targetType: v.union(
      v.literal("course"),
      v.literal("workshop"),
      v.literal("product"),
      v.literal("all"),
    ),
    targetId: v.optional(v.string()),
    percent: v.number(),
    startsAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    return await ctx.db.insert("flashSales", {
      title: args.title,
      targetType: args.targetType,
      targetId: args.targetId,
      percent: Math.min(Math.max(args.percent, 1), 90),
      startsAt: args.startsAt,
      expiresAt: args.expiresAt,
      active: true,
      createdBy: identity.subject as any,
      createdAt: Date.now(),
    });
  },
});

export const toggleFlashSale = mutation({
  args: { id: v.id("flashSales"), active: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: args.active });
  },
});

export const deleteFlashSale = mutation({
  args: { id: v.id("flashSales") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── Promo Banners ────────────────────────────────────────────────────────────

export const listActivePromoBanners = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db
      .query("promoBanners")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return all
      .filter((b) => {
        if (b.startsAt && b.startsAt > now) return false;
        if (b.expiresAt && b.expiresAt < now) return false;
        return true;
      })
      .sort((a, b) => b.priority - a.priority);
  },
});

export const listAllPromoBanners = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("promoBanners").order("desc").collect();
  },
});

export const createPromoBanner = mutation({
  args: {
    text: v.string(),
    link: v.optional(v.string()),
    sticker: v.optional(v.string()),
    color: v.optional(v.string()),
    priority: v.number(),
    startsAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    return await ctx.db.insert("promoBanners", {
      text: args.text,
      link: args.link,
      sticker: args.sticker,
      color: args.color,
      priority: args.priority,
      active: true,
      startsAt: args.startsAt,
      expiresAt: args.expiresAt,
      createdBy: identity.subject as any,
      createdAt: Date.now(),
    });
  },
});

export const togglePromoBanner = mutation({
  args: { id: v.id("promoBanners"), active: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: args.active });
  },
});

export const deletePromoBanner = mutation({
  args: { id: v.id("promoBanners") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── Certificates ─────────────────────────────────────────────────────────────

export const requestCertificate = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    const userId = identity.subject as any;

    // Check enrollment
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("courseId"), args.courseId))
      .first();
    if (!enrollment) throw new Error("شما در این دوره ثبت‌نام نشده‌اید.");

    // Check if already requested
    const existing = await ctx.db
      .query("certificates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("courseId"), args.courseId))
      .first();
    if (existing) throw new Error("درخواست گواهی قبلاً ارسال شده است.");

    return await ctx.db.insert("certificates", {
      userId,
      courseId: args.courseId,
      status: "requested",
      requestedAt: Date.now(),
    });
  },
});

export const listMyCertificates = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as any;
    const certs = await ctx.db
      .query("certificates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const result = [];
    for (const c of certs) {
      const course = await ctx.db.get(c.courseId);
      result.push({ ...c, courseTitle: course?.title ?? "—" });
    }
    return result;
  },
});

export const listAllCertRequests = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db
      .query("certificates")
      .withIndex("by_status", (q) => q.eq("status", "requested"))
      .order("desc")
      .collect();
    const result = [];
    for (const r of requests) {
      const user = await ctx.db.get(r.userId);
      const course = await ctx.db.get(r.courseId);
      result.push({
        ...r,
        userName: user?.name ?? user?.email ?? "—",
        courseTitle: course?.title ?? "—",
      });
    }
    return result;
  },
});

export const resolveCertificate = mutation({
  args: {
    id: v.id("certificates"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    certificateUrl: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    await ctx.db.patch(args.id, {
      status: args.status,
      certificateUrl: args.certificateUrl,
      note: args.note,
      resolvedAt: Date.now(),
      resolvedBy: identity.subject as any,
    });
  },
});

// ── Workshop Enrollments ─────────────────────────────────────────────────────

export const enrollWorkshop = mutation({
  args: { workshopId: v.id("workshops") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    const userId = identity.subject as any;

    const existing = await ctx.db
      .query("workshopEnrollments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("workshopId"), args.workshopId))
      .first();
    if (existing) throw new Error("شما قبلاً در این کارگاه ثبت‌نام کرده‌اید.");

    const workshop = await ctx.db.get(args.workshopId);
    if (!workshop) throw new Error("کارگاه یافت نشد.");
    if (workshop.registeredCount >= workshop.capacity) {
      throw new Error("ظرفیت کارگاه تکمیل شده است.");
    }

    await ctx.db.patch(args.workshopId, {
      registeredCount: workshop.registeredCount + 1,
    });

    return await ctx.db.insert("workshopEnrollments", {
      userId,
      workshopId: args.workshopId,
      enrolledAt: Date.now(),
    });
  },
});

export const listMyWorkshopEnrollments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as any;
    const enrollments = await ctx.db
      .query("workshopEnrollments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const result = [];
    for (const e of enrollments) {
      const workshop = await ctx.db.get(e.workshopId);
      if (workshop) {
        result.push({
          ...e,
          workshopTitle: workshop.title,
          workshopDate: workshop.date,
          workshopTime: workshop.time,
          workshopTopic: workshop.topic,
          workshopPrice: workshop.price,
          workshopFree: workshop.free,
        });
      }
    }
    return result;
  },
});
