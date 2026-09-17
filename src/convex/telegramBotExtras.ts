/**
 * telegramBotExtras — backend for BOT-ONLY features (not mini app):
 *  1. Multi-step input state for /ask, /ai, /request-session flows
 *  2. Role assignment from the Telegram management panel (by telegram ID)
 *  3. AI chat over the bot respecting each account's real daily limit
 *  4. Student questions submitted via the bot (with admin notification)
 *  5. Session requests submitted via the bot
 */
import { query, internalQuery, internalMutation, action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── 1) Pending input state (user is expected to send a text message) ─────────

export const setPendingInput = internalMutation({
  args: {
    telegramId: v.number(),
    kind: v.string(), // "ask" | "ai" | "session"
    payload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("botPendingInputs")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", args.telegramId))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { kind: args.kind, payload: args.payload, createdAt: now });
      return existing._id;
    }
    return await ctx.db.insert("botPendingInputs", {
      telegramId: args.telegramId,
      kind: args.kind,
      payload: args.payload,
      createdAt: now,
    });
  },
});

export const clearPendingInput = internalMutation({
  args: { telegramId: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("botPendingInputs")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", args.telegramId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const getPendingInput = internalQuery({
  args: { telegramId: v.number() },
  handler: async (ctx, args): Promise<{ kind: string; payload: any } | null> => {
    const row = await ctx.db
      .query("botPendingInputs")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", args.telegramId))
      .first();
    if (!row) return null;
    // Expire after 15 minutes (delete happens lazily in setPendingInput's upsert
    // and the row is simply ignored here once stale)
    if (Date.now() - row.createdAt > 15 * 60 * 1000) {
      return null;
    }
    return { kind: row.kind as string, payload: row.payload };
  },
});

// ── 2) AI over the bot — respects the same limits as the account ─────────────

/** The Genova user linked to a Telegram account (internal, for bot actions). */
export const _findBotUser = internalQuery({
  args: { telegramId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", args.telegramId))
      .first();
  },
});

/** Daily limit data for a Genova user (mirrors aiChat.getMyUsage logic). */
export const getBotUserAiUsage = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const FREE_LIMITS: Record<string, number> = {
      user: 3, member: 3, instructor: 10, mentor: 10,
      content_manager: 10, support: 10, admin: 100, site_admin: 100,
    };
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const today = new Date().toISOString().split("T")[0];
    const usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", today))
      .first();
    const quota = await ctx.db
      .query("aiTokenQuotas")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    const roleLimit = FREE_LIMITS[(user as any).role ?? "user"] ?? 3;
    const now = Date.now();
    const subs = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const activeSub = subs.find((s: any) => s.active && s.expiresAt > now);
    const tierLimits: Record<string, number> = { bronze: 25, silver: 50, gold: 150 };
    const subLimit = activeSub ? (tierLimits[(activeSub as any).tier] ?? 0) : 0;
    const dailyLimit = Math.max(quota?.dailyLimit ?? 0, subLimit, roleLimit);
    const sent = usage?.messagesSent ?? 0;
    return {
      sent,
      dailyLimit,
      remaining: Math.max(0, dailyLimit - sent),
      role: (user as any).role ?? "user",
    };
  },
});

/** Increment usage after a successful bot AI reply. */
export const incrementAiUsage = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];
    const usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", today))
      .first();
    if (usage) {
      await ctx.db.patch(usage._id, { messagesSent: usage.messagesSent + 1 });
    } else {
      await ctx.db.insert("aiUsage", { userId: args.userId, date: today, messagesSent: 1, tokensUsed: 0 });
    }
  },
});

/** Raw AI config for the bot action. */
export const getBotAiConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Prefer an active model row, then the legacy singleton config
    const models = await ctx.db.query("aiModels").collect();
    const model = models.find((m: any) => m.active);
    if (model) {
      return {
        apiKey: model.apiKey,
        baseUrl: model.baseUrl,
        model: model.model,
        provider: model.provider,
        temperature: model.temperature,
        maxTokensPerRequest: model.maxTokens ?? 2048,
        systemPrompt: model.systemPrompt ?? "شما یک دستیار تخصصی علوم زیستی هستید. پاسخ‌ها را کوتاه و کاربردی بدهید.",
      };
    }
    const config = await ctx.db.query("aiConfig").first();
    if (!config) return null;
    return {
      apiKey: config.apiKeyEncrypted,
      baseUrl: config.baseUrl,
      model: config.model,
      provider: config.provider,
      temperature: config.temperature,
      maxTokensPerRequest: config.maxTokensPerRequest,
      systemPrompt: config.systemPrompt,
    };
  },
});

/**
 * One-shot AI question over Telegram: validates limit, calls the provider,
 * returns the answer text (the webhook sends it to the user).
 */
type BotAiAskResult =
  | { ok: true; answer: string; remaining: number; limit: number }
  | { ok: false; error: string };

