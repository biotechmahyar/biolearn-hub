import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// ── Helpers ─────────────────────────────────────────────────────────────────
function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function resolveUserName(ctx: any, userId: Id<"users">) {
  const u = await ctx.db.get(userId);
  return (u as any)?.name ?? "نامشخص";
}

async function resolveUserEmail(ctx: any, userId: Id<"users">) {
  const u = await ctx.db.get(userId);
  return (u as any)?.email ?? "";
}

// ── Admin: list daily quiz entries ──────────────────────────────────────────
export const listEntries = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin"))
      throw new Error("دسترسی غیرمجاز.");

    const entries = await ctx.db.query("dailyQuiz").collect();
    const enriched = await Promise.all(
      entries.map(async (e) => {
        const question = await ctx.db.get(e.questionId);
        const qDoc = question as any;
        const topic = qDoc?.topicId
          ? ((await ctx.db.get(qDoc.topicId)) as any)
          : null;
        return {
          ...e,
          questionText: qDoc?.text ?? "حذف شده",
          topicName: topic?.name ?? "—",
        };
      }),
    );
    return enriched.sort((a, b) => b.date.localeCompare(a.date));
  },
});

// ── Admin: create daily quiz for a specific date ───────────────────────────
export const createEntry = mutation({
  args: {
    date: v.string(),
    questionId: v.id("questions"),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin"))
      throw new Error("دسترسی غیرمجاز.");

    const existing = await ctx.db
      .query("dailyQuiz")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
    if (existing) {
      throw new Error(
        `برای تاریخ ${args.date} قبلاً کوئیز تعریف شده است. ابتدا آن را حذف کنید.`,
      );
    }

    const question = await ctx.db.get(args.questionId);
    if (!question) throw new Error("سؤال یافت نشد.");

    await ctx.db.insert("dailyQuiz", {
      date: args.date,
      questionId: args.questionId,
      points: args.points,
    });
    return { ok: true };
  },
});

// ── Admin: delete daily quiz entry ─────────────────────────────────────────
export const deleteEntry = mutation({
  args: { id: v.id("dailyQuiz") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin"))
      throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Admin: auto-fill upcoming dates from question bank ──────────────────────
export const autoFill = mutation({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    pointsPerQuestion: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin"))
      throw new Error("دسترسی غیرمجاز.");

    const allQuestions = await ctx.db.query("questions").collect();
    const usedQuestions = new Set<string>();
    const existingEntries = await ctx.db.query("dailyQuiz").collect();
    for (const e of existingEntries) {
      if (e.date >= args.startDate && e.date <= args.endDate) {
        usedQuestions.add(e.questionId);
      }
    }

    const available = allQuestions.filter(
      (q: any) => !usedQuestions.has(q._id) && q.options && q.options.length >= 2,
    );

    // Shuffle
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    const start = new Date(args.startDate);
    const end = new Date(args.endDate);
    let created = 0;
    let qIdx = 0;

    for (
      let d = new Date(start);
      d <= end;
      d.setDate(d.getDate() + 1)
    ) {
      const dk = dateKey(d);
      const existing = await ctx.db
        .query("dailyQuiz")
        .withIndex("by_date", (q) => q.eq("date", dk))
        .first();
      if (existing) continue;
      if (qIdx >= available.length) break;

      await ctx.db.insert("dailyQuiz", {
        date: dk,
        questionId: available[qIdx]._id,
        points: args.pointsPerQuestion,
      });
      qIdx++;
      created++;
    }

    return { created };
  },
});

// ── Admin: monthly leaderboard ─────────────────────────────────────────────
export const getLeaderboard = query({
  args: { month: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const mk = args.month || monthKey(new Date());

    const allAnswers = await ctx.db.query("dailyQuizAnswers").collect();
    const monthAnswers = allAnswers.filter((a) => a.date.startsWith(mk));

    const byUser = new Map<
      string,
      { userId: string; correct: number; total: number; points: number }
    >();
    for (const a of monthAnswers) {
      const existing = byUser.get(a.userId) ?? {
        userId: a.userId,
        correct: 0,
        total: 0,
        points: 0,
      };
      existing.total += 1;
      if (a.correct) existing.correct += 1;
      existing.points += a.points;
      byUser.set(a.userId, existing);
    }

    const leaderboard = [...byUser.values()]
      .sort((a, b) => b.points - a.points || b.correct - a.correct)
      .slice(0, 50);

    const enriched = await Promise.all(
      leaderboard.map(async (entry) => {
        const name = await resolveUserName(ctx, entry.userId as Id<"users">);
        const email = await resolveUserEmail(ctx, entry.userId as Id<"users">);
        return { ...entry, name, email };
      }),
    );

    return { month: mk, leaderboard: enriched };
  },
});

// ── Admin: monthly history (past months leaderboard) ────────────────────────
export const getLeaderboardHistory = query({
  args: {},
  handler: async (ctx) => {
    const allAnswers = await ctx.db.query("dailyQuizAnswers").collect();
    const byMonth = new Map<string, typeof allAnswers>();
    for (const a of allAnswers) {
      const mk = a.date.slice(0, 7);
      const arr = byMonth.get(mk) ?? [];
      arr.push(a);
      byMonth.set(mk, arr);
    }

    const months = [...byMonth.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12);

    const result = [];
    for (const [mk, answers] of months) {
      const byUser = new Map<
        string,
        { userId: string; correct: number; total: number; points: number }
      >();
      for (const a of answers) {
        const existing = byUser.get(a.userId) ?? {
          userId: a.userId,
          correct: 0,
          total: 0,
          points: 0,
        };
        existing.total += 1;
        if (a.correct) existing.correct += 1;
        existing.points += a.points;
        byUser.set(a.userId, existing);
      }

      const top5 = [...byUser.values()]
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

      const enriched = await Promise.all(
        top5.map(async (entry) => {
          const name = await resolveUserName(ctx, entry.userId as Id<"users">);
          return { ...entry, name };
        }),
      );

      result.push({ month: mk, top5: enriched });
    }

    return result;
  },
});

// ── Admin: delete all leaderboard data for a month ─────────────────────────
export const resetMonth = mutation({
  args: { month: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin"))
      throw new Error("دسترسی غیرمجاز.");

    const allAnswers = await ctx.db.query("dailyQuizAnswers").collect();
    const toDelete = allAnswers.filter((a) => a.date.startsWith(args.month));

    for (const a of toDelete) {
      await ctx.db.delete(a._id);
    }

    return { deleted: toDelete.length };
  },
});

// ── Public: leaderboard for display on site ─────────────────────────────────
export const getPublicLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const mk = monthKey(new Date());
    const allAnswers = await ctx.db.query("dailyQuizAnswers").collect();
    const monthAnswers = allAnswers.filter((a) => a.date.startsWith(mk));

    const byUser = new Map<
      string,
      { userId: string; correct: number; total: number; points: number }
    >();
    for (const a of monthAnswers) {
      const existing = byUser.get(a.userId) ?? {
        userId: a.userId,
        correct: 0,
        total: 0,
        points: 0,
      };
      existing.total += 1;
      if (a.correct) existing.correct += 1;
      existing.points += a.points;
      byUser.set(a.userId, existing);
    }

    const top10 = [...byUser.values()]
      .sort((a, b) => b.points - a.points || b.correct - a.correct)
      .slice(0, 10);

    const enriched = await Promise.all(
      top10.map(async (entry, idx) => {
        const name = await resolveUserName(ctx, entry.userId as Id<"users">);
        return {
          rank: idx + 1,
          name,
          correct: entry.correct,
          total: entry.total,
          points: entry.points,
        };
      }),
    );

    return { month: mk, leaderboard: enriched };
  },
});

