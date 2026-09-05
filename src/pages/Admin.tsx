import { CategoryField } from "@/components/site/CategoryField";
import { JalaliDatePicker } from "@/components/site/JalaliDatePicker";
import { MemberProfileEditor } from "@/components/site/MemberProfileEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useMode } from "@/hooks/useMode";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useAuth } from "@/hooks/use-auth";
import { accent, faNum, formatDate, formatDateTime, formatJalaliDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { uploadBlob } from "@/lib/upload";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Award,
  BarChart3,
  Blocks,
  Route as RouteIcon,
  Bot,
  BellRing,
  BookOpen,
  BookUser,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Compass,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  FileText,
  Flag,
  Sparkles,
  Headset,
  HelpCircle,
  Home,
  Inbox,
  Image,
  Megaphone,
  Layers,
  Loader2,
  Lock,
  Clock,
  Mail,
  Menu,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  RefreshCw,
  Save,
  Send,
  Shield,
  ShieldCheck,
  Terminal,
  Ticket,
  Trash2,
  TrendingUp,
  Upload,
  User,
  UserCheck,
  Users,
  Video,
  Wifi,
  WifiOff,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ── Navigation model ────────────────────────────────────────────────────────
type Section =
  | "overview"
  | "courses"
  | "questions"
  | "exams"
  | "articles"
  | "workshops"
  | "products"
  | "instructors"
  | "users"
  | "orders"
  | "coupons"
  | "support"
  | "announcements"
  | "profiles"
  | "inbox"
  | "examReports"
  | "offlinePayments"
  | "myprofile"
  | "online"
  | "comments"
  | "payments"
  | "classRequests"
  | "studentReports"
  | "backup"
  | "sync"
  | "classManagement"
  | "storeApproval"
  | "flashSales"
  | "promoBanners"
  | "discounts"
  | "academyPaths"
  | "certificates";

const NAV_GROUPS: { title: string; items: { key: Section; label: string; icon: typeof Activity }[] }[] = [
  {
    title: "نظارت",
    items: [
      { key: "overview", label: "نمای کلی", icon: Activity },
      { key: "users", label: "کاربران و دسترسی‌ها", icon: Users },
      { key: "online", label: "آنلاین‌ها", icon: Wifi },
      { key: "profiles", label: "تأیید پروفایل‌ها", icon: UserCheck },
      { key: "inbox", label: "صندوق ورودی", icon: Inbox },
      { key: "examReports", label: "گزارش‌های خطای آزمون", icon: Flag },
      { key: "orders", label: "سفارش‌ها", icon: CreditCard },
      { key: "offlinePayments", label: "پرداخت‌های آفلاین", icon: Receipt },
      { key: "payments", label: "پرداخت دستمزد", icon: Receipt },
      { key: "coupons", label: "کدهای تخفیف", icon: Ticket },
      { key: "support", label: "پشتیبانی", icon: ShieldCheck },
      { key: "announcements", label: "اطلاعیه‌ها", icon: BellRing },
      { key: "comments", label: "دیدگاه‌ها", icon: MessageSquare },
      { key: "backup", label: "بکاپ و خروجی", icon: Download },
      { key: "sync", label: "مدیریت سینک", icon: RefreshCw },
      { key: "classManagement", label: "مدیریت کلاس‌ها", icon: Clock },
    ],
  },
  {
    title: "محتوای آموزشی",
    items: [
      { key: "courses", label: "دوره‌ها", icon: BookOpen },
      { key: "exams", label: "آزمون‌ها", icon: ClipboardList },
      { key: "questions", label: "بانک سؤال", icon: HelpCircle },
      { key: "articles", label: "مقالات رایگان", icon: FileText },
      { key: "workshops", label: "کارگاه‌ها", icon: TrendingUp },
      { key: "products", label: "محصولات فیزیکی", icon: Package },
      { key: "storeApproval", label: "تأیید محصولات بازارچه", icon: ShieldCheck },
      { key: "discounts", label: "تخفیفات ویژه", icon: Ticket },
      { key: "flashSales", label: "فروش ویژه", icon: Zap },
      { key: "promoBanners", label: "بنر تبلیغاتی", icon: Megaphone },
      { key: "academyPaths", label: "مسیر آکادمی", icon: RouteIcon },
      { key: "certificates", label: "درخواست‌های گواهی", icon: Award },
    ],
  },
  {
    title: "تیم",
    items: [
      { key: "instructors", label: "مدرسان", icon: BookUser },
      { key: "studentReports", label: "دانشجویان", icon: Users },
      { key: "classRequests", label: "درخواست کلاس", icon: Clock },
    ],
  },
  {
    title: "حساب من",
    items: [{ key: "myprofile", label: "پروفایل من", icon: User }],
  },
];

const ALL_SECTIONS = NAV_GROUPS.flatMap((g) => g.items);

const ROLES = ["user", "member", "instructor", "mentor", "content_manager", "support", "site_admin", "admin"];
const ROLE_LABELS: Record<string, string> = {
  user: "دانشجو",
  member: "عضو",
  instructor: "مدرس",
  mentor: "منتور",
  content_manager: "مدیر محتوا",
  support: "پشتیبانی",
  site_admin: "ادمین سایت",
  admin: "ادمین",
};

const ACCENTS = ["teal", "emerald", "sky", "amber", "violet", "rose", "indigo", "slate"];

// ── Shared bits ─────────────────────────────────────────────────────────────
function StatusChip({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px]",
        published
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
          : "border-amber-500/30 bg-amber-500/10 text-amber-500",
      )}
    >
      <span className={cn("size-1.5 rounded-full", published ? "bg-emerald-500" : "bg-amber-500")} />
      {published ? "PUBLISHED" : "DRAFT"}
    </span>
  );
}

