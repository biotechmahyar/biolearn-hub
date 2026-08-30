import { Hono } from "hono";
import { db } from "../db/index.js";
import { exams, questions, examAttempts, examReports, dailyQuiz, dailyQuizAnswers, categories } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, getCurrentUser, optionalAuth } from "../middleware/auth.js";
import { requireAdmin, requireAnyAdmin } from "../middleware/rbac.js";
import { successResponse, errorResponse } from "../types/index.js";

const examsRoutes = new Hono();

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// GET /api/exams
examsRoutes.get("/", async (c) => {
  const featuredOnly = c.req.query("featuredOnly") === "true";
  const freeOnly = c.req.query("freeOnly") === "true";

  let rows = await db.select().from(exams).where(eq(exams.published, true)).orderBy(exams.order);

  if (featuredOnly) rows = rows.filter((e) => e.featured);
  if (freeOnly) rows = rows.filter((e) => e.free);

  return c.json(successResponse(rows.map((e) => ({ ...e, questionCount: (e.questionIds as string[])?.length || 0 }))));
});

// GET /api/exams/:slug
examsRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const rows = await db.select().from(exams).where(and(eq(exams.slug, slug), eq(exams.published, true))).limit(1);
  if (rows.length === 0) return c.json(errorResponse("آزمون یافت نشد."), 404);

  const exam = rows[0];
  const questionIds = (exam.questionIds as string[]) || [];
  const questionsWithTopics = await Promise.all(
    questionIds.map(async (qid) => {
      const qRows = await db.select().from(questions).where(eq(questions.id, qid)).limit(1);
      if (qRows.length === 0) return null;
      const q = qRows[0];
      const catRows = await db.select().from(categories).where(eq(categories.id, q.topicId)).limit(1);
      return { ...q, topic: catRows[0] ? { name: catRows[0].name, accent: catRows[0].accent } : null };
    }),
  );

  return c.json(successResponse({ ...exam, questions: questionsWithTopics.filter(Boolean) }));
});

// GET /api/exams/daily
examsRoutes.get("/daily", optionalAuth, async (c) => {
  const today = dateKey(new Date());
  const rows = await db.select().from(dailyQuiz).where(eq(dailyQuiz.date, today)).limit(1);
  if (rows.length === 0) return c.json(successResponse(null));

  const entry = rows[0];
  const qRows = await db.select().from(questions).where(eq(questions.id, entry.questionId)).limit(1);
  if (qRows.length === 0) return c.json(successResponse(null));

  const question = qRows[0];
  const catRows = await db.select().from(categories).where(eq(categories.id, question.topicId)).limit(1);

  let myAnswer = null;
  const userId = getCurrentUser(c)?.id;
  if (userId) {
    const ansRows = await db.select().from(dailyQuizAnswers).where(
      and(eq(dailyQuizAnswers.userId, userId), eq(dailyQuizAnswers.date, today))
    ).limit(1);
    if (ansRows.length > 0) {
      myAnswer = {
        chosenIndex: ansRows[0].chosenIndex,
        correct: ansRows[0].correct,
        correctIndex: question.correctIndex,
        points: ansRows[0].points,
      };
    }
  }

  return c.json(successResponse({
    date: today,
    points: entry.points,
    question: { ...question, topic: catRows[0] ? { name: catRows[0].name, accent: catRows[0].accent } : null },
    myAnswer,
  }));
});

// POST /api/exams/submit
examsRoutes.post("/submit", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  const { examId, answers } = body;
  if (!examId || !answers) return c.json(errorResponse("ورودی نامعتبر است."), 400);

  const examRows = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
  if (examRows.length === 0) return c.json(errorResponse("آزمون یافت نشد."), 404);
  const exam = examRows[0];

  const answerMap = new Map(answers.map((a: any) => [a.questionId, a.chosenIndex]));
  let score = 0;
  const byTopic = new Map<string, { correct: number; total: number }>();

  for (const qid of exam.questionIds as string[]) {
    const qRows = await db.select().from(questions).where(eq(questions.id, qid)).limit(1);
    if (qRows.length === 0) continue;
    const q = qRows[0];
    const chosen = answerMap.get(qid);
    const isCorrect = chosen !== undefined && chosen === q.correctIndex;
    if (isCorrect) score += 1;
    const entry = byTopic.get(q.topicId) || { correct: 0, total: 0 };
    entry.total += 1;
    if (isCorrect) entry.correct += 1;
    byTopic.set(q.topicId, entry);
  }

  const total = (exam.questionIds as string[]).length;
  const percent = total === 0 ? 0 : Math.round((score / total) * 100);

  const topicBreakdown = [];
  for (const [topicId, stat] of byTopic.entries()) {
    const catRows = await db.select().from(categories).where(eq(categories.id, topicId)).limit(1);
    topicBreakdown.push({
      topicId,
      topicName: catRows[0]?.name || "نامشخص",
      correct: stat.correct,
      total: stat.total,
      percent: stat.total === 0 ? 0 : Math.round((stat.correct / stat.total) * 100),
    });
  }

  const [attempt] = await db.insert(examAttempts).values({
    userId: user!.id,
    examId,
    answers,
    score,
    total,
    percent,
    topicBreakdown,
    startedAt: Date.now() - 5 * 60 * 1000,
    finishedAt: Date.now(),
  }).returning();

  return c.json(successResponse(attempt), 201);
});

