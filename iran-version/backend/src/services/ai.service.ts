// ─── AI Service — Full Feature Parity with Original Convex ────────────────────
// Reproduces: aiChat.ts (queries/mutations), aiManagement.ts (admin CRUD),
// aiActions.ts (provider calls), with role-based limits, model selection,
// conversation management, and usage tracking.

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
  users,
} from "../db/schema.js";
import { getAIProvider } from "./ai/index.js";
import type { AIMessage, AICompletionRequest } from "./ai/ai-provider.interface.js";
import {
  BadRequestError,
  NotFoundError,
} from "../lib/errors.js";

// ─── Constants (matching original Convex) ────────────────────────────────────

const FREE_LIMITS: Record<string, number> = {
  user: 3,
  member: 3,
  instructor: 10,
  mentor: 10,
  content_manager: 10,
  support: 10,
  admin: 100,
  site_admin: 100,
};

const MAX_CONVERSATIONS = 10;

function getDefaultRoleLimit(role: string): number {
  return FREE_LIMITS[role] ?? 3;
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Legacy Config (aiConfig — single-provider) ─────────────────────────────

export interface AIConfigData {
  id: string;
  provider: string;
  model: string;
  baseUrl: string;
  apiKeyMasked: string;
  hasApiKey: boolean;
  maxTokensPerRequest: number;
  temperature: number;
  systemPrompt: string;
  updatedAt: number;
  updatedBy: string | null;
}

export async function getConfig(): Promise<AIConfigData> {
  const db = getDb();
  const [config] = await db.select().from(aiConfig).limit(1);
  if (!config) {
    return {
      id: "",
      provider: "openai",
      model: "gpt-4o-mini",
      baseUrl: "https://api.openai.com/v1",
      apiKeyMasked: "••••",
      hasApiKey: false,
      maxTokensPerRequest: 2048,
      temperature: 7,
      systemPrompt: "شما یک دستیار تخصصی علوم زیستی هستید.",
      updatedAt: 0,
      updatedBy: null,
    };
  }
  const masked = (config.apiKeyEncrypted || "").length > 4
    ? "••••••" + (config.apiKeyEncrypted || "").slice(-4)
    : "••••";
  return {
    id: config.id,
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    apiKeyMasked: masked,
    hasApiKey: (config.apiKeyEncrypted || "").length > 0,
    maxTokensPerRequest: config.maxTokensPerRequest,
    temperature: config.temperature,
    systemPrompt: config.systemPrompt,
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy,
  };
}

export async function getRawConfig(modelId?: string): Promise<{
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: string;
  temperature: number;
  maxTokensPerRequest: number;
  systemPrompt: string;
} | null> {
  try {
    const db = getDb();

    // If modelId provided, use that specific model
    if (modelId) {
      const [model] = await db.select().from(aiModels).where(eq(aiModels.id, modelId)).limit(1);
      if (model && model.active) {
        return {
          apiKey: model.apiKey,
          baseUrl: model.baseUrl,
          model: model.model,
          provider: model.provider,
          temperature: model.temperature,
          maxTokensPerRequest: model.maxTokens,
          systemPrompt: model.systemPrompt || "شما یک دستیار تخصصی علوم زیستی هستید.",
        };
      }
    }

    // Fallback to legacy single config
    const [config] = await db.select().from(aiConfig).limit(1);
    if (!config || !config.apiKeyEncrypted) return null;
    return {
      apiKey: config.apiKeyEncrypted,
      baseUrl: config.baseUrl,
      model: config.model,
      provider: config.provider,
      temperature: config.temperature,
      maxTokensPerRequest: config.maxTokensPerRequest,
      systemPrompt: config.systemPrompt,
    };
  } catch {
    // DB unavailable — graceful degradation
    return null;
  }
}

export async function saveConfig(data: {
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  maxTokensPerRequest: number;
  temperature: number;
  systemPrompt: string;
  updatedBy: string;
}): Promise<AIConfigData> {
  const db = getDb();
  const now = Date.now();
  const [existing] = await db.select({ id: aiConfig.id }).from(aiConfig).limit(1);

  if (existing) {
    await db.update(aiConfig).set({
      provider: data.provider,
      model: data.model,
      baseUrl: data.baseUrl,
      apiKeyEncrypted: data.apiKey,
      maxTokensPerRequest: data.maxTokensPerRequest,
      temperature: data.temperature,
      systemPrompt: data.systemPrompt,
      updatedAt: now,
      updatedBy: data.updatedBy,
    }).where(eq(aiConfig.id, existing.id));
  } else {
    await db.insert(aiConfig).values({
      provider: data.provider,
      model: data.model,
      baseUrl: data.baseUrl,
      apiKeyEncrypted: data.apiKey,
      maxTokensPerRequest: data.maxTokensPerRequest,
      temperature: data.temperature,
      systemPrompt: data.systemPrompt,
      updatedAt: now,
      updatedBy: data.updatedBy,
    });
  }
  return getConfig();
}

export async function deleteConfig(): Promise<void> {
  const db = getDb();
  const [existing] = await db.select({ id: aiConfig.id }).from(aiConfig).limit(1);
  if (existing) {
    await db.delete(aiConfig).where(eq(aiConfig.id, existing.id));
  }
}

// ─── Models CRUD ─────────────────────────────────────────────────────────────

export interface AIModelData {
  id: string;
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
  apiKeyMasked: string;
  hasApiKey: boolean;
  isFree: boolean;
  dailyLimit: number;
  pricePerMessage: number;
  description: string;
  systemPrompt: string | null;
  maxTokens: number;
  temperature: number;
  active: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: number;
}

function modelToData(r: any): AIModelData {
  const masked = (r.apiKey || "").length > 4
    ? "••••••" + (r.apiKey || "").slice(-4)
    : "••••";
  return {
    id: r.id,
    name: r.name,
    provider: r.provider,
    model: r.model,
    baseUrl: r.baseUrl,
    apiKeyMasked: masked,
    hasApiKey: (r.apiKey || "").length > 0,
    isFree: r.isFree,
    dailyLimit: r.dailyLimit,
    pricePerMessage: r.pricePerMessage,
    description: r.description,
    systemPrompt: r.systemPrompt,
    maxTokens: r.maxTokens,
    temperature: r.temperature,
    active: r.active,
    sortOrder: r.sortOrder,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
  };
}

export async function listModels(): Promise<AIModelData[]> {
  const db = getDb();
  const rows = await db.select().from(aiModels).orderBy(aiModels.sortOrder);
  return rows.map(modelToData);
}

export async function listActiveModelsPublic(): Promise<Partial<AIModelData>[]> {
  const db = getDb();
  const rows = await db.select().from(aiModels).orderBy(aiModels.sortOrder);
  return rows
    .filter((r) => r.active)
    .map((r) => ({
      id: r.id,
      name: r.name,
      provider: r.provider,
      model: r.model,
      isFree: r.isFree,
      dailyLimit: r.dailyLimit,
      pricePerMessage: r.pricePerMessage,
      description: r.description,
      active: r.active,
    }));
}

export async function getModelDetail(id: string): Promise<AIModelData | null> {
  const db = getDb();
  const [row] = await db.select().from(aiModels).where(eq(aiModels.id, id)).limit(1);
  if (!row) return null;
  return modelToData(row);
}

export async function getModelRaw(modelId: string): Promise<{
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
} | null> {
  const db = getDb();
  const [model] = await db.select().from(aiModels).where(eq(aiModels.id, modelId)).limit(1);
  if (!model || !model.active) return null;
  return {
    apiKey: model.apiKey,
    baseUrl: model.baseUrl,
    model: model.model,
    provider: model.provider,
    temperature: model.temperature,
    maxTokens: model.maxTokens,
    systemPrompt: model.systemPrompt || "",
  };
}

export async function createModel(data: {
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  isFree: boolean;
  dailyLimit: number;
  pricePerMessage: number;
  description: string;
  systemPrompt?: string;
  maxTokens: number;
  temperature: number;
  active: boolean;
  sortOrder: number;
  createdBy: string;
}): Promise<AIModelData> {
  const db = getDb();
  const now = Date.now();
  const [row] = await db.insert(aiModels).values({
    ...data,
    createdAt: now,
  }).returning();
  return modelToData(row);
}

export async function updateModel(
  id: string,
  data: Partial<{
    name: string;
    provider: string;
    model: string;
    baseUrl: string;
    apiKey: string;
    isFree: boolean;
    dailyLimit: number;
    pricePerMessage: number;
    description: string;
    systemPrompt: string;
    maxTokens: number;
    temperature: number;
    active: boolean;
    sortOrder: number;
  }>
): Promise<AIModelData> {
  const db = getDb();
  const [existing] = await db.select().from(aiModels).where(eq(aiModels.id, id)).limit(1);
  if (!existing) throw new NotFoundError("AI Model");
  await db.update(aiModels).set(data).where(eq(aiModels.id, id));
  return getModelDetail(id) as Promise<AIModelData>;
}

export async function deleteModel(id: string): Promise<void> {
  const db = getDb();
  await db.delete(aiModels).where(eq(aiModels.id, id));
}

export async function toggleModelActive(id: string): Promise<AIModelData> {
  const db = getDb();
  const [existing] = await db.select().from(aiModels).where(eq(aiModels.id, id)).limit(1);
  if (!existing) throw new NotFoundError("AI Model");
  await db.update(aiModels).set({ active: !existing.active }).where(eq(aiModels.id, id));
  return getModelDetail(id) as Promise<AIModelData>;
}

// ─── Prompts CRUD ────────────────────────────────────────────────────────────

export interface AIPromptData {
  id: string;
  name: string;
  content: string;
  category: string;
  isDefault: boolean;
  createdBy: string | null;
  createdAt: number;
}

export async function listPrompts(): Promise<AIPromptData[]> {
  const db = getDb();
  const rows = await db.select().from(aiPrompts);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    content: r.content,
    category: r.category,
    isDefault: r.isDefault,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
  }));
}

