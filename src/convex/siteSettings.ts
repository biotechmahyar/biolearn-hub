import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// ══════════════════════════════════════════════════════════════════════════════
// ── SITE SETTINGS ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/** Get a single setting by key (public for reads like payment.enabled) */
export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!row) return null;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  },
});

/** Get multiple settings at once (public) */
export const getSettings = query({
  args: { keys: v.array(v.string()) },
  handler: async (ctx, args) => {
    const result: Record<string, any> = {};
    for (const key of args.keys) {
      const row = await ctx.db
        .query("siteSettings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (row) {
        try {
          result[key] = JSON.parse(row.value);
        } catch {
          result[key] = row.value;
        }
      }
    }
    return result;
  },
});

/** Get all settings (admin only) */
export const listAllSettings = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin")) return [];
    return await ctx.db.query("siteSettings").collect();
  },
});

/** Admin: set a setting */
export const setSetting = mutation({
  args: {
    key: v.string(),
    value: v.string(), // JSON-encoded
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin")) {
      throw new Error("دسترسی مدیریتی لازم است.");
    }

    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        description: args.description ?? existing.description,
        updatedBy: user._id,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("siteSettings", {
        key: args.key,
        value: args.value,
        description: args.description,
        updatedBy: user._id,
        updatedAt: Date.now(),
      });
    }

    // Log the action
    await logAudit(ctx, user, "settings.update", "siteSettings", args.key, {
      key: args.key,
    });

    return { ok: true };
  },
});

// ── Payment Gateway Convenience ──────────────────────────────────────────

/** Check if payment is enabled (used by frontend and backend) */
export const isPaymentEnabled = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "payment.enabled"))
      .first();
    if (!row) return true; // default: enabled
    try {
      return JSON.parse(row.value);
    } catch {
      return true;
    }
  },
});

/** Admin: toggle payment gateway */
export const togglePayment = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin")) {
      throw new Error("دسترسی مدیریتی لازم است.");
    }

    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "payment.enabled"))
      .first();

    const value = JSON.stringify(args.enabled);

    if (existing) {
      await ctx.db.patch(existing._id, {
        value,
        updatedBy: user._id,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("siteSettings", {
        key: "payment.enabled",
        value,
        description: "فعال/غیرفعال بودن درگاه پرداخت آنلاین",
        updatedBy: user._id,
        updatedAt: Date.now(),
      });
    }

    await logAudit(ctx, user, "payment.toggle", "payment", undefined, {
      enabled: args.enabled,
    });

    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── AUDIT LOG ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/** Helper: log an audit entry */
async function logAudit(
  ctx: any,
  user: any,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, any>,
) {
  try {
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      userName: user.name ?? user.email ?? "—",
      action,
      entityType,
      entityId,
      details: details ? JSON.stringify(details) : undefined,
      createdAt: Date.now(),
    });
  } catch {
    // audit log failure should never break the main operation
  }
}

/** Admin: list audit logs */
export const listAuditLogs = query({
  args: {
    entityType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin")) return [];

    let q = ctx.db.query("auditLogs").withIndex("by_created").order("desc");
    const logs = await q.take(args.limit ?? 100);

    if (args.entityType) {
      return logs.filter((l: any) => l.entityType === args.entityType);
    }
    return logs;
  },
});

/** Export logAudit for use in other modules */
export { logAudit };