// GET /api/exams/my-attempts
examsRoutes.get("/my-attempts", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const rows = await db.select().from(examAttempts).where(eq(examAttempts.userId, user!.id)).orderBy(desc(examAttempts.finishedAt));
  const enriched = await Promise.all(
    rows.map(async (a) => {
      const examRows = await db.select().from(exams).where(eq(exams.id, a.examId)).limit(1);
      return { ...a, exam: examRows[0] ? { title: examRows[0].title, slug: examRows[0].slug } : null };
    }),
  );
  return c.json(successResponse(enriched));
});

// GET /api/exams/attempts/:id
examsRoutes.get("/attempts/:id", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const id = c.req.param("id");
  const rows = await db.select().from(examAttempts).where(eq(examAttempts.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("تلاش یافت نشد."), 404);
  const attempt = rows[0];
  if (attempt.userId !== user!.id && user!.role !== "admin" && user!.role !== "site_admin") {
    return c.json(errorResponse("دسترسی غیرمجاز."), 403);
  }
  return c.json(successResponse(attempt));
});

// POST /api/exams/daily/answer
examsRoutes.post("/daily/answer", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  const today = dateKey(new Date());

  const entryRows = await db.select().from(dailyQuiz).where(eq(dailyQuiz.date, today)).limit(1);
  if (entryRows.length === 0) return c.json(errorResponse("آزمون امروز هنوز منتشر نشده است."), 404);
  const entry = entryRows[0];

  if (entry.questionId !== body.questionId) return c.json(errorResponse("سؤال نامعتبر است."), 400);

  const existing = await db.select().from(dailyQuizAnswers).where(
    and(eq(dailyQuizAnswers.userId, user!.id), eq(dailyQuizAnswers.date, today))
  ).limit(1);
  if (existing.length > 0) return c.json(errorResponse("امروز قبلاً پاسخ داده‌اید."), 409);

  const qRows = await db.select().from(questions).where(eq(questions.id, entry.questionId)).limit(1);
  if (qRows.length === 0) return c.json(errorResponse("سؤال یافت نشد."), 404);
  const question = qRows[0];
  const correct = body.chosenIndex === question.correctIndex;

  const [answer] = await db.insert(dailyQuizAnswers).values({
    userId: user!.id,
    date: today,
    questionId: entry.questionId,
    chosenIndex: body.chosenIndex,
    correct,
    points: correct ? entry.points : 0,
    answeredAt: Date.now(),
  }).returning();

  return c.json(successResponse({ correct, correctIndex: question.correctIndex, points: correct ? entry.points : 0 }));
});

// POST /api/exams/reports
examsRoutes.post("/reports", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  if (!body.examId || !body.questionId || !body.comment) return c.json(errorResponse("ورودی نامعتبر است."), 400);

  // Check for existing open report
  const existing = await db.select().from(examReports).where(
    and(eq(examReports.userId, user!.id), eq(examReports.questionId, body.questionId), eq(examReports.status, "open"))
  ).limit(1);
  if (existing.length > 0) return c.json(errorResponse("شما قبلاً این سؤال را گزارش کرده‌اید."), 409);

  const [report] = await db.insert(examReports).values({
    userId: user!.id,
    examId: body.examId,
    questionId: body.questionId,
    comment: body.comment,
    status: "open",
  }).returning();

  return c.json(successResponse(report), 201);
});

// ── Admin Exam Management ───────────────────────────────────────────────────

examsRoutes.get("/admin/list", requireAnyAdmin, async (c) => {
  const rows = await db.select().from(exams).orderBy(exams.order);
  return c.json(successResponse(rows));
});

examsRoutes.post("/admin/create", requireAnyAdmin, async (c) => {
  const body = await c.req.json();
  const slug = body.slug || body.title.replace(/\s+/g, "-").toLowerCase();
  const [exam] = await db.insert(exams).values({
    title: body.title,
    slug,
    description: body.description || "",
    durationMinutes: body.durationMinutes || 30,
    questionIds: body.questionIds || [],
    free: body.free || false,
    published: body.published || false,
    featured: body.featured || false,
    diagnostic: body.diagnostic || false,
    accent: body.accent || "teal",
    order: body.order || 0,
  }).returning();
  return c.json(successResponse(exam), 201);
});

examsRoutes.patch("/admin/:id/toggle-publish", requireAnyAdmin, async (c) => {
  const id = c.req.param("id");
  const rows = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("آزمون یافت نشد."), 404);
  const [updated] = await db.update(exams).set({ published: !rows[0].published }).where(eq(exams.id, id)).returning();
  return c.json(successResponse(updated));
});

examsRoutes.delete("/admin/:id", requireAnyAdmin, async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(exams).where(eq(exams.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("آزمون یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

examsRoutes.get("/admin/reports", requireAnyAdmin, async (c) => {
  const rows = await db.select().from(examReports).orderBy(desc(examReports.createdAt));
  return c.json(successResponse(rows));
});

examsRoutes.patch("/admin/reports/:id/resolve", requireAnyAdmin, async (c) => {
  const id = c.req.param("id");
  const [updated] = await db.update(examReports).set({ status: "resolved" }).where(eq(examReports.id, id)).returning();
  if (!updated) return c.json(errorResponse("گزارش یافت نشد."), 404);
  return c.json(successResponse(updated));
});

examsRoutes.delete("/admin/reports/:id", requireAnyAdmin, async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(examReports).where(eq(examReports.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("گزارش یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

export default examsRoutes;
