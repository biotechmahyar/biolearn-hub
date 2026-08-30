/**
 * JWT Auth middleware for Hono — extracts userId and userRole from Bearer token.
 * When no token is present, proceeds without setting userId (public routes).
 * When token is valid, looks up user role from DB and sets both userId and userRole.
 */
import { MiddlewareHandler } from "hono";
import { verify } from "jsonwebtoken";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const jwtSecret = () => process.env.JWT_SECRET || "dev-jwt-secret-change-me";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = verify(authHeader.slice(7), jwtSecret()) as {
        sub: string;
      };
      c.set("userId", payload.sub);

      // Look up role from DB
      const rows = await db
        .select({ role: users.role, secondaryRole: users.secondaryRole })
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);
      if (rows[0]) {
        c.set("userRole", rows[0].role ?? "");
      }
    } catch {
      // Invalid token — proceed without auth (public route fallback)
    }
  }
  await next();
};
