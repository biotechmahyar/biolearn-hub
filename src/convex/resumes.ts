import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Student digital resumes
 * ─────────────────────────────────────────────────────────────────────────────
 * Each user can own one resume (resumes table) with a unique public slug.
 * The public page (/u/<slug>) shows resume data + enrolled/completed courses
 * + certificates + workshops — read-only, purely derived from existing data.
 */

type Ctx = any;

const eduValidator = v.object({
  degree: v.string(),
  field: v.optional(v.string()),
  institute: v.optional(v.string()),
  year: v.optional(v.string()),
});
const expValidator = v.object({
  title: v.string(),
  org: v.optional(v.string()),
  period: v.optional(v.string()),
  description: v.optional(v.string()),
});
const projValidator = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  link: v.optional(v.string()),
});
const langValidator = v.object({ name: v.string(), level: v.optional(v.string()) });
const linkValidator = v.object({ label: v.string(), url: v.string() });

const SLUG_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";

async function uniqueSlug(ctx: Ctx): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)];
    }
    const slug = `g-${code}`;
    const existing = await ctx.db
      .query("resumes")
      .withIndex("by_slug", (q: any) => q.eq("slug", slug))
      .first();
    if (!existing) return slug;
  }
  return `g-${Date.now().toString(36)}`;
}

/** The signed-in user's own resume (or null before first save). */
export const getMyResume = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const resume = await ctx.db
      .query("resumes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    return resume ?? null;
  },
});

