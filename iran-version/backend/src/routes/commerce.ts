import { Hono } from "hono";
import { db } from "../db/index.js";
import {
  courses, products, workshops, orders, coupons, enrollments,
  offlinePayments, classEnrollRequests, bookmarks, flashcards, categories,
} from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../middleware/auth.js";
import { requireAnyAdmin } from "../middleware/rbac.js";
import { successResponse, errorResponse } from "../types/index.js";

const commerce = new Hono();

// GET /api/commerce/coupons/check
commerce.get("/coupons/check", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.json(successResponse({ valid: false, reason: "کد تخفیف لازم است." }));

  const trimmed = code.trim().toUpperCase();
  const rows = await db.select().from(coupons).where(eq(coupons.code, trimmed)).limit(1);
  if (rows.length === 0 || !rows[0].active) return c.json(successResponse({ valid: false, reason: "کد تخفیف نامعتبر است." }));
  const coupon = rows[0];
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return c.json(successResponse({ valid: false, reason: "ظرفیت استفاده از این کد تخفیف تمام شده است." }));
  }
  if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
    return c.json(successResponse({ valid: false, reason: "این کد تخفیف منقضی شده است." }));
  }
  return c.json(successResponse({ valid: true, percent: coupon.percent }));
});

// POST /api/commerce/purchase
commerce.post("/purchase", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  const { items, couponCode } = body;

  if (!items || items.length === 0) return c.json(errorResponse("سبد خرید خالی است."), 400);

  const lineItems: { type: string; refId: string; title: string; price: number }[] = [];
  for (const item of items) {
    if (item.type === "course") {
      const rows = await db.select().from(courses).where(eq(courses.id, item.refId)).limit(1);
      if (rows.length === 0 || !rows[0].published) return c.json(errorResponse("دوره یافت نشد."), 404);
      lineItems.push({ type: "course", refId: rows[0].id, title: rows[0].title, price: rows[0].discountPrice ?? rows[0].price });
    } else if (item.type === "product") {
      const rows = await db.select().from(products).where(eq(products.id, item.refId)).limit(1);
      if (rows.length === 0 || !rows[0].published) return c.json(errorResponse("محصول یافت نشد."), 404);
      lineItems.push({ type: "product", refId: rows[0].id, title: rows[0].title, price: rows[0].price });
    } else if (item.type === "workshop") {
      const rows = await db.select().from(workshops).where(eq(workshops.id, item.refId)).limit(1);
      if (rows.length === 0 || !rows[0].published) return c.json(errorResponse("کارگاه یافت نشد."), 404);
      const ws = rows[0];
      if (ws.registeredCount >= ws.capacity) return c.json(errorResponse("ظرفیت کارگاه تکمیل شده است."), 400);
      lineItems.push({ type: "workshop", refId: ws.id, title: ws.title, price: ws.free ? 0 : ws.price });
    } else {
      return c.json(errorResponse("نوع آیتم نامعتبر است."), 400);
    }
  }

  const subtotal = lineItems.reduce((acc, l) => acc + l.price, 0);
  let discountAmount = 0;
  let appliedCoupon: string | undefined;

  if (couponCode && subtotal > 0) {
    const code = couponCode.trim().toUpperCase();
    const couponRows = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
    if (couponRows.length === 0 || !couponRows[0].active) return c.json(errorResponse("کد تخفیف نامعتبر است."), 400);
    const coupon = couponRows[0];
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return c.json(errorResponse("ظرفیت استفاده از این کد تخفیف تمام شده است."), 400);
    if (coupon.expiresAt && coupon.expiresAt < Date.now()) return c.json(errorResponse("این کد تخفیف منقضی شده است."), 400);
    discountAmount = Math.round((subtotal * coupon.percent) / 100);
    appliedCoupon = code;
    await db.update(coupons).set({ usedCount: coupon.usedCount + 1 }).where(eq(coupons.id, coupon.id));
  }

  const total = Math.max(0, subtotal - discountAmount);
  const invoiceNumber = `ZA-${Date.now().toString().slice(-8)}`;

  const [order] = await db.insert(orders).values({
    userId: user!.id,
    items: lineItems,
    subtotal,
    discountAmount,
    total,
    couponCode: appliedCoupon,
    status: "paid",
    invoiceNumber,
  }).returning();

  // Grant access
  for (const item of lineItems) {
    if (item.type === "course") {
      const existing = await db.select().from(enrollments).where(
        and(eq(enrollments.userId, user!.id), eq(enrollments.courseId, item.refId))
      ).limit(1);
      if (existing.length === 0) {
        await db.insert(enrollments).values({
          userId: user!.id,
          courseId: item.refId,
          completedLessons: [],
          enrolledAt: Date.now(),
          lastActiveAt: Date.now(),
        });
      }
    }
    if (item.type === "workshop") {
      const wsRows = await db.select().from(workshops).where(eq(workshops.id, item.refId)).limit(1);
      if (wsRows.length > 0) {
        await db.update(workshops).set({ registeredCount: wsRows[0].registeredCount + 1 }).where(eq(workshops.id, item.refId));
      }
    }
  }

  return c.json(successResponse(order), 201);
});

