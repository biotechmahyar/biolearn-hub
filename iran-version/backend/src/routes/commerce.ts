import { Hono } from "hono";
import { db } from "../db/index.js";
import {
  orders, coupons, enrollments, offlinePayments, classEnrollRequests,
  courses, workshops, products, users, bookmarks, flashcards, classRooms,
} from "../db/schema.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { eq, and, desc } from "drizzle-orm";

const commerce = new Hono();

// ── Coupons ─────────────────────────────────────────────────────────────────

commerce.get("/coupons/check", async (c) => {
  const code = (c.req.query("code") || "").trim().toUpperCase();
  if (!code) return c.json({ ok: true, data: { valid: false, reason: "کد وارد نشده است." } });
  const coupon = await db.query.coupons.findFirst({ where: eq(coupons.code, code) });
  if (!coupon || !coupon.active) return c.json({ ok: true, data: { valid: false, reason: "کد تخفیف نامعتبر است." } });
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return c.json({ ok: true, data: { valid: false, reason: "ظرفیت استفاده از این کد تخفیف تمام شده است." } });
  }
  if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
    return c.json({ ok: true, data: { valid: false, reason: "این کد تخفیف منقضی شده است." } });
  }
  return c.json({ ok: true, data: { valid: true, percent: coupon.percent } });
});

// ── Purchase ────────────────────────────────────────────────────────────────

commerce.post("/purchase", requireAuth, async (c) => {
  const user = c.get("user");
  const { items, couponCode } = await c.req.json();
  if (!items || items.length === 0) return c.json({ ok: false, error: "سبد خرید خالی است." }, 400);

  const lineItems: { type: string; refId: string; title: string; price: number }[] = [];
  for (const item of items) {
    if (item.type === "course") {
      const course = await db.query.courses.findFirst({ where: eq(courses.id, item.refId) });
      if (!course || !course.published) return c.json({ ok: false, error: "دوره یافت نشد." }, 404);
      lineItems.push({ type: "course", refId: course.id, title: course.title, price: course.discountPrice ?? course.price });
    } else if (item.type === "product") {
      const product = await db.query.products.findFirst({ where: eq(products.id, item.refId) });
      if (!product || !product.published) return c.json({ ok: false, error: "محصول یافت نشد." }, 404);
      lineItems.push({ type: "product", refId: product.id, title: product.title, price: product.price });
    } else if (item.type === "workshop") {
      const workshop = await db.query.workshops.findFirst({ where: eq(workshops.id, item.refId) });
      if (!workshop || !workshop.published) return c.json({ ok: false, error: "کارگاه یافت نشد." }, 404);
      if (workshop.registeredCount >= workshop.capacity) return c.json({ ok: false, error: "ظرفیت کارگاه تکمیل شده است." }, 400);
      lineItems.push({ type: "workshop", refId: workshop.id, title: workshop.title, price: workshop.free ? 0 : workshop.price });
    } else {
      return c.json({ ok: false, error: "نوع آیتم نامعتبر است." }, 400);
    }
  }

  const subtotal = lineItems.reduce((acc, l) => acc + l.price, 0);
  let discountAmount = 0;
  let appliedCouponCode: string | undefined;

  if (couponCode && subtotal > 0) {
    const code = couponCode.trim().toUpperCase();
    const coupon = await db.query.coupons.findFirst({ where: eq(coupons.code, code) });
    if (!coupon || !coupon.active) return c.json({ ok: false, error: "کد تخفیف نامعتبر است." }, 400);
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return c.json({ ok: false, error: "ظرفیت استفاده از این کد تخفیف تمام شده است." }, 400);
    if (coupon.expiresAt && coupon.expiresAt < Date.now()) return c.json({ ok: false, error: "این کد تخفیف منقضی شده است." }, 400);
    discountAmount = Math.round((subtotal * coupon.percent) / 100);
    appliedCouponCode = code;
    await db.update(coupons).set({ usedCount: coupon.usedCount + 1 }).where(eq(coupons.id, coupon.id));
  }

  const total = Math.max(0, subtotal - discountAmount);
  const invoiceNumber = `ZA-${Date.now().toString().slice(-8)}`;

  const [order] = await db.insert(orders).values({
    userId: user.id,
    items: lineItems,
    subtotal,
    discountAmount,
    total,
    couponCode: appliedCouponCode,
    status: "paid",
    invoiceNumber,
    createdAt: Date.now(),
  }).returning();

  // Grant access
  for (const item of lineItems) {
    if (item.type === "course") {
      const existing = await db.query.enrollments.findFirst({
        where: and(eq(enrollments.userId, user.id), eq(enrollments.courseId, item.refId)),
      });
      if (!existing) {
        await db.insert(enrollments).values({
          userId: user.id,
          courseId: item.refId,
          completedLessons: [],
          enrolledAt: Date.now(),
          lastActiveAt: Date.now(),
        });
      }
    }
    if (item.type === "workshop") {
      const ws = await db.query.workshops.findFirst({ where: eq(workshops.id, item.refId) });
      if (ws) {
        await db.update(workshops).set({ registeredCount: ws.registeredCount + 1 }).where(eq(workshops.id, item.refId));
      }
    }
  }

  return c.json({ ok: true, data: order });
});

