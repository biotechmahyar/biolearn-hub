import { eq, asc } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { whiteboardStrokes, classRooms } from "../db/schema.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StrokeData {
  roomId: string;
  userId: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  tool: "pen" | "eraser";
}

export interface SavedStroke {
  id: string;
  roomId: string;
  userId: string | null;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  tool: string;
  createdAt: number;
}

// ─── DB Operations ───────────────────────────────────────────────────────────

/**
 * Save a single stroke to PostgreSQL.
 */
export async function saveStroke(data: StrokeData): Promise<SavedStroke> {
  const db = getDb();
  const now = Date.now();

  const [stroke] = await db
    .insert(whiteboardStrokes)
    .values({
      roomId: data.roomId,
      userId: data.userId,
      points: data.points,
      color: data.color,
      width: data.width,
      tool: data.tool,
      createdAt: now,
    })
    .returning();

  return {
    id: stroke.id,
    roomId: stroke.roomId,
    userId: stroke.userId ?? null,
    points: stroke.points as Array<{ x: number; y: number }>,
    color: stroke.color || "#000000",
    width: stroke.width || 2,
    tool: stroke.tool || "pen",
    createdAt: stroke.createdAt,
  };
}

/**
 * Get all strokes for a room (ordered by creation time).
 */
export async function getRoomStrokes(roomId: string): Promise<SavedStroke[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(whiteboardStrokes)
    .where(eq(whiteboardStrokes.roomId, roomId))
    .orderBy(asc(whiteboardStrokes.createdAt));

  return rows.map((r) => ({
    id: r.id,
    roomId: r.roomId,
    userId: r.userId,
    points: r.points as Array<{ x: number; y: number }>,
    color: r.color || "#000000",
    width: r.width || 2,
    tool: r.tool || "pen",
    createdAt: r.createdAt,
  }));
}

/**
 * Clear all strokes for a room (instructor/admin only).
 */
export async function clearRoomStrokes(roomId: string): Promise<number> {
  const db = getDb();
  // Count strokes before deletion
  const before = await db
    .select()
    .from(whiteboardStrokes)
    .where(eq(whiteboardStrokes.roomId, roomId));

  // Delete all strokes for this room
  await db
    .delete(whiteboardStrokes)
    .where(eq(whiteboardStrokes.roomId, roomId));

  return before.length;
}

/**
 * Verify a room exists and get its instructor info.
 */
export async function getRoomInfo(roomId: string) {
  const db = getDb();
  const [room] = await db
    .select({
      id: classRooms.id,
      instructorId: classRooms.instructorId,
      boardBg: classRooms.boardBg,
    })
    .from(classRooms)
    .where(eq(classRooms.id, roomId))
    .limit(1);
  return room || null;
}

/**
 * Check if a user is authorized to draw in a room.
 * Returns true if user is room instructor, admin, or enrolled member.
 */
export async function isUserAuthorizedForRoom(
  roomId: string,
  userId: string,
  role: string
): Promise<boolean> {
  const room = await getRoomInfo(roomId);
  if (!room) return false;

  const isAdminRole = ["admin", "site_admin", "super_admin"].includes(role);
  if (isAdminRole) return true;
  if (room.instructorId === userId) return true;

  return false;
}
