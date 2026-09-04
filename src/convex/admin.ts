import { v } from "convex/values";
import { Scrypt } from "lucia";
import { mutation, query, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getCurrentUser } from "./users";
import { roleValidator } from "./schema";

const ROLES = [
  "user",
  "member",
  "instructor",
  "mentor",
  "content_manager",
  "support",
  "site_admin",
  "admin",
] as const;

type Role = (typeof ROLES)[number];

const isRole = (r: string): r is Role => (ROLES as readonly string[]).includes(r);

export const isAdmin = async (ctx: QueryCtx) => {
  const user = await getCurrentUser(ctx);
  const email = user?.email;
  if (!email) return false;
  const admin = await ctx.db
    .query("admins")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  return !!admin;
};

// Content editors can manage published content: content_manager, system
// admins and site admins (site admins run the whole site console).
export const isContentStaff = async (ctx: QueryCtx) => {
  const user = await getCurrentUser(ctx);
  return (
    !!user &&
    (user.role === "content_manager" ||
      user.role === "admin" ||
      user.role === "site_admin")
  );
};

// Site admins are lower-tier admins: they can manage the team (mentors,
// students, instructors, ...) and site content, but they cannot promote,
// demote or delete system admins (and cannot create/assign the admin roles).
export const isSiteAdmin = async (ctx: QueryCtx) => {
  const user = await getCurrentUser(ctx);
  return !!user && user.role === "site_admin";
};

// Anyone allowed inside the admin console: system admins + site admins.
export const isAnyAdmin = async (ctx: QueryCtx) => {
  return (await isAdmin(ctx)) || (await isSiteAdmin(ctx));
};

// System admins (the full-power allow-list) are the only ones who can manage
// other admins (promote, demote, delete) or the site_admin role.
export const isSystemAdmin = async (ctx: QueryCtx) => {
  return await isAdmin(ctx);
};

export const amIAdmin = query({
  args: {},
  handler: async (ctx) => {
    return await isAnyAdmin(ctx);
  },
});

// ── KPIs & analytics ────────────────────────────────────────────────────────
export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return null;

    const [users, orders, enrollments, attempts, courses, questions, tickets] =
      await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("orders").collect(),
        ctx.db.query("enrollments").collect(),
        ctx.db.query("examAttempts").collect(),
        ctx.db.query("courses").collect(),
        ctx.db.query("questions").collect(),
        ctx.db.query("tickets").collect(),
      ]);

    const paidOrders = orders.filter((o) => o.status === "paid");
    const revenue = paidOrders.reduce((acc, o) => acc + o.total, 0);
    const avgOrderValue = paidOrders.length === 0 ? 0 : Math.round(revenue / paidOrders.length);
    const repeatBuyers = new Set(paidOrders.map((o) => o.userId)).size;
    const repeatPurchase =
      repeatBuyers === 0 ? 0 : Math.round((paidOrders.length / repeatBuyers) * 10) / 10;
    const completedCourses = enrollments.filter(
      (e) => e.completedLessons.length > 0,
    ).length;
    const avgTestPercent =
      attempts.length === 0
        ? 0
        : Math.round(attempts.reduce((a, t) => a + t.percent, 0) / attempts.length);

    return {
      userCount: users.length,
      orderCount: orders.length,
      paidOrderCount: paidOrders.length,
      revenue,
      avgOrderValue,
      repeatPurchase,
      enrollmentCount: enrollments.length,
      completedCourseCount: completedCourses,
      attemptCount: attempts.length,
      avgTestPercent,
      courseCount: courses.length,
      questionCount: questions.length,
      openTicketCount: tickets.filter((t) => t.status === "open").length,
      conversionRate: users.length === 0 ? 0 : Math.round((paidOrders.length / users.length) * 1000) / 10,
    };
  },
});

export const getRevenueSeries = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .collect();
    const byDay = new Map<string, number>();
    for (const o of orders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      byDay.set(key, (byDay.get(key) ?? 0) + o.total);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => ({ date, revenue }));
  },
});

export const getEnrollmentStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const enrollments = await ctx.db.query("enrollments").collect();
    const byCourse = new Map<string, number>();
    for (const e of enrollments) {
      byCourse.set(e.courseId, (byCourse.get(e.courseId) ?? 0) + 1);
    }
    const out = [];
    for (const [courseId, count] of byCourse.entries()) {
      const course = (await ctx.db.get(courseId as any)) as any;
      if (course) out.push({ title: course.title, count });
    }
    return out.sort((a, b) => b.count - a.count).slice(0, 8);
  },
});

// ── Users & roles ───────────────────────────────────────────────────────────
export const adminGetUsers = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const users = await ctx.db.query("users").collect();
    return users
      .map((u) => ({
        _id: u._id,
        name: u.name ?? null,
        email: u.email ?? null,
        role: u.role ?? null,
        secondaryRole: u.secondaryRole ?? null,
        university: u.university ?? null,
        major: u.major ?? null,
        isAnonymous: u.isAnonymous ?? false,
        createdAt: (u as any)._creationTime ?? null,
      }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },
});

