import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// fetch a doc by string id with loose typing (ids arrive from the client)
const getDoc = async (ctx: any, id: string) => (await ctx.db.get(id)) as any;

// ── Purchase / orders (MVP: simulated gateway, invoice recorded) ────────────
export const purchase = mutation({
  args: {
    items: v.array(
      v.object({ type: v.string(), refId: v.string() }),
    ),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای خرید ابتدا وارد حساب شوید.");
    if (args.items.length === 0) throw new Error("سبد خرید خالی است.");

    const lineItems: { type: "course" | "product" | "workshop"; refId: string; title: string; price: number }[] = [];
    for (const item of args.items) {
      if (item.type === "course") {
        const course = await getDoc(ctx, item.refId);
        if (!course || !course.published) throw new Error("دوره یافت نشد.");
        lineItems.push({
          type: "course",
          refId: course._id,
          title: course.title,
          price: course.discountPrice ?? course.price,
        });
      } else if (item.type === "product") {
        const product = await getDoc(ctx, item.refId);
        if (!product || !product.published) throw new Error("محصول یافت نشد.");
        lineItems.push({
          type: "product",
          refId: product._id,
          title: product.title,
          price: product.price,
        });
      } else if (item.type === "workshop") {
        const workshop = await getDoc(ctx, item.refId);
        if (!workshop || !workshop.published) throw new Error("کارگاه یافت نشد.");
        if (workshop.registeredCount >= workshop.capacity) {
          throw new Error("ظرفیت کارگاه تکمیل شده است.");
        }
        lineItems.push({
          type: "workshop",
          refId: workshop._id,
          title: workshop.title,
          price: workshop.free ? 0 : workshop.price,
        });
      } else {
        throw new Error("نوع آیتم نامعتبر است.");
      }
    }

    const subtotal = lineItems.reduce((acc, l) => acc + l.price, 0);
    let discountAmount = 0;
    let couponCode: string | undefined;

    if (args.couponCode && subtotal > 0) {
      const code = args.couponCode.trim().toUpperCase();
      const coupon = await ctx.db
        .query("coupons")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (!coupon || !coupon.active) throw new Error("کد تخفیف نامعتبر است.");
      if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
        throw new Error("ظرفیت استفاده از این کد تخفیف تمام شده است.");
      }
      if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
        throw new Error("این کد تخفیف منقضی شده است.");
      }
      discountAmount = Math.round((subtotal * coupon.percent) / 100);
      couponCode = code;
      await ctx.db.patch(coupon._id, { usedCount: coupon.usedCount + 1 });
    }

    const total = Math.max(0, subtotal - discountAmount);
    const invoiceNumber = `ZA-${Date.now().toString().slice(-8)}`;

    const orderId = await ctx.db.insert("orders", {
      userId: user._id,
      items: lineItems,
      subtotal,
      discountAmount,
      total,
      couponCode,
      status: "paid", // MVP: simulated payment — real gateway lands here in a future phase
      invoiceNumber,
      createdAt: Date.now(),
    });

    // grant access: enroll in courses, bump workshop registration
    for (const item of lineItems) {
      if (item.type === "course") {
        const existing = await ctx.db
          .query("enrollments")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .filter((q) => q.eq(q.field("courseId"), item.refId as any))
          .first();
        if (!existing) {
          await ctx.db.insert("enrollments", {
            userId: user._id,
            courseId: item.refId as any,
            completedLessons: [],
            enrolledAt: Date.now(),
            lastActiveAt: Date.now(),
          });
        }
      }
      if (item.type === "workshop") {
        const workshop = await getDoc(ctx, item.refId);
        if (workshop) {
          await ctx.db.patch(workshop._id, {
            registeredCount: workshop.registeredCount + 1,
          });
        }
      }
    }

    return await ctx.db.get(orderId);
  },
});

// Look up a coupon from the DB so the checkout UI can preview the discount
// with the same rules the purchase mutation enforces. Public: coupons are
// promo codes, not secrets.
export const getCouponInfo = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    if (!code) return null;
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (!coupon || !coupon.active) return { valid: false, reason: "کد تخفیف نامعتبر است." };
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, reason: "ظرفیت استفاده از این کد تخفیف تمام شده است." };
    }
    if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
      return { valid: false, reason: "این کد تخفیف منقضی شده است." };
    }
    return { valid: true, percent: coupon.percent };
  },
});

