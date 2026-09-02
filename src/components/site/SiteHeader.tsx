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
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { ShoppingCart } from "lucide-react";
import { ModeSwitcher } from "./ModeSwitcher";
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
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { panelForRole, ROLE_LABEL } from "@/components/RoleGate";
import { BrandLogo } from "./BrandLogo";
import { useSettings } from "@/lib/settings";

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

export function SiteHeader() {
  const { isAuthenticated, user, signOut } = useAuth();
  const isAdmin = useQuery(api.admin.amIAdmin);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
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
          {/* Mode Switcher — only when NOT authenticated */}
          {!isAuthenticated && <ModeSwitcher />}
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
                  className="flex items-center gap-2.5 rounded-full border border-border/50 bg-background/50 px-3 py-1.5 transition-colors hover:bg-accent"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {(user?.name ?? "د")[0]}
                  </span>
                  <span className="hidden max-w-28 truncate text-sm font-semibold text-foreground sm:block">
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
                  <DropdownMenuItem onClick={() => navigate(myPanel)} className="cursor-pointer">
                    <ShieldCheck className="ml-2 size-4" />
                    {myPanelLabel}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer">
                    <LayoutDashboard className="ml-2 size-4" />
                    پنل دانشجویی
                  </DropdownMenuItem>
                )}
                {hasSecondaryPanel && secondaryPanel && (
                  <DropdownMenuItem onClick={() => navigate(secondaryPanel)} className="cursor-pointer">
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
            <SheetContent side="right" className="w-80">
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
                    <Button asChild size="sm">
                      <Link to={isStaff ? myPanel : "/dashboard"} onClick={() => setOpen(false)}>
                        <ShieldCheck className="ml-2 size-4" />
                        {isStaff ? myPanelLabel : "پنل دانشجویی"}
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSignOut}>
                      <LogOut className="ml-2 size-4" />
                      خروج
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <ModeSwitcher />
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
