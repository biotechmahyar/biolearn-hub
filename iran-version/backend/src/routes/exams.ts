import { Hono } from "hono";
import { db } from "../db/index.js";
import { exams, questions, categories, examAttempts, examReports, dailyQuiz, dailyQuizAnswers } from "../db/schema.js";
import { requireAuth, requireAdmin, requireContentStaff } from "../middleware/auth.js";
import { eq, and, desc } from "drizzle-orm";

const examsRouter = new Hono();

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// GET /api/exams - list published exams
examsRouter.get("/", async (c) => {
  const featuredOnly = c.req.query("featuredOnly") === "true";
  const freeOnly = c.req.query("freeOnly") === "true";
  let list = await db.query.exams.findMany({ where: eq(exams.published, true) });
  if (featuredOnly) list = list.filter((e) => e.featured);
  if (freeOnly) list = list.filter((e) => e.free);
  list.sort((a, b) => a.order - b.order);
  return c.json({
    ok: true,
    data: list.map((e) => ({ ...e, questionCount: (e.questionIds as string[])?.length ?? 0 })),
  });
});

// GET /api/exams/:slug - get exam by slug
examsRouter.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const exam = await db.query.exams.findFirst({ where: eq(exams.slug, slug) });
  if (!exam) return c.json({ ok: false, error: "آزمون یافت نشد." }, 404);
  const qids = (exam.questionIds as string[]) ?? [];
  const questionList = await Promise.all(
    qids.map(async (qid) => {
      const q = await db.query.questions.findFirst({ where: eq(questions.id, qid) });
      if (!q) return null;
      const topic = await db.query.categories.findFirst({ where: eq(categories.id, q.topicId) });
      return { ...q, topic: topic ? { name: topic.name, accent: topic.accent } : null };
    })
  );
  return c.json({ ok: true, data: { ...exam, questions: questionList.filter(Boolean) } });
});

// POST /api/exams/submit
examsRouter.post("/submit", requireAuth, async (c) => {
  const user = c.get("user");
  const { examId, answers } = await c.req.json();
  if (!examId || !answers) return c.json({ ok: false, error: "ورودی نامعتبر است." }, 400);
  const exam = await db.query.exams.findFirst({ where: eq(exams.id, examId) });
  if (!exam) return c.json({ ok: false, error: "آزمون یافت نشد." }, 404);

  let score = 0;
  const byTopic = new Map<string, { correct: number; total: number }>();
  const answerMap = new Map(answers.map((a: any) => [a.questionId, a.chosenIndex]));

  const qids = (exam.questionIds as string[]) ?? [];
  for (const qid of qids) {
    const question = await db.query.questions.findFirst({ where: eq(questions.id, qid) });
    if (!question) continue;
    const chosen = answerMap.get(qid);
    const isCorrect = chosen !== undefined && chosen === question.correctIndex;
    if (isCorrect) score += 1;
    const entry = byTopic.get(question.topicId) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (isCorrect) entry.correct += 1;
    byTopic.set(question.topicId, entry);
  }

  const total = qids.length;
  const percent = total === 0 ? 0 : Math.round((score / total) * 100);

  const topicBreakdown = [];
  for (const [topicId, stat] of byTopic.entries()) {
    const topic = await db.query.categories.findFirst({ where: eq(categories.id, topicId) });
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
    userId: user.id,
    examId: exam.id,
    answers,
    score,
    total,
    percent,
    topicBreakdown,
    startedAt: now - 5 * 60 * 1000,
    finishedAt: now,
  }).returning();

  return c.json({ ok: true, data: attempt });
});

