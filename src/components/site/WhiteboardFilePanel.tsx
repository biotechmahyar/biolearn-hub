import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { uploadBlob, formatFileSize } from "@/lib/upload";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  FileUp,
  Loader2,
  Presentation,
  Trash2,
  X,
} from "lucide-react";

/**
 * Whiteboard file panel — instructor can upload PDF / PowerPoint / image files
 * and page through them live; students see the current page in realtime via
 * Convex reactivity. PPT/PPTX rendering is not natively supported by browsers,
 * so those files are shown as a downloadable attachment with a clear notice
 * (the raw file is never a dead attachment — it stays downloadable).
 * PDFs render page-by-page with an <embed>.
 */
export function WhiteboardFilePanel({
  roomId,
  isInstructor,
}: {
  roomId: string;
  isInstructor: boolean;
}) {
  const files = useQuery(api.collab.listWhiteboardFiles, { roomId: roomId as any });
  const getUploadUrl = useMutation(api.upload.getUploadUrl);
  const uploadFile = useMutation(api.collab.uploadWhiteboardFile);
  const setPage = useMutation(api.collab.setWhiteboardFilePage);
  const removeFile = useMutation(api.collab.removeWhiteboardFile);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const active = files?.[0];
  const page = active?.currentPage ?? 1;
  const totalPages = active?.totalPages ?? 1;
  const isPdf = active?.fileType === "pdf";
  const isImage = active?.fileType === "image";

  const handleUpload = async (f: File) => {
    setUploading(true);
    try {
      const url = await getUploadUrl();
      const storageId = await uploadBlob(url, f);
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      let totalPages: number | undefined;
      if (ext === "pdf") {
        // Approximate page count via pdf.js-free regex on the raw bytes
        const buf = await f.arrayBuffer();
        const text = new TextDecoder("latin1").decode(buf.slice(0, 2_000_000));
        const matches = text.match(/\/Type\s*\/Page[^s]/g);
        totalPages = matches ? matches.length : 1;
      }
      await uploadFile({
        roomId: roomId as any,
        fileName: f.name,
        fileStorageId: storageId,
        fileType: ext === "pdf" ? "pdf" : ext === "image" ? "image" : ext,
        fileSize: f.size,
        totalPages,
      });
      toast.success("فایل آپلود شد و روی تخته نمایش داده می‌شود");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "آپلود ناموفق بود");
    } finally {
      setUploading(false);
    }
  };

  const goto = (p: number) => {
    if (!active) return;
    void setPage({ fileId: active._id, page: Math.min(Math.max(1, p), totalPages) });
  };

  if (!isInstructor && !active) return null;

  return (
    <Card className="border-cyan-400/20 bg-[#0b1a2a]">
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-bold text-cyan-200">
            <Presentation className="size-4" />
            فایل تدریس (PDF / PowerPoint)
          </p>
          {isInstructor && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.ppt,.pptx,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(f);
                  e.target.value = "";
                }}
              />
              <Button
                size="sm"
                className="h-8 rounded-lg bg-cyan-500 text-[11px] text-[#04121c] hover:bg-cyan-400"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="ml-1 size-3.5 animate-spin" />
                ) : (
                  <FileUp className="ml-1 size-3.5" />
                )}
                آپلود فایل
              </Button>
            </>
          )}
        </div>

        {!active ? (
          <p className="py-6 text-center text-xs text-slate-500">
            {isInstructor
              ? "فایلی بارگذاری نشده — PDF یا PowerPoint آپلود کنید تا صفحه‌به‌صفحه تدریس کنید."
              : "مدرس هنوز فایلی نمایش نداده است."}
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="truncate text-xs font-bold text-slate-200" dir="ltr">
                {active.fileName}
                {totalPages > 1 && (
                  <span className="mr-2 font-normal text-slate-500">
                    صفحه {page} از {totalPages}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-1">
                {isInstructor && totalPages > 1 && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-white/10 px-2 text-slate-300 hover:bg-white/10"
                      onClick={() => goto(page + 1)}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-white/10 px-2 text-slate-300 hover:bg-white/10"
                      onClick={() => goto(page - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="size-3.5" />
                    </Button>
                  </>
                )}
                {isInstructor && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-red-400 hover:bg-red-400/10 hover:text-red-300"
                    onClick={async () => {
                      if (!confirm("این فایل از تخته حذف شود؟")) return;
                      try {
                        await removeFile({ fileId: active._id });
                        toast.info("فایل حذف شد");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "خطا");
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {isImage && active.url && (
              <img
                src={active.url}
                alt={active.fileName}
                className="max-h-[420px] w-full rounded-lg border border-white/10 object-contain bg-black/30"
              />
            )}

            {isPdf && active.url && (
              <embed
                src={`${active.url}#page=${page}&toolbar=0&navpanes=0`}
                type="application/pdf"
                className="h-[420px] w-full rounded-lg border border-white/10 bg-black/30"
              />
            )}

            {!isPdf && !isImage && (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-3 text-xs text-amber-300">
                نمایش داخل مرورگر برای فایل‌های PowerPoint پشتیبانی نمی‌شود؛
                اما فایل کامل برای همهٔ اعضای کلاس قابل دانلود است.
                <div className="mt-2 flex items-center gap-2">
                  {active.url && (
                    <a
                      href={active.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 font-bold text-cyan-200 hover:bg-cyan-400/20"
                      download
                    >
                      دانلود فایل ({formatFileSize(active.fileSize)})
                    </a>
                  )}
                </div>
              </div>
            )}

            {!isInstructor && (
              <p className="text-[10px] text-slate-500">
                این فایل به‌صورت زنده توسط مدرس تغییر صفحه می‌شود.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
