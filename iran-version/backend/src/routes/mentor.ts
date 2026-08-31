import { Hono } from "hono";
import { successResponse } from "../lib/errors.js";
import { validateBody, z } from "../lib/validate.js";
import { authenticate } from "../middleware/auth.js";
import * as mentorService from "../services/mentor.service.js";

const mentor = new Hono();

// ─── Groups ──────────────────────────────────────────────────────────────────

mentor.get("/groups", async (c) => {
  const data = await mentorService.listMentorGroups();
  return c.json(successResponse(data));
});

mentor.get("/groups/:id", async (c) => {
  const data = await mentorService.getMentorGroup(c.req.param("id")!!);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

mentor.post("/groups", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      maxMembers: z.number().optional(),
    })
  );
  const user = c.get("user");
  const data = await mentorService.createMentorGroup(user.userId, body);
  return c.json(successResponse(data), 201);
});

mentor.post("/groups/:id/join", authenticate, async (c) => {
  const user = c.get("user");
  const data = await mentorService.joinGroup(user.userId, c.req.param("id")!!);
  return c.json(successResponse(data), 201);
});

mentor.get("/groups/:id/members", async (c) => {
  const data = await mentorService.getGroupMembers(c.req.param("id")!!);
  return c.json(successResponse(data));
});

// ─── Questions ───────────────────────────────────────────────────────────────

mentor.get("/groups/:id/questions", async (c) => {
  const data = await mentorService.getGroupQuestions(c.req.param("id")!!);
  return c.json(successResponse(data));
});

mentor.post("/groups/:id/questions", authenticate, async (c) => {
  const body = await validateBody(c, z.object({ text: z.string().min(1) }));
  const user = c.get("user");
  const data = await mentorService.askQuestion(
    user.userId,
    c.req.param("id")!!,
    body.text
  );
  return c.json(successResponse(data), 201);
});

mentor.post("/questions/:id/answer", authenticate, async (c) => {
  const body = await validateBody(c, z.object({ answer: z.string().min(1) }));
  const user = c.get("user");
  const data = await mentorService.answerQuestion(
    user.userId,
    c.req.param("id")!!,
    body.answer
  );
  return c.json(successResponse(data));
});

// ─── Sessions ────────────────────────────────────────────────────────────────

mentor.get("/groups/:id/sessions", async (c) => {
  const data = await mentorService.getGroupSessions(c.req.param("id")!!);
  return c.json(successResponse(data));
});

mentor.post("/groups/:id/sessions", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      title: z.string().optional(),
      scheduledAt: z.number().optional(),
      duration: z.number().optional(),
    })
  );
  const user = c.get("user");
  const data = await mentorService.createSession(
    user.userId,
    c.req.param("id")!!,
    body
  );
  return c.json(successResponse(data), 201);
});

// ─── Announcements ───────────────────────────────────────────────────────────

mentor.get("/groups/:id/announcements", async (c) => {
  const data = await mentorService.getGroupAnnouncements(c.req.param("id")!!);
  return c.json(successResponse(data));
});

mentor.post("/groups/:id/announcements", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      title: z.string().min(1),
      body: z.string().optional(),
    })
  );
  const user = c.get("user");
  const data = await mentorService.createGroupAnnouncement(
    user.userId,
    c.req.param("id")!!,
    body.title,
    body.body
  );
  return c.json(successResponse(data), 201);
});

export default mentor;
