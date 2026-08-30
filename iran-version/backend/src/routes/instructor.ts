/**
 * Instructor Tools Routes
 * Attendance, Course Resources, Direct Messages, Payments, Performance, Bank Account
 */
import { Hono } from "hono";
import { success, errorResponse } from "../lib/response.js";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
import { users } from "../db/schema.js";
import type { AppEnv } from "../lib/types.js";
import {
  attendanceService,
  resourceService,
  directMessageService,
  paymentService,
  performanceService,
  bankAccountService,
} from "../services/instructor.service.js";

const app = new Hono<AppEnv>();

// ── Middleware: require auth ───────────────────────────────────────────────
app.use("*", async (c, next) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json(errorResponse("برای دسترسی لازم است وارد شوید.", "UNAUTHORIZED"), 401);
  }
  await next();
});

// ── Attendance ────────────────────────────────────────────────────────────

app.get("/attendance/rooms", async (c) => {
  const userId = c.get("userId");
  const rooms = await attendanceService.listMyRooms(userId);
  return c.json(success(rooms));
});

app.get("/attendance/rooms/:roomId/students", async (c) => {
  const roomId = c.req.param("roomId");
  const students = await attendanceService.listRoomStudents(roomId);
  return c.json(success(students));
});

app.get("/attendance/rooms/:roomId", async (c) => {
  const roomId = c.req.param("roomId");
  const records = await attendanceService.getAttendance(roomId);
  return c.json(success(records));
});

app.post("/attendance/rooms/:roomId/mark", async (c) => {
  const userId = c.get("userId");
  const roomId = c.req.param("roomId");
  const body = await c.req.json();
  if (!body.studentId || !body.studentName || typeof body.present !== "boolean") {
    return c.json(errorResponse("داده‌های نامعتبر", "VALIDATION"), 400);
  }
  const record = await attendanceService.markAttendance(userId, {
    roomId,
    studentId: body.studentId,
    studentName: body.studentName,
    present: body.present,
    note: body.note,
  });
  return c.json(success(record));
});

// ── Course Resources ──────────────────────────────────────────────────────

app.get("/resources/:courseId", async (c) => {
  const courseId = c.req.param("courseId");
  const resources = await resourceService.listByCourse(courseId);
  return c.json(success(resources));
});

app.post("/resources", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  if (!body.courseId || !body.title || !body.fileUrl || !body.fileName) {
    return c.json(errorResponse("داده‌های نامعتبر", "VALIDATION"), 400);
  }
  const resource = await resourceService.add(userId, {
    courseId: body.courseId,
    title: body.title,
    description: body.description,
    fileUrl: body.fileUrl,
    fileName: body.fileName,
    fileSize: body.fileSize ?? 0,
    fileType: body.fileType ?? "application/octet-stream",
    isFree: body.isFree ?? false,
  });
  return c.json(success(resource), 201);
});

app.delete("/resources/:resourceId", async (c) => {
  const userId = c.get("userId");
  const resourceId = c.req.param("resourceId");
  const rows = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  const userRole = rows[0]?.role ?? "user";
  const deleted = await resourceService.delete(resourceId, userId, userRole);
  return c.json(success(deleted));
});

// ── Direct Messages ───────────────────────────────────────────────────────

app.post("/messages", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  if (!body.receiverId || !body.text) {
    return c.json(errorResponse("داده‌های نامعتبر", "VALIDATION"), 400);
  }
  const msg = await directMessageService.send(userId, body.receiverId, body.text);
  return c.json(success(msg), 201);
});

app.get("/messages/conversations", async (c) => {
  const userId = c.get("userId");
  const conversations = await directMessageService.listConversations(userId);
  return c.json(success(conversations));
});

app.get("/messages/:partnerId", async (c) => {
  const userId = c.get("userId");
  const partnerId = c.req.param("partnerId");
  const messages = await directMessageService.listConversation(userId, partnerId);
  return c.json(success(messages));
});

app.post("/messages/:partnerId/read", async (c) => {
  const userId = c.get("userId");
  const partnerId = c.req.param("partnerId");
  await directMessageService.markRead(userId, partnerId);
  return c.json(success({ ok: true }));
});

// ── Payments ──────────────────────────────────────────────────────────────

app.get("/payments", async (c) => {
  const userId = c.get("userId");
  const payments = await paymentService.listMyPayments(userId);
  return c.json(success(payments));
});

// ── Performance ───────────────────────────────────────────────────────────

app.get("/performance", async (c) => {
  const userId = c.get("userId");
  const performance = await performanceService.getStudentPerformance(userId);
  return c.json(success(performance));
});

// ── Bank Account ──────────────────────────────────────────────────────────

app.get("/bank-account", async (c) => {
  const userId = c.get("userId");
  const account = await bankAccountService.get(userId);
  return c.json(success(account));
});

app.put("/bank-account", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  if (!body.bankName || !body.bankAccountNumber || !body.bankCardNumber || !body.bankSheba) {
    return c.json(errorResponse("داده‌های نامعتبر", "VALIDATION"), 400);
  }
  await bankAccountService.update(userId, body);
  return c.json(success({ ok: true }));
});

export { app as instructorRoutes };
