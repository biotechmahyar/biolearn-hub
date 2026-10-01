import { api } from "@/convex/_generated/api";
import { WorkshopsView } from "@/components/site/WorkshopsView";
import { CategoryField } from "@/components/site/CategoryField";
import { ClassTimer } from "@/components/site/ClassTimer";
import { MemberProfileEditor } from "@/components/site/MemberProfileEditor";
import TelegramAccount from "@/components/site/TelegramAccount";
import TelegramNotifications from "@/components/site/TelegramNotifications";
import { LessonContentEditor } from "@/components/site/LessonContentEditor";
import { CourseManageView } from "@/components/site/CourseManageView";
import { WhiteboardCanvas, type WbTool } from "@/components/site/WhiteboardCanvas";
import { WhiteboardFilePanel } from "@/components/site/WhiteboardFilePanel";
import { LiveActivityToasts } from "@/components/site/LiveActivityToasts";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useMode } from "@/hooks/useMode";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useInstructorBroadcast } from "@/hooks/use-live";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { formatFileSize, fileKindFromMime, uploadBlob } from "@/lib/upload";
import { formatPriceNumber, formatCardNumber, faNum, formatJalaliDateString } from "@/lib/format";
import { gregorianToJalali, toPersianDigits, todayISO } from "@/lib/jalali";
import { JalaliDatePicker } from "@/components/site/JalaliDatePicker";
import DeskTopBar, { type DeskFeedItem } from "@/components/panels/DeskTopBar";
import JalaliMonthCalendar from "@/components/panels/JalaliMonthCalendar";
import { applyDeskTheme, useDeskTheme } from "@/lib/deskTheme";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  BarChart3,
  BellRing,
  Bot,
  BookOpen,
  BookUser,
  BookmarkCheck,
  BookmarkPlus,
  Brush,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CircleDot,
  ClipboardList,
  Clock,
  CreditCard,
  Dna,
  DoorOpen,
  ExternalLink,
  Eraser,
  FileText,
  GraduationCap,
  HelpCircle,
  Highlighter,
  Home,
  LifeBuoy,
  Hourglass,
  Layers,
  LinkIcon,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Mic,
  MonitorPlay,
  Paperclip,
  PenTool,
  Play,
  Plus,
  Presentation,
  Radio,
  Route,
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
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ── Tab & sidebar types ──────────────────────────────────────────────────────

