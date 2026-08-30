/**
 * TelegramAdminCenter — comprehensive admin panel for Telegram Bot management.
 * Accessible only to admin/site_admin roles.
 */
import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bot,
  Users,
  Command,
  Bell,
  Sparkles,
  Activity,
  BarChart3,
  Settings,
  TestTube,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  ExternalLink,
  Zap,
  Wifi,
  WifiOff,
  Webhook,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tab =
  | "dashboard"
  | "students"
  | "commands"
  | "notifications"
  | "ai"
  | "activity"
  | "analytics"
  | "settings"
  | "tests";

const TABS: { id: Tab; label: string; icon: typeof Bot }[] = [
  { id: "dashboard", label: "داشبورد", icon: Bot },
  { id: "students", label: "دانشجویان", icon: Users },
  { id: "commands", label: "دستورات", icon: Command },
  { id: "notifications", label: "اعلان‌ها", icon: Bell },
  { id: "ai", label: "هوش مصنوعی", icon: Sparkles },
  { id: "activity", label: "فعالیت", icon: Activity },
  { id: "analytics", label: "آمار", icon: BarChart3 },
  { id: "settings", label: "تنظیمات", icon: Settings },
  { id: "tests", label: "تست", icon: TestTube },
];

export default function TelegramAdminCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");

  const botConfig = useQuery(api.telegramBot.getBotConfig);

  return (
    <div className="min-h-screen bg-[#0b1426]">
      {/* Header */}
      <div className="bg-[#0f2035] border-b border-white/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="gap-1"
            >
              <ArrowRight className="size-4" />
              مدیریت
            </Button>
            <h1 className="text-lg font-bold text-white">🤖 مدیریت Telegram</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot connected={!!botConfig?.connected} />
            <span className="text-xs text-slate-400 hidden sm:inline">
              {botConfig?.botName ?? "تنظیم نشده"}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-[#0f2035] border-b border-white/10 overflow-x-auto">
        <div className="max-w-6xl mx-auto flex gap-0 px-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
                  tab === t.id
                    ? "border-blue-400 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200",
                )}
              >
                <Icon className="size-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === "dashboard" && <DashboardTab botConfig={botConfig} />}
        {tab === "students" && <StudentsTab />}
        {tab === "commands" && <CommandsTab botConfig={botConfig} />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "ai" && <AITab />}
        {tab === "activity" && <ActivityTab />}
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "settings" && <SettingsTab botConfig={botConfig} />}
        {tab === "tests" && <TestsTab />}
      </main>
    </div>
  );
}

// ── Dashboard Tab ───────────────────────────────────────────────────────────

function DashboardTab({ botConfig }: { botConfig: any }) {
  const linkedUsers = useQuery(api.telegramBot._countLinkedUsers);

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          label="وضعیت Bot"
          value={botConfig?.connected ? "🟢 متصل" : "🔴 متصل نیست"}
          sub={botConfig?.botName ? `@${botConfig.botUsername}` : ""}
        />
        <StatusCard
          label="کاربران متصل"
          value={String(linkedUsers ?? 0)}
          sub="حساب Telegram فعال"
        />
        <StatusCard
          label="Webhook"
          value={botConfig?.webhookActive ? "🟢 فعال" : "🔴 غیرفعال"}
          sub=""
        />
        <StatusCard
          label="دستورات"
          value={String(botConfig?.commands?.length ?? 0)}
          sub="دستور ثبت شده"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-white">دسترسی سریع</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`https://t.me/${botConfig?.botUsername ?? ""}`, "_blank")}
            disabled={!botConfig?.botUsername}
          >
            <ExternalLink className="mr-1 size-3" /> باز کردن Bot
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("https://nibrc.ir", "_blank")}
          >
            <ExternalLink className="mr-1 size-3" /> باز کردن Mini App
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Students Tab ────────────────────────────────────────────────────────────

