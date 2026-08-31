import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, createTokens, refreshAccessToken } from "../lib/auth.js";

export async function register(name: string, email: string, password: string) {
  // Check existing
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) throw new Error("این ایمیل قبلاً ثبت شده است.");

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash, role: "user" })
    .returning();

  const tokens = await createTokens(user!);
  return { user: { id: user!.id, name: user!.name, email: user!.email, role: user!.role }, ...tokens };
}

export async function login(email: string, password: string) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !user.passwordHash) throw new Error("ایمیل یا رمز عبور اشتباه است.");

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw new Error("ایمیل یا رمز عبور اشتباه است.");

  const tokens = await createTokens(user);
  return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, ...tokens };
}

export async function refresh(refreshToken: string) {
  const tokens = await refreshAccessToken(refreshToken);
  if (!tokens) throw new Error("توکن تازه‌سازی نامعتبر است.");
  return tokens;
}

export async function getMe(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error("کاربر یافت نشد.");
  return {
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
    bankName: user.bankName,
    bankAccountNumber: user.bankAccountNumber,
    bankCardNumber: user.bankCardNumber,
    bankSheba: user.bankSheba,
    telegramId: user.telegramId,
    telegramUsername: user.telegramUsername,
    telegramLinkedAt: user.telegramLinkedAt,
    telegramNotificationsEnabled: user.telegramNotificationsEnabled,
  };
}

export async function isAdmin(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return user?.role === "admin" || user?.role === "site_admin";
}
