import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { tickets } from "../db/schema.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../lib/errors.js";

export async function createTicket(userId: string, subject: string, text: string) {
  const db = getDb();
  const now = Date.now();
  const [ticket] = await db
    .insert(tickets)
    .values({
      userId,
      subject,
      status: "open",
      messages: [{ author: userId, text, at: now }],
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return ticket;
}

export async function getMyTickets(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(tickets)
    .where(eq(tickets.userId, userId))
    .orderBy(desc(tickets.createdAt));
}

export async function getAllTickets() {
  const db = getDb();
  return db.select().from(tickets).orderBy(desc(tickets.createdAt));
}

export async function getTicket(ticketId: string, userId: string, isAdmin: boolean) {
  const db = getDb();
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!ticket) throw new NotFoundError("Ticket");
  if (!isAdmin && ticket.userId !== userId) throw new ForbiddenError();
  return ticket;
}

export async function addTicketMessage(
  ticketId: string,
  userId: string,
  text: string,
  isAdmin: boolean
) {
  const db = getDb();
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!ticket) throw new NotFoundError("Ticket");
  if (!isAdmin && ticket.userId !== userId) throw new ForbiddenError();

  const messages = (ticket.messages as Array<{ author: string; text: string; at: number }>) || [];
  messages.push({ author: userId, text, at: Date.now() });

  const [updated] = await db
    .update(tickets)
    .set({ messages, updatedAt: Date.now() })
    .where(eq(tickets.id, ticketId))
    .returning();
  return updated;
}

export async function updateTicketStatus(
  ticketId: string,
  status: string,
  userId: string,
  isAdmin: boolean
) {
  const db = getDb();
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!ticket) throw new NotFoundError("Ticket");
  if (!isAdmin && ticket.userId !== userId) throw new ForbiddenError();

  const [updated] = await db
    .update(tickets)
    .set({ status, updatedAt: Date.now() })
    .where(eq(tickets.id, ticketId))
    .returning();
  return updated;
}
