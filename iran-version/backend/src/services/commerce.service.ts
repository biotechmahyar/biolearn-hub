/**
 * Service layer for Orders, Coupons, Enrollments, Offline Payments,
 * Class Enroll, Bookmarks, Flashcards.
 * Mirrors the exact business logic from enroll.ts, offlinePayments.ts, classEnroll.ts.
 */
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  orders,
  orderItems,
  coupons,
  enrollments,
  offlinePayments,
  classEnrollRequests,
  classRooms,
  courses,
  products,
  workshops,
  bookmarks,
  flashcards,
  users,
  categories,
} from "../db/schema.js";

// ══════════════════════════════════════════════════════════════════════════════
// ── Orders & Purchase ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const orderService = {
  /**
   * Purchase — exact same logic as Convex enroll.ts purchase mutation.
   * - Validates all items exist and are published
   * - Workshop capacity check
   * - Coupon validation (active, not expired, not exceeded)
   * - Calculates subtotal, discount, total
   * - Creates order with status "paid" (MVP simulated)
   * - Enrolls in courses, bumps workshop registration
   */
  async purchase(
    userId: string,
    items: { type: string; refId: string }[],
    couponCode?: string
  ) {
    if (items.length === 0) throw new Error("سبد خرید خالی است.");

    const lineItems: { type: string; refId: string; title: string; price: number }[] = [];

    for (const item of items) {
      if (item.type === "course") {
        const rows = await db.select().from(courses).where(eq(courses.id, item.refId)).limit(1);
        const course = rows[0];
        if (!course || !course.published) throw new Error("دوره یافت نشد.");
        lineItems.push({
          type: "course",
          refId: course.id,
          title: course.title,
          price: course.discountPrice ?? course.price,
        });
      } else if (item.type === "product") {
        const rows = await db.select().from(products).where(eq(products.id, item.refId)).limit(1);
        const product = rows[0];
        if (!product || !product.published) throw new Error("محصول یافت نشد.");
        lineItems.push({
          type: "product",
          refId: product.id,
          title: product.title,
          price: product.price,
        });
      } else if (item.type === "workshop") {
        const rows = await db.select().from(workshops).where(eq(workshops.id, item.refId)).limit(1);
        const workshop = rows[0];
        if (!workshop || !workshop.published) throw new Error("کارگاه یافت نشد.");
        if ((workshop.registeredCount ?? 0) >= workshop.capacity) {
          throw new Error("ظرفیت کارگاه تکمیل شده است.");
        }
        lineItems.push({
          type: "workshop",
          refId: workshop.id,
          title: workshop.title,
          price: workshop.free ? 0 : workshop.price,
        });
      } else {
        throw new Error("نوع آیتم نامعتبر است.");
      }
    }

    const subtotal = lineItems.reduce((acc, l) => acc + l.price, 0);
    let discountAmount = 0;
    let appliedCouponCode: string | undefined;

    if (couponCode && subtotal > 0) {
      const code = couponCode.trim().toUpperCase();
      const couponRows = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
      const coupon = couponRows[0];
      if (!coupon || !coupon.active) throw new Error("کد تخفیف نامعتبر است.");
      if (coupon.maxUses > 0 && (coupon.usedCount ?? 0) >= coupon.maxUses) {
        throw new Error("ظرفیت استفاده از این کد تخفیف تمام شده است.");
      }
      if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
        throw new Error("این کد تخفیف منقضی شده است.");
      }
      discountAmount = Math.round((subtotal * coupon.percent) / 100);
      appliedCouponCode = code;
      await db
        .update(coupons)
        .set({ usedCount: (coupon.usedCount ?? 0) + 1 })
        .where(eq(coupons.id, coupon.id));
    }

    const total = Math.max(0, subtotal - discountAmount);
    const invoiceNumber = `ZA-${Date.now().toString().slice(-8)}`;

    const [order] = await db
      .insert(orders)
      .values({
        userId,
        subtotal,
        discountAmount,
        total,
        couponCode: appliedCouponCode ?? null,
        status: "paid",
        invoiceNumber,
        createdAt: Date.now(),
      })
      .returning();

    // Insert order items into separate junction table
    if (order) {
      for (const item of lineItems) {
        await db.insert(orderItems).values({
          orderId: order.id,
          type: item.type,
          refId: item.refId,
          title: item.title,
          price: item.price,
        });
      }
    }

    // Grant access
    for (const item of lineItems) {
      if (item.type === "course") {
        const existing = await db
          .select()
          .from(enrollments)
          .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, item.refId)))
          .limit(1);
        if (!existing[0]) {
          await db.insert(enrollments).values({
            userId,
            courseId: item.refId,
            completedLessons: [],
            enrolledAt: Date.now(),
            lastActiveAt: Date.now(),
          });
        }
      }
      if (item.type === "workshop") {
        const wRows = await db.select().from(workshops).where(eq(workshops.id, item.refId)).limit(1);
        if (wRows[0]) {
          await db
            .update(workshops)
            .set({ registeredCount: (wRows[0].registeredCount ?? 0) + 1 })
            .where(eq(workshops.id, item.refId));
        }
      }
    }

    return order;
  },

  async getMyOrders(userId: string) {
    return db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  },

  async listAdmin() {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
    return rows;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Coupons ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const couponService = {
  async getInfo(code: string) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return { valid: false, reason: "کد تخفیف نامعتبر است." };
    const rows = await db.select().from(coupons).where(eq(coupons.code, trimmed)).limit(1);
    const coupon = rows[0];
    if (!coupon || !coupon.active) return { valid: false, reason: "کد تخفیف نامعتبر است." };
    if (coupon.maxUses > 0 && (coupon.usedCount ?? 0) >= coupon.maxUses) {
      return { valid: false, reason: "ظرفیت استفاده از این کد تخفیف تمام شده است." };
    }
    if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
      return { valid: false, reason: "این کد تخفیف منقضی شده است." };
    }
    return { valid: true, percent: coupon.percent };
  },

  async listAdmin() {
    return db.select().from(coupons).orderBy(desc(coupons.id));
  },

  async create(data: { code: string; percent: number; maxUses: number; expiresAt?: number }) {
    const [row] = await db
      .insert(coupons)
      .values({
        code: data.code.trim().toUpperCase(),
        percent: data.percent,
        active: true,
        maxUses: data.maxUses,
        usedCount: 0,
        expiresAt: data.expiresAt,
      })
      .returning();
    return row;
  },

  async toggleActive(id: string, active: boolean) {
    const [row] = await db.update(coupons).set({ active }).where(eq(coupons.id, id)).returning();
    return row ?? null;
  },

  async delete(id: string) {
    const [row] = await db.delete(coupons).where(eq(coupons.id, id)).returning();
    return row ?? null;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Enrollments ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const enrollmentService = {
  async getMyEnrollments(userId: string) {
    const rows = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.userId, userId))
      .orderBy(desc(enrollments.enrolledAt));
    const enriched = [];
    for (const en of rows) {
      const courseRows = await db.select().from(courses).where(eq(courses.id, en.courseId)).limit(1);
      const course = courseRows[0];
      if (!course) continue;
      const catRows = await db.select().from(categories).where(eq(categories.id, course.categoryId)).limit(1);
      const category = catRows[0];
      const syllabus = Array.isArray(course.syllabus) ? course.syllabus : [];
      const completed = Array.isArray(en.completedLessons) ? en.completedLessons : [];
      const totalLessons = syllabus.length;
      const percent = totalLessons === 0 ? 0 : Math.round((completed.length / totalLessons) * 100);
      enriched.push({
        ...en,
        percent,
        course: {
          ...course,
          category: category ? { name: category.name, accent: category.accent } : null,
        },
      });
    }
    return enriched;
  },

  async markLessonComplete(userId: string, courseId: string, lessonId: string, completed: boolean) {
    const rows = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
      .limit(1);
    const enrollment = rows[0];
    if (!enrollment) throw new Error("ابتدا در این دوره ثبت‌نام کنید.");

    let completedLessons = Array.isArray(enrollment.completedLessons)
      ? [...enrollment.completedLessons]
      : [];
    if (completed && !completedLessons.includes(lessonId)) {
      completedLessons.push(lessonId);
    } else if (!completed) {
      completedLessons = completedLessons.filter((l) => l !== lessonId);
    }

    await db
      .update(enrollments)
      .set({ completedLessons, lastActiveAt: Date.now() })
      .where(eq(enrollments.id, enrollment.id));

    return { completedLessons };
  },

  async getMyDownloads(userId: string) {
    const rows = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.userId, userId));
    const out: {
      courseId: string;
      courseTitle: string;
      courseSlug: string;
      files: { name: string; size: string; type: string }[];
    }[] = [];
    for (const en of rows) {
      const courseRows = await db.select().from(courses).where(eq(courses.id, en.courseId)).limit(1);
      const course = courseRows[0];
      if (course && Array.isArray(course.files) && course.files.length > 0) {
        out.push({
          courseId: course.id,
          courseTitle: course.title,
          courseSlug: course.slug,
          files: course.files as any,
        });
      }
    }
    return out;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Offline Payments ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const offlinePaymentService = {
  /**
   * Student submits offline payment — exact same logic as Convex.
   * - Validates course exists
   * - Validates tracking number and receipt
   * - Checks for duplicate pending payment for same course+tier
   */
  async submit(
    userId: string,
    data: {
      courseId: string;
      tier: string;
      amount: number;
      trackingNumber: string;
      receiptStorageId: string;
    }
  ) {
    if (!data.trackingNumber.trim()) throw new Error("شماره رهگیری لازم است.");
    if (!data.receiptStorageId) throw new Error("تصویر فیش لازم است.");

    const courseRows = await db.select().from(courses).where(eq(courses.id, data.courseId)).limit(1);
    if (!courseRows[0]) throw new Error("دوره یافت نشد.");

    // Check duplicate
    const existing = await db
      .select()
      .from(offlinePayments)
      .where(eq(offlinePayments.userId, userId));
    const dup = existing.find(
      (p) => p.courseId === data.courseId && p.tier === data.tier && p.status === "pending"
    );
    if (dup) throw new Error("قبلاً درخواست پرداخت آفلاین برای این دوره ثبت کرده‌اید.");

    const [row] = await db
      .insert(offlinePayments)
      .values({
        userId,
        courseId: data.courseId,
        tier: data.tier,
        amount: data.amount,
        trackingNumber: data.trackingNumber.trim(),
        receiptStorageId: data.receiptStorageId,
        status: "pending",
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async listAdmin() {
    const rows = await db.select().from(offlinePayments).orderBy(desc(offlinePayments.createdAt));
    const enriched = [];
    for (const p of rows) {
      const userRows = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, p.userId)).limit(1);
      const courseRows = await db.select().from(courses).where(eq(courses.id, p.courseId)).limit(1);
      enriched.push({
        ...p,
        userName: userRows[0]?.name ?? "ناشناخته",
        userEmail: userRows[0]?.email ?? "",
        courseTitle: courseRows[0]?.title ?? "—",
      });
    }
    return enriched;
  },

  async approve(paymentId: string) {
    const rows = await db.select().from(offlinePayments).where(eq(offlinePayments.id, paymentId)).limit(1);
    const payment = rows[0];
    if (!payment) throw new Error("پرداخت یافت نشد.");
    if (payment.status !== "pending") throw new Error("این پرداخت قبلاً بررسی شده است.");

    // Check enrollment
    const existing = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, payment.userId), eq(enrollments.courseId, payment.courseId)))
      .limit(1);
    if (!existing[0]) {
      await db.insert(enrollments).values({
        userId: payment.userId,
        courseId: payment.courseId,
        completedLessons: [],
        enrolledAt: Date.now(),
      });
    }

    // Create order
    const courseRows = await db.select().from(courses).where(eq(courses.id, payment.courseId)).limit(1);
    const invoiceNumber = `OFF-${Date.now().toString(36).toUpperCase()}`;
    const [createdOrder] = await db.insert(orders).values({
      userId: payment.userId,
      subtotal: payment.amount,
      discountAmount: 0,
      total: payment.amount,
      status: "paid",
      invoiceNumber,
      createdAt: Date.now(),
    }).returning();
    if (createdOrder) {
      await db.insert(orderItems).values({
        orderId: createdOrder.id,
        type: "course",
        refId: payment.courseId,
        title: courseRows[0]?.title ?? "",
        price: payment.amount,
      });
    }

    // Update course student count
    if (courseRows[0]) {
      await db
        .update(courses)
        .set({ studentsCount: (courseRows[0].studentsCount ?? 0) + 1 })
        .where(eq(courses.id, payment.courseId));
    }

    await db.update(offlinePayments).set({ status: "approved" }).where(eq(offlinePayments.id, paymentId));
    return { ok: true };
  },

  async reject(paymentId: string, note: string) {
    const [row] = await db
      .update(offlinePayments)
      .set({ status: "rejected", note: note.trim() || undefined })
      .where(eq(offlinePayments.id, paymentId))
      .returning();
    return row ?? null;
  },

  async delete(paymentId: string) {
    const [row] = await db.delete(offlinePayments).where(eq(offlinePayments.id, paymentId)).returning();
    return row ?? null;
  },

  async getMyPayments(userId: string) {
    const rows = await db
      .select()
      .from(offlinePayments)
      .where(eq(offlinePayments.userId, userId))
      .orderBy(desc(offlinePayments.createdAt));
    const enriched = [];
    for (const p of rows) {
      const courseRows = await db.select().from(courses).where(eq(courses.id, p.courseId)).limit(1);
      enriched.push({ ...p, courseTitle: courseRows[0]?.title ?? "—" });
    }
    return enriched;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Class Enroll Requests ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const classEnrollService = {
  async request(userId: string, roomId: string) {
    const roomRows = await db.select().from(classRooms).where(eq(classRooms.id, roomId)).limit(1);
    if (!roomRows[0]) throw new Error("کلاس یافت نشد.");

    const existing = await db
      .select()
      .from(classEnrollRequests)
      .where(eq(classEnrollRequests.userId, userId));
    const dup = existing.find(
      (r) => r.roomId === roomId && (r.status === "pending" || r.status === "approved")
    );
    if (dup) {
      if (dup.status === "approved") throw new Error("شما قبلاً به این کلاس اضافه شده‌اید.");
      throw new Error("درخواست شما در انتظار تأیید است.");
    }

    const [row] = await db
      .insert(classEnrollRequests)
      .values({ userId, roomId, status: "pending", createdAt: Date.now() })
      .returning();
    return row;
  },

  async listPendingForInstructor(userId: string, userRole: string) {
    const rows = await db
      .select()
      .from(classEnrollRequests)
      .where(eq(classEnrollRequests.status, "pending"));
    const result = [];
    for (const r of rows) {
      const roomRows = await db.select().from(classRooms).where(eq(classRooms.id, r.roomId)).limit(1);
      const room = roomRows[0];
      if (room?.instructorId !== userId && userRole !== "admin" && userRole !== "site_admin") continue;
      const userRows = await db.select().from(users).where(eq(users.id, r.userId)).limit(1);
      result.push({
        ...r,
        roomTitle: room?.title ?? "—",
        studentName: userRows[0]?.name ?? "ناشناخته",
        studentEmail: userRows[0]?.email ?? "",
      });
    }
    return result.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },

  async approve(requestId: string, userId: string, userRole: string) {
    const rows = await db.select().from(classEnrollRequests).where(eq(classEnrollRequests.id, requestId)).limit(1);
    const req = rows[0];
    if (!req) throw new Error("درخواست یافت نشد.");
    if (req.status !== "pending") throw new Error("این درخواست قبلاً بررسی شده است.");

    const roomRows = await db.select().from(classRooms).where(eq(classRooms.id, req.roomId)).limit(1);
    const room = roomRows[0];
    if (!room) throw new Error("کلاس یافت نشد.");
    if (room.instructorId !== userId && userRole !== "admin" && userRole !== "site_admin") {
      throw new Error("فقط استاد کلاس می‌تواند درخواست را تأیید کند.");
    }

    const [row] = await db
      .update(classEnrollRequests)
      .set({ status: "approved" })
      .where(eq(classEnrollRequests.id, requestId))
      .returning();
    return row;
  },

  async reject(requestId: string, userId: string, userRole: string) {
    const rows = await db.select().from(classEnrollRequests).where(eq(classEnrollRequests.id, requestId)).limit(1);
    const req = rows[0];
    if (!req) throw new Error("درخواست یافت نشد.");

    const roomRows = await db.select().from(classRooms).where(eq(classRooms.id, req.roomId)).limit(1);
    const room = roomRows[0];
    if (!room) throw new Error("کلاس یافت نشد.");
    if (room.instructorId !== userId && userRole !== "admin" && userRole !== "site_admin") {
      throw new Error("فقط استاد کلاس می‌تواند درخواست را رد کند.");
    }

    const [row] = await db
      .update(classEnrollRequests)
      .set({ status: "rejected" })
      .where(eq(classEnrollRequests.id, requestId))
      .returning();
    return row;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Bookmarks ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const bookmarkService = {
  async toggle(userId: string, contentType: string, contentId: string) {
    const existing = await db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.contentType, contentType),
          eq(bookmarks.contentId, contentId)
        )
      )
      .limit(1);
    if (existing[0]) {
      await db.delete(bookmarks).where(eq(bookmarks.id, existing[0].id));
      return { bookmarked: false };
    }
    await db.insert(bookmarks).values({
      userId,
      contentType,
      contentId,
      createdAt: Date.now(),
    });
    return { bookmarked: true };
  },

  async getMyBookmarks(userId: string) {
    const rows = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.createdAt)); // createdAt may be nullable
    return rows;
  },

  async isBookmarked(userId: string, contentType: string, contentId: string) {
    const rows = await db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.contentType, contentType),
          eq(bookmarks.contentId, contentId)
        )
      )
      .limit(1);
    return rows.length > 0;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Flashcards ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const flashcardService = {
  async add(userId: string, front: string, back: string, category: string) {
    if (front.trim().length === 0 || back.trim().length === 0) {
      throw new Error("متن فلش‌کارت نباید خالی باشد.");
    }
    const [row] = await db
      .insert(flashcards)
      .values({
        userId,
        front: front.trim(),
        back: back.trim(),
        category: category.trim() || "عمومی",
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async remove(userId: string, id: string) {
    const rows = await db.select().from(flashcards).where(eq(flashcards.id, id)).limit(1);
    const card = rows[0];
    if (!card || card.userId !== userId) throw new Error("کارت یافت نشد.");
    await db.delete(flashcards).where(eq(flashcards.id, id));
    return { ok: true };
  },

  async getMyFlashcards(userId: string) {
    return db
      .select()
      .from(flashcards)
      .where(eq(flashcards.userId, userId))
      .orderBy(desc(flashcards.createdAt));
  },
};
