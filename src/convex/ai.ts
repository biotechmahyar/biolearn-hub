import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";

// ── Helper: check if user is admin or site_admin ─────────────────────────────

async function requireStaff(ctx: { auth: any; db: any }) {
  const userId = (await ctx.auth.getUserIdentity())?.subject;
  if (!userId) throw new Error("ورود لازم است.");
  const user = await ctx.db.get(userId as any);
  // The users table is part of authTables union; narrow it
  if (
    !user ||
    !("role" in user) ||
    (user as any).role !== "admin" && (user as any).role !== "site_admin"
  ) {
    throw new Error("فقط مدیر سایت و ادمین سامانه به هوش مصنوعی دسترسی دارند.");
  }
  return userId;
}

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

// ── Mutations ────────────────────────────────────────────────────────────────

export const createChat = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const userId = (await ctx.auth.getUserIdentity())!.subject;
    const now = Date.now();
    const chatId = await ctx.db.insert("aiChats", {
      userId: userId as any,
      title: args.title ?? "چت جدید",
      createdAt: now,
      updatedAt: now,
    });
    return chatId;
  },
});

export const deleteChat = mutation({
  args: { chatId: v.id("aiChats") },
  handler: async (ctx, args) => {
    const userId = await requireStaff(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat || (chat as any).userId !== userId) throw new Error("دسترسی ندارید.");
    // Delete all messages in the chat
    const messages = await ctx.db
      .query("aiMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    await ctx.db.delete(args.chatId);
  },
});

export const sendMessage = mutation({
  args: {
    chatId: v.id("aiChats"),
    content: v.string(),
    attachmentName: v.optional(v.string()),
    attachmentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireStaff(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat || (chat as any).userId !== userId) throw new Error("دسترسی ندارید.");

    const now = Date.now();

    // Save user message
    await ctx.db.insert("aiMessages", {
      chatId: args.chatId,
      userId: userId as any,
      role: "user",
      content: args.content,
      attachmentName: args.attachmentName,
      attachmentType: args.attachmentType,
      createdAt: now,
    });

    // Update chat timestamp and title if first message
    const chatTitle = (chat as any).title as string;
    await ctx.db.patch(args.chatId, {
      updatedAt: now,
      title: chatTitle === "چت جدید" ? args.content.slice(0, 50) : chatTitle,
    });

    // Build conversation history for the API call
    const allMessages = await ctx.db
      .query("aiMessages")
      .withIndex("by_chat_created", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();

    const conversationHistory = allMessages.map((m) => ({
      role: (m as any).role as "user" | "assistant" | "system",
      content: (m as any).content as string,
    }));

    // Call the AI API
    try {
      const aiResponse = await callGapGPT(conversationHistory);
      const responseNow = Date.now();
      await ctx.db.insert("aiMessages", {
        chatId: args.chatId,
        userId: userId as any,
        role: "assistant",
        content: aiResponse,
        createdAt: responseNow,
      });
      await ctx.db.patch(args.chatId, { updatedAt: responseNow });
      return aiResponse;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "خطا در ارتباط با هوش مصنوعی";
      const errorNow = Date.now();
      await ctx.db.insert("aiMessages", {
        chatId: args.chatId,
        userId: userId as any,
        role: "assistant",
        content: `⚠️ ${errorMsg}`,
        createdAt: errorNow,
      });
      await ctx.db.patch(args.chatId, { updatedAt: errorNow });
      return `⚠️ ${errorMsg}`;
    }
  },
});

// ── Helper: call GapGPT API ─────────────────────────────────────────────────

async function callGapGPT(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
): Promise<string> {
  const apiKey = process.env.GAPGPT_API_KEY;
  if (!apiKey) throw new Error("کلید API هوش مصنوعی تنظیم نشده است.");

  const systemPrompt = {
    role: "system" as const,
    content:
      "تو یک دستیار هوش مصنوعی برای پلتفرم Genova هستی — پلتفرم تخصصی آموزش علوم زیستی. به سؤالات کاربران در حوزه میکروبیولوژی، بیوتکنولوژی، و علوم زیستی پاسخ بده. به فارسی پاسخ بده مگر اینکه کاربر به زبان دیگری سؤال پرسیده باشد. پاسخ‌های دقیق، علمی و مفید بده.",
  };

  const response = await fetch("https://api.gapgpt.app/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gapgpt-qwen-3.5",
      messages: [systemPrompt, ...messages],
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`خطای API (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "پاسخی دریافت نشد.";
}

// ── Action (available for future streaming) ──────────────────────────────────

export const chatAction = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
        content: v.string(),
      }),
    ),
  },
  handler: async (_ctx, args) => {
    return await callGapGPT(args.messages);
  },
});
