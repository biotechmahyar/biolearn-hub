// ─── WebRTC Signaling Service ─────────────────────────────────────────────────
// Manages signaling data (SDP offers/answers, ICE candidates) in PostgreSQL
// and in-memory peer tracking for connected peers per room.

import { getDb } from "../db/index.js";
import { signals, classRooms } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

// ─── In-Memory Peer Tracking ─────────────────────────────────────────────────

/** roomId → Set<userId> — which users are in the WebRTC session for each room */
const roomPeers = new Map<string, Set<string>>();

export function getPeersInRoom(roomId: string): string[] {
  return Array.from(roomPeers.get(roomId) ?? []);
}

export function addPeerToRoom(roomId: string, userId: string): void {
  if (!roomPeers.has(roomId)) {
    roomPeers.set(roomId, new Set());
  }
  roomPeers.get(roomId)!.add(userId);
}

export function removePeerFromRoom(roomId: string, userId: string): void {
  const peers = roomPeers.get(roomId);
  if (peers) {
    peers.delete(userId);
    if (peers.size === 0) {
      roomPeers.delete(roomId);
    }
  }
}

export function removeUserFromAllRooms(userId: string): void {
  for (const [roomId, peers] of roomPeers) {
    peers.delete(userId);
    if (peers.size === 0) {
      roomPeers.delete(roomId);
    }
  }
}

// ─── Signal Persistence ──────────────────────────────────────────────────────

export interface SignalData {
  id: string;
  fromUserId: string;
  toUserId: string;
  roomId: string | null;
  type: string;
  data: string | null;
  createdAt: number;
}

/**
 * Save a signaling message (offer, answer, or ICE candidate) to PostgreSQL.
 * Signals are ephemeral but persisted for reconnect/recovery scenarios.
 */
export async function saveSignal(params: {
  fromUserId: string;
  toUserId: string;
  roomId: string | null;
  type: "offer" | "answer" | "candidate";
  data: string;
}): Promise<SignalData> {
  const db = getDb();
  const now = Date.now();

  const [row] = await db
    .insert(signals)
    .values({
      fromUserId: params.fromUserId,
      toUserId: params.toUserId,
      roomId: params.roomId,
      type: params.type,
      data: params.data,
      createdAt: now,
    })
    .returning();

  return {
    id: row.id,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    roomId: row.roomId,
    type: row.type,
    data: row.data,
    createdAt: row.createdAt,
  };
}

/**
 * Get recent signals for a user in a room (for reconnect recovery).
 * Returns the last N signals addressed to the given user.
 */
export async function getSignalsForUser(
  roomId: string,
  toUserId: string,
  limit = 50
): Promise<SignalData[]> {
  const db = getDb();

  const rows = await db
    .select()
    .from(signals)
    .where(and(eq(signals.roomId, roomId), eq(signals.toUserId, toUserId)))
    .orderBy(desc(signals.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    fromUserId: r.fromUserId,
    toUserId: r.toUserId,
    roomId: r.roomId,
    type: r.type,
    data: r.data,
    createdAt: r.createdAt,
  }));
}

/**
 * Clear old signals for a room (cleanup after session ends).
 */
export async function clearRoomSignals(roomId: string): Promise<number> {
  const db = getDb();

  const result = await db
    .delete(signals)
    .where(eq(signals.roomId, roomId))
    .returning();

  return result.length;
}

// ─── Room Validation ─────────────────────────────────────────────────────────

/**
 * Check if a room exists and get basic info.
 */
export async function getRoomInfo(roomId: string) {
  const db = getDb();

  const [room] = await db
    .select({
      id: classRooms.id,
      instructorId: classRooms.instructorId,
      name: classRooms.name,
    })
    .from(classRooms)
    .where(eq(classRooms.id, roomId))
    .limit(1);

  return room ?? null;
}

/**
 * Check if a user is authorized to participate in a room's WebRTC session.
 * Authorization: instructor of the room, admin, or enrolled member.
 */
export async function isUserAuthorizedForWebRTC(
  roomId: string,
  userId: string,
  role: string
): Promise<boolean> {
  const room = await getRoomInfo(roomId);
  if (!room) return false;

  const isAdminRole = ["admin", "site_admin", "super_admin"].includes(role);
  if (isAdminRole || room.instructorId === userId) return true;

  // Check if user is in the in-memory room peers list (joined via room:join)
  const peers = getPeersInRoom(roomId);
  return peers.includes(userId);
}
