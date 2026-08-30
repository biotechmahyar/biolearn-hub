/**
 * Commerce routes — orders, coupons, enrollments, offline payments,
 * class enroll, bookmarks, flashcards.
 * Mirrors: enroll.ts, offlinePayments.ts, classEnroll.ts Convex functions.
 */
import { Hono } from "hono";
import { success, errorResponse } from "../lib/response.js";
import {
  orderService,
  couponService,
  enrollmentService,
  offlinePaymentService,
  classEnrollService,
  bookmarkService,
  flashcardService,
} from "../services/commerce.service.js";
import {
  purchaseSchema,
  getCouponInfoSchema,
  createCouponSchema,
  submitOfflinePaymentSchema,
  rejectOfflinePaymentSchema,
  requestClassEnrollSchema,
  toggleBookmarkSchema,
  addFlashcardSchema,
  markLessonCompleteSchema,
} from "../lib/validators.js";
import type { AppEnv } from "../lib/types.js";

const commerceRoutes = new Hono<AppEnv>();

// ── Auth middleware for protected routes ────────────────────────────────────
const requireAuth = async (c: any, next: any) => {
  if (!c.get("userId")) {
    return c.json(errorResponse("Unauthorized", "UNAUTHORIZED"), 401);
  }
  await next();
};

const requireAdmin = async (c: any, next: any) => {
  const userRole = c.get("userRole") ?? "";
  if (!["admin", "site_admin", "content_manager"].includes(userRole)) {
    return c.json(errorResponse("Forbidden", "FORBIDDEN"), 403);
  }
  await next();
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Coupons (public check) ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

commerceRoutes.get("/coupons/check", async (c) => {
  const code = new URL(c.req.url).searchParams.get("code") ?? "";
  const result = await couponService.getInfo(code);
  return c.json(success(result));
});

// ── Admin Coupon Management ────────────────────────────────────────────────

commerceRoutes.get("/coupons/admin", requireAuth, requireAdmin, async (c) => {
  const coupons = await couponService.listAdmin();
  return c.json(success(coupons));
});

commerceRoutes.post("/coupons/admin", requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json();
  const parsed = createCouponSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const coupon = await couponService.create(parsed.data);
  return c.json(success(coupon), 201);
});

commerceRoutes.patch("/coupons/admin/:id/toggle", requireAuth, requireAdmin, async (c) => {
  const { active } = await c.req.json();
  const coupon = await couponService.toggleActive(c.req.param("id"), active);
  if (!coupon) return c.json(errorResponse("Not found"), 404);
  return c.json(success(coupon));
});

commerceRoutes.delete("/coupons/admin/:id", requireAuth, requireAdmin, async (c) => {
  const deleted = await couponService.delete(c.req.param("id"));
  if (!deleted) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ deleted: true }));
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Purchase & Orders ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

