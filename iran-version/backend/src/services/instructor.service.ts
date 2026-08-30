/**
 * Service layer for Instructor Tools.
 * Mirrors: instructorTools.ts Convex mutations/queries.
 */
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  classRooms,
  roomMessages,
  attendance,
  courseResources,
  courses,
  directMessages,
  instructorPayments,
  users,
} from "../db/schema.js";

// ══════════════════════════════════════════════════════════════════════════════
// ── Attendance ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const attendanceService = {
  async listMyRooms(userId: string) {
    return db.select().from(classRooms).where(eq(classRooms.instructorId, userId));
  },

  async listRoomStudents(roomId: string) {
    const messages = await db.select().from(roomMessages).where(eq(roomMessages.roomId, roomId));
    const studentIds = [...new Set(messages.map((m) => m.userId))];
    const students = [];
    for (const id of studentIds) {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (rows[0]) students.push({ id: rows[0].id, name: rows[0].name ?? "\u2014" });
    }
    return students;
  },

  async getAttendance(roomId: string) {
    return db.select().from(attendance).where(eq(attendance.roomId, roomId));
  },

  async markAttendance(
    instructorId: string,
    data: { roomId: string; studentId: string; studentName: string; present: boolean; note?: string }
  ) {
    // Check if already marked
    const existing = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.roomId, data.roomId), eq(attendance.studentId, data.studentId)))
      .limit(1);

    if (existing[0]) {
      const [updated] = await db
        .update(attendance)
        .set({ present: data.present, note: data.note, markedAt: Date.now() })
        .where(eq(attendance.id, existing[0].id))
        .returning();
      return updated;
    }
    const [row] = await db
      .insert(attendance)
      .values({
        roomId: data.roomId,
        instructorId,
        studentId: data.studentId,
        studentName: data.studentName,
        present: data.present,
        note: data.note,
        markedAt: Date.now(),
      })
      .returning();
    return row;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Course Resources ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const resourceService = {
  async listByCourse(courseId: string) {
    return db.select().from(courseResources).where(eq(courseResources.courseId, courseId));
  },

  async add(
    instructorId: string,
    data: {
      courseId: string;
      title: string;
      description?: string;
      fileUrl: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      isFree: boolean;
    }
  ) {
    const [row] = await db
      .insert(courseResources)
      .values({
        courseId: data.courseId,
        instructorId,
        title: data.title,
        description: data.description,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        isFree: data.isFree,
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async delete(resourceId: string, userId: string, userRole: string) {
    const rows = await db.select().from(courseResources).where(eq(courseResources.id, resourceId)).limit(1);
    const resource = rows[0];
    if (!resource) throw new Error("فایل یافت نشد.");
    if (resource.instructorId !== userId && userRole !== "admin" && userRole !== "site_admin") {
      throw new Error("دسترسی ندارید.");
    }
    const [deleted] = await db.delete(courseResources).where(eq(courseResources.id, resourceId)).returning();
    return deleted;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Direct Messages ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const directMessageService = {
  async send(senderId: string, receiverId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("پیام خالی است.");
    const [row] = await db
      .insert(directMessages)
      .values({
        senderId,
        receiverId,
        text: trimmed,
        read: false,
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async listConversations(userId: string) {
    const received = await db
      .select()
      .from(directMessages)
      .where(eq(directMessages.receiverId, userId))
      .orderBy(desc(directMessages.createdAt))
      .limit(100);
    const sent = await db
      .select()
      .from(directMessages)
      .where(eq(directMessages.senderId, userId))
      .orderBy(desc(directMessages.createdAt))
      .limit(100);
    const all = [...received, ...sent].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    const conversations = new Map<string, any>();
    for (const msg of all) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!conversations.has(partnerId)) {
        const partnerRows = await db.select().from(users).where(eq(users.id, partnerId)).limit(1);
        conversations.set(partnerId, {
          partnerId,
          partnerName: partnerRows[0]?.name ?? "\u2014",
          lastMessage: msg.text,
          lastTime: msg.createdAt,
          unread: msg.receiverId === userId && !msg.read ? 1 : 0,
        });
      }
    }
    return [...conversations.values()];
  },

  async listConversation(userId: string, partnerId: string) {
    const received = await db
      .select()
      .from(directMessages)
      .where(and(eq(directMessages.receiverId, userId), eq(directMessages.senderId, partnerId)))
      .orderBy(directMessages.createdAt);
    const sent = await db
      .select()
      .from(directMessages)
      .where(and(eq(directMessages.senderId, userId), eq(directMessages.receiverId, partnerId)))
      .orderBy(directMessages.createdAt);
    return [...received, ...sent].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  },

  async markRead(userId: string, partnerId: string) {
    const unread = await db
      .select()
      .from(directMessages)
      .where(
        and(
          eq(directMessages.receiverId, userId),
          eq(directMessages.senderId, partnerId),
          eq(directMessages.read, false)
        )
      );
    for (const msg of unread) {
      await db.update(directMessages).set({ read: true }).where(eq(directMessages.id, msg.id));
    }
    return { ok: true };
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Payments ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const paymentService = {
  async listMyPayments(userId: string) {
    return db
      .select()
      .from(instructorPayments)
      .where(eq(instructorPayments.instructorId, userId))
      .orderBy(desc(instructorPayments.createdAt));
  },

  async adminCreatePayment(data: { instructorId: string; amount: number; description: string }) {
    const [row] = await db
      .insert(instructorPayments)
      .values({
        instructorId: data.instructorId,
        amount: data.amount,
        description: data.description,
        status: "pending",
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  async adminMarkPaid(paymentId: string, receiptUrl?: string) {
    const [row] = await db
      .update(instructorPayments)
      .set({ status: "paid", receiptUrl, paidAt: Date.now() })
      .where(eq(instructorPayments.id, paymentId))
      .returning();
    return row ?? null;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Student Performance ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const performanceService = {
  async getStudentPerformance(instructorId: string) {
    const myRooms = (await db.select().from(classRooms).where(eq(classRooms.instructorId, instructorId)));
    const roomIds = myRooms.map((r) => r.id);

    const studentMap = new Map<string, { name: string; questions: number; messages: number; attendance: number }>();

    for (const roomId of roomIds) {
      const messages = await db.select().from(roomMessages).where(eq(roomMessages.roomId, roomId));
      for (const m of messages) {
        if (m.userId === instructorId) continue;
        const existing = studentMap.get(m.userId) ?? { name: "", questions: 0, messages: 0, attendance: 0 };
        if (m.type === "question") existing.questions++;
        else existing.messages++;
        studentMap.set(m.userId, existing);
      }
      const att = await db.select().from(attendance).where(eq(attendance.roomId, roomId));
      for (const a of att) {
        if (a.present) {
          const existing = studentMap.get(a.studentId) ?? { name: a.studentName, questions: 0, messages: 0, attendance: 0 };
          existing.attendance++;
          existing.name = a.studentName;
          studentMap.set(a.studentId, existing);
        }
      }
    }

    const results = [];
    for (const [id, stats] of studentMap) {
      const userRows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      results.push({
        studentId: id,
        ...stats,
        name: userRows[0]?.name ?? stats.name,
        totalRooms: myRooms.length,
      });
    }
    return results;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Bank Account ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const bankAccountService = {
  async update(userId: string, data: {
    bankName: string;
    bankAccountNumber: string;
    bankCardNumber: string;
    bankSheba: string;
  }) {
    await db.update(users).set(data).where(eq(users.id, userId));
    return { ok: true };
  },

  async get(userId: string) {
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!rows[0]) return null;
    return {
      bankName: rows[0].bankName ?? "",
      bankAccountNumber: rows[0].bankAccountNumber ?? "",
      bankCardNumber: rows[0].bankCardNumber ?? "",
      bankSheba: rows[0].bankSheba ?? "",
    };
  },
};
