import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./users";
import { isAnyAdmin, isContentStaff } from "./admin";

const isInstructor = async (ctx: QueryCtx) => {
  const user = await getCurrentUser(ctx);
  return !!user && user.role === "instructor";
};

// Make sure the instructor has a display row in the `instructors` table so a
// published course shows up under their name on the site.
const ensureInstructorRow = async (ctx: MutationCtx, userId: Id<"users">) => {
  const user = await ctx.db.get(userId);
  if (!user) return null;
  const display = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name;
  if (!display) return null;

  const rows = await ctx.db.query("instructors").collect();
  const existing = rows.find(
    (r) =>
      r.name === display ||
      (user.firstName && r.name === `${user.firstName} ${user.lastName ?? ""}`.trim()) ||
      (user.name && r.name === user.name),
  );
  if (existing) return existing._id;

  const slug = display.replace(/\s+/g, "-").toLowerCase() + "-" + user._id.slice(-4);
  return await ctx.db.insert("instructors", {
    name: display,
    slug,
    title: "مدرس Genova",
    bio: user.about ?? "",
    education: [],
    specialties: [],
    accent: "teal",
    verified: false,
  });
};

// ── Course studio (instructor designs a course) ─────────────────────────────
export const listMyCourseStudio = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    if (user.role !== "instructor" && !(await isAnyAdmin(ctx))) return [];

    const mine: Doc<"courses">[] = await ctx.db
      .query("courses")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .collect();
    // Older courses linked to this instructor's display row (no authorId yet).
    const display = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name;
    let linked: Doc<"courses">[] = [];
    if (display) {
      const rows = await ctx.db.query("instructors").collect();
      const row = rows.find((r) => r.name === display || (user.name && r.name === user.name));
      if (row) {
        linked = await ctx.db
          .query("courses")
          .withIndex("by_published", (q) => q.eq("published", true))
          .filter((q) => q.eq(q.field("instructorId"), row._id))
          .collect();
      }
    }
    const seen = new Set(mine.map((c) => c._id.toString()));
    const all: Doc<"courses">[] = [
      ...linked.filter((c) => !seen.has(c._id.toString())),
      ...mine,
    ];

    const out = [];
    for (const c of all) {
      const [category, instructor] = await Promise.all([
        ctx.db.get(c.categoryId),
        ctx.db.get(c.instructorId),
      ]);
      out.push({
        _id: c._id,
        title: c.title,
        slug: c.slug,
        summary: c.summary,
        description: c.description,
        categoryId: c.categoryId,
        price: c.price,
        mode: c.mode,
        durationText: c.durationText,
        published: c.published,
        status: c.status ?? (c.published ? "published" : "draft"),
        reviewNote: c.reviewNote ?? null,
        categoryName: category?.name ?? null,
        instructorName: instructor?.name ?? null,
        studentsCount: c.studentsCount,
        syllabusCount: c.syllabus?.length ?? 0,
      });
    }
    return out.sort((a, b) => {
      const order = { published: 0, approved: 1, pending: 2, draft: 3, rejected: 4 } as Record<string, number>;
      return (order[a.status] ?? 0) - (order[b.status] ?? 0);
    });
  },
});

