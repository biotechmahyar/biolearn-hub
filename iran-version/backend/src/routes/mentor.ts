import { Hono } from "hono";
import { db } from "../db/index.js";
import { mentorGroups, groupMembers, groupAnnouncements, mentorQuestions, mentorSessions, users } from "../db/schema.js";
import { requireAuth, requireMentorOrAdmin } from "../middleware/auth.js";
import { eq, and, desc } from "drizzle-orm";

const mentor = new Hono();

// ── Groups ──────────────────────────────────────────────────────────────────

mentor.get("/groups", async (c) => {
  const list = await db.query.mentorGroups.findMany({ orderBy: [desc(mentorGroups.createdAt)] });
  return c.json({ ok: true, data: list });
});

mentor.post("/groups", requireMentorOrAdmin, async (c) => {
  const user = c.get("user");
  const { title, description, meetingDay, meetingTime, capacity } = await c.req.json();
  if (!title?.trim()) return c.json({ ok: false, error: "عنوان گروه لازم است." }, 400);
  const [created] = await db.insert(mentorGroups).values({
    mentorId: user.id, mentorName: user.name || "منتور", title: title.trim(),
    description: description?.trim() || "", meetingDay, meetingTime,
    capacity: capacity || 10, memberCount: 0, createdAt: Date.now(),
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

mentor.delete("/groups/:id", requireMentorOrAdmin, async (c) => {
  const user = c.get("user");
  const group = await db.query.mentorGroups.findFirst({ where: eq(mentorGroups.id, c.req.param("id")) });
  if (!group) return c.json({ ok: false, error: "گروه یافت نشد." }, 404);
  if (group.mentorId !== user.id && user.role !== "admin" && user.role !== "site_admin") {
    return c.json({ ok: false, error: "فقط منتور این گروه می‌تواند آن را حذف کند." }, 403);
  }
  await db.delete(mentorGroups).where(eq(mentorGroups.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ── Group Membership ────────────────────────────────────────────────────────

mentor.post("/groups/:id/join", requireAuth, async (c) => {
  const user = c.get("user");
  const groupId = c.req.param("id");
  const group = await db.query.mentorGroups.findFirst({ where: eq(mentorGroups.id, groupId) });
  if (!group) return c.json({ ok: false, error: "گروه یافت نشد." }, 404);
  if (group.memberCount >= group.capacity) return c.json({ ok: false, error: "ظرفیت گروه تکمیل است." }, 400);
  const existing = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)),
  });
  if (existing) return c.json({ ok: false, error: "شما قبلاً عضو این گروه هستید." }, 409);
  await db.insert(groupMembers).values({ groupId, userId: user.id, userName: user.name || "کاربر", joinedAt: Date.now() });
  await db.update(mentorGroups).set({ memberCount: group.memberCount + 1 }).where(eq(mentorGroups.id, groupId));
  return c.json({ ok: true });
});

mentor.post("/groups/:id/leave", requireAuth, async (c) => {
  const user = c.get("user");
  const groupId = c.req.param("id");
  const membership = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)),
  });
  if (!membership) return c.json({ ok: false, error: "عضویت یافت نشد." }, 404);
  await db.delete(groupMembers).where(eq(groupMembers.id, membership.id));
  const group = await db.query.mentorGroups.findFirst({ where: eq(mentorGroups.id, groupId) });
  if (group && group.memberCount > 0) {
    await db.update(mentorGroups).set({ memberCount: group.memberCount - 1 }).where(eq(mentorGroups.id, groupId));
  }
  return c.json({ ok: true });
});

mentor.get("/groups/:id/members", async (c) => {
  const list = await db.query.groupMembers.findMany({ where: eq(groupMembers.groupId, c.req.param("id")) });
  return c.json({ ok: true, data: list });
});

mentor.get("/groups/:id/is-member", requireAuth, async (c) => {
  const user = c.get("user");
  const existing = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, c.req.param("id")), eq(groupMembers.userId, user.id)),
  });
  return c.json({ ok: true, data: { isMember: !!existing } });
});

// ── Group Announcements ─────────────────────────────────────────────────────

