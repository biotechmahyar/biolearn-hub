/**
 * Drosophila Virtual Flies — backend
 * ─────────────────────────────────────────────────────────────────────────────
 * A *virtual fly* is Genova's own research object, not a copy of any VFB
 * record. It holds the student's metadata (species / sex / age / genotype /
 * phenotype / status) plus an optional anchor to a **real** Virtual Fly Brain
 * entity so the fly can be traced back to its scientific source:
 *
 *   brainModel = { vfbId, label, entityType, source, accessedAt }
 *
 * Nothing about the fly's brain is stored here beyond that provenance block —
 * the actual anatomy, neurons, images and connectivity keep coming live from
 * the VFBquery API through `src/services/vfb/`.
 *
 * Every query and mutation is scoped to the signed-in student: one student can
 * never read or modify another student's flies.
 */
import { v } from "convex/values";
import type { GenericId } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getCurrentUser } from "./users";

/** Longest accepted free-text values — keeps one row from bloating a query. */
const MAX_NAME = 80;
const MAX_GENOTYPE = 200;
const MAX_PHENOTYPE = 400;
const MAX_NOTES = 2000;
const MAX_AGE_DAYS = 365;
const MAX_FLYES_PER_USER = 60;

/** The only species the Drosophila lab works with in this phase. */
const DEFAULT_SPECIES = "Drosophila melanogaster";

/** Allowed values — the schema is the source of truth; these mirror it. */
type FlySex = "female" | "male" | "unknown";
type FlyStatus = "healthy" | "experimental" | "modified";

function clean(value: string | undefined, max: number): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed.slice(0, max) : undefined;
}

function clampAge(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_AGE_DAYS, Math.max(0, Math.round(value)));
}

/**
 * Per-student sequential id: FLY-001, FLY-002, …
 * Counted across archived rows too, so an id is never reused or ambiguous.
 */
async function nextGenovaFlyId(ctx: MutationCtx, userId: GenericId<"users">): Promise<string> {
  const rows = await ctx.db
    .query("virtualFlies")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const highest = rows.reduce((max, row) => {
    const n = Number.parseInt(row.genovaFlyId.replace(/^FLY-/, ""), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `FLY-${String(highest + 1).padStart(3, "0")}`;
}

// ── Queries ─────────────────────────────────────────────────────────────────

/** Every fly of the signed-in student, newest first. */
export const listMyFlies = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("virtualFlies")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return rows
      .filter((row) => args.includeArchived || !row.archived)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Aggregate counters for the "My Laboratory" header. */
export const myFlySummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { total: 0, active: 0, archived: 0, anchored: 0 };
    const rows = await ctx.db
      .query("virtualFlies")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return {
      total: rows.length,
      active: rows.filter((r) => !r.archived).length,
      archived: rows.filter((r) => r.archived).length,
      anchored: rows.filter((r) => Boolean(r.brainModel)).length,
    };
  },
});

/** One fly by id — returns null for a fly that is not the caller's. */
export const getMyFly = query({
  args: { id: v.id("virtualFlies") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const fly = await ctx.db.get(args.id);
    if (!fly || fly.userId !== user._id) return null;
    return fly;
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const createFly = mutation({
  args: {
    name: v.optional(v.string()),
    species: v.optional(v.string()),
    sex: v.optional(v.union(v.literal("female"), v.literal("male"), v.literal("unknown"))),
    ageDays: v.number(),
    genotype: v.optional(v.string()),
    phenotype: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.union(v.literal("healthy"), v.literal("experimental"), v.literal("modified"))),
    brainModel: v.optional(
      v.object({
        vfbId: v.string(),
        label: v.string(),
        entityType: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ساخت مگس مجازی ابتدا وارد حساب شوید.");

    const existing = await ctx.db
      .query("virtualFlies")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    if (existing.length >= MAX_FLYES_PER_USER) {
      throw new Error("سقف تعداد مگس‌های مجازی در این آزمایشگاه پر شده است.");
    }

    const genovaFlyId = await nextGenovaFlyId(ctx, user._id);
    const now = Date.now();

    return await ctx.db.insert("virtualFlies", {
      userId: user._id,
      genovaFlyId,
      name: clean(args.name, MAX_NAME) ?? `Fly ${genovaFlyId.replace("FLY-", "#")}`,
      species: clean(args.species, MAX_NAME) ?? DEFAULT_SPECIES,
      sex: (args.sex ?? "unknown") as FlySex,
      ageDays: clampAge(args.ageDays),
      genotype: clean(args.genotype, MAX_GENOTYPE),
      phenotype: clean(args.phenotype, MAX_PHENOTYPE),
      notes: clean(args.notes, MAX_NOTES),
      status: (args.status ?? "healthy") as FlyStatus,
      // Provenance is stamped on the server: the label/keyword comes from the
      // VFB response the student picked, the timestamp is ours.
      brainModel: args.brainModel
        ? {
            vfbId: args.brainModel.vfbId.slice(0, 128),
            label: args.brainModel.label.slice(0, 200),
            entityType: args.brainModel.entityType?.slice(0, 80),
            source: "Virtual Fly Brain",
            accessedAt: now,
          }
        : undefined,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateFly = mutation({
  args: {
    id: v.id("virtualFlies"),
    name: v.optional(v.string()),
    species: v.optional(v.string()),
    sex: v.optional(v.union(v.literal("female"), v.literal("male"), v.literal("unknown"))),
    ageDays: v.optional(v.number()),
    genotype: v.optional(v.string()),
    phenotype: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.union(v.literal("healthy"), v.literal("experimental"), v.literal("modified"))),
    brainModel: v.optional(
      v.object({
        vfbId: v.string(),
        label: v.string(),
        entityType: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ویرایش مگس ابتدا وارد حساب شوید.");

    const fly = await ctx.db.get(args.id);
    if (!fly || fly.userId !== user._id) throw new Error("دسترسی غیرمجاز.");

    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now };

    if (args.name !== undefined) patch.name = clean(args.name, MAX_NAME) ?? fly.name;
    if (args.species !== undefined) patch.species = clean(args.species, MAX_NAME) ?? fly.species;
    if (args.sex !== undefined) patch.sex = args.sex;
    if (args.ageDays !== undefined) patch.ageDays = clampAge(args.ageDays);
    if (args.genotype !== undefined) patch.genotype = clean(args.genotype, MAX_GENOTYPE);
    if (args.phenotype !== undefined) patch.phenotype = clean(args.phenotype, MAX_PHENOTYPE);
    if (args.notes !== undefined) patch.notes = clean(args.notes, MAX_NOTES);
    if (args.status !== undefined) patch.status = args.status;
    if (args.brainModel !== undefined) {
      patch.brainModel = args.brainModel
        ? {
            vfbId: args.brainModel.vfbId.slice(0, 128),
            label: args.brainModel.label.slice(0, 200),
            entityType: args.brainModel.entityType?.slice(0, 80),
            source: "Virtual Fly Brain",
            accessedAt: now,
          }
        : undefined;
    }

    await ctx.db.patch(args.id, patch);
    return args.id;
  },
});

/** Archive / restore — keeps the scientific record, hides it from the bench. */
export const archiveFly = mutation({
  args: { id: v.id("virtualFlies"), archived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const fly = await ctx.db.get(args.id);
    if (!fly || fly.userId !== user._id) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.patch(args.id, {
      archived: args.archived ?? !fly.archived,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Permanently remove one of my own flies. */
export const deleteFly = mutation({
  args: { id: v.id("virtualFlies") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const fly = await ctx.db.get(args.id);
    if (!fly) return { ok: true };
    if (fly.userId !== user._id) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});