export const createDraftCourse = mutation({
  args: {
    title: v.string(),
    summary: v.string(),
    description: v.string(),
    categoryId: v.id("categories"),
    price: v.number(),
    mode: v.string(),
    durationText: v.string(),
    audience: v.optional(v.array(v.string())),
    prerequisites: v.optional(v.array(v.string())),
    syllabus: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          durationMin: v.number(),
          free: v.boolean(),
        }),
      ),
    ),
    packagePrices: v.optional(
      v.array(
        v.object({
          tier: v.union(
            v.literal("economy"),
            v.literal("basic"),
            v.literal("plus"),
            v.literal("premium"),
          ),
          price: v.number(),
          features: v.array(v.string()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    if (user.role !== "instructor" && !(await isAnyAdmin(ctx))) {
      throw new Error("فقط مدرس‌ها می‌توانند دوره طراحی کنند.");
    }
    if (args.title.trim().length < 3) throw new Error("عنوان دوره لازم است.");
    const instructorId = await ensureInstructorRow(ctx, user._id);
    if (!instructorId) throw new Error("ابتدا در پروفایل خود نام و نام خانوادگی را ثبت کنید.");
    const slug =
      args.title.trim().replace(/\s+/g, "-").toLowerCase() +
      "-" +
      Date.now().toString(36);
    await ctx.db.insert("courses", {
      title: args.title.trim(),
      slug,
      categoryId: args.categoryId,
      instructorId,
      summary: args.summary.trim(),
      description: args.description.trim() || args.summary.trim(),
      audience: args.audience ?? [],
      prerequisites: args.prerequisites ?? [],
      syllabus: args.syllabus ?? [],
      durationText: args.durationText.trim() || "به‌زودی",
      mode: args.mode as any,
      price: args.price,
      rating: 0,
      ratingCount: 0,
      studentsCount: 0,
      accent: "teal",
      bundle: "basic",
      includes: [],
      hasSampleVideo: false,
      files: [],
      published: false,
      featured: false,
      popular: false,
      createdAt: Date.now(),
      packagePrices: args.packagePrices ?? undefined,
      authorId: user._id,
      status: "draft",
    });
    return { ok: true };
  },
});

export const updateDraftCourse = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.string(),
    summary: v.string(),
    description: v.string(),
    categoryId: v.id("categories"),
    price: v.number(),
    mode: v.string(),
    durationText: v.string(),
    audience: v.optional(v.array(v.string())),
    prerequisites: v.optional(v.array(v.string())),
    syllabus: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          durationMin: v.number(),
          free: v.boolean(),
        }),
      ),
    ),
    packagePrices: v.optional(
      v.array(
        v.object({
          tier: v.union(
            v.literal("economy"),
            v.literal("basic"),
            v.literal("plus"),
            v.literal("premium"),
          ),
          price: v.number(),
          features: v.array(v.string()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("دوره یافت نشد.");
    const owner = course.authorId === user._id;
    const staff = (await isAnyAdmin(ctx)) || (await isContentStaff(ctx));
    if (!owner && !staff) throw new Error("فقط سازندهٔ دوره می‌تواند آن را ویرایش کند.");
    if (course.status === "pending") throw new Error("دوره در صف بررسی است؛ پس از نتیجه می‌توانید ویرایش کنید.");
    await ctx.db.patch(args.courseId, {
      title: args.title.trim(),
      summary: args.summary.trim(),
      description: args.description.trim() || args.summary.trim(),
      categoryId: args.categoryId,
      price: args.price,
      mode: args.mode as any,
      durationText: args.durationText.trim() || "به‌زودی",
      audience: args.audience ?? course.audience,
      prerequisites: args.prerequisites ?? course.prerequisites,
      syllabus: args.syllabus ?? course.syllabus,
      packagePrices: args.packagePrices ?? course.packagePrices,
      status: course.published ? course.status : "draft",
      reviewNote: undefined,
    });
    return { ok: true };
  },
});

export const submitCourseForReview = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("دوره یافت نشد.");
    if (course.authorId !== user._id && !(await isAnyAdmin(ctx))) {
      throw new Error("فقط سازندهٔ دوره می‌تواند آن را ارسال کند.");
    }
    if (course.published) throw new Error("این دوره قبلاً منتشر شده است.");
    await ctx.db.patch(args.courseId, {
      status: "pending",
      reviewNote: undefined,
    });
    return { ok: true };
  },
});

export const approveCourseReview = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("دوره یافت نشد.");
    await ctx.db.patch(args.courseId, {
      status: "approved",
      published: true,
      reviewNote: undefined,
    });
    return { ok: true };
  },
});

export const rejectCourseReview = mutation({
  args: { courseId: v.id("courses"), note: v.string() },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("دوره یافت نشد.");
    await ctx.db.patch(args.courseId, {
      status: "rejected",
      reviewNote: args.note.trim() || undefined,
    });
    return { ok: true };
  },
});