export async function createPrompt(data: {
  name: string;
  content: string;
  category: string;
  createdBy: string;
}): Promise<AIPromptData> {
  const db = getDb();
  const now = Date.now();
  const [row] = await db.insert(aiPrompts).values({
    ...data,
    isDefault: false,
    createdAt: now,
  }).returning();
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    category: row.category,
    isDefault: row.isDefault,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

export async function updatePrompt(
  id: string,
  data: { name: string; content: string; category: string }
): Promise<void> {
  const db = getDb();
  await db.update(aiPrompts).set(data).where(eq(aiPrompts.id, id));
}

export async function deletePrompt(id: string): Promise<void> {
  const db = getDb();
  await db.delete(aiPrompts).where(eq(aiPrompts.id, id));
}

export async function setDefaultPrompt(id: string): Promise<void> {
  const db = getDb();
  // Unset all defaults first
  const all = await db.select().from(aiPrompts);
  for (const p of all) {
    if (p.isDefault) {
      await db.update(aiPrompts).set({ isDefault: false }).where(eq(aiPrompts.id, p.id));
    }
  }
  await db.update(aiPrompts).set({ isDefault: true }).where(eq(aiPrompts.id, id));
}

// ─── Conversations ───────────────────────────────────────────────────────────

export interface ConversationData {
  id: string;
  userId: string;
  title: string;
  modelId: string | null;
  promptId: string | null;
  createdAt: number;
  updatedAt: number;
  messageCount?: number;
  userName?: string;
  userRole?: string;
}

export async function listConversations(userId: string): Promise<ConversationData[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.userId, userId))
    .orderBy(desc(aiConversations.createdAt))
    .limit(50);
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
      modelId: row.modelId,
      promptId: row.promptId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      messageCount: msgs.length,
    });
  }
  return results;
}

