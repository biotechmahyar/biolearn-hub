import { db } from "../db/index.js";
import {
  orders, orderItems, enrollments, coupons, products, workshops, courses,
  bookmarks, flashcards, offlinePayments, classEnrollRequests, users,
} from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

const getDoc = async (table: any, id: string) =>
  db.query[table]?.findFirst?.({ where: eq(table.id, id) });

// ── Purchase ──────────────────────────────────────────────────────────────
export async function purchase(
  userId: string,
  items: { type: string; refId: string }[],
  couponCode?: string
) {
  if (items.length === 0) throw new Error("سبد خرید خالی است.");

  const lineItems: { type: string; refId: string; title: string; price: number }[] = [];
  for (const item of items) {
    if (item.type === "course") {
      const course = await db.query.courses.findFirst({ where: eq(courses.id, item.refId) });
      if (!course || !course.published) throw new Error("دوره یافت نشد.");
      lineItems.push({ type: "course", refId: course.id, title: course.title, price: course.discountPrice ?? course.price });
    } else if (item.type === "product") {
      const product = await db.query.products.findFirst({ where: eq(products.id, item.refId) });
      if (!product || !product.published) throw new Error("محصول یافت نشد.");
      lineItems.push({ type: "product", refId: product.id, title: product.title, price: product.price });
    } else if (item.type === "workshop") {
      const workshop = await db.query.workshops.findFirst({ where: eq(workshops.id, item.refId) });
      if (!workshop || !workshop.published) throw new Error("کارگاه یافت نشد.");
      if ((workshop.registeredCount ?? 0) >= (workshop.capacity ?? 0)) throw new Error("ظرفیت کارگاه تکمیل شده است.");
      lineItems.push({ type: "workshop", refId: workshop.id, title: workshop.title, price: workshop.free ? 0 : workshop.price });
    } else {
      throw new Error("نوع آیتم نامعتبر است.");
    }
  }

  let subtotal = lineItems.reduce((acc, l) => acc + l.price, 0);
  let discountAmount = 0;
  let usedCouponCode: string | undefined;

  if (couponCode && subtotal > 0) {
    const code = couponCode.trim().toUpperCase();
    const coupon = await db.query.coupons.findFirst({ where: eq(coupons.code, code) });
    if (!coupon || !coupon.active) throw new Error("کد تخفیف نامعتبر است.");
    if ((coupon.maxUses ?? 0) > 0 && (coupon.usedCount ?? 0) >= coupon.maxUses!) throw new Error("ظرفیت استفاده از این کد تخفیف تمام شده است.");
    if (coupon.expiresAt && coupon.expiresAt < Date.now()) throw new Error("این کد تخفیف منقضی شده است.");
    discountAmount = Math.round((subtotal * coupon.percent) / 100);
    usedCouponCode = code;
    await db.update(coupons).set({ usedCount: (coupon.usedCount ?? 0) + 1 }).where(eq(coupons.id, coupon.id));
  }

  const total = Math.max(0, subtotal - discountAmount);
  const invoiceNumber = `ZA-${Date.now().toString().slice(-8)}`;

  const [order] = await db.insert(orders).values({
    userId,
    subtotal,
    discountAmount,
    total,
    couponCode: usedCouponCode,
    status: "paid",
    invoiceNumber,
  }).returning();

  // Insert order items
  for (const li of lineItems) {
    await db.insert(orderItems).values({
      orderId: order!.id,
      type: li.type,
      refId: li.refId,
      title: li.title,
      price: li.price,
    });
  }

  // Grant access: enroll in courses
  for (const li of lineItems) {
    if (li.type === "course") {
      const existing = await db.query.enrollments.findFirst({
        where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, li.refId)),
      });
      if (!existing) {
        const now = Date.now();
        await db.insert(enrollments).values({ userId, courseId: li.refId, completedLessons: [], enrolledAt: now, lastActiveAt: now });
      }
    }
    if (li.type === "workshop") {
      const ws = await db.query.workshops.findFirst({ where: eq(workshops.id, li.refId) });
      if (ws) await db.update(workshops).set({ registeredCount: (ws.registeredCount ?? 0) + 1 }).where(eq(workshops.id, li.refId));
    }
  }

  return order;
}

