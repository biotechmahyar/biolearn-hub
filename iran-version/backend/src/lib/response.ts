import { Context } from "hono";

export function ok<T>(c: Context, data: T, status = 200) {
  return c.json({ ok: true, data }, status as any);
}

export function created<T>(c: Context, data: T) {
  return ok(c, data, 201);
}

export function fail(c: Context, error: string, status = 400, code?: string) {
  return c.json({ ok: false, error, code }, status as any);
}

export function unauthorized(c: Context, error = "احراز هویت لازم است.") {
  return fail(c, error, 401, "UNAUTHORIZED");
}

export function forbidden(c: Context, error = "دسترسی غیرمجاز.") {
  return fail(c, error, 403, "FORBIDDEN");
}

export function notFound(c: Context, error = "یافت نشد.") {
  return fail(c, error, 404, "NOT_FOUND");
}

export function serverError(c: Context, error = "خطای سرور.") {
  return fail(c, error, 500, "INTERNAL_ERROR");
}
