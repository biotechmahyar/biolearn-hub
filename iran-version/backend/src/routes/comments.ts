import { Hono } from "hono";
import { db } from "../db/index.js";
import { comments, users } from "../db/schema.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { eq, and, desc } from "drizzle-orm";

const commentsRouter = new Hono();

// POST /api/comments
commentsRouter.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const { contentType, contentId, text } = await c.req.json();
  const trimmed = text?.trim();
  if (!trimmed || trimmed.length < 2) return c.json({ ok: false, error: "دیدگاه خیلی کوتاه است." }, 400);
  if (trimmed.length > 1000) return c.json({ ok: false, error: "دیدگاه حداکثر ۱۰۰۰ کاراکتر می‌تواند باشد." }, 400);
  const [created] = await db.insert(comments).values({
    contentType, contentId, userId: user.id, userName: user.name, text: trimmed, approved: false, createdAt: Date.now(),
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

// GET /api/comments/:contentType/:contentId
commentsRouter.get("/:contentType/:contentId", async (c) => {
  const { contentType, contentId } = c.req.param();
  const list = await db.query.comments.findMany({
    where: and(eq(comments.contentType, contentType), eq(comments.contentId, contentId), eq(comments.approved, true)),
    orderBy: [comments.createdAt],
  });
  const enriched = await Promise.all(
    list.map(async (c2) => {
      const u = await db.query.users.findFirst({ where: eq(users.id, c2.userId) });
      return { ...c2, author: c2.userName || u?.name || "کاربر NIBRC" };
    })
  );
  return c.json({ ok: true, data: enriched });
});

// GET /api/comments/pending (admin)
commentsRouter.get("/pending", requireAdmin, async (c) => {
  const list = await db.query.comments.findMany({
    where: eq(comments.approved, false),
    orderBy: [desc(comments.createdAt)],
  });
  return c.json({ ok: true, data: list });
});

// POST /api/comments/:id/approve
commentsRouter.post("/:id/approve", requireAdmin, async (c) => {
  await db.update(comments).set({ approved: true, rejected: undefined }).where(eq(comments.id, c.req.param("id")));
  return c.json({ ok: true });
});

// POST /api/comments/:id/reject
commentsRouter.post("/:id/reject", requireAdmin, async (c) => {
  await db.update(comments).set({ approved: false, rejected: true }).where(eq(comments.id, c.req.param("id")));
  return c.json({ ok: true });
});

// DELETE /api/comments/:id
commentsRouter.delete("/:id", requireAdmin, async (c) => {
  await db.delete(comments).where(eq(comments.id, c.req.param("id")));
  return c.json({ ok: true });
});

export default commentsRouter;
