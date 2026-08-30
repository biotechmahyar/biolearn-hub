import { Hono } from "hono";
import { db } from "../db/index.js";
import { categories, courses, instructors, products, workshops, articles, testimonials } from "../db/schema.js";
import { requireAuth, requireContentStaff } from "../middleware/auth.js";
import { eq, desc, and, ilike, sql } from "drizzle-orm";

const content = new Hono();

// ── Categories ──────────────────────────────────────────────────────────────

// GET /api/content/categories
content.get("/categories", async (c) => {
  const cats = await db.query.categories.findMany({
    orderBy: (t, { asc }) => [asc(t.order)],
  });
  return c.json({ ok: true, data: cats });
});

// GET /api/content/categories/:slug
content.get("/categories/:slug", async (c) => {
  const slug = c.req.param("slug");
  const cat = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });
  if (!cat) return c.json({ ok: false, error: "دسته یافت نشد." }, 404);
  return c.json({ ok: true, data: cat });
});

// POST /api/content/categories (instructor/admin)
content.post("/categories", requireContentStaff, async (c) => {
  const { name } = await c.req.json();
  if (!name || !name.trim()) return c.json({ ok: false, error: "نام دسته لازم است." }, 400);
  const trimmed = name.trim();
  const existing = await db.query.categories.findFirst({ where: eq(categories.name, trimmed) });
  if (existing) return c.json({ ok: true, data: existing });
  const maxOrder = await db.query.categories.findMany().then((all) =>
    all.reduce((m, cat) => Math.max(m, cat.order), 0)
  );
  const [created] = await db.insert(categories).values({
    name: trimmed,
    slug: trimmed.replace(/\s+/g, "-").toLowerCase() + "-" + Date.now().toString(36),
    description: "",
    icon: "Dna",
    accent: "teal",
    order: maxOrder + 1,
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

// ── Courses ─────────────────────────────────────────────────────────────────

// GET /api/content/courses
content.get("/courses", async (c) => {
  const categorySlug = c.req.query("categorySlug");
  const search = c.req.query("search");
  const featuredOnly = c.req.query("featuredOnly") === "true";
  const popularOnly = c.req.query("popularOnly") === "true";
  const limit = parseInt(c.req.query("limit") || "50");

  let coursesList = await db.query.courses.findMany({
    where: eq(courses.published, true),
  });

  if (featuredOnly) coursesList = coursesList.filter((c) => c.featured);
  if (popularOnly) coursesList = coursesList.filter((c) => c.popular);
  if (categorySlug) {
    const cat = await db.query.categories.findFirst({ where: eq(categories.slug, categorySlug) });
    if (cat) coursesList = coursesList.filter((c) => c.categoryId === cat.id);
    else coursesList = [];
  }
  if (search) {
    const s = search.trim().toLowerCase();
    coursesList = coursesList.filter(
      (c) => c.title.toLowerCase().includes(s) || c.summary.toLowerCase().includes(s)
    );
  }

  coursesList.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0);
  });

  if (limit) coursesList = coursesList.slice(0, limit);

  const enriched = await Promise.all(
    coursesList.map(async (course) => {
      const [category, instructor] = await Promise.all([
        db.query.categories.findFirst({ where: eq(categories.id, course.categoryId) }),
        db.query.instructors.findFirst({ where: eq(instructors.id, course.instructorId) }),
      ]);
      return {
        ...course,
        category: category ? { name: category.name, slug: category.slug, accent: category.accent } : null,
        instructor: instructor ? { name: instructor.name, slug: instructor.slug, title: instructor.title } : null,
      };
    })
  );

  return c.json({ ok: true, data: enriched });
});

// GET /api/content/courses/:slug
content.get("/courses/:slug", async (c) => {
  const slug = c.req.param("slug");
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.slug, slug), eq(courses.published, true)),
  });
  if (!course) return c.json({ ok: false, error: "دوره یافت نشد." }, 404);

  const [category, instructor] = await Promise.all([
    db.query.categories.findFirst({ where: eq(categories.id, course.categoryId) }),
    db.query.instructors.findFirst({ where: eq(instructors.id, course.instructorId) }),
  ]);

  return c.json({
    ok: true,
    data: {
      ...course,
      category,
      instructor,
      enrollment: null,
    },
  });
});

