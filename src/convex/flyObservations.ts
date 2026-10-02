/**
 * Drosophila Virtual Lab — fly observations backend (Phase D)
 * ─────────────────────────────────────────────────────────────────────────────
 * An *observation* is what the student recorded under one of their own
 * experiments. It has two independent halves and the server keeps them apart:
 *
 *   evidence → REAL DATA. Numbers copied verbatim out of a Virtual Fly Brain
 *              HTTP response, together with the entity id, the source name and
 *              the moment they were read. The server validates the shape and
 *              stores it. It never computes, averages, rounds or fills in these
 *              values — a client that sends nothing gets nothing stored.
 *
 *   result   → the student's own written claim. It is a hypothesis, not a
 *              measurement, and the UI badges it as HYPOTHESIS everywhere.
 *
 * Nothing here contacts VFB. The HTTP call is made in the browser by
 * `src/services/vfb/labReadout.ts`, because VFB has no key and Convex would add
 * a network hop for no benefit. That also means the client is the untrusted
 * party here, so every field is re-validated and clamped server-side.
 *
 * Scoping: every read and write is limited to the signed-in student, and the
 * experiment → fly chain is verified on each mutation, so an observation can
 * never be attached to somebody else's experiment.
 */
import { v } from "convex/values";
import type { GenericId } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./users";

const MAX_NOTE = 2000;
const MAX_RESULT = 2000;
const MAX_MEASUREMENTS = 40;
const MAX_LABEL = 200;
const MAX_OBSERVATIONS_PER_EXPERIMENT = 200;
const MAX_DATASETS = 20;
const MAX_NOTES = 30;

type Method = "vfb_readout" | "lab" | "import";

interface EvidenceMeasurement {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

/** The exact shape stored in `flyObservations.evidence`. */
interface Evidence {
  entityId: string;
  entityLabel: string;
  source: string;
  accessedAt: number;
  found: boolean;
  measurements: EvidenceMeasurement[];
  datasets: string[];
  notes: string[];
}

/** Strip and clamp a free-text field; empty becomes `undefined`. */
function clean(value: string | undefined, max: number): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed.slice(0, max) : undefined;
}

function cleanId(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim();
  if (!/^[A-Za-z0-9_:.|-]{1,128}$/.test(trimmed)) return undefined;
  return trimmed;
}

