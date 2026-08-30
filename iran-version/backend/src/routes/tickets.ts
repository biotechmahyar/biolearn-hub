/**
 * Ticket routes — support system.
 * Mirrors: tickets.ts Convex mutations/queries.
 */
import { Hono } from "hono";
import { success, errorResponse } from "../lib/response.js";
import { ticketService } from "../services/ticket.service.js";
import type { AppEnv } from "../lib/types.js";

const ticketRoutes = new Hono<AppEnv>();

const requireAuth = async (c: any, next: any) => {
  if (!c.get("userId")) return c.json(errorResponse("Unauthorized", "UNAUTHORIZED"), 401);
  await next();
};

const requireSupport = async (c: any, next: any) => {
  const userRole = c.get("userRole") ?? "";
  if (!["support", "admin", "site_admin"].includes(userRole)) {
    return c.json(errorResponse("دسترسی پشتیبانی لازم است.", "FORBIDDEN"), 403);
  }
  await next();
};

// ── Student side ──────────────────────────────────────────────────────────

ticketRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  if (!body.subject?.trim() || !body.message?.trim()) {
    return c.json(errorResponse("عنوان و متن پیام را وارد کنید.", "VALIDATION"), 400);
  }
  try {
    const ticket = await ticketService.create(userId, body.subject, body.message);
    return c.json(success(ticket), 201);
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

ticketRoutes.post("/:id/reply", requireAuth, async (c) => {
  const userId = c.get("userId");
  const userRole = c.get("userRole") ?? "";
  const body = await c.req.json();
  if (!body.message?.trim()) {
    return c.json(errorResponse("پیام خالی است.", "VALIDATION"), 400);
  }
  try {
    const ticket = await ticketService.reply(c.req.param("id"), userId, userRole, body.message);
    return c.json(success(ticket));
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

ticketRoutes.get("/my", requireAuth, async (c) => {
  const tickets = await ticketService.getMyTickets(c.get("userId"));
  return c.json(success(tickets));
});

ticketRoutes.get("/:id", requireAuth, async (c) => {
  const userId = c.get("userId");
  const userRole = c.get("userRole") ?? "";
  const ticket = await ticketService.getTicket(c.req.param("id"), userId, userRole);
  if (!ticket) return c.json(errorResponse("Not found", "NOT_FOUND"), 404);
  return c.json(success(ticket));
});

// ── Support desk (admins + support role) ──────────────────────────────────

ticketRoutes.get("/admin/all", requireAuth, requireSupport, async (c) => {
  const tickets = await ticketService.listAll();
  return c.json(success(tickets));
});

ticketRoutes.patch("/admin/:id/status", requireAuth, requireSupport, async (c) => {
  const { status } = await c.req.json();
  const ticket = await ticketService.updateStatus(c.req.param("id"), status);
  if (!ticket) return c.json(errorResponse("Not found"), 404);
  return c.json(success(ticket));
});

ticketRoutes.delete("/admin/:id", requireAuth, requireSupport, async (c) => {
  const deleted = await ticketService.delete(c.req.param("id"));
  if (!deleted) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ deleted: true }));
});

export { ticketRoutes };
