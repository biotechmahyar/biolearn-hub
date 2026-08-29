import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { api } from "./_generated/api";
import { isAnyAdmin, isSiteAdmin, isSystemAdmin } from "./admin";

const EXAM_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours to take a fresh exam
const COURSE_NUDGE_MS = 3 * 24 * 60 * 60 * 1000; // nudge after 3 inactive days
const MAX_SHOWS = 2; // every reminder is shown twice, then quiet

type Ctx = any;

const getDoc = async (ctx: Ctx, id: string) => (await ctx.db.get(id)) as any;

// ── Announcements ───────────────────────────────────────────────────────────
// Site admins / system admins announce to everyone or to a course/exam.
// Instructors announce to their own students (via their courses).
export const createAnnouncement = mutation({
  args: {
    targetType: v.union(v.literal("all"), v.literal("course"), v.literal("exam")),
    targetId: v.optional(v.string()),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    if (args.title.trim().length === 0) throw new Error("عنوان اطلاعیه لازم است.");

    const systemAdmin = await isSystemAdmin(ctx);
    const siteAdmin = await isSiteAdmin(ctx);
    const isInstructor = user.role === "instructor";

    let targetTitle: string | undefined;
    if (args.targetType === "course") {
      if (!args.targetId) throw new Error("دوره انتخاب نشده است.");
      const course = await getDoc(ctx, args.targetId);
      if (!course) throw new Error("دوره یافت نشد.");
      // Instructors may only announce to courses they teach (their profile
      // name must match the course's instructor profile name).
      const instructorProfile = await getDoc(ctx, course.instructorId);
      const ownsCourse =
        isInstructor && !!instructorProfile && instructorProfile.name === user.name;
      if (!systemAdmin && !siteAdmin && !ownsCourse) {
        throw new Error("فقط مدرس همین دوره یا مدیر سایت می‌تواند اطلاعیه بگذارد.");
      }
      targetTitle = course.title;
    } else if (args.targetType === "exam") {
      if (!args.targetId) throw new Error("آزمون انتخاب نشده است.");
      const exam = await getDoc(ctx, args.targetId);
      if (!exam) throw new Error("آزمون یافت نشد.");
      if (!systemAdmin && !siteAdmin) {
        throw new Error("فقط مدیر سایت می‌تواند برای آزمون اطلاعیه بگذارد.");
      }
      targetTitle = exam.title;
    } else if (!systemAdmin && !siteAdmin && !isInstructor) {
      throw new Error("فقط مدیر سایت یا مدرس می‌تواند اطلاعیه عمومی بگذارد.");
    }

    const annId = await ctx.db.insert("announcements", {
      authorId: user._id,
      authorName: user.name ?? "تیم",
      authorRole: user.role ?? "user",
      targetType: args.targetType,
      targetId: args.targetId,
      targetTitle,
      title: args.title.trim(),
      body: args.body.trim(),
      createdAt: Date.now(),
    });

    // ── Send Telegram notification to relevant users ──
    try {
      const allUsers = await ctx.db.query("users").collect();
      const tgUserIds = allUsers
        .filter((u) => u.telegramId && u.telegramNotificationsEnabled)
        .map((u) => u._id);
      if (tgUserIds.length > 0) {
        await ctx.scheduler.runAfter(0, api.telegramNotifications.broadcastNotification, {
          userIds: tgUserIds,
          type: "system",
          key: `ann:${annId}`,
          title: `📢 اطلاعیه جدید: ${args.title.trim()}`,
          message: args.body.trim().slice(0, 500),
          linkLabel: "مشاهده در Genova",
        });
      }
    } catch { /* notification failure should not break announcement */ }

    return annId;
  },
});

export const deleteAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const ann = await ctx.db.get(args.id);
    if (!ann) throw new Error("اطلاعیه یافت نشد.");
    if (ann.authorId !== user._id && !(await isAnyAdmin(ctx))) {
      throw new Error("فقط نویسنده یا مدیر می‌تواند حذف کند.");
    }
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// Announcements visible to the current user: global ones, ones for their
// enrolled courses, and ones for exams.
export const listAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const all = await ctx.db.query("announcements").order("desc").take(100);

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));

    const visible = all.filter((a) => {
      if (a.targetType === "all") return true;
      if (a.targetType === "course") return enrolledCourseIds.has(a.targetId as any);
      if (a.targetType === "exam") return true;
      return false;
    });

    // Enrich with the author + target names.
    return Promise.all(
      visible.map(async (a) => {
        let targetTitle = a.targetTitle ?? null;
        if (!targetTitle && a.targetId) {
          const doc = await getDoc(ctx, a.targetId);
          if (doc) targetTitle = doc.title ?? null;
        }
        return { ...a, targetTitle };
      }),
    );
  },
});

// All announcements (admin console list).
export const listAllAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("announcements").order("desc").take(100);
  },
});

