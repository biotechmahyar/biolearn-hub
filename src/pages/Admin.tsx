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
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  HelpCircle,
  Loader2,
  Lock,
  Plus,
  Repeat,
  Send,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Section = "overview" | "courses" | "questions" | "exams" | "users" | "orders" | "coupons" | "content" | "workshops" | "support";

const SECTIONS: { key: Section; label: string; icon: typeof Users }[] = [
  { key: "overview", label: "نمای کلی", icon: Activity },
  { key: "courses", label: "دوره‌ها", icon: BookOpen },
  { key: "questions", label: "بانک سؤال", icon: HelpCircle },
  { key: "exams", label: "آزمون‌ها", icon: ClipboardList },
  { key: "users", label: "کاربران", icon: Users },
  { key: "orders", label: "سفارش‌ها", icon: CreditCard },
  { key: "coupons", label: "کدهای تخفیف", icon: Ticket },
  { key: "content", label: "محتوای رایگان", icon: FileText },
  { key: "workshops", label: "کارگاه‌ها", icon: TrendingUp },
  { key: "support", label: "پشتیبانی", icon: ShieldCheck },
];

const ROLES = ["user", "member", "instructor", "mentor", "content_manager", "support", "admin"];

export default function Admin() {
  const isAdmin = useQuery(api.admin.amIAdmin);
  const [section, setSection] = useState<Section>("overview");

  if (isAdmin === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        در حال بررسی دسترسی...
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
            این بخش فقط برای اعضای تیم زیست‌آکادمی فعال است. برای دسترسی، با
            ایمیل ثبت‌شده در فهرست ادمین‌ها وارد شوید (مثلاً admin@zist.academy)
            یا از یکی از ادمین‌ها بخواهید ایمیل شما را اضافه کند.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/">بازگشت به سایت</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <span className="text-[15px] font-extrabold">پنل مدیریت زیست‌آکادمی</span>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/dashboard">بازگشت به پنل دانشجویی</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
        <aside className="shrink-0 lg:w-56">
          <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:pb-0">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                  section === s.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <s.icon className="size-4" />
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {section === "overview" && <AdminOverview />}
          {section === "courses" && <AdminCourses />}
          {section === "questions" && <AdminQuestions />}
          {section === "exams" && <AdminExams />}
          {section === "users" && <AdminUsers />}
          {section === "orders" && <AdminOrders />}
          {section === "coupons" && <AdminCoupons />}
          {section === "content" && <AdminContent />}
          {section === "workshops" && <AdminWorkshops />}
          {section === "support" && <AdminSupport />}
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
    { icon: DollarSign, label: "درآمد (تومان)", value: faNum(stats.revenue), color: "bg-emerald-50 text-emerald-600" },
    { icon: CreditCard, label: "سفارش‌های پرداخت‌شده", value: faNum(stats.paidOrderCount), color: "bg-violet-50 text-violet-600" },
    { icon: TrendingUp, label: "میانگین ارزش سفارش", value: faNum(stats.avgOrderValue), color: "bg-amber-50 text-amber-600" },
    { icon: Repeat, label: "تکرار خرید (نسبت)", value: faNum(stats.repeatPurchase), color: "bg-sky-50 text-sky-600" },
    { icon: ClipboardList, label: "تست‌های انجام‌شده", value: faNum(stats.attemptCount), color: "bg-rose-50 text-rose-600" },
    { icon: BarChart3, label: "میانگین درصد آزمون", value: `${faNum(stats.avgTestPercent)}٪`, color: "bg-teal-50 text-teal-600" },
    { icon: BookOpen, label: "دوره‌ها", value: faNum(stats.courseCount), color: "bg-indigo-50 text-indigo-600" },
    { icon: HelpCircle, label: "سؤالات", value: faNum(stats.questionCount), color: "bg-amber-50 text-amber-600" },
    { icon: Ticket, label: "تیکت‌های باز", value: faNum(stats.openTicketCount), color: "bg-red-50 text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">نمای کلی</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          KPIهای اصلی پلتفرم بر اساس دادهٔ واقعی.
        </p>
      </div>

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
              <p className="py-10 text-center text-sm text-muted-foreground">
                هنوز فروشی ثبت نشده است.
              </p>
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

// ── Courses ────────────────────────────────────────────────────────────────
function AdminCourses() {
  const courses = useQuery(api.admin.adminListCourses);
  const categories = useQuery(api.content.listCategories);
  const instructors = useQuery(api.content.listInstructors);
  const create = useMutation(api.admin.adminCreateCourse);
  const toggle = useMutation(api.admin.adminTogglePublish);
  const remove = useMutation(api.admin.adminDeleteCourse);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", summary: "", price: "", categoryId: "", instructorId: "", mode: "recorded", bundle: "basic" });
  const [err, setErr] = useState<string | null>(null);

  const handleCreate = async () => {
    setErr(null);
    if (!form.title.trim() || !form.categoryId || !form.instructorId) {
      setErr("عنوان، دسته و مدرس الزامی است.");
      return;
    }
    try {
      await create({
        title: form.title,
        slug: "",
        categoryId: form.categoryId as any,
        instructorId: form.instructorId as any,
        summary: form.summary,
        price: Number(form.price) || 0,
        mode: form.mode,
        bundle: form.bundle,
      });
      setOpen(false);
      setForm({ title: "", summary: "", price: "", categoryId: "", instructorId: "", mode: "recorded", bundle: "basic" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">دوره‌ها</h1>
          <p className="mt-1 text-sm text-muted-foreground">{faNum(courses?.length ?? 0)} دوره</p>
        </div>
        <Button className="rounded-full" onClick={() => setOpen(true)}>
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
                  <TableCell>
                    <Badge variant={c.published ? "secondary" : "outline"} className={cn("rounded-full", c.published && "bg-emerald-50 text-emerald-700")}>
                      {c.published ? "منتشرشده" : "پیش‌نویس"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => toggle({ collection: "courses", id: c._id, published: !c.published })}>
                        {c.published ? "از انتشار خارج کن" : "انتشار"}
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => remove({ id: c._id })}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ساخت دورهٔ جدید</DialogTitle>
            <DialogDescription>دوره به‌صورت پیش‌نویس ساخته می‌شود و بعد از تکمیل محتوا منتشر می‌شود.</DialogDescription>
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
            <Button className="w-full" onClick={handleCreate}>ساخت دوره</Button>
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

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ text: "", options: ["", "", "", ""], correctIndex: "0", explanation: "", topicId: "", difficulty: "1" });

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
      setForm({ text: "", options: ["", "", "", ""], correctIndex: "0", explanation: "", topicId: "", difficulty: "1" });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">بانک سؤال</h1>
          <p className="mt-1 text-sm text-muted-foreground">{faNum(questions?.length ?? 0)} سؤال</p>
        </div>
        <Button className="rounded-full" onClick={() => setOpen(true)}>
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
  const exams = useQuery(api.tests.listExams, {});
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">آزمون‌ها</h1>
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>تعداد سؤال</TableHead>
                <TableHead>زمان</TableHead>
                <TableHead>نوع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(exams ?? []).map((e) => (
                <TableRow key={e._id}>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>{faNum(e.questionCount)}</TableCell>
                  <TableCell>{faNum(e.durationMinutes)} دقیقه</TableCell>
                  <TableCell>{e.diagnostic ? "تعیین سطح" : e.free ? "رایگان" : "پولی"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        ساخت آزمون‌های جدید و اتصال سؤال‌ها به آزمون در فاز بعدی کامل می‌شود.
      </p>
    </div>
  );
}

// ── Users ───────────────────────────────────────────────────────────────────
function AdminUsers() {
  const users = useQuery(api.admin.adminGetUsers);
  const setRole = useMutation(api.admin.adminSetRole);
  const [emails, setEmails] = useState("");
  const addAdmin = useMutation(api.admin.adminAddAdmin);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">کاربران</h1>
        <p className="mt-1 text-sm text-muted-foreground">{faNum(users?.length ?? 0)} کاربر</p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row">
          <Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="ایمیل ادمین جدید (مثلاً ali@zist.academy)" className="flex-1" dir="ltr" />
          <Button variant="outline" className="rounded-full" onClick={() => { if (emails.trim()) addAdmin({ email: emails.trim() }); setEmails(""); }}>
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
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
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

// ── Orders ──────────────────────────────────────────────────────────────────
function AdminOrders() {
  const orders = useQuery(api.admin.adminGetOrders);
  const update = useMutation(api.admin.adminUpdateOrderStatus);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">سفارش‌ها</h1>
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

// ── Coupons ────────────────────────────────────────────────────────────────
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
      <h1 className="text-2xl font-extrabold">کدهای تخفیف</h1>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">کد</p>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ZIST20" dir="ltr" className="font-mono" />
          </div>
          <div className="w-24">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">درصد</p>
            <Input type="number" value={percent} onChange={(e) => setPercent(e.target.value)} />
          </div>
          <div className="w-24">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">ظرفیت</p>
            <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          <Button className="rounded-full" onClick={handleCreate}>
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
                    <Button size="sm" variant={c.active ? "secondary" : "outline"} className="rounded-full" onClick={() => toggle({ couponId: c._id, active: !c.active })}>
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

// ── Content ─────────────────────────────────────────────────────────────────
function AdminContent() {
  const articles = useQuery(api.content.listArticles, {});
  const create = useMutation(api.admin.adminCreateArticle);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "", excerpt: "", body: "", authorName: "" });

  const handleCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    await create({ title: form.title, slug: "", category: form.category, excerpt: form.excerpt, body: form.body, authorName: form.authorName, readTime: Math.max(1, Math.round(form.body.split(/\s+/).length / 250)) });
    setOpen(false);
    setForm({ title: "", category: "", excerpt: "", body: "", authorName: "" });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">محتوای رایگان</h1>
          <p className="mt-1 text-sm text-muted-foreground">{faNum(articles?.length ?? 0)} مطلب</p>
        </div>
        <Button className="rounded-full" onClick={() => setOpen(true)}>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {(articles ?? []).map((a) => (
                <TableRow key={a._id}>
                  <TableCell className="max-w-md truncate font-medium">{a.title}</TableCell>
                  <TableCell className="text-muted-foreground">{a.category}</TableCell>
                  <TableCell className="text-muted-foreground">{a.authorName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>مطلب جدید</DialogTitle>
            <DialogDescription>محتوا بلافاصله منتشر می‌شود؛ قبل از انتشار دقت علمی لازم است.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="دسته (مثلاً روش مطالعه)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <Input placeholder="نویسنده" value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} />
            </div>
            <Textarea placeholder="خلاصه (برای کارت)" rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
            <Textarea placeholder="متن کامل (پاراگراف‌ها با خط خالی جدا شوند)" rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <Button className="w-full" onClick={handleCreate}>انتشار مطلب</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Workshops ───────────────────────────────────────────────────────────────
function AdminWorkshops() {
  const workshops = useQuery(api.content.listWorkshops);
  const instructors = useQuery(api.content.listInstructors);
  const create = useMutation(api.admin.adminCreateWorkshop);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", instructorId: "", topic: "", date: "", time: "۱۸:۰۰", capacity: "30", price: "0", description: "", free: false, expertTalk: false });

  const handleCreate = async () => {
    if (!form.title.trim() || !form.instructorId) return;
    await create({
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
    });
    setOpen(false);
    setForm({ title: "", instructorId: "", topic: "", date: "", time: "۱۸:۰۰", capacity: "30", price: "0", description: "", free: false, expertTalk: false });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">کارگاه‌ها</h1>
          <p className="mt-1 text-sm text-muted-foreground">{faNum(workshops?.length ?? 0)} کارگاه</p>
        </div>
        <Button className="rounded-full" onClick={() => setOpen(true)}>
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
                <TableHead>تاریخ</TableHead>
                <TableHead>ظرفیت</TableHead>
                <TableHead>قیمت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(workshops ?? []).map((w) => (
                <TableRow key={w._id}>
                  <TableCell className="max-w-md truncate font-medium">{w.title}</TableCell>
                  <TableCell className="text-muted-foreground">{w.date}</TableCell>
                  <TableCell>{faNum(w.registeredCount)}/{faNum(w.capacity)}</TableCell>
                  <TableCell>{w.free ? "رایگان" : formatPrice(w.price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>کارگاه جدید</DialogTitle>
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
            <Button className="w-full" onClick={handleCreate}>ساخت کارگاه</Button>
          </div>
        </DialogContent>
      </Dialog>
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
      <h1 className="text-2xl font-extrabold">تیکت‌های پشتیبانی</h1>
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
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOpenId(openId === t._id ? null : t._id)}>
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

function Loading() {
  return (
    <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="ml-2 size-4 animate-spin" />
      در حال بارگذاری...
    </div>
  );
}
