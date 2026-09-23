import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { isAnyAdmin } from "./admin";

/**
 * Skills (مهارت‌ها) + Genova Plus track management
 * ─────────────────────────────────────────────────────────────────────────────
 * - skills table: skill pages at /skills/<slug> with related courses.
 * - Courses link to skills via `courses.skillSlugs`, are marked into the
 *   Genova Plus track via `courses.track = "genova_plus"` and practical labs
 *   via `courses.practical` — all optional fields, fully backward compatible.
 */

const FIELDS = [
  "microbiology",
  "biotech",
  "genetics",
  "bioinformatics",
  "lab",
  "general",
] as const;

const ACCENTS = ["teal", "emerald", "sky", "amber", "violet", "rose", "indigo"] as const;

const SLUG_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";

function makeSlug(name: string, custom?: string): string {
  const base = (custom ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (base) return base;
  // Persian names → short random latin slug
  let rand = "";
  for (let i = 0; i < 5; i++) rand += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)];
  return `skill-${rand}`;
}

async function requireAdmin(ctx: any) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("ابتدا وارد حساب شوید.");
  if (!(await isAnyAdmin(ctx))) throw new Error("فقط مدیر سایت به این بخش دسترسی دارد.");
  return user;
}

async function countCoursesForSkill(ctx: any, slug: string, publishedOnly = true): Promise<number> {
  const courses = await ctx.db
    .query("courses")
    .withIndex("by_published", (q: any) => q.eq("published", publishedOnly))
    .collect();
  return courses.filter((c: any) => (c.skillSlugs ?? []).includes(slug)).length;
}

// ── Public ────────────────────────────────────────────────────────────────────

/** Published skills ordered for display, with related-course counts. */
export const listSkills = query({
  args: {},
  handler: async (ctx) => {
    const skills = await ctx.db.query("skills").collect();
    const published = skills.filter((s) => s.published);
    published.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    const counts = await Promise.all(
      published.map((s) => countCoursesForSkill(ctx, s.slug, true)),
    );
    return published.map((s, i) => ({
      _id: s._id,
      name: s.name,
      slug: s.slug,
      description: s.description ?? null,
      icon: s.icon ?? null,
      accent: s.accent ?? "teal",
      field: s.field ?? "general",
      courseCount: counts[i],
    }));
  },
});

/** Skill detail: skill + related published courses (enriched like content.listCourses). */
export const getSkillBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const skill = await ctx.db
      .query("skills")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!skill || !skill.published) return null;

    const courses = await ctx.db
      .query("courses")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    const related = courses.filter((c) => (c.skillSlugs ?? []).includes(skill.slug));

    const enriched = await Promise.all(
      related.map(async (c) => {
        const [category, instructor] = await Promise.all([
          ctx.db.get(c.categoryId),
          c.instructorId ? ctx.db.get(c.instructorId) : null,
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
    enriched.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.createdAt - a.createdAt);

    return {
      _id: skill._id,
      name: skill.name,
      slug: skill.slug,
      description: skill.description ?? null,
      icon: skill.icon ?? null,
      accent: skill.accent ?? "teal",
      field: skill.field ?? "general",
      courses: enriched,
    };
  },
});

/** Genova Plus: published courses on the plus track, enriched. */
export const listGenovaPlusCourses = query({
  args: {},
  handler: async (ctx) => {
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    const plus = courses.filter((c) => c.track === "genova_plus");
    const enriched = await Promise.all(
      plus.map(async (c) => {
        const [category, instructor] = await Promise.all([
          ctx.db.get(c.categoryId),
          c.instructorId ? ctx.db.get(c.instructorId) : null,
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
    enriched.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.createdAt - a.createdAt);
    return enriched;
  },
});

// ── Admin ─────────────────────────────────────────────────────────────────────

/** Admin: all skills (including drafts) with course counts. */
export const listSkillsAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !(await isAnyAdmin(ctx))) return [];
    const skills = await ctx.db.query("skills").collect();
    skills.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    const counts = await Promise.all(skills.map((s) => countCoursesForSkill(ctx, s.slug, false)));
    return skills.map((s, i) => ({ ...s, courseCount: counts[i] }));
  },
});

/** Admin: create a skill. */
export const createSkill = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    accent: v.optional(
      v.union(...ACCENTS.map((a) => v.literal(a)) as [any, ...any[]]),
    ),
    field: v.optional(v.union(...FIELDS.map((f) => v.literal(f)) as [any, ...any[]])),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.name.trim().length < 2) throw new Error("نام مهارت لازم است.");
    const slug = makeSlug(args.name, args.slug);
    const existing = await ctx.db
      .query("skills")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) throw new Error("این slug قبلاً استفاده شده است.");
    const all = await ctx.db.query("skills").collect();
    return await ctx.db.insert("skills", {
      name: args.name.trim(),
      slug,
      description: args.description?.trim() || undefined,
      icon: args.icon?.trim() || undefined,
      accent: args.accent ?? "teal",
      field: args.field ?? "general",
      order: all.length,
      published: args.published ?? true,
      createdAt: Date.now(),
    });
  },
});

/** Admin: update a skill. */
export const updateSkill = mutation({
  args: {
    id: v.id("skills"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    accent: v.optional(v.string()),
    field: v.optional(v.string()),
    published: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const skill = await ctx.db.get(args.id);
    if (!skill) throw new Error("مهارت یافت نشد.");
    const { id, ...rest } = args;
    const patch: Record<string, unknown> = {};
    if (rest.name !== undefined && rest.name.trim()) patch.name = rest.name.trim();
    if (rest.description !== undefined) patch.description = rest.description.trim() || undefined;
    if (rest.icon !== undefined) patch.icon = rest.icon;
    if (rest.accent !== undefined) patch.accent = rest.accent;
    if (rest.field !== undefined) patch.field = rest.field;
    if (rest.published !== undefined) patch.published = rest.published;
    if (rest.order !== undefined) patch.order = rest.order;
    await ctx.db.patch(id, patch);
    return { ok: true };
  },
});

/** Admin: delete a skill (removes only the skill row; courses stay untouched). */
export const deleteSkill = mutation({
  args: { id: v.id("skills") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

/**
 * Admin: set the Genova Plus track / practical flag / linked skills of a
 * course. Touches only the new optional fields.
 */
export const setCourseTrack = mutation({
  args: {
    courseId: v.id("courses"),
    track: v.union(v.literal("standard"), v.literal("genova_plus")),
    practical: v.optional(v.boolean()),
    skillSlugs: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("دوره یافت نشد.");
    await ctx.db.patch(args.courseId, {
      track: args.track,
      ...(args.practical !== undefined ? { practical: args.practical } : {}),
      ...(args.skillSlugs !== undefined ? { skillSlugs: args.skillSlugs } : {}),
    });
    return { ok: true };
  },
});
