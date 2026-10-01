import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AreaChart as AreaChartIcon,
  ArrowDown,
  ArrowUp,
  Award,
  BarChart3,
  BookOpen,
  Boxes,
  CalendarDays,
  Download,
  LayoutGrid,
  LifeBuoy,
  Loader2,
  MessageCircle,
  Plus,
  Repeat,
  Send,
  ShoppingCart,
  Sparkles,
  Star,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { faNum, formatPriceNumber } from "@/lib/format";

// ── Widget registry (drives the "افزودن ویجت" panel) ────────────────────────
type WidgetKey = "kpis" | "revenue" | "weekday" | "repeat" | "topCourses";

const WIDGETS: { key: WidgetKey; title: string; description: string; tag: string }[] = [
  { key: "kpis", title: "شاخص‌های کلیدی", description: "کارت‌های درآمد، سفارش، کاربر جدید و تیکت باز.", tag: "#KeyMetrics" },
  { key: "revenue", title: "روند درآمد", description: "نمودار درآمد روزانه با مقایسه با دورهٔ قبل.", tag: "#Revenue" },
  { key: "weekday", title: "پرفعال‌ترین روزها", description: "تعداد سفارش‌ها به تفکیک روز هفته.", tag: "#Activity" },
  { key: "repeat", title: "نرخ خرید مجدد", description: "سهم اعضایی که بیش از یک بار خریده‌اند.", tag: "#Retention" },
  { key: "topCourses", title: "پرفروش‌ترین دوره‌ها", description: "جدول دوره‌های برتر با فروش و امتیاز.", tag: "#Courses" },
];

const STORAGE_KEY = "genova-admin-widgets";
const ALL_WIDGETS = WIDGETS.map((w) => w.key);

// Shortcuts rendered in the "دسترسی سریع" strip. Keys match admin sections.
const QUICK_LINKS: { key: string; label: string; icon: typeof BookOpen }[] = [
  { key: "courses", label: "دوره‌ها", icon: BookOpen },
  { key: "users", label: "کاربران", icon: Users },
  { key: "orders", label: "سفارش‌ها", icon: ShoppingCart },
  { key: "support", label: "پشتیبانی", icon: LifeBuoy },
  { key: "telegram", label: "تلگرام", icon: Send },
  { key: "bale", label: "بله", icon: MessageCircle },
];

function readHiddenWidgets(): WidgetKey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WidgetKey[]) : [];
  } catch {
    return [];
  }
}

// ── Small building blocks ──────────────────────────────────────────────────
function DeltaChip({ value, suffix }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600",
      )}
    >
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {faNum(Math.abs(value))}٪{suffix ? ` ${suffix}` : ""}
    </span>
  );
}

function WidgetCard({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn("gap-0 overflow-hidden rounded-2xl border-border py-0", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <h3 className="text-[15px] font-bold tracking-tight text-foreground">{title}</h3>
          {action}
        </div>
      )}
      <div className={cn("px-5 pb-5", title ? "pt-3" : "pt-5", bodyClassName)}>{children}</div>
    </Card>
  );
}

type TooltipEntry = { dataKey?: string; value?: number };

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((p) => p.dataKey === "revenue")?.value ?? 0;
  const compare = payload.find((p) => p.dataKey === "compare")?.value ?? 0;
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 text-right shadow-lg">
      <p className="font-mono text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{faNum(revenue)} تومان</p>
      <p className="text-[11px] text-muted-foreground">دورهٔ قبل: {faNum(compare)}</p>
    </div>
  );
}

// Big Toman figures are unreadable in full inside a stat card.
function compactToman(n: number): { value: string; unit: string } {
  if (n >= 1_000_000_000) return { value: faNum(Math.round(n / 100_000_000) / 10), unit: "میلیارد تومان" };
  if (n >= 1_000_000) return { value: faNum(Math.round(n / 100_000) / 10), unit: "میلیون تومان" };
  return { value: faNum(n), unit: "تومان" };
}

