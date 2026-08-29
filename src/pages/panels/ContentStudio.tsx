import React, { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Quote,
  Link2,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Save,
  Clock,
  FileText,
  Trash2,
  Plus,
  Settings,
  Globe,
  PanelLeftOpen,
  PanelRightOpen,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react";

// ── Scientific note blocks ──────────────────────────────────────────────
const SCIENTIFIC_BLOCKS = [
  { label: "یادداشت علمی", icon: "🔬", tag: "note" },
  { label: "نکته مهم", icon: "💡", tag: "important" },
  { label: "هشدار", icon: "⚠️", tag: "warning" },
  { label: "تعریف", icon: "📖", tag: "definition" },
  { label: "فرمول", icon: "🧮", tag: "formula" },
  { label: "خلاصه", icon: "📝", tag: "summary" },
  { label: "منبع", icon: "📚", tag: "reference" },
];

type SidePanel = "seo" | "settings" | "versions" | null;

// ── Main Component ──────────────────────────────────────────────────────
export default function ContentStudio() {
  const { user } = useAuth();
  const articles = useQuery(api.contentStudio.listArticles);
  const createArticle = useMutation(api.contentStudio.createArticle);
  const quickSaveMutation = useMutation(api.contentStudio.quickSave);
  const deleteArticleMutation = useMutation(api.contentStudio.deleteArticle);
  const togglePublishMutation = useMutation(api.contentStudio.togglePublish);
  const saveVersionMutation = useMutation(api.contentStudio.saveVersion);

  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);
  const versions = useQuery(
    api.contentStudio.listVersions,
    currentArticleId ? { articleId: currentArticleId as any } : "skip",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [saving, setSaving] = useState<"saved" | "saving" | "unsaved">("saved");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("عمومی");
  const [searchQuery, setSearchQuery] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Article metadata
  const [meta, setMeta] = useState({
    title: "",
    subtitle: "",
    category: "عمومی",
    excerpt: "",
    authorName: "",
    tags: [] as string[],
    tagInput: "",
    level: "intermediate" as "beginner" | "intermediate" | "advanced",
    featuredImage: "",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: [] as string[],
    seoKeywordInput: "",
    ogTitle: "",
    ogDescription: "",
  });

  const currentArticle =
    currentArticleId && articles
      ? articles.find((a) => a._id === currentArticleId)
      : null;

  // ── Load article into editor ──────────────────────────────────────────
  const loadArticle = useCallback(
    (id: string) => {
      setCurrentArticleId(id);
      const art = articles?.find((a) => a._id === id);
      if (art) {
        setMeta({
          title: art.title,
          subtitle: (art as any).subtitle ?? "",
          category: art.category,
          excerpt: (art as any).excerpt ?? "",
          authorName: art.authorName,
          tags: (art as any).tags ?? [],
          tagInput: "",
          level: (art as any).level ?? "intermediate",
          featuredImage: (art as any).featuredImage ?? "",
          seoTitle: (art as any).seoTitle ?? "",
          seoDescription: (art as any).seoDescription ?? "",
          seoKeywords: (art as any).seoKeywords ?? [],
          seoKeywordInput: "",
          ogTitle: (art as any).ogTitle ?? "",
          ogDescription: (art as any).ogDescription ?? "",
        });
        const body = (art as any).body ?? "";
        setEditorHtml(body);
      }
    },
    [articles],
  );

  // ── Autosave ──────────────────────────────────────────────────────────
  const handleAutoSave = useCallback(
    async (body: string) => {
      if (!currentArticleId || !meta.title) return;
      setSaving("saving");
      try {
        await quickSaveMutation({
          id: currentArticleId as any,
          body,
          title: meta.title,
          excerpt: meta.excerpt,
          category: meta.category,
          tags: meta.tags,
          subtitle: meta.subtitle,
          featuredImage: meta.featuredImage,
          level: meta.level,
          seoTitle: meta.seoTitle,
          seoDescription: meta.seoDescription,
          seoKeywords: meta.seoKeywords,
        });
        setSaving("saved");
      } catch {
        setSaving("unsaved");
      }
    },
    [currentArticleId, meta, quickSaveMutation],
  );

  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setEditorHtml(html);
    setSaving("unsaved");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => handleAutoSave(html), 3000);
  }, [handleAutoSave]);

  // ── Sync editor content when article changes ────────────────────────
  useEffect(() => {
    if (!editorRef.current) return;
    if (currentArticleId) {
      const art = articles?.find((a) => a._id === currentArticleId);
      const body = (art as any)?.body ?? "";
      if (editorRef.current.innerHTML !== body) {
        editorRef.current.innerHTML = body;
      }
    } else {
      editorRef.current.innerHTML = "";
    }
  }, [currentArticleId, articles]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  const handleManualSave = useCallback(async () => {
    if (!currentArticleId || !editorRef.current) return;
    const html = editorRef.current.innerHTML;
    await handleAutoSave(html);
    toast.success("مقاله ذخیره شد");
  }, [currentArticleId, handleAutoSave]);

  const handleSaveVersion = useCallback(async () => {
    if (!currentArticleId || !editorRef.current) return;
    try {
      await saveVersionMutation({
        articleId: currentArticleId as any,
        body: editorRef.current.innerHTML,
        title: meta.title,
      });
      toast.success("نسخه جدید ذخیره شد");
    } catch (e: any) {
      toast.error(e.message || "خطا در ذخیره نسخه");
    }
  }, [currentArticleId, meta.title, saveVersionMutation]);

  const handleCreateArticle = useCallback(async () => {
    if (!newTitle.trim()) {
      toast.error("عنوان مقاله را وارد کنید");
      return;
    }
    try {
      const result = await createArticle({
        title: newTitle.trim(),
        category: newCategory,
        excerpt: "",
        body: "<p></p>",
        authorName: (user?.name as string) ?? "تیم Genova",
      });
      setShowNewDialog(false);
      setNewTitle("");
      if (result?.id) {
        loadArticle(result.id);
      }
      toast.success("مقاله جدید ساخته شد");
    } catch (e: any) {
      toast.error(e.message || "خطا در ساخت مقاله");
    }
  }, [newTitle, newCategory, createArticle, user?.name, loadArticle]);

  const handlePublish = useCallback(async () => {
    if (!currentArticleId || !editorRef.current) return;
    await handleAutoSave(editorRef.current.innerHTML);
    try {
      await togglePublishMutation({
        id: currentArticleId as any,
        published: true,
      });
      toast.success("مقاله منتشر شد");
    } catch (e: any) {
      toast.error(e.message || "خطا در انتشار");
    }
  }, [currentArticleId, handleAutoSave, togglePublishMutation]);

  const handleDelete = useCallback(async () => {
    if (!currentArticleId) return;
    try {
      await deleteArticleMutation({ id: currentArticleId as any });
      setCurrentArticleId(null);
      setEditorHtml("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      toast.success("مقاله حذف شد");
    } catch (e: any) {
      toast.error(e.message || "خطا در حذف");
    }
  }, [currentArticleId, deleteArticleMutation]);

  // ── Formatting commands ───────────────────────────────────────────────
  const execFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const insertSciBlock = useCallback(
    (tag: string) => {
      if (!editorRef.current) return;
      const labels: Record<string, string> = {
        note: "یادداشت علمی",
        important: "نکته مهم",
        warning: "هشدار",
        definition: "تعریف",
        formula: "فرمول",
        summary: "خلاصه",
        reference: "منبع",
      };
      const html = `<div class="sci-block sci-${tag}" contenteditable="false" style="margin:12px 0;padding:12px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(6,182,212,0.08);"><strong>${labels[tag] || tag}</strong><div contenteditable="true" style="margin-top:8px;min-height:24px;"></div></div><p><br></p>`;
      execFormat("insertHTML", html);
      handleEditorInput();
    },
    [execFormat, handleEditorInput],
  );

  // ── Filter articles ──────────────────────────────────────────────────
  const filteredArticles = articles?.filter(
    (a) =>
      a.title.includes(searchQuery) ||
      a.category.includes(searchQuery) ||
      a.authorName.includes(searchQuery),
  );

  // ── SEO Score ─────────────────────────────────────────────────────────
  const seoScore = (() => {
    let score = 0;
    const checks: { label: string; ok: boolean }[] = [];
    if (meta.title.length > 0) { score += 10; checks.push({ label: "عنوان تعریف شده", ok: true }); }
    else { checks.push({ label: "عنوان تعریف شده", ok: false }); }
    if (meta.title.length >= 30 && meta.title.length <= 60) { score += 15; checks.push({ label: "طول عنوان مناسب", ok: true }); }
    else { checks.push({ label: "طول عنوان مناسب", ok: false }); }
    if (meta.seoDescription.length > 0) { score += 15; checks.push({ label: "توضیحات SEO", ok: true }); }
    else { checks.push({ label: "توضیحات SEO", ok: false }); }
    if (meta.seoDescription.length >= 120 && meta.seoDescription.length <= 160) { score += 10; checks.push({ label: "طول توضیحات مناسب", ok: true }); }
    else { checks.push({ label: "طول توضیحات مناسب", ok: false }); }
    if (meta.seoKeywords.length > 0) { score += 10; checks.push({ label: "کلمات کلیدی", ok: true }); }
    else { checks.push({ label: "کلمات کلیدی", ok: false }); }
    if (meta.excerpt.length > 0) { score += 10; checks.push({ label: "خلاصه مقاله", ok: true }); }
    else { checks.push({ label: "خلاصه مقاله", ok: false }); }
    if (meta.tags.length > 0) { score += 10; checks.push({ label: "برچسب‌ها", ok: true }); }
    else { checks.push({ label: "برچسب‌ها", ok: false }); }
    if (meta.featuredImage) { score += 10; checks.push({ label: "تصویر شاخص", ok: true }); }
    else { checks.push({ label: "تصویر شاخص", ok: false }); }
    if (meta.ogTitle || meta.ogDescription) { score += 10; checks.push({ label: "OG Meta", ok: true }); }
    else { checks.push({ label: "OG Meta", ok: false }); }
    return { score: Math.min(score, 100), checks };
  })();

  if (!user || !["admin", "site_admin", "content_manager"].includes(user.role ?? "")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071019] text-slate-200" dir="rtl">
        <p className="text-sm text-slate-400">دسترسی غیرمجاز</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#071019] text-slate-200" dir="rtl">
      {/* ── Article Sidebar ────────────────────────────────────────────── */}
      {sidebarOpen && (
        <aside className="flex w-64 shrink-0 flex-col border-l border-white/5 bg-[#0a1520]">
          <div className="border-b border-white/5 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-cyan-100">استودیوی محتوا</h2>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => setSidebarOpen(false)}>
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-1">
              <Input
                placeholder="جستجو..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 border-white/10 bg-white/5 text-xs text-slate-200 placeholder:text-slate-500"
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                onClick={() => setShowNewDialog(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-0.5 p-2">
              {filteredArticles?.map((art) => (
                <button
                  key={art._id}
                  onClick={() => loadArticle(art._id)}
                  className={`w-full rounded-lg px-3 py-2.5 text-right transition-colors ${
                    currentArticleId === art._id
                      ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <p className="truncate text-xs font-medium">{art.title || "بدون عنوان"}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{art.category}</span>
                    <span>·</span>
                    <Badge
                      variant="outline"
                      className={`h-4 border-0 px-1 py-0 text-[9px] ${
                        art.status === "published"
                          ? "text-emerald-400"
                          : art.status === "draft"
                          ? "text-amber-400"
                          : "text-slate-500"
                      }`}
                    >
                      {art.status === "published" ? "منتشر" : art.status === "draft" ? "پیش‌نویس" : art.status}
                    </Badge>
                  </div>
                </button>
              ))}
              {filteredArticles?.length === 0 && (
                <p className="py-8 text-center text-xs text-slate-500">مقاله‌ای یافت نشد</p>
              )}
            </div>
          </ScrollArea>
        </aside>
      )}

      {/* ── Main Area ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Top Bar ──────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between border-b border-white/5 bg-[#0a1520] px-4 py-2">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => setSidebarOpen(true)}>
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            )}
            {currentArticleId ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{meta.title || "مقاله جدید"}</span>
                <span className={`text-[10px] font-bold ${
                  saving === "saved" ? "text-emerald-400" : saving === "saving" ? "text-amber-400" : "text-slate-500"
                }`}>
                  {saving === "saved" ? "✓ ذخیره شد" : saving === "saving" ? "در حال ذخیره..." : "• تغییرات ذخیره نشده"}
                </span>
              </div>
            ) : (
              <span className="text-sm text-slate-500">مقاله‌ای انتخاب نشده</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {currentArticleId && (
              <>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-white"
                  onClick={() => setSidePanel(sidePanel === "seo" ? null : "seo")}>
                  <Globe className="ml-1 h-3.5 w-3.5" /> SEO
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-white"
                  onClick={() => setSidePanel(sidePanel === "versions" ? null : "versions")}>
                  <Clock className="ml-1 h-3.5 w-3.5" /> نسخه‌ها
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-white"
                  onClick={() => setSidePanel(sidePanel === "settings" ? null : "settings")}>
                  <Settings className="ml-1 h-3.5 w-3.5" /> تنظیمات
                </Button>
                <div className="mx-1 h-4 w-px bg-white/10" />
                <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-white" onClick={handleSaveVersion}>
                  <Save className="ml-1 h-3.5 w-3.5" /> ذخیره نسخه
                </Button>
                <Button size="sm" className="h-7 bg-cyan-500/20 text-xs text-cyan-300 hover:bg-cyan-500/30" onClick={handlePublish}>
                  انتشار
                </Button>
              </>
            )}
          </div>
        </header>

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        {currentArticleId && (
          <div className="flex flex-wrap items-center gap-0.5 border-b border-white/5 bg-[#0c1a28] px-3 py-1.5">
            <div className="flex items-center gap-0.5">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("bold")}>
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("italic")}>
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("underline")}>
                <Underline className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("strikeThrough")}>
                <Strikethrough className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="mx-1 h-5 w-px bg-white/10" />
            <div className="flex items-center gap-0.5">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("formatBlock", "h1")}>
                <Heading1 className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("formatBlock", "h2")}>
                <Heading2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("formatBlock", "h3")}>
                <Heading3 className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("formatBlock", "p")}>
                <span className="text-xs font-bold">P</span>
              </Button>
            </div>
            <div className="mx-1 h-5 w-px bg-white/10" />
            <div className="flex items-center gap-0.5">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("insertUnorderedList")}>
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("insertOrderedList")}>
                <ListOrdered className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="mx-1 h-5 w-px bg-white/10" />
            <div className="flex items-center gap-0.5">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("formatBlock", "blockquote")}>
                <Quote className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("formatBlock", "pre")}>
                <Code className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="mx-1 h-5 w-px bg-white/10" />
            <div className="flex items-center gap-0.5">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("justifyRight")}>
                <AlignRight className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("justifyCenter")}>
                <AlignCenter className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("justifyLeft")}>
                <AlignLeft className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("justifyFull")}>
                <AlignJustify className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="mx-1 h-5 w-px bg-white/10" />
            <div className="flex items-center gap-0.5">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400"
                onClick={() => {
                  const url = window.prompt("آدرس لینک:");
                  if (url) execFormat("createLink", url);
                }}>
                <Link2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400"
                onClick={() => {
                  const url = window.prompt("آدرس تصویر:");
                  if (url) execFormat("insertImage", url);
                }}>
                <Image className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="mx-1 h-5 w-px bg-white/10" />
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => execFormat("removeFormat")}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            {/* Scientific blocks */}
            <div className="relative group">
              <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-white">
                ✨ عناصر علمی
              </Button>
              <div className="absolute top-full left-0 z-50 mt-1 hidden w-52 rounded-lg border border-white/10 bg-[#0c1a28] p-1.5 shadow-xl group-hover:block">
                {SCIENTIFIC_BLOCKS.map((block) => (
                  <button
                    key={block.tag}
                    onClick={() => insertSciBlock(block.tag)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-right text-xs text-slate-300 hover:bg-white/5"
                  >
                    <span>{block.icon}</span>
                    <span>{block.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Content Area ──────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {currentArticleId ? (
              <div className="mx-auto max-w-4xl py-6 px-4">
                <input
                  type="text"
                  value={meta.title}
                  onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
                  placeholder="عنوان مقاله..."
                  className="w-full bg-transparent text-3xl font-bold text-white placeholder:text-slate-600 focus:outline-none"
                  dir="rtl"
                />
                <input
                  type="text"
                  value={meta.subtitle}
                  onChange={(e) => setMeta((m) => ({ ...m, subtitle: e.target.value }))}
                  placeholder="زیرعنوان..."
                  className="mt-2 w-full bg-transparent text-lg text-slate-400 placeholder:text-slate-600 focus:outline-none"
                  dir="rtl"
                />
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleEditorInput}
                  dir="rtl"
                  className="mt-4 min-h-[60vh] rounded-lg border border-white/5 bg-white/[0.02] px-6 py-4 text-base leading-8 text-slate-200 focus:outline-none max-w-none"
                  style={{ lineHeight: "2" }}
                  suppressContentEditableWarning
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <FileText className="h-12 w-12 text-slate-700" />
                <p className="text-sm text-slate-500">یک مقاله انتخاب کنید یا مقاله جدید بسازید</p>
                <Button className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30" onClick={() => setShowNewDialog(true)}>
                  <Plus className="ml-1 h-4 w-4" /> مقاله جدید
                </Button>
              </div>
            )}
          </div>

          {/* ── Right Side Panel ───────────────────────────────────────── */}
          {sidePanel && currentArticleId && (
            <aside className="w-80 shrink-0 overflow-y-auto border-r border-white/5 bg-[#0a1520] p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-cyan-100">
                  {sidePanel === "seo" && "بهینه‌سازی SEO"}
                  {sidePanel === "versions" && "تاریخچه نسخه‌ها"}
                  {sidePanel === "settings" && "تنظیمات مقاله"}
                </h3>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500" onClick={() => setSidePanel(null)}>
                  ×
                </Button>
              </div>

              {sidePanel === "seo" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">امتیاز SEO</span>
                      <span className={`text-lg font-bold ${seoScore.score >= 70 ? "text-emerald-400" : seoScore.score >= 40 ? "text-amber-400" : "text-red-400"}`}>
                        {seoScore.score}%
                      </span>
                    </div>
                    <div className="mb-2 h-1.5 rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full transition-all ${seoScore.score >= 70 ? "bg-emerald-400" : seoScore.score >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${seoScore.score}%` }}
                      />
                    </div>
                    <div className="space-y-1">
                      {seoScore.checks.map((c) => (
                        <div key={c.label} className="flex items-center gap-1.5 text-[10px]">
                          <span className={c.ok ? "text-emerald-400" : "text-amber-400"}>{c.ok ? "✓" : "⚠"}</span>
                          <span className={c.ok ? "text-slate-400" : "text-slate-500"}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-400">SEO Title</label>
                      <Input value={meta.seoTitle} onChange={(e) => setMeta((m) => ({ ...m, seoTitle: e.target.value }))}
                        placeholder="عنوان برای موتورهای جستجو" className="h-8 border-white/10 bg-white/5 text-xs text-slate-200" />
                      <p className="mt-0.5 text-[9px] text-slate-600">{meta.seoTitle.length}/60</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-400">Meta Description</label>
                      <Textarea value={meta.seoDescription} onChange={(e) => setMeta((m) => ({ ...m, seoDescription: e.target.value }))}
                        placeholder="توضیحات برای موتورهای جستجو" className="min-h-[60px] border-white/10 bg-white/5 text-xs text-slate-200" />
                      <p className="mt-0.5 text-[9px] text-slate-600">{meta.seoDescription.length}/160</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-400">کلمات کلیدی</label>
                      <div className="flex gap-1">
                        <Input value={meta.seoKeywordInput}
                          onChange={(e) => setMeta((m) => ({ ...m, seoKeywordInput: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && meta.seoKeywordInput.trim()) {
                              e.preventDefault();
                              setMeta((m) => ({ ...m, seoKeywords: [...m.seoKeywords, m.seoKeywordInput.trim()], seoKeywordInput: "" }));
                            }
                          }}
                          placeholder="Enter برای افزودن" className="h-8 flex-1 border-white/10 bg-white/5 text-xs text-slate-200" />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {meta.seoKeywords.map((kw, i) => (
                          <Badge key={i} variant="outline"
                            className="h-5 cursor-pointer border-cyan-400/20 text-[9px] text-cyan-300 hover:bg-cyan-400/10"
                            onClick={() => setMeta((m) => ({ ...m, seoKeywords: m.seoKeywords.filter((_, j) => j !== i) }))}>
                            {kw} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-400">OG Title</label>
                      <Input value={meta.ogTitle} onChange={(e) => setMeta((m) => ({ ...m, ogTitle: e.target.value }))}
                        placeholder="عنوان شبکه اجتماعی" className="h-8 border-white/10 bg-white/5 text-xs text-slate-200" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-400">OG Description</label>
                      <Textarea value={meta.ogDescription} onChange={(e) => setMeta((m) => ({ ...m, ogDescription: e.target.value }))}
                        placeholder="توضیحات شبکه اجتماعی" className="min-h-[60px] border-white/10 bg-white/5 text-xs text-slate-200" />
                    </div>
                  </div>
                </div>
              )}

              {sidePanel === "settings" && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-400">دسته‌بندی</label>
                    <Input value={meta.category} onChange={(e) => setMeta((m) => ({ ...m, category: e.target.value }))}
                      className="h-8 border-white/10 bg-white/5 text-xs text-slate-200" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-400">سطح</label>
                    <Select value={meta.level} onValueChange={(v: any) => setMeta((m) => ({ ...m, level: v }))}>
                      <SelectTrigger className="h-8 border-white/10 bg-white/5 text-xs text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">مبتدی</SelectItem>
                        <SelectItem value="intermediate">متوسط</SelectItem>
                        <SelectItem value="advanced">پیشرفته</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-400">نویسنده</label>
                    <Input value={meta.authorName} onChange={(e) => setMeta((m) => ({ ...m, authorName: e.target.value }))}
                      className="h-8 border-white/10 bg-white/5 text-xs text-slate-200" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-400">خلاصه</label>
                    <Textarea value={meta.excerpt} onChange={(e) => setMeta((m) => ({ ...m, excerpt: e.target.value }))}
                      placeholder="خلاصه مقاله..." className="min-h-[80px] border-white/10 bg-white/5 text-xs text-slate-200" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-400">تصویر شاخص</label>
                    <Input value={meta.featuredImage} onChange={(e) => setMeta((m) => ({ ...m, featuredImage: e.target.value }))}
                      placeholder="آدرس تصویر" className="h-8 border-white/10 bg-white/5 text-xs text-slate-200" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-400">برچسب‌ها</label>
                    <div className="flex gap-1">
                      <Input value={meta.tagInput}
                        onChange={(e) => setMeta((m) => ({ ...m, tagInput: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && meta.tagInput.trim()) {
                            e.preventDefault();
                            setMeta((m) => ({ ...m, tags: [...m.tags, m.tagInput.trim()], tagInput: "" }));
                          }
                        }}
                        placeholder="Enter برای افزودن" className="h-8 flex-1 border-white/10 bg-white/5 text-xs text-slate-200" />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {meta.tags.map((tag, i) => (
                        <Badge key={i} variant="outline"
                          className="h-5 cursor-pointer border-cyan-400/20 text-[9px] text-cyan-300"
                          onClick={() => setMeta((m) => ({ ...m, tags: m.tags.filter((_, j) => j !== i) }))}>
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-white/5 pt-3">
                    <Button variant="outline" className="w-full border-red-400/20 text-xs text-red-300 hover:bg-red-400/10"
                      onClick={handleDelete}>
                      <Trash2 className="ml-1 h-3.5 w-3.5" /> حذف مقاله
                    </Button>
                  </div>
                </div>
              )}

              {sidePanel === "versions" && (
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-500">هر ذخیره نسخه، یک snapshot از مقاله ایجاد می‌کند.</p>
                  {versions && versions.length > 0 ? (
                    versions.map((v) => (
                      <div key={v._id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300">{v.title}</span>
                          <span className="text-[9px] text-slate-600">{new Date(v.createdAt).toLocaleString("fa-IR")}</span>
                        </div>
                        <Button size="sm" variant="ghost"
                          className="mt-2 h-6 text-[10px] text-cyan-400 hover:text-cyan-300"
                          onClick={async () => {
                            try {
                              await quickSaveMutation({ id: currentArticleId as any, body: v.body, title: v.title });
                              setEditorHtml(v.body);
                              if (editorRef.current) editorRef.current.innerHTML = v.body;
                              toast.success("نسخه بازیابی شد");
                            } catch { toast.error("خطا در بازیابی"); }
                          }}>
                          بازیابی این نسخه
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="py-6 text-center text-xs text-slate-500">هنوز نسخه‌ای ذخیره نشده</p>
                  )}
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      {/* ── New Article Dialog ──────────────────────────────────────────── */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="border-white/10 bg-[#0c1a28] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right text-cyan-100">مقاله جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="عنوان مقاله"
              className="border-white/10 bg-white/5 text-slate-200" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateArticle(); }} />
            <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="دسته‌بندی"
              className="border-white/10 bg-white/5 text-slate-200" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewDialog(false)}>انصراف</Button>
            <Button className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30" onClick={handleCreateArticle}>
              <Plus className="ml-1 h-4 w-4" /> ساخت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
