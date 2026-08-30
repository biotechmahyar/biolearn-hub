import { api } from "@/convex/_generated/api";
import { CategoryField } from "@/components/site/CategoryField";
import { ClassTimer } from "@/components/site/ClassTimer";
import { MemberProfileEditor } from "@/components/site/MemberProfileEditor";
import TelegramAccount from "@/components/site/TelegramAccount";
import TelegramNotifications from "@/components/site/TelegramNotifications";
import { WhiteboardCanvas, type WbTool } from "@/components/site/WhiteboardCanvas";
import { useAuth } from "@/hooks/use-auth";
import { useInstructorBroadcast } from "@/hooks/use-live";
import { formatFileSize, fileKindFromMime, uploadBlob } from "@/lib/upload";
import { gregorianToJalali, toPersianDigits } from "@/lib/jalali";
import { JalaliDatePicker } from "@/components/site/JalaliDatePicker";
import { useMutation, useQuery } from "convex/react";
import {
  BarChart3,
  BellRing,
  BookOpen,
  BookUser,
  BookmarkCheck,
  BookmarkPlus,
  Brush,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  ClipboardList,
  Clock,
  CreditCard,
  Dna,
  DoorOpen,
  Eraser,
  FileText,
  GraduationCap,
  HelpCircle,
  Highlighter,
  Home,
  Hourglass,
  Layers,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Mic,
  MonitorPlay,
  Paperclip,
  PenTool,
  Plus,
  Presentation,
  Radio,
  Save,
  Send,
  Settings,
  Square,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ── Tab & sidebar types ──────────────────────────────────────────────────────

type Tab =
  | "dashboard"
  | "courses-mine"
  | "courses-design"
  | "courses-resources"
  | "rooms-live"
  | "rooms-calendar"
  | "rooms-attendance"
  | "students-all"
  | "students-performance"
  | "students-attention"
  | "assess-homework"
  | "assess-exams"
  | "assess-grades"
  | "comm-qa"
  | "comm-messages"
  | "comm-announcements"
  | "analytics"
  | "reports"
  | "ai-assistant"
  | "payments"
  | "profile";

interface SidebarSection {
  label: string;
  icon: typeof Video;
  children: { id: Tab; label: string; icon?: typeof Video }[];
}

const SIDEBAR: SidebarSection[] = [
  { label: "داشبورد", icon: LayoutDashboard, children: [{ id: "dashboard", label: "داشبورد", icon: LayoutDashboard }] },
  {
    label: "آموزش",
    icon: BookOpen,
    children: [
      { id: "courses-mine", label: "دوره‌های من", icon: BookOpen },
      { id: "courses-design", label: "طراحی دوره", icon: PenTool },
      { id: "courses-resources", label: "منابع", icon: Layers },
    ],
  },
  {
    label: "کلاس‌ها",
    icon: Video,
    children: [
      { id: "rooms-live", label: "کلاس‌های زنده", icon: Video },
      { id: "rooms-calendar", label: "تقویم", icon: Calendar },
      { id: "rooms-attendance", label: "حضور و غیاب", icon: CheckCircle2 },
    ],
  },
  {
    label: "دانشجویان",
    icon: Users,
    children: [
      { id: "students-all", label: "همه دانشجویان", icon: Users },
      { id: "students-performance", label: "عملکرد", icon: TrendingUp },
      { id: "students-attention", label: "نیازمند توجه", icon: Target },
    ],
  },
  {
    label: "ارزیابی",
    icon: ClipboardList,
    children: [
      { id: "assess-homework", label: "تکالیف", icon: FileText },
      { id: "assess-exams", label: "آزمون‌ها", icon: Clock },
      { id: "assess-grades", label: "نمرات", icon: Star },
    ],
  },
  {
    label: "ارتباط",
    icon: MessageSquare,
    children: [
      { id: "comm-qa", label: "پرسش و پاسخ", icon: HelpCircle },
      { id: "comm-messages", label: "پیام‌ها", icon: MessageSquare },
      { id: "comm-announcements", label: "اطلاعیه‌ها", icon: BellRing },
    ],
  },
  {
    label: "تحلیل",
    icon: BarChart3,
    children: [
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "reports", label: "گزارش‌ها", icon: FileText },
    ],
  },
  { label: "دستیار هوشمند", icon: Settings, children: [{ id: "ai-assistant", label: "دستیار هوشمند", icon: Settings }] },
  { label: "پرداختی‌ها", icon: CreditCard, children: [{ id: "payments", label: "پرداختی‌ها", icon: CreditCard }] },
  { label: "پروفایل", icon: User, children: [{ id: "profile", label: "پروفایل", icon: User }] },
];

type RoomRow = (typeof api.collab.listRooms)["_returnType"][number];
type OnlineRow = (typeof api.collab.listOnline)["_returnType"][number];
type StrokeRow = (typeof api.collab.listStrokes)["_returnType"][number];

const BOARD_BGS = [
  { label: "تیره", value: "#0f172a" },
  { label: "سیاه", value: "#000000" },
  { label: "سفید", value: "#f8fafc" },
  { label: "کرم", value: "#f5f0e1" },
  { label: "سبز تخته", value: "#14532d" },
  { label: "آبی", value: "#1e3a5f" },
];

const PEN_COLORS = [
  "#ffffff",
  "#fde047",
  "#ef4444",
  "#22c55e",
  "#38bdf8",
  "#a78bfa",
  "#000000",
];

const ANNO_COLORS = ["#ef4444", "#fde047", "#22c55e", "#38bdf8", "#ffffff"];

const TOOL_SIZES: Record<WbTool, number> = {
  pen: 0.012,
  highlighter: 0.03,
  eraser: 0.05,
};

// ── Sidebar section component ────────────────────────────────────────────────

