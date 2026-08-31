import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createServer } from "node:http";

// Routes
import authRoutes from "./routes/auth.js";
import contentRoutes from "./routes/content.js";
import adminRoutes from "./routes/admin.js";
import userRoutes from "./routes/users.js";
import examRoutes from "./routes/exams.js";
import commerceRoutes from "./routes/commerce.js";
import mentorRoutes from "./routes/mentor.js";
import ticketRoutes from "./routes/tickets.js";
import commentRoutes from "./routes/comments.js";
import instructorRoutes from "./routes/instructor.js";
import notificationRoutes from "./routes/notifications.js";
import mediaRoutes from "./routes/media.js";

// Services
import { isDbAvailable, closeDb } from "./db/index.js";
import { successResponse } from "./lib/errors.js";
import { ApiError } from "./lib/errors.js";

// Realtime
import { setupSocketIO } from "./realtime/socket.js";

// ─── App Setup ───────────────────────────────────────────────────────────────

const app = new Hono();

// ─── Global Middleware ───────────────────────────────────────────────────────

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// ─── Error Handler ───────────────────────────────────────────────────────────

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(
      { ok: false, error: err.message, code: err.code },
      err.statusCode as any
    );
  }
  console.error("[Unhandled Error]", err);
  return c.json({ ok: false, error: "Internal server error" }, 500);
});

// ─── Health ──────────────────────────────────────────────────────────────────

app.get("/api/health", async (c) => {
  return c.json(successResponse({ status: "ok", timestamp: Date.now() }));
});

app.get("/api/health/db", async (c) => {
  const available = await isDbAvailable();
  return c.json(
    successResponse({ connected: available, timestamp: Date.now() })
  );
});

// ─── Route Mounting ──────────────────────────────────────────────────────────

app.route("/api/auth", authRoutes);
app.route("/api/content", contentRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/users", userRoutes);
app.route("/api/exams", examRoutes);
app.route("/api/commerce", commerceRoutes);
app.route("/api/mentor", mentorRoutes);
app.route("/api/tickets", ticketRoutes);
app.route("/api/comments", commentRoutes);
app.route("/api/instructor", instructorRoutes);
app.route("/api/notifications", notificationRoutes);
app.route("/api/media", mediaRoutes);

// ─── 404 Fallback ────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json({ ok: false, error: "Not found" }, 404);
});

// ─── Server Startup ──────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3000");

const httpServer = createServer((req, res) => {
  // Convert Node.js IncomingMessage to Web Request for Hono
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  const body = req.method !== "GET" && req.method !== "HEAD"
    ? new ReadableStream({
        start(controller) {
          req.on("data", (chunk) => controller.enqueue(chunk));
          req.on("end", () => controller.close());
          req.on("error", (err) => controller.error(err));
        },
      })
    : undefined;

  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    body,
  });

  Promise.resolve(app.fetch(request)).then((response: Response) => {
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    if (response.body) {
      const reader = response.body.getReader();
      const pump = (): Promise<void> =>
        reader.read().then(({ done, value }: { done: boolean; value: Uint8Array | undefined }) => {
          if (done) { res.end(); return; }
          if (value) res.write(value);
          return pump();
        });
      pump().catch(() => res.end());
    } else {
      res.end();
    }
  }).catch(() => {
    res.writeHead(500);
    res.end("Internal Server Error");
  });
});

// Attach Socket.IO
setupSocketIO(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[NIBRC Iran Backend] Server running on port ${PORT}`);
  console.log(`[NIBRC Iran Backend] Health: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[NIBRC Iran Backend] Shutting down...");
  httpServer.close();
  await closeDb();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[NIBRC Iran Backend] Interrupted, shutting down...");
  httpServer.close();
  await closeDb();
  process.exit(0);
});

export default app;
