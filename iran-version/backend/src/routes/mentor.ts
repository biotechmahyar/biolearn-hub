import { Hono } from "hono";
import { db } from "../db/index.js";
import { mentorGroups, groupMembers, groupAnnouncements, mentorQuestions, mentorSessions } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../middleware/auth.js";
import { requireAnyAdmin, requireMentor } from "../middleware/rbac.js";
import { successResponse, errorResponse } from "../types/index.js";

const mentor = new Hono();

// GET /api/mentor/groups
mentor.get("/groups", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(mentorGroups).orderBy(desc(mentorGroups.createdAt));
  // Admin sees all, mentor sees own, student sees all
  if (user!.role === "mentor" && !["admin", "site_admin"].includes(user!.role!)) {
    return c.json(successResponse(rows.filter((g) => g.mentorId === user!.id)));
  }
  return c.json(successResponse(rows));
});

// POST /api/mentor/groups
mentor.post("/groups", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  if (user!.role !== "mentor" && !["admin", "site_admin"].includes(user!.role!)) {
    return c.json(errorResponse("فقط منتور می‌تواند گروه بسازد."), 403);
  }
  const body = await c.req.json();
  const [group] = await db.insert(mentorGroups).values({
    mentorId: user!.id,
    mentorName: user!.name || "",
    title: body.title || "",
    description: body.description || "",
    meetingDay: body.meetingDay || "",
    meetingTime: body.meetingTime || "",
    capacity: body.capacity || 10,
    memberCount: 0,
  }).returning();
  return c.json(successResponse(group), 201);
});

// GET /api/mentor/groups/:id
mentor.get("/groups/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const rows = await db.select().from(mentorGroups).where(eq(mentorGroups.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("گروه یافت نشد."), 404);
  const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, id));
  const announcements = await db.select().from(groupAnnouncements).where(eq(groupAnnouncements.groupId, id)).orderBy(desc(groupAnnouncements.createdAt));
  return c.json(successResponse({ ...rows[0], members, announcements }));
});

// POST /api/mentor/groups/:id/join
mentor.post("/groups/:id/join", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const id = c.req.param("id");
  const groupRows = await db.select().from(mentorGroups).where(eq(mentorGroups.id, id)).limit(1);
  if (groupRows.length === 0) return c.json(errorResponse("گروه یافت نشد."), 404);
  const group = groupRows[0];

  const existing = await db.select().from(groupMembers).where(
    and(eq(groupMembers.groupId, id), eq(groupMembers.userId, user!.id))
  ).limit(1);
  if (existing.length > 0) return c.json(errorResponse("شما قبلاً عضو این گروه هستید."), 409);

  if (group.memberCount >= group.capacity) return c.json(errorResponse("ظرفیت گروه تکمیل شده است."), 400);

  await db.insert(groupMembers).values({
    groupId: id,
    userId: user!.id,
    userName: user!.name || "",
  });
  await db.update(mentorGroups).set({ memberCount: group.memberCount + 1 }).where(eq(mentorGroups.id, id));
  return c.json(successResponse({ message: "عضو شدید." }));
});

// POST /api/mentor/groups/:id/leave
mentor.post("/groups/:id/leave", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const id = c.req.param("id");
  const existing = await db.select().from(groupMembers).where(
    and(eq(groupMembers.groupId, id), eq(groupMembers.userId, user!.id))
  ).limit(1);
  if (existing.length === 0) return c.json(errorResponse("شما عضو این گروه نیستید."), 400);

  await db.delete(groupMembers).where(eq(groupMembers.id, existing[0].id));
  const groupRows = await db.select().from(mentorGroups).where(eq(mentorGroups.id, id)).limit(1);
  if (groupRows.length > 0) {
    await db.update(mentorGroups).set({ memberCount: Math.max(0, groupRows[0].memberCount - 1) }).where(eq(mentorGroups.id, id));
  }
  return c.json(successResponse({ message: "از گروه خارج شدید." }));
});

