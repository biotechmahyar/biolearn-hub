import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  exams,
  questions,
  examAttempts,
  examReports,
  dailyQuiz,
  dailyQuizAnswers,
} from "../db/schema.js";
import { NotFoundError, BadRequestError, ForbiddenError } from "../lib/errors.js";

// ─── Exams ───────────────────────────────────────────────────────────────────

export async function listExams() {
  const db = getDb();
  return db
    .select()
    .from(exams)
    .where(eq(exams.published, true))
    .orderBy(desc(exams.createdAt));
}

export async function getExamBySlug(slug: string) {
  const db = getDb();
  const [exam] = await db
    .select()
    .from(exams)
    .where(eq(exams.slug, slug))
    .limit(1);
  return exam || null;
}

export async function adminListExams() {
  const db = getDb();
  return db.select().from(exams).orderBy(desc(exams.createdAt));
}

export async function createExam(data: Record<string, unknown>) {
  const db = getDb();
  const now = Date.now();
  const [exam] = await db
    .insert(exams)
    .values({ ...data, createdAt: now, updatedAt: now } as any)
    .returning();
  return exam;
}

export async function toggleExamPublish(id: string) {
  const db = getDb();
  const [exam] = await db
    .select({ published: exams.published })
    .from(exams)
    .where(eq(exams.id, id))
    .limit(1);
  if (!exam) throw new NotFoundError("Exam");
  const [updated] = await db
    .update(exams)
    .set({ published: !exam.published, updatedAt: Date.now() })
    .where(eq(exams.id, id))
    .returning();
  return updated;
}

export async function deleteExam(id: string) {
  const db = getDb();
  await db.delete(exams).where(eq(exams.id, id));
}

// ─── Submit Exam ─────────────────────────────────────────────────────────────

export async function submitExam(
  userId: string,
  examId: string,
  answers: Array<{ questionId: string; chosenIndex: number }>
) {
  const db = getDb();

  // Validate exam exists
  const [exam] = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);
  if (!exam) throw new NotFoundError("Exam");

  // Fetch all questions for this exam
  const examQuestions = await db
    .select()
    .from(questions)
    .where(
      eq(questions.id, examId) // We'll filter by IDs below
    );

  // Get questions by their IDs from the exam's questionIds
  const qIds = (exam.questionIds as string[]) || [];
  if (qIds.length === 0) throw new BadRequestError("Exam has no questions");

  // Fetch questions one by one (could optimize with IN clause)
  const allQuestions: Array<{
    id: string;
    correctIndex: number;
    topicId: string | null;
    topicName: string | null;
  }> = [];

  for (const qId of qIds) {
    const [q] = await db
      .select({
        id: questions.id,
        correctIndex: questions.correctIndex,
        topicId: questions.topicId,
        topicName: questions.topicName,
      })
      .from(questions)
      .where(eq(questions.id, qId))
      .limit(1);
    if (q) allQuestions.push(q);
  }

  // Score
  let score = 0;
  const topicMap = new Map<
    string,
    { topicId: string; topicName: string; correct: number; total: number }
  >();

  for (const ans of answers) {
    const q = allQuestions.find((x) => x.id === ans.questionId);
    if (!q) continue;

    const isCorrect = q.correctIndex === ans.chosenIndex;
    if (isCorrect) score++;

    const topicKey = q.topicId || q.topicName || "unknown";
    if (!topicMap.has(topicKey)) {
      topicMap.set(topicKey, {
        topicId: q.topicId || "",
        topicName: q.topicName || "Unknown",
        correct: 0,
        total: 0,
      });
    }
    const t = topicMap.get(topicKey)!;
    t.total++;
    if (isCorrect) t.correct++;
  }

  const total = allQuestions.length;
  const percent = total > 0 ? (score / total) * 100 : 0;
  const topicBreakdown = Array.from(topicMap.values());
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
      startedAt: now,
      submittedAt: now,
      createdAt: now,
    })
    .returning();

  // Return score but NOT correctIndex
  return {
    attemptId: attempt.id,
    score,
    total,
    percent,
    topicBreakdown,
  };
}