type Tab =
  | "dashboard"
  | "courses-mine"
  | "courses-design"
  | "courses-resources"
  | "rooms-live"
  | "rooms-calendar"
  | "rooms-attendance"
  | "rooms-webinar"
  | "students-all"
  | "students-performance"
  | "students-attention"
  | "assess-homework"
  | "assess-exams"
  | "assess-grades"
  | "comm-qa"
  | "comm-messages"
  | "comm-support"
  | "comm-announcements"
  | "workshops-list"
  | "academy-path"
  | "analytics"
  | "reports"
  | "ai-assistant"
  | "payments"
  | "profile"
  | "course-manage";

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
      { id: "rooms-webinar", label: "وبینار", icon: ExternalLink },
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
      { id: "comm-support", label: "پشتیبانی دانشجویان", icon: LifeBuoy },
      { id: "comm-announcements", label: "اطلاعیه‌ها", icon: BellRing },
    ],
  },
  {
    label: "کارگاه‌ها",
    icon: Users,
    children: [
      { id: "workshops-list", label: "کارگاه‌های من", icon: Users },
    ],
  },
  {
    label: "مسیر آکادمی",
    icon: Route,
    children: [{ id: "academy-path", label: "مسیر آکادمی", icon: Route }],
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

/** Format seconds to MM:SS for voice recorder display */
function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fa-IR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatRecDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function SidebarSectionButton({
  section,
  activeTab,
  onSelect,
  notifCounts,
}: {
  section: SidebarSection;
  activeTab: Tab;
  onSelect: (id: Tab) => void;
  notifCounts?: Record<string, number>;
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
            ? "border border-primary/30 bg-primary/10 text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Icon className="size-4 shrink-0" />
        <span className="whitespace-nowrap">{child.label}</span>
        {notifCounts && notifCounts[child.id] > 0 && (
          <span className="mr-auto flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse">
            {notifCounts[child.id] > 9 ? "!" : notifCounts[child.id]}
          </span>
        )}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((s) => !s)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 text-right whitespace-nowrap">{section.label}</span>
        <ChevronDown className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mr-2 mt-0.5 space-y-0.5 border-r border-border pr-2">
          {section.children.map((child) => (
            <button
              key={child.id}
              onClick={() => onSelect(child.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                activeTab === child.id
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-muted-foreground"
              }`}
            >
              {child.icon && <child.icon className="size-3.5 shrink-0" />}
              <span className="whitespace-nowrap">{child.label}</span>
              {notifCounts && notifCounts[child.id] > 0 && (
                <span className="mr-auto flex size-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white animate-pulse">
                  {notifCounts[child.id] > 9 ? "!" : notifCounts[child.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

export default function InstructorPanel() {
  const { isIran } = useMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [manageCourseId, setManageCourseId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { theme } = useDeskTheme("instructor-studio");
  useEffect(() => applyDeskTheme(theme, "instructor-studio"), [theme]);

  const allRooms = useQuery(api.collab.listRooms) ?? [];
  const online = useQuery(api.collab.listOnline) ?? [];
  const notifCounts = (useQuery(api.admin.instructorNotifications) ?? {}) as Record<string, number>;
  // Instructor sees only their own rooms
  const rooms = user ? allRooms.filter((r: any) => r.instructorId === user._id || user.role === "admin" || user.role === "site_admin") : allRooms;
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

  const myMessages = useQuery(api.instructorTools.listMyMessages);

  const messages = useMemo<DeskFeedItem[]>(
    () =>
      ((myMessages ?? []) as any[]).slice(0, 12).map((m) => ({
        id: `msg-${m.partnerId}`,
        title: m.partnerName || "گفت‌وگو",
        body: m.lastMessage,
        at: m.lastTime,
        icon: <MessageSquare className="size-3.5" />,
        onClick: () => setTab("comm-messages"),
      })),
    [myMessages],
  );

  const notifications = useMemo<DeskFeedItem[]>(() => {
    const items: DeskFeedItem[] = [];
    rooms
      .filter((r: any) => r.status === "live")
      .slice(0, 5)
      .forEach((r: any) => {
        items.push({
          id: `live-${r._id}`,
          title: `کلاس «${r.title}» هم‌اکنون زنده است`,
          body: r.topic || undefined,
          at: r.createdAt,
          icon: <Video className="size-3.5" />,
          onClick: () => {
            setActiveRoom(r._id);
            setTab("rooms-live");
          },
        });
      });
    rooms
      .filter((r: any) => r.status === "scheduled" && r.scheduledDate)
      .slice(0, 5)
      .forEach((r: any) => {
        items.push({
          id: `sched-${r._id}`,
          title: `کلاس زمان‌بندی‌شده: ${r.title}`,
          body: r.scheduledDate,
          at: r.createdAt,
          icon: <Calendar className="size-3.5" />,
          onClick: () => setTab("rooms-calendar"),
        });
      });
    const pendingCount = Object.values(notifCounts ?? {}).reduce(
      (sum, n) => sum + (Number(n) || 0),
      0,
    );
    if (pendingCount > 0) {
      items.unshift({
        id: "pending-summary",
        title: `${pendingCount} مورد در انتظار بررسی`,
        body: "کلاس‌ها، تیکت‌های پشتیبانی یا پیام‌های خوانده‌نشده",
        at: Date.now(),
        icon: <BellRing className="size-3.5" />,
        onClick: () => setTab("comm-support"),
      });
    }
    return items.sort((a, b) => (b.at ?? 0) - (a.at ?? 0)).slice(0, 12);
  }, [rooms, notifCounts]);

  return (
    <div className="desk-scope flex min-h-screen bg-muted/40 text-foreground" dir="rtl">
      {/* Side rail */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-[250px] shrink-0 flex-col border-l border-border bg-card transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Dna className="size-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold tracking-tight">استودیوی مدرس</span>
            <span className="block text-[10px] text-muted-foreground">instructor studio</span>
          </span>
        </Link>

        <nav className="admin-scroll flex-1 space-y-0.5 overflow-y-auto px-4 pb-4">
          {SIDEBAR.map((section) => (
            <SidebarSectionButton
              key={section.label}
              section={section}
              activeTab={tab}
              onSelect={handleTabSelect}
              notifCounts={notifCounts}
            />
          ))}
        </nav>

        <div className="space-y-2 border-t border-border p-4">
          <div className="rounded-2xl border border-border bg-muted/50 p-3">
            <p className="text-[11px] font-bold">آکادمی ژنوا</p>
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
              {rooms.length} کلاس · {online.length} دانشجوی آنلاین
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-full justify-start rounded-xl text-xs"
            onClick={() =>
              navigate(
                user?.role === "admin" || user?.role === "site_admin" ? "/admin" : "/",
              )
            }
          >
            <Home className="ml-2 size-4" />
            بازگشت به سایت
          </Button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="بستن منو"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <DeskTopBar
          scope="instructor-studio"
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="جست‌وجوی کلاس، دانشجو یا پیام…"
          notifications={notifications}
          messages={messages}
          userName={user?.name || user?.email || "مدرس"}
          userRole={user?.role}
          onToggleSidebar={() => setMobileMenuOpen((s) => !s)}
          extraProfileLinks={[
            {
              label: "پنل مدیریت",
              to: "/admin",
              icon: <BarChart3 className="size-4" />,
            },
          ]}
        />

        <main className="admin-scroll min-w-0 flex-1 p-4 sm:p-6">
          {/* Dashboard */}
          {tab === "dashboard" && (
            <DashboardView
              rooms={rooms}
              online={online}
              user={user}
              onOpenRooms={(roomId) => {
                setActiveRoom(roomId);
                setTab("rooms-live");
              }}
              onGoTab={(next) => {
                setActiveRoom(null);
                setTab(next);
              }}
            />
          )}

          {/* آموزش */}
          {tab === "courses-mine" && <CoursesMineView onManageCourse={(id) => { setManageCourseId(id); setTab("course-manage"); }} />}
          {tab === "courses-design" && <CourseStudioView />}
          {tab === "course-manage" && manageCourseId && <CourseManageView courseId={manageCourseId} onBack={() => { setTab("courses-mine"); setManageCourseId(null); }} />}
          {tab === "courses-resources" && <ResourcesView />}

          {/* کلاس‌ها */}
          {tab === "rooms-live" && !activeRoom && <RoomsView rooms={rooms} onOpen={setActiveRoom} />}
          {tab === "rooms-live" && activeRoom && (
            <RoomView roomId={activeRoom} onClose={() => setActiveRoom(null)} rooms={rooms} />
          )}
          {tab === "rooms-calendar" && <CalendarView />}
          {tab === "rooms-attendance" && <AttendanceView rooms={rooms} />}
          {tab === "rooms-webinar" && <WebinarView rooms={rooms} />}

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
          {tab === "comm-support" && <InstructorSupportView />}
          {tab === "comm-announcements" && <AnnouncementsView instructorName={user?.name ?? null} />}
          {tab === "workshops-list" && <WorkshopsView />}
          {tab === "academy-path" && <AcademyPathView />}

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
        <h2 className="text-xl font-bold text-foreground">پرداختی‌ها</h2>
        <p className="mt-1 text-sm text-muted-foreground">مشاهده وضعیت پرداخت دستمزد.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border bg-background">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{totalPaid.toLocaleString("fa-IR")}</p>
            <p className="mt-1 text-xs text-muted-foreground">پرداخت شده (تومان)</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-background">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{totalPending.toLocaleString("fa-IR")}</p>
            <p className="mt-1 text-xs text-muted-foreground">در انتظار پرداخت (تومان)</p>
          </CardContent>
        </Card>
      </div>

      {payments.length === 0 ? (
        <Card className="border-border bg-background">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CreditCard className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">هنوز پرداختی ثبت نشده است.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map((p: any) => (
            <Card key={p._id} className="border-border bg-background">
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString("fa-IR")}
                    {p.paidAt && ` · پرداخت: ${new Date(p.paidAt).toLocaleDateString("fa-IR")}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground">{p.amount.toLocaleString("fa-IR")} تومان</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    p.status === "paid" ? "bg-emerald-50 text-emerald-600"
                    : p.status === "pending" ? "bg-amber-50 text-amber-600"
                    : "bg-destructive/10 text-destructive"
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
  onOpenRooms,
  onGoTab,
}: {
  rooms: RoomRow[];
  online: OnlineRow[];
  user: any;
  onOpenRooms: (roomId: string) => void;
  onGoTab: (tab: Tab) => void;
}) {
  const courses = useQuery(api.profiles.listSuggestedCourses);
  const performance = useQuery(api.instructorTools.getStudentPerformance) ?? [];
  const [focusDay, setFocusDay] = useState<string | null>(null);

  const liveRooms = rooms.filter((r: any) => r.status === "live");
  const scheduledRooms = rooms.filter((r: any) => r.status === "scheduled");

  const today = todayISO();
  const weekday = new Date().toLocaleDateString("fa-IR", { weekday: "long" });

  // Engagement = how much of the held classes each student attended.
  const rows = useMemo(
    () =>
      [...performance]
        .map((s: any) => ({
          ...s,
          score: s.totalRooms > 0 ? Math.round((s.attendance / s.totalRooms) * 100) : 0,
        }))
        .sort((a: any, b: any) => b.score - a.score),
    [performance],
  );
  const avgScore = rows.length
    ? Math.round(rows.reduce((sum: number, s: any) => sum + s.score, 0) / rows.length)
    : 0;

  const hoursChart = useMemo(() => {
    const labels = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
    const counts = labels.map(() => 0);
    for (const r of rooms as any[]) {
      const iso = (r.scheduledDate || new Date(r.createdAt).toISOString().slice(0, 10)).slice(0, 10);
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) continue;
      counts[(d.getDay() + 1) % 7] += 1;
    }
    return labels.map((label, i) => ({ label, کلاس: counts[i] }));
  }, [rooms]);

  const roomDates = useMemo(
    () =>
      (rooms as any[])
        .map((r) => (r.scheduledDate || new Date(r.createdAt).toISOString().slice(0, 10)).slice(0, 10))
        .filter((d) => !Number.isNaN(new Date(d).getTime())),
    [rooms],
  );

  const upcoming = useMemo(() => {
    const list = [...(rooms as any[])].sort((a, b) => {
      const ad = new Date(a.scheduledDate || a.createdAt).getTime();
      const bd = new Date(b.scheduledDate || b.createdAt).getTime();
      return ad - bd;
    });
    return focusDay ? list.filter((r) => r.scheduledDate?.slice(0, 10) === focusDay) : list.slice(0, 5);
  }, [rooms, focusDay]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">
          خوش آمدید، {user?.name ?? "مدرس"} 👋
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {weekday}، {formatJalaliDateString(today)}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          {/* Banner */}
          <div className="desk-hero-gradient relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-600 via-violet-500 to-sky-500 p-6 text-foreground">
            <div className="pointer-events-none absolute -left-8 -top-12 size-48 rounded-full bg-muted blur-3xl" />
            <BookOpen className="pointer-events-none absolute bottom-4 left-8 size-24 text-white/10" />
            <div className="relative max-w-lg">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">
                آموزش زیست‌شناسی
              </p>
              <p className="mt-2 text-lg font-black leading-8 sm:text-xl">
                میانگین حضور دانشجویان شما{" "}
                <span className="text-2xl">{faNum(avgScore)}٪</span> است
              </p>
              <p className="mt-2 text-[12.5px] leading-6 text-white/80">
                با برنامه‌ریزی کلاس‌های زنده و پیگیری تکالیف، رتبهٔ آموزشی خود را بالا ببرید.
              </p>
              <Button
                size="sm"
                className="mt-5 h-10 rounded-full bg-black/25 px-5 hover:bg-black/35"
                onClick={() => onGoTab("rooms-live")}
              >
                مدیریت کلاس‌ها
                <ChevronLeft className="mr-1.5 size-4" />
              </Button>
            </div>
          </div>

          {/* Working hours */}
          <Card className="gap-0 rounded-2xl border-border py-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-[15px] font-extrabold tracking-tight">ساعت‌های تدریس</h3>
              <span className="text-[11px] text-muted-foreground">
                {faNum(rooms.length)} کلاس در مجموع
              </span>
            </div>
            <div className="p-5">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hoursChart} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
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
                    <Bar
                      dataKey="کلاس"
                      name="کلاس"
                      fill="var(--primary)"
                      radius={[6, 6, 2, 2]}
                      maxBarSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-extrabold">{faNum(rooms.length)}</p>
                  <p className="text-[11px] text-muted-foreground">مجموع</p>
                </div>
                <div>
                  <p className="text-lg font-extrabold text-emerald-600">{faNum(liveRooms.length)}</p>
                  <p className="text-[11px] text-muted-foreground">برگزارشده</p>
                </div>
                <div>
                  <p className="text-lg font-extrabold text-primary">{faNum(scheduledRooms.length)}</p>
                  <p className="text-[11px] text-muted-foreground">پیش‌رو</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Student activity table */}
          <Card className="gap-0 overflow-hidden rounded-2xl border-border py-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-[15px] font-extrabold tracking-tight">عملکرد دانشجویان</h3>
              <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[11px]" onClick={() => onGoTab("students-performance")}>
                همه
              </Button>
            </div>
            {rows.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <Users className="mx-auto size-7 text-muted-foreground/40" />
                <p className="mt-3 text-[13px] text-muted-foreground">
                  پس از برگزاری کلاس، عملکرد دانشجویان اینجا نمایش داده می‌شود.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-right text-[12.5px]">
                  <thead>
                    <tr className="border-b border-border text-[11px] text-muted-foreground">
                      <th className="px-5 py-3 font-medium">دانشجو</th>
                      <th className="px-5 py-3 font-medium">حضور</th>
                      <th className="px-5 py-3 font-medium">پرسش‌ها</th>
                      <th className="px-5 py-3 font-medium">پیام‌ها</th>
                      <th className="px-5 py-3 font-medium">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 6).map((s: any) => (
                      <tr key={s.studentId} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                              {(s.name || "ن").slice(0, 1)}
                            </span>
                            <span className="font-semibold">{s.name || "دانشجو"}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {faNum(s.attendance)} از {faNum(s.totalRooms)}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{faNum(s.questions)}</td>
                        <td className="px-5 py-3 text-muted-foreground">{faNum(s.messages)}</td>
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[10.5px] font-bold",
                              s.score >= 70
                                ? "bg-emerald-50 text-emerald-600"
                                : s.score >= 30
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {s.score >= 70 ? "فعال" : s.score >= 30 ? "نیازمند توجه" : "کم‌فعالیت"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <Card className="gap-0 rounded-2xl border-border py-0">
            <div className="flex items-center gap-3 p-5">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-extrabold text-primary">
                {(user?.name ?? "م").slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-extrabold">{user?.name ?? "مدرس"}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user?.email ?? ""}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 px-5 pb-5">
              <div className="rounded-xl bg-muted/60 p-3 text-center">
                <p className="text-[15px] font-extrabold">{faNum((courses?.mine ?? []).length)}</p>
                <p className="text-[10.5px] text-muted-foreground">دوره‌ها</p>
              </div>
              <div className="rounded-xl bg-muted/60 p-3 text-center">
                <p className="text-[15px] font-extrabold text-primary">{faNum(online.length)}</p>
                <p className="text-[10.5px] text-muted-foreground">آنلاین</p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <Button
                className="w-full rounded-xl"
                onClick={() => onGoTab("rooms-live")}
              >
                <Plus className="ml-1.5 size-4" />
                کلاس جدید
              </Button>
            </div>
          </Card>

          <Card className="gap-0 rounded-2xl border-border py-0">
            <div className="px-5 pt-5">
              <h3 className="text-[15px] font-extrabold tracking-tight">تقویم</h3>
              <p className="mt-1 text-[10.5px] text-muted-foreground">
                روی روزی که کلاس دارید بزنید تا کلاس‌های همان روز را ببینید.
              </p>
            </div>
            <div className="p-5">
              <JalaliMonthCalendar
                selected={focusDay}
                markers={roomDates}
                onSelect={(iso) => setFocusDay((prev) => (prev === iso ? null : iso))}
              />
            </div>
          </Card>

          <Card className="gap-0 rounded-2xl border-border py-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-[15px] font-extrabold tracking-tight">کلاس‌های پیش‌رو</h3>
              <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[11px]" onClick={() => onGoTab("rooms-calendar")}>
                همه
              </Button>
            </div>
            <div className="space-y-2 p-4">
              {upcoming.length === 0 && (
                <p className="px-1 py-4 text-center text-[12px] text-muted-foreground">
                  کلاسی برای نمایش وجود ندارد.
                </p>
              )}
              {upcoming.map((r: any) => (
                <button
                  key={r._id}
                  type="button"
                  onClick={() => onOpenRooms(r._id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 text-right transition-colors hover:bg-muted"
                >
                  <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-card text-center">
                    <span className="text-[13px] font-extrabold leading-4">
                      {r.scheduledDate ? toPersianDigits(r.scheduledDate.slice(8, 10)) : toPersianDigits(new Date(r.createdAt).getDate())}
                    </span>
                    <span className="text-[9px] text-muted-foreground">کلاس</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold">{r.title}</span>
                    <span className="block truncate text-[10.5px] text-muted-foreground">
                      {r.scheduledDate ? formatJalaliDateString(r.scheduledDate) : "بدون تاریخ"} ·{" "}
                      {r.status === "live" ? "در حال برگزاری" : r.status === "scheduled" ? "زمان‌بندی‌شده" : "پایان‌یافته"}
                    </span>
                  </span>
                  <Video className="size-4 shrink-0 text-primary" />
                </button>
              ))}
            </div>
          </Card>

          {/* Group chats */}
          <Card className="gap-0 rounded-2xl border-border py-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-[15px] font-extrabold tracking-tight">گفت‌وگوی کلاس‌ها</h3>
              <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[11px]" onClick={() => onGoTab("comm-messages")}>
                مشاهدهٔ همه
              </Button>
            </div>
            <div className="space-y-1 p-3">
              {rooms.length === 0 && (
                <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
                  هنوز کلاسی ساخته نشده است.
                </p>
              )}
              {(rooms as any[]).slice(0, 5).map((r) => (
                <button
                  key={r._id}
                  type="button"
                  onClick={() => onOpenRooms(r._id)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-right transition-colors hover:bg-muted"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageSquare className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold">{r.title}</span>
                    <span className="block truncate text-[10.5px] text-muted-foreground">
                      {r.openQuestions > 0
                        ? `${r.openQuestions} پرسش بی‌پاسخ`
                        : `${r.messageCount ?? 0} پیام`}
                    </span>
                  </span>
                  {r.openQuestions > 0 && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {toPersianDigits(r.openQuestions)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── آموزش: دوره‌های من ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function CoursesMineView({ onManageCourse }: { onManageCourse: (courseId: string) => void }) {
  const myCourses = useQuery(api.courseStudio.listMyCourseStudio) ?? [];
  const courses = myCourses;

  const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    published: { label: "منتشر", cls: "bg-emerald-50 text-emerald-600" },
    approved: { label: "تأیید شده", cls: "bg-primary/15 text-primary" },
    pending: { label: "در بررسی", cls: "bg-amber-50 text-amber-600" },
    draft: { label: "پیش‌نویس", cls: "bg-slate-400/15 text-muted-foreground" },
    rejected: { label: "رد شده", cls: "bg-destructive/10 text-destructive" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">دوره‌های من</h2>
        <p className="mt-1 text-sm text-muted-foreground">دوره‌هایی که ساخته‌اید یا تدریس می‌کنید.</p>
      </div>
      {courses.length === 0 ? (
        <Card className="border-border bg-background">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpen className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">هنوز دوره‌ای نساخته‌اید.</p>
            <p className="text-xs text-muted-foreground">از تب «طراحی دوره» دوره جدید بسازید.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c: any) => {
            const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.draft;
            return (
              <Card key={c._id} className="border-border bg-background">
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="break-words font-bold text-foreground text-sm">{c.title}</h3>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.categoryName ?? c.category ?? ""}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{c.summary ?? ""}</p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{c.syllabusCount ?? 0} جلسه</span>
                    <span>{c.studentsCount ?? 0} دانشجو</span>
                  </div>
                  {c.reviewNote && (
                    <p className="text-[11px] text-destructive">علت رد: {c.reviewNote}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 bg-primary/10 text-foreground hover:bg-primary/15"
                      onClick={() => onManageCourse(c._id)}
                    >
                      <Settings className="ml-1 size-3.5" />
                      مدیریت دوره
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── آموزش: منابع ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function ResourcesView() {
  const { user } = useAuth();
  const myCourses = useQuery(api.courseStudio.listMyCourseStudio) ?? [];
  const myRooms = useQuery(api.instructorTools.listMyRooms) ?? [];
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [resourceMode, setResourceMode] = useState<"course" | "room">("course");
  const activeId = resourceMode === "course" ? selectedCourse : selectedRoom;
  const resources = useQuery(
    api.instructorTools.listCourseResources,
    resourceMode === "course" && selectedCourse ? { courseId: selectedCourse as any } : "skip"
  ) ?? [];
  const roomResources = useQuery(
    api.instructorTools.listRoomResources,
    resourceMode === "room" && selectedRoom ? { roomId: selectedRoom as any } : "skip"
  ) ?? [];
  const displayResources = resourceMode === "course" ? resources : roomResources;
  const addResource = useMutation(api.instructorTools.addCourseResource);
  const deleteResource = useMutation(api.instructorTools.deleteCourseResource);
  const getUploadUrl = useMutation(api.collab.getUploadUrl);

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [resourceType, setResourceType] = useState<"file" | "link">("file");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const COMMISSION_RATE = 0.04;
  const basePrice = Number(price) || 0;
  const commission = isFree ? 0 : Math.round(basePrice * COMMISSION_RATE);
  const totalPrice = basePrice + commission;

  const handleUploadFile = async (file: File) => {
    const url = await getUploadUrl();
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await resp.json();
    return storageId;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeId) return;
    setUploading(true);
    try {
      const storageId = await handleUploadFile(file);
      const payload: any = {
        title: title || file.name,
        description: description || undefined,
        fileUrl: storageId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        isFree,
        price: isFree ? 0 : basePrice,
        resourceType: "file",
      };
      if (resourceMode === "course") payload.courseId = selectedCourse as any;
      else payload.roomId = selectedRoom as any;
      await addResource(payload);
      toast.success("فایل آپلود شد");
      setShowAdd(false); setTitle(""); setDescription(""); setPrice("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); } finally { setUploading(false); }
  };

  const handleSaveLink = async () => {
    if (!activeId || !title.trim()) { toast.error("عنوان و دوره/کلاس الزامی است"); return; }
    if (!linkUrl.trim()) { toast.error("لینک را وارد کنید"); return; }
    setBusy(true);
    try {
      const payload: any = {
        title,
        description: description || undefined,
        fileUrl: linkUrl,
        fileName: title,
        fileSize: 0,
        fileType: "link",
        isFree,
        price: isFree ? 0 : basePrice,
        resourceType: "link",
        linkUrl,
      };
      if (resourceMode === "course") payload.courseId = selectedCourse as any;
      else payload.roomId = selectedRoom as any;
      await addResource(payload);
      toast.success("لینک اضافه شد");
      setShowAdd(false); setTitle(""); setDescription(""); setPrice(""); setLinkUrl("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">منابع آموزشی</h2>
          <p className="mt-1 text-sm text-muted-foreground">آپلود فایل یا لینک برای دوره‌ها.</p>
        </div>
      </div>

      <Card className="border-border bg-background">
        <CardContent className="py-4 space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant={resourceMode === "course" ? "default" : "outline"} onClick={() => { setResourceMode("course"); setSelectedRoom(null); }} className="text-xs">دوره‌ها</Button>
            <Button size="sm" variant={resourceMode === "room" ? "default" : "outline"} onClick={() => { setResourceMode("room"); setSelectedCourse(null); }} className="text-xs">کلاس‌ها</Button>
          </div>
          {resourceMode === "course" ? (
            <Select value={selectedCourse ?? ""} onValueChange={(v) => setSelectedCourse(v)}>
              <SelectTrigger className="border-border bg-muted text-foreground">
                <SelectValue placeholder="دوره مورد نظر را انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                {myCourses.map((c: any) => (
                  <SelectItem key={c._id} value={c._id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={selectedRoom ?? ""} onValueChange={(v) => setSelectedRoom(v)}>
              <SelectTrigger className="border-border bg-muted text-foreground">
                <SelectValue placeholder="کلاس مورد نظر را انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                {myRooms.map((r: any) => (
                  <SelectItem key={r._id} value={r._id}>{r.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {activeId && (
        <>
          <div className="flex justify-end">
            <Button className="bg-primary/10 text-foreground hover:bg-primary/15" onClick={() => setShowAdd(true)}>
              <Plus className="ml-1.5 size-4" />افزودن منبع
            </Button>
          </div>

          {displayResources.length > 0 ? (
            <div className="space-y-2">
              {displayResources.map((r: any) => (
                <Card key={r._id} className="border-border bg-background">
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                        {r.resourceType === "link" ? <LinkIcon className="size-4 text-primary" /> : <FileText className="size-4 text-primary" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {r.resourceType === "link" ? "لینک خارجی" : `فایل · ${formatFileSize(r.fileSize)}`}
                          {r.isFree ? (
                            <span className="mr-2 text-emerald-600">رایگان</span>
                          ) : (
                            <span className="mr-2 text-amber-600">{formatPriceNumber(r.price ?? 0)} تومان + {formatPriceNumber(r.commission ?? 0)} کارمزد</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("حذف شود؟")) deleteResource({ id: r._id }); }}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border bg-background">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Layers className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">هنوز منبعی اضافه نشده است.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>افزودن منبع آموزشی</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <Button size="sm" variant={resourceType === "file" ? "default" : "outline"} onClick={() => setResourceType("file")} className="text-xs">
                <Upload className="ml-1 size-3.5" />آپلود فایل
              </Button>
              <Button size="sm" variant={resourceType === "link" ? "default" : "outline"} onClick={() => setResourceType("link")} className="text-xs">
                <LinkIcon className="ml-1 size-3.5" />افزودن لینک
              </Button>
            </div>
            <Input placeholder="عنوان منبع" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input placeholder="توضیحات (اختیاری)" value={description} onChange={(e) => setDescription(e.target.value)} />

            {resourceType === "file" ? (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">انتخاب فایل</label>
                <input type="file" onChange={handleFileUpload} disabled={uploading} className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-xs file:text-foreground hover:file:bg-primary/15" />
                {uploading && <p className="mt-1 text-xs text-primary animate-pulse">در حال آپلود...</p>}
              </div>
            ) : (
              <Input placeholder="لینک خارجی (URL)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <Button size="sm" variant={isFree ? "default" : "outline"} onClick={() => setIsFree(true)} className="text-xs">رایگان</Button>
                <Button size="sm" variant={!isFree ? "default" : "outline"} onClick={() => setIsFree(false)} className="text-xs">پولی</Button>
              </div>
              {!isFree && (
                <>
                  <Input type="number" placeholder="قیمت پایه (تومان)" value={price} onChange={(e) => setPrice(e.target.value)} />
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs space-y-1">
                    <p className="text-amber-600 font-bold">قیمت با کارمزد سایت (۴٪):</p>
                    <p className="text-muted-foreground">قیمت پایه: {formatPriceNumber(basePrice)} تومان</p>
                    <p className="text-muted-foreground">کارمزد سایت (۴٪): {formatPriceNumber(commission)} تومان</p>
                    <p className="text-foreground font-bold">قیمت نهایی برای خریدار: {formatPriceNumber(totalPrice)} تومان</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setTitle(""); setPrice(""); setLinkUrl(""); }}>انصراف</Button>
              {resourceType === "link" && (
                <Button size="sm" onClick={handleSaveLink} disabled={busy || !title.trim()}>
                  {busy ? <Loader2 className="ml-1 size-3 animate-spin" /> : null}ذخیره لینک
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
  const deleteRoom = useMutation(api.collab.deleteRoom);
  const setRoomStatus = useMutation(api.collab.setRoomStatus);
  const myRooms = rooms.filter((r) => r.instructorId === useAuth().user?._id);
  const live = myRooms.filter((r) => r.status === "live");
  const scheduled = myRooms.filter((r) => r.status === "scheduled" && r.platformUrl);
  const past = myRooms.filter((r) => r.status === "ended");

  async function handleDeletePast(roomId: string) {
    if (!confirm("آیا از حذف این کلاس مطمئنید؟ این عمل قابل بازگشت نیست.")) return;
    try {
      await deleteRoom({ roomId: roomId as any });
      toast.success("کلاس حذف شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در حذف");
    }
  }

  async function handleEndLive(roomId: string) {
    try {
      await setRoomStatus({ roomId: roomId as any, status: "ended" });
      toast.success("کلاس پایان یافت");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">تقویم کلاس‌ها</h2>
        <p className="mt-1 text-sm text-muted-foreground">برنامه کلاس‌ها و زمان‌بندی برگزاری.</p>
      </div>

      {live.length > 0 && (
        <Card className="border-primary/30 bg-card text-card-foreground">
          <CardHeader><CardTitle className="text-sm text-foreground">کلاس‌های در حال برگزاری</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {live.map((r) => (
              <div key={r._id} className="flex items-center justify-between rounded-lg border border-primary/30 bg-background p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.topic}</p>
                  <p className="mt-1 text-[11px] text-primary/70">⏱ شروع: {formatTimestampToShamsi(r.createdAt)}</p>
                  {r.platformUrl && (
                    <button
                      onClick={() => window.open(r.platformUrl!, "_blank", "noopener,noreferrer")}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/25"
                    >
                      <LinkIcon className="size-3" />
                      برگزاری در پلتفرم خارجی ↗
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[10px] font-bold text-destructive">LIVE</span>
                  <button onClick={() => handleEndLive(r._id)} className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600 hover:bg-amber-50">پایان کلاس</button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <Card className="border-border bg-background">
          <CardHeader><CardTitle className="text-sm text-foreground">کلاس‌های گذشته</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {past.map((r) => (
              <div key={r._id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.topic}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">📅 {formatTimestampToShamsi(r.createdAt)}</p>
                  {r.platformUrl && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      🔗 پلتفرم: <a href={r.platformUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">{r.platformUrl}</a>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-[10px] font-bold text-muted-foreground">پایان‌یافته</span>
                  <button onClick={() => handleDeletePast(r._id)} className="rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-bold text-destructive hover:bg-destructive/15">حذف</button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {scheduled.length > 0 && (
        <Card className="border-blue-400/20 bg-card text-card-foreground">
          <CardHeader><CardTitle className="text-sm text-blue-200">کلاس‌های زمان‌بندی‌شده</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {scheduled.map((r) => (
              <div key={r._id} className="flex items-center justify-between rounded-lg border border-blue-400/10 bg-background p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.topic}</p>
                  {r.scheduledDate && (
                    <p className="mt-1 text-[11px] text-blue-300/70">📅 {formatJalaliFull(r.scheduledDate)}</p>
                  )}
                  {r.platformUrl && (
                    <button
                      onClick={() => window.open(r.platformUrl!, "_blank", "noopener,noreferrer")}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-500/15 px-2.5 py-1 text-[11px] font-medium text-blue-300 transition-colors hover:bg-blue-500/25"
                    >
                      <LinkIcon className="size-3" />
                      برگزاری در پلتفرم خارجی ↗
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-[10px] font-bold text-blue-300">زمان‌بندی شده</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {live.length === 0 && scheduled.length === 0 && past.length === 0 && (
        <Card className="border-border bg-background">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Calendar className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">هنوز کلاسی ثبت نشده است.</p>
          </CardContent>
        </Card>
      )}


    </div>
  );
}


// ── وبینار: کلاس‌های با لینک خارجی ──────────────────────────────────────────
function WebinarView({ rooms }: { rooms: RoomRow[] }) {
  const { user } = useAuth();
  const myWebinars = rooms.filter(
    (r) => r.instructorId === user?._id && r.platformUrl && (r.status === "live" || r.status === "scheduled")
  );
  const pastWebinars = rooms.filter(
    (r) => r.instructorId === user?._id && r.platformUrl && r.status === "ended"
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">وبینار</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          کلاس‌هایی که در پلتفرم خارجی برگزار می‌شوند.
        </p>
      </div>

      {myWebinars.length === 0 && pastWebinars.length === 0 ? (
        <Card className="border-border bg-background">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ExternalLink className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">هنوز وبیناری ثبت نشده است.</p>
            <p className="text-[11px] text-muted-foreground">کلاس‌هایی که لینک پلتفرم خارجی دارند اینجا نمایش داده می‌شوند.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {myWebinars.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-muted-foreground">وبینارهای فعال</h3>
              {myWebinars.map((r) => (
                <Card key={r._id} className="border-primary/30 bg-card text-card-foreground">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {r.status === "live" && (
                            <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                              <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
                              LIVE
                            </span>
                          )}
                          {r.status === "scheduled" && (
                            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                              زمان‌بندی شده
                            </span>
                          )}
                        </div>
                        <h4 className="mt-2 text-sm font-bold text-foreground">{r.title}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">{r.topic}</p>
                        {r.scheduledDate && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            📅 {r.scheduledDate}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="gap-1.5 bg-primary/20 text-primary hover:bg-primary/30"
                        onClick={() => window.open(r.platformUrl!, "_blank", "noopener,noreferrer")}
                      >
                        <ExternalLink className="size-3.5" />
                        ورود به وبینار ↗
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {pastWebinars.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-muted-foreground">وبینارهای گذشته</h3>
              {pastWebinars.map((r) => (
                <Card key={r._id} className="border-border bg-background">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">{r.title}</h4>
                        <p className="text-xs text-muted-foreground">{r.topic}</p>
                      </div>
                      <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                        پایان‌یافته
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
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
        <h2 className="text-xl font-bold text-foreground">حضور و غیاب</h2>
        <p className="mt-1 text-sm text-muted-foreground">مدیریت حضور دانشجویان در کلاس‌های خود.</p>
      </div>
      {!selectedRoom ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {myRooms.length === 0 ? (
            <Card className="border-border bg-background">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <CheckCircle2 className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">کلاسی از شما وجود ندارد.</p>
              </CardContent>
            </Card>
          ) : (
            myRooms.map((r) => (
              <button key={r._id} onClick={() => setSelectedRoom(r._id)} className="rounded-xl border border-border bg-background p-4 text-right hover:border-primary/30">
                <p className="font-bold text-foreground">{r.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{r.messageCount} پیام · {r.status}</p>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setSelectedRoom(null)}>← بازگشت</Button>
          {students.length === 0 ? (
            <Card className="border-border bg-background">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">دانشجویی در این کلاس پیام نداده است.</CardContent>
            </Card>
          ) : (
            students.map((s: any) => {
              const att = attendance.find((a: any) => String(a.studentId) === String(s._id));
              return (
                <div key={s._id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                  <span className="text-sm text-foreground">{s.name}</span>
                  <div className="flex gap-2">
                    <Button size="sm" className={`h-7 text-xs ${att?.present ? "bg-green-600" : "bg-muted text-muted-foreground"}`} onClick={() => handleMark(s._id, s.name, true)}>حضور</Button>
                    <Button size="sm" className={`h-7 text-xs ${att && !att.present ? "bg-red-600" : "bg-muted text-muted-foreground"}`} onClick={() => handleMark(s._id, s.name, false)}>غیاب</Button>
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
        <h2 className="text-xl font-bold text-foreground">دانشجویان من</h2>
        <p className="mt-1 text-sm text-muted-foreground">{performance.length} دانشجو در کلاس‌های شما</p>
      </div>
      {performance.length === 0 ? (
        <Card className="border-border bg-background">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">دانشجویی در کلاس‌های شما شرکت نکرده است.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {performance.map((s: any) => (
            <Card key={s.studentId} className="border-border bg-background">
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {(s.name ?? "?")[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.questions} سؤال · {s.messages} پیام · {s.attendance}/{s.totalRooms} حضور</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="w-full h-7 text-xs text-primary" onClick={() => setMsgTarget(s.studentId)}>
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
          <Textarea placeholder="متن پیام…" value={msgText} onChange={(e) => setMsgText(e.target.value)} className="border-border bg-muted text-foreground" />
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
        <h2 className="text-xl font-bold text-foreground">عملکرد دانشجویان</h2>
        <p className="mt-1 text-sm text-muted-foreground">بررسی عملکرد تحصیلی دانشجویان.</p>
      </div>
      <Card className="border-border bg-background">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <TrendingUp className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">بخش عملکرد به‌زودی فعال خواهد شد.</p>
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
        <h2 className="text-xl font-bold text-foreground">دانشجویان نیازمند توجه</h2>
        <p className="mt-1 text-sm text-muted-foreground">دانشجویانی که نیاز به توجه ویژه دارند.</p>
      </div>
      <Card className="border-border bg-background">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Target className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">بخش نیازمند توجه به‌زودی فعال خواهد شد.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── ارزیابی: تکالیف ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function HomeworkView() {
  const [showCreate, setShowCreate] = useState(false);
  const [mode, setMode] = useState<"manual" | "ai">("ai");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [busy, setBusy] = useState(false);
  const generateArticles = useAction(api.aiActions.generateArticles);

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) { toast.error("موضوع را وارد کنید"); return; }
    setGenerating(true);
    setGeneratedText("");
    try {
      const result = await generateArticles({
        prompt: aiPrompt,
        count: 1,
        category: "تکلیف",
      });
      setGeneratedText(result.articles?.[0]?.body ?? "محتوا تولید نشد");
      toast.success("تکلیف تولید شد");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); } finally { setGenerating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">تکالیف</h2>
          <p className="mt-1 text-sm text-muted-foreground">ایجاد و مدیریت تکالیف دانشجویان.</p>
        </div>
        <Button className="bg-primary/10 text-foreground hover:bg-primary/15" onClick={() => setShowCreate(true)}>
          <Plus className="ml-1.5 size-4" />ساخت تکلیف جدید
        </Button>
      </div>

      <Card className="border-border bg-background">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <FileText className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">تکالیف‌های ساخته‌شده در اینجا نمایش داده خواهند شد.</p>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ساخت تکلیف جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <Button size="sm" variant={mode === "ai" ? "default" : "outline"} onClick={() => setMode("ai")} className="text-xs">
                <Bot className="ml-1 size-3.5" />ساخت با هوش مصنوعی
              </Button>
              <Button size="sm" variant={mode === "manual" ? "default" : "outline"} onClick={() => setMode("manual")} className="text-xs">
                <PenTool className="ml-1 size-3.5" />ساخت دستی
              </Button>
            </div>
            <Input placeholder="عنوان تکلیف" value={title} onChange={(e) => setTitle(e.target.value)} />

            {mode === "ai" ? (
              <>
                <Textarea placeholder="موضوع و توضیح تکلیف (مثلاً: تکلیف درباره ساختار DNA و RNA)" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3} />
                <Button size="sm" onClick={handleAIGenerate} disabled={generating} className="bg-primary/10 text-primary hover:bg-primary/15">
                  {generating ? <Loader2 className="ml-1 size-3.5 animate-spin" /> : <Bot className="ml-1 size-3.5" />}
                  تولید تکلیف با هوش مصنوعی
                </Button>
                {generatedText && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs font-bold text-primary mb-2">پیش‌نمایش تکلیف تولیدشده:</p>
                    <Textarea value={generatedText} onChange={(e) => setGeneratedText(e.target.value)} rows={8} className="border-primary/30 bg-transparent text-xs text-muted-foreground" />
                  </div>
                )}
              </>
            ) : (
              <Textarea placeholder="متن تکلیف را بنویسید…" value={description} onChange={(e) => setDescription(e.target.value)} rows={8} />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setGeneratedText(""); }}>انصراف</Button>
              <Button size="sm" onClick={() => { toast.success("تکلیف ذخیره شد"); setShowCreate(false); setGeneratedText(""); }} disabled={busy || !title.trim()}>
                ذخیره تکلیف
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── ارزیابی: آزمون‌ها ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function ExamsView() {
  const exams = useQuery(api.admin.adminListExams) ?? [];
  const createExam = useMutation(api.admin.adminCreateExam);
  const deleteExam = useMutation(api.admin.adminDeleteExam);
  const togglePublish = useMutation(api.admin.adminToggleExamPublish);
  const generateQuestions = useAction(api.aiActions.generateQuestions);
  const addQuestion = useMutation(api.admin.adminCreateQuestion);

  const [showCreate, setShowCreate] = useState(false);
  const [mode, setMode] = useState<"manual" | "ai">("ai");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [count, setCount] = useState("5");
  const [difficulty, setDifficulty] = useState("2");
  const [aiPrompt, setAiPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");

  const categories = useQuery(api.content.listCategories) ?? [];

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) { toast.error("موضوع سؤال را وارد کنید"); return; }
    setGenerating(true);
    setGenerated([]);
    try {
      const result = await generateQuestions({
        prompt: aiPrompt,
        count: Number(count) || 5,
        difficulty: Number(difficulty) || 2,
      });
      setGenerated(result.questions ?? []);
      toast.success(`${result.questions?.length ?? 0} سؤال تولید شد`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا در تولید"); } finally { setGenerating(false); }
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("عنوان الزامی است"); return; }
    setBusy(true);
    try {
      if (mode === "ai" && generated.length > 0) {
        // Save generated questions to the question bank, then create exam
        for (const g of generated) {
          await addQuestion({
            text: g.text,
            options: g.options,
            correctIndex: g.correctIndex,
            explanation: g.explanation,
            topicId: (selectedTopic || categories[0]?._id) as any,
            difficulty: g.difficulty ?? Number(difficulty),
          });
        }
        // Create exam with these question IDs directly via adminCreateExam
        await createExam({
          title,
          description: description || "آزمون تولیدشده با هوش مصنوعی",
          durationMinutes: Number(duration) || 30,
          free: true,
          diagnostic: false,
          count: generated.length,
          published: false,
        });
      } else {
        await createExam({
          title,
          description,
          durationMinutes: Number(duration) || 30,
          free: true,
          diagnostic: false,
          count: Number(count) || 5,
          published: false,
        });
      }
      toast.success("آزمون ساخته شد");
      setShowCreate(false); setTitle(""); setDescription(""); setGenerated([]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">آزمون‌ها</h2>
          <p className="mt-1 text-sm text-muted-foreground">ایجاد و مدیریت آزمون‌ها.</p>
        </div>
        <Button className="bg-primary/10 text-foreground hover:bg-primary/15" onClick={() => setShowCreate(true)}>
          <Plus className="ml-1.5 size-4" />ساخت آزمون جدید
        </Button>
      </div>

      {/* Exam list */}
      {exams.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {exams.map((e: any) => (
            <Card key={e._id} className={`border-border ${e.published ? "bg-primary/5" : "bg-background"}`}>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-foreground text-sm">{e.title}</h3>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${e.published ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-400/30 bg-slate-400/10 text-muted-foreground"}`}>
                    {e.published ? "منتشر" : "پیش‌نویس"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{e.questionCount} سؤال · {e.durationMinutes} دقیقه</p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary hover:text-foreground" onClick={() => togglePublish({ id: e._id, published: !e.published })}>
                    {e.published ? "پیش‌نویس" : "انتشار"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive hover:text-destructive" onClick={() => { if (confirm("حذف شود؟")) deleteExam({ id: e._id }); }}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border bg-background">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Clock className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">هنوز آزمونی ساخته نشده است.</p>
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ساخت آزمون جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button size="sm" variant={mode === "ai" ? "default" : "outline"} onClick={() => setMode("ai")} className="text-xs">
                <Bot className="ml-1 size-3.5" />ساخت با هوش مصنوعی
              </Button>
              <Button size="sm" variant={mode === "manual" ? "default" : "outline"} onClick={() => setMode("manual")} className="text-xs">
                <PenTool className="ml-1 size-3.5" />ساخت دستی
              </Button>
            </div>
            <Input placeholder="عنوان آزمون" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input placeholder="توضیحات (اختیاری)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="مدت زمان (دقیقه)" value={duration} onChange={(e) => setDuration(e.target.value)} />
              <Input type="number" placeholder="تعداد سؤال" value={count} onChange={(e) => setCount(e.target.value)} />
            </div>

            {mode === "ai" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger><SelectValue placeholder="سطح دشواری" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">۱ — آسان</SelectItem>
                      <SelectItem value="2">۲ — متوسط</SelectItem>
                      <SelectItem value="3">۳ — سخت</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                    <SelectTrigger><SelectValue placeholder="موضوع (اختیاری)" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (<SelectItem key={c._id} value={c._id}>{c.title}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="موضوع یا توضیح سؤالات مورد نیاز (مثلاً: سؤالات میکروبیولوژی درباره باکتری‌های گرم مثبت)" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3} />
                <Button size="sm" onClick={handleAIGenerate} disabled={generating} className="bg-primary/10 text-primary hover:bg-primary/15">
                  {generating ? <Loader2 className="ml-1 size-3.5 animate-spin" /> : <Bot className="ml-1 size-3.5" />}
                  تولید سؤال با هوش مصنوعی
                </Button>
                {generated.length > 0 && (
                  <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs font-bold text-primary">{generated.length} سؤال تولید شد — پیش‌نمایش:</p>
                    {generated.slice(0, 3).map((q, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        <p className="font-medium">{i + 1}. {q.text}</p>
                        <p className="text-muted-foreground mt-0.5">پاسخ صحیح: {q.options[q.correctIndex]}</p>
                      </div>
                    ))}
                    {generated.length > 3 && <p className="text-[10px] text-muted-foreground">و {generated.length - 3} سؤال دیگر…</p>}
                  </div>
                )}
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setGenerated([]); }}>انصراف</Button>
              <Button size="sm" onClick={handleSave} disabled={busy}>
                {busy ? <Loader2 className="ml-1 size-3 animate-spin" /> : null}
                ذخیره آزمون
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
        <h2 className="text-xl font-bold text-foreground">نمرات</h2>
        <p className="mt-1 text-sm text-muted-foreground">مشاهده و مدیریت نمرات دانشجویان.</p>
      </div>
      <Card className="border-border bg-background">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Star className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">بخش نمرات به‌زودی فعال خواهد شد.</p>
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
        <h2 className="text-xl font-bold text-foreground">پرسش و پاسخ</h2>
        <p className="mt-1 text-sm text-muted-foreground">انتخاب کلاس برای مشاهده سؤالات دانشجویان.</p>
      </div>
      {!selectedRoom ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {liveRooms.length === 0 ? (
            <Card className="border-border bg-background">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <HelpCircle className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">کلاس فعالی وجود ندارد.</p>
              </CardContent>
            </Card>
          ) : (
            liveRooms.map((r) => (
              <button
                key={r._id}
                onClick={() => setSelectedRoom(r._id)}
                className="rounded-xl border border-primary/30 bg-card text-card-foreground p-4 text-right transition-all hover:border-primary/40 hover:bg-card"
              >
                <h3 className="font-bold text-foreground">{r.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{r.openQuestions} سؤال بی‌پاسخ</p>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setSelectedRoom(null)}>
            ← بازگشت به لیست کلاس‌ها
          </Button>
          {questions.length === 0 ? (
            <Card className="border-border bg-background">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <HelpCircle className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">سؤالی در این کلاس ثبت نشده است.</p>
              </CardContent>
            </Card>
          ) : (
            questions.map((q: any) => (
              <Card key={q._id} className={`border-border ${q.answer ? "bg-background" : "bg-amber-50"}`}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground">{q.text}</p>
                    {q.answer ? (
                      <span className="shrink-0 rounded-full bg-green-400/15 px-2 py-0.5 text-[10px] font-bold text-green-300">پاسخ داده شد</span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">بی‌پاسخ</span>
                    )}
                  </div>
                  {q.answer && <p className="rounded-lg bg-green-400/5 p-2 text-xs text-green-200">{q.answer}</p>}
                  {!q.answer && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="پاسخ…"
                        value={answers[q._id] ?? ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q._id]: e.target.value }))}
                        className="border-border bg-muted text-sm text-foreground"
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
        <h2 className="text-xl font-bold text-foreground">پیام‌ها</h2>
        <p className="mt-1 text-sm text-muted-foreground">ارتباط مستقیم با دانشجویان.</p>
      </div>
      {!selectedPartner ? (
        conversations.length === 0 ? (
          <Card className="border-border bg-background">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <MessageSquare className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">پیامی وجود ندارد.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversations.map((c: any) => (
              <button key={c.partnerId} onClick={() => setSelectedPartner(c.partnerId)} className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 text-right hover:border-primary/30">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{(c.partnerName ?? "?")[0]}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{c.partnerName}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.lastMessage}</p>
                </div>
                {c.unread > 0 && <span className="size-2 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setSelectedPartner(null)}>← بازگشت</Button>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {messages.map((m: any) => {
              const isMine = String(m.senderId) !== selectedPartner;
              return (
                <div key={m._id} className={`flex ${isMine ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] rounded-xl px-4 py-2 text-sm ${isMine ? "bg-primary/10 text-foreground" : "bg-muted text-foreground"}`}>
                    {m.text}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input placeholder="پیام…" value={newMsg} onChange={(e) => setNewMsg(e.target.value)} className="border-border bg-muted text-foreground" onKeyDown={(e) => e.key === "Enter" && handleSend()} />
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
        <h2 className="text-xl font-bold text-foreground">تحلیل و آمار</h2>
        <p className="mt-1 text-sm text-muted-foreground">آمار فعالیت کلاس‌ها و دانشجویان.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "کل کلاس‌ها", value: myRooms.length, color: "text-primary" },
          { label: "کلاس‌های فعال", value: liveRooms.length, color: "text-destructive" },
          { label: "دانشجویان", value: performance.length, color: "text-emerald-600" },
          { label: "کل پیام‌ها", value: totalMessages, color: "text-amber-600" },
        ].map((s) => (
          <Card key={s.label} className="border-border bg-background">
            <CardContent className="py-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {performance.length > 0 && (
        <Card className="border-border bg-background">
          <CardHeader><CardTitle className="text-sm text-foreground">فعال‌ترین دانشجویان</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {performance.sort((a: any, b: any) => (b.questions + b.messages) - (a.questions + a.messages)).slice(0, 5).map((s: any) => (
              <div key={s.studentId} className="flex items-center justify-between rounded-lg bg-background p-3">
                <span className="text-sm text-foreground">{s.name}</span>
                <span className="text-xs text-muted-foreground">{s.questions + s.messages} فعالیت</span>
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
        <h2 className="text-xl font-bold text-foreground">گزارش‌ها</h2>
        <p className="mt-1 text-sm text-muted-foreground">گزارش عملکرد کلاس‌ها و دانشجویان.</p>
      </div>
      <Card className="border-border bg-background">
        <CardHeader><CardTitle className="text-sm text-foreground">خلاصه کلاس‌ها</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {myRooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">کلاسی ثبت نشده است.</p>
          ) : myRooms.map((r) => (
            <div key={r._id} className="flex items-center justify-between rounded-lg bg-background p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.topic}</p>
              </div>
              <span className="text-xs text-muted-foreground">{r.messageCount} پیام</span>
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
  const { user } = useAuth();
  const conversations = useQuery(api.aiChat.listMyConversations, user ? {} : "skip") ?? [];
  const activeModels = useQuery(api.aiChat.listActiveModels, user ? {} : "skip") ?? [];
  const createConvo = useMutation(api.aiChat.createConversation);
  const sendMessageMut = useMutation(api.aiChat.sendMessage);
  const deleteConvo = useMutation(api.aiChat.deleteConversation);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(
    api.aiChat.getConversationMessages,
    selectedConvo ? { conversationId: selectedConvo as any } : "skip"
  );

  useEffect(() => {
    if (!selectedModelId && activeModels.length === 1) setSelectedModelId(activeModels[0]._id);
  }, [activeModels, selectedModelId]);

  // Clicking the active model again switches back to the default model.
  // Persisted on the open conversation so the NEXT message uses it.
  const setConvoModel = useMutation(api.aiChat.setConversationModel);
  const handleModelSelect = (modelId: string) => {
    setSelectedModelId((prev: string | null) => (prev === modelId ? null : modelId));
    if (selectedConvo) {
      setConvoModel({ conversationId: selectedConvo as any, modelId: modelId as any })
        .catch((e) => toast.error(e instanceof Error ? e.message : "خطا در تغییر مدل"));
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reflect the conversation's saved model in the picker when switching chats
  useEffect(() => {
    const doc = (conversations as any[]).find((c: any) => c._id === selectedConvo);
    if (doc) setSelectedModelId(doc.modelId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConvo]);

  const handleNewChat = async () => {
    try {
      const id = await createConvo({ title: "چت جدید", modelId: selectedModelId ?? undefined });
      setSelectedConvo(id as string);
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedConvo || isSending) return;
    const content = input.trim();
    setInput("");
    setIsSending(true);
    try {
      await sendMessageMut({ conversationId: selectedConvo as any, content });
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); } finally { setIsSending(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">دستیار هوشمند</h2>
        <p className="mt-1 text-sm text-muted-foreground">چت مستقیم با هوش مصنوعی برای تولید محتوا و پاسخ به سؤالات.</p>
      </div>

      <div className="flex gap-3" style={{ height: "calc(100vh - 260px)", minHeight: "400px" }}>
        {/* Sidebar — conversations */}
        <div className="hidden w-52 shrink-0 flex-col gap-2 rounded-xl border border-border bg-card p-3 md:flex">
          <Button size="sm" className="w-full bg-primary/10 text-foreground hover:bg-primary/15" onClick={handleNewChat}>
            <Plus className="ml-1 size-3.5" />چت جدید
          </Button>
          <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
            {conversations.map((c: any) => (
              <button
                key={c._id}
                onClick={() => { setSelectedConvo(c._id); }}
                className={`flex w-full items-center justify-between gap-1 rounded-lg px-2.5 py-2 text-right text-xs transition-colors ${selectedConvo === c._id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <span className="truncate">{c.title}</span>
                <button
                  className="shrink-0 text-destructive/50 hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); if (confirm("حذف شود؟")) deleteConvo({ conversationId: c._id }); }}
                >
                  <X className="size-3" />
                </button>
              </button>
            ))}
            {conversations.length === 0 && <p className="py-8 text-center text-[11px] text-muted-foreground">چتی وجود ندارد</p>}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex flex-1 flex-col rounded-xl border border-border bg-card">
          {/* Mobile conversation picker */}
          {!selectedConvo && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center md:hidden">
              <Bot className="size-10 text-primary/60" />
              <p className="text-sm text-muted-foreground">یک چت جدید بسازید یا چت قبلی را انتخاب کنید.</p>
              <Button size="sm" className="bg-primary/10 text-foreground hover:bg-primary/15" onClick={handleNewChat}>
                <Plus className="ml-1 size-3.5" />چت جدید
              </Button>
            </div>
          )}

          {!selectedConvo ? null : (
            <>
              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {(messages ?? []).map((m: any) => (
                  <div key={m._id} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-muted text-foreground" : "bg-primary/10 text-foreground"}`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      {m.role === "assistant" && (
                        <div className="mt-2 flex gap-1">
                          <button className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => { navigator.clipboard.writeText(m.content); toast.success("کپی شد"); }}>
                            کپی
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-end">
                    <div className="rounded-xl bg-primary/10 px-4 py-2.5 text-sm text-foreground">
                      <span className="animate-pulse">در حال پاسخ‌گویی…</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Model picker — same models as the main AI chat */}
              {activeModels.length > 0 && (
                <div className="border-t border-border px-4 pt-2">
                  <div className="flex items-center gap-1.5 flex-wrap pb-1">
                    <span className="text-[10px] text-muted-foreground">مدل:</span>
                    {activeModels.map((m: any) => (
                      <button
                        key={m._id}
                        onClick={() => handleModelSelect(m._id)}
                        title={selectedModelId === m._id ? "برای بازگشت به مدل پیشفرض دوباره کلیک کنید" : undefined}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          selectedModelId === m._id
                            ? "bg-primary/25 text-foreground ring-1 ring-cyan-400/40"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {m.name}
                        {m.isFree && <span className="mr-1 text-[9px] opacity-70">رایگان</span>}
                      </button>
                    ))}
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                      {selectedModelId ? "فعال" : "مدل پیشفرض فعال"}
                    </span>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="border-t border-border p-3">
                <div className="flex gap-2">
                  <Input
                    ref={null}
                    placeholder="پیام خود را بنویسید…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="border-border bg-muted text-sm text-foreground"
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    disabled={isSending}
                  />
                  <Button size="sm" onClick={handleSend} disabled={isSending || !input.trim()} className="shrink-0 bg-primary/10 text-foreground hover:bg-primary/15">
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
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
  const [immediate, setImmediate] = useState(false);
  const createRoom = useMutation(api.collab.createRoom);
  const setRoomStatus = useMutation(api.collab.setRoomStatus);
  const deleteRoom = useMutation(api.collab.deleteRoom);
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
      await requestClass({ title, topic, description, proposedDate: immediate ? "" : (proposedDate || new Date().toISOString().slice(0, 10)), immediate });
      toast.success("درخواست کلاس برای مدیر ارسال شد");
      setShowRequest(false);
      setTitle(""); setTopic(""); setDescription(""); setProposedDate(""); setImmediate(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ارسال درخواست");
    }
  }

  async function handleDeletePast(roomId: string) {
    if (!confirm("آیا از حذف این کلاس مطمئنید؟ این عمل قابل بازگشت نیست.")) return;
    try {
      await deleteRoom({ roomId: roomId as any });
      toast.success("کلاس حذف شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در حذف");
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
          <h2 className="text-xl font-bold text-foreground">کلاس‌های زنده</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {liveFiltered.length} کلاس{hideOthers ? " خودم" : ""} در حال برگزاری
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 rounded-lg text-xs ${hideOthers ? "text-muted-foreground" : "text-primary"}`}
            onClick={() => setHideOthers((s) => !s)}
          >
            {hideOthers ? "نمایش همه" : "فقط خودم"}
          </Button>
          <Button
            className="border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15"
            onClick={() => { setShowCreate(false); setShowRequest((s) => !s); }}
          >
            <Send className="size-4" />
            درخواست کلاس
          </Button>
          <Button
            className="border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15"
            onClick={() => { setShowRequest(false); setShowCreate((s) => !s); }}
          >
            <Plus className="size-4" />
            کلاس جدید
          </Button>
        </div>
      </div>

      {/* ── Create form (direct) ── */}
      {showCreate && (
        <Card className="border-primary/30 bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="text-sm text-foreground">ایجاد کلاس زنده</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="عنوان کلاس" value={title} onChange={(e) => setTitle(e.target.value)} className="border-border bg-muted text-foreground placeholder:text-muted-foreground" />
            <Input placeholder="موضوع" value={topic} onChange={(e) => setTopic(e.target.value)} className="border-border bg-muted text-foreground placeholder:text-muted-foreground" />
            <Textarea placeholder="توضیح…" value={description} onChange={(e) => setDescription(e.target.value)} className="border-border bg-muted text-foreground placeholder:text-muted-foreground" />
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
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-sm text-amber-600">درخواست تشکیل کلاس</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">درخواست شما برای مدیر سایت ارسال می‌شود.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="عنوان کلاس" value={title} onChange={(e) => setTitle(e.target.value)} className="border-border bg-muted text-foreground placeholder:text-muted-foreground" />
            <Input placeholder="موضوع" value={topic} onChange={(e) => setTopic(e.target.value)} className="border-border bg-muted text-foreground placeholder:text-muted-foreground" />
            <Textarea placeholder="توضیح…" value={description} onChange={(e) => setDescription(e.target.value)} className="border-border bg-muted text-foreground placeholder:text-muted-foreground" />
            <JalaliDatePicker value={immediate ? "" : proposedDate} onChange={setProposedDate} placeholder="تاریخ پیشنهادی" className="w-full" />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={immediate} onChange={(e) => setImmediate(e.target.checked)} className="size-4 rounded border-border accent-primary" />
              <span>فوری — بدون زمان مشخص ارسال شود</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowRequest(false); setImmediate(false); }}>انصراف</Button>
              <Button size="sm" onClick={handleRequestClass}>
                <Send className="size-4" /> ارسال درخواست
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {liveFiltered.length === 0 && !showCreate && !showRequest && (
        <Card className="border-border bg-background">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Video className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {hideOthers ? "کلاس فعالی از شما وجود ندارد." : "کلاسی در حال برگزاری نیست."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {liveFiltered.map((room) => (
          <RoomCard key={room._id} room={room} onOpen={onOpen} user={user} isOwner={room.instructorId === user?._id} isAdmin={isAdminOrManager} />
        ))}
      </div>

      {/* Pending requests */}
      {myPending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader><CardTitle className="text-sm text-amber-600">درخواست‌های در انتظار</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myPending.map((r: any) => (
              <div key={r._id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-card p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">تاریخ پیشنهادی: {r.proposedDate ? formatJalaliFull(r.proposedDate) : "—"}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600">در انتظار</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            کلاس‌های گذشته ({past.length})
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {past.map((room) => (
              <RoomCard key={room._id} room={room} onOpen={onOpen} user={user} isOwner={room.instructorId === user?._id} isAdmin={isAdminOrManager} isPast onDelete={isAdminOrManager || (room.instructorId === user?._id) ? () => handleDeletePast(room._id) : undefined} />
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
            ? "border-border bg-background hover:border-border hover:bg-background"
            : "border-primary/30 bg-card text-card-foreground hover:border-primary/40 hover:bg-card"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {isLive ? (
            <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
              <CircleDot className="size-2.5 animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              پایان‌یافته
            </span>
          )}
          <span className="font-mono text-[10px] text-muted-foreground">
            {room.messageCount} پیام
          </span>
        </div>
        <h3 className="mt-3 break-words font-bold text-foreground group-hover:text-foreground">{room.title}</h3>
        <p className="mt-1 break-words text-xs text-muted-foreground">{room.topic}</p>

        {showCountdown && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2">
            <Clock className="size-3.5 text-destructive animate-pulse" />
            <span className="font-mono text-xs font-bold text-destructive">
              {toPersianDigits(remainingMin)}:{toPersianDigits(String(remainingSec).padStart(2, "0"))}
            </span>
            <span className="text-[10px] text-destructive/70">تا پایان</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            <BookUser className="size-3.5 shrink-0 text-primary/70" />
            <span className="truncate">{room.instructorName}</span>
          </span>
          {isLive && (
            <span className="flex shrink-0 items-center gap-1.5">
              <HelpCircle className="size-3.5 text-amber-600" />
              {room.openQuestions} سؤال
            </span>
          )}
        </div>

        {isOwner && isLive && (
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
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
              className="h-7 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
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

  // Voice request management
  const voiceRequests = useQuery(api.collab.listVoiceRequests, { roomId: roomId as any });
  const approveSpeaker = useMutation(api.collab.approveSpeaker);
  const removeSpeaker = useMutation(api.collab.removeSpeaker);

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

  // Cleanup recorder on unmount
  useEffect(() => {
    return () => { voiceRecorder.reset(); };
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
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
            <X className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{room?.title ?? detail?.title}</h2>
              {isLive && (
                <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                  <CircleDot className="size-2.5 animate-pulse" />
                  LIVE
                </span>
              )}
              {isLive && <ClassTimer startMs={detail?.createdAt} running />}
            </div>
            <p className="text-xs text-muted-foreground">
              {room?.topic ?? detail?.topic} ·{" "}
              <span className="text-primary/70">مدرس: {room?.instructorName ?? detail?.instructorName}</span>
            </p>
          </div>
        </div>
        {isLive && (
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={handleEnd}
          >
            <DoorOpen className="size-4" />
            پایان کلاس
          </Button>
        )}
      </div>

      {/* Sub-tabs: live / board / chat */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-background p-1">
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
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "live" && (
        <>
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
        {/* Voice request management for instructor */}
        {isLive && voiceRequests && (
          <Card className="border-emerald-200 bg-card text-card-foreground mt-3">
            <CardContent className="space-y-3 py-4">
              <div className="flex items-center gap-2">
                <Mic className="size-4 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-700">مدیریت صدا</p>
                {(voiceRequests.speakers?.length ?? 0) > 0 && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                    {(voiceRequests.speakers?.length ?? 0)} فعال
                  </span>
                )}
                {(voiceRequests.requests?.length ?? 0) > 0 && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                    {(voiceRequests.requests?.length ?? 0)} درخواست
                  </span>
                )}
              </div>
              {/* Pending requests */}
              {(voiceRequests.requests?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">درخواست‌های صحبت</p>
                  {voiceRequests.requests!.map((req) => (
                    <div key={req.userId} className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <span className="text-xs font-bold text-foreground">{req.name}</span>
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 text-[10px] bg-emerald-500 hover:bg-emerald-500" onClick={async () => {
                          try {
                            await approveSpeaker({ roomId: roomId as any, userId: req.userId as any });
                            toast.success(req.name + ' فعال شد');
                          } catch (e) { toast.error(e instanceof Error ? e.message : 'خطا'); }
                        }}>
                          <CheckCircle2 className="ml-1 size-3" /> تأیید
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10" onClick={async () => {
                          try {
                            // Lower the request hand
                            await answerQuestion({ messageId: req.requestId as any, answer: 'denied' });
                            toast.info('درخواست رد شد');
                          } catch (e) { toast.error(e instanceof Error ? e.message : 'خطا'); }
                        }}>
                          رد
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Active speakers */}
              {(voiceRequests.speakers?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">گویندگان فعال</p>
                  {voiceRequests.speakers!.map((sp: { userId: string; name: string }) => (
                    <div key={sp.userId} className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                        {sp.name}
                      </span>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive hover:text-destructive" onClick={async () => {
                        try {
                          await removeSpeaker({ roomId: roomId as any, userId: sp.userId as any });
                          toast.info('گوینده غیرفعال شد');
                        } catch (e) { toast.error(e instanceof Error ? e.message : 'خطا'); }
                      }}>
                        قطع صدا
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {(voiceRequests.requests?.length ?? 0) === 0 && (voiceRequests.speakers?.length ?? 0) === 0 && (
                <p className="text-xs text-muted-foreground">دانشجویان می‌توانند درخواست صحبت بدهند.</p>
              )}
            </CardContent>
          </Card>
        )}
        </>
      )}

      {subTab === "board" && (
        <div className="space-y-3">
          <BoardSection
            isLive={isLive}
            roomId={roomId}
            strokes={boardStrokes}
            boardBg={detail?.boardBg ?? "#0f172a"}
            addStroke={addStroke}
            clearStrokes={clearStrokes}
            setBoardBg={setBoardBg}
          />
          <WhiteboardFilePanel roomId={roomId} isInstructor />
        </div>
      )}

      {/* Student messages / questions pop up for ten seconds */}
      {(detail?.messages ?? []).length > 0 && (
        <LiveActivityToasts
          messages={(detail?.messages ?? []) as any}
          onOpen={() => setSubTab("chat")}
        />
      )}

      {subTab === "chat" && (
        <>
      {/* Chat stream */}
      <Card className="border-border bg-card text-card-foreground">
        <CardContent className="max-h-[52vh] space-y-3 overflow-y-auto py-4">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              هنوز پیامی نیست. از دانشجویان بخواهید سؤال بپرسند.
            </p>
          )}
          {messages.filter((m) => !m.text.startsWith("__voice_request__") && !m.text.startsWith("__hand__")).map((m) => {
            const isQuestion = m.type === "question";
            const answered = !!m.answer;
            return (
              <div
                key={m._id}
                className={`rounded-lg border p-3 ${
                  isQuestion
                    ? answered
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-amber-200 bg-amber-50"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isQuestion ? (
                    <HelpCircle className="size-4 text-amber-600" />
                  ) : (
                    <MessageSquare className="size-4 text-primary" />
                  )}
                  <span className="text-xs font-bold text-foreground">{m.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {m.role === "instructor" ? "مدرس" : "دانشجو"}
                  </span>
                  <span className="mr-auto font-mono text-[10px] text-muted-foreground">
                    {new Date(m.createdAt).toLocaleTimeString("fa-IR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{m.text}</p>

                {m.attachmentType === "image" && m.attachmentUrl && (
                  <img
                    src={m.attachmentUrl}
                    alt={m.attachmentName ?? "تصویر"}
                    className="mt-2 max-h-64 rounded-lg border border-border"
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
                    className="mt-2 flex max-w-sm items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
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

                {isQuestion && !answered && isLive && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      placeholder="پاسخ مدرس…"
                      value={answers[m._id] ?? ""}
                      onChange={(e) =>
                        setAnswers((a) => ({ ...a, [m._id]: e.target.value }))
                      }
                      className="h-8 border-amber-200 bg-muted text-sm text-foreground placeholder:text-muted-foreground"
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
                  <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <CheckCircle2 className="size-3.5" />
                      پاسخ مدرس
                    </p>
                    <p className="mt-1 text-sm text-emerald-700/90">{m.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Voice preview — after recording stops */}
      {voiceRecorder.previewBlob && voiceRecorder.state === "IDLE" && (
        <Card className="border-primary/30 bg-card text-card-foreground">
          <CardContent className="flex items-center gap-3 py-3">
            <Play className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground">پیش‌گوشی پیام صوتی</p>
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
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => voiceRecorder.discard()}>
                <Trash2 className="size-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Composer */}
      {isLive && (
        <Card className="border-border bg-card text-card-foreground">
          <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
            {voiceRecorder.state === "RECORDING" && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-[11px] font-bold text-destructive">
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
            <div className="flex shrink-0 gap-1 rounded-lg border border-border bg-muted p-1">
              <button
                onClick={() => setAsQuestion(true)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  asQuestion ? "bg-amber-50 text-amber-600" : "text-muted-foreground"
                }`}
              >
                سؤال
              </button>
              <button
                onClick={() => setAsQuestion(false)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  !asQuestion ? "bg-primary/15 text-foreground" : "text-muted-foreground"
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
              className="flex-1 border-border bg-muted text-foreground placeholder:text-muted-foreground"
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
                className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
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
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : voiceRecorder.state === "STOPPING"
                      ? "border-amber-200 bg-amber-50 text-amber-600"
                      : "border-border bg-muted text-muted-foreground hover:bg-muted"
                }`}
              >
                {voiceRecorder.state === "RECORDING" ? <Square className="size-3.5" /> : <Mic className="size-4" />}
              </button>
            </div>
            <Button size="sm" onClick={handleSend} disabled={sending || uploading || voiceRecorder.state === "RECORDING"}>
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

// ── Student list in a live room ─────────────────────────────────────────────
function RoomStudentList({ roomId }: { roomId: string }) {
  const participants = useQuery(api.collab.listRoomParticipants, { roomId: roomId as any }) ?? [];
  const students = participants.filter((p) => p.role === "user" || p.role === "member");

  return (
    <Card className="border-border bg-background">
      <CardContent className="py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-muted-foreground">دانشجویان حاضر ({students.length})</p>
        </div>
        {students.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">هنوز دانشجویی وارد کلاس نشده است.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {students.map((s) => (
              <div key={s.userId} className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1">
                <span className={`size-1.5 rounded-full ${s.isRecent ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className="text-[11px] text-muted-foreground">{s.name}</span>
                <Mic className="size-3 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
    <Card className="border-primary/30 bg-card text-card-foreground">
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Video className="size-4" />
              پخش زنده برای دانشجویان
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
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
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
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
                  className="border-primary/30 text-foreground hover:bg-primary/10"
                  onClick={() => void broadcast.start(true)}
                  disabled={broadcast.status === "starting"}
                >
                  <Camera className="size-3.5" />
                  صدا + دوربین
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary/30 text-foreground hover:bg-primary/10"
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
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {broadcast.error}
          </p>
        )}
        {/* Student list in room */}
        <RoomStudentList roomId={roomId} />

        {(broadcast.status === "live" || broadcast.localStream) && (
          <div className="relative w-full">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full rounded-lg border border-primary/30 bg-black"
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
                <div className="absolute bottom-2 left-1/2 flex max-w-[94%] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-border bg-black/75 px-2 py-1.5 backdrop-blur">
                  <button
                    onClick={() => setAnnoTool("pen")}
                    title="قلم"
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      annoTool === "pen" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Brush className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setAnnoTool("highlighter")}
                    title="هایلایت"
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      annoTool === "highlighter" ? "bg-muted text-yellow-300" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Highlighter className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setAnnoTool("eraser")}
                    title="پاک‌کن"
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      annoTool === "eraser" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Eraser className="size-3.5" />
                  </button>
                  <span className="mx-1 h-4 w-px shrink-0 bg-muted" />
                  {ANNO_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAnnoColor(c)}
                      title={c}
                      className={`size-5 shrink-0 rounded-full border transition-transform ${
                        annoColor === c ? "scale-110 border-white" : "border-border hover:scale-105"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                  <span className="mx-1 h-4 w-px shrink-0 bg-muted" />
                  <button
                    onClick={() => void clearStrokes({ roomId: roomId as any, layer: "screen" })}
                    title="پاک کردن همهٔ علامت‌ها"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive/10"
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
    <Card className="border-primary/30 bg-card text-card-foreground">
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Presentation className="size-4" />
              تختهٔ کلاس
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              رنگ زمینه و نوشته را عوض کنید و آزادانه بکشید — دانشجویان همین لحظه می‌بینند.
            </p>
          </div>
          {isLive && (
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
              <button
                onClick={() => setPenTool("pen")}
                title="قلم"
                className={`flex size-8 items-center justify-center rounded-md transition-colors ${
                  penTool === "pen" ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Brush className="size-4" />
              </button>
              <button
                onClick={() => setPenTool("highlighter")}
                title="هایلایت"
                className={`flex size-8 items-center justify-center rounded-md transition-colors ${
                  penTool === "highlighter" ? "bg-yellow-400/20 text-yellow-300" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Highlighter className="size-4" />
              </button>
              <button
                onClick={() => setPenTool("eraser")}
                title="پاک‌کن"
                className={`flex size-8 items-center justify-center rounded-md transition-colors ${
                  penTool === "eraser" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Eraser className="size-4" />
              </button>
              <span className="mx-1 h-4 w-px bg-muted" />
              <button
                onClick={() => void clearStrokes({ roomId: roomId as any, layer: "board" })}
                title="پاک کردن تخته"
                className="flex size-8 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          )}
        </div>

        {isLive && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground">زمینه:</span>
              {BOARD_BGS.map((b) => (
                <button
                  key={b.value}
                  title={b.label}
                  onClick={() => void setBoardBg({ roomId: roomId as any, bg: b.value })}
                  className={`size-6 rounded-full border transition-transform hover:scale-110 ${
                    boardBg === b.value ? "border-primary/40 ring-2 ring-cyan-400/40" : "border-border"
                  }`}
                  style={{ background: b.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground">رنگ قلم:</span>
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  title={c}
                  className={`size-6 rounded-full border transition-transform hover:scale-110 ${
                    penColor === c ? "scale-110 border-primary/40 ring-2 ring-cyan-400/40" : "border-border"
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
        <p className="text-[11px] text-muted-foreground">
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
        <h2 className="text-xl font-bold text-foreground">دانشجویان آنلاین</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {students.length} نفر همین حالا در پلتفرم فعال‌اند (بروزرسانی هر ۶۰ ثانیه).
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((s) => (
          <Card key={s.userId} className="border-border bg-card text-card-foreground">
            <CardContent className="flex items-center gap-3 py-4">
              <span className="relative flex size-10 items-center justify-center rounded-full bg-primary/10 font-bold text-foreground">
                {(s.name ?? "؟").slice(0, 1)}
                <span className="absolute -bottom-0.5 -left-0.5 size-3 rounded-full border-2 border-[#0b1a2a] bg-emerald-500" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{s.name}</p>
                <p className="text-[11px] text-muted-foreground">{s.location ?? "در حال گشت‌وگذار"}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {students.length === 0 && (
        <Card className="border-border bg-background">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">الان کسی آنلاین نیست.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Course studio: design a course, send it to the site admin ──────────────
const STUDIO_STATUS: Record<string, { label: string; cls: string }> = {
  published: { label: "منتشرشده", cls: "border-emerald-200 bg-emerald-50 text-emerald-600" },
  approved: { label: "تأیید شده", cls: "border-primary/30 bg-primary/10 text-primary" },
  pending: { label: "در انتظار تأیید", cls: "border-amber-200 bg-amber-50 text-amber-600" },
  draft: { label: "پیش‌نویس", cls: "border-slate-400/20 bg-slate-400/10 text-muted-foreground" },
  rejected: { label: "رد شده", cls: "border-destructive/30 bg-destructive/10 text-destructive" },
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
  const [activeSection, setActiveSection] = useState<"basic" | "detail" | "packages" | "content">("basic");

  // AI course generation  
  const [aiDialog, setAiDialog] = useState(false);
  const [aiSkill, setAiSkill] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const generateCourseDesign = useAction(api.aiActions.generateCourseDesign);

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

  const handleAIGenerate = async () => {
    if (!aiSkill.trim()) { toast.error("موضوع/مهارت را وارد کنید"); return; }
    setAiGenerating(true);
    try {
      const result = await generateCourseDesign({ skill: aiSkill });
      setAiResult(result.course);
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); } finally { setAiGenerating(false); }
  };

  const handleAIApply = () => {
    if (!aiResult) return;
    const ppEco = aiResult.pkgEconomy ?? 0;
    const ppBas = aiResult.pkgBasic ?? 0;
    const ppPlu = aiResult.pkgPlus ?? 0;
    const ppPre = aiResult.pkgPremium ?? 0;
    setForm({
      ...emptyForm,
      title: aiResult.title ?? "",
      summary: aiResult.summary ?? "",
      description: aiResult.description ?? "",
      price: String(ppBas || ppEco || 0),
      audienceText: (aiResult.audience ?? []).join("\n"),
      prerequisitesText: (aiResult.prerequisites ?? []).join("\n"),
      syllabusItems: (aiResult.syllabus ?? []).map((s: any) => `${s.title} | ${s.durationMin} | ${s.free ? 'رایگان' : 'پولی'}`).join("\n"),
      pkgEconomy: String(ppEco),
      pkgBasic: String(ppBas),
      pkgPlus: String(ppPlu),
      pkgPremium: String(ppPre),
      pkgEconomyFeatures: (aiResult.pkgEconomyFeatures ?? []).join("\n"),
      pkgBasicFeatures: (aiResult.pkgBasicFeatures ?? []).join("\n"),
      pkgPlusFeatures: (aiResult.pkgPlusFeatures ?? []).join("\n"),
      pkgPremiumFeatures: (aiResult.pkgPremiumFeatures ?? []).join("\n"),
    });
    setAiDialog(false);
    setActiveSection("basic");
    setDialog({ mode: "create" });
    toast.success("فرم با اطلاعات AI پر شد — بررسی و ویرایش کنید");
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
          <h2 className="text-xl font-bold text-foreground">طراحی دوره</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            دوره را طراحی کنید و برای تأیید به مدیر سایت بفرستید؛ پس از تأیید، در سایت منتشر می‌شود.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-primary/10 text-primary hover:bg-primary/15" onClick={() => { setAiDialog(true); setAiSkill(""); setAiGenerating(false); setAiResult(null); }}>
            <Bot className="ml-1.5 size-4" />
            ساخت با هوش مصنوعی
          </Button>
          <Button className="border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15" onClick={openCreate}>
            <Plus className="size-4" />
            دورهٔ جدید
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {courses.map((c) => {
          const st = STUDIO_STATUS[c.status] ?? STUDIO_STATUS.draft;
          const editable = c.status === "draft" || c.status === "rejected";
          return (
            <Card key={c._id} className="border-border bg-card text-card-foreground">
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 break-words font-bold text-foreground">{c.title}</h3>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {c.categoryName ?? "—"} · {c.studentsCount ?? 0} دانشجو · {c.syllabusCount ?? 0} جلسه
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {editable && (
                      <Button variant="outline" size="sm" className="border-border bg-muted text-foreground hover:bg-muted" onClick={() => openEdit(c)}>
                        ویرایش
                      </Button>
                    )}
                    {editable && (
                      <Button
                        size="sm"
                        disabled={submittingId === c._id}
                        className="bg-primary text-foreground hover:bg-primary"
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
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => remove({ courseId: c._id })}
                        title="حذف دوره"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {c.summary && <p className="break-words text-sm text-muted-foreground">{c.summary}</p>}
                {c.reviewNote && (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    دلیل بازگشت از مدیر سایت: {c.reviewNote}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
        {courses.length === 0 && (
          <Card className="border-border bg-background">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <BookOpen className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                هنوز دوره‌ای طراحی نکرده‌اید. با «دورهٔ جدید» شروع کنید — پیش‌نویس فقط برای شما قابل مشاهده است.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* AI skill input — inline card */}
      {aiDialog && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-primary">
              <Bot className="size-5 text-primary" />ساخت دوره با هوش مصنوعی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">موضوع یا مهارتی که می‌خواهید تدریس کنید را توضیح دهید. هوش مصنوعی عنوان، توضیحات، سرفصل‌ها و قیمت‌ها را به صورت خودکار تولید می‌کند.</p>
            <Textarea
              placeholder="مثلاً: میکروبیولوژی پیشرفته — تکنیک‌های کشت و شناسایی باکتری‌ها"
              value={aiSkill}
              onChange={(e) => setAiSkill(e.target.value)}
              rows={4}
              className="border-primary/30 bg-muted text-foreground"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAiDialog(false)}>انصراف</Button>
              <Button size="sm" onClick={handleAIGenerate} disabled={aiGenerating || !aiSkill.trim()} className="bg-primary/10 text-primary hover:bg-primary/15">
                {aiGenerating ? <Loader2 className="ml-1 size-3.5 animate-spin" /> : <Bot className="ml-1 size-3.5" />}
                {aiGenerating ? "در حال تولید..." : "تولید دوره"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI result preview — inline card */}
      {aiResult && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-primary">
              <Bot className="size-5 text-primary" />پیش‌نمایش دوره تولیدشده
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase">عنوان</p>
                  <p className="text-sm font-bold text-foreground">{aiResult.title}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase">خلاصه</p>
                  <p className="text-xs text-muted-foreground">{aiResult.summary}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase">سرفصل‌ها</p>
                  {(aiResult.syllabus ?? []).map((s: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">• {s.title} ({s.durationMin} دقیقه){s.free ? " — رایگان" : ""}</p>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded bg-muted p-2">
                    <p className="text-[10px] text-muted-foreground">اقتصادی</p>
                    <p className="text-xs font-bold text-foreground">{formatPriceNumber(aiResult.pkgEconomy ?? 0)} تومان</p>
                  </div>
                  <div className="rounded bg-muted p-2">
                    <p className="text-[10px] text-muted-foreground">پایه</p>
                    <p className="text-xs font-bold text-foreground">{formatPriceNumber(aiResult.pkgBasic ?? 0)} تومان</p>
                  </div>
                  <div className="rounded bg-muted p-2">
                    <p className="text-[10px] text-muted-foreground">پلاس</p>
                    <p className="text-xs font-bold text-foreground">{formatPriceNumber(aiResult.pkgPlus ?? 0)} تومان</p>
                  </div>
                  <div className="rounded bg-muted p-2">
                    <p className="text-[10px] text-muted-foreground">پرمیوم</p>
                    <p className="text-xs font-bold text-foreground">{formatPriceNumber(aiResult.pkgPremium ?? 0)} تومان</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAiResult(null)}>انصراف</Button>
                <Button size="sm" onClick={handleAIApply} className="bg-primary/10 text-primary hover:bg-primary/15">
                  <Bot className="ml-1 size-3.5" />اعمال و ویرایش
                </Button>
              </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "ویرایش دوره" : "طراحی دورهٔ جدید"}</DialogTitle>
            <DialogDescription>
              ابتدا به‌صورت پیش‌نویس ذخیره می‌شود؛ بعد از تکمیل، «ارسال برای بررسی» را بزنید تا مدیر سایت تأیید یا بازگرداند.
            </DialogDescription>
          </DialogHeader>
          {/* Section tabs */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {([
              { key: "basic" as const, label: "اطلاعات پایه" },
              { key: "detail" as const, label: "جزئیات دوره" },
              { key: "packages" as const, label: "پکیج‌ها و قیمت" },
              ...(dialog?.mode === "edit" ? [{ key: "content" as const, label: "محتوای جلسات" }] : []),
            ]).map((s) => (
              <button key={s.key} onClick={() => setActiveSection(s.key)} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${activeSection === s.key ? "bg-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{s.label}</button>
            ))}
          </div>
          <div className="space-y-3">
            {activeSection === "basic" && (
              <>
                <Input placeholder="عنوان دوره" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border-border bg-muted text-foreground placeholder:text-muted-foreground" />
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">دستهٔ دوره</label>
                  <CategoryField value={form.categoryId || undefined} onValueChange={(v) => setForm({ ...form, categoryId: v })} />
                </div>
                <Input placeholder="خلاصهٔ دوره" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="border-border bg-muted text-foreground placeholder:text-muted-foreground" />
                <Textarea placeholder="توضیحات کامل دوره…" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border-border bg-muted text-foreground placeholder:text-muted-foreground" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input placeholder="قیمت (تومان)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border-border bg-muted text-foreground placeholder:text-muted-foreground" />
                  <Input placeholder="مدت دوره" value={form.durationText} onChange={(e) => setForm({ ...form, durationText: e.target.value })} className="border-border bg-muted text-foreground placeholder:text-muted-foreground" />
                  <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                    <SelectTrigger className="border-border bg-muted text-foreground"><SelectValue placeholder="نوع دوره" /></SelectTrigger>
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
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">مناسب چه کسانی است؟ (هر خط یک آیتم)</label>
                  <Textarea placeholder="دانشجویان میکروبیولوژی سال آخر\nعلاقه‌مندان به ژنتیک مولکولی" rows={3} value={form.audienceText} onChange={(e) => setForm({ ...form, audienceText: e.target.value })} className="border-border bg-muted text-foreground placeholder:text-muted-foreground" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">پیش‌نیازها (هر خط یک آیتم)</label>
                  <Textarea placeholder="زیست‌شناسی پایه\nآشنایی با شیمی آلی" rows={3} value={form.prerequisitesText} onChange={(e) => setForm({ ...form, prerequisitesText: e.target.value })} className="border-border bg-muted text-foreground placeholder:text-muted-foreground" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">سرفصل‌ها (هر خط: عنوان | دقیقه | رایگان/پولی)</label>
                  <Textarea placeholder="مقدمه و معرفی | 30 | رایگان\nسلول و اجزای آن | 60 | پولی\nتکثیر DNA | 45 | پولی" rows={5} value={form.syllabusItems} onChange={(e) => setForm({ ...form, syllabusItems: e.target.value })} className="border-border bg-muted font-mono text-xs text-foreground placeholder:text-muted-foreground" />
                </div>
              </>
            )}
            {activeSection === "packages" && (
              <>
                <p className="text-xs text-muted-foreground">قیمت هر پکیج و امکانات آن را تنظیم کنید. پکیج‌هایی که قیمت ندارند در سایت نمایش داده نمی‌شوند.</p>
                {(["economy", "basic", "plus", "premium"] as const).map((tier) => (
                  <div key={tier} className="rounded-lg border border-border bg-background p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">پکیج {TIER_LABELS[tier]}</span>
                    </div>
                    <Input placeholder={`قیمت ${TIER_LABELS[tier]} (تومان)`} value={form[`pkg${tier.charAt(0).toUpperCase() + tier.slice(1)}` as keyof CourseForm] as string} onChange={(e) => setForm({ ...form, [`pkg${tier.charAt(0).toUpperCase() + tier.slice(1)}`]: e.target.value } as any)} className="border-border bg-muted text-foreground placeholder:text-muted-foreground" />
                    <Textarea placeholder={`امکانات ${TIER_LABELS[tier]} (هر خط یک آیتم)`} rows={2} value={form[`pkg${tier.charAt(0).toUpperCase() + tier.slice(1)}Features` as keyof CourseForm] as string} onChange={(e) => setForm({ ...form, [`pkg${tier.charAt(0).toUpperCase() + tier.slice(1)}Features`]: e.target.value } as any)} className="border-border bg-muted text-xs text-foreground placeholder:text-muted-foreground" />
                  </div>
                ))}
              </>
            )}
            {activeSection === "content" && dialog?.mode === "edit" && (
              <LessonContentEditor
                courseId={dialog.course._id}
                syllabus={dialog.course.syllabus ?? []}
              />
            )}
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button onClick={handleSave} disabled={busy} className="bg-primary text-foreground hover:bg-primary">
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
    <Card className="border-border bg-background">
      <CardHeader>
        <CardTitle className="text-sm text-foreground">اطلاعات حساب بانکی</CardTitle>
        <p className="text-xs text-muted-foreground">برای دریافت دستمزد، اطلاعات حساب بانکی خود را وارد کنید.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input placeholder="نام بانک" value={bankName} onChange={(e) => setBankName(e.target.value)} className="border-border bg-muted text-foreground" />
          <Input placeholder="شماره حساب" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="border-border bg-muted text-foreground font-mono" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input dir="ltr" inputMode="numeric" placeholder="1234 5678 9012 3456" value={formatCardNumber(cardNumber)} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ""))} className="border-border bg-muted text-left font-mono tracking-wider" />
          <Input placeholder="شماره شبا (IR...)" value={sheba} onChange={(e) => setSheba(e.target.value)} className="border-border bg-muted text-foreground" />
        </div>
        <Button size="sm" onClick={handleSave} className="bg-primary/10 text-foreground hover:bg-primary/15">
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
        <h2 className="text-xl font-bold text-foreground">پروفایل من</h2>
        <p className="mt-1 text-sm text-muted-foreground">
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
          <h3 className="font-bold text-foreground">دوره‌های پیشنهادی مدرس</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            دوره‌هایی از مدرسان دیگر که به دانشجویان پیشنهاد می‌دهید — روی پروفایل شما نمایش داده می‌شود.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(suggested?.mine ?? []).map((c) => (
            <Card key={c._id} className="border-emerald-200 bg-card text-card-foreground">
              <CardContent className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="min-w-0 break-words text-sm font-bold text-foreground">{c.title}</h4>
                  <button
                    onClick={() => void toggle({ courseId: c._id }).catch((e) => toast.error(e instanceof Error ? e.message : "خطا"))}
                    className="shrink-0 text-emerald-600 hover:text-emerald-700"
                    title="حذف از پیشنهادها"
                  >
                    <BookmarkCheck className="size-4" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">{c.instructorName ?? "—"} · {c.category ?? ""}</p>
              </CardContent>
            </Card>
          ))}
          {(suggested?.mine ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">هنوز دوره‌ای پیشنهاد نداده‌اید.</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-foreground">افزودن دوره از مدرسان دیگر</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              همهٔ دوره‌های منتشرشدهٔ مدرسان تیم — با «افزودن به پیشنهادها» در پروفایل شما نمایش داده می‌شود.
            </p>
          </div>
          <Input
            placeholder="جستجوی دوره…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-56 border-border bg-muted text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c._id} className="border-border bg-card text-card-foreground">
              <CardContent className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="min-w-0 break-words text-sm font-bold text-foreground">{c.title}</h4>
                  <button
                    onClick={() => void toggle({ courseId: c._id }).catch((e) => toast.error(e instanceof Error ? e.message : "خطا"))}
                    className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors ${
                      c.suggested
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
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
                <p className="line-clamp-2 break-words text-xs text-muted-foreground">{c.summary}</p>
                <p className="text-[11px] text-muted-foreground">
                  {c.instructorName ?? "—"} · {c.category ?? ""} · {c.studentsCount ?? 0} دانشجو
                </p>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">دوره‌ای یافت نشد.</p>
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
        <h2 className="text-xl font-bold text-foreground">اطلاعیه برای دانشجویان</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          اطلاعیه‌ای عمومی برای همه بفرستید یا فقط به دانشجویان یکی از دوره‌های خودتان — مثلاً «کلاس آنلاین جمع‌بندی امشب ساعت ۲۰».
        </p>
      </div>

      <Card className="border-primary/30 bg-card text-card-foreground">
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                mode === "all"
                  ? "bg-primary text-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              }`}
            >
              🌐 عمومی (همه کاربران)
            </button>
            <button
              type="button"
              onClick={() => setMode("course")}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                mode === "course"
                  ? "bg-primary text-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              }`}
            >
              📚 دانشجویان یک دوره
            </button>
          </div>

          {mode === "course" && (
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="border-border bg-muted text-foreground">
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
            <p className="text-xs text-muted-foreground">
              دوره‌ای با نام شما ثبت نشده. از پنل مدیریت، پروفایل مدرسی‌تان را به دوره وصل کنید.
            </p>
          )}
          <Input
            placeholder="عنوان اطلاعیه (مثلاً: کلاس آنلاین جمع‌بندی امشب)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
          />
          <Textarea
            placeholder="متن اطلاعیه…"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
          />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button onClick={handleCreate} disabled={busy} className="bg-primary text-foreground hover:bg-primary">
            {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Send className="ml-1.5 size-4" />}
            ارسال اطلاعیه
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">اطلاعیه‌های قبلی</p>
        {myAnns.map((a) => (
          <Card key={a._id} className="border-border bg-background">
            <CardContent className="flex items-start gap-3 py-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <BellRing className="size-4 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">{a.title}</p>
                  <button
                    onClick={() => remove({ id: a._id })}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    title="حذف"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {a.targetType === "all" ? "همه" : `برای: ${a.targetTitle ?? "—"}`} ·{" "}
                  {new Date(a.createdAt).toLocaleDateString("fa-IR")}
                </p>
                {a.body && <p className="mt-1.5 text-sm text-muted-foreground">{a.body}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {myAnns.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">هنوز اطلاعیه‌ای نفرستاده‌اید.</p>
        )}
      </div>
    </div>
  );
}


// ── Instructor Support Inbox ────────────────────────────────────────────────
function InstructorSupportView() {
  const { user } = useAuth();
  const tickets = useQuery(api.support.listTeacherTickets);
  const sendTicketMsg = useMutation(api.support.sendMessage);
  const markRead = useMutation(api.support.markAsRead);
  const updateStatus = useMutation(api.support.updateTicketStatus);
  const getUploadUrl = useMutation(api.support.getUploadUrl);

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

  const totalUnread = (tickets ?? []).reduce((sum: number, t: any) => sum + (t.unreadByTeacher ?? 0), 0);

  const statusLabel = (s: string) => {
    switch (s) {
      case "open": return "جدید";
      case "waiting_for_teacher": return "در انتظار پاسخ";
      case "waiting_for_student": return "در انتظار دانشجو";
      case "resolved": return "حل شده";
      case "closed": return "بسته شده";
      default: return s;
    }
  };

  const statusCls = (s: string) => {
    switch (s) {
      case "open": case "waiting_for_teacher": return "bg-amber-50 text-amber-600";
      case "waiting_for_student": return "bg-blue-400/15 text-blue-300";
      case "resolved": return "bg-emerald-50 text-emerald-600";
      case "closed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">🎧 پشتیبانی دانشجویان</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalUnread > 0 ? `${totalUnread} پیام خوانده‌نشده` : "همه پیام‌ها خوانده شده"}
          </p>
        </div>
      </div>

      {!openId ? (
        tickets === undefined ? (
          <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : (tickets as any[]).length === 0 ? (
          <Card className="border-border bg-card text-card-foreground">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <LifeBuoy className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">هنوز درخواست پشتیبانی ندارید.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(tickets as any[]).map((t: any) => (
              <button key={t._id} type="button" className="w-full text-right" onClick={() => setOpenId(t._id)}>
                <Card className="border-border bg-card text-card-foreground transition-colors hover:border-primary/30">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <LifeBuoy className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{t.studentName}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.subject}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t.courseName ?? "عمومی"} · {formatDateTime(t.lastMessageAt ?? t.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {t.unreadByTeacher > 0 && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-black">
                          {t.unreadByTeacher}
                        </span>
                      )}
                      <Badge className={cn("rounded-full text-[10px]", statusCls(t.status))}>
                        {statusLabel(t.status)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )
      ) : openTicket ? (
        <Card className="border-primary/30 bg-card text-card-foreground">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <Button variant="ghost" size="sm" onClick={() => setOpenId(null)} className="text-muted-foreground">
                <ChevronDown className="size-4 rotate-90" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{openTicket.studentName}</p>
                <p className="text-xs text-muted-foreground">{openTicket.subject}</p>
              </div>
              <select
                value={openTicket.status}
                onChange={(e) => void updateStatus({ ticketId: openId as any, status: e.target.value as any })}
                className="rounded-lg border border-border bg-muted px-2 py-1 text-xs text-foreground"
              >
                <option value="waiting_for_student">در انتظار دانشجو</option>
                <option value="waiting_for_teacher">در انتظار پاسخ</option>
                <option value="resolved">حل شده</option>
                <option value="closed">بسته شده</option>
              </select>
            </div>
            <div className="max-h-[50vh] space-y-3 overflow-y-auto p-4">
              {openTicket.messages.map((m: any) => {
                const isMine = m.senderId === user?._id;
                return (
                  <div key={m._id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6", isMine ? "bg-primary/10" : "bg-muted")}>
                      <p className="text-[11px] font-bold text-muted-foreground">
                        {m.senderName} · {m.senderRole === "instructor" ? "استاد" : "دانشجو"} · {formatDateTime(m.createdAt)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-foreground">{m.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            {openTicket.status !== "closed" && openTicket.status !== "resolved" && (
              <div className="flex items-center gap-2 border-t border-border p-3">
                <input ref={fileInputRef} type="file" hidden onChange={handleFileReply} />
                <button onClick={() => fileInputRef.current?.click()} className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors hover:bg-muted" title="فایل پیوست">
                  <Paperclip className="size-4" />
                </button>
                <Input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleReply()} placeholder="پاسخ شما..." className="flex-1 border-border bg-muted text-foreground placeholder:text-muted-foreground" />
                <Button size="sm" onClick={handleReply} disabled={!reply.trim() || replying} className="bg-primary text-foreground hover:bg-primary">
                  {replying ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>

        );
}

// ── Academy Path view (مسیر آکادمی) ─────────────────────────────────────────
function AcademyPathView() {
  const paths = useQuery(api.academyPaths.listInstructorPaths);
  const mySuggestions = useQuery(api.academyPaths.listMySuggestions);
  const generateAcademyPathAction = useAction(api.aiActions.generateAcademyPath);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiLevel, setAiLevel] = useState("مبتدی");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const handleAIGenerate = async () => {
    if (!aiTopic.trim()) return;
    setAiGenerating(true);
    setAiResult(null);
    try {
      const result = await generateAcademyPathAction({ topic: aiTopic.trim(), audienceLevel: aiLevel });
      setAiResult(result.path);
    } catch (e: any) {
      toast.error(e?.message || "خطا در تولید مسیر آموزشی");
    } finally {
      setAiGenerating(false);
    }
  };

  const submitSuggestion = useMutation(api.academyPaths.submitPathSuggestion);
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  const submitAIPathForReview = async () => {
    if (!aiResult) return;
    setSubmittingSuggestion(true);
    try {
      await submitSuggestion({
        title: aiResult.title,
        description: aiResult.description,
        level: aiResult.level,
        steps: aiResult.steps?.map((s: any) => ({
          title: s.title,
          description: s.description,
          durationMin: s.durationMin,
        })),
      });
      toast.info("پیشنهاد مسیر آموزشی شما برای بررسی مدیران سایت ارسال شد.");
      setAiDialogOpen(false);
      setAiResult(null);
      setAiTopic("");
    } catch (e: any) {
      toast.error(e?.message || "خطا در ارسال پیشنهاد");
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">🗺️ مسیر آکادمی</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          مسیرهای آموزشی منصوب به شما و پیشنهادات ارسالی.
        </p>
        <Button size="sm" variant="outline" className="mt-3 border-cyan-500/30 text-primary hover:bg-primary/10" onClick={() => setAiDialogOpen(true)}>
          🤖 پیشنهاد مسیر آموزشی با هوش مصنوعی
        </Button>
      </div>

      {/* Assigned Paths */}
      {paths === undefined ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : paths.length === 0 ? null : (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-muted-foreground">مسیرهای منصوب</h3>
          {paths.map((p: any) => (
            <Card key={p._id} className="border-border bg-card text-card-foreground">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Route className="size-5 text-primary" />
                  <p className="text-base font-bold text-foreground">{p.title}</p>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {p.level === "beginner" ? "مبتدی" : p.level === "intermediate" ? "متوسط" : p.level === "advanced" ? "پیشرفته" : "ترکیبی"}
                  </span>
                  <span className="text-xs text-muted-foreground">{p.items.length} کارگاه</span>
                </div>
                {p.description && <p className="mt-1.5 text-xs text-muted-foreground">{p.description}</p>}
                <div className="mt-4 space-y-2">
                  {p.items.map((item: any, idx: number) => (
                    <div key={item.workshopId} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-foreground">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.date ? new Date(item.date).toLocaleDateString("fa-IR") : "بدون تاریخ"}
                          {item.time ? ` — ${item.time}` : ""}
                        </p>
                        {item.platformUrl && (
                          <button
                            onClick={() => window.open(item.platformUrl!, "_blank", "noopener,noreferrer")}
                            className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:text-foreground"
                          >
                            <ExternalLink className="size-2.5" />
                            برگزاری در پلتفرم خارجی ↗
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* My Suggestions */}
      {mySuggestions && mySuggestions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-muted-foreground">پیشنهادات ارسالی من</h3>
          {mySuggestions.map((s: any) => (
            <Card key={s._id} className="border-border bg-card text-card-foreground">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{s.title}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        s.status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-600" :
                        s.status === "rejected" ? "border-destructive/30 bg-destructive/10 text-destructive" :
                        "border-amber-200 bg-amber-50 text-amber-600"
                      }`}>
                        {s.status === "approved" ? "تأیید شده" : s.status === "rejected" ? "رد شده" : "در انتظار"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(s.createdAt).toLocaleDateString("fa-IR")}</p>
                    {s.steps?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {s.steps.map((step: any, i: number) => (
                          <p key={i} className="text-[11px] text-muted-foreground">{i + 1}. {step.title}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(!paths || paths.length === 0) && (!mySuggestions || mySuggestions.length === 0) && (
        <Card className="border-border bg-card text-card-foreground">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Route className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">هنوز مسیری به شما اختصاص داده نشده است.</p>
          </CardContent>
        </Card>
      )}

      {/* AI Path Dialog */}
      {aiDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground">🤖 پیشنهاد مسیر آموزشی</h3>
            <p className="mt-1 text-xs text-muted-foreground">موضوع را وارد کنید تا هوش مصنوعی یک مسیر آموزشی پیشنهاد دهد.</p>
            <input
              type="text"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="مثلاً: میکروبیولوژی عمومی"
              className="mt-4 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <select
              value={aiLevel}
              onChange={(e) => setAiLevel(e.target.value)}
              className="mt-3 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground"
            >
              <option value="مبتدی">مبتدی</option>
              <option value="متوسط">متوسط</option>
              <option value="پیشرفته">پیشرفته</option>
              <option value="ترکیبی">ترکیبی</option>
            </select>
            {aiResult && (
              <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-bold text-primary">{aiResult.title}</p>
                {aiResult.description && <p className="mt-1 text-xs text-muted-foreground">{aiResult.description}</p>}
                {aiResult.steps?.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {aiResult.steps.map((step: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-primary">{i + 1}.</span>
                        <span>{step.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button size="sm" className="bg-primary text-foreground hover:bg-primary" disabled={!aiTopic.trim() || aiGenerating} onClick={handleAIGenerate}>
                {aiGenerating ? "در حال تولید..." : "تولید مسیر"}
              </Button>
              {aiResult && (
                <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-600" onClick={submitAIPathForReview} disabled={submittingSuggestion}>
                  {submittingSuggestion ? "در حال ارسال..." : "ارسال برای مدیران"}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => { setAiDialogOpen(false); setAiResult(null); setAiTopic(""); }}>
                بستن
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

