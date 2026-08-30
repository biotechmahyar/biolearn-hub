import { Hono } from "hono";
import { db } from "../db/index.js";
import {
  classRooms, attendance, courseResources, directMessages,
  instructorPayments, courses, users,
} from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../middleware/auth.js";
import { requireInstructor } from "../middleware/rbac.js";
import { successResponse, errorResponse } from "../types/index.js";

const instructor = new Hono();

instructor.use("*", requireAuth, requireInstructor);

// ── Attendance ──────────────────────────────────────────────────────────────

instructor.get("/attendance/rooms", async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(classRooms).where(eq(classRooms.instructorId, user!.id)).orderBy(desc(classRooms.createdAt));
  return c.json(successResponse(rows));
});

instructor.get("/attendance/rooms/:roomId/students", async (c) => {
  const user = getCurrentUser(c);
  const roomId = c.req.param("roomId");
  // Verify room belongs to instructor
  const roomRows = await db.select().from(classRooms).where(and(eq(classRooms.id, roomId), eq(classRooms.instructorId, user!.id))).limit(1);
  if (roomRows.length === 0) return c.json(errorResponse("کلاس یافت نشد."), 404);
  const rows = await db.select().from(attendance).where(eq(attendance.roomId, roomId));
  return c.json(successResponse(rows));
});

instructor.get("/attendance/rooms/:roomId", async (c) => {
  const user = getCurrentUser(c);
  const roomId = c.req.param("roomId");
  const roomRows = await db.select().from(classRooms).where(and(eq(classRooms.id, roomId), eq(classRooms.instructorId, user!.id))).limit(1);
  if (roomRows.length === 0) return c.json(errorResponse("کلاس یافت نشد."), 404);
  const rows = await db.select().from(attendance).where(eq(attendance.roomId, roomId));
  return c.json(successResponse(rows));
});

instructor.post("/attendance/rooms/:roomId/mark", async (c) => {
  const user = getCurrentUser(c);
  const roomId = c.req.param("roomId");
  const body = await c.req.json();
  const roomRows = await db.select().from(classRooms).where(and(eq(classRooms.id, roomId), eq(classRooms.instructorId, user!.id))).limit(1);
  if (roomRows.length === 0) return c.json(errorResponse("کلاس یافت نشد."), 404);

  const { studentId, studentName, present, note } = body;
  // Upsert attendance
  const existing = await db.select().from(attendance).where(
    and(eq(attendance.roomId, roomId), eq(attendance.studentId, studentId))
  ).limit(1);

  if (existing.length > 0) {
    const [updated] = await db.update(attendance).set({ present, note, markedAt: Date.now() }).where(eq(attendance.id, existing[0].id)).returning();
    return c.json(successResponse(updated));
  }

  const [record] = await db.insert(attendance).values({
    roomId,
    instructorId: user!.id,
    studentId,
    studentName: studentName || "",
    present,
    note,
    markedAt: Date.now(),
  }).returning();

  return c.json(successResponse(record), 201);
});

// ── Course Resources ────────────────────────────────────────────────────────

instructor.get("/resources/:courseId", async (c) => {
  const user = getCurrentUser(c);
  const courseId = c.req.param("id");
  // Verify course belongs to instructor
  const courseRows = await db.select().from(courses).where(and(eq(courses.id, courseId), eq(courses.authorId, user!.id))).limit(1);
  if (courseRows.length === 0) {
    // Also check if user has a linked instructor profile
    return c.json(errorResponse("دوره یافت نشد."), 404);
  }
  const rows = await db.select().from(courseResources).where(eq(courseResources.courseId, courseId));
  return c.json(successResponse(rows));
});

instructor.post("/resources", async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  const [resource] = await db.insert(courseResources).values({
    courseId: body.courseId,
    instructorId: user!.id,
    title: body.title || "",
    description: body.description,
    fileUrl: body.fileUrl || "",
    fileName: body.fileName || "",
    fileSize: body.fileSize || 0,
    fileType: body.fileType || "",
    isFree: body.isFree || false,
  }).returning();
  return c.json(successResponse(resource), 201);
});

