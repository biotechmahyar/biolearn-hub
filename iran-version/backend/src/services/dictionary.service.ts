/**
 * Service layer for Dictionary terms.
 * Mirrors: content.ts dictionary mutations/queries.
 */
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { dictionaryTerms } from "../db/schema.js";

function slugifyTerm(term: string) {
  const t = term.trim();
  if (!t) return "term";
  if (/^[a-zA-Z0-9]/.test(t)) {
    return t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "term";
  }
  return encodeURIComponent(t).replace(/%/g, "-");
}

export const dictionaryService = {
  async search(query?: string, limit?: number) {
    let rows = await db.select().from(dictionaryTerms);
    const q = (query ?? "").trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (t) =>
          (t.term && t.term.toLowerCase().includes(q)) ||
          (t.fullName && t.fullName.toLowerCase().includes(q)) ||
          (t.slug && t.slug.toLowerCase().includes(q))
      );
    }
    return rows.slice(0, limit ?? 20);
  },

  async findBySlug(slug: string) {
    const rows = await db.select().from(dictionaryTerms).where(eq(dictionaryTerms.slug, slug)).limit(1);
    return rows[0] ?? null;
  },

  async create(data: {
    term: string;
    fullName: string;
    gramStatus: string;
    shape: string;
    oxygen: string;
    habitat: string;
    diseases: string[];
    virulence: string[];
    diagnosis: string;
    characteristics: string[];
    examNotes: string[];
    sources: string[];
  }) {
    const term = data.term.trim();
    if (!term) throw new Error("نام اصطلاح لازم است.");
    const existing = await db.select().from(dictionaryTerms).where(eq(dictionaryTerms.term, term)).limit(1);
    if (existing[0]) throw new Error("این اصطلاح از قبل در دیکشنری وجود دارد.");

    const [row] = await db
      .insert(dictionaryTerms)
      .values({
        ...data,
        term,
        slug: slugifyTerm(term),
      })
      .returning();
    return row;
  },

  async update(
    id: string,
    data: {
      term: string;
      fullName: string;
      gramStatus: string;
      shape: string;
      oxygen: string;
      habitat: string;
      diseases: string[];
      virulence: string[];
      diagnosis: string;
      characteristics: string[];
      examNotes: string[];
      sources: string[];
    }
  ) {
    const term = data.term.trim();
    if (!term) throw new Error("نام اصطلاح لازم است.");
    const currentRows = await db.select().from(dictionaryTerms).where(eq(dictionaryTerms.id, id)).limit(1);
    if (!currentRows[0]) throw new Error("اصطلاح یافت نشد.");

    const dup = await db.select().from(dictionaryTerms).where(eq(dictionaryTerms.term, term)).limit(1);
    if (dup[0] && dup[0].id !== id) {
      throw new Error("اصطلاحی با این نام از قبل وجود دارد.");
    }

    const [row] = await db
      .update(dictionaryTerms)
      .set({ ...data, term, slug: slugifyTerm(term) })
      .where(eq(dictionaryTerms.id, id))
      .returning();
    return row;
  },

  async delete(id: string) {
    const [row] = await db.delete(dictionaryTerms).where(eq(dictionaryTerms.id, id)).returning();
    return row ?? null;
  },
};
