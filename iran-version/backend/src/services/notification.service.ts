import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  announcements,
  reminders,
  inboxMessages,
} from "../db/schema.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";

// ─── Announcements ───────────────────────────────────────────────────────────

export async function listVisibleAnnouncements() {
  const db = getDb();
  return db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt));
}

export async function listAllAnnouncements() {
  const db = getDb();
  return db.select().from(announcements).orderBy(desc(announcements.createdAt));
}

export async function listMyAnnouncements(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(announcements)
    .where(eq(announcements.authorId, userId))
    .orderBy(desc(announcements.createdAt));
}

export async function createAnnouncement(
  authorId: string,
  authorName: string,
  data: {
    title: string;
    body?: string;
    targetType?: string;
    targetId?: string;
    targetTitle?: string;
  }
) {
  const db = getDb();
  const now = Date.now();
  const [ann] = await db
    .insert(announcements)
    .values({
      ...data,
      authorId,
      authorName,
      targetType: data.targetType || "all",
      createdAt: now,
    })
    .returning();
  return ann;
}

export async function deleteAnnouncement(id: string) {
  const db = getDb();
  await db.delete(announcements).where(eq(announcements.id, id));
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export async function refreshReminders(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(reminders)
    .where(eq(reminders.userId, userId))
    .orderBy(desc(reminders.createdAt));
}

export async function markReminderShown(id: string) {
  const db = getDb();
  const [updated] = await db
    .update(reminders)
    .set({ shown: true })
    .where(eq(reminders.id, id))
    .returning();
  return updated || null;
}

export async function armNextExamReminder(
  userId: string,
  data: { title: string; body?: string }
) {
  const db = getDb();
  const now = Date.now();
  const [reminder] = await db
    .insert(reminders)
    .values({
      userId,
      type: "next_exam",
      title: data.title,
      body: data.body,
      shown: false,
      createdAt: now,
    })
    .returning();
  return reminder;
}

export async function getArmedNextExamReminder(userId: string) {
  const db = getDb();
  const [reminder] = await db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        eq(reminders.type, "next_exam"),
        eq(reminders.shown, false)
      )
    )
    .limit(1);
  return reminder || null;
}

// ─── Inbox ───────────────────────────────────────────────────────────────────

export async function listMyInbox(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(inboxMessages)
    .where(eq(inboxMessages.userId, userId))
    .orderBy(desc(inboxMessages.createdAt));
}

export async function listAllInbox() {
  const db = getDb();
  return db.select().from(inboxMessages).orderBy(desc(inboxMessages.createdAt));
}

export async function sendInboxMessage(
  userId: string,
  title: string,
  body?: string
) {
  const db = getDb();
  const now = Date.now();
  const [msg] = await db
    .insert(inboxMessages)
    .values({ userId, title, body, unread: true, createdAt: now })
    .returning();
  return msg;
}

export async function deleteInboxMessage(id: string) {
  const db = getDb();
  await db.delete(inboxMessages).where(eq(inboxMessages.id, id));
}

export async function markInboxRead(id: string) {
  const db = getDb();
  const [updated] = await db
    .update(inboxMessages)
    .set({ unread: false })
    .where(eq(inboxMessages.id, id))
    .returning();
  return updated || null;
}
