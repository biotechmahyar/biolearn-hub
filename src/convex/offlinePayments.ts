import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { isAnyAdmin } from "./admin";

// Student submits an offline payment with receipt image + tracking number
export const submitOfflinePayment = mutation({
  args: {
    courseId: v.id("courses"),
    tier: v.string(),
    amount: v.number(),
    trackingNumber: v.string(),
    receiptStorageId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("دوره یافت نشد.");
    if (!args.trackingNumber.trim()) throw new Error("شماره رهگیری لازم است.");
    if (!args.receiptStorageId) throw new Error("تصویر فیش لازم است.");

    // Check for duplicate pending payment for same course+tier
    const existing = await ctx.db
      .query("offlinePayments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const dup = existing.find(
      (p) =>
        p.courseId === args.courseId &&
        p.tier === args.tier &&
        p.status === "pending",
    );
    if (dup) throw new Error("قبلاً درخواست پرداخت آفلاین برای این دوره ثبت کرده‌اید.");

    await ctx.db.insert("offlinePayments", {
      userId: user._id,
      courseId: args.courseId,
      tier: args.tier as any,
      amount: args.amount,
      trackingNumber: args.trackingNumber.trim(),
      receiptStorageId: args.receiptStorageId,
      status: "pending",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

// Admin: list all offline payments
export const listOfflinePayments = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const payments = await ctx.db.query("offlinePayments").collect();
    const result = [];
    for (const p of payments) {
      const [user, course] = await Promise.all([
        ctx.db.get(p.userId),
        ctx.db.get(p.courseId),
      ]);
      result.push({
        ...p,
        userName: user?.name ?? user?.firstName ?? "ناشناخته",
        userEmail: user?.email ?? "",
        courseTitle: course?.title ?? "—",
      });
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Admin: approve offline payment → enroll student + create order
export const approveOfflinePayment = mutation({
  args: { paymentId: v.id("offlinePayments") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("پرداخت یافت نشد.");
    if (payment.status !== "pending")
      throw new Error("این پرداخت قبلاً بررسی شده است.");

    // Check if already enrolled
    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", payment.userId))
      .collect();
    const alreadyEnrolled = existing.find(
      (e) => e.courseId === payment.courseId,
    );
    if (!alreadyEnrolled) {
      await ctx.db.insert("enrollments", {
        userId: payment.userId,
        courseId: payment.courseId,
        completedLessons: [],
        enrolledAt: Date.now(),
      });
    }

    // Create order record
    const invoiceNumber = `OFF-${Date.now().toString(36).toUpperCase()}`;
    await ctx.db.insert("orders", {
      userId: payment.userId,
      items: [
        {
          type: "course",
          refId: payment.courseId,
          title: (await ctx.db.get(payment.courseId))?.title ?? "",
          price: payment.amount,
        },
      ],
      subtotal: payment.amount,
      discountAmount: 0,
      total: payment.amount,
      status: "paid",
      invoiceNumber,
      createdAt: Date.now(),
    });

    // Update course student count
    const course = await ctx.db.get(payment.courseId);
    if (course) {
      await ctx.db.patch(payment.courseId, {
        studentsCount: course.studentsCount + 1,
      });
    }

    // Mark payment as approved
    await ctx.db.patch(args.paymentId, { status: "approved" });
    return { ok: true };
  },
});

// Admin: reject offline payment
export const rejectOfflinePayment = mutation({
  args: { paymentId: v.id("offlinePayments"), note: v.string() },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("پرداخت یافت نشد.");
    await ctx.db.patch(args.paymentId, {
      status: "rejected",
      note: args.note.trim() || undefined,
    });
    return { ok: true };
  },
});

// Admin: delete offline payment record
export const deleteOfflinePayment = mutation({
  args: { paymentId: v.id("offlinePayments") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.delete(args.paymentId);
    return { ok: true };
  },
});

// Student: check my pending offline payments
export const myOfflinePayments = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const payments = await ctx.db
      .query("offlinePayments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const result = [];
    for (const p of payments) {
      const course = await ctx.db.get(p.courseId);
      result.push({
        ...p,
        courseTitle: course?.title ?? "—",
      });
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  },
});
