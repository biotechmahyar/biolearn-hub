import { Hono } from "hono";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

export const adminRoutes = new Hono();

// All admin routes require admin role
adminRoutes.use("*", requireAuth, requireAdmin);

// Dashboard stats
adminRoutes.get("/stats", async (c) => {
  const userCount = await db.select({ count: users.id }).from(users);
  return c.json({
    totalUsers: userCount.length,
    // TODO: add more stats
  });
});

// Placeholder routes — will be populated during migration
adminRoutes.get("/users", async (c) => {
  const allUsers = await db.select().from(users);
  return c.json(allUsers);
});

adminRoutes.get("/courses", async (c) => {
  return c.json([]);
});

adminRoutes.get("/articles", async (c) => {
  return c.json([]);
});

adminRoutes.get("/exams", async (c) => {
  return c.json([]);
});
