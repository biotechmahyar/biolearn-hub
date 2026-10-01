import { api } from "@/convex/_generated/api";
import { MemberProfileEditor } from "@/components/site/MemberProfileEditor";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import * as jalaali from "jalaali-js";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Compass,
  HeartHandshake,
  HelpCircle,
  LifeBuoy,
  MessageCircleQuestion,
  Plus,
  Search as SearchIcon,
  Send,
  Sparkles,
  Star,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import DeskTopBar, { type DeskFeedItem } from "@/components/panels/DeskTopBar";
import JalaliMonthCalendar from "@/components/panels/JalaliMonthCalendar";
import { JalaliDatePicker } from "@/components/site/JalaliDatePicker";
import { applyDeskTheme, useDeskTheme } from "@/lib/deskTheme";
import { cn } from "@/lib/utils";
import { faNum, formatJalaliDateString } from "@/lib/format";

type SessionRow = (typeof api.mentor.listSessions)["_returnType"][number];
type QuestionRow = (typeof api.mentor.listMentorQuestions)["_returnType"][number];
type GroupRow = (typeof api.collab.listMentorGroups)["_returnType"][number];
type StudentRow = (typeof api.mentor.listStudents)["_returnType"][number];

type Tab =
  | "dashboard"
  | "pairs"
  | "questions"
  | "sessions"
  | "groups"
  | "students"
  | "profile";

const TABS: {
  id: Tab;
  label: string;
  icon: typeof Compass;
  section: "main" | "mentorship";
}[] = [
  { id: "dashboard", label: "داشبورد", icon: BarChart3, section: "main" },
  { id: "students", label: "دانشجویان", icon: Users, section: "main" },
  { id: "questions", label: "پرسش‌ها و پاسخ‌ها", icon: MessageCircleQuestion, section: "main" },
  { id: "sessions", label: "جلسات ۱:۱", icon: CalendarClock, section: "main" },
  { id: "pairs", label: "جفت‌های منتورینگ", icon: HeartHandshake, section: "mentorship" },
  { id: "groups", label: "گروه‌های منتورینگ", icon: Users, section: "mentorship" },
  { id: "profile", label: "پروفایل من", icon: User, section: "main" },
];

const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
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
const RANGES: { id: RangeKey; label: string }[] = [
  { id: "day", label: "روز" },
  { id: "week", label: "هفته" },
  { id: "month", label: "ماه" },
  { id: "year", label: "سال" },
];

type RangeKey = "day" | "week" | "month" | "year";
type StatusFilter = "all" | "scheduled" | "done" | "cancelled";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function shiftAnchor(anchor: Date, range: RangeKey, offset: number) {
  switch (range) {
    case "day":
      return addDays(anchor, offset);
    case "week":
      return addDays(anchor, offset * 7);
    case "month":
      return new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1);
    case "year":
      return new Date(anchor.getFullYear() + offset, anchor.getMonth(), 1);
  }
}

function bucketKey(d: Date, range: RangeKey) {
  if (range === "year") {
    const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return `${j.jy}-${j.jm}`;
  }
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

type Column = { key: string; label: string; sub?: string; start: Date };

function buildColumns(range: RangeKey, anchor: Date): Column[] {
  if (range === "day") {
    const d = startOfDay(anchor);
    return [
      {
        key: bucketKey(d, range),
        label: WEEKDAYS[(d.getDay() + 1) % 7],
        sub: d.toLocaleDateString("fa-IR"),
        start: d,
      },
    ];
  }
  if (range === "week") {
    const first = addDays(startOfDay(anchor), -((anchor.getDay() + 1) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(first, i);
      return {
        key: bucketKey(d, range),
        label: WEEKDAYS[i],
        sub: d.toLocaleDateString("fa-IR", { day: "2-digit", month: "2-digit" }),
        start: d,
      };
    });
  }
  if (range === "month") {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const days = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = addDays(first, i);
      return {
        key: bucketKey(d, range),
        label: faNum(i + 1),
        sub: WEEKDAYS[(d.getDay() + 1) % 7],
        start: d,
      };
    });
  }
  const j = jalaali.toJalaali(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  const monthStart = jalaali.toGregorian(j.jy, 1, 1);
  return JALALI_MONTHS.map((label, i) => ({
    key: `${j.jy}-${i + 1}`,
    label,
    sub: faNum(`${j.jy}/${i + 1}`),
    start: new Date(monthStart.gy, monthStart.gm - 1 + i, 1),
  }));
}

function parseSessionDate(date?: string | null) {
  if (!date) return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Every date a mentor sees is Jalali, like the rest of the site. */
function fmtDate(date?: string | null) {
  if (!date) return "بدون تاریخ";
  try {
    return formatJalaliDateString(date);
  } catch {
    return date;
  }
}

const STATUS_STYLE: Record<
  string,
  { chip: string; bar: string; label: string }
> = {
  scheduled: {
    chip: "border-rose-200 bg-rose-50 text-rose-600",
    bar: "border-rose-200 bg-rose-50/90 text-rose-700",
    label: "درخواست جلسه",
  },
  done: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-600",
    bar: "border-emerald-200 bg-emerald-50/90 text-emerald-700",
    label: "انجام شد",
  },
  cancelled: {
    chip: "border-border bg-muted text-muted-foreground",
    bar: "border-border bg-muted text-muted-foreground",
    label: "لغو شد",
  },
};

