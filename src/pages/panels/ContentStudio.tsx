import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Edit3,
  FileText,
  Rocket,
  Eye,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListOrdered,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  RemoveFormatting,
  Type,
  Highlighter,
  Languages,
  Image,
  Upload,
  Trash,
  ExternalLink,
  Link2,
  Unlink,
  Video,
  X,
  Table,
  Minus,
  FlaskConical,
  AlertTriangle,
  Info,
  Lightbulb,
  Calculator,
  Search,
} from "lucide-react";

function ToolbarBtn({ icon, title, exec }: { icon: React.ReactNode; title: string; exec: () => void }) {
  return (
    <button
      type="button"
      title={title}
      className="rounded px-1.5 py-1 text-xs text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      onMouseDown={(e) => {
        e.preventDefault();
        exec();
      }}
    >
      {icon}
    </button>
  );
}

// ── Tiny Rich Text Editor (contentEditable) ─────────────────────────────
const FONT_FAMILIES = [
  { label: "پیش‌فرض", value: "" },
  { label: "Vazirmatn", value: "Vazirmatn, sans-serif" },
  { label: "IRANSans", value: "IRANSans, sans-serif" },
  { label: "system-ui", value: "system-ui, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
];

const FONT_SIZES = [
  { label: "۱۰", value: "1", px: "10px" },
  { label: "۱۲", value: "2", px: "12px" },
  { label: "۱۴", value: "3", px: "14px" },
  { label: "۱۶", value: "4", px: "16px" },
  { label: "۲۰", value: "5", px: "20px" },
  { label: "۲۴", value: "6", px: "24px" },
  { label: "۳۲", value: "7", px: "32px" },
];

function Editor({
  html,
  onChange,
  onImagePicker,
  onLink,
  onRemoveLink,
  onEmbed,
  onEmbedHtml,
  editorRef,
  onTable,
  onSciBlock,
}: {
  html: string;
  onChange: (html: string) => void;
  onImagePicker?: () => void
  onLink?: (data: { url: string; text: string; newTab: boolean; isEditing: boolean }) => void
  onRemoveLink?: () => void
  onEmbed?: () => void
  onEmbedHtml?: (html: string) => void
  editorRef?: React.RefObject<HTMLDivElement | null>
  onTable?: () => void
  onSciBlock?: (type: string) => void
}) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = editorRef || internalRef;
  const [dir, setDir] = useState<"rtl" | "ltr">("rtl");
  const [activeFont, setActiveFont] = useState("");
  const [activeColor, setActiveColor] = useState("#ffffff");
  const [activeHighlight, setActiveHighlight] = useState("#facc15");

  // Sync external HTML → DOM only when html prop changes from outside
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
    }
  }, [html]);

  const exec = useCallback(
    (cmd: string, val?: string) => {
      ref.current?.focus();
      document.execCommand(cmd, false, val);
    },
    [],
  );

  // Trigger onChange after every exec command
  const execAndNotify = useCallback(
    (cmd: string, val?: string) => {
      exec(cmd, val);
      // Small delay to let browser apply the command before reading innerHTML
      requestAnimationFrame(() => {
        if (ref.current) onChange(ref.current.innerHTML);
      });
    },
    [exec, onChange],
  );

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      {/* Row 1: Appearance toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-2 py-1.5">
        {/* RTL/LTR toggle */}
        <button
          type="button"
          title={dir === "rtl" ? "RTL (راست به چپ)" : "LTR (چپ به راست)"}
          className="rounded px-2 py-1 text-[10px] font-bold text-cyan-300 transition-colors hover:bg-white/10"
          onMouseDown={(e) => {
            e.preventDefault();
            const next = dir === "rtl" ? "ltr" : "rtl";
            setDir(next);
            if (ref.current) ref.current.dir = next;
          }}
        >
          <Languages className="h-3.5 w-3.5" />
        </button>
        <span className="mx-0.5 h-4 w-px bg-white/10" />

        {/* Font Family */}
        <select
          title="فونت"
          className="h-7 cursor-pointer rounded border border-white/10 bg-[#0c1a28] px-1.5 text-[11px] text-slate-300 focus:outline-none"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const val = e.target.value;
            setActiveFont(val);
            if (val) {
              execAndNotify("fontName", val);
            } else {
              execAndNotify("removeFormat");
            }
          }}
          value={activeFont}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value || "inherit" }}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Font Size */}
        <select
          title="اندازه فونت"
          className="h-7 w-14 cursor-pointer rounded border border-white/10 bg-[#0c1a28] px-1.5 text-[11px] text-slate-300 focus:outline-none"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            execAndNotify("fontSize", e.target.value);
          }}
        >
          <option value="">سایز</option>
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} ({s.px})
            </option>
          ))}
        </select>
        <span className="mx-0.5 h-4 w-px bg-white/10" />

        {/* Text Color */}
        <label
          title="رنگ متن"
          className="flex h-7 cursor-pointer items-center gap-1 rounded border border-white/10 bg-[#0c1a28] px-1.5 text-[11px] text-slate-300 hover:bg-white/5"
        >
          <Type className="h-3 w-3" />
          <input
            type="color"
            value={activeColor}
            onChange={(e) => {
              setActiveColor(e.target.value);
              execAndNotify("foreColor", e.target.value);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>

        {/* Highlight Color */}
        <label
          title="هایلایت"
          className="flex h-7 cursor-pointer items-center gap-1 rounded border border-white/10 bg-[#0c1a28] px-1.5 text-[11px] text-slate-300 hover:bg-white/5"
        >
          <Highlighter className="h-3 w-3" />
          <input
            type="color"
            value={activeHighlight}
            onChange={(e) => {
              setActiveHighlight(e.target.value);
              execAndNotify("hiliteColor", e.target.value);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
      </div>

      {/* Row 2: Formatting toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 px-2 py-1">
        {/* Inline formatting */}
        <ToolbarBtn icon={<Bold className="h-3.5 w-3.5" />} title="Bold" exec={() => exec("bold")} />
        <ToolbarBtn icon={<Italic className="h-3.5 w-3.5" />} title="Italic" exec={() => exec("italic")} />
        <ToolbarBtn icon={<Underline className="h-3.5 w-3.5" />} title="Underline" exec={() => exec("underline")} />
        <ToolbarBtn icon={<Strikethrough className="h-3.5 w-3.5" />} title="Strikethrough" exec={() => exec("strikeThrough")} />
        <span className="mx-1 h-4 w-px bg-white/10" />
        {/* Headings */}
        <ToolbarBtn icon={<Heading1 className="h-3.5 w-3.5" />} title="H1" exec={() => exec("formatBlock", "<h1>")} />
        <ToolbarBtn icon={<Heading2 className="h-3.5 w-3.5" />} title="H2" exec={() => exec("formatBlock", "<h2>")} />
        <ToolbarBtn icon={<Heading3 className="h-3.5 w-3.5" />} title="H3" exec={() => exec("formatBlock", "<h3>")} />
        <ToolbarBtn icon={<Heading4 className="h-3.5 w-3.5" />} title="H4" exec={() => exec("formatBlock", "<h4>")} />
        <ToolbarBtn icon={<Heading5 className="h-3.5 w-3.5" />} title="H5" exec={() => exec("formatBlock", "<h5>")} />
        <ToolbarBtn icon={<Heading6 className="h-3.5 w-3.5" />} title="H6" exec={() => exec("formatBlock", "<h6>")} />
        <ToolbarBtn icon={<span className="text-[10px] font-bold">P</span>} title="Paragraph" exec={() => exec("formatBlock", "<p>")} />
        <span className="mx-1 h-4 w-px bg-white/10" />
        {/* Lists */}
        <ToolbarBtn icon={<List className="h-3.5 w-3.5" />} title="Bullet List" exec={() => exec("insertUnorderedList")} />
        <ToolbarBtn icon={<ListOrdered className="h-3.5 w-3.5" />} title="Numbered List" exec={() => exec("insertOrderedList")} />
        <span className="mx-1 h-4 w-px bg-white/10" />
        {/* Block formatting */}
        <ToolbarBtn icon={<Quote className="h-3.5 w-3.5" />} title="Quote" exec={() => exec("formatBlock", "<blockquote>")} />
        <ToolbarBtn icon={<Code className="h-3.5 w-3.5" />} title="Code Block" exec={() => exec("formatBlock", "<pre>")} />
        <span className="mx-1 h-4 w-px bg-white/10" />
        {/* Image */}
        <ToolbarBtn
          icon={<Image className="h-3.5 w-3.5" />}
          title="Insert Image"
          exec={() => {
            if (onImagePicker) onImagePicker()
          }}
        />
        {/* Link */}
        <ToolbarBtn
          icon={<Link2 className="h-3.5 w-3.5" />}
          title="Add Link"
          exec={() => {
            if (!ref.current) return
            const sel = window.getSelection()
            if (!sel || sel.rangeCount === 0) return
            const range = sel.getRangeAt(0)
            // Check if selection is inside an anchor tag
            let anchorEl: HTMLAnchorElement | null = null
            let node: Node | null = sel.anchorNode
            while (node && node !== ref.current) {
              if (node.nodeType === 1 && (node as HTMLElement).tagName === "A") {
                anchorEl = node as HTMLAnchorElement
                break
              }
              node = node.parentNode
            }
            if (anchorEl && onLink) {
              onLink({
                url: anchorEl.href || "",
                text: anchorEl.textContent || "",
                newTab: anchorEl.target === "_blank",
                isEditing: true,
              })
            } else if (onLink) {
              const selectedText = sel.toString()
              onLink({
                url: "",
                text: selectedText,
                newTab: true,
                isEditing: false,
              })
            }
          }}
        />
        {/* Remove Link */}
        <ToolbarBtn
          icon={<Unlink className="h-3.5 w-3.5" />}
          title="Remove Link"
          exec={() => {
            if (!ref.current) return
            const sel = window.getSelection()
            if (!sel || sel.rangeCount === 0) return
            let node: Node | null = sel.anchorNode
            while (node && node !== ref.current) {
              if (node.nodeType === 1 && (node as HTMLElement).tagName === "A") {
                const anchor = node as HTMLAnchorElement
                const parent = anchor.parentNode
                while (anchor.firstChild) parent?.insertBefore(anchor.firstChild, anchor)
                parent?.removeChild(anchor)
                if (onRemoveLink) onRemoveLink()
                requestAnimationFrame(() => {
                  if (ref.current) onChange(ref.current.innerHTML)
                })
                return
              }
              node = node.parentNode
            }
            toast.info("ابتدا روی لینک کلیک کنید")
          }}
        />
        {/* Embed */}
        <ToolbarBtn
          icon={<Video className="h-3.5 w-3.5" />}
          title="Embed (YouTube / PDF)"
          exec={() => {
            if (onEmbed) onEmbed()
          }}
        />
        {/* Table */}
        <ToolbarBtn
          icon={<Table className="h-3.5 w-3.5" />}
          title="Insert Table"
          exec={() => { if (onTable) onTable() }}
        />
        <span className="mx-1 h-4 w-px bg-white/10" />
        {/* Scientific Elements */}
        <ToolbarBtn
          icon={<FlaskConical className="h-3.5 w-3.5" />}
          title="Scientific Note"
          exec={() => onSciBlock?.("note")}
        />
        <ToolbarBtn
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          title="Warning"
          exec={() => onSciBlock?.("warning")}
        />
        <ToolbarBtn
          icon={<Info className="h-3.5 w-3.5" />}
          title="Important"
          exec={() => onSciBlock?.("important")}
        />
        <ToolbarBtn
          icon={<Lightbulb className="h-3.5 w-3.5" />}
          title="Key Point"
          exec={() => onSciBlock?.("keypoint")}
        />
        <ToolbarBtn
          icon={<span className="text-[10px] font-bold">D</span>}
          title="Definition"
          exec={() => onSciBlock?.("definition")}
        />
        <ToolbarBtn
          icon={<span className="text-[10px] font-bold">E</span>}
          title="Example"
          exec={() => onSciBlock?.("example")}
        />
        <ToolbarBtn
          icon={<Calculator className="h-3.5 w-3.5" />}
          title="Formula"
          exec={() => onSciBlock?.("formula")}
        />
        {/* Alignment */}
        <ToolbarBtn icon={<AlignRight className="h-3.5 w-3.5" />} title="Align Right" exec={() => exec("justifyRight")} />
        <ToolbarBtn icon={<AlignCenter className="h-3.5 w-3.5" />} title="Align Center" exec={() => exec("justifyCenter")} />
        <ToolbarBtn icon={<AlignLeft className="h-3.5 w-3.5" />} title="Align Left" exec={() => exec("justifyLeft")} />
        <ToolbarBtn icon={<AlignJustify className="h-3.5 w-3.5" />} title="Justify" exec={() => exec("justifyFull")} />
        <span className="mx-1 h-4 w-px bg-white/10" />
        {/* Undo / Redo / Clear */}
        <ToolbarBtn icon={<Undo className="h-3.5 w-3.5" />} title="Undo" exec={() => exec("undo")} />
        <ToolbarBtn icon={<Redo className="h-3.5 w-3.5" />} title="Redo" exec={() => exec("redo")} />
        <ToolbarBtn icon={<RemoveFormatting className="h-3.5 w-3.5" />} title="Clear Formatting" exec={() => exec("removeFormat")} />
      </div>
      {/* Row 3: Table operations */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 px-2 py-1">
        <span className="text-[10px] font-bold text-slate-500">جدول:</span>
        <button type="button" title="افزودن ردیف"
          className="rounded px-1.5 py-1 text-[10px] text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          onMouseDown={(e) => {
            e.preventDefault();
            if (!ref.current) return;
            const sel = window.getSelection(); if (!sel || !sel.anchorNode) return;
            let td: HTMLElement | null = null;
            let n: Node | null = sel.anchorNode;
            while (n && n !== ref.current) { if (n.nodeType === 1 && (n as HTMLElement).tagName === "TD") { td = n as HTMLElement; break; } n = n.parentNode; }
            if (!td) { toast.info("ابتدا روی سلول جدول کلیک کنید"); return; }
            const tr = td.closest("tr");
            const table = td.closest("table"); if (!tr || !table) return;
            const newTr = document.createElement("tr");
            for (let i = 0; i < tr.cells.length; i++) {
              const newTd = document.createElement("td");
              newTd.style.cssText = "border:1px solid rgba(255,255,255,0.15);padding:8px 12px;min-width:60px";
              newTd.innerHTML = "<br>";
              newTr.appendChild(newTd);
            }
            tr.parentNode?.insertBefore(newTr, tr.nextSibling);
            requestAnimationFrame(() => { if (ref.current) onChange(ref.current.innerHTML); });
          }}>
          <Plus className="h-3 w-3" /> ردیف
        </button>
        <button type="button" title="حذف ردیف"
          className="rounded px-1.5 py-1 text-[10px] text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
          onMouseDown={(e) => {
            e.preventDefault();
            if (!ref.current) return;
            const sel = window.getSelection(); if (!sel || !sel.anchorNode) return;
            let td: HTMLElement | null = null;
            let n: Node | null = sel.anchorNode;
            while (n && n !== ref.current) { if (n.nodeType === 1 && (n as HTMLElement).tagName === "TD") { td = n as HTMLElement; break; } n = n.parentNode; }
            if (!td) { toast.info("ابتدا روی سلول جدول کلیک کنید"); return; }
            const tr = td.closest("tr"); const table = td.closest("table"); if (!tr || !table) return;
            if (table.querySelectorAll("tr").length <= 1) { toast.error("حداقل یک ردیف باید باقی بماند"); return; }
            tr.remove();
            requestAnimationFrame(() => { if (ref.current) onChange(ref.current.innerHTML); });
          }}>
          <Minus className="h-3 w-3" /> ردیف
        </button>
        <span className="mx-0.5 h-4 w-px bg-white/10" />
        <button type="button" title="افزودن ستون"
          className="rounded px-1.5 py-1 text-[10px] text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          onMouseDown={(e) => {
            e.preventDefault();
            if (!ref.current) return;
            const sel = window.getSelection(); if (!sel || !sel.anchorNode) return;
            let td: HTMLElement | null = null;
            let n: Node | null = sel.anchorNode;
            while (n && n !== ref.current) { if (n.nodeType === 1 && (n as HTMLElement).tagName === "TD") { td = n as HTMLElement; break; } n = n.parentNode; }
            if (!td) { toast.info("ابتدا روی سلول جدول کلیک کنید"); return; }
            const table = td.closest("table"); if (!table) return;
            const colIdx = Array.from(td.parentNode!.children).indexOf(td);
            table.querySelectorAll("tr").forEach((row) => {
              const newCell = document.createElement(row.children[colIdx]?.tagName === "TH" ? "th" : "td");
              const isHeader = newCell.tagName === "TH";
              newCell.style.cssText = isHeader
                ? "border:1px solid rgba(255,255,255,0.15);padding:8px 12px;background:rgba(6,182,212,0.15);font-weight:bold;min-width:60px"
                : "border:1px solid rgba(255,255,255,0.15);padding:8px 12px;min-width:60px";
              newCell.innerHTML = "<br>";
              const refCell = row.children[colIdx];
              if (refCell) row.insertBefore(newCell, refCell.nextSibling);
              else row.appendChild(newCell);
            });
            requestAnimationFrame(() => { if (ref.current) onChange(ref.current.innerHTML); });
          }}>
          <Plus className="h-3 w-3" /> ستون
        </button>
        <button type="button" title="حذف ستون"
          className="rounded px-1.5 py-1 text-[10px] text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
          onMouseDown={(e) => {
            e.preventDefault();
            if (!ref.current) return;
            const sel = window.getSelection(); if (!sel || !sel.anchorNode) return;
            let td: HTMLElement | null = null;
            let n: Node | null = sel.anchorNode;
            while (n && n !== ref.current) { if (n.nodeType === 1 && (n as HTMLElement).tagName === "TD") { td = n as HTMLElement; break; } n = n.parentNode; }
            if (!td) { toast.info("ابتدا روی سلول جدول کلیک کنید"); return; }
            const table = td.closest("table"); if (!table) return;
            const colIdx = Array.from(td.parentNode!.children).indexOf(td);
            if (table.querySelector("tr")!.children.length <= 1) { toast.error("حداقل یک ستون باید باقی بماند"); return; }
            table.querySelectorAll("tr").forEach((row) => {
              const cell = row.children[colIdx];
              if (cell) cell.remove();
            });
            requestAnimationFrame(() => { if (ref.current) onChange(ref.current.innerHTML); });
          }}>
          <Minus className="h-3 w-3" /> ستون
        </button>
      </div>
      {/* Content */}        <div
          ref={(el) => {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
            if (el && el.innerHTML !== html) {
              el.innerHTML = html;
            }
          }}
          contentEditable
          dir={dir}
          suppressContentEditableWarning
        className="min-h-[250px] px-4 py-3 text-sm leading-7 text-slate-200 focus:outline-none prose prose-invert max-w-none"
        onInput={() => {
          if (!ref.current) return;
          const html = ref.current.innerHTML;
          onChange(html);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const node = sel.anchorNode;
              if (node) {
                const el = (node.nodeType === 3 ? node.parentElement : node) as HTMLElement;
                if (el?.tagName === "H1") {
                  e.preventDefault();
                  exec("formatBlock", "<p>");
                }
              }
            }
          }
        }}
      />
    </div>
  );
}

