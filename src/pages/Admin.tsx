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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { faNum, formatDateTime, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Activity,
  BarChart3,
  BookOpen,
  BookUser,
  ChevronDown,
  ClipboardList,
  Compass,
  CreditCard,
  DollarSign,
  FileText,
  Headset,
  HelpCircle,
  Layers,
  Loader2,
  Lock,
  Package,
  Plus,
  Repeat,
  Send,
  ShieldCheck,
  Terminal,
  Ticket,
  TrendingUp,
  Users,
  Video,
  X,
} from "lucide-react";
import { useState } from "react";
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
  | "support";

const NAV_GROUPS: { title: string; items: { key: Section; label: string; icon: typeof Activity }[] }[] = [
  {
    title: "نظارت",
    items: [
      { key: "overview", label: "نمای کلی", icon: Activity },
      { key: "users", label: "کاربران و دسترسی‌ها", icon: Users },
      { key: "orders", label: "سفارش‌ها", icon: CreditCard },
      { key: "coupons", label: "کدهای تخفیف", icon: Ticket },
      { key: "support", label: "پشتیبانی", icon: ShieldCheck },
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
    ],
  },
  {
    title: "تیم",
    items: [{ key: "instructors", label: "استادان", icon: BookUser }],
  },
];

const ALL_SECTIONS = NAV_GROUPS.flatMap((g) => g.items);

