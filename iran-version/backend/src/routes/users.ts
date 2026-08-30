import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../middleware/auth.js";
import { successResponse, errorResponse } from "../types/index.js";

const usersRoutes = new Hono();

const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatarUrl: z.string().optional(),
  about: z.string().optional(),
  university: z.string().optional(),
  major: z.string().optional(),
});

// GET /api/users/me
usersRoutes.get("/me", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json(errorResponse("کاربر یافت نشد."), 404);

  const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("کاربر یافت نشد."), 404);

  const u = rows[0];
  return c.json(
    successResponse({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      secondaryRole: u.secondaryRole,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      about: u.about,
      university: u.university,
      major: u.major,
      telegramId: u.telegramId,
      telegramUsername: u.telegramUsername,
      telegramNotificationsEnabled: u.telegramNotificationsEnabled,
      bankName: u.bankName,
      bankCardNumber: u.bankCardNumber,
      bankSheba: u.bankSheba,
    }),
  );
});

// PUT /api/users/me
usersRoutes.put("/me", requireAuth, async (c) => {
  const currentUser = getCurrentUser(c);
  if (!currentUser) return c.json(errorResponse("کاربر یافت نشد."), 404);

  const body = await c.req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse("ورودی نامعتبر است."), 400);
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.firstName !== undefined) updates.firstName = parsed.data.firstName;
  if (parsed.data.lastName !== undefined) updates.lastName = parsed.data.lastName;
  if (parsed.data.avatarUrl !== undefined) updates.avatarUrl = parsed.data.avatarUrl;
  if (parsed.data.about !== undefined) updates.about = parsed.data.about;
  if (parsed.data.university !== undefined) updates.university = parsed.data.university;
  if (parsed.data.major !== undefined) updates.major = parsed.data.major;

  if (Object.keys(updates).length === 0) {
    return c.json(errorResponse("هیچ فیلدی برای بروزرسانی ارسال نشد."), 400);
  }

  // Stage profile changes for admin approval (pendingProfile)
  const pendingProfile = {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    avatarUrl: parsed.data.avatarUrl,
    about: parsed.data.about,
    submittedAt: Date.now(),
  };

  await db.update(users).set({ pendingProfile }).where(eq(users.id, currentUser.id));

  return c.json(successResponse({ message: "پروفایل برای تأیید ادمین ارسال شد.", pendingProfile }));
});

export default usersRoutes;
