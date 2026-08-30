import { Hono } from "hono";
import { db } from "../db/index.js";
import { announcements, reminders, inboxMessages, users } from "../db/schema.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { eq, and, desc } from "drizzle-orm";

const notifications = new Hono();

// ── Announcements ───────────────────────────────────────────────────────────

notifications.get("/", requireAuth, async (c) => {
  const list = await db.query.announcements.findMany({ orderBy: [desc(announcements.createdAt)] });
  const visible = list.filter((a) => a.targetType === "all");
  return c.json({ ok: true, data: visible });
});

notifications.get("/all", requireAdmin, async (c) => {
  const list = await db.query.announcements.findMany({ orderBy: [desc(announcements.createdAt)] });
  return c.json({ ok: true, data: list });
});

notifications.get("/mine", requireAuth, async (c) => {
  const user = c.get("user");
  const list = await db.query.announcements.findMany({
    where: eq(announcements.authorId, user.id),
    orderBy: [desc(announcements.createdAt)],
  });
  return c.json({ ok: true, data: list });
});

notifications.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const [created] = await db.insert(announcements).values({
    authorId: user.id, authorName: user.name || "", authorRole: user.role || "user",
    targetType: body.targetType || "all", targetId: body.targetId,
    targetTitle: body.targetTitle, title: body.title, body: body.body, createdAt: Date.now(),
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

notifications.delete("/:id", requireAuth, async (c) => {
  await db.delete(announcements).where(eq(announcements.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ── Reminders ───────────────────────────────────────────────────────────────

notifications.get("/reminders", requireAuth, async (c) => {
  const user = c.get("user");
  const list = await db.query.reminders.findMany({ where: eq(reminders.userId, user.id) });
  return c.json({ ok: true, data: list });
});

notifications.post("/reminders/:id/shown", requireAuth, async (c) => {
  const reminder = await db.query.reminders.findFirst({ where: eq(reminders.id, c.req.param("id")) });
  if (reminder) {
    await db.update(reminders).set({ shownCount: reminder.shownCount + 1 }).where(eq(reminders.id, c.req.param("id")));
  }
  return c.json({ ok: true });
});

// ── Inbox ───────────────────────────────────────────────────────────────────

notifications.get("/inbox", requireAuth, async (c) => {
  const user = c.get("user");
  const list = await db.query.inboxMessages.findMany({
    where: eq(inboxMessages.userId, user.id),
    orderBy: [desc(inboxMessages.createdAt)],
  });
  return c.json({ ok: true, data: list });
});

notifications.post("/inbox", requireAdmin, async (c) => {
  const body = await c.req.json();
  const [created] = await db.insert(inboxMessages).values({
    userId: body.userId, title: body.title, body: body.body, createdAt: Date.now(),
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

notifications.delete("/inbox/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const msg = await db.query.inboxMessages.findFirst({ where: eq(inboxMessages.id, c.req.param("id")) });
  if (!msg) return c.json({ ok: false, error: "پیام یافت نشد." }, 404);
  if (msg.userId !== user.id && user.role !== "admin" && user.role !== "site_admin") {
    return c.json({ ok: false, error: "دسترسی ندارید." }, 403);
  }
  await db.delete(inboxMessages).where(eq(inboxMessages.id, c.req.param("id")));
  return c.json({ ok: true });
});

notifications.post("/inbox/:id/read", requireAuth, async (c) => {
  await db.update(inboxMessages).set({ readAt: Date.now() }).where(eq(inboxMessages.id, c.req.param("id")));
  return c.json({ ok: true });
});

notifications.get("/inbox/all", requireAdmin, async (c) => {
  const list = await db.query.inboxMessages.findMany({ orderBy: [desc(inboxMessages.createdAt)] });
  return c.json({ ok: true, data: list });
});

export default notifications;
