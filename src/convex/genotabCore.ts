/**
 * ژن‌آموز (Genotab) — server-side learning rules.
 * ─────────────────────────────────────────────────────────────────────────────
 * The answers never leave the server except as feedback after grading, and the
 * client can only submit a *response* (not a verdict): every correctness claim
 * is recomputed here from the versioned curriculum.
 */
import type { Exercise } from "./genotab/model";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const HEARTS_PER_DAY = 5;
export const DAILY_GOAL_XP = 30;
export const LESSON_XP = 10;
export const EXERCISE_XP = 5;
export const PERFECT_XP = 15;
export const CHAPTER_XP = 50;
export const COURSE_XP = 150;
export const PASS_RATIO = 0.7;

const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;

/** YYYY-MM-DD in Tehran time (streaks and daily caps use local days). */
export function dayKey(ts: number = Date.now()): string {
  return new Date(ts + TEHRAN_OFFSET_MS).toISOString().slice(0, 10);
}

export function previousDayKey(key: string): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function startOfWeek(ts: number = Date.now()): number {
  const date = new Date(ts + TEHRAN_OFFSET_MS);
  const dow = date.getUTCDay(); // 0 = Sunday; Iranian week starts Saturday
  const back = (dow + 1) % 7;
  date.setUTCDate(date.getUTCDate() - back);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime() - TEHRAN_OFFSET_MS;
}

export function startOfMonth(ts: number = Date.now()): number {
  const date = new Date(ts + TEHRAN_OFFSET_MS);
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime() - TEHRAN_OFFSET_MS;
}

/** Persian-aware normalisation for typed answers (ZWNJ, Arabic yeh/kaf, spaces). */
export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u200c\u200e\u200f]/g, "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/\s+/g, " ");
}

export type Response = number | number[] | boolean | string | string[] | null;

/** Parse the client's JSON-encoded response; invalid JSON becomes null (= wrong). */
export function parseResponse(raw: string): Response {
  try {
    const value = JSON.parse(raw);
    if (value === null) return null;
    if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
    if (Array.isArray(value)) {
      if (value.every((item) => typeof item === "number")) return value as number[];
      if (value.every((item) => typeof item === "string")) return value as string[];
    }
    return null;
  } catch {
    return null;
  }
}

const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort((x, y) => x - y).every((value, i) => value === [...b].sort((x, y) => x - y)[i]);

/** Authoritative grading — the only place correctness is decided. */
export function gradeExercise(exercise: Exercise, response: Response): boolean {
  switch (exercise.kind) {
    case "single":
      return typeof response === "number" && response === exercise.answer;
    case "multi":
      return Array.isArray(response) && response.every((v) => typeof v === "number") && sameSet(response as number[], exercise.answers);
    case "truefalse":
      return typeof response === "boolean" && response === exercise.answer;
    case "fill": {
      if (typeof response !== "string") return false;
      const given = normalizeAnswer(response);
      if (given.length < 1) return false;
      return exercise.accept.some((accepted) => normalizeAnswer(accepted) === given);
    }
    case "order":
      return (
        Array.isArray(response) &&
        response.length === exercise.items.length &&
        response.every((item, i) => item === exercise.items[i])
      );
    case "match":
      return (
        Array.isArray(response) &&
        response.length === exercise.pairs.length &&
        response.every((right, i) => right === exercise.pairs[i].right)
      );
    default:
      return false;
  }
}

/** Human-readable correct answer, shown only after a submission. */
export function correctAnswerText(exercise: Exercise): string {
  switch (exercise.kind) {
    case "single":
      return exercise.options[exercise.answer] ?? "";
    case "multi":
      return exercise.answers.map((i) => exercise.options[i]).filter(Boolean).join("، ");
    case "truefalse":
      return exercise.answer ? "درست" : "نادرست";
    case "fill":
      return exercise.accept[0] ?? "";
    case "order":
      return exercise.items.join(" ← ");
    case "match":
      return exercise.pairs.map((pair) => `${pair.left} → ${pair.right}`).join(" • ");
    default:
      return "";
  }
}

type PublicExercise = {
  id: string;
  kind: Exercise["kind"];
  prompt: string;
  options?: string[];
  lefts?: string[];
  rights?: string[];
  items?: string[];
};

