import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { isAdmin } from "./admin";

// ── Role helpers ────────────────────────────────────────────────────────────
const isMentor = async (ctx: any) => {
  const user = await getCurrentUser(ctx);
  return !!user && (user.role === "mentor" || user.role === "admin");
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
    if (user.role === "mentor" || user.role === "admin") {
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
  },
});

export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    if (user.role === "mentor" || user.role === "admin") {
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
    await ctx.db.patch(session._id, { status: args.status as any });
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
