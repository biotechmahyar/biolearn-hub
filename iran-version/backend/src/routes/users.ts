import { Hono } from "hono";
import { successResponse } from "../lib/errors.js";
import { validateBody, z } from "../lib/validate.js";
import { authenticate } from "../middleware/auth.js";
import * as userService from "../services/user.service.js";

const users = new Hono();

users.get("/me", authenticate, async (c) => {
  const user = c.get("user");
  const data = await userService.getMyProfile(user.userId);
  return c.json(successResponse(data));
});

users.put("/me", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      avatarUrl: z.string().optional(),
      about: z.string().optional(),
    })
  );
  const user = c.get("user");
  const data = await userService.updateMyProfile(user.userId, body);
  return c.json(successResponse(data));
});

export default users;
