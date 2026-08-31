import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { comments } from "../db/schema.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";

export async function createComment(
  userId: string,
  targetType: string,
  targetId: string,
  text: string
) {
  const db = getDb();
  const now = Date.now();
  const [comment] = await db
    .insert(comments)
    .values({ userId, targetType, targetId, text, approved: false, createdAt: now })
    .returning();
  return comment;
}

export async function getApprovedComments(targetType: string, targetId: string) {
  const db = getDb();
  return db
    .select()
    .from(comments)
    .where(
      and(
        eq(comments.targetType, targetType),
        eq(comments.targetId, targetId),
        eq(comments.approved, true)
      )
    )
    .orderBy(desc(comments.createdAt));
}

export async function getAllComments() {
  const db = getDb();
  return db.select().from(comments).orderBy(desc(comments.createdAt));
}

export async function approveComment(commentId: string, userId: string) {
  const db = getDb();
  const [updated] = await db
    .update(comments)
    .set({ approved: true })
    .where(eq(comments.id, commentId))
    .returning();
  if (!updated) throw new NotFoundError("Comment");
  return updated;
}

export async function rejectComment(commentId: string) {
  const db = getDb();
  const [updated] = await db
    .update(comments)
    .set({ approved: false })
    .where(eq(comments.id, commentId))
    .returning();
  if (!updated) throw new NotFoundError("Comment");
  return updated;
}

export async function deleteComment(commentId: string, userId: string, isAdmin: boolean) {
  const db = getDb();
  if (!isAdmin) {
    const [comment] = await db
      .select({ userId: comments.userId })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);
    if (!comment) throw new NotFoundError("Comment");
    if (comment.userId !== userId) throw new ForbiddenError();
  }
  await db.delete(comments).where(eq(comments.id, commentId));
}