// GET /api/exams/attempts/:id
examsRouter.get("/attempts/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const attempt = await db.query.examAttempts.findFirst({ where: eq(examAttempts.id, c.req.param("id")) });
  if (!attempt) return c.json({ ok: false, error: "تلاش یافت نشد." }, 404);
  if (attempt.userId !== user.id && user.role !== "admin" && user.role !== "site_admin") {
    return c.json({ ok: false, error: "دسترسی ندارید." }, 403);
  }
  const exam = await db.query.exams.findFirst({ where: eq(exams.id, attempt.examId) });
  const enrichedAnswers = await Promise.all(
    (attempt.answers as any[]).map(async (a) => {
      const q = await db.query.questions.findFirst({ where: eq(questions.id, a.questionId) });
      return q ? { ...q, chosenIndex: a.chosenIndex } : null;
    })
  );
  return c.json({
    ok: true,
    data: {
      ...attempt,
      exam: exam ? { title: exam.title, slug: exam.slug } : null,
      questions: enrichedAnswers.filter(Boolean),
    },
  });
});

// GET /api/exams/my-attempts
examsRouter.get("/my-attempts", requireAuth, async (c) => {
  const user = c.get("user");
  const attempts = await db.query.examAttempts.findMany({
    where: eq(examAttempts.userId, user.id),
    orderBy: [desc(examAttempts.createdAt)],
  });
  const enriched = await Promise.all(
    attempts.map(async (a) => {
      const exam = await db.query.exams.findFirst({ where: eq(exams.id, a.examId) });
      return { ...a, exam: exam ? { title: exam.title, slug: exam.slug } : null };
    })
  );
  return c.json({ ok: true, data: enriched });
});

// GET /api/exams/daily - get today's daily quiz
examsRouter.get("/daily", async (c) => {
  const today = dateKey(new Date());
  const entry = await db.query.dailyQuiz.findFirst({ where: eq(dailyQuiz.date, today) });
  if (!entry) return c.json({ ok: true, data: null });
  const question = await db.query.questions.findFirst({ where: eq(questions.id, entry.questionId) });
  if (!question) return c.json({ ok: true, data: null });
  const topic = await db.query.categories.findFirst({ where: eq(categories.id, question.topicId) });
  return c.json({
    ok: true,
    data: {
      date: today,
      points: entry.points,
      question: { ...question, topic: topic ? { name: topic.name, accent: topic.accent } : null },
      myAnswer: null,
    },
  });
});

// GET /api/exams/daily/auth - daily quiz with my answer
examsRouter.get("/daily/auth", requireAuth, async (c) => {
  const user = c.get("user");
  const today = dateKey(new Date());
  const entry = await db.query.dailyQuiz.findFirst({ where: eq(dailyQuiz.date, today) });
  if (!entry) return c.json({ ok: true, data: null });
  const question = await db.query.questions.findFirst({ where: eq(questions.id, entry.questionId) });
  if (!question) return c.json({ ok: true, data: null });
  const topic = await db.query.categories.findFirst({ where: eq(categories.id, question.topicId) });

  let myAnswer = null;
  const existing = await db.query.dailyQuizAnswers.findFirst({
    where: and(eq(dailyQuizAnswers.userId, user.id), eq(dailyQuizAnswers.date, today)),
  });
  if (existing) {
    myAnswer = {
      chosenIndex: existing.chosenIndex,
      correct: existing.correct,
      correctIndex: question.correctIndex,
      points: existing.points,
    };
  }

  return c.json({
    ok: true,
    data: {
      date: today,
      points: entry.points,
      question: { ...question, topic: topic ? { name: topic.name, accent: topic.accent } : null },
      myAnswer,
    },
  });
});

// POST /api/exams/daily/answer
examsRouter.post("/daily/answer", requireAuth, async (c) => {
  const user = c.get("user");
  const { questionId, chosenIndex } = await c.req.json();
  const today = dateKey(new Date());
  const entry = await db.query.dailyQuiz.findFirst({ where: eq(dailyQuiz.date, today) });
  if (!entry) return c.json({ ok: false, error: "آزمون امروز هنوز منتشر نشده است." }, 404);
  if (entry.questionId !== questionId) return c.json({ ok: false, error: "سؤال نامعتبر است." }, 400);

  const existing = await db.query.dailyQuizAnswers.findFirst({
    where: and(eq(dailyQuizAnswers.userId, user.id), eq(dailyQuizAnswers.date, today)),
  });
  if (existing) return c.json({ ok: false, error: "امروز قبلاً پاسخ داده‌اید." }, 409);

  const question = await db.query.questions.findFirst({ where: eq(questions.id, questionId) });
  if (!question) return c.json({ ok: false, error: "سؤال یافت نشد." }, 404);
  const correct = chosenIndex === question.correctIndex;

  const [answer] = await db.insert(dailyQuizAnswers).values({
    userId: user.id,
    date: today,
    questionId,
    chosenIndex,
    correct,
    points: correct ? entry.points : 0,
    answeredAt: Date.now(),
  }).returning();

  return c.json({ ok: true, data: { correct, correctIndex: question.correctIndex, points: correct ? entry.points : 0 } });
});