// ── Orders ──────────────────────────────────────────────────────────────────

commerce.get("/orders/my", requireAuth, async (c) => {
  const user = c.get("user");
  const list = await db.query.orders.findMany({
    where: eq(orders.userId, user.id),
    orderBy: [desc(orders.createdAt)],
  });
  return c.json({ ok: true, data: list });
});

commerce.get("/orders/admin", requireAdmin, async (c) => {
  const list = await db.query.orders.findMany({ orderBy: [desc(orders.createdAt)] });
  const enriched = await Promise.all(
    list.map(async (o) => {
      const u = await db.query.users.findFirst({ where: eq(users.id, o.userId) });
      return { ...o, user: u ? { name: u.name, email: u.email } : null };
    })
  );
  return c.json({ ok: true, data: enriched });
});

// ── Enrollments ─────────────────────────────────────────────────────────────

commerce.get("/enrollments/my", requireAuth, async (c) => {
  const user = c.get("user");
  const list = await db.query.enrollments.findMany({
    where: eq(enrollments.userId, user.id),
    orderBy: [desc(enrollments.enrolledAt)],
  });
  const enriched = await Promise.all(
    list.map(async (en) => {
      const course = await db.query.courses.findFirst({ where: eq(courses.id, en.courseId) });
      if (!course) return null;
      const category = await db.query.categories.findFirst({ where: eq(categories.id, course.categoryId) });
      const totalLessons = (course.syllabus as any[])?.length ?? 0;
      const completed = (en.completedLessons as string[])?.length ?? 0;
      const percent = totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);
      return { ...en, percent, course: { ...course, category: category ? { name: category.name, accent: category.accent } : null } };
    })
  );
  return c.json({ ok: true, data: enriched.filter(Boolean) });
});

commerce.post("/enrollments/lesson-complete", requireAuth, async (c) => {
  const user = c.get("user");
  const { courseId, lessonId, completed } = await c.req.json();
  const enrollment = await db.query.enrollments.findFirst({
    where: and(eq(enrollments.userId, user.id), eq(enrollments.courseId, courseId)),
  });
  if (!enrollment) return c.json({ ok: false, error: "ابتدا در این دوره ثبت‌نام کنید." }, 404);

  let completedLessons = [...((enrollment.completedLessons as string[]) ?? [])];
  if (completed && !completedLessons.includes(lessonId)) {
    completedLessons.push(lessonId);
  } else if (!completed) {
    completedLessons = completedLessons.filter((l) => l !== lessonId);
  }
  await db.update(enrollments).set({ completedLessons, lastActiveAt: Date.now() }).where(eq(enrollments.id, enrollment.id));
  return c.json({ ok: true, data: { completedLessons } });
});

commerce.get("/enrollments/downloads", requireAuth, async (c) => {
  const user = c.get("user");
  const list = await db.query.enrollments.findMany({ where: eq(enrollments.userId, user.id) });
  const out: any[] = [];
  for (const en of list) {
    const course = await db.query.courses.findFirst({ where: eq(courses.id, en.courseId) });
    if (course && (course.files as any[])?.length > 0) {
      out.push({ courseId: course.id, courseTitle: course.title, courseSlug: course.slug, files: course.files });
    }
  }
  return c.json({ ok: true, data: out });
});

// ── Offline Payments ────────────────────────────────────────────────────────

