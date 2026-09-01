// @ts-nocheck
import { Context } from "hono";
import { db } from "../db.js";
import { supportTickets, supportReplies } from "../schema.js";
import { eq, desc, and } from "drizzle-orm";

// ── LIST MY TICKETS ────────────────────────────────────────────────────────
export async function getMyTickets(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);
  const rows = await db.select().from(supportTickets)
    .where(eq(supportTickets.userId, user.id))
    .orderBy(desc(supportTickets.createdAt));
  return c.json({ ok: true, data: rows });
}

// ── ADMIN: LIST ALL TICKETS ────────────────────────────────────────────────
export async function getAllTickets(c: Context) {
  const user = c.get("user");
  if (!user || !["admin", "site_admin"].includes(user.role)) {
    return c.json({ ok: false, error: "Admin access required" }, 403);
  }
  const status = c.req.query("status");
  let rows;
  if (status) {
    rows = await db.select().from(supportTickets).where(eq(supportTickets.status, status)).orderBy(desc(supportTickets.createdAt));
  } else {
    rows = await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
  }
  return c.json({ ok: true, data: rows });
}

// ── CREATE TICKET ──────────────────────────────────────────────────────────
export async function createTicket(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);
  const body = await c.req.json();
  const id = `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(supportTickets)// @ts-ignore.values({
    id,
    userId: user.id,
    subject: body.subject,
    category: body.category || "general",
    priority: body.priority || "normal",
    status: "open",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return c.json({ ok: true, data: { id } });
}

// ── GET TICKET REPLIES ─────────────────────────────────────────────────────
export async function getTicketReplies(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);
  const ticketId = c.req.param("id");
  // Verify ownership or admin
  const tickets = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
  if (tickets.length === 0) return c.json({ ok: false, error: "Not found" }, 404);
  if (tickets[0].userId !== user.id && !["admin", "site_admin"].includes(user.role)) {
    return c.json({ ok: false, error: "Forbidden" }, 403);
  }
  const rows = await db.select().from(supportReplies)
    .where(eq(supportReplies.ticketId, ticketId))
    .orderBy(supportReplies.createdAt);
  return c.json({ ok: true, data: rows });
}

// ── REPLY TO TICKET ────────────────────────────────────────────────────────
export async function replyToTicket(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);
  const ticketId = c.req.param("id");
  const body = await c.req.json();
  const id = `reply_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(supportReplies)// @ts-ignore.values({
    id,
    ticketId,
    userId: user.id,
    body: body.body,
    createdAt: Date.now(),
  });
  await db.update(supportTickets).set({ updatedAt: Date.now() }).where(eq(supportTickets.id, ticketId));
  return c.json({ ok: true, data: { id } });
}

// ── CLOSE TICKET ───────────────────────────────────────────────────────────
export async function closeTicket(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);
  const ticketId = c.req.param("id");
  const tickets = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
  if (tickets.length === 0) return c.json({ ok: false, error: "Not found" }, 404);
  if (tickets[0].userId !== user.id && !["admin", "site_admin"].includes(user.role)) {
    return c.json({ ok: false, error: "Forbidden" }, 403);
  }
  await db.update(supportTickets).set({ status: "closed", updatedAt: Date.now() }).where(eq(supportTickets.id, ticketId));
  return c.json({ ok: true });
}

// ── DELETE TICKET (admin only) ─────────────────────────────────────────────
export async function deleteTicket(c: Context) {
  const user = c.get("user");
  if (!user || !["admin", "site_admin"].includes(user.role)) {
    return c.json({ ok: false, error: "Admin access required" }, 403);
  }
  const ticketId = c.req.param("id");
  await db.delete(supportReplies).where(eq(supportReplies.ticketId, ticketId));
  await db.delete(supportTickets).where(eq(supportTickets.id, ticketId));
  return c.json({ ok: true });
}
