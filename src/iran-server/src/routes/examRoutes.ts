// @ts-nocheck
import { Context } from "hono";
import { db } from "../db.js";
import { exams, examResults, questions, dailyQuizzes, dailyQuizResults } from "../schema.js";
import { eq, desc, and } from "drizzle-orm";

// ── EXAM QUESTIONS ─────────────────────────────────────────────────────────
export async function getExamQuestions(c: Context) {
  const id = c.req.param("id");
  const exam = await db.select().from(exams).where(eq(exams.id, id));
  if (exam.length === 0) return c.json({ ok: false, error: "Exam not found" }, 404);
  const qIds = exam[0].questionIds ?? [];
  if (qIds.length === 0) return c.json({ ok: true, data: [] });
  const allQuestions = await db.select().from(questions);
  const filtered = allQuestions.filter((q) => qIds.includes(q.id));
  // Don't send correct answers
  const safe = filtered.map(({ correctAnswer, ...rest }) => rest);
  return c.json({ ok: true, data: safe });
}

// ── SUBMIT EXAM ────────────────────────────────────────────────────────────
export async function submitExam(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);

  const examId = c.req.param("id");
  const body = await c.req.json();
  const answers = body.answers as Record<string, string>;

  // Get exam and questions
  const exam = await db.select().from(exams).where(eq(exams.id, examId));
  if (exam.length === 0) return c.json({ ok: false, error: "Exam not found" }, 404);

  const qIds = exam[0].questionIds ?? [];
  const allQuestions = await db.select().from(questions);
  const examQuestions = allQuestions.filter((q) => qIds.includes(q.id));

  // Grade
  let score = 0;
  for (const q of examQuestions) {
    if (answers[q.id] === q.correctAnswer) score++;
  }

  const id = `er_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(examResults)// @ts-ignore.values({
    id,
    userId: user.id,
    examId,
    score,
    total: examQuestions.length,
    answers,
    startedAt: body.startedAt,
    completedAt: Date.now(),
    createdAt: Date.now(),
  });

  return c.json({ ok: true, data: { id, score, total: examQuestions.length } });
}

// ── MY EXAM RESULTS ────────────────────────────────────────────────────────
export async function getMyExamResults(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);
  const rows = await db.select().from(examResults)
    .where(eq(examResults.userId, user.id))
    .orderBy(desc(examResults.createdAt));
  return c.json({ ok: true, data: rows });
}

export async function getExamResult(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const rows = await db.select().from(examResults)
    .where(and(eq(examResults.id, id), eq(examResults.userId, user.id)));
  if (rows.length === 0) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json({ ok: true, data: rows[0] });
}

// ── DAILY QUIZ ─────────────────────────────────────────────────────────────
export async function getDailyQuiz(c: Context) {
  const today = new Date().toISOString().split("T")[0];
  const rows = await db.select().from(dailyQuizzes).where(eq(dailyQuizzes.date, today));
  if (rows.length === 0) return c.json({ ok: true, data: null });
  // Don't send correct answers
  const quiz = rows[0];
  const safeQuestions = (quiz.questions as any[])?.map((q: any) => ({
    id: q.id,
    text: q.text,
    options: q.options,
  })) ?? [];
  return c.json({ ok: true, data: { ...quiz, questions: safeQuestions } });
}

export async function submitDailyQuiz(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);

  const body = await c.req.json();
  const today = new Date().toISOString().split("T")[0];
  const quizzes = await db.select().from(dailyQuizzes).where(eq(dailyQuizzes.date, today));
  if (quizzes.length === 0) return c.json({ ok: false, error: "No quiz today" }, 404);

  const quiz = quizzes[0];
  const quizQuestions = (quiz.questions as any[]) ?? [];
  const answers = body.answers as Record<string, string>;
  let score = 0;
  for (const q of quizQuestions) {
    if (answers[q.id] === q.correctAnswer) score++;
  }

  const id = `dqr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(dailyQuizResults)// @ts-ignore.values({
    id,
    userId: user.id,
    quizId: quiz.id,
    score,
    answers,
    createdAt: Date.now(),
  });

  return c.json({ ok: true, data: { score, total: quizQuestions.length } });
}
