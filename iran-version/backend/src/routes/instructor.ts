import { Hono } from "hono";
import { db } from "../db/index.js";
import {
  classRooms, roomMessages, attendance, courseResources, directMessages,
  instructorPayments, users, courses, enrollments, examAttempts, questions, categories,
} from "../db/schema.js";
import { requireAuth, requireInstructorOrAdmin, requireAdmin } from "../middleware/auth.js";
import { eq, and, desc } from "drizzle-orm";

const instructor = new Hono();

// ── Attendance ──────────────────────────────────────────────────────────────

instructor.get("/attendance/rooms", requireInstructorOrAdmin, async (c) => {
  const user = c.get("user");
  const list = await db.query.classRooms.findMany({ where: eq(classRooms.instructorId, user.id) });
  return c.json({ ok: true, data: list });
});

instructor.get("/attendance/rooms/:roomId/students", requireInstructorOrAdmin, async (c) => {
  const messages = await db.query.roomMessages.findMany({ where: eq(roomMessages.roomId, c.req.param("roomId")) });
  const studentIds = [...new Set(messages.map((m) => m.userId))];
  const students = await Promise.all(
    studentIds.map(async (id) => {
      const u = await db.query.users.findFirst({ where: eq(users.id, id) });
      return u ? { id: u.id, name: u.name || "—" } : null;
    })
  );
  return c.json({ ok: true, data: students.filter(Boolean) });
});

instructor.get("/attendance/rooms/:roomId", requireInstructorOrAdmin, async (c) => {
  const list = await db.query.attendance.findMany({ where: eq(attendance.roomId, c.req.param("roomId")) });
  return c.json({ ok: true, data: list });
});

instructor.post("/attendance/rooms/:roomId/mark", requireInstructorOrAdmin, async (c) => {
  const user = c.get("user");
  const roomId = c.req.param("roomId");
  const { studentId, studentName, present, note } = await c.req.json();
  const existing = await db.query.attendance.findFirst({
    where: and(eq(attendance.roomId, roomId), eq(attendance.studentId, studentId)),
  });
  if (existing) {
    await db.update(attendance).set({ present, note, markedAt: Date.now() }).where(eq(attendance.id, existing.id));
  } else {
    await db.insert(attendance).values({
      roomId, instructorId: user.id, studentId, studentName, present, note, markedAt: Date.now(),
    });
  }
  return c.json({ ok: true });
});

// ── Course Resources ────────────────────────────────────────────────────────

instructor.get("/resources/:courseId", requireAuth, async (c) => {
  const list = await db.query.courseResources.findMany({ where: eq(courseResources.courseId, c.req.param("courseId")) });
  return c.json({ ok: true, data: list });
});