// ── Image Picker Dialog ─────────────────────────────────────────────────
function ImagePickerDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onInsert: (img: { src: string; alt: string; width?: string; align?: string }) => void
}) {
  const [tab, setTab] = useState<"url" | "upload" | "library">("url")
  const [url, setUrl] = useState("")
  const [alt, setAlt] = useState("")
  const [align, setAlign] = useState<string>("center")
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const mediaItems = useQuery(api.contentStudio.listMedia)
  const addMedia = useMutation(api.contentStudio.addMedia)
  const deleteMedia = useMutation(api.contentStudio.deleteMedia)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("فقط فایل تصویری مجاز است")
      return
    }
    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        try {
          await addMedia({
            url: dataUrl,
            name: file.name,
            size: file.size,
            mimeType: file.type,
          })
        } catch {
          // Media table may not exist yet — insert into editor anyway
        }
        onInsert({ src: dataUrl, alt: alt || file.name, align })
        onOpenChange(false)
        setUrl("")
        setAlt("")
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      toast.error("خطا در بارگذاری فایل")
      setUploading(false)
    }
    e.target.value = ""
  }

  const handleInsertUrl = () => {
    if (!url.trim()) {
      toast.error("آدرس تصویر را وارد کنید")
      return
    }
    onInsert({ src: url.trim(), alt: alt || "", align })
    onOpenChange(false)
    setUrl("")
    setAlt("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto border-white/10 bg-[#0c1a28] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-right text-cyan-100">تصویر</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10">
          {(["url", "upload", "library"] as const).map((t) => (
            <button
              key={t}
              className={`px-3 py-1.5 text-xs transition-colors ${
                tab === t ? "border-b-2 border-cyan-400 text-cyan-300" : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "url" ? "آدرس URL" : t === "upload" ? "بارگذاری" : "کتابخانه"}
            </button>
          ))}
        </div>

        {/* Alt + Align (always visible) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold text-slate-400">Alt Text</label>
            <Input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="متن جایگزین"
              className="h-8 border-white/10 bg-white/5 text-xs text-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-slate-400">تراز</label>
            <select
              value={align}
              onChange={(e) => setAlign(e.target.value)}
              className="h-8 w-full cursor-pointer rounded border border-white/10 bg-[#0c1a28] px-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="center">وسط</option>
              <option value="left">چپ</option>
              <option value="right">راست</option>
              <option value="full">تمام عرض</option>
            </select>
          </div>
        </div>

        {/* Tab: URL */}
        {tab === "url" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-400">آدرس تصویر</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="h-8 border-white/10 bg-white/5 text-xs text-slate-200"
                onKeyDown={(e) => { if (e.key === "Enter") handleInsertUrl() }}
              />
            </div>
            {url && (
              <div className="rounded border border-white/10 p-2">
                <img src={url} alt={alt} className="max-h-40 w-full rounded object-contain" />
              </div>
            )}
            <Button size="sm" className="w-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30" onClick={handleInsertUrl}>
              <ExternalLink className="ml-1 h-3.5 w-3.5" /> درج تصویر
            </Button>
          </div>
        )}

        {/* Tab: Upload */}
        {tab === "upload" && (
          <div className="space-y-3">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-white/10 py-8 text-slate-400 transition-colors hover:border-cyan-400/30 hover:text-cyan-300"
            >
              <Upload className="h-8 w-8" />
              <span className="text-xs">{uploading ? "در حال بارگذاری..." : "کلیک کنید یا تصویر را بکشید"}</span>
              <span className="text-[10px] text-slate-500">JPG, PNG, GIF, WebP — حداکثر 5MB</span>
            </button>
          </div>
        )}

        {/* Tab: Library */}
        {tab === "library" && (
          <div className="space-y-3">
            {mediaItems && mediaItems.length > 0 ? (
              <div className="grid max-h-[300px] grid-cols-3 gap-2 overflow-y-auto">
                {mediaItems.map((m) => (
                  <div
                    key={m._id}
                    className="group relative cursor-pointer rounded border border-white/10 transition-colors hover:border-cyan-400/30"
                    onClick={() => {
                      onInsert({ src: m.url, alt: m.alt || m.name, align })
                      onOpenChange(false)
                    }}
                  >
                    <img src={m.url} alt={m.alt || m.name} className="aspect-square w-full rounded object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {m.name}
                    </div>
                    <button
                      type="button"
                      className="absolute right-1 top-1 hidden rounded bg-red-500/80 p-0.5 group-hover:block"
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (!window.confirm("حذف تصویر؟")) return
                        try { await deleteMedia({ id: m._id }) } catch { /* ignore */ }
                      }}
                    >
                      <Trash className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-slate-500">هنوز تصویری بارگذاری نشده</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Link Dialog ─────────────────────────────────────────────────────────
function LinkDialog({
  open,
  onOpenChange,
  onInsert,
  onRemove,
  initialUrl,
  initialText,
  initialNewTab,
  isEditing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onInsert: (link: { url: string; text: string; newTab: boolean }) => void
  onRemove: () => void
  initialUrl?: string
  initialText?: string
  initialNewTab?: boolean
  isEditing?: boolean
}) {
  const [url, setUrl] = useState(initialUrl || "")
  const [text, setText] = useState(initialText || "")
  const [newTab, setNewTab] = useState(initialNewTab ?? true)

  useEffect(() => {
    if (open) {
      setUrl(initialUrl || "")
      setText(initialText || "")
      setNewTab(initialNewTab ?? true)
    }
  }, [open, initialUrl, initialText, initialNewTab])

  const isValidUrl = (s: string) => {
    try {
      const u = new URL(s)
      return u.protocol === "http:" || u.protocol === "https:"
    } catch {
      return false
    }
  }

  const handleInsert = () => {
    if (!url.trim()) {
      toast.error("آدرس لینک را وارد کنید")
      return
    }
    if (!isValidUrl(url.trim())) {
      toast.error("آدرس لینک معتبر نیست (http:// یا https:// لازم است)")
      return
    }
    onInsert({ url: url.trim(), text: text.trim() || url.trim(), newTab })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0c1a28] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right text-cyan-100">
            {isEditing ? "ویرایش لینک" : "افزودن لینک"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold text-slate-400">آدرس لینک</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="h-8 border-white/10 bg-white/5 text-xs text-slate-200"
              dir="ltr"
              onKeyDown={(e) => { if (e.key === "Enter") handleInsert() }}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-slate-400">متن نمایشی</label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="متن لینک"
              className="h-8 border-white/10 bg-white/5 text-xs text-slate-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="newTab"
              checked={newTab}
              onChange={(e) => setNewTab(e.target.checked)}
              className="h-4 w-4 rounded border-white/10 bg-white/5"
            />
            <label htmlFor="newTab" className="text-xs text-slate-400">باز شدن در تب جدید</label>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
              onClick={() => { onRemove(); onOpenChange(false) }}
            >
              <Unlink className="ml-1 h-3.5 w-3.5" /> حذف لینک
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-slate-400"
          >
            انصراف
          </Button>
          <Button
            size="sm"
            className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
            onClick={handleInsert}
          >
            {isEditing ? "بروزرسانی" : "افزودن"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Embed Dialog ───────────────────────────────────────────────────────
function EmbedDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onInsert: (html: string) => void
}) {
  const [tab, setTab] = useState<"video" | "pdf" | "iframe">("video")
  const [videoUrl, setVideoUrl] = useState("")
  const [pdfUrl, setPdfUrl] = useState("")
  const [pdfTitle, setPdfTitle] = useState("")
  const [iframeUrl, setIframeUrl] = useState("")
  const [iframeTitle, setIframeTitle] = useState("")
  const [iframeHeight, setIframeHeight] = useState("500")

  // ── Platform detection ─────────────────────────────────────────────────
  type PlatformInfo = { name: string; icon: string; embedUrl: string | null };

  const detectPlatform = (url: string): PlatformInfo => {
    const u = url.trim();
    // YouTube
    const ytPatterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of ytPatterns) {
      const m = u.match(p);
      if (m) return { name: "YouTube", icon: "🎬", embedUrl: `https://www.youtube.com/embed/${m[1]}` };
    }
    // Aparat
    const apPatterns = [
      /aparat\.com\/embed\/([a-zA-Z0-9]+)/,
      /aparat\.com\/v\/([a-zA-Z0-9]+)/,
      /aparat\.com\/video\/([a-zA-Z0-9]+)/,
      /aparat\.com\/([a-zA-Z0-9]+)$/,
    ];
    for (const p of apPatterns) {
      const m = u.match(p);
      if (m) return { name: "آپارات", icon: "📹", embedUrl: `https://www.aparat.com/embed/video${m[1]}` };
    }
    // Vimeo
    const vmPatterns = [
      /vimeo\.com\/(\d+)/,
      /player\.vimeo\.com\/video\/(\d+)/,
    ];
    for (const p of vmPatterns) {
      const m = u.match(p);
      if (m) return { name: "Vimeo", icon: "🎞️", embedUrl: `https://player.vimeo.com/video/${m[1]}` };
    }
    // Generic: if it looks like a URL, allow iframe
    try { new URL(u); return { name: "سایت دیگر", icon: "🌐", embedUrl: u }; } catch { /* not url */ }
    return { name: "ناشناخته", icon: "❓", embedUrl: null };
  };

  const platform = videoUrl.trim() ? detectPlatform(videoUrl) : null;

  const handleInsertVideo = () => {
    if (!videoUrl.trim()) {
      toast.error("آدرس ویدئو را وارد کنید");
      return;
    }
    if (!platform?.embedUrl) {
      toast.error("آدرس ویدئو معتبر نیست");
      return;
    }
    const html = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:16px 0;border-radius:12px;background:#000"><iframe src=\"${platform.embedUrl}\" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen loading="lazy" allow="autoplay;encrypted-media"></iframe></div><p><br></p>`;
    onInsert(html);
    onOpenChange(false);
    setVideoUrl("");
  };

  const handleInsertPDF = () => {
    if (!pdfUrl.trim()) {
      toast.error("آدرس PDF را وارد کنید");
      return;
    }
    try { new URL(pdfUrl.trim()); } catch {
      toast.error("آدرس PDF معتبر نیست");
      return;
    }
    const html = `<div style="margin:16px 0;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)"><div style="background:rgba(255,255,255,0.05);padding:8px 12px;display:flex;align-items:center;gap:8px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span style="font-size:12px;color:#94a3b8">${pdfTitle || "PDF Document"}</span></div><iframe src=\"${pdfUrl.trim()}\" style="width:100%;height:500px;border:0"></iframe></div><p><br></p>`;
    onInsert(html);
    onOpenChange(false);
    setPdfUrl("");
    setPdfTitle("");
  };

  const handleInsertIframe = () => {
    if (!iframeUrl.trim()) {
      toast.error("آدرس iframe را وارد کنید");
      return;
    }
    try { new URL(iframeUrl.trim()); } catch {
      toast.error("آدرس معتبر نیست");
      return;
    }
    const html = `<div style="margin:16px 0;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)"><div style="background:rgba(255,255,255,0.05);padding:8px 12px;display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:#94a3b8">${iframeTitle || "Embedded Content"}</span></div><iframe src=\"${iframeUrl.trim()}\" style="width:100%;height:${iframeHeight}px;border:0"></iframe></div><p><br></p>`;
    onInsert(html);
    onOpenChange(false);
    setIframeUrl("");
    setIframeTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#0c1a28] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-right text-cyan-100">جاسازی محتوا</DialogTitle>
        </DialogHeader>
        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10">
          {(["video", "pdf", "iframe"] as const).map((t) => (
            <button
              key={t}
              className={`px-3 py-1.5 text-xs transition-colors ${
                tab === t ? "border-b-2 border-cyan-400 text-cyan-300" : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "video" ? "🎬 ویدئو" : t === "pdf" ? "📄 PDF" : "🌐 iframe"}
            </button>
          ))}
        </div>

        {tab === "video" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-400">آدرس ویدئو</label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="YouTube, آپارات, Vimeo یا هر آدرس دیگر..."
                className="h-8 border-white/10 bg-white/5 text-xs text-slate-200"
                dir="ltr"
                onKeyDown={(e) => { if (e.key === "Enter") handleInsertVideo() }}
              />
              {platform && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                  <span>{platform.icon}</span>
                  <span className={platform.embedUrl ? "text-emerald-400" : "text-amber-400"}>
                    {platform.embedUrl ? `${platform.name} — شناسایی شد ✓` : `ناشناخته — از iframe استفاده کنید`}
                  </span>
                </div>
              )}
            </div>
            {/* Preview */}
            {platform?.embedUrl && (
              <div className="overflow-hidden rounded-lg border border-white/10">
                <iframe
                  src={platform.embedUrl}
                  className="aspect-video w-full"
                  allowFullScreen
                  allow="autoplay;encrypted-media"
                  loading="lazy"
                />
              </div>
            )}
            <Button size="sm" className="w-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30" onClick={handleInsertVideo}>
              <Video className="ml-1 h-3.5 w-3.5" /> جاسازی ویدئو
            </Button>
          </div>
        )}

        {tab === "pdf" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-400">آدرس فایل PDF</label>
              <Input
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="https://example.com/document.pdf"
                className="h-8 border-white/10 bg-white/5 text-xs text-slate-200"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-400">عنوان (اختیاری)</label>
              <Input
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                placeholder="نام سند"
                className="h-8 border-white/10 bg-white/5 text-xs text-slate-200"
              />
            </div>
            <Button size="sm" className="w-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30" onClick={handleInsertPDF}>
              <ExternalLink className="ml-1 h-3.5 w-3.5" /> جاسازی PDF
            </Button>
          </div>
        )}

        {tab === "iframe" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-400">آدرس iframe</label>
              <Input
                value={iframeUrl}
                onChange={(e) => setIframeUrl(e.target.value)}
                placeholder="https://example.com/embed..."
                className="h-8 border-white/10 bg-white/5 text-xs text-slate-200"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-400">عنوان (اختیاری)</label>
              <Input
                value={iframeTitle}
                onChange={(e) => setIframeTitle(e.target.value)}
                placeholder="نام محتوا"
                className="h-8 border-white/10 bg-white/5 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-400">ارتفاع (px)</label>
              <Input
                type="number"
                value={iframeHeight}
                onChange={(e) => setIframeHeight(e.target.value)}
                placeholder="500"
                className="h-8 border-white/10 bg-white/5 text-xs text-slate-200"
                min="200"
                dir="ltr"
              />
            </div>
            {/* Preview */}
            {iframeUrl.trim() && (() => {
              try {
                new URL(iframeUrl.trim());
                return (
                  <div className="overflow-hidden rounded-lg border border-white/10">
                    <iframe
                      src={iframeUrl.trim()}
                      className="w-full border-0"
                      style={{ height: `${iframeHeight}px` }}
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                );
              } catch {
                return null;
              }
            })()}
            <Button size="sm" className="w-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30" onClick={handleInsertIframe}>
              <ExternalLink className="ml-1 h-3.5 w-3.5" /> جاسازی iframe
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Table Dialog ───────────────────────────────────────────────────────
function TableDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onInsert: (html: string) => void
}) {
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const [hasHeader, setHasHeader] = useState(true)

  const buildTable = (): string => {
    const cellStyle = "border:1px solid rgba(255,255,255,0.15);padding:8px 12px;text-align:right;min-width:60px"
    const headerStyle = "border:1px solid rgba(255,255,255,0.15);padding:8px 12px;text-align:right;background:rgba(6,182,212,0.15);font-weight:bold;min-width:60px"
    let html = `<table style="width:100%;border-collapse:collapse;margin:16px 0;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)">`
    if (hasHeader) {
      html += `<tr>`
      for (let c = 0; c < cols; c++) html += `<th style="${headerStyle}"><br></th>`
      html += `</tr>`
    }
    const dataRows = hasHeader ? rows - 1 : rows
    for (let r = 0; r < dataRows; r++) {
      html += `<tr>`
      for (let c = 0; c < cols; c++) html += `<td style="${cellStyle}"><br></td>`
      html += `</tr>`
    }
    html += `</table><p><br></p>`
    return html
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0c1a28] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-right text-cyan-100">درج جدول</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-400">تعداد ردیف</label>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded bg-white/5 p-1 text-slate-400 hover:bg-white/10" onClick={() => setRows((r) => Math.max(1, r - 1))}><Minus className="h-3 w-3" /></button>
                <span className="w-8 text-center text-sm text-white">{rows}</span>
                <button type="button" className="rounded bg-white/5 p-1 text-slate-400 hover:bg-white/10" onClick={() => setRows((r) => Math.min(20, r + 1))}><Plus className="h-3 w-3" /></button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-400">تعداد ستون</label>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded bg-white/5 p-1 text-slate-400 hover:bg-white/10" onClick={() => setCols((c) => Math.max(1, c - 1))}><Minus className="h-3 w-3" /></button>
                <span className="w-8 text-center text-sm text-white">{cols}</span>
                <button type="button" className="rounded bg-white/5 p-1 text-slate-400 hover:bg-white/10" onClick={() => setCols((c) => Math.min(10, c + 1))}><Plus className="h-3 w-3" /></button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="tableHeader" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="h-4 w-4 rounded border-white/10 bg-white/5" />
            <label htmlFor="tableHeader" className="text-xs text-slate-400">سطر هدر (Header)</label>
          </div>
          {/* Preview */}
          <div className="overflow-x-auto rounded border border-white/10 p-2">
            <table className="w-full text-[10px]" style={{ borderCollapse: "collapse" }}>
              {hasHeader && (
                <tr>{Array.from({ length: cols }).map((_, i) => (
                  <th key={i} style={{ border: "1px solid rgba(255,255,255,0.15)", padding: "4px 6px", background: "rgba(6,182,212,0.15)", color: "#67e8f9" }}>H{i + 1}</th>
                ))}</tr>
              )}
              {Array.from({ length: hasHeader ? rows - 1 : rows }).map((_, r) => (
                <tr key={r}>{Array.from({ length: cols }).map((_, c) => (
                  <td key={c} style={{ border: "1px solid rgba(255,255,255,0.1)", padding: "4px 6px", color: "#94a3b8" }}>&nbsp;</td>
                ))}</tr>
              ))}
            </table>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-slate-400">انصراف</Button>
          <Button size="sm" className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30" onClick={() => { onInsert(buildTable()); onOpenChange(false) }}>
            <Table className="ml-1 h-3.5 w-3.5" /> درج جدول
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main ContentStudio ──────────────────────────────────────────────────
export default function ContentStudio() {
  const { user } = useAuth();
  const articles = useQuery(api.admin.adminListArticles);
  const createArticle = useMutation(api.admin.adminCreateArticle);
  const updateArticle = useMutation(api.admin.adminUpdateArticle);
  const togglePublish = useMutation(api.admin.adminTogglePublish);
  const deleteArticle = useMutation(api.admin.adminDeleteArticle);

  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; article: any } | null
  >(null);
  const [form, setForm] = useState({
    title: "",
    category: "عمومی",
    excerpt: "",
    body: "",
    authorName: "",
    published: false,
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
    seoCanonical: "",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
  });
  const [busy, setBusy] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkData, setLinkData] = useState<{
    url: string; text: string; newTab: boolean; isEditing: boolean
  }>({ url: "", text: "", newTab: true, isEditing: false });
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);

  const insertSciBlock = (type: string) => {
    const styles: Record<string, { label: string; bg: string; border: string; icon: string }> = {
      note: { label: "📝 Scientific Note", bg: "rgba(6,182,212,0.08)", border: "rgba(6,182,212,0.3)", icon: "🧪" },
      warning: { label: "⚠️ Warning", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", icon: "⚠️" },
      important: { label: "❗ Important", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)", icon: "❗" },
      keypoint: { label: "💡 Key Point", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.3)", icon: "💡" },
      definition: { label: "📖 Definition", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.3)", icon: "📖" },
      example: { label: "📋 Example", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.3)", icon: "📋" },
      formula: { label: "🔢 Formula", bg: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.3)", icon: "🔢" },
    };
    const s = styles[type] || styles.note;
    const html = `<div style="background:${s.bg};border-right:4px solid ${s.border};border-radius:8px;padding:16px 20px;margin:16px 0"><div style="font-size:11px;font-weight:bold;color:${s.border};margin-bottom:8px">${s.icon} ${s.label}</div><div style="color:#e2e8f0;font-size:14px;line-height:1.8"><p><br></p></div></div><p><br></p>`;
    const editorEl = editorRef.current;
    if (editorEl) {
      editorEl.focus();
      document.execCommand("insertHTML", false, html);
      setForm((f) => ({ ...f, body: editorEl.innerHTML }));
    } else {
      setForm((f) => ({ ...f, body: f.body + html }));
    }
    toast.success(`${s.label} اضافه شد`);
  };

  const openCreate = () => {
    setForm({
      title: "", category: "عمومی", excerpt: "", body: "<p></p>", authorName: "", published: false,
      seoTitle: "", seoDescription: "", seoKeywords: "", seoCanonical: "",
      ogTitle: "", ogDescription: "", ogImage: "",
    });
    setDialog({ mode: "create" });
  };

  const openEdit = (a: any) => {
    const kw = Array.isArray(a.seoKeywords) ? a.seoKeywords.join(", ") : "";
    setForm({
      title: a.title ?? "", category: a.category ?? "عمومی", excerpt: a.excerpt ?? "", body: a.body ?? "<p></p>", authorName: a.authorName ?? "", published: a.published ?? false,
      seoTitle: a.seoTitle ?? "", seoDescription: a.seoDescription ?? "", seoKeywords: kw,
      seoCanonical: a.seoCanonical ?? "", ogTitle: a.ogTitle ?? "", ogDescription: a.ogDescription ?? "", ogImage: a.ogImage ?? "",
    });
    setDialog({ mode: "edit", article: a });
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("عنوان مقاله الزامی است");
      return;
    }
    // Strip empty tags to check for real content
    const plainText = form.body.replace(/<[^>]*>/g, "").trim();
    if (!plainText) {
      toast.error("محتوای مقاله الزامی است");
      return;
    }
    setBusy(true);
    try {
      if (dialog?.mode === "edit") {
        await updateArticle({
          id: dialog.article._id,
          title: form.title,
          category: form.category,
          excerpt: form.excerpt,
          body: form.body,
          authorName: form.authorName,
          readTime: Math.max(1, Math.round(plainText.split(/\s+/).length / 250)),
          published: form.published,
          seoTitle: form.seoTitle || undefined,
          seoDescription: form.seoDescription || undefined,
          seoKeywords: form.seoKeywords ? form.seoKeywords.split(",").map((k: string) => k.trim()).filter(Boolean) : undefined,
          seoCanonical: form.seoCanonical || undefined,
          ogTitle: form.ogTitle || undefined,
          ogDescription: form.ogDescription || undefined,
          ogImage: form.ogImage || undefined,
        });
        toast.success("مقاله بروزرسانی شد");
      } else {
        await createArticle({
          title: form.title,
          slug: "",
          category: form.category,
          excerpt: form.excerpt,
          body: form.body,
          authorName: form.authorName || "تیم Genova",
          readTime: Math.max(1, Math.round(plainText.split(/\s+/).length / 250)),
          published: false,
          seoTitle: form.seoTitle || undefined,
          seoDescription: form.seoDescription || undefined,
          seoKeywords: form.seoKeywords ? form.seoKeywords.split(",").map((k: string) => k.trim()).filter(Boolean) : undefined,
          seoCanonical: form.seoCanonical || undefined,
          ogTitle: form.ogTitle || undefined,
          ogDescription: form.ogDescription || undefined,
          ogImage: form.ogImage || undefined,
        });
        toast.success("مقاله جدید ساخته شد");
      }
      setDialog(null);
    } catch (e: any) {
      toast.error(e.message || "خطا در ذخیره");
    } finally {
      setBusy(false);
    }
  };

  if (
    !user ||
    !["admin", "site_admin", "content_manager"].includes(user.role ?? "")
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b1a]">
        <p className="text-sm text-slate-400">دسترسی غیرمجاز</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b1a] p-4 md:p-6" dir="rtl">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">استودیوی محتوا</h1>
          <Button
            size="sm"
            className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
            onClick={openCreate}
          >
            <Plus className="ml-1 h-4 w-4" /> مقاله جدید
          </Button>
        </div>

        {/* Articles Grid */}
        {articles && articles.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Card
                key={article._id}
                className="border-white/5 bg-white/[0.02] transition-colors hover:bg-white/[0.04]"
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        article.published
                          ? "border-emerald-400/30 text-emerald-400"
                          : "border-amber-400/30 text-amber-400"
                      }`}
                    >
                      {article.published ? "منتشر" : "پیش‌نویس"}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {article.title}
                  </h3>
                  <p className="line-clamp-2 text-xs text-slate-400">
                    {article.excerpt || "بدون خلاصه"}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{article.category}</span>
                    <span>·</span>
                    <span>{article.authorName}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 flex-1 text-xs text-slate-400 hover:text-white"
                      onClick={() => openEdit(article)}
                    >
                      <Edit3 className="ml-1 h-3 w-3" /> ویرایش
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-7 text-xs ${
                        article.published
                          ? "text-amber-400 hover:text-amber-300"
                          : "text-emerald-400 hover:text-emerald-300"
                      }`}
                      onClick={async () => {
                        try {
                          await togglePublish({
                            collection: "articles",
                            id: article._id,
                            published: !article.published,
                          });
                          toast.success(
                            article.published
                              ? "از انتشار خارج شد"
                              : "مقاله منتشر شد",
                          );
                        } catch (e: any) {
                          toast.error(e.message || "خطا");
                        }
                      }}
                    >
                      {article.published ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <Rocket className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-red-400 hover:text-red-300"
                      onClick={async () => {
                        if (!window.confirm("آیا از حذف این مقاله مطمئن هستید؟")) return;
                        try {
                          await deleteArticle({ id: article._id });
                          toast.success("مقاله حذف شد");
                        } catch (e: any) {
                          toast.error(e.message || "خطا در حذف");
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-white/5 py-20">
            <FileText className="h-12 w-12 text-slate-600" />
            <p className="text-sm text-slate-500">هنوز مقاله‌ای وجود ندارد</p>
            <Button
              size="sm"
              className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
              onClick={openCreate}
            >
              <Plus className="ml-1 h-4 w-4" /> مقاله جدید
            </Button>
          </div>
        )}

        {/* Create / Edit Dialog */}
        <Dialog
          open={dialog !== null}
          onOpenChange={(o) => {
            if (!o) setDialog(null);
          }}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#0c1a28] sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-right text-cyan-100">
                {dialog?.mode === "edit" ? "ویرایش مقاله" : "مقاله جدید"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-400">
                  عنوان
                </label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="عنوان مقاله"
                  className="border-white/10 bg-white/5 text-slate-200"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400">
                    دسته‌بندی
                  </label>
                  <Input
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                    className="border-white/10 bg-white/5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400">
                    نویسنده
                  </label>
                  <Input
                    value={form.authorName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, authorName: e.target.value }))
                    }
                    placeholder="نام نویسنده"
                    className="border-white/10 bg-white/5 text-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-400">
                  خلاصه
                </label>
                <input
                  value={form.excerpt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, excerpt: e.target.value }))
                  }
                  placeholder="خلاصه مقاله..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-400">
                  محتوا
                </label>
                <Editor
                  html={form.body}
                  onChange={(html) => setForm((f) => ({ ...f, body: html }))}
                  editorRef={editorRef}
                  onImagePicker={() => setImagePickerOpen(true)}
                  onLink={(data) => {
                    setLinkData(data)
                    const sel = window.getSelection()
                    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange()
                    setLinkDialogOpen(true)
                  }}
                  onRemoveLink={() => toast.success("لینک حذف شد")}
                  onEmbed={() => setEmbedDialogOpen(true)}
                  onTable={() => setTableDialogOpen(true)}
                  onSciBlock={insertSciBlock}
                />
              </div>
            </div>

              {/* SEO Panel */}
              <div className="space-y-3 rounded-lg border border-white/10 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-cyan-300">
                  SEO & Meta
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[10px] font-bold text-slate-400">SEO Title</label>
                    <Input value={form.seoTitle} onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))} placeholder="Title tag for search engines" className="h-8 border-white/10 bg-white/5 text-xs text-slate-200" />
                    <span className={`text-[10px] ${form.seoTitle.length > 60 ? "text-amber-400" : form.seoTitle.length > 0 ? "text-emerald-400" : "text-slate-500"}`}>{form.seoTitle.length}/60</span>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[10px] font-bold text-slate-400">Meta Description</label>
                    <textarea value={form.seoDescription} onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))} placeholder="Meta description for search results" rows={2} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none" />
                    <span className={`text-[10px] ${form.seoDescription.length > 160 ? "text-amber-400" : form.seoDescription.length > 0 ? "text-emerald-400" : "text-slate-500"}`}>{form.seoDescription.length}/160</span>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-400">URL Slug</label>
                    <Input value={form.seoTitle ? form.seoTitle.toLowerCase().replace(/[^a-z0-9u0600-u06FF\s-]/g, "").replace(/\s+/g, "-") : ""} readOnly className="h-8 border-white/10 bg-white/5 text-xs text-slate-500" dir="ltr" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-400">Focus Keyword</label>
                    <Input value={(form.seoKeywords.split(",")[0] || "").trim()} onChange={(e) => { const kw = form.seoKeywords.split(",").map((k) => k.trim()); kw[0] = e.target.value; setForm((f) => ({ ...f, seoKeywords: kw.join(", ") })); }} placeholder="Main keyword" className="h-8 border-white/10 bg-white/5 text-xs text-slate-200" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[10px] font-bold text-slate-400">Secondary Keywords</label>
                    <Input value={form.seoKeywords.split(",").slice(1).join(", ")} onChange={(e) => { const focus = (form.seoKeywords.split(",")[0] || "").trim(); const rest = e.target.value; setForm((f) => ({ ...f, seoKeywords: [focus, rest].filter(Boolean).join(", ") })); }} placeholder="keyword1, keyword2, ..." className="h-8 border-white/10 bg-white/5 text-xs text-slate-200" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[10px] font-bold text-slate-400">Canonical URL</label>
                    <Input value={form.seoCanonical} onChange={(e) => setForm((f) => ({ ...f, seoCanonical: e.target.value }))} placeholder="https://genova.team/articles/..." className="h-8 border-white/10 bg-white/5 text-xs text-slate-200" dir="ltr" />
                  </div>
                </div>
                {/* Open Graph */}
                <div className="border-t border-white/5 pt-3">
                  <h4 className="mb-2 text-[10px] font-bold text-slate-500">Open Graph (Social)</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[10px] font-bold text-slate-400">OG Title</label>
                      <Input value={form.ogTitle} onChange={(e) => setForm((f) => ({ ...f, ogTitle: e.target.value }))} placeholder="Title for social media" className="h-8 border-white/10 bg-white/5 text-xs text-slate-200" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[10px] font-bold text-slate-400">OG Description</label>
                      <Input value={form.ogDescription} onChange={(e) => setForm((f) => ({ ...f, ogDescription: e.target.value }))} placeholder="Description for social media" className="h-8 border-white/10 bg-white/5 text-xs text-slate-200" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[10px] font-bold text-slate-400">Social Image URL</label>
                      <Input value={form.ogImage} onChange={(e) => setForm((f) => ({ ...f, ogImage: e.target.value }))} placeholder="https://example.com/og-image.jpg" className="h-8 border-white/10 bg-white/5 text-xs text-slate-200" dir="ltr" />
                      {form.ogImage && (() => { try { new URL(form.ogImage); return <img src={form.ogImage} alt="OG Preview" className="mt-2 max-h-32 rounded-lg border border-white/10 object-cover" />; } catch { return null; } })()}
                    </div>
                  </div>
                </div>
              </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setDialog(null)}
                className="text-slate-400"
              >
                انصراف
              </Button>
              <Button
                className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                onClick={handleSave}
                disabled={busy}
              >
                {busy ? "در حال ذخیره..." : "ذخیره"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Picker Dialog */}
        <ImagePickerDialog
          open={imagePickerOpen}
          onOpenChange={setImagePickerOpen}
          onInsert={(img) => {
            // Insert image into editor content
            const alignStyle = img.align === "full" ? "width:100%" : img.align === "left" ? "float:left" : img.align === "right" ? "float:right" : "display:block;margin:auto"
            const html = `<div style="${alignStyle};margin:12px 0"><img src=\"${img.src}\" alt=\"${img.alt}\" style=\"max-width:100%;height:auto;border-radius:8px\" /></div><p><br></p>`
            setForm((f) => ({ ...f, body: f.body + html }))
          }}
        />

        {/* Link Dialog */}
        <LinkDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          initialUrl={linkData.url}
          initialText={linkData.text}
          initialNewTab={linkData.newTab}
          isEditing={linkData.isEditing}
          onInsert={(link) => {
            const targetAttr = link.newTab ? ' target="_blank" rel="noopener noreferrer"' : ''
            const html = `<a href=\"${link.url}\"${targetAttr}>${link.text}</a>`
            const editorEl = editorRef.current
            if (editorEl && savedRangeRef.current) {
              editorEl.focus()
              const sel = window.getSelection()
              if (sel) {
                sel.removeAllRanges()
                sel.addRange(savedRangeRef.current)
              }
              document.execCommand("insertHTML", false, html)
              savedRangeRef.current = null
              setForm((f) => ({ ...f, body: editorEl.innerHTML }))
            } else {
              setForm((f) => ({ ...f, body: f.body + html }))
            }
          }}
          onRemove={() => {
            const editorEl = editorRef.current
            if (editorEl) {
              const anchors = editorEl.querySelectorAll("a")
              anchors.forEach((a) => {
                if (a.href === linkData.url || a.textContent === linkData.text) {
                  const parent = a.parentNode
                  while (a.firstChild) parent?.insertBefore(a.firstChild, a)
                  parent?.removeChild(a)
                }
              })
              setForm((f) => ({ ...f, body: editorEl.innerHTML }))
            } else {
              if (!linkData.url) return
              setForm((f) => ({
                ...f,
                body: f.body.replace(
                  new RegExp(
                    `<a[^>]*href=["']${linkData.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>[^<]*<\/a>`,
                    'g'
                  ),
                  linkData.text
                ),
              }))
            }
          }}
        />

        {/* Embed Dialog */}
        <EmbedDialog
          open={embedDialogOpen}
          onOpenChange={setEmbedDialogOpen}
          onInsert={(html) => {
            const editorEl = editorRef.current
            if (editorEl) {
              editorEl.focus()
              document.execCommand("insertHTML", false, html)
              setForm((f) => ({ ...f, body: editorEl.innerHTML }))
            } else {
              setForm((f) => ({ ...f, body: f.body + html }))
            }
          }}
        />

        {/* Table Dialog */}
        <TableDialog
          open={tableDialogOpen}
          onOpenChange={setTableDialogOpen}
          onInsert={(html) => {
            const editorEl = editorRef.current
            if (editorEl) {
              editorEl.focus()
              document.execCommand("insertHTML", false, html)
              setForm((f) => ({ ...f, body: editorEl.innerHTML }))
            } else {
              setForm((f) => ({ ...f, body: f.body + html }))
            }
          }}
        />
      </div>
    </div>
  );
}
