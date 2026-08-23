import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { accent, faNum, formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Award,
  BarChart3,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ClipboardList,
  Download,
  FileText,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LogOut,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TabKey = "overview" | "courses" | "tests" | "progress" | "flashcards" | "downloads" | "bookmarks" | "support";

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "نمای کلی", icon: LayoutDashboard },
  { key: "courses", label: "دوره‌های من", icon: BookOpen },
  { key: "tests", label: "آزمون‌ها", icon: ClipboardList },
  { key: "progress", label: "پیشرفت", icon: BarChart3 },
  { key: "flashcards", label: "فلش‌کارت‌ها", icon: Layers },
  { key: "downloads", label: "دانلودها", icon: Download },
  { key: "bookmarks", label: "نشان‌شده‌ها", icon: Bookmark },
  { key: "support", label: "پشتیبانی", icon: LifeBuoy },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as TabKey) || "overview";

  const setTab = (t: TabKey) => setSearchParams(t === "overview" ? {} : { tab: t });

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <span className="hidden text-[15px] font-extrabold sm:block">
              Genova <span className="font-mono text-xs font-medium text-muted-foreground">· workspace</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {user?.name ?? "دانشجو"}
            </span>
            <Button variant="outline" size="sm" className="rounded-full" onClick={handleSignOut}>
              <LogOut className="ml-1.5 size-3.5" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
        {/* Sidebar */}
        <aside className="shrink-0 lg:w-60">
          <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:pb-0">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                  tab === t.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <t.icon className="size-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          {tab === "overview" && <Overview onNavigate={setTab} />}
          {tab === "courses" && <MyCourses />}
          {tab === "tests" && <TestsTab />}
          {tab === "progress" && <ProgressTab />}
          {tab === "flashcards" && <FlashcardsTab />}
          {tab === "downloads" && <DownloadsTab />}
          {tab === "bookmarks" && <BookmarksTab />}
          {tab === "support" && <SupportTab />}
        </main>
      </div>
    </div>
  );
}

