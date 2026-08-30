/**
 * Service layer for core NIBRC entities.
 * Business logic only — no HTTP/framework concerns.
 */
import { eq, desc, asc, ilike, and } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  categories,
  courses,
  instructors,
  articles,
  products,
  workshops,
  enrollments,
} from "../db/schema.js";

// ══════════════════════════════════════════════════════════════════════════════
// ── Categories ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const categoryService = {
  async list() {
    return db.select().from(categories).orderBy(asc(categories.order));
  },

  async findById(id: string) {
    const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findBySlug(slug: string) {
    const rows = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    return rows[0] ?? null;
  },

  async create(name: string) {
    const existing = await db.select().from(categories).where(eq(categories.name, name)).limit(1);
    if (existing.length > 0) return existing[0];

    const maxOrderRows = await db.select({ max: categories.order }).from(categories);
    const maxOrder = maxOrderRows.reduce((m, r) => Math.max(m, r.max ?? 0), 0);

    const slug =
      name
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase() +
      "-" +
      Date.now().toString(36);

    const [row] = await db
      .insert(categories)
      .values({
        name: name.trim(),
        slug,
        description: "",
        icon: "Dna",
        accent: "teal",
        order: maxOrder + 1,
      })
      .returning();
    return row;
  },

  async update(
    id: string,
    data: { name?: string; slug?: string; description?: string; icon?: string; accent?: string; order?: number }
  ) {
    const [row] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return row ?? null;
  },

  async delete(id: string) {
    const [row] = await db.delete(categories).where(eq(categories.id, id)).returning();
    return row ?? null;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Courses ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export interface CourseFilters {
  categorySlug?: string;
  search?: string;
  featuredOnly?: boolean;
  popularOnly?: boolean;
  limit?: number;
  publishedOnly?: boolean;
}

export const courseService = {
  async list(filters: CourseFilters = {}) {
    const conditions = [];
    if (filters.publishedOnly) conditions.push(eq(courses.published, true));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    let rows = await db.select().from(courses).where(where).orderBy(desc(courses.createdAt));

    if (filters.categorySlug) {
      const cat = await categoryService.findBySlug(filters.categorySlug);
      if (!cat) return [];
      rows = rows.filter((c) => c.categoryId === cat.id);
    }
    if (filters.featuredOnly) rows = rows.filter((c) => c.featured);
    if (filters.popularOnly) rows = rows.filter((c) => c.popular);
    if (filters.search) {
      const s = filters.search.trim().toLowerCase();
      rows = rows.filter(
        (c) =>
          (c.title && c.title.toLowerCase().includes(s)) ||
          (c.summary && c.summary.toLowerCase().includes(s))
      );
    }
    if (filters.limit) rows = rows.slice(0, filters.limit);
    return rows;
  },

  async listAdmin() {
    const rows = await db.select().from(courses).orderBy(desc(courses.createdAt));
    return rows;
  },

  async findBySlug(slug: string) {
    const rows = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
    return rows[0] ?? null;
  },

  async findById(id: string) {
    const rows = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findEnrollment(userId: string, courseId: string) {
    const rows = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
      .limit(1);
    return rows[0] ?? null;
  },

  async create(data: {
    title: string;
    slug: string;
    categoryId: string;
    instructorId: string;
    summary: string;
    price: number;
    mode: string;
    bundle: string;
    published: boolean;
    audience?: string[];
    prerequisites?: string[];
    syllabus?: { title: string; durationMin: number; free: boolean }[];
    packagePrices?: { tier: string; price: number; features: string[] }[];
  }) {
    const [row] = await db
      .insert(courses)
      .values({
        title: data.title.trim(),
        slug: data.slug,
        categoryId: data.categoryId,
        instructorId: data.instructorId,
        summary: data.summary.trim(),
        description: data.summary.trim(),
        audience: data.audience ?? [],
        prerequisites: data.prerequisites ?? [],
        syllabus: (data.syllabus ?? []).map((s, i) => ({ ...s, id: `s${i}` })),
        durationText: "\u0628\u0647\u200c\u0632\u0648\u062f\u06cc",
        mode: data.mode,
        price: data.price,
        rating: 0,
        ratingCount: 0,
        studentsCount: 0,
        accent: "teal",
        bundle: data.bundle,
        packagePrices: data.packagePrices,
        includes: [],
        hasSampleVideo: false,
        files: [],
        published: data.published,
        featured: false,
        popular: false,
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async update(
    id: string,
    data: {
      title: string;
      categoryId: string;
      instructorId: string;
      summary: string;
      price: number;
      mode: string;
      bundle: string;
      published: boolean;
      audience?: string[];
      prerequisites?: string[];
      syllabus?: { title: string; durationMin: number; free: boolean }[];
      packagePrices?: { tier: string; price: number; features: string[] }[];
    }
  ) {
    const patch: Record<string, unknown> = {
      title: data.title.trim(),
      categoryId: data.categoryId,
      instructorId: data.instructorId,
      summary: data.summary.trim(),
      description: data.summary.trim(),
      price: data.price,
      mode: data.mode,
      bundle: data.bundle,
      published: data.published,
    };
    if (data.audience !== undefined) patch.audience = data.audience;
    if (data.prerequisites !== undefined) patch.prerequisites = data.prerequisites;
    if (data.syllabus !== undefined)
      patch.syllabus = data.syllabus.map((s, i) => ({ ...s, id: `s${i}` }));
    if (data.packagePrices !== undefined) patch.packagePrices = data.packagePrices;

    const [row] = await db.update(courses).set(patch).where(eq(courses.id, id)).returning();
    return row ?? null;
  },

  async togglePublished(id: string, published: boolean) {
    const [row] = await db.update(courses).set({ published }).where(eq(courses.id, id)).returning();
    return row ?? null;
  },

  async delete(id: string) {
    const [row] = await db.delete(courses).where(eq(courses.id, id)).returning();
    return row ?? null;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Instructors ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const instructorService = {
  async list() {
    return db.select().from(instructors).orderBy(asc(instructors.name));
  },

  async findBySlug(slug: string) {
    const rows = await db.select().from(instructors).where(eq(instructors.slug, slug)).limit(1);
    return rows[0] ?? null;
  },

  async findById(id: string) {
    const rows = await db.select().from(instructors).where(eq(instructors.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findByUserId(userId: string) {
    const rows = await db.select().from(instructors).where(eq(instructors.userId, userId)).limit(1);
    return rows[0] ?? null;
  },

  async create(data: {
    name: string;
    title: string;
    bio: string;
    education: string[];
    specialties: string[];
    accent?: string;
    verified: boolean;
    userId?: string;
  }) {
    const [row] = await db
      .insert(instructors)
      .values({
        name: data.name.trim(),
        slug: data.name.trim().replace(/\s+/g, "-").toLowerCase(),
        title: data.title.trim(),
        bio: data.bio,
        education: data.education.filter((e) => e.trim()),
        specialties: data.specialties.filter((s) => s.trim()),
        accent: data.accent || "teal",
        verified: data.verified,
        userId: data.userId,
      })
      .returning();
    return row;
  },

  async update(
    id: string,
    data: {
      name: string;
      title: string;
      bio: string;
      education: string[];
      specialties: string[];
      accent?: string;
      verified: boolean;
      userId?: string | null;
    }
  ) {
    const patch: Record<string, unknown> = {
      name: data.name.trim(),
      title: data.title.trim(),
      bio: data.bio,
      education: data.education.filter((e) => e.trim()),
      specialties: data.specialties.filter((s) => s.trim()),
      accent: data.accent || "teal",
      verified: data.verified,
    };
    if (data.userId !== undefined) patch.userId = data.userId || null;
    const [row] = await db.update(instructors).set(patch).where(eq(instructors.id, id)).returning();
    return row ?? null;
  },

  async delete(id: string) {
    const [row] = await db.delete(instructors).where(eq(instructors.id, id)).returning();
    return row ?? null;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Articles ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export interface ArticleFilters {
  category?: string;
  limit?: number;
  publishedOnly?: boolean;
}

export const articleService = {
  async list(filters: ArticleFilters = {}) {
    const conditions = [];
    if (filters.publishedOnly) conditions.push(eq(articles.published, true));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    let rows = await db.select().from(articles).where(where).orderBy(desc(articles.createdAt));

    if (filters.category) rows = rows.filter((a) => a.category === filters.category);
    if (filters.limit) rows = rows.slice(0, filters.limit);
    return rows;
  },

  async listAdmin() {
    return db.select().from(articles).orderBy(desc(articles.createdAt));
  },

  async findBySlug(slug: string) {
    const rows = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
    return rows[0] ?? null;
  },

  async findById(id: string) {
    const rows = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async create(data: {
    title: string;
    slug: string;
    category: string;
    excerpt: string;
    body: string;
    authorName: string;
    authorId?: string;
    readTime: number;
    published: boolean;
    featuredImage?: string;
    status?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    seoCanonical?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  }) {
    const [row] = await db
      .insert(articles)
      .values({
        title: data.title.trim(),
        slug: data.slug,
        category: data.category.trim() || "\u0639\u0645\u0648\u0645\u06cc",
        excerpt: data.excerpt.trim(),
        body: data.body,
        authorName: data.authorName.trim() || "\u062a\u06cc\u0645 NIBRC",
        authorId: data.authorId,
        accent: "teal",
        readTime: data.readTime || 5,
        published: data.published,
        featured: false,
        status: data.published ? "published" : "draft",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...(data.featuredImage && { featuredImage: data.featuredImage }),
        ...(data.seoTitle && { seoTitle: data.seoTitle }),
        ...(data.seoDescription && { seoDescription: data.seoDescription }),
        ...(data.seoKeywords && data.seoKeywords.length > 0 && { seoKeywords: data.seoKeywords }),
        ...(data.seoCanonical && { seoCanonical: data.seoCanonical }),
        ...(data.ogTitle && { ogTitle: data.ogTitle }),
        ...(data.ogDescription && { ogDescription: data.ogDescription }),
        ...(data.ogImage && { ogImage: data.ogImage }),
      })
      .returning();
    return row;
  },

  async update(
    id: string,
    data: {
      title: string;
      category: string;
      excerpt: string;
      body: string;
      authorName?: string;
      readTime: number;
      published: boolean;
      featuredImage?: string;
      status?: string;
      seoTitle?: string;
      seoDescription?: string;
      seoKeywords?: string[];
      seoCanonical?: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImage?: string;
    }
  ) {
    const patch: Record<string, any> = {
      title: data.title.trim(),
      category: data.category.trim() || "\u0639\u0645\u0648\u0645\u06cc",
      excerpt: data.excerpt.trim(),
      body: data.body,
      readTime: data.readTime || 5,
      published: data.published,
      updatedAt: Date.now(),
    };
    if (data.authorName !== undefined) patch.authorName = data.authorName.trim() || "\u062a\u06cc\u0645 NIBRC";
    if (data.featuredImage !== undefined) patch.featuredImage = data.featuredImage || null;
    if (data.status !== undefined) patch.status = data.status;
    if (data.seoTitle !== undefined) patch.seoTitle = data.seoTitle || null;
    if (data.seoDescription !== undefined) patch.seoDescription = data.seoDescription || null;
    if (data.seoKeywords !== undefined)
      patch.seoKeywords = data.seoKeywords.length > 0 ? data.seoKeywords : null;
    if (data.seoCanonical !== undefined) patch.seoCanonical = data.seoCanonical || null;
    if (data.ogTitle !== undefined) patch.ogTitle = data.ogTitle || null;
    if (data.ogDescription !== undefined) patch.ogDescription = data.ogDescription || null;
    if (data.ogImage !== undefined) patch.ogImage = data.ogImage || null;

    const [row] = await db.update(articles).set(patch).where(eq(articles.id, id)).returning();
    return row ?? null;
  },

  async delete(id: string) {
    const [row] = await db.delete(articles).where(eq(articles.id, id)).returning();
    return row ?? null;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Products ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const productService = {
  async list(filters: { featuredOnly?: boolean; publishedOnly?: boolean } = {}) {
    const conditions = [];
    if (filters.publishedOnly) conditions.push(eq(products.published, true));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    let rows = await db.select().from(products).where(where).orderBy(desc(products.createdAt));

    if (filters.featuredOnly) rows = rows.filter((p) => p.featured);
    return rows;
  },

  async listAdmin() {
    return db.select().from(products).orderBy(desc(products.createdAt));
  },

  async findBySlug(slug: string) {
    const rows = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
    return rows[0] ?? null;
  },

  async findById(id: string) {
    const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async create(data: {
    title: string;
    type: string;
    description: string;
    price: number;
    published: boolean;
  }) {
    const [row] = await db
      .insert(products)
      .values({
        title: data.title.trim(),
        slug: data.title.trim().replace(/\s+/g, "-").toLowerCase(),
        type: data.type,
        description: data.description.trim(),
        price: data.price,
        accent: "teal",
        published: data.published,
        featured: false,
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async update(
    id: string,
    data: { title: string; type: string; description: string; price: number; published: boolean }
  ) {
    const [row] = await db
      .update(products)
      .set({
        title: data.title.trim(),
        type: data.type,
        description: data.description.trim(),
        price: data.price,
        published: data.published,
      })
      .where(eq(products.id, id))
      .returning();
    return row ?? null;
  },

  async delete(id: string) {
    const [row] = await db.delete(products).where(eq(products.id, id)).returning();
    return row ?? null;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Workshops ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const workshopService = {
  async list(filters: { publishedOnly?: boolean } = {}) {
    const conditions = [];
    if (filters.publishedOnly) conditions.push(eq(workshops.published, true));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    return db.select().from(workshops).where(where).orderBy(asc(workshops.date));
  },

  async listAdmin() {
    return db.select().from(workshops).orderBy(desc(workshops.date));
  },

  async findBySlug(slug: string) {
    const rows = await db.select().from(workshops).where(eq(workshops.slug, slug)).limit(1);
    return rows[0] ?? null;
  },

  async findById(id: string) {
    const rows = await db.select().from(workshops).where(eq(workshops.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async create(data: {
    title: string;
    slug: string;
    instructorId: string;
    topic: string;
    date: string;
    time: string;
    capacity: number;
    price: number;
    description: string;
    free: boolean;
    expertTalk: boolean;
    published: boolean;
  }) {
    const [row] = await db
      .insert(workshops)
      .values({
        title: data.title.trim(),
        slug: data.slug,
        instructorId: data.instructorId,
        topic: data.topic.trim(),
        date: data.date,
        time: data.time,
        capacity: data.capacity,
        registeredCount: 0,
        price: data.price,
        description: data.description,
        agenda: [],
        free: data.free,
        expertTalk: data.expertTalk,
        published: data.published,
      })
      .returning();
    return row;
  },

  async update(
    id: string,
    data: {
      title: string;
      instructorId: string;
      topic: string;
      date: string;
      time: string;
      capacity: number;
      price: number;
      description: string;
      free: boolean;
      expertTalk: boolean;
      published: boolean;
    }
  ) {
    const [row] = await db
      .update(workshops)
      .set({
        title: data.title.trim(),
        instructorId: data.instructorId,
        topic: data.topic.trim(),
        date: data.date,
        time: data.time,
        capacity: data.capacity,
        price: data.price,
        description: data.description,
        free: data.free,
        expertTalk: data.expertTalk,
        published: data.published,
      })
      .where(eq(workshops.id, id))
      .returning();
    return row ?? null;
  },

  async delete(id: string) {
    const [row] = await db.delete(workshops).where(eq(workshops.id, id)).returning();
    return row ?? null;
  },
};
