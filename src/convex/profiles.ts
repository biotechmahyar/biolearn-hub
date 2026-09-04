import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { isAnyAdmin } from "./admin";

// ── My profile ──────────────────────────────────────────────────────────────
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    let avatarUrl: string | null = null;
    if (user.avatarStorageId) {
      avatarUrl = await ctx.storage.getUrl(user.avatarStorageId);
    }
    return {
      _id: user._id,
      name: user.name ?? null,
      email: user.email ?? null,
      role: user.role ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      about: user.about ?? null,
      phone: user.phone ?? null,
      address: user.address ?? null,
      postalCode: user.postalCode ?? null,
      avatarUrl,
      suggestedCourseIds: user.suggestedCourseIds ?? [],
      pendingProfile: user.pendingProfile ?? null,
    };
  },
});

export const getProfileUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    return await ctx.storage.generateUploadUrl();
  },
});

// Stage a profile edit. For regular members the change is NOT applied
// immediately — an admin approves it in the console first. System and site
// admins edit their own profile directly (applied right away).
export const updateMyProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarStorageId: v.optional(v.string()),
    about: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    postalCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    const next = {
      firstName: args.firstName?.trim() || undefined,
      lastName: args.lastName?.trim() || undefined,
      avatarStorageId: args.avatarStorageId || undefined,
      about: args.about?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      address: args.address?.trim() || undefined,
      postalCode: args.postalCode?.trim() || undefined,
    };
    // Admins publish their own profile changes without approval.
    if (await isAnyAdmin(ctx)) {
      const patch: Record<string, unknown> = {
        firstName: next.firstName,
        lastName: next.lastName,
        avatarStorageId: next.avatarStorageId,
        about: next.about,
        phone: next.phone,
        address: next.address,
        postalCode: next.postalCode,
        pendingProfile: undefined,
      };
      if (next.firstName || next.lastName) {
        patch.name = `${next.firstName ?? ""} ${next.lastName ?? ""}`.trim();
      }
      await ctx.db.patch(user._id, patch as any);
      return { ok: true, applied: true };
    }
    await ctx.db.patch(user._id, {
      pendingProfile: { ...next, submittedAt: Date.now() },
    });
    return { ok: true, applied: false };
  },
});

// ── Admin approval ──────────────────────────────────────────────────────────
export const listPendingProfiles = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const users = await ctx.db.query("users").collect();
    const out = [];
    for (const u of users) {
      if (!u.pendingProfile) continue;
      let pendingAvatarUrl: string | null = null;
      let currentAvatarUrl: string | null = null;
      if (u.pendingProfile.avatarStorageId) {
        pendingAvatarUrl = await ctx.storage.getUrl(u.pendingProfile.avatarStorageId);
      }
      if (u.avatarStorageId) {
        currentAvatarUrl = await ctx.storage.getUrl(u.avatarStorageId);
      }
      out.push({
        _id: u._id,
        name: u.name ?? null,
        email: u.email ?? null,
        role: u.role ?? null,
        current: {
          firstName: u.firstName ?? null,
          lastName: u.lastName ?? null,
          avatarUrl: currentAvatarUrl,
          about: u.about ?? null,
        },
        pending: {
          firstName: u.pendingProfile.firstName ?? null,
          lastName: u.pendingProfile.lastName ?? null,
          avatarUrl: pendingAvatarUrl,
          about: u.pendingProfile.about ?? null,
        },
        submittedAt: u.pendingProfile.submittedAt,
      });
    }
    return out.sort((a, b) => b.submittedAt - a.submittedAt);
  },
});

export const approveProfile = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const user = await ctx.db.get(args.userId);
    if (!user || !user.pendingProfile) throw new Error("درخواست ویرایشی وجود ندارد.");
    const p = user.pendingProfile;
    const patch: Record<string, unknown> = {
      firstName: p.firstName,
      lastName: p.lastName,
      avatarStorageId: p.avatarStorageId,
      about: p.about,
      pendingProfile: undefined,
    };
    // Keep the display name in sync with the approved first/last name.
    if (p.firstName || p.lastName) {
      patch.name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
    }
    await ctx.db.patch(args.userId, patch as any);
    return { ok: true };
  },
});

export const rejectProfile = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("کاربر یافت نشد.");
    await ctx.db.patch(args.userId, { pendingProfile: undefined } as any);
    return { ok: true };
  },
});

// ── Suggested courses (instructor picks other instructors' courses) ─────────
export const toggleSuggestedCourse = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    if (user.role !== "instructor" && !(await isAnyAdmin(ctx))) {
      throw new Error("فقط مدرس‌ها می‌توانند دوره پیشنهاد دهند.");
    }
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("دوره یافت نشد.");
    if (!course.published) throw new Error("فقط دوره‌های منتشرشده قابل پیشنهاد هستند.");
    if (course.authorId === user._id) {
      throw new Error("نمی‌توانید دورهٔ خودتان را پیشنهاد دهید.");
    }
    const current = user.suggestedCourseIds ?? [];
    const next = current.includes(args.courseId)
      ? current.filter((id) => id !== args.courseId)
      : [...current, args.courseId];
    await ctx.db.patch(user._id, { suggestedCourseIds: next });
    return { ok: true, suggested: !current.includes(args.courseId) };
  },
});

export const listSuggestedCourses = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { mine: [], catalog: [] };
    const isStaff = user.role === "instructor" || (await isAnyAdmin(ctx));

    const suggestedIds = user.suggestedCourseIds ?? [];
    const mine = [];
    for (const id of suggestedIds) {
      const c = await ctx.db.get(id);
      if (!c) continue;
      const [category, instructor] = await Promise.all([
        ctx.db.get(c.categoryId),
        ctx.db.get(c.instructorId),
      ]);
      mine.push({
        _id: c._id,
        title: c.title,
        summary: c.summary,
        price: c.price,
        discountPrice: c.discountPrice ?? null,
        studentsCount: c.studentsCount,
        category: category?.name ?? null,
        instructorName: instructor?.name ?? null,
      });
    }

    let catalog: any[] = [];
    if (isStaff) {
      const courses = await ctx.db
        .query("courses")
        .withIndex("by_published", (q) => q.eq("published", true))
        .collect();
      const out = [];
      for (const c of courses) {
        if (c.authorId === user._id) continue;
        const [category, instructor] = await Promise.all([
          ctx.db.get(c.categoryId),
          ctx.db.get(c.instructorId),
        ]);
        out.push({
          _id: c._id,
          title: c.title,
          summary: c.summary,
          price: c.price,
          discountPrice: c.discountPrice ?? null,
          studentsCount: c.studentsCount,
          category: category?.name ?? null,
          instructorName: instructor?.name ?? null,
          suggested: suggestedIds.includes(c._id),
        });
      }
      catalog = out.sort((a, b) => b.studentsCount - a.studentsCount);
    }

    return { mine, catalog };
  },
});
