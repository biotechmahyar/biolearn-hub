import { Hono } from "hono";
import { db } from "../db/index.js";
import { tickets } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../middleware/auth.js";
import { requireAnyAdmin } from "../middleware/rbac.js";
import { successResponse, errorResponse } from "../types/index.js";

const ticketsRoutes = new Hono();

// POST /api/tickets
ticketsRoutes.post("/", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  if (!body.subject) return c.json(errorResponse("موضوع لازم است."), 400);

  const [ticket] = await db.insert(tickets).values({
    userId: user!.id,
    subject: body.subject,
    status: "open",
    messages: body.initialMessage ? [{ author: "student", text: body.initialMessage, at: Date.now() }] : [],
  }).returning();

  return c.json(successResponse(ticket), 201);
});

// GET /api/tickets/my
ticketsRoutes.get("/my", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(tickets).where(eq(tickets.userId, user!.id)).orderBy(desc(tickets.createdAt));
  return c.json(successResponse(rows));
});

// GET /api/tickets/admin
ticketsRoutes.get("/admin", requireAnyAdmin, async (c) => {
  const rows = await db.select().from(tickets).orderBy(desc(tickets.updatedAt));
  return c.json(successResponse(rows));
});

// GET /api/tickets/:id
ticketsRoutes.get("/:id", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const id = c.req.param("id");
  const rows = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("تیکت یافت نشد."), 404);
  const ticket = rows[0];
  // Only owner or admin can view
  if (ticket.userId !== user!.id && !["admin", "site_admin"].includes(user!.role!)) {
    return c.json(errorResponse("دسترسی غیرمجاز."), 403);
  }
  return c.json(successResponse(ticket));
});

// POST /api/tickets/:id/messages
ticketsRoutes.post("/:id/messages", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  if (!body.text) return c.json(errorResponse("متن پیام لازم است."), 400);

  const rows = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("تیکت یافت نشد."), 404);
  const ticket = rows[0];

  if (ticket.userId !== user!.id && !["admin", "site_admin"].includes(user!.role!)) {
    return c.json(errorResponse("دسترسی غیرمجاز."), 403);
  }

  const author = ["admin", "site_admin"].includes(user!.role!) ? "admin" : "student";
  const messages = [...(ticket.messages as any[]), { author, text: body.text, at: Date.now() }];
  const [updated] = await db.update(tickets).set({
    messages,
    status: author === "admin" ? "answered" : ticket.status,
    updatedAt: Date.now(),
  }).where(eq(tickets.id, id)).returning();

  return c.json(successResponse(updated));
});

// PATCH /api/tickets/:id/close
ticketsRoutes.patch("/:id/close", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const id = c.req.param("id");
  const rows = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("تیکت یافت نشد."), 404);
  if (rows[0].userId !== user!.id && !["admin", "site_admin"].includes(user!.role!)) {
    return c.json(errorResponse("دسترسی غیرمجاز."), 403);
  }
  const [updated] = await db.update(tickets).set({ status: "closed", updatedAt: Date.now() }).where(eq(tickets.id, id)).returning();
  return c.json(successResponse(updated));
});

export default ticketsRoutes;
