/**
 * ژن‌آموز (Genotab) — learner API.
 * ─────────────────────────────────────────────────────────────────────────────
 * Queries send only *sanitised* exercises (no answers, no explanations).
 * Mutations grade every response against the server-side curriculum and are the
 * only path that can award XP, complete a lesson or pass an exam.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import {
  ALL_LESSONS,
  CELL_BIOLOGY_REFERENCES,
  CHAPTERS,
  COURSES,
  chapterExamPool,
  chapterById,
  courseExamPool,
  exerciseById,
  lessonById,
  lessonsOfChapter,
  lessonsOfCourse,
  SUBJECT_LIST,
} from "./genotab/index";
import type { Exercise } from "./genotab/model";
import {
  CHAPTER_XP,
  COURSE_XP,
  DAILY_GOAL_XP,
  EXERCISE_XP,
  HEARTS_PER_DAY,
  LESSON_XP,
  PASS_RATIO,
  PERFECT_XP,
  correctAnswerText,
  dayKey,
  gradeExercise,
  grantXp,
  parseResponse,
  previousDayKey,
  publicExercise,
  sampleExercises,
  spendHeart,
  startOfMonth,
  startOfWeek,
  statsSnapshot,
  touchStreak,
} from "./genotabCore";

const answerValidator = v.array(v.object({ exerciseId: v.string(), response: v.string() }));

const ACHIEVEMENTS = [
  { id: "first-lesson", title: "اولین قدم", desc: "اولین درس را کامل کن", icon: "🌱", test: (s: any) => s.lessons >= 1 },
  { id: "five-lessons", title: "در مسیر", desc: "۵ درس را کامل کن", icon: "📘", test: (s: any) => s.lessons >= 5 },
  { id: "chapter-one", title: "فصلنامه", desc: "یک فصل را با آزمون کامل کن", icon: "🧩", test: (s: any) => s.chapters >= 1 },
  { id: "half-course", title: "نیمهٔ راه", desc: "۱۰ درس از دوره را کامل کن", icon: "⛰️", test: (s: any) => s.lessons >= 10 },
  { id: "course-done", title: "زیست‌شناس سلولی", desc: "دورهٔ زیست‌شناسی سلولی را تمام کن", icon: "🏅", test: (s: any) => s.courseDone },
  { id: "xp-500", title: "۵۰۰ XP", desc: "۵۰۰ امتیاز تجربه جمع کن", icon: "⚡", test: (s: any) => s.totalXp >= 500 },
  { id: "streak-3", title: "سه روز پیوسته", desc: "۳ روز پشت‌سرهم یاد بگیر", icon: "🔥", test: (s: any) => s.longestStreak >= 3 },
  { id: "streak-7", title: "هفتهٔ کامل", desc: "۷ روز پشت‌سرهم یاد بگیر", icon: "🗓️", test: (s: any) => s.longestStreak >= 7 },
  { id: "perfect", title: "بی‌نقص", desc: "یک آزمون درس را بدون خطا بگذران", icon: "💯", test: (s: any) => s.perfectCount >= 1 },
  { id: "accuracy", title: "دقت بالا", desc: "۵۰ پاسخ درست ثبت کن", icon: "🎯", test: (s: any) => s.correctAnswers >= 50 },
];

/** Everything the Genotab home screen needs, in one reactive query. */
export const home = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const progress = user
      ? await ctx.db
          .query("genotabProgress")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect()
      : [];
    const completed = new Set(progress.filter((row) => row.status === "completed").map((row) => row.lessonId));
    const attempts = user
      ? await ctx.db
          .query("genotabExamAttempts")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect()
      : [];
    const wrong = user
      ? await ctx.db
          .query("genotabWrongAnswers")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect()
      : [];
    const xpRows = user
      ? await ctx.db
          .query("genotabXp")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect()
      : [];
    const stats = await statsSnapshot(ctx, user?._id ?? null);

    const chapterSummary = CHAPTERS.map((chapter) => {
      const lessonIds = lessonsOfChapter(chapter.id).map((lesson) => lesson.id);
      const done = lessonIds.filter((id) => completed.has(id)).length;
      const examPassed = attempts.some(
        (attempt) => attempt.kind === "chapter" && attempt.chapterId === chapter.id && attempt.passed,
      );
      return { id: chapter.id, titleFa: chapter.titleFa, titleEn: chapter.titleEn, total: lessonIds.length, done, examPassed };
    });

    const course = COURSES[0];
    const courseLessons = lessonsOfCourse(course.slug);
    const courseCompleted = courseLessons.filter((lesson) => completed.has(lesson.id)).length;
    const nextLesson = courseLessons.find((lesson) => !completed.has(lesson.id)) ?? null;
    const chapterDone = chapterSummary.filter((row) => row.examPassed).length;
    const courseExamPassed = attempts.some((attempt) => attempt.kind === "course" && attempt.passed);
    const perfectCount = progress.filter(
      (row) => row.assessmentTotal != null && row.assessmentScore === row.assessmentTotal,
    ).length;
    const correctAnswers = xpRows.filter((row) => row.reason === "exercise").length;

    const achievementCtx = {
      lessons: courseCompleted,
      chapters: chapterDone,
      courseDone: courseExamPassed,
      totalXp: stats.totalXp,
      longestStreak: stats.longestStreak,
      perfectCount,
      correctAnswers,
    };

    return {
      signedIn: Boolean(user),
      userName: user?.name ?? null,
      stats,
      reviewCount: wrong.filter((row) => !row.resolvedAt).length,
      chapters: chapterSummary,
      course: {
        slug: course.slug,
        titleFa: course.titleFa,
        titleEn: course.titleEn,
        description: course.description,
        level: course.level,
        hours: course.hours,
        prerequisites: course.prerequisites,
        total: courseLessons.length,
        done: courseCompleted,
        percent: Math.round((courseCompleted / Math.max(1, courseLessons.length)) * 100),
        examPassed: courseExamPassed,
        nextLessonId: nextLesson?.id ?? null,
        chapters: chapterSummary,
      },
      subjects: SUBJECT_LIST.map((subject) => {
        const isPublished = subject.status === "published";
        return {
          id: subject.id,
          titleFa: subject.titleFa,
          titleEn: subject.titleEn,
          phase: subject.phase,
          blurb: subject.blurb,
          icon: subject.icon,
          status: subject.status,
          courseSlug: subject.courseSlugs[0] ?? null,
          plannedLessons: 20,
          doneLessons: isPublished ? courseCompleted : 0,
        };
      }),
      achievements: ACHIEVEMENTS.map(({ id, title, desc, icon, test }) => ({
        id,
        title,
        desc,
        icon,
        earned: test(achievementCtx),
      })),
      totals: {
        lessons: ALL_LESSONS.length,
        bankQuestions: ALL_LESSONS.reduce((sum, lesson) => sum + lesson.bank.length, 0),
        dailyGoal: DAILY_GOAL_XP,
      },
    };
  },
});

