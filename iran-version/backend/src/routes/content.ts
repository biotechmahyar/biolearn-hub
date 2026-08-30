import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { categories, courses, instructors, articles, products, workshops, testimonials, enrollments } from "../db/schema.js";
import { eq, ilike, or, and, desc, sql } from "drizzle-orm";
import { optionalAuth, getCurrentUser } from "../middleware/auth.js";
import { requireContentCreator } from "../middleware/rbac.js";
import { successResponse, errorResponse } from "../types/index.js";

const content = new Hono();

// ── Categories ──────────────────────────────────────────────────────────────

// GET /api/content/categories
content.get("/categories", async (c) => {
  const rows = await db.select().from(categories).orderBy(categories.order);
  return c.json(successResponse(rows));
});

// GET /api/content/categories/:slug
content.get("/categories/:slug", async (c) => {
  const slug = c.req.param("slug");
  const rows = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("دسته یافت نشد."), 404);
  return c.json(successResponse(rows[0]));
});

// POST /api/content/categories (requires instructor or admin)
content.post("/categories", requireContentCreator, async (c) => {
  const body = await c.req.json();
  const name = body.name?.trim();
  if (!name) return c.json(errorResponse("نام دسته لازم است."), 400);

  // Check duplicate
  const existing = await db.select().from(categories).where(eq(categories.name, name)).limit(1);
  if (existing.length > 0) return c.json(successResponse(existing[0].id));

  // Get max order
  const allCats = await db.select({ order: categories.order }).from(categories);
  const maxOrder = allCats.reduce((m, c) => Math.max(m, c.order ?? 0), 0);

  const slug = name.replace(/\s+/g, "-").toLowerCase() + "-" + Date.now().toString(36);
  const [cat] = await db
    .insert(categories)
    .values({
      name,
      slug,
      description: "",
      icon: "Dna",
      accent: "teal",
      order: maxOrder + 1,
    })
    .returning();
  return c.json(successResponse(cat.id), 201);
});

// ── Courses ─────────────────────────────────────────────────────────────────

// GET /api/content/courses
content.get("/courses", optionalAuth, async (c) => {
  const categorySlug = c.req.query("categorySlug");
  const search = c.req.query("search");
  const featuredOnly = c.req.query("featuredOnly") === "true";
  const popularOnly = c.req.query("popularOnly") === "true";
  const limit = parseInt(c.req.query("limit") || "50", 10);

  let query = db.select().from(courses).where(eq(courses.published, true));

  if (featuredOnly) {
    query = db.select().from(courses).where(and(eq(courses.published, true), eq(courses.featured, true)));
  }
  if (popularOnly) {
    query = db.select().from(courses).where(and(eq(courses.published, true), eq(courses.popular, true)));
  }

  const rows = await query.orderBy(desc(courses.createdAt));

  // Enrich with category and instructor
  const enriched = await Promise.all(
    rows
      .filter((row) => !categorySlug || true) // filter in-memory for simplicity
      .map(async (c) => {
        const catRows = await db.select().from(categories).where(eq(categories.id, c.categoryId)).limit(1);
        const instRows = await db.select().from(instructors).where(eq(instructors.id, c.instructorId)).limit(1);
        return {
          ...c,
          category: catRows[0] ? { name: catRows[0].name, slug: catRows[0].slug, accent: catRows[0].accent } : null,
          instructor: instRows[0] ? { name: instRows[0].name, slug: instRows[0].slug, title: instRows[0].title } : null,
        };
      }),
  );

  let result = enriched;

  if (categorySlug) {
    const catRows = await db.select().from(categories).where(eq(categories.slug, categorySlug)).limit(1);
    if (catRows.length > 0) {
      result = result.filter((c) => c.categoryId === catRows[0].id);
    } else {
      result = [];
    }
  }

  if (search) {
    const s = search.trim().toLowerCase();
    result = result.filter(
      (c) => c.title.toLowerCase().includes(s) || c.summary.toLowerCase().includes(s),
    );
  }

  result = result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  if (limit) result = result.slice(0, limit);

  return c.json(successResponse(result));
});

