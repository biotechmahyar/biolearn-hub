import { Hono } from "hono";
import { db } from "../db/index.js";
import { announcements, reminders, inboxMessages } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../middleware/auth.js";
import { requireAnyAdmin } from "../middleware/rbac.js";
import { successResponse, errorResponse } from "../types/index.js";

const notifications = new Hono();

// ── Announcements ───────────────────────────────────────────────────────────

// GET /api/notifications
notifications.get("/", requireAuth, async (c) => {
  const rows = await db.select().from(announcements)
    .where(eq(announcements.targetType, "all"))
    .orderBy(desc(announcements.createdAt));
  return c.json(successResponse(rows));
});

// GET /api/notifications/all
notifications.get("/all", requireAnyAdmin, async (c) => {
  const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
  return c.json(successResponse(rows));
});

// GET /api/notifications/mine
notifications.get("/mine", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(announcements)
    .where(eq(announcements.authorId, user!.id))
    .orderBy(desc(announcements.createdAt));
  return c.json(successResponse(rows));
});

// POST /api/notifications
notifications.post("/", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  if (!body.title || !body.body) return c.json(errorResponse("موضوع و متن لازم است."), 400);

  const [ann] = await db.insert(announcements).values({
    authorId: user!.id,
    authorName: user!.name || "",
    authorRole: user!.role || "",
    targetType: body.targetType || "all",
    targetId: body.targetId,
    targetTitle: body.targetTitle,
    title: body.title,
    body: body.body,
  }).returning();

  return c.json(successResponse(ann), 201);
});

// DELETE /api/notifications/:id
notifications.delete("/:id", requireAnyAdmin, async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(announcements).where(eq(announcements.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("اطلاعیه یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

// ── Reminders ───────────────────────────────────────────────────────────────

// GET /api/notifications/reminders
notifications.get("/reminders", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(reminders)
    .where(eq(reminders.userId, user!.id))
    .orderBy(desc(reminders.createdAt));
  return c.json(successResponse(rows));
});

// POST /api/notifications/reminders/:id/shown
notifications.post("/reminders/:id/shown", requireAuth, async (c) => {
  const id = c.req.param("id");
  const rows = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("یادآوری یافت نشد."), 404);
  await db.update(reminders).set({ shownCount: rows[0].shownCount + 1 }).where(eq(reminders.id, id));
  return c.json(successResponse({ message: "نشان داده شد." }));
});

// POST /api/notifications/reminders/arm-next-exam
notifications.post("/reminders/arm-next-exam", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  // Create a reminder for next exam
  const [reminder] = await db.insert(reminders).values({
    userId: user!.id,
    kind: "exam_next",
    refId: body.examId || "",
    title: "یادآوری آزمون بعدی",
    body: body.message || "آزمون بعدی شما نزدیک است.",
    link: body.link || "/tests",
    shownCount: 0,
  }).returning();
  return c.json(successResponse(reminder), 201);
});

// GET /api/notifications/reminders/armed-next-exam
notifications.get("/reminders/armed-next-exam", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(reminders).where(
    and(eq(reminders.userId, user!.id), eq(reminders.kind, "exam_next"))
  ).orderBy(desc(reminders.createdAt)).limit(1);
  return c.json(successResponse(rows[0] || null));
});

// ── Inbox Messages ──────────────────────────────────────────────────────────

// GET /api/notifications/inbox
notifications.get("/inbox", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(inboxMessages)
    .where(eq(inboxMessages.userId, user!.id))
    .orderBy(desc(inboxMessages.createdAt));
  return c.json(successResponse(rows));
});

// GET /api/notifications/inbox/all
notifications.get("/inbox/all", requireAnyAdmin, async (c) => {
  const rows = await db.select().from(inboxMessages).orderBy(desc(inboxMessages.createdAt));
  return c.json(successResponse(rows));
});

// POST /api/notifications/inbox
notifications.post("/inbox", requireAnyAdmin, async (c) => {
  const body = await c.req.json();
  if (!body.userId || !body.title || !body.body) return c.json(errorResponse("ورودی نامعتبر است."), 400);

  const [msg] = await db.insert(inboxMessages).values({
    userId: body.userId,
    title: body.title,
    body: body.body,
  }).returning();

  return c.json(successResponse(msg), 201);
});

// DELETE /api/notifications/inbox/:id
notifications.delete("/inbox/:id", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const id = c.req.param("id");
  const rows = await db.select().from(inboxMessages).where(eq(inboxMessages.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("پیام یافت نشد."), 404);
  if (rows[0].userId !== user!.id && !["admin", "site_admin"].includes(user!.role!)) {
    return c.json(errorResponse("دسترسی غیرمجاز."), 403);
  }
  await db.delete(inboxMessages).where(eq(inboxMessages.id, id));
  return c.json(successResponse({ message: "حذف شد." }));
});

// POST /api/notifications/inbox/:id/read
notifications.post("/inbox/:id/read", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const id = c.req.param("id");
  const rows = await db.select().from(inboxMessages).where(eq(inboxMessages.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("پیام یافت نشد."), 404);
  if (rows[0].userId !== user!.id) return c.json(errorResponse("دسترسی غیرمجاز."), 403);
  await db.update(inboxMessages).set({ readAt: Date.now() }).where(eq(inboxMessages.id, id));
  return c.json(successResponse({ message: "خوانده شد." }));
});

export default notifications;