export async function listAllConversationsAdmin(): Promise<ConversationData[]> {
  const db = getDb();
  const rows = await db.select().from(aiConversations).orderBy(desc(aiConversations.createdAt));
  const results: ConversationData[] = [];
  for (const row of rows) {
    const [u] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
    results.push({
      id: row.id,
      userId: row.userId,
      title: row.title,
      modelId: row.modelId,
      promptId: row.promptId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      userName: (u as any)?.name ?? (u as any)?.email ?? "ناشناس",
      userRole: (u as any)?.role ?? "user",
    });
  }
  return results;
}

export async function createConversation(
  userId: string,
  title?: string,
  modelId?: string
): Promise<ConversationData> {
  const db = getDb();
  const now = Date.now();

  // Get user role for conversation limit check
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const userRole = (user as any)?.role ?? "user";
  const isRegular = userRole === "user" || userRole === "member";

  // Auto-cleanup: keep only MAX_CONVERSATIONS for regular users
  if (isRegular) {
    const existing = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.createdAt));

    if (existing.length >= MAX_CONVERSATIONS) {
      const toDelete = existing.slice(MAX_CONVERSATIONS - 1);
      for (const c of toDelete) {
        // Delete messages first
        await db.delete(aiMessages).where(eq(aiMessages.conversationId, c.id));
        await db.delete(aiConversations).where(eq(aiConversations.id, c.id));
      }
    }
  }

  const [row] = await db.insert(aiConversations).values({
    userId,
    title: title || "چت جدید",
    modelId: modelId || null,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    modelId: row.modelId,
    promptId: row.promptId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  const db = getDb();
  const [conv] = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
    .limit(1);
  if (!conv) throw new NotFoundError("Conversation");
  await db.delete(aiMessages).where(eq(aiMessages.conversationId, conversationId));
  await db.delete(aiConversations).where(eq(aiConversations.id, conversationId));
}

export async function renameConversation(
  userId: string,
  conversationId: string,
  title: string
): Promise<void> {
  const db = getDb();
  const [conv] = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
    .limit(1);
  if (!conv) throw new NotFoundError("Conversation");
  await db.update(aiConversations).set({ title }).where(eq(aiConversations.id, conversationId));
}

export async function deleteMessage(userId: string, messageId: string): Promise<void> {
  const db = getDb();
  const [msg] = await db.select().from(aiMessages).where(eq(aiMessages.id, messageId)).limit(1);
  if (!msg) throw new NotFoundError("Message");
  // Verify ownership via conversation
  const [conv] = await db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.id, msg.conversationId))
    .limit(1);
  if (!conv || conv.userId !== userId) throw new NotFoundError("Message");
  await db.delete(aiMessages).where(eq(aiMessages.id, messageId));
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface MessageData {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  tokensUsed: number;
  createdAt: number;
}

