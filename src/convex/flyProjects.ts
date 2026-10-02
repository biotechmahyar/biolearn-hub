/**
 * Drosophila Virtual Lab — research projects backend (Phase E)
 * ─────────────────────────────────────────────────────────────────────────────
 * A *research project* is the student's own framing of a piece of work: one
 * fly, a question, a hypothesis, and several experiments underneath it.
 *
 * Two things this backend deliberately refuses to do:
 *
 *   • It does not compute statistics. No p-values, no correlation
 *     coefficients, no "significant difference" language. With a handful of
 *     student observations, any such number would look rigorous and mean
 *     nothing. `projectSummary` returns *counts only* so the report layer can
 *     say what exists without inventing what it implies.
 *
 *   • It does not treat the hypothesis as a result. `question` and
 *     `hypothesis` are stored as the student's words and the UI badges them
 *     HYPOTHESIS everywhere.
 *
 * Everything is scoped to the signed-in student, and `flyId` is verified on
 * every write, so one student can never group experiments under another
 * student's project.
 */
import { v } from "convex/values";
import type { GenericId } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./users";

const MAX_TITLE = 120;
const MAX_TEXT = 2000;
const MAX_PROJECTS_PER_FLY = 12;

type ProjectStatus = "draft" | "active" | "completed";

function clean(value: string | undefined, max: number): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed.slice(0, max) : undefined;
}

const EMPTY_SUMMARY = {
  experiments: 0,
  completedExperiments: 0,
  observations: 0,
  observationsWithRealData: 0,
  measurementKeys: [] as string[],
  sources: [] as string[],
};

/** Verify the fly belongs to this student. */
async function requireOwnFly(
  ctx: QueryCtx | MutationCtx,
  userId: GenericId<"users">,
  flyId: GenericId<"virtualFlies">,
) {
  const fly = await ctx.db.get(flyId);
  if (!fly) throw new Error("مگس یافت نشد.");
  if (fly.userId !== userId) throw new Error("دسترسی غیرمجاز.");
  return fly;
}

// ── Queries ─────────────────────────────────────────────────────────────────

export const listMyProjects = query({
  args: { flyId: v.optional(v.id("virtualFlies")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("flyProjects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return rows
      .filter((row) => !args.flyId || row.flyId === args.flyId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Counts only. Everything numeric that reaches the student has to come from a
 * stored Virtual Fly Brain readout, so this returns the *keys* that were
 * measured and never a derived statistic.
 */
export const projectSummary = query({
  args: { projectId: v.id("flyProjects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return EMPTY_SUMMARY;
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) return EMPTY_SUMMARY;

    const experiments = await ctx.db
      .query("flyExperiments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const keys: string[] = [];
    const sources: string[] = [];
    let observations = 0;
    let withReal = 0;

    for (const experiment of experiments) {
      const observationsOfExperiment = await ctx.db
        .query("flyObservations")
        .withIndex("by_experiment", (q) => q.eq("experimentId", experiment._id))
        .collect();
      observations += observationsOfExperiment.length;
      for (const obs of observationsOfExperiment) {
        const evidence = obs.evidence;
        if (!evidence || evidence.measurements.length === 0) continue;
        withReal += 1;
        if (!sources.includes(evidence.source)) sources.push(evidence.source);
        for (const m of evidence.measurements) {
          if (!keys.includes(m.key)) keys.push(m.key);
        }
      }
    }

    return {
      experiments: experiments.length,
      completedExperiments: experiments.filter((e) => e.status === "completed").length,
      observations,
      observationsWithRealData: withReal,
      measurementKeys: keys,
      sources,
    };
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const createProject = mutation({
  args: {
    flyId: v.id("virtualFlies"),
    title: v.string(),
    question: v.string(),
    hypothesis: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ساخت پروژه ابتدا وارد حساب شوید.");
    await requireOwnFly(ctx, user._id, args.flyId);

    const title = clean(args.title, MAX_TITLE);
    if (!title) throw new Error("عنوان پروژه لازم است.");
    const question = clean(args.question, MAX_TEXT);
    if (!question) throw new Error("پرسش پژوهش لازم است.");
    const hypothesis = clean(args.hypothesis, MAX_TEXT);
    if (!hypothesis) throw new Error("فرضیه لازم است.");

    const existing = await ctx.db
      .query("flyProjects")
      .withIndex("by_fly", (q) => q.eq("flyId", args.flyId))
      .collect();
    if (existing.length >= MAX_PROJECTS_PER_FLY) {
      throw new Error("سقف تعداد پروژه‌ها برای هر مگس پر شده است.");
    }

    const now = Date.now();
    return await ctx.db.insert("flyProjects", {
      userId: user._id,
      flyId: args.flyId,
      title,
      question,
      hypothesis,
      status: "active" as ProjectStatus,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateProject = mutation({
  args: {
    id: v.id("flyProjects"),
    title: v.optional(v.string()),
    question: v.optional(v.string()),
    hypothesis: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("active"), v.literal("completed"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ویرایش پروژه ابتدا وارد حساب شوید.");
    const row = await ctx.db.get(args.id);
    if (!row) return { ok: true };
    if (row.userId !== user._id) throw new Error("دسترسی غیرمجاز.");

    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now };
    if (args.title !== undefined) {
      const title = clean(args.title, MAX_TITLE);
      if (!title) throw new Error("عنوان پروژه لازم است.");
      patch.title = title;
    }
    if (args.question !== undefined) {
      const question = clean(args.question, MAX_TEXT);
      if (!question) throw new Error("پرسش پژوهش لازم است.");
      patch.question = question;
    }
    if (args.hypothesis !== undefined) {
      const hypothesis = clean(args.hypothesis, MAX_TEXT);
      if (!hypothesis) throw new Error("فرضیه لازم است.");
      patch.hypothesis = hypothesis;
    }
    if (args.status !== undefined) {
      patch.status = args.status;
      patch.completedAt = args.status === "completed" ? now : undefined;
    }

    await ctx.db.patch(args.id, patch);
    return { ok: true };
  },
});

export const deleteProject = mutation({
  args: { id: v.id("flyProjects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const row = await ctx.db.get(args.id);
    if (!row) return { ok: true };
    if (row.userId !== user._id) throw new Error("دسترسی غیرمجاز.");

    // Detach the project's experiments first so nothing is orphaned.
    const experiments = await ctx.db
      .query("flyExperiments")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const experiment of experiments) {
      await ctx.db.patch(experiment._id, { projectId: undefined, updatedAt: Date.now() });
    }

    await ctx.db.delete(args.id);
    return { ok: true };
  },
});