instructor.delete("/resources/:resourceId", async (c) => {
  const user = getCurrentUser(c);
  const resourceId = c.req.param("resourceId");
  const rows = await db.select().from(courseResources).where(eq(courseResources.id, resourceId)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("منبع یافت نشد."), 404);
  if (rows[0].instructorId !== user!.id && !["admin", "site_admin"].includes(user!.role!)) {
    return c.json(errorResponse("دسترسی غیرمجاز."), 403);
  }
  await db.delete(courseResources).where(eq(courseResources.id, resourceId));
  return c.json(successResponse({ message: "حذف شد." }));
});

// ── Direct Messages ─────────────────────────────────────────────────────────

instructor.post("/messages", async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  if (!body.receiverId || !body.text) return c.json(errorResponse("ورودی نامعتبر است."), 400);

  const [message] = await db.insert(directMessages).values({
    senderId: user!.id,
    receiverId: body.receiverId,
    text: body.text,
    read: false,
  }).returning();

  return c.json(successResponse(message), 201);
});

instructor.get("/messages/conversations", async (c) => {
  const user = getCurrentUser(c);
  // Get unique partners
  const sent = await db.select().from(directMessages).where(eq(directMessages.senderId, user!.id));
  const received = await db.select().from(directMessages).where(eq(directMessages.receiverId, user!.id));
  const allMessages = [...sent, ...received].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const partners = new Map<string, { lastMessage: any; unread: number }>();
  for (const msg of allMessages) {
    const partnerId = msg.senderId === user!.id ? msg.receiverId : msg.senderId;
    if (!partners.has(partnerId)) {
      partners.set(partnerId, { lastMessage: msg, unread: 0 });
    }
    if (msg.receiverId === user!.id && !msg.read) {
      partners.get(partnerId)!.unread++;
    }
  }

  const result = [];
  for (const [partnerId, data] of partners) {
    const partnerRows = await db.select().from(users).where(eq(users.id, partnerId)).limit(1);
    result.push({
      partnerId,
      partner: partnerRows[0] ? { name: partnerRows[0].name, email: partnerRows[0].email } : null,
      lastMessage: data.lastMessage,
      unread: data.unread,
    });
  }

  return c.json(successResponse(result));
});

instructor.get("/messages/:partnerId", async (c) => {
  const user = getCurrentUser(c);
  const partnerId = c.req.param("partnerId");

  const sent = await db.select().from(directMessages).where(
    and(eq(directMessages.senderId, user!.id), eq(directMessages.receiverId, partnerId))
  );
  const received = await db.select().from(directMessages).where(
    and(eq(directMessages.senderId, partnerId), eq(directMessages.receiverId, user!.id))
  );

  const messages = [...sent, ...received].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return c.json(successResponse(messages));
});

instructor.post("/messages/:partnerId/read", async (c) => {
  const user = getCurrentUser(c);
  const partnerId = c.req.param("partnerId");

  await db.update(directMessages).set({ read: true }).where(
    and(eq(directMessages.senderId, partnerId), eq(directMessages.receiverId, user!.id), eq(directMessages.read, false))
  );

  return c.json(successResponse({ message: "خوانده شد." }));
});

// ── Payments ────────────────────────────────────────────────────────────────

instructor.get("/payments", async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(instructorPayments).where(eq(instructorPayments.instructorId, user!.id)).orderBy(desc(instructorPayments.createdAt));
  return c.json(successResponse(rows));
});

instructor.get("/performance", async (c) => {
  const user = getCurrentUser(c);
  const courseRows = await db.select().from(courses).where(eq(courses.authorId, user!.id));
  return c.json(successResponse({ courses: courseRows.length }));
});

// ── Bank Account ────────────────────────────────────────────────────────────

instructor.get("/bank-account", async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(users).where(eq(users.id, user!.id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("کاربر یافت نشد."), 404);
  const u = rows[0];
  return c.json(successResponse({
    bankName: u.bankName,
    bankAccountNumber: u.bankAccountNumber,
    bankCardNumber: u.bankCardNumber,
    bankSheba: u.bankSheba,
  }));
});

instructor.put("/bank-account", async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  await db.update(users).set({
    bankName: body.bankName,
    bankAccountNumber: body.bankAccountNumber,
    bankCardNumber: body.bankCardNumber,
    bankSheba: body.bankSheba,
  }).where(eq(users.id, user!.id));
  return c.json(successResponse({ message: "بروزرسانی شد." }));
});

export default instructor;