export const adminSetRole = mutation({
  args: { userId: v.id("users"), role: v.string() },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    if (!isRole(args.role)) throw new Error("نقش نامعتبر است.");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("کاربر یافت نشد.");
    // Site admins cannot promote to an admin role, nor change the role of
    // anyone who already holds the admin or site_admin role.
    const targetIsSystemAdmin = user.role === "admin";
    if (
      !(await isSystemAdmin(ctx)) &&
      (targetIsSystemAdmin || args.role === "admin")
    ) {
      throw new Error("فقط ادمین سامانه می‌تواند نقش ادمین سامانه را مدیریت کند.");
    }
    await ctx.db.patch(args.userId, { role: args.role });
    // Keep the admins allow-list in sync with the role.
    if (user.email) {
      const row = await ctx.db
        .query("admins")
        .withIndex("by_email", (q) => q.eq("email", user.email!))
        .first();
      if (args.role === "admin" && !row) {
        await ctx.db.insert("admins", { email: user.email });
      } else if (args.role !== "admin" && row) {
        await ctx.db.delete(row._id);
      }
    }
    return { ok: true };
  },
});

// Set or clear a secondary role for admin/site_admin so they can also teach/mentor.
export const adminSetSecondaryRole = mutation({
  args: { userId: v.id("users"), secondaryRole: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("کاربر یافت نشد.");
    // Only admin / site_admin can have a secondary role
    if (me.role !== "admin" && me.role !== "site_admin") {
      throw new Error("فقط ادمین و مدیر سایت می‌توانند نقش ثانویه داشته باشند.");
    }
    const val = args.secondaryRole;
    await ctx.db.patch(args.userId, {
      secondaryRole: val && val !== "" ? (val as any) : undefined,
    });
    return { ok: true };
  },
});

// Creates a full login account (email + password) for a user, so they can
// sign in directly without an OTP code. Roles control access levels.
export const adminCreateUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    if (!(await isSystemAdmin(ctx)) && (args.role === "admin" || args.role === "site_admin")) {
      throw new Error("فقط ادمین سامانه می‌تواند حساب ادمین بسازد.");
    }
    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("ایمیل نامعتبر است.");
    if (args.password.length < 4) throw new Error("رمز عبور باید حداقل ۴ کاراکتر باشد.");
    if (!isRole(args.role)) throw new Error("نقش نامعتبر است.");
    const existing = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email),
      )
      .first();
    if (existing) throw new Error("حسابی با این ایمیل از قبل وجود دارد.");
    const secret = await new Scrypt().hash(args.password);
    const userId = await ctx.db.insert("users", {
      name: args.name.trim() || undefined,
      email,
      role: args.role,
    });
    await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: email,
      secret,
    });
    if (args.role === "admin") {
      const row = await ctx.db
        .query("admins")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (!row) await ctx.db.insert("admins", { email });
    }
    return { ok: true, userId };
  },
});

// Deletes a user account (student, instructor, ...) together with the auth
// account, admin allow-list row and all of the user's dependent records.
export const adminDeleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("کاربر یافت نشد.");
    const me = await getCurrentUser(ctx);
    if (me && me._id === args.userId) throw new Error("نمی‌توانید حساب خودتان را حذف کنید.");
    if (
      !(await isSystemAdmin(ctx)) &&
      (user.role === "admin" || user.role === "site_admin")
    ) {
      throw new Error("فقط ادمین سامانه می‌تواند حساب ادمین را حذف کند.");
    }

    // Remove the auth account so the user can no longer sign in.
    if (user.email) {
      const account = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", user.email!),
        )
        .first();
      if (account) await ctx.db.delete(account._id);

      const adminRow = await ctx.db
        .query("admins")
        .withIndex("by_email", (q) => q.eq("email", user.email!))
        .first();
      if (adminRow) await ctx.db.delete(adminRow._id);
    }

    // Clean up dependent records owned by this user.
    const deletes: Promise<void>[] = [];
    for (const row of await ctx.db.query("enrollments").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()) {
      deletes.push(ctx.db.delete(row._id));
    }
    for (const row of await ctx.db.query("examAttempts").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()) {
      deletes.push(ctx.db.delete(row._id));
    }
    for (const row of await ctx.db.query("dailyQuizAnswers").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()) {
      deletes.push(ctx.db.delete(row._id));
    }
    for (const row of await ctx.db.query("bookmarks").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()) {
      deletes.push(ctx.db.delete(row._id));
    }
    for (const row of await ctx.db.query("flashcards").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()) {
      deletes.push(ctx.db.delete(row._id));
    }
    for (const row of await ctx.db.query("orders").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()) {
      deletes.push(ctx.db.delete(row._id));
    }
    for (const row of await ctx.db.query("tickets").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()) {
      deletes.push(ctx.db.delete(row._id));
    }
    for (const row of await ctx.db.query("comments").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()) {
      deletes.push(ctx.db.delete(row._id));
    }
    for (const row of await ctx.db.query("presence").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()) {
      deletes.push(ctx.db.delete(row._id));
    }
    for (const row of await ctx.db.query("mentorQuestions").withIndex("by_student", (q) => q.eq("studentId", args.userId)).collect()) {
      deletes.push(ctx.db.delete(row._id));
    }
    for (const row of await ctx.db.query("mentorSessions").withIndex("by_student", (q) => q.eq("studentId", args.userId)).collect()) {
      deletes.push(ctx.db.delete(row._id));
    }
    for (const row of await ctx.db.query("roomMessages").filter((q) => q.eq(q.field("userId"), args.userId)).collect()) {
      deletes.push(ctx.db.delete(row._id));
    }
    await Promise.all(deletes);

    await ctx.db.delete(args.userId);
    return { ok: true };
  },
});

