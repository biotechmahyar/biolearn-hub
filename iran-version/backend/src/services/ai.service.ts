// ─── AI Service ─────────────────────────────────────────────────────────────
// Business logic layer for the AI system. Handles config, models, prompts,
// conversations, messages, quota enforcement, and usage tracking.

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  aiConfig,
  aiModels,
  aiPrompts,
  aiConversations,
  aiMessages,
  aiUsage,
  aiTokenQuotas,
} from "../db/schema.js";
import { getAIProvider, isAIConfigured } from "./ai/index.js";
import type { AIMessage, AICompletionRequest } from "./ai/ai-provider.interface.js";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../lib/errors.js";

// ─── Config ─────────────────────────────────────────────────────────────────

export interface AIConfigData {
  enabled: boolean;
  model: string | null;
  apiKey: string | null;
  systemPrompt: string | null;
  updatedAt: number;
}

export async function getConfig(): Promise<AIConfigData> {
  const db = getDb();
  const [config] = await db.select().from(aiConfig).limit(1);
  if (!config) {
    return {
      enabled: false,
      model: null,
      apiKey: null,
      systemPrompt: null,
      updatedAt: 0,
    };
  }
  return {
    enabled: config.enabled ?? false,
    model: config.model,
    apiKey: config.apiKey,
    systemPrompt: config.systemPrompt,
    updatedAt: config.updatedAt,
  };
}

export async function updateConfig(data: {
  enabled?: boolean;
  model?: string;
  apiKey?: string;
  systemPrompt?: string;
}): Promise<AIConfigData> {
  const db = getDb();
  const now = Date.now();
  const [existing] = await db.select({ id: aiConfig.id }).from(aiConfig).limit(1);

  if (existing) {
    await db
      .update(aiConfig)
      .set({ ...data, updatedAt: now })
      .where(eq(aiConfig.id, existing.id));
  } else {
    await db.insert(aiConfig).values({
      enabled: data.enabled ?? false,
      model: data.model ?? null,
      apiKey: data.apiKey ?? null,
      systemPrompt: data.systemPrompt ?? null,
      updatedAt: now,
    });
  }

  return getConfig();
}

// ─── Models ─────────────────────────────────────────────────────────────────

export interface AIModelData {
  id: string;
  name: string;
  provider: string | null;
  enabled: boolean;
  config: Record<string, unknown> | null;
  createdAt: number;
}

export async function listModels(): Promise<AIModelData[]> {
  const db = getDb();
  const rows = await db.select().from(aiModels).orderBy(desc(aiModels.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    provider: r.provider,
    enabled: r.enabled ?? true,
    config: r.config as Record<string, unknown> | null,
    createdAt: r.createdAt,
  }));
}

export async function createModel(data: {
  name: string;
  provider?: string;
  config?: Record<string, unknown>;
}): Promise<AIModelData> {
  const db = getDb();
  const now = Date.now();
  const [row] = await db
    .insert(aiModels)
    .values({
      name: data.name,
      provider: data.provider ?? null,
      enabled: true,
      config: data.config ?? null,
      createdAt: now,
    })
    .returning();

  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    enabled: row.enabled ?? true,
    config: row.config as Record<string, unknown> | null,
    createdAt: row.createdAt,
  };
}

export async function updateModel(
  id: string,
  data: { name?: string; provider?: string; enabled?: boolean; config?: Record<string, unknown> }
): Promise<AIModelData> {
  const db = getDb();
  const [existing] = await db.select().from(aiModels).where(eq(aiModels.id, id)).limit(1);
  if (!existing) throw new NotFoundError("AI Model");

  await db
    .update(aiModels)
    .set(data)
    .where(eq(aiModels.id, id));

  return listModels().then((models) => models.find((m) => m.id === id)!);
}

export async function deleteModel(id: string): Promise<void> {
  const db = getDb();
  await db.delete(aiModels).where(eq(aiModels.id, id));
}

// ─── Prompts ────────────────────────────────────────────────────────────────

export interface AIPromptData {
  id: string;
  key: string;
  template: string | null;
  updatedAt: number;
}

export async function listPrompts(): Promise<AIPromptData[]> {
  const db = getDb();
  const rows = await db.select().from(aiPrompts);
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    template: r.template,
    updatedAt: r.updatedAt,
  }));
}

