import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { db, isDbAvailable } from "./db/index.js";

// Routes
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import contentRoutes from "./routes/content.js";
import adminRoutes from "./routes/admin.js";
import examsRoutes from "./routes/exams.js";
import commerceRoutes from "./routes/commerce.js";
import mentorRoutes from "./routes/mentor.js";
import ticketsRoutes from "./routes/tickets.js";
import commentsRoutes from "./routes/comments.js";
import dictionaryRoutes from "./routes/dictionary.js";
import instructorRoutes from "./routes/instructor.js";
import notificationsRoutes from "./routes/notifications.js";
import storageRoutes from "./routes/storage.js";

const app = new Hono();

// ── Middleware ───────────────────────────────────────────────────────────────

app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// ── Health ──────────────────────────────────────────────────────────────────

app.get("/api/health", async (c) => {
  const dbOk = await isDbAvailable();
  return c.json({
    ok: true,
    service: "nibrc-iran-backend",
    version: "1.0.0",
    db: dbOk ? "connected" : "unavailable",
    timestamp: Date.now(),
  });
});

app.get("/api/health/db", async (c) => {
  const dbOk = await isDbAvailable();
  return c.json({ ok: dbOk, db: dbOk ? "connected" : "unavailable" });
});

// ── Routes ──────────────────────────────────────────────────────────────────

app.route("/api/auth", authRoutes);
app.route("/api/users", usersRoutes);
app.route("/api/content", contentRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/exams", examsRoutes);
app.route("/api/commerce", commerceRoutes);
app.route("/api/mentor", mentorRoutes);
app.route("/api/tickets", ticketsRoutes);
app.route("/api/comments", commentsRoutes);
app.route("/api/dictionary", dictionaryRoutes);
app.route("/api/instructor", instructorRoutes);
app.route("/api/notifications", notificationsRoutes);
app.route("/api/media", storageRoutes);

// ── 404 ─────────────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json({ ok: false, error: "Endpoint not found" }, 404);
});

// ── Error handler ───────────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ ok: false, error: "Internal server error" }, 500);
});

// ── Start ───────────────────────────────────────────────────────────────────

const port = parseInt(process.env.PORT || "3000", 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 NIBRC Iran Backend running on http://localhost:${info.port}`);
  console.log(`📊 Health: http://localhost:${info.port}/api/health`);
});

export default app;
