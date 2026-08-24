import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ── Queries ──────────────────────────────────────────────────────────────────

export const listChats = query({
  args: {},
  handler: async (ctx) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject;
    if (!userId) return [];
    const user = await ctx.db.get(userId as any);
    if (!user || !("role" in user)) return [];
    const role = (user as any).role;
    if (role !== "admin" && role !== "site_admin") return [];
    const chats = await ctx.db
      .query("aiChats")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .order("desc")
      .collect();
    return chats;
  },
});

export const getMessages = query({
  args: { chatId: v.id("aiChats") },
  handler: async (ctx, args) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject;
    if (!userId) return [];
    const chat = await ctx.db.get(args.chatId);
    if (!chat || (chat as any).userId !== userId) return [];
    const messages = await ctx.db
      .query("aiMessages")
      .withIndex("by_chat_created", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
    return messages;
  },
});

// ── API Key Settings ─────────────────────────────────────────────────────────

export const getApiKey = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("aiSettings")
      .withIndex("by_key", (q) => q.eq("key", "apiKey"))
      .first();
    return row?.value ?? "";
  },
});

export const saveApiKey = mutation({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject;
    if (!userId) throw new Error("ورود لازم است.");
    const existing = await ctx.db
      .query("aiSettings")
      .withIndex("by_key", (q) => q.eq("key", "apiKey"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.apiKey });
    } else {
      await ctx.db.insert("aiSettings", { key: "apiKey", value: args.apiKey });
    }
  },
});

// ── Chat Mutations ───────────────────────────────────────────────────────────

export const createChat = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject;
    if (!userId) throw new Error("ورود لازم است.");
    const now = Date.now();
    return await ctx.db.insert("aiChats", {
      userId: userId as any,
      title: args.title ?? "چت جدید",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteChat = mutation({
  args: { chatId: v.id("aiChats") },
  handler: async (ctx, args) => {
    const msgs = await ctx.db
      .query("aiMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();
    for (const m of msgs) await ctx.db.delete(m._id);
    await ctx.db.delete(args.chatId);
  },
});

/** Save user message, call GapGPT API, save assistant reply — all in one mutation */
export const sendMessage = mutation({
  args: {
    chatId: v.id("aiChats"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject;
    if (!userId) throw new Error("ورود لازم است.");
    const now = Date.now();

    // 1) Save user message
    await ctx.db.insert("aiMessages", {
      chatId: args.chatId,
      userId: userId as any,
      role: "user",
      content: args.content,
      createdAt: now,
    });

    // Update chat title
    const chat = await ctx.db.get(args.chatId);
    if (chat) {
      await ctx.db.patch(args.chatId, {
        updatedAt: now,
        title:
          (chat as any).title === "چت جدید"
            ? args.content.slice(0, 50)
            : (chat as any).title,
      });
    }

    // 2) Get API key
    const keyRow = await ctx.db
      .query("aiSettings")
      .withIndex("by_key", (q) => q.eq("key", "apiKey"))
      .first();
    const apiKey = keyRow?.value || process.env.GAPGPT_API_KEY || "";

    if (!apiKey) {
      const errNow = Date.now();
      await ctx.db.insert("aiMessages", {
        chatId: args.chatId,
        userId: userId as any,
        role: "assistant",
        content: "⚠️ کلید API تنظیم نشده است. از بخش تنظیمات کلید خود را وارد کنید.",
        createdAt: errNow,
      });
      await ctx.db.patch(args.chatId, { updatedAt: errNow });
      return;
    }

    // 3) Get history
    const allMsgs = await ctx.db
      .query("aiMessages")
      .withIndex("by_chat_created", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();

    const history = allMsgs.map((m) => ({
      role: (m as any).role as "user" | "assistant" | "system",
      content: (m as any).content as string,
    }));

    // 4) Call API
    try {
      const response = await fetch("https://api.gapgpt.app/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gapgpt-qwen-3.5",
          messages: [
            { role: "system", content: "تو دستیار هوش مصنوعی Genova هستی — پلتفرم تخصصی آموزش علوم زیستی. به فارسی پاسخ بده." },
            ...history,
          ],
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`خطای API (${response.status}): ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content ?? "پاسخی دریافت نشد.";
      const respNow = Date.now();
      await ctx.db.insert("aiMessages", {
        chatId: args.chatId,
        userId: userId as any,
        role: "assistant",
        content: reply,
        createdAt: respNow,
      });
      await ctx.db.patch(args.chatId, { updatedAt: respNow });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "خطا در ارتباط با هوش مصنوعی";
      const errNow = Date.now();
      await ctx.db.insert("aiMessages", {
        chatId: args.chatId,
        userId: userId as any,
        role: "assistant",
        content: `⚠️ ${errMsg}`,
        createdAt: errNow,
      });
      await ctx.db.patch(args.chatId, { updatedAt: errNow });
    }
  },
});
