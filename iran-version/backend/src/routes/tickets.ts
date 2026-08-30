import { Hono } from "hono";
import { db } from "../db/index.js";
import { tickets, users } from "../db/schema.js";
import { requireAuth, requireSupportStaff } from "../middleware/auth.js";
import { eq, desc } from "drizzle-orm";

const ticketsRouter = new Hono();

// POST /api/tickets
ticketsRouter.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const { subject, message } = await c.req.json();
  if (!subject?.trim() || !message?.trim()) return c.json({ ok: false, error: "عنوان و متن پیام را وارد کنید." }, 400);
  const now = Date.now();
  const [created] = await db.insert(tickets).values({
    userId: user.id, subject: subject.trim(), status: "open", createdAt: now, updatedAt: now,
    messages: [{ author: "student", text: message.trim(), at: now }],
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

// GET /api/tickets/mine
ticketsRouter.get("/mine", requireAuth, async (c) => {
  const user = c.get("user");
  const list = await db.query.tickets.findMany({ where: eq(tickets.userId, user.id), orderBy: [desc(tickets.createdAt)] });
  return c.json({ ok: true, data: list });
});

// GET /api/tickets/:id
ticketsRouter.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, c.req.param("id")) });
  if (!ticket) return c.json({ ok: false, error: "تیکت یافت نشد." }, 404);
  if (ticket.userId !== user.id && user.role !== "admin" && user.role !== "site_admin") {
    return c.json({ ok: false, error: "دسترسی ندارید." }, 403);
  }
  return c.json({ ok: true, data: ticket });
});

// POST /api/tickets/:id/reply
ticketsRouter.post("/:id/reply", requireAuth, async (c) => {
  const user = c.get("user");
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, c.req.param("id")) });
  if (!ticket) return c.json({ ok: false, error: "تیکت یافت نشد." }, 404);
  const isStaff = ["admin", "site_admin", "support"].includes(user.role || "");
  const isOwner = ticket.userId === user.id;
  if (!isStaff && !isOwner) return c.json({ ok: false, error: "دسترسی ندارید." }, 403);
  const { message } = await c.req.json();
  if (!message?.trim()) return c.json({ ok: false, error: "پیام خالی است." }, 400);
  const author = isStaff ? "admin" : "student";
  const messages = [...(ticket.messages as any[]), { author, text: message.trim(), at: Date.now() }];
  await db.update(tickets).set({
    messages, status: isStaff ? "answered" : ticket.status === "closed" ? "closed" : "open", updatedAt: Date.now(),
  }).where(eq(tickets.id, c.req.param("id")));
  return c.json({ ok: true, data: await db.query.tickets.findFirst({ where: eq(tickets.id, c.req.param("id")) }) });
});

// DELETE /api/tickets/:id
ticketsRouter.delete("/:id", requireSupportStaff, async (c) => {
  await db.delete(tickets).where(eq(tickets.id, c.req.param("id")));
  return c.json({ ok: true });
});

// PATCH /api/tickets/:id/status
ticketsRouter.patch("/:id/status", requireSupportStaff, async (c) => {
  const { status } = await c.req.json();
  await db.update(tickets).set({ status, updatedAt: Date.now() }).where(eq(tickets.id, c.req.param("id")));
  return c.json({ ok: true, data: await db.query.tickets.findFirst({ where: eq(tickets.id, c.req.param("id")) }) });
});

// GET /api/tickets/all (admin)
ticketsRouter.get("/all", requireSupportStaff, async (c) => {
  const list = await db.query.tickets.findMany({ orderBy: [desc(tickets.createdAt)] });
  const enriched = await Promise.all(
    list.map(async (t) => {
      const u = await db.query.users.findFirst({ where: eq(users.id, t.userId) });
      return { ...t, user: u ? { name: u.name, email: u.email } : null };
    })
  );
  return c.json({ ok: true, data: enriched });
});

export default ticketsRouter;