commerce.post("/offline-payments/submit", requireAuth, async (c) => {
  const user = c.get("user");
  const { courseId, tier, amount, trackingNumber, receiptStorageId } = await c.req.json();
  if (!trackingNumber?.trim()) return c.json({ ok: false, error: "شماره رهگیری لازم است." }, 400);
  if (!receiptStorageId) return c.json({ ok: false, error: "تصویر فیش لازم است." }, 400);

  // Check duplicate
  const existing = await db.query.offlinePayments.findMany({ where: eq(offlinePayments.userId, user.id) });
  const dup = existing.find((p) => p.courseId === courseId && p.tier === tier && p.status === "pending");
  if (dup) return c.json({ ok: false, error: "قبلاً درخواست پرداخت آفلاین برای این دوره ثبت کرده‌اید." }, 409);

  const [created] = await db.insert(offlinePayments).values({
    userId: user.id,
    courseId,
    tier,
    amount,
    trackingNumber: trackingNumber.trim(),
    receiptStorageId,
    status: "pending",
    createdAt: Date.now(),
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

commerce.get("/offline-payments/my", requireAuth, async (c) => {
  const user = c.get("user");
  const list = await db.query.offlinePayments.findMany({ where: eq(offlinePayments.userId, user.id) });
  const enriched = await Promise.all(
    list.map(async (p) => {
      const course = await db.query.courses.findFirst({ where: eq(courses.id, p.courseId) });
      return { ...p, courseTitle: course?.title ?? "—" };
    })
  );
  return c.json({ ok: true, data: enriched.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)) });
});

commerce.get("/offline-payments/admin", requireAdmin, async (c) => {
  const list = await db.query.offlinePayments.findMany();
  const enriched = await Promise.all(
    list.map(async (p) => {
      const [userDoc, course] = await Promise.all([
        db.query.users.findFirst({ where: eq(users.id, p.userId) }),
        db.query.courses.findFirst({ where: eq(courses.id, p.courseId) }),
      ]);
      return {
        ...p,
        userName: userDoc?.name ?? userDoc?.firstName ?? "ناشناخته",
        userEmail: userDoc?.email ?? "",
        courseTitle: course?.title ?? "—",
      };
    })
  );
  return c.json({ ok: true, data: enriched.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)) });
});

commerce.post("/offline-payments/admin/:id/approve", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const payment = await db.query.offlinePayments.findFirst({ where: eq(offlinePayments.id, id) });
  if (!payment) return c.json({ ok: false, error: "پرداخت یافت نشد." }, 404);
  if (payment.status !== "pending") return c.json({ ok: false, error: "این پرداخت قبلاً بررسی شده است." }, 400);

  const existingEnrollment = await db.query.enrollments.findFirst({
    where: and(eq(enrollments.userId, payment.userId), eq(enrollments.courseId, payment.courseId)),
  });
  if (!existingEnrollment) {
    await db.insert(enrollments).values({
      userId: payment.userId,
      courseId: payment.courseId,
      completedLessons: [],
      enrolledAt: Date.now(),
    });
  }

  const course = await db.query.courses.findFirst({ where: eq(courses.id, payment.courseId) });
  const invoiceNumber = `OFF-${Date.now().toString(36).toUpperCase()}`;
  await db.insert(orders).values({
    userId: payment.userId,
    items: [{ type: "course", refId: payment.courseId, title: course?.title ?? "", price: payment.amount }],
    subtotal: payment.amount,
    discountAmount: 0,
    total: payment.amount,
    status: "paid",
    invoiceNumber,
    createdAt: Date.now(),
  });

  if (course) {
    await db.update(courses).set({ studentsCount: course.studentsCount + 1 }).where(eq(courses.id, payment.courseId));
  }
  await db.update(offlinePayments).set({ status: "approved" }).where(eq(offlinePayments.id, id));
  return c.json({ ok: true });
});

commerce.post("/offline-payments/admin/:id/reject", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const { note } = await c.req.json();
  await db.update(offlinePayments).set({ status: "rejected", note: note?.trim() || null }).where(eq(offlinePayments.id, id));
  return c.json({ ok: true });
});

