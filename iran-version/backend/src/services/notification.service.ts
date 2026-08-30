/**
 * Service layer for Notifications.
 * Mirrors: notifications.ts, inbox.ts Convex mutations/queries.
 */
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  announcements,
  reminders,
  inboxMessages,
  enrollments,
  exams,
  examAttempts,
  courses,
  users,
} from "../db/schema.js";

const EXAM_WINDOW_MS = 24 * 60 * 60 * 1000;
const COURSE_NUDGE_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_SHOWS = 2;

// ══════════════════════════════════════════════════════════════════════════════
// ── Announcements ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const announcementService = {
  async create(
    userId: string,
    userRole: string,
    data: { targetType: string; targetId?: string; title: string; body: string }
  ) {
    if (data.title.trim().length === 0) throw new Error("عنوان اطلاعیه لازم است.");

    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userRows[0];
    const systemAdmin = userRole === "admin";
    const siteAdmin = userRole === "site_admin";
    const isInstructor = userRole === "instructor";

    let targetTitle: string | null = null;
    if (data.targetType === "course") {
      if (!data.targetId) throw new Error("دوره انتخاب نشده است.");
      const courseRows = await db.select().from(courses).where(eq(courses.id, data.targetId)).limit(1);
      const course = courseRows[0];
      if (!course) throw new Error("دوره یافت نشد.");
      // Instructors can only announce to their own courses
      if (!systemAdmin && !siteAdmin && !(isInstructor && course.instructorId === userId)) {
        throw new Error("فقط مدرس همین دوره یا مدیر سایت می\u200cتواند اطلاعیه بگذارد.");
      }
      targetTitle = course.title;
    } else if (data.targetType === "exam") {
      if (!systemAdmin && !siteAdmin) {
        throw new Error("فقط مدیر سایت می\u200cتواند برای آزمون اطلاعیه بگذارد.");
      }
    } else if (!systemAdmin && !siteAdmin && !isInstructor) {
      throw new Error("فقط مدیر سایت یا مدرس می\u200cتواند اطلاعیه عمومی بگذارد.");
    }

    const [row] = await db
      .insert(announcements)
      .values({
        authorId: userId,
        authorName: user?.name ?? "تیم",
        authorRole: userRole,
        targetType: data.targetType as any,
        targetId: data.targetId,
        targetTitle,
        title: data.title.trim(),
        body: data.body.trim(),
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async delete(announcementId: string, userId: string, userRole: string) {
    const rows = await db.select().from(announcements).where(eq(announcements.id, announcementId)).limit(1);
    const ann = rows[0];
    if (!ann) throw new Error("اطلاعیه یافت نشد.");
    if (ann.authorId !== userId && userRole !== "admin" && userRole !== "site_admin") {
      throw new Error("فقط نویسنده یا مدیر می\u200cتواند حذف کند.");
    }
    await db.delete(announcements).where(eq(announcements.id, announcementId));
    return { ok: true };
  },

  async listVisible(userId: string) {
    const userEnrollments = await db.select().from(enrollments).where(eq(enrollments.userId, userId));
    const enrolledCourseIds = new Set(userEnrollments.map((e) => e.courseId));

    const all = await db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(100);
    return all.filter((a) => {
      if (a.targetType === "all") return true;
      if (a.targetType === "course") return enrolledCourseIds.has(a.targetId as string);
      if (a.targetType === "exam") return true;
      return false;
    });
  },

  async listAll() {
    return db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(100);
  },

  async listMy(userId: string) {
    return db
      .select()
      .from(announcements)
      .where(eq(announcements.authorId, userId))
      .orderBy(desc(announcements.createdAt))
      .limit(50);
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Reminders ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const reminderService = {
  /**
   * Refresh reminders — creates new exam reminders and course nudges.
   * Mirrors: notifications.ts refreshReminders mutation.
   */
  async refresh(userId: string) {
    const now = Date.now();
    const existing = await db.select().from(reminders).where(eq(reminders.userId, userId));

    // New exam within last 24h not yet attempted
    const allExams = await db.select().from(exams).where(eq(exams.published, true));
    const userAttempts = await db.select().from(examAttempts).where(eq(examAttempts.userId, userId));
    const attemptedExamIds = new Set(userAttempts.map((a) => a.examId));

    // We don't have _creationTime in PostgreSQL — use order as a proxy for "recent"
    const recentExams = allExams.slice(0, 5); // Top 5 by order
    for (const exam of recentExams) {
      if (attemptedExamIds.has(exam.id)) continue;
      const row = existing.find((r) => r.kind === "exam_new" && r.refId === exam.id);
      if (!row) {
        await db.insert(reminders).values({
          userId,
          kind: "exam_new",
          refId: exam.id,
          title: "\u0622\u0632\u0645\u0648\u0646 \u062c\u062f\u06cc\u062f \u0645\u0646\u062a\u0634\u0631 \u0634\u062f \ud83c\udfaf",
          body: `\u00ab${exam.title}\u00bb \u062a\u0627\u0632\u0647 \u0645\u0646\u062a\u0634\u0631 \u0634\u062f\u0647 \u0648 ${exam.durationMinutes} \u062f\u0642\u06cc\u0642\u0647 \u0641\u0631\u0635\u062a \u062f\u0627\u0631\u06cc \u062f\u0631 \u0622\u0646 \u0634\u0631\u06a9\u062a \u06a9\u0646\u06cc.`,
          link: `/tests/${exam.slug}`,
          shownCount: 0,
          createdAt: now,
        });
      }
    }

    // Course progress nudge
    const userEnrollments = await db.select().from(enrollments).where(eq(enrollments.userId, userId));
    for (const en of userEnrollments) {
      const courseRows = await db.select().from(courses).where(eq(courses.id, en.courseId)).limit(1);
      const course = courseRows[0];
      if (!course) continue;
      const syllabus = Array.isArray(course.syllabus) ? course.syllabus : [];
      const total = syllabus.length;
      if (total === 0) continue;
      const completed = Array.isArray(en.completedLessons) ? en.completedLessons : [];
      const done = completed.length;
      if (done >= total) continue;
      const lastActive = en.lastActiveAt ?? en.enrolledAt;
      if (now - (lastActive ?? 0) < COURSE_NUDGE_MS) continue;
      const row = existing.find((r) => r.kind === "course_nudge" && r.refId === en.courseId);
      if (!row) {
        const percent = Math.round((done / total) * 100);
        const remaining = total - done;
        await db.insert(reminders).values({
          userId,
          kind: "course_nudge",
          refId: en.courseId,
          title: "\u0627\u062f\u0627\u0645\u0647 \u0628\u062f\u0647\u060c \u0646\u06cc\u0645\u0647\u200c\u06a9\u0627\u0631\u0647 \u0645\u0646\u0627\u0645\u062f \ud83c\udf31",
          body: `\u062a\u0627 \u0627\u0644\u0627\u0646 ${percent}% \u0627\u0632 \u00ab${course.title}\u00bb \u0631\u0627 \u062f\u06cc\u062f\u06cc \u0648 ${remaining} \u062c\u0644\u0633\u0647 \u062a\u0627 \u067e\u0627\u06cc\u0627\u0646\u0634 \u0645\u0627\u0646\u062f\u0647.`,
          link: `/courses/${course.slug}`,
          shownCount: 0,
          createdAt: now,
        });
      }
    }

    const refreshed = await db.select().from(reminders).where(eq(reminders.userId, userId));
    return refreshed
      .filter((r) => (r.shownCount ?? 0) < MAX_SHOWS)
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  },

  async markShown(reminderId: string, userId: string) {
    const rows = await db.select().from(reminders).where(eq(reminders.id, reminderId)).limit(1);
    const row = rows[0];
    if (!row || row.userId !== userId) return null;
    if ((row.shownCount ?? 0) >= MAX_SHOWS) return null;
    const [updated] = await db
      .update(reminders)
      .set({ shownCount: (row.shownCount ?? 0) + 1 })
      .where(eq(reminders.id, reminderId))
      .returning();
    return updated;
  },

  async armNextExam(userId: string) {
    const existing = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.userId, userId), eq(reminders.kind, "exam_next")))
      .limit(1);
    if (!existing[0]) {
      await db.insert(reminders).values({
        userId,
        kind: "exam_next",
        refId: "next",
        title: "\u06cc\u0627\u062f\u0622\u0648\u0631\u06cc \u0622\u0632\u0645\u0648\u0646 \u0628\u0639\u062f\u06cc \u0641\u0639\u0627\u0644 \u0634\u062f \ud83d\udd14",
        body: "\u0628\u0647 \u0645\u062d\u0636 \u0627\u0646\u062a\u0634\u0627\u0631 \u0622\u0632\u0645\u0648\u0646 \u0628\u0639\u062f\u06cc\u060c \u062f\u0648 \u0628\u0627\u0631 \u0628\u0647 \u0634\u0645\u0627 \u06cc\u0627\u062f\u0622\u0648\u0631\u06cc \u0645\u064a\u06a9\u0646\u06cc\u0645.",
        link: "/tests",
        shownCount: MAX_SHOWS,
        createdAt: Date.now(),
      });
      return { ok: true };
    }
    return { ok: true, already: true };
  },

  async getArmedNextExam(userId: string) {
    const rows = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.userId, userId), eq(reminders.kind, "exam_next")))
      .limit(1);
    return rows[0] ?? null;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Inbox Messages ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const inboxService = {
  async send(userId: string, title: string, body: string) {
    if (title.trim().length < 2) throw new Error("عنوان پیام لازم است.");
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userRows[0]) throw new Error("کاربر یافت نشد.");
    const [row] = await db
      .insert(inboxMessages)
      .values({
        userId,
        title: title.trim(),
        body: body.trim(),
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async delete(messageId: string) {
    const [row] = await db.delete(inboxMessages).where(eq(inboxMessages.id, messageId)).returning();
    return row ?? null;
  },

  async listMy(userId: string) {
    const rows = await db
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.userId, userId))
      .orderBy(desc(inboxMessages.createdAt));
    return rows.map((m) => ({
      id: m.id,
      title: m.title,
      body: m.body,
      readAt: m.readAt ?? null,
      createdAt: m.createdAt,
      unread: !m.readAt,
    }));
  },

  async markRead(messageId: string, userId: string, userRole: string) {
    const rows = await db.select().from(inboxMessages).where(eq(inboxMessages.id, messageId)).limit(1);
    const msg = rows[0];
    if (!msg) throw new Error("پیام یافت نشد.");
    if (msg.userId !== userId && userRole !== "admin" && userRole !== "site_admin") {
      throw new Error("این پیام متعلق به شما نیست.");
    }
    if (!msg.readAt) {
      await db.update(inboxMessages).set({ readAt: Date.now() }).where(eq(inboxMessages.id, messageId));
    }
    return { ok: true };
  },

  async adminListAll() {
    const rows = await db.select().from(inboxMessages).orderBy(desc(inboxMessages.createdAt));
    const enriched = [];
    for (const m of rows) {
      const userRows = await db.select().from(users).where(eq(users.id, m.userId)).limit(1);
      enriched.push({
        ...m,
        user: userRows[0] ? { name: userRows[0].name, email: userRows[0].email, role: userRows[0].role } : null,
      });
    }
    return enriched;
  },
};