// Announcements authored by the current user (instructors see their own).
export const listMyAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("announcements")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .order("desc")
      .take(50);
    return Promise.all(
      rows.map(async (a) => {
        let targetTitle = a.targetTitle ?? null;
        if (!targetTitle && a.targetId) {
          const doc = await getDoc(ctx, a.targetId);
          if (doc) targetTitle = doc.title ?? null;
        }
        return { ...a, targetTitle };
      }),
    );
  },
});

// ── Reminders ───────────────────────────────────────────────────────────────
// Called when the app loads for a signed-in user: figures out which reminders
// are due (new exams within the 24h window the user has not taken, courses the
// user started but has not touched for a while) and returns the ones that can
// still be shown (shownCount < 2).
export const refreshReminders = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const now = Date.now();

    const existing = await ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // ── New exam within the last 24h, not yet attempted ──────────────────
    const exams = await ctx.db
      .query("exams")
      .filter((q) => q.eq(q.field("published"), true))
      .collect();
    const attempts = await ctx.db
      .query("examAttempts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const attemptedExamIds = new Set(attempts.map((a) => a.examId));

    const freshExams = exams.filter(
      (e) =>
        e._creationTime > now - EXAM_WINDOW_MS &&
        !attemptedExamIds.has(e._id),
    );
    for (const exam of freshExams) {
      const row = existing.find(
        (r) => r.kind === "exam_new" && r.refId === exam._id,
      );
      if (!row) {
        await ctx.db.insert("reminders", {
          userId: user._id,
          kind: "exam_new",
          refId: exam._id,
          title: "آزمون جدید منتشر شد 🎯",
          body: `«${exam.title}» تازه منتشر شده و ۲۴ ساعت فرصت داری در آن شرکت کنی (حدود ${exam.durationMinutes} دقیقه).`,
          link: `/tests/${exam.slug}`,
          shownCount: 0,
          createdAt: now,
        });
      }
    }

    // ── Course progress nudge ─────────────────────────────────────────────
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const en of enrollments) {
      const course = await ctx.db.get(en.courseId);
      if (!course) continue;
      const total = course.syllabus.length;
      if (total === 0) continue;
      const done = en.completedLessons.length;
      if (done >= total) continue; // finished — nothing to nudge
      const lastActive = en.lastActiveAt ?? en.enrolledAt;
      if (now - lastActive < COURSE_NUDGE_MS) continue; // still active
      const percent = Math.round((done / total) * 100);
      const remaining = total - done;
      const row = existing.find(
        (r) => r.kind === "course_nudge" && r.refId === en.courseId,
      );
      if (!row) {
        await ctx.db.insert("reminders", {
          userId: user._id,
          kind: "course_nudge",
          refId: en.courseId,
          title: "ادامه بده، نیمه‌کاره نماند 🌱",
          body: `تا الان ${percent}٪ از «${course.title}» را دیدی و ${remaining} جلسه تا پایانش مانده.`,
          link: `/courses/${course.slug}`,
          shownCount: 0,
          createdAt: now,
        });
      }
    }

    const refreshed = await ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return refreshed
      .filter((r) => r.shownCount < MAX_SHOWS)
      .sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Marks a reminder as shown (max 2 shows, then it disappears).
export const markReminderShown = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== user._id) return null;
    if (row.shownCount >= MAX_SHOWS) return null;
    await ctx.db.patch(args.id, { shownCount: row.shownCount + 1 });
    return await ctx.db.get(args.id);
  },
});

// "یادآوری آزمون بعدی": the user asks to be reminded about the next exam.
// It arms a marker so that when a new exam appears, refreshReminders will
// notify (twice). Returns the state of the armed marker.
export const armNextExamReminder = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { ok: false };
    const existing = await ctx.db
      .query("reminders")
      .withIndex("by_user_kind", (q) =>
        q.eq("userId", user._id).eq("kind", "exam_next"),
      )
      .first();
    if (!existing) {
      await ctx.db.insert("reminders", {
        userId: user._id,
        kind: "exam_next",
        refId: "next",
        title: "یادآوری آزمون بعدی فعال شد 🔔",
        body: "به محض انتشار آزمون بعدی، دو بار به شما یادآوری می‌کنیم.",
        link: "/tests",
        // It is a marker, not a notification: mark it as fully shown so the
        // center never pops it. New exams create their own exam_new rows.
        shownCount: MAX_SHOWS,
        createdAt: Date.now(),
      });
      return { ok: true };
    }
    return { ok: true, already: true };
  },
});

// Keeps a reminder armed (used by the notification center so armed markers
// don't expire silently).
export const getArmedNextExam = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const row = await ctx.db
      .query("reminders")
      .withIndex("by_user_kind", (q) =>
        q.eq("userId", user._id).eq("kind", "exam_next"),
      )
      .first();
    return row ?? null;
  },
});
