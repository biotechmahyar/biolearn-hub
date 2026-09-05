import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// ── Helpers ──────────────────────────────────────────────────────────────────

const isStaff = async (ctx: any) => {
  const user = await getCurrentUser(ctx);
  return (
    !!user &&
    (user.role === "content_manager" ||
      user.role === "admin" ||
      user.role === "site_admin")
  );
};

// ── Admin CRUD ───────────────────────────────────────────────────────────────

export const adminListPaths = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isStaff(ctx))) return [];
    const paths = await ctx.db.query("academyPaths").order("desc").collect();
    const result = [];
    for (const p of paths) {
      const items = await ctx.db
        .query("academyPathItems")
        .withIndex("by_path", (q) => q.eq("pathId", p._id))
        .collect();
      const enriched = [];
      for (const item of items.sort((a, b) => a.order - b.order)) {
        const w = item.workshopId ? await ctx.db.get(item.workshopId) : null;
        enriched.push({
          ...item,
          workshopTitle: w?.title ?? "—",
          workshopDate: w?.date ?? null,
          workshopTime: w?.time ?? null,
        });
      }
      result.push({ ...p, items: enriched });
    }
    return result;
  },
});

export const adminCreatePath = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    level: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isStaff(ctx))) throw new Error("دسترسی لازم است.");
    const slug = `path-${Date.now().toString(36)}`;
    return await ctx.db.insert("academyPaths", {
      title: args.title,
      slug,
      description: args.description,
      level: args.level,
      color: args.color ?? "emerald",
      published: false,
      createdAt: Date.now(),
    });
  },
});

export const adminUpdatePath = mutation({
  args: {
    id: v.id("academyPaths"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    level: v.optional(v.string()),
    color: v.optional(v.string()),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!(await isStaff(ctx))) throw new Error("دسترسی لازم است.");
    const { id, ...patch } = args;
    const clean: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(patch)) {
      if (val !== undefined) clean[k] = val;
    }
    if (Object.keys(clean).length > 0) await ctx.db.patch(id, clean);
  },
});

export const adminDeletePath = mutation({
  args: { id: v.id("academyPaths") },
  handler: async (ctx, args) => {
    if (!(await isStaff(ctx))) throw new Error("دسترسی لازم است.");
    const items = await ctx.db
      .query("academyPathItems")
      .withIndex("by_path", (q) => q.eq("pathId", args.id))
      .collect();
    for (const item of items) await ctx.db.delete(item._id);
    await ctx.db.delete(args.id);
  },
});

export const adminAddPathItem = mutation({
  args: {
    pathId: v.id("academyPaths"),
    workshopId: v.id("workshops"),
  },
  handler: async (ctx, args) => {
    if (!(await isStaff(ctx))) throw new Error("دسترسی لازم است.");
    const existing = await ctx.db
      .query("academyPathItems")
      .withIndex("by_path", (q) => q.eq("pathId", args.pathId))
      .collect();
    if (existing.some((i) => i.workshopId === args.workshopId)) {
      throw new Error("این کارگاه قبلاً در مسیر اضافه شده است.");
    }
    return await ctx.db.insert("academyPathItems", {
      pathId: args.pathId,
      workshopId: args.workshopId,
      order: existing.length,
    });
  },
});

export const adminRemovePathItem = mutation({
  args: { id: v.id("academyPathItems") },
  handler: async (ctx, args) => {
    if (!(await isStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.delete(args.id);
  },
});

export const adminMovePathItem = mutation({
  args: { id: v.id("academyPathItems"), direction: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, args) => {
    if (!(await isStaff(ctx))) throw new Error("دسترسی لازم است.");
    const item = await ctx.db.get(args.id);
    if (!item) return;
    const siblings = await ctx.db
      .query("academyPathItems")
      .withIndex("by_path", (q) => q.eq("pathId", item.pathId))
      .collect();
    siblings.sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((s) => s._id === args.id);
    const swapWith = args.direction === "up" ? siblings[idx - 1] : siblings[idx + 1];
    if (!swapWith) return;
    await ctx.db.patch(item._id, { order: swapWith.order });
    await ctx.db.patch(swapWith._id, { order: item.order });
  },
});

// List workshops available to add (published ones not already in the path)
export const adminListAvailableWorkshops = query({
  args: { pathId: v.id("academyPaths") },
  handler: async (ctx, args) => {
    if (!(await isStaff(ctx))) return [];
    const workshops = await ctx.db.query("workshops").collect();
    const items = await ctx.db
      .query("academyPathItems")
      .withIndex("by_path", (q) => q.eq("pathId", args.pathId))
      .collect();
    const usedIds = new Set(items.map((i) => i.workshopId));
    return workshops.filter((w) => !usedIds.has(w._id));
  },
});

// ── Public / Student views ───────────────────────────────────────────────────

export const listPublishedPaths = query({
  args: {},
  handler: async (ctx) => {
    const paths = await ctx.db
      .query("academyPaths")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    const result = [];
    for (const p of paths) {
      const items = await ctx.db
        .query("academyPathItems")
        .withIndex("by_path", (q) => q.eq("pathId", p._id))
        .collect();
      const enriched = [];
      for (const item of items.sort((a, b) => a.order - b.order)) {
        const w = item.workshopId ? await ctx.db.get(item.workshopId) : null;
        if (!w) continue;
        enriched.push({
          itemId: item._id,
          order: item.order,
          workshopId: w._id,
          title: w.title,
          topic: w.topic,
          date: w.date,
          time: w.time,
          price: w.price,
          free: w.free,
          slug: w.slug,
        });
      }
      result.push({
        _id: p._id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        level: p.level,
        color: p.color ?? "emerald",
        items: enriched,
      });
    }
    return result;
  },
});

// My enrollments across all paths (which steps are done)
export const listMyPathProgress = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as any;
    const enrolls = await ctx.db
      .query("workshopEnrollments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return enrolls.map((e) => e.workshopId);
  },
});

