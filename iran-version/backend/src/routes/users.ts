import { Hono } from "hono";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const userRoutes = new Hono();

// Get current user profile
userRoutes.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  const u = user.dbUser;
  return c.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    secondaryRole: u.secondaryRole,
    image: u.image,
    university: u.university,
    major: u.major,
    firstName: u.firstName,
    lastName: u.lastName,
    avatarUrl: u.avatarUrl,
    about: u.about,
  });
});

// Update own profile
userRoutes.put("/me", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const allowed = ["name", "firstName", "lastName", "about", "university", "major"];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    await db.update(users).set(updates).where(eq(users.id, user.userId));
  }
  return c.json({ message: "Profile updated" });
});

// List users (admin only)
userRoutes.get("/", requireAuth, requireAdmin, async (c) => {
  const allUsers = await db.select().from(users);
  return c.json(
    allUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      secondaryRole: u.secondaryRole,
      createdAt: u.createdAt,
    }))
  );
});
