// ─── AI Routes ──────────────────────────────────────────────────────────────
// REST API endpoints for AI chat, conversations, config, models, and quota.
// RBAC: user endpoints require auth, config/model management requires admin.

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

// ─── Chat ───────────────────────────────────────────────────────────────────

ai.post("/chat", authenticate, async (c) => {
  const user = c.get("user");
  const body = await validateBody(
    c,
    z.object({
      message: z.string().min(1).max(8000),
      conversationId: z.string().uuid().optional(),
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(4096).optional(),
      systemPrompt: z.string().max(2000).optional(),
    })
  );
  const result = await aiService.chat({
    userId: user.userId,
    ...body,
  });
  return c.json(successResponse(result));
});

// ─── Conversations ──────────────────────────────────────────────────────────

ai.get("/conversations", authenticate, async (c) => {
  const user = c.get("user");
  const conversations = await aiService.listConversations(user.userId);
  return c.json(successResponse(conversations));
});

ai.post("/conversations", authenticate, async (c) => {
  const user = c.get("user");
  const body = await validateBody(c, z.object({ title: z.string().optional() }));
  const conv = await aiService.createConversation(user.userId, body.title);
  return c.json(successResponse(conv), 201);
});

ai.delete("/conversations/:id", authenticate, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id") as string;
  await aiService.deleteConversation(user.userId, id);
  return c.json(successResponse({ deleted: true }));
});

// ─── Messages ───────────────────────────────────────────────────────────────

ai.get("/conversations/:id/messages", authenticate, async (c) => {
  const user = c.get("user");
  const conversationId = c.req.param("id") as string;
  const messages = await aiService.listMessages(conversationId, user.userId);
  return c.json(successResponse(messages));
});

// ─── Quota ──────────────────────────────────────────────────────────────────

ai.get("/quota", authenticate, async (c) => {
  const user = c.get("user");
  const quota = await aiService.getQuota(user.userId);
  return c.json(successResponse(quota));
});

// ─── Status ─────────────────────────────────────────────────────────────────

ai.get("/status", async (c) => {
  const provider = await getAIProvider();
  const available = await provider.isAvailable();
  return c.json(
    successResponse({
      provider: provider.name,
      available,
    })
  );
});

// ─── Config (Admin only) ────────────────────────────────────────────────────

ai.get("/config", authenticate, requireAdmin, async (c) => {
  const config = await aiService.getConfig();
  return c.json(successResponse(config));
});

ai.put("/config", authenticate, requireAdmin, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      enabled: z.boolean().optional(),
      model: z.string().optional(),
      apiKey: z.string().optional(),
      systemPrompt: z.string().optional(),
    })
  );
  const config = await aiService.updateConfig(body);
  return c.json(successResponse(config));
});

// ─── Models (Admin only) ────────────────────────────────────────────────────

ai.get("/models", authenticate, requireAdmin, async (c) => {
  const models = await aiService.listModels();
  return c.json(successResponse(models));
});

ai.post("/models", authenticate, requireAdmin, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      name: z.string().min(1),
      provider: z.string().optional(),
      config: z.record(z.unknown()).optional(),
    })
  );
  const model = await aiService.createModel(body);
  return c.json(successResponse(model), 201);
});

ai.put("/models/:id", authenticate, requireAdmin, async (c) => {
  const id = c.req.param("id");
  const body = await validateBody(
    c,
    z.object({
      name: z.string().min(1).optional(),
      provider: z.string().optional(),
      enabled: z.boolean().optional(),
      config: z.record(z.unknown()).optional(),
    })
  );
  const model = await aiService.updateModel(id!, body);
  return c.json(successResponse(model));
});

ai.delete("/models/:id", authenticate, requireAdmin, async (c) => {
  const id = c.req.param("id") as string;
  await aiService.deleteModel(id);
  return c.json(successResponse({ deleted: true }));
});

// ─── Prompts (Admin only) ──────────────────────────────────────────────────

ai.get("/prompts", authenticate, requireAdmin, async (c) => {
  const prompts = await aiService.listPrompts();
  return c.json(successResponse(prompts));
});

ai.put("/prompts/:key", authenticate, requireAdmin, async (c) => {
  const key = c.req.param("key") as string;
  const body = await validateBody(c, z.object({ template: z.string() }));
  const prompt = await aiService.upsertPrompt(key, body.template);
  return c.json(successResponse(prompt));
});

export default ai;
