import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { ShoppingCart } from "lucide-react";
import {
  BookOpen,
  Bot,
  ChevronDown,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Microscope,
  Moon,
  ShieldCheck,
  Store,
  Sun,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { panelForRole, ROLE_LABEL } from "@/components/RoleGate";
import { Dna } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { useSettings } from "@/lib/settings";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const NAV = [
  { to: "/courses", label: "دوره‌ها" },
  { to: "/tests", label: "آزمون‌ها" },
  { to: "/free-content", label: "محتوای رایگان" },
  { to: "/products", label: "محصولات" },
  { to: "/workshops", label: "کارگاه‌ها" },
  { to: "/instructors", label: "اساتید" },
  { to: "/dictionary", label: "دیکشنری" },
  { to: "/ai-chat", label: "چت هوشمند" },
  { to: "/marketplace", label: "بازارچه" },
  { to: "/about", label: "درباره ما" },
];

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  admin: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-400/30" },
  site_admin: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-400/30" },
  instructor: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-400/30" },
  mentor: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-400/30" },
  content_manager: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-400/30" },
  support: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-400/30" },
  student: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" },
  member: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" },
};

export function SiteHeader() {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<{ label: string; path: string; role: string } | null>(null);

  const role = user?.role;
  const secondaryRole = user?.secondaryRole as string | undefined;
  const isStaff = !!role && role !== "user" && role !== "member";
  const myPanel = panelForRole(role);
  const myPanelLabel = isStaff ? (ROLE_LABEL[role] ?? "پنل من") : null;
  const hasSecondaryPanel = !!secondaryRole && secondaryRole !== role;
  const secondaryPanel = hasSecondaryPanel ? panelForRole(secondaryRole) : null;
  const secondaryPanelLabel = hasSecondaryPanel ? (ROLE_LABEL[secondaryRole] ?? "پنل دوم") : null;

  const { settings, setTheme } = useSettings();
  const isDark = settings.theme === "dark";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  /** Show themed loading overlay then navigate to the target panel */
  const switchPanel = useCallback(
    (label: string, path: string, role?: string) => {
      setSwitchingTo({ label, path, role: role ?? "student" });
    },
    [],
  );

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <Link to="/" className="shrink-0">
          <BrandLogo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  isActive && "bg-accent/70 text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={isDark ? "حالت روشن" : "حالت تیره"}
          >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          {/* Cart */}
          {isAuthenticated && (
            <Link to="/cart" className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <ShoppingCart className="size-5" />
            </Link>
          )}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 rounded-full border border-border/50 bg-background/50 px-2 py-1 transition-colors hover:bg-accent sm:gap-2.5 sm:px-3 sm:py-1.5"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {(user?.name ?? "د")[0]}
                  </span>
                  <span className="hidden max-w-20 truncate text-sm font-semibold text-foreground md:block">
                    {user?.name ?? "دانشجو"}
                  </span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="space-y-1">
                  <p className="text-sm font-bold">{user?.name ?? "کاربر"}</p>
                  <p className="text-xs text-muted-foreground">پنل کاربری</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isStaff ? (
                  <DropdownMenuItem onClick={() => switchPanel(myPanelLabel ?? "پنل من", myPanel, role)} className="cursor-pointer">
                    <ShieldCheck className="ml-2 size-4" />
                    {myPanelLabel}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => switchPanel("پنل دانشجویی", "/dashboard", "student")} className="cursor-pointer">
                    <LayoutDashboard className="ml-2 size-4" />
                    پنل دانشجویی
                  </DropdownMenuItem>
                )}
                {hasSecondaryPanel && secondaryPanel && (
                  <DropdownMenuItem onClick={() => switchPanel(secondaryPanelLabel ?? "پنل دوم", secondaryPanel, secondaryRole)} className="cursor-pointer">
                    <ShieldCheck className="ml-2 size-4" />
                    {secondaryPanelLabel}
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="ml-2 size-4" />
                  خروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="hidden sm:inline-flex">
              <Link to="/auth">ورود / عضویت</Link>
            </Button>
          )}

          {/* Mobile trigger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="scrollbar-theme w-80 overflow-y-auto">
              <SheetTitle className="sr-only">منوی سایت</SheetTitle>
              <div className="mb-6">
                <BrandLogo />
              </div>
              <nav className="flex flex-col gap-1">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
                        isActive && "bg-accent/70 text-foreground",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-6 border-t pt-4">
                {isAuthenticated ? (
                  <div className="flex flex-col gap-3">
                    {/* User info card */}
                    <div className="flex items-center gap-3 rounded-xl bg-accent/50 px-3 py-2.5">
                      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {(user?.name ?? "د")[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">{user?.name ?? "دانشجو"}</p>
                        <p className="text-[11px] text-muted-foreground">پنل کاربری</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => { setOpen(false); switchPanel(isStaff ? (myPanelLabel ?? "پنل من") : "پنل دانشجویی", isStaff ? myPanel : "/dashboard", isStaff ? role : "student"); }}>
                      <ShieldCheck className="ml-2 size-4" />
                      {isStaff ? myPanelLabel : "پنل دانشجویی"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSignOut}>
                      <LogOut className="ml-2 size-4" />
                      خروج
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button asChild className="w-full">
                      <Link to="/auth" onClick={() => setOpen(false)}>
                        ورود / عضویت
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>

    {/* Scrolling promotional banner ticker */}
    <PromoBannerTicker />

    {/* Themed panel-switch loading overlay */}
    {switchingTo && (
      <PanelSwitchOverlay
        label={switchingTo.label}
        role={switchingTo.role}
        onDone={() => {
          navigate(switchingTo.path);
          setSwitchingTo(null);
        }}
      />
    )}
    </>
  );
}

