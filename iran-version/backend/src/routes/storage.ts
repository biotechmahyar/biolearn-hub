import { Hono } from "hono";
import { db } from "../db/index.js";
import { mediaItems } from "../db/schema.js";
import { eq, and, ilike, or } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../middleware/auth.js";
import { successResponse, errorResponse } from "../types/index.js";
import * as fs from "fs";
import * as path from "path";

const storage = new Hono();

const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "audio/mpeg", "audio/wav",
  "video/mp4", "video/webm",
  "application/zip",
  "text/plain", "text/csv",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function getStoragePath(): string {
  return process.env.LOCAL_STORAGE_PATH || "./uploads";
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// GET /api/media
storage.get("/", requireAuth, async (c) => {
  const category = c.req.query("category");
  const search = c.req.query("search");
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  let rows = await db.select().from(mediaItems).orderBy(mediaItems.createdAt);

  if (category) {
    rows = rows.filter((r) => r.category === category);
  }
  if (search) {
    const q = search.trim().toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.alt?.toLowerCase().includes(q));
  }

  return c.json(successResponse(rows.slice(offset, offset + limit)));
});

// GET /api/media/:id
storage.get("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const rows = await db.select().from(mediaItems).where(eq(mediaItems.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("فایل یافت نشد."), 404);
  return c.json(successResponse(rows[0]));
});

// POST /api/media/upload
storage.post("/upload", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.parseBody();
  const file = body["file"] as File;
  if (!file) return c.json(errorResponse("فایل ارسال نشد."), 400);

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return c.json(errorResponse("نوع فایل مجاز نیست."), 400);
  }
  if (file.size > MAX_FILE_SIZE) {
    return c.json(errorResponse("حجم فایل بیشتر از ۵۰ مگابایت است."), 400);
  }

  // Sanitize filename
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, ".");
  const uniqueName = `${Date.now()}-${safeName}`;
  const storagePath = getStoragePath();
  ensureDir(storagePath);

  const filePath = path.join(storagePath, uniqueName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const url = `/api/media/file/${uniqueName}`;

  const [item] = await db.insert(mediaItems).values({
    url,
    name: file.name,
    alt: (body["alt"] as string) || null,
    caption: (body["caption"] as string) || null,
    category: (body["category"] as string) || null,
    size: file.size,
    mimeType: file.type,
    uploadedBy: user!.id,
  }).returning();

  return c.json(successResponse(item), 201);
});

// GET /api/media/file/:filename — Serve uploaded files
storage.get("/file/:filename", async (c) => {
  const filename = c.req.param("filename");
  // Prevent path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return c.json(errorResponse("نام فایل نامعتبر است."), 400);
  }

  const filePath = path.join(getStoragePath(), filename);
  if (!fs.existsSync(filePath)) {
    return c.json(errorResponse("فایل یافت نشد."), 404);
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".pdf": "application/pdf", ".mp3": "audio/mpeg", ".wav": "audio/wav",
    ".mp4": "video/mp4", ".webm": "video/webm", ".zip": "application/zip",
    ".txt": "text/plain", ".csv": "text/csv",
  };
  const mime = mimeMap[ext] || "application/octet-stream";

  return new Response(buffer, {
    headers: { "Content-Type": mime, "Content-Length": buffer.length.toString() },
  });
});

// POST /api/media/presign — Get presigned upload URL (for local storage, just return the upload endpoint)
storage.post("/presign", requireAuth, async (c) => {
  const body = await c.req.json();
  const filename = body.filename || "upload";
  const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  return c.json(successResponse({
    url: `/api/media/upload`,
    method: "POST",
    fields: { key: safeName },
  }));
});

// PUT /api/media/:id
storage.put("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const [updated] = await db.update(mediaItems).set({
    alt: body.alt,
    caption: body.caption,
    category: body.category,
    name: body.name,
  }).where(eq(mediaItems.id, id)).returning();
  if (!updated) return c.json(errorResponse("فایل یافت نشد."), 404);
  return c.json(successResponse(updated));
});

// DELETE /api/media/:id
storage.delete("/:id", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  const id = c.req.param("id");
  const rows = await db.select().from(mediaItems).where(eq(mediaItems.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("فایل یافت نشد."), 404);

  // Only uploader or admin can delete
  if (rows[0].uploadedBy !== user!.id && !["admin", "site_admin"].includes(user!.role!)) {
    return c.json(errorResponse("دسترسی غیرمجاز."), 403);
  }

  // Delete file from disk
  const url = rows[0].url;
  if (url.startsWith("/api/media/file/")) {
    const filename = url.split("/").pop();
    if (filename) {
      const filePath = path.join(getStoragePath(), filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }

  await db.delete(mediaItems).where(eq(mediaItems.id, id));
  return c.json(successResponse({ message: "حذف شد." }));
});

export default storage;
