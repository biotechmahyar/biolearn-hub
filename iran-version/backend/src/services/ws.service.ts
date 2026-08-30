/**
 * WebSocket service layer — Presence and Room Messaging.
 * All DB operations for Socket.IO realtime features.
 */
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  presence,
  classRooms,
  roomMessages,
  classEnrollRequests,
  users,
  enrollments,
} from "../db/schema.js";

// ══════════════════════════════════════════════════════════════════════════════
// ── Presence ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const presenceService = {
  /** Upsert presence: set user online with their name/role/location. */
  async setOnline(userId: string, name: string | null, role: string | null, location?: string) {
    // Check if row exists
    const existing = await db
      .select()
      .from(presence)
      .where(eq(presence.userId, userId))
      .limit(1);

    if (existing[0]) {
      const [updated] = await db
        .update(presence)
        .set({
          name,
          role,
          location: location ?? existing[0].location ?? "online",
          lastSeen: Date.now(),
        })
        .where(eq(presence.userId, userId))
        .returning();
      return updated;
    }

    const [row] = await db
      .insert(presence)
      .values({
        userId,
        name,
        role,
        location: location ?? "online",
        lastSeen: Date.now(),
      })
      .returning();
    return row;
  },

  /** Update heartbeat (lastSeen timestamp). */
  async heartbeat(userId: string) {
    await db
      .update(presence)
      .set({ lastSeen: Date.now() })
      .where(eq(presence.userId, userId));
  },

  /** Set user offline by removing their presence row. */
  async setOffline(userId: string) {
    await db.delete(presence).where(eq(presence.userId, userId));
  },

  /** Get all online users. */
  async getOnlineUsers() {
    return db.select().from(presence).orderBy(desc(presence.lastSeen));
  },

  /** Get online users in a specific room (by checking room membership). */
  async getOnlineInRoom(roomId: string) {
    // Get users who have messages in this room (proxy for membership)
    const memberMessages = await db
      .selectDistinct({ userId: roomMessages.userId })
      .from(roomMessages)
      .where(eq(roomMessages.roomId, roomId));

    const memberIds = memberMessages.map((m) => m.userId);

    // Also get the instructor
    const room = await db.select().from(classRooms).where(eq(classRooms.id, roomId)).limit(1);
    if (room[0]) {
      memberIds.push(room[0].instructorId);
    }

    const uniqueIds = [...new Set(memberIds)];
    if (uniqueIds.length === 0) return [];

    // Filter presence for these users
    const online = await db.select().from(presence);
    return online.filter((p) => uniqueIds.includes(p.userId));
  },

  /** Cleanup stale presence entries (older than 5 minutes without heartbeat). */
  async cleanupStale() {
    const cutoff = Date.now() - 5 * 60 * 1000;
    await db
      .delete(presence)
      .where(sql`${presence.lastSeen} < ${cutoff}`);
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Room Messaging ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const roomService = {
  /** Get room by ID. */
  async getRoom(roomId: string) {
    const rows = await db.select().from(classRooms).where(eq(classRooms.id, roomId)).limit(1);
    return rows[0] ?? null;
  },

  /**
   * Check if a user can access a room.
   * - instructor of the room: always allowed
   * - admin/site_admin: always allowed
   * - enrolled student: allowed if room is live
   * - classEnrollRequests with approved status: allowed
   */
  async canAccess(userId: string, roomId: string, userRole: string): Promise<boolean> {
    // Admin can always access
    if (["admin", "site_admin"].includes(userRole)) return true;

    const room = await this.getRoom(roomId);
    if (!room) return false;

    // Instructor of this room
    if (room.instructorId === userId) return true;

    // Student: check class enrollment approval
    const enrollReq = await db
      .select()
      .from(classEnrollRequests)
      .where(
        and(
          eq(classEnrollRequests.userId, userId),
          eq(classEnrollRequests.roomId, roomId),
          eq(classEnrollRequests.status, "approved")
        )
      )
      .limit(1);
    if (enrollReq[0]) return true;

    // Student: check if enrolled in the course (for live rooms)
    if (room.status === "live") {
      const courseEnroll = await db
        .select()
        .from(enrollments)
        .where(eq(enrollments.userId, userId))
        .limit(1);
      // If enrolled in any course, allow for live rooms
      if (courseEnroll[0]) return true;
    }

    return false;
  },

  /**
   * Save a room message to DB and return the saved record.
   */
  async sendMessage(data: {
    roomId: string;
    userId: string;
    name: string;
    role: string | null;
    type: string;
    text: string;
    attachmentType?: string;
    attachmentName?: string;
    attachmentStorageId?: string;
    attachmentSize?: number;
  }) {
    const [row] = await db
      .insert(roomMessages)
      .values({
        roomId: data.roomId,
        userId: data.userId,
        name: data.name,
        role: data.role,
        type: data.type,
        text: data.text,
        attachmentType: data.attachmentType,
        attachmentName: data.attachmentName,
        attachmentStorageId: data.attachmentStorageId,
        attachmentSize: data.attachmentSize,
        createdAt: Date.now(),
      })
      .returning();
    return row;
  },

  /**
   * Get message history for a room (with pagination).
   */
  async getHistory(roomId: string, limit = 50, offset = 0) {
    return db
      .select()
      .from(roomMessages)
      .where(eq(roomMessages.roomId, roomId))
      .orderBy(desc(roomMessages.createdAt))
      .limit(limit)
      .offset(offset);
  },

  /**
   * Answer a question (instructor only).
   */
  async answerQuestion(messageId: string, answer: string) {
    const [updated] = await db
      .update(roomMessages)
      .set({ answer })
      .where(eq(roomMessages.id, messageId))
      .returning();
    return updated ?? null;
  },
};
