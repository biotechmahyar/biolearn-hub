// @ts-nocheck
import { Context } from "hono";
import { db, generateId, now } from "../db.js";
import {
  enrollments, courses, categories, instructors, examResults, questions, exams,
  flashcards, bookmarks, supportTickets, supportReplies, announcements,
  courseResources, classResources, users
} from "../schema.js";
import { eq, desc, and } from "drizzle-orm";

// ── ENROLLED COURSES ──────────────────────────────────────────────────────

// GET /api/dashboard/enrollments
export async function getMyEnrollments(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const rows = await db.select().from(enrollments).where(eq(enrollments.userId, userId)).orderBy(desc(enrollments.createdAt));
    // Enrich with course data
    const enriched = [];
    for (const e of rows) {
      const course = e.courseId ? await db.select().from(courses).where(eq(courses.id, e.courseId)).limit(1) : [];
      const cat = course[0]?.categoryId ? await db.select().from(categories).where(eq(categories.id, course[0].categoryId)).limit(1) : [];
      const inst = course[0]?.instructorId ? await db.select({ name: instructors.name, slug: instructors.slug }).from(instructors).where(eq(instructors.id, course[0].instructorId)).limit(1) : [];
      enriched.push({
        _id: e.id,
        courseId: e.courseId,
        enrolledAt: e.createdAt,
        completedLessons: e.completedLessons || [],
        percent: course[0]?.syllabus ? Math.round(((e.completedLessons || []).length / Math.max(course[0].syllabus.length, 1)) * 100) : 0,
        course: course[0] ? {
          _id: course[0].id,
          title: course[0].title,
          slug: course[0].slug,
          accent: course[0].accent || "teal",
          syllabus: course[0].syllabus || [],
          description: course[0].description,
          mode: course[0].mode,
          category: cat[0] || null,
          instructor: inst[0] || null,
        } : null,
      });
    }
    return c.json({ ok: true, data: enriched });
  } catch (error) {
    console.error("[DASHBOARD] Enrollments error:", error);
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── EXAM ATTEMPTS ──────────────────────────────────────────────────────────

// GET /api/dashboard/exam-attempts
export async function getMyExamAttempts(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const rows = await db.select().from(examResults).where(eq(examResults.userId, userId)).orderBy(desc(examResults.createdAt));
    const enriched = [];
    for (const a of rows) {
      const exam = a.examId ? await db.select().from(exams).where(eq(exams.id, a.examId)).limit(1) : [];
      enriched.push({
        _id: a.id,
        examId: a.examId,
        score: a.score,
        total: a.total,
        percent: a.total > 0 ? Math.round((a.score / a.total) * 100) : 0,
        finishedAt: a.completedAt || a.createdAt,
        startedAt: a.startedAt,
        answers: a.answers,
        exam: exam[0] ? { _id: exam[0].id, title: exam[0].title, slug: exam[0].slug } : null,
      });
    }
    return c.json({ ok: true, data: enriched });
  } catch (error) {
    console.error("[DASHBOARD] Attempts error:", error);
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── EXAM LIST ──────────────────────────────────────────────────────────────

// GET /api/dashboard/exams
export async function getExamList(c: Context) {
  try {
    const rows = await db.select().from(exams).where(eq(exams.published, true)).orderBy(exams.order);
    return c.json({ ok: true, data: rows });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── LEARNING PROFILE ──────────────────────────────────────────────────────

// GET /api/dashboard/learning-profile
export async function getLearningProfile(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const attempts = await db.select().from(examResults).where(eq(examResults.userId, userId));
    // Build topic breakdown from attempts
    const topicMap: Record<string, { topicId: string; topicName: string; correct: number; total: number }> = {};
    let totalAnswered = 0;
    let totalCorrect = 0;

    for (const a of attempts) {
      totalAnswered += a.total || 0;
      totalCorrect += a.score || 0;
    }

    // Get daily quiz points
    // Simplified - just return aggregate data
    const topics = Object.values(topicMap).map((t) => ({
      ...t,
      percent: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
      level: t.total > 0 ? (Math.round((t.correct / t.total) * 100) >= 70 ? "strong" : Math.round((t.correct / t.total) * 100) >= 40 ? "medium" : "weak") : "medium",
    }));

    return c.json({
      ok: true,
      data: {
        totalPoints: 0,
        totalAnswered,
        totalCorrect,
        topics,
      },
    });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── FLASHCARDS ─────────────────────────────────────────────────────────────

// GET /api/dashboard/flashcards
export async function getDashboardFlashcards(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const rows = await db.select().from(flashcards).where(eq(flashcards.userId, userId)).orderBy(desc(flashcards.createdAt));
    return c.json({ ok: true, data: rows.map((f) => ({ _id: f.id, front: f.front, back: f.back, category: f.category })) });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// POST /api/dashboard/flashcards
export async function addDashboardFlashcard(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const { front, back, category } = await c.req.json();
    const id = generateId();
    await db.insert(flashcards).values({ id, userId, front, back, category: category || "", createdAt: now() } as any);
    return c.json({ ok: true, data: { _id: id } });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// DELETE /api/dashboard/flashcards/:id
export async function deleteDashboardFlashcard(c: Context) {
  const id = c.req.param("id");
  try {
    await db.delete(flashcards).where(eq(flashcards.id, id));
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── BOOKMARKS ──────────────────────────────────────────────────────────────

// GET /api/dashboard/bookmarks
export async function getDashboardBookmarks(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const rows = await db.select().from(bookmarks).where(eq(bookmarks.userId, userId)).orderBy(desc(bookmarks.createdAt));
    // Enrich with content titles
    const enriched = [];
    for (const b of rows) {
      let item: any = { title: b.itemId };
      try {
        if (b.contentType === "course") {
          const c = await db.select({ id: courses.id, title: courses.title, slug: courses.slug }).from(courses).where(eq(courses.id, b.contentId)).limit(1);
          if (c[0]) item = c[0];
        } else if (b.contentType === "article") {
          const a = await db.select().from((await import("../schema.js")).articles).where(eq((await import("../schema.js")).articles.id, b.contentId)).limit(1);
          if (a[0]) item = { id: a[0].id, title: a[0].title, slug: a[0].slug };
        }
      } catch {}
      enriched.push({
        _id: b.id,
        contentType: b.contentType,
        contentId: b.contentId,
        item,
      });
    }
    return c.json({ ok: true, data: enriched });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── SUPPORT TICKETS ────────────────────────────────────────────────────────

// GET /api/dashboard/tickets
export async function getDashboardTickets(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const rows = await db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.createdAt));
    const enriched = [];
    for (const t of rows) {
      const replies = await db.select().from(supportReplies).where(eq(supportReplies.ticketId, t.id)).orderBy(supportReplies.createdAt);
      enriched.push({
        _id: t.id,
        subject: t.subject,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        messages: replies.map((r) => ({
          author: r.userId === userId ? "student" : "admin",
          text: r.body,
          at: r.createdAt,
        })),
      });
    }
    return c.json({ ok: true, data: enriched });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// POST /api/dashboard/tickets
export async function createDashboardTicket(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const { subject, message } = await c.req.json();
    const id = generateId();
    await db.insert(supportTickets).values({
      id, userId, subject, status: "open", createdAt: now(), updatedAt: now(),
    } as any);
    if (message) {
      const replyId = generateId();
      await db.insert(supportReplies).values({
        id: replyId, ticketId: id, userId, body: message, createdAt: now(),
      } as any);
    }
    return c.json({ ok: true, data: { _id: id } });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// POST /api/dashboard/tickets/:id/reply
export async function replyDashboardTicket(c: Context) {
  const userId = c.get("userId") as string;
  const ticketId = c.req.param("id");
  try {
    const { message } = await c.req.json();
    const id = generateId();
    await db.insert(supportReplies).values({
      id, ticketId, userId, body: message, createdAt: now(),
    } as any);
    await db.update(supportTickets).set({ status: "answered", updatedAt: now() }).where(eq(supportTickets.id, ticketId));
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────

// GET /api/dashboard/announcements
export async function getDashboardAnnouncements(c: Context) {
  try {
    const rows = await db.select().from(announcements).where(eq(announcements.published, true)).orderBy(desc(announcements.createdAt)).limit(20);
    return c.json({ ok: true, data: rows.map((a) => ({
      _id: a.id,
      title: a.title,
      body: a.body,
      targetType: a.audience || "all",
      targetTitle: null,
      authorName: "مدیر سایت",
      authorRole: "admin",
      createdAt: a.createdAt,
    })) });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── COURSE RESOURCES (downloads) ──────────────────────────────────────────

// GET /api/dashboard/downloads
export async function getDashboardDownloads(c: Context) {
  const userId = c.get("userId") as string;
  try {
    // Get enrolled course IDs
    const enrolled = await db.select().from(enrollments).where(eq(enrollments.userId, userId));
    const courseIds = enrolled.map((e) => e.courseId).filter(Boolean);

    if (courseIds.length === 0) {
      return c.json({ ok: true, data: [] });
    }

    const groups = [];
    for (const cid of courseIds) {
      const course = await db.select().from(courses).where(eq(courses.id, cid)).limit(1);
      const files = await db.select().from(classResources).where(eq(classResources.courseId, cid));
      if (course[0] && files.length > 0) {
        groups.push({
          courseId: cid,
          courseTitle: course[0].title,
          courseSlug: course[0].slug,
          files: files.map((f) => ({
            name: f.title,
            size: f.fileSize ? `${Math.round(f.fileSize / 1024)} KB` : "—",
            url: f.url || f.linkUrl,
          })),
        });
      }
    }
    return c.json({ ok: true, data: groups });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── DAILY QUIZ (simplified) ──────────────────────────────────────────────

// GET /api/dashboard/daily-quiz
export async function getDashboardDailyQuiz(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const today = new Date().toISOString().split("T")[0];
    // Check if user already answered today
    return c.json({
      ok: true,
      data: {
        date: today,
        question: null,
        myAnswer: null,
      },
    });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}