export const getMyOrders = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// ── Enrollments & progress ──────────────────────────────────────────────────
export const getMyEnrollments = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    return Promise.all(
      enrollments.map(async (en) => {
        const course = await ctx.db.get(en.courseId);
        if (!course) return null;
        const category = await ctx.db.get(course.categoryId);
        const totalLessons = course.syllabus.length;
        const percent =
          totalLessons === 0
            ? 0
            : Math.round((en.completedLessons.length / totalLessons) * 100);
        return {
          ...en,
          percent,
          course: {
            ...course,
            category: category ? { name: category.name, accent: category.accent } : null,
          },
        };
      }),
    ).then((rows) => rows.filter((r): r is NonNullable<typeof r> => !!r));
  },
});

export const markLessonComplete = mutation({
  args: {
    courseId: v.id("courses"),
    lessonId: v.string(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("courseId"), args.courseId))
      .first();
    if (!enrollment) throw new Error("ابتدا در این دوره ثبت‌نام کنید.");

    let completed = [...enrollment.completedLessons];
    if (args.completed && !completed.includes(args.lessonId)) {
      completed.push(args.lessonId);
    } else if (!args.completed) {
      completed = completed.filter((l) => l !== args.lessonId);
    }
    await ctx.db.patch(enrollment._id, {
      completedLessons: completed,
      lastActiveAt: Date.now(),
    });
    return { completedLessons: completed };
  },
});

// ── Downloads (files of enrolled courses) ───────────────────────────────────
export const getMyDownloads = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const out: {
      courseId: string;
      courseTitle: string;
      courseSlug: string;
      files: { name: string; size: string; type: string }[];
    }[] = [];
    for (const en of enrollments) {
      const course = await ctx.db.get(en.courseId);
      if (course && course.files.length > 0) {
        out.push({
          courseId: course._id,
          courseTitle: course.title,
          courseSlug: course.slug,
          files: course.files,
        });
      }
    }
    return out;
  },
});

// ── Bookmarks ───────────────────────────────────────────────────────────────
export const toggleBookmark = mutation({
  args: { contentType: v.string(), contentId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("contentType"), args.contentType),
          q.eq(q.field("contentId"), args.contentId),
        ),
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { bookmarked: false };
    }
    await ctx.db.insert("bookmarks", {
      userId: user._id,
      contentType: args.contentType,
      contentId: args.contentId,
      createdAt: Date.now(),
    });
    return { bookmarked: true };
  },
});

export const getMyBookmarks = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    const out = [];
    for (const b of bookmarks) {
      let item: any = null;
      if (b.contentType === "course") {
        item = await ctx.db.get(b.contentId as any);
      } else if (b.contentType === "article") {
        item = await ctx.db.get(b.contentId as any);
      } else if (b.contentType === "product") {
        item = await ctx.db.get(b.contentId as any);
      } else if (b.contentType === "workshop") {
        item = await ctx.db.get(b.contentId as any);
      }
      if (item) {
        out.push({ ...b, item: { ...item, contentType: b.contentType } });
      }
    }
    return out;
  },
});

export const isBookmarked = query({
  args: { contentType: v.string(), contentId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return false;
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("contentType"), args.contentType),
          q.eq(q.field("contentId"), args.contentId),
        ),
      )
      .first();
    return !!existing;
  },
});

// ── Personal flashcards ─────────────────────────────────────────────────────
export const addFlashcard = mutation({
  args: { front: v.string(), back: v.string(), category: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    if (args.front.trim().length === 0 || args.back.trim().length === 0) {
      throw new Error("متن فلش‌کارت نباید خالی باشد.");
    }
    return await ctx.db.insert("flashcards", {
      userId: user._id,
      front: args.front.trim(),
      back: args.back.trim(),
      category: args.category.trim() || "عمومی",
      createdAt: Date.now(),
    });
  },
});

export const deleteFlashcard = mutation({
  args: { id: v.id("flashcards") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const card = await ctx.db.get(args.id);
    if (!card || card.userId !== user._id) throw new Error("کارت یافت نشد.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

export const getMyFlashcards = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("flashcards")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});
