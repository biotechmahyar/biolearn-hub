import { getDb } from "../db/index.js";
import { mediaItems } from "../db/schema.js";
import { eq, ilike, and, desc } from "drizzle-orm";
import { NotFoundError, BadRequestError } from "../lib/errors.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

// ─── Storage Adapter Interface ───────────────────────────────────────────────

export interface StorageAdapter {
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>;
  getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

// ─── Local File System Adapter ───────────────────────────────────────────────

class LocalStorageAdapter implements StorageAdapter {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.LOCAL_STORAGE_DIR || "./uploads";
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(key: string, buffer: Buffer, _contentType: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${key}`;
  }

  async getPresignedUrl(key: string, _expiresIn?: number): Promise<string> {
    // For local storage, return direct file path (development only)
    return `/api/media/file/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

// ─── MinIO Adapter (production) ──────────────────────────────────────────────

class MinioAdapter implements StorageAdapter {
  private client: any;
  private bucket: string;

  constructor() {
    this.bucket = process.env.STORAGE_BUCKET || "nibrc-files";
    // Lazy import MinIO
    this.client = null;
  }

  private async getClient() {
    if (!this.client) {
      const { Client } = await import("minio");
      this.client = new Client({
        endPoint: process.env.STORAGE_ENDPOINT || "localhost",
        port: parseInt(process.env.STORAGE_PORT || "9000"),
        useSSL: process.env.STORAGE_USE_SSL === "true",
        accessKey: process.env.STORAGE_ACCESS_KEY || "minioadmin",
        secretKey: process.env.STORAGE_SECRET_KEY || "minioadmin",
      });
      // Ensure bucket exists
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) await this.client.makeBucket(this.bucket);
    }
    return this.client;
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const client = await this.getClient();
    await client.putObject(this.bucket, key, buffer, buffer.length, {
      "Content-Type": contentType,
    });
    return key;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const client = await this.getClient();
    return client.presignedGetObject(this.bucket, key, expiresIn);
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient();
    await client.removeObject(this.bucket, key);
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

let _adapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (!_adapter) {
    const useMinio = process.env.STORAGE_ENDPOINT && process.env.NODE_ENV === "production";
    _adapter = useMinio ? new MinioAdapter() : new LocalStorageAdapter();
  }
  return _adapter;
}

// ─── Allowed MIME Types ──────────────────────────────────────────────────────

const ALLOWED_MIME = new Set([
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

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

function sanitizeFilename(name: string): string {
  // Remove path traversal, keep only safe chars
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.slice(0, 200);
}

// ─── Media Library ───────────────────────────────────────────────────────────

export async function listMedia(query: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const conditions = [];
  if (query.category) conditions.push(eq(mediaItems.category, query.category));
  if (query.search)
    conditions.push(ilike(mediaItems.name, `%${query.search}%`));

  const limit = Math.min(query.limit || 50, 100);
  const offset = query.offset || 0;

  if (conditions.length > 0) {
    return db
      .select()
      .from(mediaItems)
      .where(and(...conditions))
      .orderBy(desc(mediaItems.createdAt))
      .limit(limit)
      .offset(offset);
  }
  return db
    .select()
    .from(mediaItems)
    .orderBy(desc(mediaItems.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getMediaItem(id: string) {
  const db = getDb();
  const [item] = await db
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.id, id))
    .limit(1);
  return item || null;
}

export async function updateMediaItem(
  id: string,
  data: { alt?: string; caption?: string; category?: string }
) {
  const db = getDb();
  const [updated] = await db
    .update(mediaItems)
    .set(data)
    .where(eq(mediaItems.id, id))
    .returning();
  return updated || null;
}

export async function deleteMediaItem(id: string) {
  const db = getDb();
  const [item] = await db
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.id, id))
    .limit(1);
  if (!item) throw new NotFoundError("Media item");
  if (item.storageId) {
    await getStorageAdapter().delete(item.storageId);
  }
  await db.delete(mediaItems).where(eq(mediaItems.id, id));
}

export async function uploadFile(
  uploaderId: string,
  file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  meta?: { alt?: string; caption?: string; category?: string }
) {
  // Validate MIME
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new BadRequestError(`File type not allowed: ${file.mimetype}`);
  }
  // Validate size
  if (file.size > MAX_SIZE) {
    throw new BadRequestError(`File too large (max ${MAX_SIZE / 1024 / 1024}MB)`);
  }

  const safeName = sanitizeFilename(file.originalname);
  const key = `media/${crypto.randomUUID()}_${safeName}`;
  const adapter = getStorageAdapter();
  const url = await adapter.upload(key, file.buffer, file.mimetype);

  const db = getDb();
  const now = Date.now();
  const [item] = await db
    .insert(mediaItems)
    .values({
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
      storageId: key,
      alt: meta?.alt,
      caption: meta?.caption,
      category: meta?.category,
      uploaderId,
      createdAt: now,
    })
    .returning();
  return item;
}

export async function getPresignedUploadUrl(
  filename: string,
  contentType: string
) {
  if (!ALLOWED_MIME.has(contentType)) {
    throw new BadRequestError(`File type not allowed: ${contentType}`);
  }
  const safeName = sanitizeFilename(filename);
  const key = `media/${crypto.randomUUID()}_${safeName}`;
  const adapter = getStorageAdapter();
  const url = await adapter.getPresignedUrl(key, 3600);
  return { key, url };
}