export const botAiAsk = action({
  args: { telegramId: v.number(), prompt: v.string() },
  handler: async (ctx, args): Promise<BotAiAskResult> => {
    const user: { _id: any } | null = await ctx.runQuery(
      internal.telegramBotExtras._findBotUser,
      { telegramId: args.telegramId },
    );
    if (!user) {
      return { ok: false as const, error: "حساب شما متصل نیست." };
    }

    // 1) Limit check — exactly the same accounting as the website
    const usage = await ctx.runQuery(internal.telegramBotExtras.getBotUserAiUsage, {
      userId: user._id,
    });
    if (!usage || usage.remaining <= 0) {
      return {
        ok: false as const,
        error: usage
          ? `محدودیت روزانه هوش مصنوعی شما تمام شده است (${usage.dailyLimit}/${usage.dailyLimit}). فردا دوباره شارژ می‌شود.`
          : "کاربر یافت نشد.",
      };
    }

    // 2) AI config
    const config = await ctx.runQuery(internal.telegramBotExtras.getBotAiConfig, {});
    if (!config || !config.apiKey) {
      return { ok: false as const, error: "هوش مصنوعی هنوز پیکربندی نشده است." };
    }

    // 3) Call provider (openai-compatible / anthropic / google)
    // Some configured baseUrls already include "/v1" (e.g. https://api.example.com/v1).
    // Normalize so we never produce "/v1/v1/chat/completions".
    const rawBase = (config.baseUrl || "").trim().replace(/\/+$/, "");
    const base = rawBase.replace(/\/v1$/, "");
    const system = config.systemPrompt || "شما یک دستیار تخصصی علوم زیستی هستید.";
    let answer = "";
    try {
      if (config.provider === "anthropic") {
        const resp = await fetch(`${base}/v1/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: Math.min(config.maxTokensPerRequest, 2048),
            temperature: config.temperature ?? 0.7,
            system,
            messages: [{ role: "user", content: args.prompt }],
          }),
        });
        const data: any = await resp.json();
        if (data.error) throw new Error(data.error.message ?? "AI error");
        answer = data.content?.[0]?.text ?? "";
      } else if (config.provider === "google") {
        const resp = await fetch(
          `${base}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${system}\n\n${args.prompt}` }] }],
              generationConfig: { temperature: config.temperature ?? 0.7, maxOutputTokens: 2048 },
            }),
          },
        );
        const data: any = await resp.json();
        if (data.error) throw new Error(data.error.message ?? "AI error");
        answer = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      } else {
        // openai-compatible
        const resp = await fetch(`${base}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: Math.min(config.maxTokensPerRequest, 2048),
            temperature: config.temperature ?? 0.7,
            messages: [
              { role: "system", content: system },
              { role: "user", content: args.prompt },
            ],
          }),
        });
        const data: any = await resp.json();
        if (data.error) throw new Error(data.error.message ?? "AI error");
        answer = data.choices?.[0]?.message?.content ?? "";
      }
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? `خطای هوش مصنوعی: ${err.message}` : "خطای هوش مصنوعی.",
      };
    }

    // 4) Count usage so bot + site share the same budget
    await ctx.runMutation(internal.telegramBotExtras.incrementAiUsage, { userId: user._id });

    const after = await ctx.runQuery(internal.telegramBotExtras.getBotUserAiUsage, {
      userId: user._id,
    });

    return { ok: true as const, answer: answer.trim() || "پاسخی دریافت نشد.", remaining: after?.remaining ?? 0, limit: after?.dailyLimit ?? 0 };
  },
});

// ── 3) Bot question submission + admin notification ──────────────────────────

/** Insert a mentor question from a bot user and return admins with Telegram. */
export const createBotQuestion = internalMutation({
  args: { userId: v.id("users"), text: v.string(), topic: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const questionId = await ctx.db.insert("mentorQuestions", {
      studentId: args.userId,
      studentName: user?.name ?? "دانشجو",
      topic: args.topic.trim() || "عمومی",
      text: args.text.trim(),
      status: "open",
      createdAt: Date.now(),
    });
    // Collect admins that have Telegram linked (for the webhook to notify)
    const users = await ctx.db.query("users").collect();
    const admins = users
      .filter((u: any) => (u.role === "admin" || u.role === "site_admin") && u.telegramId)
      .map((u: any) => ({ telegramId: u.telegramId as number, name: u.name ?? "ادمین" }));
    return { questionId, admins };
  },
});

// ── 4) Session request from the bot ─────────────────────────────────────────

/**
 * Create a session REQUEST from a student. Mentors/admins get a Telegram
 * notification with the requested time. Stored as a mentorSession with
 * status "scheduled" + request marker in notes so it shows in existing views.
 */
