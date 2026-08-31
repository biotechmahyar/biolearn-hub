import { eq, ilike, desc, asc, and, sql } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  categories,
  courses,
  instructors,
  articles,
  products,
  workshops,
  testimonials,
  dictionaryTerms,
  type courses as coursesTable,
} from "../db/schema.js";

// ─── Categories ──────────────────────────────────────────────────────────────

export async function listCategories() {
  const db = getDb();
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function getCategoryBySlug(slug: string) {
  const db = getDb();
  const [cat] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return cat || null;
}

export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
}) {
  const db = getDb();
  const now = Date.now();
  const [cat] = await db
    .insert(categories)
    .values({ ...data, createdAt: now, updatedAt: now } as any)
    .returning();
  return cat;
}

export async function updateCategory(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    icon: string;
    color: string;
    sortOrder: number;
  }>
) {
  const db = getDb();
  const [cat] = await db
    .update(categories)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(categories.id, id))
    .returning();
  return cat || null;
}

export async function deleteCategory(id: string) {
  const db = getDb();
  await db.delete(categories).where(eq(categories.id, id));
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export interface ListCoursesQuery {
  categorySlug?: string;
  search?: string;
  featuredOnly?: boolean;
  popularOnly?: boolean;
  limit?: number;
}

export async function listCourses(query: ListCoursesQuery) {
  const db = getDb();
  const conditions = [eq(courses.published, true)];

  if (query.categorySlug) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, query.categorySlug))
      .limit(1);
    if (cat) conditions.push(eq(courses.categoryId, cat.id));
  }
  if (query.featuredOnly) conditions.push(eq(courses.featured, true));
  if (query.popularOnly) conditions.push(eq(courses.popular, true));

  let q = db.select().from(courses).where(and(...conditions));

  if (query.search) {
    q = db
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.published, true),
          ilike(courses.title, `%${query.search}%`)
        )
      ) as typeof q;
  }

  const limit = Math.min(query.limit || 50, 100);
  return q.orderBy(desc(courses.createdAt)).limit(limit);
}

export async function getCourseBySlug(slug: string) {
  const db = getDb();
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);
  return course || null;
}

export async function adminListCourses() {
  const db = getDb();
  return db.select().from(courses).orderBy(desc(courses.createdAt));
}

export async function createCourse(data: Record<string, unknown>) {
  const db = getDb();
  const now = Date.now();
  const [course] = await db
    .insert(courses)
    .values({ ...data, createdAt: now, updatedAt: now } as any)
    .returning();
  return course;
}

export async function updateCourse(id: string, data: Record<string, unknown>) {
  const db = getDb();
  const [course] = await db
    .update(courses)
    .set({ ...data, updatedAt: Date.now() } as Partial<typeof coursesTable.$inferInsert>)
    .where(eq(courses.id, id))
    .returning();
  return course || null;
}

export async function deleteCourse(id: string) {
  const db = getDb();
  await db.delete(courses).where(eq(courses.id, id));
}

export async function toggleCoursePublish(id: string) {
  const db = getDb();
  const [course] = await db
    .select({ published: courses.published })
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);
  if (!course) return null;
  const [updated] = await db
    .update(courses)
    .set({ published: !course.published, updatedAt: Date.now() })
    .where(eq(courses.id, id))
    .returning();
  return updated;
}

// ─── Instructors ─────────────────────────────────────────────────────────────

export async function listInstructors() {
  const db = getDb();
  return db.select().from(instructors).orderBy(asc(instructors.sortOrder));
}

export async function getInstructorBySlug(slug: string) {
  const db = getDb();
  const [inst] = await db
    .select()
    .from(instructors)
    .where(eq(instructors.slug, slug))
    .limit(1);
  return inst || null;
}

export async function adminListInstructors() {
  const db = getDb();
  return db.select().from(instructors).orderBy(desc(instructors.createdAt));
}

export async function createInstructor(data: Record<string, unknown>) {
  const db = getDb();
  const now = Date.now();
  const [inst] = await db
    .insert(instructors)
    .values({ ...data, createdAt: now, updatedAt: now } as any)
    .returning();
  return inst;
}

export async function updateInstructor(
  id: string,
  data: Record<string, unknown>
) {
  const db = getDb();
  const [inst] = await db
    .update(instructors)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(instructors.id, id))
    .returning();
  return inst || null;
}

export async function deleteInstructor(id: string) {
  const db = getDb();
  await db.delete(instructors).where(eq(instructors.id, id));
}

// ─── Articles ────────────────────────────────────────────────────────────────

export async function listArticles(query: {
  category?: string;
  limit?: number;
}) {
  const db = getDb();
  const conditions = [eq(articles.published, true)];
  if (query.category) {
    conditions.push(ilike(articles.category, query.category));
  }
  const limit = Math.min(query.limit || 50, 100);
  return db
    .select()
    .from(articles)
    .where(and(...conditions))
    .orderBy(desc(articles.createdAt))
    .limit(limit);
}