// ── Instructor view ──────────────────────────────────────────────────────────

export const listInstructorPaths = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const paths = await ctx.db
      .query("academyPaths")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    const result = [];
    for (const p of paths) {
      const items = await ctx.db
        .query("academyPathItems")
        .withIndex("by_path", (q) => q.eq("pathId", p._id))
        .collect();
      const myItems = [];
      for (const item of items.sort((a, b) => a.order - b.order)) {
        const w = item.workshopId ? await ctx.db.get(item.workshopId) : null;
        if (!w) continue;
        // Match by instructor's name on the workshop's instructor, or any item
        myItems.push({
          workshopId: w._id,
          title: w.title,
          date: w.date,
          time: w.time,
          order: item.order,
        });
      }
      if (myItems.length > 0) {
        result.push({
          _id: p._id,
          title: p.title,
          description: p.description,
          level: p.level,
          items: myItems,
        });
      }
    }
    return result;
  },
});


// ── Public path detail by slug (with access state for current user) ─────────
export const getPathBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const p = await ctx.db
      .query("academyPaths")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first();
    if (!p || !p.published) return null;

    const items = await ctx.db
      .query("academyPathItems")
      .withIndex("by_path", (q) => q.eq("pathId", p._id))
      .collect();
    const now = Date.now();
    const enriched = [];
    for (const item of items.sort((a, b) => a.order - b.order)) {
      const w = item.workshopId ? await ctx.db.get(item.workshopId) : null;
      if (!w) continue;
      const workshopDate = w.date ? new Date(w.date).getTime() : null;
      enriched.push({
        itemId: item._id,
        order: item.order,
        workshopId: w._id,
        title: w.title,
        topic: w.topic,
        description: w.description ?? "",
        date: w.date,
        time: w.time,
        price: w.price,
        free: w.free,
        slug: w.slug,
        instructorName: (w as any).instructorName ?? (w as any).instructor ?? null,
        capacity: w.capacity ?? 0,
        registeredCount: w.registeredCount ?? 0,
        published: w.published ?? false,
        isPast: workshopDate !== null && workshopDate < now,
        // A workshop is "coming soon" when unpublished or missing schedule info
        comingSoon: !w.published || !w.date,
      });
    }

    // Determine access for the current user
    const identity = await ctx.auth.getUserIdentity();
    let hasFullAccess = false;
    let ownedWorkshopIds: string[] = [];
    if (identity) {
      const userId = identity.subject as any;
      const access = await ctx.db
        .query("pathAccess")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("pathId"), p._id))
        .first();
      hasFullAccess = !!access;

      const enrolls = await ctx.db
        .query("workshopEnrollments")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const itemWs = new Set(items.map((i) => String(i.workshopId)));
      ownedWorkshopIds = enrolls
        .map((e) => String(e.workshopId))
        .filter((id) => itemWs.has(id));
    }

    return {
      _id: p._id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      level: p.level,
      color: p.color ?? "emerald",
      price: p.price ?? 0,
      discountPrice: p.discountPrice,
      discountExpiresAt: p.discountExpiresAt,
      items: enriched,
      hasFullAccess,
      ownedWorkshopIds,
    };
  },
});

// All published paths with pricing info (for the paths listing section)
export const listPublishedPathsWithPricing = query({
  args: {},
  handler: async (ctx) => {
    const paths = await ctx.db
      .query("academyPaths")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    const now = Date.now();
    return paths.map((p) => ({
      _id: p._id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      level: p.level,
      color: p.color ?? "emerald",
      price: p.price ?? 0,
      discountPrice:
        p.discountPrice && p.discountExpiresAt && p.discountExpiresAt > now
          ? p.discountPrice
          : undefined,
    }));
  },
});

