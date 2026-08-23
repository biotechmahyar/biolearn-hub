import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { isAnyAdmin, isContentStaff } from "./admin";

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

// Lets any content creator (instructor / admin / content staff) create a new
// category on the fly instead of being limited to the existing ones.
export const createCategory = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    if (user.role !== "instructor" && !(await isAnyAdmin(ctx)) && !(await isContentStaff(ctx))) {
      throw new Error("فقط مدرس یا مدیر می‌تواند دستهٔ جدید بسازد.");
    }
    const name = args.name.trim();
    if (!name) throw new Error("نام دسته لازم است.");
    const all = await ctx.db.query("categories").collect();
    const existing = all.find((c) => c.name === name);
    if (existing) return existing._id;
    const maxOrder = all.reduce((m, c) => Math.max(m, c.order), 0);
    return await ctx.db.insert("categories", {
      name,
      slug: name.replace(/\s+/g, "-").toLowerCase() + "-" + Date.now().toString(36),
      description: "",
      icon: "Dna",
      accent: "teal",
      order: maxOrder + 1,
    });
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

// Dictionary editors: instructors, content managers, site admins and system
// admins can add/edit/delete terms.
const canEditDictionary = async (ctx: any) => {
  const user = await getCurrentUser(ctx);
  return (
    !!user &&
    (user.role === "instructor" ||
      user.role === "content_manager" ||
      user.role === "site_admin" ||
      user.role === "admin")
  );
};

const termInputValidator = {
  term: v.string(),
  fullName: v.string(),
  gramStatus: v.string(),
  shape: v.string(),
  oxygen: v.string(),
  habitat: v.string(),
  diseases: v.array(v.string()),
  virulence: v.array(v.string()),
  diagnosis: v.string(),
  characteristics: v.array(v.string()),
  examNotes: v.array(v.string()),
  sources: v.array(v.string()),
};

function slugifyTerm(term: string) {
  const t = term.trim();
  if (!t) return "term";
  // Latin terms → kebab-case; Persian/other → URL-encoded.
  if (/^[a-zA-Z0-9]/.test(t)) {
    return t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "term";
  }
  return encodeURIComponent(t).replace(/%/g, "-");
}

const listFields = (input: string) =>
  input
    .split(/\n|،|,/)
    .map((s) => s.trim())
    .filter(Boolean);

export const createDictionaryTerm = mutation({
  args: { ...termInputValidator },
  handler: async (ctx, args) => {
    if (!(await canEditDictionary(ctx))) {
      throw new Error("فقط مدرس، مدیر محتوا یا ادمین می‌تواند اصطلاح اضافه کند.");
    }
    const term = args.term.trim();
    if (!term) throw new Error("نام اصطلاح لازم است.");
    const existing = await ctx.db
      .query("dictionaryTerms")
      .withIndex("by_term", (q) => q.eq("term", term))
      .first();
    if (existing) throw new Error("این اصطلاح از قبل در دیکشنری وجود دارد.");
    await ctx.db.insert("dictionaryTerms", {
      ...args,
      term,
      slug: slugifyTerm(term),
    });
    return { ok: true };
  },
});

export const updateDictionaryTerm = mutation({
  args: { id: v.id("dictionaryTerms"), ...termInputValidator },
  handler: async (ctx, args) => {
    if (!(await canEditDictionary(ctx))) {
      throw new Error("فقط مدرس، مدیر محتوا یا ادمین می‌تواند اصطلاح ویرایش کند.");
    }
    const current = await ctx.db.get(args.id);
    if (!current) throw new Error("اصطلاح یافت نشد.");
    const term = args.term.trim();
    if (!term) throw new Error("نام اصطلاح لازم است.");
    const dup = await ctx.db
      .query("dictionaryTerms")
      .withIndex("by_term", (q) => q.eq("term", term))
      .first();
    if (dup && dup._id !== args.id) {
      throw new Error("اصطلاحی با این نام از قبل وجود دارد.");
    }
    const { id: _id, ...rest } = args;
    await ctx.db.patch(args.id, { ...rest, term, slug: slugifyTerm(term) });
    return { ok: true };
  },
});

export const deleteDictionaryTerm = mutation({
  args: { id: v.id("dictionaryTerms") },
  handler: async (ctx, args) => {
    if (!(await canEditDictionary(ctx))) {
      throw new Error("فقط مدرس، مدیر محتوا یا ادمین می‌تواند اصطلاح حذف کند.");
    }
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Testimonials ────────────────────────────────────────────────────────────
export const listTestimonials = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("testimonials").collect();
  },
});
