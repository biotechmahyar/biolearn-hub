/**
 * Main API router — mounts all sub-routers under /api.
 */
import { Hono } from "hono";
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

const api = new Hono();

api.route("/content", contentRoutes);
api.route("/admin", adminRoutes);
api.route("/users", userRoutes);
api.route("/auth", authRoutes);
api.route("/exams", examRoutes);
api.route("/commerce", commerceRoutes);
api.route("/mentor", mentorRoutes);
api.route("/tickets", ticketRoutes);
api.route("/comments", commentRoutes);
api.route("/dictionary", dictionaryRoutes);
api.route("/instructor", instructorRoutes);
api.route("/notifications", notificationRoutes);
api.route("/media", storageRoutes);

export { api };