export async function listMessages(conversationId: string, userId: string): Promise<MessageData[]> {
  const db = getDb();
  const [conv] = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
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
    tokensUsed: r.tokensUsed,
    createdAt: r.createdAt,
  }));
}

// ─── Usage & Quota ───────────────────────────────────────────────────────────

export interface UsageStatus {
  messagesSent: number;
  tokensUsed: number;
  dailyLimit: number;
  remaining: number;
  role: string;
}

export async function getMyUsage(userId: string): Promise<UsageStatus | null> {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const today = todayString();
  const [usage] = await db
    .select()
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.date, today)))
    .limit(1);

  const [quota] = await db
    .select()
    .from(aiTokenQuotas)
    .where(eq(aiTokenQuotas.userId, userId))
    .limit(1);

  const userRole = (user as any)?.role ?? "user";
  const roleLimit = getDefaultRoleLimit(userRole);
  const dailyLimit = quota?.dailyLimit ?? roleLimit;

  return {
    messagesSent: usage?.messagesSent ?? 0,
    tokensUsed: usage?.tokensUsed ?? 0,
    dailyLimit,
    remaining: Math.max(0, dailyLimit - (usage?.messagesSent ?? 0)),
    role: userRole,
  };
}

export async function getUserUsageAdmin(date?: string): Promise<any[]> {
  const db = getDb();
  const targetDate = date ?? todayString();
  const rows = await db
    .select()
    .from(aiUsage)
    .where(eq(aiUsage.date, targetDate));
  return rows;
}

export async function getAllUsageHistory(): Promise<any[]> {
  const db = getDb();
  return await db.select().from(aiUsage);
}

export async function resetAllUsage(): Promise<void> {
  const db = getDb();
  const today = todayString();
  const all = await db.select().from(aiUsage).where(eq(aiUsage.date, today));
  for (const u of all) {
    await db.update(aiUsage).set({ messagesSent: 0, tokensUsed: 0 }).where(eq(aiUsage.id, u.id));
  }
}

// ─── Token Quotas (Admin) ────────────────────────────────────────────────────

export interface TokenQuotaData {
  id: string;
  userId: string;
  dailyLimit: number;
  extraTokens: number;
  grantedAt: number;
  grantedBy: string | null;
  note: string | null;
  userName?: string;
  userRole?: string;
}

