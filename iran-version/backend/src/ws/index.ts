import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { verifyAccessToken } from "../modules/auth/jwt.js";

export let io: Server;

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
  });

  // ── Auth Middleware ──────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return next(new Error("Invalid token"));
    }

    (socket as any).userId = payload.userId;
    (socket as any).userRole = payload.role;
    next();
  });

  // ── Connection Handler ──────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const userId = (socket as any).userId;
    console.log(`🔌 User connected: ${userId}`);

    // ── Presence ────────────────────────────────────────────────────────
    socket.on("presence:heartbeat", (data: { location?: string }) => {
      // Broadcast presence update to all
      io.emit("presence:update", {
        userId,
        location: data?.location || "online",
        timestamp: Date.now(),
      });
    });

    // ── Room Messaging ──────────────────────────────────────────────────
    socket.on("room:join", (data: { roomId: string }) => {
      socket.join(`room:${data.roomId}`);
      console.log(`👤 ${userId} joined room ${data.roomId}`);
    });

    socket.on("room:leave", (data: { roomId: string }) => {
      socket.leave(`room:${data.roomId}`);
    });

    socket.on("room:message", (data: { roomId: string; text: string; type?: string }) => {
      // Broadcast to room
      io.to(`room:${data.roomId}`).emit("room:message:new", {
        id: crypto.randomUUID(),
        userId,
        text: data.text,
        type: data.type || "message",
        createdAt: Date.now(),
      });
    });

    // ── Whiteboard ──────────────────────────────────────────────────────
    socket.on("whiteboard:stroke", (data: { roomId: string; stroke: any }) => {
      socket.to(`room:${data.roomId}`).emit("whiteboard:stroke:new", {
        userId,
        ...data.stroke,
      });
    });

    socket.on("whiteboard:clear", (data: { roomId: string; layer: string }) => {
      io.to(`room:${data.roomId}`).emit("whiteboard:cleared", {
        layer: data.layer,
      });
    });

    // ── WebRTC Signaling ────────────────────────────────────────────────
    socket.on("signal:send", (data: { roomId: string; to: string; type: string; sdp: any }) => {
      io.to(`room:${data.roomId}`).emit("signal:receive", {
        from: userId,
        type: data.type,
        sdp: data.sdp,
      });
    });

    // ── Disconnect ──────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`🔌 User disconnected: ${userId}`);
      io.emit("presence:offline", { userId, timestamp: Date.now() });
    });
  });

  console.log("🔌 Socket.IO initialized");
}
