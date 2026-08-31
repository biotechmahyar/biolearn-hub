import { db } from "../db/index.js";
import { exams, questions, examAttempts, examReports, dailyQuiz, dailyQuizAnswers, categories } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── Public exam queries ───────────────────────────────────────────────────
export async function listExams(opts: { featuredOnly?: boolean; freeOnly?: boolean }) {
  let rows = await db.query.exams.findMany({
    where: eq(exams.published, true),
    orderBy: (e, { asc }) => [asc(e.order)],
  });
  if (opts.featuredOnly) rows = rows.filter((e) => e.featured);
  if (opts.freeOnly) rows = rows.filter((e) => e.free);
  return rows.map((e) => ({ ...e, questionCount: (e.questionIds as string[])?.length ?? 0 }));
}

export async function getExamBySlug(slug: string) {
  const exam = await db.query.exams.findFirst({ where: eq(exams.slug, slug) });
  if (!exam) return null;
  const qIds = (exam.questionIds as string[]) ?? [];
  const qs = [];
  for (const qid of qIds) {
    const q = await db.query.questions.findFirst({ where: eq(questions.id, qid) });
    if (q) {
      const topic = q.topicId ? await db.query.categories.findFirst({ where: eq(categories.id, q.topicId) }) : null;
      qs.push({ ...q, topic: topic ? { name: topic.name, accent: topic.accent } : null });
    }
  }
  return { ...exam, questions: qs };
}

// ── Exam submission ───────────────────────────────────────────────────────
export async function submitExam(userId: string, examId: string, answers: { questionId: string; chosenIndex: number }[]) {
  const exam = await db.query.exams.findFirst({ where: eq(exams.id, examId) });
  if (!exam) throw new Error("آزمون یافت نشد.");

  let score = 0;
  const byTopic = new Map<string, { correct: number; total: number }>();
  const answerMap = new Map(answers.map((a) => [a.questionId, a.chosenIndex]));

  const qIds = (exam.questionIds as string[]) ?? [];
  for (const qid of qIds) {
    const question = await db.query.questions.findFirst({ where: eq(questions.id, qid) });
    if (!question) continue;
    const chosen = answerMap.get(qid);
    const isCorrect = chosen !== undefined && chosen === question.correctIndex;
    if (isCorrect) score += 1;
    const entry = byTopic.get(question.topicId ?? "") ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (isCorrect) entry.correct += 1;
    byTopic.set(question.topicId ?? "", entry);
  }

  const total = qIds.length;
  const percent = total === 0 ? 0 : Math.round((score / total) * 100);

  const topicBreakdown = [];
  for (const [topicId, stat] of byTopic.entries()) {
    const topic = topicId ? await db.query.categories.findFirst({ where: eq(categories.id, topicId) }) : null;
    topicBreakdown.push({
      topicId,
      topicName: topic?.name ?? "نامشخص",
      correct: stat.correct,
      total: stat.total,
      percent: stat.total === 0 ? 0 : Math.round((stat.correct / stat.total) * 100),
    });
  }

  const now = Date.now();
  const [attempt] = await db.insert(examAttempts).values({
    userId,
    examId,
    answers,
    score,
    total,
    percent,
    topicBreakdown,
    startedAt: now - 5 * 60 * 1000,
    finishedAt: now,
  }).returning();

  return attempt;
}

export async function getAttempt(attemptId: string, userId: string, isAdmin: boolean) {
  const attempt = await db.query.examAttempts.findFirst({ where: eq(examAttempts.id, attemptId) });
  if (!attempt) return null;
  if (attempt.userId !== userId && !isAdmin) return null;

  const exam = await db.query.exams.findFirst({ where: eq(exams.id, attempt.examId) });
  const ans = (attempt.answers as { questionId: string; chosenIndex: number }[]) ?? [];
  const questionsData = [];
  for (const a of ans) {
    const q = await db.query.questions.findFirst({ where: eq(questions.id, a.questionId) });
    if (q) questionsData.push({ ...q, chosenIndex: a.chosenIndex });
  }

  return {
    ...attempt,
    exam: exam ? { title: exam.title, slug: exam.slug } : null,
    questions: questionsData,
  };
}

export async function getMyAttempts(userId: string) {
  const attempts = await db.query.examAttempts.findMany({
    where: eq(examAttempts.userId, userId),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });
  const result = [];
  for (const a of attempts) {
    const exam = await db.query.exams.findFirst({ where: eq(exams.id, a.examId) });
    result.push({ ...a, exam: exam ? { title: exam.title, slug: exam.slug } : null });
  }
  return result;
}

