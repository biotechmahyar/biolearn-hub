import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { uploadBlob, formatFileSize } from "@/lib/upload";
import { toast } from "sonner";
import JSZip from "jszip";
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
        // Approximate page count via a pdf.js-free regex on the raw bytes
        const buf = await f.arrayBuffer();
        const text = new TextDecoder("latin1").decode(buf.slice(0, 2_000_000));
        const matches = text.match(/\/Type\s*\/Page[^s]/g);
        totalPages = matches ? matches.length : 1;
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

// ── PPTX → slide images (client-side renderer) ────────────────────────────
// Parses the OOXML package (a zip), reads slide text + embedded pictures and
// draws each slide onto a canvas. This is a pragmatic renderer for teaching
// decks (title + bullets + images); complex layouts are simplified.

type SlideParagraph = { text: string; sz: number; bold: boolean };
type SlidePic = { rId: string | null; x: number; y: number; w: number; h: number };

const EMU_PER_INCH = 914400;
const TARGET_W = 1280;

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function renderPptxSlides(file: File): Promise<Blob[]> {
  const zip = await JSZip.loadAsync(file);

  // Presentation size (EMU)
  let slideW = 12192000;
  let slideH = 6858000;
  const presXml = await zip.file("ppt/presentation.xml")?.async("string");
  const szMatch = presXml?.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  if (szMatch) {
    slideW = Number(szMatch[1]);
    slideH = Number(szMatch[2]);
  }

  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)/)?.[1] ?? 0);
      return na - nb;
    });

  if (slidePaths.length === 0) {
    throw new Error("در این فایل PowerPoint اسلایدی پیدا نشد.");
  }

  const scale = TARGET_W / (slideW / EMU_PER_INCH);
  const cw = TARGET_W;
  const ch = Math.max(200, Math.round((slideH / EMU_PER_INCH) * scale));

  const out: Blob[] = [];

  for (const slidePath of slidePaths) {
    const xml = await zip.file(slidePath)?.async("string");
    if (!xml) continue;
    const doc = new DOMParser().parseFromString(xml, "application/xml");

    // Picture elements (a:blip → rId, a:off/a:ext → position/size in EMU)
    const pics: SlidePic[] = Array.from(doc.getElementsByTagNameNS("*", "pic")).map(
      (pic) => {
        const blip = pic.getElementsByTagNameNS("*", "blip")[0];
        const rId =
          blip?.getAttribute("r:embed") ??
          blip?.getAttributeNS(
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
            "embed",
          ) ??
          null;
        const off = pic.getElementsByTagNameNS("*", "off")[0];
        const ext = pic.getElementsByTagNameNS("*", "ext")[0];
        return {
          rId,
          x: Number(off?.getAttribute("x") ?? 0),
          y: Number(off?.getAttribute("y") ?? 0),
          w: Number(ext?.getAttribute("cx") ?? 0),
          h: Number(ext?.getAttribute("cy") ?? 0),
        };
      },
    );

    // Text paragraphs (a:p → concatenated a:t runs, first rPr for size/bold)
    const paras: SlideParagraph[] = Array.from(
      doc.getElementsByTagNameNS("*", "p"),
    )
      .map((pEl) => {
        const text = Array.from(pEl.getElementsByTagNameNS("*", "t"))
          .map((t) => t.textContent ?? "")
          .join("")
          .trim();
        let sz = 1800;
        let bold = false;
        const rPr = pEl.getElementsByTagNameNS("*", "rPr")[0];
        if (rPr) {
          const s = rPr.getAttribute("sz");
          if (s) sz = Number(s);
          bold = rPr.getAttribute("b") === "1";
        }
        return { text, sz, bold };
      })
      .filter((p) => p.text.length > 0);

    // Slide relationships → media path
    const relsPath = slidePath.replace(
      /slides\/(slide\d+)\.xml$/,
      "slides/_rels/$1.xml.rels",
    );
    const relsXml = await zip.file(relsPath)?.async("string");
    const rels = new Map<string, string>();
    if (relsXml) {
      const rdoc = new DOMParser().parseFromString(relsXml, "application/xml");
      for (const rel of Array.from(rdoc.getElementsByTagName("Relationship"))) {
        const id = rel.getAttribute("Id");
        const target = rel.getAttribute("Target");
        if (id && target) {
          rels.set(id, target.replace(/^\.\.\//, "").replace(/^\//, ""));
        }
      }
    }

    // Draw slide
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cw, ch);

    for (const pic of pics) {
      if (!pic.rId) continue;
      const mediaPath = rels.get(pic.rId);
      if (!mediaPath) continue;
      const blob = await zip.file(`ppt/${mediaPath}`)?.async("blob");
      if (!blob) continue;
      try {
        const img = await loadImage(blob);
        const x = (pic.x * scale) / EMU_PER_INCH;
        const y = (pic.y * scale) / EMU_PER_INCH;
        const w = (pic.w * scale) / EMU_PER_INCH;
        const h = (pic.h * scale) / EMU_PER_INCH;
        ctx.drawImage(img, x, y, w, h);
      } catch {
        // skip undecodable picture
      }
    }

    let y = 36;
    paras.forEach((p, idx) => {
      const pt = p.sz / 100;
      const px = Math.max(14, Math.round(pt * 1.33));
      const isTitle = idx === 0;
      const fontPx = isTitle ? Math.max(30, px) : px;
      ctx.font = `${p.bold || isTitle ? "bold " : ""}${fontPx}px sans-serif`;
      ctx.fillStyle = "#111827";
      if (isTitle) {
        ctx.textAlign = "center";
        ctx.fillText(p.text, cw / 2, y + fontPx);
        ctx.textAlign = "left";
        y += fontPx * 1.7;
      } else {
        const margin = 44;
        const lines = wrapText(ctx, p.text, cw - margin * 2);
        for (const ln of lines) {
          if (y > ch - fontPx) break;
          ctx.fillText(ln, margin, y + fontPx);
          y += fontPx * 1.4;
        }
        y += 8;
      }
    });

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (blob) out.push(blob);
  }

  if (out.length === 0) throw new Error("اسلایدها رندر نشدند.");
  return out;
}