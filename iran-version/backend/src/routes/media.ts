import { Hono } from "hono";
import { successResponse } from "../lib/errors.js";
import { validateBody, z } from "../lib/validate.js";
import { authenticate } from "../middleware/auth.js";
import * as storageService from "../services/storage.service.js";

const media = new Hono();

media.use("*", authenticate);

media.get("/", async (c) => {
  const query = {
    category: c.req.query("category"),
    search: c.req.query("search"),
    limit: c.req.query("limit") ? parseInt(c.req.query("limit")!) : undefined,
    offset: c.req.query("offset")
      ? parseInt(c.req.query("offset")!)
      : undefined,
  };
  const data = await storageService.listMedia(query);
  return c.json(successResponse(data));
});

media.get("/:id", async (c) => {
  const data = await storageService.getMediaItem(c.req.param("id")!!);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

media.put("/:id", async (c) => {
  const body = await validateBody(
    c,
    z.object({
      alt: z.string().optional(),
      caption: z.string().optional(),
      category: z.string().optional(),
    })
  );
  const data = await storageService.updateMediaItem(c.req.param("id")!!, body);
  if (!data) return c.json({ ok: false, error: "Not found" }, 404);
  return c.json(successResponse(data));
});

media.delete("/:id", async (c) => {
  await storageService.deleteMediaItem(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

media.post("/presign", async (c) => {
  const body = await validateBody(
    c,
    z.object({
      filename: z.string(),
      contentType: z.string(),
    })
  );
  const data = await storageService.getPresignedUploadUrl(
    body.filename,
    body.contentType
  );
  return c.json(successResponse(data));
});

export default media;