// GET /api/content/courses/:slug
content.get("/courses/:slug", optionalAuth, async (c) => {
  const slug = c.req.param("slug");
  const rows = await db.select().from(courses).where(and(eq(courses.slug, slug), eq(courses.published, true))).limit(1);
  if (rows.length === 0) return c.json(errorResponse("دوره یافت نشد."), 404);
  const course = rows[0];

  const catRows = await db.select().from(categories).where(eq(categories.id, course.categoryId)).limit(1);
  const instRows = await db.select().from(instructors).where(eq(instructors.id, course.instructorId)).limit(1);

  // Check enrollment
  let enrollment = null;
  const userId = getCurrentUser(c)?.id;
  if (userId) {
    const enRows = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, course.id)))
      .limit(1);
    if (enRows.length > 0) {
      enrollment = { enrolledAt: enRows[0].enrolledAt, completedLessons: enRows[0].completedLessons };
    }
  }

  return c.json(
    successResponse({
      ...course,
      category: catRows[0] || null,
      instructor: instRows[0] || null,
      enrollment,
    }),
  );
});

// ── Instructors ─────────────────────────────────────────────────────────────

// GET /api/content/instructors
content.get("/instructors", async (c) => {
  const rows = await db.select().from(instructors);
  return c.json(successResponse(rows));
});

// GET /api/content/instructors/:slug
content.get("/instructors/:slug", async (c) => {
  const slug = c.req.param("slug");
  const rows = await db.select().from(instructors).where(eq(instructors.slug, slug)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("مدرس یافت نشد."), 404);
  const instructor = rows[0];

  const courseRows = await db
    .select()
    .from(courses)
    .where(and(eq(courses.instructorId, instructor.id), eq(courses.published, true)));
  const workshopRows = await db.select().from(workshops).where(eq(workshops.instructorId, instructor.id));

  return c.json(successResponse({ ...instructor, courses: courseRows, workshops: workshopRows }));
});

// ── Articles ────────────────────────────────────────────────────────────────

// GET /api/content/articles
content.get("/articles", async (c) => {
  const category = c.req.query("category");
  const limit = parseInt(c.req.query("limit") || "20", 10);

  let rows = await db.select().from(articles).where(eq(articles.published, true)).orderBy(desc(articles.createdAt));
  if (category) {
    rows = rows.filter((a) => a.category === category);
  }
  if (limit) rows = rows.slice(0, limit);
  return c.json(successResponse(rows));
});

// GET /api/content/articles/:slug
content.get("/articles/:slug", async (c) => {
  const slug = c.req.param("slug");
  const rows = await db.select().from(articles).where(and(eq(articles.slug, slug), eq(articles.published, true))).limit(1);
  if (rows.length === 0) return c.json(errorResponse("مقاله یافت نشد."), 404);
  return c.json(successResponse(rows[0]));
});

// ── Products ────────────────────────────────────────────────────────────────

// GET /api/content/products
content.get("/products", async (c) => {
  const rows = await db.select().from(products).where(eq(products.published, true)).orderBy(desc(products.createdAt));
  return c.json(successResponse(rows));
});

// GET /api/content/products/:slug
content.get("/products/:slug", async (c) => {
  const slug = c.req.param("slug");
  const rows = await db.select().from(products).where(and(eq(products.slug, slug), eq(products.published, true))).limit(1);
  if (rows.length === 0) return c.json(errorResponse("محصول یافت نشد."), 404);
  return c.json(successResponse(rows[0]));
});

// ── Workshops ───────────────────────────────────────────────────────────────

// GET /api/content/workshops
content.get("/workshops", async (c) => {
  const rows = await db.select().from(workshops).where(eq(workshops.published, true));
  const enriched = await Promise.all(
    rows.map(async (w) => {
      const instRows = await db.select().from(instructors).where(eq(instructors.id, w.instructorId)).limit(1);
      return { ...w, instructor: instRows[0] || null };
    }),
  );
  enriched.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  return c.json(successResponse(enriched));
});

// GET /api/content/workshops/:slug
content.get("/workshops/:slug", async (c) => {
  const slug = c.req.param("slug");
  const rows = await db.select().from(workshops).where(and(eq(workshops.slug, slug), eq(workshops.published, true))).limit(1);
  if (rows.length === 0) return c.json(errorResponse("کارگاه یافت نشد."), 404);
  const workshop = rows[0];
  const instRows = await db.select().from(instructors).where(eq(instructors.id, workshop.instructorId)).limit(1);
  return c.json(successResponse({ ...workshop, instructor: instRows[0] || null }));
});

// ── Testimonials ────────────────────────────────────────────────────────────

// GET /api/content/testimonials
content.get("/testimonials", async (c) => {
  const rows = await db.select().from(testimonials);
  return c.json(successResponse(rows));
});

export default content;
