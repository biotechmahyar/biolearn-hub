/**
 * TelegramMiniApp — the main page users see when they open Genova from Telegram.
 *
 * Compact, mobile-first layout with bottom navigation.
 * All data comes from existing Convex queries (no new backend needed).
 */
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMode } from "@/hooks/useMode";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Home,
  MessageCircle,
  Calendar,
  BookOpen,
  Bell,
  Users,
  User,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "home" | "questions" | "sessions" | "tasks" | "notifications" | "groups" | "profile";

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "خانه", icon: Home },
  { id: "questions", label: "سؤالات", icon: MessageCircle },
  { id: "sessions", label: "جلسات", icon: Calendar },
  { id: "tasks", label: "تکالیف", icon: BookOpen },
  { id: "notifications", label: "اعلان‌ها", icon: Bell },
  { id: "groups", label: "گروه‌ها", icon: Users },
  { id: "profile", label: "پروفایل", icon: User },
];

export default function TelegramMiniApp() {
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("home");

  // ── Queries ────────────────────────────────────────────────────────────────
  const questions = useQuery(
    api.mentor.listMentorQuestions,
    isAuthenticated ? {} : "skip",
  );
  const sessions = useQuery(
    api.mentor.listSessions,
    isAuthenticated ? {} : "skip",
  );
  const announcements = useQuery(
    api.notifications.listMyAnnouncements,
    isAuthenticated ? {} : "skip",
  );
  const groups = useQuery(
    api.collab.listMentorGroups,
    isAuthenticated ? {} : "skip",
  );
  const linkingStatus = useQuery(
    api.telegramBot.getLinkingStatus,
    isAuthenticated ? {} : "skip",
  );
  const notifPrefs = useQuery(
    api.telegramNotifications.getNotifPrefs,
    isAuthenticated ? {} : "skip",
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-b from-teal-50 to-white px-4 text-center">
        <div className="mb-4 text-5xl">🧬</div>
        <h1 className="text-xl font-bold text-teal-700 mb-2">Genova</h1>
        <p className="text-sm text-muted-foreground mb-6">
          برای استفاده از Mini App ابتدا وارد حساب خود شوید.
        </p>
        <Button
          onClick={() => {
            window.open("https://nibrc.ir/auth?returnTo=/", "_blank");
          }}
          className="bg-teal-600 hover:bg-teal-700"
        >
          ورود به Genova
          <ExternalLink className="mr-2 size-4" />
        </Button>
      </div>
    );
  }

  const unreadCount =
    (announcements?.filter((a: any) => !a.read).length ?? 0);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧬</span>
            <span className="font-bold text-teal-700">Genova</span>
          </div>
          {user && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {user.name ?? user.email ?? "کاربر"}
            </span>
          )}
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-3 py-4 pb-20">
        {tab === "home" && <HomeTab user={user} questions={questions} sessions={sessions} announcements={announcements} />}
        {tab === "questions" && <QuestionsTab questions={questions} />}
        {tab === "sessions" && <SessionsTab sessions={sessions} />}
        {tab === "tasks" && <TasksTab />}
        {tab === "notifications" && <NotificationsTab announcements={announcements} />}
        {tab === "groups" && <GroupsTab groups={groups} />}
        {tab === "profile" && <ProfileTab user={user} linkingStatus={linkingStatus} notifPrefs={notifPrefs} />}
      </main>

      {/* ── Bottom Navigation ──────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 safe-area-pb">
        <div className="flex items-center justify-around h-14">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            const badge =
              t.id === "notifications" && unreadCount > 0 ? unreadCount : undefined;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors",
                  isActive ? "text-teal-600" : "text-gray-400",
                )}
              >
                <div className="relative">
                  <Icon className="size-5" />
                  {badge !== undefined && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ── Tab Components ──────────────────────────────────────────────────────────

function HomeTab({ user, questions, sessions, announcements }: any) {
  const upcomingSessions = sessions?.filter((s: any) => s.status === "planned") ?? [];
  const pendingQuestions = questions?.filter((q: any) => q.status !== "answered") ?? [];

  return (
    <div className="space-y-4">
      {/* Welcome */}
      <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0">
        <CardContent className="p-4">
          <p className="text-sm opacity-90">سلام 👋</p>
          <p className="text-lg font-bold">{user?.name ?? "کاربر"}</p>
          <p className="text-xs opacity-75 mt-1">به Genova خوش آمدید</p>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-teal-600">{pendingQuestions.length}</p>
            <p className="text-xs text-muted-foreground">سؤالات در انتظار</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{upcomingSessions.length}</p>
            <p className="text-xs text-muted-foreground">جلسات آینده</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">جلسات آینده</h3>
          {upcomingSessions.slice(0, 3).map((s: any) => (
            <Card key={s._id} className="mb-2">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">{s.title ?? "جلسه منتورینگ"}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.date ? new Date(s.date).toLocaleDateString("fa-IR") : ""}{" "}
                      {s.time ?? ""}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Announcements */}
      {announcements && announcements.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">اعلان‌های اخیر</h3>
          {announcements.slice(0, 3).map((a: any) => (
            <Card key={a._id} className={cn("mb-2", !a.read && "border-teal-200 bg-teal-50/50")}>
              <CardContent className="p-3">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {upcomingSessions.length === 0 && pendingQuestions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Home className="size-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">هنوز فعالیتی ندارید.</p>
        </div>
      )}
    </div>
  );
}

function QuestionsTab({ questions }: { questions: any[] | undefined }) {
  if (questions === undefined) {
    return <LoadingState />;
  }

  if (questions.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="سؤالی ثبت نکرده‌اید"
        description="از طریق سایت Genova سؤال خود را ثبت کنید."
      />
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">سؤالات من</h2>
      {questions.map((q: any) => (
        <Card key={q._id}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{q.title ?? "سؤال"}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{q.text}</p>
              </div>
              <Badge
                variant={q.status === "answered" ? "default" : "secondary"}
                className="text-[10px] shrink-0"
              >
                {q.status === "answered" ? "پاسخ داده شده" : "در انتظار"}
              </Badge>
            </div>
            {q.answer && (
              <div className="mt-2 p-2 bg-teal-50 rounded text-xs text-teal-800">
                <p className="font-medium mb-1">پاسخ منتور:</p>
                <p className="line-clamp-3">{q.answer}</p>
              </div>
            )}
            {q.createdAt && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(q.createdAt).toLocaleDateString("fa-IR")}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SessionsTab({ sessions }: { sessions: any[] | undefined }) {
  if (sessions === undefined) return <LoadingState />;
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="جلسه‌ای ثبت نشده"
        description="هنوز جلسه منتورینگی برای شما برنامه‌ریزی نشده است."
      />
    );
  }

  const now = Date.now();
  const upcoming = sessions.filter((s: any) => s.status === "planned" && (!s.date || s.date >= now));
  const past = sessions.filter((s: any) => s.status === "completed" || (s.date && s.date < now));
  const cancelled = sessions.filter((s: any) => s.status === "cancelled");

  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Clock className="size-3 text-blue-500" /> جلسات آینده
          </h3>
          {upcoming.map((s: any) => (
            <SessionCard key={s._id} session={s} />
          ))}
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <CheckCircle2 className="size-3 text-green-500" /> جلسات برگزار شده
          </h3>
          {past.map((s: any) => (
            <SessionCard key={s._id} session={s} />
          ))}
        </div>
      )}
      {cancelled.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <AlertCircle className="size-3 text-red-500" /> لغو شده
          </h3>
          {cancelled.map((s: any) => (
            <SessionCard key={s._id} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard({ session }: { session: any }) {
  const statusColors: Record<string, string> = {
    planned: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <Card className="mb-2">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{session.title ?? "جلسه منتورینگ"}</p>
            {session.date && (
              <p className="text-xs text-muted-foreground">
                📅 {new Date(session.date).toLocaleDateString("fa-IR")}{" "}
                {session.time ? `— ${session.time}` : ""}
              </p>
            )}
            {session.studentName && (
              <p className="text-xs text-muted-foreground">👤 {session.studentName}</p>
            )}
          </div>
          <Badge className={cn("text-[10px]", statusColors[session.status] ?? "bg-gray-100")}>
            {session.status === "planned" ? "آینده" : session.status === "completed" ? "انجام شد" : "لغو"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function TasksTab() {
  // Tasks from mentor desk — placeholder until a dedicated tasks query exists
  return (
    <EmptyState
      icon={BookOpen}
      title="تکالیف"
      description="بخش تکالیف به‌زودی فعال خواهد شد."
    />
  );
}

function NotificationsTab({ announcements }: { announcements: any[] | undefined }) {
  if (announcements === undefined) return <LoadingState />;
  if (announcements.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="اعلانی ندارید"
        description="اعلان‌های جدید در اینجا نمایش داده می‌شوند."
      />
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">اعلان‌ها</h2>
      {announcements.map((a: any) => (
        <Card key={a._id} className={cn(!a.read && "border-teal-200 bg-teal-50/30")}>
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              {!a.read && <span className="mt-1 w-2 h-2 rounded-full bg-teal-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.body}</p>
                {a.createdAt && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(a.createdAt).toLocaleDateString("fa-IR")}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function GroupsTab({ groups }: { groups: any[] | undefined }) {
  if (groups === undefined) return <LoadingState />;
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="عضو هیچ گروهی نیستید"
        description="گروه‌های منتورینگ در اینجا نمایش داده می‌شوند."
      />
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">گروه‌های منتورینگ</h2>
      {groups.map((g: any) => (
        <Card key={g._id}>
          <CardContent className="p-3">
            <p className="text-sm font-medium">{g.name}</p>
            {g.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{g.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProfileTab({ user, linkingStatus, notifPrefs }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">پروفایل</h2>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-lg">
              {(user?.name ?? "U")[0]}
            </div>
            <div>
              <p className="font-medium">{user?.name ?? "کاربر"}</p>
              <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2 text-sm">
            <Row label="نقش" value={user?.role ?? "دانشجو"} />
            <Row
              label="اتصال Telegram"
              value={linkingStatus?.linked ? "✅ متصل" : "❌ متصل نیست"}
            />
            {linkingStatus?.telegramUsername && (
              <Row label="Telegram" value={`@${linkingStatus.telegramUsername}`} />
            )}
            <Row
              label="اعلان‌های Telegram"
              value={notifPrefs?.masterEnabled ? "فعال" : "غیرفعال"}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => window.open("https://nibrc.ir/dashboard", "_blank")}
      >
        باز کردن پنل کامل
        <ExternalLink className="mr-2 size-4" />
      </Button>
    </div>
  );
}

// ── Shared Components ───────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-pulse text-muted-foreground text-sm">در حال بارگذاری...</div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Home;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-12">
      <Icon className="size-10 mx-auto mb-3 text-gray-300" />
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
