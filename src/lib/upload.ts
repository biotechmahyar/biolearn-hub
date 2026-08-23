// Uploads a blob to a Convex storage upload URL (from getUploadUrl)
// and returns the storage id, which is passed back to the caller.
// Note: this Convex deployment accepts POST and answers with JSON
// { "storageId": "..." } — a plain PUT returns an empty body.
export async function uploadBlob(uploadUrl: string, blob: Blob): Promise<string> {
  const res = await fetch(uploadUrl, {
    method: "POST",
    body: blob,
    headers: { "Content-Type": blob.type || "application/octet-stream" },
  });
  if (!res.ok) throw new Error("آپلود ناموفق بود؛ دوباره تلاش کنید.");
  const data = (await res.json()) as { storageId?: string };
  if (!data.storageId) throw new Error("آپلود ناموفق بود؛ دوباره تلاش کنید.");
  return data.storageId;
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileKindFromMime(mime: string): "file" | "voice" | "image" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "voice";
  return "file";
}
