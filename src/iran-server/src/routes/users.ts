// @ts-nocheck
import { Context } from "hono";
import { db, generateId, now } from "../db.js";
import { users, bookmarks, flashcards, announcements, enrollments, classRooms } from "../schema.js";
import { eq, desc } from "drizzle-orm";

// ── PROFILE ───────────────────────────────────────────────────────────────

// GET /api/users/profile
export async function getProfile(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (result.length === 0) {
      return c.json({ ok: false, error: "کاربر یافت نشد" }, 404);
    }
    const u = result[0];
    return c.json({
      ok: true,
      data: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        secondaryRole: u.secondaryRole,
        avatarUrl: u.avatarUrl,
        firstName: u.firstName,
        lastName: u.lastName,
        about: u.about,
        phone: u.phone,
      },
    });
  } catch (error) {
    console.error("[USERS] Profile error:", error);
    return c.json({ ok: false, error: "خطا در دریافت پروفایل" }, 500);
  }
}

// PATCH /api/users/profile
export async function updateProfile(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const body = await c.req.json();
    const allowed = ["name", "firstName", "lastName", "about", "phone", "avatarUrl"];
    const updates: Record<string, unknown> = { updatedAt: now() };
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    await db.update(users).set(updates).where(eq(users.id, userId));
    return c.json({ ok: true, data: { message: "پروفایل بروزرسانی شد" } });
  } catch (error) {
    console.error("[USERS] Update error:", error);
    return c.json({ ok: false, error: "خطا در بروزرسانی پروفایل" }, 500);
  }
}

// ── ENROLLED CLASSES (for instructor dashboard) ────────────────────────────

// GET /api/users/my-classes
export async function getMyClasses(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const result = await db
      .select()
      .from(classRooms)
      .where(eq(classRooms.instructorId, userId))
      .orderBy(desc(classRooms.createdAt));
    return c.json({ ok: true, data: result });
  } catch (error) {
    console.error("[USERS] Classes error:", error);
    return c.json({ ok: false, error: "خطا در دریافت کلاس‌ها" }, 500);
  }
}

// GET /api/users/my-students
export async function getMyStudents(c: Context) {
  const userId = c.get("userId") as string;
  try {
    // Get courses taught by this instructor
    const { courses } = await import("../schema.js");
    const courseList = await db.select().from(courses).where(eq(courses.instructorId, userId));
    const courseIds = courseList.map((c) => c.id);

    if (courseIds.length === 0) {
      return c.json({ ok: true, data: [] });
    }

    // Get enrollments for those courses
    const enrollList = await db.select().from(enrollments).where(
      eq(enrollments.courseId, courseIds[0]) // simplified
    );
    return c.json({ ok: true, data: enrollList });
  } catch (error) {
    console.error("[USERS] Students error:", error);
    return c.json({ ok: false, error: "خطا در دریافت دانشجویان" }, 500);
  }
}

// ── BOOKMARKS ─────────────────────────────────────────────────────────────

// GET /api/bookmarks
export async function getBookmarks(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const result = await db.select().from(bookmarks).where(eq(bookmarks.userId, userId));
    return c.json({ ok: true, data: result });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// POST /api/bookmarks
export async function addBookmark(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const { itemType, itemId } = await c.req.json();
    const id = generateId();
    await db.insert(bookmarks)// @ts-ignore.values({ id, userId, itemType, itemId, createdAt: now() });
    return c.json({ ok: true, data: { id } });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// DELETE /api/bookmarks/:id
export async function removeBookmark(c: Context) {
  const userId = c.get("userId") as string;
  const id = c.req.param("id");
  try {
    await db.delete(bookmarks).where(eq(bookmarks.id, id));
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── FLASHCARDS ────────────────────────────────────────────────────────────

// GET /api/flashcards
export async function getFlashcards(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const result = await db.select().from(flashcards).where(eq(flashcards.userId, userId));
    return c.json({ ok: true, data: result });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// POST /api/flashcards
export async function addFlashcard(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const { category, front, back } = await c.req.json();
    const id = generateId();
    await db.insert(flashcards)// @ts-ignore.values({ id, userId, category, front, back, createdAt: now() });
    return c.json({ ok: true, data: { id } });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// DELETE /api/flashcards/:id
export async function removeFlashcard(c: Context) {
  const id = c.req.param("id");
  try {
    await db.delete(flashcards).where(eq(flashcards.id, id));
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────

// GET /api/announcements
export async function getAnnouncements(c: Context) {
  try {
    const result = await db
      .select()
      .from(announcements)
      .where(eq(announcements.published, true))
      .orderBy(desc(announcements.createdAt))
      .limit(20);
    return c.json({ ok: true, data: result });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}
