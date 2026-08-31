import { Hono } from "hono";
import { successResponse } from "../lib/errors.js";
import { validateBody, validateQuery, z } from "../lib/validate.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import * as contentService from "../services/content.service.js";
import * as userService from "../services/user.service.js";
import * as commerceService from "../services/commerce.service.js";
import * as examService from "../services/exam.service.js";

const admin = new Hono();

// Apply auth + admin to all routes
admin.use("*", authenticate, requireAdmin);

// ─── Courses ─────────────────────────────────────────────────────────────────

admin.get("/courses", async (c) => {
  const data = await contentService.adminListCourses();
  return c.json(successResponse(data));
});

admin.post("/courses", async (c) => {
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await contentService.createCourse(body);
  return c.json(successResponse(data), 201);
});

admin.put("/courses/:id", async (c) => {
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await contentService.updateCourse(c.req.param("id")!!, body);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

admin.delete("/courses/:id", async (c) => {
  await contentService.deleteCourse(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

admin.patch("/courses/:id/toggle-publish", async (c) => {
  const data = await contentService.toggleCoursePublish(c.req.param("id")!!);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

// ─── Articles ────────────────────────────────────────────────────────────────

admin.get("/articles", async (c) => {
  const data = await contentService.adminListArticles();
  return c.json(successResponse(data));
});

admin.post("/articles", async (c) => {
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await contentService.createArticle(body);
  return c.json(successResponse(data), 201);
});

admin.put("/articles/:id", async (c) => {
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await contentService.updateArticle(c.req.param("id")!!, body);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

admin.delete("/articles/:id", async (c) => {
  await contentService.deleteArticle(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

// ─── Products ────────────────────────────────────────────────────────────────

admin.get("/products", async (c) => {
  const data = await contentService.adminListProducts();
  return c.json(successResponse(data));
});

admin.post("/products", async (c) => {
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await contentService.createProduct(body);
  return c.json(successResponse(data), 201);
});

admin.put("/products/:id", async (c) => {
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await contentService.updateProduct(c.req.param("id")!!, body);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

admin.delete("/products/:id", async (c) => {
  await contentService.deleteProduct(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

// ─── Workshops ───────────────────────────────────────────────────────────────

admin.get("/workshops", async (c) => {
  const data = await contentService.adminListWorkshops();
  return c.json(successResponse(data));
});

admin.post("/workshops", async (c) => {
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await contentService.createWorkshop(body);
  return c.json(successResponse(data), 201);
});

admin.put("/workshops/:id", async (c) => {
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await contentService.updateWorkshop(c.req.param("id")!!, body);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

admin.delete("/workshops/:id", async (c) => {
  await contentService.deleteWorkshop(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

// ─── Instructors ─────────────────────────────────────────────────────────────

admin.get("/instructors", async (c) => {
  const data = await contentService.adminListInstructors();
  return c.json(successResponse(data));
});

admin.post("/instructors", async (c) => {
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await contentService.createInstructor(body);
  return c.json(successResponse(data), 201);
});

admin.put("/instructors/:id", async (c) => {
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await contentService.updateInstructor(c.req.param("id")!!, body);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

admin.delete("/instructors/:id", async (c) => {
  await contentService.deleteInstructor(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

// ─── Categories ──────────────────────────────────────────────────────────────

admin.put("/categories/:id", async (c) => {
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await contentService.updateCategory(c.req.param("id")!!, body);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

admin.delete("/categories/:id", async (c) => {
  await contentService.deleteCategory(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

// ─── Users ───────────────────────────────────────────────────────────────────

admin.get("/users", async (c) => {
  const data = await userService.adminGetUsers();
  return c.json(successResponse(data));
});

admin.put("/users/:id/role", async (c) => {
  const body = await validateBody(
    c,
    z.object({ role: z.string() })
  );
  const data = await userService.adminSetRole(c.req.param("id")!!, body.role);
  return c.json(successResponse(data));
});

admin.put("/users/:id/secondary-role", async (c) => {
  const body = await validateBody(
    c,
    z.object({ role: z.string().nullable() })
  );
  const data = await userService.adminSetSecondaryRole(
    c.req.param("id")!!,
    body.role
  );
  return c.json(successResponse(data));
});

admin.delete("/users/:id", async (c) => {
  await userService.adminDeleteUser(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

// ─── Profile Approval ────────────────────────────────────────────────────────

admin.get("/profiles/pending", async (c) => {
  const data = await userService.listPendingProfiles();
  return c.json(successResponse(data));
});

admin.post("/profiles/:id/approve", async (c) => {
  const data = await userService.approveProfile(c.req.param("id")!!);
  return c.json(successResponse(data));
});

admin.post("/profiles/:id/reject", async (c) => {
  const data = await userService.rejectProfile(c.req.param("id")!!);
  return c.json(successResponse(data));
});

// ─── Orders ──────────────────────────────────────────────────────────────────

admin.get("/orders", async (c) => {
  const data = await commerceService.getAllOrders();
  return c.json(successResponse(data));
});

// ─── Coupons ─────────────────────────────────────────────────────────────────

admin.get("/coupons", async (c) => {
  const data = await commerceService.adminListCoupons();
  return c.json(successResponse(data));
});

admin.post("/coupons", async (c) => {
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await commerceService.createCoupon(body);
  return c.json(successResponse(data), 201);
});

admin.patch("/coupons/:id/toggle", async (c) => {
  const data = await commerceService.toggleCoupon(c.req.param("id")!!);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

admin.delete("/coupons/:id", async (c) => {
  await commerceService.deleteCoupon(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

// ─── Offline Payments ────────────────────────────────────────────────────────

admin.get("/offline-payments", async (c) => {
  const data = await commerceService.getAllOfflinePayments();
  return c.json(successResponse(data));
});

admin.post("/offline-payments/:id/approve", async (c) => {
  const body = await validateBody(
    c,
    z.object({ adminNote: z.string().optional() }).optional()
  );
  const data = await commerceService.approveOfflinePayment(
    c.req.param("id")!!,
    body?.adminNote
  );
  return c.json(successResponse(data));
});

admin.post("/offline-payments/:id/reject", async (c) => {
  const body = await validateBody(
    c,
    z.object({ adminNote: z.string().optional() }).optional()
  );
  const data = await commerceService.rejectOfflinePayment(
    c.req.param("id")!!,
    body?.adminNote
  );
  return c.json(successResponse(data));
});

admin.delete("/offline-payments/:id", async (c) => {
  await commerceService.deleteOfflinePayment(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

// ─── Exams ───────────────────────────────────────────────────────────────────

admin.get("/exams", async (c) => {
  const data = await examService.adminListExams();
  return c.json(successResponse(data));
});

admin.post("/exams", async (c) => {
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await examService.createExam(body);
  return c.json(successResponse(data), 201);
});

admin.patch("/exams/:id/toggle-publish", async (c) => {
  const data = await examService.toggleExamPublish(c.req.param("id")!!);
  return c.json(successResponse(data));
});

admin.delete("/exams/:id", async (c) => {
  await examService.deleteExam(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

admin.get("/exam-reports", async (c) => {
  const data = await examService.listExamReports();
  return c.json(successResponse(data));
});

admin.patch("/exam-reports/:id/resolve", async (c) => {
  const data = await examService.resolveExamReport(c.req.param("id")!!);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

admin.delete("/exam-reports/:id", async (c) => {
  await examService.deleteExamReport(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

export default admin;
