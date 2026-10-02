/**
 * Drosophila Virtual Lab — fly experiments backend
 * ─────────────────────────────────────────────────────────────────────────────
 * A *fly experiment* is a student-authored protocol attached to one of their own
 * virtual flies: what they want to test, under which condition, with which
 * stimulus, and (optionally) which real Virtual Fly Brain entity is the neural
 * target.
 *
 * Nothing scientific is decided here. The server only validates and stores the
 * student's inputs; whatever the fly does afterwards is a *simulation* and is
 * labelled as such by the client, and the neural target is stored purely as
 * provenance (VFB id + label + access time).
 *
 * Every function is scoped to the signed-in student, and `flyId` is verified to
 * belong to that student before any experiment is created or read — so one
 * student can never attach an experiment to somebody else's fly.
 */
import { v } from "convex/values";
import type { GenericId } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { getCurrentUser } from "./users";

const MAX_NAME = 120;
const MAX_TEXT = 2000;
const MAX_DURATION = 600;
const MAX_EXPERIMENTS_PER_FLY = 40;

type StimulusKind = "none" | "light" | "odor" | "temperature" | "mechanical";
type ExperimentStatus = "draft" | "in_progress" | "completed";

function clean(value: string | undefined, max: number): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed.slice(0, max) : undefined;
}

function clampIntensity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function clampDuration(value: number): number {
  if (!Number.isFinite(value)) return 5;
  return Math.min(MAX_DURATION, Math.max(1, Math.round(value)));
}

/** Reject any fly that is not the caller's. */
async function requireOwnFly(
  ctx: MutationCtx,
  userId: GenericId<"users">,
  flyId: GenericId<"virtualFlies">,
) {
  const fly = await ctx.db.get(flyId);
  if (!fly) throw new Error("مگس یافت نشد.");
  if (fly.userId !== userId) throw new Error("دسترسی غیرمجاز.");
}

// ── Queries ─────────────────────────────────────────────────────────────────

/** Experiments of the signed-in student, optionally filtered by fly. */
export const listMyExperiments = query({
  args: { flyId: v.optional(v.id("virtualFlies")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("flyExperiments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return rows
      .filter((row) => !args.flyId || row.flyId === args.flyId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const myExperimentSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { total: 0, draft: 0, inProgress: 0, completed: 0 };
    const rows = await ctx.db
      .query("flyExperiments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return {
      total: rows.length,
      draft: rows.filter((r) => r.status === "draft").length,
      inProgress: rows.filter((r) => r.status === "in_progress").length,
      completed: rows.filter((r) => r.status === "completed").length,
    };
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const createExperiment = mutation({
  args: {
    flyId: v.id("virtualFlies"),
    name: v.string(),
    objective: v.optional(v.string()),
    condition: v.optional(v.string()),
    stimulusKind: v.optional(
      v.union(
        v.literal("none"),
        v.literal("light"),
        v.literal("odor"),
        v.literal("temperature"),
        v.literal("mechanical"),
      ),
    ),
    stimulusIntensity: v.optional(v.number()),
    target: v.optional(
      v.object({
        vfbId: v.string(),
        label: v.string(),
        entityType: v.optional(v.string()),
      }),
    ),
    durationMin: v.optional(v.number()),
    params: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ساخت آزمایش ابتدا وارد حساب شوید.");
    await requireOwnFly(ctx, user._id, args.flyId);

    const name = clean(args.name, MAX_NAME);
    if (!name) throw new Error("نام آزمایش لازم است.");

    const existing = await ctx.db
      .query("flyExperiments")
      .withIndex("by_fly", (q) => q.eq("flyId", args.flyId))
      .collect();
    if (existing.length >= MAX_EXPERIMENTS_PER_FLY) {
      throw new Error("سقف تعداد آزمایش‌ها برای هر مگس پر شده است.");
    }

    const now = Date.now();
    return await ctx.db.insert("flyExperiments", {
      userId: user._id,
      flyId: args.flyId,
      name,
      objective: clean(args.objective, MAX_TEXT),
      condition: clean(args.condition, MAX_TEXT),
      stimulusKind: (args.stimulusKind ?? "none") as StimulusKind,
      stimulusIntensity: clampIntensity(args.stimulusIntensity ?? 0),
      target: args.target
        ? {
            vfbId: args.target.vfbId.slice(0, 128),
            label: args.target.label.slice(0, 200),
            entityType: args.target.entityType?.slice(0, 80),
            source: "Virtual Fly Brain",
            accessedAt: now,
          }
        : undefined,
      durationMin: clampDuration(args.durationMin ?? 5),
      params: clean(args.params, MAX_TEXT),
      status: "draft" as ExperimentStatus,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateExperiment = mutation({
  args: {
    id: v.id("flyExperiments"),
    name: v.optional(v.string()),
    objective: v.optional(v.string()),
    condition: v.optional(v.string()),
    stimulusKind: v.optional(
      v.union(
        v.literal("none"),
        v.literal("light"),
        v.literal("odor"),
        v.literal("temperature"),
        v.literal("mechanical"),
      ),
    ),
    stimulusIntensity: v.optional(v.number()),
    target: v.optional(
      v.object({
        vfbId: v.string(),
        label: v.string(),
        entityType: v.optional(v.string()),
      }),
    ),
    durationMin: v.optional(v.number()),
    params: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("in_progress"), v.literal("completed")),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ویرایش آزمایش ابتدا وارد حساب شوید.");
    const row = await ctx.db.get(args.id);
    if (!row) return { ok: true };
    if (row.userId !== user._id) throw new Error("دسترسی غیرمجاز.");
    // The fly must still belong to the caller.
    await requireOwnFly(ctx, user._id, row.flyId);

    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now };

    if (args.name !== undefined) {
      const name = clean(args.name, MAX_NAME);
      if (!name) throw new Error("نام آزمایش لازم است.");
      patch.name = name;
    }
    if (args.objective !== undefined) patch.objective = clean(args.objective, MAX_TEXT);
    if (args.condition !== undefined) patch.condition = clean(args.condition, MAX_TEXT);
    if (args.params !== undefined) patch.params = clean(args.params, MAX_TEXT);
    if (args.durationMin !== undefined) patch.durationMin = clampDuration(args.durationMin);
    if (args.stimulusKind !== undefined) patch.stimulusKind = args.stimulusKind;
    if (args.stimulusIntensity !== undefined) {
      patch.stimulusIntensity = clampIntensity(args.stimulusIntensity);
    }
    if (args.target !== undefined) {
      patch.target = args.target
        ? {
            vfbId: args.target.vfbId.slice(0, 128),
            label: args.target.label.slice(0, 200),
            entityType: args.target.entityType?.slice(0, 80),
            source: "Virtual Fly Brain",
            accessedAt: now,
          }
        : undefined;
    }
    if (args.status !== undefined) {
      patch.status = args.status;
      patch.completedAt = args.status === "completed" ? now : undefined;
    }

    await ctx.db.patch(args.id, patch);
    return { ok: true };
  },
});

export const deleteExperiment = mutation({
  args: { id: v.id("flyExperiments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const row = await ctx.db.get(args.id);
    if (!row) return { ok: true };
    if (row.userId !== user._id) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});
