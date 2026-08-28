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

// ── User Detail with Password ───────────────────────────────────────────────

export const getUserDetail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (!(await requireActiveSession(ctx))) return null;
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    // Get auth accounts
    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q: any) => q.eq(q.field("userId"), args.userId))
      .collect();
    const passwordAccount = accounts.find((a: any) => a.provider === "password");
    // Get enrollments
    const enrollments = await ctx.db
      .query("enrollments")
      .filter((q: any) => q.eq(q.field("userId"), args.userId))
      .collect();
    // Get exam attempts
    const attempts = await ctx.db
      .query("examAttempts")
      .filter((q: any) => q.eq(q.field("userId"), args.userId))
      .collect();
    // Get AI usage
    const aiUsage = await ctx.db
      .query("aiUsage")
      .filter((q: any) => q.eq(q.field("userId"), args.userId))
      .collect();
    // Get AI conversations count
    const aiConvos = await ctx.db
      .query("aiConversations")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();
    return {
      ...user,
      passwordHash: passwordAccount?.secret ?? null,
      providers: accounts.map((a: any) => a.provider),
      enrollmentCount: enrollments.length,
      examAttempts: attempts.length,
      avgScore: attempts.length > 0 ? attempts.reduce((s: number, a: any) => s + (a.percent ?? 0), 0) / attempts.length : 0,
      aiUsageDays: aiUsage.length,
      aiConversations: aiConvos.length,
    };
  },
});

// ── Data Editor ─────────────────────────────────────────────────────────────

export const getTableData = query({
  args: { table: v.string() },
  handler: async (ctx, args) => {
    if (!(await requireActiveSession(ctx))) return [];
    try {
      const data = await ctx.db.query(args.table as any).collect();
      return data;
    } catch {
      return [];
    }
  },
});

export const updateDocument = mutation({
  args: {
    table: v.string(),
    documentId: v.string(),
    field: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await requireActiveSession(ctx))) throw new Error("دسترسی منقضی شده.");
    try {
      await ctx.db.patch(args.documentId as any, { [args.field]: args.value } as any);
      return { success: true };
    } catch (e: any) {
      throw new Error("خطا در ویرایش: " + e.message);
    }
  },
});

export const deleteDocument = mutation({
  args: {
    table: v.string(),
    documentId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await requireActiveSession(ctx))) throw new Error("دسترسی منقضی شده.");
    try {
      await ctx.db.delete(args.documentId as any);
      return { success: true };
    } catch (e: any) {
      throw new Error("خطا در حذف: " + e.message);
    }
  },
});

// ── Audit Log ───────────────────────────────────────────────────────────────

export const getAuditLog = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireActiveSession(ctx))) return [];
    try {
      return await (ctx.db.query("auditLog" as any) as any).order("desc").take(100);
    } catch {
      return [];
    }
  },
});

export const addAuditLog = mutation({
  args: {
    action: v.string(),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const user = await ctx.db.get(userId);
    try {
      await (ctx.db.insert as any)("auditLog", {
        userId,
        userName: (user as any)?.name ?? (user as any)?.email ?? "ناشناس",
        action: args.action,
        details: args.details,
        timestamp: Date.now(),
      });
    } catch {
      // Table might not exist yet — ignore
    }
  },
});

// ── Email Broadcast ─────────────────────────────────────────────────────────

export const sendBroadcast = mutation({
  args: {
    subject: v.string(),
    body: v.string(),
    targetRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await requireActiveSession(ctx))) throw new Error("دسترسی منقضی شده.");
    const userId = await getAuthUserId(ctx);
    // Create announcements for target users
    let users = await ctx.db.query("users").collect();
    if (args.targetRole) {
      users = users.filter((u) => (u as any).role === args.targetRole);
    }
    let count = 0;
    for (const u of users) {
      try {
        await ctx.db.insert("announcements", {
          title: args.subject,
          body: args.body,
          createdBy: userId!,
          targetUserId: u._id,
          createdAt: Date.now(),
          read: false,
        } as any);
        count++;
      } catch {
        // Skip if schema mismatch
      }
    }
    return { success: true, sent: count };
  },
});

// ── System Health ───────────────────────────────────────────────────────────

export const getSystemHealth = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireActiveSession(ctx))) return null;
    const now = Date.now();
    // Count active sessions (last 24h)
    const allUsers = await ctx.db.query("users").collect();
    const recentUsers = allUsers.filter((u: any) => {
      const created = u._creationTime;
      return now - created < 24 * 60 * 60 * 1000;
    });
    // Count orders today
    const allOrders = await ctx.db.query("orders").collect();
    const todayOrders = allOrders.filter((o: any) => {
      const created = o._creationTime;
      return now - created < 24 * 60 * 60 * 1000;
    });
    // AI config status
    const aiConfig = await ctx.db.query("aiConfig").first();
    return {
      totalUsers: allUsers.length,
      newUsersToday: recentUsers.length,
      totalOrders: allOrders.length,
      ordersToday: todayOrders.length,
      aiConfigured: !!aiConfig,
      aiProvider: aiConfig?.provider ?? null,
      serverTime: new Date().toISOString(),
    };
  },
});

// ── User Sessions ───────────────────────────────────────────────────────────

export const getUserSessions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (!(await requireActiveSession(ctx))) return [];
    try {
      const sessions = await ctx.db
        .query("authSessions")
        .filter((q: any) => q.eq(q.field("userId"), args.userId))
        .collect();
      return sessions;
    } catch {
      return [];
    }
  },
});

export const revokeAllSessions = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (!(await requireActiveSession(ctx))) throw new Error("دسترسی منقضی شده.");
    try {
      const sessions = await ctx.db
        .query("authSessions")
        .filter((q: any) => q.eq(q.field("userId"), args.userId))
        .collect();
      for (const s of sessions) {
        await ctx.db.delete(s._id);
      }
      return { success: true, revoked: sessions.length };
    } catch {
      return { success: true, revoked: 0 };
    }
  },
});
