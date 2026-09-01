// @ts-nocheck
import { Context } from "hono";
import { db } from "../db.js";
import { articles } from "../schema.js";
import { eq, desc } from "drizzle-orm";

// GET /api/content/articles
export async function getArticles(c: Context) {
  try {
    const result = await db
      .select()
      .from(articles)
      .where(eq(articles.published, true))
      .orderBy(desc(articles.createdAt));
    return c.json({ ok: true, data: result });
  } catch (error) {
    console.error("[ARTICLES] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت مقالات" }, 500);
  }
}

// GET /api/content/articles/:slug
export async function getArticleBySlug(c: Context) {
  try {
    const slug = c.req.param("slug");
    const result = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
    if (result.length === 0) {
      return c.json({ ok: false, error: "مقاله یافت نشد" }, 404);
    }
    return c.json({ ok: true, data: result[0] });
  } catch (error) {
    console.error("[ARTICLES] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت مقاله" }, 500);
  }
}