instructor.post("/resources", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const [created] = await db.insert(courseResources).values({
    courseId: body.courseId, instructorId: user.id, title: body.title,
    description: body.description, fileUrl: body.fileUrl, fileName: body.fileName,
    fileSize: body.fileSize, fileType: body.fileType, isFree: body.isFree ?? false, createdAt: Date.now(),
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

instructor.delete("/resources/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const resource = await db.query.courseResources.findFirst({ where: eq(courseResources.id, c.req.param("id")) });
  if (!resource) return c.json({ ok: false, error: "فایل یافت نشد." }, 404);
  if (resource.instructorId !== user.id && user.role !== "admin" && user.role !== "site_admin") {
    return c.json({ ok: false, error: "دسترسی ندارید." }, 403);
  }
  await db.delete(courseResources).where(eq(courseResources.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ── Direct Messages ─────────────────────────────────────────────────────────

instructor.post("/messages", requireAuth, async (c) => {
  const user = c.get("user");
  const { receiverId, text } = await c.req.json();
  if (!text?.trim()) return c.json({ ok: false, error: "پیام خالی است." }, 400);
  await db.insert(directMessages).values({
    senderId: user.id, receiverId, text: text.trim(), read: false, createdAt: Date.now(),
  });
  return c.json({ ok: true });
});

instructor.get("/messages/conversations", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const received = await db.query.directMessages.findMany({
    where: eq(directMessages.receiverId, userId), orderBy: [desc(directMessages.createdAt)],
  });
  const sent = await db.query.directMessages.findMany({
    where: eq(directMessages.senderId, userId), orderBy: [desc(directMessages.createdAt)],
  });
  const all = [...received, ...sent].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const conversations = new Map<string, any>();
  for (const msg of all) {
    const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
    if (!conversations.has(partnerId)) {
      const partner = await db.query.users.findFirst({ where: eq(users.id, partnerId) });
      conversations.set(partnerId, {
        partnerId, partnerName: partner?.name || "—",
        lastMessage: msg.text, lastTime: msg.createdAt,
        unread: msg.receiverId === userId && !msg.read ? 1 : 0,
      });
    }
  }
  return c.json({ ok: true, data: [...conversations.values()] });
});

instructor.get("/messages/:partnerId", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const partnerId = c.req.param("partnerId");
  const received = await db.query.directMessages.findMany({
    where: and(eq(directMessages.receiverId, userId), eq(directMessages.senderId, partnerId)),
    orderBy: [directMessages.createdAt],
  });
  const sent = await db.query.directMessages.findMany({
    where: and(eq(directMessages.senderId, userId), eq(directMessages.receiverId, partnerId)),
    orderBy: [directMessages.createdAt],
  });
  return c.json({ ok: true, data: [...received, ...sent].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)) });
});

instructor.post("/messages/:partnerId/read", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const partnerId = c.req.param("partnerId");
  const unread = await db.query.directMessages.findMany({
    where: and(eq(directMessages.receiverId, userId), eq(directMessages.senderId, partnerId), eq(directMessages.read, false)),
  });
  for (const msg of unread) {
    await db.update(directMessages).set({ read: true }).where(eq(directMessages.id, msg.id));
  }
  return c.json({ ok: true });
});

// ── Payments ────────────────────────────────────────────────────────────────

instructor.get("/payments", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const list = await db.query.instructorPayments.findMany({
    where: eq(instructorPayments.instructorId, userId),
    orderBy: [desc(instructorPayments.createdAt)],
  });
  return c.json({ ok: true, data: list });
});

instructor.get("/bank-account", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return c.json({
    ok: true,
    data: {
      bankName: user?.bankName || "",
      bankAccountNumber: user?.bankAccountNumber || "",
      bankCardNumber: user?.bankCardNumber || "",
      bankSheba: user?.bankSheba || "",
    },
  });
});

instructor.put("/bank-account", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const body = await c.req.json();
  await db.update(users).set({
    bankName: body.bankName, bankAccountNumber: body.bankAccountNumber,
    bankCardNumber: body.bankCardNumber, bankSheba: body.bankSheba,
  }).where(eq(users.id, userId));
  return c.json({ ok: true });
});

// ── Performance ─────────────────────────────────────────────────────────────

instructor.get("/performance", requireInstructorOrAdmin, async (c) => {
  const user = c.get("user");
  const myRooms = (await db.query.classRooms.findMany()).filter((r) => r.instructorId === user.id);
  const studentMap = new Map<string, { name: string; questions: number; messages: number; attendance: number }>();
  for (const room of myRooms) {
    const messages = await db.query.roomMessages.findMany({ where: eq(roomMessages.roomId, room.id) });
    for (const m of messages) {
      if (m.userId === user.id) continue;
      const existing = studentMap.get(m.userId) ?? { name: "", questions: 0, messages: 0, attendance: 0 };
      if (m.type === "question") existing.questions++; else existing.messages++;
      studentMap.set(m.userId, existing);
    }
  }
  const results = [];
  for (const [id, stats] of studentMap) {
    const u = await db.query.users.findFirst({ where: eq(users.id, id) });
    results.push({ studentId: id, ...stats, name: u?.name || stats.name, totalRooms: myRooms.length });
  }
  return c.json({ ok: true, data: results });
});

export default instructor;