// Edits a user's profile: name and/or login email. Changing the email
// migrates the auth accounts (password + OTP) so the user signs in with the
// new address, and keeps the admins allow-list in sync.
export const adminUpdateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("کاربر یافت نشد.");
    // Site admins cannot edit system admins or site admins.
    const targetPrivileged = user.role === "admin" || user.role === "site_admin";
    if (!(await isSystemAdmin(ctx)) && targetPrivileged) {
      throw new Error("فقط ادمین سامانه می‌تواند حساب‌های ادمین را ویرایش کند.");
    }

    const patch: { name?: string; email?: string } = {};

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length === 0) throw new Error("نام نمی‌تواند خالی باشد.");
      patch.name = name;
    }

    if (args.email !== undefined && args.email.trim().toLowerCase() !== (user.email ?? "")) {
      const email = args.email.trim().toLowerCase();
      if (!email.includes("@")) throw new Error("ایمیل نامعتبر است.");
      // The new email must not already belong to another password account.
      const taken = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", email),
        )
        .first();
      if (taken) throw new Error("حسابی با این ایمیل از قبل وجود دارد.");

      // Migrate every auth account bound to the old email (password + OTP).
      if (user.email) {
        const accounts = await ctx.db
          .query("authAccounts")
          .filter((q) => q.eq(q.field("providerAccountId"), user.email!))
          .collect();
        await Promise.all(
          accounts.map((a) => ctx.db.patch(a._id, { providerAccountId: email })),
        );
        // Keep the admins allow-list in sync (admins are identified by email).
        const adminRow = await ctx.db
          .query("admins")
          .withIndex("by_email", (q) => q.eq("email", user.email!))
          .first();
        if (adminRow) {
          await ctx.db.delete(adminRow._id);
          const dup = await ctx.db
            .query("admins")
            .withIndex("by_email", (q) => q.eq("email", email))
            .first();
          if (!dup) await ctx.db.insert("admins", { email });
        }
      }
      patch.email = email;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.userId, patch);
    }
    return { ok: true };
  },
});

// Resets the password of a user that already has a password account.
export const adminSetPassword = mutation({
  args: { userId: v.id("users"), password: v.string() },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    if (args.password.length < 4) throw new Error("رمز عبور باید حداقل ۴ کاراکتر باشد.");
    const user = await ctx.db.get(args.userId);
    if (!user?.email) throw new Error("کاربر یا ایمیل یافت نشد.");
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", user.email!),
      )
      .first();
    if (!account) {
      throw new Error("این کاربر حساب رمزعبوری ندارد؛ ابتدا یک حساب بسازید.");
    }
    const secret = await new Scrypt().hash(args.password);
    await ctx.db.patch(account._id, { secret });
    return { ok: true };
  },
});

export const adminAddAdmin = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    if (!(await isSystemAdmin(ctx))) throw new Error("فقط ادمین سامانه می‌تواند ادمین اضافه کند.");
    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("ایمیل نامعتبر است.");
    const existing = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!existing) await ctx.db.insert("admins", { email });
    return { ok: true };
  },
});

// ── Orders ──────────────────────────────────────────────────────────────────
export const adminGetOrders = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const orders = await ctx.db.query("orders").order("desc").collect();
    return Promise.all(
      orders.map(async (o) => {
        const u = await ctx.db.get(o.userId);
        return { ...o, user: u ? { name: u.name, email: u.email } : null };
      }),
    );
  },
});

export const adminUpdateOrderStatus = mutation({
  args: { orderId: v.id("orders"), status: v.string() },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.patch(args.orderId, { status: args.status as any });
    return { ok: true };
  },
});

export const adminDeleteOrder = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const order = await ctx.db.get(args.id);
    if (!order) throw new Error("سفارش یافت نشد.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Coupons ─────────────────────────────────────────────────────────────────
export const adminGetCoupons = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("coupons").collect();
  },
});

export const adminCreateCoupon = mutation({
  args: {
    code: v.string(),
    percent: v.number(),
    maxUses: v.number(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const code = args.code.trim().toUpperCase();
    const existing = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (existing) throw new Error("این کد قبلاً ثبت شده است.");
    if (args.percent <= 0 || args.percent > 100) throw new Error("درصد نامعتبر است.");
    await ctx.db.insert("coupons", {
      code,
      percent: args.percent,
      active: true,
      maxUses: args.maxUses,
      usedCount: 0,
      expiresAt: args.expiresAt,
    });
    return { ok: true };
  },
});

export const adminToggleCoupon = mutation({
  args: { couponId: v.id("coupons"), active: v.boolean() },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.patch(args.couponId, { active: args.active });
    return { ok: true };
  },
});