// ── Admin: question bank stats ──────────────────────────────────────────────
export const getQuestionBankStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin"))
      throw new Error("دسترسی غیرمجاز.");

    const questions = await ctx.db.query("questions").collect();
    return { totalQuestions: questions.length };
  },
});

// ── Admin: AI-generate questions for daily quiz ────────────────────────────
export const aiGenerateQuestions = action({
  args: {
    topic: v.string(),
    date: v.string(),
    count: v.number(),
    pointsPerQuestion: v.number(),
  },
  handler: async (ctx, args): Promise<{ created: number; questionIds: string[] }> => {
    // Use the existing AI question generation
    const result = await ctx.runAction("aiActions:generateQuestions" as any, {
      prompt: `سؤالات چهارگزینه‌ای درباره: ${args.topic}`,
      count: args.count,
      difficulty: 2,
    });

    if (!result.questions || result.questions.length === 0) {
      throw new Error("سؤالی تولید نشد.");
    }

    // Save questions to the question bank
    const questionIds: string[] = [];
    for (const q of result.questions) {
      const qId = await ctx.runMutation(internal.dailyQuizAdmin.saveGeneratedQuestion, {
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        difficulty: q.difficulty ?? 2,
      });
      questionIds.push(qId);
    }

    return { created: questionIds.length, questionIds };
  },
});

// Internal: save a generated question to the bank
export const saveGeneratedQuestion = internalMutation({
  args: {
    text: v.string(),
    options: v.array(v.string()),
    correctIndex: v.number(),
    explanation: v.string(),
    difficulty: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin"))
      throw new Error("دسترسی غیرمجاز.");

    const id = await ctx.db.insert("questions", {
      text: args.text,
      options: args.options,
      correctIndex: args.correctIndex,
      explanation: args.explanation,
      difficulty: args.difficulty,
      topicId: "" as any,
    });
    return id;
  },
});

// ── Admin: publish multiple questions for a date ────────────────────────────
export const publishMultipleForDate = mutation({
  args: {
    date: v.string(),
    questionIds: v.array(v.id("questions")),
    pointsPerQuestion: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin"))
      throw new Error("دسترسی غیرمجاز.");

    // Delete existing entries for this date
    const existing = await ctx.db
      .query("dailyQuiz")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
    for (const e of existing) {
      await ctx.db.delete(e._id);
    }

    // Insert new entries
    let created = 0;
    for (const qId of args.questionIds) {
      await ctx.db.insert("dailyQuiz", {
        date: args.date,
        questionId: qId,
        points: args.pointsPerQuestion,
      });
      created++;
    }

    return { created };
  },
});