/** Sequential path for one course: which lesson is open, what is done. */
export const coursePath = query({
  args: { courseSlug: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const course = COURSES.find((candidate) => candidate.slug === args.courseSlug);
    if (!course) return null;
    const progress = user
      ? await ctx.db
          .query("genotabProgress")
          .withIndex("by_user_course", (q) => q.eq("userId", user._id).eq("courseSlug", args.courseSlug))
          .collect()
      : [];
    const byLesson = new Map(progress.map((row) => [row.lessonId, row]));
    const attempts = user
      ? await ctx.db
          .query("genotabExamAttempts")
          .withIndex("by_user_course", (q) => q.eq("userId", user._id).eq("courseSlug", args.courseSlug))
          .collect()
      : [];

    let previousCompleted = true; // the first lesson is always open
    const chapters = CHAPTERS.filter((chapter) => chapter.courseSlug === course.slug).map((chapter) => {
      const lessons = lessonsOfChapter(chapter.id).map((lesson) => {
        const row = byLesson.get(lesson.id);
        const completed = row?.status === "completed";
        const unlocked = previousCompleted;
        previousCompleted = completed;
        return {
          id: lesson.id,
          order: lesson.order,
          titleFa: lesson.titleFa,
          titleEn: lesson.titleEn,
          level: lesson.level,
          minutes: lesson.minutes,
          completed,
          unlocked,
          score: row?.assessmentScore ?? null,
          total: row?.assessmentTotal ?? null,
        };
      });
      const examAttempts = attempts.filter((a) => a.kind === "chapter" && a.chapterId === chapter.id);
      const best = examAttempts.reduce((max, a) => Math.max(max, Math.round((a.score / Math.max(1, a.total)) * 100)), 0);
      return {
        id: chapter.id,
        order: chapter.order,
        titleFa: chapter.titleFa,
        titleEn: chapter.titleEn,
        description: chapter.description,
        lessons,
        examUnlocked: lessons.length > 0 && lessons.every((lesson) => lesson.completed),
        examPassed: attempts.some((a) => a.kind === "chapter" && a.chapterId === chapter.id && a.passed),
        examBestPercent: best,
      };
    });

    const allLessons = lessonsOfCourse(course.slug);
    const done = allLessons.filter((lesson) => byLesson.get(lesson.id)?.status === "completed").length;
    return {
      slug: course.slug,
      titleFa: course.titleFa,
      titleEn: course.titleEn,
      description: course.description,
      level: course.level,
      hours: course.hours,
      prerequisites: course.prerequisites,
      total: allLessons.length,
      done,
      percent: Math.round((done / Math.max(1, allLessons.length)) * 100),
      chapters,
      examUnlocked: chapters.length > 0 && chapters.every((chapter) => chapter.examPassed),
      examPassed: attempts.some((a) => a.kind === "course" && a.passed),
      stats: await statsSnapshot(ctx, user?._id ?? null),
    };
  },
});

