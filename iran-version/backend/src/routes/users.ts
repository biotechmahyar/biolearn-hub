/**
 * User profile routes — require authentication.
 */
import { Hono } from "hono";
import { success, errorResponse } from "../lib/response.js";
import { userService } from "../services/user.service.js";
import { updateProfileSchema } from "../lib/validators.js";

import type { AppEnv } from "../lib/types.js";

const userRoutes = new Hono<AppEnv>();

import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

// ── Auth middleware — require logged-in user ────────────────────────────────
userRoutes.use("*", async (c, next) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json(errorResponse("Unauthorized", "UNAUTHORIZED"), 401);
  }
  await next();
});

// GET /api/users/me — get current user profile
userRoutes.get("/me", async (c) => {
  const userId = c.get("userId");
  const user = await userService.findById(userId);
  if (!user) return c.json(errorResponse("User not found"), 404);
  return c.json(
    success({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      secondaryRole: user.secondaryRole,
      firstName: user.firstName,
      lastName: user.lastName,
      about: user.about,
      avatarUrl: user.avatarUrl,
      university: user.university,
      major: user.major,
    })
  );
});

// PUT /api/users/me — update profile (staged for non-admins)
userRoutes.put("/me", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const user = await userService.updateProfile(userId, parsed.data);
  if (!user) return c.json(errorResponse("User not found"), 404);
  return c.json(success({ updated: true }));
});

export { userRoutes };
