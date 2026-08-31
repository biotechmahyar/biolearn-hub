import { Hono } from "hono";
import { successResponse } from "../lib/errors.js";
import { validateBody, z } from "../lib/validate.js";
import { authenticate } from "../middleware/auth.js";
import * as authService from "../services/auth.service.js";

const auth = new Hono();

auth.post("/register", async (c) => {
  const body = await validateBody(
    c,
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
    })
  );
  const result = await authService.register(body.name, body.email, body.password);
  return c.json(successResponse(result), 201);
});

auth.post("/login", async (c) => {
  const body = await validateBody(
    c,
    z.object({
      email: z.string().email(),
      password: z.string(),
    })
  );
  const result = await authService.login(body.email, body.password);
  return c.json(successResponse(result));
});

auth.post("/refresh", async (c) => {
  const body = await validateBody(
    c,
    z.object({ refreshToken: z.string() })
  );
  const result = await authService.refresh(body.refreshToken);
  return c.json(successResponse(result));
});

auth.get("/me", authenticate, async (c) => {
  const user = c.get("user");
  const profile = await authService.getCurrentUser(user.userId);
  return c.json(successResponse(profile));
});

auth.get("/is-admin", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(false);
  }
  try {
    const { verifyToken } = await import("../lib/jwt.js");
    const payload = verifyToken(authHeader.slice(7));
    if (!payload) return c.json(false);
    const isAdm = await authService.isAdmin(payload.sub);
    return c.json(isAdm);
  } catch {
    return c.json(false);
  }
});

export default auth;
