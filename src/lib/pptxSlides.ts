// ── PPTX → slide images (client-side renderer) ────────────────────────────
// Parses the OOXML package (a zip), reads slide text + embedded pictures and
// draws each slide onto a canvas. This is a pragmatic renderer for teaching
// decks (title + bullets + images); complex layouts are simplified.
// Shared by the live whiteboard (instructor-synced) and lesson attachments
// (self-paced inline viewer).

import JSZip from "jszip";

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

export async function renderPptxSlides(file: File | Blob): Promise<Blob[]> {
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

// Rough page count for PDFs without pulling in pdf.js (good enough for paging).
export function pdfPageCount(bytes: ArrayBuffer): number {
  const text = new TextDecoder("latin1").decode(bytes.slice(0, 2_000_000));
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 1;
}