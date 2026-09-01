import { Context } from "hono";
import { db, generateId, now } from "../db.js";
import { aiConversations, aiMessages, aiModels } from "../schema.js";
import { eq, desc } from "drizzle-orm";

// GET /api/ai/models - list available AI models
export async function getModels(c: Context) {
  try {
    const result = await db.select().from(aiModels).where(eq(aiModels.active, true)).orderBy(aiModels.sortOrder);
    // Never expose API keys
    const safe = result.map((m) => ({
      id: m.id,
      name: m.name,
      modelId: m.modelId,
      description: m.description,
      isFree: m.isFree,
      dailyLimit: m.dailyLimit,
      temperature: m.temperature,
      maxTokens: m.maxTokens,
    }));
    return c.json({ ok: true, data: safe });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// POST /api/ai/chat - send a message
export async function aiChat(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const { conversationId, message, modelId } = await c.req.json();

    if (!message) {
      return c.json({ ok: false, error: "پیام الزامی است" }, 400);
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      convId = generateId();
      await db.insert(aiConversations).values({
        id: convId,
        userId,
        title: message.slice(0, 50),
        modelId: modelId || null,
        createdAt: now(),
      });
    }

    // Save user message
    const userMsgId = generateId();
    await db.insert(aiMessages).values({
      id: userMsgId,
      conversationId: convId,
      role: "user",
      content: message,
      modelId: modelId || null,
      createdAt: now(),
    });

    // Check if internal AI provider is configured
    const configuredModels = await db.select().from(aiModels).where(eq(aiModels.active, true)).limit(1);

    if (configuredModels.length === 0) {
      // No AI configured — return graceful fallback
      const assistantMsgId = generateId();
      await db.insert(aiMessages).values({
        id: assistantMsgId,
        conversationId: convId,
        role: "assistant",
        content: "سرویس هوش مصنوعی در حال حاضر در دسترس نیست. لطفاً بعداً تلاش کنید.",
        modelId: null,
        createdAt: now(),
      });

      return c.json({
        ok: true,
        data: {
          conversationId: convId,
          reply: "سرویس هوش مصنوعی در حال حاضر در دسترس نیست.",
          model: null,
        },
      });
    }

    // In production, this would call the internal AI API
    // For now, return a placeholder
    const assistantMsgId = generateId();
    const reply = "[AI] پاسخ هوش مصنوعی — این بخش به API داخلی هوش مصنوعی متصل خواهد شد.";
    await db.insert(aiMessages).values({
      id: assistantMsgId,
      conversationId: convId,
      role: "assistant",
      content: reply,
      modelId: modelId || configuredModels[0].id,
      createdAt: now(),
    });

    return c.json({
      ok: true,
      data: {
        conversationId: convId,
        reply,
        model: configuredModels[0].name,
      },
    });
  } catch (error) {
    console.error("[AI] Chat error:", error);
    return c.json({ ok: false, error: "خطا در چت هوش مصنوعی" }, 500);
  }
}

// GET /api/ai/conversations
export async function getConversations(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const result = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.createdAt))
      .limit(50);
    return c.json({ ok: true, data: result });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// GET /api/ai/conversations/:id/messages
export async function getConversationMessages(c: Context) {
  const userId = c.get("userId") as string;
  const convId = c.req.param("id");
  try {
    // Verify ownership
    const conv = await db.select().from(aiConversations).where(eq(aiConversations.id, convId)).limit(1);
    if (!conv.length || conv[0].userId !== userId) {
      return c.json({ ok: false, error: "دسترسی غیرمجاز" }, 403);
    }

    const messages = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, convId))
      .orderBy(aiMessages.createdAt);
    return c.json({ ok: true, data: messages });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// DELETE /api/ai/conversations/:id
export async function deleteConversation(c: Context) {
  const userId = c.get("userId") as string;
  const convId = c.req.param("id");
  try {
    const conv = await db.select().from(aiConversations).where(eq(aiConversations.id, convId)).limit(1);
    if (!conv.length || conv[0].userId !== userId) {
      return c.json({ ok: false, error: "دسترسی غیرمجاز" }, 403);
    }
    // Delete messages first
    await db.delete(aiMessages).where(eq(aiMessages.conversationId, convId));
    await db.delete(aiConversations).where(eq(aiConversations.id, convId));
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}
