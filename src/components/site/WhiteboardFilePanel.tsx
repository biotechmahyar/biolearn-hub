import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { uploadBlob, formatFileSize } from "@/lib/upload";
import { pdfPageCount, renderPptxSlides } from "@/lib/pptxSlides";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  FileUp,
  Loader2,
  Presentation,
  Trash2,
} from "lucide-react";

/**
 * Whiteboard file panel — instructor uploads PDF / PowerPoint / image files
 * and pages through them live; students see the current page in realtime via
 * Convex reactivity.
 *
 * - PDF  → rendered by the browser <embed>, page locked via #page=N; students
 *          cannot scroll/click inside the viewer (pointer-events blocked) so
 *          only the instructor advances pages.
 * - PPTX → slides are parsed and rendered to images at upload time (jszip +
 *          canvas) and stored in Convex; instructor flips slides one by one
 *          and everyone sees the exact same rendered slide — no download.
 * - Legacy .ppt → binary format cannot be rendered in the browser; shown with
 *          an honest notice (instructor can download the original to convert).
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
  const isLegacyPpt = !isPdf && !isImage && !active?.slideUrls?.length;
  const slideUrl =
    active?.slideUrls?.length && page >= 1
      ? active.slideUrls[Math.min(page - 1, active.slideUrls.length - 1)]
      : undefined;

  const handleUpload = async (f: File) => {
    setUploading(true);
    try {
      const url = await getUploadUrl();
      const storageId = await uploadBlob(url, f);
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      let totalPages: number | undefined;
      let slideImages: string[] | undefined;

      if (ext === "pdf") {
        const buf = await f.arrayBuffer();
        totalPages = pdfPageCount(buf);
      } else if (ext === "pptx") {
        // Parse + render every slide to an image, then store the images
        const rendered = await renderPptxSlides(f);
        totalPages = rendered.length;
        const ids: string[] = [];
        for (let i = 0; i < rendered.length; i++) {
          const u = await getUploadUrl();
          const id = await uploadBlob(u, rendered[i]);
          ids.push(id);
        }
        slideImages = ids;
      }

      await uploadFile({
        roomId: roomId as any,
        fileName: f.name,
        fileStorageId: storageId,
        fileType: ext === "pdf" ? "pdf" : ext === "image" ? "image" : ext,
        fileSize: f.size,
        totalPages,
        slideImages,
      });
      toast.success(
        slideImages?.length
          ? `${slideImages.length} اسلاید رندر و روی تخته قرار گرفت`
          : "فایل آپلود شد و روی تخته نمایش داده می‌شود",
      );
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
                      onClick={() => goto(page - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronRight className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-white/10 px-2 text-slate-300 hover:bg-white/10"
                      onClick={() => goto(page + 1)}
                      disabled={page >= totalPages}
                    >
                      <ChevronLeft className="size-3.5" />
                    </Button>
                  </>
                )}
                {isInstructor && (
                  <>
                    {!slideUrl && active.url && (
                      <a
                        href={active.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10"
                      >
                        دانلود اصلی ({formatFileSize(active.fileSize)})
                      </a>
                    )}
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
                  </>
                )}
              </div>
            </div>

            {/* Rendered PPTX slides — everyone sees the exact same image */}
            {slideUrl && (
              <div className="relative">
                <img
                  src={slideUrl}
                  alt={`اسلاید ${page}`}
                  className="max-h-[460px] w-full rounded-lg border border-white/10 bg-black/30 object-contain"
                />
                {!isInstructor && (
                  <div className="absolute inset-0" aria-hidden="true" />
                )}
              </div>
            )}

            {/* PDF — page locked via #page=N; students can't scroll inside */}
            {isPdf && active.url && (
              <div
                className={!isInstructor ? "pointer-events-none select-none" : ""}
              >
                <embed
                  src={`${active.url}#page=${page}&toolbar=0&navpanes=0&scrollbar=0`}
                  type="application/pdf"
                  className="h-[440px] w-full rounded-lg border border-white/10 bg-black/30"
                />
              </div>
            )}

            {isImage && active.url && (
              <img
                src={active.url}
                alt={active.fileName}
                className="max-h-[420px] w-full rounded-lg border border-white/10 object-contain bg-black/30"
              />
            )}

            {isLegacyPpt && (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-3 text-xs text-amber-300">
                این فایل با قالب قدیمی PowerPoint (.ppt) است و نمایش اسلایدی آن
                در مرورگر پشتیبانی نمی‌شود. برای نمایش صفحه‌به‌صفحه، فایل را با
                پسوند <span dir="ltr" className="font-bold">.pptx</span> ذخیره و
                دوباره آپلود کنید.
              </div>
            )}

            {slideUrl && !isInstructor && (
              <p className="text-[10px] text-slate-500">
                اسلایدها به‌صورت زنده و هم‌گام با مدرس نمایش داده می‌شوند؛
                حرکت بین اسلایدها فقط با مدرس است.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}