function initials(name?: string | null) {
  return (name || "ن").trim().charAt(0).toUpperCase();
}

// ── Shell ──────────────────────────────────────────────────────────────────
export default function MentorPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("pairs");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mentorshipOpen, setMentorshipOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [planStudent, setPlanStudent] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [focusDate, setFocusDate] = useState<string | null>(null);

  const { theme } = useDeskTheme("mentor-desk");
  useEffect(() => applyDeskTheme(theme, "mentor-desk"), [theme]);

  const touchPresence = useMutation(api.collab.touchPresence);
  useEffect(() => {
    touchPresence({ location: "میز منتور" });
    const t = setInterval(() => touchPresence({ location: "میز منتور" }), 25_000);
    return () => clearInterval(t);
  }, [touchPresence]);

  const questionsQuery = useQuery(api.mentor.listMentorQuestions);
  const sessionsQuery = useQuery(api.mentor.listSessions);
  const groupsQuery = useQuery(api.collab.listMentorGroups);
  const studentsQuery = useQuery(api.mentor.listStudents);
  const announcementsQuery = useQuery(api.notifications.listAnnouncements);

  const questions = useMemo(() => questionsQuery ?? [], [questionsQuery]);
  const sessions = useMemo(() => sessionsQuery ?? [], [sessionsQuery]);
  const groups = useMemo(() => groupsQuery ?? [], [groupsQuery]);
  const students = useMemo(() => studentsQuery ?? [], [studentsQuery]);
  const announcements = useMemo(() => announcementsQuery ?? [], [announcementsQuery]);

  const openQuestions = questions.filter((q) => q.status === "open");
  const scheduled = sessions.filter((s) => s.status === "scheduled");
  const done = sessions.filter((s) => s.status === "done");

  const notifications = useMemo<DeskFeedItem[]>(() => {
    const items: DeskFeedItem[] = [];
    openQuestions.slice(0, 6).forEach((q) => {
      items.push({
        id: `q-${q._id}`,
        title: `سؤال جدید از ${q.studentName}`,
        body: q.text,
        at: q.createdAt,
        icon: <MessageCircleQuestion className="size-3.5" />,
        onClick: () => setTab("questions"),
      });
    });
    scheduled.slice(0, 6).forEach((s) => {
      items.push({
        id: `s-${s._id}`,
        title: `جلسهٔ ${s.title} با ${s.studentName}`,
        body: [s.date, s.time].filter(Boolean).join(" — ") || undefined,
        at: s.createdAt,
        icon: <CalendarClock className="size-3.5" />,
        onClick: () => setTab("pairs"),
      });
    });
    return items.sort((a, b) => (b.at ?? 0) - (a.at ?? 0)).slice(0, 12);
  }, [openQuestions, scheduled]);

  const messages = useMemo<DeskFeedItem[]>(
    () =>
      announcements.slice(0, 12).map((a) => ({
        id: `ann-${a._id}`,
        title: a.title,
        body: a.body,
        at: a.createdAt,
        icon: <HelpCircle className="size-3.5" />,
      })),
    [announcements],
  );

  const userName = user?.name || user?.email || "منتور";
  const nextSession = useMemo(() => {
    const dated = scheduled
      .map((s) => ({ s, d: parseSessionDate(s.date) }))
      .filter((x): x is { s: SessionRow; d: Date } => !!x.d)
      .sort((a, b) => a.d.getTime() - b.d.getTime());
    return dated[0]?.s ?? scheduled[0] ?? null;
  }, [scheduled]);

  const navButton = (item: (typeof TABS)[number], badge?: number) => (
    <button
      key={item.id}
      type="button"
      onClick={() => {
        setTab(item.id);
        setSidebarOpen(false);
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
        tab === item.id
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <item.icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="mr-auto rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
          {faNum(badge)}
        </span>
      )}
    </button>
  );

  return (
    <div className="desk-scope flex min-h-screen bg-muted/40 text-foreground" dir="rtl">
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-[250px] shrink-0 flex-col border-l border-border bg-card transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="size-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold tracking-tight">میز منتور</span>
            <span className="block text-[10px] text-muted-foreground">mentor desk</span>
          </span>
        </Link>

        <nav className="admin-scroll flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          <div className="space-y-0.5">
            {TABS.filter((t) => t.section === "main" && t.id !== "profile").map((t) =>
              navButton(t, t.id === "questions" ? openQuestions.length : undefined),
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setMentorshipOpen((v) => !v)}
              className="mb-1.5 flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <HeartHandshake className="size-4 text-muted-foreground" />
              منتورینگ
              <ChevronDown
                className={cn(
                  "mr-auto size-4 text-muted-foreground transition-transform",
                  mentorshipOpen && "rotate-180",
                )}
              />
            </button>
            {mentorshipOpen && (
              <div className="space-y-0.5 border-r border-border pr-2.5">
                {TABS.filter((t) => t.section === "mentorship").map((t) =>
                  navButton(t, t.id === "groups" ? groups.length : undefined),
                )}
              </div>
            )}
          </div>
        </nav>

        <div className="space-y-2 border-t border-border p-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-full justify-start rounded-xl text-xs"
            onClick={() => setTab("profile")}
          >
            <User className="ml-2 size-4" />
            پروفایل من
          </Button>
          <div className="rounded-2xl border border-border bg-muted/50 p-3">
            <p className="text-[11px] font-bold">سازمان ژنوا</p>
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
              منتورینگ دانشجویان زیست‌شناسی
            </p>
            <Button variant="outline" size="sm" className="mt-3 h-8 w-full rounded-xl text-[11px]" onClick={() => setHelpOpen(true)}>
              <LifeBuoy className="ml-1.5 size-3.5" />
              راهنما
            </Button>
          </div>
          <p className="pt-1 text-center text-[10px] text-muted-foreground/70">
            © {faNum(1404)} ژنوا — تمامی حقوق محفوظ است
          </p>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="بستن منو"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <DeskTopBar
          scope="mentor-desk"
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="جست‌وجوی دانشجو، جلسه یا گروه…"
          notifications={notifications}
          messages={messages}
          userName={userName}
          userRole={user?.role}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          extraProfileLinks={[
            {
              label: "پنل مدیریت",
              to: "/admin",
              icon: <BarChart3 className="size-4" />,
            },
          ]}
        />

        <div className="grid flex-1 gap-5 p-4 sm:p-6 xl:grid-cols-[1fr_290px]">
          <main className="min-w-0 space-y-4">
            {tab === "pairs" && (
              <PairsView
                sessions={sessions}
                groups={groups}
                students={students}
                query={query}
                focusDate={focusDate}
                onFocusDateChange={setFocusDate}
                onPlan={(studentId) => {
                  setPlanStudent(studentId ?? "");
                  setPlanOpen(true);
                }}
              />
            )}
            {tab === "dashboard" && (
              <DashboardView
                userName={userName}
                openQuestions={openQuestions.length}
                groups={groups}
                scheduled={scheduled.length}
                done={done.length}
                nextSession={nextSession}
                announcements={announcements}
              />
            )}
            {tab === "questions" && <QuestionsView />}
            {tab === "sessions" && (
              <SessionsView
                onPlan={() => {
                  setPlanStudent("");
                  setPlanOpen(true);
                }}
              />
            )}
            {tab === "groups" && <GroupsView groups={groups} query={query} />}
            {tab === "students" && (
              <StudentsView
                students={students}
                sessions={sessions}
                query={query}
                onPlan={(id) => {
                  setPlanStudent(id);
                  setPlanOpen(true);
                }}
              />
            )}
            {tab === "profile" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">پروفایل من</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    عکس، نام و معرفی کوتاه خود را ثبت کنید؛ تغییرات پس از تأیید مدیر سایت اعمال می‌شود.
                  </p>
                </div>
                <MemberProfileEditor />
              </div>
            )}
          </main>

          <aside className="space-y-4">
            <Card className="gap-0 rounded-2xl border-border py-0">
              <div className="px-5 pt-5">
                <h3 className="text-[15px] font-extrabold tracking-tight">وضعیت من</h3>
              </div>
              <div className="space-y-3 p-5">
                <StatLine label="سؤال بی‌پاسخ" value={openQuestions.length} />
                <StatLine label="جلسهٔ زمان‌بندی‌شده" value={scheduled.length} />
                <StatLine label="جلسهٔ انجام‌شده" value={done.length} />
                <StatLine label="گروه فعال" value={groups.length} />
                <StatLine label="دانشجویان" value={students.length} />
              </div>
            </Card>

            <Card className="gap-0 rounded-2xl border-border py-0">
              <div className="px-5 pt-5">
                <h3 className="text-[15px] font-extrabold tracking-tight">جلسهٔ بعدی</h3>
              </div>
              <div className="p-5">
                {nextSession ? (
                  <div className="space-y-2">
                    <p className="text-[13px] font-bold">{nextSession.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {nextSession.studentName} · {fmtDate(nextSession.date)}{" "}
                      {nextSession.time}
                    </p>
                    <Badge className={cn("border text-[10px]", STATUS_STYLE.scheduled.chip)}>
                      {STATUS_STYLE.scheduled.label}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    جلسه‌ای برنامه‌ریزی نشده است.
                  </p>
                )}
                <Button
                  size="sm"
                  className="mt-4 w-full rounded-xl"
                  onClick={() => {
                    setPlanStudent("");
                    setPlanOpen(true);
                  }}
                >
                  <Plus className="ml-1.5 size-4" />
                  برنامه‌ریزی جلسه
                </Button>
              </div>
            </Card>

            <Card className="gap-0 rounded-2xl border-border py-0">
              <div className="px-5 pt-5">
                <h3 className="text-[15px] font-extrabold tracking-tight">تقویم</h3>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  انتخاب یک روز، تایم‌لاین را روی همان روز متمرکز می‌کند.
                </p>
              </div>
              <div className="p-5">
                <JalaliMonthCalendar
                  selected={focusDate}
                  markers={sessions.map((s) => s.date).filter((d): d is string => !!d)}
                  onSelect={(iso) => {
                    setFocusDate(iso);
                    setTab("pairs");
                  }}
                />
              </div>
            </Card>

            <Card className="gap-0 rounded-2xl border-border py-0">
              <div className="px-5 pt-5">
                <h3 className="text-[15px] font-extrabold tracking-tight">دسترسی سریع</h3>
              </div>
              <div className="space-y-1 p-3">
                {[
                  { icon: HeartHandshake, label: "جفت‌های منتورینگ", tab: "pairs" as Tab },
                  { icon: MessageCircleQuestion, label: "پاسخ به سؤال‌ها", tab: "questions" as Tab },
                  { icon: Users, label: "گروه‌های منتورینگ", tab: "groups" as Tab },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setTab(item.tab)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </button>
                ))}
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start rounded-xl text-[12.5px]"
                >
                  <Link to="/">
                    <ArrowRight className="ml-2 size-4" />
                    بازگشت به سایت
                  </Link>
                </Button>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

      <PlanSessionDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        students={students}
        initialStudentId={planStudent}
      />
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-extrabold">{faNum(value)}</span>
    </div>
  );
}

