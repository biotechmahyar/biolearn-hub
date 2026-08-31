import { Dna, Wifi, WifiOff, User, LogOut } from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router";
import { useState, useEffect } from "react";

export function Layout() {
  const [online, setOnline] = useState(navigator.onLine);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("iran_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("iran_token");
    localStorage.removeItem("iran_user");
    setUser(null);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Offline Banner */}
      {!online && (
        <div className="bg-amber-500 text-white text-center py-2 text-sm font-bold flex items-center justify-center gap-2">
          <WifiOff className="size-4" />
          حالت آفلاین — اطلاعات از آخرین بروزرسانی نمایش داده می‌شود
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold">
            <Dna className="size-7 text-primary" />
            NIBRC
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link to="/courses" className="hover:text-primary transition-colors">دوره‌ها</Link>
            <Link to="/instructors" className="hover:text-primary transition-colors">اساتید</Link>
            <Link to="/articles" className="hover:text-primary transition-colors">مقالات</Link>
            <Link to="/products" className="hover:text-primary transition-colors">محصولات</Link>
            <Link to="/workshops" className="hover:text-primary transition-colors">کارگاه‌ها</Link>
            <Link to="/dictionary" className="hover:text-primary transition-colors">دیکشنری</Link>
          </nav>
          <div className="flex items-center gap-3">
            {online ? (
              <span className="flex items-center gap-1 text-xs text-success">
                <Wifi className="size-3.5" /> آنلاین
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <WifiOff className="size-3.5" /> آفلاین
              </span>
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/dashboard" className="flex items-center gap-1 text-sm hover:text-primary">
                  <User className="size-4" /> {user.name}
                </Link>
                <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <Link to="/auth" className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90">
                ورود
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70 bg-muted/50 py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4">
          <p className="font-bold text-foreground">NIBRC — پلتفرم تخصصی علوم زیستی</p>
          <p className="mt-1">نسخه آینه‌ای ایران | بروزرسانی خودکار هر ۳۰ دقیقه</p>
        </div>
      </footer>
    </div>
  );
}
