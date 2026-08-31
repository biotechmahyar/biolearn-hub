import { Hono } from "hono";
import { successResponse } from "../lib/errors.js";
import { validateBody, z } from "../lib/validate.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import * as commentService from "../services/comment.service.js";

const comments = new Hono();

comments.get("/", async (c) => {
  const targetType = c.req.query("targetType") || "";
  const targetId = c.req.query("targetId") || "";
  if (!targetType || !targetId)
    return c.json({ ok: false, error: "Missing targetType/targetId" }, 400);
  const data = await commentService.getApprovedComments(targetType, targetId);
  return c.json(successResponse(data));
});

comments.post("/", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      targetType: z.string(),
      targetId: z.string(),
      text: z.string().min(1),
    })
  );
  const user = c.get("user");
  const data = await commentService.createComment(
    user.userId,
    body.targetType,
    body.targetId,
    body.text
  );
  return c.json(successResponse(data), 201);
});

comments.get("/admin", authenticate, requireAdmin, async (c) => {
  const data = await commentService.getAllComments();
  return c.json(successResponse(data));
});

comments.post("/:id/approve", authenticate, requireAdmin, async (c) => {
  const data = await commentService.approveComment(
    c.req.param("id")!!,
    ""
  );
  return c.json(successResponse(data));
});

comments.post("/:id/reject", authenticate, requireAdmin, async (c) => {
  const data = await commentService.rejectComment(c.req.param("id")!!);
  return c.json(successResponse(data));
});

comments.delete("/:id", authenticate, async (c) => {
  const user = c.get("user");
  await commentService.deleteComment(c.req.param("id")!!, user.userId, false);
  return c.json(successResponse({ deleted: true }));
});

export default comments;
