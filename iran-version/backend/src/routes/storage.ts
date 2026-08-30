/**
 * Storage / Media Library Routes
 * Upload, List, Get, Update, Delete, Presign, Receipt Download
 */
import { Hono } from "hono";
import { success, errorResponse } from "../lib/response.js";
import type { AppEnv } from "../lib/types.js";
import { storage } from "../storage/index.js";
import { mediaService } from "../services/media.service.js";
import { db } from "../db/index.js";
import { eq, and } from "drizzle-orm";
import { offlinePayments } from "../db/schema.js";

const app = new Hono<AppEnv>();

// Allowed MIME types for upload
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
  "video/webm",
  "application/zip",
  "text/plain",
  "text/csv",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ── Middleware: require auth ───────────────────────────────────────────────
app.use("*", async (c, next) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json(errorResponse("برای دسترسی لازم است وارد شوید.", "UNAUTHORIZED"), 401);
  }
  await next();
});

// ── Upload File ───────────────────────────────────────────────────────────

app.post("/upload", async (c) => {
  const userId = c.get("userId") as string;

  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || !(file instanceof File)) {
    return c.json(errorResponse("فایل ارسال نشده است.", "VALIDATION"), 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json(errorResponse(`حجم فایل نباید بیشتر از ${MAX_FILE_SIZE / 1024 / 1024}MB باشد.`, "VALIDATION"), 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return c.json(errorResponse("نوع فایل پشتیبانی نمی‌شود.", "VALIDATION"), 400);
  }

  const category = (body["category"] as string) || "general";
  const date = new Date();
  const ymd = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
  const ext = file.name.split(".").pop() || "bin";
  const base = file.name.replace(/[^a-zA-Z0-9\u0600-\u06FF_.-]/g, "_").substring(0, 80);
  const key = `${category}/${ymd}/${Date.now()}_${base}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await storage.upload(key, buffer, file.type);

  const mediaItem = await mediaService.upload(userId, {
    name: file.name,
    mimeType: file.type,
    size: file.size,
    url: url || "",
    alt: (body["alt"] as string) || "",
    caption: (body["caption"] as string) || "",
    category,
  });

  return c.json(success(mediaItem), 201);
});

// ── Presign Upload URL ────────────────────────────────────────────────────

app.post("/presign", async (c) => {
  const body = await c.req.json();
  if (!body.filename || !body.contentType) {
    return c.json(errorResponse("نام فایل و نوع فایل لازم است.", "VALIDATION"), 400);
  }

  if (!ALLOWED_MIME_TYPES.has(body.contentType)) {
    return c.json(errorResponse("نوع فایل پشتیبانی نمی‌شود.", "VALIDATION"), 400);
  }

  const category = body.category || "general";
  const date = new Date();
  const ymd = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
  const ext = body.filename.split(".").pop() || "bin";
  const base = body.filename.replace(/[^a-zA-Z0-9\u0600-\u06FF_.-]/g, "_").substring(0, 80);
  const key = `${category}/${ymd}/${Date.now()}_${base}.${ext}`;
  const url = await storage.getPresignedUploadUrl(key, body.contentType);

  return c.json(success({ url, key }));
});

// ── List Media ────────────────────────────────────────────────────────────

app.get("/", async (c) => {
  const category = c.req.query("category") || undefined;
  const search = c.req.query("search") || undefined;
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  const items = await mediaService.list({ category, search, limit, offset });
  const total = await mediaService.count(category);

  return c.json(success({ items, total, limit, offset }));
});

// ── Get Media Item ────────────────────────────────────────────────────────

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await mediaService.getById(id);
  if (!item) return c.json(errorResponse("فایل یافت نشد.", "NOT_FOUND"), 404);
  return c.json(success(item));
});

// ── Update Media Metadata ─────────────────────────────────────────────────

app.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await mediaService.update(id, {
    alt: body.alt,
    caption: body.caption,
    category: body.category,
    name: body.name,
  });
  if (!updated) return c.json(errorResponse("فایل یافت نشد.", "NOT_FOUND"), 404);
  return c.json(success(updated));
});

// ── Delete Media ──────────────────────────────────────────────────────────

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await mediaService.delete(id);
  if (!item) return c.json(errorResponse("فایل یافت نشد.", "NOT_FOUND"), 404);
  try {
    const urlParts = item.url.split("/");
    const key = urlParts.slice(-3).join("/");
    await storage.delete(key);
  } catch {
    // Storage delete failure is non-critical
  }
  return c.json(success(item));
});

// ── Secure Receipt Download ───────────────────────────────────────────────
// Ownership + RBAC enforced: admin sees all, user sees own receipts only.

app.get("/receipt/:paymentId", async (c) => {
  const userId = c.get("userId") as string;
  const userRole = c.get("userRole") as string;
  const paymentId = c.req.param("paymentId");

  const isAdmin = ["admin", "site_admin"].includes(userRole);

  // Build query: admin sees any, user sees own
  const conditions = isAdmin
    ? eq(offlinePayments.id, paymentId)
    : and(eq(offlinePayments.id, paymentId), eq(offlinePayments.userId, userId));

  const rows = await db
    .select()
    .from(offlinePayments)
    .where(conditions)
    .limit(1);

  const payment = rows[0];
  if (!payment) {
    return c.json(errorResponse("رسید یافت نشد یا دسترسی ندارید.", "NOT_FOUND"), 404);
  }

  if (!payment.receiptStorageId) {
    return c.json(errorResponse("رسید آپلود نشده است.", "NOT_FOUND"), 404);
  }

  // Generate presigned download URL for the receipt
  const downloadUrl = await storage.getPresignedDownloadUrl(payment.receiptStorageId);

  return c.json(success({
    paymentId: payment.id,
    receiptUrl: downloadUrl,
    receiptStorageId: payment.receiptStorageId,
    amount: payment.amount,
    trackingNumber: payment.trackingNumber,
    status: payment.status,
  }));
});

export { app as storageRoutes };