mentor.post("/groups/:id/announcements", requireMentorOrAdmin, async (c) => {
  const user = c.get("user");
  const groupId = c.req.param("id");
  const { title, message } = await c.req.json();
  if (!title?.trim()) return c.json({ ok: false, error: "عنوان لازم است." }, 400);
  const [created] = await db.insert(groupAnnouncements).values({
    groupId, mentorId: user.id, mentorName: user.name || "منتور",
    title: title.trim(), message: message?.trim() || "", createdAt: Date.now(),
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

mentor.get("/groups/:id/announcements", async (c) => {
  const list = await db.query.groupAnnouncements.findMany({
    where: eq(groupAnnouncements.groupId, c.req.param("id")),
    orderBy: [desc(groupAnnouncements.createdAt)],
  });
  return c.json({ ok: true, data: list });
});

// ── Questions ───────────────────────────────────────────────────────────────

mentor.post("/questions", requireAuth, async (c) => {
  const user = c.get("user");
  const { text, topic } = await c.req.json();
  if (!text?.trim() || text.trim().length < 5) return c.json({ ok: false, error: "سؤال را کامل بنویسید." }, 400);
  const [created] = await db.insert(mentorQuestions).values({
    studentId: user.id, studentName: user.name || "دانشجو",
    topic: topic?.trim() || "عمومی", text: text.trim(), status: "open", createdAt: Date.now(),
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

mentor.get("/questions", requireAuth, async (c) => {
  const user = c.get("user");
  if (user.role === "mentor" || user.role === "admin" || user.role === "site_admin") {
    const list = await db.query.mentorQuestions.findMany({ orderBy: [desc(mentorQuestions.createdAt)] });
    return c.json({ ok: true, data: list.slice(0, 200) });
  }
  const list = await db.query.mentorQuestions.findMany({
    where: eq(mentorQuestions.studentId, user.id),
    orderBy: [desc(mentorQuestions.createdAt)],
  });
  return c.json({ ok: true, data: list.slice(0, 100) });
});

mentor.post("/questions/:id/answer", requireMentorOrAdmin, async (c) => {
  const user = c.get("user");
  const { answer } = await c.req.json();
  if (!answer?.trim()) return c.json({ ok: false, error: "پاسخ خالی است." }, 400);
  const q = await db.query.mentorQuestions.findFirst({ where: eq(mentorQuestions.id, c.req.param("id")) });
  if (!q) return c.json({ ok: false, error: "سؤال یافت نشد." }, 404);
  await db.update(mentorQuestions).set({
    answer: answer.trim(), answeredByName: user.name || "منتور", status: "answered", answeredAt: Date.now(),
  }).where(eq(mentorQuestions.id, c.req.param("id")));
  return c.json({ ok: true, data: await db.query.mentorQuestions.findFirst({ where: eq(mentorQuestions.id, c.req.param("id")) }) });
});

// ── Sessions ────────────────────────────────────────────────────────────────

mentor.post("/sessions", requireMentorOrAdmin, async (c) => {
  const user = c.get("user");
  const { studentId, title, date, time, notes } = await c.req.json();
  if (!title?.trim()) return c.json({ ok: false, error: "عنوان جلسه لازم است." }, 400);
  const [created] = await db.insert(mentorSessions).values({
    mentorId: user.id, mentorName: user.name || "منتور", studentId,
    title: title.trim(), date, time, notes: notes?.trim() || "", status: "scheduled", createdAt: Date.now(),
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

mentor.get("/sessions", requireAuth, async (c) => {
  const user = c.get("user");
  if (user.role === "mentor" || user.role === "admin" || user.role === "site_admin") {
    const list = await db.query.mentorSessions.findMany({ orderBy: [desc(mentorSessions.createdAt)] });
    return c.json({ ok: true, data: list.slice(0, 100) });
  }
  const list = await db.query.mentorSessions.findMany({
    where: eq(mentorSessions.studentId, user.id),
    orderBy: [desc(mentorSessions.createdAt)],
  });
  return c.json({ ok: true, data: list.slice(0, 50) });
});

mentor.patch("/sessions/:id/status", requireMentorOrAdmin, async (c) => {
  const { status } = await c.req.json();
  if (!["scheduled", "done", "cancelled"].includes(status)) return c.json({ ok: false, error: "وضعیت نامعتبر است." }, 400);
  await db.update(mentorSessions).set({ status }).where(eq(mentorSessions.id, c.req.param("id")));
  return c.json({ ok: true, data: await db.query.mentorSessions.findFirst({ where: eq(mentorSessions.id, c.req.param("id")) }) });
});

mentor.get("/students", requireMentorOrAdmin, async (c) => {
  const allUsers = await db.query.users.findMany();
  const students = allUsers.filter((u) => u.role === "user" || u.role === "member" || !u.role)
    .map((u) => ({ id: u.id, name: u.name || "کاربر", email: u.email }));
  return c.json({ ok: true, data: students });
});

mentor.get("/stats", requireAuth, async (c) => {
  const user = c.get("user");
  const isM = user.role === "mentor" || user.role === "admin" || user.role === "site_admin";
  const openQuestions = isM ? (await db.query.mentorQuestions.findMany({ where: eq(mentorQuestions.status, "open") })).length : 0;
  const sessions = isM ? (await db.query.mentorSessions.findMany({ where: eq(mentorSessions.mentorId, user.id) })).length : 0;
  const groups = (await db.query.mentorGroups.findMany({ where: eq(mentorGroups.mentorId, user.id) })).length;
  return c.json({ ok: true, data: { openQuestions, sessions, groups } });
});

export default mentor;
