import { Context, Next } from "hono";
import { errorResponse, isAdmin, isAnyAdmin, isContentStaff, isSiteAdmin } from "../types/index.js";
import { getCurrentUser, type AuthUser } from "./auth.js";

// Middleware: requires system admin (admin role only)
export async function requireAdmin(c: Context, next: Next) {
  const user = getCurrentUser(c);
  if (!user || !isAdmin(user.role)) {
    return c.json(errorResponse("دسترسی ادمین سامانه لازم است.", "FORBIDDEN"), 403);
  }
  await next();
}

// Middleware: requires any admin (admin or site_admin)
export async function requireAnyAdmin(c: Context, next: Next) {
  const user = getCurrentUser(c);
  if (!user || !isAnyAdmin(user.role)) {
    return c.json(errorResponse("دسترسی ادمین لازم است.", "FORBIDDEN"), 403);
  }
  await next();
}

// Middleware: requires content staff (content_manager, admin, site_admin)
export async function requireContentStaff(c: Context, next: Next) {
  const user = getCurrentUser(c);
  if (!user || !isContentStaff(user.role)) {
    return c.json(errorResponse("دسترسی مدیر محتوا لازم است.", "FORBIDDEN"), 403);
  }
  await next();
}

// Middleware: requires instructor role
export async function requireInstructor(c: Context, next: Next) {
  const user = getCurrentUser(c);
  if (!user || (user.role !== "instructor" && !isAnyAdmin(user.role))) {
    return c.json(errorResponse("فقط مدرس می‌تواند این عملیات را انجام دهد.", "FORBIDDEN"), 403);
  }
  await next();
}

// Middleware: requires mentor role
export async function requireMentor(c: Context, next: Next) {
  const user = getCurrentUser(c);
  if (!user || (user.role !== "mentor" && !isAnyAdmin(user.role))) {
    return c.json(errorResponse("فقط منتور می‌تواند این عملیات را انجام دهد.", "FORBIDDEN"), 403);
  }
  await next();
}

// Middleware: requires content creator (instructor, content_manager, admin, site_admin)
export async function requireContentCreator(c: Context, next: Next) {
  const user = getCurrentUser(c);
  if (!user || (user.role !== "instructor" && !isContentStaff(user.role))) {
    return c.json(errorResponse("فقط مدرس یا مدیر محتوا می‌تواند این عملیات را انجام دهد.", "FORBIDDEN"), 403);
  }
  await next();
}

// Middleware: requires dictionary editor permissions
export async function requireDictionaryEditor(c: Context, next: Next) {
  const user = getCurrentUser(c);
  if (!user) {
    return c.json(errorResponse("وارد نشده‌اید.", "UNAUTHORIZED"), 401);
  }
  const role = user.role;
  if (role !== "instructor" && role !== "content_manager" && role !== "site_admin" && role !== "admin") {
    return c.json(errorResponse("فقط مدرس، مدیر محتوا یا ادمین می‌تواند اصطلاح اضافه کند.", "FORBIDDEN"), 403);
  }
  await next();
}