export const adminDeleteCoupon = mutation({
  args: { id: v.id("coupons") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const coupon = await ctx.db.get(args.id);
    if (!coupon) throw new Error("کد تخفیف یافت نشد.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Courses ─────────────────────────────────────────────────────────────────
export const adminListCourses = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    const courses = await ctx.db.query("courses").order("desc").collect();
    return Promise.all(
      courses.map(async (c) => ({
        ...c,
        category: (await ctx.db.get(c.categoryId))?.name ?? null,
        instructor: (await ctx.db.get(c.instructorId))?.name ?? null,
      })),
    );
  },
});

export const adminCreateCourse = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    categoryId: v.id("categories"),
    instructorId: v.id("instructors"),
    summary: v.string(),
    price: v.number(),
    mode: v.string(),
    bundle: v.string(),
    published: v.boolean(),
    audience: v.optional(v.array(v.string())),
    prerequisites: v.optional(v.array(v.string())),
    syllabus: v.optional(v.array(v.object({
      title: v.string(),
      durationMin: v.number(),
      free: v.boolean(),
    }))),
    packagePrices: v.optional(v.array(v.object({
      tier: v.union(v.literal("economy"), v.literal("basic"), v.literal("plus"), v.literal("premium")),
      price: v.number(),
      features: v.array(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    const slug = args.slug.trim() || args.title.trim().replace(/\s+/g, "-").toLowerCase();
    await ctx.db.insert("courses", {
      title: args.title.trim(),
      slug,
      categoryId: args.categoryId,
      instructorId: args.instructorId,
      summary: args.summary.trim(),
      description: args.summary.trim(),
      audience: args.audience ?? [],
      prerequisites: args.prerequisites ?? [],
      syllabus: (args.syllabus ?? []).map((s, i) => ({ ...s, id: `s${i}` })),
      durationText: "به‌زودی",
      mode: args.mode as any,
      price: args.price,
      rating: 0,
      ratingCount: 0,
      studentsCount: 0,
      accent: "teal",
      bundle: args.bundle as any,
      packagePrices: args.packagePrices,
      includes: [],
      hasSampleVideo: false,
      files: [],
      published: args.published,
      featured: false,
      popular: false,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const adminUpdateCourse = mutation({
  args: {
    id: v.id("courses"),
    title: v.string(),
    categoryId: v.id("categories"),
    instructorId: v.id("instructors"),
    summary: v.string(),
    price: v.number(),
    mode: v.string(),
    bundle: v.string(),
    published: v.boolean(),
    audience: v.optional(v.array(v.string())),
    prerequisites: v.optional(v.array(v.string())),
    syllabus: v.optional(v.array(v.object({
      title: v.string(),
      durationMin: v.number(),
      free: v.boolean(),
    }))),
    packagePrices: v.optional(v.array(v.object({
      tier: v.union(v.literal("economy"), v.literal("basic"), v.literal("plus"), v.literal("premium")),
      price: v.number(),
      features: v.array(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    const patch: Record<string, unknown> = {
      title: args.title.trim(),
      categoryId: args.categoryId,
      instructorId: args.instructorId,
      summary: args.summary.trim(),
      description: args.summary.trim(),
      price: args.price,
      mode: args.mode as any,
      bundle: args.bundle as any,
      published: args.published,
    };
    if (args.audience !== undefined) patch.audience = args.audience;
    if (args.prerequisites !== undefined) patch.prerequisites = args.prerequisites;
    if (args.syllabus !== undefined) patch.syllabus = args.syllabus.map((s, i) => ({ ...s, id: `s${i}` }));
    if (args.packagePrices !== undefined) patch.packagePrices = args.packagePrices;
    await ctx.db.patch(args.id, patch as any);
    return { ok: true };
  },
});

export const adminTogglePublish = mutation({
  args: { collection: v.string(), id: v.string(), published: v.boolean() },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.patch(args.id as any, { published: args.published } as any);
    return { ok: true };
  },
});

export const adminDeleteCourse = mutation({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

export const adminDeleteArticle = mutation({
  args: { id: v.id("articles") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

export const adminDeleteWorkshop = mutation({
  args: { id: v.id("workshops") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Exams ───────────────────────────────────────────────────────────────────
export const adminListExams = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    return (await ctx.db.query("exams").order("desc").collect()).map((e) => ({
      ...e,
      questionCount: e.questionIds.length,
      kindLabel: e.diagnostic
        ? "تعیین سطح"
        : e.free
          ? "رایگان"
          : "پولی",
    }));
  },
});

// Creates an exam by pulling questions from the bank (optionally one topic).
export const adminCreateExam = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    durationMinutes: v.number(),
    free: v.boolean(),
    diagnostic: v.boolean(),
    topicId: v.optional(v.id("categories")),
    count: v.number(),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    if (args.count < 1 || args.count > 50) throw new Error("تعداد سؤال باید بین ۱ تا ۵۰ باشد.");
    let questions = await ctx.db.query("questions").collect();
    if (args.topicId) {
      questions = questions.filter((q) => q.topicId === args.topicId);
    }
    if (questions.length === 0) throw new Error("در این موضوع سؤالی وجود ندارد.");
    const picked = [...questions]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(args.count, questions.length));
    const slug =
      args.title.trim().replace(/\s+/g, "-").toLowerCase() +
      "-" +
      Date.now().toString(36);
    await ctx.db.insert("exams", {
      title: args.title.trim(),
      slug,
      description: args.description.trim(),
      durationMinutes: args.durationMinutes,
      questionIds: picked.map((q) => q._id),
      free: args.free,
      published: args.published,
      featured: false,
      diagnostic: args.diagnostic,
      accent: "teal",
      order: Date.now(),
    });
    return { ok: true, questionCount: picked.length };
  },
});

export const adminToggleExamPublish = mutation({
  args: { id: v.id("exams"), published: v.boolean() },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.patch(args.id, { published: args.published });
    return { ok: true };
  },
});

export const adminDeleteExam = mutation({
  args: { id: v.id("exams") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    const exam = await ctx.db.get(args.id);
    if (!exam) throw new Error("آزمون یافت نشد.");
    const attempts = await ctx.db
      .query("examAttempts")
      .withIndex("by_exam", (q) => q.eq("examId", args.id))
      .collect();
    await Promise.all(attempts.map((a) => ctx.db.delete(a._id)));
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Products ────────────────────────────────────────────────────────────────
export const adminListProducts = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    const typeLabels: Record<string, string> = {
      flashcards: "فلش‌کارت",
      guide: "کتابچهٔ راهنما",
      poster: "پوستر",
      notes: "جزوه",
      book: "کتاب",
      package: "بسته آموزشی",
      other: "سایر",
    };
    return (await ctx.db.query("products").order("desc").collect()).map((p) => ({
      ...p,
      typeLabel: typeLabels[p.type] ?? p.type,
    }));
  },
});

export const adminCreateProduct = mutation({
  args: {
    title: v.string(),
    type: v.string(),
    description: v.string(),
    price: v.number(),
    published: v.boolean(),
    coverImage: v.optional(v.string()),
    stock: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    if (!["flashcards", "guide", "poster", "notes", "book", "package", "other"].includes(args.type)) {
      throw new Error("نوع محصول نامعتبر است.");
    }
    await ctx.db.insert("products", {
      title: args.title.trim(),
      slug: args.title.trim().replace(/\s+/g, "-").toLowerCase(),
      type: args.type as any,
      description: args.description.trim(),
      price: args.price,
      accent: "teal",
      published: args.published,
      featured: false,
      coverImage: args.coverImage,
      stock: args.stock ?? 0,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const adminUpdateProduct = mutation({
  args: {
    id: v.id("products"),
    title: v.string(),
    type: v.string(),
    description: v.string(),
    price: v.number(),
    published: v.boolean(),
    coverImage: v.optional(v.string()),
    stock: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.patch(args.id, {
      title: args.title.trim(),
      type: args.type as any,
      description: args.description.trim(),
      price: args.price,
      published: args.published,
      coverImage: args.coverImage,
      stock: args.stock,
    });
    return { ok: true };
  },
});

export const adminDeleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Instructors ─────────────────────────────────────────────────────────────
export const adminListInstructors = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    const instructors = await ctx.db.query("instructors").collect();
    return Promise.all(
      instructors.map(async (i) => {
        const [courses, workshops] = await Promise.all([
          ctx.db
            .query("courses")
            .withIndex("by_published", (q) => q.eq("published", true))
            .filter((q) => q.eq(q.field("instructorId"), i._id))
            .collect(),
          ctx.db
            .query("workshops")
            .filter((q) => q.eq(q.field("instructorId"), i._id))
            .collect(),
        ]);
        return { ...i, courseCount: courses.length, workshopCount: workshops.length };
      }),
    );
  },
});

export const adminCreateInstructor = mutation({
  args: {
    name: v.string(),
    title: v.string(),
    bio: v.string(),
    education: v.array(v.string()),
    specialties: v.array(v.string()),
    accent: v.string(),
    verified: v.boolean(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const name = args.name.trim();
    if (!name) throw new Error("نام مدرس لازم است.");
    await ctx.db.insert("instructors", {
      name,
      slug: name.replace(/\s+/g, "-").toLowerCase(),
      title: args.title.trim(),
      bio: args.bio, // preserve newlines
      education: args.education.filter((e) => e.trim()),
      specialties: args.specialties.filter((s) => s.trim()),
      accent: args.accent || "teal",
      verified: args.verified,
      ...(args.userId ? { userId: args.userId } : {}),
    });
    return { ok: true };
  },
});

export const adminUpdateInstructor = mutation({
  args: {
    id: v.id("instructors"),
    name: v.string(),
    title: v.string(),
    bio: v.string(),
    education: v.array(v.string()),
    specialties: v.array(v.string()),
    accent: v.string(),
    verified: v.boolean(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const patch: Record<string, unknown> = {
      name: args.name.trim(),
      title: args.title.trim(),
      bio: args.bio, // preserve newlines
      education: args.education.filter((e) => e.trim()),
      specialties: args.specialties.filter((s) => s.trim()),
      accent: args.accent || "teal",
      verified: args.verified,
    };
    if (args.userId !== undefined) patch.userId = args.userId || undefined;
    await ctx.db.patch(args.id, patch);
    return { ok: true };
  },
});

export const adminDeleteInstructor = mutation({
  args: { id: v.id("instructors") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Class Requests ──────────────────────────────────────────────────────────
export const requestClass = mutation({
  args: {
    title: v.string(),
    topic: v.string(),
    description: v.string(),
    proposedDate: v.string(),
    immediate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("برای ارسال درخواست ابتدا وارد شوید.");
    const cu = await getCurrentUser(ctx);
    if (!cu) throw new Error("کاربر یافت نشد.");
    await ctx.db.insert("classRequests", {
      instructorId: userId,
      instructorName: cu.name ?? "",
      title: args.title,
      topic: args.topic,
      description: args.description,
      proposedDate: args.proposedDate,
      immediate: args.immediate ?? false,
      status: "pending",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const adminListClassRequests = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("classRequests").order("desc").collect();
  },
});

export const adminReviewClassRequest = mutation({
  args: {
    id: v.id("classRequests"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    platformUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const userId = await getAuthUserId(ctx);
    await ctx.db.patch(args.id, {
      status: args.status,
      reviewedBy: userId ?? undefined,
      reviewedAt: Date.now(),
      platformUrl: args.platformUrl,
    });
    if (args.status === "approved" && args.platformUrl) {
      const req = await ctx.db.get(args.id);
      if (req) {
        await ctx.db.insert("classRooms", {
          instructorId: req.instructorId,
          instructorName: req.instructorName,
          title: req.title,
          topic: req.topic,
          description: req.description,
          status: "scheduled",
          broadcasting: false,
          createdAt: Date.now(),
          platformUrl: args.platformUrl,
          scheduledDate: req.proposedDate,
        });
      }
    }
    return { ok: true };
  },
});

export const listMyClassRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("classRequests")
      .withIndex("by_instructor", (q) => q.eq("instructorId", userId))
      .order("desc")
      .collect();
  },
});

// ── Questions ───────────────────────────────────────────────────────────────
export const adminGetQuestions = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    const questions = await ctx.db.query("questions").collect();
    return Promise.all(
      questions.map(async (q) => ({
        ...q,
        topic: (await ctx.db.get(q.topicId))?.name ?? null,
      })),
    );
  },
});

// Grouped questions: categories with their question counts
export const adminGetQuestionGroups = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    const categories = await ctx.db.query("categories").collect();
    const questions = await ctx.db.query("questions").collect();
    return categories.map((cat) => {
      const catQuestions = questions.filter((q) => q.topicId === cat._id);
      return {
        categoryId: cat._id,
        categoryName: cat.name,
        categorySlug: cat.slug,
        questionCount: catQuestions.length,
        questions: catQuestions,
      };
    });
  },
});

// Delete a category and all its questions
export const adminDeleteCategory = mutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    // Delete all questions in this category
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_topic", (q) => q.eq("topicId", args.categoryId))
      .collect();
    for (const q of questions) {
      // Also remove from any exams
      const exams = await ctx.db.query("exams").collect();
      for (const exam of exams) {
        if (exam.questionIds.includes(q._id)) {
          await ctx.db.patch(exam._id, {
            questionIds: exam.questionIds.filter((qid) => qid !== q._id),
          });
        }
      }
      await ctx.db.delete(q._id);
    }
    // Delete the category itself
    await ctx.db.delete(args.categoryId);
    return { ok: true, deleted: questions.length };
  },
});

// Update a category name
export const adminUpdateCategory = mutation({
  args: { categoryId: v.id("categories"), name: v.string() },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.patch(args.categoryId, { name: args.name.trim() });
    return { ok: true };
  },
});

export const adminCreateQuestion = mutation({
  args: {
    text: v.string(),
    options: v.array(v.string()),
    correctIndex: v.number(),
    explanation: v.string(),
    topicId: v.id("categories"),
    difficulty: v.number(),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    if (args.options.length < 2) throw new Error("حداقل دو گزینه لازم است.");
    await ctx.db.insert("questions", {
      text: args.text.trim(),
      options: args.options,
      correctIndex: args.correctIndex,
      explanation: args.explanation.trim(),
      topicId: args.topicId,
      difficulty: args.difficulty,
    });
    return { ok: true };
  },
});

export const adminDeleteQuestion = mutation({
  args: { id: v.id("questions") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    const question = await ctx.db.get(args.id);
    if (!question) throw new Error("سؤال یافت نشد.");
    // Also pull the question out of any exam that references it.
    const exams = await ctx.db.query("exams").collect();
    for (const exam of exams) {
      if (exam.questionIds.includes(args.id)) {
        await ctx.db.patch(exam._id, {
          questionIds: exam.questionIds.filter((qid) => qid !== args.id),
        });
      }
    }
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

export const adminUpdateQuestion = mutation({
  args: {
    id: v.id("questions"),
    text: v.string(),
    options: v.array(v.string()),
    correctIndex: v.number(),
    explanation: v.string(),
    difficulty: v.number(),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    const question = await ctx.db.get(args.id);
    if (!question) throw new Error("سؤال یافت نشد.");
    await ctx.db.patch(args.id, {
      text: args.text.trim(),
      options: args.options,
      correctIndex: args.correctIndex,
      explanation: args.explanation.trim(),
      difficulty: args.difficulty,
    });
    return { ok: true };
  },
});

// ── Articles ────────────────────────────────────────────────────────────────
export const adminListArticles = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    return (await ctx.db.query("articles").order("desc").collect()).map((a) => ({
      ...a,
      categoryLabel: a.category || "عمومی",
    }));
  },
});

export const adminCreateArticle = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    category: v.string(),
    excerpt: v.string(),
    body: v.string(),
    authorName: v.string(),
    readTime: v.number(),
    published: v.boolean(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.array(v.string())),
    seoCanonical: v.optional(v.string()),
    ogTitle: v.optional(v.string()),
    ogDescription: v.optional(v.string()),
    ogImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.insert("articles", {
      title: args.title.trim(),
      slug: args.slug.trim() || args.title.trim().replace(/\s+/g, "-"),
      category: args.category.trim() || "عمومی",
      excerpt: args.excerpt.trim(),
      body: args.body,
      authorName: args.authorName.trim() || "تیم Genova",
      accent: "teal",
      readTime: args.readTime || 5,
      published: args.published,
      featured: false,
      status: args.published ? "published" : "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(args.seoTitle && { seoTitle: args.seoTitle }),
      ...(args.seoDescription && { seoDescription: args.seoDescription }),
      ...(args.seoKeywords && args.seoKeywords.length > 0 && { seoKeywords: args.seoKeywords }),
      ...(args.seoCanonical && { seoCanonical: args.seoCanonical }),
      ...(args.ogTitle && { ogTitle: args.ogTitle }),
      ...(args.ogDescription && { ogDescription: args.ogDescription }),
      ...(args.ogImage && { ogImage: args.ogImage }),
    });
    return { ok: true };
  },
});

export const adminUpdateArticle = mutation({
  args: {
    id: v.id("articles"),
    title: v.string(),
    category: v.string(),
    excerpt: v.string(),
    body: v.string(),
    authorName: v.string(),
    readTime: v.number(),
    published: v.boolean(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.array(v.string())),
    seoCanonical: v.optional(v.string()),
    ogTitle: v.optional(v.string()),
    ogDescription: v.optional(v.string()),
    ogImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    const patch: Record<string, any> = {
      title: args.title.trim(),
      category: args.category.trim() || "عمومی",
      excerpt: args.excerpt.trim(),
      body: args.body,
      authorName: args.authorName.trim() || "تیم Genova",
      readTime: args.readTime || 5,
      published: args.published,
    };
    if (args.seoTitle !== undefined) patch.seoTitle = args.seoTitle || undefined;
    if (args.seoDescription !== undefined) patch.seoDescription = args.seoDescription || undefined;
    if (args.seoKeywords !== undefined) patch.seoKeywords = args.seoKeywords.length > 0 ? args.seoKeywords : undefined;
    if (args.seoCanonical !== undefined) patch.seoCanonical = args.seoCanonical || undefined;
    if (args.ogTitle !== undefined) patch.ogTitle = args.ogTitle || undefined;
    if (args.ogDescription !== undefined) patch.ogDescription = args.ogDescription || undefined;
    if (args.ogImage !== undefined) patch.ogImage = args.ogImage || undefined;
    await ctx.db.patch(args.id, patch);
    return { ok: true };
  },
});

export const adminSaveGeneratedArticles = mutation({
  args: {
    articles: v.array(
      v.object({
        title: v.string(),
        category: v.string(),
        excerpt: v.string(),
        body: v.string(),
      })
    ),
    authorName: v.string(),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    for (const art of args.articles) {
      await ctx.db.insert("articles", {
        title: art.title.trim(),
        slug: art.title.trim().replace(/\s+/g, "-"),
        category: art.category.trim() || args.articles[0]?.category || "عمومی",
        excerpt: art.excerpt.trim(),
        body: art.body,
        authorName: args.authorName.trim() || "تیم Genova",
        accent: "teal",
        readTime: Math.max(1, Math.round(art.body.split(/\s+/).length / 250)),
        published: args.published,
        featured: false,
        status: args.published ? "published" : "draft",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return { ok: true, count: args.articles.length };
  },
});

// ── Workshops ───────────────────────────────────────────────────────────────
export const adminListWorkshops = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    const workshops = await ctx.db.query("workshops").order("desc").collect();
    return Promise.all(
      workshops.map(async (w) => ({
        ...w,
        instructor: (await ctx.db.get(w.instructorId))?.name ?? null,
      })),
    );
  },
});

export const adminCreateWorkshop = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    instructorId: v.id("instructors"),
    topic: v.string(),
    date: v.string(),
    time: v.string(),
    capacity: v.number(),
    price: v.number(),
    description: v.string(),
    free: v.boolean(),
    expertTalk: v.boolean(),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.insert("workshops", {
      title: args.title.trim(),
      slug: args.slug.trim() || args.title.trim().replace(/\s+/g, "-"),
      instructorId: args.instructorId,
      topic: args.topic.trim(),
      date: args.date,
      time: args.time,
      capacity: args.capacity,
      registeredCount: 0,
      price: args.price,
      description: args.description,
      agenda: [],
      free: args.free,
      expertTalk: args.expertTalk,
      published: args.published,
    });
    return { ok: true };
  },
});

export const adminUpdateWorkshop = mutation({
  args: {
    id: v.id("workshops"),
    title: v.string(),
    instructorId: v.id("instructors"),
    topic: v.string(),
    date: v.string(),
    time: v.string(),
    capacity: v.number(),
    price: v.number(),
    description: v.string(),
    free: v.boolean(),
    expertTalk: v.boolean(),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.patch(args.id, {
      title: args.title.trim(),
      instructorId: args.instructorId,
      topic: args.topic.trim(),
      date: args.date,
      time: args.time,
      capacity: args.capacity,
      price: args.price,
      description: args.description,
      free: args.free,
      expertTalk: args.expertTalk,
      published: args.published,
    });
    return { ok: true };
  },
});

// ── Section notification counts (red dots) ─────────────────────────────────
export const getSectionNotifications = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return {};

    // Count open tickets
    const openTickets = await ctx.db
      .query("tickets")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    // Count open exam reports
    const openReports = await ctx.db
      .query("examReports")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    // Count pending profiles
    const allUsers = await ctx.db.query("users").collect();
    const pendingProfiles = allUsers.filter((u) => !!u.pendingProfile).length;

    // Count pending courses (instructor-designed)
    const allCourses = await ctx.db.query("courses").collect();
    const pendingCourses = allCourses.filter((c) => c.status === "pending").length;

    // Count pending offline payments
    const pendingPayments = await ctx.db
      .query("offlinePayments")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Count pending class requests
    const allClassRequests = await ctx.db.query("classRequests").collect();
    const pendingClassRequests = allClassRequests.filter((cr) => cr.status === "pending").length;

    return {
      support: openTickets.length,
      examReports: openReports.length,
      profiles: pendingProfiles,
      courses: pendingCourses,
      offlinePayments: pendingPayments.length,
      classRequests: pendingClassRequests,
    };
  },
});

