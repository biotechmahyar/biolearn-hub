import { Hono } from "hono";
import { db } from "../db/index.js";
import { dictionaryTerms } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { eq, ilike, or, desc } from "drizzle-orm";

const dict = new Hono();

function slugifyTerm(term: string): string {
  const t = term.trim();
  if (!t) return "term";
  if (/^[a-zA-Z0-9]/.test(t)) {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "term";
  }
  return encodeURIComponent(t).replace(/%/g, "-");
}

// GET /api/dictionary
dict.get("/", async (c) => {
  const q = (c.req.query("q") || c.req.query("query") || "").trim();
  const limit = parseInt(c.req.query("limit") || "20");
  let terms = await db.query.dictionaryTerms.findMany();
  if (q) {
    const lower = q.toLowerCase();
    terms = terms.filter((t) =>
      t.term.toLowerCase().includes(lower) || t.fullName.toLowerCase().includes(lower) || t.slug.toLowerCase().includes(lower)
    );
  }
  return c.json({ ok: true, data: terms.slice(0, limit) });
});

// GET /api/dictionary/:slug
dict.get("/:slug", async (c) => {
  const term = await db.query.dictionaryTerms.findFirst({ where: eq(dictionaryTerms.slug, c.req.param("slug")) });
  if (!term) return c.json({ ok: false, error: "اصطلاح یافت نشد." }, 404);
  return c.json({ ok: true, data: term });
});

// POST /api/dictionary
dict.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  if (!["instructor", "content_manager", "site_admin", "admin"].includes(user.role || "")) {
    return c.json({ ok: false, error: "فقط مدرس، مدیر محتوا یا ادمین می‌تواند اصطلاح اضافه کند." }, 403);
  }
  const body = await c.req.json();
  const term = body.term?.trim();
  if (!term) return c.json({ ok: false, error: "نام اصطلاح لازم است." }, 400);
  const existing = await db.query.dictionaryTerms.findFirst({ where: eq(dictionaryTerms.term, term) });
  if (existing) return c.json({ ok: false, error: "این اصطلاح از قبل در دیکشنری وجود دارد." }, 409);
  const [created] = await db.insert(dictionaryTerms).values({
    term, slug: slugifyTerm(term), fullName: body.fullName || "",
    gramStatus: body.gramStatus || "", shape: body.shape || "", oxygen: body.oxygen || "",
    habitat: body.habitat || "", diseases: body.diseases || [], virulence: body.virulence || [],
    diagnosis: body.diagnosis || "", characteristics: body.characteristics || [],
    examNotes: body.examNotes || [], sources: body.sources || [],
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

// PUT /api/dictionary/:id
dict.put("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  if (!["instructor", "content_manager", "site_admin", "admin"].includes(user.role || "")) {
    return c.json({ ok: false, error: "فقط مدرس، مدیر محتوا یا ادمین می‌تواند اصطلاح ویرایش کند." }, 403);
  }
  const body = await c.req.json();
  const term = body.term?.trim();
  if (!term) return c.json({ ok: false, error: "نام اصطلاح لازم است." }, 400);
  await db.update(dictionaryTerms).set({
    term, slug: slugifyTerm(term), fullName: body.fullName || "",
    gramStatus: body.gramStatus || "", shape: body.shape || "", oxygen: body.oxygen || "",
    habitat: body.habitat || "", diseases: body.diseases || [], virulence: body.virulence || [],
    diagnosis: body.diagnosis || "", characteristics: body.characteristics || [],
    examNotes: body.examNotes || [], sources: body.sources || [],
  }).where(eq(dictionaryTerms.id, c.req.param("id")));
  return c.json({ ok: true });
});

// DELETE /api/dictionary/:id
dict.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  if (!["instructor", "content_manager", "site_admin", "admin"].includes(user.role || "")) {
    return c.json({ ok: false, error: "فقط مدرس، مدیر محتوا یا ادمین می‌تواند اصطلاح حذف کند." }, 403);
  }
  await db.delete(dictionaryTerms).where(eq(dictionaryTerms.id, c.req.param("id")));
  return c.json({ ok: true });
});

export default dict;