// GET /api/commerce/orders/my
commerce.get("/orders/my", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(orders).where(eq(orders.userId, user!.id)).orderBy(desc(orders.createdAt));
  return c.json(successResponse(rows));
});

// GET /api/commerce/orders/admin
commerce.get("/orders/admin", requireAnyAdmin, async (c) => {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  return c.json(successResponse(rows));
});

// GET /api/commerce/enrollments/my
commerce.get("/enrollments/my", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(enrollments).where(eq(enrollments.userId, user!.id)).orderBy(desc(enrollments.enrolledAt));

  const enriched = await Promise.all(
    rows.map(async (en) => {
      const courseRows = await db.select().from(courses).where(eq(courses.id, en.courseId)).limit(1);
      if (courseRows.length === 0) return null;
      const course = courseRows[0];
      const catRows = await db.select().from(categories).where(eq(categories.id, course.categoryId)).limit(1);
      const syllabus = (course.syllabus as any[]) || [];
      const totalLessons = syllabus.length;
      const completed = (en.completedLessons as string[]) || [];
      const percent = totalLessons === 0 ? 0 : Math.round((completed.length / totalLessons) * 100);
      return {
        ...en,
        percent,
        course: {
          ...course,
          category: catRows[0] ? { name: catRows[0].name, accent: catRows[0].accent } : null,
        },
      };
    }),
  );

  return c.json(successResponse(enriched.filter(Boolean)));
});

// POST /api/commerce/enrollments/lesson-complete
commerce.post("/enrollments/lesson-complete", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  const { courseId, lessonId, completed } = body;

  const rows = await db.select().from(enrollments).where(
    and(eq(enrollments.userId, user!.id), eq(enrollments.courseId, courseId))
  ).limit(1);
  if (rows.length === 0) return c.json(errorResponse("ابتدا در این دوره ثبت‌نام کنید."), 400);

  const enrollment = rows[0];
  let completedLessons = [...((enrollment.completedLessons as string[]) || [])];
  if (completed && !completedLessons.includes(lessonId)) {
    completedLessons.push(lessonId);
  } else if (!completed) {
    completedLessons = completedLessons.filter((l) => l !== lessonId);
  }

  await db.update(enrollments).set({ completedLessons, lastActiveAt: Date.now() }).where(eq(enrollments.id, enrollment.id));
  return c.json(successResponse({ completedLessons }));
});

// GET /api/commerce/enrollments/downloads
commerce.get("/enrollments/downloads", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(enrollments).where(eq(enrollments.userId, user!.id));
  const out: any[] = [];
  for (const en of rows) {
    const courseRows = await db.select().from(courses).where(eq(courses.id, en.courseId)).limit(1);
    if (courseRows.length > 0 && (courseRows[0].files as any[])?.length > 0) {
      out.push({
        courseId: courseRows[0].id,
        courseTitle: courseRows[0].title,
        courseSlug: courseRows[0].slug,
        files: courseRows[0].files,
      });
    }
  }
  return c.json(successResponse(out));
});

