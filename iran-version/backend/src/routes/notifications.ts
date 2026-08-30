/**
 * Notifications Routes
 * Announcements, Reminders, Inbox Messages
 */
import { Hono } from "hono";
import { success, errorResponse } from "../lib/response.js";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
import { users } from "../db/schema.js";
import type { AppEnv } from "../lib/types.js";
import {
  announcementService,
  reminderService,
  inboxService,
} from "../services/notification.service.js";

const app = new Hono<AppEnv>();

// ── Middleware: require auth ───────────────────────────────────────────────
app.use("*", async (c, next) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json(errorResponse("برای دسترسی لازم است وارد شوید.", "UNAUTHORIZED"), 401);
  }
  await next();
});

// ── Announcements ─────────────────────────────────────────────────────────

app.get("/", async (c) => {
  const userId = c.get("userId");
  const announcements = await announcementService.listVisible(userId);
  return c.json(success(announcements));
});

app.get("/all", async (c) => {
  const announcements = await announcementService.listAll();
  return c.json(success(announcements));
});

app.get("/mine", async (c) => {
  const userId = c.get("userId");
  const announcements = await announcementService.listMy(userId);
  return c.json(success(announcements));
});

app.post("/", async (c) => {
  const userId = c.get("userId");
  const rows = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  const userRole = rows[0]?.role ?? "user";
  const body = await c.req.json();
  if (!body.title || !body.body || !body.targetType) {
    return c.json(errorResponse("داده‌های نامعتبر", "VALIDATION"), 400);
  }
  const announcement = await announcementService.create(userId, userRole, {
    targetType: body.targetType,
    targetId: body.targetId,
    title: body.title,
    body: body.body,
  });
  return c.json(success(announcement), 201);
});

app.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const rows = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  const userRole = rows[0]?.role ?? "user";
  const id = c.req.param("id");
  await announcementService.delete(id, userId, userRole);
  return c.json(success({ ok: true }));
});

// ── Reminders ─────────────────────────────────────────────────────────────

app.get("/reminders", async (c) => {
  const userId = c.get("userId");
  const reminders = await reminderService.refresh(userId);
  return c.json(success(reminders));
});

app.post("/reminders/:id/shown", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const updated = await reminderService.markShown(id, userId);
  return c.json(success(updated));
});

app.post("/reminders/arm-next-exam", async (c) => {
  const userId = c.get("userId");
  const result = await reminderService.armNextExam(userId);
  return c.json(success(result));
});

app.get("/reminders/armed-next-exam", async (c) => {
  const userId = c.get("userId");
  const reminder = await reminderService.getArmedNextExam(userId);
  return c.json(success(reminder));
});

// ── Inbox Messages ────────────────────────────────────────────────────────

app.get("/inbox", async (c) => {
  const userId = c.get("userId");
  const messages = await inboxService.listMy(userId);
  return c.json(success(messages));
});

app.post("/inbox", async (c) => {
  const body = await c.req.json();
  if (!body.userId || !body.title || !body.body) {
    return c.json(errorResponse("داده‌های نامعتبر", "VALIDATION"), 400);
  }
  const msg = await inboxService.send(body.userId, body.title, body.body);
  return c.json(success(msg), 201);
});

app.delete("/inbox/:id", async (c) => {
  const id = c.req.param("id");
  await inboxService.delete(id);
  return c.json(success({ ok: true }));
});

app.post("/inbox/:id/read", async (c) => {
  const userId = c.get("userId");
  const rows = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  const userRole = rows[0]?.role ?? "user";
  const id = c.req.param("id");
  await inboxService.markRead(id, userId, userRole);
  return c.json(success({ ok: true }));
});

app.get("/inbox/all", async (c) => {
  const messages = await inboxService.adminListAll();
  return c.json(success(messages));
});

export { app as notificationRoutes };
