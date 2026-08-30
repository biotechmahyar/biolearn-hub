/**
 * JWT Auth middleware for Hono — extracts userId and userRole from Bearer token.
 * Place before routes that need auth.
 */
import { MiddlewareHandler } from "hono";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-me";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = verify(authHeader.slice(7), JWT_SECRET) as {
        sub: string;
        role?: string;
      };
      c.set("userId", payload.sub);
      // Role is not in the JWT by default — the middleware that needs
      // role checks should do a DB lookup or the JWT should include role.
      // For now, the admin middleware does its own check.
    } catch {
      // Invalid token — proceed without auth
    }
  }
  await next();
};
