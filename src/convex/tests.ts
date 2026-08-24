import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ── Exams ───────────────────────────────────────────────────────────────────
export const listExams = query({
  args: { featuredOnly: v.optional(v.boolean()), freeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    let exams = await ctx.db
      .query("exams")
      .filter((q) => q.eq(q.field("published"), true))
      .collect();
    if (args.featuredOnly) exams = exams.filter((e) => e.featured);
    if (args.freeOnly) exams = exams.filter((e) => e.free);
    exams = exams.sort((a, b) => a.order - b.order);
    return exams.map((e) => ({ ...e, questionCount: e.questionIds.length }));
  },
});

export const getExam = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const exam = await ctx.db
      .query("exams")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!exam) return null;
    const questions = await Promise.all(
      exam.questionIds.map(async (id) => {
        const q = await ctx.db.get(id);
        if (!q) return null;
        const topic = await ctx.db.get(q.topicId);
        return { ...q, topic: topic ? { name: topic.name, accent: topic.accent } : null };
      }),
    );
    return { ...exam, questions: questions.filter(Boolean) };
  },
});

export const getExamById = query({
  args: { id: v.id("exams") },
  handler: async (ctx, args) => {
    const exam = await ctx.db.get(args.id);
    if (!exam) return null;
    const questions = await Promise.all(
      exam.questionIds.map(async (id) => {
        const q = await ctx.db.get(id);
        if (!q) return null;
        const topic = await ctx.db.get(q.topicId);
        return { ...q, topic: topic ? { name: topic.name, accent: topic.accent } : null };
      }),
    );
    return { ...exam, questions: questions.filter(Boolean) };
  },
});

// ── Attempts ────────────────────────────────────────────────────────────────
export const submitExam = mutation({
  args: {
    examId: v.id("exams"),
    answers: v.array(
      v.object({ questionId: v.id("questions"), chosenIndex: v.number() }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ثبت آزمون ابتدا وارد حساب شوید.");

    const exam = await ctx.db.get(args.examId);
    if (!exam) throw new Error("آزمون یافت نشد.");

    let score = 0;
    const byTopic = new Map<string, { correct: number; total: number }>();
    const answerMap = new Map(
      args.answers.map((a) => [a.questionId, a.chosenIndex]),
    );

    for (const qid of exam.questionIds) {
      const question = await ctx.db.get(qid);
      if (!question) continue;
      const chosen = answerMap.get(qid);
      const isCorrect = chosen !== undefined && chosen === question.correctIndex;
      if (isCorrect) score += 1;
      const entry = byTopic.get(question.topicId) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (isCorrect) entry.correct += 1;
      byTopic.set(question.topicId, entry);
    }

    const total = exam.questionIds.length;
    const percent = total === 0 ? 0 : Math.round((score / total) * 100);

    const topicBreakdown = [];
    for (const [topicId, stat] of byTopic.entries()) {
      const topic = (await ctx.db.get(topicId as any)) as any;
      topicBreakdown.push({
        topicId: topicId as any,
        topicName: topic?.name ?? "نامشخص",
        correct: stat.correct,
        total: stat.total,
        percent: stat.total === 0 ? 0 : Math.round((stat.correct / stat.total) * 100),
      });
    }

    const attemptId = await ctx.db.insert("examAttempts", {
      userId: user._id,
      examId: exam._id,
      answers: args.answers,
      score,
      total,
      percent,
      topicBreakdown,
      startedAt: Date.now() - 5 * 60 * 1000,
      finishedAt: Date.now(),
    });

    return await ctx.db.get(attemptId);
  },
});

export const getAttempt = query({
  args: { attemptId: v.id("examAttempts") },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) return null;
    const user = await getCurrentUser(ctx);
    if (!user || (attempt.userId !== user._id && !(user.role === "admin" || user.role === "site_admin"))) {
      return null;
    }
    const exam = await ctx.db.get(attempt.examId);
    const questions = await Promise.all(
      attempt.answers.map(async (a) => {
        const q = await ctx.db.get(a.questionId);
        return q ? { ...q, chosenIndex: a.chosenIndex } : null;
      }),
    );
    return {
      ...attempt,
      exam: exam ? { title: exam.title, slug: exam.slug } : null,
      questions: questions.filter(Boolean),
    };
  },
});

