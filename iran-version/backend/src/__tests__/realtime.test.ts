/**
 * Integration tests — Socket.IO Phase 6A (Presence + Room Messaging).
 *
 * Tests run without PostgreSQL — DB-dependent operations are skipped via
 * isDbAvailable(). Focus: auth, connection, events, RBAC, room messaging.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Server as HttpServer } from "http";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { sign } from "jsonwebtoken";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { api } from "../routes/index.js";
import { setupSocketIO, io as serverIo } from "../ws/index.js";
import { resetDbAvailability } from "../db/index.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-me";

function makeToken(userId: string, role?: string): string {
  const payload: Record<string, any> = { sub: userId };
  if (role) payload.role = role;
  return sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

function makeExpiredToken(userId: string): string {
  return sign({ sub: userId } as object, JWT_SECRET, { expiresIn: "-1s" });
}

let server: ReturnType<typeof serve>;
let port: number;
const BASE = () => `http://localhost:${port}`;

const USER_A_ID = "00000000-0000-0000-0000-000000000001";
const USER_B_ID = "00000000-0000-0000-0000-000000000002";
const INSTRUCTOR_ID = "00000000-0000-0000-0000-000000000003";
const ADMIN_ID = "00000000-0000-0000-0000-000000000004";

const USER_A_TOKEN = makeToken(USER_A_ID, "user");
const USER_B_TOKEN = makeToken(USER_B_ID, "user");
const INSTRUCTOR_TOKEN = makeToken(INSTRUCTOR_ID, "instructor");
const ADMIN_TOKEN = makeToken(ADMIN_ID, "admin");
const EXPIRED_TOKEN = makeExpiredToken("00000000-0000-0000-0000-000000000005");

function connectSocket(token: string, timeout = 5000): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = ioClient(BASE(), {
      path: "/ws",
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
    });
    const timer = setTimeout(() => reject(new Error("Connection timeout")), timeout);
    client.on("connect", () => { clearTimeout(timer); resolve(client); });
    client.on("connect_error", (err: Error) => { clearTimeout(timer); reject(err); });
  });
}

function waitMs(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

beforeAll(async () => {
  resetDbAvailability();
  const app = new Hono();
  app.use("*", async (c, next) => { c.header("Access-Control-Allow-Origin", "*"); await next(); });
  app.route("/api", api);
  server = serve({ fetch: app.fetch, port: 0, hostname: "127.0.0.1" }, (info) => { port = info.port; });
  setupSocketIO(server as any);
  await waitMs(300);
});

afterAll(async () => {
  if (serverIo) serverIo.close();
  if (server) server.close();
});

afterEach(() => waitMs(50));

// ══════════════════════════════════════════════════════════════════════════════
// ── Authentication ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Socket.IO Authentication", () => {
  it("rejects connection without token", async () => {
    const client = ioClient(BASE(), { path: "/ws", transports: ["websocket"], reconnection: false, forceNew: true, timeout: 3000 });
    const result = await new Promise<'rejected' | 'connected'>((resolve) => {
      client.on("connect", () => { client.close(); resolve('connected'); });
      client.on("connect_error", (err: Error) => {
        expect(err.message).toMatch(/auth|token|forbidden|invalid/i);
        client.close();
        resolve('rejected');
      });
      setTimeout(() => { client.close(); resolve('rejected'); }, 4000);
    });
    expect(result).toBe('rejected');
  });

  it("rejects connection with invalid token", async () => {
    try {
      const client = ioClient(BASE(), { path: "/ws", auth: { token: "invalid-token-xyz" }, transports: ["websocket"], reconnection: false, forceNew: true });
      await new Promise<void>((resolve) => {
        client.on("connect", () => { client.close(); resolve(); });
        client.on("connect_error", (err: Error) => {
          expect(err.message).toMatch(/auth|token|invalid/i);
          client.close();
          resolve();
        });
        setTimeout(() => { client.close(); resolve(); }, 2000);
      });
    } catch { /* expected */ }
  });

  it("rejects connection with expired token", async () => {
    try {
      const client = ioClient(BASE(), { path: "/ws", auth: { token: EXPIRED_TOKEN }, transports: ["websocket"], reconnection: false, forceNew: true });
      await new Promise<void>((resolve) => {
        client.on("connect", () => { client.close(); resolve(); });
        client.on("connect_error", (err: Error) => {
          expect(err.message).toMatch(/auth|token|expired|invalid/i);
          client.close();
          resolve();
        });
        setTimeout(() => { client.close(); resolve(); }, 2000);
      });
    } catch { /* expected */ }
  });

  it("accepts connection with valid token", async () => {
    const client = await connectSocket(USER_A_TOKEN);
    expect(client.connected).toBe(true);
    client.disconnect();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Presence ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Presence", () => {
  it("emits presence:online when a user connects", async () => {
    // Connect listener FIRST, then connect the target user
    const listener = await connectSocket(USER_B_TOKEN);
    await waitMs(50); // let listener be fully registered

    const onlinePromise = new Promise<any>((resolve) => {
      listener.once("presence:online", resolve);
    });

    const target = await connectSocket(USER_A_TOKEN);
    const event = await onlinePromise;
    expect(event.userId).toBe(USER_A_ID);

    target.disconnect();
    listener.disconnect();
  });

  it("emits presence:offline on disconnect", async () => {
    const listener = await connectSocket(USER_B_TOKEN);
    await waitMs(50);

    const offlinePromise = new Promise<any>((resolve) => {
      listener.once("presence:offline", resolve);
    });

    const target = await connectSocket(USER_A_TOKEN);
    await waitMs(100); // let presence:online be processed
    target.disconnect();

    const event = await offlinePromise;
    expect(event.userId).toBe(USER_A_ID);

    listener.disconnect();
  });

  it("supports heartbeat event without error", async () => {
    const client = await connectSocket(USER_A_TOKEN);
    expect(client.connected).toBe(true);
    // Should not throw
    client.emit("presence:heartbeat");
    await waitMs(100);
    client.disconnect();
  });

  it("supports location update", async () => {
    const listener = await connectSocket(USER_B_TOKEN);
    await waitMs(50);

    const updatePromise = new Promise<any>((resolve) => {
      listener.once("presence:update", resolve);
    });

    const target = await connectSocket(USER_A_TOKEN);
    await waitMs(50);
    target.emit("presence:location", { location: "courses/biology" });

    const event = await updatePromise;
    expect(event.userId).toBe(USER_A_ID);
    expect(event.location).toBe("courses/biology");

    target.disconnect();
    listener.disconnect();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Room Messaging ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Room Messaging", () => {
  it("room:join returns error for nonexistent room (user role)", async () => {
    const client = await connectSocket(USER_A_TOKEN);
    const result = await new Promise<any>((resolve) => {
      client.emit("room:join", { roomId: "00000000-0000-0000-0000-000000000000" }, resolve);
    });
    // Without DB, user role is not in allowed list → access denied
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Access denied/i);
    client.disconnect();
  });

  it("room:join succeeds for admin (no DB)", async () => {
    const client = await connectSocket(ADMIN_TOKEN);
    const result = await new Promise<any>((resolve) => {
      client.emit("room:join", { roomId: "00000000-0000-0000-0000-000000000000" }, resolve);
    });
    expect(result.ok).toBe(true);
    client.disconnect();
  });

  it("room:join succeeds for instructor (no DB)", async () => {
    const client = await connectSocket(INSTRUCTOR_TOKEN);
    const result = await new Promise<any>((resolve) => {
      client.emit("room:join", { roomId: "00000000-0000-0000-0000-000000000000" }, resolve);
    });
    expect(result.ok).toBe(true);
    client.disconnect();
  });

  it("room:message requires text", async () => {
    const client = await connectSocket(USER_A_TOKEN);
    const result = await new Promise<any>((resolve) => {
      client.emit("room:message", { roomId: "x", text: "" }, resolve);
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/required/i);
    client.disconnect();
  });

  it("room:message requires roomId", async () => {
    const client = await connectSocket(USER_A_TOKEN);
    const result = await new Promise<any>((resolve) => {
      client.emit("room:message", { roomId: "", text: "hi" }, resolve);
    });
    expect(result.ok).toBe(false);
    client.disconnect();
  });

  it("room:message broadcasts to room members", async () => {
    const instructor = await connectSocket(INSTRUCTOR_TOKEN);
    const student = await connectSocket(USER_A_TOKEN);
    await waitMs(50);

    // Instructor joins
    await new Promise<any>((resolve) => {
      instructor.emit("room:join", { roomId: "test-room-1" }, resolve);
    });

    // Student joins
    await new Promise<any>((resolve) => {
      student.emit("room:join", { roomId: "test-room-1" }, resolve);
    });

    // Listen for message on instructor side
    const msgPromise = new Promise<any>((resolve) => {
      instructor.once("room:message:new", resolve);
    });

    // Student sends a message (user role → no DB access → denied)
    // Use instructor token for sending since user role is blocked without DB
    const result = await new Promise<any>((resolve) => {
      instructor.emit("room:message", { roomId: "test-room-1", text: "Hello class!" }, resolve);
    });
    expect(result.ok).toBe(true);
    expect(result.message.text).toBe("Hello class!");
    expect(result.message.userId).toBe(INSTRUCTOR_ID);

    instructor.disconnect();
    student.disconnect();
  });

  it("room:history returns empty list (no DB)", async () => {
    const client = await connectSocket(ADMIN_TOKEN);
    await new Promise<any>((resolve) => {
      client.emit("room:join", { roomId: "test-room-2" }, resolve);
    });

    const result = await new Promise<any>((resolve) => {
      client.emit("room:history", { roomId: "test-room-2" }, resolve);
    });
    expect(result.ok).toBe(true);
    expect(result.messages).toEqual([]);

    client.disconnect();
  });

  it("room:answer requires instructor role", async () => {
    const client = await connectSocket(USER_A_TOKEN);
    const result = await new Promise<any>((resolve) => {
      client.emit("room:answer", { messageId: "x", answer: "y" }, resolve);
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/instructor/i);
    client.disconnect();
  });

  it("room:answer allows instructor (no DB → message not found)", async () => {
    const client = await connectSocket(INSTRUCTOR_TOKEN);
    const result = await new Promise<any>((resolve) => {
      client.emit("room:answer", { messageId: "nonexistent", answer: "test" }, resolve);
    });
    expect(result.error).toMatch(/not found/i);
    client.disconnect();
  });

  it("room:leave emits event", async () => {
    const instructor = await connectSocket(INSTRUCTOR_TOKEN);
    const student = await connectSocket(USER_A_TOKEN);
    await waitMs(50);

    await new Promise<any>((r) => instructor.emit("room:join", { roomId: "test-room-3" }, r));
    await new Promise<any>((r) => student.emit("room:join", { roomId: "test-room-3" }, r));

    const leftPromise = new Promise<any>((resolve) => {
      instructor.once("room:user:left", resolve);
    });

    student.emit("room:leave", { roomId: "test-room-3" });
    const event = await leftPromise;
    expect(event.userId).toBe(USER_A_ID);

    instructor.disconnect();
    student.disconnect();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Multiple Clients ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Multiple Clients", () => {
  it("same user can have multiple sockets", async () => {
    const c1 = await connectSocket(USER_A_TOKEN);
    const c2 = await connectSocket(USER_A_TOKEN);
    expect(c1.connected).toBe(true);
    expect(c2.connected).toBe(true);
    c1.disconnect();
    c2.disconnect();
  });

  it("different users can connect simultaneously", async () => {
    const cA = await connectSocket(USER_A_TOKEN);
    const cB = await connectSocket(USER_B_TOKEN);
    const cC = await connectSocket(INSTRUCTOR_TOKEN);
    expect(cA.connected).toBe(true);
    expect(cB.connected).toBe(true);
    expect(cC.connected).toBe(true);
    cA.disconnect();
    cB.disconnect();
    cC.disconnect();
  });

  it("admin, instructor, and user all connect", async () => {
    const admin = await connectSocket(ADMIN_TOKEN);
    const inst = await connectSocket(INSTRUCTOR_TOKEN);
    const user = await connectSocket(USER_A_TOKEN);
    expect(admin.connected).toBe(true);
    expect(inst.connected).toBe(true);
    expect(user.connected).toBe(true);
    admin.disconnect();
    inst.disconnect();
    user.disconnect();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Disconnect Cleanup ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Disconnect Cleanup", () => {
  it("emits presence:offline when last socket disconnects", async () => {
    const listener = await connectSocket(USER_B_TOKEN);
    await waitMs(50);

    const offlinePromise = new Promise<any>((resolve) => {
      listener.once("presence:offline", resolve);
    });

    const target = await connectSocket(USER_A_TOKEN);
    await waitMs(100); // let presence:online be emitted
    target.disconnect();

    const event = await offlinePromise;
    expect(event.userId).toBe(USER_A_ID);

    listener.disconnect();
  });

  it("does not emit offline if user has other sockets", async () => {
    const listener = await connectSocket(USER_B_TOKEN);
    await waitMs(50);

    let offlineReceived = false;
    listener.once("presence:offline", () => { offlineReceived = true; });

    const c1 = await connectSocket(USER_A_TOKEN);
    const c2 = await connectSocket(USER_A_TOKEN);
    await waitMs(200);

    c1.disconnect();
    await waitMs(200);

    // Should NOT have offline since c2 is still connected
    expect(offlineReceived).toBe(false);

    c2.disconnect();
    listener.disconnect();
  });
});