export async function listTokenQuotas(): Promise<TokenQuotaData[]> {
  const db = getDb();
  const rows = await db.select().from(aiTokenQuotas);
  const results: TokenQuotaData[] = [];
  for (const q of rows) {
    if (!q.userId) continue;
    const [u] = await db.select().from(users).where(eq(users.id, q.userId)).limit(1);
    results.push({
      id: q.id,
      userId: q.userId,
      dailyLimit: q.dailyLimit,
      extraTokens: q.extraTokens,
      grantedAt: q.grantedAt,
      grantedBy: q.grantedBy,
      note: q.note,
      userName: (u as any)?.name ?? (u as any)?.email ?? "ناشناس",
      userRole: (u as any)?.role ?? "user",
    });
  }
  return results;
}

export async function grantTokens(
  userId: string,
  dailyLimit: number,
  grantedBy: string,
  note?: string
): Promise<void> {
  const db = getDb();
  const now = Date.now();
  const [existing] = await db
    .select()
    .from(aiTokenQuotas)
    .where(eq(aiTokenQuotas.userId, userId))
    .limit(1);

  if (existing) {
    await db.update(aiTokenQuotas).set({
      dailyLimit,
      grantedAt: now,
      grantedBy,
      note: note || null,
    }).where(eq(aiTokenQuotas.id, existing.id));
  } else {
    await db.insert(aiTokenQuotas).values({
      userId,
      dailyLimit,
      extraTokens: 0,
      grantedAt: now,
      grantedBy,
      note: note || null,
    });
  }
}

export async function revokeTokens(userId: string): Promise<void> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(aiTokenQuotas)
    .where(eq(aiTokenQuotas.userId, userId))
    .limit(1);
  if (existing) {
    await db.delete(aiTokenQuotas).where(eq(aiTokenQuotas.id, existing.id));
  }
}

// ─── Chat (Main Entry Point — matches original sendMessage + callAI) ─────────

export interface ChatRequest {
  userId: string;
  conversationId?: string;
  message: string;
  modelId?: string;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  model: string;
  remaining: number;
}

/**
 * Send a message in a conversation. This mirrors the original Convex flow:
 * 1. Verify ownership
 * 2. Check daily message limit (role-based)
 * 3. Save user message
 * 4. Update conversation title if first message
 * 5. Increment usage counter
 * 6. Call AI provider (server-side)
 * 7. Save assistant response
 * 8. Return remaining messages
 */
