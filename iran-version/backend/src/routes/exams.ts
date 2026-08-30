/**
 * Exam routes — public list/detail, authenticated submit/quiz.
 * Mirrors: tests.ts, examReports.ts Convex functions.
 */
import { Hono } from "hono";
import { success, errorResponse } from "../lib/response.js";
import { examService, dailyQuizService, examReportService } from "../services/exam.service.js";
import {
  listExamsQuerySchema,
  submitExamSchema,
  answerDailyQuizSchema,
  submitExamReportSchema,
} from "../lib/validators.js";
import type { AppEnv } from "../lib/types.js";

const examRoutes = new Hono<AppEnv>();

// ══════════════════════════════════════════════════════════════════════════════
// ── Public Exam Endpoints ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

examRoutes.get("/", async (c) => {
  const query = Object.fromEntries(new URL(c.req.url).searchParams.entries());
  const parsed = listExamsQuerySchema.safeParse(query);
  const filters = parsed.success ? parsed.data : {};
  const exams = await examService.list(filters);
  return c.json(success(exams));
});

examRoutes.get("/daily", async (c) => {
  const quiz = await dailyQuizService.getToday();
  return c.json(success(quiz));
});

examRoutes.get("/:slug", async (c) => {
  const exam = await examService.findBySlug(c.req.param("slug"));
  if (!exam) return c.json(errorResponse("آزمون یافت نشد.", "NOT_FOUND"), 404);
  // Get questions for this exam — but do NOT leak correctIndex
  const questionIds = Array.isArray(exam.questionIds) ? exam.questionIds : [];
  const questions = await examService.getQuestionsByIds(questionIds);
  const enriched = [];
  for (const q of questions) {
    const topic = await examService.findCategoryById(q.topicId);
    enriched.push({
      id: q.id,
      text: q.text,
      options: q.options,
      explanation: q.explanation,
      topicId: q.topicId,
      difficulty: q.difficulty,
      topic: topic ? { name: topic.name, accent: topic.accent } : null,
      // NOTE: correctIndex intentionally NOT included
    });
  }
  return c.json(success({ ...exam, questions: enriched }));
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Authenticated Exam Endpoints ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

examRoutes.use("/submit", async (c, next) => {
  if (!c.get("userId")) {
    return c.json(errorResponse("برای ثبت آزمون ابتدا وارد حساب شوید.", "UNAUTHORIZED"), 401);
  }
  await next();
});

examRoutes.post("/submit", async (c) => {
  const body = await c.req.json();
  const parsed = submitExamSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  try {
    const attempt = await examService.submitExam(c.get("userId"), parsed.data.examId, parsed.data.answers);
    return c.json(success(attempt), 201);
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

examRoutes.get("/attempts/:id", async (c) => {
  const userId = c.get("userId");
  const userRole = c.get("userRole") ?? "";
  if (!userId) return c.json(errorResponse("Unauthorized", "UNAUTHORIZED"), 401);
  const attempt = await examService.getAttempt(c.req.param("id"), userId, userRole);
  if (!attempt) return c.json(errorResponse("Not found", "NOT_FOUND"), 404);
  return c.json(success(attempt));
});

examRoutes.get("/my-attempts", async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json(errorResponse("Unauthorized", "UNAUTHORIZED"), 401);
  const attempts = await examService.getMyAttempts(userId);
  return c.json(success(attempts));
});

// ── Daily Quiz (authenticated) ─────────────────────────────────────────────

examRoutes.get("/daily/auth", async (c) => {
  const userId = c.get("userId");
  const quiz = await dailyQuizService.getToday(userId);
  return c.json(success(quiz));
});

examRoutes.post("/daily/answer", async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json(errorResponse("برای شرکت در آزمون روزانه ابتدا وارد حساب شوید.", "UNAUTHORIZED"), 401);
  const body = await c.req.json();
  const parsed = answerDailyQuizSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  try {
    const result = await dailyQuizService.answer(userId, parsed.data.questionId, parsed.data.chosenIndex);
    return c.json(success(result));
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

// ── Exam Reports (authenticated) ───────────────────────────────────────────

examRoutes.post("/reports", async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json(errorResponse("برای گزارش خطا باید وارد شوید.", "UNAUTHORIZED"), 401);
  const body = await c.req.json();
  const parsed = submitExamReportSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  try {
    const result = await examReportService.submit(userId, parsed.data.examId, parsed.data.questionId, parsed.data.comment);
    return c.json(success(result));
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

// ── Admin Exam Management ──────────────────────────────────────────────────

examRoutes.use("/admin/*", async (c, next) => {
  const userId = c.get("userId");
  const userRole = c.get("userRole") ?? "";
  if (!userId) return c.json(errorResponse("Unauthorized", "UNAUTHORIZED"), 401);
  const isContentStaff = ["admin", "site_admin", "content_manager"].includes(userRole);
  if (!isContentStaff) return c.json(errorResponse("Forbidden", "FORBIDDEN"), 403);
  await next();
});

examRoutes.get("/admin/list", async (c) => {
  const exams = await examService.listAdmin();
  return c.json(success(exams));
});

examRoutes.post("/admin/create", async (c) => {
  const body = await c.req.json();
  const parsed = createExamSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  try {
    const result = await examService.create(parsed.data);
    return c.json(success(result), 201);
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

examRoutes.patch("/admin/:id/toggle-publish", async (c) => {
  const { published } = await c.req.json();
  const exam = await examService.togglePublished(c.req.param("id"), published);
  if (!exam) return c.json(errorResponse("Not found"), 404);
  return c.json(success(exam));
});

examRoutes.delete("/admin/:id", async (c) => {
  const deleted = await examService.delete(c.req.param("id"));
  if (!deleted) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ deleted: true }));
});

examRoutes.get("/admin/reports", async (c) => {
  const reports = await examReportService.listAll();
  return c.json(success(reports));
});

examRoutes.patch("/admin/reports/:id/resolve", async (c) => {
  const report = await examReportService.resolve(c.req.param("id"));
  if (!report) return c.json(errorResponse("Not found"), 404);
  return c.json(success(report));
});

examRoutes.delete("/admin/reports/:id", async (c) => {
  const deleted = await examReportService.delete(c.req.param("id"));
  if (!deleted) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ deleted: true }));
});

// Import createExamSchema
import { createExamSchema } from "../lib/validators.js";

export { examRoutes };
