/**
 * Test setup — starts a real Hono server for integration tests.
 * Uses an in-memory/test database configured via env vars.
 */
import { afterAll, beforeAll } from "vitest";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { sign } from "jsonwebtoken";
import { api } from "../routes/index.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-me";

let server: ReturnType<typeof serve> | null = null;
let _port = 0;

export function getBaseUrl(): string {
  return `http://localhost:${_port}`;
}

/**
 * Generate a valid JWT token for testing.
 * The token is accepted by authMiddleware but the DB may not have the user.
 */
export function makeToken(userId: string, role?: string): string {
  const payload: Record<string, any> = { sub: userId };
  if (role) payload.role = role;
  return sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

export const TEST_USER_TOKEN = makeToken("test-user-id-00000000-0000-0000-0000-000000000001");
export const TEST_ADMIN_TOKEN = makeToken("test-admin-id-00000000-0000-0000-0000-000000000002");
export const TEST_INSTRUCTOR_TOKEN = makeToken("test-instructor-id-00000000-0000-0000-0000-000000000003");

/**
 * Build the Hono app — same structure as src/index.ts but without Socket.IO.
 */
function buildTestApp(): Hono {
  const app = new Hono();

  app.use("*", cors({ origin: "*", credentials: true }));

  // Health
  app.get("/api/health", (c) => c.json({ status: "ok" }));

  // All API routes
  app.route("/api", api);

  // 404
  app.notFound((c) => c.json({ error: "Not Found" }, 404));

  // Error handler
  app.onError((err, c) => {
    console.error("Test server error:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  });

  return app;
}

beforeAll(async () => {
  const app = buildTestApp();
  server = serve({ fetch: app.fetch, port: 0, hostname: "127.0.0.1" }, (info) => {
    _port = info.port;
  });
  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 200));
});

afterAll(async () => {
  if (server) {
    server.close();
  }
});