export async function getPrompt(key: string): Promise<AIPromptData | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(aiPrompts)
    .where(eq(aiPrompts.key, key))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    key: row.key,
    template: row.template,
    updatedAt: row.updatedAt,
  };
}

export async function upsertPrompt(
  key: string,
  template: string
): Promise<AIPromptData> {
  const db = getDb();
  const now = Date.now();
  const [existing] = await db
    .select({ id: aiPrompts.id })
    .from(aiPrompts)
    .where(eq(aiPrompts.key, key))
    .limit(1);

  if (existing) {
    await db
      .update(aiPrompts)
      .set({ template, updatedAt: now })
      .where(eq(aiPrompts.id, existing.id));
  } else {
    await db.insert(aiPrompts).values({ key, template, updatedAt: now });
  }

  return getPrompt(key) as Promise<AIPromptData>;
}

// ─── Quota ──────────────────────────────────────────────────────────────────

export interface QuotaStatus {
  dailyLimit: number;
  used: number;
  remaining: number;
  resetAt: number;
}

export async function getQuota(userId: string): Promise<QuotaStatus> {
  const db = getDb();
  const now = Date.now();
  const [quota] = await db
    .select()
    .from(aiTokenQuotas)
    .where(eq(aiTokenQuotas.userId, userId))
    .limit(1);

  if (!quota) {
    const defaultLimit = parseInt(process.env.AI_DAILY_TOKEN_LIMIT || "10000");
    // Create default quota
    await db.insert(aiTokenQuotas).values({
      userId,
      dailyLimit: defaultLimit,
      used: 0,
      resetAt: now + 24 * 60 * 60 * 1000,
    });
    return { dailyLimit: defaultLimit, used: 0, remaining: defaultLimit, resetAt: now + 24 * 60 * 60 * 1000 };
  }

  // Check if quota needs reset
  if (quota.resetAt && quota.resetAt < now) {
    const defaultLimit = parseInt(process.env.AI_DAILY_TOKEN_LIMIT || "10000");
    await db
      .update(aiTokenQuotas)
      .set({ used: 0, resetAt: now + 24 * 60 * 60 * 1000 })
      .where(eq(aiTokenQuotas.id, quota.id));
    return { dailyLimit: quota.dailyLimit || defaultLimit, used: 0, remaining: quota.dailyLimit || defaultLimit, resetAt: now + 24 * 60 * 60 * 1000 };
  }

  const limit = quota.dailyLimit || 10000;
  const used = quota.used || 0;
  return {
    dailyLimit: limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt: quota.resetAt || 0,
  };
}

async function consumeTokens(userId: string, tokens: number): Promise<void> {
  const db = getDb();
  const quota = await getQuota(userId);
  if (quota.remaining < tokens) {
    throw new BadRequestError(
      `Daily token quota exceeded (${quota.used}/${quota.dailyLimit}). Resets at ${new Date(quota.resetAt).toISOString()}`
    );
  }
  await db
    .update(aiTokenQuotas)
    .set({ used: quota.used + tokens })
    .where(eq(aiTokenQuotas.userId, userId));
}

// ─── Usage Tracking ─────────────────────────────────────────────────────────

export async function trackUsage(
  userId: string,
  tokens: number
): Promise<void> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const [existing] = await db
    .select()
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.date, today)))
    .limit(1);

  if (existing) {
    await db
      .update(aiUsage)
      .set({
        tokens: (existing.tokens || 0) + tokens,
        requests: (existing.requests || 0) + 1,
      })
      .where(eq(aiUsage.id, existing.id));
  } else {
    await db.insert(aiUsage).values({
      userId,
      date: today,
      tokens,
      requests: 1,
    });
  }
}

// ─── Conversations ──────────────────────────────────────────────────────────

export interface ConversationData {
  id: string;
  userId: string;
  title: string | null;
  createdAt: number;
  messageCount?: number;
}

export async function listConversations(
  userId: string
): Promise<ConversationData[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.userId, userId))
    .orderBy(desc(aiConversations.createdAt))
    .limit(50);

  // Get message counts
  const results: ConversationData[] = [];
  for (const row of rows) {
    const msgs = await db
      .select({ id: aiMessages.id })
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, row.id));
    results.push({
      id: row.id,
      userId: row.userId,
      title: row.title,
      createdAt: row.createdAt,
      messageCount: msgs.length,
    });
  }
  return results;
}