/** Create or update the signed-in user's resume. */
export const updateMyResume = mutation({
  args: {
    headline: v.optional(v.string()),
    summary: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    education: v.optional(v.array(eduValidator)),
    experience: v.optional(v.array(expValidator)),
    achievements: v.optional(v.array(v.string())),
    projects: v.optional(v.array(projValidator)),
    languages: v.optional(v.array(langValidator)),
    links: v.optional(v.array(linkValidator)),
    isVisible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");

    const existing = await ctx.db
      .query("resumes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const patch = {
      ...(args.headline !== undefined ? { headline: args.headline.trim() } : {}),
      ...(args.summary !== undefined ? { summary: args.summary.trim() } : {}),
      ...(args.skills !== undefined ? { skills: args.skills.filter((s) => s.trim()).slice(0, 40) } : {}),
      ...(args.education !== undefined ? { education: args.education } : {}),
      ...(args.experience !== undefined ? { experience: args.experience } : {}),
      ...(args.achievements !== undefined
        ? { achievements: args.achievements.filter((s) => s.trim()).slice(0, 30) }
        : {}),
      ...(args.projects !== undefined ? { projects: args.projects } : {}),
      ...(args.languages !== undefined ? { languages: args.languages } : {}),
      ...(args.links !== undefined ? { links: args.links.slice(0, 10) } : {}),
      ...(args.isVisible !== undefined ? { isVisible: args.isVisible } : {}),
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return { slug: existing.slug, ...patch };
    }

    const slug = await uniqueSlug(ctx);
    const doc = {
      userId: user._id,
      slug,
      headline: args.headline?.trim() ?? "",
      summary: args.summary?.trim() ?? "",
      skills: args.skills?.filter((s) => s.trim()).slice(0, 40) ?? [],
      education: args.education ?? [],
      experience: args.experience ?? [],
      achievements: args.achievements?.filter((s) => s.trim()).slice(0, 30) ?? [],
      projects: args.projects ?? [],
      languages: args.languages ?? [],
      links: args.links?.slice(0, 10) ?? [],
      isVisible: args.isVisible ?? true,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    await ctx.db.insert("resumes", doc);
    return doc;
  },
});

/** Toggle public visibility of the resume. */
export const setResumeVisibility = mutation({
  args: { visible: v.boolean() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const resume = await ctx.db
      .query("resumes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!resume) throw new Error("هنوز رزومه‌ای ساخته نشده است.");
    await ctx.db.patch(resume._id, { isVisible: args.visible, updatedAt: Date.now() });
    return { ok: true, visible: args.visible };
  },
});

/**
 * Public resume page data. Everything is derived from existing platform data;
 * returns null when the slug is unknown or the page is hidden.
 */
export const getPublicResume = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const resume = await ctx.db
      .query("resumes")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!resume) return null;

    const user = await ctx.db.get(resume.userId);
    if (!user) return null;
    if (!resume.isVisible) return null;

    let avatarUrl: string | null = null;
    if (user.avatarStorageId) {
      try {
        avatarUrl = await ctx.storage.getUrl(user.avatarStorageId);
      } catch {
        avatarUrl = null;
      }
    }

    // ── Enrollments → in-progress / completed courses ──
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const completedCourses: { title: string; slug: string; percent: number }[] = [];
    const inProgressCourses: { title: string; slug: string; percent: number }[] = [];
    for (const en of enrollments) {
      const course = await ctx.db.get(en.courseId);
      if (!course || !course.published) continue;
      let totalLessons = course.syllabus?.length ?? 0;
      const sections = await ctx.db
        .query("courseSections")
        .withIndex("by_course", (q) => q.eq("courseId", en.courseId))
        .collect();
      if (sections.length > 0) {
        let count = 0;
        for (const s of sections) {
          const lessons = await ctx.db
            .query("courseLessons")
            .withIndex("by_section", (q) => q.eq("sectionId", s._id))
            .collect();
          count += lessons.length;
        }
        if (count > 0) totalLessons = count;
      }
      const percent =
        totalLessons === 0
          ? 0
          : Math.round((en.completedLessons.length / totalLessons) * 100);
      const row = { title: course.title, slug: course.slug, percent };
      if (percent >= 100) completedCourses.push(row);
      else if (en.completedLessons.length > 0 || percent > 0) inProgressCourses.push(row);
      else inProgressCourses.push(row); // enrolled but not started counts as "در حال گذراندن"
    }

    // ── Certificates (legacy table + template-issued table) ──
    const certificates: {
      courseName: string;
      code: string | null;
      url: string | null;
      issuedAt: string | null;
      verifyLink: string | null;
    }[] = [];

    const legacyCerts = await ctx.db
      .query("certificates")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const c of legacyCerts) {
      if (c.status !== "approved") continue;
      const course = await ctx.db.get(c.courseId);
      const code = c.verificationCode ?? null;
      certificates.push({
        courseName: c.courseName ?? course?.title ?? "دوره ژنوا",
        code,
        url: c.certificateUrl ?? null,
        issuedAt: c.resolvedAt ? String(c.resolvedAt) : null,
        verifyLink: code ? `/verify-certificate?code=${code}` : null,
      });
    }

    const issuedCerts = await ctx.db
      .query("issuedCertificates")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();
    for (const c of issuedCerts) {
      if ((c.status as string) !== "issued") continue;
      const code = c.trackingCode ?? null;
      certificates.push({
        courseName: c.courseTitle,
        code,
        url: c.pdfUrl ?? null,
        issuedAt: c.issueDate ?? null,
        verifyLink: code ? `/verify-certificate?code=${code}` : null,
      });
    }

    // ── Workshops ──
    const workshopEnrollments = await ctx.db
      .query("workshopEnrollments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const workshops: { title: string; slug: string; date: string; time: string }[] = [];
    for (const we of workshopEnrollments) {
      const w = await ctx.db.get(we.workshopId);
      if (w) workshops.push({ title: w.title, slug: w.slug, date: w.date, time: w.time });
    }

    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.name ||
      user.email ||
      "دانشجوی ژنوا";

    return {
      slug: resume.slug,
      isVisible: resume.isVisible,
      name: displayName,
      avatarUrl,
      emailPublic: false, // never expose email publicly
      role: user.role ?? "user",
      university: user.university ?? null,
      major: user.major ?? null,
      about: resume.summary || user.about || null,
      headline: resume.headline ?? null,
      skills: resume.skills ?? [],
      education: resume.education ?? [],
      experience: resume.experience ?? [],
      achievements: resume.achievements ?? [],
      projects: resume.projects ?? [],
      languages: resume.languages ?? [],
      links: resume.links ?? [],
      completedCourses,
      inProgressCourses,
      certificates,
      workshops,
      updatedAt: resume.updatedAt,
    };
  },
});
