/**
 * Service layer for Media/Storage.
 * Mirrors: mediaItems Convex table + upload.ts logic.
 */
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { mediaItems } from "../db/schema.js";

export const mediaService = {
  async upload(uploaderId: string, data: {
    name: string;
    mimeType: string;
    size: number;
    url: string;
    alt?: string;
    caption?: string;
    category?: string;
  }) {
    const [row] = await db
      .insert(mediaItems)
      .values({
        name: data.name,
        mimeType: data.mimeType,
        size: data.size,
        url: data.url,
        alt: data.alt,
        caption: data.caption,
        category: data.category,
        uploadedBy: uploaderId,
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async getById(mediaId: string) {
    const rows = await db.select().from(mediaItems).where(eq(mediaItems.id, mediaId)).limit(1);
    return rows[0] ?? null;
  },

  async list(options: { category?: string; search?: string; uploaderId?: string; limit?: number; offset?: number } = {}) {
    const conditions = [];
    if (options.category) conditions.push(eq(mediaItems.category, options.category));
    if (options.uploaderId) conditions.push(eq(mediaItems.uploadedBy, options.uploaderId));
    if (options.search) conditions.push(ilike(mediaItems.name, `%${options.search}%`));

    const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

    const query = db.select().from(mediaItems);
    if (where) {
      return query.where(where).orderBy(desc(mediaItems.createdAt)).limit(options.limit ?? 50).offset(options.offset ?? 0);
    }
    return query.orderBy(desc(mediaItems.createdAt)).limit(options.limit ?? 50).offset(options.offset ?? 0);
  },

  async listAll() {
    return db.select().from(mediaItems).orderBy(desc(mediaItems.createdAt)).limit(200);
  },

  async update(mediaId: string, data: { alt?: string; caption?: string; category?: string; name?: string }) {
    const updates: Record<string, any> = {};
    if (data.alt !== undefined) updates.alt = data.alt;
    if (data.caption !== undefined) updates.caption = data.caption;
    if (data.category !== undefined) updates.category = data.category;
    if (data.name !== undefined) updates.name = data.name;

    if (Object.keys(updates).length === 0) return this.getById(mediaId);

    const [row] = await db
      .update(mediaItems)
      .set(updates)
      .where(eq(mediaItems.id, mediaId))
      .returning();
    return row ?? null;
  },

  async delete(mediaId: string) {
    const rows = await db.select().from(mediaItems).where(eq(mediaItems.id, mediaId)).limit(1);
    const item = rows[0];
    if (!item) return null;
    await db.delete(mediaItems).where(eq(mediaItems.id, mediaId));
    return item;
  },

  async count(category?: string) {
    const rows = category
      ? await db.select({ count: sql<number>`count(*)::int` }).from(mediaItems).where(eq(mediaItems.category, category))
      : await db.select({ count: sql<number>`count(*)::int` }).from(mediaItems);
    return rows[0]?.count ?? 0;
  },
};
