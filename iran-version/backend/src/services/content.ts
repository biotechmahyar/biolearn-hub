import { db } from "../db/index.js";
import { categories, courses, instructors, articles, products, workshops, testimonials } from "../db/schema.js";
import { eq, ilike, or, desc } from "drizzle-orm";

export async function listCategories() {
  return db.query.categories.findMany({ orderBy: (c, { asc }) => [asc(c.order)] });
}

export async function getCategoryBySlug(slug: string) {
  return db.query.categories.findFirst({ where: eq(categories.slug, slug) });
}

export async function listCourses(opts: { categorySlug?: string; search?: string; featuredOnly?: boolean; popularOnly?: boolean; limit?: number }) {
  let rows = await db.query.courses.findMany({
    where: eq(courses.published, true),
    orderBy: (c, { desc }) => [desc(c.featured), desc(c.createdAt)],
  });
  if (opts.categorySlug) {
    const cat = await db.query.categories.findFirst({ where: eq(categories.slug, opts.categorySlug) });
    if (cat) rows = rows.filter((r) => r.categoryId === cat.id);
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    rows = rows.filter((r) => r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q));
  }
  if (opts.featuredOnly) rows = rows.filter((r) => r.featured);
  if (opts.popularOnly) rows = rows.filter((r) => r.popular);
  if (opts.limit) rows = rows.slice(0, opts.limit);
  // Attach category name
  const cats = await db.query.categories.findMany();
  const catMap = new Map(cats.map((c) => [c.id, c]));
  return rows.map((r) => ({
    ...r,
    category: catMap.get(r.categoryId) ? { name: catMap.get(r.categoryId)!.name, accent: catMap.get(r.categoryId)!.accent } : null,
  }));
}

export async function getCourseBySlug(slug: string) {
  const course = await db.query.courses.findFirst({ where: eq(courses.slug, slug) });
  if (!course) return null;
  const cat = await db.query.categories.findFirst({ where: eq(categories.id, course.categoryId) });
  const inst = await db.query.instructors.findFirst({ where: eq(instructors.id, course.instructorId) });
  return { ...course, category: cat, instructor: inst };
}

export async function listInstructors() {
  return db.query.instructors.findMany();
}

export async function getInstructorBySlug(slug: string) {
  return db.query.instructors.findFirst({ where: eq(instructors.slug, slug) });
}

export async function listArticles(opts: { category?: string; limit?: number }) {
  let rows = await db.query.articles.findMany({
    where: eq(articles.published, true),
    orderBy: (a, { desc }) => [desc(a.featured), desc(a.createdAt)],
  });
  if (opts.category) rows = rows.filter((r) => r.category === opts.category);
  if (opts.limit) rows = rows.slice(0, opts.limit);
  return rows;
}

export async function getArticleBySlug(slug: string) {
  const article = await db.query.articles.findFirst({ where: eq(articles.slug, slug) });
  if (!article) return null;
  // Increment views
  await db.update(articles).set({ views: (article.views ?? 0) + 1 }).where(eq(articles.id, article.id));
  return { ...article, views: (article.views ?? 0) + 1 };
}

export async function listProducts() {
  return db.query.products.findMany({
    where: eq(products.published, true),
    orderBy: (p, { desc }) => [desc(p.featured), desc(p.createdAt)],
  });
}

export async function getProductBySlug(slug: string) {
  return db.query.products.findFirst({ where: eq(products.slug, slug) });
}

export async function listWorkshops() {
  return db.query.workshops.findMany({
    where: eq(workshops.published, true),
    orderBy: (w, { desc }) => [desc(w.featured), desc(w.createdAt)],
  });
}

export async function getWorkshopBySlug(slug: string) {
  return db.query.workshops.findFirst({ where: eq(workshops.slug, slug) });
}

export async function listTestimonials() {
  return db.query.testimonials.findMany({ orderBy: (t, { desc }) => [desc(t.createdAt)] });
}
