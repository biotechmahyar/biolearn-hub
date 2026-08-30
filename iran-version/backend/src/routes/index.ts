/**
 * Main API router — mounts all sub-routers under /api.
 * Auth middleware is applied per-group: public GET routes stay open,
 * mutations/admin routes go through authMiddleware.
 */
import { Hono } from "hono";

// Route files — each exports a default Hono instance
import authRoutes from "./auth.js";
import usersRoutes from "./users.js";
import contentRoutes from "./content.js";
import adminRoutes from "./admin.js";
import examsRoutes from "./exams.js";
import commerceRoutes from "./commerce.js";
import mentorRoutes from "./mentor.js";
import ticketsRoutes from "./tickets.js";
import commentsRoutes from "./comments.js";
import dictionaryRoutes from "./dictionary.js";
import instructorRoutes from "./instructor.js";
import notificationsRoutes from "./notifications.js";
import storageRoutes from "./storage.js";

const api = new Hono();

api.route("/auth", authRoutes);
api.route("/users", usersRoutes);
api.route("/content", contentRoutes);
api.route("/admin", adminRoutes);
api.route("/exams", examsRoutes);
api.route("/commerce", commerceRoutes);
api.route("/mentor", mentorRoutes);
api.route("/tickets", ticketsRoutes);
api.route("/comments", commentsRoutes);
api.route("/dictionary", dictionaryRoutes);
api.route("/instructor", instructorRoutes);
api.route("/notifications", notificationsRoutes);
api.route("/media", storageRoutes);

export default api;
