// @ts-nocheck
import { Context } from "hono";
import { db } from "../db.js";
import { aiConfig, aiModels, aiTokenQuotas, aiUsage, aiConversations, aiMessages } from "../schema.js";
import { eq, desc, and } from "drizzle-orm";

// ── RBAC ───────────────────────────────────────────────────────────────────
function requireAdmin(c: any) {
  const user = c.get("user");
  if (!user || !["admin", "site_admin"].includes(user.role)) {
    return c.json({ ok: false, error: "Admin access required" }, 403);
  }
  return null;
}

// ── AI CONFIG (admin) ──────────────────────────────────────────────────────
export async function getAIConfig(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const rows = await db.select().from(aiConfig);
  const config: Record<string, string> = {};
  for (const r of rows) config[r.key] = r.value ?? "";
  // Never expose API keys
  if (config.apiKeyEncrypted) config.apiKeyEncrypted = "••••••••";
  return c.json({ ok: true, data: config });
}

export async function setAIConfig(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const body = await c.req.json();
  for (const [key, value] of Object.entries(body)) {
    const existing = await db.select().from(aiConfig).where(eq(aiConfig.key, key));
    if (existing.length > 0) {
      await db.update(aiConfig).set({ value: String(value) }).where(eq(aiConfig.key, key));
    } else {
      await db.insert(aiConfig)// @ts-ignore.values({ key, value: String(value) });
    }
  }
  return c.json({ ok: true });
}

// ── AI MODELS (admin) ──────────────────────────────────────────────────────
export async function listAIModels(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const rows = await db.select().from(aiModels).orderBy(aiModels.sortOrder);
  return c.json({ ok: true, data: rows });
}

export async function createAIModel(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const body = await c.req.json();
  const id = `model_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(aiModels)// @ts-ignore.values({ id, ...body, active: body.active ?? true });
  return c.json({ ok: true, data: { id } });
}

export async function updateAIModel(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  const body = await c.req.json();
  await db.update(aiModels).set(body as any).where(eq(aiModels.id, id));
  return c.json({ ok: true });
}

export async function deleteAIModel(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  await db.delete(aiModels).where(eq(aiModels.id, id));
  return c.json({ ok: true });
}

// ── TOKEN QUOTAS (admin) ───────────────────────────────────────────────────
export async function listQuotas(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const rows = await db.select().from(aiTokenQuotas).orderBy(desc(aiTokenQuotas.createdAt));
  return c.json({ ok: true, data: rows });
}

export async function setQuota(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const body = await c.req.json();
  const existing = await db.select().from(aiTokenQuotas).where(eq(aiTokenQuotas.userId, body.userId));
  if (existing.length > 0) {
    await db.update(aiTokenQuotas).set({
      dailyLimit: body.dailyLimit ?? existing[0].dailyLimit,
      extraTokens: body.extraTokens ?? existing[0].extraTokens,
    }).where(eq(aiTokenQuotas.userId, body.userId));
  } else {
    const id = `qt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.insert(aiTokenQuotas)// @ts-ignore.values({
      id,
      userId: body.userId,
      dailyLimit: body.dailyLimit ?? 50,
      extraTokens: body.extraTokens ?? 0,
      createdAt: Date.now(),
    });
  }
  return c.json({ ok: true });
}

// ── USAGE STATS (admin) ────────────────────────────────────────────────────
export async function getUsageStats(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const rows = await db.select().from(aiUsage).orderBy(desc(aiUsage.createdAt)).limit(500);
  return c.json({ ok: true, data: rows });
}

// ── MY USAGE (user) ────────────────────────────────────────────────────────
export async function getMyUsage(c: Context) {
  const user = c.get("user");
  if (!user) return c.json({ ok: false, error: "Unauthorized" }, 401);
  const today = new Date().toISOString().split("T")[0];
  const rows = await db.select().from(aiUsage)
    .where(and(eq(aiUsage.userId, user.id), eq(aiUsage.date, today)));
  const quota = await db.select().from(aiTokenQuotas).where(eq(aiTokenQuotas.userId, user.id));
  return c.json({
    ok: true,
    data: {
      today: rows,
      quota: quota[0] ?? { dailyLimit: 50, extraTokens: 0 },
    },
  });
}
