import { ClassTimer } from "@/components/site/ClassTimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { WhiteboardCanvas } from "@/components/site/WhiteboardCanvas";
import { MemberProfileEditor } from "@/components/site/MemberProfileEditor";
import TelegramAccount from "@/components/site/TelegramAccount";
import TelegramNotifications from "@/components/site/TelegramNotifications";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMode } from "@/hooks/useMode";
import { useApiQuery, useApiMutation } from "@/hooks/useApiQuery";
import { useStudentReceiver, useStudentAudioSender } from "@/hooks/use-live";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { accent, faNum, formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { formatFileSize, fileKindFromMime, uploadBlob } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Award,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BellRing,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  GraduationCap,
  Hourglass,
  ChevronLeft,
  Inbox,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LogOut,
  Mail,
  MailOpen,
  MessageCircle,
  Camera,
  Mic,
  Paperclip,
  Plus,
  Presentation,
  Radio,
  Route,
  Save,
  Send,
  Sparkles,
  Square,
  Play,
  Trash2,
  Target,
  TrendingUp,
  Trophy,
  Upload,
  User,
  Video,
  VideoOff,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { panelForRole } from "@/components/RoleGate";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";

type TabKey = "overview" | "courses" | "workshops" | "tests" | "progress" | "flashcards" | "downloads" | "bookmarks" | "support" | "live" | "announcements" | "inbox" | "profile" | "certificate" | "academyPath";

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "نمای کلی", icon: LayoutDashboard },
  { key: "courses", label: "دوره‌های من", icon: BookOpen },
  { key: "workshops", label: "کارگاه‌ها", icon: GraduationCap },
  { key: "academyPath", label: "مسیر آکادمی", icon: Route },
  { key: "tests", label: "آزمون‌ها", icon: ClipboardList },
  { key: "live", label: "کلاس‌های زنده", icon: Radio },
  { key: "inbox", label: "صندوق ورودی", icon: Inbox },
  { key: "announcements", label: "اعلان‌ها", icon: BellRing },
  { key: "progress", label: "پیشرفت", icon: BarChart3 },
  { key: "flashcards", label: "فلش‌کارت‌ها", icon: Layers },
  { key: "downloads", label: "دانلودها", icon: Download },
  { key: "bookmarks", label: "نشان‌شده‌ها", icon: Bookmark },
  { key: "support", label: "پشتیبانی", icon: LifeBuoy },
  { key: "certificate", label: "گواهی دوره", icon: Award },
  { key: "profile", label: "پروفایل", icon: User },
];

