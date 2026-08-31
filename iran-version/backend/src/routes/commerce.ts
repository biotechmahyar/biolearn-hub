import { Hono } from "hono";
import { successResponse } from "../lib/errors.js";
import { validateBody, z } from "../lib/validate.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import * as commerceService from "../services/commerce.service.js";

const commerce = new Hono();

// ─── Coupons ─────────────────────────────────────────────────────────────────

commerce.get("/coupons/check", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.json({ ok: false, error: "Missing code" }, 400);
  const data = await commerceService.checkCoupon(code);
  return c.json(successResponse(data));
});

// ─── Purchase ────────────────────────────────────────────────────────────────

commerce.post("/purchase", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      items: z.array(
        z.object({
          type: z.enum(["course", "product", "workshop"]),
          refId: z.string(),
        })
      ),
      couponCode: z.string().optional(),
    })
  );
  const user = c.get("user");
  const data = await commerceService.purchase(
    user.userId,
    body.items,
    body.couponCode
  );
  return c.json(successResponse(data), 201);
});

// ─── Orders ──────────────────────────────────────────────────────────────────

commerce.get("/orders/my", authenticate, async (c) => {
  const user = c.get("user");
  const data = await commerceService.getMyOrders(user.userId);
  return c.json(successResponse(data));
});

commerce.get("/orders/admin", authenticate, requireAdmin, async (c) => {
  const data = await commerceService.getAllOrders();
  return c.json(successResponse(data));
});

// ─── Enrollments ─────────────────────────────────────────────────────────────

commerce.get("/enrollments/my", authenticate, async (c) => {
  const user = c.get("user");
  const data = await commerceService.getMyEnrollments(user.userId);
  return c.json(successResponse(data));
});

commerce.post("/enrollments/lesson-complete", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      enrollmentId: z.string(),
      lessonId: z.string(),
    })
  );
  const user = c.get("user");
  const data = await commerceService.markLessonComplete(
    user.userId,
    body.enrollmentId,
    body.lessonId
  );
  return c.json(successResponse(data));
});

commerce.get("/enrollments/downloads", authenticate, async (c) => {
  const user = c.get("user");
  const data = await commerceService.getMyDownloads(user.userId);
  return c.json(successResponse(data));
});

// ─── Offline Payments ────────────────────────────────────────────────────────

commerce.post("/offline-payments/submit", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      courseId: z.string(),
      tier: z.string(),
      amount: z.number(),
      receiptStorageId: z.string().optional(),
    })
  );
  const user = c.get("user");
  const data = await commerceService.submitOfflinePayment(
    user.userId,
    body.courseId,
    body.tier,
    body.amount,
    body.receiptStorageId
  );
  return c.json(successResponse(data), 201);
});

commerce.get("/offline-payments/my", authenticate, async (c) => {
  const user = c.get("user");
  const data = await commerceService.getMyOfflinePayments(user.userId);
  return c.json(successResponse(data));
});

// ─── Class Enrollment ────────────────────────────────────────────────────────

commerce.post("/class-enroll/request", authenticate, async (c) => {
  const body = await validateBody(c, z.object({ roomId: z.string() }));
  const user = c.get("user");
  const data = await commerceService.requestClassEnroll(
    user.userId,
    body.roomId
  );
  return c.json(successResponse(data), 201);
});

commerce.get("/class-enroll/pending", authenticate, async (c) => {
  const data = await commerceService.listPendingClassEnrollRequests();
  return c.json(successResponse(data));
});

commerce.post("/class-enroll/:id/approve", authenticate, requireAdmin, async (c) => {
  const data = await commerceService.approveClassEnroll(c.req.param("id")!!);
  return c.json(successResponse(data));
});

commerce.post("/class-enroll/:id/reject", authenticate, requireAdmin, async (c) => {
  const data = await commerceService.rejectClassEnroll(c.req.param("id")!!);
  return c.json(successResponse(data));
});

// ─── Bookmarks ───────────────────────────────────────────────────────────────

commerce.post("/bookmarks/toggle", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({ targetType: z.string(), targetId: z.string() })
  );
  const user = c.get("user");
  const data = await commerceService.toggleBookmark(
    user.userId,
    body.targetType,
    body.targetId
  );
  return c.json(successResponse(data));
});

commerce.get("/bookmarks/my", authenticate, async (c) => {
  const user = c.get("user");
  const data = await commerceService.getMyBookmarks(user.userId);
  return c.json(successResponse(data));
});

commerce.get("/bookmarks/check", authenticate, async (c) => {
  const targetType = c.req.query("targetType") || "";
  const targetId = c.req.query("targetId") || "";
  const user = c.get("user");
  const data = await commerceService.checkBookmark(
    user.userId,
    targetType,
    targetId
  );
  return c.json(successResponse(data));
});

// ─── Flashcards ──────────────────────────────────────────────────────────────

commerce.post("/flashcards", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      courseId: z.string(),
      front: z.string(),
      back: z.string(),
    })
  );
  const user = c.get("user");
  const data = await commerceService.addFlashcard(
    user.userId,
    body.courseId,
    body.front,
    body.back
  );
  return c.json(successResponse(data), 201);
});

commerce.delete("/flashcards/:id", authenticate, async (c) => {
  const user = c.get("user");
  await commerceService.deleteFlashcard(user.userId, c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

commerce.get("/flashcards/my", authenticate, async (c) => {
  const user = c.get("user");
  const data = await commerceService.getMyFlashcards(user.userId);
  return c.json(successResponse(data));
});

export default commerce;