function SidebarSectionButton({
  section,
  activeTab,
  onSelect,
}: {
  section: SidebarSection;
  activeTab: Tab;
  onSelect: (id: Tab) => void;
}) {
  const [open, setOpen] = useState(() => {
    // Auto-open if current tab is in this section
    return section.children.some((c) => c.id === activeTab);
  });
  const isActive = section.children.some((c) => c.id === activeTab);
  const Icon = section.icon;

  if (section.children.length === 1) {
    const child = section.children[0];
    return (
      <button
        onClick={() => onSelect(child.id)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
          activeTab === child.id
            ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }`}
      >
        <Icon className="size-4 shrink-0" />
        <span className="whitespace-nowrap">{child.label}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((s) => !s)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
          isActive
            ? "text-cyan-200"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }`}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 text-right whitespace-nowrap">{section.label}</span>
        <ChevronDown className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mr-2 mt-0.5 space-y-0.5 border-r border-white/5 pr-2">
          {section.children.map((child) => (
            <button
              key={child.id}
              onClick={() => onSelect(child.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                activeTab === child.id
                  ? "bg-cyan-400/10 text-cyan-200"
                  : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
              }`}
            >
              {child.icon && <child.icon className="size-3.5 shrink-0" />}
              <span className="whitespace-nowrap">{child.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

export default function InstructorPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const rooms = useQuery(api.collab.listRooms) ?? [];
  const online = useQuery(api.collab.listOnline) ?? [];
  const touchPresence = useMutation(api.collab.touchPresence);

  useEffect(() => {
    touchPresence({ location: "استودیوی مدرس" });
    const t = setInterval(() => touchPresence({ location: "استودیوی مدرس" }), 25_000);
    return () => clearInterval(t);
  }, [touchPresence]);

  const handleTabSelect = (id: Tab) => {
    setTab(id);
    setActiveRoom(null);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#071019] text-slate-200" dir="rtl">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-cyan-400/10 bg-[#071019]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-400" onClick={() => setMobileMenuOpen((s) => !s)}>
              <Dna className="size-5 text-cyan-300" />
            </button>
            <span className="hidden lg:flex size-9 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10">
              <Dna className="size-5 text-cyan-300" />
            </span>
            <div>
              <h1 className="text-sm font-bold text-cyan-100">استودیوی مدرس</h1>
              <p className="font-mono text-[10px] tracking-wide text-cyan-400/60">
                instructor studio · live
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-300 sm:flex">
              <CircleDot className="size-3 animate-pulse" />
              آنلاین
            </span>
            <Badge variant="outline" className="hidden border-cyan-400/20 font-mono text-[10px] text-cyan-300 md:inline-flex">
              {user?.name ?? "مدرس"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400"
              onClick={() => navigate(user?.role === "admin" || user?.role === "site_admin" ? "/admin" : "/")}
            >
              <Home className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar — mobile toggle */}
        {mobileMenuOpen && (
          <aside className="lg:hidden rounded-xl border border-cyan-400/10 bg-[#0a1520] p-3">
            <nav className="space-y-1">
              {SIDEBAR.map((section) => (
                <SidebarSectionButton key={section.label} section={section} activeTab={tab} onSelect={handleTabSelect} />
              ))}
            </nav>
          </aside>
        )}

        {/* Sidebar — desktop */}
        <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
          <nav className="space-y-1">
            {SIDEBAR.map((section) => (
              <SidebarSectionButton key={section.label} section={section} activeTab={tab} onSelect={handleTabSelect} />
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="min-w-0">
          {/* Dashboard */}
          {tab === "dashboard" && <DashboardView rooms={rooms} online={online} user={user} />}

          {/* آموزش */}
          {tab === "courses-mine" && <CoursesMineView />}
          {tab === "courses-design" && <CourseStudioView />}
          {tab === "courses-resources" && <ResourcesView />}

          {/* کلاس‌ها */}
          {tab === "rooms-live" && !activeRoom && <RoomsView rooms={rooms} onOpen={setActiveRoom} />}
          {tab === "rooms-live" && activeRoom && (
            <RoomView roomId={activeRoom} onClose={() => setActiveRoom(null)} rooms={rooms} />
          )}
          {tab === "rooms-calendar" && <CalendarView />}
          {tab === "rooms-attendance" && <AttendanceView rooms={rooms} />}

          {/* دانشجویان */}
          {tab === "students-all" && <StudentsAllView />}
          {tab === "students-performance" && <StudentsPerformanceView />}
          {tab === "students-attention" && <StudentsAttentionView />}

          {/* ارزیابی */}
          {tab === "assess-homework" && <HomeworkView />}
          {tab === "assess-exams" && <ExamsView />}
          {tab === "assess-grades" && <GradesView />}

          {/* ارتباط */}
          {tab === "comm-qa" && <QAView rooms={rooms} />}
          {tab === "comm-messages" && <MessagesView />}
          {tab === "comm-announcements" && <AnnouncementsView instructorName={user?.name ?? null} />}

          {/* تحلیل */}
          {tab === "analytics" && <AnalyticsView />}
          {tab === "reports" && <ReportsView />}

          {/* دستیار هوشمند */}
          {tab === "ai-assistant" && <AIAssistantView />}

          {/* پرداختی‌ها */}
          {tab === "payments" && <PaymentsView />}

          {/* پروفایل */}
          {tab === "profile" && <ProfileView />}
        </main>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── پرداختی‌ها ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function PaymentsView() {
  const payments = useQuery(api.instructorTools.listMyPayments) ?? [];

  const totalPaid = payments.filter((p: any) => p.status === "paid").reduce((sum: number, p: any) => sum + p.amount, 0);
  const totalPending = payments.filter((p: any) => p.status === "pending").reduce((sum: number, p: any) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">پرداختی‌ها</h2>
        <p className="mt-1 text-sm text-slate-400">مشاهده وضعیت پرداخت دستمزد.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-emerald-400">{totalPaid.toLocaleString("fa-IR")}</p>
            <p className="mt-1 text-xs text-slate-400">پرداخت شده (تومان)</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-amber-400">{totalPending.toLocaleString("fa-IR")}</p>
            <p className="mt-1 text-xs text-slate-400">در انتظار پرداخت (تومان)</p>
          </CardContent>
        </Card>
      </div>

      {payments.length === 0 ? (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CreditCard className="size-8 text-slate-600" />
            <p className="text-sm text-slate-400">هنوز پرداختی ثبت نشده است.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map((p: any) => (
            <Card key={p._id} className="border-white/5 bg-white/[0.02]">
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">{p.description}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString("fa-IR")}
                    {p.paidAt && ` · پرداخت: ${new Date(p.paidAt).toLocaleDateString("fa-IR")}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white">{p.amount.toLocaleString("fa-IR")} تومان</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    p.status === "paid" ? "bg-emerald-400/15 text-emerald-300"
                    : p.status === "pending" ? "bg-amber-400/15 text-amber-300"
                    : "bg-red-400/15 text-red-300"
                  }`}>
                    {p.status === "paid" ? "پرداخت شده" : p.status === "pending" ? "در انتظار" : "رد شده"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Dashboard ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function DashboardView({
  rooms,
  online,
  user,
}: {
  rooms: RoomRow[];
  online: OnlineRow[];
  user: any;
}) {
  const courses = useQuery(api.profiles.listSuggestedCourses);
  const liveRooms = rooms.filter((r) => r.status === "live");

  const stats = [
    { label: "کلاس‌های زنده", value: liveRooms.length, icon: Video, color: "text-red-400" },
    { label: "دانشجویان آنلاین", value: online.length, icon: Users, color: "text-emerald-400" },
    { label: "دوره‌های من", value: (courses?.mine ?? []).length, icon: BookOpen, color: "text-cyan-400" },
    { label: "کل کلاس‌ها", value: rooms.length, icon: Calendar, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">داشبورد</h2>
        <p className="mt-1 text-sm text-slate-400">خوش آمدید، {user?.name ?? "مدرس"} 👋</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-white/5 bg-white/[0.02]">
            <CardContent className="flex items-center gap-4 py-4">
              <div className={`rounded-lg bg-white/5 p-2.5 ${s.color}`}>
                <s.icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader><CardTitle className="text-sm text-white">کلاس‌های فعال</CardTitle></CardHeader>
          <CardContent>
            {liveRooms.length === 0 ? (
              <p className="text-sm text-slate-500">کلاس فعالی وجود ندارد.</p>
            ) : (
              <div className="space-y-2">
                {liveRooms.slice(0, 5).map((r) => (
                  <div key={r._id} className="flex items-center justify-between rounded-lg bg-white/[0.02] p-3">
                    <span className="text-sm text-white">{r.title}</span>
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">LIVE</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader><CardTitle className="text-sm text-white">آخرین فعالیت‌ها</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">فعالیت‌های اخیر شما در اینجا نمایش داده خواهد شد.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── آموزش: دوره‌های من ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function CoursesMineView() {
  const suggested = useQuery(api.profiles.listSuggestedCourses);
  const toggle = useMutation(api.profiles.toggleSuggestedCourse);
  const courses = suggested?.mine ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">دوره‌های من</h2>
        <p className="mt-1 text-sm text-slate-400">دوره‌هایی که تدریس می‌کنید.</p>
      </div>
      {courses.length === 0 ? (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpen className="size-8 text-slate-600" />
            <p className="text-sm text-slate-400">هنوز دوره‌ای ثبت نشده است.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c: any) => (
            <Card key={c._id} className="border-white/5 bg-white/[0.02]">
              <CardContent className="space-y-2 py-4">
                <h3 className="break-words font-bold text-white">{c.title}</h3>
                <p className="text-xs text-slate-400">{c.category ?? ""}</p>
                <p className="line-clamp-2 text-xs text-slate-500">{c.summary ?? ""}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── آموزش: منابع ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function ResourcesView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">منابع آموزشی</h2>
        <p className="mt-1 text-sm text-slate-400">فایل‌ها و منابع آموزشی دوره‌ها.</p>
      </div>
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Layers className="size-8 text-slate-600" />
          <p className="text-sm text-slate-400">بخش منابع به‌زودی فعال خواهد شد.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── کلاس‌ها: تقویم ──────────────────────────────────────────────────────────

function formatJalaliFull(iso: string): string {
  const parsed = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parsed) return iso;
  const [jy, jm, jd] = gregorianToJalali(+parsed[1], +parsed[2], +parsed[3]);
  const months = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
  return toPersianDigits(`${jd} ${months[jm - 1]} ${jy}`);
}

function formatTimestampToShamsi(ts: number): string {
  const d = new Date(ts);
  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const months = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
  const h = d.getHours();
  const m = d.getMinutes();
  return `${toPersianDigits(jd)} ${months[jm - 1]} ${toPersianDigits(jy)} · ساعت ${toPersianDigits(String(h).padStart(2,"0"))}:${toPersianDigits(String(m).padStart(2,"0"))}`;
}

function CalendarView() {
  const rooms = useQuery(api.collab.listRooms) ?? [];
  const myRooms = rooms.filter((r) => r.instructorName === useAuth().user?.name);
  const live = myRooms.filter((r) => r.status === "live");
  const past = myRooms.filter((r) => r.status === "ended");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">تقویم کلاس‌ها</h2>
        <p className="mt-1 text-sm text-slate-400">برنامه کلاس‌ها و زمان‌بندی برگزاری.</p>
      </div>

      {live.length > 0 && (
        <Card className="border-cyan-400/20 bg-[#0b1a2a]">
          <CardHeader><CardTitle className="text-sm text-cyan-200">کلاس‌های در حال برگزاری</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {live.map((r) => (
              <div key={r._id} className="flex items-center justify-between rounded-lg border border-cyan-400/10 bg-white/[0.02] p-3">
                <div>
                  <p className="text-sm font-medium text-white">{r.title}</p>
                  <p className="text-xs text-slate-400">{r.topic}</p>
                  <p className="mt-1 text-[11px] text-cyan-300/70">⏱ شروع: {formatTimestampToShamsi(r.createdAt)}</p>
                </div>
                <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold text-red-300">LIVE</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader><CardTitle className="text-sm text-white">کلاس‌های گذشته</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {past.map((r) => (
              <div key={r._id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.01] p-3">
                <div>
                  <p className="text-sm font-medium text-slate-300">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.topic}</p>
                  <p className="mt-1 text-[11px] text-slate-500">📅 {formatTimestampToShamsi(r.createdAt)}</p>
                </div>
                <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-[10px] font-bold text-slate-400">پایان‌یافته</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {live.length === 0 && past.length === 0 && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Calendar className="size-8 text-slate-600" />
            <p className="text-sm text-slate-400">هنوز کلاسی ثبت نشده است.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── کلاس‌ها: حضور و غیاب ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function AttendanceView({ rooms }: { rooms: RoomRow[] }) {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const myRooms = rooms.filter((r) => r.instructorId === user?._id);
  const students = useQuery(
    api.instructorTools.listRoomStudents,
    selectedRoom ? { roomId: selectedRoom as any } : "skip",
  ) ?? [];
  const attendance = useQuery(
    api.instructorTools.getAttendance,
    selectedRoom ? { roomId: selectedRoom as any } : "skip",
  ) ?? [];
  const markAtt = useMutation(api.instructorTools.markAttendance);

  const handleMark = async (studentId: string, studentName: string, present: boolean) => {
    if (!selectedRoom) return;
    try {
      await markAtt({ roomId: selectedRoom as any, studentId: studentId as any, studentName, present });
      toast.success(present ? "حضور ثبت شد" : "غیاب ثبت شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">حضور و غیاب</h2>
        <p className="mt-1 text-sm text-slate-400">مدیریت حضور دانشجویان در کلاس‌های خود.</p>
      </div>
      {!selectedRoom ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {myRooms.length === 0 ? (
            <Card className="border-white/5 bg-white/[0.02]">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <CheckCircle2 className="size-8 text-slate-600" />
                <p className="text-sm text-slate-400">کلاسی از شما وجود ندارد.</p>
              </CardContent>
            </Card>
          ) : (
            myRooms.map((r) => (
              <button key={r._id} onClick={() => setSelectedRoom(r._id)} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-right hover:border-cyan-400/30">
                <p className="font-bold text-white">{r.title}</p>
                <p className="mt-1 text-xs text-slate-400">{r.messageCount} پیام · {r.status}</p>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setSelectedRoom(null)}>← بازگشت</Button>
          {students.length === 0 ? (
            <Card className="border-white/5 bg-white/[0.02]">
              <CardContent className="py-8 text-center text-sm text-slate-400">دانشجویی در این کلاس پیام نداده است.</CardContent>
            </Card>
          ) : (
            students.map((s: any) => {
              const att = attendance.find((a: any) => String(a.studentId) === String(s._id));
              return (
                <div key={s._id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <span className="text-sm text-white">{s.name}</span>
                  <div className="flex gap-2">
                    <Button size="sm" className={`h-7 text-xs ${att?.present ? "bg-green-600" : "bg-white/10 text-slate-400"}`} onClick={() => handleMark(s._id, s.name, true)}>حضور</Button>
                    <Button size="sm" className={`h-7 text-xs ${att && !att.present ? "bg-red-600" : "bg-white/10 text-slate-400"}`} onClick={() => handleMark(s._id, s.name, false)}>غیاب</Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── دانشجویان: همه ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function StudentsAllView() {
  const { user } = useAuth();
  const performance = useQuery(api.instructorTools.getStudentPerformance) ?? [];
  const sendMessage = useMutation(api.instructorTools.sendMessage);
  const [msgTarget, setMsgTarget] = useState<string | null>(null);
  const [msgText, setMsgText] = useState("");

  const handleSendMsg = async () => {
    if (!msgTarget || !msgText.trim()) return;
    try {
      await sendMessage({ receiverId: msgTarget as any, text: msgText.trim() });
      toast.success("پیام ارسال شد");
      setMsgTarget(null); setMsgText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">دانشجویان من</h2>
        <p className="mt-1 text-sm text-slate-400">{performance.length} دانشجو در کلاس‌های شما</p>
      </div>
      {performance.length === 0 ? (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="size-8 text-slate-600" />
            <p className="text-sm text-slate-400">دانشجویی در کلاس‌های شما شرکت نکرده است.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {performance.map((s: any) => (
            <Card key={s.studentId} className="border-white/5 bg-white/[0.02]">
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-bold text-cyan-300">
                    {(s.name ?? "?")[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.questions} سؤال · {s.messages} پیام · {s.attendance}/{s.totalRooms} حضور</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="w-full h-7 text-xs text-cyan-300" onClick={() => setMsgTarget(s.studentId)}>
                  <Send className="ml-1 size-3" /> ارسال پیام
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!msgTarget} onOpenChange={(o) => { if (!o) { setMsgTarget(null); setMsgText(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>ارسال پیام به دانشجو</DialogTitle></DialogHeader>
          <Textarea placeholder="متن پیام…" value={msgText} onChange={(e) => setMsgText(e.target.value)} className="border-white/10 bg-white/5 text-slate-100" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => { setMsgTarget(null); setMsgText(""); }}>انصراف</Button>
            <Button size="sm" onClick={handleSendMsg}><Send className="ml-1 size-4" /> ارسال</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── دانشجویان: عملکرد ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function StudentsPerformanceView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">عملکرد دانشجویان</h2>
        <p className="mt-1 text-sm text-slate-400">بررسی عملکرد تحصیلی دانشجویان.</p>
      </div>
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <TrendingUp className="size-8 text-slate-600" />
          <p className="text-sm text-slate-400">بخش عملکرد به‌زودی فعال خواهد شد.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── دانشجویان: نیازمند توجه ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function StudentsAttentionView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">دانشجویان نیازمند توجه</h2>
        <p className="mt-1 text-sm text-slate-400">دانشجویانی که نیاز به توجه ویژه دارند.</p>
      </div>
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Target className="size-8 text-slate-600" />
          <p className="text-sm text-slate-400">بخش نیازمند توجه به‌زودی فعال خواهد شد.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── ارزیابی: تکالیف ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function HomeworkView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">تکالیف</h2>
        <p className="mt-1 text-sm text-slate-400">ایجاد و مدیریت تکالیف دانشجویان.</p>
      </div>
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <FileText className="size-8 text-slate-600" />
          <p className="text-sm text-slate-400">بخش تکالیف به‌زودی فعال خواهد شد.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── ارزیابی: آزمون‌ها ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function ExamsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">آزمون‌ها</h2>
        <p className="mt-1 text-sm text-slate-400">ایجاد و مدیریت آزمون‌ها.</p>
      </div>
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Clock className="size-8 text-slate-600" />
          <p className="text-sm text-slate-400">بخش آزمون‌ها به‌زودی فعال خواهد شد.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── ارزیابی: نمرات ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function GradesView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">نمرات</h2>
        <p className="mt-1 text-sm text-slate-400">مشاهده و مدیریت نمرات دانشجویان.</p>
      </div>
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Star className="size-8 text-slate-600" />
          <p className="text-sm text-slate-400">بخش نمرات به‌زودی فعال خواهد شد.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── ارتباط: پرسش و پاسخ ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function QAView({ rooms }: { rooms: RoomRow[] }) {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const detail = useQuery(
    api.collab.getRoom,
    selectedRoom ? { roomId: selectedRoom as any } : "skip",
  );
  const messages = (detail?.messages ?? []) as any[];
  const questions = messages.filter((m: any) => m.type === "question");
  const answerQuestion = useMutation(api.collab.answerQuestion);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleAnswer = async (messageId: string) => {
    const text = answers[messageId]?.trim();
    if (!text) return;
    try {
      await answerQuestion({ messageId: messageId as any, answer: text });
      setAnswers((prev) => ({ ...prev, [messageId]: "" }));
      toast.success("پاسخ ارسال شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  const liveRooms = rooms.filter((r) => r.status === "live");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">پرسش و پاسخ</h2>
        <p className="mt-1 text-sm text-slate-400">انتخاب کلاس برای مشاهده سؤالات دانشجویان.</p>
      </div>
      {!selectedRoom ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {liveRooms.length === 0 ? (
            <Card className="border-white/5 bg-white/[0.02]">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <HelpCircle className="size-8 text-slate-600" />
                <p className="text-sm text-slate-400">کلاس فعالی وجود ندارد.</p>
              </CardContent>
            </Card>
          ) : (
            liveRooms.map((r) => (
              <button
                key={r._id}
                onClick={() => setSelectedRoom(r._id)}
                className="rounded-xl border border-cyan-400/15 bg-[#0b1a2a] p-4 text-right transition-all hover:border-cyan-400/40 hover:bg-[#0e2033]"
              >
                <h3 className="font-bold text-white">{r.title}</h3>
                <p className="mt-1 text-xs text-slate-400">{r.openQuestions} سؤال بی‌پاسخ</p>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setSelectedRoom(null)}>
            ← بازگشت به لیست کلاس‌ها
          </Button>
          {questions.length === 0 ? (
            <Card className="border-white/5 bg-white/[0.02]">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <HelpCircle className="size-8 text-slate-600" />
                <p className="text-sm text-slate-400">سؤالی در این کلاس ثبت نشده است.</p>
              </CardContent>
            </Card>
          ) : (
            questions.map((q: any) => (
              <Card key={q._id} className={`border-white/5 ${q.answer ? "bg-white/[0.01]" : "bg-amber-400/5"}`}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-white">{q.text}</p>
                    {q.answer ? (
                      <span className="shrink-0 rounded-full bg-green-400/15 px-2 py-0.5 text-[10px] font-bold text-green-300">پاسخ داده شد</span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">بی‌پاسخ</span>
                    )}
                  </div>
                  {q.answer && <p className="rounded-lg bg-green-400/5 p-2 text-xs text-green-200">{q.answer}</p>}
                  {!q.answer && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="پاسخ…"
                        value={answers[q._id] ?? ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q._id]: e.target.value }))}
                        className="border-white/10 bg-white/5 text-sm text-slate-100"
                        onKeyDown={(e) => e.key === "Enter" && handleAnswer(q._id)}
                      />
                      <Button size="sm" className="shrink-0" onClick={() => handleAnswer(q._id)}>
                        <Send className="size-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── ارتباط: پیام‌ها ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function MessagesView() {
  const conversations = useQuery(api.instructorTools.listMyMessages) ?? [];
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const messages = useQuery(
    api.instructorTools.listConversation,
    selectedPartner ? { partnerId: selectedPartner as any } : "skip",
  ) ?? [];
  const sendMessage = useMutation(api.instructorTools.sendMessage);
  const markRead = useMutation(api.instructorTools.markRead);
  const [newMsg, setNewMsg] = useState("");

  useEffect(() => {
    if (selectedPartner) void markRead({ partnerId: selectedPartner as any });
  }, [selectedPartner, markRead]);

  const handleSend = async () => {
    if (!selectedPartner || !newMsg.trim()) return;
    try {
      await sendMessage({ receiverId: selectedPartner as any, text: newMsg.trim() });
      setNewMsg("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">پیام‌ها</h2>
        <p className="mt-1 text-sm text-slate-400">ارتباط مستقیم با دانشجویان.</p>
      </div>
      {!selectedPartner ? (
        conversations.length === 0 ? (
          <Card className="border-white/5 bg-white/[0.02]">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <MessageSquare className="size-8 text-slate-600" />
              <p className="text-sm text-slate-400">پیامی وجود ندارد.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversations.map((c: any) => (
              <button key={c.partnerId} onClick={() => setSelectedPartner(c.partnerId)} className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-right hover:border-cyan-400/30">
                <div className="flex size-10 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-bold text-cyan-300">{(c.partnerName ?? "?")[0]}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{c.partnerName}</p>
                  <p className="truncate text-xs text-slate-400">{c.lastMessage}</p>
                </div>
                {c.unread > 0 && <span className="size-2 rounded-full bg-cyan-400" />}
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setSelectedPartner(null)}>← بازگشت</Button>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {messages.map((m: any) => {
              const isMine = String(m.senderId) !== selectedPartner;
              return (
                <div key={m._id} className={`flex ${isMine ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] rounded-xl px-4 py-2 text-sm ${isMine ? "bg-cyan-400/10 text-cyan-100" : "bg-white/10 text-white"}`}>
                    {m.text}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input placeholder="پیام…" value={newMsg} onChange={(e) => setNewMsg(e.target.value)} className="border-white/10 bg-white/5 text-slate-100" onKeyDown={(e) => e.key === "Enter" && handleSend()} />
            <Button size="sm" onClick={handleSend}><Send className="size-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── تحلیل: Analytics ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function AnalyticsView() {
  const { user } = useAuth();
  const rooms = useQuery(api.collab.listRooms) ?? [];
  const performance = useQuery(api.instructorTools.getStudentPerformance) ?? [];
  const myRooms = rooms.filter((r) => r.instructorId === user?._id);
  const liveRooms = myRooms.filter((r) => r.status === "live");
  const totalMessages = myRooms.reduce((sum, r) => sum + (r.messageCount ?? 0), 0);
  const totalQuestions = myRooms.reduce((sum, r) => sum + (r.openQuestions ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">تحلیل و آمار</h2>
        <p className="mt-1 text-sm text-slate-400">آمار فعالیت کلاس‌ها و دانشجویان.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "کل کلاس‌ها", value: myRooms.length, color: "text-cyan-400" },
          { label: "کلاس‌های فعال", value: liveRooms.length, color: "text-red-400" },
          { label: "دانشجویان", value: performance.length, color: "text-emerald-400" },
          { label: "کل پیام‌ها", value: totalMessages, color: "text-amber-400" },
        ].map((s) => (
          <Card key={s.label} className="border-white/5 bg-white/[0.02]">
            <CardContent className="py-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-xs text-slate-400">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {performance.length > 0 && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader><CardTitle className="text-sm text-white">فعال‌ترین دانشجویان</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {performance.sort((a: any, b: any) => (b.questions + b.messages) - (a.questions + a.messages)).slice(0, 5).map((s: any) => (
              <div key={s.studentId} className="flex items-center justify-between rounded-lg bg-white/[0.02] p-3">
                <span className="text-sm text-white">{s.name}</span>
                <span className="text-xs text-slate-400">{s.questions + s.messages} فعالیت</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── تحلیل: گزارش‌ها ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function ReportsView() {
  const { user } = useAuth();
  const rooms = useQuery(api.collab.listRooms) ?? [];
  const performance = useQuery(api.instructorTools.getStudentPerformance) ?? [];
  const myRooms = rooms.filter((r) => r.instructorId === user?._id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">گزارش‌ها</h2>
        <p className="mt-1 text-sm text-slate-400">گزارش عملکرد کلاس‌ها و دانشجویان.</p>
      </div>
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader><CardTitle className="text-sm text-white">خلاصه کلاس‌ها</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {myRooms.length === 0 ? (
            <p className="text-sm text-slate-400">کلاسی ثبت نشده است.</p>
          ) : myRooms.map((r) => (
            <div key={r._id} className="flex items-center justify-between rounded-lg bg-white/[0.02] p-3">
              <div>
                <p className="text-sm font-medium text-white">{r.title}</p>
                <p className="text-xs text-slate-400">{r.topic}</p>
              </div>
              <span className="text-xs text-slate-400">{r.messageCount} پیام</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── دستیار هوشمند ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function AIAssistantView() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">دستیار هوشمند</h2>
        <p className="mt-1 text-sm text-slate-400">ابزارهای هوش مصنوعی برای مدیریت کلاس و تولید محتوا.</p>
      </div>
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <Settings className="size-10 text-cyan-400" />
          <p className="text-sm text-slate-400">از هوش مصنوعی سایت برای تولید محتوا، پاسخ به سؤالات و مدیریت کلاس‌ها استفاده کنید.</p>
          <Button className="bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20" onClick={() => navigate("/chat")}>
            <Settings className="ml-1.5 size-4" />
            باز کردن چت باکس هوش مصنوعی
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Rooms list + create + cancel ─────────────────────────────────────────────
function RoomsView({
  rooms,
  onOpen,
}: {
  rooms: RoomRow[];
  onOpen: (id: string) => void;
}) {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [hideOthers, setHideOthers] = useState(true);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const createRoom = useMutation(api.collab.createRoom);
  const setRoomStatus = useMutation(api.collab.setRoomStatus);
  const requestClass = useMutation(api.admin.requestClass);
  const myRequests = useQuery(api.admin.listMyClassRequests);
  const isAdminOrManager = user?.role === "admin" || user?.role === "site_admin";

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("عنوان کلاس الزامی است");
      return;
    }
    try {
      const id = await createRoom({ title, topic, description });
      toast.success("کلاس ساخته شد و اکنون زنده است");
      setShowCreate(false);
      setTitle(""); setTopic(""); setDescription("");
      onOpen(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ساخت کلاس");
    }
  }

  async function handleRequestClass() {
    if (!title.trim()) {
      toast.error("عنوان کلاس الزامی است");
      return;
    }
    try {
      await requestClass({ title, topic, description, proposedDate: proposedDate || new Date().toISOString().slice(0, 10) });
      toast.success("درخواست کلاس برای مدیر ارسال شد");
      setShowRequest(false);
      setTitle(""); setTopic(""); setDescription(""); setProposedDate("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ارسال درخواست");
    }
  }

  async function handleDeletePast(roomId: string) {
    try {
      await setRoomStatus({ roomId: roomId as any, status: "ended" });
      toast.success("کلاس حذف شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  }

  const live = rooms.filter((r) => r.status === "live");
  const liveFiltered = hideOthers && user?.name
    ? live.filter((r) => (r.instructorName ?? "") === user.name)
    : live;
  const pastRaw = rooms.filter((r) => r.status !== "live");
  const past = hideOthers && user?.name
    ? pastRaw.filter((r) => (r.instructorName ?? "") === user.name)
    : pastRaw;

  const myPending = (myRequests ?? []).filter((r: any) => r.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">کلاس‌های زنده</h2>
          <p className="mt-1 text-sm text-slate-400">
            {liveFiltered.length} کلاس{hideOthers ? " خودم" : ""} در حال برگزاری
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 rounded-lg text-xs ${hideOthers ? "text-slate-400" : "text-cyan-300"}`}
            onClick={() => setHideOthers((s) => !s)}
          >
            {hideOthers ? "نمایش همه" : "فقط خودم"}
          </Button>
          <Button
            className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20"
            onClick={() => { setShowCreate(false); setShowRequest((s) => !s); }}
          >
            <Send className="size-4" />
            درخواست کلاس
          </Button>
          <Button
            className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20"
            onClick={() => { setShowRequest(false); setShowCreate((s) => !s); }}
          >
            <Plus className="size-4" />
            کلاس جدید
          </Button>
        </div>
      </div>

      {/* ── Create form (direct) ── */}
      {showCreate && (
        <Card className="border-cyan-400/20 bg-[#0b1a2a]">
          <CardHeader>
            <CardTitle className="text-sm text-cyan-200">ایجاد کلاس زنده</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="عنوان کلاس" value={title} onChange={(e) => setTitle(e.target.value)} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
            <Input placeholder="موضوع" value={topic} onChange={(e) => setTopic(e.target.value)} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
            <Textarea placeholder="توضیح…" value={description} onChange={(e) => setDescription(e.target.value)} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>انصراف</Button>
              <Button size="sm" onClick={handleCreate}>
                <Radio className="size-4" /> شروع کلاس
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Request form (to admin) ── */}
      {showRequest && (
        <Card className="border-amber-400/20 bg-amber-400/5">
          <CardHeader>
            <CardTitle className="text-sm text-amber-200">درخواست تشکیل کلاس</CardTitle>
            <p className="text-xs text-amber-300/60 mt-1">درخواست شما برای مدیر سایت ارسال می‌شود.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="عنوان کلاس" value={title} onChange={(e) => setTitle(e.target.value)} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
            <Input placeholder="موضوع" value={topic} onChange={(e) => setTopic(e.target.value)} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
            <Textarea placeholder="توضیح…" value={description} onChange={(e) => setDescription(e.target.value)} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
            <JalaliDatePicker value={proposedDate} onChange={setProposedDate} placeholder="تاریخ پیشنهادی" className="w-full" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowRequest(false)}>انصراف</Button>
              <Button size="sm" onClick={handleRequestClass}>
                <Send className="size-4" /> ارسال درخواست
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {liveFiltered.length === 0 && !showCreate && !showRequest && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Video className="size-8 text-slate-600" />
            <p className="text-sm text-slate-400">
              {hideOthers ? "کلاس فعالی از شما وجود ندارد." : "کلاسی در حال برگزاری نیست."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {liveFiltered.map((room) => (
          <RoomCard key={room._id} room={room} onOpen={onOpen} user={user} isOwner={(room.instructorName ?? "") === user?.name} isAdmin={isAdminOrManager} />
        ))}
      </div>

      {/* Pending requests */}
      {myPending.length > 0 && (
        <Card className="border-amber-400/15 bg-amber-400/5">
          <CardHeader><CardTitle className="text-sm text-amber-200">درخواست‌های در انتظار</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myPending.map((r: any) => (
              <div key={r._id} className="flex items-center justify-between rounded-lg border border-amber-400/10 bg-white/[0.02] p-3">
                <div>
                  <p className="text-sm font-medium text-white">{r.title}</p>
                  <p className="text-xs text-slate-400">تاریخ پیشنهادی: {r.proposedDate ? formatJalaliFull(r.proposedDate) : "—"}</p>
                </div>
                <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold text-amber-300">در انتظار</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            کلاس‌های گذشته ({past.length})
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {past.map((room) => (
              <RoomCard key={room._id} room={room} onOpen={onOpen} user={user} isOwner={(room.instructorName ?? "") === user?.name} isAdmin={isAdminOrManager} isPast onDelete={isAdminOrManager ? () => handleDeletePast(room._id) : undefined} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Room card with countdown ─────────────────────────────────────────────────

function RoomCard({
  room,
  onOpen,
  user,
  isOwner,
  isAdmin,
  isPast,
  onDelete,
}: {
  room: RoomRow;
  onOpen: (id: string) => void;
  user: any;
  isOwner: boolean;
  isAdmin?: boolean;
  isPast?: boolean;
  onDelete?: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const isLive = room.status === "live";
  const createdAt = room.createdAt;
  const elapsed = now - createdAt;
  const ONE_HOUR = 60 * 60 * 1000;

  // For live rooms, show a countdown since the class started
  // Instructor can enter 10 min early (not applicable for live - they created it)
  const showCountdown = isLive && elapsed < ONE_HOUR;
  const remainingMs = Math.max(0, ONE_HOUR - elapsed);
  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingSec = Math.floor((remainingMs % 60000) / 1000);

  useEffect(() => {
    if (!showCountdown) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [showCountdown]);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  return (
    <>
      <button
        onClick={() => onOpen(room._id)}
        className={`group min-w-0 rounded-xl border p-4 text-right transition-all ${
          isPast
            ? "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
            : "border-cyan-400/15 bg-[#0b1a2a] hover:border-cyan-400/40 hover:bg-[#0e2033]"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {isLive ? (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
              <CircleDot className="size-2.5 animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-bold text-slate-400">
              پایان‌یافته
            </span>
          )}
          <span className="font-mono text-[10px] text-slate-500">
            {room.messageCount} پیام
          </span>
        </div>
        <h3 className="mt-3 break-words font-bold text-white group-hover:text-cyan-200">{room.title}</h3>
        <p className="mt-1 break-words text-xs text-slate-400">{room.topic}</p>

        {showCountdown && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2">
            <Clock className="size-3.5 text-red-400 animate-pulse" />
            <span className="font-mono text-xs font-bold text-red-300">
              {toPersianDigits(remainingMin)}:{toPersianDigits(String(remainingSec).padStart(2, "0"))}
            </span>
            <span className="text-[10px] text-red-300/70">تا پایان</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-400">
          <span className="flex min-w-0 items-center gap-1.5">
            <BookUser className="size-3.5 shrink-0 text-cyan-300/70" />
            <span className="truncate">{room.instructorName}</span>
          </span>
          {isLive && (
            <span className="flex shrink-0 items-center gap-1.5">
              <HelpCircle className="size-3.5 text-amber-300" />
              {room.openQuestions} سؤال
            </span>
          )}
        </div>

        {isOwner && isLive && (
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-400/10"
              onClick={(e) => { e.stopPropagation(); setShowCancelConfirm(true); }}
            >
              لغو کلاس
            </Button>
          </div>
        )}
        {isPast && isAdmin && onDelete && (
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-400/10"
              onClick={(e) => { e.stopPropagation(); setShowCancelConfirm(true); }}
            >
              حذف کلاس گذشته
            </Button>
          </div>
        )}
      </button>

      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>لغو کلاس</DialogTitle>
            <DialogDescription>آیا مطمئنید که می‌خواهید «{room.title}» را {isPast ? "حذف" : "لغو"} کنید؟</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCancelConfirm(false)}>انصراف</Button>
            <Button size="sm" variant="destructive" onClick={() => { onDelete?.(); setShowCancelConfirm(false); }}>
              {isPast ? "حذف" : "لغو کلاس"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Room detail: realtime Q&A + live broadcast + attachments ───────────────
function RoomView({
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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const sendMessage = useMutation(api.collab.sendMessage);
  const answerQuestion = useMutation(api.collab.answerQuestion);
  const setRoomStatus = useMutation(api.collab.setRoomStatus);
  const getUploadUrl = useMutation(api.collab.getUploadUrl);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Whiteboard + screen-share annotation (instructor draws, students watch).
  const boardStrokes = useQuery(api.collab.listStrokes, {
    roomId: roomId as any,
    layer: "board",
  }) ?? [];
  const screenStrokes = useQuery(api.collab.listStrokes, {
    roomId: roomId as any,
    layer: "screen",
  }) ?? [];
  const addStroke = useMutation(api.collab.addStroke);
  const clearStrokes = useMutation(api.collab.clearStrokes);
  const setBoardBg = useMutation(api.collab.setBoardBg);
  const [subTab, setSubTab] = useState<"live" | "board" | "chat">("live");
  const [screenShare, setScreenShare] = useState(false);

  // Live broadcast: publish camera/mic/screen to every student.
  const broadcast = useInstructorBroadcast(roomId, user?._id);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (localVideoRef.current && broadcast.localStream) {
      localVideoRef.current.srcObject = broadcast.localStream;
    }
  }, [broadcast.localStream]);

  // Reset screen-share mode when the broadcast ends for any reason.
  useEffect(() => {
    if (broadcast.status !== "live") setScreenShare(false);
  }, [broadcast.status]);

  // Voice recorder
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const kind = fileKindFromMime(file.type);
    void handleSendAttachment(file, kind, file.name);
    e.target.value = "";
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("مرورگر شما از ضبط صدا پشتیبانی نمی‌کند.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        if (blob.size > 0) void handleSendAttachment(blob, "voice");
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "دسترسی به میکروفون ممکن نشد");
    }
  }

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      if (recTimerRef.current) clearInterval(recTimerRef.current);
    };
  }, []);

  const messages = detail?.messages ?? [];

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

  async function handleAnswer(msgId: string) {
    const answer = answers[msgId];
    if (!answer?.trim()) return;
    try {
      await answerQuestion({ messageId: msgId as any, answer });
      setAnswers((a) => ({ ...a, [msgId]: "" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ارسال پاسخ");
    }
  }

  async function handleEnd() {
    try {
      await setRoomStatus({ roomId: roomId as any, status: "ended" });
      toast.success("کلاس پایان یافت");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  }

  const isLive = detail?.status === "live";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400">
            <X className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{room?.title ?? detail?.title}</h2>
              {isLive && (
                <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
                  <CircleDot className="size-2.5 animate-pulse" />
                  LIVE
                </span>
              )}
              {isLive && <ClassTimer startMs={detail?.createdAt} running />}
            </div>
            <p className="text-xs text-slate-400">
              {room?.topic ?? detail?.topic} ·{" "}
              <span className="text-cyan-300/70">مدرس: {room?.instructorName ?? detail?.instructorName}</span>
            </p>
          </div>
        </div>
        {isLive && (
          <Button
            variant="outline"
            size="sm"
            className="border-red-400/30 text-red-300 hover:bg-red-400/10"
            onClick={handleEnd}
          >
            <DoorOpen className="size-4" />
            پایان کلاس
          </Button>
        )}
      </div>

      {/* Sub-tabs: live / board / chat */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-white/5 bg-white/[0.02] p-1">
        {(
          [
            { id: "live", label: "پخش زنده", icon: Video },
            { id: "board", label: "تخته", icon: Presentation },
            { id: "chat", label: "گفتگو", icon: MessageSquare },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-bold transition-colors ${
              subTab === t.id
                ? "bg-cyan-400/15 text-cyan-200"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "live" && (
        <LiveSection
          broadcast={broadcast}
          localVideoRef={localVideoRef}
          isLive={isLive}
          screenShare={screenShare}
          setScreenShare={setScreenShare}
          roomId={roomId}
          screenStrokes={screenStrokes}
          addStroke={addStroke}
          clearStrokes={clearStrokes}
        />
      )}

      {subTab === "board" && (
        <BoardSection
          isLive={isLive}
          roomId={roomId}
          strokes={boardStrokes}
          boardBg={detail?.boardBg ?? "#0f172a"}
          addStroke={addStroke}
          clearStrokes={clearStrokes}
          setBoardBg={setBoardBg}
        />
      )}

      {subTab === "chat" && (
        <>
      {/* Chat stream */}
      <Card className="border-white/5 bg-[#0b1a2a]">
        <CardContent className="max-h-[52vh] space-y-3 overflow-y-auto py-4">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              هنوز پیامی نیست. از دانشجویان بخواهید سؤال بپرسند.
            </p>
          )}
          {messages.map((m) => {
            const isQuestion = m.type === "question";
            const answered = !!m.answer;
            return (
              <div
                key={m._id}
                className={`rounded-lg border p-3 ${
                  isQuestion
                    ? answered
                      ? "border-emerald-400/20 bg-emerald-400/5"
                      : "border-amber-400/25 bg-amber-400/5"
                    : "border-white/5 bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isQuestion ? (
                    <HelpCircle className="size-4 text-amber-300" />
                  ) : (
                    <MessageSquare className="size-4 text-cyan-300" />
                  )}
                  <span className="text-xs font-bold text-slate-200">{m.name}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {m.role === "instructor" ? "مدرس" : "دانشجو"}
                  </span>
                  <span className="mr-auto font-mono text-[10px] text-slate-600">
                    {new Date(m.createdAt).toLocaleTimeString("fa-IR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-300">{m.text}</p>

                {m.attachmentType === "image" && m.attachmentUrl && (
                  <img
                    src={m.attachmentUrl}
                    alt={m.attachmentName ?? "تصویر"}
                    className="mt-2 max-h-64 rounded-lg border border-white/10"
                  />
                )}
                {m.attachmentType === "voice" && m.attachmentUrl && (
                  <audio
                    controls
                    src={m.attachmentUrl}
                    className="mt-2 h-10 w-full max-w-sm"
                  />
                )}
                {m.attachmentType === "file" && m.attachmentUrl && (
                  <a
                    href={m.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex max-w-sm items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10"
                  >
                    <FileText className="size-4 shrink-0 text-cyan-300" />
                    <span className="truncate">{m.attachmentName}</span>
                    {m.attachmentSize ? (
                      <span className="mr-auto shrink-0 font-mono text-[10px] text-slate-500">
                        {formatFileSize(m.attachmentSize)}
                      </span>
                    ) : null}
                  </a>
                )}

                {isQuestion && !answered && isLive && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      placeholder="پاسخ مدرس…"
                      value={answers[m._id] ?? ""}
                      onChange={(e) =>
                        setAnswers((a) => ({ ...a, [m._id]: e.target.value }))
                      }
                      className="h-8 border-amber-400/20 bg-white/5 text-sm text-slate-100 placeholder:text-slate-500"
                    />
                    <Button
                      size="sm"
                      className="h-8 shrink-0"
                      onClick={() => handleAnswer(m._id)}
                    >
                      <Send className="size-3.5" />
                      پاسخ
                    </Button>
                  </div>
                )}
                {isQuestion && answered && (
                  <div className="mt-2 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                      <CheckCircle2 className="size-3.5" />
                      پاسخ مدرس
                    </p>
                    <p className="mt-1 text-sm text-emerald-100/90">{m.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Composer */}
      {isLive && (
        <Card className="border-white/5 bg-[#0b1a2a]">
          <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
            {recording && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-[11px] font-bold text-red-300">
                <span className="size-2 animate-pulse rounded-full bg-red-500" />
                ضبط… {recSeconds}s
              </span>
            )}
            <div className="flex shrink-0 gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
              <button
                onClick={() => setAsQuestion(true)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  asQuestion ? "bg-amber-400/20 text-amber-200" : "text-slate-400"
                }`}
              >
                سؤال
              </button>
              <button
                onClick={() => setAsQuestion(false)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  !asQuestion ? "bg-cyan-400/20 text-cyan-200" : "text-slate-400"
                }`}
              >
                پیام
              </button>
            </div>
            <Input
              placeholder={
                asQuestion
                  ? "سؤالی که دانشجو پرسیده را اینجا می‌بینید… (شما هم می‌توانید پیام بگذارید)"
                  : "اعلان یا توضیح برای کلاس…"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
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
                className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Paperclip className="size-4" />
                )}
              </button>
              <button
                onClick={() => void toggleRecording()}
                title={recording ? "پایان ضبط" : "ضبط پیام صوتی"}
                className={`flex size-8 items-center justify-center rounded-lg border transition-colors ${
                  recording
                    ? "border-red-400/40 bg-red-400/15 text-red-300"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {recording ? <Square className="size-3.5" /> : <Mic className="size-4" />}
              </button>
            </div>
            <Button size="sm" onClick={handleSend} disabled={sending || uploading}>
              <Send className="size-4" />
              ارسال
            </Button>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  );
}

// ── Live broadcast section: camera / mic / screen share + annotation ───────
function LiveSection({
  broadcast,
  localVideoRef,
  isLive,
  screenShare,
  setScreenShare,
  roomId,
  screenStrokes,
  addStroke,
  clearStrokes,
}: {
  broadcast: ReturnType<typeof useInstructorBroadcast>;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  isLive: boolean;
  screenShare: boolean;
  setScreenShare: (v: boolean) => void;
  roomId: string;
  screenStrokes: StrokeRow[];
  addStroke: (args: {
    roomId: any;
    layer: "board" | "screen";
    tool: WbTool;
    color: string;
    size: number;
    points: { x: number; y: number }[];
  }) => void;
  clearStrokes: (args: { roomId: any; layer: "board" | "screen" }) => void;
}) {
  const [annoTool, setAnnoTool] = useState<WbTool>("pen");
  const [annoColor, setAnnoColor] = useState("#ef4444");

  return (
    <Card className="border-cyan-400/20 bg-[#0b1a2a]">
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-cyan-200">
              <Video className="size-4" />
              پخش زنده برای دانشجویان
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {broadcast.status === "live"
                ? screenShare
                  ? "در حال اشتراک صفحه — روی تصویر بکشید تا نکات مهم را مشخص کنید."
                  : "در حال پخش — دانشجویان صدای شما را می‌شنوند و تصویر را می‌بینند."
                : "صدا، دوربین یا صفحهٔ خود را پخش کنید تا دانشجویان زنده ببینند."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {broadcast.status === "live" ? (
              <Button
                size="sm"
                variant="outline"
                className="border-red-400/30 text-red-300 hover:bg-red-400/10"
                onClick={() => void broadcast.stop()}
              >
                <Square className="size-3.5" />
                پایان پخش
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => void broadcast.start(false)}
                  disabled={broadcast.status === "starting"}
                >
                  {broadcast.status === "starting" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Mic className="size-3.5" />
                  )}
                  پخش صدا
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10"
                  onClick={() => void broadcast.start(true)}
                  disabled={broadcast.status === "starting"}
                >
                  <Camera className="size-3.5" />
                  صدا + دوربین
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10"
                  onClick={() => {
                    setScreenShare(true);
                    void broadcast.start(true, "screen");
                  }}
                  disabled={broadcast.status === "starting"}
                >
                  <MonitorPlay className="size-3.5" />
                  اشتراک صفحه
                </Button>
              </>
            )}
          </div>
        </div>
        {broadcast.error && (
          <p className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">
            {broadcast.error}
          </p>
        )}
        {(broadcast.status === "live" || broadcast.localStream) && (
          <div className="relative w-full">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full rounded-lg border border-cyan-400/20 bg-black"
            />
            {screenShare && isLive && (
              <>
                <WhiteboardCanvas
                  strokes={screenStrokes}
                  bg="transparent"
                  tool={annoTool}
                  color={annoColor}
                  size={TOOL_SIZES[annoTool]}
                  onDraw={(s) =>
                    void addStroke({ roomId: roomId as any, layer: "screen", ...s })
                  }
                  className="absolute inset-0 rounded-lg"
                  minHeight={0}
                  borderClass=""
                />
                <div className="absolute bottom-2 left-1/2 flex max-w-[94%] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/75 px-2 py-1.5 backdrop-blur">
                  <button
                    onClick={() => setAnnoTool("pen")}
                    title="قلم"
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      annoTool === "pen" ? "bg-white/20 text-white" : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <Brush className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setAnnoTool("highlighter")}
                    title="هایلایت"
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      annoTool === "highlighter" ? "bg-white/20 text-yellow-300" : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <Highlighter className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setAnnoTool("eraser")}
                    title="پاک‌کن"
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      annoTool === "eraser" ? "bg-white/20 text-white" : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <Eraser className="size-3.5" />
                  </button>
                  <span className="mx-1 h-4 w-px shrink-0 bg-white/15" />
                  {ANNO_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAnnoColor(c)}
                      title={c}
                      className={`size-5 shrink-0 rounded-full border transition-transform ${
                        annoColor === c ? "scale-110 border-white" : "border-white/25 hover:scale-105"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                  <span className="mx-1 h-4 w-px shrink-0 bg-white/15" />
                  <button
                    onClick={() => void clearStrokes({ roomId: roomId as any, layer: "screen" })}
                    title="پاک کردن همهٔ علامت‌ها"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-red-300 transition-colors hover:bg-red-400/15"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Whiteboard section: instructor draws, students watch live ──────────────
function BoardSection({
  isLive,
  roomId,
  strokes,
  boardBg,
  addStroke,
  clearStrokes,
  setBoardBg,
}: {
  isLive: boolean;
  roomId: string;
  strokes: StrokeRow[];
  boardBg: string;
  addStroke: (args: {
    roomId: any;
    layer: "board" | "screen";
    tool: WbTool;
    color: string;
    size: number;
    points: { x: number; y: number }[];
  }) => void;
  clearStrokes: (args: { roomId: any; layer: "board" | "screen" }) => void;
  setBoardBg: (args: { roomId: any; bg: string }) => void;
}) {
  const [penTool, setPenTool] = useState<WbTool>("pen");
  const [penColor, setPenColor] = useState("#ffffff");

  return (
    <Card className="border-cyan-400/20 bg-[#0b1a2a]">
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-cyan-200">
              <Presentation className="size-4" />
              تختهٔ کلاس
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              رنگ زمینه و نوشته را عوض کنید و آزادانه بکشید — دانشجویان همین لحظه می‌بینند.
            </p>
          </div>
          {isLive && (
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
              <button
                onClick={() => setPenTool("pen")}
                title="قلم"
                className={`flex size-8 items-center justify-center rounded-md transition-colors ${
                  penTool === "pen" ? "bg-cyan-400/20 text-cyan-200" : "text-slate-400 hover:bg-white/10"
                }`}
              >
                <Brush className="size-4" />
              </button>
              <button
                onClick={() => setPenTool("highlighter")}
                title="هایلایت"
                className={`flex size-8 items-center justify-center rounded-md transition-colors ${
                  penTool === "highlighter" ? "bg-yellow-400/20 text-yellow-300" : "text-slate-400 hover:bg-white/10"
                }`}
              >
                <Highlighter className="size-4" />
              </button>
              <button
                onClick={() => setPenTool("eraser")}
                title="پاک‌کن"
                className={`flex size-8 items-center justify-center rounded-md transition-colors ${
                  penTool === "eraser" ? "bg-white/15 text-white" : "text-slate-400 hover:bg-white/10"
                }`}
              >
                <Eraser className="size-4" />
              </button>
              <span className="mx-1 h-4 w-px bg-white/10" />
              <button
                onClick={() => void clearStrokes({ roomId: roomId as any, layer: "board" })}
                title="پاک کردن تخته"
                className="flex size-8 items-center justify-center rounded-md text-red-300 transition-colors hover:bg-red-400/15"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          )}
        </div>

        {isLive && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">زمینه:</span>
              {BOARD_BGS.map((b) => (
                <button
                  key={b.value}
                  title={b.label}
                  onClick={() => void setBoardBg({ roomId: roomId as any, bg: b.value })}
                  className={`size-6 rounded-full border transition-transform hover:scale-110 ${
                    boardBg === b.value ? "border-cyan-300 ring-2 ring-cyan-400/40" : "border-white/20"
                  }`}
                  style={{ background: b.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">رنگ قلم:</span>
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  title={c}
                  className={`size-6 rounded-full border transition-transform hover:scale-110 ${
                    penColor === c ? "scale-110 border-cyan-300 ring-2 ring-cyan-400/40" : "border-white/20"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        )}

        <WhiteboardCanvas
          strokes={strokes}
          bg={boardBg}
          readOnly={!isLive}
          tool={penTool}
          color={penColor}
          size={TOOL_SIZES[penTool]}
          onDraw={(s) => void addStroke({ roomId: roomId as any, layer: "board", ...s })}
          className="min-h-[320px]"
        />
        <p className="text-[11px] text-slate-500">
          {isLive
            ? "تخته به‌صورت زنده برای همهٔ دانشجویان داخل کلاس نمایش داده می‌شود."
            : "کلاس پایان یافته — تخته به‌صورت فقط‌خواندنی نمایش داده می‌شود."}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Online students ─────────────────────────────────────────────────────────
function OnlineView({ online }: { online: OnlineRow[] }) {
  const students = online.filter((u) => u.role === "user" || u.role === "member" || !u.role);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">دانشجویان آنلاین</h2>
        <p className="mt-1 text-sm text-slate-400">
          {students.length} نفر همین حالا در پلتفرم فعال‌اند (بروزرسانی هر ۶۰ ثانیه).
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((s) => (
          <Card key={s.userId} className="border-white/5 bg-[#0b1a2a]">
            <CardContent className="flex items-center gap-3 py-4">
              <span className="relative flex size-10 items-center justify-center rounded-full bg-cyan-400/10 font-bold text-cyan-200">
                {(s.name ?? "؟").slice(0, 1)}
                <span className="absolute -bottom-0.5 -left-0.5 size-3 rounded-full border-2 border-[#0b1a2a] bg-emerald-400" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-200">{s.name}</p>
                <p className="text-[11px] text-slate-500">{s.location ?? "در حال گشت‌وگذار"}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {students.length === 0 && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="size-8 text-slate-600" />
            <p className="text-sm text-slate-400">الان کسی آنلاین نیست.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Course studio: design a course, send it to the site admin ──────────────
const STUDIO_STATUS: Record<string, { label: string; cls: string }> = {
  published: { label: "منتشرشده", cls: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" },
  pending: { label: "در انتظار تأیید", cls: "border-amber-400/20 bg-amber-400/10 text-amber-300" },
  draft: { label: "پیش‌نویس", cls: "border-slate-400/20 bg-slate-400/10 text-slate-300" },
  rejected: { label: "رد شده", cls: "border-red-400/20 bg-red-400/10 text-red-300" },
};

function CourseStudioView() {
  const courses = useQuery(api.courseStudio.listMyCourseStudio) ?? [];
  const create = useMutation(api.courseStudio.createDraftCourse);
  const update = useMutation(api.courseStudio.updateDraftCourse);
  const submit = useMutation(api.courseStudio.submitCourseForReview);
  const remove = useMutation(api.courseStudio.deleteDraftCourse);

  const TIER_LABELS: Record<string, string> = { economy: "اقتصادی", basic: "پایه", plus: "پلاس", premium: "پرمیوم" };
  const emptyForm = {
    title: "", summary: "", description: "", price: "0", mode: "recorded", durationText: "", categoryId: "",
    audienceText: "", prerequisitesText: "",
    syllabusItems: "",
    pkgEconomy: "0", pkgBasic: "0", pkgPlus: "0", pkgPremium: "0",
    pkgEconomyFeatures: "", pkgBasicFeatures: "", pkgPlusFeatures: "", pkgPremiumFeatures: "",
  };
  type CourseForm = typeof emptyForm;
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; course: any } | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"basic" | "detail" | "packages">("basic");

  const openCreate = () => { setForm(emptyForm); setErr(null); setActiveSection("basic"); setDialog({ mode: "create" }); };
  const openEdit = (c: any) => {
    const pp = c.packagePrices ?? [];
    const getPp = (t: string) => pp.find((p: any) => p.tier === t);
    setForm({
      title: c.title,
      summary: c.summary,
      description: c.description ?? "",
      price: String(c.price ?? 0),
      mode: c.mode ?? "recorded",
      durationText: c.durationText ?? "",
      categoryId: c.categoryId ?? "",
      audienceText: (c.audience ?? []).join("\n"),
      prerequisitesText: (c.prerequisites ?? []).join("\n"),
      syllabusItems: (c.syllabus ?? []).map((s: any) => `${s.title} | ${s.durationMin} | ${s.free ? 'رایگان' : 'پولی'}`).join("\n"),
      pkgEconomy: String(getPp("economy")?.price ?? 0),
      pkgBasic: String(getPp("basic")?.price ?? 0),
      pkgPlus: String(getPp("plus")?.price ?? 0),
      pkgPremium: String(getPp("premium")?.price ?? 0),
      pkgEconomyFeatures: (getPp("economy")?.features ?? []).join("\n"),
      pkgBasicFeatures: (getPp("basic")?.features ?? []).join("\n"),
      pkgPlusFeatures: (getPp("plus")?.features ?? []).join("\n"),
      pkgPremiumFeatures: (getPp("premium")?.features ?? []).join("\n"),
    });
    setErr(null);
    setActiveSection("basic");
    setDialog({ mode: "edit", course: c });
  };

  const parseLines = (t: string) => t.split("\n").map((s) => s.trim()).filter(Boolean);
  const parseSyllabus = (t: string) => parseLines(t).map((line, i) => {
    const parts = line.split("|").map((s) => s.trim());
    return { id: `s${i}-${Date.now()}`, title: parts[0] || `جلسه ${i + 1}`, durationMin: Number(parts[1]) || 60, free: parts[2] === 'رایگان' };
  });
  const buildPkg = (tier: string, price: string, features: string) => {
    const p = Number(price) || 0;
    if (p === 0 && !features.trim()) return undefined;
    return { tier: tier as any, price: p, features: parseLines(features) };
  };

  const handleSave = async () => {
    setErr(null);
    if (!form.title.trim() || !form.categoryId) {
      setErr("عنوان و دستهٔ دوره الزامی است.");
      return;
    }
    setBusy(true);
    try {
      const packagePrices = [
        buildPkg("economy", form.pkgEconomy, form.pkgEconomyFeatures),
        buildPkg("basic", form.pkgBasic, form.pkgBasicFeatures),
        buildPkg("plus", form.pkgPlus, form.pkgPlusFeatures),
        buildPkg("premium", form.pkgPremium, form.pkgPremiumFeatures),
      ].filter(Boolean) as any[];
      const payload = {
        title: form.title,
        summary: form.summary,
        description: form.description,
        categoryId: form.categoryId as any,
        price: Number(form.price) || 0,
        mode: form.mode,
        durationText: form.durationText,
        audience: parseLines(form.audienceText),
        prerequisites: parseLines(form.prerequisitesText),
        syllabus: parseSyllabus(form.syllabusItems),
        packagePrices: packagePrices.length > 0 ? packagePrices : undefined,
      };
      if (dialog?.mode === "edit") {
        await update({ courseId: dialog.course._id, ...payload });
      } else {
        await create(payload);
      }
      setDialog(null);
      toast.success(dialog?.mode === "edit" ? "تغییرات ذخیره شد" : "دوره به‌عنوان پیش‌نویس ساخته شد");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (id: string) => {
    setSubmittingId(id);
    try {
      await submit({ courseId: id as any });
      toast.success("دوره برای بررسی به مدیر سایت ارسال شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">طراحی دوره</h2>
          <p className="mt-1 text-sm text-slate-400">
            دوره را طراحی کنید و برای تأیید به مدیر سایت بفرستید؛ پس از تأیید، در سایت منتشر می‌شود.
          </p>
        </div>
        <Button className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20" onClick={openCreate}>
          <Plus className="size-4" />
          دورهٔ جدید
        </Button>
      </div>

      <div className="space-y-3">
        {courses.map((c) => {
          const st = STUDIO_STATUS[c.status] ?? STUDIO_STATUS.draft;
          const editable = c.status === "draft" || c.status === "rejected";
          return (
            <Card key={c._id} className="border-white/5 bg-[#0b1a2a]">
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 break-words font-bold text-white">{c.title}</h3>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-xs text-slate-400">
                      {c.categoryName ?? "—"} · {c.studentsCount ?? 0} دانشجو · {c.syllabusCount ?? 0} جلسه
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {editable && (
                      <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" onClick={() => openEdit(c)}>
                        ویرایش
                      </Button>
                    )}
                    {editable && (
                      <Button
                        size="sm"
                        disabled={submittingId === c._id}
                        className="bg-cyan-500 text-white hover:bg-cyan-400"
                        onClick={() => handleSubmit(c._id)}
                      >
                        {submittingId === c._id ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Send className="ml-1.5 size-4" />}
                        ارسال برای بررسی
                      </Button>
                    )}
                    {(c.status === "draft" || c.status === "pending" || c.status === "rejected") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-red-400"
                        onClick={() => remove({ courseId: c._id })}
                        title="حذف دوره"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {c.summary && <p className="break-words text-sm text-slate-300">{c.summary}</p>}
                {c.reviewNote && (
                  <p className="rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-300">
                    دلیل بازگشت از مدیر سایت: {c.reviewNote}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
        {courses.length === 0 && (
          <Card className="border-white/5 bg-white/[0.02]">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <BookOpen className="size-8 text-slate-600" />
              <p className="text-sm text-slate-400">
                هنوز دوره‌ای طراحی نکرده‌اید. با «دورهٔ جدید» شروع کنید — پیش‌نویس فقط برای شما قابل مشاهده است.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialog !== null} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "ویرایش دوره" : "طراحی دورهٔ جدید"}</DialogTitle>
            <DialogDescription>
              ابتدا به‌صورت پیش‌نویس ذخیره می‌شود؛ بعد از تکمیل، «ارسال برای بررسی» را بزنید تا مدیر سایت تأیید یا بازگرداند.
            </DialogDescription>
          </DialogHeader>
          {/* Section tabs */}
          <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {([
              { key: "basic" as const, label: "اطلاعات پایه" },
              { key: "detail" as const, label: "جزئیات دوره" },
              { key: "packages" as const, label: "پکیج‌ها و قیمت" },
            ]).map((s) => (
              <button key={s.key} onClick={() => setActiveSection(s.key)} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${activeSection === s.key ? "bg-cyan-500 text-white" : "text-slate-400 hover:text-white"}`}>{s.label}</button>
            ))}
          </div>
          <div className="space-y-3">
            {activeSection === "basic" && (
              <>
                <Input placeholder="عنوان دوره" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400">دستهٔ دوره</label>
                  <CategoryField value={form.categoryId || undefined} onValueChange={(v) => setForm({ ...form, categoryId: v })} />
                </div>
                <Input placeholder="خلاصهٔ دوره" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
                <Textarea placeholder="توضیحات کامل دوره…" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input placeholder="قیمت (تومان)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
                  <Input placeholder="مدت دوره" value={form.durationText} onChange={(e) => setForm({ ...form, durationText: e.target.value })} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
                  <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                    <SelectTrigger className="border-white/10 bg-white/5 text-slate-100"><SelectValue placeholder="نوع دوره" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recorded">ویدئویی</SelectItem>
                      <SelectItem value="live">زنده</SelectItem>
                      <SelectItem value="hybrid">ترکیبی</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {activeSection === "detail" && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400">مناسب چه کسانی است؟ (هر خط یک آیتم)</label>
                  <Textarea placeholder="دانشجویان میکروبیولوژی سال آخر\nعلاقه‌مندان به ژنتیک مولکولی" rows={3} value={form.audienceText} onChange={(e) => setForm({ ...form, audienceText: e.target.value })} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400">پیش‌نیازها (هر خط یک آیتم)</label>
                  <Textarea placeholder="زیست‌شناسی پایه\nآشنایی با شیمی آلی" rows={3} value={form.prerequisitesText} onChange={(e) => setForm({ ...form, prerequisitesText: e.target.value })} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400">سرفصل‌ها (هر خط: عنوان | دقیقه | رایگان/پولی)</label>
                  <Textarea placeholder="مقدمه و معرفی | 30 | رایگان\nسلول و اجزای آن | 60 | پولی\nتکثیر DNA | 45 | پولی" rows={5} value={form.syllabusItems} onChange={(e) => setForm({ ...form, syllabusItems: e.target.value })} className="border-white/10 bg-white/5 font-mono text-xs text-slate-100 placeholder:text-slate-500" />
                </div>
              </>
            )}
            {activeSection === "packages" && (
              <>
                <p className="text-xs text-slate-400">قیمت هر پکیج و امکانات آن را تنظیم کنید. پکیج‌هایی که قیمت ندارند در سایت نمایش داده نمی‌شوند.</p>
                {(["economy", "basic", "plus", "premium"] as const).map((tier) => (
                  <div key={tier} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300">پکیج {TIER_LABELS[tier]}</span>
                    </div>
                    <Input placeholder={`قیمت ${TIER_LABELS[tier]} (تومان)`} value={form[`pkg${tier.charAt(0).toUpperCase() + tier.slice(1)}` as keyof CourseForm] as string} onChange={(e) => setForm({ ...form, [`pkg${tier.charAt(0).toUpperCase() + tier.slice(1)}`]: e.target.value } as any)} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
                    <Textarea placeholder={`امکانات ${TIER_LABELS[tier]} (هر خط یک آیتم)`} rows={2} value={form[`pkg${tier.charAt(0).toUpperCase() + tier.slice(1)}Features` as keyof CourseForm] as string} onChange={(e) => setForm({ ...form, [`pkg${tier.charAt(0).toUpperCase() + tier.slice(1)}Features`]: e.target.value } as any)} className="border-white/10 bg-white/5 text-xs text-slate-100 placeholder:text-slate-500" />
                  </div>
                ))}
              </>
            )}
            {err && <p className="text-sm text-red-400">{err}</p>}
            <Button onClick={handleSave} disabled={busy} className="bg-cyan-500 text-white hover:bg-cyan-400">
              {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Save className="ml-1.5 size-4" />}
              {dialog?.mode === "edit" ? "ذخیرهٔ تغییرات" : "ذخیره به‌عنوان پیش‌نویس"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Bank account for payments ────────────────────────────────────────────────

function BankAccountSection() {
  const bank = useQuery(api.instructorTools.getBankAccount);
  const updateBank = useMutation(api.instructorTools.updateBankAccount);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [sheba, setSheba] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (bank) {
      setBankName(bank.bankName);
      setAccountNumber(bank.bankAccountNumber);
      setCardNumber(bank.bankCardNumber);
      setSheba(bank.bankSheba);
    }
  }, [bank]);

  const handleSave = async () => {
    try {
      await updateBank({ bankName, bankAccountNumber: accountNumber, bankCardNumber: cardNumber, bankSheba: sheba });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("اطلاعات بانکی ذخیره شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  return (
    <Card className="border-white/5 bg-white/[0.02]">
      <CardHeader>
        <CardTitle className="text-sm text-white">اطلاعات حساب بانکی</CardTitle>
        <p className="text-xs text-slate-400">برای دریافت دستمزد، اطلاعات حساب بانکی خود را وارد کنید.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input placeholder="نام بانک" value={bankName} onChange={(e) => setBankName(e.target.value)} className="border-white/10 bg-white/5 text-slate-100" />
          <Input placeholder="شماره حساب" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="border-white/10 bg-white/5 text-slate-100" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input placeholder="شماره کارت" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="border-white/10 bg-white/5 text-slate-100" />
          <Input placeholder="شماره شبا (IR...)" value={sheba} onChange={(e) => setSheba(e.target.value)} className="border-white/10 bg-white/5 text-slate-100" />
        </div>
        <Button size="sm" onClick={handleSave} className="bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20">
          {saved ? "✓ ذخیره شد" : "ذخیره اطلاعات بانکی"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── My profile (name, photo, about) + suggested courses ─────────────────────
function ProfileView() {
  const suggested = useQuery(api.profiles.listSuggestedCourses);
  const toggle = useMutation(api.profiles.toggleSuggestedCourse);
  const [query, setQuery] = useState("");

  const catalog = suggested?.catalog ?? [];
  const filtered = catalog.filter(
    (c) =>
      !query.trim() ||
      c.title.includes(query.trim()) ||
      (c.instructorName ?? "").includes(query.trim()),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">پروفایل من</h2>
        <p className="mt-1 text-sm text-slate-400">
          نام، عکس و سوابق علمی‌تان را ثبت کنید؛ تغییرات شما برای مدیر سایت ارسال می‌شود و بعد از تأیید، روی سایت نمایش داده می‌شود.
        </p>
      </div>

      <MemberProfileEditor />

      <TelegramAccount />
      <TelegramNotifications />

      {/* Bank account */}
      <BankAccountSection />

      {/* Suggested courses */}
      <div className="space-y-3">
        <div>
          <h3 className="font-bold text-white">دوره‌های پیشنهادی مدرس</h3>
          <p className="mt-1 text-sm text-slate-400">
            دوره‌هایی از مدرسان دیگر که به دانشجویان پیشنهاد می‌دهید — روی پروفایل شما نمایش داده می‌شود.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(suggested?.mine ?? []).map((c) => (
            <Card key={c._id} className="border-emerald-400/20 bg-[#0b1a2a]">
              <CardContent className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="min-w-0 break-words text-sm font-bold text-white">{c.title}</h4>
                  <button
                    onClick={() => void toggle({ courseId: c._id }).catch((e) => toast.error(e instanceof Error ? e.message : "خطا"))}
                    className="shrink-0 text-emerald-300 hover:text-emerald-200"
                    title="حذف از پیشنهادها"
                  >
                    <BookmarkCheck className="size-4" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">{c.instructorName ?? "—"} · {c.category ?? ""}</p>
              </CardContent>
            </Card>
          ))}
          {(suggested?.mine ?? []).length === 0 && (
            <p className="text-sm text-slate-500">هنوز دوره‌ای پیشنهاد نداده‌اید.</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white">افزودن دوره از مدرسان دیگر</h3>
            <p className="mt-1 text-sm text-slate-400">
              همهٔ دوره‌های منتشرشدهٔ مدرسان تیم — با «افزودن به پیشنهادها» در پروفایل شما نمایش داده می‌شود.
            </p>
          </div>
          <Input
            placeholder="جستجوی دوره…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-56 border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c._id} className="border-white/5 bg-[#0b1a2a]">
              <CardContent className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="min-w-0 break-words text-sm font-bold text-white">{c.title}</h4>
                  <button
                    onClick={() => void toggle({ courseId: c._id }).catch((e) => toast.error(e instanceof Error ? e.message : "خطا"))}
                    className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors ${
                      c.suggested
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
                    }`}
                    title={c.suggested ? "حذف از پیشنهادها" : "افزودن به پیشنهادها"}
                  >
                    {c.suggested ? (
                      <span className="flex items-center gap-1"><BookmarkCheck className="size-3" /> پیشنهادشده</span>
                    ) : (
                      <span className="flex items-center gap-1"><BookmarkPlus className="size-3" /> افزودن به پیشنهادها</span>
                    )}
                  </button>
                </div>
                <p className="line-clamp-2 break-words text-xs text-slate-400">{c.summary}</p>
                <p className="text-[11px] text-slate-500">
                  {c.instructorName ?? "—"} · {c.category ?? ""} · {c.studentsCount ?? 0} دانشجو
                </p>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-slate-500">دوره‌ای یافت نشد.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Announcements to my students ────────────────────────────────────────────
function AnnouncementsView({ instructorName }: { instructorName: string | null }) {
  const courses = useQuery(api.content.listCourses, {}) ?? [];
  const mine = courses.filter((c) => c.instructor?.name === instructorName);
  const myAnns = useQuery(api.notifications.listMyAnnouncements) ?? [];
  const create = useMutation(api.notifications.createAnnouncement);
  const remove = useMutation(api.notifications.deleteAnnouncement);

  const [mode, setMode] = useState<"all" | "course">("all");
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    setErr(null);
    if (title.trim().length < 3) {
      setErr("عنوان اطلاعیه لازم است.");
      return;
    }
    if (mode === "course" && !courseId) {
      setErr("دوره را انتخاب کنید تا به دانشجویانش اطلاعیه برسد.");
      return;
    }
    setBusy(true);
    try {
      await create({
        targetType: mode,
        targetId: mode === "course" ? courseId : undefined,
        title,
        body,
      });
      setTitle("");
      setBody("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا در ارسال اطلاعیه");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">اطلاعیه برای دانشجویان</h2>
        <p className="mt-1 text-sm text-slate-400">
          اطلاعیه‌ای عمومی برای همه بفرستید یا فقط به دانشجویان یکی از دوره‌های خودتان — مثلاً «کلاس آنلاین جمع‌بندی امشب ساعت ۲۰».
        </p>
      </div>

      <Card className="border-cyan-400/20 bg-[#0b1a2a]">
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                mode === "all"
                  ? "bg-cyan-500 text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              🌐 عمومی (همه کاربران)
            </button>
            <button
              type="button"
              onClick={() => setMode("course")}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                mode === "course"
                  ? "bg-cyan-500 text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              📚 دانشجویان یک دوره
            </button>
          </div>

          {mode === "course" && (
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
                <SelectValue placeholder="دوره را انتخاب کنید…" />
              </SelectTrigger>
              <SelectContent>
                {mine.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {mode === "course" && mine.length === 0 && (
            <p className="text-xs text-slate-500">
              دوره‌ای با نام شما ثبت نشده. از پنل مدیریت، پروفایل مدرسی‌تان را به دوره وصل کنید.
            </p>
          )}
          <Input
            placeholder="عنوان اطلاعیه (مثلاً: کلاس آنلاین جمع‌بندی امشب)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
          />
          <Textarea
            placeholder="متن اطلاعیه…"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
          />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <Button onClick={handleCreate} disabled={busy} className="bg-cyan-500 text-white hover:bg-cyan-400">
            {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Send className="ml-1.5 size-4" />}
            ارسال اطلاعیه
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">اطلاعیه‌های قبلی</p>
        {myAnns.map((a) => (
          <Card key={a._id} className="border-white/5 bg-white/[0.02]">
            <CardContent className="flex items-start gap-3 py-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/10">
                <BellRing className="size-4 text-cyan-300" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-100">{a.title}</p>
                  <button
                    onClick={() => remove({ id: a._id })}
                    className="text-slate-600 transition-colors hover:text-red-400"
                    title="حذف"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {a.targetType === "all" ? "همه" : `برای: ${a.targetTitle ?? "—"}`} ·{" "}
                  {new Date(a.createdAt).toLocaleDateString("fa-IR")}
                </p>
                {a.body && <p className="mt-1.5 text-sm text-slate-300">{a.body}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {myAnns.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">هنوز اطلاعیه‌ای نفرستاده‌اید.</p>
        )}
      </div>
    </div>
  );
}
