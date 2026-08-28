import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Scrypt } from "lucia";

// Static super admin password (will be time-based later)
const SUPER_ADMIN_PASSWORD = "GENOVA-SUPER-ADMIN-2024";
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour

// ── Helpers ─────────────────────────────────────────────────────────────────

async function requireSystemAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("ورود لازم است.");
  const user = await ctx.db.get(userId);
  if (!user || (user as any).role !== "admin") {
    throw new Error("فقط مدیر سامانه دسترسی دارد.");
  }
  return user;
}

async function requireActiveSession(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;
  const session = await ctx.db
    .query("superAdminSessions")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .order("desc")
    .first();
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    await ctx.db.delete(session._id);
    return false;
  }
  return true;
}

// ── Authentication ──────────────────────────────────────────────────────────

export const verifyPassword = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ورود لازم است.");
    const user = await ctx.db.get(userId);
    if (!user || (user as any).role !== "admin") {
      throw new Error("فقط مدیر سامانه.");
    }

    // Verify the static password
    if (args.password !== SUPER_ADMIN_PASSWORD) {
      throw new Error("رمز عبور اشتباه است.");
    }

    // Create a session (delete old ones first)
    const oldSessions = await ctx.db
      .query("superAdminSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const s of oldSessions) {
      await ctx.db.delete(s._id);
    }

    const now = Date.now();
    await ctx.db.insert("superAdminSessions", {
      userId,
      createdAt: now,
      expiresAt: now + SESSION_DURATION,
    });

    return { success: true, expiresAt: now + SESSION_DURATION };
  },
});

export const checkSession = query({
  args: {},
  handler: async (ctx) => {
    return await requireActiveSession(ctx);
  },
});

export const logoutSession = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const sessions = await ctx.db
      .query("superAdminSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }
    return { success: true };
  },
});

// ── Full User Management ────────────────────────────────────────────────────

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireActiveSession(ctx))) return [];
    const users = await ctx.db.query("users").collect();
    // Get auth accounts for each user
    const results = [];
    for (const u of users) {
      const accounts = await ctx.db
        .query("authAccounts")
        .filter((q) => q.eq(q.field("userId"), u._id))
        .collect();
      const passwordAccount = accounts.find((a: any) => a.provider === "password");
      results.push({
        ...u,
        hasPassword: !!passwordAccount,
        accountCount: accounts.length,
        providers: accounts.map((a: any) => a.provider),
      });
    }
    return results;
  },
});

export const updateUserRole = mutation({
  args: { userId: v.id("users"), role: v.string() },
  handler: async (ctx, args) => {
    if (!(await requireActiveSession(ctx))) throw new Error("دسترسی منقضی شده.");
    await ctx.db.patch(args.userId, { role: args.role as any });
    return { success: true };
  },
});

export const updateUserField = mutation({
  args: {
    userId: v.id("users"),
    field: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await requireActiveSession(ctx))) throw new Error("دسترسی منقضی شده.");
    await ctx.db.patch(args.userId, { [args.field]: args.value } as any);
    return { success: true };
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (!(await requireActiveSession(ctx))) throw new Error("دسترسی منقضی شده.");
    // Delete auth accounts
    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    for (const a of accounts) {
      await ctx.db.delete(a._id);
    }
    // Delete sessions
    const sessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }
    await ctx.db.delete(args.userId);
    return { success: true };
  },
});

// ── Site Content Management ─────────────────────────────────────────────────

export const getSiteTexts = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireActiveSession(ctx))) return [];
    return await ctx.db.query("siteTexts").collect();
  },
});

export const updateSiteText = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    if (!(await requireActiveSession(ctx))) throw new Error("دسترسی منقضی شده.");
    const userId = await getAuthUserId(ctx);
    const existing = await ctx.db
      .query("siteTexts")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedBy: userId!,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("siteTexts", {
        key: args.key,
        value: args.value,
        updatedBy: userId!,
        updatedAt: Date.now(),
      });
    }
    return { success: true };
  },
});