// POST /api/exams/reports
examsRouter.post("/reports", requireAuth, async (c) => {
  const user = c.get("user");
  const { examId, questionId, comment } = await c.req.json();
  if (!comment?.trim()) return c.json({ ok: false, error: "توضیح لازم است." }, 400);
  const [created] = await db.insert(examReports).values({
    userId: user.id,
    examId,
    questionId,
    comment: comment.trim(),
    status: "open",
    createdAt: Date.now(),
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

// GET /api/exams/admin/list
examsRouter.get("/admin/list", requireContentStaff, async (c) => {
  const list = await db.query.exams.findMany({ orderBy: [desc(exams.createdAt)] });
  return c.json({
    ok: true,
    data: list.map((e) => ({
      ...e,
      questionCount: (e.questionIds as string[])?.length ?? 0,
      kindLabel: e.diagnostic ? "تعیین سطح" : e.free ? "رایگان" : "پولی",
    })),
  });
});

// POST /api/exams/admin/create
examsRouter.post("/admin/create", requireContentStaff, async (c) => {
  const body = await c.req.json();
  let pool = await db.query.questions.findMany();
  if (body.topicId) pool = pool.filter((q) => q.topicId === body.topicId);
  if (pool.length === 0) return c.json({ ok: false, error: "در این موضوع سؤالی وجود ندارد." }, 400);
  const count = Math.min(body.count || 10, pool.length);
  const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
  const slug = (body.title || "").trim().replace(/\s+/g, "-").toLowerCase() + "-" + Date.now().toString(36);
  const [created] = await db.insert(exams).values({
    title: (body.title || "").trim(),
    slug,
    description: (body.description || "").trim(),
    durationMinutes: body.durationMinutes || 30,
    questionIds: picked.map((q) => q.id),
    free: body.free ?? false,
    published: body.published ?? false,
    featured: false,
    diagnostic: body.diagnostic ?? false,
    accent: "teal",
    order: Date.now(),
  }).returning();
  return c.json({ ok: true, data: { ...created, questionCount: picked.length } }, 201);
});

// PATCH /api/exams/admin/:id/toggle-publish
examsRouter.patch("/admin/:id/toggle-publish", requireContentStaff, async (c) => {
  const { published } = await c.req.json();
  await db.update(exams).set({ published }).where(eq(exams.id, c.req.param("id")));
  return c.json({ ok: true });
});

// DELETE /api/exams/admin/:id
examsRouter.delete("/admin/:id", requireContentStaff, async (c) => {
  const id = c.req.param("id");
  await db.delete(examAttempts).where(eq(examAttempts.examId, id));
  await db.delete(exams).where(eq(exams.id, id));
  return c.json({ ok: true });
});

// GET /api/exams/admin/reports
examsRouter.get("/admin/reports", requireContentStaff, async (c) => {
  const list = await db.query.examReports.findMany({ orderBy: [desc(examReports.createdAt)] });
  return c.json({ ok: true, data: list });
});

// PATCH /api/exams/admin/reports/:id/resolve
examsRouter.patch("/admin/reports/:id/resolve", requireContentStaff, async (c) => {
  await db.update(examReports).set({ status: "resolved" }).where(eq(examReports.id, c.req.param("id")));
  return c.json({ ok: true });
});

// DELETE /api/exams/admin/reports/:id
examsRouter.delete("/admin/reports/:id", requireContentStaff, async (c) => {
  await db.delete(examReports).where(eq(examReports.id, c.req.param("id")));
  return c.json({ ok: true });
});

export default examsRouter;
