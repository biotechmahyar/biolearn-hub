/**
 * TelegramMiniApp — the shared Mini App served at `/mini`.
 *
 * One page, one code base, three environments: Telegram, Bale and a plain
 * browser fallback. Nothing in the UI talks to `window.Telegram` / `window.Bale`
 * directly — every platform difference lives in `@/lib/miniApp/platform`.
 *
 * Authentication: when opened inside Telegram or Bale the page auto-signs-in
 * with the platform initData (ConvexCredentials providers "telegram_miniapp" /
 * "bale_miniapp"), which creates a REAL session for the linked Genova account —
 * including its role. The provider id is only a hint: the server resolves the
 * platform from the HMAC signature.
 *
 * Every section reuses existing Genova queries/mutations; the Mini App never
 * duplicates business logic and never trusts the client for identity, role,
 * payment or enrollment.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Bell,
  BookOpen,
  Calendar,
  ExternalLink,
  GraduationCap,
  Home,
  Loader2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getMiniAppInitData, platform } from "@/lib/miniApp/platform";
import {
  type MiniNav,
  type MiniScreen,
  type MiniTab,
  type MiniTarget,
  type MiniUser,
} from "@/components/miniApp/ui";
import { HomeScreen } from "@/components/miniApp/HomeScreen";
import { LearningScreen, OrdersScreen } from "@/components/miniApp/LearningScreens";
import {
  CourseDetailScreen,
  CoursesScreen,
  ProductDetailScreen,
  ProductsScreen,
  WorkshopDetailScreen,
  WorkshopsScreen,
} from "@/components/miniApp/CatalogScreens";
import {
  DailyQuizScreen,
  ExamRunnerScreen,
  ExamsScreen,
} from "@/components/miniApp/PracticeScreens";
import {
  NotificationsScreen,
  SupportScreen,
  TicketScreen,
} from "@/components/miniApp/SupportScreens";
import { ProfileScreen } from "@/components/miniApp/ProfileScreen";
import {
  AdminScreen,
  GroupsScreen,
  QuestionsScreen,
  SessionsScreen,
} from "@/components/miniApp/MentorScreens";

const TABS: { id: MiniTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "خانه", icon: Home },
  { id: "courses", label: "دورهها", icon: BookOpen },
  { id: "learning", label: "یادگیری من", icon: GraduationCap },
  { id: "workshops", label: "کارگاهها", icon: Calendar },
  { id: "profile", label: "پروفایل", icon: User },
];

const TAB_IDS = new Set<string>(TABS.map((tab) => tab.id));

export default function TelegramMiniApp() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { signIn } = useAuthActions();
  const [tab, setTab] = useState<MiniTab>("home");
  const [stack, setStack] = useState<MiniScreen[]>([]);

  // ── Auto sign-in via Mini App initData (Telegram or Bale) ────────────────
  const triedRef = useRef(false);
  useEffect(() => {
    if (triedRef.current || isAuthenticated) return;
    // Both SDKs read the same tgWebApp* transport, so take whichever has data.
    const initData = getMiniAppInitData();
    if (!initData || !initData.includes("hash=")) return;
    triedRef.current = true;
    // Platform hint only — the server validates the signature and decides the
    // platform, so a mis-detected platform still authenticates correctly.
    const providerId = platform.name === "bale" ? "bale_miniapp" : "telegram_miniapp";
    signIn(providerId, { initData } as never).catch((err: unknown) => {
      triedRef.current = false;
      const msg = err instanceof Error ? err.message : String(err);
      // Ignore the "not linked yet" case — the user then links by signing in.
      if (!msg.includes("UnknownProvider")) toast.error(msg);
    });
  }, [isAuthenticated, signIn]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const nav = useCallback<MiniNav>((target: MiniTarget) => {
    if (TAB_IDS.has(target.name)) {
      setStack([]);
      setTab(target.name as MiniTab);
      return;
    }
    setStack((prev) => [...prev, target as MiniScreen]);
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);

  // Connect the native back button (Telegram/Bale header) to Mini App history.
  // In a plain browser both calls are no-ops and the browser handles back.
  useEffect(() => {
    const hasPushed = stack.length > 0;
    platform.showBackButton(hasPushed);
    if (!hasPushed) return;
    return platform.onBackButton(() => goBack());
  }, [stack.length, goBack]);

  const miniUser = user as unknown as MiniUser | null;
  const isAdmin = !!(user && (user.role === "admin" || user.role === "site_admin"));

  // Unread badge for notifications on the home tile (existing query).
  const unread = useQuery(
    api.support.getUnreadCounts,
    isAuthenticated ? {} : "skip",
  );

  const current = stack.length > 0 ? stack[stack.length - 1] : null;

  // ── Auth gates ───────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    if (isLoading) {
      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4">
          <Loader2 className="size-8 animate-spin text-teal-500" />
          <p className="mt-3 text-sm text-muted-foreground">در حال ورود خودکار…</p>
        </div>
      );
    }
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-teal-50 to-white px-6 text-center dark:from-teal-950/40 dark:to-background">
        <div className="mb-4 text-5xl">🧬</div>
        <h1 className="mb-2 text-xl font-bold text-teal-700 dark:text-teal-400">Genova</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          برای استفاده از Mini App ابتدا حساب پیامرسان خود (تلگرام یا بله) را به Genova متصل
          کنید. با ورود در همین صفحه، حساب شما بهصورت خودکار متصل میشود.
        </p>
        {/* Client-side navigation (Link, not an <a>) keeps the WebView and the
            SDK's initData alive, so the messenger account gets linked as soon
            as the user signs in — no external browser needed. */}
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link to="/auth?returnTo=/mini">
            ورود به Genova
            <ExternalLink className="mr-2 size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  if (!miniUser) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="size-7 animate-spin text-teal-500" />
      </div>
    );
  }

  // ── Section router ───────────────────────────────────────────────────────
  const renderScreen = (screen: MiniScreen) => {
    switch (screen.name) {
      case "course":
        return <CourseDetailScreen slug={screen.slug} onBack={goBack} />;
      case "workshop":
        return <WorkshopDetailScreen slug={screen.slug} onBack={goBack} />;
      case "product":
        return <ProductDetailScreen slug={screen.slug} onBack={goBack} />;
      case "products":
        return <ProductsScreen nav={nav} />;
      case "orders":
        return <OrdersScreen onBack={goBack} />;
      case "exams":
        return <ExamsScreen nav={nav} />;
      case "exam":
        return <ExamRunnerScreen slug={screen.slug} onBack={goBack} />;
      case "quiz":
        return <DailyQuizScreen onBack={goBack} />;
      case "notifications":
        return <NotificationsScreen onBack={goBack} />;
      case "support":
        return <SupportScreen onBack={goBack} onOpenTicket={(id) => nav({ name: "ticket", id })} />;
      case "ticket":
        return <TicketScreen id={screen.id} onBack={goBack} />;
      case "questions":
        return <QuestionsScreen onBack={goBack} />;
      case "sessions":
        return <SessionsScreen onBack={goBack} />;
      case "groups":
        return <GroupsScreen onBack={goBack} />;
      case "admin":
        return <AdminScreen onBack={goBack} />;
      default:
        return null;
    }
  };

  const renderTab = () => {
    switch (tab) {
      case "home":
        return <HomeScreen nav={nav} user={miniUser} />;
      case "courses":
        return <CoursesScreen nav={nav} />;
      case "learning":
        return <LearningScreen nav={nav} />;
      case "workshops":
        return <WorkshopsScreen nav={nav} />;
      case "profile":
        return <ProfileScreen />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b bg-background/95 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧬</span>
            <span className="font-bold tracking-tight text-teal-600 dark:text-teal-400">
              Genova
            </span>
            {isAdmin ? (
              <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[9px] font-bold text-white">
                مدیر
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => nav({ name: "notifications" })}
              className="relative flex size-8 items-center justify-center rounded-full border active:bg-muted"
              aria-label="اعلانها"
            >
              <Bell className="size-4" />
              {unread?.notifications ? (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unread.notifications > 9 ? "۹+" : unread.notifications}
                </span>
              ) : null}
            </button>
            <span className="max-w-[110px] truncate text-[11px] text-muted-foreground">
              {miniUser.name ?? miniUser.email ?? "کاربر"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-3 pb-24 pt-3">
        <div className="mx-auto max-w-md">{current ? renderScreen(current) : renderTab()}</div>
      </main>

      {/* ── Bottom navigation ────────────────────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center justify-around">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id && stack.length === 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => nav({ name: item.id })}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] transition-colors",
                  active ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground/60",
                )}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
