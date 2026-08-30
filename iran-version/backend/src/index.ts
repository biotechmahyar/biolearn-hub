import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import dotenv from "dotenv";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { api } from "./routes/index.js";
import { setupSocketIO } from "./ws/index.js";

dotenv.config();

const app = new Hono();

// ── Global Middleware ────────────────────────────────────────────────────────
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    version: "0.1.0",
    timestamp: Date.now(),
  });
});

app.get("/api/health/db", async (c) => {
  try {
    await db.select().from(users).limit(1);
    return c.json({ status: "ok", database: "connected" });
  } catch {
    return c.json({ status: "error", database: "disconnected" }, 503);
  }
});

// ── API Routes — single mount point via central router ───────────────────────
app.route("/api", api);

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// ── Error Handler ────────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// ── Start Server ─────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || "3000");
const host = process.env.HOST || "0.0.0.0";

const serverInfo = serve(
  {
    fetch: app.fetch,
    port,
    hostname: host,
  },
  (info) => {
    console.log(`🚀 NIBRC Backend running on http://${host}:${info.port}`);
    console.log(`📦 Database: ${process.env.DATABASE_URL ? "configured" : "NOT configured"}`);
  }
);

// ── Socket.IO ────────────────────────────────────────────────────────────────
try {
  setupSocketIO(serverInfo as any);
} catch (e) {
  console.warn("⚠️ Socket.IO setup skipped:", (e as Error).message);
}

export type AppType = typeof app;
