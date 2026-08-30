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

const api = new Hono();

api.route("/content", contentRoutes);
api.route("/admin", adminRoutes);
api.route("/users", userRoutes);
api.route("/auth", authRoutes);
api.route("/exams", examRoutes);
api.route("/commerce", commerceRoutes);

export { api };
