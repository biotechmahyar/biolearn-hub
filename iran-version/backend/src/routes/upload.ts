import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { storage } from "../storage/index.js";

export const uploadRoutes = new Hono();

uploadRoutes.use("*", requireAuth);

// Get presigned upload URL
uploadRoutes.post("/presign", async (c) => {
  const { filename, contentType, folder } = await c.req.json();
  if (!filename) return c.json({ error: "filename required" }, 400);

  const key = `${folder || "uploads"}/${Date.now()}-${filename}`;
  const url = await storage.getPresignedUrl(key, contentType || "application/octet-stream");

  return c.json({ url, key });
});

// Get file URL
uploadRoutes.get("/url/:key", async (c) => {
  const key = c.req.param("key");
  const url = await storage.getUrl(key);
  if (!url) return c.json({ error: "File not found" }, 404);
  return c.json({ url });
});

// Delete file
uploadRoutes.delete("/:key", async (c) => {
  const key = c.req.param("key");
  await storage.delete(key);
  return c.json({ message: "Deleted" });
});
