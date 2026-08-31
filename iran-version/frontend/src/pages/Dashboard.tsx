import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { faNum, formatPrice } from "@/lib/format";
import {
  BookOpen, Clock, Trophy, LogOut, Wifi, WifiOff, RefreshCw,
  ChevronLeft, User,
} from "lucide-react";

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Enrollment {
  id: number;
  courseId: string;
  courseTitle: string;
  tier: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface ExamAttempt {
  id: number;
  examId: string;
  score: number;
  total: number;
  percent: number;
  createdAt: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [syncStatus, setSyncStatus] = useState<{ pending: number; total: number } | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("iran_user");
    const token = localStorage.getItem("iran_token");
    if (!stored || !token) {
      navigate("/auth?returnTo=/dashboard");
      return;
    }
    setUser(JSON.parse(stored));

    // Fetch enrollments
    fetch("/api/offline/enrollments", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setEnrollments)
      .catch(() => {});

    // Fetch exam attempts
    fetch("/api/offline/exam-attempts", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setAttempts)
      .catch(() => {});

    // Fetch sync status
    fetch("/api/offline/sync-status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setSyncStatus)
      .catch(() => {});

    // Online/offline
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("iran_token");
    localStorage.removeItem("iran_user");
    navigate("/");
  };

  const handleSyncBack = async () => {
    const token = localStorage.getItem("iran_token");
    if (!token) return;
    setSyncing(true);
    try {
      const resp = await fetch("/api/offline/sync-back", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (data.ok) {
        setSyncStatus({ pending: 0, total: syncStatus?.total || 0 });
      }
    } catch {}
    setSyncing(false);
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">پنل دانشجویی</h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
            <User className="size-4" /> {user.name} · {user.email}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="ml-1 size-4" /> خروج
        </Button>
      </div>

      {/* Status Bar */}
      <Card className="mt-6 border-border/70">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <span className="flex items-center gap-1.5 text-sm">
            {online ? <Wifi className="size-4 text-success" /> : <WifiOff className="size-4 text-amber-500" />}
            {online ? "آنلاین" : "آفلاین"}
          </span>
          {syncStatus && syncStatus.pending > 0 && (
            <Badge className="bg-amber-500/10 text-amber-700">
              {faNum(syncStatus.pending)} تغییر منتظر سینک
            </Badge>
          )}
          {online && syncStatus && syncStatus.pending > 0 && (
            <Button size="sm" variant="outline" onClick={handleSyncBack} disabled={syncing}>
              <RefreshCw className={`ml-1 size-3.5 ${syncing ? "animate-spin" : ""}`} />
              ارسال تغییرات
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Enrollments */}
      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <BookOpen className="size-5 text-primary" /> دوره‌های من
        </h2>
        {enrollments.length > 0 ? (
          <div className="mt-4 space-y-3">
            {enrollments.map((e) => (
              <Card key={e.id} className="border-border/70">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-bold">{e.courseTitle || e.courseId}</p>
                    <p className="text-xs text-muted-foreground">{e.tier} · {formatPrice(e.amount)}</p>
                  </div>
                  <Badge variant={e.status === "confirmed" ? "default" : "secondary"}>
                    {e.status === "confirmed" ? "تأیید شده" : e.status === "synced" ? "سینک شده" : "در انتظار"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">هنوز در دوره‌ای ثبت‌نام نکرده‌اید.</p>
        )}
      </div>

      {/* Exam Attempts */}
      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <Trophy className="size-5 text-primary" /> سوابق آزمون
        </h2>
        {attempts.length > 0 ? (
          <div className="mt-4 space-y-3">
            {attempts.map((a) => (
              <Card key={a.id} className="border-border/70">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-bold">آزمون {a.examId}</p>
                    <p className="text-xs text-muted-foreground">
                      {faNum(a.score)}/{faNum(a.total)} · {faNum(a.percent)}٪
                    </p>
                  </div>
                  <Badge variant={a.percent >= 70 ? "default" : "secondary"}>
                    {a.percent >= 70 ? "قبول" : "نیاز به تمرین"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">هنوز آزمونی نداده‌اید.</p>
        )}
      </div>

      {/* Quick Links */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link to="/courses" className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-4 hover:shadow-md transition-shadow">
          <span className="font-bold">مشاهده دوره‌ها</span>
          <ChevronLeft className="size-4 text-muted-foreground" />
        </Link>
        <Link to="/" className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-4 hover:shadow-md transition-shadow">
          <span className="font-bold">بازگشت به صفحه اصلی</span>
          <ChevronLeft className="size-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