// POST /api/mentor/groups/:id/announcements
mentor.post("/groups/:id/announcements", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const id = c.req.param("id");
  if (user!.role !== "mentor" && !["admin", "site_admin"].includes(user!.role!)) {
    return c.json(errorResponse("فقط منتور می‌تواند اطلاعیه بفرستد."), 403);
  }
  const body = await c.req.json();
  const [ann] = await db.insert(groupAnnouncements).values({
    groupId: id,
    mentorId: user!.id,
    mentorName: user!.name || "",
    title: body.title || "",
    message: body.message || "",
  }).returning();
  return c.json(successResponse(ann), 201);
});

// GET /api/mentor/questions
mentor.get("/questions", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  if (user!.role === "mentor" || user!.role === "admin" || user!.role === "site_admin") {
    const rows = await db.select().from(mentorQuestions).orderBy(desc(mentorQuestions.createdAt));
    return c.json(successResponse(rows));
  }
  const rows = await db.select().from(mentorQuestions).where(eq(mentorQuestions.studentId, user!.id)).orderBy(desc(mentorQuestions.createdAt));
  return c.json(successResponse(rows));
});

// POST /api/mentor/questions
mentor.post("/questions", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  const [question] = await db.insert(mentorQuestions).values({
    studentId: user!.id,
    studentName: user!.name || "",
    topic: body.topic || "",
    text: body.text || "",
    status: "open",
  }).returning();
  return c.json(successResponse(question), 201);
});

// POST /api/mentor/questions/:id/answer
mentor.post("/questions/:id/answer", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  if (user!.role !== "mentor" && !["admin", "site_admin"].includes(user!.role!)) {
    return c.json(errorResponse("فقط منتور می‌تواند پاسخ دهد."), 403);
  }
  const id = c.req.param("id");
  const body = await c.req.json();
  const [updated] = await db.update(mentorQuestions).set({
    answer: body.answer,
    answeredByName: user!.name || "",
    answeredAt: Date.now(),
    status: "answered",
  }).where(eq(mentorQuestions.id, id)).returning();
  if (!updated) return c.json(errorResponse("سؤال یافت نشد."), 404);
  return c.json(successResponse(updated));
});

// GET /api/mentor/sessions
mentor.get("/sessions", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  if (user!.role === "mentor" || user!.role === "admin" || user!.role === "site_admin") {
    const rows = await db.select().from(mentorSessions).where(eq(mentorSessions.mentorId, user!.id)).orderBy(desc(mentorSessions.createdAt));
    return c.json(successResponse(rows));
  }
  const rows = await db.select().from(mentorSessions).where(eq(mentorSessions.studentId, user!.id)).orderBy(desc(mentorSessions.createdAt));
  return c.json(successResponse(rows));
});

// POST /api/mentor/sessions
mentor.post("/sessions", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  if (user!.role !== "mentor" && !["admin", "site_admin"].includes(user!.role!)) {
    return c.json(errorResponse("فقط منتور می‌تواند جلسه بسازد."), 403);
  }
  const body = await c.req.json();
  const [session] = await db.insert(mentorSessions).values({
    mentorId: user!.id,
    mentorName: user!.name || "",
    studentId: body.studentId,
    title: body.title || "",
    date: body.date || "",
    time: body.time || "",
    notes: body.notes || "",
    status: "scheduled",
  }).returning();
  return c.json(successResponse(session), 201);
});

// PATCH /api/mentor/sessions/:id
mentor.patch("/sessions/:id", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const [updated] = await db.update(mentorSessions).set(body).where(eq(mentorSessions.id, id)).returning();
  if (!updated) return c.json(errorResponse("جلسه یافت نشد."), 404);
  return c.json(successResponse(updated));
});

// DELETE /api/mentor/groups/:id
mentor.delete("/groups/:id", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const id = c.req.param("id");
  const rows = await db.select().from(mentorGroups).where(eq(mentorGroups.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("گروه یافت نشد."), 404);
  if (rows[0].mentorId !== user!.id && !["admin", "site_admin"].includes(user!.role!)) {
    return c.json(errorResponse("فقط سازنده گروه می‌تواند آن را حذف کند."), 403);
  }
  await db.delete(mentorGroups).where(eq(mentorGroups.id, id));
  return c.json(successResponse({ message: "حذف شد." }));
});

export default mentor;
