import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { pdfPageCount, renderPptxSlides } from "@/lib/pptxSlides";
import { formatFileSize } from "@/lib/upload";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Presentation,
  AlertTriangle,
} from "lucide-react";

/**
 * SlideDeckViewer — inline viewer for lesson attachments.
 *
 * Instead of forcing students to download a file, presentation-type
 * attachments (PowerPoint / PDF / images) are displayed right in the lesson:
 * - PPTX → parsed and rendered to slide images on the client (self-paced paging).
 * - PDF  → embedded with `#page=N`, prev/next controls.
 * - Image→ shown directly.
 * - Legacy .ppt → honest notice + download of the original.
 * - Anything else → falls back to the plain download link.
 */
export function SlideDeckViewer({
  url,
  name,
  size,
}: {
  url: string;
  name: string;
  size?: number;
}) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const isPptx = ext === "pptx";
  const isPdf = ext === "pdf";
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
  const isLegacyPpt = ext === "ppt";

  // ── PPTX: fetch → render slides → paged viewer ─────────────────────────
  const [slides, setSlides] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(isPptx);
  const [error, setError] = useState<string | null>(null);

  const slidesRef = useRef<string[]>([]);
  const revokeSlides = (list: string[]) => list.forEach((s) => URL.revokeObjectURL(s));

  useEffect(() => {
    if (!isPptx) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("دریافت فایل ناموفق بود.");
        const blobs = await renderPptxSlides(await res.blob());
        if (cancelled) return;
        const urls = blobs.map((b) => URL.createObjectURL(b));
        // Free previous render before replacing it.
        revokeSlides(slidesRef.current);
        slidesRef.current = urls;
        setSlides(urls);
        setPage(1);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "نمایش اسلایدها ناموفق بود");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, isPptx]);

  // ── PDF: count pages (approx) for paging controls ──────────────────────
  const [pdfPages, setPdfPages] = useState<number>(1);
  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        if (!cancelled) setPdfPages(pdfPageCount(buf));
      } catch {
        // keep default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, isPdf]);

  const totalPages = isPptx ? slides.length : isPdf ? pdfPages : 1;

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => revokeSlides(slidesRef.current);
  }, []);

  const downloadLink = useMemo(
    () => (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10"
      >
        <Download className="size-3" />
        دانلود اصلی{size ? ` (${formatFileSize(size)})` : ""}
      </a>
    ),
    [url, size],
  );

  // Non-presentation attachments keep the old behavior (link only).
  if (!isPptx && !isPdf && !isImage && !isLegacyPpt) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
        <FileText className="size-3.5 shrink-0 text-cyan-300" />
        <span className="truncate text-xs text-slate-300">{name}</span>
        <span className="mr-auto">{downloadLink}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/5 bg-white/[0.02] p-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-200" dir="ltr">
          <Presentation className="size-3.5 shrink-0 text-cyan-300" />
          <span className="truncate">{name}</span>
          {totalPages > 1 && (
            <span className="shrink-0 font-normal text-slate-500">
              صفحه {page} از {totalPages}
            </span>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {totalPages > 1 && !loading && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-white/10 px-2 text-slate-300 hover:bg-white/10"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-white/10 px-2 text-slate-300 hover:bg-white/10"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
            </>
          )}
          {downloadLink}
        </div>
      </div>

      {/* Body */}
      {isPptx && loading && (
        <div className="flex h-48 items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="size-4 animate-spin" />
          در حال رندر اسلایدها…
        </div>
      )}
      {isPptx && error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-3 text-xs text-amber-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{error} — می‌توانید فایل اصلی را دانلود کنید.</span>
        </div>
      )}
      {isPptx && !loading && !error && slides.length > 0 && (
        <img
          src={slides[Math.min(page - 1, slides.length - 1)]}
          alt={`اسلاید ${page}`}
          className="max-h-[420px] w-full rounded-lg border border-white/10 bg-black/30 object-contain"
        />
      )}

      {isPdf && (
        <embed
          src={`${url}#page=${page}&toolbar=0&navpanes=0&scrollbar=0`}
          type="application/pdf"
          className="h-[420px] w-full rounded-lg border border-white/10 bg-black/30"
        />
      )}

      {isImage && (
        <img
          src={url}
          alt={name}
          className="max-h-[420px] w-full rounded-lg border border-white/10 bg-black/30 object-contain"
        />
      )}

      {isLegacyPpt && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-3 text-xs text-amber-300">
          این فایل با قالب قدیمی PowerPoint (.ppt) است و نمایش اسلایدی آن در
          مرورگر پشتیبانی نمی‌شود. برای نمایش صفحه‌به‌صفحه، فایل را با پسوند{" "}
          <span dir="ltr" className="font-bold">.pptx</span> ذخیره و دوباره آپلود کنید.
        </div>
      )}
    </div>
  );
}