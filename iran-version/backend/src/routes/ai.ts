// ─── AI Routes — Full Feature Parity ─────────────────────────────────────────
// Matches original Convex: aiChat.ts (user), aiManagement.ts (admin), aiActions.ts
// RBAC: user endpoints require auth, admin/management requires admin/site_admin.

import { Hono } from "hono";
import { successResponse } from "../lib/errors.js";
import { ApiError } from "../lib/errors.js";
import { validateBody, z } from "../lib/validate.js";
import { authenticate } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/auth.js";
import * as aiService from "../services/ai.service.js";
import { getAIProvider } from "../services/ai/index.js";

const ai = new Hono();

// Error handler — converts ApiError to proper status codes
ai.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(
      { ok: false, error: err.message, code: err.code },
      err.statusCode as any
    );
  }
  console.error("[AI Route Error]", err);
  return c.json({ ok: false, error: "Internal server error" }, 500);
});

// ═════════════════════════════════════════════════════════════════════════════
// USER-FACING ENDPOINTS (matching aiChat.ts)
// ═════════════════════════════════════════════════════════════════════════════

// ─── Send Message (matches sendMessage mutation) ─────────────────────────────
ai.post("/chat", authenticate, async (c) => {
  const user = c.get("user");
  const body = await validateBody(
    c,
    z.object({
      conversationId: z.string().uuid().optional(),
      message: z.string().min(1).max(8000),
    })
  );
  const result = await aiService.sendMessage({
    userId: user.userId,
    ...body,
  });
  return c.json(successResponse(result));
});

// ─── List Active Models for Users (matches listActiveModels) ─────────────────
ai.get("/models/active", async (c) => {
  const models = await aiService.listActiveModelsPublic();
  return c.json(successResponse(models));
});

// ─── List My Conversations (matches listMyConversations) ────────────────────
ai.get("/conversations", authenticate, async (c) => {
  const user = c.get("user");
  const conversations = await aiService.listConversations(user.userId);
  return c.json(successResponse(conversations));
});

// ─── Create Conversation (matches createConversation) ───────────────────────
ai.post("/conversations", authenticate, async (c) => {
  const user = c.get("user");
  const body = await validateBody(
    c,
    z.object({
      title: z.string().optional(),
      modelId: z.string().uuid().optional(),
    })
  );
  const conv = await aiService.createConversation(user.userId, body.title, body.modelId);
  return c.json(successResponse(conv), 201);
});

// ─── Rename Conversation (matches renameConversation) ───────────────────────
ai.put("/conversations/:id", authenticate, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id") as string;
  const body = await validateBody(c, z.object({ title: z.string() }));
  await aiService.renameConversation(user.userId, id, body.title);
  return c.json(successResponse({ success: true }));
});

// ─── Delete Conversation (matches deleteConversation) ───────────────────────
ai.delete("/conversations/:id", authenticate, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id") as string;
  await aiService.deleteConversation(user.userId, id);
  return c.json(successResponse({ success: true }));
});

// ─── Get Messages (matches getConversationMessages) ─────────────────────────
ai.get("/conversations/:id/messages", authenticate, async (c) => {
  const user = c.get("user");
  const conversationId = c.req.param("id") as string;
  const messages = await aiService.listMessages(conversationId, user.userId);
  return c.json(successResponse(messages));
});

// ─── Delete Message (matches deleteMessage) ─────────────────────────────────
ai.delete("/messages/:id", authenticate, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id") as string;
  await aiService.deleteMessage(user.userId, id);
  return c.json(successResponse({ success: true }));
});

// ─── My Usage (matches getMyUsage) ──────────────────────────────────────────
ai.get("/usage/me", authenticate, async (c) => {
  const user = c.get("user");
  const usage = await aiService.getMyUsage(user.userId);
  return c.json(successResponse(usage));
});

// ─── Status (provider check) ────────────────────────────────────────────────
ai.get("/status", async (c) => {
  const provider = await getAIProvider();
  const available = await provider.isAvailable();
  return c.json(successResponse({ provider: provider.name, available }));
});

// ─── Test Connection (matches testConnection action) ────────────────────────
ai.post("/test-connection", authenticate, requireAdmin, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      modelId: z.string().uuid().optional(),
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
      provider: z.string().optional(),
      model: z.string().optional(),
    })
  );
  const result = await aiService.testConnection(body);
  return c.json(successResponse(result));
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS (matching aiManagement.ts)
// ═════════════════════════════════════════════════════════════════════════════

// ─── Legacy Config (matches getConfig / saveConfig / deleteConfig) ───────────
ai.get("/admin/config", authenticate, requireAdmin, async (c) => {
  const config = await aiService.getConfig();
  return c.json(successResponse(config));
});

ai.put("/admin/config", authenticate, requireAdmin, async (c) => {
  const user = c.get("user");
  const body = await validateBody(
    c,
    z.object({
      provider: z.string(),
      model: z.string(),
      baseUrl: z.string(),
      apiKey: z.string(),
      maxTokensPerRequest: z.number(),
      temperature: z.number(),
      systemPrompt: z.string(),
    })
  );
  const config = await aiService.saveConfig({ ...body, updatedBy: user.userId });
  return c.json(successResponse(config));
});

ai.delete("/admin/config", authenticate, requireAdmin, async (c) => {
  await aiService.deleteConfig();
  return c.json(successResponse({ success: true }));
});

// ─── Models CRUD (matches listModels / createModel / updateModel / etc.) ─────
ai.get("/admin/models", authenticate, requireAdmin, async (c) => {
  const models = await aiService.listModels();
  return c.json(successResponse(models));
});

