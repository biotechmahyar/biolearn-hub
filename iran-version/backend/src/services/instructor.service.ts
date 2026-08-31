import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  classRooms,
  attendance,
  courseResources,
  directMessages,
  instructorPayments,
  users,
  instructors,
  enrollments,
  courses,
} from "../db/schema.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../lib/errors.js";

// ─── Attendance ──────────────────────────────────────────────────────────────

export async function listInstructorRooms(instructorId: string) {
  const db = getDb();
  return db
    .select()
    .from(classRooms)
    .where(eq(classRooms.instructorId, instructorId))
    .orderBy(desc(classRooms.createdAt));
}

export async function getRoomStudents(roomId: string) {
  const db = getDb();
  return db
    .select()
    .from(attendance)
    .where(eq(attendance.roomId, roomId));
}

export async function markAttendance(
  roomId: string,
  userId: string,
  status: string,
  markedBy: string
) {
  const db = getDb();
  const now = Date.now();
  // Upsert
  const [existing] = await db
    .select()
    .from(attendance)
    .where(
      and(eq(attendance.roomId, roomId), eq(attendance.userId, userId))
    )
    .limit(1);
  if (existing) {
    const [updated] = await db
      .update(attendance)
      .set({ status, markedBy })
      .where(eq(attendance.id, existing.id))
      .returning();
    return updated;
  }
  const [record] = await db
    .insert(attendance)
    .values({ roomId, userId, status, markedBy, createdAt: now })
    .returning();
  return record;
}

// ─── Course Resources ────────────────────────────────────────────────────────

export async function listCourseResources(courseId: string) {
  const db = getDb();
  return db
    .select()
    .from(courseResources)
    .where(eq(courseResources.courseId, courseId))
    .orderBy(desc(courseResources.createdAt));
}

export async function addCourseResource(
  courseId: string,
  data: { title: string; url?: string; storageId?: string; type?: string; size?: number }
) {
  const db = getDb();
  const now = Date.now();
  const [resource] = await db
    .insert(courseResources)
    .values({ courseId, ...data, createdAt: now })
    .returning();
  return resource;
}

export async function deleteCourseResource(resourceId: string) {
  const db = getDb();
  await db.delete(courseResources).where(eq(courseResources.id, resourceId));
}

// ─── Direct Messages ─────────────────────────────────────────────────────────

export async function sendDirectMessage(
  senderId: string,
  receiverId: string,
  text: string
) {
  const db = getDb();
  const now = Date.now();
  const [msg] = await db
    .insert(directMessages)
    .values({ senderId, receiverId, text, read: false, createdAt: now })
    .returning();
  return msg;
}

export async function listConversations(userId: string) {
  const db = getDb();
  // Get distinct partners
  const sent = await db
    .select({ partnerId: directMessages.receiverId })
    .from(directMessages)
    .where(eq(directMessages.senderId, userId));
  const received = await db
    .select({ partnerId: directMessages.senderId })
    .from(directMessages)
    .where(eq(directMessages.receiverId, userId));

  const partnerIds = new Set<string>();
  sent.forEach((s) => partnerIds.add(s.partnerId));
  received.forEach((r) => partnerIds.add(r.partnerId));

  const partners: Array<{ id: string; name: string; avatarUrl: string | null }> = [];
  for (const pid of partnerIds) {
    const [user] = await db
      .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, pid))
      .limit(1);
    if (user) partners.push(user);
  }
  return partners;
}

export async function getConversation(userId: string, partnerId: string) {
  const db = getDb();
  return db
    .select()
    .from(directMessages)
    .where(
      and(
        eq(directMessages.senderId, userId),
        eq(directMessages.receiverId, partnerId)
      )
    )
    .orderBy(directMessages.createdAt);
}

export async function markConversationRead(userId: string, partnerId: string) {
  const db = getDb();
  await db
    .update(directMessages)
    .set({ read: true })
    .where(
      and(
        eq(directMessages.senderId, partnerId),
        eq(directMessages.receiverId, userId),
        eq(directMessages.read, false)
      )
    );
}

// ─── Instructor Payments ─────────────────────────────────────────────────────

export async function listInstructorPayments(instructorId: string) {
  const db = getDb();
  return db
    .select()
    .from(instructorPayments)
    .where(eq(instructorPayments.instructorId, instructorId))
    .orderBy(desc(instructorPayments.createdAt));
}

// ─── Performance Stats ───────────────────────────────────────────────────────

export async function getStudentPerformance(instructorId: string) {
  const db = getDb();
  const instructorCourses = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.instructorId, instructorId));

  const stats: Array<{ courseId: string; enrolled: number }> = [];
  for (const c of instructorCourses) {
    const ens = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.courseId, c.id));
    stats.push({ courseId: c.id, enrolled: ens.length });
  }
  return stats;
}

// ─── Bank Account ────────────────────────────────────────────────────────────

export async function getBankAccount(instructorId: string) {
  const db = getDb();
  const [inst] = await db
    .select()
    .from(instructors)
    .where(eq(instructors.id, instructorId))
    .limit(1);
  return inst || null;
}

export async function updateBankAccount(
  instructorId: string,
  data: { bankName?: string; bankAccountNumber?: string; bankCardNumber?: string; bankSheba?: string }
) {
  const db = getDb();
  const [inst] = await db
    .select({ userId: instructors.userId })
    .from(instructors)
    .where(eq(instructors.id, instructorId))
    .limit(1);
  if (!inst || !inst.userId) throw new NotFoundError("Instructor");
  await db.update(users).set({ ...data, updatedAt: Date.now() }).where(eq(users.id, inst.userId));
  return { success: true };
}