export async function createConversation(
  userId: string,
  title?: string
): Promise<ConversationData> {
  const db = getDb();
  const now = Date.now();
  const [row] = await db
    .insert(aiConversations)
    .values({ userId, title: title ?? null, createdAt: now })
    .returning();

  return { id: row.id, userId: row.userId, title: row.title, createdAt: row.createdAt };
}

export async function deleteConversation(
  userId: string,
  conversationId: string
): Promise<void> {
  const db = getDb();
  const [conv] = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, userId)
      )
    )
    .limit(1);
  if (!conv) throw new NotFoundError("Conversation");
  // Messages cascade-delete via FK
  await db.delete(aiConversations).where(eq(aiConversations.id, conversationId));
}

// ─── Messages ───────────────────────────────────────────────────────────────

export interface MessageData {
  id: string;
  conversationId: string;
  role: string;
  content: string | null;
  tokens: number | null;
  createdAt: number;
}

export async function listMessages(
  conversationId: string,
  userId: string
): Promise<MessageData[]> {
  const db = getDb();
  // Verify ownership
  const [conv] = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, userId)
      )
    )
    .limit(1);
  if (!conv) throw new NotFoundError("Conversation");

  const rows = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(aiMessages.createdAt)
    .limit(200);

  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversationId,
    role: r.role,
    content: r.content,
    tokens: r.tokens,
    createdAt: r.createdAt,
  }));
}

// ─── Chat (Main Entry Point) ────────────────────────────────────────────────

export interface ChatRequest {
  userId: string;
  conversationId?: string;
  message: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  tokens: { prompt: number; completion: number; total: number };
  model: string;
  usage: QuotaStatus;
}

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const db = getDb();
  const now = Date.now();

  // Check AI is enabled
  const config = await getConfig();
  if (!config.enabled) {
    throw new BadRequestError("AI service is not enabled");
  }

  // Check provider availability
  const provider = await getAIProvider();
  const available = await provider.isAvailable();
  if (!available) {
    throw new BadRequestError("AI provider is not available");
  }

  // Get or create conversation
  let conversationId = request.conversationId;
  if (conversationId) {
    // Verify ownership
    const [conv] = await db
      .select()
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, request.userId)
        )
      )
      .limit(1);
    if (!conv) throw new NotFoundError("Conversation");
  } else {
    const conv = await createConversation(
      request.userId,
      request.message.slice(0, 100)
    );
    conversationId = conv.id;
  }

  // Check quota
  const quota = await getQuota(request.userId);

  // Build messages
  const messages: AIMessage[] = [];

  // System prompt (from request, config, or default)
  const sysPrompt =
    request.systemPrompt || config.systemPrompt || "You are a helpful biology assistant. Respond in the same language as the user.";
  messages.push({ role: "system", content: sysPrompt });

  // Load previous messages
  const prevMessages = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId!))
    .orderBy(aiMessages.createdAt)
    .limit(50);

  for (const msg of prevMessages) {
    messages.push({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content || "",
    });
  }

  // Add current user message
  messages.push({ role: "user", content: request.message });

  // Save user message
  const [userMsg] = await db
    .insert(aiMessages)
    .values({
      conversationId: conversationId!,
      role: "user",
      content: request.message,
      tokens: provider.estimateTokens
        ? provider.estimateTokens(request.message)
        : 0,
      createdAt: now,
    })
    .returning();

  // Call AI provider
  const modelName = request.model || config.model || "default";
  const completionRequest: AICompletionRequest = {
    model: modelName,
    messages,
    temperature: request.temperature,
    maxTokens: request.maxTokens,
  };

  const response = await provider.complete(completionRequest);

  // Check quota with actual tokens
  const totalTokens = response.tokens.total;
  if (totalTokens > 0) {
    await consumeTokens(request.userId, totalTokens);
  }

  // Save assistant message
  const [assistantMsg] = await db
    .insert(aiMessages)
    .values({
      conversationId: conversationId!,
      role: "assistant",
      content: response.content,
      tokens: totalTokens,
      createdAt: now + 1,
    })
    .returning();

  // Track usage
  if (totalTokens > 0) {
    await trackUsage(request.userId, totalTokens);
  }

  // Get updated quota
  const updatedQuota = await getQuota(request.userId);

  return {
    conversationId: conversationId!,
    messageId: assistantMsg.id,
    content: response.content,
    tokens: response.tokens,
    model: response.model,
    usage: updatedQuota,
  };
}