export async function getAttempt(attemptId: string, userId: string, isAdmin: boolean) {
  const db = getDb();
  const [attempt] = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
    .limit(1);
  if (!attempt) throw new NotFoundError("Attempt");
  if (!isAdmin && attempt.userId !== userId) throw new ForbiddenError();
  return attempt;
}

export async function getMyAttempts(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.userId, userId))
    .orderBy(desc(examAttempts.createdAt));
}

// ─── Daily Quiz ──────────────────────────────────────────────────────────────

export async function getDailyQuiz() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const [quiz] = await db
    .select()
    .from(dailyQuiz)
    .where(eq(dailyQuiz.date, today))
    .limit(1);
  if (!quiz) return null;

  const [q] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, quiz.questionId))
    .limit(1);
  return { quiz, question: q };
}

export async function getDailyQuizWithAnswer(userId: string) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const [quiz] = await db
    .select()
    .from(dailyQuiz)
    .where(eq(dailyQuiz.date, today))
    .limit(1);
  if (!quiz) return null;

  const [q] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, quiz.questionId))
    .limit(1);

  const [answer] = await db
    .select()
    .from(dailyQuizAnswers)
    .where(
      and(
        eq(dailyQuizAnswers.userId, userId),
        eq(dailyQuizAnswers.quizId, quiz.id)
      )
    )
    .limit(1);

  return { quiz, question: q, answer };
}

export async function answerDailyQuiz(
  userId: string,
  chosenIndex: number
) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const [quiz] = await db
    .select()
    .from(dailyQuiz)
    .where(eq(dailyQuiz.date, today))
    .limit(1);
  if (!quiz) throw new NotFoundError("Today's quiz");

  // Idempotent: check if already answered
  const [existing] = await db
    .select()
    .from(dailyQuizAnswers)
    .where(
      and(
        eq(dailyQuizAnswers.userId, userId),
        eq(dailyQuizAnswers.quizId, quiz.id)
      )
    )
    .limit(1);
  if (existing) throw new BadRequestError("Already answered today's quiz");

  const [q] = await db
    .select({ correctIndex: questions.correctIndex })
    .from(questions)
    .where(eq(questions.id, quiz.questionId))
    .limit(1);

  const correct = q ? q.correctIndex === chosenIndex : false;
  const now = Date.now();

  const [answer] = await db
    .insert(dailyQuizAnswers)
    .values({
      userId,
      quizId: quiz.id,
      chosenIndex,
      correct,
      answeredAt: now,
    })
    .returning();

  return { answer, correct, correctIndex: q?.correctIndex };
}

// ─── Exam Reports ────────────────────────────────────────────────────────────

export async function submitExamReport(
  userId: string,
  examId: string,
  questionId: string,
  reason: string
) {
  const db = getDb();
  // Idempotent: one open report per user+question
  const [existing] = await db
    .select()
    .from(examReports)
    .where(
      and(
        eq(examReports.userId, userId),
        eq(examReports.questionId, questionId),
        eq(examReports.resolved, false)
      )
    )
    .limit(1);
  if (existing) throw new BadRequestError("Report already exists for this question");

  const now = Date.now();
  const [report] = await db
    .insert(examReports)
    .values({ userId, examId, questionId, reason, createdAt: now })
    .returning();
  return report;
}

export async function listExamReports() {
  const db = getDb();
  return db.select().from(examReports).orderBy(desc(examReports.createdAt));
}

export async function resolveExamReport(id: string) {
  const db = getDb();
  const [report] = await db
    .update(examReports)
    .set({ resolved: true })
    .where(eq(examReports.id, id))
    .returning();
  return report || null;
}

export async function deleteExamReport(id: string) {
  const db = getDb();
  await db.delete(examReports).where(eq(examReports.id, id));
}
