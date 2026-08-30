import { Hono } from "hono";
import { db } from "../db/index.js";
import { comments } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../middleware/auth.js";
import { requireAnyAdmin } from "../middleware/rbac.js";
import { successResponse, errorResponse } from "../types/index.js";

const commentsRoutes = new Hono();

// GET /api/comments
commentsRoutes.get("/", async (c) => {
  const contentType = c.req.query("contentType");
  const contentId = c.req.query("contentId");
  if (!contentType || !contentId) return c.json(successResponse([]));

  const rows = await db.select().from(comments).where(
    and(eq(comments.contentType, contentType), eq(comments.contentId, contentId), eq(comments.approved, true))
  ).orderBy(desc(comments.createdAt));
  return c.json(successResponse(rows));
});

// POST /api/comments
commentsRoutes.post("/", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  if (!body.contentType || !body.contentId || !body.text) {
    return c.json(errorResponse("ورودی نامعتبر است."), 400);
  }

  const [comment] = await db.insert(comments).values({
    contentType: body.contentType,
    contentId: body.contentId,
    userId: user!.id,
    userName: user!.name || "",
    text: body.text,
    approved: false,
  }).returning();

  return c.json(successResponse(comment), 201);
});

// GET /api/comments/pending
commentsRoutes.get("/pending", requireAnyAdmin, async (c) => {
  const rows = await db.select().from(comments).where(eq(comments.approved, false)).orderBy(desc(comments.createdAt));
  return c.json(successResponse(rows));
});

// PATCH /api/comments/:id/approve
commentsRoutes.patch("/:id/approve", requireAnyAdmin, async (c) => {
  const id = c.req.param("id");
  const [updated] = await db.update(comments).set({ approved: true, rejected: false }).where(eq(comments.id, id)).returning();
  if (!updated) return c.json(errorResponse("نظر یافت نشد."), 404);
  return c.json(successResponse(updated));
});

// PATCH /api/comments/:id/reject
commentsRoutes.patch("/:id/reject", requireAnyAdmin, async (c) => {
  const id = c.req.param("id");
  const [updated] = await db.update(comments).set({ approved: false, rejected: true }).where(eq(comments.id, id)).returning();
  if (!updated) return c.json(errorResponse("نظر یافت نشد."), 404);
  return c.json(successResponse(updated));
});

// DELETE /api/comments/:id
commentsRoutes.delete("/:id", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const id = c.req.param("id");
  const rows = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("نظر یافت نشد."), 404);
  // Owner or admin
  if (rows[0].userId !== user!.id && !["admin", "site_admin"].includes(user!.role!)) {
    return c.json(errorResponse("دسترسی غیرمجاز."), 403);
  }
  await db.delete(comments).where(eq(comments.id, id));
  return c.json(successResponse({ message: "حذف شد." }));
});

// GET /api/comments/all
commentsRoutes.get("/all", requireAnyAdmin, async (c) => {
  const rows = await db.select().from(comments).orderBy(desc(comments.createdAt));
  return c.json(successResponse(rows));
});

export default commentsRoutes;
