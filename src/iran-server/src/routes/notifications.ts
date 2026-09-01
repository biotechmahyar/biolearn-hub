// @ts-nocheck
import { Context } from "hono";
import { db } from "../db.js";
import { notifications } from "../schema.js";
import { eq, desc, and, sql } from "drizzle-orm";

// ── LIST MY NOTIFICATIONS ──────────────────────────────────────────────────
export async function getMyNotifications(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);
  const rows = await db.select().from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
  return c.json({ ok: true, data: rows });
}

// ── UNREAD COUNT ───────────────────────────────────────────────────────────
export async function getUnreadCount(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);
  const rows = await db.select({ value: sql<number>`count(*)::int` }).from(notifications)
    .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
  return c.json({ ok: true, data: { count: rows[0]?.value ?? 0 } });
}

// ── MARK AS READ ───────────────────────────────────────────────────────────
export async function markNotificationRead(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  await db.update(notifications).set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  return c.json({ ok: true });
}

// ── MARK ALL AS READ ───────────────────────────────────────────────────────
export async function markAllRead(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);
  await db.update(notifications).set({ read: true })
    .where(eq(notifications.userId, user.id));
  return c.json({ ok: true });
}

// ── DELETE NOTIFICATION ─────────────────────────────────────────────────────
export async function deleteNotification(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  await db.delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  return c.json({ ok: true });
}

// ── ADMIN: CREATE NOTIFICATION ─────────────────────────────────────────────
export async function createNotification(c: Context) {
  const user = c.get("user");
  if (!user || !["admin", "site_admin"].includes(user.role)) {
    return c.json({ ok: false, error: "Admin access required" }, 403);
  }
  const body = await c.req.json();
  const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(notifications)// @ts-ignore.values({
    id,
    userId: body.userId,
    title: body.title,
    body: body.body,
    link: body.link,
    type: body.type || "system",
    read: false,
    createdAt: Date.now(),
  });
  return c.json({ ok: true, data: { id } });
}
