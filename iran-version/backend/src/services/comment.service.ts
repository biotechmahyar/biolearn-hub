/**
 * Service layer for Comments.
 * Mirrors: comments.ts Convex mutations/queries.
 */
import { eq, and, desc, asc } from "drizzle-orm";
import { db } from "../db/index.js";
import { comments, users } from "../db/schema.js";

export const commentService = {
  async add(userId: string, contentType: string, contentId: string, text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 2) throw new Error("دیدگاه خیلی کوتاه است.");
    if (trimmed.length > 1000) throw new Error("دیدگاه حداکثر ۱۰۰۰ کاراکتر می‌تواند باشد.");

    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [row] = await db
      .insert(comments)
      .values({
        contentType,
        contentId,
        userId,
        userName: userRows[0]?.name ?? undefined,
        text: trimmed,
        approved: false,
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async listApproved(contentType: string, contentId: string) {
    const rows = await db
      .select()
      .from(comments)
      .where(and(eq(comments.contentType, contentType), eq(comments.contentId, contentId), eq(comments.approved, true)))
      .orderBy(asc(comments.createdAt));
    const enriched = [];
    for (const c of rows) {
      const userRows = await db.select().from(users).where(eq(users.id, c.userId)).limit(1);
      enriched.push({
        ...c,
        author: c.userName ?? userRows[0]?.name ?? "کاربر Genova",
      });
    }
    return enriched;
  },

  async listPending() {
    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.approved, false))
      .orderBy(desc(comments.createdAt));
    return rows;
  },

  async approve(id: string) {
    const [row] = await db
      .update(comments)
      .set({ approved: true, rejected: undefined })
      .where(eq(comments.id, id))
      .returning();
    return row ?? null;
  },

  async reject(id: string) {
    const [row] = await db
      .update(comments)
      .set({ approved: false, rejected: true })
      .where(eq(comments.id, id))
      .returning();
    return row ?? null;
  },

  async delete(id: string) {
    const [row] = await db.delete(comments).where(eq(comments.id, id)).returning();
    return row ?? null;
  },
};