// ── Overview ────────────────────────────────────────────────────────────────
function Overview({ onNavigate }: { onNavigate: (t: TabKey) => void }) {
  const { user } = useAuth();
  const enrollments = useQuery(api.enroll.getMyEnrollments);
  const attempts = useQuery(api.tests.getMyAttempts);
  const profile = useQuery(api.tests.getMyLearningProfile);
  const dailyQuiz = useQuery(api.tests.getDailyQuiz);

  const totalLessons = useMemo(
    () => (enrollments ?? []).reduce((acc, e) => acc + (e.course?.syllabus.length ?? 0), 0),
    [enrollments],
  );
  const completedLessons = useMemo(
    () => (enrollments ?? []).reduce((acc, e) => acc + (e.completedLessons?.length ?? 0), 0),
    [enrollments],
  );
  const avgPercent = attempts && attempts.length > 0
    ? Math.round(attempts.reduce((a, t) => a + t.percent, 0) / attempts.length)
    : null;

  const cards = [
    { icon: BookOpen, label: "دوره‌های من", value: faNum(enrollments?.length ?? 0), sub: `${faNum(completedLessons)} جلسه تکمیل`, color: "bg-primary/10 text-primary" },
    { icon: ClipboardList, label: "آزمون‌های انجام‌شده", value: faNum(attempts?.length ?? 0), sub: avgPercent !== null ? `میانگین ${faNum(avgPercent)}٪` : "هنوز آزمونی نداده‌ای", color: "bg-violet-500/10 text-violet-500" },
    { icon: Zap, label: "امتیاز کوئیز", value: faNum(profile?.totalPoints ?? 0), sub: "از کوئیزهای روزانه", color: "bg-amber-500/10 text-amber-500" },
    { icon: Trophy, label: "تست‌های حل‌شده", value: faNum(profile?.totalAnswered ?? 0), sub: "در همهٔ آزمون‌ها", color: "bg-emerald-500/10 text-emerald-500" },
  ];

  const continueCourse = (enrollments ?? []).find((e) => (e.percent ?? 0) < 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">سلام {user?.name?.split(" ")[0] ?? "دانشجو"} 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          امروز هم یک قدم به تسلط نزدیک‌تر شو. خلاصهٔ وضعیت یادگیری تو:
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/70 shadow-sm">
            <CardContent className="p-4">
              <span className={cn("flex size-9 items-center justify-center rounded-xl", c.color)}>
                <c.icon className="size-4.5" />
              </span>
              <p className="mt-3 text-xl font-extrabold">{c.value}</p>
              <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/80">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Learning profile */}
      {profile && profile.topics.length > 0 && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4.5 text-primary" />
              پروفایل یادگیری تو
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.topics.map((t) => (
              <div key={t.topicId}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        t.level === "strong" && "bg-emerald-500",
                        t.level === "medium" && "bg-amber-500",
                        t.level === "weak" && "bg-red-500",
                      )}
                    />
                    {t.topicName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {faNum(t.percent)}٪ · {faNum(t.correct)}/{faNum(t.total)}
                  </span>
                </div>
                <Progress
                  value={t.percent}
                  className={cn(
                    "h-2",
                    t.level === "weak" && "[&>div]:bg-red-500",
                    t.level === "medium" && "[&>div]:bg-amber-500",
                    t.level === "strong" && "[&>div]:bg-emerald-500",
                  )}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              🔴 نیازمند تقویت · 🟡 متوسط · 🟢 خوب — با حل تست بیشتر، پروفایل دقیق‌تر می‌شود.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {continueCourse ? (
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="size-4.5 text-primary" />
                ادامهٔ یادگیری
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                to={`/courses/${continueCourse.course?.slug}`}
                className="block rounded-2xl border border-border/70 bg-card/60 p-4 transition-colors hover:border-primary/40"
              >
                <p className="text-sm font-bold">{continueCourse.course?.title}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{faNum(continueCourse.percent)}٪ تکمیل شده</span>
                  <Button size="sm" className="rounded-full" asChild>
                    <span>ادامه</span>
                  </Button>
                </div>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="size-4.5 text-primary" />
                شروع یادگیری
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                هنوز دوره‌ای ثبت‌نکرده‌ای. از دوره‌های رایگان شروع کن یا اول آزمون
                تعیین سطح بده.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild className="rounded-full">
                  <Link to="/courses">مشاهده دوره‌ها</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/tests">آزمون تعیین سطح</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4.5 text-amber-500" />
              فعالیت‌های اخیر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dailyQuiz && (
              <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">کوئیز امروز</p>
                  <p className="text-xs text-muted-foreground">
                    {dailyQuiz.myAnswer
                      ? dailyQuiz.myAnswer.correct
                        ? `پاسخ درست — ${faNum(dailyQuiz.myAnswer.points)} امتیاز`
                        : "امروز پاسخ داده شد"
                      : "هنوز حل نشده"}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link to="/daily-quiz">حل کن</Link>
                </Button>
              </div>
            )}
            {(attempts ?? []).slice(0, 3).map((a) => (
              <Link
                key={a._id}
                to={`/tests/result/${a._id}`}
                className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 transition-colors hover:bg-muted"
              >
                <div>
                  <p className="text-sm font-medium">{a.exam?.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(a.finishedAt)}</p>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "rounded-full",
                    a.percent >= 70 && "bg-emerald-500/10 text-emerald-500",
                    a.percent >= 40 && a.percent < 70 && "bg-amber-500/10 text-amber-500",
                    a.percent < 40 && "bg-red-500/10 text-red-500",
                  )}
                >
                  {faNum(a.percent)}٪
                </Badge>
              </Link>
            ))}
            {attempts && attempts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                هنوز آزمونی نداده‌ای.{" "}
                <button className="font-semibold text-primary" onClick={() => onNavigate("tests")}>
                  اولین آزمون را شروع کن
                </button>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── My courses ─────────────────────────────────────────────────────────────
function MyCourses() {
  const enrollments = useQuery(api.enroll.getMyEnrollments);

  if (enrollments === undefined) return <Skeleton />;
  if (enrollments.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="هنوز دوره‌ای ثبت‌نکرده‌ای"
        desc="از دوره‌های رایگان شروع کن؛ پکیج‌های پولی هم با تخفیف منتظرند."
        cta={<Button asChild className="rounded-full"><Link to="/courses">مشاهده دوره‌ها</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">دوره‌های من</h1>
      {enrollments.map((e) => {
        const a = accent(e.course?.accent);
        return (
          <Card key={e._id} className="border-border/70 shadow-sm">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white", a.grad)}>
                <BookOpen className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold">{e.course?.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  ثبت‌نام: {formatDate(e.enrolledAt)} · {faNum(e.course?.syllabus.length ?? 0)} جلسه
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={e.percent ?? 0} className="h-2 flex-1" />
                  <span className="text-xs font-bold text-primary">{faNum(e.percent ?? 0)}٪</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button asChild variant="outline" className="rounded-full">
                  <Link to={`/courses/${e.course?.slug}#syllabus`}>
                    {e.percent === 100 ? "مرور دوره" : "ادامه یادگیری"}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Tests tab ──────────────────────────────────────────────────────────────
function TestsTab() {
  const attempts = useQuery(api.tests.getMyAttempts, {});
  const exams = useQuery(api.tests.listExams, {});

  if (attempts === undefined) return <Skeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">آزمون‌ها و نتایج</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          تاریخچهٔ آزمون‌های تو با تحلیل عملکرد.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(exams ?? []).map((exam) => (
          <Button key={exam._id} asChild variant="outline" size="sm" className="rounded-full">
            <Link to={`/tests/${exam.slug}`}>{exam.title}</Link>
          </Button>
        ))}
      </div>

      {attempts.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="هنوز آزمونی نداده‌ای"
          desc="آزمون تعیین سطح رایگان بهترین نقطهٔ شروع است."
          cta={<Button asChild className="rounded-full"><Link to="/tests">شروع آزمون تعیین سطح</Link></Button>}
        />
      ) : (
        <div className="space-y-3">
          {attempts.map((a) => (
            <Link key={a._id} to={`/tests/result/${a._id}`} className="block">
              <Card className="border-border/70 shadow-sm transition-colors hover:border-primary/40">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        "flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black",
                        a.percent >= 70 && "bg-emerald-500/10 text-emerald-500",
                        a.percent >= 40 && a.percent < 70 && "bg-amber-500/10 text-amber-500",
                        a.percent < 40 && "bg-red-500/10 text-red-500",
                      )}
                    >
                      {faNum(a.percent)}٪
                    </span>
                    <div>
                      <p className="text-sm font-bold">{a.exam?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {faNum(a.score)}/{faNum(a.total)} صحیح · {formatDateTime(a.finishedAt)}
                      </p>
                    </div>
                  </div>
                  <TrendingUp className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Progress tab ───────────────────────────────────────────────────────────
function ProgressTab() {
  const attempts = useQuery(api.tests.getMyAttempts);
  const profile = useQuery(api.tests.getMyLearningProfile);

  const chartData = useMemo(
    () =>
      (attempts ?? [])
        .slice()
        .reverse()
        .map((a, i) => ({ name: `آزمون ${faNum(i + 1)}`, percent: a.percent })),
    [attempts],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">نمودار پیشرفت</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          روند درصد آزمون‌ها و میزان تسلط موضوعی تو.
        </p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">روند عملکرد آزمون‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length >= 2 ? (
            <div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                  <Area type="monotone" dataKey="percent" name="درصد" stroke="var(--primary)" strokeWidth={2.5} fill="url(#gradP)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              برای دیدن نمودار پیشرفت، حداقل دو آزمون بده.
            </p>
          )}
        </CardContent>
      </Card>

      {profile && profile.topics.length > 0 && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">تسلط موضوعی</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.topics.map((t) => (
              <div key={t.topicId}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{t.topicName}</span>
                  <span className="text-xs text-muted-foreground">
                    {faNum(t.percent)}٪ ({faNum(t.correct)}/{faNum(t.total)})
                  </span>
                </div>
                <Progress value={t.percent} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {profile && profile.totalAnswered === 0 && (
        <EmptyState
          icon={BarChart3}
          title="داده‌ای برای تحلیل نیست"
          desc="با حل تست و شرکت در آزمون‌ها، نمودار پیشرفت و پروفایل یادگیری‌ات ساخته می‌شود."
          cta={<Button asChild className="rounded-full"><Link to="/tests">شرکت در آزمون</Link></Button>}
        />
      )}
    </div>
  );
}

// ── Flashcards tab ─────────────────────────────────────────────────────────
function FlashcardsTab() {
  const flashcards = useQuery(api.enroll.getMyFlashcards);
  const addCard = useMutation(api.enroll.addFlashcard);
  const deleteCard = useMutation(api.enroll.deleteFlashcard);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [category, setCategory] = useState("");
  const [flippedId, setFlippedId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!front.trim() || !back.trim()) return;
    await addCard({ front, back, category });
    setFront("");
    setBack("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">فلش‌کارت‌های شخصی</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          کارت بساز، مرور کن، و روی نقاط ضعفت تمرکز کن. (مرور فاصله‌دار در فاز بعدی)
        </p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-bold">ساخت فلش‌کارت جدید</p>
          <Input value={front} onChange={(e) => setFront(e.target.value)} placeholder="روی کارت (مثلاً: گرم E. coli چیست؟)" />
          <Input value={back} onChange={(e) => setBack(e.target.value)} placeholder="پشت کارت (پاسخ)" />
          <div className="flex gap-2">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="دسته (مثلاً میکروب‌شناسی)" className="flex-1" />
            <Button onClick={handleAdd} disabled={!front.trim() || !back.trim()}>
              <Plus className="ml-1.5 size-4" />
              افزودن
            </Button>
          </div>
        </CardContent>
      </Card>

      {flashcards === undefined ? (
        <Skeleton />
      ) : flashcards.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="هنوز کارتی نساخته‌ای"
          desc="اولین فلش‌کارتت را بساز؛ مثلاً یک باکتری مهم یا یک مسیر متابولیکی."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flashcards.map((card) => {
            const flipped = flippedId === card._id;
            return (
              <div
                key={card._id}
                className="relative min-h-44 cursor-pointer select-none rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:shadow-md"
                onClick={() => setFlippedId(flipped ? null : card._id)}
              >
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="rounded-full">{card.category}</Badge>
                  <button
                    type="button"
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCard({ id: card._id });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-6 flex min-h-16 items-center justify-center text-center">
                  {flipped ? (
                    <p className="text-sm font-medium leading-6">{card.back}</p>
                  ) : (
                    <p className="text-[15px] font-bold leading-6">{card.front}</p>
                  )}
                </div>
                <p className="mt-4 text-center text-[11px] text-muted-foreground">
                  {flipped ? "برای برگشت کلیک کن" : "برای دیدن پاسخ کلیک کن"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Downloads tab ──────────────────────────────────────────────────────────
function DownloadsTab() {
  const downloads = useQuery(api.enroll.getMyDownloads);

  if (downloads === undefined) return <Skeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">دانلودها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          جزوه‌ها و فایل‌های دوره‌هایی که ثبت‌نام کرده‌ای.
        </p>
      </div>

      {downloads.length === 0 ? (
        <EmptyState
          icon={Download}
          title="فایلی برای دانلود نیست"
          desc="فایل‌های دوره‌های ثبت‌نام‌شده این‌جا نمایش داده می‌شوند."
          cta={<Button asChild className="rounded-full"><Link to="/courses">مشاهده دوره‌ها</Link></Button>}
        />
      ) : (
        downloads.map((group) => (
          <Card key={group.courseId} className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{group.courseTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.files.map((file) => (
                <div key={file.name} className="flex items-center justify-between rounded-xl border border-border/70 bg-card/60 px-4 py-3">
                  <span className="flex items-center gap-3 text-sm font-medium">
                    <FileText className="size-4 text-primary" />
                    {file.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{file.size}</span>
                    <Button size="sm" variant="outline" className="rounded-full" asChild>
                      <Link to={`/courses/${group.courseSlug}`}>دریافت</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ── Bookmarks tab ──────────────────────────────────────────────────────────
function BookmarksTab() {
  const bookmarks = useQuery(api.enroll.getMyBookmarks);

  if (bookmarks === undefined) return <Skeleton />;

  const linkFor = (b: { contentType: string; item: any }) => {
    if (b.contentType === "course") return `/courses/${b.item.slug}`;
    if (b.contentType === "article") return `/free-content/${b.item.slug}`;
    if (b.contentType === "product") return `/products/${b.item.slug}`;
    if (b.contentType === "workshop") return `/workshops/${b.item.slug}`;
    return "/";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">نشان‌شده‌ها</h1>
        <p className="mt-1 text-sm text-muted-foreground">محتوایی که برای بعد ذخیره کرده‌ای.</p>
      </div>

      {bookmarks.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="چیزی نشان نکرده‌ای"
          desc="روی صفحات دوره، مقاله و محصول، گزینهٔ نشان‌کردن اضافه شده است."
          cta={<Button asChild className="rounded-full"><Link to="/courses">گشت‌وگذار در دوره‌ها</Link></Button>}
        />
      ) : (
        <div className="space-y-3">
          {bookmarks.map((b) => (
            <Link key={b._id} to={linkFor(b as any)} className="block">
              <Card className="border-border/70 shadow-sm transition-colors hover:border-primary/40">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BookmarkCheck className="size-4.5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold">{(b.item as any).title}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.contentType === "course" ? "دوره" : b.contentType === "article" ? "مطلب رایگان" : b.contentType === "product" ? "محصول" : "کارگاه"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Support tab ────────────────────────────────────────────────────────────
function SupportTab() {
  const tickets = useQuery(api.tickets.getMyTickets);
  const createTicket = useMutation(api.tickets.createTicket);
  const replyTicket = useMutation(api.tickets.replyTicket);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) return;
    await createTicket({ subject, message });
    setSubject("");
    setMessage("");
  };

  const handleReply = async (ticketId: string) => {
    if (!reply.trim()) return;
    await replyTicket({ ticketId: ticketId as any, message: reply });
    setReply("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">پشتیبانی</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          تیکت ثبت کن؛ تیم پشتیبانی معمولاً در کمتر از ۲۴ ساعت پاسخ می‌دهد.
        </p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-bold">تیکت جدید</p>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="موضوع (مثلاً: مشکل در دانلود جزوه)" />
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="توضیح کامل مشکل..." rows={3} />
          <Button onClick={handleCreate} disabled={!subject.trim() || !message.trim()}>
            <Send className="ml-1.5 size-4" />
            ثبت تیکت
          </Button>
        </CardContent>
      </Card>

      {tickets === undefined ? (
        <Skeleton />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="تیکتی نداری"
          desc="هر سؤالی دربارهٔ دوره، خرید یا دسترسی داری، این‌جا بپرس."
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card key={t._id} className="border-border/70 shadow-sm">
              <CardContent className="p-5">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-right"
                  onClick={() => setOpenId(openId === t._id ? null : t._id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <LifeBuoy className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-bold">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-full",
                      t.status === "open" && "bg-amber-500/10 text-amber-500",
                      t.status === "answered" && "bg-emerald-500/10 text-emerald-500",
                      t.status === "closed" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.status === "open" ? "در انتظار پاسخ" : t.status === "answered" ? "پاسخ داده شده" : "بسته شده"}
                  </Badge>
                </button>

                {openId === t._id && (
                  <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
                    {t.messages.map((m, i) => (
                      <div
                        key={i}
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6",
                          m.author === "admin" ? "bg-primary/10" : "bg-muted",
                        )}
                      >
                        <p className="text-[11px] font-bold text-muted-foreground">
                          {m.author === "admin" ? "تیم پشتیبانی" : "شما"} · {formatDateTime(m.at)}
                        </p>
                        <p className="mt-1">{m.text}</p>
                      </div>
                    ))}
                    {t.status !== "closed" && (
                      <div className="flex gap-2">
                        <Input
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder="پاسخ شما..."
                        />
                        <Button variant="outline" onClick={() => handleReply(t._id)} disabled={!reply.trim()}>
                          <Send className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="ml-2 size-4 animate-spin" />
      در حال بارگذاری...
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  cta,
}: {
  icon: typeof BookOpen;
  title: string;
  desc: string;
  cta?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed border-border bg-card/40">
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
        <p className="text-sm font-bold">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{desc}</p>
        {cta}
      </CardContent>
    </Card>
  );
}