// ── AI-generated questions ──────────────────────────────────────────────────

export const saveGeneratedQuestions = mutation({
  args: {
    questions: v.array(
      v.object({
        text: v.string(),
        options: v.array(v.string()),
        correctIndex: v.number(),
        explanation: v.string(),
        difficulty: v.number(),
      })
    ),
    topicId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    if (args.questions.length === 0) throw new Error("سوالی برای ذخیره وجود ندارد.");
    let saved = 0;
    for (const q of args.questions) {
      if (q.options.length < 2) continue;
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) continue;
      await ctx.db.insert("questions", {
        text: q.text.trim(),
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation.trim(),
        topicId: args.topicId,
        difficulty: q.difficulty,
      });
      saved++;
    }
    return { ok: true, saved };
  },
});

// ── Export / Backup ─────────────────────────────────────────────────────────
// Returns all data from every table as a single JSON-friendly object.
// Only admins can call this.
export const exportBackup = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return null;

    const TABLES = [
      "users", "categories", "instructors", "courses", "products",
      "workshops", "articles", "dictionaryTerms", "questions", "exams",
      "examAttempts", "dailyQuiz", "dailyQuizAnswers", "orders",
      "coupons", "enrollments", "announcements", "bookmarks",
      "flashcards", "tickets", "comments", "courseResources",
      "attendance", "instructorPayments", "directMessages", "testimonials",
      "admins", "offlinePayments", "inboxMessages", "aiConfig",
      "aiModels", "aiPrompts", "aiConversations", "aiMessages",
      "aiUsage", "aiTokenQuotas", "classRooms", "classRequests",
      "whiteboardStrokes", "roomMessages", "signals", "mentorGroups",
      "mentorQuestions", "mentorSessions", "groupMembers",
      "groupAnnouncements", "sitePages", "siteTexts", "mediaItems",
      "articleVersions", "superAdminSessions", "telegramBot",
      "telegramLinkingCodes", "telegramNotifPrefs", "telegramNotifLog",
      "reminders", "presence", "examReports",
    ] as const;

    const backup: Record<string, any[]> = {};
    for (const table of TABLES) {
      try {
        backup[table] = await ctx.db.query(table).collect();
      } catch {
        backup[table] = [];
      }
    }

    return {
      exportedAt: new Date().toISOString(),
      tables: backup,
      tableCount: Object.keys(backup).length,
      recordCount: Object.values(backup).reduce((sum, arr) => sum + arr.length, 0),
    };
  },
});