export const getMyAttempts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const attempts = await ctx.db
      .query("examAttempts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    return Promise.all(
      attempts.map(async (a) => {
        const exam = await ctx.db.get(a.examId);
        return { ...a, exam: exam ? { title: exam.title, slug: exam.slug } : null };
      }),
    );
  },
});

// ── Daily quiz ──────────────────────────────────────────────────────────────
function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const getDailyQuiz = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const today = dateKey(new Date());

    const entry = await ctx.db
      .query("dailyQuiz")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();
    if (!entry) return null;
    const question = await ctx.db.get(entry.questionId);
    if (!question) return null;
    const topic = await ctx.db.get(question.topicId);

    let myAnswer: { chosenIndex: number; correct: boolean; correctIndex: number; points: number } | null =
      null;
    if (user) {
      const ans = await ctx.db
        .query("dailyQuizAnswers")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("date"), today))
        .first();
      if (ans) {
        myAnswer = {
          chosenIndex: ans.chosenIndex,
          correct: ans.correct,
          correctIndex: question.correctIndex,
          points: ans.points,
        };
      }
    }

    return {
      date: today,
      points: entry.points,
      question: {
        ...question,
        topic: topic ? { name: topic.name, accent: topic.accent } : null,
      },
      myAnswer,
    };
  },
});

export const answerDailyQuiz = mutation({
  args: { questionId: v.id("questions"), chosenIndex: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای شرکت در آزمون روزانه ابتدا وارد حساب شوید.");

    const today = dateKey(new Date());
    const entry = await ctx.db
      .query("dailyQuiz")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();
    if (!entry) throw new Error("آزمون امروز هنوز منتشر نشده است.");
    if (entry.questionId !== args.questionId) {
      throw new Error("سؤال نامعتبر است.");
    }
    const existing = await ctx.db
      .query("dailyQuizAnswers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("date"), today))
      .first();
    if (existing) {
      throw new Error("امروز قبلاً پاسخ داده‌اید.");
    }

    const question = await ctx.db.get(entry.questionId);
    if (!question) throw new Error("سؤال یافت نشد.");
    const correct = args.chosenIndex === question.correctIndex;

    await ctx.db.insert("dailyQuizAnswers", {
      userId: user._id,
      date: today,
      questionId: args.questionId,
      chosenIndex: args.chosenIndex,
      correct,
      points: correct ? entry.points : 0,
      answeredAt: Date.now(),
    });

    return { correct, correctIndex: question.correctIndex, points: correct ? entry.points : 0 };
  },
});

// ── Student learning profile ────────────────────────────────────────────────
export const getMyLearningProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const attempts = await ctx.db
      .query("examAttempts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const quizAnswers = await ctx.db
      .query("dailyQuizAnswers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const byTopic = new Map<
      string,
      { name: string; correct: number; total: number }
    >();
    for (const a of attempts) {
      for (const tb of a.topicBreakdown) {
        const e = byTopic.get(tb.topicId) ?? { name: tb.topicName, correct: 0, total: 0 };
        e.correct += tb.correct;
        e.total += tb.total;
        byTopic.set(tb.topicId, e);
      }
    }
    for (const qa of quizAnswers) {
      const q = await ctx.db.get(qa.questionId);
      if (!q) continue;
      const e = byTopic.get(q.topicId) ?? {
        name: (await ctx.db.get(q.topicId))?.name ?? "نامشخص",
        correct: 0,
        total: 0,
      };
      e.total += 1;
      if (qa.correct) e.correct += 1;
      byTopic.set(q.topicId, e);
    }

    const topics = [...byTopic.entries()].map(([topicId, s]) => ({
      topicId,
      topicName: s.name,
      correct: s.correct,
      total: s.total,
      percent: s.total === 0 ? 0 : Math.round((s.correct / s.total) * 100),
      level: s.total === 0 ? "none" : s.correct / s.total >= 0.7 ? "strong" : s.correct / s.total >= 0.4 ? "medium" : "weak",
    }));

    const totalAnswered = topics.reduce((acc, t) => acc + t.total, 0);
    const totalCorrect = topics.reduce((acc, t) => acc + t.correct, 0);
    const avgPercent =
      totalAnswered === 0 ? 0 : Math.round((totalCorrect / totalAnswered) * 100);
    const totalPoints = quizAnswers.reduce((acc, qa) => acc + qa.points, 0);

    return { topics, totalAnswered, avgPercent, totalPoints, testsTaken: attempts.length };
  },
});
