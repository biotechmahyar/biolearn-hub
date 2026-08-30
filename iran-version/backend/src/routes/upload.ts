import { Hono } from "hono";
import { db } from "../db/index.js";
import { workshops } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { successResponse } from "../types/index.js";

const upload = new Hono();

// Upload route (file upload endpoint)
upload.post("/", requireAuth, async (c) => {
  return c.json(successResponse({ message: "Upload endpoint" }));
});

export default upload;