// POST /api/commerce/bookmarks/toggle
commerce.post("/bookmarks/toggle", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  const existing = await db.select().from(bookmarks).where(
    and(eq(bookmarks.userId, user!.id), eq(bookmarks.contentType, body.contentType), eq(bookmarks.contentId, body.contentId))
  ).limit(1);

  if (existing.length > 0) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing[0].id));
    return c.json(successResponse({ bookmarked: false }));
  }

  await db.insert(bookmarks).values({
    userId: user!.id,
    contentType: body.contentType,
    contentId: body.contentId,
  });
  return c.json(successResponse({ bookmarked: true }));
});

// GET /api/commerce/bookmarks/my
commerce.get("/bookmarks/my", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(bookmarks).where(eq(bookmarks.userId, user!.id)).orderBy(desc(bookmarks.createdAt));
  return c.json(successResponse(rows));
});

// GET /api/commerce/bookmarks/check
commerce.get("/bookmarks/check", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const contentType = c.req.query("contentType");
  const contentId = c.req.query("contentId");
  if (!contentType || !contentId) return c.json(successResponse(false));
  const existing = await db.select().from(bookmarks).where(
    and(eq(bookmarks.userId, user!.id), eq(bookmarks.contentType, contentType), eq(bookmarks.contentId, contentId))
  ).limit(1);
  return c.json(successResponse(existing.length > 0));
});

// POST /api/commerce/flashcards
commerce.post("/flashcards", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  if (!body.front?.trim() || !body.back?.trim()) return c.json(errorResponse("متن فلش‌کارت نباید خالی باشد."), 400);
  const [card] = await db.insert(flashcards).values({
    userId: user!.id,
    front: body.front.trim(),
    back: body.back.trim(),
    category: body.category?.trim() || "عمومی",
  }).returning();
  return c.json(successResponse(card), 201);
});

// DELETE /api/commerce/flashcards/:id
commerce.delete("/flashcards/:id", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const id = c.req.param("id");
  const rows = await db.select().from(flashcards).where(eq(flashcards.id, id)).limit(1);
  if (rows.length === 0 || rows[0].userId !== user!.id) return c.json(errorResponse("کارت یافت نشد."), 404);
  await db.delete(flashcards).where(eq(flashcards.id, id));
  return c.json(successResponse({ message: "حذف شد." }));
});

// GET /api/commerce/flashcards/my
commerce.get("/flashcards/my", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(flashcards).where(eq(flashcards.userId, user!.id)).orderBy(desc(flashcards.createdAt));
  return c.json(successResponse(rows));
});

// ── Offline Payments ────────────────────────────────────────────────────────

// POST /api/commerce/offline-payments/submit
commerce.post("/offline-payments/submit", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  if (!body.courseId || !body.tier || !body.amount || !body.trackingNumber) {
    return c.json(errorResponse("ورودی نامعتبر است."), 400);
  }

  // Check duplicate pending
  const existing = await db.select().from(offlinePayments).where(
    and(eq(offlinePayments.userId, user!.id), eq(offlinePayments.courseId, body.courseId), eq(offlinePayments.tier, body.tier), eq(offlinePayments.status, "pending"))
  ).limit(1);
  if (existing.length > 0) return c.json(errorResponse("شما قبلاً پرداخت آفلاین برای این دوره ثبت کرده‌اید."), 409);

  const [payment] = await db.insert(offlinePayments).values({
    userId: user!.id,
    courseId: body.courseId,
    tier: body.tier,
    amount: body.amount,
    trackingNumber: body.trackingNumber,
    receiptStorageId: body.receiptStorageId || "",
    status: "pending",
  }).returning();

  return c.json(successResponse(payment), 201);
});