commerceRoutes.post("/purchase", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  try {
    const order = await orderService.purchase(userId, parsed.data.items, parsed.data.couponCode);
    return c.json(success(order), 201);
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

commerceRoutes.get("/orders/my", requireAuth, async (c) => {
  const orders = await orderService.getMyOrders(c.get("userId"));
  return c.json(success(orders));
});

commerceRoutes.get("/orders/admin", requireAuth, requireAdmin, async (c) => {
  const orders = await orderService.listAdmin();
  return c.json(success(orders));
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Enrollments ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

commerceRoutes.get("/enrollments/my", requireAuth, async (c) => {
  const enrollments = await enrollmentService.getMyEnrollments(c.get("userId"));
  return c.json(success(enrollments));
});

commerceRoutes.post("/enrollments/lesson-complete", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = markLessonCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  try {
    const result = await enrollmentService.markLessonComplete(
      userId,
      parsed.data.courseId,
      parsed.data.lessonId,
      parsed.data.completed
    );
    return c.json(success(result));
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

commerceRoutes.get("/enrollments/downloads", requireAuth, async (c) => {
  const downloads = await enrollmentService.getMyDownloads(c.get("userId"));
  return c.json(success(downloads));
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Offline Payments ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

commerceRoutes.post("/offline-payments/submit", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = submitOfflinePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  try {
    const payment = await offlinePaymentService.submit(userId, parsed.data);
    return c.json(success(payment), 201);
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

commerceRoutes.get("/offline-payments/my", requireAuth, async (c) => {
  const payments = await offlinePaymentService.getMyPayments(c.get("userId"));
  return c.json(success(payments));
});

commerceRoutes.get("/offline-payments/admin", requireAuth, requireAdmin, async (c) => {
  const payments = await offlinePaymentService.listAdmin();
  return c.json(success(payments));
});

commerceRoutes.post("/offline-payments/admin/:id/approve", requireAuth, requireAdmin, async (c) => {
  try {
    const result = await offlinePaymentService.approve(c.req.param("id"));
    return c.json(success(result));
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

commerceRoutes.post("/offline-payments/admin/:id/reject", requireAuth, requireAdmin, async (c) => {
  const { note } = await c.req.json();
  const payment = await offlinePaymentService.reject(c.req.param("id"), note ?? "");
  if (!payment) return c.json(errorResponse("Not found"), 404);
  return c.json(success(payment));
});

commerceRoutes.delete("/offline-payments/admin/:id", requireAuth, requireAdmin, async (c) => {
  const deleted = await offlinePaymentService.delete(c.req.param("id"));
  if (!deleted) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ deleted: true }));
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Class Enroll Requests ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

commerceRoutes.post("/class-enroll/request", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = requestClassEnrollSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  try {
    const req = await classEnrollService.request(userId, parsed.data.roomId);
    return c.json(success(req), 201);
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

commerceRoutes.get("/class-enroll/pending", requireAuth, async (c) => {
  const userId = c.get("userId");
  const userRole = c.get("userRole") ?? "";
  const requests = await classEnrollService.listPendingForInstructor(userId, userRole);
  return c.json(success(requests));
});

commerceRoutes.post("/class-enroll/admin/:id/approve", requireAuth, async (c) => {
  const userId = c.get("userId");
  const userRole = c.get("userRole") ?? "";
  try {
    const result = await classEnrollService.approve(c.req.param("id"), userId, userRole);
    return c.json(success(result));
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

commerceRoutes.post("/class-enroll/admin/:id/reject", requireAuth, async (c) => {
  const userId = c.get("userId");
  const userRole = c.get("userRole") ?? "";
  try {
    const result = await classEnrollService.reject(c.req.param("id"), userId, userRole);
    return c.json(success(result));
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Bookmarks ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

commerceRoutes.post("/bookmarks/toggle", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = toggleBookmarkSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const result = await bookmarkService.toggle(userId, parsed.data.contentType, parsed.data.contentId);
  return c.json(success(result));
});

commerceRoutes.get("/bookmarks/my", requireAuth, async (c) => {
  const bookmarks = await bookmarkService.getMyBookmarks(c.get("userId"));
  return c.json(success(bookmarks));
});

commerceRoutes.get("/bookmarks/check", requireAuth, async (c) => {
  const params = new URL(c.req.url).searchParams;
  const contentType = params.get("contentType") ?? "";
  const contentId = params.get("contentId") ?? "";
  const result = await bookmarkService.isBookmarked(c.get("userId"), contentType, contentId);
  return c.json(success(result));
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Flashcards ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

commerceRoutes.post("/flashcards", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = addFlashcardSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  try {
    const card = await flashcardService.add(userId, parsed.data.front, parsed.data.back, parsed.data.category);
    return c.json(success(card), 201);
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

commerceRoutes.delete("/flashcards/:id", requireAuth, async (c) => {
  try {
    const result = await flashcardService.remove(c.get("userId"), c.req.param("id"));
    return c.json(success(result));
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

commerceRoutes.get("/flashcards/my", requireAuth, async (c) => {
  const cards = await flashcardService.getMyFlashcards(c.get("userId"));
  return c.json(success(cards));
});

export { commerceRoutes };