// ── Admin: list all instructor payments ─────────────────────────────────────
export const adminListPayments = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("instructorPayments").order("desc").collect();
  },
});

// ── Admin: delete an instructor payment record ──────────────────────────────
export const adminDeletePayment = mutation({
  args: { paymentId: v.id("instructorPayments") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("فقط مدیر می‌تواند سابقه پرداخت را حذف کند.");
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("سابقه پرداخت یافت نشد.");
    await ctx.db.delete(args.paymentId);
    return { ok: true };
  },
});

// ── Admin: list all class rooms ─────────────────────────────────────────────
export const adminListClassRooms = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db.query("classRooms").order("desc").collect();
  },
});

// ── Admin: Marketplace Product Approvals ─────────────────────────────────────
export const adminListPendingStoreProducts = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const pending = await ctx.db
      .query("storeProducts")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
    const result = [];
    for (const p of pending) {
      const seller = await ctx.db.get(p.sellerId);
      result.push({
        ...p,
        sellerName: seller?.name ?? seller?.email ?? "—",
      });
    }
    return result;
  },
});

export const adminApproveStoreProduct = mutation({
  args: {
    productId: v.id("storeProducts"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("فقط مدیر می‌تواند محصول را تأیید کند.");
    await ctx.db.patch(args.productId, {
      status: args.status,
      rejectionReason: args.status === "rejected" ? args.rejectionReason : undefined,
    });
    return { ok: true };
  },
});

export const adminGetAllStoreProducts = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const all = await ctx.db.query("storeProducts").order("desc").collect();
    const result = [];
    for (const p of all) {
      const seller = await ctx.db.get(p.sellerId);
      result.push({
        ...p,
        sellerName: seller?.name ?? seller?.email ?? "—",
      });
    }
    return result;
  },
});