function shuffled<T>(source: T[], seed: number): T[] {
  const out = [...source];
  let state = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    state = (state * 48271) % 2147483647;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Strip answers/explanations before sending an exercise to a learner. */
export function publicExercise(exercise: Exercise, seed = 7): PublicExercise {
  const base = { id: exercise.id, kind: exercise.kind, prompt: exercise.prompt };
  switch (exercise.kind) {
    case "single":
      return { ...base, options: exercise.options };
    case "multi":
      return { ...base, options: exercise.options };
    case "order":
      // Shuffled copy; the correct order stays on the server.
      return { ...base, items: shuffled(exercise.items, seed + exercise.id.length) };
    case "match":
      return {
        ...base,
        lefts: exercise.pairs.map((pair) => pair.left),
        rights: shuffled(exercise.pairs.map((pair) => pair.right), seed + exercise.id.length),
      };
    default:
      return base;
  }
}

/** Random-ish sample without repetition (seed keeps one request coherent). */
export function sampleExercises<T>(pool: T[], count: number, seed: number): T[] {
  return shuffled(pool, seed).slice(0, Math.min(count, pool.length));
}

export interface StatsShape {
  totalXp: number;
  streak: number;
  longestStreak: number;
  lastActiveDay: string;
  hearts: number;
  heartsDay: string;
  dailyGoal: number;
}

/** Read or lazily create the aggregate stats row. */
export async function getOrCreateStats(ctx: MutationCtx, userId: Id<"users">): Promise<any> {
  const existing = await ctx.db
    .query("genotabStats")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (existing) return existing as any;
  const now = Date.now();
  const id = await ctx.db.insert("genotabStats", {
    userId,
    totalXp: 0,
    streak: 0,
    longestStreak: 0,
    lastActiveDay: "",
    hearts: HEARTS_PER_DAY,
    heartsDay: dayKey(now),
    dailyGoal: DAILY_GOAL_XP,
    createdAt: now,
    updatedAt: now,
  });
  return (await ctx.db.get(id)) as any;
}

/** Apply XP and keep the aggregate row in sync. */
export async function grantXp(
  ctx: MutationCtx,
  userId: Id<"users">,
  amount: number,
  reason: "exercise" | "lesson" | "perfect_assessment" | "chapter" | "course" | "daily_challenge",
  extra: { lessonId?: string; chapterId?: string; courseSlug?: string } = {},
): Promise<number> {
  if (amount <= 0) return 0;
  const stats = await getOrCreateStats(ctx, userId);
  await ctx.db.insert("genotabXp", {
    userId,
    amount,
    reason,
    lessonId: extra.lessonId,
    chapterId: extra.chapterId,
    courseSlug: extra.courseSlug,
    dayKey: dayKey(),
    createdAt: Date.now(),
  });
  await ctx.db.patch(stats._id, {
    totalXp: (stats.totalXp ?? 0) + amount,
    updatedAt: Date.now(),
  });
  return amount;
}

/** Called when a lesson is completed: streak + daily activity bookkeeping. */
export async function touchStreak(ctx: MutationCtx, userId: Id<"users">) {
  const stats = await getOrCreateStats(ctx, userId);
  const today = dayKey();
  if (stats.lastActiveDay === today) return { streak: stats.streak, longestStreak: stats.longestStreak };
  const nextStreak = stats.lastActiveDay === previousDayKey(today) ? stats.streak + 1 : 1;
  const longest = Math.max(nextStreak, stats.longestStreak ?? 0);
  await ctx.db.patch(stats._id, {
    streak: nextStreak,
    longestStreak: longest,
    lastActiveDay: today,
    updatedAt: Date.now(),
  });
  return { streak: nextStreak, longestStreak: longest };
}

/** Hearts refill at the start of each day; a wrong answer costs one heart. */
export async function spendHeart(ctx: MutationCtx, userId: Id<"users">) {
  const stats = await getOrCreateStats(ctx, userId);
  const today = dayKey();
  let hearts = stats.heartsDay === today ? stats.hearts : HEARTS_PER_DAY;
  const hadHeart = hearts > 0;
  if (hadHeart) hearts -= 1;
  await ctx.db.patch(stats._id, { hearts, heartsDay: today, updatedAt: Date.now() });
  return { hearts, hadHeart };
}

/** Snapshot used by the UI (never exposes other students' data). */
export async function statsSnapshot(ctx: QueryCtx, userId: Id<"users"> | null) {
  if (!userId) {
    return {
      totalXp: 0,
      streak: 0,
      longestStreak: 0,
      hearts: HEARTS_PER_DAY,
      dailyGoal: DAILY_GOAL_XP,
      todayXp: 0,
      level: 1,
      levelProgress: 0,
    };
  }
  const stats = (await ctx.db
    .query("genotabStats")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique()) as any;
  const today = dayKey();
  const todayRows = await ctx.db
    .query("genotabXp")
    .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("dayKey", today))
    .collect();
  const todayXp = todayRows.reduce((sum, row) => sum + row.amount, 0);
  const totalXp = stats?.totalXp ?? 0;
  // A light, transparent level curve: each level costs 100 more XP than the last.
  const level = Math.max(1, Math.floor((-1 + Math.sqrt(1 + (8 * totalXp) / 50)) / 2) + 1);
  const baseForLevel = (level - 1) * level * 25;
  const nextForLevel = level * (level + 1) * 25;
  return {
    totalXp,
    streak: stats?.streak ?? 0,
    longestStreak: stats?.longestStreak ?? 0,
    hearts: stats?.heartsDay === today ? stats?.hearts ?? HEARTS_PER_DAY : HEARTS_PER_DAY,
    dailyGoal: stats?.dailyGoal ?? DAILY_GOAL_XP,
    todayXp,
    level,
    levelProgress:
      nextForLevel > baseForLevel
        ? Math.min(100, Math.round(((totalXp - baseForLevel) / (nextForLevel - baseForLevel)) * 100))
        : 0,
  };
}