function finite(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Re-validate the VFB evidence blob the client claims to have read.
 * Returns `undefined` when nothing usable is present, so an empty or malformed
 * payload can never be stored as if it were data.
 */
function normaliseEvidence(raw: unknown): Evidence | undefined {
  if (raw === null || typeof raw !== "object") return undefined;
  const e = raw as Record<string, unknown>;

  const entityId = cleanId(typeof e.entityId === "string" ? e.entityId : undefined);
  if (!entityId) return undefined;

  const rawMeasurements = Array.isArray(e.measurements) ? e.measurements : [];
  const seen = new Set<string>();
  const measurements: EvidenceMeasurement[] = [];
  for (const item of rawMeasurements) {
    if (measurements.length >= MAX_MEASUREMENTS) break;
    if (item === null || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;
    const key = typeof m.key === "string" ? m.key.trim().slice(0, 64) : "";
    const label = typeof m.label === "string" ? m.label.trim().slice(0, MAX_LABEL) : "";
    const value = finite(m.value as number | undefined);
    if (!key || !label || value === undefined || seen.has(key)) continue;
    seen.add(key);
    const unit = clean(m.unit as string | undefined, 40);
    measurements.push({ key, label, value, ...(unit ? { unit } : {}) });
  }

  const stringList = (input: unknown, max: number): string[] => {
    if (!Array.isArray(input)) return [];
    const out: string[] = [];
    for (const v0 of input) {
      const s = clean(typeof v0 === "string" ? v0 : undefined, MAX_LABEL);
      if (s && !out.includes(s) && out.length < max) out.push(s);
    }
    return out;
  };

  return {
    entityId,
    entityLabel: (clean(typeof e.entityLabel === "string" ? e.entityLabel : undefined, MAX_LABEL) ??
      entityId),
    // The source name is fixed server-side; a client cannot claim another origin.
    source: "Virtual Fly Brain",
    accessedAt: finite(e.accessedAt as number | undefined) ?? Date.now(),
    found: e.found === true,
    measurements,
    datasets: stringList(e.datasets, MAX_DATASETS),
    notes: stringList(e.notes, MAX_NOTES),
  };
}

/** Resolve an experiment and prove it belongs to this student. */
async function requireOwnExperiment(
  ctx: QueryCtx | MutationCtx,
  userId: GenericId<"users">,
  experimentId: GenericId<"flyExperiments">,
) {
  const experiment = await ctx.db.get(experimentId);
  if (!experiment) throw new Error("آزمایش یافت نشد.");
  if (experiment.userId !== userId) throw new Error("دسترسی غیرمجاز.");
  const fly = await ctx.db.get(experiment.flyId);
  if (!fly || fly.userId !== userId) throw new Error("دسترسی غیرمجاز.");
  return { experiment, fly };
}

// ── Queries ─────────────────────────────────────────────────────────────────

/** Observations of one experiment; `[]` when anonymous or the id is not yours. */
export const listMyObservations = query({
  args: { experimentId: v.optional(v.id("flyExperiments")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("flyObservations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return rows
      .filter((row) => !args.experimentId || row.experimentId === args.experimentId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const myObservationSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { total: 0, withRealEvidence: 0, withResult: 0 };
    const rows = await ctx.db
      .query("flyObservations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return {
      total: rows.length,
      withRealEvidence: rows.filter((r) => r.evidence?.measurements.length).length,
      withResult: rows.filter((r) => Boolean(r.result)).length,
    };
  },
});

/**
 * Read-only aggregate for the results panel.
 *
 * It reports **counts of what is stored** and the measurement keys seen. It does
 * not average, sum or compare anything — the panel shows the student the raw
 * values they recorded so any summary they write stays their own claim.
 */
export const experimentEvidenceSummary = query({
  args: { experimentId: v.id("flyExperiments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { observations: 0, realObservations: 0, keys: [] as string[], sources: [] as string[] };
    try {
      await requireOwnExperiment(ctx, user._id, args.experimentId);
    } catch {
      // Never leak whether somebody else's experiment id exists.
      return { observations: 0, realObservations: 0, keys: [] as string[], sources: [] as string[] };
    }

    const rows = await ctx.db
      .query("flyObservations")
      .withIndex("by_experiment", (q) => q.eq("experimentId", args.experimentId))
      .collect();

    const keys: string[] = [];
    const sources: string[] = [];
    let realObservations = 0;
    for (const row of rows) {
      const evidence = row.evidence;
      if (!evidence || evidence.measurements.length === 0) continue;
      realObservations += 1;
      if (!sources.includes(evidence.source)) sources.push(evidence.source);
      for (const m of evidence.measurements) {
        if (!keys.includes(m.key)) keys.push(m.key);
      }
    }
    return { observations: rows.length, realObservations, keys, sources };
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const createObservation = mutation({
  args: {
    experimentId: v.id("flyExperiments"),
    method: v.union(v.literal("vfb_readout"), v.literal("lab"), v.literal("import")),
    note: v.optional(v.string()),
    result: v.optional(v.string()),
    evidence: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ثبت مشاهده ابتدا وارد حساب شوید.");
    const { experiment } = await requireOwnExperiment(ctx, user._id, args.experimentId);

    const existing = await ctx.db
      .query("flyObservations")
      .withIndex("by_experiment", (q) => q.eq("experimentId", args.experimentId))
      .collect();
    if (existing.length >= MAX_OBSERVATIONS_PER_EXPERIMENT) {
      throw new Error("سقف تعداد مشاهده‌های این آزمایش پر شده است.");
    }

    const evidence = normaliseEvidence(args.evidence);
    // A readout claim with nothing in it is not an observation of real data.
    if (args.method === "vfb_readout" && (!evidence || evidence.measurements.length === 0)) {
      throw new Error(
        "برای ثبت «خوانش VFB» حداقل یک عدد واقعی لازم است. اگر VFB چیزی برنگرداند، آن را خالی ثبت کنید.",
      );
    }

    const now = Date.now();
    return await ctx.db.insert("flyObservations", {
      userId: user._id,
      experimentId: args.experimentId,
      flyId: experiment.flyId,
      note: clean(args.note, MAX_NOTE),
      evidence,
      method: args.method as Method,
      result: clean(args.result, MAX_RESULT),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateObservation = mutation({
  args: {
    id: v.id("flyObservations"),
    note: v.optional(v.string()),
    result: v.optional(v.string()),
    evidence: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ویرایش مشاهده ابتدا وارد حساب شوید.");
    const row = await ctx.db.get(args.id);
    if (!row) return { ok: true };
    if (row.userId !== user._id) throw new Error("دسترسی غیرمجاز.");
    await requireOwnExperiment(ctx, user._id, row.experimentId);

    const patch: {
      updatedAt: number;
      note?: string | undefined;
      result?: string | undefined;
      evidence?: Evidence | undefined;
    } = { updatedAt: Date.now() };
    if (args.note !== undefined) patch.note = clean(args.note, MAX_NOTE);
    if (args.result !== undefined) patch.result = clean(args.result, MAX_RESULT);
    if (args.evidence !== undefined) patch.evidence = normaliseEvidence(args.evidence);

    await ctx.db.patch(args.id, patch);
    return { ok: true };
  },
});

export const deleteObservation = mutation({
  args: { id: v.id("flyObservations") },
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