ai.get("/admin/models/:id", authenticate, requireAdmin, async (c) => {
  const id = c.req.param("id") as string;
  const model = await aiService.getModelDetail(id);
  if (!model) return c.json({ ok: false, error: "Model not found" }, 404);
  return c.json(successResponse(model));
});

ai.post("/admin/models", authenticate, requireAdmin, async (c) => {
  const user = c.get("user");
  const body = await validateBody(
    c,
    z.object({
      name: z.string().min(1),
      provider: z.string(),
      model: z.string(),
      baseUrl: z.string(),
      apiKey: z.string(),
      isFree: z.boolean(),
      dailyLimit: z.number(),
      pricePerMessage: z.number(),
      description: z.string(),
      systemPrompt: z.string().optional(),
      maxTokens: z.number(),
      temperature: z.number(),
      active: z.boolean(),
      sortOrder: z.number(),
    })
  );
  const model = await aiService.createModel({ ...body, createdBy: user.userId });
  return c.json(successResponse(model), 201);
});

ai.put("/admin/models/:id", authenticate, requireAdmin, async (c) => {
  const id = c.req.param("id") as string;
  const body = await validateBody(
    c,
    z.object({
      name: z.string().min(1).optional(),
      provider: z.string().optional(),
      model: z.string().optional(),
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      isFree: z.boolean().optional(),
      dailyLimit: z.number().optional(),
      pricePerMessage: z.number().optional(),
      description: z.string().optional(),
      systemPrompt: z.string().optional(),
      maxTokens: z.number().optional(),
      temperature: z.number().optional(),
      active: z.boolean().optional(),
      sortOrder: z.number().optional(),
    })
  );
  const model = await aiService.updateModel(id, body);
  return c.json(successResponse(model));
});

ai.delete("/admin/models/:id", authenticate, requireAdmin, async (c) => {
  const id = c.req.param("id") as string;
  await aiService.deleteModel(id);
  return c.json(successResponse({ success: true }));
});

ai.post("/admin/models/:id/toggle", authenticate, requireAdmin, async (c) => {
  const id = c.req.param("id") as string;
  const model = await aiService.toggleModelActive(id);
  return c.json(successResponse(model));
});

// ─── Prompts CRUD (matches listPrompts / createPrompt / etc.) ────────────────
ai.get("/admin/prompts", authenticate, requireAdmin, async (c) => {
  const prompts = await aiService.listPrompts();
  return c.json(successResponse(prompts));
});

ai.post("/admin/prompts", authenticate, requireAdmin, async (c) => {
  const user = c.get("user");
  const body = await validateBody(
    c,
    z.object({
      name: z.string().min(1),
      content: z.string(),
      category: z.string(),
    })
  );
  const prompt = await aiService.createPrompt({ ...body, createdBy: user.userId });
  return c.json(successResponse(prompt), 201);
});

ai.put("/admin/prompts/:id", authenticate, requireAdmin, async (c) => {
  const id = c.req.param("id") as string;
  const body = await validateBody(
    c,
    z.object({
      name: z.string(),
      content: z.string(),
      category: z.string(),
    })
  );
  await aiService.updatePrompt(id, body);
  return c.json(successResponse({ success: true }));
});

ai.delete("/admin/prompts/:id", authenticate, requireAdmin, async (c) => {
  const id = c.req.param("id") as string;
  await aiService.deletePrompt(id);
  return c.json(successResponse({ success: true }));
});

ai.post("/admin/prompts/:id/default", authenticate, requireAdmin, async (c) => {
  const id = c.req.param("id") as string;
  await aiService.setDefaultPrompt(id);
  return c.json(successResponse({ success: true }));
});

// ─── Admin: All Conversations (matches listConversations admin) ──────────────
ai.get("/admin/conversations", authenticate, requireAdmin, async (c) => {
  const conversations = await aiService.listAllConversationsAdmin();
  return c.json(successResponse(conversations));
});

// ─── Admin: User Usage (matches getUserUsage) ───────────────────────────────
ai.get("/admin/usage", authenticate, requireAdmin, async (c) => {
  const date = c.req.query("date");
  const usage = await aiService.getUserUsageAdmin(date);
  return c.json(successResponse(usage));
});

ai.get("/admin/usage/history", authenticate, requireAdmin, async (c) => {
  const history = await aiService.getAllUsageHistory();
  return c.json(successResponse(history));
});

ai.post("/admin/usage/reset", authenticate, requireAdmin, async (c) => {
  await aiService.resetAllUsage();
  return c.json(successResponse({ success: true }));
});

// ─── Admin: Token Quotas (matches grantTokens / revokeTokens / listTokenQuotas) ──
ai.get("/admin/quotas", authenticate, requireAdmin, async (c) => {
  const quotas = await aiService.listTokenQuotas();
  return c.json(successResponse(quotas));
});

ai.post("/admin/quotas/grant", authenticate, requireAdmin, async (c) => {
  const adminUser = c.get("user");
  const body = await validateBody(
    c,
    z.object({
      userId: z.string().uuid(),
      dailyLimit: z.number().min(1),
      note: z.string().optional(),
    })
  );
  await aiService.grantTokens(body.userId, body.dailyLimit, adminUser.userId, body.note);
  return c.json(successResponse({ success: true }));
});

ai.post("/admin/quotas/revoke", authenticate, requireAdmin, async (c) => {
  const body = await validateBody(c, z.object({ userId: z.string().uuid() }));
  await aiService.revokeTokens(body.userId);
  return c.json(successResponse({ success: true }));
});

export default ai;
