import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { isAnyAdmin } from "./admin";

// Students report a question they believe was designed wrongly after finishing
// an exam. Admins (system + site) review the reports in the console.

export const submitExamReport = mutation({
  args: {
    examId: v.id("exams"),
    questionId: v.id("questions"),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای گزارش خطا باید وارد شوید.");
    const comment = args.comment.trim();
    if (comment.length < 5) {
      throw new Error("توضیح گزارش را بنویسید (حداقل ۵ کاراکتر).");
    }

    const exam = await ctx.db.get(args.examId);
    if (!exam) throw new Error("آزمون یافت نشد.");
    if (!exam.questionIds.includes(args.questionId)) {
      throw new Error("سؤال انتخاب‌شده متعلق به این آزمون نیست.");
    }

    // Only students who actually took this exam may report.
    const attempt = await ctx.db
      .query("examAttempts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("examId"), args.examId))
      .first();
    if (!attempt) throw new Error("برای گزارش خطا باید در این آزمون شرکت کرده باشید.");

    // Idempotent: one open report per user + question.
    const existing = await ctx.db
      .query("examReports")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("examId"), args.examId),
          q.eq(q.field("questionId"), args.questionId),
          q.eq(q.field("status"), "open"),
        ),
      )
      .first();
    if (existing) return { ok: true, duplicate: true };

    await ctx.db.insert("examReports", {
      userId: user._id,
      examId: args.examId,
      questionId: args.questionId,
      comment,
      status: "open",
      createdAt: Date.now(),
    });
    return { ok: true, duplicate: false };
  },
});

export const listExamReports = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const reports = await ctx.db.query("examReports").collect();
    const out = [];
    for (const r of reports.sort((a, b) => b.createdAt - a.createdAt)) {
      const [question, exam, user] = await Promise.all([
        ctx.db.get(r.questionId),
        ctx.db.get(r.examId),
        ctx.db.get(r.userId),
      ]);
      out.push({
        _id: r._id,
        comment: r.comment,
        status: r.status,
        createdAt: r.createdAt,
        questionText: question?.text ?? "سؤال حذف‌شده",
        examTitle: exam?.title ?? "آزمون حذف‌شده",
        userName: user?.name ?? "کاربر حذف‌شده",
        userEmail: user?.email ?? "—",
      });
    }
    return out;
  },
});

export const resolveExamReport = mutation({
  args: { reportId: v.id("examReports") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("گزارش یافت نشد.");
    await ctx.db.patch(args.reportId, { status: "resolved" });
    return { ok: true };
  },
});

export const deleteExamReport = mutation({
  args: { reportId: v.id("examReports") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.delete(args.reportId);
    return { ok: true };
  },
});