export async function getArticleBySlug(slug: string) {
  const db = getDb();
  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);
  return article || null;
}

export async function adminListArticles() {
  const db = getDb();
  return db.select().from(articles).orderBy(desc(articles.createdAt));
}

export async function createArticle(data: Record<string, unknown>) {
  const db = getDb();
  const now = Date.now();
  const [article] = await db
    .insert(articles)
    .values({ ...data, createdAt: now, updatedAt: now } as any)
    .returning();
  return article;
}

export async function updateArticle(id: string, data: Record<string, unknown>) {
  const db = getDb();
  const [article] = await db
    .update(articles)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(articles.id, id))
    .returning();
  return article || null;
}

export async function deleteArticle(id: string) {
  const db = getDb();
  await db.delete(articles).where(eq(articles.id, id));
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function listProducts() {
  const db = getDb();
  return db
    .select()
    .from(products)
    .where(eq(products.published, true))
    .orderBy(desc(products.createdAt));
}

export async function getProductBySlug(slug: string) {
  const db = getDb();
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  return product || null;
}

export async function adminListProducts() {
  const db = getDb();
  return db.select().from(products).orderBy(desc(products.createdAt));
}

export async function createProduct(data: Record<string, unknown>) {
  const db = getDb();
  const now = Date.now();
  const [product] = await db
    .insert(products)
    .values({ ...data, createdAt: now, updatedAt: now } as any)
    .returning();
  return product;
}

export async function updateProduct(id: string, data: Record<string, unknown>) {
  const db = getDb();
  const [product] = await db
    .update(products)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(products.id, id))
    .returning();
  return product || null;
}

export async function deleteProduct(id: string) {
  const db = getDb();
  await db.delete(products).where(eq(products.id, id));
}

// ─── Workshops ───────────────────────────────────────────────────────────────

export async function listWorkshops() {
  const db = getDb();
  return db
    .select()
    .from(workshops)
    .where(eq(workshops.published, true))
    .orderBy(desc(workshops.createdAt));
}

export async function getWorkshopBySlug(slug: string) {
  const db = getDb();
  const [ws] = await db
    .select()
    .from(workshops)
    .where(eq(workshops.slug, slug))
    .limit(1);
  return ws || null;
}

export async function adminListWorkshops() {
  const db = getDb();
  return db.select().from(workshops).orderBy(desc(workshops.createdAt));
}

export async function createWorkshop(data: Record<string, unknown>) {
  const db = getDb();
  const now = Date.now();
  const [ws] = await db
    .insert(workshops)
    .values({ ...data, createdAt: now, updatedAt: now } as any)
    .returning();
  return ws;
}

export async function updateWorkshop(id: string, data: Record<string, unknown>) {
  const db = getDb();
  const [ws] = await db
    .update(workshops)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(workshops.id, id))
    .returning();
  return ws || null;
}

export async function deleteWorkshop(id: string) {
  const db = getDb();
  await db.delete(workshops).where(eq(workshops.id, id));
}

// ─── Testimonials ────────────────────────────────────────────────────────────

export async function listTestimonials() {
  const db = getDb();
  return db.select().from(testimonials).orderBy(asc(testimonials.sortOrder));
}

// ─── Dictionary ──────────────────────────────────────────────────────────────

export async function searchDictionary(query?: string) {
  const db = getDb();
  if (!query) {
    return db.select().from(dictionaryTerms).orderBy(dictionaryTerms.term);
  }
  return db
    .select()
    .from(dictionaryTerms)
    .where(ilike(dictionaryTerms.term, `%${query}%`))
    .orderBy(dictionaryTerms.term);
}

export async function getDictionaryTerm(id: string) {
  const db = getDb();
  const [term] = await db
    .select()
    .from(dictionaryTerms)
    .where(eq(dictionaryTerms.id, id))
    .limit(1);
  return term || null;
}

export async function createDictionaryTerm(data: Record<string, unknown>) {
  const db = getDb();
  const now = Date.now();
  const [term] = await db
    .insert(dictionaryTerms)
    .values({ ...data, createdAt: now, updatedAt: now } as any)
    .returning();
  return term;
}

export async function updateDictionaryTerm(
  id: string,
  data: Record<string, unknown>
) {
  const db = getDb();
  const [term] = await db
    .update(dictionaryTerms)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(dictionaryTerms.id, id))
    .returning();
  return term || null;
}

export async function deleteDictionaryTerm(id: string) {
  const db = getDb();
  await db.delete(dictionaryTerms).where(eq(dictionaryTerms.id, id));
}
