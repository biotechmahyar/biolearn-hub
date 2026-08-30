/**
 * Main API router — mounts all sub-routers under /api.
 * Auth middleware is applied per-group: public GET routes stay open,
 * mutations/admin routes go through authMiddleware.
 */
import { Hono } from "hono";
import { authMiddleware } from "../middleware/jwt.js";
import { contentRoutes } from "./content.js";
import { adminRoutes } from "./admin.js";
import { userRoutes } from "./users.js";
import { authRoutes } from "./auth.js";
import { examRoutes } from "./exams.js";
import { commerceRoutes } from "./commerce.js";
import { mentorRoutes } from "./mentor.js";
import { ticketRoutes } from "./tickets.js";
import { commentRoutes } from "./comments.js";
import { dictionaryRoutes } from "./dictionary.js";
import { instructorRoutes } from "./instructor.js";
import { notificationRoutes } from "./notifications.js";
import { storageRoutes } from "./storage.js";
import { uploadRoutes } from "./upload.js";

const api = new Hono();

// ── Public: no auth ────────────────────────────────────────────────────────
api.route("/auth", authRoutes);
api.route("/content", contentRoutes);

// ── Protected: JWT applied globally, sets userId/userRole from Bearer token.
//    authMiddleware is a no-op when no token is present, so public GET routes
//    still work. Local requireAuth in each route file rejects unauthenticated
//    requests on protected endpoints.
api.use("/users/*", authMiddleware);
api.route("/users", userRoutes);

api.use("/admin/*", authMiddleware);
api.route("/admin", adminRoutes);

api.use("/exams/*", authMiddleware);
api.route("/exams", examRoutes);

api.use("/commerce/*", authMiddleware);
api.route("/commerce", commerceRoutes);

api.use("/mentor/*", authMiddleware);
api.route("/mentor", mentorRoutes);

api.use("/tickets/*", authMiddleware);
api.route("/tickets", ticketRoutes);

api.use("/comments/*", authMiddleware);
api.route("/comments", commentRoutes);

api.use("/dictionary/*", authMiddleware);
api.route("/dictionary", dictionaryRoutes);

api.use("/instructor/*", authMiddleware);
api.route("/instructor", instructorRoutes);

api.use("/notifications/*", authMiddleware);
api.route("/notifications", notificationRoutes);

api.use("/media/*", authMiddleware);
api.route("/media", storageRoutes);

api.use("/upload/*", authMiddleware);
api.route("/upload", uploadRoutes);

export { api };