// ── Instructors ─────────────────────────────────────────────────────────────

// GET /api/content/instructors
content.get("/instructors", async (c) => {
  const list = await db.query.instructors.findMany();
  return c.json({ ok: true, data: list });
});

// GET /api/content/instructors/:slug
content.get("/instructors/:slug", async (c) => {
  const slug = c.req.param("slug");
  const inst = await db.query.instructors.findFirst({
    where: eq(instructors.slug, slug),
  });
  if (!inst) return c.json({ ok: false, error: "مدرس یافت نشد." }, 404);

  const [coursesList, workshopsList] = await Promise.all([
    db.query.courses.findMany({
      where: and(eq(courses.instructorId, inst.id), eq(courses.published, true)),
    }),
    db.query.workshops.findMany({
      where: eq(workshops.instructorId, inst.id),
    }),
  ]);

  return c.json({ ok: true, data: { ...inst, courses: coursesList, workshops: workshopsList } });
});

// ── Articles ────────────────────────────────────────────────────────────────

// GET /api/content/articles
content.get("/articles", async (c) => {
  const category = c.req.query("category");
  const limit = parseInt(c.req.query("limit") || "20");

  let articlesList = await db.query.articles.findMany({
    where: eq(articles.published, true),
  });

  if (category) articlesList = articlesList.filter((a) => a.category === category);
  articlesList.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  if (limit) articlesList = articlesList.slice(0, limit);

  return c.json({ ok: true, data: articlesList });
});

// GET /api/content/articles/:slug
content.get("/articles/:slug", async (c) => {
  const slug = c.req.param("slug");
  const article = await db.query.articles.findFirst({
    where: and(eq(articles.slug, slug), eq(articles.published, true)),
  });
  if (!article) return c.json({ ok: false, error: "مقاله یافت نشد." }, 404);
  return c.json({ ok: true, data: article });
});

// ── Products ────────────────────────────────────────────────────────────────

// GET /api/content/products
content.get("/products", async (c) => {
  const featuredOnly = c.req.query("featuredOnly") === "true";
  let list = await db.query.products.findMany({
    where: eq(products.published, true),
  });
  if (featuredOnly) list = list.filter((p) => p.featured);
  list.sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0));
  return c.json({ ok: true, data: list });
});

// GET /api/content/products/:slug
content.get("/products/:slug", async (c) => {
  const slug = c.req.param("slug");
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.published, true)),
  });
  if (!product) return c.json({ ok: false, error: "محصول یافت نشد." }, 404);
  return c.json({ ok: true, data: product });
});

// ── Workshops ───────────────────────────────────────────────────────────────

// GET /api/content/workshops
content.get("/workshops", async (c) => {
  const list = await db.query.workshops.findMany({
    where: eq(workshops.published, true),
  });
  const enriched = await Promise.all(
    list.map(async (w) => ({
      ...w,
      instructor: await db.query.instructors.findFirst({ where: eq(instructors.id, w.instructorId) }),
    }))
  );
  enriched.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  return c.json({ ok: true, data: enriched });
});

// GET /api/content/workshops/:slug
content.get("/workshops/:slug", async (c) => {
  const slug = c.req.param("slug");
  const workshop = await db.query.workshops.findFirst({
    where: and(eq(workshops.slug, slug), eq(workshops.published, true)),
  });
  if (!workshop) return c.json({ ok: false, error: "کارگاه یافت نشد." }, 404);
  const instructor = await db.query.instructors.findFirst({
    where: eq(instructors.id, workshop.instructorId),
  });
  return c.json({ ok: true, data: { ...workshop, instructor } });
});

// ── Testimonials ────────────────────────────────────────────────────────────

content.get("/testimonials", async (c) => {
  const list = await db.query.testimonials.findMany();
  return c.json({ ok: true, data: list });
});

export default content;
