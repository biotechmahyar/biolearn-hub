// @ts-nocheck
import { Context } from "hono";
import { db, generateId, now } from "../db.js";
import { classRooms } from "../schema.js";
import { eq, desc } from "drizzle-orm";

// GET /api/classes (list active/available classes)
export async function getClasses(c: Context) {
  try {
    const result = await db.select().from(classRooms).orderBy(desc(classRooms.createdAt));
    return c.json({ ok: true, data: result });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// GET /api/classes/:id
export async function getClass(c: Context) {
  const id = c.req.param("id");
  try {
    const result = await db.select().from(classRooms).where(eq(classRooms.id, id)).limit(1);
    if (result.length === 0) {
      return c.json({ ok: false, error: "کلاس یافت نشد" }, 404);
    }
    return c.json({ ok: true, data: result[0] });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// POST /api/classes/request (instructor requests a class)
export async function requestClass(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const { title, topic, description, proposedDate, courseId, immediate } = await c.req.json();
    const id = generateId();
    await db.insert(classRooms)// @ts-ignore.values({
      id,
      title: title || "کلاس جدید",
      topic,
      description,
      instructorId: userId,
      courseId,
      status: "requested",
      scheduledDate: immediate ? "فوری" : proposedDate,
      createdAt: now(),
    });
    return c.json({ ok: true, data: { id } });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}
