import { api } from "@/convex/_generated/api";
import { MemberProfileEditor } from "@/components/site/MemberProfileEditor";
import { useAuth } from "@/hooks/use-auth";
import { useViewOnly } from "@/hooks/use-view-only";
import { useMutation, useQuery } from "convex/react";
import {
  BookOpenText,
  CheckCircle2,
  Clock,
  Dna,
  FileText,
  GitBranch,
  ListVideo,
  Package,
  PenLine,
  Rocket,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Tab = "drafts" | "write" | "profile";
type ArticleRow = (typeof api.admin.adminListArticles)["_returnType"][number];

type DraftItem = {
  key: string;
  kind: "مقاله" | "دوره" | "کارگاه" | "محصول" | "آزمون";
  kindClass: string;
  title: string;
  published: boolean;
  collection: string;
  id: string;
};

const KIND_STYLE: Record<DraftItem["kind"], string> = {
  مقاله: "bg-sky-400/15 text-sky-300",
  دوره: "bg-indigo-400/15 text-indigo-300",
  کارگاه: "bg-violet-400/15 text-violet-300",
  محصول: "bg-emerald-400/15 text-emerald-300",
  آزمون: "bg-amber-400/15 text-amber-300",
};

export default function ContentPanel() {
  const { user } = useAuth();
  const viewOnly = useViewOnly();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("drafts");

  return (
    <div className="min-h-screen bg-[#070b1a] text-slate-100" dir="rtl">
      <header className="sticky top-0 z-20 border-b border-sky-400/10 bg-[#070b1a]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-400/10">
              <Dna className="size-5 text-sky-300" />
            </span>
            <div>
              <h1 className="text-sm font-bold text-sky-100">استودیوی محتوا</h1>
              <p className="font-mono text-[10px] tracking-wide text-sky-400/60">
                content studio · draft → publish
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-white/10 font-mono text-[10px] text-sky-100/70">
              {user?.name ?? "مدیر محتوا"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-sky-100/50"
              onClick={() => navigate(user?.role === "admin" || user?.role === "site_admin" ? "/admin" : "/")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[230px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            <button
              onClick={() => setTab("drafts")}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                tab === "drafts"
                  ? "border border-sky-400/30 bg-sky-400/10 text-sky-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <GitBranch className="size-4" />
              صف پیش‌نویس‌ها
            </button>
            <button
              onClick={() => setTab("write")}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                tab === "write"
                  ? "border border-sky-400/30 bg-sky-400/10 text-sky-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <PenLine className="size-4" />
              نوشتن مقاله
            </button>
            <button
              onClick={() => setTab("profile")}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                tab === "profile"
                  ? "border border-sky-400/30 bg-sky-400/10 text-sky-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <User className="size-4" />
              پروفایل من
            </button>
          </nav>
        </aside>

        <main className="min-w-0">
          {tab === "drafts" && <DraftQueue />}
          {tab === "write" && <ArticleEditor />}
          {tab === "profile" && <ContentProfileView />}
        </main>
      </div>
    </div>
  );
}

// ── Draft queue ─────────────────────────────────────────────────────────────
function DraftQueue() {
  const [onlyDrafts, setOnlyDrafts] = useState(true);

  const articles = useQuery(api.admin.adminListArticles) ?? [];
  const courses = useQuery(api.admin.adminListCourses) ?? [];
  const workshops = useQuery(api.admin.adminListWorkshops) ?? [];
  const products = useQuery(api.admin.adminListProducts) ?? [];
  const exams = useQuery(api.admin.adminListExams) ?? [];
  const togglePublish = useMutation(api.admin.adminTogglePublish);

  const items: DraftItem[] = useMemo(() => {
    const out: DraftItem[] = [];
    for (const a of articles) {
      out.push({
        key: `article-${a._id}`,
        kind: "مقاله",
        kindClass: KIND_STYLE["مقاله"],
        title: a.title,
        published: a.published,
        collection: "articles",
        id: a._id,
      });
    }
    for (const c of courses) {
      out.push({
        key: `course-${c._id}`,
        kind: "دوره",
        kindClass: KIND_STYLE["دوره"],
        title: c.title,
        published: c.published,
        collection: "courses",
        id: c._id,
      });
    }
    for (const w of workshops) {
      out.push({
        key: `workshop-${w._id}`,
        kind: "کارگاه",
        kindClass: KIND_STYLE["کارگاه"],
        title: w.title,
        published: w.published,
        collection: "workshops",
        id: w._id,
      });
    }
    for (const p of products) {
      out.push({
        key: `product-${p._id}`,
        kind: "محصول",
        kindClass: KIND_STYLE["محصول"],
        title: p.title,
        published: p.published,
        collection: "products",
        id: p._id,
      });
    }
    for (const e of exams) {
      out.push({
        key: `exam-${e._id}`,
        kind: "آزمون",
        kindClass: KIND_STYLE["آزمون"],
        title: e.title,
        published: e.published,
        collection: "exams",
        id: e._id,
      });
    }
    return out.sort((a, b) => Number(a.published) - Number(b.published));
  }, [articles, courses, workshops, products, exams]);

  const visible = onlyDrafts ? items.filter((i) => !i.published) : items;

  const draftsCount = items.filter((i) => !i.published).length;

  async function handleToggle(item: DraftItem) {
    try {
      await togglePublish({
        collection: item.collection,
        id: item.id,
        published: !item.published,
      });
      toast.success(item.published ? "به پیش‌نویس برگشت" : "منتشر شد 🚀");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">صف پیش‌نویس‌ها</h2>
          <p className="mt-1 text-sm text-slate-400">
            {draftsCount} مورد در انتظار انتشار — پیش‌نویس‌ها برای عموم پنهان‌اند.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 text-slate-300"
          onClick={() => setOnlyDrafts((s) => !s)}
        >
          {onlyDrafts ? "نمایش همه" : "فقط پیش‌نویس‌ها"}
        </Button>
      </div>

      <div className="space-y-2">
        {visible.map((item) => (
          <Card key={item.key} className="border-white/5 bg-white/[0.02]">
            <CardContent className="flex flex-wrap items-center gap-3 py-3.5">
              <Badge className={item.kindClass}>{item.kind}</Badge>
              <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-100">
                {item.title}
              </p>
              {item.published ? (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  <CheckCircle2 className="size-3" />
                  منتشرشده
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                  <Clock className="size-3" />
                  پیش‌نویس
                </span>
              )}
              <Button
                size="sm"
                className="h-8 text-xs"
                variant={item.published ? "outline" : "default"}
                onClick={() => handleToggle(item)}
              >
                {item.published ? (
                  <>
                    <Clock className="size-3.5" />
                    بازگشت به پیش‌نویس
                  </>
                ) : (
                  <>
                    <Rocket className="size-3.5" />
                    انتشار
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}

        {visible.length === 0 && (
          <Card className="border-white/5 bg-white/[0.02]">
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <Sparkles className="size-8 text-slate-600" />
              <p className="text-sm text-slate-400">
                {onlyDrafts ? "همه چیز منتشر شده است — صف پیش‌نویس خالی است 🎉" : "موردی وجود ندارد."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Article editor ──────────────────────────────────────────────────────────
function ArticleEditor() {
  const viewOnly = useViewOnly();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("عمومی");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [readTime, setReadTime] = useState(5);
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);

  const createArticle = useMutation(api.admin.adminCreateArticle);

  async function handleSave() {
    if (title.trim().length < 3) {
      toast.error("عنوان مقاله لازم است");
      return;
    }
    if (body.trim().length < 30) {
      toast.error("متن مقاله خیلی کوتاه است");
      return;
    }
    setBusy(true);
    try {
      await createArticle({
        title,
        slug: "",
        category,
        excerpt,
        body,
        authorName,
        readTime,
        published: publish,
      });
      toast.success(publish ? "مقاله منتشر شد 🚀" : "به‌عنوان پیش‌نویس ذخیره شد");
      setTitle("");
      setExcerpt("");
      setBody("");
      setAuthorName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">نوشتن مقاله</h2>
        <p className="mt-1 text-sm text-slate-400">
          می‌توانید به‌عنوان پیش‌نویس ذخیره کنید و بعداً ویرایش و منتشر کنید.
        </p>
      </div>

      <Card className="border-sky-400/15 bg-[#0a1226]">
        <CardContent className="space-y-4 py-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_120px]">
            <Input
              placeholder="عنوان مقاله…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-white/10 bg-white/5 font-bold text-slate-100 placeholder:text-slate-500"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["عمومی", "میکروب‌شناسی", "بیوتکنولوژی", "ژنتیک", "ایمونولوژی", "زیست‌سلولی"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="زمان مطالعه (دقیقه)"
              value={readTime}
              onChange={(e) => setReadTime(Number(e.target.value))}
              className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <Input
            placeholder="خلاصهٔ مقاله (برای کارت‌های فهرست)"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
          />
          <Input
            placeholder="نام نویسنده (پیش‌فرض: تیم Genova)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
          />

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
              <BookOpenText className="size-3.5" />
              متن مقاله (پاراگراف‌ها با خط خالی جدا می‌شوند)
            </p>
            <Textarea
              placeholder={"میکروب‌ها همه‌جا هستند…\n\nدر این مقاله دربارهٔ…"}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[320px] border-white/10 bg-white/5 font-mono text-[13px] leading-7 text-slate-100 placeholder:text-slate-600"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">وضعیت:</span>
              <button
                onClick={() => setPublish(false)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  !publish
                    ? "bg-amber-400/15 text-amber-300"
                    : "bg-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Clock className="ml-1 inline size-3.5" />
                پیش‌نویس
              </button>
              <button
                onClick={() => setPublish(true)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  publish
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Rocket className="ml-1 inline size-3.5" />
                انتشار
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-slate-500">{body.length} کاراکتر</span>
              <Button onClick={handleSave} disabled={busy || viewOnly}>
                <Send className="size-4" />
                {publish ? "انتشار مقاله" : "ذخیرهٔ پیش‌نویس"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 font-mono text-[10px] text-slate-600">
        <ListVideo className="size-3" />
        دوره‌ها، کارگاه‌ها، محصولات و آزمون‌ها از پنل مدیریت کامل قابل ساخت‌اند؛ اینجا تمرکز روی مقالات است.
      </p>
      <p className="flex items-center gap-1.5 font-mono text-[10px] text-slate-600">
        <Package className="size-3" />
        برای ساخت محتوای دوره/کارگاه/محصول به پنل مدیریت بروید.
      </p>
      <p className="flex items-center gap-1.5 font-mono text-[10px] text-slate-600">
        <FileText className="size-3" />
        پیش‌نویس‌ها فقط در صف همین استودیو دیده می‌شوند.
      </p>
    </div>
  );
}

// ── My profile ──────────────────────────────────────────────────────────────
function ContentProfileView() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-sky-100">پروفایل من</h2>
        <p className="mt-1 text-sm text-sky-100/50">
          عکس، نام و معرفی کوتاه خود را ثبت کنید؛ تغییرات پس از تأیید مدیر سایت اعمال می‌شود.
        </p>
      </div>
      <MemberProfileEditor />
    </div>
  );
}
