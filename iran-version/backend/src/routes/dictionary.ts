/**
 * Dictionary routes — search, get, CRUD.
 * Mirrors: content.ts dictionary mutations/queries.
 */
import { Hono } from "hono";
import { success, errorResponse } from "../lib/response.js";
import { dictionaryService } from "../services/dictionary.service.js";
import type { AppEnv } from "../lib/types.js";

const dictionaryRoutes = new Hono<AppEnv>();

const requireAuth = async (c: any, next: any) => {
  if (!c.get("userId")) return c.json(errorResponse("Unauthorized", "UNAUTHORIZED"), 401);
  await next();
};

const requireEditor = async (c: any, next: any) => {
  const userRole = c.get("userRole") ?? "";
  if (!["instructor", "content_manager", "site_admin", "admin"].includes(userRole)) {
    return c.json(errorResponse("فقط مدرس، مدیر محتوا یا ادمین می‌تواند اصطلاح مدیریت کند.", "FORBIDDEN"), 403);
  }
  await next();
};

// ── Public: search and get ────────────────────────────────────────────────

dictionaryRoutes.get("/", async (c) => {
  const params = new URL(c.req.url).searchParams;
  const query = params.get("query") ?? undefined;
  const limit = params.get("limit") ? parseInt(params.get("limit")!) : undefined;
  const terms = await dictionaryService.search(query, limit);
  return c.json(success(terms));
});

dictionaryRoutes.get("/:slug", async (c) => {
  const term = await dictionaryService.findBySlug(c.req.param("slug"));
  if (!term) return c.json(errorResponse("Not found", "NOT_FOUND"), 404);
  return c.json(success(term));
});

// ── Editor: CRUD ──────────────────────────────────────────────────────────

dictionaryRoutes.post("/", requireAuth, requireEditor, async (c) => {
  const body = await c.req.json();
  try {
    const term = await dictionaryService.create(body);
    return c.json(success(term), 201);
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

dictionaryRoutes.put("/:id", requireAuth, requireEditor, async (c) => {
  const body = await c.req.json();
  try {
    const term = await dictionaryService.update(c.req.param("id"), body);
    if (!term) return c.json(errorResponse("Not found"), 404);
    return c.json(success(term));
  } catch (e: any) {
    return c.json(errorResponse(e.message), 400);
  }
});

dictionaryRoutes.delete("/:id", requireAuth, requireEditor, async (c) => {
  const deleted = await dictionaryService.delete(c.req.param("id"));
  if (!deleted) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ deleted: true }));
});

export { dictionaryRoutes };