export const deleteSiteText = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    if (!(await requireActiveSession(ctx))) throw new Error("دسترسی منقضی شده.");
    const existing = await ctx.db
      .query("siteTexts")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    return { success: true };
  },
});

// ── Custom Pages ────────────────────────────────────────────────────────────

export const getSitePages = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireActiveSession(ctx))) return [];
    return await ctx.db.query("sitePages").collect();
  },
});

export const saveSitePage = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    htmlContent: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await requireActiveSession(ctx))) throw new Error("دسترسی منقضی شده.");
    const userId = await getAuthUserId(ctx);
    const existing = await ctx.db
      .query("sitePages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        htmlContent: args.htmlContent,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("sitePages", {
        slug: args.slug,
        title: args.title,
        htmlContent: args.htmlContent,
        createdBy: userId!,
        updatedAt: Date.now(),
      });
    }
    return { success: true };
  },
});

export const deleteSitePage = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    if (!(await requireActiveSession(ctx))) throw new Error("دسترسی منقضی شده.");
    const existing = await ctx.db
      .query("sitePages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    return { success: true };
  },
});

// ── System Stats ────────────────────────────────────────────────────────────

export const getSystemStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireActiveSession(ctx))) return null;

    const users = await ctx.db.query("users").collect();
    const courses = await ctx.db.query("courses").collect();
    const exams = await ctx.db.query("exams").collect();
    const questions = await ctx.db.query("questions").collect();
    const orders = await ctx.db.query("orders").collect();
    const enrollments = await ctx.db.query("enrollments").collect();
    const aiConversations = await ctx.db.query("aiConversations").collect();
    const aiMessages = await ctx.db.query("aiMessages").collect();
    const articles = await ctx.db.query("articles").collect();
    const workshops = await ctx.db.query("workshops").collect();
    const products = await ctx.db.query("products").collect();
    const tickets = await ctx.db.query("tickets").collect();

    const roleCounts: Record<string, number> = {};
    for (const u of users) {
      const r = (u as any).role ?? "user";
      roleCounts[r] = (roleCounts[r] ?? 0) + 1;
    }

    return {
      users: users.length,
      roleCounts,
      courses: courses.length,
      exams: exams.length,
      questions: questions.length,
      orders: orders.length,
      enrollments: enrollments.length,
      aiConversations: aiConversations.length,
      aiMessages: aiMessages.length,
      articles: articles.length,
      workshops: workshops.length,
      products: products.length,
      tickets: tickets.length,
    };
  },
});

// ── AI Data Access ──────────────────────────────────────────────────────────

export const getAIConversations = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireActiveSession(ctx))) return [];
    const convos = await ctx.db.query("aiConversations").collect();
    const results = [];
    for (const c of convos) {
      const u = await ctx.db.get(c.userId);
      const msgs = await ctx.db
        .query("aiMessages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
        .collect();
      results.push({
        ...c,
        userName: (u as any)?.name ?? (u as any)?.email ?? "ناشناس",
        messageCount: msgs.length,
        messages: msgs,
      });
    }
    return results;
  },
});

// ── All Data Access (for inspection) ────────────────────────────────────────

export const getAllTableCounts = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireActiveSession(ctx))) return {};
    const tables = [
      "users", "categories", "courses", "exams", "questions",
      "orders", "enrollments", "articles", "workshops", "products",
      "aiConversations", "aiMessages", "aiConfig",      "tickets",
      "announcements",
      "coupons",
      "sitePages",
      "siteTexts",
      "mentorGroups",
      "mentorQuestions",
      "mentorSessions",
      "aiUsage",
      "aiTokenQuotas",
      "aiPrompts",
    ];
    const counts: Record<string, number> = {};
    for (const t of tables) {
      try {
        counts[t] = (await ctx.db.query(t as any).collect()).length;
      } catch {
        counts[t] = -1;
      }
    }
    return counts;
  },
});
