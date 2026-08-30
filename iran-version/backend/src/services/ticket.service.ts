/**
 * Service layer for Support/Tickets.
 * Mirrors: tickets.ts Convex mutations/queries.
 */
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { tickets, users } from "../db/schema.js";

export const ticketService = {
  async create(userId: string, subject: string, message: string) {
    if (subject.trim().length === 0 || message.trim().length === 0) {
      throw new Error("عنوان و متن پیام را وارد کنید.");
    }
    const now = Date.now();
    const [row] = await db
      .insert(tickets)
      .values({
        userId,
        subject: subject.trim(),
        status: "open",
        createdAt: now,
        updatedAt: now,
        messages: [{ author: "student", text: message.trim(), at: now }],
      })
      .returning();
    return row;
  },

  async reply(ticketId: string, userId: string, userRole: string, message: string) {
    const rows = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
    const ticket = rows[0];
    if (!ticket) throw new Error("تیکت یافت نشد.");

    const isSupportStaff = ["support", "admin", "site_admin"].includes(userRole);
    const isOwner = ticket.userId === userId;
    if (!isSupportStaff && !isOwner) throw new Error("دسترسی ندارید.");

    const author = isSupportStaff ? "admin" : "student";
    const messages = [
      ...((ticket.messages as any[]) ?? []),
      { author, text: message.trim(), at: Date.now() },
    ];
    const newStatus = isSupportStaff
      ? "answered"
      : ticket.status === "closed"
        ? "closed"
        : "open";

    const [updated] = await db
      .update(tickets)
      .set({ messages, status: newStatus, updatedAt: Date.now() })
      .where(eq(tickets.id, ticketId))
      .returning();
    return updated;
  },

  async delete(ticketId: string) {
    const [row] = await db.delete(tickets).where(eq(tickets.id, ticketId)).returning();
    return row ?? null;
  },

  async updateStatus(ticketId: string, status: string) {
    const [row] = await db
      .update(tickets)
      .set({ status, updatedAt: Date.now() })
      .where(eq(tickets.id, ticketId))
      .returning();
    return row ?? null;
  },

  async getMyTickets(userId: string) {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt));
  },

  async getTicket(ticketId: string, userId: string, userRole: string) {
    const rows = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
    const ticket = rows[0];
    if (!ticket) return null;
    // Only owner or admin can see
    if (ticket.userId !== userId && userRole !== "admin" && userRole !== "site_admin") return null;
    return ticket;
  },

  async listAll() {
    const rows = await db.select().from(tickets).orderBy(desc(tickets.createdAt));
    const enriched = [];
    for (const t of rows) {
      const userRows = await db.select().from(users).where(eq(users.id, t.userId)).limit(1);
      enriched.push({
        ...t,
        user: userRows[0] ? { name: userRows[0].name, email: userRows[0].email } : null,
      });
    }
    return enriched;
  },
};
