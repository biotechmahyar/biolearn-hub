import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getCurrentUser } from "./users";

// ── Tier definitions ────────────────────────────────────────────────────────
export const TIERS = {
  bronze: { label: "برنزی", dailyLimit: 25, price: 199000, color: "amber" },
  silver: { label: "نقره‌ای", dailyLimit: 50, price: 499000, color: "slate" },
  gold: { label: "طلایی", dailyLimit: 150, price: 1499000, color: "yellow" },
} as const;

export type TierKey = keyof typeof TIERS;

// ── Public: get tier definitions ────────────────────────────────────────────
export const getTiers = query({
  args: {},
  handler: async () => {
    return Object.entries(TIERS).map(([key, val]) => ({
      key,
      ...val,
    }));
  },
});

// ── Public: get current user's active subscription ──────────────────────────
export const getMySubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const now = Date.now();
    const sub = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const active = sub.find((s) => s.active && s.expiresAt > now);
    if (!active) return null;

    const tier = TIERS[active.tier as TierKey];
    return {
      tier: active.tier,
      dailyLimit: tier?.dailyLimit ?? active.dailyLimit,
      expiresAt: active.expiresAt,
      label: tier?.label ?? active.tier,
    };
  },
});

// ── Admin: list all subscriptions ───────────────────────────────────────────
export const listSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin"))
      throw new Error("دسترسی غیرمجاز.");

    const subs = await ctx.db.query("aiSubscriptions").collect();
    const enriched = await Promise.all(
      subs.map(async (s) => {
        const u = await ctx.db.get(s.userId);
        return {
          ...s,
          userName: (u as any)?.name ?? "نامشخص",
          userEmail: (u as any)?.email ?? "",
          tierLabel: TIERS[s.tier as TierKey]?.label ?? s.tier,
        };
      }),
    );

    return enriched.sort((a, b) => b.startedAt - a.startedAt);
  },
});

// ── Admin: grant subscription to a user ─────────────────────────────────────
export const grantSubscription = mutation({
  args: {
    userId: v.id("users"),
    tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold")),
    durationDays: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin"))
      throw new Error("دسترسی غیرمجاز.");

    // Deactivate any existing active subscription for this user
    const existing = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const s of existing) {
      if (s.active) {
        await ctx.db.patch(s._id, { active: false });
      }
    }

    const tier = TIERS[args.tier];
    const now = Date.now();
    await ctx.db.insert("aiSubscriptions", {
      userId: args.userId,
      tier: args.tier,
      dailyLimit: tier.dailyLimit,
      startedAt: now,
      expiresAt: now + args.durationDays * 24 * 60 * 60 * 1000,
      active: true,
    });

    return { ok: true };
  },
});

// ── Admin: revoke a subscription ────────────────────────────────────────────
export const revokeSubscription = mutation({
  args: { id: v.id("aiSubscriptions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin"))
      throw new Error("دسترسی غیرمجاز.");

    await ctx.db.patch(args.id, { active: false });
    return { ok: true };
  },
});

// ── Internal: get effective daily limit for a user (used by aiChat) ─────────
export const getEffectiveDailyLimit = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sub = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const active = sub.find((s) => s.active && s.expiresAt > now);
    if (!active) return null;

    const tier = TIERS[active.tier as TierKey];
    return {
      tier: active.tier,
      dailyLimit: tier?.dailyLimit ?? active.dailyLimit,
    };
  },
});