function StudentsTab() {
  const allUsers = useQuery(api.users.listAllUsers);
  const [search, setSearch] = useState("");

  const linkedStudents = (allUsers ?? []).filter(
    (u: any) => u.telegramId && (search === "" || u.name?.includes(search) || u.email?.includes(search)),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="جستجوی نام یا ایمیل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Badge variant="secondary">{linkedStudents.length} متصل</Badge>
      </div>

      {linkedStudents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-400">
            <Users className="size-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm text-slate-300">هنوز کاربری Telegram خود را متصل نکرده است.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {linkedStudents.map((s: any) => (
            <Card key={s._id}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300 shrink-0">
                    {(s.name ?? "U")[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.name ?? "بدون نام"}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {s.telegramUsername ? `@${s.telegramUsername}` : s.email ?? ""}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {s.role ?? "دانشجو"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Commands Tab ────────────────────────────────────────────────────────────

function CommandsTab({ botConfig }: { botConfig: any }) {
  const commands = botConfig?.commands ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">دستورات Bot</h3>
        <Badge variant={botConfig?.commandsSyncedAt ? "default" : "secondary"}>
          {botConfig?.commandsSyncedAt ? "همگام شده" : "همگام نشده"}
        </Badge>
      </div>

      {commands.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-slate-400">
            <Command className="size-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm text-slate-300">دستوری ثبت نشده است.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {commands.map((cmd: any, i: number) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono font-medium">/{cmd.command}</p>
                  <p className="text-xs text-slate-400">{cmd.description}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  فعال
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400">
        برای ویرایش دستورات از پنل <strong>Telegram Bot</strong> استفاده کنید.
      </p>
    </div>
  );
}

// ── Notifications Tab ───────────────────────────────────────────────────────

function NotificationsTab() {
  const notifPrefs = useQuery(api.telegramNotifications.getNotifPrefs);

  const categories = [
    { key: "mentorReplies", label: "پاسخ منتور", emoji: "💬" },
    { key: "tasks", label: "تکالیف", emoji: "📚" },
    { key: "deadlines", label: "ددلاین", emoji: "⏰" },
    { key: "meetings", label: "جلسات", emoji: "📅" },
    { key: "groupNotifs", label: "گروه‌ها", emoji: "👥" },
    { key: "articles", label: "مقاله‌ها", emoji: "📰" },
    { key: "system", label: "سیستم", emoji: "📢" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white">وضعیت اعلان‌ها</h3>
      <Card>
        <CardContent className="p-4 space-y-3">
          {categories.map((cat) => {
            const pref = notifPrefs?.categories?.[cat.key as keyof typeof notifPrefs.categories];
            return (
              <div key={cat.key} className="flex items-center justify-between">
                <span className="text-sm text-slate-200">
                  {cat.emoji} {cat.label}
                </span>
                <Badge variant={pref !== false ? "default" : "secondary"}>
                  {pref !== false ? "فعال" : "غیرفعال"}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <p className="text-xs text-slate-400">
        تنظیمات اعلان‌ها توسط کاربران در پروفایل خود قابل تغییر است.
      </p>
    </div>
  );
}

// ── AI Tab ──────────────────────────────────────────────────────────────────

function AITab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 text-center">
          <Sparkles className="size-10 mx-auto mb-3 text-purple-400" />
          <h3 className="font-semibold mb-1 text-white">هوش مصنوعی Telegram Bot</h3>
          <p className="text-sm text-slate-400 mb-4">
            فعال‌سازی AI برای پاسخگویی خودکار در Telegram Bot
          </p>
          <Badge variant="secondary">به‌زودی</Badge>
          <p className="text-xs text-slate-400 mt-3">
            این بخش پس از پیکربندی API هوش مصنوعی فعال خواهد شد.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Activity Tab ────────────────────────────────────────────────────────────

function ActivityTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 text-center">
          <Activity className="size-10 mx-auto mb-3 text-blue-400" />
          <h3 className="font-semibold mb-1 text-white">لاگ فعالیت</h3>
          <p className="text-sm text-slate-400">
            رویدادهای Telegram Bot در اینجا نمایش داده می‌شوند.
          </p>
          <Badge variant="secondary" className="mt-2">به‌زودی</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Analytics Tab ───────────────────────────────────────────────────────────

function AnalyticsTab() {
  const linkedUsers = useQuery(api.telegramBot._countLinkedUsers);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="کاربران متصل" value={linkedUsers ?? 0} icon={Users} />
        <StatCard label="دستورات" value={0} icon={Command} />
        <StatCard label="اعلان‌ها" value={0} icon={Bell} />
        <StatCard label="درخواست‌ها" value={0} icon={MessageSquare} />
      </div>
      <Card>
        <CardContent className="p-6 text-center text-slate-400">
          <BarChart3 className="size-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">آمار تفصیلی به‌زودی اضافه خواهد شد.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Settings Tab ────────────────────────────────────────────────────────────

function SettingsTab({ botConfig }: { botConfig: any }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="size-4" /> تنظیمات کلی
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="نام Bot" value={botConfig?.botName ?? "—" } />
          <Row label="Username" value={botConfig?.botUsername ? `@${botConfig.botUsername}` : "—"} />
          <Row label="وضعیت" value={botConfig?.connected ? "🟢 متصل" : "🔴 متصل نیست"} />
          <Row label="Webhook" value={botConfig?.webhookActive ? "🟢 فعال" : "🔴 غیرفعال"} />
          <Row label="Mini App" value="🟢 فعال" />
          <Row label="دامنه" value="nibrc.ir" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/panel/telegram-bot")}
          >
            رفتن به پنل Telegram Bot
            <ArrowRight className="mr-2 size-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tests Tab ───────────────────────────────────────────────────────────────

function TestsTab() {
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const testConn = useAction(api.telegramBotActions.testConnection);
  const getWebhook = useAction(api.telegramBotActions.getWebhookInfo);

  const runTest = async (type: string) => {
    setTesting(true);
    setTestResult(null);
    try {
      if (type === "connection") {
        const res = await testConn({});
        setTestResult({ ok: res.success, msg: res.success ? `✅ ${res.botName} (@${res.botUsername})` : `❌ ${res.error}` });
      } else if (type === "webhook") {
        const res = await getWebhook({});
        setTestResult({
          ok: res.success,
          msg: res.success
            ? `✅ Webhook فعال: ${res.url ?? "—" }`
            : `❌ ${res.error}`,
        });
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: `❌ ${err?.message ?? "خطا"}` });
    }
    setTesting(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white">تست اتصال</h3>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => runTest("connection")}
          disabled={testing}
        >
          {testing ? <Loader2 className="size-3 animate-spin ml-1" /> : <Wifi className="size-3 ml-1" />}
          تست اتصال Bot
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => runTest("webhook")}
          disabled={testing}
        >
          {testing ? <Loader2 className="size-3 animate-spin ml-1" /> : <Webhook className="size-3 ml-1" />}
          تست Webhook
        </Button>
      </div>

      {testResult && (
        <Card className={cn(testResult.ok ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10")}>
          <CardContent className="p-3">
            <p className="text-sm font-medium">{testResult.msg}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Shared Components ───────────────────────────────────────────────────────

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        connected ? "bg-green-500" : "bg-red-500",
      )}
    />
  );
}

function StatusCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <Icon className="size-5 mx-auto mb-1 text-slate-400" />
        <p className="text-xl font-bold">{value}</p>
        <p className="text-[10px] text-slate-400">{label}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b last:border-b-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