function resolveRefs(keys: string[]) {
  return keys
    .map((key) => CELL_BIOLOGY_REFERENCES[key])
    .filter(Boolean)
    .map(({ label, url, note }) => ({ label, url, note }));
}

/** One lesson: sanitised content + the learner's resume point. */
export const lessonView = query({
  args: { lessonId: v.string() },
  handler: async (ctx, args) => {
    const lesson = lessonById(args.lessonId);
    if (!lesson) return null;
    const user = await getCurrentUser(ctx);
    const progress = user
      ? await ctx.db
          .query("genotabProgress")
          .withIndex("by_user_lesson", (q) => q.eq("userId", user._id).eq("lessonId", lesson.id))
          .unique()
      : null;
    // A fresh, seeded sample of the bank keeps repeat attempts varied.
    const seed = (Date.now() % 100000) + lesson.order * 31;
    const assessment = sampleExercises(lesson.bank, 5, seed);
    return {
      id: lesson.id,
      courseSlug: lesson.courseSlug,
      chapterId: lesson.chapterId,
      order: lesson.order,
      titleFa: lesson.titleFa,
      titleEn: lesson.titleEn,
      level: lesson.level,
      minutes: lesson.minutes,
      intro: lesson.intro,
      why: lesson.why,
      objectives: lesson.objectives,
      cards: lesson.cards,
      practical: lesson.practical ?? null,
      practice: lesson.practice.map((exercise) => publicExercise(exercise, seed)),
      assessment: assessment.map((exercise) => publicExercise(exercise, seed)),
      summary: lesson.summary,
      refs: resolveRefs(lesson.refs),
      progress: progress
        ? {
            status: progress.status,
            cardIndex: progress.cardIndex,
            completedExerciseIds: progress.completedExerciseIds,
            assessmentScore: progress.assessmentScore ?? null,
            assessmentTotal: progress.assessmentTotal ?? null,
          }
        : null,
      stats: await statsSnapshot(ctx, user?._id ?? null),
    };
  },
});

/** Chapter (15 q) or final (30 q) exam — answers stripped, no retry limit. */
export const examView = query({
  args: { kind: v.union(v.literal("chapter"), v.literal("course")), chapterId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (args.kind === "chapter" && !args.chapterId) return null;
    const chapter = args.kind === "chapter" ? chapterById(args.chapterId ?? "") : null;
    if (args.kind === "chapter" && !chapter) return null;
    const pool = chapter ? chapterExamPool(chapter.id) : courseExamPool(COURSES[0].slug);
    const count = chapter ? 15 : 30;
    const seed = (Date.now() % 90000) + (chapter?.order ?? 9) * 17;
    const questions = sampleExercises(pool, count, seed);
    const attempts = user
      ? await ctx.db
          .query("genotabExamAttempts")
          .withIndex("by_user_course", (q) => q.eq("userId", user._id).eq("courseSlug", COURSES[0].slug))
          .collect()
      : [];
    const relevant = attempts.filter((a) => a.kind === args.kind && (args.kind === "course" || a.chapterId === chapter?.id));
    return {
      kind: args.kind,
      titleFa: chapter ? `آزمون فصل — ${chapter.titleFa}` : "آزمون جامع دورهٔ زیست‌شناسی سلولی",
      chapterId: chapter?.id ?? null,
      count: questions.length,
      passCount: Math.ceil(questions.length * PASS_RATIO),
      questions: questions.map((exercise) => publicExercise(exercise, seed)),
      attempts: relevant.length,
      bestPercent: relevant.reduce((max, a) => Math.max(max, Math.round((a.score / Math.max(1, a.total)) * 100)), 0),
      passed: relevant.some((a) => a.passed),
      stats: await statsSnapshot(ctx, user?._id ?? null),
    };
  },
});

