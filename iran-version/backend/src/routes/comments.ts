/**
 * Comment routes — ownership + moderation.
 * Mirrors: comments.ts Convex mutations/queries.
 */
import { Hono } from "hono";
import { success, errorResponse } from "../lib/response.js";
import { commentService } from "../services/comment.service.js";
import type { AppEnv } from "../lib/types.js";

const commentRoutes = new Hono<AppEnv>();

// authMiddleware is applied globally in routes/index.ts —
// it sets c.get("userId") from JWT when present.
const requireAuth = async (c: any, next: any) => {
  if (!c.get("userId")) return c.json(errorResponse("Unauthorized", "UNAUTHORIZED"), 401);
  await next();
};

const requireAdmin = async (c: any, next: any) => {
  const userRole = c.get("userRole") ?? "";
  if (!["admin", "site_admin"].includes(userRole)) {
    return c.json(errorResponse("دسترسی ادمین لازم است.", "FORBIDDEN"), 403);
  }
  await next();
};

// ── Public: list approved comments ────────────────────────────────────────

commentRoutes.get("/", async (c) => {
  const params = new URL(c.req.url).searchParams;
  const contentType = params.get("contentType") ?? "";
  const contentId = params.get("contentId") ?? "";
  if (!contentType || !contentId) {
    return c.json(errorResponse("contentType and contentId required", "VALIDATION"), 400);
  }
  const comments = await commentService.listApproved(contentType, contentId);
  return c.json(success(comments));
});

// ── Authenticated: add comment ────────────────────────────────────────────

commentRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  if (!body.contentType || !body.contentId || !body.text?.trim()) {
    return c.json(errorResponse("Missing required fields", "VALIDATION"), 400);
  }
  try {
    const comment = await commentService.add(userId, body.contentType, body.contentId, body.text);
    return c.json(success(comment), 201);
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

// ── Admin: moderation ─────────────────────────────────────────────────────

commentRoutes.get("/admin/pending", requireAuth, requireAdmin, async (c) => {
  const comments = await commentService.listPending();
  return c.json(success(comments));
});

commentRoutes.patch("/admin/:id/approve", requireAuth, requireAdmin, async (c) => {
  const comment = await commentService.approve(c.req.param("id"));
  if (!comment) return c.json(errorResponse("Not found"), 404);
  return c.json(success(comment));
});

commentRoutes.patch("/admin/:id/reject", requireAuth, requireAdmin, async (c) => {
  const comment = await commentService.reject(c.req.param("id"));
  if (!comment) return c.json(errorResponse("Not found"), 404);
  return c.json(success(comment));
});

commentRoutes.delete("/admin/:id", requireAuth, requireAdmin, async (c) => {
  const deleted = await commentService.delete(c.req.param("id"));
  if (!deleted) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ deleted: true }));
});

export { commentRoutes };
