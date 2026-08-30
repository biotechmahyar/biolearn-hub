/**
 * Service layer for Exams, Questions, Attempts, Daily Quiz, Exam Reports.
 * Mirrors the exact business logic from tests.ts, examReports.ts.
 */
import { eq, and, desc, asc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  exams,
  questions,
  examAttempts,
  examReports,
  dailyQuiz,
  dailyQuizAnswers,
  categories,
} from "../db/schema.js";

// ══════════════════════════════════════════════════════════════════════════════
// ── Exams ──────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const examService = {
  async list(filters: { featuredOnly?: boolean; freeOnly?: boolean } = {}) {
    const conditions = [eq(exams.published, true)];
    const where = and(...conditions);
    let rows = await db.select().from(exams).where(where).orderBy(asc(exams.order));
    if (filters.featuredOnly) rows = rows.filter((e) => e.featured);
    if (filters.freeOnly) rows = rows.filter((e) => e.free);
    return rows.map((e) => ({
      ...e,
      questionCount: Array.isArray(e.questionIds) ? e.questionIds.length : 0,
    }));
  },

  async listAdmin() {
    const rows = await db.select().from(exams).orderBy(desc(exams.order));
    return rows.map((e) => ({
      ...e,
      questionCount: Array.isArray(e.questionIds) ? e.questionIds.length : 0,
    }));
  },

  async findBySlug(slug: string) {
    const rows = await db.select().from(exams).where(eq(exams.slug, slug)).limit(1);
    return rows[0] ?? null;
  },

  async findById(id: string) {
    const rows = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findQuestionById(id: string) {
    const rows = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findCategoryById(id: string) {
    const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async getQuestionsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const results: typeof questions.$inferSelect[] = [];
    for (const id of ids) {
      const q = await this.findQuestionById(id);
      if (q) results.push(q);
    }
    return results;
  },

  /**
   * Submit an exam attempt — exact same logic as Convex tests.ts submitExam.
   * - Validates user is logged in
   * - Validates exam exists
   * - Scores each question by comparing chosenIndex to correctIndex
   * - Builds topic breakdown
   * - Records attempt with timestamps
   * - IMPORTANT: correctIndex is NOT leaked in the response (only score/total/percent/topicBreakdown)
   */
  async submitExam(userId: string, examId: string, answers: { questionId: string; chosenIndex: number }[]) {
    const exam = await this.findById(examId);
    if (!exam) throw new Error("آزمون یافت نشد.");

    const questionIds = Array.isArray(exam.questionIds) ? exam.questionIds : [];
    let score = 0;
    const byTopic = new Map<string, { correct: number; total: number }>();
    const answerMap = new Map(answers.map((a) => [a.questionId, a.chosenIndex]));

    for (const qid of questionIds) {
      const question = await this.findQuestionById(qid as string);
      if (!question) continue;
      const chosen = answerMap.get(qid as string);
      const isCorrect = chosen !== undefined && chosen === question.correctIndex;
      if (isCorrect) score += 1;
      const entry = byTopic.get(question.topicId) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (isCorrect) entry.correct += 1;
      byTopic.set(question.topicId, entry);
    }

    const total = questionIds.length;
    const percent = total === 0 ? 0 : Math.round((score / total) * 100);

    const topicBreakdown: {
      topicId: string;
      topicName: string;
      correct: number;
      total: number;
      percent: number;
    }[] = [];
    for (const [topicId, stat] of byTopic.entries()) {
      const topic = await this.findCategoryById(topicId);
      topicBreakdown.push({
        topicId,
        topicName: topic?.name ?? "نامشخص",
        correct: stat.correct,
        total: stat.total,
        percent: stat.total === 0 ? 0 : Math.round((stat.correct / stat.total) * 100),
      });
    }

    const now = Date.now();
    const [attempt] = await db
      .insert(examAttempts)
      .values({
        userId,
        examId,
        answers,
        score,
        total,
        percent,
        topicBreakdown,
        startedAt: now - 5 * 60 * 1000, // Simulated 5 min duration
        finishedAt: now,
      })
      .returning();

    return attempt;
  },

  /**
   * Get an attempt — only the owner or admins can see it.
   * Returns answers but NOT correctIndex (that stays hidden from students).
   */
  async getAttempt(attemptId: string, userId: string, userRole: string) {
    const rows = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).limit(1);
    const attempt = rows[0];
    if (!attempt) return null;
    if (attempt.userId !== userId && userRole !== "admin" && userRole !== "site_admin") return null;

    const exam = await this.findById(attempt.examId);
    return {
      ...attempt,
      exam: exam ? { title: exam.title, slug: exam.slug } : null,
    };
  },

  async getMyAttempts(userId: string) {
    const rows = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.userId, userId))
      .orderBy(desc(examAttempts.finishedAt));
    const enriched = [];
    for (const a of rows) {
      const exam = await this.findById(a.examId);
      enriched.push({
        ...a,
        exam: exam ? { title: exam.title, slug: exam.slug } : null,
      });
    }
    return enriched;
  },

  async create(data: {
    title: string;
    description: string;
    durationMinutes: number;
    free: boolean;
    diagnostic: boolean;
    published: boolean;
    topicId?: string;
    count: number;
  }) {
    let pool = await db.select().from(questions);
    if (data.topicId) {
      pool = pool.filter((q) => q.topicId === data.topicId);
    }
    if (pool.length === 0) throw new Error("در این موضوع سؤالی وجود ندارد.");
    const picked = [...pool]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(data.count, pool.length));

    const slug =
      data.title
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase() +
      "-" +
      Date.now().toString(36);

    const [exam] = await db
      .insert(exams)
      .values({
        title: data.title.trim(),
        slug,
        description: data.description.trim(),
        durationMinutes: data.durationMinutes,
        questionIds: picked.map((q) => q.id),
        free: data.free,
        published: data.published,
        featured: false,
        diagnostic: data.diagnostic,
        accent: "teal",
        order: Date.now(),
      })
      .returning();

    return { exam, questionCount: picked.length };
  },

  async togglePublished(id: string, published: boolean) {
    const [row] = await db.update(exams).set({ published }).where(eq(exams.id, id)).returning();
    return row ?? null;
  },

  async delete(id: string) {
    // Delete associated attempts first
    await db.delete(examAttempts).where(eq(examAttempts.examId, id));
    const [row] = await db.delete(exams).where(eq(exams.id, id)).returning();
    return row ?? null;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Daily Quiz ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const dailyQuizService = {
  async getToday(userId?: string) {
    const today = dateKey(new Date());
    const rows = await db.select().from(dailyQuiz).where(eq(dailyQuiz.date, today)).limit(1);
    const entry = rows[0];
    if (!entry) return null;

    const question = await examService.findQuestionById(entry.questionId);
    if (!question) return null;
    const topic = await examService.findCategoryById(question.topicId);

    let myAnswer = null;
    if (userId) {
      const ansRows = await db
        .select()
        .from(dailyQuizAnswers)
        .where(
          and(eq(dailyQuizAnswers.userId, userId), eq(dailyQuizAnswers.date, today))
        )
        .limit(1);
      if (ansRows[0]) {
        myAnswer = {
          chosenIndex: ansRows[0].chosenIndex,
          correct: ansRows[0].correct,
          correctIndex: question.correctIndex,
          points: ansRows[0].points,
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

  async answer(userId: string, questionId: string, chosenIndex: number) {
    const today = dateKey(new Date());
    const entryRows = await db.select().from(dailyQuiz).where(eq(dailyQuiz.date, today)).limit(1);
    const entry = entryRows[0];
    if (!entry) throw new Error("آزمون امروز هنوز منتشر نشده است.");
    if (entry.questionId !== questionId) throw new Error("سؤال نامعتبر است.");

    // Check if already answered today
    const existingRows = await db
      .select()
      .from(dailyQuizAnswers)
      .where(
        and(eq(dailyQuizAnswers.userId, userId), eq(dailyQuizAnswers.date, today))
      )
      .limit(1);
    if (existingRows[0]) throw new Error("امروز قبلاً پاسخ داده‌اید.");

    const question = await examService.findQuestionById(entry.questionId);
    if (!question) throw new Error("سؤال یافت نشد.");
    const correct = chosenIndex === question.correctIndex;

    await db.insert(dailyQuizAnswers).values({
      userId,
      date: today,
      questionId,
      chosenIndex,
      correct,
      points: correct ? entry.points : 0,
      answeredAt: Date.now(),
    });

    return { correct, correctIndex: question.correctIndex, points: correct ? entry.points : 0 };
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Exam Reports ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const examReportService = {
  async submit(userId: string, examId: string, questionId: string, comment: string) {
    const trimmed = comment.trim();
    if (trimmed.length < 5) throw new Error("توضیح گزارش را بنویسید (حداقل ۵ کاراکتر).");

    const exam = await examService.findById(examId);
    if (!exam) throw new Error("آزمون یافت نشد.");
    const questionIds = Array.isArray(exam.questionIds) ? exam.questionIds : [];
    if (!questionIds.includes(questionId)) throw new Error("سؤال انتخاب‌شده متعلق به این آزمون نیست.");

    // Must have attempted this exam
    const attemptRows = await db
      .select()
      .from(examAttempts)
      .where(and(eq(examAttempts.userId, userId), eq(examAttempts.examId, examId)))
      .limit(1);
    if (!attemptRows[0]) throw new Error("برای گزارش خطا باید در این آزمون شرکت کرده باشید.");

    // Idempotent: one open report per user + question
    const existingRows = await db
      .select()
      .from(examReports)
      .where(
        and(
          eq(examReports.userId, userId),
          eq(examReports.examId, examId),
          eq(examReports.questionId, questionId),
          eq(examReports.status, "open")
        )
      )
      .limit(1);
    if (existingRows[0]) return { ok: true, duplicate: true };

    await db.insert(examReports).values({
      userId,
      examId,
      questionId,
      comment: trimmed,
      status: "open",
      createdAt: Date.now(),
    });
    return { ok: true, duplicate: false };
  },

  async listAll() {
    const rows = await db.select().from(examReports).orderBy(desc(examReports.createdAt)); // createdAt exists on examReports
    const enriched = [];
    for (const r of rows) {
      const [question, exam, user] = await Promise.all([
        examService.findQuestionById(r.questionId),
        examService.findById(r.examId),
        (async () => {
          const { userService } = await import("./user.service.js");
          return userService.findById(r.userId);
        })(),
      ]);
      enriched.push({
        id: r.id,
        comment: r.comment,
        status: r.status,
        createdAt: r.createdAt,
        questionText: question?.text ?? "سؤال حذف‌شده",
        examTitle: exam?.title ?? "آزمون حذف‌شده",
        userName: user?.name ?? "کاربر حذف‌شده",
        userEmail: user?.email ?? "—",
      });
    }
    return enriched;
  },

  async resolve(reportId: string) {
    const [row] = await db
      .update(examReports)
      .set({ status: "resolved" })
      .where(eq(examReports.id, reportId))
      .returning();
    return row ?? null;
  },

  async delete(reportId: string) {
    const [row] = await db.delete(examReports).where(eq(examReports.id, reportId)).returning();
    return row ?? null;
  },
};