export const createBotSessionRequest = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    date: v.string(),
    time: v.string(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    // Assign to the first mentor/admin as the responsible mentor
    const users = await ctx.db.query("users").collect();
    const mentor =
      users.find((u: any) => u.role === "mentor") ??
      users.find((u: any) => u.role === "admin" || u.role === "site_admin");
    if (!mentor) {
      return { ok: false as const, reason: "no_mentor" as const };
    }
    const sessionId = await ctx.db.insert("mentorSessions", {
      mentorId: mentor._id,
      mentorName: mentor.name ?? "منتور",
      studentId: args.userId,
      title: `[درخواست] ${args.title.trim()}`,
      date: args.date.trim(),
      time: args.time.trim(),
      notes: args.notes.trim(),
      status: "scheduled",
      createdAt: Date.now(),
    });
    // Notify the mentor via Telegram
    if (mentor.telegramId) {
      await ctx.scheduler.runAfter(0, api.telegramNotifications.sendNotification, {
        userId: mentor._id,
        type: "meeting",
        key: `session-request:${sessionId}`,
        title: "📅 درخواست جلسه جدید (از تلگرام)",
        message: `${user?.name ?? "دانشجو"} درخواست جلسه داد:\n\n📌 ${args.title.trim()}\n🕐 ${args.date.trim()} — ${args.time.trim()}\n\nبرای تأیید نهایی، زمان را با دانشجو هماهنگ کنید.`,
        linkLabel: "مشاهده در سایت",
        linkUrl: "https://nibrc.ir/dashboard",
      });
    }
    return { ok: true as const, sessionId, mentorName: mentor.name ?? "منتور" };
  },
});

// ── 5) Role assignment panel helpers (called from TelegramAdminCenter) ───────

/** Users with telegram linkage + role, for the management panel (مدیر سامانه only). */
export const listTelegramUsersForRoles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const me = await ctx.db.get(userId);
    if (!me || me.role !== "admin") return [];
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u: any) => u.telegramId)
      .map((u: any) => ({
        _id: u._id,
        name: u.name ?? null,
        email: u.email ?? null,
        role: u.role ?? "user",
        telegramId: u.telegramId as number,
        telegramUsername: u.telegramUsername ?? null,
      }))
      .sort((a: any, b: any) => (a.name ?? "").localeCompare(b.name ?? ""));
  },
});

/** Assign a role to a user identified by their Telegram ID (مدیر سامانه only). */
export const assignRoleByTelegramId = mutation({
  args: { telegramId: v.number(), role: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("وارد شوید.");
    const me = await ctx.db.get(userId);
    if (!me || me.role !== "admin") {
      throw new Error("فقط مدیر سامانه می‌تواند نقش تعیین کند.");
    }
    // site_admin (مدیر سایت) can only be granted from the super admin panel —
    // it is never offered in the Telegram role switcher.
    const VALID = ["user", "instructor", "mentor", "content_manager", "support", "admin"];
    if (!VALID.includes(args.role)) throw new Error("نقش نامعتبر است.");
    const target = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", args.telegramId))
      .first();
    if (!target) throw new Error("کاربری با این آیدی تلگرام یافت نشد.");
    if (target._id === userId) {
      throw new Error("نمی‌توانید نقش خودتان را تغییر دهید.");
    }
    await ctx.db.patch(target._id, { role: args.role as any });
    return { ok: true, userId: target._id, role: args.role };
  },
});

// ── 6) Bot-only internal lists & question answering (no auth session) ────────

/** Open questions for the /answer admin flow (bot has no auth session). */
export const listOpenBotQuestions = internalQuery({
  args: {},
  handler: async (ctx) => {
    const qs = await ctx.db.query("mentorQuestions").order("desc").take(100);
    return qs.filter((q: any) => q.status === "open").slice(0, 10);
  },
});

/** Role of the telegram-linked user — for /answer permission check. */
export const getBotUserRole = internalQuery({
  args: { telegramId: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", args.telegramId))
      .first();
    return user?.role ?? null;
  },
});

/** A single question (for the /answer flow). */
export const getBotQuestion = internalQuery({
  args: { questionId: v.id("mentorQuestions") },
  handler: async (ctx, args) => await ctx.db.get(args.questionId),
});

/** Patch the answer onto a question; return student info for notification. */
export const answerBotQuestion = internalMutation({
  args: {
    questionId: v.id("mentorQuestions"),
    answer: v.string(),
    answeredByName: v.string(),
  },
  handler: async (ctx, args) => {
    const q = await ctx.db.get(args.questionId);
    if (!q) return { ok: false as const };
    await ctx.db.patch(q._id, {
      answer: args.answer.trim(),
      answeredByName: args.answeredByName,
      status: "answered",
      answeredAt: Date.now(),
    });
    const student = await ctx.db.get(q.studentId);
    return {
      ok: true as const,
      studentTelegramId: student?.telegramId ?? null,
      studentName: student?.name ?? "دانشجو",
    };
  },
});

/** A student's own questions (bot only — no auth session). */
export const listMyBotQuestions = internalQuery({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mentorQuestions")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .order("desc")
      .take(10);
  },
});

/** A student's upcoming sessions (bot only — no auth session). */
export const listMyBotSessions = internalQuery({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("mentorSessions")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .order("desc")
      .take(50);
    return rows.filter((s: any) => s.status === "scheduled").slice(0, 5);
  },
});