// Semi-circular gauge for the repeat-purchase rate.
function RepeatGauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = 78;
  const c = Math.PI * r; // half circle length
  return (
    <div className="relative mx-auto w-full max-w-[240px]" dir="ltr">
      <svg viewBox="0 0 200 112" className="w-full">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
        <path
          d="M 22 100 A 78 78 0 0 1 178 100"
          fill="none"
          stroke="var(--border)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 22 100 A 78 78 0 0 1 178 100"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center" dir="rtl">
        <p className="text-3xl font-extrabold tracking-tight text-foreground">{faNum(pct)}٪</p>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function AdminDashboard({ onNavigate }: { onNavigate?: (section: string) => void }) {
  const [days, setDays] = useState(30);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hidden, setHidden] = useState<WidgetKey[]>(readHiddenWidgets);
  const data = useQuery(api.admin.getAdminDashboard, { days });

  const persist = (next: WidgetKey[]) => {
    setHidden(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — the choice still applies for this session
    }
  };
  const toggleWidget = (key: WidgetKey) =>
    persist(hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key]);
  const show = (key: WidgetKey) => !hidden.includes(key);

  const revenueSeries = useMemo(() => {
    const series = (data?.series ?? []).map((p) => ({ ...p }));
    if (series.length < 2) return series;
    const half = Math.floor(series.length / 2);
    // Compare the second half of the window against the first half so the
    // dashed comparison line always has a matching shape.
    return series.map((p, i) => ({
      ...p,
      compare: series[i - half]?.revenue ?? 0,
    }));
  }, [data?.series]);

  const kpis = data?.kpis;
  const busiestDayIndex = (data?.weekday ?? []).reduce(
    (best, d, i, arr) => (d.value > arr[best].value ? i : best),
    0,
  );
  const busiestDay = data?.weekday[busiestDayIndex];
  const statCards = kpis
    ? [
        {
          icon: Wallet,
          label: "درآمد",
          ...compactToman(kpis.revenue),
          delta: kpis.revenueDelta,
          tint: "bg-blue-50 text-blue-600",
        },
        {
          icon: ShoppingCart,
          label: "سفارش‌های پرداخت‌شده",
          value: faNum(kpis.orders),
          unit: `${faNum(days)} روز اخیر`,
          delta: kpis.ordersDelta,
          tint: "bg-emerald-50 text-emerald-600",
        },
        {
          icon: Users,
          label: "عضو جدید",
          value: faNum(kpis.users),
          unit: `از مجموع ${faNum(kpis.memberCount)} عضو`,
          delta: kpis.usersDelta,
          tint: "bg-violet-50 text-violet-600",
        },
        {
          icon: Ticket,
          label: "تیکت باز",
          value: faNum(kpis.openTickets),
          unit: "در صف پشتیبانی",
          delta: null,
          tint: "bg-amber-50 text-amber-600",
        },
      ]
    : [];

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["گزارش داشبورد مدیریت", `${faNum(days)} روز اخیر`],
      [],
      ["شاخص", "مقدار"],
      ["درآمد", String(data.kpis.revenue)],
      ["سفارش پرداخت‌شده", String(data.kpis.orders)],
      ["عضو جدید", String(data.kpis.users)],
      ["میانگین ارزش سفارش", String(data.kpis.avgOrderValue)],
      ["نرخ خرید مجدد", `${data.kpis.repeatRate}%`],
      ["تیکت باز", String(data.kpis.openTickets)],
      [],
      ["دوره", "فروش", "درآمد", "امتیاز"],
      ...data.topCourses.map((c) => [c.title, String(c.sold), String(c.revenue), String(c.rating)]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `genova-dashboard-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (data === undefined) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        در حال بارگذاری داشبورد...
      </div>
    );
  }
  if (data === null) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">دسترسی به داشبورد مجاز نیست.</p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">داشبورد</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            نمای زندهٔ فروش، اعضا و فعالیت پلتفرم در {faNum(days)} روز اخیر
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1">
            <CalendarDays className="mx-1.5 size-4 text-muted-foreground" />
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  days === d
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {faNum(d)} روز
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-9 rounded-xl" onClick={() => setPickerOpen(true)}>
            <Plus className="ml-1.5 size-4" />
            افزودن ویجت
          </Button>
          <Button size="sm" className="h-9 rounded-xl" onClick={exportCsv}>
            <Download className="ml-1.5 size-4" />
            خروجی CSV
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      {show("kpis") && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label} className="gap-0 rounded-2xl border-border py-0">
              <div className="flex items-start justify-between gap-2 p-5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-muted-foreground">{s.label}</p>
                  <p className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold tracking-tight text-foreground">
                      {s.value}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{s.unit}</span>
                  </p>
                </div>
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", s.tint)}>
                  <s.icon className="size-4" />
                </span>
              </div>
              <div className="flex items-center gap-2 border-t border-border/70 px-5 py-3">
                {s.delta === null ? (
                  <span className="text-[11px] text-muted-foreground">نیازمند رسیدگی</span>
                ) : (
                  <>
                    <DeltaChip value={s.delta} />
                    <span className="text-[11px] text-muted-foreground">نسبت به دورهٔ قبل</span>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Revenue + weekday */}
      <div className="grid gap-4 xl:grid-cols-3">
        {show("revenue") && (
          <WidgetCard
            className="xl:col-span-2"
            title="روند درآمد"
            action={
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" />
                  این دوره
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full border border-dashed border-muted-foreground/60" />
                  دورهٔ قبل
                </span>
              </div>
            }
          >
            {revenueSeries.length > 1 ? (
              <div className="h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueSeries} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={(v: number) => faNum(Math.round(v / 1000))}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
                    <Area
                      type="monotone"
                      dataKey="compare"
                      stroke="var(--muted-foreground)"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fill="none"
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#revFill)"
                      dot={false}
                      activeDot={{ r: 4, fill: "var(--primary)", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-20 text-center text-sm text-muted-foreground">داده‌ای برای نمایش نیست.</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MiniStat
                icon={TrendingUp}
                label="میانگین ارزش سفارش"
                value={`${compactToman(data.kpis.avgOrderValue).value} ${compactToman(data.kpis.avgOrderValue).unit}`}
              />
              <MiniStat icon={BookOpen} label="دوره‌های فعال" value={faNum(data.kpis.courseCount)} />
              <MiniStat icon={Users} label="کل اعضا" value={faNum(data.kpis.memberCount)} />
            </div>
          </WidgetCard>
        )}

        {show("weekday") && (
          <WidgetCard
            title="پرفعال‌ترین روز هفته"
            action={<BarChart3 className="size-4 text-muted-foreground" />}
          >
            {data.weekday.some((d) => d.value > 0) ? (
              <>
                <div className="h-44" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weekday} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                      <XAxis
                        dataKey="label"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--muted)" }}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "#fff",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="value" name="سفارش" radius={[8, 8, 4, 4]} maxBarSize={26}>
                        {data.weekday.map((d, i) => (
                          <Cell
                            key={d.label + i}
                            fill={i === busiestDayIndex ? "var(--primary)" : "var(--border)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  پرترافیک‌ترین روز:{" "}
                  <span className="font-semibold text-foreground">{busiestDay?.label}</span>
                </p>
              </>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">سفارشی در این بازه ثبت نشده.</p>
            )}
          </WidgetCard>
        )}
      </div>

      {/* Repeat rate + top courses */}
      <div className="grid gap-4 xl:grid-cols-3">
        {show("repeat") && (
          <WidgetCard title="نرخ خرید مجدد" action={<Repeat className="size-4 text-muted-foreground" />}>
            <RepeatGauge value={data.kpis.repeatRate} />
            <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
              {faNum(data.kpis.repeatCustomers)} عضو از {faNum(data.kpis.memberCount)} عضو بیش از یک بار
              خریده‌اند.
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full rounded-xl" onClick={() => setPickerOpen(true)}>
              <LayoutGrid className="ml-1.5 size-4" />
              مدیریت ویجت‌ها
            </Button>
          </WidgetCard>
        )}

        {show("topCourses") && (
          <WidgetCard
            className="xl:col-span-2"
            title="پرفروش‌ترین دوره‌ها"
            action={<Award className="size-4 text-muted-foreground" />}
          >
            {data.topCourses.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">هنوز فروشی ثبت نشده است.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-right text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2.5 font-medium">دوره</th>
                      <th className="pb-2.5 font-medium">فروش</th>
                      <th className="pb-2.5 font-medium">درآمد</th>
                      <th className="pb-2.5 font-medium">ثبت‌نام</th>
                      <th className="pb-2.5 font-medium">امتیاز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCourses.map((c) => (
                      <tr key={c._id} className="border-b border-border/60 last:border-0">
                        <td className="max-w-[220px] truncate py-3 font-medium text-foreground">{c.title}</td>
                        <td className="py-3 text-muted-foreground">{faNum(c.sold)}</td>
                        <td className="py-3 font-semibold text-foreground">
                          {formatPriceNumber(c.revenue)} تومان
                        </td>
                        <td className="py-3 text-muted-foreground">{faNum(c.students)}</td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 text-amber-500">
                            <Star className="size-3.5 fill-current" />
                            {faNum(c.rating)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </WidgetCard>
        )}
      </div>

      {/* Quick access strip */}
      {onNavigate && (
        <Card className="gap-0 overflow-hidden rounded-2xl border-border py-0">
          <div className="flex flex-col gap-4 bg-gradient-to-l from-primary/[0.06] via-transparent to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">دسترسی سریع</p>
                <p className="text-xs text-muted-foreground">میانبر بخش‌های پرکاربرد پنل</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_LINKS.map((q) => (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => onNavigate(q.key)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <q.icon className="size-3.5 text-primary" />
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Widget picker */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md">
          <SheetTitle className="sr-only">افزودن ویجت</SheetTitle>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-5 py-4">
            <div>
              <h2 className="text-base font-bold tracking-tight">افزودن ویجت</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                چیدمان داشبورد را مطابق نیازتان بچینید.
              </p>
            </div>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => setPickerOpen(false)}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="space-y-3 p-5">
            {WIDGETS.map((w) => {
              const Icon =
                w.key === "kpis"
                  ? Boxes
                  : w.key === "revenue"
                    ? AreaChartIcon
                    : w.key === "weekday"
                      ? BarChart3
                      : w.key === "repeat"
                        ? Repeat
                        : Sparkles;
              return (
                <div
                  key={w.key}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3 transition-shadow hover:shadow-md"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      {w.title}
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {w.tag}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{w.description}</p>
                  </div>
                  <Switch
                    checked={show(w.key)}
                    onCheckedChange={() => toggleWidget(w.key)}
                    aria-label={w.title}
                  />
                </div>
              );
            })}
            {hidden.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full rounded-xl text-xs"
                onClick={() => persist([])}
              >
                <Sparkles className="ml-1.5 size-3.5" />
                بازگرداندن همهٔ ویجت‌ها ({faNum(ALL_WIDGETS.length - hidden.length)} فعال)
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
