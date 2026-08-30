/**
 * Service layer for Mentor Groups, Questions, Sessions.
 * Mirrors: mentor.ts, collab.ts group logic.
 */
import { eq, and, desc, asc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  mentorGroups,
  groupMembers,
  groupAnnouncements,
  mentorQuestions,
  mentorSessions,
  users,
} from "../db/schema.js";

// ══════════════════════════════════════════════════════════════════════════════
// ── Groups ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const groupService = {
  async list() {
    return db.select().from(mentorGroups).orderBy(desc(mentorGroups.createdAt));
  },

  async findById(id: string) {
    const rows = await db.select().from(mentorGroups).where(eq(mentorGroups.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async create(
    userId: string,
    data: { title: string; description: string; meetingDay: string; meetingTime: string; capacity: number }
  ) {
    if (data.title.trim().length === 0) throw new Error("عنوان گروه لازم است.");
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userRows[0];
    const [row] = await db
      .insert(mentorGroups)
      .values({
        mentorId: userId,
        mentorName: user?.name ?? "منتور",
        title: data.title.trim(),
        description: data.description.trim(),
        meetingDay: data.meetingDay,
        meetingTime: data.meetingTime,
        capacity: data.capacity,
        memberCount: 0,
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async delete(groupId: string) {
    const [row] = await db.delete(mentorGroups).where(eq(mentorGroups.id, groupId)).returning();
    return row ?? null;
  },

  async join(userId: string, groupId: string) {
    const group = await this.findById(groupId);
    if (!group) throw new Error("گروه یافت نشد.");
    if ((group.memberCount ?? 0) >= group.capacity) throw new Error("ظرفیت گروه تکمیل است.");

    // Check duplicate membership
    const existing = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);
    if (existing[0]) throw new Error("شما قبلاً عضو این گروه هستید.");

    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    await db.insert(groupMembers).values({
      groupId,
      userId,
      userName: userRows[0]?.name ?? "کاربر",
      joinedAt: Date.now(),
    });
    await db
      .update(mentorGroups)
      .set({ memberCount: (group.memberCount ?? 0) + 1 })
      .where(eq(mentorGroups.id, groupId));
    return { ok: true };
  },

  async leave(userId: string, groupId: string) {
    const membershipRows = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);
    if (!membershipRows[0]) throw new Error("عضویت یافت نشد.");
    await db.delete(groupMembers).where(eq(groupMembers.id, membershipRows[0].id));
    const group = await this.findById(groupId);
    if (group && (group.memberCount ?? 0) > 0) {
      await db
        .update(mentorGroups)
        .set({ memberCount: (group.memberCount ?? 0) - 1 })
        .where(eq(mentorGroups.id, groupId));
    }
    return { ok: true };
  },

  async listMembers(groupId: string) {
    return db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
  },

  async isMember(userId: string, groupId: string) {
    const rows = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);
    return rows.length > 0;
  },

  // ── Group Announcements ──────────────────────────────────────────────────

  async createAnnouncement(
    userId: string,
    groupId: string,
    title: string,
    message: string
  ) {
    const group = await this.findById(groupId);
    if (!group) throw new Error("گروه یافت نشد.");
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [row] = await db
      .insert(groupAnnouncements)
      .values({
        groupId,
        mentorId: userId,
        mentorName: userRows[0]?.name ?? "منتور",
        title: title.trim(),
        message: message.trim(),
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async listAnnouncements(groupId: string) {
    return db
      .select()
      .from(groupAnnouncements)
      .where(eq(groupAnnouncements.groupId, groupId))
      .orderBy(desc(groupAnnouncements.createdAt))
      .limit(50);
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Questions ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const questionService = {
  async ask(userId: string, text: string, topic: string) {
    if (text.trim().length < 5) throw new Error("سؤال را کامل بنویسید.");
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [row] = await db
      .insert(mentorQuestions)
      .values({
        studentId: userId,
        studentName: userRows[0]?.name ?? "دانشجو",
        topic: topic.trim() || "عمومی",
        text: text.trim(),
        status: "open",
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async list(userId: string, userRole: string) {
    // Mentors see everything; students only their own
    if (userRole === "mentor" || userRole === "admin" || userRole === "site_admin") {
      return db.select().from(mentorQuestions).orderBy(desc(mentorQuestions.createdAt)).limit(200);
    }
    return db
      .select()
      .from(mentorQuestions)
      .where(eq(mentorQuestions.studentId, userId))
      .orderBy(desc(mentorQuestions.createdAt))
      .limit(100);
  },

  async answer(userId: string, questionId: string, answerText: string) {
    if (answerText.trim().length === 0) throw new Error("پاسخ خالی است.");
    const rows = await db.select().from(mentorQuestions).where(eq(mentorQuestions.id, questionId)).limit(1);
    const q = rows[0];
    if (!q) throw new Error("سؤال یافت نشد.");
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [updated] = await db
      .update(mentorQuestions)
      .set({
        answer: answerText.trim(),
        answeredByName: userRows[0]?.name ?? "منتور",
        status: "answered",
        answeredAt: Date.now(),
      })
      .where(eq(mentorQuestions.id, questionId))
      .returning();
    return updated;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Sessions ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const sessionService = {
  async plan(
    userId: string,
    data: { studentId: string; title: string; date: string; time: string; notes: string }
  ) {
    if (data.title.trim().length === 0) throw new Error("عنوان جلسه لازم است.");
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [row] = await db
      .insert(mentorSessions)
      .values({
        mentorId: userId,
        mentorName: userRows[0]?.name ?? "منتور",
        studentId: data.studentId,
        title: data.title.trim(),
        date: data.date,
        time: data.time,
        notes: data.notes.trim(),
        status: "scheduled",
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async list(userId: string, userRole: string) {
    if (userRole === "mentor" || userRole === "admin" || userRole === "site_admin") {
      const rows = await db.select().from(mentorSessions).orderBy(desc(mentorSessions.createdAt)).limit(100);
      const enriched = [];
      for (const s of rows) {
        const studentRows = await db.select().from(users).where(eq(users.id, s.studentId)).limit(1);
        enriched.push({ ...s, studentName: studentRows[0]?.name ?? "دانشجو" });
      }
      return enriched;
    }
    const rows = await db
      .select()
      .from(mentorSessions)
      .where(eq(mentorSessions.studentId, userId))
      .orderBy(desc(mentorSessions.createdAt))
      .limit(50);
    return rows.map((s) => ({ ...s, studentName: "" }));
  },

  async setStatus(userId: string, sessionId: string, status: string) {
    if (!["scheduled", "done", "cancelled"].includes(status)) {
      throw new Error("وضعیت نامعتبر است.");
    }
    const rows = await db.select().from(mentorSessions).where(eq(mentorSessions.id, sessionId)).limit(1);
    const session = rows[0];
    if (!session) throw new Error("جلسه یافت نشد.");
    const [updated] = await db
      .update(mentorSessions)
      .set({ status: status as any })
      .where(eq(mentorSessions.id, sessionId))
      .returning();
    return updated;
  },

  async listStudents() {
    const rows = await db.select().from(users);
    return rows
      .filter((u) => u.role === "user" || u.role === "member" || !u.role)
      .map((u) => ({ id: u.id, name: u.name ?? "کاربر", email: u.email ?? null }));
  },

  async getStats(userId: string, userRole: string) {
    const isMentor = userRole === "mentor" || userRole === "admin" || userRole === "site_admin";
    let openQuestions = 0;
    let sessions = 0;
    if (isMentor) {
      const openRows = await db
        .select()
        .from(mentorQuestions)
        .where(eq(mentorQuestions.status, "open"));
      openQuestions = openRows.length;
      const sessionRows = await db
        .select()
        .from(mentorSessions)
        .where(eq(mentorSessions.mentorId, userId));
      sessions = sessionRows.length;
    }
    const groupRows = await db
      .select()
      .from(mentorGroups)
      .where(eq(mentorGroups.mentorId, userId));
    return { openQuestions, sessions, groups: groupRows.length };
  },
};