// GET /api/commerce/offline-payments/my
commerce.get("/offline-payments/my", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(offlinePayments).where(eq(offlinePayments.userId, user!.id)).orderBy(desc(offlinePayments.createdAt));
  return c.json(successResponse(rows));
});

// GET /api/commerce/offline-payments/admin
commerce.get("/offline-payments/admin", requireAnyAdmin, async (c) => {
  const rows = await db.select().from(offlinePayments).orderBy(desc(offlinePayments.createdAt));
  return c.json(successResponse(rows));
});

// POST /api/commerce/offline-payments/admin/:id/approve
commerce.post("/offline-payments/admin/:id/approve", requireAnyAdmin, async (c) => {
  const id = c.req.param("id");
  const rows = await db.select().from(offlinePayments).where(eq(offlinePayments.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("پرداخت یافت نشد."), 404);
  if (rows[0].status !== "pending") return c.json(errorResponse("این پرداخت قبلاً بررسی شده است."), 400);

  await db.update(offlinePayments).set({ status: "approved" }).where(eq(offlinePayments.id, id));

  const existing = await db.select().from(enrollments).where(
    and(eq(enrollments.userId, rows[0].userId), eq(enrollments.courseId, rows[0].courseId))
  ).limit(1);
  if (existing.length === 0) {
    await db.insert(enrollments).values({
      userId: rows[0].userId,
      courseId: rows[0].courseId,
      completedLessons: [],
      enrolledAt: Date.now(),
      lastActiveAt: Date.now(),
    });
  }

  return c.json(successResponse({ message: "تأیید شد." }));
});

// POST /api/commerce/offline-payments/admin/:id/reject
commerce.post("/offline-payments/admin/:id/reject", requireAnyAdmin, async (c) => {
  const id = c.req.param("id");
  const [updated] = await db.update(offlinePayments).set({ status: "rejected" }).where(eq(offlinePayments.id, id)).returning();
  if (!updated) return c.json(errorResponse("پرداخت یافت نشد."), 404);
  return c.json(successResponse({ message: "رد شد." }));
});

// DELETE /api/commerce/offline-payments/admin/:id
commerce.delete("/offline-payments/admin/:id", requireAnyAdmin, async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(offlinePayments).where(eq(offlinePayments.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("پرداخت یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

// ── Class Enroll ────────────────────────────────────────────────────────────

commerce.post("/class-enroll/request", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  if (!body.roomId) return c.json(errorResponse("شناسه کلاس لازم است."), 400);

  const existing = await db.select().from(classEnrollRequests).where(
    and(eq(classEnrollRequests.userId, user!.id), eq(classEnrollRequests.roomId, body.roomId))
  ).limit(1);
  if (existing.length > 0) return c.json(errorResponse("شما قبلاً درخواست داده‌اید."), 409);

  const [request] = await db.insert(classEnrollRequests).values({
    userId: user!.id,
    roomId: body.roomId,
    status: "pending",
  }).returning();

  return c.json(successResponse(request), 201);
});

commerce.get("/class-enroll/pending", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(classEnrollRequests).where(
    and(eq(classEnrollRequests.userId, user!.id), eq(classEnrollRequests.status, "pending"))
  );
  return c.json(successResponse(rows));
});

commerce.post("/class-enroll/admin/:id/approve", requireAnyAdmin, async (c) => {
  const id = c.req.param("id");
  const [updated] = await db.update(classEnrollRequests).set({ status: "approved" }).where(eq(classEnrollRequests.id, id)).returning();
  if (!updated) return c.json(errorResponse("درخواست یافت نشد."), 404);
  return c.json(successResponse({ message: "تأیید شد." }));
});

commerce.post("/class-enroll/admin/:id/reject", requireAnyAdmin, async (c) => {
  const id = c.req.param("id");
  const [updated] = await db.update(classEnrollRequests).set({ status: "rejected" }).where(eq(classEnrollRequests.id, id)).returning();
  if (!updated) return c.json(errorResponse("درخواست یافت نشد."), 404);
  return c.json(successResponse({ message: "رد شد." }));
});

export default commerce;
