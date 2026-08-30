/**
 * Socket.IO Integration Tests — PostgreSQL-backed.
 * PostgreSQL is started by globalSetup before any test imports.
 * Tests verify actual database behavior for presence, room messaging, and RBAC.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { sign } from "jsonwebtoken";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { api } from "../routes/index.js";
import { setupSocketIO, io as serverIo } from "../ws/index.js";
import { db, resetDbAvailability } from "../db/index.js";
import postgres from "postgres";

const JWT_SECRET = () => process.env.JWT_SECRET || "test-jwt-secret-for-integration";
const DATABASE_URL = () => process.env.DATABASE_URL!;

function makeToken(userId: string, role?: string): string {
  return sign({ sub: userId, ...(role ? { role } : {}) } as object, JWT_SECRET(), { expiresIn: "1h" });
}

const USER_A_ID = "00000000-0000-0000-0000-000000000001";
const USER_B_ID = "00000000-0000-0000-0000-000000000002";
const INSTRUCTOR_ID = "00000000-0000-0000-0000-000000000003";
const ADMIN_ID = "00000000-0000-0000-0000-000000000004";
const TEST_ROOM_ID = "00000000-0000-0000-0000-000000000099";
const TEST_QUESTION_ID = "00000000-0000-0000-0000-000000000097";

const USER_A_TOKEN = makeToken(USER_A_ID, "user");
const USER_B_TOKEN = makeToken(USER_B_ID, "user");
const INSTRUCTOR_TOKEN = makeToken(INSTRUCTOR_ID, "instructor");
const ADMIN_TOKEN = makeToken(ADMIN_ID, "admin");

let server: ReturnType<typeof serve>;
let port: number;
let sql: ReturnType<typeof postgres>;

const BASE = () => `http://localhost:${port}`;

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

const waitMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Seed/clean helpers ──────────────────────────────────────────────────

async function seedRoom() {
  sql = postgres(DATABASE_URL());
  await sql`INSERT INTO class_rooms (id, instructor_id, instructor_name, title, topic, description, status, created_at)
    VALUES (${TEST_ROOM_ID}, ${INSTRUCTOR_ID}, 'Test Instructor', 'Test Room', 'Testing', 'Test room', 'live', ${Date.now()})
    ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO class_enroll_requests (id, user_id, room_id, status, created_at)
    VALUES ('00000000-0000-0000-0000-000000000098', ${USER_A_ID}, ${TEST_ROOM_ID}, 'approved', ${Date.now()})
    ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO room_messages (id, room_id, user_id, name, role, type, text, created_at)
    VALUES (${TEST_QUESTION_ID}, ${TEST_ROOM_ID}, ${USER_A_ID}, 'Test User A', 'user', 'question', 'Test question?', ${Date.now()})
    ON CONFLICT (id) DO NOTHING`;
}

async function cleanAll() {
  if (!sql) sql = postgres(DATABASE_URL());
  await sql`DELETE FROM room_messages`;
  await sql`DELETE FROM presence`;
  await sql`DELETE FROM class_enroll_requests WHERE id = '00000000-0000-0000-0000-000000000098'`;
  await sql`DELETE FROM class_rooms WHERE id = ${TEST_ROOM_ID}`;
}

// ── Setup ────────────────────────────────────────────────────────────────

beforeAll(async () => {
  resetDbAvailability();
  sql = postgres(DATABASE_URL());

  const app = new Hono();
  app.use("*", async (c, next) => { c.header("Access-Control-Allow-Origin", "*"); await next(); });
  app.route("/api", api);

  server = serve({ fetch: app.fetch, port: 0, hostname: "127.0.0.1" }, (info) => { port = info.port; });
  setupSocketIO(server as any);
  await waitMs(500);
}, 30_000);

afterAll(async () => {
  if (serverIo) serverIo.close();
  if (server) server.close();
  if (sql) await sql.end();
}, 10_000);

beforeEach(async () => {
  await cleanAll();
  await seedRoom();
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Authentication (PostgreSQL) ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("PG: Socket.IO Authentication", () => {
  it("accepts connection with valid token", async () => {
    const client = await connectSocket(USER_A_TOKEN);
    expect(client.connected).toBe(true);
    client.disconnect();
  });

  it("rejects connection without token", async () => {
    const client = ioClient(BASE(), { path: "/ws", transports: ["websocket"], reconnection: false, forceNew: true, timeout: 3000 });
    const result = await new Promise<"rejected" | "connected">((resolve) => {
      client.on("connect", () => { client.close(); resolve("connected"); });
      client.on("connect_error", (err: Error) => {
        expect(err.message).toMatch(/auth|token|forbidden|invalid/i);
        client.close(); resolve("rejected");
      });
      setTimeout(() => { client.close(); resolve("rejected"); }, 4000);
    });
    expect(result).toBe("rejected");
  });

  it("rejects connection with invalid token", async () => {
    const client = ioClient(BASE(), { path: "/ws", auth: { token: "bad-token" }, transports: ["websocket"], reconnection: false, forceNew: true, timeout: 3000 });
    const result = await new Promise<"rejected" | "connected">((resolve) => {
      client.on("connect", () => { client.close(); resolve("connected"); });
      client.on("connect_error", (err: Error) => { client.close(); resolve("rejected"); });
      setTimeout(() => { client.close(); resolve("rejected"); }, 4000);
    });
    expect(result).toBe("rejected");
  });

  it("loads user name and role from DB", async () => {
    const rows = await sql`SELECT name, role FROM users WHERE id = ${USER_A_ID}`;
    expect(rows[0].name).toBe("Test User A");
    expect(rows[0].role).toBe("user");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Presence (PostgreSQL) ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("PG: Presence", () => {
  it("creates presence row in DB on connect", async () => {
    const client = await connectSocket(USER_A_TOKEN);
    await waitMs(300);

    const rows = await sql`SELECT * FROM presence WHERE user_id = ${USER_A_ID}`;
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe("Test User A");
    expect(rows[0].last_seen).toBeGreaterThan(0);

    client.disconnect();
    await waitMs(300);
  });

  it("removes presence row from DB on disconnect", async () => {
    const client = await connectSocket(USER_A_TOKEN);
    await waitMs(300);
    let rows = await sql`SELECT * FROM presence WHERE user_id = ${USER_A_ID}`;
    expect(rows.length).toBe(1);

    client.disconnect();
    await waitMs(500);

    rows = await sql`SELECT * FROM presence WHERE user_id = ${USER_A_ID}`;
    expect(rows.length).toBe(0);
  });

  it("updates lastSeen on heartbeat", async () => {
    const client = await connectSocket(USER_A_TOKEN);
    await waitMs(300);

    const before = await sql`SELECT last_seen FROM presence WHERE user_id = ${USER_A_ID}`;
    const beforeTs = before[0].last_seen;

    client.emit("presence:heartbeat");
    await waitMs(300);

    const after = await sql`SELECT last_seen FROM presence WHERE user_id = ${USER_A_ID}`;
    expect(after[0].last_seen).toBeGreaterThanOrEqual(beforeTs);

    client.disconnect();
    await waitMs(300);
  });

  it("emits presence:online event", async () => {
    const listener = await connectSocket(USER_B_TOKEN);
    await waitMs(100);
    const onlinePromise = new Promise<any>((resolve) => { listener.once("presence:online", resolve); });
    const target = await connectSocket(USER_A_TOKEN);
    const event = await onlinePromise;
    expect(event.userId).toBe(USER_A_ID);
    target.disconnect();
    listener.disconnect();
    await waitMs(200);
  });

  it("emits presence:offline on disconnect", async () => {
    const listener = await connectSocket(USER_B_TOKEN);
    await waitMs(100);
    const offlinePromise = new Promise<any>((resolve) => { listener.once("presence:offline", resolve); });
    const target = await connectSocket(USER_A_TOKEN);
    await waitMs(100);
    target.disconnect();
    const event = await offlinePromise;
    expect(event.userId).toBe(USER_A_ID);
    listener.disconnect();
    await waitMs(200);
  });

  it("does not remove presence if user has other sockets", async () => {
    const c1 = await connectSocket(USER_A_TOKEN);
    await waitMs(300);
    const c2 = await connectSocket(USER_A_TOKEN);
    await waitMs(200);
    c1.disconnect();
    await waitMs(300);

    const rows = await sql`SELECT * FROM presence WHERE user_id = ${USER_A_ID}`;
    expect(rows.length).toBe(1);

    c2.disconnect();
    await waitMs(300);

    const rows2 = await sql`SELECT * FROM presence WHERE user_id = ${USER_A_ID}`;
    expect(rows2.length).toBe(0);
  });

  it("supports multiple users online simultaneously", async () => {
    const a = await connectSocket(USER_A_TOKEN);
    const b = await connectSocket(USER_B_TOKEN);
    await waitMs(300);

    const rows = await sql`SELECT * FROM presence`;
    expect(rows.length).toBeGreaterThanOrEqual(2);

    a.disconnect();
    b.disconnect();
    await waitMs(300);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Room Messaging (PostgreSQL) ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("PG: Room Messaging", () => {
  it("room:join succeeds for instructor", async () => {
    const client = await connectSocket(INSTRUCTOR_TOKEN);
    const result = await new Promise<any>((resolve) => {
      client.emit("room:join", { roomId: TEST_ROOM_ID }, resolve);
    });
    expect(result.ok).toBe(true);
    client.disconnect();
  });

  it("room:join succeeds for approved student", async () => {
    const client = await connectSocket(USER_A_TOKEN);
    const result = await new Promise<any>((resolve) => {
      client.emit("room:join", { roomId: TEST_ROOM_ID }, resolve);
    });
    expect(result.ok).toBe(true);
    client.disconnect();
  });

  it("room:join succeeds for admin", async () => {
    const client = await connectSocket(ADMIN_TOKEN);
    const result = await new Promise<any>((resolve) => {
      client.emit("room:join", { roomId: TEST_ROOM_ID }, resolve);
    });
    expect(result.ok).toBe(true);
    client.disconnect();
  });

  it("room:join fails for unapproved user", async () => {
    const client = await connectSocket(USER_B_TOKEN);
    const result = await new Promise<any>((resolve) => {
      client.emit("room:join", { roomId: TEST_ROOM_ID }, resolve);
    });
    expect(result.ok).toBe(false);
    client.disconnect();
  });

  it("room:join fails for nonexistent room", async () => {
    const client = await connectSocket(USER_A_TOKEN);
    const result = await new Promise<any>((resolve) => {
      client.emit("room:join", { roomId: "00000000-0000-0000-0000-000000000000" }, resolve);
    });
    expect(result.ok).toBe(false);
    client.disconnect();
  });

  it("sends message and persists to DB", async () => {
    const client = await connectSocket(INSTRUCTOR_TOKEN);
    await new Promise<any>((r) => client.emit("room:join", { roomId: TEST_ROOM_ID }, r));

    const result = await new Promise<any>((resolve) => {
      client.emit("room:message", { roomId: TEST_ROOM_ID, text: "Hello class!" }, resolve);
    });
    expect(result.ok).toBe(true);
    expect(result.message.text).toBe("Hello class!");

    const rows = await sql`SELECT * FROM room_messages WHERE room_id = ${TEST_ROOM_ID} AND text = 'Hello class!'`;
    expect(rows.length).toBe(1);
    expect(rows[0].user_id).toBe(INSTRUCTOR_ID);

    client.disconnect();
  });

  it("message history returns messages from DB (oldest first)", async () => {
    await sql`INSERT INTO room_messages (id, room_id, user_id, name, role, type, text, created_at) VALUES
      ('10000000-0000-0000-0000-000000000001', ${TEST_ROOM_ID}, ${USER_A_ID}, 'User A', 'user', 'message', 'First msg', 1000),
      ('10000000-0000-0000-0000-000000000002', ${TEST_ROOM_ID}, ${INSTRUCTOR_ID}, 'Instructor', 'instructor', 'message', 'Second msg', 2000)`;

    const client = await connectSocket(ADMIN_TOKEN);
    await new Promise<any>((r) => client.emit("room:join", { roomId: TEST_ROOM_ID }, r));

    const result = await new Promise<any>((resolve) => {
      client.emit("room:history", { roomId: TEST_ROOM_ID, limit: 10 }, resolve);
    });
    expect(result.ok).toBe(true);
    expect(result.messages.length).toBeGreaterThanOrEqual(2);
    expect(result.messages[0].text).toBe("First msg");

    client.disconnect();
  });

  it("room:answer persists answer to DB", async () => {
    const client = await connectSocket(INSTRUCTOR_TOKEN);
    await new Promise<any>((r) => client.emit("room:join", { roomId: TEST_ROOM_ID }, r));

    const result = await new Promise<any>((resolve) => {
      client.emit("room:answer", { messageId: TEST_QUESTION_ID, answer: "The answer is 42." }, resolve);
    });
    expect(result.ok).toBe(true);

    const rows = await sql`SELECT answer FROM room_messages WHERE id = ${TEST_QUESTION_ID}`;
    expect(rows[0].answer).toBe("The answer is 42.");

    client.disconnect();
  });

  it("room:answer fails for non-instructor", async () => {
    const client = await connectSocket(USER_A_TOKEN);
    const result = await new Promise<any>((resolve) => {
      client.emit("room:answer", { messageId: TEST_QUESTION_ID, answer: "test" }, resolve);
    });
    expect(result.ok).toBe(false);
    client.disconnect();
  });

  it("room:leave emits event", async () => {
    const instructor = await connectSocket(INSTRUCTOR_TOKEN);
    const student = await connectSocket(USER_A_TOKEN);
    await waitMs(100);
    await new Promise<any>((r) => instructor.emit("room:join", { roomId: TEST_ROOM_ID }, r));
    await new Promise<any>((r) => student.emit("room:join", { roomId: TEST_ROOM_ID }, r));

    const leftPromise = new Promise<any>((resolve) => { instructor.once("room:user:left", resolve); });
    student.emit("room:leave", { roomId: TEST_ROOM_ID });
    const event = await leftPromise;
    expect(event.userId).toBe(USER_A_ID);

    instructor.disconnect();
    student.disconnect();
  });

  it("room:message rejected for unauthorized user", async () => {
    const client = await connectSocket(USER_B_TOKEN);
    const result = await new Promise<any>((resolve) => {
      client.emit("room:message", { roomId: TEST_ROOM_ID, text: "test" }, resolve);
    });
    expect(result.ok).toBe(false);
    client.disconnect();
  });

  it("multiple messages persist correctly", async () => {
    const client = await connectSocket(INSTRUCTOR_TOKEN);
    await new Promise<any>((r) => client.emit("room:join", { roomId: TEST_ROOM_ID }, r));

    for (let i = 0; i < 5; i++) {
      const result = await new Promise<any>((resolve) => {
        client.emit("room:message", { roomId: TEST_ROOM_ID, text: `Message ${i}` }, resolve);
      });
      expect(result.ok).toBe(true);
    }

    const rows = await sql`SELECT * FROM room_messages WHERE room_id = ${TEST_ROOM_ID}`;
    expect(rows.length).toBeGreaterThanOrEqual(5);

    client.disconnect();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Multiple Clients (PostgreSQL) ────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("PG: Multiple Clients", () => {
  it("same user can have multiple sockets with DB presence", async () => {
    const c1 = await connectSocket(USER_A_TOKEN);
    const c2 = await connectSocket(USER_A_TOKEN);
    await waitMs(300);

    const rows = await sql`SELECT * FROM presence WHERE user_id = ${USER_A_ID}`;
    expect(rows.length).toBe(1);

    c1.disconnect();
    await waitMs(300);
    const rows2 = await sql`SELECT * FROM presence WHERE user_id = ${USER_A_ID}`;
    expect(rows2.length).toBe(1);

    c2.disconnect();
    await waitMs(300);
    const rows3 = await sql`SELECT * FROM presence WHERE user_id = ${USER_A_ID}`;
    expect(rows3.length).toBe(0);
  });

  it("broadcasts message to all room members", async () => {
    const instructor = await connectSocket(INSTRUCTOR_TOKEN);
    const studentA = await connectSocket(USER_A_TOKEN);
    await waitMs(100);
    await new Promise<any>((r) => instructor.emit("room:join", { roomId: TEST_ROOM_ID }, r));
    await new Promise<any>((r) => studentA.emit("room:join", { roomId: TEST_ROOM_ID }, r));

    const msgPromise = new Promise<any>((resolve) => { studentA.once("room:message:new", resolve); });

    const result = await new Promise<any>((resolve) => {
      instructor.emit("room:message", { roomId: TEST_ROOM_ID, text: "Broadcast test" }, resolve);
    });
    expect(result.ok).toBe(true);

    const received = await msgPromise;
    expect(received.text).toBe("Broadcast test");
    expect(received.userId).toBe(INSTRUCTOR_ID);

    instructor.disconnect();
    studentA.disconnect();
  });
});