// Course rows also carry a review status: draft → pending → published/rejected.
function CourseStatusChip({ c }: { c: any }) {
  const status = c.status ?? (c.published ? "published" : "draft");
  const map: Record<string, { label: string; cls: string }> = {
    published: { label: "منتشر شده", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" },
    pending: { label: "در انتظار تأیید", cls: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    draft: { label: "پیش‌نویس", cls: "border-slate-400/30 bg-slate-400/10 text-slate-500" },
    rejected: { label: "رد شده", cls: "border-red-500/30 bg-red-500/10 text-red-500" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold", s.cls)}>
      <span className={cn("size-1.5 rounded-full", status === "published" ? "bg-emerald-500" : status === "pending" ? "bg-amber-500" : status === "rejected" ? "bg-red-500" : "bg-slate-400")} />
      {s.label}
    </span>
  );
}

function SectionHeader({ title, subtitle, count }: { title: string; subtitle: string; count?: number }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-primary/80">{subtitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{title}</h1>
      </div>
      {count !== undefined && (
        <span className="rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground">
          {faNum(count)} items
        </span>
      )}
    </div>
  );
}

function PublishActions({
  published,
  onToggle,
  onEdit,
  onDelete,
}: {
  published: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex justify-end gap-1.5">
      <Button size="sm" variant="outline" className="h-7 rounded-md text-xs" onClick={onToggle}>
        {published ? "بازگشت به پیش‌نویس" : "انتشار"}
      </Button>
      {onEdit && (
        <Button size="sm" variant="outline" className="h-7 rounded-md text-xs" onClick={onEdit}>
          ویرایش
        </Button>
      )}
      {onDelete && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 rounded-md text-xs text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

// Draft / publish picker used at the bottom of every create + edit form.
function PublishPicker({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
          !value ? "bg-amber-500/15 text-amber-500" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Layers className="size-3.5" />
        ذخیره به‌عنوان پیش‌نویس
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
          value ? "bg-emerald-500/15 text-emerald-500" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Send className="size-3.5" />
        ذخیره و انتشار
      </button>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      در حال بارگذاری...
    </div>
  );
}

// ── Shell ───────────────────────────────────────────────────────────────────
export default function Admin() {
  const { user } = useAuth();
  const { isIran } = useMode();
  const isAdmin = useQuery(api.admin.amIAdmin);
  const [section, setSection] = useState<Section>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const notifCounts = useQuery(api.admin.getSectionNotifications);
  // System admins (full power) vs site admins (lower-tier team managers).
  const isSystemAdmin = user?.role === "admin" || user?.role === "site_admin";
  // Both system and site admins can jump between the team panels.
  const canRoleSwitch = user?.role === "admin" || user?.role === "site_admin";

  // Map section keys to notification count keys
  const NOTIF_MAP: Record<string, string> = {
    support: "support",
    examReports: "examReports",
    profiles: "profiles",
    courses: "courses",
    offlinePayments: "offlinePayments",
    classRequests: "classRequests",
  };

  // Staff panels the admin can jump into (every role except student).
  const ROLE_JUMP: { label: string; icon: typeof ShieldCheck; to: string }[] = [
    { label: "استودیوی مدرس", icon: Video, to: "/panel/instructor" },
    { label: "میز منتور", icon: Compass, to: "/panel/mentor" },
    { label: "استودیوی محتوا", icon: FileText, to: "/panel/content-studio" },
    { label: "میز پشتیبانی", icon: Headset, to: "/panel/support" },
    { label: "مدیریت هوش مصنوعی", icon: Bot, to: "/panel/ai-management" },
    { label: "تلگرام بات", icon: Send, to: "/panel/telegram-bot" },
    { label: "مدیریت Telegram", icon: Bot, to: "/panel/telegram-admin" },
    // Site Studio — permission-gated inside the page itself
    { label: "طراحی سایت (Site Studio)", icon: Blocks, to: "/panel/site-studio" },
    // Only system admin (role === "admin") can see the super admin panel
    ...(user?.role === "admin" ? [{ label: "پنل مدیر سامانه", icon: Shield, to: "/panel/super-admin" }] : []),
  ];

  if (isAdmin === undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <span className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
          <Terminal className="size-6 animate-pulse text-primary" />
          <span className="absolute inset-0 animate-ping rounded-2xl border border-primary/20" />
        </span>
        <p className="font-mono text-xs text-muted-foreground">verifying admin session…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Lock className="size-6" />
        </span>
        <div>
          <p className="text-lg font-bold">دسترسی مدیریت لازم است</p>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            این بخش فقط برای اعضای تیم Genova فعال است. با ایمیل ثبت‌شده در
            فهرست ادمین‌ها وارد شوید (مثلاً <span dir="ltr" className="font-mono">admin@genova.com</span>)
            یا از یک ادمین بخواهید ایمیل شما را اضافه کند.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/">بازگشت به سایت</Link>
        </Button>
      </div>
    );
  }

  const active = ALL_SECTIONS.find((s) => s.key === section)!;

  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="mx-auto flex h-full max-w-[1400px]">
        {/* Console sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-l border-border/70 bg-card/50 p-4 lg:flex">
          <Link to="/" className="flex items-center gap-2.5 px-1">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Terminal className="size-4" />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-tight">Genova</span>
              <span className="block font-mono text-[10px] text-muted-foreground">admin console</span>
            </span>
          </Link>

          <nav className="scrollbar-theme mt-6 flex-1 space-y-5 overflow-y-auto">
            {NAV_GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  {g.title}
                </p>
                <div className="space-y-0.5">
                  {g.items.map((s) => {
                    const notifKey = NOTIF_MAP[s.key];
                    const count = notifCounts && notifKey ? (notifCounts as Record<string, number>)[notifKey] ?? 0 : 0;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setSection(s.key)}
                        className={cn(
                          "relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                          section === s.key
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <s.icon className="size-4" />
                        {s.label}
                        {count > 0 && (
                          <span className="absolute left-2 top-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white animate-pulse">
                            {count > 9 ? "!" : count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-4 space-y-2 border-t border-border/70 pt-3">
            {!isSystemAdmin && (
              <Button asChild variant="ghost" size="sm" className="w-full justify-start rounded-lg text-xs">
                <Link to="/dashboard">
                  <BookOpen className="ml-2 size-4" />
                  پنل دانشجویی
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm" className="w-full justify-start rounded-lg text-xs">
              <Link to="/">
                <Home className="ml-2 size-4" />
                بازگشت به صفحهٔ اصلی
              </Link>
            </Button>
          </div>
        </aside>

        {/* Main column */}
        <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          {/* Console topbar */}
          <header className="z-30 shrink-0 border-b border-border/70 bg-background/90 backdrop-blur-lg">
            <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-6">
              <div className="hidden items-center gap-2 font-mono text-xs text-muted-foreground sm:flex">
                <Terminal className="size-3.5 text-primary" />
                <span>admin</span>
                <span className="text-border">/</span>
                <span className="text-foreground">{active.label}</span>
              </div>

              {/* Mobile nav drawer */}
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 rounded-lg lg:hidden">
                    <Menu className="size-4" />
                    <span className="mr-1 text-xs">بخش‌ها</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <SheetTitle className="sr-only">بخش‌های پنل مدیریت</SheetTitle>
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Terminal className="size-4" />
                    </span>
                    <span className="leading-tight">
                      <span className="block text-sm font-extrabold tracking-tight">Genova</span>
                      <span className="block font-mono text-[10px] text-muted-foreground">admin console</span>
                    </span>
                  </div>
                  <nav className="scrollbar-theme max-h-[60vh] space-y-5 overflow-y-auto">
                    {NAV_GROUPS.map((g) => (
                      <div key={g.title}>
                        <p className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                          {g.title}
                        </p>
                        <div className="space-y-0.5">
                          {g.items.map((s) => {
                            const notifKey = NOTIF_MAP[s.key];
                            const count = notifCounts && notifKey ? (notifCounts as Record<string, number>)[notifKey] ?? 0 : 0;
                            return (
                              <button
                                key={s.key}
                                type="button"
                                onClick={() => {
                                  setSection(s.key);
                                  setMobileNavOpen(false);
                                }}
                                className={cn(
                                  "relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                                  section === s.key
                                    ? "bg-primary/15 text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                                )}
                              >
                                <s.icon className="size-4" />
                                {s.label}
                                {count > 0 && (
                                  <span className="absolute left-2 top-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white animate-pulse">
                                    {count > 9 ? "!" : count}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </nav>
                  <div className="mt-6 space-y-2 border-t border-border/70 pt-4">
                    {!isSystemAdmin && (
                      <Button asChild variant="ghost" size="sm" className="w-full justify-start rounded-lg text-xs">
                        <Link to="/dashboard">
                          <BookOpen className="ml-2 size-4" />
                          پنل دانشجویی
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="ghost" size="sm" className="w-full justify-start rounded-lg text-xs">
                      <Link to="/">
                        <Home className="ml-2 size-4" />
                        بازگشت به صفحهٔ اصلی
                      </Link>
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-2">
                {canRoleSwitch && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      title="جابه‌جایی بین پنل نقش‌ها"
                    >
                      <Repeat className="ml-1.5 size-3.5 text-primary" />
                      سوییچ نقش
                      <ChevronDown className="mr-1 size-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-xs">
                      پنل‌های تیم (به‌جز دانشجو)
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {ROLE_JUMP.map((r) => (
                      <DropdownMenuItem
                        key={r.to}
                        onClick={() => navigate(r.to)}
                        className="cursor-pointer"
                      >
                        <r.icon className="ml-2 size-4" />
                        {r.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                )}
                <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                  <Link to="/" title="بازگشت به صفحهٔ اصلی">
                    <Home className="ml-1.5 size-3.5" />
                    <span className="hidden sm:inline">صفحهٔ اصلی</span>
                  </Link>
                </Button>

              </div>
            </div>
          </header>

          <div className="scrollbar-theme min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {section === "online" && <AdminOnline />}
            {section === "overview" && <AdminOverview />}
            {section === "courses" && <AdminCourses />}
            {section === "questions" && <AdminQuestions />}
            {section === "exams" && <AdminExams />}
            {section === "articles" && <AdminArticles />}
            {section === "workshops" && <AdminWorkshops />}
            {section === "products" && <AdminProducts />}
            {section === "instructors" && <AdminInstructors />}
            {section === "myprofile" && <AdminMyProfile />}
            {section === "examReports" && <AdminExamReports />}
            {section === "offlinePayments" && <AdminOfflinePayments />}
            {section === "users" && <AdminUsers />}
            {section === "orders" && <AdminOrders />}
            {section === "coupons" && <AdminCoupons />}
            {section === "support" && <AdminSupport />}
            {section === "announcements" && <AdminAnnouncements />}
            {section === "comments" && <AdminComments />}
            {section === "payments" && <AdminPayments />}
            {section === "classRequests" && <AdminClassRequests />}
            {section === "studentReports" && <AdminStudentReports />}
            {section === "profiles" && <AdminProfiles />}
            {section === "inbox" && <AdminInbox />}
            {section === "backup" && <AdminBackup />}
            {section === "sync" && <AdminSync />}
            {section === "classManagement" && <AdminClasses />}
            {section === "storeApproval" && <AdminStoreApproval />}
            {section === "discounts" && <AdminDiscounts />}
            {section === "flashSales" && <AdminFlashSales />}
            {section === "promoBanners" && <AdminPromoBanners />}
            {section === "academyPaths" && <AdminAcademyPaths />}
            {section === "certificates" && <AdminCertificates />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Overview ────────────────────────────────────────────────────────────────
function AdminOverview() {
  const { isIran } = useMode();
  const statsConvex = useQuery(api.admin.getAdminStats);
  const revenueConvex = useQuery(api.admin.getRevenueSeries);
  const enrollmentsConvex = useQuery(api.admin.getEnrollmentStats);
  const { data: statsIran } = useApiQuery<any>(isIran ? "/api/admin/stats" : "");
  const stats = isIran ? statsIran : statsConvex;
  const revenue = isIran ? null : revenueConvex;
  const enrollments = isIran ? null : enrollmentsConvex;

  if (!stats) return <Loading />;

  const kpis = [
    { icon: Users, label: "کاربران", value: faNum(stats.userCount), color: "bg-primary/10 text-primary" },
    { icon: DollarSign, label: "درآمد (تومان)", value: faNum(stats.revenue), color: "bg-emerald-500/10 text-emerald-500" },
    { icon: CreditCard, label: "سفارش پرداخت‌شده", value: faNum(stats.paidOrderCount), color: "bg-violet-500/10 text-violet-500" },
    { icon: TrendingUp, label: "میانگین ارزش سفارش", value: faNum(stats.avgOrderValue), color: "bg-amber-500/10 text-amber-500" },
    { icon: Repeat, label: "تکرار خرید (نسبت)", value: faNum(stats.repeatPurchase), color: "bg-sky-500/10 text-sky-500" },
    { icon: ClipboardList, label: "تست‌های انجام‌شده", value: faNum(stats.attemptCount), color: "bg-rose-500/10 text-rose-500" },
    { icon: BarChart3, label: "میانگین درصد آزمون", value: `${faNum(stats.avgTestPercent)}٪`, color: "bg-teal-500/10 text-teal-500" },
    { icon: BookOpen, label: "دوره‌ها", value: faNum(stats.courseCount), color: "bg-indigo-500/10 text-indigo-500" },
    { icon: HelpCircle, label: "سؤالات", value: faNum(stats.questionCount), color: "bg-amber-500/10 text-amber-500" },
    { icon: Ticket, label: "تیکت‌های باز", value: faNum(stats.openTicketCount), color: "bg-red-500/10 text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="نمای کلی" subtitle="system overview" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border/70 shadow-sm">
            <CardContent className="p-4">
              <span className={cn("flex size-8 items-center justify-center rounded-lg", k.color)}>
                <k.icon className="size-4" />
              </span>
              <p className="mt-2.5 text-lg font-extrabold">{k.value}</p>
              <p className="text-[11px] text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">درآمد روزانه</CardTitle>
          </CardHeader>
          <CardContent>
            {(revenue ?? []).length > 0 ? (
              <div className="h-56" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenue ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                    <Bar dataKey="revenue" name="درآمد" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">هنوز فروشی ثبت نشده است.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">ثبت‌نام در دوره‌ها</CardTitle>
          </CardHeader>
          <CardContent>
            {(enrollments ?? []).length > 0 ? (
              <div className="h-56" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={enrollments ?? []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                    <YAxis type="category" dataKey="title" width={130} stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                    <Bar dataKey="count" name="ثبت‌نام" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">داده‌ای موجود نیست.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Courses ─────────────────────────────────────────────────────────────────
function AdminCourses() {
  const { isIran } = useMode();
  const coursesConvex = useQuery(api.admin.adminListCourses);
  const instructorsConvex = useQuery(api.content.listInstructors);
  const { data: coursesIran } = useApiQuery<any[]>(isIran ? "/api/admin/courses" : "");
  const { data: instructorsIran } = useApiQuery<any[]>(isIran ? "/api/content/instructors" : "");
  const courses = isIran ? coursesIran : coursesConvex;
  const instructors = isIran ? instructorsIran : instructorsConvex;
  const create = useMutation(api.admin.adminCreateCourse);
  const update = useMutation(api.admin.adminUpdateCourse);
  const toggle = useMutation(api.admin.adminTogglePublish);
  const remove = useMutation(api.admin.adminDeleteCourse);
  const approve = useMutation(api.courseStudio.approveCourseReview);
  const reject = useMutation(api.courseStudio.rejectCourseReview);
  const [rejecting, setRejecting] = useState<{ id: string; title: string } | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const TIER_LABELS: Record<string, string> = { economy: "اقتصادی", basic: "پایه", plus: "پلاس", premium: "پرمیوم" };

  const empty = {
    title: "", summary: "", price: "0", categoryId: "", instructorId: "", mode: "recorded", bundle: "basic", published: false,
    audienceText: "", prerequisitesText: "", syllabusItems: "",
    pkgEconomy: "", pkgEconomyFeatures: "",
    pkgBasic: "", pkgBasicFeatures: "",
    pkgPlus: "", pkgPlusFeatures: "",
    pkgPremium: "", pkgPremiumFeatures: "",
  };
  type CourseForm = typeof empty;
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; course: any } | null>(null);
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [activeTab, setActiveTab] = useState("basic");

  const openCreate = () => { setForm(empty); setErr(null); setActiveTab("basic"); setDialog({ mode: "create" }); };
  const openEdit = (c: any) => {
    const pp = c.packagePrices ?? [];
    const getP = (tier: string) => pp.find((p: any) => p.tier === tier);
    const eco = getP("economy"), bsc = getP("basic"), pls = getP("plus"), prm = getP("premium");
    setForm({
      title: c.title,
      summary: c.summary,
      price: String(c.discountPrice ?? c.price),
      categoryId: c.categoryId,
      instructorId: c.instructorId,
      mode: c.mode,
      bundle: c.bundle,
      published: c.published,
      audienceText: (c.audience ?? []).join("\n"),
      prerequisitesText: (c.prerequisites ?? []).join("\n"),
      syllabusItems: (c.syllabus ?? []).map((s: any) => `${s.title} | ${s.durationMin} | ${s.free ? 'رایگان' : 'پولی'}`).join("\n"),
      pkgEconomy: eco ? String(eco.price) : "", pkgEconomyFeatures: eco ? eco.features.join("\n") : "",
      pkgBasic: bsc ? String(bsc.price) : "", pkgBasicFeatures: bsc ? bsc.features.join("\n") : "",
      pkgPlus: pls ? String(pls.price) : "", pkgPlusFeatures: pls ? pls.features.join("\n") : "",
      pkgPremium: prm ? String(prm.price) : "", pkgPremiumFeatures: prm ? prm.features.join("\n") : "",
    });
    setErr(null);
    setActiveTab("basic");
    setDialog({ mode: "edit", course: c });
  };

  const parseLines = (t: string) => t.split("\n").map((s) => s.trim()).filter(Boolean);
  const parseSyllabus = (t: string) => parseLines(t).map((line, i) => {
    const parts = line.split("|").map((s) => s.trim());
    return { title: parts[0] || `جلسه ${i + 1}`, durationMin: parseInt(parts[1]) || 30, free: parts[2]?.includes("رایگان") ?? false };
  });

  const handleSave = async () => {
    setErr(null);
    if (!form.title.trim() || !form.categoryId || !form.instructorId) {
      setErr("عنوان، دسته و مدرس الزامی است.");
      return;
    }
    setBusy(true);
    try {
      const packagePrices = [
        { tier: "economy" as const, price: Number(form.pkgEconomy) || 0, features: parseLines(form.pkgEconomyFeatures) },
        { tier: "basic" as const, price: Number(form.pkgBasic) || 0, features: parseLines(form.pkgBasicFeatures) },
        { tier: "plus" as const, price: Number(form.pkgPlus) || 0, features: parseLines(form.pkgPlusFeatures) },
        { tier: "premium" as const, price: Number(form.pkgPremium) || 0, features: parseLines(form.pkgPremiumFeatures) },
      ].filter((p) => p.price > 0 || p.features.length > 0);
      const payload = {
        title: form.title,
        summary: form.summary,
        price: Number(form.price) || 0,
        categoryId: form.categoryId as any,
        instructorId: form.instructorId as any,
        mode: form.mode,
        bundle: form.bundle,
        published: form.published,
        audience: parseLines(form.audienceText),
        prerequisites: parseLines(form.prerequisitesText),
        syllabus: parseSyllabus(form.syllabusItems),
        packagePrices: packagePrices.length > 0 ? packagePrices : undefined,
      };
      if (dialog?.mode === "edit") {
        await update({ id: dialog.course._id, ...payload });
      } else {
        await create({ ...payload, slug: "" });
      }
      setDialog(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="دوره‌ها" subtitle="content / courses" count={courses?.length} />
        <Button className="rounded-lg" onClick={openCreate}>
          <Plus className="ml-1.5 size-4" />
          دورهٔ جدید
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>دسته</TableHead>
                <TableHead>قیمت</TableHead>
                <TableHead>دانشجو</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(courses ?? []).map((c) => (
                <TableRow key={c._id}>
                  <TableCell className="max-w-56 truncate font-medium">{c.title}</TableCell>
                  <TableCell className="text-muted-foreground">{c.category}</TableCell>
                  <TableCell>{formatPrice(c.discountPrice ?? c.price)}</TableCell>
                  <TableCell>{faNum(c.studentsCount)}</TableCell>
                  <TableCell><CourseStatusChip c={c} /></TableCell>
                  <TableCell>
                    {c.status === "pending" && (
                      <div className="mb-1.5 flex justify-end gap-1.5">
                        <Button size="sm" className="h-7 rounded-md text-xs" onClick={() => approve({ courseId: c._id })}>
                          <CheckCircle2 className="ml-1 size-3.5" />
                          تأیید و انتشار
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-md border-destructive/40 text-xs text-destructive"
                          onClick={() => { setRejecting({ id: c._id, title: c.title }); setRejectNote(""); }}
                        >
                          <XCircle className="ml-1 size-3.5" />
                          رد
                        </Button>
                      </div>
                    )}
                    <PublishActions
                      published={c.published}
                      onToggle={() => toggle({ collection: "courses", id: c._id, published: !c.published })}
                      onEdit={() => openEdit(c)}
                      onDelete={() => remove({ id: c._id })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "ویرایش دوره" : "دورهٔ جدید"}</DialogTitle>
            <DialogDescription>
              می‌توانی به‌عنوان پیش‌نویس ذخیره کنی و بعداً پس از تکمیل، منتشرش کنی.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="basic" className="flex-1">اطلاعات پایه</TabsTrigger>
                <TabsTrigger value="detail" className="flex-1">جزئیات دوره</TabsTrigger>
                <TabsTrigger value="packages" className="flex-1">پکیج‌ها</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-3 pt-2">
                <Input placeholder="عنوان دوره" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Textarea placeholder="خلاصهٔ دوره" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input placeholder="قیمت (تومان)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">کلاس زنده</SelectItem>
                      <SelectItem value="recorded">ضبط‌شده</SelectItem>
                      <SelectItem value="hybrid">ترکیبی</SelectItem>
                    </SelectContent>
                  </Select>
                  <CategoryField
                    value={form.categoryId || undefined}
                    onValueChange={(v) => setForm({ ...form, categoryId: v })}
                  />
                  <Select value={form.instructorId || undefined} onValueChange={(v) => setForm({ ...form, instructorId: v })}>
                    <SelectTrigger><SelectValue placeholder="مدرس" /></SelectTrigger>
                    <SelectContent>
                      {(instructors ?? []).map((i) => (
                        <SelectItem key={i._id} value={i._id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <PublishPicker value={form.published} onChange={(v) => setForm({ ...form, published: v })} />
              </TabsContent>
              <TabsContent value="detail" className="space-y-3 pt-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">مناسب چه کسانی است؟ (هر خط یک آیتم)</label>
                  <Textarea placeholder="دانشجویان میکروبیولوژی سال آخر\nعلاقه‌مندان به ژنتیک مولکولی" rows={3} value={form.audienceText} onChange={(e) => setForm({ ...form, audienceText: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">پیش‌نیازها (هر خط یک آیتم)</label>
                  <Textarea placeholder="زیست‌شناسی پایه\nآشنایی با شیمی آلی" rows={3} value={form.prerequisitesText} onChange={(e) => setForm({ ...form, prerequisitesText: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">سرفصل‌ها (هر خط: عنوان | دقیقه | رایگان/پولی)</label>
                  <Textarea placeholder="مقدمه و معرفی | 30 | رایگان\nسلول و اجزای آن | 60 | پولی\nتکثیر DNA | 45 | پولی" rows={5} value={form.syllabusItems} onChange={(e) => setForm({ ...form, syllabusItems: e.target.value })} className="font-mono text-xs" />
                </div>
              </TabsContent>
              <TabsContent value="packages" className="space-y-3 pt-2">
                <p className="text-xs text-muted-foreground">قیمت هر پکیج و امکانات آن را تنظیم کنید. پکیج‌هایی که قیمت ندارند در سایت نمایش داده نمی‌شوند.</p>
                {(["economy", "basic", "plus", "premium"] as const).map((tier) => (
                  <div key={tier} className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                    <span className="text-xs font-bold text-primary">پکیج {TIER_LABELS[tier]}</span>
                    <Input placeholder={`قیمت ${TIER_LABELS[tier]} (تومان)`} value={form[`pkg${tier.charAt(0).toUpperCase() + tier.slice(1)}` as keyof CourseForm] as string} onChange={(e) => setForm({ ...form, [`pkg${tier.charAt(0).toUpperCase() + tier.slice(1)}`]: e.target.value } as any)} />
                    <Textarea placeholder={`امکانات ${TIER_LABELS[tier]} (هر خط یک آیتم)`} rows={2} value={form[`pkg${tier.charAt(0).toUpperCase() + tier.slice(1)}Features` as keyof CourseForm] as string} onChange={(e) => setForm({ ...form, [`pkg${tier.charAt(0).toUpperCase() + tier.slice(1)}Features`]: e.target.value } as any)} className="text-xs" />
                  </div>
                ))}
              </TabsContent>
            </Tabs>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button className="w-full" onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
              {dialog?.mode === "edit" ? "ذخیرهٔ تغییرات" : "ساخت دوره"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

<Dialog open={rejecting !== null} onOpenChange={(o) => { if (!o) setRejecting(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>رد دوره: {rejecting?.title}</DialogTitle>
            <DialogDescription>
              دلیل بازگشت را بنویسید تا مدرس ببیند و اصلاح کند؛ دوره پیش‌نویس باقی می‌ماند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea rows={3} placeholder="مثلاً: توضیحات دوره را کامل‌تر کنید…" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
            <Button
              variant="destructive"
              className="rounded-lg"
              disabled={!rejecting}
              onClick={async () => {
                if (!rejecting) return;
                try {
                  await reject({ courseId: rejecting.id as any, note: rejectNote });
                  setRejecting(null);
                  toast.success("دوره رد و به مدرس بازگردانده شد");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "خطا");
                }
              }}
            >
              <XCircle className="ml-1.5 size-4" />
              رد و بازگشت به مدرس
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Questions ───────────────────────────────────────────────────────────────
function AdminQuestions() {
  const groups = useQuery(api.admin.adminGetQuestionGroups);
  const create = useMutation(api.admin.adminCreateQuestion);
  const updateQuestion = useMutation(api.admin.adminUpdateQuestion);
  const removeQuestion = useMutation(api.admin.adminDeleteQuestion);
  const removeCategory = useMutation(api.admin.adminDeleteCategory);
  const updateCategory = useMutation(api.admin.adminUpdateCategory);
  const saveGenerated = useMutation(api.admin.saveGeneratedQuestions);
  const generateAction = useAction(api.aiActions.generateQuestions);
  const [err, setErr] = useState<string | null>(null);

  // Expanded group
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Add question form
  const empty = { text: "", options: ["", "", "", ""], correctIndex: "0", explanation: "", difficulty: "1" };
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(empty);
  const [addTopicId, setAddTopicId] = useState("");

  // Edit question form
  const [editQ, setEditQ] = useState<any>(null);
  const [editForm, setEditForm] = useState(empty);

  // Edit category name
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");

  // AI generation state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState("10");
  const [aiDifficulty, setAiDifficulty] = useState("1");
  const [aiTopicId, setAiTopicId] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<any[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) { setAiError("پرامپت را وارد کنید"); return; }
    if (!aiTopicId) { setAiError("موضوع را انتخاب کنید"); return; }
    setAiGenerating(true);
    setAiError(null);
    setAiPreview([]);
    setAiSaved(false);
    try {
      const result = await generateAction({ prompt: aiPrompt.trim(), count: Number(aiCount) || 10, difficulty: Number(aiDifficulty) || 1 });
      setAiPreview(result.questions);
    } catch (e: any) { setAiError(e?.message ?? "خطا در تولید"); } finally { setAiGenerating(false); }
  };

  const handleSaveGenerated = async () => {
    if (aiPreview.length === 0 || !aiTopicId) return;
    setAiSaving(true);
    try {
      await saveGenerated({ questions: aiPreview.map((q) => ({ text: q.text, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation, difficulty: q.difficulty ?? Number(aiDifficulty) })), topicId: aiTopicId as any });
      setAiSaved(true);
    } catch (e: any) { setAiError(e?.message ?? "خطا"); } finally { setAiSaving(false); }
  };

  const handleAddQuestion = async () => {
    if (!addTopicId) { setErr("موضوع را انتخاب کنید"); return; }
    try {
      await create({ text: addForm.text, options: addForm.options.filter((o) => o.trim()), correctIndex: Number(addForm.correctIndex), explanation: addForm.explanation, topicId: addTopicId as any, difficulty: Number(addForm.difficulty) });
      setAddOpen(false);
      setAddForm(empty);
      setAddTopicId("");
    } catch (e) { setErr(e instanceof Error ? e.message : "خطا"); }
  };

  const handleUpdateQuestion = async () => {
    if (!editQ) return;
    try {
      await updateQuestion({ id: editQ._id, text: editForm.text, options: editForm.options.filter((o) => o.trim()), correctIndex: Number(editForm.correctIndex), explanation: editForm.explanation, difficulty: Number(editForm.difficulty) });
      setEditQ(null);
    } catch (e) { setErr(e instanceof Error ? e.message : "خطا"); }
  };

  const handleDeleteCategory = async (catId: string, name: string, count: number) => {
    if (!confirm(`گروه «${name}» و ${count} سؤال آن حذف شود؟`)) return;
    try { await removeCategory({ categoryId: catId as any }); } catch (e) { setErr(e instanceof Error ? e.message : "خطا"); }
  };

  const totalQuestions = groups?.reduce((sum, g) => sum + g.questionCount, 0) ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="بانک سؤال" subtitle="content / question bank" count={totalQuestions} />
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-lg" onClick={() => setAiOpen(true)}>
            <Sparkles className="ml-1.5 size-4" />
            تولید با هوش مصنوعی
          </Button>
          <Button className="rounded-lg" onClick={() => setAddOpen(true)}>
            <Plus className="ml-1.5 size-4" />
            سؤال جدید
          </Button>
        </div>
      </div>

      {/* Groups list */}
      <div className="space-y-3">
        {groups === undefined && (
          <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        )}
        {groups?.map((g) => {
          const isExpanded = expandedGroup === g.categoryId;
          return (
            <Card key={g.categoryId} className="border-border/70 shadow-sm overflow-hidden">
              {/* Group header */}
              <button
                onClick={() => setExpandedGroup(isExpanded ? null : g.categoryId)}
                className="flex w-full items-center justify-between p-4 text-right transition-colors hover:bg-accent/30"
              >
                <div className="flex items-center gap-3">
                  <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                  <div>
                    <p className="font-bold text-sm">{g.categoryName}</p>
                    <p className="text-xs text-muted-foreground">{g.questionCount} سؤال</p>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {/* Edit category name */}
                  {editCatId === g.categoryId ? (
                    <div className="flex items-center gap-1">
                      <Input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} className="h-7 w-40 text-xs" autoFocus onKeyDown={(e) => { if (e.key === "Enter") { updateCategory({ categoryId: g.categoryId as any, name: editCatName }); setEditCatId(null); } }} />
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { updateCategory({ categoryId: g.categoryId as any, name: editCatName }); setEditCatId(null); }}>✓</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditCatId(null)}>✗</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditCatId(g.categoryId); setEditCatName(g.categoryName); }}>
                      <Pencil className="size-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleDeleteCategory(g.categoryId, g.categoryName, g.questionCount)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </button>
              {/* Expanded questions */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/30 p-3 space-y-2">
                  {g.questions.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">هنوز سؤالی نیست</p>}
                  {g.questions.map((q: any) => (
                    <div key={q._id} className="flex items-start gap-3 rounded-lg border border-border/50 bg-card p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-6">{q.text}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {q.options.map((opt: string, oi: number) => (
                            <span key={oi} className={cn("inline-block rounded-md px-2 py-0.5 text-[11px]", oi === q.correctIndex ? "bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>
                              {oi === q.correctIndex ? "✓ " : ""}{opt}
                            </span>
                          ))}
                        </div>
                        {q.explanation && <p className="mt-1.5 text-[11px] text-muted-foreground">💡 {q.explanation}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {q.difficulty === 1 ? "آسان" : q.difficulty === 2 ? "متوسط" : "سخت"}
                        </Badge>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditQ(q); setEditForm({ text: q.text, options: [...q.options], correctIndex: String(q.correctIndex), explanation: q.explanation, difficulty: String(q.difficulty) }); }}>
                          <Pencil className="size-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={async () => { if (confirm("حذف شود؟")) { try { await removeQuestion({ id: q._id }); } catch (e) { setErr(e instanceof Error ? e.message : "خطا"); } } }}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}

      {/* ── Add Question Dialog ──────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>سؤال تستی جدید</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <CategoryField value={addTopicId || undefined} onValueChange={(v) => setAddTopicId(v)} placeholder="انتخاب موضوع…" />
            <Textarea placeholder="متن سؤال" rows={2} value={addForm.text} onChange={(e) => setAddForm({ ...addForm, text: e.target.value })} />
            {addForm.options.map((opt, i) => (
              <Input key={i} placeholder={`گزینهٔ ${i + 1}${i === Number(addForm.correctIndex) ? " (صحیح)" : ""}`} value={opt} onChange={(e) => setAddForm({ ...addForm, options: addForm.options.map((o, oi) => (oi === i ? e.target.value : o)) })} />
            ))}
            <div className="grid grid-cols-2 gap-3">
              <Select value={addForm.correctIndex} onValueChange={(v) => setAddForm({ ...addForm, correctIndex: v })}>
                <SelectTrigger><SelectValue placeholder="گزینهٔ صحیح" /></SelectTrigger>
                <SelectContent>{[0, 1, 2, 3].map((i) => <SelectItem key={i} value={String(i)}>گزینهٔ {i + 1}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={addForm.difficulty} onValueChange={(v) => setAddForm({ ...addForm, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="1">آسان</SelectItem><SelectItem value="2">متوسط</SelectItem><SelectItem value="3">سخت</SelectItem></SelectContent>
              </Select>
            </div>
            <Textarea placeholder="پاسخ تشریحی" rows={2} value={addForm.explanation} onChange={(e) => setAddForm({ ...addForm, explanation: e.target.value })} />
            <Button className="w-full" onClick={handleAddQuestion}>ذخیرهٔ سؤال</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Question Dialog ──────────────────────────────── */}
      <Dialog open={!!editQ} onOpenChange={(v) => { if (!v) setEditQ(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>ویرایش سؤال</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea placeholder="متن سؤال" rows={2} value={editForm.text} onChange={(e) => setEditForm({ ...editForm, text: e.target.value })} />
            {editForm.options.map((opt, i) => (
              <Input key={i} placeholder={`گزینهٔ ${i + 1}${i === Number(editForm.correctIndex) ? " (صحیح)" : ""}`} value={opt} onChange={(e) => setEditForm({ ...editForm, options: editForm.options.map((o, oi) => (oi === i ? e.target.value : o)) })} />
            ))}
            <div className="grid grid-cols-2 gap-3">
              <Select value={editForm.correctIndex} onValueChange={(v) => setEditForm({ ...editForm, correctIndex: v })}>
                <SelectTrigger><SelectValue placeholder="گزینهٔ صحیح" /></SelectTrigger>
                <SelectContent>{[0, 1, 2, 3].map((i) => <SelectItem key={i} value={String(i)}>گزینهٔ {i + 1}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={editForm.difficulty} onValueChange={(v) => setEditForm({ ...editForm, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="1">آسان</SelectItem><SelectItem value="2">متوسط</SelectItem><SelectItem value="3">سخت</SelectItem></SelectContent>
              </Select>
            </div>
            <Textarea placeholder="پاسخ تشریحی" rows={2} value={editForm.explanation} onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })} />
            <Button className="w-full" onClick={handleUpdateQuestion}>ذخیره تغییرات</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── AI Generation Dialog ──────────────────────────────── */}
      <Dialog open={aiOpen} onOpenChange={(v) => { setAiOpen(v); if (!v) { setAiPreview([]); setAiError(null); setAiSaved(false); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" />تولید سؤال با هوش مصنوعی</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea placeholder="مثلاً: ده سؤال تستی درباره رنگ‌آمیزی گرم بنویس" rows={3} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} className="text-sm" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1"><label className="text-xs font-medium">تعداد</label><Input type="number" min="1" max="30" value={aiCount} onChange={(e) => setAiCount(e.target.value)} className="h-9 text-sm" /></div>
              <div className="space-y-1"><label className="text-xs font-medium">سطح</label><Select value={aiDifficulty} onValueChange={setAiDifficulty}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">آسان</SelectItem><SelectItem value="2">متوسط</SelectItem><SelectItem value="3">سخت</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><label className="text-xs font-medium">موضوع</label><CategoryField value={aiTopicId || undefined} onValueChange={(v) => setAiTopicId(v)} placeholder="انتخاب موضوع…" /></div>
            </div>
            <Button onClick={handleGenerate} disabled={aiGenerating || !aiPrompt.trim() || !aiTopicId} className="w-full gap-2">
              {aiGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{aiGenerating ? "در حال تولید..." : "تولید سؤالات"}
            </Button>
            {aiError && <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{aiError}</div>}
            {aiPreview.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">پیش‌نمایش ({aiPreview.length} سؤال)</h4>
                  <Button size="sm" onClick={handleSaveGenerated} disabled={aiSaving || aiSaved}>
                    {aiSaving ? <Loader2 className="ml-1.5 size-3.5 animate-spin" /> : <Save className="ml-1.5 size-3.5" />}{aiSaved ? "ذخیره شد ✓" : "ذخیره در بانک"}
                  </Button>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto rounded-lg border border-border p-3">
                  {aiPreview.map((q, i) => (
                    <div key={i} className="rounded-lg border border-border/50 p-3 text-sm">
                      <p className="font-medium">سؤال {i + 1}: {q.text}</p>
                      <div className="mt-2 space-y-1">{q.options.map((opt: string, oi: number) => (
                        <p key={oi} className={cn("text-xs", oi === q.correctIndex ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>{oi === q.correctIndex ? "✓" : "○"} {opt}</p>
                      ))}</div>
                      <p className="mt-2 text-xs text-muted-foreground">💡 {q.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Exams ───────────────────────────────────────────────────────────────────
function AdminExams() {
  const exams = useQuery(api.admin.adminListExams);
  const create = useMutation(api.admin.adminCreateExam);
  const toggle = useMutation(api.admin.adminToggleExamPublish);
  const remove = useMutation(api.admin.adminDeleteExam);

  const empty = { title: "", description: "", durationMinutes: "30", free: false, diagnostic: false, topicId: "", count: "10", published: false };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    setErr(null);
    if (!form.title.trim()) { setErr("عنوان آزمون لازم است."); return; }
    setBusy(true);
    try {
      await create({
        title: form.title,
        description: form.description,
        durationMinutes: Number(form.durationMinutes) || 30,
        free: form.free,
        diagnostic: form.diagnostic,
        topicId: form.topicId && form.topicId !== "all" ? (form.topicId as any) : undefined,
        count: Number(form.count) || 10,
        published: form.published,
      });
      setOpen(false);
      setForm(empty);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="آزمون‌ها" subtitle="content / exams" count={exams?.length} />
        <Button className="rounded-lg" onClick={() => setOpen(true)}>
          <Plus className="ml-1.5 size-4" />
          آزمون جدید
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>تعداد سؤال</TableHead>
                <TableHead>زمان</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(exams ?? []).map((e) => (
                <TableRow key={e._id}>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>{faNum(e.questionCount)}</TableCell>
                  <TableCell>{faNum(e.durationMinutes)} دقیقه</TableCell>
                  <TableCell className="text-muted-foreground">{e.kindLabel}</TableCell>
                  <TableCell><StatusChip published={e.published} /></TableCell>
                  <TableCell>
                    <PublishActions
                      published={e.published}
                      onToggle={() => toggle({ id: e._id, published: !e.published })}
                      onDelete={() => remove({ id: e._id })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>آزمون جدید</DialogTitle>
            <DialogDescription>
              سؤال‌ها به‌صورت خودکار از بانک سؤال (موضوع انتخابی) انتخاب می‌شوند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="عنوان آزمون" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="توضیح کوتاه" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input type="number" placeholder="زمان (دقیقه)" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
              <Input type="number" placeholder="تعداد سؤال" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} />
              <CategoryField
                value={form.topicId || undefined}
                onValueChange={(v) => setForm({ ...form, topicId: v })}
                allValue="all"
                allLabel="همهٔ موضوعات"
                placeholder="انتخاب موضوع یا ساخت موضوع جدید…"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.free} onChange={(e) => setForm({ ...form, free: e.target.checked })} />
                رایگان
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.diagnostic} onChange={(e) => setForm({ ...form, diagnostic: e.target.checked })} />
                آزمون تعیین سطح
              </label>
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <PublishPicker value={form.published} onChange={(v) => setForm({ ...form, published: v })} />
            <Button className="w-full" onClick={handleCreate} disabled={busy}>
              {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
              ساخت آزمون
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Articles ────────────────────────────────────────────────────────────────
function AdminArticles() {
  const articles = useQuery(api.admin.adminListArticles);
  const create = useMutation(api.admin.adminCreateArticle);
  const update = useMutation(api.admin.adminUpdateArticle);
  const toggle = useMutation(api.admin.adminTogglePublish);
  const remove = useMutation(api.admin.adminDeleteArticle);
  const saveGenerated = useMutation(api.admin.adminSaveGeneratedArticles);
  const generateArticleAction = useAction(api.aiActions.generateArticles);

  const empty = { title: "", category: "", excerpt: "", body: "", authorName: "", published: false };
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; article: any } | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  // AI generation state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState(3);
  const [aiCategory, setAiCategory] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResults, setAiResults] = useState<{ title: string; category: string; excerpt: string; body: string }[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSaving, setAiSaving] = useState(false);

  const openCreate = () => { setForm(empty); setDialog({ mode: "create" }); };
  const openEdit = (a: any) => {
    setForm({ title: a.title, category: a.category, excerpt: a.excerpt, body: a.body, authorName: a.authorName, published: a.published });
    setDialog({ mode: "edit", article: a });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setBusy(true);
    try {
      const payload = {
        title: form.title,
        slug: "",
        category: form.category,
        excerpt: form.excerpt,
        body: form.body,
        authorName: form.authorName,
        readTime: Math.max(1, Math.round(form.body.split(/\s+/).length / 250)),
        published: form.published,
      };
      if (dialog?.mode === "edit") {
        const { slug: _slug, ...rest } = payload;
        await update({ id: dialog.article._id, ...rest });
      } else {
        await create(payload);
      }
      setDialog(null);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiError(null);
    setAiResults([]);
    try {
      const result = await generateArticleAction({
        prompt: aiPrompt,
        count: aiCount,
        category: aiCategory,
      });
      setAiResults(result.articles);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "خطا در تولید مقالات");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAISave = async () => {
    if (aiResults.length === 0) return;
    setAiSaving(true);
    try {
      await saveGenerated({
        articles: aiResults,
        authorName: "تیم Genova",
        published: false,
      });
      setAiResults([]);
      setAiDialogOpen(false);
      setAiPrompt("");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "خطا در ذخیره");
    } finally {
      setAiSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="مقالات رایگان" subtitle="content / articles" count={articles?.length} />
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-lg" onClick={() => { setAiDialogOpen(true); setAiResults([]); setAiError(null); }}>
            <Sparkles className="ml-1.5 size-4" />
            تولید با هوش مصنوعی
          </Button>
          <Button className="rounded-lg" onClick={openCreate}>
            <Plus className="ml-1.5 size-4" />
            مطلب جدید
          </Button>
        </div>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>دسته</TableHead>
                <TableHead>نویسنده</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(articles ?? []).map((a) => (
                <TableRow key={a._id}>
                  <TableCell className="max-w-md truncate font-medium">{a.title}</TableCell>
                  <TableCell className="text-muted-foreground">{a.categoryLabel}</TableCell>
                  <TableCell className="text-muted-foreground">{a.authorName}</TableCell>
                  <TableCell><StatusChip published={a.published} /></TableCell>
                  <TableCell>
                    <PublishActions
                      published={a.published}
                      onToggle={() => toggle({ collection: "articles", id: a._id, published: !a.published })}
                      onEdit={() => openEdit(a)}
                      onDelete={() => remove({ id: a._id })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "ویرایش مطلب" : "مطلب جدید"}</DialogTitle>
            <DialogDescription>
              محتوا را می‌توانی پیش‌نویس نگه داری و پس از بازبینی علمی منتشرش کنی.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input placeholder="دسته (مثلاً روش مطالعه)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <Input placeholder="نویسنده" value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} />
            </div>
            <Textarea placeholder="خلاصه (برای کارت)" rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
            <Textarea placeholder="متن کامل (پاراگراف‌ها با خط خالی جدا شوند)" rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <PublishPicker value={form.published} onChange={(v) => setForm({ ...form, published: v })} />
            <Button className="w-full" onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
              {dialog?.mode === "edit" ? "ذخیرهٔ تغییرات" : "ذخیرهٔ مطلب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={(o) => { if (!o) { setAiDialogOpen(false); setAiResults([]); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              تولید مقاله با هوش مصنوعی
            </DialogTitle>
            <DialogDescription>
              پرامپت و تنظیمات را وارد کنید و مقالات را تولید کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="پرامپت (مثلاً مقاله‌ای درباره رنگ‌آمیزی باکتری‌ها بنویس)"
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">تعداد مقالات</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={aiCount}
                  onChange={(e) => setAiCount(Number(e.target.value) || 3)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">دسته‌بندی (اختیاری)</label>
                <Input
                  placeholder="مثلاً میکروبیولوژی"
                  value={aiCategory}
                  onChange={(e) => setAiCategory(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleAIGenerate} disabled={aiGenerating || !aiPrompt.trim()} className="w-full">
              {aiGenerating ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Sparkles className="ml-1.5 size-4" />}
              {aiGenerating ? "در حال تولید..." : "تولید مقالات"}
            </Button>
            {aiError && <p className="text-sm text-destructive">{aiError}</p>}
            {aiResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{aiResults.length} مقاله تولید شد:</p>
                {aiResults.map((art, i) => (
                  <Card key={i} className="border-border/70">
                    <CardContent className="space-y-2 p-4">
                      <h4 className="font-bold">{art.title}</h4>
                      <p className="text-xs text-muted-foreground">دسته: {art.category}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{art.excerpt}</p>
                      <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">{art.body}</p>
                    </CardContent>
                  </Card>
                ))}
                <Button onClick={handleAISave} disabled={aiSaving} className="w-full">
                  {aiSaving ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
                  {aiSaving ? "در حال ذخیره..." : `ذخیره ${aiResults.length} مقاله در سایت`}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Workshops ───────────────────────────────────────────────────────────────
function AdminWorkshops() {
  const workshops = useQuery(api.admin.adminListWorkshops);
  const instructors = useQuery(api.content.listInstructors);
  const create = useMutation(api.admin.adminCreateWorkshop);
  const update = useMutation(api.admin.adminUpdateWorkshop);
  const toggle = useMutation(api.admin.adminTogglePublish);
  const remove = useMutation(api.admin.adminDeleteWorkshop);

  const empty = { title: "", instructorId: "", topic: "", date: "", time: "۱۸:۰۰", capacity: "30", price: "0", description: "", free: false, expertTalk: false, published: false };
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; workshop: any } | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const openCreate = () => { setForm(empty); setDialog({ mode: "create" }); };
  const openEdit = (w: any) => {
    setForm({
      title: w.title,
      instructorId: w.instructorId,
      topic: w.topic,
      date: w.date,
      time: w.time,
      capacity: String(w.capacity),
      price: String(w.price),
      description: w.description,
      free: w.free,
      expertTalk: w.expertTalk,
      published: w.published,
    });
    setDialog({ mode: "edit", workshop: w });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.instructorId) return;
    setBusy(true);
    try {
      const payload = {
        title: form.title,
        slug: "",
        instructorId: form.instructorId as any,
        topic: form.topic,
        date: form.date,
        time: form.time,
        capacity: Number(form.capacity) || 30,
        price: Number(form.price) || 0,
        description: form.description,
        free: form.free || Number(form.price) === 0,
        expertTalk: form.expertTalk,
        published: form.published,
      };
      if (dialog?.mode === "edit") {
        const { slug: _slug, ...rest } = payload;
        await update({ id: dialog.workshop._id, ...rest });
      } else {
        await create(payload);
      }
      setDialog(null);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="کارگاه‌ها" subtitle="content / workshops" count={workshops?.length} />
        <Button className="rounded-lg" onClick={openCreate}>
          <Plus className="ml-1.5 size-4" />
          کارگاه جدید
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>مدرس</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>ظرفیت</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(workshops ?? []).map((w) => (
                <TableRow key={w._id}>
                  <TableCell className="max-w-md truncate font-medium">{w.title}</TableCell>
                  <TableCell className="text-muted-foreground">{w.instructor}</TableCell>
                  <TableCell className="text-muted-foreground">{w.date ? formatJalaliDate(new Date(w.date).getTime()) : "—"}</TableCell>
                  <TableCell>{faNum(w.registeredCount)}/{faNum(w.capacity)}</TableCell>
                  <TableCell><StatusChip published={w.published} /></TableCell>
                  <TableCell>
                    <PublishActions
                      published={w.published}
                      onToggle={() => toggle({ collection: "workshops", id: w._id, published: !w.published })}
                      onEdit={() => openEdit(w)}
                      onDelete={() => remove({ id: w._id })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "ویرایش کارگاه" : "کارگاه جدید"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Select value={form.instructorId || undefined} onValueChange={(v) => setForm({ ...form, instructorId: v })}>
              <SelectTrigger><SelectValue placeholder="مدرس" /></SelectTrigger>
              <SelectContent>
                {(instructors ?? []).map((i) => (
                  <SelectItem key={i._id} value={i._id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="موضوع" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <JalaliDatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
              <Input placeholder="ساعت" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              <Input type="number" placeholder="ظرفیت" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <Input type="number" placeholder="قیمت (تومان)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Textarea placeholder="توضیحات" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.expertTalk} onChange={(e) => setForm({ ...form, expertTalk: e.target.checked })} />
                نشست رایگان (Expert Talk)
              </label>
            </div>
            <PublishPicker value={form.published} onChange={(v) => setForm({ ...form, published: v })} />
            <Button className="w-full" onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
              {dialog?.mode === "edit" ? "ذخیرهٔ تغییرات" : "ساخت کارگاه"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Products ────────────────────────────────────────────────────────────────
function AdminProducts() {
  const products = useQuery(api.admin.adminListProducts);
  const create = useMutation(api.admin.adminCreateProduct);
  const update = useMutation(api.admin.adminUpdateProduct);
  const toggle = useMutation(api.admin.adminTogglePublish);
  const remove = useMutation(api.admin.adminDeleteProduct);
  const getUploadUrl = useMutation(api.upload.getUploadUrl);

  const empty = { title: "", type: "flashcards", description: "", price: "0", published: false, coverImage: "", stock: "0" };
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; product: any } | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const coverRef = useRef<HTMLInputElement | null>(null);

  const openCreate = () => { setForm(empty); setCoverFile(null); setDialog({ mode: "create" }); };
  const openEdit = (p: any) => {
    setForm({ title: p.title, type: p.type, description: p.description, price: String(p.price), published: p.published, coverImage: p.coverImage ?? "", stock: String(p.stock ?? 0) });
    setCoverFile(null);
    setDialog({ mode: "edit", product: p });
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      let coverUrl = form.coverImage || undefined;
      if (coverFile) {
        const url = await getUploadUrl();
        coverUrl = await uploadBlob(url, coverFile);
      }
      const payload = { title: form.title, type: form.type, description: form.description, price: Number(form.price) || 0, published: form.published, coverImage: coverUrl, stock: Number(form.stock) || 0 };
      if (dialog?.mode === "edit") {
        await update({ id: dialog.product._id, ...payload });
      } else {
        await create(payload);
      }
      setDialog(null);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const typeLabels: Record<string, string> = { flashcards: "فلش‌کارت", guide: "کتابچهٔ راهنما", poster: "پوستر", notes: "جزوه", book: "کتاب", package: "بسته آموزشی", other: "سایر" };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="محصولات فیزیکی" subtitle="content / products" count={products?.length} />
        <Button className="rounded-lg" onClick={openCreate}>
          <Plus className="ml-1.5 size-4" />
          محصول جدید
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تصویر</TableHead>
                <TableHead>عنوان</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>قیمت</TableHead>
                <TableHead>موجودی</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(products ?? []).map((p) => (
                <TableRow key={p._id}>
                  <TableCell>
                    {p.coverImage ? (
                      <img src={p.coverImage} alt={p.title} className="size-10 rounded-md object-cover" />
                    ) : (
                      <span className="flex size-10 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md truncate font-medium">{p.title}</TableCell>
                  <TableCell className="text-muted-foreground">{typeLabels[p.type] ?? p.type}</TableCell>
                  <TableCell>{formatPrice(p.price)}</TableCell>
                  <TableCell className="font-mono text-xs">{p.stock ?? 0}</TableCell>
                  <TableCell><StatusChip published={p.published} /></TableCell>
                  <TableCell>
                    <PublishActions
                      published={p.published}
                      onToggle={() => toggle({ collection: "products", id: p._id, published: !p.published })}
                      onEdit={() => openEdit(p)}
                      onDelete={() => remove({ id: p._id })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto scrollbar-theme">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "ویرایش محصول" : "محصول جدید"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flashcards">فلش‌کارت</SelectItem>
                  <SelectItem value="guide">کتابچهٔ راهنما</SelectItem>
                  <SelectItem value="poster">پوستر آموزشی</SelectItem>
                  <SelectItem value="notes">جزوه</SelectItem>
                  <SelectItem value="book">کتاب</SelectItem>
                  <SelectItem value="package">بسته آموزشی</SelectItem>
                  <SelectItem value="other">سایر</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="قیمت (تومان)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <Input type="number" placeholder="موجودی" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            <div>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
              <Button type="button" variant="outline" className="w-full" onClick={() => coverRef.current?.click()}>
                <Image className="ml-1.5 size-4" />
                {coverFile ? coverFile.name : form.coverImage ? "تصویر فعلی — تغییر" : "انتخاب تصویر کاور"}
              </Button>
              {(coverFile || form.coverImage) && (
                <img src={coverFile ? URL.createObjectURL(coverFile) : form.coverImage} alt="پیش‌نمایش" className="mt-2 h-32 w-full rounded-lg object-cover" />
              )}
            </div>
            <Textarea placeholder="توضیحات" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <PublishPicker value={form.published} onChange={(v) => setForm({ ...form, published: v })} />
            <Button className="w-full" onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
              {dialog?.mode === "edit" ? "ذخیرهٔ تغییرات" : "ساخت محصول"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Instructors ─────────────────────────────────────────────────────────────
function AdminInstructors() {
  const { isIran } = useMode();
  const instructorsConvex = useQuery(api.admin.adminListInstructors);
  const usersConvex = useQuery(api.admin.adminGetUsers);
  const { data: instructorsIran } = useApiQuery<any[]>(isIran ? "/api/content/instructors" : "");
  const { data: usersIran } = useApiQuery<any[]>(isIran ? "/api/admin/users" : "");
  const instructors = isIran ? instructorsIran : instructorsConvex;
  const users = isIran ? usersIran : usersConvex;
  const create = useMutation(api.admin.adminCreateInstructor);
  const update = useMutation(api.admin.adminUpdateInstructor);
  const remove = useMutation(api.admin.adminDeleteInstructor);
  const createUser = useMutation(api.admin.adminCreateUser);
  const [userSearch, setUserSearch] = useState("");
  const [createUserMode, setCreateUserMode] = useState<"existing" | "new">("existing");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPass, setNewUserPass] = useState("");

  const empty = { name: "", title: "", bio: "", education: "", specialties: "", accent: "teal", verified: false, userId: "" };
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; instructor: any } | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const openCreate = () => { setForm(empty); setCreateUserMode("existing"); setUserSearch(""); setNewUserName(""); setNewUserEmail(""); setNewUserPass(""); setDialog({ mode: "create" }); };
  const openEdit = (i: any) => {
    setForm({
      name: i.name,
      title: i.title,
      bio: i.bio,
      education: (i.education ?? []).join("\n"),
      specialties: (i.specialties ?? []).join("، "),
      accent: i.accent || "teal",
      verified: i.verified,
      userId: i.userId ?? "",
    });
    setCreateUserMode("existing");
    setDialog({ mode: "edit", instructor: i });
  };

  const filteredUsers = (users ?? []).filter((u: any) =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      let linkedUserId = form.userId || undefined;

      // If user chose "new" mode and filled in details, create user first
      if (createUserMode === "new" && newUserEmail.trim() && newUserPass.trim() && !form.userId) {
        try {
          const result = await createUser({
            name: newUserName.trim() || form.name,
            email: newUserEmail.trim(),
            password: newUserPass,
            role: "instructor",
          });
          if (result?.userId) linkedUserId = result.userId;
        } catch (e) {
          toast.error("خطا در ساخت کاربر: " + (e instanceof Error ? e.message : ""));
          setBusy(false);
          return;
        }
      }

      const payload = {
        name: form.name,
        title: form.title,
        bio: form.bio,
        education: form.education.split("\n").filter((e) => e.trim()),
        specialties: form.specialties.split("،").map((s) => s.trim()).filter(Boolean),
        accent: form.accent,
        verified: form.verified,
        userId: linkedUserId as any,
      };
      if (dialog?.mode === "edit") {
        await update({ id: dialog.instructor._id, ...payload });
      } else {
        await create(payload);
      }
      setDialog(null);
      toast.success(dialog?.mode === "edit" ? "مدرس به‌روزرسانی شد" : "مدرس اضافه شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ذخیره");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="مدرسان" subtitle="team / instructors" count={instructors?.length} />
        <Button className="rounded-lg" onClick={openCreate}>
          <Plus className="ml-1.5 size-4" />
          مدرس جدید
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>تخصص</TableHead>
                <TableHead>حساب کاربری</TableHead>
                <TableHead>دوره‌ها</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(instructors ?? []).map((i: any) => {
                const linkedUser = i.userId ? (users ?? []).find((u: any) => u._id === i.userId) : null;
                return (
                  <TableRow key={i._id}>
                    <TableCell className="font-medium">
                      {i.name}
                      {i.verified && (
                        <span className="mr-1.5 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">✓</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground">{i.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {linkedUser ? (
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-green-500" />
                          {linkedUser.name ?? linkedUser.email}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-500">بدون حساب</span>
                      )}
                    </TableCell>
                    <TableCell>{faNum(i.courseCount)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 rounded-md text-xs" onClick={() => openEdit(i)}>
                          ویرایش
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-md text-xs text-destructive hover:text-destructive"
                          onClick={() => remove({ id: i._id })}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "ویرایش مدرس" : "مدرس جدید"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input placeholder="نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="تخصص (مثلاً میکروبیولوژی)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <Textarea placeholder="معرفی کوتاه (هر خط در سایت نمایش داده می‌شود)" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="font-mono text-sm" />
            <Textarea placeholder="تحصیلات (هر مورد در یک خط)" rows={2} value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
            <Input placeholder="تخصص‌ها (با ، جدا کنید)" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select value={form.accent} onValueChange={(v) => setForm({ ...form, accent: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCENTS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} />
                تأییدشده
              </label>
            </div>

            {/* ── User Link Section ── */}
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-bold text-muted-foreground">حساب کاربری مدرس</p>
              <div className="flex gap-2">
                <Button size="sm" variant={createUserMode === "existing" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setCreateUserMode("existing")}>
                  انتخاب کاربر ثبت‌نام‌شده
                </Button>
                <Button size="sm" variant={createUserMode === "new" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setCreateUserMode("new")}>
                  ساخت کاربر جدید
                </Button>
              </div>
              {createUserMode === "existing" ? (
                <div className="space-y-2">
                  <Input placeholder="جستجوی نام یا ایمیل کاربر…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="h-8 text-xs" />
                  {userSearch && (
                    <div className="max-h-36 space-y-1 overflow-y-auto rounded border border-border/50 bg-background p-1">
                      {filteredUsers.length === 0 && <p className="p-2 text-xs text-muted-foreground">کاربری یافت نشد</p>}
                      {filteredUsers.slice(0, 8).map((u: any) => (
                        <button
                          key={u._id}
                          onClick={() => { setForm({ ...form, userId: u._id, name: form.name || u.name || "" }); setUserSearch(""); }}
                          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-right text-xs hover:bg-muted ${form.userId === u._id ? "bg-primary/10 text-primary" : ""}`}
                        >
                          <span className="size-1.5 shrink-0 rounded-full bg-green-500" />
                          <span className="truncate">{u.name ?? "بدون نام"}</span>
                          <span className="mr-auto truncate text-muted-foreground">{u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {form.userId && !userSearch && (
                    <p className="text-xs text-green-500">
                      ✓ کاربر انتخاب‌شده: {(users ?? []).find((u: any) => u._id === form.userId)?.name}
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Input placeholder="نام" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="h-8 text-xs" />
                  <Input placeholder="ایمیل" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="h-8 text-xs" />
                  <Input placeholder="رمز عبور" type="password" value={newUserPass} onChange={(e) => setNewUserPass(e.target.value)} className="h-8 text-xs" />
                </div>
              )}
            </div>

            <Button className="w-full" onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
              {dialog?.mode === "edit" ? "ذخیرهٔ تغییرات" : "افزودن مدرس"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Comments moderation ──────────────────────────────────────────────────────
function AdminComments() {
  const pending = useQuery(api.comments.listPending);
  const approve = useMutation(api.comments.approveComment);
  const reject = useMutation(api.comments.rejectComment);
  const remove = useMutation(api.comments.deleteComment);

  return (
    <div className="space-y-5">
      <SectionHeader title="دیدگاه‌ها" subtitle="تأیید یا رد دیدگاه‌های کاربران" count={pending?.length} />
      {(!pending || pending.length === 0) ? (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <MessageSquare className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">دیدگاه تأیید‌نشده‌ای وجود ندارد.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((c: any) => (
            <Card key={c._id} className="border-border/70 shadow-sm">
              <CardContent className="space-y-3 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{c.userName ?? "کاربر"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{c.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.contentType} · {new Date(c.createdAt).toLocaleDateString("fa-IR")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => void approve({ id: c._id })}>
                    تأیید
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void reject({ id: c._id })}>
                    رد
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove({ id: c._id })}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Instructor payments (admin) ──────────────────────────────────────────────
function AdminPayments() {
  const users = useQuery(api.admin.adminGetUsers);
  const payments = useQuery(api.admin.adminListPayments);
  const createPayment = useMutation(api.instructorTools.adminCreatePayment);
  const markPaid = useMutation(api.instructorTools.adminMarkPaid);
  const deletePayment = useMutation(api.admin.adminDeletePayment);
  const [targetUser, setTargetUser] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const instructors = (users ?? []).filter((u: any) => u.role === "instructor" || u.secondaryRole === "instructor");
  const instructorMap = Object.fromEntries((instructors ?? []).map((u: any) => [u._id, u.name ?? u.email]));

  const handleCreate = async () => {
    if (!targetUser || !amount.trim()) return;
    setBusy(true);
    try {
      await createPayment({ instructorId: targetUser as any, amount: Number(amount), description: description || "دستمزد مدرس" });
      toast.success("پرداخت ثبت شد");
      setTargetUser(""); setAmount(""); setDescription("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); } finally { setBusy(false); }
  };

  const handleConfirmPaid = async (id: string) => {
    setBusy(true);
    try {
      await markPaid({ id: id as any, receiptUrl: receiptUrl || undefined });
      toast.success("پرداخت تأیید شد");
      setConfirmingId(null); setReceiptUrl("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); } finally { setBusy(false); }
  };

  const pending = (payments ?? []).filter((p: any) => p.status === "pending");
  const paid = (payments ?? []).filter((p: any) => p.status === "paid");

  return (
    <div className="space-y-5">
      <SectionHeader title="پرداخت دستمزد" subtitle="ثبت و مدیریت پرداختی‌ها به مدرسان" count={(payments ?? []).length} />
      <Card className="border-border/70 shadow-sm">
        <CardHeader><CardTitle className="text-sm">ثبت پرداخت جدید</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={targetUser} onValueChange={setTargetUser}>
            <SelectTrigger><SelectValue placeholder="انتخاب مدرس" /></SelectTrigger>
            <SelectContent>
              {instructors.map((u: any) => (<SelectItem key={u._id} value={u._id}>{u.name ?? u.email}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input type="number" placeholder="مبلغ (تومان)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input placeholder="توضیح" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button onClick={handleCreate} disabled={busy || !targetUser || !amount}>
            {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}ثبت پرداخت
          </Button>
        </CardContent>
      </Card>
      {pending.length > 0 && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader><CardTitle className="text-sm">در انتظار تأیید ({faNum(pending.length)})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>مدرس</TableHead><TableHead>مبلغ</TableHead><TableHead>توضیح</TableHead><TableHead>تاریخ</TableHead><TableHead className="text-left">عملیات</TableHead></TableRow></TableHeader>
              <TableBody>
                {pending.map((p: any) => (
                  <TableRow key={p._id}>
                    <TableCell className="text-sm font-medium">{instructorMap[p.instructorId] ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatPrice(p.amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {confirmingId === p._id ? (
                          <div className="flex items-center gap-2">
                            <Input placeholder="لینک فیش (اختیاری)" value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} className="h-7 w-48 text-xs" />
                            <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700 text-xs" onClick={() => handleConfirmPaid(p._id)} disabled={busy}>تأیید پرداخت</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setConfirmingId(null); setReceiptUrl(""); }}>لغو</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirmingId(p._id)}>
                            <CheckCircle2 className="ml-1 size-3.5" />تأیید و پرداخت
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={async () => {
                          if (!confirm("این سابقه پرداخت حذف شود؟")) return;
                          setDeletingId(p._id);
                          try { await deletePayment({ paymentId: p._id }); toast.success("سابقه حذف شد"); } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); } finally { setDeletingId(null); }
                        }} disabled={deletingId === p._id}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {paid.length > 0 && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader><CardTitle className="text-sm">سوابق پرداخت شده ({faNum(paid.length)})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>مدرس</TableHead><TableHead>مبلغ</TableHead><TableHead>توضیح</TableHead><TableHead>تاریخ ثبت</TableHead><TableHead>تاریخ پرداخت</TableHead><TableHead>وضعیت</TableHead></TableRow></TableHeader>
              <TableBody>
                {paid.map((p: any) => (
                  <TableRow key={p._id}>
                    <TableCell className="text-sm font-medium">{instructorMap[p.instructorId] ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatPrice(p.amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.paidAt ? formatDateTime(p.paidAt) : "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-500">
                          <span className="size-1.5 rounded-full bg-emerald-500" />پرداخت شده
                        </span>
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={async () => {
                          if (!confirm("این سابقه پرداخت حذف شود؟")) return;
                          setDeletingId(p._id);
                          try { await deletePayment({ paymentId: p._id }); toast.success("سابقه حذف شد"); } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); } finally { setDeletingId(null); }
                        }} disabled={deletingId === p._id}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {(payments ?? []).length === 0 && (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Receipt className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">هنوز پرداختی ثبت نشده است.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Class requests from instructors ──────────────────────────────────────────
function AdminClassRequests() {
  const requests = useQuery(api.admin.adminListClassRequests);
  const review = useMutation(api.admin.adminReviewClassRequest);
  const [platformUrls, setPlatformUrls] = useState<Record<string, string>>({});

  const pending = (requests ?? []).filter((r: any) => r.status === "pending");
  const reviewed = (requests ?? []).filter((r: any) => r.status !== "pending");

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    try {
      await review({ id: id as any, status, platformUrl: platformUrls[id] || undefined });
      toast.success(status === "approved" ? "کلاس تأیید شد" : "درخواست رد شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="درخواست کلاس" subtitle="تأیید درخواست‌های کلاس مدرسان" count={pending.length} />

      {pending.length === 0 ? (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Clock className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">درخواست جدیدی وجود ندارد.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((r: any) => (
            <Card key={r._id} className="border-border/70 shadow-sm">
              <CardContent className="space-y-3 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      مدرس: {r.instructorName} · تاریخ پیشنهادی: {formatJalaliDate(r.proposedDate)}
                    </p>
                    {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-500">جدید</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    placeholder="لینک پلتفرم (Zoom, Meet, ...) یا خالی برای برگزاری در سایت"
                    value={platformUrls[r._id] ?? ""}
                    onChange={(e) => setPlatformUrls((p) => ({ ...p, [r._id]: e.target.value }))}
                    className="h-8 flex-1 text-xs"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-xs" onClick={() => handleReview(r._id, "approved")}>
                      تأیید
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => handleReview(r._id, "rejected")}>
                      رد
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-muted-foreground">بررسی‌شده</h3>
          <div className="space-y-2">
            {reviewed.map((r: any) => (
              <div key={r._id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
                <div>
                  <p className="text-xs font-medium">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground">{r.instructorName} · {r.proposedDate}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.status === "approved" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"}`}>
                  {r.status === "approved" ? "تأیید شده" : "رد شده"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Student reports ──────────────────────────────────────────────────────────
function AdminStudentReports() {
  const users = useQuery(api.admin.adminGetUsers);
  const performance = useQuery(api.instructorTools.getStudentPerformance) ?? [];

  const students = (users ?? []).filter((u: any) => u.role === "user" || u.role === "member");

  return (
    <div className="space-y-5">
      <SectionHeader title="گزارش دانشجویان" subtitle="وضعیت و عملکرد دانشجویان سایت" count={students.length} />

      {students.length === 0 ? (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">دانشجویی ثبت نام نکرده است.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {students.map((s: any) => {
            const perf = performance.find((p: any) => String(p.studentId) === String(s._id));
            return (
              <Card key={s._id} className="border-border/70 shadow-sm">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {(s.name ?? "?")[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{s.email ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {perf ? (
                      <>
                        <span>{perf.questions} سؤال</span>
                        <span>{perf.messages} پیام</span>
                        <span>{perf.attendance}/{perf.totalRooms} حضور</span>
                      </>
                    ) : (
                      <span>فعالیتی ثبت نشده</span>
                    )}
                    <Badge variant="outline" className="text-[10px]">{s.role ?? "user"}</Badge>
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

// ── Users ───────────────────────────────────────────────────────────────────
function AdminUsers() {
  const { user: me } = useAuth();
  const isSystemAdmin = me?.role === "admin";
  const users = useQuery(api.admin.adminGetUsers);
  const setRole = useMutation(api.admin.adminSetRole);
  const setSecondaryRole = useMutation(api.admin.adminSetSecondaryRole);
  const createUser = useMutation(api.admin.adminCreateUser);
  const setPassword = useMutation(api.admin.adminSetPassword);
  const updateUser = useMutation(api.admin.adminUpdateUser);
  const deleteUser = useMutation(api.admin.adminDeleteUser);
  const [emails, setEmails] = useState("");
  const addAdmin = useMutation(api.admin.adminAddAdmin);
  const [deleteTarget, setDeleteTarget] = useState<{ _id: string; name: string | null } | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [formErr, setFormErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const [resetUser, setResetUser] = useState<{ _id: string; name: string | null } | null>(null);
  const [resetPass, setResetPass] = useState("");
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const [editTarget, setEditTarget] = useState<{
    _id: string;
    name: string | null;
    email: string | null;
    role: string | null;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const handleCreate = async () => {
    setFormErr(null);
    setCreated(null);
    if (!form.email.trim() || !form.password) {
      setFormErr("ایمیل و رمز عبور لازم است.");
      return;
    }
    setCreating(true);
    try {
      await createUser({ name: form.name, email: form.email.trim(), password: form.password, role: form.role });
      setCreated(form.email.trim());
      setForm({ name: "", email: "", password: "", role: "user" });
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "خطا در ساخت حساب.");
    } finally {
      setCreating(false);
    }
  };

  const handleReset = async () => {
    if (!resetUser) return;
    setResetErr(null);
    setResetting(true);
    try {
      await setPassword({ userId: resetUser._id as any, password: resetPass });
      setResetPass("");
      setResetUser(null);
    } catch (e) {
      setResetErr(e instanceof Error ? e.message : "خطا در تغییر رمز.");
    } finally {
      setResetting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditErr(null);
    if (!editName.trim()) {
      setEditErr("نام نمی‌تواند خالی باشد.");
      return;
    }
    if (!editEmail.trim().includes("@")) {
      setEditErr("ایمیل نامعتبر است.");
      return;
    }
    setEditing(true);
    try {
      await updateUser({
        userId: editTarget._id as any,
        name: editName.trim(),
        email: editEmail.trim(),
      });
      setEditTarget(null);
      toast.success("اطلاعات کاربر به‌روزرسانی شد");
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : "خطا در ذخیره.");
    } finally {
      setEditing(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="کاربران و دسترسی‌ها" subtitle="team / users & roles" count={users?.length} />

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ساخت حساب کاربری جدید</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">نام</p>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً سارا محمدی" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">ایمیل (رمز ورود کاربر)</p>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@genova.team" dir="ltr" className="text-left" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">رمز عبور اولیه</p>
              <PasswordInput ltr value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="حداقل ۴ کاراکتر" dir="ltr" className="text-left" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">نقش / سطح دسترسی</p>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(isSystemAdmin ? ROLES : ROLES.filter((r) => r !== "admin" && r !== "site_admin")).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r] ?? r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {formErr && <p className="text-sm text-destructive">{formErr}</p>}
          {created && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500">
              حساب <span dir="ltr" className="font-mono">{created}</span> ساخته شد؛ با همین ایمیل و رمز عبور وارد می‌شود.
            </p>
          )}
          <Button className="rounded-lg" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Plus className="ml-1.5 size-4" />}
            ساخت حساب
          </Button>
        </CardContent>
      </Card>

      {isSystemAdmin && (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row">
            <Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="ایمیل ادمین جدید (مثلاً ali@genova.team)" className="flex-1" dir="ltr" />
            <Button variant="outline" className="rounded-lg" onClick={() => { if (emails.trim()) addAdmin({ email: emails.trim() }); setEmails(""); }}>
              <Plus className="ml-1.5 size-4" />
              افزودن به ادمین‌ها
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>ایمیل</TableHead>
                <TableHead>نقش</TableHead>
                <TableHead>رمز</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).map((u) => (
                <TableRow key={u._id}>
                  <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground" dir="ltr">{u.email ?? "—"}</TableCell>
                  <TableCell>
                    <Select value={u.role ?? "user"} onValueChange={(v) => setRole({ userId: u._id, role: v })}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(isSystemAdmin ? ROLES : ROLES.filter((r) => r !== "admin" && r !== "site_admin")).map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r] ?? r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(u.role === "admin" || u.role === "site_admin") && (
                      <Select
                        value={u.secondaryRole ?? ""}
                        onValueChange={(v) => setSecondaryRole({ userId: u._id, secondaryRole: v === "_clear" ? undefined : v })}
                      >
                        <SelectTrigger className="mt-1 w-40"><SelectValue placeholder="نقش ثانویه…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_clear">بدون نقش ثانویه</SelectItem>
                          {ROLES.filter((r) => r !== "admin" && r !== "site_admin" && r !== (u.role ?? "")).map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r] ?? r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.email ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg text-xs"
                        onClick={() => { setResetUser({ _id: u._id, name: u.name }); setResetPass(""); setResetErr(null); }}
                      >
                        تغییر رمز
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 rounded-md text-xs disabled:opacity-30"
                        title={
                          !isSystemAdmin && (u.role === "admin" || u.role === "site_admin")
                            ? "فقط ادمین سامانه می‌تواند ادمین را ویرایش کند"
                            : "ویرایش نام و ایمیل"
                        }
                        disabled={!isSystemAdmin && (u.role === "admin" || u.role === "site_admin")}
                        onClick={() => {
                          setEditTarget({ _id: u._id, name: u.name, email: u.email, role: u.role });
                          setEditName(u.name ?? "");
                          setEditEmail(u.email ?? "");
                          setEditErr(null);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 rounded-md text-xs text-destructive hover:text-destructive disabled:opacity-30"
                        title={
                          me?._id === u._id
                            ? "نمی‌توانید خودتان را حذف کنید"
                            : !isSystemAdmin && (u.role === "admin" || u.role === "site_admin")
                              ? "فقط ادمین سامانه می‌تواند ادمین را حذف کند"
                              : "حذف حساب کاربر"
                        }
                        disabled={me?._id === u._id || (!isSystemAdmin && (u.role === "admin" || u.role === "site_admin"))}
                        onClick={() => {
                          setDeleteTarget({ _id: u._id, name: u.name });
                          setDeleteErr(null);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={resetUser !== null} onOpenChange={(o) => { if (!o) setResetUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغییر رمز عبور</DialogTitle>
            <DialogDescription>
              رمز جدید برای {resetUser?.name ?? "کاربر"} را وارد کن.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <PasswordInput
              ltr
              value={resetPass}
              onChange={(e) => setResetPass(e.target.value)}
              placeholder="رمز جدید (حداقل ۴ کاراکتر)"
              dir="ltr"
            />
            {resetErr && <p className="text-sm text-destructive">{resetErr}</p>}
            <Button className="w-full rounded-lg" onClick={handleReset} disabled={resetting || resetPass.length < 4}>
              {resetting ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
              ذخیره رمز جدید
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editTarget !== null} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش کاربر</DialogTitle>
            <DialogDescription>
              نام و ایمیل ورود {editTarget?.name ?? "کاربر"} را ویرایش کن — با ایمیل جدید وارد می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">نام</p>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="نام کامل" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">ایمیل (ایمیل ورود کاربر)</p>
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="name@genova.team" dir="ltr" className="text-left" />
            </div>
            {editErr && <p className="text-sm text-destructive">{editErr}</p>}
            <Button className="w-full rounded-lg" onClick={handleEdit} disabled={editing}>
              {editing ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Pencil className="ml-1.5 size-4" />}
              ذخیره تغییرات
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete account confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف حساب کاربر</DialogTitle>
            <DialogDescription>
              حساب «{deleteTarget?.name ?? "کاربر"}» به‌همراه تمام سوابقش (دوره‌ها، آزمون‌ها، سفارش‌ها، تیکت‌ها، نشان‌شده‌ها و…) برای همیشه حذف می‌شود. این عمل قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          {deleteErr && <p className="text-sm text-destructive">{deleteErr}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!deleteTarget) return;
                setDeleting(true);
                setDeleteErr(null);
                try {
                  await deleteUser({ userId: deleteTarget._id as any });
                  setDeleteTarget(null);
                } catch (e) {
                  setDeleteErr(e instanceof Error ? e.message : "خطا در حذف حساب");
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Trash2 className="ml-1.5 size-4" />}
              حذف برای همیشه
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Orders ──────────────────────────────────────────────────────────────────
function AdminOrders() {
  const orders = useQuery(api.admin.adminGetOrders);
  const update = useMutation(api.admin.adminUpdateOrderStatus);
  const remove = useMutation(api.admin.adminDeleteOrder);

  return (
    <div className="space-y-5">
      <SectionHeader title="سفارش‌ها" subtitle="commerce / orders" count={orders?.length} />
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>فاکتور</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead>آیتم‌ها</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orders ?? []).map((o) => (
                <TableRow key={o._id}>
                  <TableCell className="font-mono text-xs" dir="ltr">{o.invoiceNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{o.user?.name ?? o.user?.email ?? "—"}</TableCell>
                  <TableCell className="max-w-48">
                    <p className="truncate text-xs">{o.items.map((i) => i.title).join("، ")}</p>
                  </TableCell>
                  <TableCell className="font-medium">{formatPrice(o.total)}</TableCell>
                  <TableCell>
                    <Select value={o.status} onValueChange={(v) => update({ orderId: o._id, status: v })}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">پرداخت‌شده</SelectItem>
                        <SelectItem value="pending">در انتظار</SelectItem>
                        <SelectItem value="cancelled">لغو شده</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-left">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-md text-xs text-destructive hover:text-destructive"
                      title="حذف سفارش"
                      onClick={() => remove({ id: o._id })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Coupons ─────────────────────────────────────────────────────────────────
function AdminCoupons() {
  const coupons = useQuery(api.admin.adminGetCoupons);
  const create = useMutation(api.admin.adminCreateCoupon);
  const toggle = useMutation(api.admin.adminToggleCoupon);
  const remove = useMutation(api.admin.adminDeleteCoupon);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [maxUses, setMaxUses] = useState("100");
  const [err, setErr] = useState<string | null>(null);

  const handleCreate = async () => {
    setErr(null);
    try {
      await create({ code, percent: Number(percent), maxUses: Number(maxUses) || 0 });
      setCode("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا");
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="کدهای تخفیف" subtitle="commerce / coupons" count={coupons?.length} />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">کد</p>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="GEN20" dir="ltr" className="font-mono" />
          </div>
          <div className="w-24">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">درصد</p>
            <Input type="number" value={percent} onChange={(e) => setPercent(e.target.value)} />
          </div>
          <div className="w-24">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">ظرفیت</p>
            <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          <Button className="rounded-lg" onClick={handleCreate}>
            <Plus className="ml-1.5 size-4" />
            ساخت کد
          </Button>
        </CardContent>
      </Card>
      {err && <p className="text-sm text-destructive">{err}</p>}

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کد</TableHead>
                <TableHead>درصد</TableHead>
                <TableHead>استفاده</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(coupons ?? []).map((c) => (
                <TableRow key={c._id}>
                  <TableCell className="font-mono font-bold" dir="ltr">{c.code}</TableCell>
                  <TableCell>{faNum(c.percent)}٪</TableCell>
                  <TableCell>{faNum(c.usedCount)}/{faNum(c.maxUses)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant={c.active ? "secondary" : "outline"} className="rounded-lg" onClick={() => toggle({ couponId: c._id, active: !c.active })}>
                      {c.active ? "فعال" : "غیرفعال"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-left">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-md text-xs text-destructive hover:text-destructive"
                      title="حذف کد تخفیف"
                      onClick={() => remove({ id: c._id })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Support ─────────────────────────────────────────────────────────────────
function AdminSupport() {
  const tickets = useQuery(api.tickets.listAllTickets);
  const reply = useMutation(api.tickets.replyTicket);
  const updateStatus = useMutation(api.tickets.updateTicketStatus);
  const remove = useMutation(api.tickets.deleteTicket);
  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState("");

  const handleReply = async (ticketId: string) => {
    if (!text.trim()) return;
    await reply({ ticketId: ticketId as any, message: text });
    setText("");
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="تیکت‌های پشتیبانی" subtitle="support / tickets" count={tickets?.length} />
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>موضوع</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>آخرین فعالیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tickets ?? []).map((t) => (
                <TableRow key={t._id}>
                  <TableCell className="max-w-56 truncate font-medium">{t.subject}</TableCell>
                  <TableCell className="text-muted-foreground">{t.user?.name ?? t.user?.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "open" ? "default" : t.status === "answered" ? "secondary" : "outline"} className="rounded-full">
                      {t.status === "open" ? "باز" : t.status === "answered" ? "پاسخ‌داده‌شده" : "بسته"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(t.updatedAt)}</TableCell>
                  <TableCell className="text-left">
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setOpenId(openId === t._id ? null : t._id)}>
                      {openId === t._id ? "بستن" : "مشاهده"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mr-1 h-7 rounded-md text-xs text-destructive hover:text-destructive"
                      title="حذف تیکت"
                      onClick={() => remove({ ticketId: t._id })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {openId && (() => {
        const t = (tickets ?? []).find((x) => x._id === openId);
        if (!t) return null;
        return (
          <Card className="border-primary/40 shadow-sm">
            <CardContent className="space-y-3 p-5">
              <p className="text-sm font-bold">{t.subject}</p>
              {t.messages.map((m, i) => (
                <div key={i} className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6", m.author === "admin" ? "bg-primary/10" : "bg-muted")}>
                  <p className="text-[11px] font-bold text-muted-foreground">
                    {m.author === "admin" ? "تیم پشتیبانی" : t.user?.name ?? "دانشجو"} · {formatDateTime(m.at)}
                  </p>
                  <p className="mt-1">{m.text}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="پاسخ تیم..." />
                <Button onClick={() => handleReply(t._id)} disabled={!text.trim()}>
                  <Send className="size-4" />
                </Button>
                <Button variant="outline" onClick={() => updateStatus({ ticketId: t._id, status: t.status === "closed" ? "open" : "closed" })}>
                  {t.status === "closed" ? "بازکردن" : "بستن تیکت"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

// ── Announcements (site admins → everyone / course / exam) ──────────────────
function AdminAnnouncements() {
  const anns = useQuery(api.notifications.listAllAnnouncements);
  const courses = useQuery(api.content.listCourses, {}) ?? [];
  const exams = useQuery(api.admin.adminListExams) ?? [];
  const create = useMutation(api.notifications.createAnnouncement);
  const remove = useMutation(api.notifications.deleteAnnouncement);

  const [targetType, setTargetType] = useState<"all" | "course" | "exam">("all");
  const [targetId, setTargetId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendAsBanner, setSendAsBanner] = useState(false);
  const [bannerSticker, setBannerSticker] = useState("📢");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    setErr(null);
    if (title.trim().length < 3) {
      setErr("عنوان اطلاعیه لازم است.");
      return;
    }
    if (targetType !== "all" && !targetId) {
      setErr("دوره یا آزمون را انتخاب کنید.");
      return;
    }
    setBusy(true);
    try {
      await create({
        targetType,
        targetId: targetType === "all" ? undefined : targetId,
        title,
        body,
        sendAsBanner,
        bannerSticker: bannerSticker || undefined,
      });
      setTitle("");
      setBody("");
      setTargetType("all");
      setTargetId("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا در ارسال اطلاعیه");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="اطلاعیه‌ها" subtitle="announcements / notify students" count={anns?.length} />

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ارسال اطلاعیه جدید</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
            <Select value={targetType} onValueChange={(v) => { setTargetType(v as any); setTargetId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همهٔ کاربران</SelectItem>
                <SelectItem value="course">دانشجویان یک دوره</SelectItem>
                <SelectItem value="exam">برای یک آزمون</SelectItem>
              </SelectContent>
            </Select>
            {targetType === "course" ? (
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger><SelectValue placeholder="دوره را انتخاب کنید…" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : targetType === "exam" ? (
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger><SelectValue placeholder="آزمون را انتخاب کنید…" /></SelectTrigger>
                <SelectContent>
                  {exams.map((e) => (
                    <SelectItem key={e._id} value={e._id}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center text-xs text-muted-foreground">
                اطلاعیه برای همهٔ کاربران (دانشجویان، اعضا و…) ارسال می‌شود.
              </div>
            )}
          </div>
          <Input placeholder="عنوان اطلاعیه (مثلاً: کلاس آنلاین جمع‌بندی امشب)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="متن اطلاعیه…" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <input
              type="checkbox"
              checked={sendAsBanner}
              onChange={(e) => setSendAsBanner(e.target.checked)}
              className="size-4 accent-primary"
            />
            <Megaphone className="size-4 text-primary" />
            <span className="text-sm font-medium">نمایش به‌صورت بنر متحرک در بالای سایت</span>
            {sendAsBanner && (
              <input
                value={bannerSticker}
                onChange={(e) => setBannerSticker(e.target.value)}
                placeholder="📢"
                className="w-14 rounded-md border border-border bg-background px-2 py-1 text-center text-sm"
              />
            )}
          </label>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button className="rounded-lg" onClick={handleCreate} disabled={busy}>
            {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Send className="ml-1.5 size-4" />}
            ارسال اطلاعیه
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>مخاطب</TableHead>
                <TableHead>نویسنده</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(anns ?? []).map((a) => (
                <TableRow key={a._id}>
                  <TableCell className="max-w-56 truncate font-medium">{a.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.targetType === "all"
                      ? "همه"
                      : a.targetType === "course"
                        ? `دوره: ${a.targetTitle ?? "—"}`
                        : `آزمون: ${a.targetTitle ?? "—"}`}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.authorName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</TableCell>
                  <TableCell className="text-left">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-md text-xs text-destructive hover:text-destructive"
                      title="حذف اطلاعیه"
                      onClick={() => remove({ id: a._id })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(anns ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    هنوز اطلاعیه‌ای ارسال نشده است.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Online users list ───────────────────────────────────────────────────────
function AdminOnline() {
  const users = useQuery(api.collab.listAllUsersWithPresence);
  const fmt = (ts: number | null) => {
    if (!ts) return "هرگز";
    const d = Date.now() - ts;
    if (d < 60_000) return "الآن";
    if (d < 3_600_000) return `${Math.floor(d / 60_000)} دقیقه پیش`;
    if (d < 86_400_000) return `${Math.floor(d / 3_600_000)} ساعت پیش`;
    return `${Math.floor(d / 86_400_000)} روز پیش`;
  };
  const on = users?.filter((u) => u.isOnline).length ?? 0;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-mono text-[11px] uppercase tracking-widest text-primary/80">presence / online users</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">آنلاین‌ها</h1></div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs text-emerald-500"><Wifi className="size-3.5" /> {faNum(on)} آنلاین</span>
          <span className="rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground">{faNum(users?.length ?? 0)} کاربر</span>
        </div>
      </div>
      <Card className="border-border/70 shadow-sm"><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>وضعیت</TableHead><TableHead>نام</TableHead><TableHead>ایمیل</TableHead><TableHead>نقش</TableHead><TableHead>آخرین فعالیت</TableHead></TableRow></TableHeader>
        <TableBody>
          {(users ?? []).map((u) => (
            <TableRow key={u._id} className={u.isOnline ? "" : "opacity-60"}>
              <TableCell>{u.isOnline ? <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-xs font-bold text-emerald-500">آنلاین</span></span> : <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted-foreground/40" /><span className="text-xs text-muted-foreground">آفلاین</span></span>}</TableCell>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell className="text-muted-foreground" dir="ltr">{u.email ?? "—"}</TableCell>
              <TableCell><Badge variant="outline" className="rounded-full text-[10px]">{ROLE_LABELS[u.role] ?? u.role}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground">{u.isOnline ? "الآن فعال" : fmt(u.lastSeen)}</TableCell>
            </TableRow>
          ))}
          {(!users || users.length === 0) && <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">بارگذاری...</TableCell></TableRow>}
        </TableBody></Table>
      </CardContent></Card>
    </div>
  );
}

// ── Profile approvals: members edit their profile, admin approves ──────────
function AdminProfiles() {
  const pending = useQuery(api.profiles.listPendingProfiles) ?? [];
  const approve = useMutation(api.profiles.approveProfile);
  const reject = useMutation(api.profiles.rejectProfile);
  const [viewPhoto, setViewPhoto] = useState<{ url: string; name: string } | null>(null);

  return (
    <div className="space-y-5">
      <SectionHeader title="تأیید پروفایل‌ها" subtitle="profiles / pending review" count={pending.length} />

      <div className="space-y-3">
        {pending.map((p) => (
          <Card key={p._id} className="border-amber-500/25 shadow-sm">
            <CardContent className="space-y-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                    {p.pending.avatarUrl || p.current.avatarUrl ? (
                      <img src={p.pending.avatarUrl ?? p.current.avatarUrl!} alt="" className="size-full object-cover" />
                    ) : (
                      <Users className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold">
                      {p.pending.firstName || p.pending.lastName
                        ? `${p.pending.firstName ?? ""} ${p.pending.lastName ?? ""}`.trim()
                        : (p.name ?? "—")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.email} · {ROLE_LABELS[p.role ?? "user"] ?? p.role} · ارسال: {formatDateTime(p.submittedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 rounded-lg text-xs" onClick={() => approve({ userId: p._id })}>
                    <CheckCircle2 className="ml-1 size-3.5" />
                    تأیید و اعمال
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs text-destructive" onClick={() => reject({ userId: p._id })}>
                    <XCircle className="ml-1 size-3.5" />
                    رد تغییرات
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">مقدار فعلی</p>
                  <p className="text-sm font-bold">
                    {p.current.firstName || p.current.lastName
                      ? `${p.current.firstName ?? ""} ${p.current.lastName ?? ""}`.trim()
                      : (p.name ?? "—")}
                  </p>
                  {p.current.avatarUrl && (
                    <div className="mt-2">
                      <img src={p.current.avatarUrl} alt="عکس فعلی" className="size-16 rounded-lg border border-border object-cover" />
                      <a href={p.current.avatarUrl} download target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"><Download className="size-3" /> دانلود عکس</a>
                    </div>
                  )}
                  {p.current.about && <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{p.current.about}</p>}
                </div>
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary/80">تغییرات پیشنهادی</p>
                  <p className="text-sm font-bold">
                    {p.pending.firstName || p.pending.lastName
                      ? `${p.pending.firstName ?? ""} ${p.pending.lastName ?? ""}`.trim()
                      : (p.name ?? "—")}
                  </p>
                  {p.pending.avatarUrl && (
                    <div className="mt-2">
                      <img src={p.pending.avatarUrl} alt="عکس جدید" className="size-16 rounded-lg border border-primary/30 object-cover" />
                      <div className="mt-1.5 flex gap-2">
                        <button onClick={() => setViewPhoto({ url: p.pending.avatarUrl!, name: p.name ?? "کاربر" })} className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"><Eye className="size-3" /> مشاهده بزرگ</button>
                        <a href={p.pending.avatarUrl} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"><Download className="size-3" /> دانلود</a>
                      </div>
                    </div>
                  )}
                  {p.pending.about && <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{p.pending.about}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {pending.length === 0 && (
          <Card className="border-border/70">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <UserCheck className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                درخواستی برای تأیید نیست — وقتی اعضا پروفایل‌شان را ویرایش کنند، اینجا نمایش داده می‌شود.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Photo viewer dialog */}
      <Dialog open={viewPhoto !== null} onOpenChange={(o) => { if (!o) setViewPhoto(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>عکس پروفایل — {viewPhoto?.name}</DialogTitle></DialogHeader>
          {viewPhoto?.url && (
            <div className="space-y-3">
              <img src={viewPhoto.url} alt="عکس بزرگ" className="w-full rounded-lg border border-border object-cover" />
              <div className="flex justify-end gap-2">
                <a href={viewPhoto.url} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"><Download className="size-3.5" /> دانلود</a>
                <Button size="sm" variant="outline" onClick={() => setViewPhoto(null)}>بستن</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Inbox: send messages to a specific account, view what was sent ─────────
function AdminInbox() {
  const msgs = useQuery(api.inbox.adminListInbox) ?? [];
  const users = useQuery(api.admin.adminGetUsers) ?? [];
  const send = useMutation(api.inbox.sendInboxMessage);
  const remove = useMutation(api.inbox.deleteInboxMessage);

  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const filteredUsers = userSearch.trim()
    ? (users as any[]).filter((u: any) => {
        const q = userSearch.trim().toLowerCase();
        return (
          (u.name ?? "").toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q)
        );
      })
    : (users as any[]);

  const handleSend = async () => {
    setErr(null);
    if (!userId) {
      setErr("گیرنده را انتخاب کنید — صندوق ورودی برای هر حساب جداگانه است.");
      return;
    }
    if (title.trim().length < 2) {
      setErr("عنوان پیام لازم است.");
      return;
    }
    setBusy(true);
    try {
      await send({ userId: userId as any, title, body });
      setTitle("");
      setBody("");
      setUserId("");
      toast.success("پیام به صندوق ورودی کاربر ارسال شد");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا در ارسال");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="صندوق ورودی" subtitle="inbox / per-account messages" count={msgs.length} />

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ارسال پیام به یک حساب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="🔍 جستجوی نام یا ایمیل دانشجو…"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger>
              <SelectValue placeholder="گیرنده را انتخاب کنید (دانشجو / عضو / مدرس و…)" />
            </SelectTrigger>
            <SelectContent>
              {filteredUsers.map((u) => (
                <SelectItem key={u._id} value={u._id}>
                  {u.name ?? "بدون نام"} — {u.email} ({ROLE_LABELS[u.role ?? "user"] ?? u.role})
                </SelectItem>
              ))}
              {filteredUsers.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">کاربری یافت نشد.</div>
              )}
            </SelectContent>
          </Select>
          <Input placeholder="عنوان پیام (مثلاً: پذیرش در دورهٔ آزمایشی)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="متن پیام…" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button className="rounded-lg" onClick={handleSend} disabled={busy}>
            {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Send className="ml-1.5 size-4" />}
            ارسال به صندوق ورودی
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>گیرنده</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {msgs.map((m) => (
                <TableRow key={m._id}>
                  <TableCell className="max-w-56 truncate font-medium">{m.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.user ? `${m.user.name ?? "—"} · ${m.user.email ?? ""}` : "کاربر حذف‌شده"}
                  </TableCell>
                  <TableCell>
                    {m.readAt ? (
                      <span className="text-xs text-muted-foreground">خوانده‌شده</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        <Mail className="size-3" />
                        جدید
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</TableCell>
                  <TableCell className="text-left">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-md text-xs text-destructive hover:text-destructive"
                      title="حذف پیام"
                      onClick={() => remove({ id: m._id })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {msgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    هنوز پیامی ارسال نشده است.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


// ── My profile (admin console) ──────────────────────────────────────────────
function AdminMyProfile() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">پروفایل من</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          نام، عکس و معرفی خود را ثبت کنید — شما ادمین هستید و تغییرات‌تان بدون تأیید، همان لحظه اعمال و عمومی می‌شود.
        </p>
      </div>
      <MemberProfileEditor />
    </div>
  );
}

// ── Exam error reports ──────────────────────────────────────────────────────
function AdminExamReports() {
  const reports = useQuery(api.examReports.listExamReports) ?? [];
  const resolveReport = useMutation(api.examReports.resolveExamReport);
  const deleteReport = useMutation(api.examReports.deleteExamReport);
  const [busyId, setBusyId] = useState<string | null>(null);

  const act = async (fn: () => Promise<unknown>, id: string) => {
    setBusyId(id);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusyId(null);
    }
  };

  const open = reports.filter((r) => r.status === "open").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">گزارش‌های خطای آزمون</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            دانشجوها بعد از پایان هر آزمون می‌توانند سؤال غلط‌طرح‌شده را گزارش کنند؛ بررسی و در صورت لزوم اصلاح کنید.
          </p>
        </div>
        <Badge variant={open > 0 ? "default" : "secondary"} className="rounded-full">
          {faNum(open)} گزارش باز
        </Badge>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>سؤال</TableHead>
                <TableHead>آزمون</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead>توضیح گزارش</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r._id} className={r.status === "open" ? "" : "opacity-60"}>
                  <TableCell className="max-w-56">
                    <p className="line-clamp-2 text-xs leading-5">{r.questionText}</p>
                  </TableCell>
                  <TableCell className="text-xs">{r.examTitle}</TableCell>
                  <TableCell className="text-xs">
                    <p className="font-medium">{r.userName}</p>
                    <p className="text-[10px] text-muted-foreground" dir="ltr">{r.userEmail}</p>
                  </TableCell>
                  <TableCell className="max-w-64">
                    <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">{r.comment}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "open" ? "default" : "secondary"} className="rounded-full text-[10px]">
                      {r.status === "open" ? "باز" : "بررسی‌شده"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center justify-end gap-1.5">
                      {r.status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === r._id}
                          onClick={() => void act(() => resolveReport({ reportId: r._id }), r._id)}
                        >
                          <CheckCircle2 className="ml-1.5 size-3.5" />
                          بررسی شد
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={busyId === r._id}
                        onClick={() => void act(() => deleteReport({ reportId: r._id }), r._id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    هنوز گزارشی ثبت نشده است.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


// ── Offline payments ──────────────────────────────────────────────────────
function AdminOfflinePayments() {
  const payments = useQuery(api.offlinePayments.listOfflinePayments) ?? [];
  const approve = useMutation(api.offlinePayments.approveOfflinePayment);
  const reject = useMutation(api.offlinePayments.rejectOfflinePayment);
  const remove = useMutation(api.offlinePayments.deleteOfflinePayment);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const TIER: Record<string, string> = { economy: "اقتصادی", basic: "پایه", plus: "پلاس", premium: "پرمیوم" };
  const STATUS: Record<string, { label: string; cls: string }> = {
    pending: { label: "در انتظار", cls: "border-amber-400/20 bg-amber-400/10 text-amber-300" },
    approved: { label: "تأیید شده", cls: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" },
    rejected: { label: "رد شده", cls: "border-red-400/20 bg-red-400/10 text-red-300" },
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try { await approve({ paymentId: id as any }); toast.success("پرداخت تأیید شد"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setProcessingId(null); }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try { await reject({ paymentId: id as any, note: "" }); toast.success("پرداخت رد شد"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setProcessingId(null); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">پرداخت‌های آفلاین</h2>
      <Card className="border-white/5 bg-[#0b1a2a]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>دانشجو</TableHead>
                <TableHead>دوره</TableHead>
                <TableHead>پکیج</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>رهگیری</TableHead>
                <TableHead>فیش</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => {
                const st = STATUS[p.status] ?? STATUS.pending;
                return (
                  <TableRow key={p._id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-white">{p.userName}</p>
                        <p className="text-[11px] text-slate-500">{p.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-300">{p.courseTitle}</TableCell>
                    <TableCell className="text-xs text-slate-400">{TIER[p.tier] ?? p.tier}</TableCell>
                    <TableCell className="text-sm font-mono text-white">{formatPrice(p.amount)}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-400" dir="ltr">{p.trackingNumber}</TableCell>
                    <TableCell>
                      <span className="text-xs text-cyan-400">{p.receiptStorageId ? "فیش آپلود شده" : "—"}</span>
                    </TableCell>
                    <TableCell><span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span></TableCell>
                    <TableCell className="text-left">
                      {p.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" disabled={processingId === p._id} onClick={() => void handleApprove(p._id)}>
                            <CheckCircle2 className="size-3" /> تأیید
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" disabled={processingId === p._id} onClick={() => void handleReject(p._id)}>
                            رد
                          </Button>
                        </div>
                      )}
                      {p.status !== "pending" && (
                        <Button size="sm" variant="ghost" className="text-slate-500 hover:text-red-400" onClick={() => void remove({ paymentId: p._id })}>
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    پرداخت آفلاین ثبت نشده است.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


// ── Backup ──────────────────────────────────────────────────────────────────
function AdminBackup() {
  const backup = useQuery(api.admin.exportBackup);
  const [downloading, setDownloading] = useState(false);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());

  const tables = backup?.tables ?? {};
  const tableNames = Object.keys(tables).sort();

  const toggleTable = (name: string) => {
    const next = new Set(selectedTables);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedTables(next);
  };

  const selectAll = () => setSelectedTables(new Set(tableNames));
  const selectNone = () => setSelectedTables(new Set());

  const handleDownload = () => {
    if (!backup) return;
    setDownloading(true);
    try {
      const exportData: Record<string, any[]> = {};
      const tablesToExport = selectedTables.size > 0 ? selectedTables : new Set(tableNames);
      for (const name of tablesToExport) {
        exportData[name] = tables[name] ?? [];
      }
      const payload = {
        exportedAt: backup.exportedAt,
        site: "nibrc.ir",
        tables: exportData,
        tableCount: Object.keys(exportData).length,
        recordCount: Object.values(exportData).reduce((sum, arr) => sum + arr.length, 0),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nibrc-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const totalRecords = tableNames.reduce((sum, name) => sum + (tables[name]?.length ?? 0), 0);
  const selectedRecords = tableNames
    .filter((name) => selectedTables.size === 0 || selectedTables.has(name))
    .reduce((sum, name) => sum + (tables[name]?.length ?? 0), 0);

  if (!backup) return <Loading />;

  return (
    <div className="space-y-5">
      <SectionHeader title="بکاپ و خروجی" subtitle="backup / export" count={totalRecords} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border/70 shadow-sm"><CardContent className="p-4"><p className="text-2xl font-extrabold">{tableNames.length}</p><p className="text-[11px] text-muted-foreground">جدول</p></CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardContent className="p-4"><p className="text-2xl font-extrabold">{faNum(totalRecords)}</p><p className="text-[11px] text-muted-foreground">کل رکوردها</p></CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardContent className="p-4"><p className="text-2xl font-extrabold">{faNum(selectedRecords)}</p><p className="text-[11px] text-muted-foreground">انتخاب شده</p></CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground">آخرین خروجی</p><p className="mt-1 text-sm font-bold" dir="ltr">{backup.exportedAt?.slice(0, 19).replace("T", " ")}</p></CardContent></Card>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleDownload} disabled={downloading} className="rounded-lg">
          {downloading ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Download className="ml-1.5 size-4" />}
          دانلود فایل JSON
        </Button>
        <Button variant="outline" className="rounded-lg" onClick={selectAll}>انتخاب همه</Button>
        <Button variant="outline" className="rounded-lg" onClick={selectNone}>حذف انتخاب</Button>
      </div>
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>نام جدول</TableHead>
                <TableHead className="text-left">تعداد رکورد</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableNames.map((name) => (
                <TableRow key={name}>
                  <TableCell>
                    <input type="checkbox" checked={selectedTables.size === 0 || selectedTables.has(name)} onChange={() => toggleTable(name)} className="size-4 rounded border-border accent-primary" />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{name}</TableCell>
                  <TableCell className="text-left font-mono text-sm">{faNum(tables[name]?.length ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        <p className="font-bold text-primary">ساختار فایل بکاپ</p>
        <pre className="mt-2 overflow-x-auto font-mono text-xs leading-6">{JSON.stringify({ exportedAt: "2024-01-01T00:00:00.000Z", site: "nibrc.ir", tableCount: 55, recordCount: 1234, tables: { users: "[...]", courses: "[...]", questions: "[...]" } }, null, 2)}</pre>
        <p className="mt-2 text-xs">فایل JSON شامل تمام جداول و رکوردهای سایت هست. فقط ادمین‌ها می‌تونن از این بخش استفاده کنن.</p>
      </div>
    </div>
  );
}

// ── Sync Management ────────────────────────────────────────────────────────
function AdminSync() {
  const [syncKey, setSyncKey] = useState("nibrc-sync-secret-2024");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const syncEndpoint = "https://tough-goldfish-134.convex.site/sync/data";
  const pushEndpoint = "https://tough-goldfish-134.convex.site/sync/push";

  const handleTestEndpoint = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(syncEndpoint, {
        headers: { "X-Sync-Key": syncKey },
      });
      if (res.ok) {
        const data = await res.json();
        const tableCount = Object.keys(data).filter(k => k !== "synced_at").length;
        setTestResult(`✅ اتصال موفق! ${tableCount} جدول داده موجود است.`);
      } else {
        setTestResult(`❌ خطا: HTTP ${res.status}`);
      }
    } catch (e) {
      setTestResult(`❌ خطا در اتصال: ${e instanceof Error ? e.message : "خطای ناشناخته"}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="مدیریت سینک" subtitle="تنظیمات سینک با سایت ایرانی" />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="space-y-4 py-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="font-bold text-primary text-sm">📌 آدرس‌های سینک</p>
            <div className="mt-3 space-y-2 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">GET</span>
                <span className="rounded bg-muted px-2 py-1">{syncEndpoint}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">POST</span>
                <span className="rounded bg-muted px-2 py-1">{pushEndpoint}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold">کلید سینک (SYNC_API_KEY)</label>
            <p className="text-xs text-muted-foreground mb-2">
              این کلید باید در Convex Dashboard → Settings → Environment Variables تنظیم شود.
            </p>
            <div className="flex gap-2">
              <Input
                type={showKey ? "text" : "password"}
                value={syncKey}
                onChange={(e) => setSyncKey(e.target.value)}
                className="font-mono text-sm"
              />
              <Button variant="outline" size="sm" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Button onClick={handleTestEndpoint} disabled={testing} className="rounded-lg">
              {testing ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <RefreshCw className="ml-1.5 size-4" />}
              تست اتصال
            </Button>
            {testResult && (
              <p className="mt-2 text-sm">{testResult}</p>
            )}
          </div>

          <div className="rounded-lg border border-border/50 p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-bold text-foreground">راهنمای تنظیم سینک</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>وارد Convex Dashboard شوید (console.convex.dev)</li>
              <li>پروژه NIBRC را انتخاب کنید</li>
              <li>Settings → Environment Variables</li>
              <li>متغیر <code className="bg-muted px-1 rounded">SYNC_API_KEY</code> را با مقدار بالا تنظیم کنید</li>
              <li>همین کلید را در سایت ایرانی (وردپرس) هم وارد کنید</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


// ── Admin: Class Management ────────────────────────────────────────────────
function AdminClasses() {
  const rooms = useQuery(api.admin.adminListClassRooms) ?? [];
  const deleteRoom = useMutation(api.collab.deleteRoom);
  const setRoomStatus = useMutation(api.collab.setRoomStatus);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const live = rooms.filter((r: any) => r.status === "live");
  const past = rooms.filter((r: any) => r.status === "ended");

  const handleDelete = async (roomId: string) => {
    if (!confirm("آیا از حذف این کلاس مطمئنید؟ تمام پیام‌ها و اطلاعات کلاس حذف خواهد شد.")) return;
    setDeletingId(roomId);
    try { await deleteRoom({ roomId: roomId as any }); toast.success("کلاس حذف شد"); } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); } finally { setDeletingId(null); }
  };

  const handleEndLive = async (roomId: string) => {
    try { await setRoomStatus({ roomId: roomId as any, status: "ended" }); toast.success("کلاس پایان یافت"); } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="مدیریت کلاس‌ها" subtitle="مشاهده، پایان و حذف کلاس‌های برگزارشده" count={rooms.length} />

      {live.length > 0 && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader><CardTitle className="text-sm">کلاس‌های در حال برگزاری ({faNum(live.length)})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>عنوان</TableHead><TableHead>موضوع</TableHead><TableHead>مدرس</TableHead><TableHead>وضعیت</TableHead><TableHead className="text-left">عملیات</TableHead></TableRow></TableHeader>
              <TableBody>
                {live.map((r: any) => (
                  <TableRow key={r._id}>
                    <TableCell className="text-sm font-medium">{r.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.topic}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.instructorName}</TableCell>
                    <TableCell><span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-bold text-red-500">LIVE</span></TableCell>
                    <TableCell className="text-left">
                      <Button size="sm" variant="outline" className="h-7 text-xs text-amber-500 border-amber-500/30 hover:bg-amber-500/10" onClick={() => handleEndLive(r._id)}>
                        پایان کلاس
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader><CardTitle className="text-sm">سوابق کلاس‌ها ({faNum(past.length)})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>عنوان</TableHead><TableHead>موضوع</TableHead><TableHead>مدرس</TableHead><TableHead>تاریخ</TableHead><TableHead className="text-left">عملیات</TableHead></TableRow></TableHeader>
              <TableBody>
                {past.map((r: any) => (
                  <TableRow key={r._id}>
                    <TableCell className="text-sm font-medium">{r.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.topic}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.instructorName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell className="text-left">
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-400/10" disabled={deletingId === r._id} onClick={() => handleDelete(r._id)}>
                        {deletingId === r._id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                        <span className="mr-1">حذف</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {rooms.length === 0 && (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Clock className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">هنوز کلاسی ثبت نشده است.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


// ── Store Product Approval ─────────────────────────────────────────────────
function AdminStoreApproval() {
  const pending = useQuery(api.admin.adminListPendingStoreProducts);
  const all = useQuery(api.admin.adminGetAllStoreProducts);
  const approve = useMutation(api.admin.adminApproveStoreProduct);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleApprove = async (id: string, status: "approved" | "rejected", reason?: string) => {
    setBusyId(id);
    try {
      await approve({ productId: id as any, status, rejectionReason: reason });
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const list = tab === "pending" ? pending : all;

  return (
    <div className="space-y-5">
      <SectionHeader title="تأیید محصولات بازارچه" subtitle="marketplace / store approvals" count={pending?.length} />

      <div className="flex gap-2">
        <Button size="sm" variant={tab === "pending" ? "default" : "outline"} onClick={() => setTab("pending")}>
          در انتظار تأیید {pending?.length ? `(${pending.length})` : ""}
        </Button>
        <Button size="sm" variant={tab === "all" ? "default" : "outline"} onClick={() => setTab("all")}>
          همه محصولات
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>فروشنده</TableHead>
                <TableHead>دسته</TableHead>
                <TableHead>قیمت</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    {tab === "pending" ? "محصولی در انتظار تأیید نیست." : "هنوز محصولی ثبت نشده."}
                  </TableCell>
                </TableRow>
              )}
              {(list ?? []).map((p: any) => (
                <TableRow key={p._id}>
                  <TableCell className="max-w-[200px] truncate font-medium">{p.title}</TableCell>
                  <TableCell className="text-muted-foreground">{p.sellerName}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{p.category}</TableCell>
                  <TableCell>{formatPrice(p.price)}</TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold",
                      p.status === "approved" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" :
                      p.status === "rejected" ? "border-red-500/30 bg-red-500/10 text-red-500" :
                      "border-amber-500/30 bg-amber-500/10 text-amber-500"
                    )}>
                      {p.status === "approved" ? "تأیید شده" : p.status === "rejected" ? "رد شده" : "در انتظار"}
                    </span>
                  </TableCell>
                  <TableCell className="text-left">
                    {p.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs" disabled={busyId === p._id} onClick={() => handleApprove(p._id, "approved")}>
                          {busyId === p._id ? <Loader2 className="size-3 animate-spin" /> : "تأیید"}
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={busyId === p._id} onClick={() => handleApprove(p._id, "rejected", "رد شده توسط مدیر")}>
                          رد
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Discount Management ────────────────────────────────────────────────────
function AdminDiscounts() {
  const courses = useQuery(api.admin.adminListCoursesForDiscount);
  const products = useQuery(api.admin.adminListProductsForDiscount);
  const setCourseDiscount = useMutation(api.admin.adminSetCourseDiscount);
  const setProductDiscount = useMutation(api.admin.adminSetProductDiscount);
  const [dialog, setDialog] = useState<{ type: "course" | "product"; item: any } | null>(null);
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountDays, setDiscountDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"course" | "product">("course");

  const items = tab === "course" ? courses : products;

  const openDiscount = (type: "course" | "product", item: any) => {
    setDialog({ type, item });
    // Compute existing percent from price + discountPrice
    const pct = item.discountPrice && item.price > 0
      ? String(Math.round((1 - item.discountPrice / item.price) * 100))
      : "";
    setDiscountPercent(pct);
    setDiscountDays("7");
  };

  const handleSave = async () => {
    if (!dialog) return;
    setBusy(true);
    try {
      const pct = discountPercent ? Number(discountPercent) : undefined;
      const expiresAt = pct ? Date.now() + Number(discountDays) * 86400000 : undefined;
      if (dialog.type === "course") {
        await setCourseDiscount({ courseId: dialog.item._id, discountPercent: pct, discountExpiresAt: expiresAt });
      } else {
        await setProductDiscount({ productId: dialog.item._id, discountPercent: pct, discountExpiresAt: expiresAt });
      }
      setDialog(null);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="تخفیفات ویژه" subtitle="discounts / flash pricing" />

      <div className="flex gap-2">
        <Button size="sm" variant={tab === "course" ? "default" : "outline"} onClick={() => setTab("course")}>دوره‌ها</Button>
        <Button size="sm" variant={tab === "product" ? "default" : "outline"} onClick={() => setTab("product")}>محصولات</Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>قیمت اصلی</TableHead>
                <TableHead>قیمت تخفیفی</TableHead>
                <TableHead>تخفیف</TableHead>
                <TableHead>انقضا</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items ?? []).map((item: any) => {
                const hasDiscount = item.discountPrice && item.discountPrice > 0;
                const expired = hasDiscount && item.discountExpiresAt && item.discountExpiresAt < Date.now();
                const discountPct = hasDiscount ? Math.round((1 - item.discountPrice / item.price) * 100) : 0;
                return (
                  <TableRow key={item._id}>
                    <TableCell className="max-w-[250px] truncate font-medium">{item.title}</TableCell>
                    <TableCell>{formatPrice(item.price)}</TableCell>
                    <TableCell className={hasDiscount && !expired ? "text-emerald-600 font-bold" : ""}>
                      {hasDiscount && !expired ? formatPrice(item.discountPrice) : "—"}
                    </TableCell>
                    <TableCell>
                      {hasDiscount && !expired ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                          {discountPct}% تخفیف
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {hasDiscount && item.discountExpiresAt ? (
                        expired ? (
                          <span className="text-red-500">منقضی شده</span>
                        ) : (
                          formatJalaliDate(item.discountExpiresAt)
                        )
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-left">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDiscount(tab, item)}>
                        {hasDiscount && !expired ? "ویرایش تخفیف" : "افزودن تخفیف"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تنظیم تخفیف — {dialog?.item?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">قیمت اصلی</label>
                <p className="font-bold">{formatPrice(dialog?.item?.price ?? 0)}</p>
              </div>
              <Input type="number" min={0} max={100} placeholder="درصد تخفیف (0-100)" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} />
            </div>
            {discountPercent && Number(discountPercent) > 0 && Number(discountPercent) <= 100 && (
              <div className="rounded-md bg-emerald-500/10 px-3 py-2">
                <p className="text-sm text-emerald-600 font-bold">
                  {Number(discountPercent)}% تخفیف اعمال می‌شود
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  قیمت جدید: {formatPrice(Math.round((dialog?.item?.price ?? 0) * (1 - Number(discountPercent) / 100)))} تومان
                </p>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">مدت اعتبار (روز)</label>
              <Select value={discountDays} onValueChange={setDiscountDays}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">۳ روز</SelectItem>
                  <SelectItem value="7">۱ هفته</SelectItem>
                  <SelectItem value="14">۲ هفته</SelectItem>
                  <SelectItem value="30">۱ ماه</SelectItem>
                  <SelectItem value="60">۲ ماه</SelectItem>
                  <SelectItem value="90">۳ ماه</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSave} disabled={busy}>
                {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
                ذخیره تخفیف
              </Button>
              {discountPercent && (
                <Button variant="destructive" onClick={async () => {
                  setBusy(true);
                  try {
                    if (dialog?.type === "course") {
                      await setCourseDiscount({ courseId: dialog.item._id, discountPercent: 0, discountExpiresAt: undefined });
                    } else if (dialog?.type === "product") {
                      await setProductDiscount({ productId: dialog.item._id, discountPercent: 0, discountExpiresAt: undefined });
                    }
                    setDialog(null);
                  } finally { setBusy(false); }
                }}>
                  حذف تخفیف
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Parse Jalali date string (1404/06/15 or 1404-6-15) to timestamp */
function parseJalaliToDate(value: string): number | null {
  const en = value.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)));
  const parts = en.split(/[\/-]/).map((p) => parseInt(p.trim(), 10));
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  try {
    const { toGregorian } = require("jalaali-js");
    const g = toGregorian(parts[0], parts[1], parts[2]);
    return new Date(g.gy, g.gm - 1, g.gd).getTime();
  } catch {
    return null;
  }
}

// ── Flash Sales (campaigns) ────────────────────────────────────────────────
function AdminFlashSales() {
  const sales = useQuery(api.promotions.listAllFlashSales);
  const create = useMutation(api.promotions.createFlashSale);
  const toggle = useMutation(api.promotions.toggleFlashSale);
  const remove = useMutation(api.promotions.deleteFlashSale);
  const [dialog, setDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [percent, setPercent] = useState("20");
  const [targetType, setTargetType] = useState<"course" | "workshop" | "product" | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !startDate || !endDate) return;
    setBusy(true);
    try {
      const startTs = parseJalaliToDate(startDate);
      const endTs = parseJalaliToDate(endDate);
      if (!startTs || !endTs) {
        toast.error("تاریخ را به صورت 1404/06/15 وارد کنید.");
        return;
      }
      await create({
        title,
        targetType,
        percent: Number(percent),
        startsAt: startTs,
        expiresAt: endTs,
      });
      setDialog(false);
      setTitle("");
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="فروش ویژه" subtitle="flash sales / campaigns" count={sales?.length} />
        <Button className="rounded-lg" onClick={() => setDialog(true)}>
          <Plus className="ml-1.5 size-4" />
          کمپین جدید
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>تخفیف</TableHead>
                <TableHead>نوع هدف</TableHead>
                <TableHead>شروع</TableHead>
                <TableHead>پایان</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sales ?? []).map((s: any) => {
                const now = Date.now();
                const active = s.active && s.startsAt <= now && s.expiresAt >= now;
                const expired = s.expiresAt < now;
                return (
                  <TableRow key={s._id}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell><span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">{s.percent}%</span></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.targetType === "all" ? "همه" : s.targetType === "course" ? "دوره" : s.targetType === "workshop" ? "کارگاه" : "محصول"}</TableCell>
                    <TableCell className="text-xs">{formatJalaliDate(s.startsAt)}</TableCell>
                    <TableCell className="text-xs">{formatJalaliDate(s.expiresAt)}</TableCell>
                    <TableCell>
                      {expired ? (
                        <span className="text-xs text-red-500">منقضی</span>
                      ) : active ? (
                        <span className="text-xs text-emerald-500 font-bold">فعال</span>
                      ) : (
                        <span className="text-xs text-amber-500">غیرفعال</span>
                      )}
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggle({ id: s._id, active: !s.active })}>
                          {s.active ? "غیرفعال" : "فعال"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => remove({ id: s._id })}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(sales ?? []).length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">هنوز کمپینی ثبت نشده.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>کمپین فروش ویژه جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="عنوان کمپین (مثلاً جشنواره پایان ترم)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="درصد تخفیف" value={percent} onChange={(e) => setPercent(e.target.value)} />
              <Select value={targetType} onValueChange={(v) => setTargetType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="course">دوره‌ها</SelectItem>
                  <SelectItem value="workshop">کارگاه‌ها</SelectItem>
                  <SelectItem value="product">محصولات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">تاریخ شروع (شمسی)</label>
                <Input dir="ltr" placeholder="1404/06/15" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">تاریخ پایان (شمسی)</label>
                <Input dir="ltr" placeholder="1404/07/15" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={busy}>
              {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
              ساخت کمپین
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Promotional Banners (scrolling ticker) ──────────────────────────────────
function AdminPromoBanners() {
  const banners = useQuery(api.promotions.listAllPromoBanners);
  const create = useMutation(api.promotions.createPromoBanner);
  const toggle = useMutation(api.promotions.togglePromoBanner);
  const remove = useMutation(api.promotions.deletePromoBanner);
  const [dialog, setDialog] = useState(false);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [sticker, setSticker] = useState("");
  const [priority, setPriority] = useState("5");
  const [repeatCount, setRepeatCount] = useState("1");
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await create({ text, link: link || undefined, sticker: sticker || undefined, priority: Number(priority) || 5, repeatCount: Number(repeatCount) || 1 });
      setDialog(false);
      setText(""); setLink(""); setSticker(""); setPriority("5"); setRepeatCount("1");
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="بنر تبلیغاتی" subtitle="promotional banners / scrolling ticker" count={banners?.length} />
        <Button className="rounded-lg" onClick={() => setDialog(true)}>
          <Plus className="ml-1.5 size-4" />
          بنر جدید
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>متن</TableHead>
                <TableHead>استیکر</TableHead>
                <TableHead>اولویت</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(banners ?? []).map((b: any) => (
                <TableRow key={b._id}>
                  <TableCell className="max-w-xs truncate font-medium">{b.text}</TableCell>
                  <TableCell className="text-lg">{b.sticker ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{b.priority}</TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold",
                      b.active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : "border-slate-400/30 bg-slate-400/10 text-slate-500"
                    )}>
                      {b.active ? "فعال" : "غیرفعال"}
                    </span>
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggle({ id: b._id, active: !b.active })}>
                        {b.active ? "غیرفعال" : "فعال"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => remove({ id: b._id })}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(banners ?? []).length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">هنوز بنری ثبت نشده.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>بنر تبلیغاتی جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="متن بنر (مثلاً: تخفیف ۳۰٪ دوره‌ها تا پایان هفته)" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="لینک (اختیاری)" value={link} onChange={(e) => setLink(e.target.value)} />
              <Input placeholder="استیکر / ایموجی (اختیاری)" value={sticker} onChange={(e) => setSticker(e.target.value)} />
            </div>
            <Input type="number" placeholder="اولویت (بزرگتر = اول)" value={priority} onChange={(e) => setPriority(e.target.value)} />
            <Input type="number" placeholder="تعداد تکرار (1 تا 10)" value={repeatCount} onChange={(e) => setRepeatCount(e.target.value)} />
            <Button className="w-full" onClick={handleCreate} disabled={busy}>
              {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
              ساخت بنر
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Academy Path (مسیر آکادمی — سلسله کارگاه‌ها) ────────────────────────────────
function AdminAcademyPaths() {
  const paths = useQuery(api.academyPaths.adminListPaths);
  const workshops = useQuery(api.admin.adminListWorkshops);
  const create = useMutation(api.academyPaths.adminCreatePath);
  const update = useMutation(api.academyPaths.adminUpdatePath);
  const remove = useMutation(api.academyPaths.adminDeletePath);
  const addItem = useMutation(api.academyPaths.adminAddPathItem);
  const removeItem = useMutation(api.academyPaths.adminRemovePathItem);
  const moveItem = useMutation(api.academyPaths.adminMovePathItem);

  const [dialog, setDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("beginner");
  const [busy, setBusy] = useState(false);
  const [openPathId, setOpenPathId] = useState<string | null>(null);
  const [pickedWorkshop, setPickedWorkshop] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const id = await create({ title: title.trim(), description: description.trim(), level });
      setOpenPathId(id as string);
      setDialog(false);
      setTitle(""); setDescription(""); setLevel("beginner");
      toast.success("مسیر ساخته شد — حالا کارگاه‌ها را اضافه کنید");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const handleAddItem = async () => {
    if (!openPathId || !pickedWorkshop) return;
    try {
      await addItem({ pathId: openPathId as any, workshopId: pickedWorkshop as any });
      setPickedWorkshop("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  const LEVELS: Record<string, string> = {
    beginner: "مبتدی",
    intermediate: "متوسط",
    advanced: "پیشرفته",
    mixed: "ترکیبی",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="مسیر آکادمی" subtitle="academy path / workshop series" count={paths?.length} />
        <Button className="rounded-lg" onClick={() => setDialog(true)}>
          <Plus className="ml-1.5 size-4" />
          مسیر جدید
        </Button>
      </div>

      {paths === undefined ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : paths.length === 0 ? (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <RouteIcon className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">هنوز مسیری ساخته نشده. با «مسیر جدید» شروع کنید.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paths.map((p: any) => {
            const open = openPathId === p._id;
            return (
              <Card key={p._id} className="border-border/70 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <RouteIcon className="size-5 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{p.title}</p>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{LEVELS[p.level] ?? p.level}</span>
                        <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-bold",
                          p.published ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-slate-400/30 bg-slate-400/10 text-muted-foreground"
                        )}>
                          {p.published ? "منتشر شده" : "پیش‌نویس"}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.description}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{p.items.length} کارگاه در این مسیر</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setOpenPathId(open ? null : p._id); setPickedWorkshop(""); }}>
                        {open ? "بستن" : "مدیریت کارگاه‌ها"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => update({ id: p._id, published: !p.published })}>
                        {p.published ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        {p.published ? "لغو انتشار" : "انتشار"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => remove({ id: p._id })}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {open && (
                    <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                      {p.items.length === 0 ? (
                        <p className="py-2 text-center text-xs text-muted-foreground">هنوز کارگاهی اضافه نشده. از پایین اضافه کنید.</p>
                      ) : (
                        <div className="space-y-2">
                          {p.items.map((item: any, idx: number) => (
                            <div key={item._id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">{idx + 1}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold">{item.workshopTitle}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {item.workshopDate ? formatJalaliDate(new Date(item.workshopDate).getTime()) : "بدون تاریخ"}
                                  {item.workshopTime ? ` — ${item.workshopTime}` : ""}
                                </p>
                              </div>
                              <Button size="icon" variant="ghost" className="size-6" disabled={idx === 0} onClick={() => moveItem({ id: item._id, direction: "up" })}>
                                <ArrowUp className="size-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="size-6" disabled={idx === p.items.length - 1} onClick={() => moveItem({ id: item._id, direction: "down" })}>
                                <ArrowDown className="size-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => removeItem({ id: item._id })}>
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Select value={pickedWorkshop} onValueChange={setPickedWorkshop}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="کارگاه را انتخاب کنید…" /></SelectTrigger>
                          <SelectContent>
                            {(workshops ?? []).map((w: any) => (
                              <SelectItem key={w._id} value={w._id}>{w.title} — {w.topic}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-9" disabled={!pickedWorkshop} onClick={handleAddItem}>
                          <Plus className="ml-1 size-3.5" />
                          افزودن
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>مسیر آکادمی جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="عنوان مسیر (مثلاً: مسیر میکروبیولوژی عمومی)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="توضیح مسیر…" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">مبتدی</SelectItem>
                <SelectItem value="intermediate">متوسط</SelectItem>
                <SelectItem value="advanced">پیشرفته</SelectItem>
                <SelectItem value="mixed">ترکیبی</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={handleCreate} disabled={busy || !title.trim()}>
              {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
              ساخت مسیر
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Certificate requests (درخواست‌های گواهی) ──────────────────────────────────
function AdminCertificates() {
  const requests = useQuery(api.promotions.listAllCertRequests);
  const all = useQuery(api.promotions.listMyCertificates) as any[] | undefined;
  const resolve = useMutation(api.promotions.resolveCertificate);
  const getUploadUrl = useMutation(api.upload.getUploadUrl);
  const [uploading, setUploading] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showAll, setShowAll] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(id);
    try {
      const url = await getUploadUrl();
      const storageId = await uploadBlob(url, file);
      await resolve({ id, status: "approved", certificateStorageId: storageId });
      toast.success("گواهی آپلود و تایید شد");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در آپلود");
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="درخواست‌های گواهی" subtitle="certificate requests" count={requests?.length} />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>دانشجو</TableHead>
                <TableHead>دوره</TableHead>
                <TableHead>تاریخ درخواست</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(requests ?? []).map((r: any) => (
                <TableRow key={r._id}>
                  <TableCell className="font-medium">{r.userName}</TableCell>
                  <TableCell className="text-xs">{r.courseTitle}</TableCell>
                  <TableCell className="text-xs">{formatJalaliDate(r.requestedAt)}</TableCell>
                  <TableCell>
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">در انتظار</span>
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center justify-end gap-1">
                      <label className="cursor-pointer">
                        <input type="file" accept=".pdf,image/*" hidden disabled={uploading === r._id}
                          onChange={(e) => handleUpload(e, r._id)} />
                        <span className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 text-xs font-bold text-emerald-600 hover:bg-emerald-500/20">
                          {uploading === r._id ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                          آپلود گواهی
                        </span>
                      </label>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                        onClick={async () => {
                          try {
                            await resolve({ id: r._id, status: "rejected", note: note || undefined });
                            toast.success("درخواست رد شد");
                          } catch (e) { toast.error("خطا"); }
                        }}>
                        رد
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(requests ?? []).length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">درخواست گواهی جدیدی وجود ندارد.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showAll && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">تاریخچه کامل گواهی‌ها</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>دوره</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>فایل گواهی</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(all ?? []).map((c: any) => (
                  <TableRow key={c._id}>
                    <TableCell className="text-xs">{c.courseTitle}</TableCell>
                    <TableCell>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold",
                        c.status === "approved" ? "bg-emerald-500/15 text-emerald-600" : c.status === "rejected" ? "bg-red-500/15 text-red-600" : "bg-amber-500/15 text-amber-600"
                      )}>
                        {c.status === "approved" ? "صادر شده" : c.status === "rejected" ? "رد شده" : "در انتظار"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {c.certificateUrl ? (
                        <a href={c.certificateUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline">دانلود</a>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Button variant="outline" className="rounded-lg text-xs" onClick={() => setShowAll((s) => !s)}>
        {showAll ? "بستن تاریخچه" : "نمایش تاریخچه کامل"}
      </Button>
    </div>
  );
}