/** Missed questions, newest first (spec §7 «مرور پاسخ‌های غلط»). */
export const reviewQueue = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { items: [], total: 0 };
    const rows = await ctx.db
      .query("genotabWrongAnswers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const open = rows.filter((row) => !row.resolvedAt).sort((a, b) => b.createdAt - a.createdAt);
    return {
      total: open.length,
      items: open.slice(0, 40).map((row) => ({
        id: row._id,
        lessonId: row.lessonId,
        lessonTitle: lessonById(row.lessonId)?.titleFa ?? row.lessonId,
        prompt: row.prompt,
        correctAnswer: row.correctAnswer,
        explanation: row.explanation,
        reviewCount: row.reviewCount,
        createdAt: row.createdAt,
      })),
    };
  },
});

/** Weekly / monthly XP board (only display names and XP are exposed). */
export const leaderboard = query({
  args: { period: v.union(v.literal("week"), v.literal("month")) },
  handler: async (ctx, args) => {
    const since = args.period === "week" ? startOfWeek() : startOfMonth();
    const rows = await ctx.db.query("genotabXp").withIndex("by_created", (q) => q.gte("createdAt", since)).collect();
    const totals = new Map<string, number>();
    for (const row of rows) {
      const key = String(row.userId);
      totals.set(key, (totals.get(key) ?? 0) + row.amount);
    }
    const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const items = [];
    for (const [userId, xp] of top) {
      const profile = await ctx.db.get(userId as any);
      items.push({ userId, name: (profile as any)?.name ?? "دانشجوی ژن‌آموز", xp });
    }
    return { period: args.period, since, items };
  },
});

/** Persist the resume point while reading the cards. */
export const saveCard = mutation({
  args: { lessonId: v.string(), cardIndex: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ادامهٔ درس وارد حساب شوید.");
    const lesson = lessonById(args.lessonId);
    if (!lesson) throw new Error("درس یافت نشد.");
    const index = Math.max(0, Math.min(Math.round(args.cardIndex), lesson.cards.length - 1));
    const existing = await ctx.db
      .query("genotabProgress")
      .withIndex("by_user_lesson", (q) => q.eq("userId", user._id).eq("lessonId", lesson.id))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { cardIndex: index, updatedAt: now });
    } else {
      await ctx.db.insert("genotabProgress", {
        userId: user._id,
        courseSlug: lesson.courseSlug,
        lessonId: lesson.id,
        chapterId: lesson.chapterId,
        status: "started",
        cardIndex: index,
        completedExerciseIds: [],
        attempts: 0,
        xpEarned: 0,
        startedAt: now,
        updatedAt: now,
      });
    }
    return { ok: true };
  },
});

/**
 * Grade ONE exercise (practice or assessment). Wrong answers cost a heart and
 * enter the review queue; a first-time correct answer is worth 5 XP.
 */
