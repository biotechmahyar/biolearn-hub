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
}: {
  html: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
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
  });
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setForm({
      title: "",
      category: "عمومی",
      excerpt: "",
      body: "<p></p>",
      authorName: "",
      published: false,
    });
    setDialog({ mode: "create" });
  };

  const openEdit = (a: any) => {
    setForm({
      title: a.title ?? "",
      category: a.category ?? "عمومی",
      excerpt: a.excerpt ?? "",
      body: a.body ?? "<p></p>",
      authorName: a.authorName ?? "",
      published: a.published ?? false,
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
                  onChange={(html) =>
                    setForm((f) => ({ ...f, body: html }))
                  }
                />
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
      </div>
    </div>
  );
}
