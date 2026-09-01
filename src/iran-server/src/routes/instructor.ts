// @ts-nocheck
import { Context } from "hono";
import { db } from "../db.js";
import { courses, classRooms, instructorPayments, instructorSuggestedCourses, classResources, classEnrollments, users, announcements } from "../schema.js";
import { eq, desc, and } from "drizzle-orm";

// ── RBAC Helper ────────────────────────────────────────────────────────────
function requireInstructor(c: any) {
  const user = c.get("user");
  if (!user || !["instructor", "admin", "site_admin"].includes(user.role)) {
    return c.json({ ok: false, error: "Instructor access required" }, 403);
  }
  return null;
}

// ── MY COURSES ─────────────────────────────────────────────────────────────
export async function getMyCourses(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const user = c.get("user");
  const rows = await db.select().from(courses)
    .where(eq(courses.instructorId, user.id))
    .orderBy(desc(courses.createdAt));
  return c.json({ ok: true, data: rows });
}

// ── MY CLASSES ─────────────────────────────────────────────────────────────
export async function getInstructorClasses(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const user = c.get("user");
  const rows = await db.select().from(classRooms)
    .where(eq(classRooms.instructorId, user.id))
    .orderBy(desc(classRooms.createdAt));
  return c.json({ ok: true, data: rows });
}

export async function createClass(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const user = c.get("user");
  const body = await c.req.json();
  const id = `class_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(classRooms)// @ts-ignore.values({
    id,
    title: body.title,
    topic: body.topic,
    description: body.description,
    instructorId: user.id,
    courseId: body.courseId,
    scheduledDate: body.scheduledDate,
    status: "scheduled",
    createdAt: Date.now(),
  });
  return c.json({ ok: true, data: { id } });
}

export async function updateClass(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();

  // Verify ownership
  const existing = await db.select().from(classRooms)
    .where(and(eq(classRooms.id, id), eq(classRooms.instructorId, user.id)));
  if (existing.length === 0) {
    return c.json({ ok: false, error: "Class not found or not yours" }, 404);
  }

  await db.update(classRooms).set(body as any).where(eq(classRooms.id, id));
  return c.json({ ok: true });
}

export async function cancelClass(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const user = c.get("user");
  const id = c.req.param("id");
  await db.update(classRooms).set({ status: "cancelled" })
    .where(and(eq(classRooms.id, id), eq(classRooms.instructorId, user.id)));
  return c.json({ ok: true });
}

export async function deleteClass(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const user = c.get("user");
  const id = c.req.param("id");
  await db.delete(classRooms)
    .where(and(eq(classRooms.id, id), eq(classRooms.instructorId, user.id)));
  return c.json({ ok: true });
}

// ── CLASS RESOURCES ────────────────────────────────────────────────────────
export async function getClassResources(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const user = c.get("user");
  const courseId = c.req.query("courseId");
  const classRoomId = c.req.query("classRoomId");

  let where = eq(classResources.userId, user.id);
  if (courseId) where = and(where, eq(classResources.courseId, courseId))!;
  if (classRoomId) where = and(where, eq(classResources.classRoomId, classRoomId))!;

  const rows = await db.select().from(classResources).where(where).orderBy(desc(classResources.createdAt));
  return c.json({ ok: true, data: rows });
}

export async function addClassResource(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const user = c.get("user");
  const body = await c.req.json();
  const id = `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(classResources)// @ts-ignore.values({
    id,
    userId: user.id,
    title: body.title,
    description: body.description,
    type: body.type || "file",
    url: body.url,
    fileType: body.fileType,
    fileSize: body.fileSize,
    price: body.price || 0,
    free: body.free !== false,
    courseId: body.courseId,
    classRoomId: body.classRoomId,
    published: true,
    createdAt: Date.now(),
  });
  return c.json({ ok: true, data: { id } });
}

export async function updateClassResource(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  await db.update(classResources).set(body as any)
    .where(and(eq(classResources.id, id), eq(classResources.userId, user.id)));
  return c.json({ ok: true });
}

export async function deleteClassResource(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const user = c.get("user");
  const id = c.req.param("id");
  await db.delete(classResources)
    .where(and(eq(classResources.id, id), eq(classResources.userId, user.id)));
  return c.json({ ok: true });
}

// ── MY STUDENTS ────────────────────────────────────────────────────────────
export async function getMyStudents(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const user = c.get("user");
  // Get courses taught by this instructor
  const myCourses = await db.select().from(courses).where(eq(courses.instructorId, user.id));
  const courseIds = myCourses.map((c) => c.id);
  if (courseIds.length === 0) return c.json({ ok: true, data: [] });

  // Get enrolled students
  const enrollmentsList = await db.select().from(classEnrollments);
  const relevantEnrollments = enrollmentsList.filter((e) => {
    const cls = myCourses.find((co) => co.id === e.classRoomId);
    return !!cls;
  });

  const studentIds = [...new Set(relevantEnrollments.map((e) => e.userId))];
  const students = await db.select().from(users);
  const myStudents = students.filter((s) => studentIds.includes(s.id));
  return c.json({ ok: true, data: myStudents });
}

// ── PAYMENT HISTORY ────────────────────────────────────────────────────────
export async function getMyPayments(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const user = c.get("user");
  const rows = await db.select().from(instructorPayments)
    .where(eq(instructorPayments.instructorId, user.id))
    .orderBy(desc(instructorPayments.createdAt));
  return c.json({ ok: true, data: rows });
}

// ── ANNOUNCEMENTS ──────────────────────────────────────────────────────────
export async function getInstructorAnnouncements(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
  return c.json({ ok: true, data: rows });
}

export async function createAnnouncement(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const body = await c.req.json();
  const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(announcements)// @ts-ignore.values({
    id,
    title: body.title,
    body: body.body,
    link: body.link,
    audience: body.audience || "all",
    published: true,
    createdAt: Date.now(),
  });
  return c.json({ ok: true, data: { id } });
}

export async function deleteAnnouncement(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const id = c.req.param("id");
  await db.delete(announcements).where(eq(announcements.id, id));
  return c.json({ ok: true });
}

// ── SUGGESTED COURSES ──────────────────────────────────────────────────────
export async function getMySuggestedCourses(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const user = c.get("user");
  const suggested = await db.select().from(instructorSuggestedCourses)
    .where(eq(instructorSuggestedCourses.instructorId, user.id));
  const allCourses = await db.select().from(courses);
  const mine = allCourses.filter((c) => suggested.some((s) => s.courseId === c.id));
  const catalog = allCourses.filter((c) => c.published);
  return c.json({ ok: true, data: { mine, catalog: catalog.map((c) => ({ ...c, suggested: suggested.some((s) => s.courseId === c.id) })) } });
}

export async function toggleSuggestedCourse(c: Context) {
  const deny = requireInstructor(c); if (deny) return deny;
  const user = c.get("user");
  const body = await c.req.json();
  const existing = await db.select().from(instructorSuggestedCourses)
    .where(and(eq(instructorSuggestedCourses.instructorId, user.id), eq(instructorSuggestedCourses.courseId, body.courseId)));
  if (existing.length > 0) {
    await db.delete(instructorSuggestedCourses)
      .where(and(eq(instructorSuggestedCourses.instructorId, user.id), eq(instructorSuggestedCourses.courseId, body.courseId)));
  } else {
    const id = `isg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.insert(instructorSuggestedCourses)// @ts-ignore.values({ id, instructorId: user.id, courseId: body.courseId, createdAt: Date.now() });
  }
  return c.json({ ok: true });
}
