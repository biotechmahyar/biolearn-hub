import { Server as HttpServer } from "node:http";
import { Server, Socket } from "socket.io";
import { verifyToken, JwtPayload } from "../lib/jwt.js";
import { getDb } from "../db/index.js";
import {
  presence,
  classRooms,
  roomMessages,
  users,
  groupMembers,
} from "../db/schema.js";
import {
  saveStroke,
  getRoomStrokes,
  clearRoomStrokes,
  isUserAuthorizedForRoom,
  type StrokeData,
} from "../services/whiteboard.service.js";
import {
  saveSignal,
  getSignalsForUser,
  addPeerToRoom,
  removePeerFromRoom,
  removeUserFromAllRooms,
  getPeersInRoom,
} from "../services/webrtc.service.js";
import { eq, and } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    email: string;
    role: string;
    name: string;
  };
}

// ─── In-memory presence for fast access ──────────────────────────────────────

const socketUserMap = new Map<string, string>(); // socketId → userId
const userSocketsMap = new Map<string, Set<string>>(); // userId → Set<socketId>

// ─── Setup Socket.IO ─────────────────────────────────────────────────────────

export function setupSocketIO(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 10000,
  });

  // ─── Authentication Middleware ────────────────────────────────────────────

  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Authentication required"));
    }
    const payload: JwtPayload | null = verifyToken(token);
    if (!payload) {
      return next(new Error("Invalid or expired token"));
    }

    // Fetch user name
    const db = getDb();
    const [user] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    socket.data.userId = payload.sub;
    socket.data.email = payload.email;
    socket.data.role = payload.role;
    socket.data.name = user?.name || "Unknown";

    next();
  });

  // ─── Connection Handler ──────────────────────────────────────────────────

  io.on("connection", async (socket: Socket) => {
    const s = socket as AuthenticatedSocket;
    const { userId, name, role } = s.data;

    console.log(`[Socket.IO] User connected: ${name} (${userId})`);

    // Track socket → user mapping
    socketUserMap.set(s.id, userId);
    if (!userSocketsMap.has(userId)) {
      userSocketsMap.set(userId, new Set());
    }
    userSocketsMap.get(userId)!.add(s.id);

    // ─── Presence ──────────────────────────────────────────────────────────

    // Update presence to online
    await updatePresence(userId, s.id, true);

    // Notify about online status
    io.emit("presence:update", { userId, online: true, name });

    // ─── Join Room ─────────────────────────────────────────────────────────

    s.on("room:join", async (roomId: string) => {
      try {
        // Verify room exists
        const db = getDb();
        const [room] = await db
          .select()
          .from(classRooms)
          .where(eq(classRooms.id, roomId))
          .limit(1);
        if (!room) {
          s.emit("room:error", { message: "Room not found" });
          return;
        }

        // Check authorization: instructor of room, or approved class enrollment, or admin
        const isAdminRole = ["admin", "site_admin", "super_admin"].includes(role);
        const isInstructor = room.instructorId === userId;

        let isEnrolled = false;
        if (!isAdminRole && !isInstructor) {
          // Check group membership or class enrollment
          const [member] = await db
            .select()
            .from(groupMembers)
            .where(
              and(
                eq(groupMembers.userId, userId),
                eq(groupMembers.groupId, roomId)
              )
            )
            .limit(1);
          isEnrolled = !!member;
        }

        if (!isAdminRole && !isInstructor && !isEnrolled) {
          s.emit("room:error", { message: "Unauthorized room access" });
          return;
        }

        s.join(roomId);

        // Update presence for this room
        await db
          .update(presence)
          .set({ roomId, online: true, lastSeen: Date.now() })
          .where(eq(presence.userId, userId));

        // Notify room
        io.to(roomId).emit("room:user-joined", {
          userId,
          name,
          role,
          timestamp: Date.now(),
        });

        s.emit("room:joined", { roomId, timestamp: Date.now() });
      } catch (err) {
        console.error("[Socket.IO] room:join error:", err);
        s.emit("room:error", { message: "Failed to join room" });
      }
    });

    // ─── Leave Room ────────────────────────────────────────────────────────

    s.on("room:leave", async (roomId: string) => {
      s.leave(roomId);

      const db = getDb();
      await db
        .update(presence)
        .set({ online: false, lastSeen: Date.now() })
        .where(eq(presence.userId, userId));

      io.to(roomId).emit("room:user-left", {
        userId,
        name,
        timestamp: Date.now(),
      });
    });

    // ─── Send Message ──────────────────────────────────────────────────────

    s.on("room:message", async (data: { roomId: string; text: string; type?: string }) => {
      try {
        const { roomId, text, type = "message" } = data;
        if (!text || !roomId) return;

        const db = getDb();
        const now = Date.now();

        // Persist message
        const [msg] = await db
          .insert(roomMessages)
          .values({
            roomId,
            userId,
            name,
            role,
            text,
            type,
            createdAt: now,
          })
          .returning();

        // Broadcast to room
        io.to(roomId).emit("room:message", {
          _id: msg.id,
          roomId,
          userId,
          name,
          role,
          text,
          type,
          createdAt: now,
        });
      } catch (err) {
        console.error("[Socket.IO] room:message error:", err);
      }
    });

    // ─── Message History ───────────────────────────────────────────────────

    s.on("room:history", async (roomId: string) => {
      try {
        const db = getDb();
        const messages = await db
          .select()
          .from(roomMessages)
          .where(eq(roomMessages.roomId, roomId))
          .orderBy(roomMessages.createdAt)
          .limit(100);

        s.emit("room:history", { roomId, messages });
      } catch (err) {
        console.error("[Socket.IO] room:history error:", err);
      }
    });

    // ─── Whiteboard: New Stroke ────────────────────────────────────────────

    s.on(
      "whiteboard:stroke",
      async (data: {
        roomId: string;
        points: Array<{ x: number; y: number }>;
        color: string;
        width: number;
        tool: "pen" | "eraser";
      }) => {
        try {
          const { roomId, points, color, width, tool } = data;
          if (!roomId || !points || points.length === 0) return;

          // Permission check: must be in the room
          const authorized = await isUserAuthorizedForRoom(roomId, userId, role);
          if (!authorized) {
            s.emit("whiteboard:error", {
              message: "Not authorized to draw in this room",
            });
            return;
          }

          // Save to DB
          const saved = await saveStroke({
            roomId,
            userId,
            points,
            color,
            width,
            tool,
          });

          // Broadcast to all users in the room
          io.to(roomId).emit("whiteboard:stroke:new", {
            _id: saved.id,
            roomId: saved.roomId,
            userId: saved.userId,
            points: saved.points,
            color: saved.color,
            width: saved.width,
            tool: saved.tool,
            createdAt: saved.createdAt,
          });
        } catch (err) {
          console.error("[Whiteboard] stroke error:", err);
          s.emit("whiteboard:error", { message: "Failed to save stroke" });
        }
      }
    );

    // ─── Whiteboard: Join & Get History ─────────────────────────────────────

    s.on("whiteboard:join", async (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        if (!roomId) return;

        // Permission check
        const authorized = await isUserAuthorizedForRoom(roomId, userId, role);
        if (!authorized) {
          s.emit("whiteboard:error", {
            message: "Not authorized to view whiteboard",
          });
          return;
        }

        // Send all existing strokes to this client
        const strokes = await getRoomStrokes(roomId);
        s.emit("whiteboard:strokes", { roomId, strokes });
      } catch (err) {
        console.error("[Whiteboard] join error:", err);
        s.emit("whiteboard:error", {
          message: "Failed to load whiteboard history",
        });
      }
    });

    // ─── Whiteboard: Clear (instructor/admin only) ──────────────────────────

    s.on("whiteboard:clear", async (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        if (!roomId) return;

        // Only instructor or admin can clear
        const authorized = await isUserAuthorizedForRoom(roomId, userId, role);
        if (!authorized) {
          s.emit("whiteboard:error", {
            message: "Only instructor or admin can clear whiteboard",
          });
          return;
        }

        // Clear all strokes
        const count = await clearRoomStrokes(roomId);

        // Broadcast clear event to all users in the room
        io.to(roomId).emit("whiteboard:cleared", {
          roomId,
          clearedBy: userId,
          clearedCount: count,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("[Whiteboard] clear error:", err);
        s.emit("whiteboard:error", { message: "Failed to clear whiteboard" });
      }
    });

    // ─── Heartbeat ─────────────────────────────────────────────────────────

    s.on("heartbeat", async () => {
      await updatePresence(userId, s.id, true);
    });

    // ─── WebRTC: Join signaling session ──────────────────────────────────

    s.on("webrtc:join", async (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        if (!roomId) {
          s.emit("webrtc:error", { message: "roomId is required" });
          return;
        }

        // Verify room exists and check authorization
        const db = getDb();
        const [room] = await db
          .select()
          .from(classRooms)
          .where(eq(classRooms.id, roomId))
          .limit(1);
        if (!room) {
          s.emit("webrtc:error", { message: "Room not found" });
          return;
        }

        const isAdminRole = ["admin", "site_admin", "super_admin"].includes(role);
        const isInstructor = room.instructorId === userId;
        let isEnrolled = false;
        if (!isAdminRole && !isInstructor) {
          const [member] = await db
            .select()
            .from(groupMembers)
            .where(
              and(
                eq(groupMembers.userId, userId),
                eq(groupMembers.groupId, roomId)
              )
            )
            .limit(1);
          isEnrolled = !!member;
        }

        if (!isAdminRole && !isInstructor && !isEnrolled) {
          s.emit("webrtc:error", { message: "Unauthorized for this room" });
          return;
        }

        s.join(roomId);

        // Track this peer
        const peersBefore = getPeersInRoom(roomId);
        addPeerToRoom(roomId, userId);

        // Notify existing peers about the new participant
        s.to(roomId).emit("webrtc:peer-joined", {
          roomId,
          userId,
          name,
          role,
          timestamp: Date.now(),
        });

        // Send the current peer list to the joining user
        s.emit("webrtc:peer-list", {
          roomId,
          peers: peersBefore.map((pid) => ({ userId: pid })),
          timestamp: Date.now(),
        });

        console.log(`[WebRTC] ${name} joined signaling in room ${roomId}`);
      } catch (err) {
        console.error("[WebRTC] join error:", err);
        s.emit("webrtc:error", { message: "Failed to join signaling" });
      }
    });

    // ─── WebRTC: Leave signaling session ────────────────────────────────

    s.on("webrtc:leave", (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        if (!roomId) return;

        removePeerFromRoom(roomId, userId);
        s.leave(roomId);

        io.to(roomId).emit("webrtc:peer-left", {
          roomId,
          userId,
          name,
          timestamp: Date.now(),
        });

        console.log(`[WebRTC] ${name} left signaling in room ${roomId}`);
      } catch (err) {
        console.error("[WebRTC] leave error:", err);
      }
    });

    // ─── WebRTC: Send SDP Offer ─────────────────────────────────────────

    s.on(
      "webrtc:offer",
      async (data: {
        roomId: string;
        toUserId: string;
        sdp: string;
      }) => {
        try {
          const { roomId, toUserId, sdp } = data;
          if (!roomId || !toUserId || !sdp) {
            s.emit("webrtc:error", {
              message: "roomId, toUserId, and sdp are required",
            });
            return;
          }

          // Persist signal for recovery
          const saved = await saveSignal({
            fromUserId: userId,
            toUserId,
            roomId,
            type: "offer",
            data: sdp,
          });

          // Forward to target user's sockets
          const targetSockets = userSocketsMap.get(toUserId);
          if (targetSockets) {
            for (const targetSocketId of targetSockets) {
              io.to(targetSocketId).emit("webrtc:offer", {
                signalId: saved.id,
                roomId,
                fromUserId: userId,
                fromName: name,
                fromRole: role,
                sdp,
                timestamp: Date.now(),
              });
            }
          }

          console.log(`[WebRTC] Offer sent from ${name} to ${toUserId}`);
        } catch (err) {
          console.error("[WebRTC] offer error:", err);
          s.emit("webrtc:error", { message: "Failed to send offer" });
        }
      }
    );

    // ─── WebRTC: Send SDP Answer ────────────────────────────────────────

    s.on(
      "webrtc:answer",
      async (data: {
        roomId: string;
        toUserId: string;
        sdp: string;
      }) => {
        try {
          const { roomId, toUserId, sdp } = data;
          if (!roomId || !toUserId || !sdp) {
            s.emit("webrtc:error", {
              message: "roomId, toUserId, and sdp are required",
            });
            return;
          }

          const saved = await saveSignal({
            fromUserId: userId,
            toUserId,
            roomId,
            type: "answer",
            data: sdp,
          });

          const targetSockets = userSocketsMap.get(toUserId);
          if (targetSockets) {
            for (const targetSocketId of targetSockets) {
              io.to(targetSocketId).emit("webrtc:answer", {
                signalId: saved.id,
                roomId,
                fromUserId: userId,
                fromName: name,
                sdp,
                timestamp: Date.now(),
              });
            }
          }

          console.log(`[WebRTC] Answer sent from ${name} to ${toUserId}`);
        } catch (err) {
          console.error("[WebRTC] answer error:", err);
          s.emit("webrtc:error", { message: "Failed to send answer" });
        }
      }
    );

    // ─── WebRTC: Send ICE Candidate ─────────────────────────────────────

    s.on(
      "webrtc:ice-candidate",
      async (data: {
        roomId: string;
        toUserId: string;
        candidate: string;
      }) => {
        try {
          const { roomId, toUserId, candidate } = data;
          if (!roomId || !toUserId || !candidate) {
            s.emit("webrtc:error", {
              message: "roomId, toUserId, and candidate are required",
            });
            return;
          }

          await saveSignal({
            fromUserId: userId,
            toUserId,
            roomId,
            type: "candidate",
            data: candidate,
          });

          const targetSockets = userSocketsMap.get(toUserId);
          if (targetSockets) {
            for (const targetSocketId of targetSockets) {
              io.to(targetSocketId).emit("webrtc:ice-candidate", {
                roomId,
                fromUserId: userId,
                candidate,
                timestamp: Date.now(),
              });
            }
          }
        } catch (err) {
          console.error("[WebRTC] ice-candidate error:", err);
          s.emit("webrtc:error", { message: "Failed to send ICE candidate" });
        }
      }
    );

    // ─── WebRTC: Get peer list ──────────────────────────────────────────

    s.on("webrtc:get-peers", (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        if (!roomId) return;

        const peers = getPeersInRoom(roomId);
        s.emit("webrtc:peer-list", {
          roomId,
          peers: peers.map((pid) => ({ userId: pid })),
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("[WebRTC] get-peers error:", err);
      }
    });

    // ─── Disconnect ────────────────────────────────────────────────────────

    s.on("disconnect", async (reason) => {
      console.log(`[Socket.IO] User disconnected: ${name} (${reason})`);

      // Clean up WebRTC peer tracking — notify all rooms
      removeUserFromAllRooms(userId);

      // Remove from tracking
      socketUserMap.delete(s.id);
      const userSockets = userSocketsMap.get(userId);
      if (userSockets) {
        userSockets.delete(s.id);
        if (userSockets.size === 0) {
          userSocketsMap.delete(userId);
          // User is fully offline
          await updatePresence(userId, s.id, false);
          io.emit("presence:update", { userId, online: false, name });
        }
      }
    });
  });

  // ─── Stale Presence Cleanup (every 60s) ──────────────────────────────────

  setInterval(async () => {
    try {
      const db = getDb();
      const staleThreshold = Date.now() - 60000; // 60s
      // Mark stale presences as offline
      await db
        .update(presence)
        .set({ online: false })
        .where(
          and(
            eq(presence.online, true),
            // lastSeen < staleThreshold
          )
        );
    } catch {
      // Ignore cleanup errors
    }
  }, 60000);

  return io;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function updatePresence(
  userId: string,
  socketId: string,
  online: boolean
) {
  try {
    const db = getDb();
    const now = Date.now();
    const [existing] = await db
      .select()
      .from(presence)
      .where(eq(presence.userId, userId))
      .limit(1);

    if (existing) {
      await db
        .update(presence)
        .set({ online, lastSeen: now, socketId })
        .where(eq(presence.id, existing.id));
    } else {
      await db.insert(presence).values({
        userId,
        online,
        lastSeen: now,
        socketId,
      });
    }
  } catch (err) {
    console.error("[Presence] Update error:", err);
  }
}