export async function sendMessage(request: ChatRequest): Promise<ChatResponse> {
  const db = getDb();
  const now = Date.now();

  // Verify user
  const [user] = await db.select().from(users).where(eq(users.id, request.userId)).limit(1);
  if (!user) throw new BadRequestError("کاربر یافت نشد.");
  const userRole = (user as any)?.role ?? "user";

  // Get or verify conversation
  let conv;
  if (request.conversationId) {
    const [found] = await db
      .select()
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.id, request.conversationId),
          eq(aiConversations.userId, request.userId)
        )
      )
      .limit(1);
    if (!found) throw new BadRequestError("دسترسی غیرمجاز.");
    conv = found;
  } else {
    conv = await createConversation(request.userId, request.message.slice(0, 50), request.modelId);
  }

  // Check daily limit
  const today = todayString();
  const [usage] = await db
    .select()
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, request.userId), eq(aiUsage.date, today)))
    .limit(1);

  const [quota] = await db
    .select()
    .from(aiTokenQuotas)
    .where(eq(aiTokenQuotas.userId, request.userId))
    .limit(1);

  const roleLimit = getDefaultRoleLimit(userRole);
  const dailyLimit = quota?.dailyLimit ?? roleLimit;
  const currentMessages = usage?.messagesSent ?? 0;

  if (currentMessages >= dailyLimit) {
    throw new BadRequestError(
      `محدودیت روزانه تمام شده. فردا دوباره شارژ می‌شود. (${dailyLimit}/${dailyLimit})`
    );
  }

  // Save user message
  await db.insert(aiMessages).values({
    conversationId: conv.id,
    role: "user",
    content: request.message,
    tokensUsed: 0,
    createdAt: now,
  });

  // Update conversation title if first message
  if (conv.title === "چت جدید") {
    await db
      .update(aiConversations)
      .set({ title: request.message.slice(0, 50), updatedAt: now })
      .where(eq(aiConversations.id, conv.id));
  } else {
    await db.update(aiConversations).set({ updatedAt: now }).where(eq(aiConversations.id, conv.id));
  }

  // Update usage
  if (usage) {
    await db
      .update(aiUsage)
      .set({ messagesSent: currentMessages + 1 })
      .where(eq(aiUsage.id, usage.id));
  } else {
    await db.insert(aiUsage).values({
      userId: request.userId,
      date: today,
      messagesSent: 1,
      tokensUsed: 0,
    });
  }

  // Call AI provider
  const rawConfig = await getRawConfig(request.modelId ?? conv.modelId ?? undefined);
  let responseText: string;
  let modelName = "unavailable";

  if (!rawConfig || !rawConfig.apiKey) {
    responseText = "هوش مصنوعی هنوز توسط مدیر سایت پیکربندی نشده است. لطفاً منتظر بمانید تا کلید API تنظیم شود.";
  } else {
    modelName = rawConfig.model;
    try {
      // Build message history
      const history = await db
        .select()
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, conv.id))
        .orderBy(aiMessages.createdAt)
        .limit(50);

      const chatMessages: AIMessage[] = [
        { role: "system", content: rawConfig.systemPrompt || "شما یک دستیار تخصصی علوم زیستی هستید." },
        ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      const provider = await getAIProvider();
      const response = await provider.complete({
        model: rawConfig.model,
        messages: chatMessages,
        temperature: rawConfig.temperature / 10,
        maxTokens: rawConfig.maxTokensPerRequest,
      });
      responseText = response.content;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "خطای ناشناخته";
      console.error("[AI] callAI failed:", msg);
      responseText = `خطا در اتصال به هوش مصنوعی: ${msg}`;
    }
  }

  // Save assistant response
  const [assistantMsg] = await db
    .insert(aiMessages)
    .values({
      conversationId: conv.id,
      role: "assistant",
      content: responseText,
      tokensUsed: 0,
      createdAt: now + 1,
    })
    .returning();

  return {
    conversationId: conv.id,
    messageId: assistantMsg.id,
    content: responseText,
    model: modelName,
    remaining: Math.max(0, dailyLimit - currentMessages - 1),
  };
}

// ─── Test Connection ─────────────────────────────────────────────────────────

export async function testConnection(args: {
  modelId?: string;
  apiKey?: string;
  baseUrl?: string;
  provider?: string;
  model?: string;
}): Promise<{
  connected: boolean;
  message: string;
  provider: string | null;
  model: string | null;
  testedAt?: string;
}> {
  const testedAt = new Date().toISOString();
  let apiKey = args.apiKey;
  let baseUrl = args.baseUrl;
  let provider = args.provider;
  let model = args.model;

  if (!apiKey) {
    const rawConfig = await getRawConfig(args.modelId);
    if (rawConfig) {
      apiKey = rawConfig.apiKey;
      baseUrl = rawConfig.baseUrl;
      provider = rawConfig.provider;
      model = rawConfig.model;
    }
  }

  if (!apiKey || !baseUrl || !model || !provider) {
    return {
      connected: false,
      message: "کلید API تنظیم نشده است.",
      provider: provider ?? null,
      model: model ?? null,
    };
  }

  try {
    if (provider === "anthropic") {
      const resp = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        return { connected: false, message: `خطای HTTP ${resp.status}: ${err.slice(0, 100)}`, provider, model, testedAt };
      }
      return { connected: true, message: "اتصال موفق", provider, model, testedAt };
    } else if (provider === "google") {
      const resp = await fetch(`${baseUrl}/v1beta/models/${model}?key=${apiKey}`);
      if (!resp.ok) {
        const err = await resp.text();
        return { connected: false, message: `خطای HTTP ${resp.status}: ${err.slice(0, 100)}`, provider, model, testedAt };
      }
      return { connected: true, message: "اتصال موفق", provider, model, testedAt };
    } else {
      // OpenAI-compatible
      const resp = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!resp.ok) {
        const err = await resp.text();
        return { connected: false, message: `خطای HTTP ${resp.status}: ${err.slice(0, 100)}`, provider, model, testedAt };
      }
      return { connected: true, message: "اتصال موفق", provider, model, testedAt };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطای ناشناخته";
    return { connected: false, message: `خطا در اتصال: ${msg}`, provider, model, testedAt };
  }
}
