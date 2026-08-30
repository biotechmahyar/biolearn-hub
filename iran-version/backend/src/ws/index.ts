/**
 * Socket.IO Server — Phase 6A Realtime Foundation
 *
 * - JWT-authenticated connections (reject unauthenticated)
 * - Presence: online/offline, heartbeat, DB sync, disconnect cleanup
 * - Room Messaging: join/leave, send/receive, history, RBAC
 * - Instructor answer to questions
 */
import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../modules/auth/jwt.js";
import { db, isDbAvailable } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { presenceService, roomService } from "../services/ws.service.js";

export let io: Server;

// ── In-memory maps for fast lookups ───────────────────────────────────────
// userId → Set<socketId> (a user can have multiple tabs)
const userSockets = new Map<string, Set<string>>();
// socketId → { userId, userRole, userName }
const socketMeta = new Map<string, { userId: string; userRole: string; userName: string }>();

// ── Heartbeat interval (every 30s) ────────────────────────────────────────
const HEARTBEAT_INTERVAL = 30_000;

/**
 * Setup Socket.IO on the existing HTTP server.
 */
export function setupSocketIO(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      credentials: true,
    },
    path: "/ws",
    pingInterval: 25_000,
    pingTimeout: 10_000,
  });

  // ── Auth Middleware — reject unauthenticated connections ────────────────
  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const payload = verifyAccessToken(token);
    if (!payload || !payload.sub) {
      return next(new Error("Invalid or expired token"));
    }

    // Look up user from DB for name and role (graceful fallback if DB unavailable)
    let userName = "User";
    let userRole = payload.role ?? "";
    if (await isDbAvailable()) {
      try {
        const rows = await db
          .select({ name: users.name, role: users.role })
          .from(users)
          .where(eq(users.id, payload.sub))
          .limit(1);
        if (rows[0]) {
          userName = rows[0].name ?? "User";
          userRole = rows[0].role ?? "";
        }
      } catch {
        // DB query failed — use JWT payload data
      }
    }

    (socket as any).userId = payload.sub;
    (socket as any).userRole = userRole;
    (socket as any).userName = userName;
    next();
  });

  // ── Connection Handler ──────────────────────────────────────────────────
  io.on("connection", async (socket: Socket) => {
    const userId = (socket as any).userId as string;
    const userRole = (socket as any).userRole as string;
    const userName = (socket as any).userName as string;

    // Track socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);
    socketMeta.set(socket.id, { userId, userRole, userName });

    // ── Presence: set online in DB (skip if DB unavailable) ──────────────
    if (await isDbAvailable()) {
      try { await presenceService.setOnline(userId, userName, userRole, "online"); } catch { /* ignore */ }
    }

    // Broadcast to all: user came online
    io.emit("presence:online", {
      userId,
      name: userName,
      role: userRole,
      timestamp: Date.now(),
    });

    console.log(`🔌 Connected: ${userName} (${userId}) [socket:${socket.id}]`);

    // ── Presence Events ────────────────────────────────────────────────

    /** Client sends heartbeat to update lastSeen. */
    socket.on("presence:heartbeat", async () => {
      if (await isDbAvailable()) {
        try { await presenceService.heartbeat(userId); } catch { /* ignore */ }
      }
    });

    /** Client updates their location (e.g. "courses/biology-101"). */
    socket.on("presence:location", async (data: { location: string }) => {
      if (await isDbAvailable()) {
        try { await presenceService.setOnline(userId, userName, userRole, data.location || "online"); } catch { /* ignore */ }
      }
      io.emit("presence:update", {
        userId,
        name: userName,
        location: data.location,
        timestamp: Date.now(),
      });
    });

    // ── Room Messaging Events ──────────────────────────────────────────

    /** Join a room. Server checks RBAC before allowing. */
    socket.on("room:join", async (data: { roomId: string }, ack?: (response: any) => void) => {
      const { roomId } = data;
      if (!roomId) {
        ack?.({ ok: false, error: "roomId required" });
        return;
      }

      // RBAC: check access (if DB unavailable, allow based on JWT role)
      let allowed = true;
      if (await isDbAvailable()) {
        try {
          allowed = await roomService.canAccess(userId, roomId, userRole);
        } catch {
          allowed = ["admin", "site_admin", "instructor"].includes(userRole);
        }
      } else {
        allowed = ["admin", "site_admin", "instructor"].includes(userRole);
      }
      if (!allowed) {
        ack?.({ ok: false, error: "Access denied" });
        socket.emit("room:error", { roomId, error: "Access denied to this room" });
        return;
      }

      socket.join(`room:${roomId}`);
      console.log(`👤 ${userName} joined room ${roomId}`);

      // Notify room
      io.to(`room:${roomId}`).emit("room:user:joined", {
        roomId,
        userId,
        name: userName,
        role: userRole,
        timestamp: Date.now(),
      });        // Send online users in this room
      let onlineInRoom: any[] = [];
      if (await isDbAvailable()) {
        try { onlineInRoom = await presenceService.getOnlineInRoom(roomId); } catch { /* ignore */ }
      }
      ack?.({ ok: true, onlineUsers: onlineInRoom.map((u) => ({ userId: u.userId, name: u.name, role: u.role })) });
    });

    /** Leave a room. */
    socket.on("room:leave", (data: { roomId: string }) => {
      const { roomId } = data;
      socket.leave(`room:${roomId}`);

      io.to(`room:${roomId}`).emit("room:user:left", {
        roomId,
        userId,
        name: userName,
        timestamp: Date.now(),
      });

      console.log(`👋 ${userName} left room ${roomId}`);
    });

    /** Send a message to a room. Server saves to DB and broadcasts. */
    socket.on(
      "room:message",
      async (
        data: {
          roomId: string;
          text: string;
          type?: string;
          attachmentType?: string;
          attachmentName?: string;
          attachmentStorageId?: string;
          attachmentSize?: number;
        },
        ack?: (response: any) => void
      ) => {
        const { roomId, text, type = "message", ...attachment } = data;

        if (!roomId || !text?.trim()) {
          ack?.({ ok: false, error: "roomId and text required" });
          return;
        }

        // RBAC: check access
        let allowed = true;
        if (await isDbAvailable()) {
          try { allowed = await roomService.canAccess(userId, roomId, userRole); } catch {
            allowed = ["admin", "site_admin", "instructor"].includes(userRole);
          }
        } else {
          allowed = ["admin", "site_admin", "instructor"].includes(userRole);
        }
        if (!allowed) {
          ack?.({ ok: false, error: "Access denied" });
          return;
        }

        // Save to DB (if DB unavailable, broadcast with temp id)
        let saved: any = null;
        if (await isDbAvailable()) {
          try {
            saved = await roomService.sendMessage({
              roomId,
              userId,
              name: userName,
              role: userRole,
              type,
              text: text.trim(),
              ...attachment,
            });
          } catch { /* ignore */ }
        }

        const message = {
          id: saved?.id ?? crypto.randomUUID(),
          roomId,
          userId,
          name: userName,
          role: userRole,
          type,
          text: text.trim(),
          answer: null,
          attachmentType: attachment.attachmentType,
          attachmentName: attachment.attachmentName,
          attachmentSize: attachment.attachmentSize,
          createdAt: saved?.createdAt ?? Date.now(),
        };

        io.to(`room:${roomId}`).emit("room:message:new", message);
        ack?.({ ok: true, message });
      }
    );

    /** Request message history for a room. */
    socket.on(
      "room:history",
      async (data: { roomId: string; limit?: number; offset?: number }, ack?: (response: any) => void) => {
        const { roomId, limit = 50, offset = 0 } = data;

        if (!roomId) {
          ack?.({ ok: false, error: "roomId required" });
          return;
        }

        // RBAC: check access
        let allowed = true;
        if (await isDbAvailable()) {
          try { allowed = await roomService.canAccess(userId, roomId, userRole); } catch {
            allowed = ["admin", "site_admin", "instructor"].includes(userRole);
          }
        } else {
          allowed = ["admin", "site_admin", "instructor"].includes(userRole);
        }
        if (!allowed) {
          ack?.({ ok: false, error: "Access denied" });
          return;
        }

        let messages: any[] = [];
        if (await isDbAvailable()) {
          try {
            messages = await roomService.getHistory(roomId, limit, offset);
          } catch { /* ignore */ }
        }
        ack?.({ ok: true, messages: messages.reverse() }); // oldest first
      }
    );

    /** Instructor answers a question in a room. */
    socket.on(
      "room:answer",
      async (data: { messageId: string; answer: string }, ack?: (response: any) => void) => {
        const { messageId, answer } = data;

        // Only instructor, admin, site_admin can answer
        if (!["instructor", "admin", "site_admin"].includes(userRole)) {
          ack?.({ ok: false, error: "Only instructors can answer questions" });
          return;
        }

        if (!messageId || !answer?.trim()) {
          ack?.({ ok: false, error: "messageId and answer required" });
          return;
        }

        let updated: any = null;
        if (await isDbAvailable()) {
          try { updated = await roomService.answerQuestion(messageId, answer.trim()); } catch { /* ignore */ }
        }
        if (!updated) {
          ack?.({ ok: false, error: "Message not found" });
          return;
        }

        io.to(`room:${updated.roomId}`).emit("room:message:answered", {
          id: updated.id,
          roomId: updated.roomId,
          answer: updated.answer,
          answeredBy: userId,
          timestamp: Date.now(),
        });

        ack?.({ ok: true });
      }
    );

    // ── Disconnect ────────────────────────────────────────────────────

    socket.on("disconnect", async (reason) => {
      // Remove from tracking
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          // User has no more sockets — set offline in DB
          if (await isDbAvailable()) {
            try { await presenceService.setOffline(userId); } catch { /* ignore */ }
          }
          io.emit("presence:offline", { userId, name: userName, timestamp: Date.now() });
          console.log(`🔌 Offline: ${userName} (${userId}) — ${reason}`);
        } else {
          console.log(`🔌 Socket disconnected: ${socket.id} — user still has ${sockets.size} socket(s)`);
        }
      }
      socketMeta.delete(socket.id);
    });
  });

  // ── Periodic heartbeat check ──────────────────────────────────────────
  setInterval(async () => {
    if (await isDbAvailable()) {
      try { await presenceService.cleanupStale(); } catch { /* ignore */ }
    }
  }, HEARTBEAT_INTERVAL);

  console.log("🔌 Socket.IO initialized (Phase 6A — authenticated)");
}
