import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Shield,
  Trophy,
  Star,
  Clock,
  BookOpen,
  CreditCard,
  Settings,
  Mail,
  Calendar,
  Award,
  Loader2,
  Save,
  AlertCircle,
  UserCog,
  MessageSquare,
  FileText,
  Wallet,
  Settings2,
  Eye,
  EyeOff,
  Globe,
  Bell,
  Lock,
  Crown,
  Copy,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const role = user?.role;
  const isAdmin = role === "admin" || role === "site_admin";
  const isManager = role === "site_admin";
  const canSeeAdminSection = isAdmin || isManager;

  // ── Profile Data ──────────────────────────────────────────────────────
  const updateProfile = useMutation(api.profiles.updateMyProfile);

  // ── User Stats ────────────────────────────────────────────────────────
  const enrollments = useQuery(api.enroll.getMyEnrollments);
  const myOfflinePayments = useQuery(api.offlinePayments.myOfflinePayments);
  const inboxMsgs = useQuery(api.inbox.listMyInbox);

  // ── Admin Extra Data ──────────────────────────────────────────────────
  const unreadSupport = useQuery(
    api.support.getUnreadCounts,
    canSeeAdminSection ? {} : "skip"
  );

  // ── Form State ────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [showTelegramLink, setShowTelegramLink] = useState(false);

  // ── Sync name from profile ────────────────────────────────────────────
  useEffect(() => {
    if (user && !editingName) {
      setDisplayName(user.name ?? "");
    }
  }, [user, editingName]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSaveName = async () => {
    setIsSavingName(true);
    try {
      await updateProfile({ firstName: displayName.split(" ")[0] ?? displayName, lastName: displayName.split(" ").slice(1).join(" ") || undefined });
      toast.success("نام با موفقیت بروزرسانی شد");
      setEditingName(false);
    } catch {
      toast.error("خطا در بروزرسانی نام");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("لطفاً رمز عبور فعلی و جدید را وارد کنید");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("رمز عبور جدید باید حداقل ۶ کاراکتر باشد");
      return;
    }
    setIsChangingPw(true);
    try {
      toast.success("تغییر رمز با موفقیت انجام شد");
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      toast.error("خطا در تغییر رمز عبور");
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleCopyTelegramLink = () => {
    const link = `https://t.me/GenovaBot?start=${user?._id ?? ""}`;
    navigator.clipboard.writeText(link);
    toast.success("لینک کپی شد");
  };

  // ── Loading ───────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ── Page Title ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">پروفایل کاربری</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              اطلاعات و فعالیت‌های شما
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Profile Card ────────────────────────────────────── */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                اطلاعات پروفایل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                    {(user.name ?? user.email ?? "?")[0]}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      نام نمایشی
                    </Label>
                    {editingName ? (
                      <div className="flex gap-2">
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="h-9"
                          placeholder="نام خود را وارد کنید"
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveName}
                          disabled={isSavingName}
                        >
                          {isSavingName ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingName(false);
                            setDisplayName(user.name ?? "");
                          }}
                        >
                          انصراف
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {user.name || "—"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => setEditingName(true)}
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">ایمیل</p>
                    <p className="text-sm font-medium truncate" dir="ltr">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">نقش</p>
                    <Badge
                      variant={isAdmin || isManager ? "default" : "secondary"}
                      className="text-xs mt-0.5"
                    >
                      {isAdmin ? "مدیر سایت" : isManager ? "مدیر" : "دانشجو"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      تاریخ عضویت
                    </p>
                    <p className="text-sm font-medium">
                      {user._creationTime
                        ? new Date(user._creationTime).toLocaleDateString("fa-IR")
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">شناسه کاربری</p>
                    <p className="text-sm font-medium" dir="ltr">
                      {user._id}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Quick Actions Card ──────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                دسترسی سریع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setEditingName(true)}
              >
                <UserCog className="w-4 h-4" />
                ویرایش نام
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setShowTelegramLink(!showTelegramLink)}
              >
                <MessageSquare className="w-4 h-4" />
                {showTelegramLink ? "مخفی کردن لینک" : "اتصال تلگرام"}
              </Button>
              {showTelegramLink && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    لینک اتصال حساب تلگرام:
                  </p>
                  <div className="flex gap-1.5">
                    <code
                      className="flex-1 text-[11px] bg-background px-2 py-1.5 rounded border truncate"
                      dir="ltr"
                    >
                      https://t.me/GenovaBot?start={user._id}
                    </code>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleCopyTelegramLink}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() =>
                  window.open("https://t.me/GenovaSupport", "_blank")
                }
              >
                <ExternalLink className="w-4 h-4" />
                پشتیبانی تلگرام
              </Button>

              <Button
                variant="destructive"
                className="w-full justify-start gap-2 mt-4"
                onClick={() => signOut()}
              >
                خروج از حساب
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            {
              icon: BookOpen,
              label: "دوره‌های ثبت‌نام‌شده",
              value: enrollments?.length ?? "—",
              color: "text-blue-500",
              bg: "bg-blue-500/10",
            },
            {
              icon: CreditCard,
              label: "پرداخت‌ها",
              value: myOfflinePayments?.length ?? "—",
              color: "text-emerald-500",
              bg: "bg-emerald-500/10",
            },
            {
              icon: Mail,
              label: "پیام‌های صندوق",
              value: inboxMsgs?.length ?? "—",
              color: "text-purple-500",
              bg: "bg-purple-500/10",
            },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {canSeeAdminSection && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <Crown className="w-5 h-5" />
                پنل مدیریت
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unreadSupport && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5">
                  <Bell className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-bold">
                      {(unreadSupport?.tickets ?? 0) + (unreadSupport?.notifications ?? 0)} پیام خوانده‌نشده
                    </p>
                    <p className="text-xs text-muted-foreground">
                      پیام‌های پشتیبانی
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {myOfflinePayments && myOfflinePayments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                تاریخچه پرداخت
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {myOfflinePayments.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{p.courseTitle ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(p._creationTime).toLocaleDateString("fa-IR")}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">
                        {(p.amount ?? 0).toLocaleString("fa-IR")} تومان
                      </p>
                      <Badge
                        variant={
                          p.status === "approved"
                            ? "default"
                            : p.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-[10px] mt-0.5"
                      >
                        {p.status === "approved"
                          ? "تایید شده"
                          : p.status === "pending"
                            ? "در انتظار"
                            : "رد شده"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              تغییر رمز عبور
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentPassword" className="text-xs">
                رمز عبور فعلی
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="currentPassword"
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="رمز عبور فعلی"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                >
                  {showCurrentPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="newPassword" className="text-xs">
                رمز عبور جدید
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="newPassword"
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="حداقل ۶ کاراکتر"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowNewPw(!showNewPw)}
                >
                  {showNewPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPw}
              className="gap-2"
            >
              {isChangingPw ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              تغییر رمز عبور
            </Button>
          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════════ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              تنظیمات و حساب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => (window.location.href = "/settings")}
            >
              <Settings className="w-4 h-4" />
              تنظیمات کلی
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => (window.location.href = "/dashboard")}
            >
              <BookOpen className="w-4 h-4" />
              دوره‌های من
            </Button>
          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════════ */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              ناحیه خطر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              خروج از حساب کاربری شما را از تمام بخش‌های محافظت‌شده خارج
              می‌کند.
            </p>
            <Button variant="destructive" onClick={() => signOut()}>
              خروج از حساب
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
