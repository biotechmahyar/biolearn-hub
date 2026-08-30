/**
 * Mentor routes — groups, questions, sessions.
 * Mirrors: mentor.ts, collab.ts group logic.
 */
import { Hono } from "hono";
import { success, errorResponse } from "../lib/response.js";
import { groupService, questionService, sessionService } from "../services/mentor.service.js";
import type { AppEnv } from "../lib/types.js";

const mentorRoutes = new Hono<AppEnv>();

const requireAuth = async (c: any, next: any) => {
  if (!c.get("userId")) return c.json(errorResponse("Unauthorized", "UNAUTHORIZED"), 401);
  await next();
};

const requireMentor = async (c: any, next: any) => {
  const userRole = c.get("userRole") ?? "";
  if (!["mentor", "admin", "site_admin"].includes(userRole)) {
    return c.json(errorResponse("فقط منتور می‌تواند این عملیات را انجام دهد.", "FORBIDDEN"), 403);
  }
  await next();
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Groups ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

mentorRoutes.get("/groups", async (c) => {
  const groups = await groupService.list();
  return c.json(success(groups));
});

mentorRoutes.post("/groups", requireAuth, requireMentor, async (c) => {
  const body = await c.req.json();
  const { title, description, meetingDay, meetingTime, capacity } = body;
  if (!title?.trim()) return c.json(errorResponse("عنوان گروه لازم است.", "VALIDATION"), 400);
  const group = await groupService.create(c.get("userId"), {
    title, description: description ?? "", meetingDay: meetingDay ?? "",
    meetingTime: meetingTime ?? "", capacity: capacity ?? 10,
  });
  return c.json(success(group), 201);
});

mentorRoutes.delete("/groups/:id", requireAuth, async (c) => {
  const userRole = c.get("userRole") ?? "";
  const userId = c.get("userId");
  const group = await groupService.findById(c.req.param("id"));
  if (!group) return c.json(errorResponse("Not found"), 404);
  const isOwner = group.mentorId === userId;
  const isAdmin = ["admin", "site_admin"].includes(userRole);
  if (!isOwner && !isAdmin) return c.json(errorResponse("دسترسی ندارید.", "FORBIDDEN"), 403);
  await groupService.delete(c.req.param("id"));
  return c.json(success({ deleted: true }));
});

mentorRoutes.post("/groups/:id/join", requireAuth, async (c) => {
  try {
    const result = await groupService.join(c.get("userId"), c.req.param("id"));
    return c.json(success(result));
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

mentorRoutes.post("/groups/:id/leave", requireAuth, async (c) => {
  try {
    const result = await groupService.leave(c.get("userId"), c.req.param("id"));
    return c.json(success(result));
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

mentorRoutes.get("/groups/:id/members", async (c) => {
  const members = await groupService.listMembers(c.req.param("id"));
  return c.json(success(members));
});

mentorRoutes.get("/groups/:id/is-member", requireAuth, async (c) => {
  const result = await groupService.isMember(c.get("userId"), c.req.param("id"));
  return c.json(success(result));
});

// ── Group Announcements ────────────────────────────────────────────────────

mentorRoutes.post("/groups/:id/announcements", requireAuth, requireMentor, async (c) => {
  const body = await c.req.json();
  if (!body.title?.trim()) return c.json(errorResponse("عنوان لازم است.", "VALIDATION"), 400);
  try {
    const row = await groupService.createAnnouncement(c.get("userId"), c.req.param("id"), body.title, body.message ?? "");
    return c.json(success(row), 201);
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

mentorRoutes.get("/groups/:id/announcements", async (c) => {
  const rows = await groupService.listAnnouncements(c.req.param("id"));
  return c.json(success(rows));
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Questions ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

mentorRoutes.post("/questions", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  if (!body.text?.trim()) return c.json(errorResponse("سؤال را بنویسید.", "VALIDATION"), 400);
  try {
    const q = await questionService.ask(userId, body.text, body.topic ?? "عمومی");
    return c.json(success(q), 201);
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

mentorRoutes.get("/questions", requireAuth, async (c) => {
  const questions = await questionService.list(c.get("userId"), c.get("userRole") ?? "");
  return c.json(success(questions));
});

mentorRoutes.post("/questions/:id/answer", requireAuth, requireMentor, async (c) => {
  const body = await c.req.json();
  if (!body.answer?.trim()) return c.json(errorResponse("پاسخ خالی است.", "VALIDATION"), 400);
  try {
    const q = await questionService.answer(c.get("userId"), c.req.param("id"), body.answer);
    return c.json(success(q));
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Sessions ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

mentorRoutes.post("/sessions", requireAuth, requireMentor, async (c) => {
  const body = await c.req.json();
  if (!body.title?.trim()) return c.json(errorResponse("عنوان جلسه لازم است.", "VALIDATION"), 400);
  try {
    const s = await sessionService.plan(c.get("userId"), {
      studentId: body.studentId,
      title: body.title,
      date: body.date ?? "",
      time: body.time ?? "",
      notes: body.notes ?? "",
    });
    return c.json(success(s), 201);
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

mentorRoutes.get("/sessions", requireAuth, async (c) => {
  const sessions = await sessionService.list(c.get("userId"), c.get("userRole") ?? "");
  return c.json(success(sessions));
});

mentorRoutes.patch("/sessions/:id/status", requireAuth, requireMentor, async (c) => {
  const body = await c.req.json();
  try {
    const s = await sessionService.setStatus(c.get("userId"), c.req.param("id"), body.status);
    if (!s) return c.json(errorResponse("Not found"), 404);
    return c.json(success(s));
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

mentorRoutes.get("/students", requireAuth, requireMentor, async (c) => {
  const students = await sessionService.listStudents();
  return c.json(success(students));
});

mentorRoutes.get("/stats", requireAuth, async (c) => {
  const stats = await sessionService.getStats(c.get("userId"), c.get("userRole") ?? "");
  return c.json(success(stats));
});

export { mentorRoutes };
