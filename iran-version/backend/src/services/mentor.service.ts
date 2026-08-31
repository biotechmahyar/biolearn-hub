import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  mentorGroups,
  groupMembers,
  groupAnnouncements,
  mentorQuestions,
  mentorSessions,
} from "../db/schema.js";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} from "../lib/errors.js";

// ─── Groups ──────────────────────────────────────────────────────────────────

export async function listMentorGroups() {
  const db = getDb();
  return db
    .select()
    .from(mentorGroups)
    .where(eq(mentorGroups.published, true))
    .orderBy(desc(mentorGroups.createdAt));
}

export async function getMentorGroup(id: string) {
  const db = getDb();
  const [group] = await db
    .select()
    .from(mentorGroups)
    .where(eq(mentorGroups.id, id))
    .limit(1);
  return group || null;
}

export async function createMentorGroup(
  mentorId: string,
  data: { name: string; description?: string; maxMembers?: number }
) {
  const db = getDb();
  const now = Date.now();
  const [group] = await db
    .insert(mentorGroups)
    .values({
      ...data,
      mentorId,
      published: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  // Auto-add mentor as member
  await db.insert(groupMembers).values({
    groupId: group.id,
    userId: mentorId,
    role: "mentor",
    joinedAt: now,
  });
  return group;
}

export async function joinGroup(userId: string, groupId: string) {
  const db = getDb();
  const [group] = await db
    .select()
    .from(mentorGroups)
    .where(eq(mentorGroups.id, groupId))
    .limit(1);
  if (!group) throw new NotFoundError("Group");

  // Check duplicate
  const [existing] = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
    )
    .limit(1);
  if (existing) throw new ConflictError("Already a member");

  // Check capacity
  const members = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  if (group.maxMembers && members.length >= group.maxMembers) {
    throw new BadRequestError("Group is full");
  }

  const now = Date.now();
  const [member] = await db
    .insert(groupMembers)
    .values({ groupId, userId, role: "member", joinedAt: now })
    .returning();
  return member;
}

export async function getGroupMembers(groupId: string) {
  const db = getDb();
  return db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
}

// ─── Questions ───────────────────────────────────────────────────────────────

export async function askQuestion(
  userId: string,
  groupId: string,
  text: string
) {
  const db = getDb();
  const now = Date.now();
  const [q] = await db
    .insert(mentorQuestions)
    .values({ groupId, userId, text, createdAt: now })
    .returning();
  return q;
}

export async function answerQuestion(
  mentorId: string,
  questionId: string,
  answer: string
) {
  const db = getDb();
  const [updated] = await db
    .update(mentorQuestions)
    .set({ answer, answeredBy: mentorId, answeredAt: Date.now() })
    .where(eq(mentorQuestions.id, questionId))
    .returning();
  if (!updated) throw new NotFoundError("Question");
  return updated;
}

export async function getGroupQuestions(groupId: string) {
  const db = getDb();
  return db
    .select()
    .from(mentorQuestions)
    .where(eq(mentorQuestions.groupId, groupId))
    .orderBy(desc(mentorQuestions.createdAt));
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function createSession(
  mentorId: string,
  groupId: string,
  data: { title?: string; scheduledAt?: number; duration?: number }
) {
  const db = getDb();
  const now = Date.now();
  const [session] = await db
    .insert(mentorSessions)
    .values({ groupId, mentorId, ...data, status: "scheduled", createdAt: now })
    .returning();
  return session;
}

export async function getGroupSessions(groupId: string) {
  const db = getDb();
  return db
    .select()
    .from(mentorSessions)
    .where(eq(mentorSessions.groupId, groupId))
    .orderBy(desc(mentorSessions.createdAt));
}

// ─── Announcements ───────────────────────────────────────────────────────────

export async function createGroupAnnouncement(
  authorId: string,
  groupId: string,
  title: string,
  body?: string
) {
  const db = getDb();
  const now = Date.now();
  const [ann] = await db
    .insert(groupAnnouncements)
    .values({ groupId, authorId, title, body, createdAt: now })
    .returning();
  return ann;
}

export async function getGroupAnnouncements(groupId: string) {
  const db = getDb();
  return db
    .select()
    .from(groupAnnouncements)
    .where(eq(groupAnnouncements.groupId, groupId))
    .orderBy(desc(groupAnnouncements.createdAt));
}
