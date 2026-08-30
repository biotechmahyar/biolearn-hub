/**
 * Legacy upload routes — presign, get URL, delete.
 * New media upload should go through /api/media/upload.
 */
import { Hono } from "hono";
import { success, errorResponse } from "../lib/response.js";
import type { AppEnv } from "../lib/types.js";
import { storage } from "../storage/index.js";

const uploadRoutes = new Hono<AppEnv>();

// ── Middleware: require auth ───────────────────────────────────────────────
uploadRoutes.use("*", async (c, next) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json(errorResponse("برای دسترسی لازم است وارد شوید.", "UNAUTHORIZED"), 401);
  }
  await next();
});

// Get presigned upload URL
uploadRoutes.post("/presign", async (c) => {
  const { filename, contentType, folder } = await c.req.json();
  if (!filename) return c.json(errorResponse("filename required", "VALIDATION"), 400);

  const key = `${folder || "uploads"}/${Date.now()}-${filename}`;
  const url = await storage.getPresignedUploadUrl(key, contentType || "application/octet-stream");

  return c.json(success({ url, key }));
});

// Get file URL
uploadRoutes.get("/url/:key(*)", async (c) => {
  const key = c.req.param("key") || "";
  const url = await storage.getPresignedDownloadUrl(key);
  if (!url) return c.json(errorResponse("File not found", "NOT_FOUND"), 404);
  return c.json(success({ url }));
});

// Delete file
uploadRoutes.delete("/:key(*)", async (c) => {
  const key = c.req.param("key") || "";
  await storage.delete(key);
  return c.json(success({ message: "Deleted" }));
});

export { uploadRoutes };