// ── Admin: Product Discount Management ───────────────────────────────────────
export const adminSetCourseDiscount = mutation({
  args: {
    courseId: v.id("courses"),
    discountPercent: v.optional(v.number()),
    discountExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("فقط مدیر می‌تواند تخفیف تنظیم کند.");
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("دوره یافت نشد.");
    let discountPrice: number | undefined = undefined;
    if (args.discountPercent !== undefined && args.discountPercent > 0) {
      const pct = Math.min(Math.max(args.discountPercent, 1), 100);
      discountPrice = Math.round(course.price * (1 - pct / 100));
    }
    await ctx.db.patch(args.courseId, {
      discountPrice,
      discountExpiresAt: discountPrice ? args.discountExpiresAt : undefined,
    });
    return { ok: true, discountPrice };
  },
});

export const adminSetProductDiscount = mutation({
  args: {
    productId: v.id("products"),
    discountPercent: v.optional(v.number()),
    discountExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("فقط مدیر می‌تواند تخفیف تنظیم کند.");
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("محصول یافت نشد.");
    let discountPrice: number | undefined = undefined;
    if (args.discountPercent !== undefined && args.discountPercent > 0) {
      const pct = Math.min(Math.max(args.discountPercent, 1), 100);
      discountPrice = Math.round(product.price * (1 - pct / 100));
    }
    await ctx.db.patch(args.productId, {
      discountPrice,
      discountExpiresAt: discountPrice ? args.discountExpiresAt : undefined,
    });
    return { ok: true, discountPrice };
  },
});

export const adminListCoursesForDiscount = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return (await ctx.db.query("courses").collect()).map((c) => ({
      _id: c._id,
      title: c.title,
      price: c.price,
      discountPrice: c.discountPrice,
      discountExpiresAt: c.discountExpiresAt,
      published: c.published,
    }));
  },
});

export const adminListProductsForDiscount = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return (await ctx.db.query("products").collect()).map((p) => ({
      _id: p._id,
      title: p.title,
      price: p.price,
      discountPrice: p.discountPrice,
      discountExpiresAt: p.discountExpiresAt,
      published: p.published,
    }));
  },
});

