import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const weekStart = (date: Date) => {
  const start = new Date(date);
  const day = start.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setUTCDate(start.getUTCDate() - diff);
  return dayKey(start);
};

export const listMyPlans = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const plans = await ctx.db
      .query("studyPlans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    const start = weekStart(new Date());
    const end = dayKey(new Date());
    const logs = await ctx.db
      .query("studySessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return plans.map((plan) => {
      const planLogs = logs.filter((log) => log.planId === plan._id);
      return {
        ...plan,
        weeklyCompletedMinutes: planLogs
          .filter((log) => log.date >= start)
          .reduce((sum, log) => sum + log.minutes, 0),
        todayMinutes: planLogs
          .filter((log) => log.date === end)
          .reduce((sum, log) => sum + log.minutes, 0),
        sessionCount: planLogs.filter((log) => log.date >= start).length,
      };
    });
  },
});

export const listMyRecentSessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return ctx.db
      .query("studySessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(12);
  },
});

export const savePlan = mutation({
  args: {
    planId: v.optional(v.id("studyPlans")),
    subject: v.string(),
    courseId: v.optional(v.id("courses")),
    weeklyMinutes: v.number(),
    sessionsPerWeek: v.number(),
    color: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ساخت برنامه ابتدا وارد حساب شوید.");
    const subject = args.subject.trim();
    if (!subject) throw new Error("نام درس را وارد کنید.");
    if (args.weeklyMinutes < 30 || args.weeklyMinutes > 10000) {
      throw new Error("مطالعه هفتگی باید بین ۳۰ تا ۱۰٬۰۰۰ دقیقه باشد.");
    }
    if (args.sessionsPerWeek < 1 || args.sessionsPerWeek > 14) {
      throw new Error("تعداد جلسات هفتگی باید بین ۱ تا ۱۴ باشد.");
    }
    const now = Date.now();
    const values = {
      userId: user._id,
      subject,
      courseId: args.courseId,
      weeklyMinutes: Math.round(args.weeklyMinutes),
      sessionsPerWeek: Math.round(args.sessionsPerWeek),
      color: args.color || "sky",
      note: args.note?.trim() || undefined,
      updatedAt: now,
    };
    if (args.planId) {
      const existing = await ctx.db.get(args.planId);
      if (!existing || existing.userId !== user._id) throw new Error("برنامه پیدا نشد.");
      await ctx.db.patch(args.planId, values);
      return args.planId;
    }
    return ctx.db.insert("studyPlans", { ...values, createdAt: now });
  },
});

export const deletePlan = mutation({
  args: { planId: v.id("studyPlans") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== user._id) throw new Error("برنامه پیدا نشد.");
    const sessions = await ctx.db
      .query("studySessions")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();
    for (const session of sessions) await ctx.db.delete(session._id);
    await ctx.db.delete(args.planId);
  },
});

export const logSession = mutation({
  args: { planId: v.id("studyPlans"), minutes: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== user._id) throw new Error("برنامه پیدا نشد.");
    if (args.minutes < 5 || args.minutes > 720) throw new Error("مدت هر جلسه باید بین ۵ تا ۷۲۰ دقیقه باشد.");
    return ctx.db.insert("studySessions", {
      userId: user._id,
      planId: args.planId,
      date: dayKey(new Date()),
      minutes: Math.round(args.minutes),
      note: args.note?.trim() || undefined,
      createdAt: Date.now(),
    });
  },
});
