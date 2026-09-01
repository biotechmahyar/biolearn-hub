import { Context } from "hono";
import { db } from "../db.js";
import { courses, categories, instructors, enrollments, orders } from "../schema.js";
import { eq, desc, like, and, sql } from "drizzle-orm";

// GET /api/content/courses
export async function getCourses(c: Context) {
  try {
    const result = await db
      .select()
      .from(courses)
      .where(eq(courses.published, true))
      .orderBy(desc(courses.createdAt));

    return c.json({ ok: true, data: result });
  } catch (error) {
    console.error("[COURSES] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت دوره‌ها" }, 500);
  }
}

// GET /api/content/courses/:slug
export async function getCourseBySlug(c: Context) {
  try {
    const slug = c.req.param("slug");
    const result = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);

    if (result.length === 0) {
      return c.json({ ok: false, error: "دوره یافت نشد" }, 404);
    }

    // Get instructor info
    const course = result[0];
    let instructor = null;
    if (course.instructorId) {
      const instResult = await db.select().from(instructors).where(eq(instructors.id, course.instructorId)).limit(1);
      instructor = instResult[0] || null;
    }

    // Get category info
    let category = null;
    if (course.categoryId) {
      const catResult = await db.select().from(categories).where(eq(categories.id, course.categoryId)).limit(1);
      category = catResult[0] || null;
    }

    return c.json({
      ok: true,
      data: { ...course, instructor, category },
    });
  } catch (error) {
    console.error("[COURSES] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت دوره" }, 500);
  }
}

// GET /api/content/categories
export async function getCategories(c: Context) {
  try {
    const result = await db.select().from(categories).orderBy(categories.order);
    return c.json({ ok: true, data: result });
  } catch (error) {
    console.error("[CATEGORIES] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت دسته‌بندی‌ها" }, 500);
  }
}

// GET /api/content/instructors
export async function getInstructors(c: Context) {
  try {
    const result = await db.select().from(instructors).where(eq(instructors.published, true));
    return c.json({ ok: true, data: result });
  } catch (error) {
    console.error("[INSTRUCTORS] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت اساتید" }, 500);
  }
}

// GET /api/content/instructors/:slug
export async function getInstructorBySlug(c: Context) {
  try {
    const slug = c.req.param("slug");
    const result = await db.select().from(instructors).where(eq(instructors.slug, slug)).limit(1);
    if (result.length === 0) {
      return c.json({ ok: false, error: "استاد یافت نشد" }, 404);
    }
    return c.json({ ok: true, data: result[0] });
  } catch (error) {
    console.error("[INSTRUCTORS] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت استاد" }, 500);
  }
}

// GET /api/enrollments (authenticated)
export async function getMyEnrollments(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const result = await db.select().from(enrollments).where(eq(enrollments.userId, userId));
    return c.json({ ok: true, data: result });
  } catch (error) {
    console.error("[ENROLLMENTS] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت ثبت‌نام‌ها" }, 500);
  }
}

// GET /api/orders (authenticated)
export async function getMyOrders(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const result = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
    return c.json({ ok: true, data: result });
  } catch (error) {
    console.error("[ORDERS] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت سفارشات" }, 500);
  }
}