// ── Mentorship pairs (timeline) ───────────────────────────────────────────
function PairsView({
  sessions,
  groups,
  students,
  query,
  focusDate,
  onFocusDateChange,
  onPlan,
}: {
  sessions: SessionRow[];
  groups: GroupRow[];
  students: StudentRow[];
  query: string;
  focusDate: string | null;
  onFocusDateChange: (iso: string | null) => void;
  onPlan: (studentId?: string) => void;
}) {
  const [range, setRange] = useState<RangeKey>("week");
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [mentorFilter, setMentorFilter] = useState<string | null>(null);
  const navigate = useNavigate();

  const base = useMemo(
    () => (focusDate ? new Date(focusDate) : new Date()),
    [focusDate],
  );
  const anchor = useMemo(() => shiftAnchor(base, range, offset), [base, range, offset]);
  const columns = useMemo(() => buildColumns(range, anchor), [anchor, range]);

  const q = query.trim().toLowerCase();

  const rows = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sessions: SessionRow[] }>();
    for (const s of sessions) {
      if (status !== "all" && s.status !== status) continue;
      const id = String(s.studentId);
      if (!map.has(id)) map.set(id, { id, name: s.studentName ?? "دانشجو", sessions: [] });
      map.get(id)!.sessions.push(s);
    }
    return [...map.values()]
      .filter(
        (r) =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.sessions.some((s) => (s.title ?? "").toLowerCase().includes(q)),
      )
      .filter((r) => !mentorFilter || r.sessions.some((s) => s.mentorName === mentorFilter))
      .sort((a, b) => b.sessions.length - a.sessions.length);
  }, [sessions, status, q, mentorFilter]);

  const mentors = useMemo(() => {
    const map = new Map<string, { name: string; total: number; done: number; mentees: Set<string> }>();
    for (const s of sessions) {
      const name = s.mentorName ?? "منتور";
      if (!map.has(name)) map.set(name, { name, total: 0, done: 0, mentees: new Set() });
      const row = map.get(name)!;
      row.total += 1;
      if (s.status === "done") row.done += 1;
      row.mentees.add(String(s.studentId));
    }
    return [...map.values()].sort((a, b) => b.done - a.done);
  }, [sessions]);

  const columnIndex = (s: SessionRow) => {
    const d = parseSessionDate(s.date);
    if (!d) return -1;
    return columns.findIndex((c) => c.key === bucketKey(d, range));
  };

  const rangeTitle =
    range === "day"
      ? formatJalaliDateString(
          `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}-${String(anchor.getDate()).padStart(2, "0")}`,
        )
      : range === "week"
        ? `هفتهٔ ${formatJalaliDateString(
            `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}-${String(anchor.getDate()).padStart(2, "0")}`,
          )}`
        : range === "month"
          ? `${JALALI_MONTHS[jalaali.toJalaali(anchor).jm - 1]} ${faNum(jalaali.toJalaali(anchor).jy)}`
          : `سال ${faNum(jalaali.toJalaali(anchor).jy)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" className="size-9 rounded-xl" onClick={() => navigate(-1)} title="بازگشت">
          <ArrowRight className="size-4" />
        </Button>
        <h1 className="text-lg font-extrabold tracking-tight">جفت‌های منتورینگ</h1>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600">
          منتور برتر
        </span>
        <Button
          size="icon"
          className="size-9 rounded-xl"
          onClick={() => onPlan()}
          title="افزودن جفت جدید"
        >
          <Plus className="size-4" />
        </Button>
        <div className="mr-auto flex items-center gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-36 rounded-xl text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همهٔ وضعیت‌ها</SelectItem>
              <SelectItem value="scheduled">زمان‌بندی‌شده</SelectItem>
              <SelectItem value="done">انجام‌شده</SelectItem>
              <SelectItem value="cancelled">لغوشده</SelectItem>
            </SelectContent>
          </Select>
          <div className="hidden items-center gap-1 rounded-xl border border-border px-3 py-2 text-[12px] text-muted-foreground sm:flex">
            <SearchIcon className="size-3.5" />
            {faNum(students.length)} دانشجو
          </div>
        </div>
      </div>

      <Card className="gap-0 rounded-2xl border-border py-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRange(r.id);
                  setOffset(0);
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  range === r.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="text-[12px] font-semibold text-muted-foreground">{rangeTitle}</span>
          <div className="mr-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg"
              onClick={() => setOffset((o) => o - 1)}
              title="قبلی"
            >
              <ChevronRightIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg"
              onClick={() => {
                setOffset(0);
                onFocusDateChange(null);
              }}
              title="امروز"
            >
              <CalendarClock className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg"
              onClick={() => setOffset((o) => o + 1)}
              title="بعدی"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex">
          {/* Mentor cards — reference left column */}
          <div className="admin-scroll hidden w-[260px] shrink-0 space-y-3 overflow-y-auto border-l border-border bg-muted/30 p-3 xl:block">
            {mentors.length === 0 && (
              <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
                هنوز منتوری جلسه‌ای ثبت نکرده است.
              </p>
            )}
            {mentors.map((m) => {
              const rating = m.total ? (m.done / m.total) * 5 : 0;
              return (
                <Card key={m.name} className="gap-0 rounded-2xl border-border py-0">
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-extrabold">منتور</span>
                      <Badge className="border-amber-200 bg-amber-50 text-[9px] font-bold text-amber-600">
                        برتر
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2.5">
                      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">
                        {initials(m.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">منتور ژنوا</p>
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      {faNum(m.mentees.size)} دانشجو · {faNum(m.done)} جلسهٔ انجام‌شده
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "size-3",
                            i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
                          )}
                        />
                      ))}
                      <span className="mr-1 font-bold text-foreground">
                        {rating.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} از ۵
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "mt-3 h-8 w-full rounded-xl text-[11px]",
                        mentorFilter === m.name && "border-primary text-primary",
                      )}
                      onClick={() =>
                        setMentorFilter((prev) => (prev === m.name ? null : m.name))
                      }
                    >
                      {mentorFilter === m.name ? "نمایش همه" : "مشاهدهٔ تاریخچه"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Timeline */}
          <div className="admin-scroll min-w-0 flex-1 overflow-x-auto">
            <div className="min-w-[720px]">
              <div
                className="grid border-b border-border bg-muted/40"
                style={{ gridTemplateColumns: `180px repeat(${columns.length}, minmax(96px, 1fr))` }}
              >
                <div className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  دانشجو
                </div>
                {columns.map((c) => {
                  const today = c.key === bucketKey(new Date(), range);
                  return (
                    <div
                      key={c.key}
                      className={cn(
                        "border-r border-border px-2 py-3 text-center",
                        today && "bg-primary/5",
                      )}
                    >
                      <p className="text-[11px] font-bold">{c.label}</p>
                      {c.sub && (
                        <p className="mt-0.5 text-[9px] text-muted-foreground">{c.sub}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {rows.length === 0 && (
                <div className="px-6 py-16 text-center">
                  <HeartHandshake className="mx-auto size-8 text-muted-foreground/40" />
                  <p className="mt-3 text-[13px] font-semibold">جفت منتورینگی یافت نشد</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    برای شروع یک جلسهٔ ۱:۱ برنامه‌ریزی کنید یا بازهٔ زمانی را تغییر دهید.
                  </p>
                  <Button size="sm" className="mt-4 rounded-xl" onClick={() => onPlan()}>
                    <Plus className="ml-1.5 size-4" />
                    برنامه‌ریزی جلسه
                  </Button>
                </div>
              )}

              {rows.map((row) => (
                <div
                  key={row.id}
                  className="grid border-b border-border/70 last:border-0"
                  style={{ gridTemplateColumns: `180px repeat(${columns.length}, minmax(96px, 1fr))` }}
                >
                  <div className="flex items-center gap-2 px-4 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {initials(row.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-bold">{row.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {faNum(row.sessions.length)} جلسه
                      </p>
                    </div>
                    <button
                      type="button"
                      title="افزودن جلسه برای این دانشجو"
                      onClick={() => onPlan(row.id)}
                      className="mr-auto rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  {columns.map((c) => {
                    const cell = row.sessions.filter((s) => columnIndex(s) === columns.indexOf(c));
                    return (
                      <div
                        key={c.key}
                        className={cn(
                          "min-h-[64px] space-y-1.5 border-r border-border/70 p-1.5",
                          c.key === bucketKey(new Date(), range) && "bg-primary/[0.04]",
                        )}
                      >
                        {cell.map((s) => {
                          const style = STATUS_STYLE[s.status] ?? STATUS_STYLE.scheduled;
                          return (
                            <div
                              key={s._id}
                              className={cn(
                                "rounded-lg border px-2 py-1.5 text-[10px] leading-4",
                                style.bar,
                              )}
                            >
                              <p className="font-bold">
                                {s.title || "جلسهٔ مشاوره"}
                              </p>
                              <p className="opacity-80">
                                {[fmtDate(s.date), s.time].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {groups.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <Card key={g._id} className="gap-0 rounded-2xl border-border py-0">
              <div className="p-4">
                <p className="text-[13px] font-bold">{g.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{g.description}</p>
                <p className="mt-3 text-[10px] text-muted-foreground">
                  {g.meetingDay} · {g.meetingTime} — {faNum(g.memberCount)} از {faNum(g.capacity)}{" "}
                  عضو
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronRightIcon() {
  return <ChevronLeft className="size-3.5 rotate-180" />;
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function DashboardView({
  userName,
  openQuestions,
  groups,
  scheduled,
  done,
  nextSession,
  announcements,
}: {
  userName: string;
  openQuestions: number;
  groups: GroupRow[];
  scheduled: number;
  done: number;
  nextSession: SessionRow | null;
  announcements: { _id: string; title: string; body: string; createdAt: number }[];
}) {
  const tiles = [
    { icon: MessageCircleQuestion, label: "سؤال بی‌پاسخ", value: openQuestions },
    { icon: CalendarClock, label: "جلسهٔ آینده", value: scheduled },
    { icon: CheckCircle2, label: "جلسهٔ انجام‌شده", value: done },
    { icon: Users, label: "گروه فعال", value: groups.length },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">داشبورد منتور</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          روز بخیر {userName} 👋 — نمای کلی فعالیت‌های شما.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="gap-0 rounded-2xl border-border py-0">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-[12px] text-muted-foreground">{t.label}</p>
                <p className="mt-1.5 text-2xl font-extrabold">{faNum(t.value)}</p>
              </div>
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <t.icon className="size-4" />
              </span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="gap-0 rounded-2xl border-border py-0">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-[15px] font-extrabold tracking-tight">جلسهٔ بعدی</h3>
        </div>
        <div className="p-5">
          {nextSession ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarClock className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold">{nextSession.title}</p><p className="text-[11px] text-muted-foreground">
                    {nextSession.studentName} · {fmtDate(nextSession.date)} · {nextSession.time}
                  </p>
              </div>
              <Badge className={cn("border text-[10px]", STATUS_STYLE.scheduled.chip)}>
                زمان‌بندی‌شده
              </Badge>
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">جلسه‌ای برنامه‌ریزی نشده است.</p>
          )}
        </div>
      </Card>

      <Card className="gap-0 rounded-2xl border-border py-0">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-[15px] font-extrabold tracking-tight">اعلان‌های سایت</h3>
        </div>
        <div className="space-y-2 p-5">
          {announcements.length === 0 && (
            <p className="text-[12px] text-muted-foreground">اعلانی وجود ندارد.</p>
          )}
          {announcements.slice(0, 4).map((a) => (
            <div key={a._id} className="rounded-xl border border-border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-bold">{a.title}</p>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(a.createdAt).toLocaleDateString("fa-IR")}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{a.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Q&A ────────────────────────────────────────────────────────────────────
function QuestionsView() {
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("عمومی");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [replyTarget, setReplyTarget] = useState<string | null>(null);

  const questions = useQuery(api.mentor.listMentorQuestions) ?? [];
  const askMentor = useMutation(api.mentor.askMentor);
  const answerMentorQuestion = useMutation(api.mentor.answerMentorQuestion);

  const open = questions.filter((q) => q.status === "open");
  const answered = questions.filter((q) => q.status === "answered");

  async function handleAsk() {
    if (text.trim().length < 5) return;
    try {
      await askMentor({ text, topic });
      setText("");
      toast.success("سؤال برای منتور ارسال شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  }

  async function handleAnswer(q: QuestionRow) {
    const answer = answers[q._id];
    if (!answer?.trim()) return;
    try {
      await answerMentorQuestion({ questionId: q._id, answer });
      setAnswers((a) => ({ ...a, [q._id]: "" }));
      setReplyTarget(null);
      toast.success("پاسخ ثبت شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">پرسش‌ها و پاسخ‌ها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          دانشجویان هر لحظه می‌توانند سؤال بپرسند؛ پاسخ شما برای همان دانشجو ارسال می‌شود.
        </p>
      </div>

      <Card className="gap-0 rounded-2xl border-border py-0">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
          <Input
            placeholder="سؤال جدید خود را بنویسید…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            className="flex-1"
          />
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="عمومی">عمومی</SelectItem>
              <SelectItem value="برنامه تحصیلی">برنامه تحصیلی</SelectItem>
              <SelectItem value="پروژه">پروژه</SelectItem>
              <SelectItem value="مسیر شغلی">مسیر شغلی</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAsk}>
            <Send className="ml-1.5 size-4" />
            پرسیدن
          </Button>
        </CardContent>
      </Card>

      {open.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            در انتظار پاسخ ({faNum(open.length)})
          </p>
          {open.map((q) => (
            <Card key={q._id} className="gap-0 rounded-2xl border-border py-0">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                    {initials(q.studentName)}
                  </span>
                  <div>
                    <p className="text-[13px] font-bold">{q.studentName}</p>
                    <Badge variant="outline" className="mt-0.5 text-[10px]">
                      {q.topic}
                    </Badge>
                  </div>
                  <span className="mr-auto text-[10px] text-muted-foreground">
                    {new Date(q.createdAt).toLocaleDateString("fa-IR")}
                  </span>
                </div>
                <p className="text-[13px] leading-6 text-foreground/90">{q.text}</p>

                {replyTarget === q._id ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      autoFocus
                      placeholder="پاسخ شما…"
                      value={answers[q._id] ?? ""}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q._id]: e.target.value }))}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => handleAnswer(q)}>
                      <Send className="ml-1.5 size-3.5" />
                      ارسال
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setReplyTarget(null)}>
                      انصراف
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setReplyTarget(q._id)}>
                    <MessageCircleQuestion className="size-4" />
                    پاسخ دادن
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {answered.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            پاسخ‌داده‌شده ({faNum(answered.length)})
          </p>
          {answered.map((q) => (
            <Card key={q._id} className="gap-0 rounded-2xl border-border py-0">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2 text-[13px]">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span className="font-bold">{q.studentName}</span>
                  <span className="text-[11px] text-muted-foreground">— {q.topic}</span>
                </div>
                <p className="text-[12.5px] text-muted-foreground">{q.text}</p>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
                  {q.answer}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {questions.length === 0 && (
        <Card className="gap-0 rounded-2xl border-dashed border-border py-0">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Sparkles className="size-8 text-muted-foreground/40" />
            <p className="text-[13px] text-muted-foreground">
              هنوز سؤالی نیامده. وقتی دانشجویی سؤال بپرسد اینجا نمایش داده می‌شود.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Sessions ───────────────────────────────────────────────────────────────
function SessionsView({ onPlan }: { onPlan: () => void }) {
  const sessions = useQuery(api.mentor.listSessions) ?? [];
  const setSessionStatus = useMutation(api.mentor.setSessionStatus);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">جلسات ۱:۱</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            جلسات با دانشجویان را زمان‌بندی و پیگیری کنید.
          </p>
        </div>
        <Button onClick={onPlan} className="rounded-xl">
          <Plus className="ml-1.5 size-4" />
          جلسهٔ جدید
        </Button>
      </div>

      <div className="space-y-3">
        {sessions.length === 0 && (
          <Card className="gap-0 rounded-2xl border-dashed border-border py-0">
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <CalendarClock className="size-8 text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">جلسه‌ای ثبت نشده است.</p>
            </CardContent>
          </Card>
        )}
        {sessions.map((s) => {
          const style = STATUS_STYLE[s.status] ?? STATUS_STYLE.scheduled;
          return (
            <Card key={s._id} className="gap-0 rounded-2xl border-border py-0">
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarClock className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.studentName} · {fmtDate(s.date)} · {s.time}
                  </p>
                  {s.notes && (
                    <p className="mt-1 text-[11px] text-muted-foreground/80">{s.notes}</p>
                  )}
                </div>
                <Badge className={cn("border text-[10px]", style.chip)}>{style.label}</Badge>
                {s.status === "scheduled" && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl text-[11px]"
                      onClick={() => setSessionStatus({ sessionId: s._id, status: "done" })}
                    >
                      انجام شد
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-xl text-[11px] text-destructive"
                      onClick={() => setSessionStatus({ sessionId: s._id, status: "cancelled" })}
                    >
                      لغو
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Groups ─────────────────────────────────────────────────────────────────
function GroupsView({
  groups,
  query,
}: {
  groups: GroupRow[];
  query: string;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDay, setMeetingDay] = useState("پنجشنبه");
  const [meetingTime, setMeetingTime] = useState("۱۸:۰۰");
  const [capacity, setCapacity] = useState(8);

  const createMentorGroup = useMutation(api.collab.createMentorGroup);
  const deleteMentorGroup = useMutation(api.collab.deleteMentorGroup);

  const q = query.trim().toLowerCase();
  const visible = groups.filter(
    (g) => !q || g.title.toLowerCase().includes(q) || (g.description ?? "").toLowerCase().includes(q),
  );

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("نام گروه را وارد کنید");
      return;
    }
    try {
      await createMentorGroup({ title, description, meetingDay, meetingTime, capacity });
      toast.success("گروه منتورینگ ساخته شد");
      setShowCreate(false);
      setTitle("");
      setDescription("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">گروه‌های منتورینگ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            حلقه‌های مطالعهٔ کوچک با جلسات هفتگی؛ دانشجویان می‌توانند عضو شوند.
          </p>
        </div>
        <Button className="rounded-xl" onClick={() => setShowCreate((s) => !s)}>
          <Plus className="ml-1.5 size-4" />
          گروه جدید
        </Button>
      </div>

      {showCreate && (
        <Card className="gap-0 rounded-2xl border-border py-0">
          <CardContent className="space-y-3 p-4">
            <Input
              placeholder="نام گروه (مثلاً: حلقهٔ میکروب‌شناسی)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="توضیح: این گروه برای چه کسانی است؟"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Select value={meetingDay} onValueChange={setMeetingDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"].map(
                    (d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <Input
                placeholder="ساعت (۱۸:۰۰)"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
              />
              <Input
                type="number"
                placeholder="ظرفیت"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreate}>ایجاد گروه</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {visible.length === 0 && (
          <Card className="gap-0 rounded-2xl border-dashed border-border py-0 sm:col-span-2">
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <Users className="size-8 text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">گروهی برای نمایش وجود ندارد.</p>
            </CardContent>
          </Card>
        )}
        {visible.map((g) => (
          <Card key={g._id} className="gap-0 rounded-2xl border-border py-0">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <h3 className="font-bold">{g.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteMentorGroup({ groupId: g._id });
                    toast.success("گروه حذف شد");
                  }}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="text-[11.5px] text-muted-foreground">{g.description}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="outline">
                  {g.meetingDay} · {g.meetingTime}
                </Badge>
                <span>
                  {faNum(g.memberCount)}/{faNum(g.capacity)} عضو
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Students ───────────────────────────────────────────────────────────────
function StudentsView({
  students,
  sessions,
  query,
  onPlan,
}: {
  students: StudentRow[];
  sessions: SessionRow[];
  query: string;
  onPlan: (id: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const visible = students.filter(
    (s) => !q || s.name.toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">دانشجویان</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          دانشجویانی که می‌توانید برایشان جلسهٔ ۱:۱ برنامه‌ریزی کنید.
        </p>
      </div>

      <Card className="gap-0 overflow-hidden rounded-2xl border-border py-0">
        {visible.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Users className="size-8 text-muted-foreground/40" />
            <p className="text-[13px] text-muted-foreground">دانشجویی یافت نشد.</p>
          </CardContent>
        ) : (
          <div className="divide-y divide-border">
            {visible.map((s) => {
              const mine = sessions.filter((x) => String(x.studentId) === s._id);
              return (
                <div key={s._id} className="flex flex-wrap items-center gap-3 p-4">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                    {initials(s.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{s.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {s.email ?? "—"} · {faNum(mine.length)} جلسه
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 rounded-xl text-[11px]" onClick={() => onPlan(s._id)}>
                    <Plus className="ml-1.5 size-3.5" />
                    برنامه‌ریزی جلسه
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Help dialog ────────────────────────────────────────────────────────────
function HelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const items = [
    {
      icon: HeartHandshake,
      title: "جفت‌های منتورینگ",
      body: "تایم‌لاین جلسات هر دانشجو را نشان می‌دهد. با دکمه‌های روز/هفته/ماه/سال بازه را عوض کنید و با تقویم کنار صفحه روی یک روز دقیق بروید.",
    },
    {
      icon: CalendarClock,
      title: "جلسات ۱:۱",
      body: "با دکمهٔ «+» یا «برنامه‌ریزی جلسه» یک جلسه بسازید؛ تاریخ‌ها شمسی هستند و دانشجو اعلان دریافت می‌کند.",
    },
    {
      icon: MessageCircleQuestion,
      title: "پرسش و پاسخ",
      body: "پاسخ شما مستقیم برای دانشجو ارسال می‌شود و وضعیت سؤال به «پاسخ‌داده‌شده» تغییر می‌کند.",
    },
    {
      icon: Users,
      title: "گروه‌های منتورینگ",
      body: "حلقه‌های مطالعه با ظرفیت و روز جلسه بسازید تا دانشجویان بتوانند به آن‌ها بپیوندند.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-right">راهنمای میز منتور</DialogTitle>
          <DialogDescription className="text-right">
            همهٔ بخش‌های میز منتور و کاری که هرکدام انجام می‌دهند.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.title} className="flex gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-4" />
              </span>
              <div>
                <p className="text-[12.5px] font-bold">{item.title}</p>
                <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
          <Button asChild variant="outline" className="w-full rounded-xl">
            <Link to="/rules">
              <LifeBuoy className="ml-1.5 size-4" />
              قوانین و مقررات ژنوا
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Plan session dialog ────────────────────────────────────────────────────
function PlanSessionDialog({
  open,
  onOpenChange,
  students,
  initialStudentId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  students: StudentRow[];
  initialStudentId: string;
}) {
  const [studentId, setStudentId] = useState(initialStudentId);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("۱۷:۰۰");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const planSession = useMutation(api.mentor.planSession);

  const value = studentId || initialStudentId;

  async function handlePlan() {
    if (!value) {
      toast.error("دانشجو را انتخاب کنید");
      return;
    }
    if (!title.trim()) {
      toast.error("عنوان جلسه را وارد کنید");
      return;
    }
    setBusy(true);
    try {
      await planSession({ studentId: value as never, title, date, time, notes });
      toast.success("جلسه برنامه‌ریزی شد");
      setTitle("");
      setDate("");
      setNotes("");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-right">برنامه‌ریزی جلسهٔ ۱:۱</DialogTitle>
          <DialogDescription className="text-right">
            پس از ثبت، دانشجو از طریق اعلان مطلع می‌شود.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={value} onValueChange={setStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="دانشجو را انتخاب کنید…" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                  {s.email ? ` (${s.email})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="عنوان جلسه (مثلاً: مرور روش تحقیق)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <JalaliDatePicker value={date} onChange={setDate} />
            <Input
              placeholder="ساعت (۱۷:۰۰)"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <Textarea
            placeholder="یادداشت‌ها (اختیاری)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={handlePlan} disabled={busy}>
            <CalendarClock className="ml-1.5 size-4" />
            ثبت جلسه
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}