// ── Coupon check ──────────────────────────────────────────────────────────
export async function checkCoupon(code: string) {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false as const, reason: "کد تخفیف نامعتبر است." };
  const coupon = await db.query.coupons.findFirst({ where: eq(coupons.code, trimmed) });
  if (!coupon || !coupon.active) return { valid: false as const, reason: "کد تخفیف نامعتبر است." };
  if ((coupon.maxUses ?? 0) > 0 && (coupon.usedCount ?? 0) >= coupon.maxUses!)
    return { valid: false as const, reason: "ظرفیت استفاده از این کد تخفیف تمام شده است." };
  if (coupon.expiresAt && coupon.expiresAt < Date.now())
    return { valid: false as const, reason: "این کد تخفیف منقضی شده است." };
  return { valid: true as const, percent: coupon.percent };
}

// ── Orders ────────────────────────────────────────────────────────────────
export async function getMyOrders(userId: string) {
  return db.query.orders.findMany({ where: eq(orders.userId, userId), orderBy: (o, { desc }) => [desc(o.createdAt)] });
}

// ── Enrollments ───────────────────────────────────────────────────────────
export async function getMyEnrollments(userId: string) {
  const ens = await db.query.enrollments.findMany({
    where: eq(enrollments.userId, userId),
    orderBy: (e, { desc }) => [desc(e.enrolledAt)],
  });
  const result = [];
  for (const en of ens) {
    const course = await db.query.courses.findFirst({ where: eq(courses.id, en.courseId) });
    if (!course) continue;
    const cat = await db.query.categories.findFirst({ where: eq((await import("../db/schema.js")).categories.id, course.categoryId) });
    const totalLessons = (course.syllabus as any[])?.length ?? 0;
    const completed = (en.completedLessons as string[])?.length ?? 0;
    const percent = totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);
    result.push({
      ...en,
      percent,
      course: { ...course, category: cat ? { name: cat.name, accent: cat.accent } : null },
    });
  }
  return result;
}

export async function markLessonComplete(userId: string, courseId: string, lessonId: string, completed: boolean) {
  const enrollment = await db.query.enrollments.findFirst({
    where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)),
  });
  if (!enrollment) throw new Error("ابتدا در این دوره ثبت‌نام کنید.");

  let lessons = (enrollment.completedLessons as string[]) ?? [];
  if (completed && !lessons.includes(lessonId)) {
    lessons.push(lessonId);
  } else if (!completed) {
    lessons = lessons.filter((l) => l !== lessonId);
  }
  const [row] = await db.update(enrollments).set({ completedLessons: lessons, lastActiveAt: Date.now() }).where(eq(enrollments.id, enrollment.id)).returning();
  return { completedLessons: lessons };
}

export async function getMyDownloads(userId: string) {
  const ens = await db.query.enrollments.findMany({ where: eq(enrollments.userId, userId) });
  const out: any[] = [];
  for (const en of ens) {
    const course = await db.query.courses.findFirst({ where: eq(courses.id, en.courseId) });
    if (course && (course.files as any[])?.length > 0) {
      out.push({ courseId: course.id, courseTitle: course.title, courseSlug: course.slug, files: course.files });
    }
  }
  return out;
}

// ── Bookmarks ─────────────────────────────────────────────────────────────
export async function toggleBookmark(userId: string, contentType: string, contentId: string) {
  const existing = await db.query.bookmarks.findFirst({
    where: and(eq(bookmarks.userId, userId), eq(bookmarks.contentType, contentType), eq(bookmarks.contentId, contentId)),
  });
  if (existing) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
    return { bookmarked: false };
  }
  await db.insert(bookmarks).values({ userId, contentType, contentId });
  return { bookmarked: true };
}

export async function getMyBookmarks(userId: string) {
  return db.query.bookmarks.findMany({ where: eq(bookmarks.userId, userId), orderBy: (b, { desc }) => [desc(b.createdAt)] });
}

export async function checkBookmark(userId: string, contentType: string, contentId: string) {
  const b = await db.query.bookmarks.findFirst({
    where: and(eq(bookmarks.userId, userId), eq(bookmarks.contentType, contentType), eq(bookmarks.contentId, contentId)),
  });
  return { bookmarked: !!b };
}

