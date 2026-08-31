import { Hono } from "hono";
import { successResponse } from "../lib/errors.js";
import { validateBody, z } from "../lib/validate.js";
import { authenticate } from "../middleware/auth.js";
import * as examService from "../services/exam.service.js";

const exams = new Hono();

exams.get("/", async (c) => {
  const data = await examService.listExams();
  return c.json(successResponse(data));
});

exams.get("/daily", async (c) => {
  const data = await examService.getDailyQuiz();
  return c.json(successResponse(data));
});

exams.get("/daily/auth", authenticate, async (c) => {
  const user = c.get("user");
  const data = await examService.getDailyQuizWithAnswer(user.userId);
  return c.json(successResponse(data));
});

exams.get("/my-attempts", authenticate, async (c) => {
  const user = c.get("user");
  const data = await examService.getMyAttempts(user.userId);
  return c.json(successResponse(data));
});

exams.get("/attempts/:id", authenticate, async (c) => {
  const user = c.get("user");
  const data = await examService.getAttempt(c.req.param("id")!!, user.userId, false);
  return c.json(successResponse(data));
});

exams.get("/:slug", async (c) => {
  const data = await examService.getExamBySlug(c.req.param("slug")!!);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

exams.post("/submit", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      examId: z.string(),
      answers: z.array(
        z.object({
          questionId: z.string(),
          chosenIndex: z.number(),
        })
      ),
    })
  );
  const user = c.get("user");
  const data = await examService.submitExam(
    user.userId,
    body.examId,
    body.answers
  );
  return c.json(successResponse(data));
});

exams.post("/daily/answer", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({ chosenIndex: z.number() })
  );
  const user = c.get("user");
  const data = await examService.answerDailyQuiz(
    user.userId,
    body.chosenIndex
  );
  return c.json(successResponse(data));
});

exams.post("/reports", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      examId: z.string(),
      questionId: z.string(),
      reason: z.string(),
    })
  );
  const user = c.get("user");
  const data = await examService.submitExamReport(
    user.userId,
    body.examId,
    body.questionId,
    body.reason
  );
  return c.json(successResponse(data), 201);
});

export default exams;