export const gradeOne = mutation({
  args: { exerciseId: v.string(), response: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای پاسخ‌دادن وارد حساب شوید.");
    let found: { lessonId: string; exercise: Exercise } | null = null;
    for (const lesson of ALL_LESSONS) {
      const exercise = exerciseById(lesson, args.exerciseId);
      if (exercise) {
        found = { lessonId: lesson.id, exercise };
        break;
      }
    }
    if (!found) throw new Error("این تمرین یافت نشد.");
    const { lessonId, exercise } = found;
    const lesson = lessonById(lessonId)!;
    const correct = gradeExercise(exercise, parseResponse(args.response));

    let xp = 0;
    let hearts = HEARTS_PER_DAY;
    let alreadyDone = false;

    if (correct) {
      const progress = await ctx.db
        .query("genotabProgress")
        .withIndex("by_user_lesson", (q) => q.eq("userId", user._id).eq("lessonId", lessonId))
        .unique();
      alreadyDone = Boolean(progress?.completedExerciseIds.includes(exercise.id));
      if (!alreadyDone) {
        const now = Date.now();
        if (progress) {
          await ctx.db.patch(progress._id, {
            completedExerciseIds: [...progress.completedExerciseIds, exercise.id],
            xpEarned: progress.xpEarned + EXERCISE_XP,
            updatedAt: now,
          });
        } else {
          await ctx.db.insert("genotabProgress", {
            userId: user._id,
            courseSlug: lesson.courseSlug,
            lessonId,
            chapterId: lesson.chapterId,
            status: "started",
            cardIndex: 0,
            completedExerciseIds: [exercise.id],
            attempts: 0,
            xpEarned: EXERCISE_XP,
            startedAt: now,
            updatedAt: now,
          });
        }
        xp = await grantXp(ctx, user._id, EXERCISE_XP, "exercise", { lessonId });
      }
      const snapshot = await statsSnapshot(ctx, user._id);
      hearts = snapshot.hearts;
    } else {
      const spent = await spendHeart(ctx, user._id);
      hearts = spent.hearts;
      const existing = await ctx.db
        .query("genotabWrongAnswers")
        .withIndex("by_user_exercise", (q) => q.eq("userId", user._id).eq("exerciseId", exercise.id))
        .unique();
      const now = Date.now();
      if (existing) {
        await ctx.db.patch(existing._id, {
          reviewCount: existing.reviewCount + 1,
          resolvedAt: undefined,
          createdAt: now,
        });
      } else {
        await ctx.db.insert("genotabWrongAnswers", {
          userId: user._id,
          courseSlug: lesson.courseSlug,
          chapterId: lesson.chapterId,
          lessonId,
          exerciseId: exercise.id,
          prompt: exercise.prompt,
          correctAnswer: correctAnswerText(exercise),
          explanation: exercise.explain,
          reviewCount: 0,
          createdAt: now,
        });
      }
    }

    return {
      correct,
      explain: exercise.explain,
      correctAnswer: correctAnswerText(exercise),
      xp,
      hearts,
      alreadyDone,
    };
  },
});

