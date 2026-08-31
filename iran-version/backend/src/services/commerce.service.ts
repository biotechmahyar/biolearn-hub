import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  orders,
  orderItems,
  coupons,
  enrollments,
  offlinePayments,
  bookmarks,
  flashcards,
  courses,
  products,
  workshops,
  classEnrollRequests,
  type orders as ordersTable,
} from "../db/schema.js";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "../lib/errors.js";

// ─── Coupons ─────────────────────────────────────────────────────────────────

export async function checkCoupon(code: string) {
  const db = getDb();
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.code, code), eq(coupons.active, true)))
    .limit(1);
  if (!coupon) return null;
  if (coupon.expiresAt && coupon.expiresAt < Date.now()) return null;
  if (coupon.maxUses && (coupon.usedCount ?? 0) >= coupon.maxUses) return null;
  return coupon;
}

export async function adminListCoupons() {
  const db = getDb();
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function createCoupon(data: Record<string, unknown>) {
  const db = getDb();
  const now = Date.now();
  const [coupon] = await db
    .insert(coupons)
    .values({ ...data, createdAt: now } as any)
    .returning();
  return coupon;
}

export async function toggleCoupon(id: string) {
  const db = getDb();
  const [coupon] = await db
    .select({ active: coupons.active })
    .from(coupons)
    .where(eq(coupons.id, id))
    .limit(1);
  if (!coupon) throw new NotFoundError("Coupon");
  const [updated] = await db
    .update(coupons)
    .set({ active: !coupon.active })
    .where(eq(coupons.id, id))
    .returning();
  return updated;
}

export async function deleteCoupon(id: string) {
  const db = getDb();
  await db.delete(coupons).where(eq(coupons.id, id));
}

// ─── Purchase ────────────────────────────────────────────────────────────────

export async function purchase(
  userId: string,
  items: Array<{ type: string; refId: string }>,
  couponCode?: string
) {
  if (!items || items.length === 0) throw new BadRequestError("Cart is empty");
  const db = getDb();
  let subtotal = 0;

  // Validate all items exist and published
  for (const item of items) {
    if (item.type === "course") {
      const [course] = await db
        .select({ id: courses.id, price: courses.price, published: courses.published })
        .from(courses)
        .where(eq(courses.id, item.refId))
        .limit(1);
      if (!course || !course.published) throw new NotFoundError(`Course ${item.refId}`);
      subtotal += course.price || 0;
    } else if (item.type === "product") {
      const [product] = await db
        .select({ id: products.id, price: products.price, published: products.published })
        .from(products)
        .where(eq(products.id, item.refId))
        .limit(1);
      if (!product || !product.published) throw new NotFoundError(`Product ${item.refId}`);
      subtotal += product.price || 0;
    } else if (item.type === "workshop") {
      const [ws] = await db
        .select({ id: workshops.id, price: workshops.price, published: workshops.published, capacity: workshops.capacity, registeredCount: workshops.registeredCount })
        .from(workshops)
        .where(eq(workshops.id, item.refId))
        .limit(1);
      if (!ws || !ws.published) throw new NotFoundError(`Workshop ${item.refId}`);
      if (ws.capacity && ws.registeredCount && ws.registeredCount >= ws.capacity) {
        throw new BadRequestError("Workshop is full");
      }
      subtotal += ws.price || 0;
    } else {
      throw new BadRequestError(`Unknown item type: ${item.type}`);
    }
  }

  // Apply coupon
  let discount = 0;
  if (couponCode) {
    const coupon = await checkCoupon(couponCode);
    if (!coupon) throw new BadRequestError("Invalid coupon");
    if (coupon.discountPercent) {
      discount = Math.round((subtotal * coupon.discountPercent) / 100);
    } else if (coupon.discountAmount) {
      discount = coupon.discountAmount;
    }
  }

  const total = Math.max(0, subtotal - discount);
  const now = Date.now();

  // Create order
  const [order] = await db
    .insert(orders)
    .values({
      userId,
      status: "completed",
      subtotal,
      discount,
      total,
      couponCode: couponCode || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Create order items
  for (const item of items) {
    await db.insert(orderItems).values({
      orderId: order.id,
      type: item.type,
      refId: item.refId,
      price: 0, // Individual item prices tracked at order level
    });
  }

  // Increment coupon usage
  if (couponCode) {
    const [coupon] = await db
      .select({ id: coupons.id, usedCount: coupons.usedCount })
      .from(coupons)
      .where(eq(coupons.code, couponCode))
      .limit(1);
    if (coupon) {
      await db
        .update(coupons)
        .set({ usedCount: (coupon.usedCount || 0) + 1 })
        .where(eq(coupons.id, coupon.id));
    }
  }

  // Create enrollments for courses
  for (const item of items) {
    if (item.type === "course") {
      const [existing] = await db
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, userId),
            eq(enrollments.courseId, item.refId)
          )
        )
        .limit(1);
      if (!existing) {
        await db.insert(enrollments).values({
          userId,
          courseId: item.refId,
          enrolledAt: now,
        });
      }
    }
    // Increment workshop registrations
    if (item.type === "workshop") {
      const [ws] = await db
        .select({ registeredCount: workshops.registeredCount })
        .from(workshops)
        .where(eq(workshops.id, item.refId))
        .limit(1);
      if (ws) {
        await db
          .update(workshops)
          .set({ registeredCount: (ws.registeredCount || 0) + 1 })
          .where(eq(workshops.id, item.refId));
      }
    }
  }

  return order;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function getMyOrders(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}

export async function getAllOrders() {
  const db = getDb();
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

// ─── Enrollments ─────────────────────────────────────────────────────────────

export async function getMyEnrollments(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(enrollments)
    .where(eq(enrollments.userId, userId))
    .orderBy(desc(enrollments.enrolledAt));
}

export async function markLessonComplete(
  userId: string,
  enrollmentId: string,
  lessonId: string
) {
  const db = getDb();
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(
      and(eq(enrollments.id, enrollmentId), eq(enrollments.userId, userId))
    )
    .limit(1);
  if (!enrollment) throw new NotFoundError("Enrollment");

  const completed = (enrollment.completedLessons as string[]) || [];
  if (!completed.includes(lessonId)) {
    completed.push(lessonId);
  }
  const [updated] = await db
    .update(enrollments)
    .set({ completedLessons: completed })
    .where(eq(enrollments.id, enrollmentId))
    .returning();
  return updated;
}

export async function getMyDownloads(userId: string) {
  const db = getDb();
  const ens = await db
    .select({ courseId: enrollments.courseId, tier: enrollments.tier })
    .from(enrollments)
    .where(eq(enrollments.userId, userId));
  return ens;
}

// ─── Offline Payments ────────────────────────────────────────────────────────

export async function submitOfflinePayment(
  userId: string,
  courseId: string,
  tier: string,
  amount: number,
  receiptStorageId?: string
) {
  const db = getDb();
  // Duplicate check
  const [existing] = await db
    .select()
    .from(offlinePayments)
    .where(
      and(
        eq(offlinePayments.userId, userId),
        eq(offlinePayments.courseId, courseId),
        eq(offlinePayments.status, "pending")
      )
    )
    .limit(1);
  if (existing) throw new BadRequestError("Pending payment already exists for this course");

  const now = Date.now();
  const [payment] = await db
    .insert(offlinePayments)
    .values({
      userId,
      courseId,
      tier,
      amount,
      receiptStorageId: receiptStorageId || null,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return payment;
}

export async function getMyOfflinePayments(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(offlinePayments)
    .where(eq(offlinePayments.userId, userId))
    .orderBy(desc(offlinePayments.createdAt));
}

export async function getAllOfflinePayments() {
  const db = getDb();
  return db.select().from(offlinePayments).orderBy(desc(offlinePayments.createdAt));
}

export async function approveOfflinePayment(id: string, adminNote?: string) {
  const db = getDb();
  const [payment] = await db
    .select()
    .from(offlinePayments)
    .where(eq(offlinePayments.id, id))
    .limit(1);
  if (!payment) throw new NotFoundError("Payment");
  if (payment.status !== "pending") throw new BadRequestError("Payment is not pending");

  const [updated] = await db
    .update(offlinePayments)
    .set({ status: "approved", adminNote: adminNote || null, updatedAt: Date.now() })
    .where(eq(offlinePayments.id, id))
    .returning();

  // Auto-create enrollment
  if (payment.courseId) {
    const [existing] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(eq(enrollments.userId, payment.userId), eq(enrollments.courseId, payment.courseId))
      )
      .limit(1);
    if (!existing) {
      await db.insert(enrollments).values({
        userId: payment.userId,
        courseId: payment.courseId,
        tier: payment.tier,
        enrolledAt: Date.now(),
      });
    }
  }
  return updated;
}

export async function rejectOfflinePayment(id: string, adminNote?: string) {
  const db = getDb();
  const [updated] = await db
    .update(offlinePayments)
    .set({ status: "rejected", adminNote: adminNote || null, updatedAt: Date.now() })
    .where(eq(offlinePayments.id, id))
    .returning();
  return updated || null;
}

export async function deleteOfflinePayment(id: string) {
  const db = getDb();
  await db.delete(offlinePayments).where(eq(offlinePayments.id, id));
}

// ─── Class Enrollment ────────────────────────────────────────────────────────

export async function requestClassEnroll(userId: string, roomId: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(classEnrollRequests)
    .where(
      and(
        eq(classEnrollRequests.userId, userId),
        eq(classEnrollRequests.roomId, roomId),
        eq(classEnrollRequests.status, "pending")
      )
    )
    .limit(1);
  if (existing) throw new BadRequestError("Request already pending");

  const [approved] = await db
    .select()
    .from(classEnrollRequests)
    .where(
      and(
        eq(classEnrollRequests.userId, userId),
        eq(classEnrollRequests.roomId, roomId),
        eq(classEnrollRequests.status, "approved")
      )
    )
    .limit(1);
  if (approved) throw new BadRequestError("Already approved for this room");

  const now = Date.now();
  const [req] = await db
    .insert(classEnrollRequests)
    .values({ userId, roomId, status: "pending", createdAt: now })
    .returning();
  return req;
}

export async function listPendingClassEnrollRequests() {
  const db = getDb();
  return db
    .select()
    .from(classEnrollRequests)
    .where(eq(classEnrollRequests.status, "pending"))
    .orderBy(desc(classEnrollRequests.createdAt));
}

export async function approveClassEnroll(id: string) {
  const db = getDb();
  const [updated] = await db
    .update(classEnrollRequests)
    .set({ status: "approved" })
    .where(eq(classEnrollRequests.id, id))
    .returning();
  return updated || null;
}

export async function rejectClassEnroll(id: string) {
  const db = getDb();
  const [updated] = await db
    .update(classEnrollRequests)
    .set({ status: "rejected" })
    .where(eq(classEnrollRequests.id, id))
    .returning();
  return updated || null;
}

// ─── Bookmarks ───────────────────────────────────────────────────────────────

export async function toggleBookmark(
  userId: string,
  targetType: string,
  targetId: string
) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, userId),
        eq(bookmarks.targetType, targetType),
        eq(bookmarks.targetId, targetId)
      )
    )
    .limit(1);
  if (existing) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
    return { bookmarked: false };
  }
  const now = Date.now();
  await db.insert(bookmarks).values({ userId, targetType, targetId, createdAt: now });
  return { bookmarked: true };
}

export async function getMyBookmarks(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt));
}

export async function checkBookmark(
  userId: string,
  targetType: string,
  targetId: string
) {
  const db = getDb();
  const [existing] = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, userId),
        eq(bookmarks.targetType, targetType),
        eq(bookmarks.targetId, targetId)
      )
    )
    .limit(1);
  return !!existing;
}

// ─── Flashcards ──────────────────────────────────────────────────────────────

export async function addFlashcard(
  userId: string,
  courseId: string,
  front: string,
  back: string
) {
  const db = getDb();
  const now = Date.now();
  const [card] = await db
    .insert(flashcards)
    .values({ userId, courseId, front, back, createdAt: now })
    .returning();
  return card;
}

export async function deleteFlashcard(userId: string, id: string) {
  const db = getDb();
  const [card] = await db
    .select()
    .from(flashcards)
    .where(and(eq(flashcards.id, id), eq(flashcards.userId, userId)))
    .limit(1);
  if (!card) throw new NotFoundError("Flashcard");
  await db.delete(flashcards).where(eq(flashcards.id, id));
}

export async function getMyFlashcards(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(flashcards)
    .where(eq(flashcards.userId, userId))
    .orderBy(desc(flashcards.createdAt));
}
