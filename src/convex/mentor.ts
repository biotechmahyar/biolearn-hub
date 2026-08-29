import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { isAdmin } from "./admin";
import { api } from "./_generated/api";

// ── Site URL for inline keyboard links ─────────────────────────────────────
const SITE_URL = "https://biolearn-hub.biotechmahyar.workers.dev";

// ── Role helpers ────────────────────────────────────────────────────────────
const isMentor = async (ctx: any) => {
  const user = await getCurrentUser(ctx);
  return !!user && (user.role === "mentor" || user.role === "admin" || user.role === "site_admin");
};

// ── Student questions for mentors ───────────────────────────────────────────
export const askMentor = mutation({
  args: { text: v.string(), topic: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای پرسیدن سؤال ابتدا وارد حساب شوید.");
    if (args.text.trim().length < 5) throw new Error("سؤال را کامل بنویسید.");
    return await ctx.db.insert("mentorQuestions", {
      studentId: user._id,
      studentName: user.name ?? "دانشجو",
      topic: args.topic.trim() || "عمومی",
      text: args.text.trim(),
      status: "open",
      createdAt: Date.now(),
    });
  },
});

export const listMentorQuestions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    // Mentors see everything; students only their own.
    if (user.role === "mentor" || user.role === "admin" || user.role === "site_admin") {
      return await ctx.db.query("mentorQuestions").order("desc").take(200);
    }
    return await ctx.db
      .query("mentorQuestions")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .order("desc")
      .take(100);
  },
});

export const answerMentorQuestion = mutation({
  args: { questionId: v.id("mentorQuestions"), answer: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    if (!(await isMentor(ctx))) throw new Error("فقط منتور می‌تواند پاسخ دهد.");
    if (args.answer.trim().length === 0) throw new Error("پاسخ خالی است.");
    const q = await ctx.db.get(args.questionId);
    if (!q) throw new Error("سؤال یافت نشد.");
    await ctx.db.patch(q._id, {
      answer: args.answer.trim(),
      answeredByName: user.name ?? "منتور",
      status: "answered",
      answeredAt: Date.now(),
    });

    // Telegram notification to the student who asked
    try {
      await ctx.scheduler.runAfter(0, api.telegramNotifications.sendNotification, {
        userId: q.studentId,
        type: "mentor_reply",
        key: `mentor-answer:${q._id}`,
        title: `💬 پاسخ منتور به سؤال شما`,
        message: `${user.name ?? "منتور"} به سؤال شما پاسخ داد:\n\n${args.answer.trim().slice(0, 300)}`,
        linkLabel: "مشاهده در Genova",
      });
    } catch { /* notification failure should not break the answer */ }

    return await ctx.db.get(q._id);
  },
});

// ── Session planning (mentor schedules a 1:1 session with a student) ───────
export const planSession = mutation({
  args: {
    studentId: v.id("users"),
    title: v.string(),
    date: v.string(),
    time: v.string(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    if (!(await isMentor(ctx))) throw new Error("فقط منتور می‌تواند جلسه برنامه‌ریزی کند.");
    if (args.title.trim().length === 0) throw new Error("عنوان جلسه لازم است.");
    return await ctx.db.insert("mentorSessions", {
      mentorId: user._id,
      mentorName: user.name ?? "منتور",
      studentId: args.studentId,
      title: args.title.trim(),
      date: args.date,
      time: args.time,
      notes: args.notes.trim(),
      status: "scheduled",
      createdAt: Date.now(),
    });

    // Telegram notification to student
    try {
      await ctx.scheduler.runAfter(0, api.telegramNotifications.sendNotification, {
        userId: args.studentId,
        type: "meeting",
        key: `session:${user!._id}:${args.studentId}:${Date.now()}`,
        title: `📅 جلسه Mentoring جدید`,
        message: `${user!.name ?? "منتور"} جلسه‌ای برنامه‌ریزی کرد:\n\nعنوان: ${args.title.trim()}\n🕐 زمان: ${args.date} — ${args.time}`,
        linkLabel: "مشاهده جلسه",
      });
    } catch { /* notification failure should not break session creation */ }
  },
});

export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    if (user.role === "mentor" || user.role === "admin" || user.role === "site_admin") {
      const sessions = await ctx.db.query("mentorSessions").order("desc").take(100);
      return Promise.all(
        sessions.map(async (s) => {
          const student = await ctx.db.get(s.studentId);
          return { ...s, studentName: student?.name ?? "دانشجو" };
        }),
      );
    }
    const mine = await ctx.db
      .query("mentorSessions")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .order("desc")
      .take(50);
    return mine.map((s) => ({ ...s, studentName: user.name ?? "دانشجو" }));
  },
});

export const setSessionStatus = mutation({
  args: { sessionId: v.id("mentorSessions"), status: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    if (!(await isMentor(ctx))) throw new Error("فقط منتور می‌تواند وضعیت جلسه را تغییر دهد.");
    if (!["scheduled", "done", "cancelled"].includes(args.status)) {
      throw new Error("وضعیت نامعتبر است.");
    }
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("جلسه یافت نشد.");
    const oldStatus = session.status;
    await ctx.db.patch(session._id, { status: args.status as any });

    // Telegram notification for status changes
    if (oldStatus !== args.status) {
      try {
        const student = await ctx.db.get(session.studentId);
        if (args.status === "cancelled") {
          await ctx.scheduler.runAfter(0, api.telegramNotifications.sendNotification, {
            userId: session.studentId,
            type: "meeting",
            key: `session-cancel:${session._id}`,
            title: "❌ جلسه لغو شد",
            message: `جلسه «${session.title}» لغو شد.\n🕐 زمان: ${session.date} — ${session.time}`,
            linkLabel: "مشاهده جلسه",
          });
        } else if (args.status === "done") {
          await ctx.scheduler.runAfter(0, api.telegramNotifications.sendNotification, {
            userId: session.studentId,
            type: "meeting",
            key: `session-done:${session._id}`,
            title: "✅ جلسه به پایان رسید",
            message: `جلسه «${session.title}» با ${session.mentorName} به پایان رسید.`,
            linkLabel: "مشاهده جلسه",
          });
        }
      } catch { /* notification failure should not break session update */ }
    }

    return await ctx.db.get(session._id);
  },
});

// ── Student list helper for mentors (to plan sessions) ─────────────────────
export const listStudents = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !(await isMentor(ctx))) return [];
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.role === "user" || u.role === "member" || !u.role)
      .map((u) => ({ _id: u._id, name: u.name ?? "کاربر", email: u.email ?? null }));
  },
});

// ── Mentor stats for the panel header ───────────────────────────────────────
export const mentorStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const [openQuestions, mySessions, myGroups] = await Promise.all([
      user.role === "mentor" || user.role === "admin"
        ? ctx.db
            .query("mentorQuestions")
            .filter((q) => q.eq(q.field("status"), "open"))
            .collect()
        : [],
      user.role === "mentor" || user.role === "admin"
        ? ctx.db
            .query("mentorSessions")
            .withIndex("by_mentor", (q) => q.eq("mentorId", user._id))
            .collect()
        : [],
      ctx.db
        .query("mentorGroups")
        .withIndex("by_mentor", (q) => q.eq("mentorId", user._id))
        .collect(),
    ]);
    return {
      openQuestions: openQuestions.length,
      sessions: mySessions.length,
      groups: myGroups.length,
    };
  },
});