function PanelSwitchOverlay({ label, role, onDone }: { label: string; role: string; onDone: () => void }) {
  const colors = ROLE_COLORS[role] ?? ROLE_COLORS.student;

  useEffect(() => {
    const t = setTimeout(onDone, 700);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative flex size-20 items-center justify-center rounded-3xl border-2 border-dashed"
        style={{ borderColor: `var(--primary)`, backgroundColor: `color-mix(in oklch, var(--primary) 10%, transparent)` }}
      >
        <span className="absolute inset-0 animate-ping rounded-3xl border border-primary/15" />
        <Dna className="size-9 animate-spin text-primary" style={{ animationDuration: '2s' }} />
      </motion.div>
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="text-center space-y-2"
      >
        <p className="text-lg font-extrabold text-foreground">در حال بارگذاری پنل</p>
        <p className={`text-base font-bold ${colors.text}`}>{label}</p>
        <p className="text-xs text-muted-foreground mt-1">صبر کنید…</p>
      </motion.div>
    </div>
  );
}

export const NAV_ICONS: Record<string, typeof BookOpen> = {
  "/courses": BookOpen,
  "/tests": Microscope,
  "/free-content": FlaskConical,
  "/products": GraduationCap,
  "/workshops": Users,
  "/instructors": Users,
  "/dictionary": BookOpen,
  "/ai-chat": Bot,
  "/marketplace": Store,
};


// ── Scrolling promotional banner ticker ─────────────────────────────────────
function PromoBannerTicker() {
  const banners = useQuery(api.promotions.listActivePromoBanners);

  if (!banners || banners.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden border-b border-border/50 bg-primary/5 py-1.5">
      <div className="flex animate-[marquee_30s_linear_infinite] whitespace-nowrap">
        {[...banners, ...banners].map((b, i) => (
          <span key={`${b._id}-${i}`} className="mx-8 inline-flex items-center gap-2 text-xs font-medium text-primary/80">
            {b.sticker && <span className="text-sm">{b.sticker}</span>}
            {b.link ? (
              <a href={b.link} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors underline-offset-2 hover:underline">
                {b.text}
              </a>
            ) : (
              b.text
            )}
            <span className="mx-4 text-primary/30">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
