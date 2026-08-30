/**
 * Main API router — mounts all sub-routers under /api.
 */
import { Hono } from "hono";
import { contentRoutes } from "./content.js";
import { adminRoutes } from "./admin.js";
import { userRoutes } from "./users.js";
import { authRoutes } from "./auth.js";

const api = new Hono();

api.route("/content", contentRoutes);
api.route("/admin", adminRoutes);
api.route("/users", userRoutes);
api.route("/auth", authRoutes);

export { api };