// Purchase the full academy path (backend-enforced price + instant access)
export const purchasePath = mutation({
  args: {
    pathId: v.id("academyPaths"),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای خرید ابتدا وارد حساب شوید.");

    const p = await ctx.db.get(args.pathId);
    if (!p || !p.published) throw new Error("مسیر یافت نشد.");

    // Central payment gateway enforcement
    const paymentSetting = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "payment.enabled"))
      .first();
    const paymentEnabled = paymentSetting
      ? (() => { try { return JSON.parse(paymentSetting.value); } catch { return true; } })()
      : true;
    if (!paymentEnabled && (p.price ?? 0) > 0) {
      throw new Error("پرداخت آنلاین موقتاً غیرفعال است — بعداً تلاش کنید.");
    }

    // Already owned?
    const existing = await ctx.db
      .query("pathAccess")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("pathId"), p._id))
      .first();
    if (existing) throw new Error("شما از قبل به کل این مسیر دسترسی دارید.");

    // Price from DB only — never trust the client
    const now = Date.now();
    let price = p.price ?? 0;
    if (p.discountPrice && p.discountExpiresAt && p.discountExpiresAt > now) {
      price = p.discountPrice;
    }

    let discountAmount = 0;
    let couponCode: string | undefined;
    if (args.couponCode && price > 0) {
      const code = args.couponCode.trim().toUpperCase();
      const coupon = await ctx.db
        .query("coupons")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (!coupon || !coupon.active) throw new Error("کد تخفیف نامعتبر است.");
      if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses)
        throw new Error("ظرفیت کد تخفیف تمام شده است.");
      if (coupon.expiresAt && coupon.expiresAt < now)
        throw new Error("کد تخفیف منقضی شده است.");
      discountAmount = Math.round((price * coupon.percent) / 100);
      couponCode = code;
      await ctx.db.patch(coupon._id, { usedCount: coupon.usedCount + 1 });
    }

    const total = Math.max(0, price - discountAmount);
    const invoiceNumber = `AP-${Date.now().toString().slice(-8)}`;

    const orderId = await ctx.db.insert("orders", {
      userId: user._id,
      items: [{ type: "path" as any, refId: p._id as any, title: `مسیر آکادمی: ${p.title}`, price: total }],
      subtotal: price,
      discountAmount,
      total,
      couponCode,
      status: "paid",
      invoiceNumber,
      createdAt: now,
    });

    await ctx.db.insert("pathAccess", {
      userId: user._id,
      pathId: p._id,
      orderId,
      purchasedAt: now,
    });

    return { orderId, invoiceNumber, total };
  },
});


// Bulk-add AI-suggested workshop titles to a path as draft placeholders.
// Creates unpublished workshop shells the admin can finalize (instructor,
// date, price) later — nothing goes public automatically.
export const adminBulkAddPathWorkshops = mutation({
  args: {
    pathId: v.id("academyPaths"),
    workshops: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        durationMin: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "site_admin"))
      throw new Error("دسترسی مدیریتی لازم است.");

    const path = await ctx.db.get(args.pathId);
    if (!path) throw new Error("مسیر یافت نشد.");

    const existingItems = await ctx.db
      .query("academyPathItems")
      .withIndex("by_path", (q) => q.eq("pathId", args.pathId))
      .collect();
    let nextOrder = existingItems.length;

    // Pick the first available instructor as a placeholder (admin reassigns later)
    const firstInstructor = await ctx.db.query("instructors").first();
    if (!firstInstructor)
      throw new Error("ابتدا حداقل یک مدرس در سیستم ثبت کنید.");

    const created: string[] = [];
    for (const ws of args.workshops) {
      const id = await ctx.db.insert("workshops", {
        title: ws.title,
        slug: `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        instructorId: firstInstructor._id,
        topic: ws.description ?? "",
        date: "",
        time: "",
        capacity: 30,
        registeredCount: 0,
        price: 0,
        description: ws.description ?? "",
        agenda: [],
        free: true,
        expertTalk: false,
        published: false, // draft until admin finalizes instructor/date/price
      });
      await ctx.db.insert("academyPathItems", {
        pathId: args.pathId,
        workshopId: id,
        order: nextOrder++,
      });
      created.push(String(id));
    }

    await ctx.db.insert("auditLogs", {
      userId: admin._id,
      userName: admin.name ?? admin.email ?? "—",
      action: "academy_path.bulk_add",
      entityType: "academyPath",
      entityId: args.pathId,
      details: JSON.stringify({ count: created.length }),
      createdAt: Date.now(),
    });

    return { created };
  },
});
