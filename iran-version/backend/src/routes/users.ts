import { Hono } from "hono";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

const usersRouter = new Hono();

const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatarUrl: z.string().optional(),
  about: z.string().optional(),
  university: z.string().optional(),
  major: z.string().optional(),
});

// GET /api/users/me
usersRouter.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  return c.json({
    ok: true,
    data: {
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
    },
  });
});

// PUT /api/users/me
usersRouter.put("/me", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "ورودی نامعتبر است." }, 400);
  }
  const data = parsed.data;
  const patch: Record<string, unknown> = {};
  if (data.firstName !== undefined) patch.firstName = data.firstName;
  if (data.lastName !== undefined) patch.lastName = data.lastName;
  if (data.avatarUrl !== undefined) patch.avatarUrl = data.avatarUrl;
  if (data.about !== undefined) patch.about = data.about;
  if (data.university !== undefined) patch.university = data.university;
  if (data.major !== undefined) patch.major = data.major;

  if (Object.keys(patch).length > 0) {
    await db.update(users).set(patch).where(eq(users.id, user.id));
  }
  return c.json({ ok: true, data: patch });
});

export default usersRouter;