commerce.delete("/offline-payments/admin/:id", requireAdmin, async (c) => {
  await db.delete(offlinePayments).where(eq(offlinePayments.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ── Class Enroll ────────────────────────────────────────────────────────────

commerce.post("/class-enroll/request", requireAuth, async (c) => {
  const user = c.get("user");
  const { roomId } = await c.req.json();
  const existing = await db.query.classEnrollRequests.findFirst({
    where: and(eq(classEnrollRequests.userId, user.id), eq(classEnrollRequests.roomId, roomId)),
  });
  if (existing && (existing.status === "pending" || existing.status === "approved")) {
    return c.json({ ok: false, error: "درخواست شما قبلاً ثبت شده است." }, 409);
  }
  const [created] = await db.insert(classEnrollRequests).values({
    userId: user.id,
    roomId,
    status: "pending",
    createdAt: Date.now(),
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

commerce.get("/class-enroll/pending", requireAuth, async (c) => {
  const user = c.get("user");
  const list = await db.query.classEnrollRequests.findMany({
    where: eq(classEnrollRequests.userId, user.id),
  });
  return c.json({ ok: true, data: list });
});

commerce.post("/class-enroll/admin/:id/approve", requireAdmin, async (c) => {
  await db.update(classEnrollRequests).set({ status: "approved" }).where(eq(classEnrollRequests.id, c.req.param("id")));
  return c.json({ ok: true });
});

commerce.post("/class-enroll/admin/:id/reject", requireAdmin, async (c) => {
  await db.update(classEnrollRequests).set({ status: "rejected" }).where(eq(classEnrollRequests.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ── Bookmarks ───────────────────────────────────────────────────────────────

commerce.post("/bookmarks/toggle", requireAuth, async (c) => {
  const user = c.get("user");
  const { contentType, contentId } = await c.req.json();
  const existing = await db.query.bookmarks.findFirst({
    where: and(eq(bookmarks.userId, user.id), eq(bookmarks.contentType, contentType), eq(bookmarks.contentId, contentId)),
  });
  if (existing) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
    return c.json({ ok: true, data: { bookmarked: false } });
  }
  await db.insert(bookmarks).values({ userId: user.id, contentType, contentId, createdAt: Date.now() });
  return c.json({ ok: true, data: { bookmarked: true } });
});

commerce.get("/bookmarks/my", requireAuth, async (c) => {
  const user = c.get("user");
  const list = await db.query.bookmarks.findMany({ where: eq(bookmarks.userId, user.id), orderBy: [desc(bookmarks.createdAt)] });
  return c.json({ ok: true, data: list });
});

commerce.get("/bookmarks/check", requireAuth, async (c) => {
  const user = c.get("user");
  const contentType = c.req.query("contentType") || "";
  const contentId = c.req.query("contentId") || "";
  const existing = await db.query.bookmarks.findFirst({
    where: and(eq(bookmarks.userId, user.id), eq(bookmarks.contentType, contentType), eq(bookmarks.contentId, contentId)),
  });
  return c.json({ ok: true, data: { bookmarked: !!existing } });
});

// ── Flashcards ──────────────────────────────────────────────────────────────

commerce.post("/flashcards", requireAuth, async (c) => {
  const user = c.get("user");
  const { front, back, category } = await c.req.json();
  if (!front?.trim() || !back?.trim()) return c.json({ ok: false, error: "متن فلش‌کارت نباید خالی باشد." }, 400);
  const [created] = await db.insert(flashcards).values({
    userId: user.id,
    front: front.trim(),
    back: back.trim(),
    category: category?.trim() || "عمومی",
    createdAt: Date.now(),
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

commerce.delete("/flashcards/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const card = await db.query.flashcards.findFirst({ where: eq(flashcards.id, c.req.param("id")) });
  if (!card || card.userId !== user.id) return c.json({ ok: false, error: "کارت یافت نشد." }, 404);
  await db.delete(flashcards).where(eq(flashcards.id, c.req.param("id")));
  return c.json({ ok: true });
});

commerce.get("/flashcards/my", requireAuth, async (c) => {
  const user = c.get("user");
  const list = await db.query.flashcards.findMany({ where: eq(flashcards.userId, user.id), orderBy: [desc(flashcards.createdAt)] });
  return c.json({ ok: true, data: list });
});

// ── Coupons Admin ───────────────────────────────────────────────────────────

commerce.get("/coupons/admin", requireAdmin, async (c) => {
  const list = await db.query.coupons.findMany();
  return c.json({ ok: true, data: list });
});

commerce.post("/coupons/admin", requireAdmin, async (c) => {
  const body = await c.req.json();
  const code = (body.code || "").trim().toUpperCase();
  if (!code) return c.json({ ok: false, error: "کد لازم است." }, 400);
  const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, code) });
  if (existing) return c.json({ ok: false, error: "این کد قبلاً ثبت شده است." }, 409);
  if (body.percent <= 0 || body.percent > 100) return c.json({ ok: false, error: "درصد نامعتبر است." }, 400);
  const [created] = await db.insert(coupons).values({
    code, percent: body.percent, active: true, maxUses: body.maxUses || 0, usedCount: 0, expiresAt: body.expiresAt,
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

commerce.patch("/coupons/admin/:id/toggle", requireAdmin, async (c) => {
  const { active } = await c.req.json();
  await db.update(coupons).set({ active }).where(eq(coupons.id, c.req.param("id")));
  return c.json({ ok: true });
});

commerce.delete("/coupons/admin/:id", requireAdmin, async (c) => {
  await db.delete(coupons).where(eq(coupons.id, c.req.param("id")));
  return c.json({ ok: true });
});

export default commerce;