// ── Flashcards ────────────────────────────────────────────────────────────
export async function addFlashcard(userId: string, courseId: string, front: string, back: string) {
  const [row] = await db.insert(flashcards).values({ userId, courseId, front, back }).returning();
  return row;
}

export async function deleteFlashcard(userId: string, id: string) {
  await db.delete(flashcards).where(and(eq(flashcards.id, id), eq(flashcards.userId, userId)));
}

export async function getMyFlashcards(userId: string) {
  return db.query.flashcards.findMany({ where: eq(flashcards.userId, userId), orderBy: (f, { desc }) => [desc(f.createdAt)] });
}

// ── Offline Payments ──────────────────────────────────────────────────────
export async function submitOfflinePayment(userId: string, data: { courseId?: string; tier?: string; amount: number; receiptStorageId?: string }) {
  // Check duplicate pending
  const existing = await db.query.offlinePayments.findFirst({
    where: and(
      eq(offlinePayments.userId, userId),
      eq(offlinePayments.status, "pending"),
      data.courseId ? eq(offlinePayments.courseId, data.courseId) : eq(offlinePayments.courseId, ""),
    ),
  });
  if (existing) throw new Error("قبلاً درخواست پرداخت آفلاین ثبت شده است.");

  const [row] = await db.insert(offlinePayments).values({
    userId,
    courseId: data.courseId,
    tier: data.tier,
    amount: data.amount,
    receiptStorageId: data.receiptStorageId,
  }).returning();
  return row;
}

export async function getMyOfflinePayments(userId: string) {
  return db.query.offlinePayments.findMany({ where: eq(offlinePayments.userId, userId), orderBy: (p, { desc }) => [desc(p.createdAt)] });
}

export async function listAllOfflinePayments() {
  return db.query.offlinePayments.findMany({ orderBy: (p, { desc }) => [desc(p.createdAt)] });
}

export async function approveOfflinePayment(id: string, reviewedBy: string) {
  const payment = await db.query.offlinePayments.findFirst({ where: eq(offlinePayments.id, id) });
  if (!payment) throw new Error("پرداخت یافت نشد.");
  const [row] = await db.update(offlinePayments).set({
    status: "approved",
    reviewedBy,
    reviewedAt: new Date(),
  }).where(eq(offlinePayments.id, id)).returning();

  // Auto-enroll if course
  if (payment.courseId) {
    const existing = await db.query.enrollments.findFirst({
      where: and(eq(enrollments.userId, payment.userId), eq(enrollments.courseId, payment.courseId!)),
    });
    if (!existing) {
      const now = Date.now();
      await db.insert(enrollments).values({ userId: payment.userId, courseId: payment.courseId!, completedLessons: [], enrolledAt: now, lastActiveAt: now });
    }
  }
  return row;
}

export async function rejectOfflinePayment(id: string, reviewedBy: string) {
  const [row] = await db.update(offlinePayments).set({ status: "rejected", reviewedBy, reviewedAt: new Date() }).where(eq(offlinePayments.id, id)).returning();
  return row;
}

export async function deleteOfflinePayment(id: string) {
  await db.delete(offlinePayments).where(eq(offlinePayments.id, id));
}

// ── Class Enroll ──────────────────────────────────────────────────────────
export async function requestClassEnroll(userId: string, roomId: string) {
  // Check duplicate pending
  const existing = await db.query.classEnrollRequests.findFirst({
    where: and(
      eq(classEnrollRequests.userId, userId),
      eq(classEnrollRequests.roomId, roomId),
      eq(classEnrollRequests.status, "pending"),
    ),
  });
  if (existing) throw new Error("درخواست قبلی هنوز در انتظار تأیید است.");
  const [row] = await db.insert(classEnrollRequests).values({ userId, roomId }).returning();
  return row;
}

export async function listPendingClassEnrolls() {
  return db.query.classEnrollRequests.findMany({
    where: eq(classEnrollRequests.status, "pending"),
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });
}

export async function approveClassEnroll(id: string) {
  const [row] = await db.update(classEnrollRequests).set({ status: "approved" }).where(eq(classEnrollRequests.id, id)).returning();
  return row;
}

export async function rejectClassEnroll(id: string) {
  const [row] = await db.update(classEnrollRequests).set({ status: "rejected" }).where(eq(classEnrollRequests.id, id)).returning();
  return row;
}
