import { Hono } from "hono";
import { db } from "../db/index.js";
import { dictionaryTerms } from "../db/schema.js";
import { eq, or, ilike } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { requireDictionaryEditor } from "../middleware/rbac.js";
import { successResponse, errorResponse } from "../types/index.js";

const dictionary = new Hono();

function slugifyTerm(term: string): string {
  const t = term.trim();
  if (!t) return "term";
  if (/^[a-zA-Z0-9]/.test(t)) {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "term";
  }
  return encodeURIComponent(t).replace(/%/g, "-");
}

// GET /api/dictionary
dictionary.get("/", async (c) => {
  const query = c.req.query("query");
  const limit = parseInt(c.req.query("limit") || "20", 10);

  let rows;
  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    const all = await db.select().from(dictionaryTerms);
    rows = all.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.fullName.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q),
    );
  } else {
    rows = await db.select().from(dictionaryTerms);
  }

  return c.json(successResponse(rows.slice(0, limit)));
});

// GET /api/dictionary/:slug
dictionary.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const rows = await db.select().from(dictionaryTerms).where(eq(dictionaryTerms.slug, slug)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("اصطلاح یافت نشد."), 404);
  return c.json(successResponse(rows[0]));
});

// POST /api/dictionary
dictionary.post("/", requireAuth, requireDictionaryEditor, async (c) => {
  const body = await c.req.json();
  const term = body.term?.trim();
  if (!term) return c.json(errorResponse("نام اصطلاح لازم است."), 400);

  const existing = await db.select().from(dictionaryTerms).where(eq(dictionaryTerms.term, term)).limit(1);
  if (existing.length > 0) return c.json(errorResponse("این اصطلاح از قبل در دیکشنری وجود دارد."), 409);

  const [newTerm] = await db.insert(dictionaryTerms).values({
    term,
    slug: slugifyTerm(term),
    fullName: body.fullName || "",
    gramStatus: body.gramStatus || "",
    shape: body.shape || "",
    oxygen: body.oxygen || "",
    habitat: body.habitat || "",
    diseases: body.diseases || [],
    virulence: body.virulence || [],
    diagnosis: body.diagnosis || "",
    characteristics: body.characteristics || [],
    examNotes: body.examNotes || [],
    sources: body.sources || [],
  }).returning();

  return c.json(successResponse(newTerm), 201);
});

// PUT /api/dictionary/:id
dictionary.put("/:id", requireAuth, requireDictionaryEditor, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const term = body.term?.trim();
  if (!term) return c.json(errorResponse("نام اصطلاح لازم است."), 400);

  const existing = await db.select().from(dictionaryTerms).where(eq(dictionaryTerms.id, id)).limit(1);
  if (existing.length === 0) return c.json(errorResponse("اصطلاح یافت نشد."), 404);

  const dup = await db.select().from(dictionaryTerms).where(eq(dictionaryTerms.term, term)).limit(1);
  if (dup.length > 0 && dup[0].id !== id) {
    return c.json(errorResponse("اصطلاحی با این نام از قبل وجود دارد."), 409);
  }

  const [updated] = await db.update(dictionaryTerms).set({
    term,
    slug: slugifyTerm(term),
    fullName: body.fullName,
    gramStatus: body.gramStatus,
    shape: body.shape,
    oxygen: body.oxygen,
    habitat: body.habitat,
    diseases: body.diseases,
    virulence: body.virulence,
    diagnosis: body.diagnosis,
    characteristics: body.characteristics,
    examNotes: body.examNotes,
    sources: body.sources,
  }).where(eq(dictionaryTerms.id, id)).returning();

  return c.json(successResponse(updated));
});

// DELETE /api/dictionary/:id
dictionary.delete("/:id", requireAuth, requireDictionaryEditor, async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(dictionaryTerms).where(eq(dictionaryTerms.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("اصطلاح یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

export default dictionary;
