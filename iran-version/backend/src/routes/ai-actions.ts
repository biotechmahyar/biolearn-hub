// ─── AI Actions Routes ───────────────────────────────────────────────────────
// REST endpoints for generateQuestions, generateArticles, rewriteText.
// All require authentication (matching original Convex actions which required auth).
// No role checks — original Convex actions had no role-based access control.

import { Hono } from "hono";
import { successResponse } from "../lib/errors.js";
import { ApiError } from "../lib/errors.js";
import { validateBody, z } from "../lib/validate.js";
import { authenticate } from "../middleware/auth.js";
import * as aiActions from "../services/ai-actions.service.js";

const actions = new Hono();

// Error handler
actions.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(
      { ok: false, error: err.message, code: err.code },
      err.statusCode as any
    );
  }
  console.error("[AI Action Error]", err);
  return c.json({ ok: false, error: "Internal server error" }, 500);
});

// ─── Generate Questions ──────────────────────────────────────────────────────
// POST /api/ai/actions/generate-questions
// Input: { prompt: string, count: number, difficulty: number, modelId?: string }
// Output: { questions: GeneratedQuestion[], raw: string }
// Authorization: authenticated user (matches original Convex action)
actions.post("/generate-questions", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      prompt: z.string().min(1),
      count: z.number().min(1).max(50),
      difficulty: z.number().min(1).max(3),
      modelId: z.string().uuid().optional(),
    })
  );
  const result = await aiActions.generateQuestions(body);
  return c.json(successResponse(result));
});

// ─── Generate Articles ───────────────────────────────────────────────────────
// POST /api/ai/actions/generate-articles
// Input: { prompt: string, count: number, category: string, modelId?: string }
// Output: { articles: GeneratedArticle[], raw: string }
// Authorization: authenticated user (matches original Convex action)
actions.post("/generate-articles", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      prompt: z.string().min(1),
      count: z.number().min(1).max(20),
      category: z.string().min(1),
      modelId: z.string().uuid().optional(),
    })
  );
  const result = await aiActions.generateArticles(body);
  return c.json(successResponse(result));
});

// ─── Rewrite Text ────────────────────────────────────────────────────────────
// POST /api/ai/actions/rewrite-text
// Input: { prompt: string, selectedText?: string, modelId?: string }
// Output: { ok: boolean, result?: string, error?: string }
// Authorization: authenticated user (matches original Convex action)
actions.post("/rewrite-text", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      prompt: z.string().min(1),
      selectedText: z.string().optional(),
      modelId: z.string().uuid().optional(),
    })
  );
  const result = await aiActions.rewriteText(body);
  return c.json(successResponse(result));
});

export default actions;