/** Grade the 5-question assessment, complete the lesson, award XP + streak. */
export const completeLesson = mutation({
  args: { lessonId: v.string(), answers: answerValidator },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای تکمیل درس وارد حساب شوید.");
    const lesson = lessonById(args.lessonId);
    if (!lesson) throw new Error("درس یافت نشد.");

    // Grade against the real bank entries named in the submission.
    const graded = args.answers
      .map((answer) => {
        const exercise = exerciseById(lesson, answer.exerciseId);
        if (!exercise) return null;
        return {
          exerciseId: exercise.id,
          correct: gradeExercise(exercise, parseResponse(answer.response)),
          correctAnswer: correctAnswerText(exercise),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (graded.length === 0) throw new Error("پاسخ‌های آزمون خالی است.");
    const score = graded.filter((row) => row.correct).length;
    const total = graded.length;
    const perfect = score === total;

    const existing = await ctx.db
      .query("genotabProgress")
      .withIndex("by_user_lesson", (q) => q.eq("userId", user._id).eq("lessonId", lesson.id))
      .unique();
    const firstCompletion = !existing || existing.status !== "completed";
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "completed",
        assessmentScore: score,
        assessmentTotal: total,
        attempts: existing.attempts + 1,
        completedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("genotabProgress", {
        userId: user._id,
        courseSlug: lesson.courseSlug,
        lessonId: lesson.id,
        chapterId: lesson.chapterId,
        status: "completed",
        cardIndex: lesson.cards.length - 1,
        completedExerciseIds: [],
        assessmentScore: score,
        assessmentTotal: total,
        attempts: 1,
        xpEarned: 0,
        startedAt: now,
        completedAt: now,
        updatedAt: now,
      });
    }

    let xpEarned = 0;
    if (firstCompletion) {
      xpEarned += await grantXp(ctx, user._id, LESSON_XP, "lesson", { lessonId: lesson.id });
      if (perfect) {
        xpEarned += await grantXp(ctx, user._id, PERFECT_XP, "perfect_assessment", { lessonId: lesson.id });
      }
    }
    const streakInfo = await touchStreak(ctx, user._id);

    const courseLessons = lessonsOfCourse(lesson.courseSlug);
    const doneRows = await ctx.db
      .query("genotabProgress")
      .withIndex("by_user_course", (q) => q.eq("userId", user._id).eq("courseSlug", lesson.courseSlug))
      .collect();
    const doneIds = new Set(doneRows.filter((row) => row.status === "completed").map((row) => row.lessonId));
    const nextLesson = courseLessons.find((candidate) => !doneIds.has(candidate.id)) ?? null;

    return {
      score,
      total,
      percent: Math.round((score / Math.max(1, total)) * 100),
      perfect,
      firstCompletion,
      xpEarned,
      streak: streakInfo.streak,
      answers: graded,
      nextLessonId: nextLesson?.id ?? null,
      stats: await statsSnapshot(ctx, user._id),
    };
  },
});

/** Grade a chapter (15) or final (30) exam. Passing is required for XP. */
export const submitExam = mutation({
  args: {
    kind: v.union(v.literal("chapter"), v.literal("course")),
    chapterId: v.optional(v.string()),
    answers: answerValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای شرکت در آزمون وارد حساب شوید.");
    const chapter = args.kind === "chapter" ? chapterById(args.chapterId ?? "") : null;
    if (args.kind === "chapter" && !chapter) throw new Error("فصل یافت نشد.");
    const pool = chapter ? chapterExamPool(chapter.id) : courseExamPool(COURSES[0].slug);
    const allowed = new Map(pool.map((exercise) => [exercise.id, exercise]));

    const graded = args.answers
      .map((answer) => {
        const exercise = allowed.get(answer.exerciseId);
        if (!exercise) return null; // ignore ids outside this exam's pool
        return {
          exerciseId: exercise.id,
          correct: gradeExercise(exercise, parseResponse(answer.response)),
          correctAnswer: correctAnswerText(exercise),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (graded.length < 5) throw new Error("پاسخ‌های آزمون ناقص است.");
    const score = graded.filter((row) => row.correct).length;
    const total = graded.length;
    const passCount = Math.ceil(total * PASS_RATIO);
    const passed = score >= passCount;

    const previous = await ctx.db
      .query("genotabExamAttempts")
      .withIndex("by_user_course", (q) => q.eq("userId", user._id).eq("courseSlug", COURSES[0].slug))
      .collect();
    const alreadyPassed = previous.some(
      (attempt) => attempt.kind === args.kind && (args.kind === "course" || attempt.chapterId === chapter?.id) && attempt.passed,
    );

    await ctx.db.insert("genotabExamAttempts", {
      userId: user._id,
      courseSlug: COURSES[0].slug,
      kind: args.kind,
      chapterId: chapter?.id,
      score,
      total,
      passed,
      createdAt: Date.now(),
    });

    let xpEarned = 0;
    if (passed && !alreadyPassed) {
      xpEarned = await grantXp(ctx, user._id, chapter ? CHAPTER_XP : COURSE_XP, chapter ? "chapter" : "course", {
        chapterId: chapter?.id,
        courseSlug: COURSES[0].slug,
      });
    }

    // Wrong answers from exams also join the review queue.
    const now = Date.now();
    for (const row of graded.filter((entry) => !entry.correct).slice(0, 20)) {
      const exercise = allowed.get(row.exerciseId);
      if (!exercise) continue;
      const sourceLesson = ALL_LESSONS.find((lesson) => exerciseById(lesson, exercise.id));
      if (!sourceLesson) continue;
      await ctx.db.insert("genotabWrongAnswers", {
        userId: user._id,
        courseSlug: sourceLesson.courseSlug,
        chapterId: sourceLesson.chapterId,
        lessonId: sourceLesson.id,
        exerciseId: exercise.id,
        prompt: exercise.prompt,
        correctAnswer: row.correctAnswer,
        explanation: exercise.explain,
        reviewCount: 0,
        createdAt: now,
      });
    }

    return {
      score,
      total,
      percent: Math.round((score / Math.max(1, total)) * 100),
      passCount,
      passed,
      firstPass: passed && !alreadyPassed,
      xpEarned,
      answers: graded,
      stats: await statsSnapshot(ctx, user._id),
    };
  },
});

/** Mark a reviewed mistake as resolved. */
export const resolveMistake = mutation({
  args: { id: v.id("genotabWrongAnswers") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("دسترسی غیرمجاز.");
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== user._id) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.patch(args.id, { resolvedAt: Date.now() });
    return { ok: true };
  },
});

/** Curriculum facts for the header (no student data). */
export const curriculum = query({
  args: {},
  handler: async () => ({
    subjects: SUBJECT_LIST.map((subject) => ({ id: subject.id, titleFa: subject.titleFa, status: subject.status })),
    chapters: CHAPTERS.map((chapter) => ({ id: chapter.id, titleFa: chapter.titleFa, lessons: chapter.lessonIds.length })),
    lessons: ALL_LESSONS.length,
    nextDay: previousDayKey(dayKey()),
  }),
});
