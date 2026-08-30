/**
 * Public content routes — no auth required.
 * Mirrors: content.ts Convex queries.
 */
import { Hono } from "hono";
import { success } from "../lib/response.js";
import {
  categoryService,
  courseService,
  instructorService,
  articleService,
  productService,
  workshopService,
} from "../services/content.service.js";
import {
  listCoursesQuerySchema,
  listArticlesQuerySchema,
  createCategorySchema,
} from "../lib/validators.js";

import type { AppEnv } from "../lib/types.js";

const contentRoutes = new Hono<AppEnv>();

// ── Categories ─────────────────────────────────────────────────────────────
contentRoutes.get("/categories", async (c) => {
  const categories = await categoryService.list();
  return c.json(success(categories));
});

contentRoutes.post("/categories", async (c) => {
  const body = await c.req.json();
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.issues[0].message }, 400);
  }
  const cat = await categoryService.create(parsed.data.name);
  return c.json(success(cat), 201);
});

contentRoutes.get("/categories/:slug", async (c) => {
  const cat = await categoryService.findBySlug(c.req.param("slug"));
  if (!cat) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(success(cat));
});

// ── Courses ────────────────────────────────────────────────────────────────
contentRoutes.get("/courses", async (c) => {
  const query: Record<string, string> = Object.fromEntries(new URL(c.req.url).searchParams.entries());
  const parsed = listCoursesQuerySchema.safeParse(query);
  const filters = parsed.success ? parsed.data : {};
  const courses = await courseService.list({ ...filters, publishedOnly: true });
  return c.json(success(courses));
});

contentRoutes.get("/courses/:slug", async (c) => {
  const course = await courseService.findBySlug(c.req.param("slug"));
  if (!course || !course.published) {
    return c.json({ ok: false, error: "Not found" }, 404);
  }
  // Enrich with category and instructor names
  const [category, instructor] = await Promise.all([
    categoryService.findById(course.categoryId),
    instructorService.findById(course.instructorId),
  ]);
  return c.json(
    success({
      ...course,
      category: category ? { name: category.name, slug: category.slug, accent: category.accent } : null,
      instructor: instructor
        ? { name: instructor.name, slug: instructor.slug, title: instructor.title }
        : null,
    })
  );
});

// ── Instructors ────────────────────────────────────────────────────────────
contentRoutes.get("/instructors", async (c) => {
  const instructors = await instructorService.list();
  return c.json(success(instructors));
});

contentRoutes.get("/instructors/:slug", async (c) => {
  const instructor = await instructorService.findBySlug(c.req.param("slug"));
  if (!instructor) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(success(instructor));
});

// ── Articles ───────────────────────────────────────────────────────────────
contentRoutes.get("/articles", async (c) => {
  const query: Record<string, string> = Object.fromEntries(new URL(c.req.url).searchParams.entries());
  const parsed = listArticlesQuerySchema.safeParse(query);
  const filters = parsed.success ? parsed.data : {};
  const articles = await articleService.list({ ...filters, publishedOnly: true });
  return c.json(success(articles));
});

contentRoutes.get("/articles/:slug", async (c) => {
  const article = await articleService.findBySlug(c.req.param("slug"));
  if (!article || !article.published) {
    return c.json({ ok: false, error: "Not found" }, 404);
  }
  return c.json(success(article));
});

// ── Products ───────────────────────────────────────────────────────────────
contentRoutes.get("/products", async (c) => {
  const products = await productService.list({ publishedOnly: true });
  return c.json(success(products));
});

contentRoutes.get("/products/:slug", async (c) => {
  const product = await productService.findBySlug(c.req.param("slug"));
  if (!product || !product.published) {
    return c.json({ ok: false, error: "Not found" }, 404);
  }
  return c.json(success(product));
});

// ── Workshops ──────────────────────────────────────────────────────────────
contentRoutes.get("/workshops", async (c) => {
  const workshops = await workshopService.list({ publishedOnly: true });
  return c.json(success(workshops));
});

contentRoutes.get("/workshops/:slug", async (c) => {
  const workshop = await workshopService.findBySlug(c.req.param("slug"));
  if (!workshop || !workshop.published) {
    return c.json({ ok: false, error: "Not found" }, 404);
  }
  return c.json(success(workshop));
});

// ── Testimonials ───────────────────────────────────────────────────────────
contentRoutes.get("/testimonials", async (c) => {
  // Placeholder — testimonials are static or loaded from DB later
  return c.json(success([]));
});

export { contentRoutes };
