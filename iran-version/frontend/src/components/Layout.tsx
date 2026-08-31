import { Dna, Wifi, WifiOff } from "lucide-react";
import { Link, Outlet } from "react-router";
import { useState, useEffect } from "react";

export function Layout() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
            Genova
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link to="/courses" className="hover:text-primary transition-colors">دوره‌ها</Link>
            <Link to="/instructors" className="hover:text-primary transition-colors">اساتید</Link>
            <Link to="/articles" className="hover:text-primary transition-colors">مقالات</Link>
            <Link to="/products" className="hover:text-primary transition-colors">محصولات</Link>
            <Link to="/workshops" className="hover:text-primary transition-colors">کارگاه‌ها</Link>
            <Link to="/dictionary" className="hover:text-primary transition-colors">دیکشنری</Link>
          </nav>
          <div className="flex items-center gap-2">
            {online ? (
              <span className="flex items-center gap-1 text-xs text-success">
                <Wifi className="size-3.5" /> آنلاین
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <WifiOff className="size-3.5" /> آفلاین
              </span>
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
          <p className="font-bold text-foreground">Genova — پلتفرم تخصصی علوم زیستی</p>
          <p className="mt-1">نسخه آینه‌ای ایران | بروزرسانی خودکار هر ۳۰ دقیقه</p>
        </div>
      </footer>
    </div>
  );
}
