import { Hono } from "hono";
import { successResponse } from "../lib/errors.js";
import { validateBody, validateQuery, z } from "../lib/validate.js";
import { authenticate, requireInstructor } from "../middleware/auth.js";
import * as contentService from "../services/content.service.js";

const content = new Hono();

// ─── Categories ──────────────────────────────────────────────────────────────

content.get("/categories", async (c) => {
  const data = await contentService.listCategories();
  return c.json(successResponse(data));
});

content.get("/categories/:slug", async (c) => {
  const slug = c.req.param("slug")!!;
  const data = await contentService.getCategoryBySlug(slug);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

content.post("/categories", authenticate, requireInstructor, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
    })
  );
  const data = await contentService.createCategory(body);
  return c.json(successResponse(data), 201);
});

// ─── Courses ─────────────────────────────────────────────────────────────────

content.get("/courses", async (c) => {
  const query = validateQuery(
    c,
    z.object({
      categorySlug: z.string().optional(),
      search: z.string().optional(),
      featuredOnly: z.coerce.boolean().optional(),
      popularOnly: z.coerce.boolean().optional(),
      limit: z.coerce.number().optional(),
    })
  );
  const data = await contentService.listCourses(query);
  return c.json(successResponse(data));
});

content.get("/courses/:slug", async (c) => {
  const slug = c.req.param("slug")!!;
  const data = await contentService.getCourseBySlug(slug);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

// ─── Instructors ─────────────────────────────────────────────────────────────

content.get("/instructors", async (c) => {
  const data = await contentService.listInstructors();
  return c.json(successResponse(data));
});

content.get("/instructors/:slug", async (c) => {
  const slug = c.req.param("slug")!!;
  const data = await contentService.getInstructorBySlug(slug);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

// ─── Articles ────────────────────────────────────────────────────────────────

content.get("/articles", async (c) => {
  const query = validateQuery(
    c,
    z.object({
      category: z.string().optional(),
      limit: z.coerce.number().optional(),
    })
  );
  const data = await contentService.listArticles(query);
  return c.json(successResponse(data));
});

content.get("/articles/:slug", async (c) => {
  const slug = c.req.param("slug")!!;
  const data = await contentService.getArticleBySlug(slug);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

// ─── Products ────────────────────────────────────────────────────────────────

content.get("/products", async (c) => {
  const data = await contentService.listProducts();
  return c.json(successResponse(data));
});

content.get("/products/:slug", async (c) => {
  const slug = c.req.param("slug")!!;
  const data = await contentService.getProductBySlug(slug);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

// ─── Workshops ───────────────────────────────────────────────────────────────

content.get("/workshops", async (c) => {
  const data = await contentService.listWorkshops();
  return c.json(successResponse(data));
});

content.get("/workshops/:slug", async (c) => {
  const slug = c.req.param("slug")!!;
  const data = await contentService.getWorkshopBySlug(slug);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

// ─── Testimonials ────────────────────────────────────────────────────────────

content.get("/testimonials", async (c) => {
  const data = await contentService.listTestimonials();
  return c.json(successResponse(data));
});

// ─── Dictionary ──────────────────────────────────────────────────────────────

content.get("/dictionary", async (c) => {
  const query = validateQuery(c, z.object({ query: z.string().optional() }));
  const data = await contentService.searchDictionary(query.query);
  return c.json(successResponse(data));
});

content.get("/dictionary/:id", async (c) => {
  const id = c.req.param("id")!!;
  const data = await contentService.getDictionaryTerm(id);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

content.post("/dictionary", authenticate, requireInstructor, async (c) => {
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await contentService.createDictionaryTerm(body);
  return c.json(successResponse(data), 201);
});

content.put("/dictionary/:id", authenticate, requireInstructor, async (c) => {
  const id = c.req.param("id")!!;
  const body = await validateBody(c, z.record(z.unknown()));
  const data = await contentService.updateDictionaryTerm(id, body);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

content.delete("/dictionary/:id", authenticate, requireInstructor, async (c) => {
  await contentService.deleteDictionaryTerm(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

export default content;