const ROLES = ["user", "member", "instructor", "mentor", "content_manager", "support", "admin"];
const ROLE_LABELS: Record<string, string> = {
  user: "دانشجو",
  member: "عضو",
  instructor: "استاد",
  mentor: "منتور",
  content_manager: "مدیر محتوا",
  support: "پشتیبانی",
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
  const isAdmin = useQuery(api.admin.amIAdmin);
  const [section, setSection] = useState<Section>("overview");
  const navigate = useNavigate();

  // Staff panels the admin can jump into (every role except student).
  const ROLE_JUMP: { label: string; icon: typeof ShieldCheck; to: string }[] = [
    { label: "استودیوی استاد", icon: Video, to: "/panel/instructor" },
    { label: "میز منتور", icon: Compass, to: "/panel/mentor" },
    { label: "استودیوی محتوا", icon: FileText, to: "/panel/content" },
    { label: "میز پشتیبانی", icon: Headset, to: "/panel/support" },
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
            فهرست ادمین‌ها وارد شوید (مثلاً <span dir="ltr" className="font-mono">admin@gmail.com</span>)
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-[1400px]">
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

          <nav className="mt-6 flex-1 space-y-5 overflow-y-auto">
            {NAV_GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  {g.title}
                </p>
                <div className="space-y-0.5">
                  {g.items.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSection(s.key)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                        section === s.key
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <s.icon className="size-4" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-4 space-y-2 border-t border-border/70 pt-3">
            <Button asChild variant="ghost" size="sm" className="w-full justify-start rounded-lg text-xs">
              <Link to="/dashboard">
                <BookOpen className="ml-2 size-4" />
                پنل دانشجویی
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="w-full justify-start rounded-lg text-xs">
              <Link to="/">
                <X className="ml-2 size-4" />
                خروج از کنسول
              </Link>
            </Button>
          </div>
        </aside>

        {/* Main column */}
        <main className="min-w-0 flex-1">
          {/* Console topbar */}
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-lg">
            <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <Terminal className="size-3.5 text-primary" />
                <span>admin</span>
                <span className="text-border">/</span>
                <span className="text-foreground">{active.label}</span>
              </div>
              <div className="flex items-center gap-2 lg:hidden">
                <Select value={section} onValueChange={(v) => setSection(v as Section)}>
                  <SelectTrigger className="h-9 w-44 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_SECTIONS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate("/admin")}
                      className="cursor-pointer"
                    >
                      <ShieldCheck className="ml-2 size-4" />
                      کنسول مدیریت
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button asChild variant="outline" size="sm" className="hidden h-8 rounded-lg text-xs lg:inline-flex">
                  <Link to="/dashboard">پنل دانشجویی</Link>
                </Button>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6">
            {section === "overview" && <AdminOverview />}
            {section === "courses" && <AdminCourses />}
            {section === "questions" && <AdminQuestions />}
            {section === "exams" && <AdminExams />}
            {section === "articles" && <AdminArticles />}
            {section === "workshops" && <AdminWorkshops />}
            {section === "products" && <AdminProducts />}
            {section === "instructors" && <AdminInstructors />}
            {section === "users" && <AdminUsers />}
            {section === "orders" && <AdminOrders />}
            {section === "coupons" && <AdminCoupons />}
            {section === "support" && <AdminSupport />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Overview ────────────────────────────────────────────────────────────────
function AdminOverview() {
  const stats = useQuery(api.admin.getAdminStats);
  const revenue = useQuery(api.admin.getRevenueSeries);
  const enrollments = useQuery(api.admin.getEnrollmentStats);

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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
  const courses = useQuery(api.admin.adminListCourses);
  const categories = useQuery(api.content.listCategories);
  const instructors = useQuery(api.content.listInstructors);
  const create = useMutation(api.admin.adminCreateCourse);
  const update = useMutation(api.admin.adminUpdateCourse);
  const toggle = useMutation(api.admin.adminTogglePublish);
  const remove = useMutation(api.admin.adminDeleteCourse);

  const empty = { title: "", summary: "", price: "0", categoryId: "", instructorId: "", mode: "recorded", bundle: "basic", published: false };
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; course: any } | null>(null);
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openCreate = () => { setForm(empty); setErr(null); setDialog({ mode: "create" }); };
  const openEdit = (c: any) => {
    setForm({
      title: c.title,
      summary: c.summary,
      price: String(c.discountPrice ?? c.price),
      categoryId: c.categoryId,
      instructorId: c.instructorId,
      mode: c.mode,
      bundle: c.bundle,
      published: c.published,
    });
    setErr(null);
    setDialog({ mode: "edit", course: c });
  };

  const handleSave = async () => {
    setErr(null);
    if (!form.title.trim() || !form.categoryId || !form.instructorId) {
      setErr("عنوان، دسته و مدرس الزامی است.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: form.title,
        summary: form.summary,
        price: Number(form.price) || 0,
        categoryId: form.categoryId as any,
        instructorId: form.instructorId as any,
        mode: form.mode,
        bundle: form.bundle,
        published: form.published,
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
                  <TableCell><StatusChip published={c.published} /></TableCell>
                  <TableCell>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "ویرایش دوره" : "دورهٔ جدید"}</DialogTitle>
            <DialogDescription>
              می‌توانی به‌عنوان پیش‌نویس ذخیره کنی و بعداً پس از تکمیل، منتشرش کنی.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="عنوان دوره" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="خلاصهٔ دوره" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="قیمت (تومان)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">کلاس زنده</SelectItem>
                  <SelectItem value="recorded">ضبط‌شده</SelectItem>
                  <SelectItem value="hybrid">ترکیبی</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.categoryId || undefined} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="دسته" /></SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.instructorId || undefined} onValueChange={(v) => setForm({ ...form, instructorId: v })}>
                <SelectTrigger><SelectValue placeholder="مدرس" /></SelectTrigger>
                <SelectContent>
                  {(instructors ?? []).map((i) => (
                    <SelectItem key={i._id} value={i._id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <PublishPicker value={form.published} onChange={(v) => setForm({ ...form, published: v })} />
            <Button className="w-full" onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
              {dialog?.mode === "edit" ? "ذخیرهٔ تغییرات" : "ساخت دوره"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Questions ───────────────────────────────────────────────────────────────
function AdminQuestions() {
  const questions = useQuery(api.admin.adminGetQuestions);
  const categories = useQuery(api.content.listCategories);
  const create = useMutation(api.admin.adminCreateQuestion);

  const empty = { text: "", options: ["", "", "", ""], correctIndex: "0", explanation: "", topicId: "", difficulty: "1" };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const handleCreate = async () => {
    try {
      await create({
        text: form.text,
        options: form.options.filter((o) => o.trim()),
        correctIndex: Number(form.correctIndex),
        explanation: form.explanation,
        topicId: form.topicId as any,
        difficulty: Number(form.difficulty),
      });
      setOpen(false);
      setForm(empty);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="بانک سؤال" subtitle="content / question bank" count={questions?.length} />
        <Button className="rounded-lg" onClick={() => setOpen(true)}>
          <Plus className="ml-1.5 size-4" />
          سؤال جدید
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>سؤال</TableHead>
                <TableHead>موضوع</TableHead>
                <TableHead>سختی</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(questions ?? []).map((q) => (
                <TableRow key={q._id}>
                  <TableCell className="max-w-md truncate">{q.text}</TableCell>
                  <TableCell className="text-muted-foreground">{q.topic}</TableCell>
                  <TableCell>
                    {q.difficulty === 1 ? "آسان" : q.difficulty === 2 ? "متوسط" : "سخت"}
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
            <DialogTitle>سؤال تستی جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea placeholder="متن سؤال" rows={2} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
            {form.options.map((opt, i) => (
              <Input
                key={i}
                placeholder={`گزینهٔ ${i + 1}${i === Number(form.correctIndex) ? " (صحیح)" : ""}`}
                value={opt}
                onChange={(e) => setForm({ ...form, options: form.options.map((o, oi) => (oi === i ? e.target.value : o)) })}
              />
            ))}
            <div className="grid grid-cols-3 gap-3">
              <Select value={form.correctIndex} onValueChange={(v) => setForm({ ...form, correctIndex: v })}>
                <SelectTrigger><SelectValue placeholder="گزینهٔ صحیح" /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3].map((i) => (
                    <SelectItem key={i} value={String(i)}>گزینهٔ {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.topicId || undefined} onValueChange={(v) => setForm({ ...form, topicId: v })}>
                <SelectTrigger><SelectValue placeholder="موضوع" /></SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">آسان</SelectItem>
                  <SelectItem value="2">متوسط</SelectItem>
                  <SelectItem value="3">سخت</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="پاسخ تشریحی" rows={2} value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
            <Button className="w-full" onClick={handleCreate}>ذخیرهٔ سؤال</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Exams ───────────────────────────────────────────────────────────────────
function AdminExams() {
  const exams = useQuery(api.admin.adminListExams);
  const categories = useQuery(api.content.listCategories);
  const create = useMutation(api.admin.adminCreateExam);
  const toggle = useMutation(api.admin.adminToggleExamPublish);

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
                    <PublishActions published={e.published} onToggle={() => toggle({ id: e._id, published: !e.published })} />
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
            <div className="grid grid-cols-3 gap-3">
              <Input type="number" placeholder="زمان (دقیقه)" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
              <Input type="number" placeholder="تعداد سؤال" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} />
              <Select value={form.topicId || undefined} onValueChange={(v) => setForm({ ...form, topicId: v })}>
                <SelectTrigger><SelectValue placeholder="موضوع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همهٔ موضوعات</SelectItem>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

  const empty = { title: "", category: "", excerpt: "", body: "", authorName: "", published: false };
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; article: any } | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="مقالات رایگان" subtitle="content / articles" count={articles?.length} />
        <Button className="rounded-lg" onClick={openCreate}>
          <Plus className="ml-1.5 size-4" />
          مطلب جدید
        </Button>
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
            <div className="grid grid-cols-2 gap-3">
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
                <TableHead>استاد</TableHead>
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
                  <TableCell className="text-muted-foreground">{w.date}</TableCell>
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
              <SelectTrigger><SelectValue placeholder="استاد" /></SelectTrigger>
              <SelectContent>
                {(instructors ?? []).map((i) => (
                  <SelectItem key={i._id} value={i._id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="موضوع" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
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

  const empty = { title: "", type: "flashcards", description: "", price: "0", published: false };
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; product: any } | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const openCreate = () => { setForm(empty); setDialog({ mode: "create" }); };
  const openEdit = (p: any) => {
    setForm({ title: p.title, type: p.type, description: p.description, price: String(p.price), published: p.published });
    setDialog({ mode: "edit", product: p });
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      const payload = { title: form.title, type: form.type, description: form.description, price: Number(form.price) || 0, published: form.published };
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
                <TableHead>عنوان</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>قیمت</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(products ?? []).map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="max-w-md truncate font-medium">{p.title}</TableCell>
                  <TableCell className="text-muted-foreground">{p.typeLabel}</TableCell>
                  <TableCell>{formatPrice(p.price)}</TableCell>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "ویرایش محصول" : "محصول جدید"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flashcards">فلش‌کارت</SelectItem>
                  <SelectItem value="guide">کتابچهٔ راهنما</SelectItem>
                  <SelectItem value="poster">پوستر آموزشی</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="قیمت (تومان)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
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
  const instructors = useQuery(api.admin.adminListInstructors);
  const create = useMutation(api.admin.adminCreateInstructor);
  const update = useMutation(api.admin.adminUpdateInstructor);
  const remove = useMutation(api.admin.adminDeleteInstructor);

  const empty = { name: "", title: "", bio: "", education: "", specialties: "", accent: "teal", verified: false };
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; instructor: any } | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const openCreate = () => { setForm(empty); setDialog({ mode: "create" }); };
  const openEdit = (i: any) => {
    setForm({
      name: i.name,
      title: i.title,
      bio: i.bio,
      education: (i.education ?? []).join("\n"),
      specialties: (i.specialties ?? []).join("، "),
      accent: i.accent || "teal",
      verified: i.verified,
    });
    setDialog({ mode: "edit", instructor: i });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        title: form.title,
        bio: form.bio,
        education: form.education.split("\n").filter((e) => e.trim()),
        specialties: form.specialties.split("،").map((s) => s.trim()).filter(Boolean),
        accent: form.accent,
        verified: form.verified,
      };
      if (dialog?.mode === "edit") {
        await update({ id: dialog.instructor._id, ...payload });
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
        <SectionHeader title="استادان" subtitle="team / instructors" count={instructors?.length} />
        <Button className="rounded-lg" onClick={openCreate}>
          <Plus className="ml-1.5 size-4" />
          استاد جدید
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>تخصص</TableHead>
                <TableHead>دوره‌ها</TableHead>
                <TableHead>کارگاه‌ها</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(instructors ?? []).map((i) => (
                <TableRow key={i._id}>
                  <TableCell className="font-medium">
                    {i.name}
                    {i.verified && (
                      <span className="mr-1.5 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">✓</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground">{i.title}</TableCell>
                  <TableCell>{faNum(i.courseCount)}</TableCell>
                  <TableCell>{faNum(i.workshopCount)}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs leading-5 text-muted-foreground">
        برای دادن حساب ورود (ایمیل + رمز) به استاد، از بخش «کاربران و دسترسی‌ها» یک حساب با نقش
        «استاد» بساز؛ این بخش فقط پروفایل نمایشی استاد را مدیریت می‌کند.
      </p>

      <Dialog open={dialog !== null} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "ویرایش استاد" : "استاد جدید"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="تخصص (مثلاً میکروبیولوژی)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <Textarea placeholder="معرفی کوتاه" rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            <Textarea placeholder="تحصیلات (هر مورد در یک خط)" rows={2} value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
            <Input placeholder="تخصص‌ها (با ، جدا کنید)" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
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
            <Button className="w-full" onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
              {dialog?.mode === "edit" ? "ذخیرهٔ تغییرات" : "افزودن استاد"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Users ───────────────────────────────────────────────────────────────────
function AdminUsers() {
  const users = useQuery(api.admin.adminGetUsers);
  const setRole = useMutation(api.admin.adminSetRole);
  const createUser = useMutation(api.admin.adminCreateUser);
  const setPassword = useMutation(api.admin.adminSetPassword);
  const [emails, setEmails] = useState("");
  const addAdmin = useMutation(api.admin.adminAddAdmin);

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [formErr, setFormErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const [resetUser, setResetUser] = useState<{ _id: string; name: string | null } | null>(null);
  const [resetPass, setResetPass] = useState("");
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

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
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="حداقل ۴ کاراکتر" dir="ltr" className="text-left" type="password" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">نقش / سطح دسترسی</p>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
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

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row">
          <Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="ایمیل ادمین جدید (مثلاً ali@genova.team)" className="flex-1" dir="ltr" />
          <Button variant="outline" className="rounded-lg" onClick={() => { if (emails.trim()) addAdmin({ email: emails.trim() }); setEmails(""); }}>
            <Plus className="ml-1.5 size-4" />
            افزودن به ادمین‌ها
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>ایمیل</TableHead>
                <TableHead>نقش</TableHead>
                <TableHead>رمز</TableHead>
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
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r] ?? r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
            <Input
              value={resetPass}
              onChange={(e) => setResetPass(e.target.value)}
              placeholder="رمز جدید (حداقل ۴ کاراکتر)"
              type="password"
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
    </div>
  );
}

// ── Orders ──────────────────────────────────────────────────────────────────
function AdminOrders() {
  const orders = useQuery(api.admin.adminGetOrders);
  const update = useMutation(api.admin.adminUpdateOrderStatus);

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
