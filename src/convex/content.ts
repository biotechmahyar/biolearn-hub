import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ── Categories ──────────────────────────────────────────────────────────────
export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("categories")
      .order("asc")
      .collect();
  },
});

// ── Courses ─────────────────────────────────────────────────────────────────
export const listCourses = query({
  args: {
    categorySlug: v.optional(v.string()),
    search: v.optional(v.string()),
    featuredOnly: v.optional(v.boolean()),
    popularOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let courses = await ctx.db
      .query("courses")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();

    if (args.featuredOnly) courses = courses.filter((c) => c.featured);
    if (args.popularOnly) courses = courses.filter((c) => c.popular);
    if (args.categorySlug) {
      const cat = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug!))
        .first();
      if (cat) courses = courses.filter((c) => c.categoryId === cat._id);
      else courses = [];
    }
    if (args.search) {
      const s = args.search.trim().toLowerCase();
      courses = courses.filter(
        (c) =>
          c.title.toLowerCase().includes(s) ||
          c.summary.toLowerCase().includes(s),
      );
    }

    courses = courses.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return b.createdAt - a.createdAt;
    });

    if (args.limit) courses = courses.slice(0, args.limit);

    return Promise.all(
      courses.map(async (c) => {
        const [category, instructor] = await Promise.all([
          ctx.db.get(c.categoryId),
          ctx.db.get(c.instructorId),
        ]);
        return {
          ...c,
          category: category
            ? { name: category.name, slug: category.slug, accent: category.accent }
            : null,
          instructor: instructor
            ? { name: instructor.name, slug: instructor.slug, title: instructor.title }
            : null,
        };
      }),
    );
  },
});

export const getCourseBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const course = await ctx.db
      .query("courses")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!course || !course.published) return null;

    const [category, instructor] = await Promise.all([
      ctx.db.get(course.categoryId),
      ctx.db.get(course.instructorId),
    ]);

    // enrollment state for signed-in users
    let enrollment: { enrolledAt: number; completedLessons: string[] } | null =
      null;
    const user = await getCurrentUser(ctx);
    if (user) {
      const en = await ctx.db
        .query("enrollments")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("courseId"), course._id))
        .first();
      if (en) {
        enrollment = { enrolledAt: en.enrolledAt, completedLessons: en.completedLessons };
      }
    }

    return {
      ...course,
      category,
      instructor,
      enrollment,
    };
  },
});

export const getCoursesByIds = query({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, args) => {
    const out = [];
    for (const id of args.ids) {
      const doc = await ctx.db.get(id as any);
      if (doc) out.push(doc);
    }
    return out;
  },
});

// ── Products ────────────────────────────────────────────────────────────────
export const listProducts = query({
  args: { featuredOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    let products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("published"), true))
      .collect();
    if (args.featuredOnly) products = products.filter((p) => p.featured);
    return products.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getProductBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!product || !product.published) return null;
    return product;
  },
});

// ── Workshops ───────────────────────────────────────────────────────────────
export const listWorkshops = query({
  args: {},
  handler: async (ctx) => {
    const workshops = await ctx.db
      .query("workshops")
      .filter((q) => q.eq(q.field("published"), true))
      .collect();
    const enriched = await Promise.all(
      workshops.map(async (w) => ({
        ...w,
        instructor: await ctx.db.get(w.instructorId),
      })),
    );
    return enriched.sort((a, b) => a.date.localeCompare(b.date));
  },
});

export const getWorkshopBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const workshop = await ctx.db
      .query("workshops")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!workshop || !workshop.published) return null;
    return { ...workshop, instructor: await ctx.db.get(workshop.instructorId) };
  },
});

// ── Instructors / Experts ───────────────────────────────────────────────────
export const listInstructors = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("instructors").collect();
  },
});

export const getInstructorBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const instructor = await ctx.db
      .query("instructors")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!instructor) return null;
    const [courses, workshops] = await Promise.all([
      ctx.db
        .query("courses")
        .withIndex("by_published", (q) => q.eq("published", true))
        .filter((q) => q.eq(q.field("instructorId"), instructor._id))
        .collect(),
      ctx.db
        .query("workshops")
        .filter((q) => q.eq(q.field("instructorId"), instructor._id))
        .collect(),
    ]);
    return { ...instructor, courses, workshops };
  },
});

// ── Free content (articles) ─────────────────────────────────────────────────
export const listArticles = query({
  args: { category: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    let articles = await ctx.db
      .query("articles")
      .filter((q) => q.eq(q.field("published"), true))
      .collect();
    if (args.category) {
      articles = articles.filter((a) => a.category === args.category);
    }
    articles = articles.sort((a, b) => b.createdAt - a.createdAt);
    if (args.limit) articles = articles.slice(0, args.limit);
    return articles;
  },
});

export const getArticleBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const article = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!article || !article.published) return null;
    return article;
  },
});

// ── Dictionary ──────────────────────────────────────────────────────────────
export const searchDictionary = query({
  args: { query: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    let terms = await ctx.db.query("dictionaryTerms").collect();
    const q = (args.query ?? "").trim().toLowerCase();
    if (q) {
      terms = terms.filter(
        (t) =>
          t.term.toLowerCase().includes(q) ||
          t.fullName.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q),
      );
    }
    return terms.slice(0, args.limit ?? 20);
  },
});

export const getDictionaryTerm = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dictionaryTerms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// ── Testimonials ────────────────────────────────────────────────────────────
export const listTestimonials = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("testimonials").collect();
  },
});