// ── Daily Quiz ────────────────────────────────────────────────────────────
export async function getDailyQuiz(userId?: string) {
  const today = dateKey(new Date());
  const entry = await db.query.dailyQuiz.findFirst({ where: eq(dailyQuiz.date, today) });
  if (!entry) return null;

  const question = await db.query.questions.findFirst({ where: eq(questions.id, entry.questionId) });
  if (!question) return null;
  const topic = question.topicId ? await db.query.categories.findFirst({ where: eq(categories.id, question.topicId) }) : null;

  let myAnswer: any = null;
  if (userId) {
    const ans = await db.query.dailyQuizAnswers.findFirst({
      where: and(eq(dailyQuizAnswers.userId, userId), eq(dailyQuizAnswers.date, today)),
    });
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
    question: { ...question, topic: topic ? { name: topic.name, accent: topic.accent } : null },
    myAnswer,
  };
}

export async function answerDailyQuiz(userId: string, questionId: string, chosenIndex: number) {
  const today = dateKey(new Date());
  const entry = await db.query.dailyQuiz.findFirst({ where: eq(dailyQuiz.date, today) });
  if (!entry) throw new Error("آزمون امروز هنوز منتشر نشده است.");
  if (entry.questionId !== questionId) throw new Error("سؤال نامعتبر است.");

  const existing = await db.query.dailyQuizAnswers.findFirst({
    where: and(eq(dailyQuizAnswers.userId, userId), eq(dailyQuizAnswers.date, today)),
  });
  if (existing) throw new Error("امروز قبلاً پاسخ داده‌اید.");

  const question = await db.query.questions.findFirst({ where: eq(questions.id, questionId) });
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
}

// ── Learning Profile ──────────────────────────────────────────────────────
export async function getMyLearningProfile(userId: string) {
  const attempts = await db.query.examAttempts.findMany({
    where: eq(examAttempts.userId, userId),
  });
  const quizAnswers = await db.query.dailyQuizAnswers.findMany({
    where: eq(dailyQuizAnswers.userId, userId),
  });

  const byTopic = new Map<string, { name: string; correct: number; total: number }>();
  for (const a of attempts) {
    const tb = (a.topicBreakdown as any[]) ?? [];
    for (const t of tb) {
      const e = byTopic.get(t.topicId) ?? { name: t.topicName, correct: 0, total: 0 };
      e.correct += t.correct;
      e.total += t.total;
      byTopic.set(t.topicId, e);
    }
  }
  for (const qa of quizAnswers) {
    const q = await db.query.questions.findFirst({ where: eq(questions.id, qa.questionId) });
    if (!q) continue;
    const topic = q.topicId ? await db.query.categories.findFirst({ where: eq(categories.id, q.topicId) }) : null;
    const e = byTopic.get(q.topicId ?? "") ?? { name: topic?.name ?? "نامشخص", correct: 0, total: 0 };
    e.total += 1;
    if (qa.correct) e.correct += 1;
    byTopic.set(q.topicId ?? "", e);
  }

  const topics = [...byTopic.entries()].map(([topicId, s]) => ({
    topicId,
    name: s.name,
    correct: s.correct,
    total: s.total,
    percent: s.total === 0 ? 0 : Math.round((s.correct / s.total) * 100),
  }));

  return {
    totalAttempts: attempts.length,
    totalDailyQuizzes: quizAnswers.length,
    topics,
  };
}

// ── Exam Reports ──────────────────────────────────────────────────────────
export async function submitExamReport(userId: string, questionId: string, reason: string, details?: string) {
  const [row] = await db.insert(examReports).values({
    userId,
    questionId,
    reason,
    details,
  }).returning();
  return row;
}

// ── Admin Exam Management ─────────────────────────────────────────────────
export async function listAllExams() {
  return db.query.exams.findMany({ orderBy: (e, { desc }) => [desc(e.createdAt)] });
}

export async function createExam(data: Record<string, any>) {
  const slug = data.slug || data.title?.toLowerCase().replace(/\s+/g, "-") || "exam";
  const [row] = await db.insert(exams).values({ ...data, slug }).returning();
  return row;
}

export async function toggleExamPublish(id: string) {
  const exam = await db.query.exams.findFirst({ where: eq(exams.id, id) });
  if (!exam) throw new Error("آزمون یافت نشد.");
  const [row] = await db.update(exams).set({ published: !exam.published }).where(eq(exams.id, id)).returning();
  return row;
}

export async function deleteExam(id: string) {
  await db.delete(exams).where(eq(exams.id, id));
}
