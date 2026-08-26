import { v } from "convex/values";
import { Scrypt } from "lucia";
import { mutation, query, QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./users";

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
    return (await ctx.db.query("products").order("desc").collect()).map((p) => ({
      ...p,
      typeLabel:
        p.type === "flashcards"
          ? "فلش‌کارت"
          : p.type === "guide"
            ? "کتابچهٔ راهنما"
            : "پوستر",
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
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    if (!["flashcards", "guide", "poster"].includes(args.type)) {
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
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.patch(args.id, {
      title: args.title.trim(),
      type: args.type as any,
      description: args.description.trim(),
      price: args.price,
      published: args.published,
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
  },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const name = args.name.trim();
    if (!name) throw new Error("نام مدرس لازم است.");
    await ctx.db.insert("instructors", {
      name,
      slug: name.replace(/\s+/g, "-").toLowerCase(),
      title: args.title.trim(),
      bio: args.bio.trim(),
      education: args.education.filter((e) => e.trim()),
      specialties: args.specialties.filter((s) => s.trim()),
      accent: args.accent || "teal",
      verified: args.verified,
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
  },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      title: args.title.trim(),
      bio: args.bio.trim(),
      education: args.education.filter((e) => e.trim()),
      specialties: args.specialties.filter((s) => s.trim()),
      accent: args.accent || "teal",
      verified: args.verified,
    });
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
      createdAt: Date.now(),
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
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.patch(args.id, {
      title: args.title.trim(),
      category: args.category.trim() || "عمومی",
      excerpt: args.excerpt.trim(),
      body: args.body,
      authorName: args.authorName.trim() || "تیم Genova",
      readTime: args.readTime || 5,
      published: args.published,
    });
    return { ok: true };
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

    return {
      support: openTickets.length,
      examReports: openReports.length,
      profiles: pendingProfiles,
      courses: pendingCourses,
      offlinePayments: pendingPayments.length,
    };
  },
});
