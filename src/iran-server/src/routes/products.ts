import { Context } from "hono";
import { db } from "../db.js";
import { products, workshops, dictionaryTerms, exams } from "../schema.js";
import { eq, desc, like, and, or } from "drizzle-orm";

// ── PRODUCTS ──────────────────────────────────────────────────────────────

// GET /api/content/products
export async function getProducts(c: Context) {
  try {
    const result = await db
      .select()
      .from(products)
      .where(eq(products.published, true))
      .orderBy(desc(products.createdAt));
    return c.json({ ok: true, data: result });
  } catch (error) {
    console.error("[PRODUCTS] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت محصولات" }, 500);
  }
}

// GET /api/content/products/:slug
export async function getProductBySlug(c: Context) {
  try {
    const slug = c.req.param("slug");
    const result = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
    if (result.length === 0) {
      return c.json({ ok: false, error: "محصول یافت نشد" }, 404);
    }
    return c.json({ ok: true, data: result[0] });
  } catch (error) {
    console.error("[PRODUCTS] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت محصول" }, 500);
  }
}

// ── WORKSHOPS ─────────────────────────────────────────────────────────────

// GET /api/content/workshops
export async function getWorkshops(c: Context) {
  try {
    const result = await db
      .select()
      .from(workshops)
      .where(eq(workshops.published, true))
      .orderBy(desc(workshops.createdAt));
    return c.json({ ok: true, data: result });
  } catch (error) {
    console.error("[WORKSHOPS] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت کارگاه‌ها" }, 500);
  }
}

// ── DICTIONARY ────────────────────────────────────────────────────────────

// GET /api/content/dictionary
export async function getDictionaryTerms(c: Context) {
  try {
    const q = c.req.query("q");
    let result;
    if (q) {
      result = await db
        .select()
        .from(dictionaryTerms)
        .where(or(
          like(dictionaryTerms.term, `%${q}%`),
          like(dictionaryTerms.fullName, `%${q}%`)
        ))
        .limit(50);
    } else {
      result = await db.select().from(dictionaryTerms).limit(100);
    }
    return c.json({ ok: true, data: result });
  } catch (error) {
    console.error("[DICT] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت دیکشنری" }, 500);
  }
}

// ── EXAMS ─────────────────────────────────────────────────────────────────

// GET /api/content/exams
export async function getExams(c: Context) {
  try {
    const result = await db
      .select()
      .from(exams)
      .where(eq(exams.published, true))
      .orderBy(desc(exams.createdAt));
    return c.json({ ok: true, data: result });
  } catch (error) {
    console.error("[EXAMS] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت آزمون‌ها" }, 500);
  }
}

// GET /api/content/exams/:slug
export async function getExamBySlug(c: Context) {
  try {
    const slug = c.req.param("slug");
    const result = await db.select().from(exams).where(eq(exams.slug, slug)).limit(1);
    if (result.length === 0) {
      return c.json({ ok: false, error: "آزمون یافت نشد" }, 404);
    }
    return c.json({ ok: true, data: result[0] });
  } catch (error) {
    console.error("[EXAMS] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت آزمون" }, 500);
  }
}
