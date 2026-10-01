import { useMemo } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bell,
  BookOpen,
  ChevronLeft,
  Clock,
  Edit3,
  Eye,
  FileText,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  MoreVertical,
  PenLine,
  Plus,
  Rocket,
  Search,
  Settings,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";

export type StudioArticle = {
  _id: string;
  title: string;
  categoryLabel?: string;
  category?: string;
  excerpt?: string;
  authorName?: string;
  published?: boolean;
  featuredImage?: string;
  createdAt?: number;
};

export type StatusFilter = "all" | "draft" | "published";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدیر کل",
  site_admin: "مدیر سایت",
  content_manager: "مدیر محتوا",
};

const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

function jalaliParts(ts: number) {
  const d = new Date(ts);
  // Approximate Jalali conversion — good enough for a six month histogram.
  const gy = d.getFullYear();
  const gm = d.getMonth() + 1;
  const gd = d.getDate();
  let jy = gy;
  let jm = gm + 9;
  if (jm > 12) {
    jm -= 12;
    jy += 1;
  }
  return { jy, jm, jd: gd, day: d.getDay() };
}

/** Small ring gauge used in the statistics card. */
function ProgressRing({ value, size = 116 }: { value: number; size?: number }) {
  const r = 48;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (Math.min(100, Math.max(0, value)) / 100) * c }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute -right-1 -top-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
        {faNum(Math.round(value))}٪
      </span>
    </div>
  );
}