export default function Dashboard() {
  const { isIran } = useMode();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const myInboxConvex = useQuery(api.inbox.listMyInbox);
  const myInbox = isIran ? [] : (myInboxConvex ?? []);
  const unreadCount = myInbox.filter((m: any) => m.unread).length;

  // Staff members belong to their own panel, not the student dashboard.
  const role = user?.role;
  if (role && role !== "user" && role !== "member") {
    return <Navigate to={panelForRole(role)} replace />;
  }
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
                {t.key === "inbox" && unreadCount > 0 && (
                  <span className="mr-auto flex size-5 items-center justify-center rounded-full bg-red-500/15 text-[10px] font-bold text-red-500">
                    {faNum(unreadCount)}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          {tab === "overview" && <Overview onNavigate={setTab} />}
          {tab === "courses" && <MyCourses />}
          {tab === "workshops" && <MyWorkshops />}
          {tab === "academyPath" && <AcademyPathTab />}
          {tab === "tests" && <TestsTab />}
          {tab === "progress" && <ProgressTab />}
          {tab === "flashcards" && <FlashcardsTab />}
          {tab === "downloads" && <DownloadsTab />}
          {tab === "bookmarks" && <BookmarksTab />}
          {tab === "support" && <SupportTab />}
          {tab === "live" && <LiveTab />}
          {tab === "announcements" && <AnnouncementsTab />}
          {tab === "inbox" && <InboxTab />}
          {tab === "certificate" && <CertificateTab />}
          {tab === "profile" && <StudentProfileTab />}
        </main>
      </div>
    </div>
  );
}

// ── Overview ────────────────────────────────────────────────────────────────
/** Format seconds to MM:SS for voice recorder display */
function formatRecDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Overview({ onNavigate }: { onNavigate: (t: TabKey) => void }) {
  const { user } = useAuth();
  const { isIran } = useMode();
  // Convex queries
  const enrollmentsConvex = useQuery(api.enroll.getMyEnrollments);
  const attemptsConvex = useQuery(api.tests.getMyAttempts);
  const profileConvex = useQuery(api.tests.getMyLearningProfile);
  const dailyQuizConvex = useQuery(api.tests.getDailyQuiz);
  // Iran queries
  const { data: enrollmentsIran } = useApiQuery<any[]>(isIran ? "/api/dashboard/enrollments" : "");
  const { data: attemptsIran } = useApiQuery<any[]>(isIran ? "/api/dashboard/exam-attempts" : "");
  const { data: profileIran } = useApiQuery<any>(isIran ? "/api/dashboard/learning-profile" : "");
  const { data: dailyQuizIran } = useApiQuery<any>(isIran ? "/api/dashboard/daily-quiz" : "");
  // Merge
  const enrollments = (isIran ? enrollmentsIran : enrollmentsConvex) ?? [];
  const attempts = (isIran ? attemptsIran : attemptsConvex) ?? [];
  const profile = isIran ? profileIran : profileConvex;
  const dailyQuiz = isIran ? dailyQuizIran : dailyQuizConvex;

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
            {profile?.topics?.map((t: any) => (
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
                to={(() => {
                  const slug = continueCourse.course?.slug;
                  const lastId = (continueCourse as any).lastLessonId;
                  if (lastId) return `/courses/${slug}/lesson/${lastId}`;
                  return `/courses/${slug}`;
                })()}
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
  const { isIran } = useMode();
  const enrollmentsConvex = useQuery(api.enroll.getMyEnrollments);
  const { data: enrollmentsIran } = useApiQuery<any[]>(isIran ? "/api/dashboard/enrollments" : "");
  const enrollments = (isIran ? enrollmentsIran : enrollmentsConvex) ?? [];

  if (enrollments === undefined && !isIran) return <Skeleton />;
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
                  <Link to={(() => {
                    const lastId = (e as any).lastLessonId;
                    if (lastId) return `/courses/${e.course?.slug}/lesson/${lastId}`;
                    return `/courses/${e.course?.slug}#syllabus`;
                  })()}>
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

// ── My workshops ──────────────────────────────────────────────────────────
function MyWorkshops() {
  const workshops = useQuery(api.promotions.listMyWorkshopEnrollments);
  const now = Date.now();

  if (workshops === undefined) return <Skeleton />;
  if (workshops.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="هنوز در کارگاهی ثبت‌نام نکرده‌ای"
        desc="کارگاه‌های تخصصی و کارگاهی ثبت‌نام کن."
        cta={<Button asChild className="rounded-full"><Link to="/workshops">مشاهده کارگاه‌ها</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">کارگاه‌های من</h1>
      {workshops.map((w) => {
        const workshopDate = new Date(w.workshopDate);
        const isPast = workshopDate.getTime() < now;
        return (
          <Card key={w._id} className="border-border/70 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <GraduationCap className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold">{w.workshopTitle}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {w.workshopTopic} · {formatDate(w.enrolledAt)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  📅 {new Date(w.workshopDate).toLocaleDateString("fa-IR")} ساعت {w.workshopTime}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isPast ? (
                  <span className="text-xs text-muted-foreground">برگزار شده</span>
                ) : (
                  <Button size="sm" className="rounded-full">
                    🎥 ورود به کارگاه
                  </Button>
                )}
                <span className="text-xs font-bold text-emerald-600">
                  {w.workshopFree ? "رایگان" : formatPrice(w.workshopPrice)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Academy Path tab ─────────────────────────────────────────────────────────
function AcademyPathTab() {
  const paths = useQuery(api.academyPaths.listPublishedPaths);
  const enrolledWorkshops = useQuery(api.academyPaths.listMyPathProgress);
  const enroll = useMutation(api.promotions.enrollWorkshop);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isEnrolled = (wid: string) => (enrolledWorkshops ?? []).includes(wid as any);

  const handleEnroll = async (wid: string, free: boolean) => {
    if (!free) {
      toast.info("این کارگاه پرداختی است — از صفحه کارگاه ثبت‌نام کنید.");
      return;
    }
    setBusyId(wid);
    try {
      await enroll({ workshopId: wid as any });
      toast.success("ثبت‌نام انجام شد!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ثبت‌نام");
    } finally {
      setBusyId(null);
    }
  };

  if (paths === undefined) return <Skeleton />;

  if (paths.length === 0) {
    return (
      <EmptyState
        icon={Route}
        title="مسیری منتشر نشده"
        desc="سلسله کارگاه‌های آکادمی به‌زودی اینجا نمایش داده می‌شود."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">مسیر آکادمی</h1>
        <p className="mt-1 text-sm text-muted-foreground">سلسله کارگاه‌های تخصصی — به ترتیب پیش بروید و ثبت‌نام کنید.</p>
      </div>
      {paths.map((p) => {
        const doneCount = p.items.filter((it: any) => isEnrolled(it.workshopId)).length;
        const pct = p.items.length > 0 ? Math.round((doneCount / p.items.length) * 100) : 0;
        return (
          <Card key={p._id} className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Route className="size-5 text-primary" />
                <CardTitle className="text-base">{p.title}</CardTitle>
                <Badge variant="outline" className="rounded-full text-[10px]">{p.level === "beginner" ? "مبتدی" : p.level === "intermediate" ? "متوسط" : p.level === "advanced" ? "پیشرفته" : "ترکیبی"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{p.description}</p>
              <div className="mt-1 flex items-center gap-2">
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="text-[11px] font-bold text-muted-foreground">{faNum(doneCount)}/{faNum(p.items.length)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {p.items.map((item: any, idx: number) => {
                const enrolled = isEnrolled(item.workshopId);
                const isPast = item.date ? new Date(item.date).getTime() < Date.now() : false;
                return (
                  <div key={item.itemId} className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      enrolled ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/10 text-primary"
                    )}>
                      {enrolled ? <CheckCircle2 className="size-4" /> : idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.topic} · {item.date ? new Date(item.date).toLocaleDateString("fa-IR") : "—"}
                        {item.time ? ` ساعت ${item.time}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-bold text-emerald-600">{item.free ? "رایگان" : formatPrice(item.price)}</span>
                      {enrolled ? (
                        <Button size="sm" variant="outline" className="rounded-full text-xs" asChild>
                          <Link to={`/workshops/${item.slug}`}>ورود به کارگاه</Link>
                        </Button>
                      ) : isPast ? (
                        <span className="text-[11px] text-muted-foreground">برگزار شده</span>
                      ) : (
                        <Button size="sm" className="rounded-full text-xs" disabled={busyId === item.workshopId} onClick={() => handleEnroll(item.workshopId, item.free)}>
                          {busyId === item.workshopId ? <Loader2 className="size-3.5 animate-spin" /> : item.free ? "ثبت‌نام رایگان" : "ثبت‌نام"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Tests tab ──────────────────────────────────────────────────────────────
function TestsTab() {
  const { isIran } = useMode();
  const attemptsConvex = useQuery(api.tests.getMyAttempts, {});
  const examsConvex = useQuery(api.tests.listExams, {});
  const { data: attemptsIran } = useApiQuery<any[]>(isIran ? "/api/dashboard/exam-attempts" : "");
  const { data: examsIran } = useApiQuery<any[]>(isIran ? "/api/dashboard/exams" : "");
  const attempts = (isIran ? attemptsIran : attemptsConvex) ?? [];
  const exams = (isIran ? examsIran : examsConvex) ?? [];

  if (attempts === undefined && !isIran) return <Skeleton />;

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
  const { isIran } = useMode();
  const attemptsConvex = useQuery(api.tests.getMyAttempts);
  const profileConvex = useQuery(api.tests.getMyLearningProfile);
  const { data: attemptsIran } = useApiQuery<any[]>(isIran ? "/api/dashboard/exam-attempts" : "");
  const { data: profileIran } = useApiQuery<any>(isIran ? "/api/dashboard/learning-profile" : "");
  const attempts = (isIran ? attemptsIran : attemptsConvex) ?? [];
  const profile = isIran ? profileIran : profileConvex;

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
            {profile?.topics?.map((t: any) => (
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
  const { isIran } = useMode();
  const flashcardsConvex = useQuery(api.enroll.getMyFlashcards);
  const addCardConvex = useMutation(api.enroll.addFlashcard);
  const deleteCardConvex = useMutation(api.enroll.deleteFlashcard);
  const { data: flashcardsIran } = useApiQuery<any[]>(isIran ? "/api/dashboard/flashcards" : "");
  const { mutate: addCardIran } = useApiMutation("/api/dashboard/flashcards", "POST");
  const { mutate: deleteCardIran } = useApiMutation("/api/dashboard/flashcards", "DELETE");
  const flashcards = (isIran ? flashcardsIran : flashcardsConvex) ?? [];
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [category, setCategory] = useState("");
  const [flippedId, setFlippedId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!front.trim() || !back.trim()) return;
    if (isIran) {
      await addCardIran({ front, back, category });
    } else {
      await addCardConvex({ front, back, category });
    }
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
                      if (isIran) {
                        deleteCardIran({ id: card._id });
                      } else {
                        deleteCardConvex({ id: card._id as any });
                      }
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
  const { isIran } = useMode();
  const downloadsConvex = useQuery(api.enroll.getMyDownloads);
  const { data: downloadsIran } = useApiQuery<any[]>(isIran ? "/api/dashboard/downloads" : "");
  const downloads = (isIran ? downloadsIran : downloadsConvex) ?? [];

  if (downloads === undefined && !isIran) return <Skeleton />;

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
              {group.files.map((file: any) => (
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
  const { isIran } = useMode();
  const bookmarksConvex = useQuery(api.enroll.getMyBookmarks);
  const { data: bookmarksIran } = useApiQuery<any[]>(isIran ? "/api/dashboard/bookmarks" : "");
  const bookmarks = (isIran ? bookmarksIran : bookmarksConvex) ?? [];

  if (bookmarks === undefined && !isIran) return <Skeleton />;

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
  const { user } = useAuth();
  const tickets = useQuery(api.support.listMyTickets);
  const instructors = useQuery(api.support.listInstructors);
  const createTicket = useMutation(api.support.createTicket);
  const sendTicketMsg = useMutation(api.support.sendMessage);
  const markRead = useMutation(api.support.markAsRead);
  const updateStatus = useMutation(api.support.updateTicketStatus);
  const getUploadUrl = useMutation(api.support.getUploadUrl);

  const [showNew, setShowNew] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const openTicket = useQuery(
    api.support.getTicket,
    openId ? { ticketId: openId as any } : "skip",
  );
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (openId && openTicket) {
      void markRead({ ticketId: openId as any });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [openId, openTicket]);

  const handleCreate = async () => {
    if (!teacherId || !subject.trim() || !message.trim()) return;
    setCreating(true);
    try {
      const result = await createTicket({
        teacherId: teacherId as any,
        subject: subject.trim(),
        message: message.trim(),
      });
      setShowNew(false);
      setTeacherId("");
      setSubject("");
      setMessage("");
      if (result?.ticketId) setOpenId(result.ticketId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async () => {
    if (!reply.trim() || !openId) return;
    setReplying(true);
    try {
      await sendTicketMsg({ ticketId: openId as any, message: reply.trim() });
      setReply("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setReplying(false);
    }
  };

  const handleFileReply = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !openId) return;
    setReplying(true);
    try {
      const url = await getUploadUrl();
      const storageId = await uploadBlob(url, file);
      await sendTicketMsg({
        ticketId: openId as any,
        message: "📎 " + file.name,
        attachmentStorageId: storageId,
        attachmentName: file.name,
        attachmentSize: file.size,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در آپلود");
    } finally {
      setReplying(false);
      e.target.value = "";
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "open": return "جدید";
      case "waiting_for_teacher": return "در انتظار استاد";
      case "waiting_for_student": return "در انتظار شما";
      case "resolved": return "حل شده";
      case "closed": return "بسته شده";
      default: return s;
    }
  };

  const statusCls = (s: string) => {
    switch (s) {
      case "open": case "waiting_for_teacher": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "waiting_for_student": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "resolved": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "closed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">🎧 پشتیبانی</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مستقیماً با استاد خود در ارتباط باشید.
          </p>
        </div>
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="ml-1.5 size-4" />
          درخواست جدید
        </Button>
      </div>

      {/* New ticket form */}
      {showNew && (
        <Card className="border-primary/20">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm font-bold">📋 درخواست جدید</p>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">استاد</label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">انتخاب استاد…</option>
                {(instructors ?? []).map((inst: any) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="موضوع (مثلاً: مشکل در مشاهده جلسه ۴)" />
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="توضیح کامل مشکل..." rows={3} />
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!teacherId || !subject.trim() || !message.trim() || creating}>
                {creating ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Send className="ml-1.5 size-4" />}
                ارسال درخواست
              </Button>
              <Button variant="ghost" onClick={() => setShowNew(false)}>انصراف</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ticket list */}
      {tickets === undefined ? (
        <Skeleton />
      ) : tickets.length === 0 && !showNew ? (
        <EmptyState icon={MessageCircle} title="هنوز درخواستی ندارید" desc="اگر سؤالی دارید، درخواست پشتیبانی جدید بسازید." />
      ) : !openId ? (
        <div className="space-y-3">
          {tickets.map((t: any) => (
            <button
              key={t._id}
              type="button"
              className="w-full"
              onClick={() => setOpenId(t._id)}
            >
              <Card className="border-border/70 text-right shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/30">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <LifeBuoy className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{t.subject}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.courseName ?? "عمومی"} · {formatDateTime(t.lastMessageAt ?? t.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {t.unreadByStudent > 0 && (
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {t.unreadByStudent}
                      </span>
                    )}
                    <Badge variant="secondary" className={cn("rounded-full text-[10px]", statusCls(t.status))}>
                      {statusLabel(t.status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      ) : null}

      {/* Conversation view */}
      {openId && openTicket && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 border-b p-4">
              <Button variant="ghost" size="sm" onClick={() => setOpenId(null)}>
                <ChevronLeft className="size-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{openTicket.subject}</p>
                <p className="text-[11px] text-muted-foreground">
                  {openTicket.courseName ?? "عمومی"} · {statusLabel(openTicket.status)}
                </p>
              </div>
              {openTicket.status !== "closed" && openTicket.status !== "resolved" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => void updateStatus({ ticketId: openId as any, status: "closed" })}
                >
                  بستن
                </Button>
              )}
            </div>
            <div className="max-h-[50vh] space-y-3 overflow-y-auto p-4">
              {openTicket.messages.map((m: any) => {
                const isMine = m.senderId === user?._id;
                return (
                  <div key={m._id} className={cn("flex", isMine ? "justify-start" : "justify-end")}>
                    <div className={cn("max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6", isMine ? "bg-muted" : "bg-primary/10")}>
                      <p className="text-[11px] font-bold text-muted-foreground">
                        {m.senderName} · {m.senderRole === "instructor" ? "استاد" : "شما"} · {formatDateTime(m.createdAt)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{m.message}</p>
                      {m.attachmentStorageId && (
                        <a href={`/api/storage/${m.attachmentStorageId}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          📎 {m.attachmentName}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            {openTicket.status !== "closed" && openTicket.status !== "resolved" && (
              <div className="flex items-center gap-2 border-t p-3">
                <input ref={fileInputRef} type="file" hidden onChange={handleFileReply} />
                <button onClick={() => fileInputRef.current?.click()} className="flex size-8 items-center justify-center rounded-lg border bg-muted text-muted-foreground transition-colors hover:bg-accent" title="فایل پیوست">
                  <Paperclip className="size-4" />
                </button>
                <Input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleReply()} placeholder="پاسخ شما..." className="flex-1" />
                <Button onClick={handleReply} disabled={!reply.trim() || replying}>
                  {replying ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-40 flex-col items-center justify-center gap-3"
    >
      <div className="relative">
        <Loader2 className="size-8 animate-spin text-primary/60" />
        <div className="absolute inset-0 size-8 animate-ping rounded-full bg-primary/10" />
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        صبر کنید، در حال بارگذاری...
      </p>
    </motion.div>
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

// ── Live classes (student side) ─────────────────────────────────────────────
type RoomRow = (typeof api.collab.listRooms)["_returnType"][number];

function LiveTab() {
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const rooms = useQuery(api.collab.listRooms) ?? [];
  const online = useQuery(api.collab.listOnline) ?? [];
  const touchPresence = useMutation(api.collab.touchPresence);

  useEffect(() => {
    touchPresence({ location: "کلاس‌های زنده" });
    const t = setInterval(() => touchPresence({ location: "کلاس‌های زنده" }), 25_000);
    return () => clearInterval(t);
  }, [touchPresence]);

  const live = rooms.filter((r) => r.status === "live");

  if (activeRoom) {
    return (
      <LiveRoomView
        roomId={activeRoom}
        onClose={() => setActiveRoom(null)}
        rooms={rooms}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">کلاس‌های زنده</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          وقتی مدرس آنلاین است و کلاس را شروع کرده، اینجا سؤال بپرسید — پاسخ مدرس به‌صورت لحظه‌ای می‌رسد.
        </p>
      </div>

      {/* Who is online */}
      <div className="flex flex-wrap gap-2">
        {online.length === 0 && (
          <span className="text-xs text-muted-foreground">الان هیچ مدرسی آنلاین نیست.</span>
        )}
        {online
          .filter((u) => u.role === "instructor" || u.role === "admin")
          .map((u) => (
            <span
              key={u.userId}
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600 dark:text-emerald-400"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              {u.name} · آنلاین
            </span>
          ))}
      </div>

      {live.length === 0 ? (
        <EmptyState
          icon={Video}
          title="کلاسی در حال برگزاری نیست"
          desc="به محض اینکه مدرس کلاس را شروع کند، اینجا ظاهر می‌شود و می‌توانید سؤال بپرسید."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {live.map((room) => (
            <button
              key={room._id}
              onClick={() => {
                if (room.platformUrl) {
                  window.open(room.platformUrl, "_blank", "noopener,noreferrer");
                } else {
                  setActiveRoom(room._id);
                }
              }}
              className="group rounded-xl border border-border bg-card p-5 text-right transition-all hover:border-primary/50 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                  <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
                  LIVE
                </span>
                <span className="flex items-center gap-2">
                  <ClassTimer startMs={room.createdAt} running />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {room.messageCount} پیام
                  </span>
                </span>
              </div>
              <h3 className="mt-3 font-bold group-hover:text-primary">{room.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{room.topic}</p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                مدرس: <span className="font-bold text-foreground">{room.instructorName}</span>
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LiveRoomView({
  roomId,
  onClose,
  rooms,
}: {
  roomId: string;
  onClose: () => void;
  rooms: RoomRow[];
}) {
  const { user } = useAuth();
  const room = rooms.find((r) => r._id === roomId);
  const detail = useQuery(api.collab.getRoom, { roomId: roomId as any });
  const [text, setText] = useState("");
  const [asQuestion, setAsQuestion] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sendMessage = useMutation(api.collab.sendMessage);
  const getUploadUrl = useMutation(api.collab.getUploadUrl);

  // Instructor's whiteboard + screen-share annotations (read-only for students).
  const boardStrokes = useQuery(api.collab.listStrokes, {
    roomId: roomId as any,
    layer: "board",
  }) ?? [];
  const screenStrokes = useQuery(api.collab.listStrokes, {
    roomId: roomId as any,
    layer: "screen",
  }) ?? [];

  // Watch the instructor's live broadcast.
  const receiver = useStudentReceiver(roomId, room?.instructorId, user?._id);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (videoRef.current && receiver.remoteStream) {
      videoRef.current.srcObject = receiver.remoteStream;
    }
  }, [receiver.remoteStream]);

  // Voice request system
  const requestVoice = useMutation(api.collab.requestVoice);
  const voiceRequests = useQuery(api.collab.listVoiceRequests, { roomId: roomId as any });
  const isSpeaker = (voiceRequests?.speakers ?? []).some((sp: any) => sp.userId === user?._id);
  const myRequest = (voiceRequests?.requests ?? []).find((r) => r.userId === user?._id);
  const [voiceStatus, setVoiceStatus] = useState<"none" | "pending" | "approved">("none");

  // Sync voice status from server
  useEffect(() => {
    if (isSpeaker) setVoiceStatus("approved");
    else if (myRequest) setVoiceStatus("pending");
    else setVoiceStatus("none");
  }, [isSpeaker, myRequest]);

  // Cleanup recorder on unmount
  useEffect(() => {
    return () => { voiceRecorder.reset(); };
  }, []);

  // Student audio sender (sends mic to instructor when approved)
  const audioSender = useStudentAudioSender(
    roomId,
    room?.instructorId,
    user?._id,
    isSpeaker,
  );

  async function handleVoiceRequest() {
    try {
      const result = await requestVoice({ roomId: roomId as any });
      if (result.status === "approved") {
        setVoiceStatus("approved");
        toast.success("شما فعال شدید! می‌توانید صحبت کنید.");
      } else {
        setVoiceStatus("pending");
        toast.info("درخواست شما ارسال شد — منتظر تأیید مدرس.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  }

  // Voice recorder — proper state machine
  const voiceRecorder = useVoiceRecorder({
    onRecorded: async (blob, _dur) => {
      setUploading(true);
      try {
        const url = await getUploadUrl();
        const storageId = await uploadBlob(url, blob);
        await sendMessage({
          roomId: roomId as any,
          text: "🎙️ پیام صوتی",
          type: "message",
          attachmentType: "voice",
          attachmentName: "voice.webm",
          attachmentStorageId: storageId,
          attachmentSize: blob.size,
        });
        toast.success("پیام صوتی ارسال شد");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "خطا در آپلود");
      } finally {
        setUploading(false);
        voiceRecorder.reset();
      }
    },
    onError: (msg) => toast.error(msg),
  });

  const messages = detail?.messages ?? [];

  async function handleSendAttachment(blob: Blob, kind: "file" | "voice" | "image", name?: string) {
    setUploading(true);
    try {
      const url = await getUploadUrl();
      const storageId = await uploadBlob(url, blob);
      await sendMessage({
        roomId: roomId as any,
        text: kind === "voice" ? "🎙️ پیام صوتی" : "📎 " + (name ?? "فایل"),
        type: "message",
        attachmentType: kind,
        attachmentName: name ?? "voice.webm",
        attachmentStorageId: storageId,
        attachmentSize: blob.size,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در آپلود");
    } finally {
      setUploading(false);
    }
  }

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void handleSendAttachment(file, fileKindFromMime(file.type), file.name);
    e.target.value = "";
  }



  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMessage({
        roomId: roomId as any,
        text,
        type: asQuestion ? "question" : "message",
      });
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ارسال");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="ml-1 size-4" />
            بازگشت
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold">{room?.title ?? detail?.title}</h3>
              {detail?.status === "live" && (
                <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                  <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
                  LIVE
                </span>
              )}
              {detail?.status === "live" && <ClassTimer startMs={detail?.createdAt} running />}
            </div>
            <p className="text-xs text-muted-foreground">
              مدرس: {room?.instructorName ?? detail?.instructorName}
            </p>
          </div>
        </div>
      </div>

      {/* Instructor's live stream */}
      {detail?.status === "live" && detail?.broadcasting && (
        <Card className="border-red-500/20">
          <CardContent className="space-y-3 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-bold">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                </span>
                {detail?.broadcastKind === "screen" ? "اشتراک صفحهٔ مدرس" : "پخش زندهٔ مدرس"}
              </p>
              <span className="font-mono text-[10px] text-muted-foreground">
                {receiver.status === "live" ? "متصل" : "در حال اتصال…"}
              </span>
            </div>
            {receiver.remoteStream ? (
              <div className="relative w-full">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="aspect-video w-full rounded-lg border border-white/10 bg-black"
                />
                {detail?.broadcastKind === "screen" && (
                  <WhiteboardCanvas
                    strokes={screenStrokes}
                    bg="transparent"
                    readOnly
                    className="absolute inset-0 rounded-lg"
                    minHeight={0}
                    borderClass=""
                  />
                )}
                {detail?.broadcastKind === "screen" && screenStrokes.length > 0 && (
                  <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-yellow-300 backdrop-blur">
                    ✏️ علامت‌های مدرس روی صفحه
                  </span>
                )}
              </div>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-muted/30">
                {receiver.error ? (
                  <>
                    <VideoOff className="size-8 text-muted-foreground/50" />
                    <p className="px-4 text-center text-xs text-muted-foreground">
                      اتصال تصویر برقرار نشد — پیام‌ها و صدا همچنان کار می‌کنند.
                    </p>
                  </>
                ) : (
                  <>
                    <Loader2 className="size-8 animate-spin text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">در حال اتصال به پخش مدرس…</p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructor's whiteboard — students watch it live */}
      {detail?.status === "live" && (
        <Card className="border-primary/20">
          <CardContent className="space-y-2 py-4">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Presentation className="size-4 text-primary" />
              تختهٔ کلاس
              <span className="font-mono text-[10px] font-normal text-muted-foreground">
                زنده · مدرس می‌کشد
              </span>
            </p>
            <WhiteboardCanvas
              strokes={boardStrokes}
              bg={detail?.boardBg ?? "#0f172a"}
              readOnly
              className="min-h-[240px]"
            />
          </CardContent>
        </Card>
      )}

      {/* Voice request / active speaker section */}
      {detail?.status === "live" && (
        <Card className="border-emerald-500/20">
          <CardContent className="space-y-3 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10">
                  <Mic className="size-4 text-emerald-500" />
                </span>
                <div>
                  <p className="text-sm font-bold">صحبت در کلاس</p>
                  <p className="text-[10px] text-muted-foreground">
                    {voiceStatus === "approved" && audioSender.sending
                      ? "شما در حال صحبت هستید"
                      : voiceStatus === "approved"
                        ? "مدرس به شما اجازه صحبت داده است"
                        : voiceStatus === "pending"
                          ? "درخواست شما برای مدرس ارسال شد"
                          : "درخواست صحبت بدهید تا مدرس مجوز دهد"}
                  </p>
                </div>
                {voiceStatus === "approved" && audioSender.sending && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-500">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                    در حال صحبت
                  </span>
                )}
                {voiceStatus === "approved" && !audioSender.sending && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                    مجاز به صحبت
                  </span>
                )}
                {voiceStatus === "pending" && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-500">
                    <Loader2 className="size-2.5 animate-spin" />
                    در انتظار تأیید
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {voiceStatus === "approved" ? (
                  <Button
                    size="sm"
                    variant={audioSender.sending ? "destructive" : "default"}
                    onClick={() => {
                      if (audioSender.sending) {
                        audioSender.stopSending();
                      } else {
                        void audioSender.startSending();
                      }
                    }}
                  >
                    {audioSender.sending ? (
                      <><Square className="size-3.5" /> قطع صدا</>
                    ) : (
                      <><Mic className="size-3.5" /> روشن کردن میکروفون</>
                    )}
                  </Button>
                ) : voiceStatus === "none" ? (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500"
                    onClick={() => void handleVoiceRequest()}
                  >
                    <Mic className="size-3.5" />
                    ✋ دستم را بالا می‌برم
                  </Button>
                ) : null}
              </div>
            </div>
            {audioSender.error && (
              <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {audioSender.error}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="max-h-[55vh] space-y-3 overflow-y-auto py-4">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              هنوز پیامی نیست — اولین سؤال را شما بپرسید!
            </p>
          )}
          {messages.filter((m) => !m.text.startsWith("__voice_request__") && !m.text.startsWith("__hand__")).map((m) => {
            const isQuestion = m.type === "question";
            return (
              <div
                key={m._id}
                className={`rounded-lg border p-3 ${
                  isQuestion && !m.answer
                    ? "border-amber-500/25 bg-amber-500/5"
                    : isQuestion && m.answer
                      ? "border-emerald-500/25 bg-emerald-500/5"
                      : "border-border bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                      m.role === "instructor"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {(m.name ?? "؟").slice(0, 1)}
                  </span>
                  <span className="text-xs font-bold">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {m.role === "instructor" ? "مدرس" : "دانشجو"}
                  </span>
                </div>
                <p className="mt-1.5 text-sm">{m.text}</p>
                {m.attachmentType === "image" && m.attachmentUrl && (
                  <img
                    src={m.attachmentUrl}
                    alt={m.attachmentName ?? "تصویر"}
                    className="mt-2 max-h-64 rounded-lg border border-border"
                  />
                )}
                {m.attachmentType === "voice" && m.attachmentUrl && (
                  <audio controls src={m.attachmentUrl} className="mt-2 h-10 w-full max-w-sm" />
                )}
                {m.attachmentType === "file" && m.attachmentUrl && (
                  <a
                    href={m.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex max-w-sm items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs hover:bg-muted"
                  >
                    <FileText className="size-4 shrink-0 text-primary" />
                    <span className="truncate">{m.attachmentName}</span>
                    {m.attachmentSize ? (
                      <span className="mr-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                        {formatFileSize(m.attachmentSize)}
                      </span>
                    ) : null}
                  </a>
                )}
                {m.answer && (
                  <div className="mt-2 rounded-md bg-emerald-500/10 px-3 py-2">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      پاسخ مدرس
                    </p>
                    <p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-200">
                      {m.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Voice preview — after recording stops */}
      {voiceRecorder.previewBlob && voiceRecorder.state === "IDLE" && (
        <Card className="border-primary/20">
          <CardContent className="flex items-center gap-3 py-3">
            <Play className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold">پیش‌گوشی پیام صوتی</p>
              <p className="text-[10px] text-muted-foreground">{formatRecDuration(voiceRecorder.previewDuration)}</p>
            </div>
            {voiceRecorder.previewUrl && (
              <audio controls src={voiceRecorder.previewUrl} className="h-8 max-w-[180px]" />
            )}
            <div className="flex shrink-0 gap-1">
              <Button size="sm" onClick={() => voiceRecorder.send()} disabled={uploading}>
                {uploading ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                ارسال
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => voiceRecorder.discard()}>
                <Trash2 className="size-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {detail?.status === "live" && (
        <Card>
          <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
            <div className="flex shrink-0 gap-1 rounded-lg border bg-muted p-1">
              <button
                onClick={() => setAsQuestion(true)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  asQuestion ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                }`}
              >
                سؤال
              </button>
              <button
                onClick={() => setAsQuestion(false)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  !asQuestion ? "bg-primary/20 text-primary" : "text-muted-foreground"
                }`}
              >
                پیام
              </button>
            </div>
            {voiceRecorder.state === "RECORDING" && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                <span className="size-2 animate-pulse rounded-full bg-red-500" />
                در حال ضبط {formatRecDuration(voiceRecorder.seconds)}
              </span>
            )}
            {voiceRecorder.state === "UPLOADING" && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold text-primary">
                <Loader2 className="size-3 animate-spin" />
                در حال ارسال…
              </span>
            )}
            <Input
              placeholder={asQuestion ? "سؤال خود را از مدرس بپرسید…" : "پیامی برای کلاس بنویسید…"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1"
            />
            <div className="flex shrink-0 items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip,.txt"
                hidden
                onChange={handleFilePicked}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="پیوست فایل / تصویر"
                className="flex size-8 items-center justify-center rounded-lg border bg-muted text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Paperclip className="size-4" />
                )}
              </button>
              <button
                onClick={() => voiceRecorder.state === "RECORDING" ? voiceRecorder.stop() : voiceRecorder.start()}
                title={voiceRecorder.state === "RECORDING" ? "پایان ضبط" : "ضبط پیام صوتی"}
                className={`flex size-8 items-center justify-center rounded-lg border transition-colors ${
                  voiceRecorder.state === "RECORDING"
                    ? "border-red-500/40 bg-red-500/15 text-red-500 dark:text-red-400"
                    : voiceRecorder.state === "STOPPING"
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-500 dark:text-amber-400"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {voiceRecorder.state === "RECORDING" ? <Square className="size-3.5" /> : <Mic className="size-4" />}
              </button>
            </div>
            <Button size="sm" onClick={handleSend} disabled={sending || uploading || voiceRecorder.state === "RECORDING"}>
              <Send className="ml-1 size-4" />
              ارسال
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Announcements (from site admins / instructors) ──────────────────────────
function AnnouncementsTab() {
  const anns = useQuery(api.notifications.listAnnouncements) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">اعلان‌ها</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          اطلاعیه‌های مدیر سایت و مدرسها — برای دوره‌های شما و آزمون‌ها.
        </p>
      </div>

      <div className="space-y-3">
        {anns.map((a) => (
          <Card key={a._id} className="border-border/70 shadow-sm">
            <CardContent className="flex items-start gap-3 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BellRing className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{a.title}</p>
                  <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground">
                    {a.targetType === "all"
                      ? "سراسری"
                      : a.targetType === "course"
                        ? `دوره: ${a.targetTitle ?? "—"}`
                        : `آزمون: ${a.targetTitle ?? "—"}`}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {a.authorName} · {formatDateTime(a.createdAt)}
                </p>
                {a.body && <p className="mt-2 text-sm leading-6">{a.body}</p>}
              </div>
            </CardContent>
          </Card>
        ))}

        {anns.length === 0 && (
          <EmptyState
            icon={BellRing}
            title="اعلانی نیست"
            desc="وقتی مدیر سایت یا مدرس‌ها اطلاعیه‌ای بفرستند، اینجا نمایش داده می‌شود."
          />
        )}
      </div>
    </div>
  );
}

// ── Inbox (messages from the site admin, per account) ───────────────────────
function InboxTab() {
  const msgs = useQuery(api.inbox.listMyInbox) ?? [];
  const markRead = useMutation(api.inbox.markInboxRead);
  const unread = msgs.filter((m) => m.unread).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">صندوق ورودی</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          پیام‌های مدیر سایت — مخصوص حساب شما
          {unread > 0 ? ` · ${faNum(unread)} پیام خوانده‌نشده` : ""}.
        </p>
      </div>
      <div className="space-y-3">
        {msgs.map((m) => (
          <Card key={m._id} className={m.unread ? "border-primary/40 shadow-sm" : "border-border/70"}>
            <CardContent className="flex items-start gap-3 py-4">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                  m.unread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {m.unread ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
              </span>
              <div
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => {
                  if (m.unread) void markRead({ id: m._id });
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{m.title}</p>
                  {m.unread && <Badge className="rounded-full bg-red-500/10 text-red-500">جدید</Badge>}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDateTime(m.createdAt)}</p>
                {m.body && <p className="mt-2 text-sm leading-6">{m.body}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {msgs.length === 0 && (
          <EmptyState
            icon={Inbox}
            title="صندوق ورودی خالی است"
            desc="وقتی مدیر سایت پیامی برای شما بفرستد، اینجا نمایش داده می‌شود."
          />
        )}
      </div>
    </div>
  );
}

// ── Student profile (photo, name, about — admin approves edits) ────────────

// ── Certificate tab ────────────────────────────────────────────────────────
function CertificateTab() {
  const myCourses = useQuery(api.enroll.getMyEnrollments);
  const myCerts = useQuery(api.promotions.listMyCertificates);
  const requestCert = useMutation(api.promotions.requestCertificate);
  const [busyId, setBusyId] = useState<string | null>(null);

  const completedCourses = myCourses?.filter((e: any) => e.completed) ?? [];
  const inProgressCourses = myCourses?.filter((e: any) => !e.completed) ?? [];

  const certFor = (courseId: string) => (myCerts ?? []).find((c: any) => c.courseId === courseId);

  const handleRequest = async (courseId: string) => {
    setBusyId(courseId);
    try {
      await requestCert({ courseId: courseId as any });
      toast.success("درخواست گواهی ارسال شد — پس از بررسی مدیر صادر می شود.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ارسال درخواست");
    } finally {
      setBusyId(null);
    }
  };

  if (myCourses === undefined) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">گواهی دوره‌ها</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          گواهی تکمیل دوره‌هایی که با موفقیت به پایان رسانده‌اید.
        </p>
      </div>

      {completedCourses.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-emerald-500">دوره‌های تکمیل شده ✓</h3>
          {completedCourses.map((enroll: any) => {
            const cert = certFor(enroll.courseId);
            return (
              <Card key={enroll._id} className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold">{enroll.courseTitle}</p>
                    <p className="text-xs text-muted-foreground">تکمیل شده</p>
                  </div>
                  {cert?.status === "approved" && (cert.certificateUrl || cert.certificateStorageId) ? (
                    <a
                      href={cert.fileUrl ?? cert.certificateUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-emerald-500 px-4 text-xs font-bold text-white hover:bg-emerald-600"
                    >
                      <Download className="size-3.5" />
                      دانلود گواهی
                    </a>
                  ) : cert?.status === "approved" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                      <Award className="ml-1 size-3" />
                      تایید شده — در انتظار فایل
                    </Badge>
                  ) : cert?.status === "requested" ? (
                    <Badge variant="outline" className="text-xs text-amber-500">
                      <Hourglass className="ml-1 size-3" />
                      در انتظار بررسی مدیر
                    </Badge>
                  ) : cert?.status === "rejected" ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs text-red-500">رد شده{cert.note ? `: ${cert.note}` : ""}</Badge>
                      <Button size="sm" variant="outline" className="rounded-full text-xs" disabled={busyId === enroll.courseId} onClick={() => handleRequest(enroll.courseId)}>
                        درخواست مجدد
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" className="rounded-full text-xs" disabled={busyId === enroll.courseId} onClick={() => handleRequest(enroll.courseId)}>
                      {busyId === enroll.courseId ? <Loader2 className="size-3.5 animate-spin" /> : <Award className="ml-1 size-3.5" />}
                      درخواست گواهی
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {inProgressCourses.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground">در حال گذراندن</h3>
          {inProgressCourses.map((enroll: any) => (
            <Card key={enroll._id} className="border-border/70">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-bold">{enroll.courseTitle}</p>
                  <p className="text-xs text-muted-foreground">تکمیل دوره برای دریافت گواهی لازم است</p>
                </div>
                <Badge variant="outline" className="text-xs">در حال گذراندن</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {completedCourses.length === 0 && inProgressCourses.length === 0 && (
        <Card className="border-border/70">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Award className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">هنوز دوره‌ای ثبت‌نام نکرده‌اید.</p>
            <Button asChild variant="outline" size="sm">
              <a href="/courses">مشاهده دوره‌ها</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StudentProfileTab() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">پروفایل من</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          عکس، نام و معرفی کوتاه خود را تنظیم کنید؛ تغییرات پس از تأیید مدیر سایت اعمال می‌شود.
        </p>
      </div>
      <MemberProfileEditor />
      <TelegramAccount />
      <TelegramNotifications />
    </div>
  );
}