export const deleteDraftCourse = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("دوره یافت نشد.");
    if (course.authorId !== user._id && !(await isAnyAdmin(ctx))) {
      throw new Error("فقط سازندهٔ دوره می‌تواند آن را حذف کند.");
    }
    if (course.published) throw new Error("دورهٔ منتشرشده را از پنل مدیریت حذف کنید.");
    await ctx.db.delete(args.courseId);
    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Lesson content (video / text / files per syllabus item) ──────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const getLessonContent = query({
  args: {
    courseId: v.id("courses"),
    lessonId: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("lessonContent")
      .withIndex("by_course_lesson", (q) =>
        q.eq("courseId", args.courseId).eq("lessonId", args.lessonId),
      )
      .collect();
    return rows[0] ?? null;
  },
});

export const getLessonContentByCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lessonContent")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
  },
});

export const saveLessonContent = mutation({
  args: {
    courseId: v.id("courses"),
    lessonId: v.string(),
    videoUrl: v.optional(v.string()),
    textContent: v.optional(v.string()),
    attachments: v.optional(
      v.array(
        v.object({
          name: v.string(),
          url: v.string(),
          size: v.number(),
          type: v.string(),
        }),
      ),
    ),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("دوره یافت نشد.");
    const owner = course.authorId === user._id;
    const staff = (await isAnyAdmin(ctx)) || (await isContentStaff(ctx));
    if (!owner && !staff) throw new Error("دسترسی ندارید.");

    const existing = await ctx.db
      .query("lessonContent")
      .withIndex("by_course_lesson", (q) =>
        q.eq("courseId", args.courseId).eq("lessonId", args.lessonId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        videoUrl: args.videoUrl,
        textContent: args.textContent,
        attachments: args.attachments,
        order: args.order,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("lessonContent", {
        courseId: args.courseId,
        lessonId: args.lessonId,
        videoUrl: args.videoUrl,
        textContent: args.textContent,
        attachments: args.attachments,
        order: args.order,
        updatedAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Student lesson progress ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const getMyLessonProgress = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("lessonProgress")
      .withIndex("by_user_course", (q) =>
        q.eq("userId", user._id).eq("courseId", args.courseId),
      )
      .collect();
  },
});

export const markLessonComplete = mutation({
  args: {
    courseId: v.id("courses"),
    lessonId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");

    const existing = await ctx.db
      .query("lessonProgress")
      .withIndex("by_user_course_lesson", (q) =>
        q.eq("userId", user._id).eq("courseId", args.courseId).eq("lessonId", args.lessonId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { completed: true, completedAt: Date.now() });
    } else {
      await ctx.db.insert("lessonProgress", {
        userId: user._id,
        courseId: args.courseId,
        lessonId: args.lessonId,
        completed: true,
        completedAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Syllabus management (add / remove lessons) ─────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const addSyllabusLesson = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.string(),
    durationMin: v.number(),
    free: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("دوره یافت نشد.");
    const owner = course.authorId === user._id;
    const staff = (await isAnyAdmin(ctx)) || (await isContentStaff(ctx));
    if (!owner && !staff) throw new Error("دسترسی ندارید.");

    const existing = course.syllabus ?? [];
    const newLesson = {
      id: `s${existing.length}-${Date.now()}`,
      title: args.title.trim(),
      durationMin: args.durationMin,
      free: args.free,
    };
    await ctx.db.patch(args.courseId, {
      syllabus: [...existing, newLesson],
    });
    return { ok: true, lessonId: newLesson.id };
  },
});

export const removeSyllabusLesson = mutation({
  args: {
    courseId: v.id("courses"),
    lessonId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("دوره یافت نشد.");
    const owner = course.authorId === user._id;
    const staff = (await isAnyAdmin(ctx)) || (await isContentStaff(ctx));
    if (!owner && !staff) throw new Error("دسترسی ندارید.");

    const existing = course.syllabus ?? [];
    await ctx.db.patch(args.courseId, {
      syllabus: existing.filter((s) => s.id !== args.lessonId),
    });
    return { ok: true };
  },
});