export default function ContentStudioLayout({
  articles,
  allArticles,
  userName,
  userRole,
  searchQuery,
  onSearch,
  statusFilter,
  onStatusFilter,
  myArticlesOnly,
  onMyArticlesOnly,
  onCreate,
  onOpenAi,
  onEdit,
  onTogglePublish,
  onDelete,
  onGoAdmin,
}: {
  articles: StudioArticle[] | undefined;
  allArticles?: StudioArticle[] | undefined;
  userName: string;
  userRole?: string;
  searchQuery: string;
  onSearch: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusFilter: (v: StatusFilter) => void;
  myArticlesOnly: boolean;
  onMyArticlesOnly: (v: boolean) => void;
  onCreate: () => void;
  onOpenAi: () => void;
  onEdit: (a: StudioArticle) => void;
  onTogglePublish: (a: StudioArticle) => void;
  onDelete: (a: StudioArticle) => void;
  onGoAdmin: () => void;
}) {
  const list = useMemo(() => articles ?? [], [articles]);
  const all = useMemo(() => allArticles ?? list, [allArticles, list]);
  const published = all.filter((a) => a.published);
  const drafts = all.filter((a) => !a.published);
  const publishRate = all.length === 0 ? 0 : (published.length / all.length) * 100;

  const recent = useMemo(
    () =>
      [...list]
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .filter((a) => !a.published)
        .slice(0, 3),
    [list],
  );

  const monthSeries = useMemo(() => {
    const buckets = new Map<string, { label: string; published: number; drafts: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const jp = jalaliParts(d.getTime());
      buckets.set(`${jp.jy}-${jp.jm}`, { label: JALALI_MONTHS[jp.jm - 1], published: 0, drafts: 0 });
    }
    for (const a of all) {
      if (!a.createdAt) continue;
      const jp = jalaliParts(a.createdAt);
      const key = `${jp.jy}-${jp.jm}`;
      const row = buckets.get(key);
      if (row) {
        if (a.published) row.published += 1;
        else row.drafts += 1;
      }
    }
    return [...buckets.values()];
  }, [all]);

  const navGroups: {
    title: string;
    items: { key: string; label: string; icon: typeof FileText; active?: boolean; onClick: () => void }[];
  }[] = [
    {
      title: "نمای کلی",
      items: [
        { key: "all", label: "داشبورد", icon: LayoutDashboard, active: statusFilter === "all", onClick: () => onStatusFilter("all") },
        { key: "inbox", label: "پیش‌نویس‌ها", icon: Inbox, active: statusFilter === "draft", onClick: () => onStatusFilter("draft") },
        { key: "published", label: "منتشرشده‌ها", icon: Rocket, active: statusFilter === "published", onClick: () => onStatusFilter("published") },
      ],
    },
    {
      title: "تولید محتوا",
      items: [
        { key: "write", label: "نوشتن مقاله", icon: PenLine, onClick: onCreate },
        { key: "ai", label: "تولید با هوش مصنوعی", icon: Sparkles, onClick: onOpenAi },
        { key: "mine", label: "فقط مقالات من", icon: User, active: myArticlesOnly, onClick: () => onMyArticlesOnly(!myArticlesOnly) },
      ],
    },
  ];

  const statCards = [
    { icon: FileText, label: "کل مقالات", value: all.length, tint: "bg-violet-50 text-violet-600" },
    { icon: Rocket, label: "منتشرشده", value: published.length, tint: "bg-emerald-50 text-emerald-600" },
    { icon: Clock, label: "در حال تکمیل", value: drafts.length, tint: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="studio-light flex min-h-screen bg-muted/40 text-foreground" dir="rtl">
      {/* ── Side rail ─────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-l border-border bg-card lg:flex">
        <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen className="size-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold tracking-tight">Genova</span>
            <span className="block text-[10px] text-muted-foreground">content studio</span>
          </span>
        </Link>

        <nav className="admin-scroll flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          {navGroups.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {g.title}
              </p>
              <div className="space-y-0.5">
                {g.items.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={s.onClick}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors",
                      s.active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <s.icon className={cn("size-4 shrink-0", s.active && "stroke-[2.4]")} />
                    <span className="truncate">{s.label}</span>
                    {s.key === "inbox" && drafts.length > 0 && (
                      <span className="mr-auto rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                        {faNum(drafts.length)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-border p-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start rounded-xl text-xs"
            onClick={onGoAdmin}
          >
            <Settings className="ml-2 size-4" />
            پنل مدیریت
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full justify-start rounded-xl text-xs">
            <Link to="/">
              <LogOut className="ml-2 size-4" />
              خروج از استودیو
            </Link>
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Top bar ──────────────────────────────────────── */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur sm:px-6">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="جست‌وجوی مقالات..."
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-xl"
              title="پیام‌ها"
              onClick={() => onStatusFilter("draft")}
            >
              <Mail className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="relative size-9 rounded-xl"
              title="اعلان‌ها"
            >
              <Bell className="size-4" />
              {drafts.length > 0 && (
                <span className="absolute -left-1 -top-1 size-4 rounded-full bg-rose-500 text-[9px] font-bold leading-4 text-white">
                  {drafts.length > 9 ? "!" : faNum(drafts.length)}
                </span>
              )}
            </Button>
            <span className="flex items-center gap-2 rounded-xl border border-border bg-background py-1.5 pl-3 pr-1.5">
              <span className="leading-tight">
                <span className="block text-[12px] font-semibold">{userName}</span>
                {userRole && (
                  <span className="block text-[10px] text-muted-foreground">{ROLE_LABELS[userRole] ?? userRole}</span>
                )}
              </span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
                {(userName || "G")[0].toUpperCase()}
              </span>
            </span>
          </div>
        </header>

        <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[1fr_300px]">
          <main className="min-w-0 space-y-5">
            {/* ── Hero banner ──────────────────────────────── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-violet-600 via-violet-500 to-indigo-500 p-6 text-white sm:p-8">
              <div className="pointer-events-none absolute -left-10 -top-16 size-56 rounded-full bg-white/15 blur-3xl" />
              <Sparkles className="pointer-events-none absolute bottom-6 left-10 size-28 text-white/10" />
              <div className="relative max-w-lg">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">
                  استودیوی تولید محتوا
                </p>
                <h1 className="mt-2 text-2xl font-black leading-relaxed sm:text-3xl">
                  محتوای علمی بساز، منتشر کن
                </h1>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  مقاله‌های تخصصی ژنوا را بنویس، با هوش مصنوعی تولید کن و در یک کلیک منتشرشان کن.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="h-10 rounded-full bg-black/25 px-5 hover:bg-black/35"
                    onClick={onCreate}
                  >
                    مقاله جدید
                    <ChevronLeft className="mr-1.5 size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 rounded-full border-white/40 bg-white/10 px-5 text-white hover:bg-white/20"
                    onClick={onOpenAi}
                  >
                    <Sparkles className="ml-1.5 size-4" />
                    تولید با AI
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Stat tiles ───────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-3">
              {statCards.map((s) => (
                <Card key={s.label} className="gap-0 rounded-2xl border-border py-0">
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-[12px] font-medium text-muted-foreground">{s.label}</p>
                      <p className="mt-1.5 text-2xl font-extrabold tracking-tight">
                        {faNum(s.value)}
                      </p>
                    </div>
                    <span className={cn("flex size-9 items-center justify-center rounded-xl", s.tint)}>
                      <s.icon className="size-4" />
                    </span>
                  </div>
                </Card>
              ))}
            </div>

            {/* ── Continue writing ─────────────────────────── */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold tracking-tight">ادامهٔ نوشتن</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-xl text-xs"
                  onClick={() => onStatusFilter("draft")}
                >
                  همهٔ پیش‌نویس‌ها
                  <ChevronLeft className="mr-1 size-3.5" />
                </Button>
              </div>
              {recent.length === 0 ? (
                <Card className="rounded-2xl border-dashed border-border py-12 text-center">
                  <FileText className="mx-auto size-7 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">پیش‌نویسی برای ادامه وجود ندارد.</p>
                  <Button size="sm" className="mt-4 rounded-xl" onClick={onCreate}>
                    <Plus className="ml-1.5 size-4" />
                    نوشتن مقاله
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {recent.map((a) => (
                    <Card
                      key={a._id}
                      className="group gap-0 overflow-hidden rounded-2xl border-border py-0 transition-shadow hover:shadow-lg"
                    >
                      <div className="relative h-28 bg-muted">
                        {a.featuredImage ? (
                          <img
                            src={a.featuredImage}
                            alt=""
                            className="size-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <FileText className="size-6 text-muted-foreground/40" />
                          </div>
                        )}
                        <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                          {a.categoryLabel || a.category || "عمومی"}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="line-clamp-2 min-h-10 text-[13px] font-bold leading-5">
                          {a.title}
                        </h3>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                              {(a.authorName || "ن")[0]}
                            </span>
                            {a.authorName || "نویسنده"}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 rounded-lg text-[11px] text-primary"
                            onClick={() => onEdit(a)}
                          >
                            <Edit3 className="ml-1 size-3" />
                            ادامه
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* ── Articles table ───────────────────────────── */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold tracking-tight">
                  {statusFilter === "draft"
                    ? "پیش‌نویس‌ها"
                    : statusFilter === "published"
                      ? "مقالات منتشرشده"
                      : "همهٔ مقالات"}
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  {faNum(list.length)} مقاله
                </span>
              </div>
              {list.length === 0 ? (
                <Card className="rounded-2xl border-dashed border-border py-16 text-center">
                  <FileText className="mx-auto size-8 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">مقاله‌ای یافت نشد.</p>
                </Card>
              ) : (
                <Card className="gap-0 overflow-hidden rounded-2xl border-border py-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-right text-sm">
                      <thead>
                        <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                          <th className="px-5 py-3 font-medium">دسته‌بندی</th>
                          <th className="px-5 py-3 font-medium">وضعیت</th>
                          <th className="px-5 py-3 font-medium">عنوان</th>
                          <th className="px-5 py-3 font-medium">نویسنده</th>
                          <th className="px-5 py-3 text-left font-medium">عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((a) => (
                          <tr key={a._id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                            <td className="px-5 py-3">
                              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                                {a.categoryLabel || a.category || "عمومی"}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={cn(
                                  "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                                  a.published
                                    ? "border-emerald-500/30 bg-emerald-50 text-emerald-600"
                                    : "border-amber-500/30 bg-amber-50 text-amber-600",
                                )}
                              >
                                {a.published ? "منتشر شده" : "پیش‌نویس"}
                              </span>
                            </td>
                            <td className="max-w-[280px] truncate px-5 py-3 font-semibold">
                              {a.title}
                            </td>
                            <td className="px-5 py-3 text-[12px] text-muted-foreground">
                              {a.authorName || "—"}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 rounded-lg"
                                  title="ویرایش"
                                  onClick={() => onEdit(a)}
                                >
                                  <Edit3 className="size-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 rounded-lg"
                                  title={a.published ? "بازگشت به پیش‌نویس" : "انتشار"}
                                  onClick={() => onTogglePublish(a)}
                                >
                                  {a.published ? <Eye className="size-3.5" /> : <Rocket className="size-3.5" />}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 rounded-lg text-destructive"
                                  title="حذف"
                                  onClick={() => onDelete(a)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </section>
          </main>

          {/* ── Right rail ─────────────────────────────────── */}
          <aside className="space-y-4">
            <Card className="gap-0 rounded-2xl border-border py-0">
              <div className="flex items-center justify-between px-5 pt-5">
                <h3 className="text-[15px] font-extrabold tracking-tight">آمار</h3>
                <MoreVertical className="size-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col items-center px-5 pb-5 pt-4">
                <div className="relative flex size-28 items-center justify-center">
                  <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-muted text-2xl font-extrabold text-muted-foreground">
                    {(userName || "ن")[0]}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ProgressRing value={publishRate} size={112} />
                  </div>
                </div>
                <p className="mt-4 text-center text-[15px] font-extrabold">
                  روز بخیر، {userName.split(" ")[0]} 👋
                </p>
                <p className="mt-1 text-center text-[11px] text-muted-foreground">{faNum(published.length)} مقاله منتشر شده از مجموع {faNum(all.length)}
                </p>
              </div>
            </Card>

            <Card className="gap-0 rounded-2xl border-border py-0">
              <div className="px-5 pt-5">
                <h3 className="text-[15px] font-extrabold tracking-tight">تولید ماهانه</h3>
              </div>
              <div className="h-40 px-2 pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthSeries} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="var(--muted-foreground)"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                    />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: "var(--muted)" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="published" name="منتشرشده" fill="var(--primary)" radius={[6, 6, 2, 2]} maxBarSize={14} />
                    <Bar dataKey="drafts" name="پیش‌نویس" fill="var(--border)" radius={[6, 6, 2, 2]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 px-5 pb-5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" />
                  منتشرشده
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-border" />
                  پیش‌نویس
                </span>
              </div>
            </Card>

            <Card className="gap-0 rounded-2xl border-border py-0">
              <div className="px-5 pt-5">
                <h3 className="text-[15px] font-extrabold tracking-tight">دسترسی سریع</h3>
              </div>
              <div className="space-y-1 p-3">
                {[
                  { icon: PenLine, label: "نوشتن مقاله جدید", onClick: onCreate },
                  { icon: Sparkles, label: "تولید با هوش مصنوعی", onClick: onOpenAi },
                  { icon: Inbox, label: "دیدن پیش‌نویس‌ها", onClick: () => onStatusFilter("draft") },
                ].map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={q.onClick}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <q.icon className="size-4" />
                    {q.label}
                  </button>
                ))}
                <Link
                  to="/"
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Home className="size-4" />
                  بازگشت به سایت
                </Link>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
