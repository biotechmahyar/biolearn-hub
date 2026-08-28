import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Shield, Lock, Users, BookOpen, FileText, Database,
  Trash2, Save, Loader2, Eye, EyeOff, ArrowLeft,  Settings,
  Globe, Code, MessageSquare, AlertTriangle, KeyRound, Package,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLES = ["user", "member", "instructor", "mentor", "content_manager", "support", "site_admin", "admin"];
const ROLE_LABELS: Record<string, string> = {
  user: "دانشجو", member: "عضو", instructor: "مدرس", mentor: "منتور",
  content_manager: "مدیر محتوا", support: "پشتیبانی", site_admin: "مدیر سایت", admin: "مدیر سامانه",
};

export default function SuperAdminPanel() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const verifyPassword = useMutation(api.superAdmin.verifyPassword);
  const checkSession = useQuery(api.superAdmin.checkSession);
  const logoutSession = useMutation(api.superAdmin.logoutSession);

  // Check existing session
  if (!authLoading && checkSession === true && !authenticated) {
    setAuthenticated(true);
  }

  const handleVerify = async () => {
    if (!password.trim()) return;
    setVerifying(true);
    setAuthError(null);
    try {
      await verifyPassword({ password: password.trim() });
      setAuthenticated(true);
      setPassword("");
      toast.success("دسترسی تأیید شد");
    } catch (e: any) {
      setAuthError(e?.message ?? "خطا");
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = async () => {
    await logoutSession();
    setAuthenticated(false);
  };

  // Loading
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-muted-foreground">دسترسی غیرمجاز</p>
      </div>
    );
  }

  // Password gate
  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
              <Lock className="size-7 text-primary" />
            </div>
            <CardTitle className="text-lg">پنل مدیر سامانه</CardTitle>
            <CardDescription>برای دسترسی رمز عبور وارد کنید</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleVerify(); }}
                placeholder="رمز عبور مدیر سامانه"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {authError && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="size-3" /> {authError}
              </p>
            )}
            <Button onClick={handleVerify} disabled={verifying || !password.trim()} className="w-full">
              {verifying ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <KeyRound className="ml-1.5 size-4" />}
              تأیید و ورود
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/admin")}>
              <ArrowLeft className="ml-1.5 size-4" /> بازگشت
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <SuperAdminDashboard onLogout={handleLogout} />;
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

function SuperAdminDashboard({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();
  const stats = useQuery(api.superAdmin.getSystemStats);
  const users = useQuery(api.superAdmin.getAllUsers);
  const siteTexts = useQuery(api.superAdmin.getSiteTexts);
  const sitePages = useQuery(api.superAdmin.getSitePages);
  const aiConversations = useQuery(api.superAdmin.getAIConversations);
  const allCounts = useQuery(api.superAdmin.getAllTableCounts);

  const updateRole = useMutation(api.superAdmin.updateUserRole);
  const updateUserField = useMutation(api.superAdmin.updateUserField);
  const deleteUserMut = useMutation(api.superAdmin.deleteUser);
  const saveSiteText = useMutation(api.superAdmin.updateSiteText);
  const deleteSiteText = useMutation(api.superAdmin.deleteSiteText);
  const saveSitePage = useMutation(api.superAdmin.saveSitePage);
  const deleteSitePage = useMutation(api.superAdmin.deleteSitePage);

  const [editUser, setEditUser] = useState<any>(null);
  const [editRole, setEditRole] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [textKey, setTextKey] = useState("");
  const [textValue, setTextValue] = useState("");

  const [pageSlug, setPageSlug] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [pageHtml, setPageHtml] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">پنل مدیر سامانه</h1>
              <p className="text-xs text-muted-foreground">دسترسی کامل و مدیریت سیستم</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="ml-1.5 size-4" /> بازگشت
            </Button>
            <Button variant="destructive" size="sm" onClick={onLogout}>
              خروج از پنل محرمانه
            </Button>
          </div>
        </div>

        <Tabs defaultValue="stats" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-auto min-w-full">
              <TabsTrigger value="stats" className="gap-1.5 text-xs sm:text-sm">
                <Database className="size-3.5" /> آمار
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
                <Users className="size-3.5" /> کاربران
              </TabsTrigger>
              <TabsTrigger value="content" className="gap-1.5 text-xs sm:text-sm">
                <FileText className="size-3.5" /> محتوا
              </TabsTrigger>
              <TabsTrigger value="pages" className="gap-1.5 text-xs sm:text-sm">
                <Globe className="size-3.5" /> صفحات
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-1.5 text-xs sm:text-sm">
                <MessageSquare className="size-3.5" /> هوش مصنوعی
              </TabsTrigger>
              <TabsTrigger value="db" className="gap-1.5 text-xs sm:text-sm">
                <Code className="size-3.5" /> دیتابیس
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Stats ──────────────────────────────── */}
          <TabsContent value="stats">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats ? (
                <>
                  <StatCard label="کاربران" value={stats.users} icon={<Users className="size-5" />} />
                  <StatCard label="دوره‌ها" value={stats.courses} icon={<BookOpen className="size-5" />} />
                  <StatCard label="آزمون‌ها" value={stats.exams} icon={<FileText className="size-5" />} />
                  <StatCard label="سؤالات" value={stats.questions} icon={<Database className="size-5" />} />
                  <StatCard label="سفارشات" value={stats.orders} icon={<KeyRound className="size-5" />} />
                  <StatCard label="ثبت‌نام‌ها" value={stats.enrollments} icon={<Users className="size-5" />} />
                  <StatCard label="گفتگوهای AI" value={stats.aiConversations} icon={<MessageSquare className="size-5" />} />
                  <StatCard label="پیام‌های AI" value={stats.aiMessages} icon={<MessageSquare className="size-5" />} />
                  <StatCard label="مقالات" value={stats.articles} icon={<FileText className="size-5" />} />
                  <StatCard label="کارگاه‌ها" value={stats.workshops} icon={<BookOpen className="size-5" />} />
                  <StatCard label="محصولات" value={stats.products} icon={<Package className="size-5" />} />
                  <StatCard label="تیکت‌ها" value={stats.tickets} icon={<MessageSquare className="size-5" />} />
                </>
              ) : (
                <div className="col-span-full flex justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {/* Role breakdown */}
            {stats?.roleCounts && (
              <Card className="mt-4">
                <CardHeader className="pb-2"><CardTitle className="text-sm">توزیع نقش‌ها</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.roleCounts).map(([role, count]) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {ROLE_LABELS[role] ?? role}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Users ──────────────────────────────── */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">مدیریت کاربران</CardTitle></CardHeader>
              <CardContent className="p-0">
                {users === undefined ? (
                  <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>نام</TableHead>
                          <TableHead>ایمیل</TableHead>
                          <TableHead>نقش</TableHead>
                          <TableHead>تاریخ عضویت</TableHead>
                          <TableHead className="text-left">عملیات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u._id}>
                            <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">{u.email ?? "—"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px]">{ROLE_LABELS[u.role ?? "user"] ?? u.role}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(u._creationTime).toLocaleDateString("fa-IR")}
                            </TableCell>
                            <TableCell className="text-left">
                              <Button size="sm" variant="ghost" className="h-7 text-xs"
                                onClick={() => { setEditUser(u); setEditRole(u.role ?? "user"); setEditName(u.name ?? ""); setEditEmail(u.email ?? ""); }}>
                                ویرایش
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                                onClick={async () => { if (confirm(`کاربر ${u.name ?? u.email} حذف شود؟`)) { await deleteUserMut({ userId: u._id }); toast.success("حذف شد"); } }}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit user dialog */}
            <Dialog open={!!editUser} onOpenChange={(v) => { if (!v) setEditUser(null); }}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>ویرایش کاربر</DialogTitle></DialogHeader>
                {editUser && (
                  <div className="space-y-3">
                    <div className="space-y-1"><label className="text-xs font-medium">نام</label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
                    <div className="space-y-1"><label className="text-xs font-medium">ایمیل</label>
                      <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} /></div>
                    <div className="space-y-1"><label className="text-xs font-medium">نقش</label>
                      <Select value={editRole} onValueChange={setEditRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={async () => {
                      await updateRole({ userId: editUser._id, role: editRole });
                      if (editName !== (editUser.name ?? "")) await updateUserField({ userId: editUser._id, field: "name", value: editName });
                      if (editEmail !== (editUser.email ?? "")) await updateUserField({ userId: editUser._id, field: "email", value: editEmail });
                      setEditUser(null);
                      toast.success("ذخیره شد");
                    }}>ذخیره</Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ── Site Content ───────────────────────── */}
          <TabsContent value="content">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">متن‌های سایت</CardTitle>
                  <CardDescription className="text-xs">کلید و مقدار متن‌ها را ویرایش کنید</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="کلید (مثلا: site.title)" value={textKey} onChange={(e) => setTextKey(e.target.value)} />
                    <Input placeholder="مقدار" value={textValue} onChange={(e) => setTextValue(e.target.value)} />
                  </div>
                  <Button size="sm" onClick={async () => {
                    if (!textKey.trim()) return;
                    await saveSiteText({ key: textKey.trim(), value: textValue });
                    setTextKey(""); setTextValue("");
                    toast.success("ذخیره شد");
                  }}><Save className="ml-1.5 size-3.5" /> ذخیره</Button>
                  <div className="space-y-2">
                    {siteTexts?.map((t) => (
                      <div key={t._id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                        <span className="font-mono text-xs text-muted-foreground min-w-32">{t.key}</span>
                        <span className="flex-1 truncate">{t.value}</span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                          onClick={async () => { await deleteSiteText({ key: t.key }); toast.success("حذف شد"); }}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Custom Pages ───────────────────────── */}
          <TabsContent value="pages">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">صفحه جدید</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="آدرس (slug)" value={pageSlug} onChange={(e) => setPageSlug(e.target.value)} dir="ltr" />
                    <Input placeholder="عنوان صفحه" value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} />
                  </div>
                  <Textarea placeholder="محتوای HTML" rows={8} value={pageHtml} onChange={(e) => setPageHtml(e.target.value)}
                    className="font-mono text-xs" />
                  <Button size="sm" onClick={async () => {
                    if (!pageSlug.trim() || !pageTitle.trim()) return;
                    await saveSitePage({ slug: pageSlug.trim(), title: pageTitle.trim(), htmlContent: pageHtml });
                    setPageSlug(""); setPageTitle(""); setPageHtml("");
                    toast.success("ذخیره شد");
                  }}><Save className="ml-1.5 size-3.5" /> ذخیره صفحه</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">صفحات موجود</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {sitePages?.map((p) => (
                    <div key={p._id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground font-mono" dir="ltr">/{p.slug}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                        onClick={async () => { if (confirm("حذف شود؟")) { await deleteSitePage({ slug: p.slug }); toast.success("حذف شد"); } }}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  {sitePages?.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">هنوز صفحه‌ای نیست</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── AI Conversations ───────────────────── */}
          <TabsContent value="ai">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">گفتگوهای هوش مصنوعی</CardTitle></CardHeader>
              <CardContent className="p-0">
                {aiConversations === undefined ? (
                  <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="space-y-3 p-4">
                    {aiConversations.map((c) => (
                      <div key={c._id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{c.title}</p>
                            <p className="text-xs text-muted-foreground">{c.userName} · {c.messageCount} پیام</p>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">{new Date(c.updatedAt).toLocaleDateString("fa-IR")}</Badge>
                        </div>
                        {c.messages.length > 0 && (
                          <div className="mt-2 space-y-1 border-t border-border/50 pt-2">
                            {c.messages.slice(0, 3).map((m: any) => (
                              <div key={m._id} className="flex gap-2 text-xs">
                                <Badge variant={m.role === "user" ? "default" : "secondary"} className="text-[9px] shrink-0">{m.role === "user" ? "کاربر" : "AI"}</Badge>
                                <span className="truncate text-muted-foreground">{m.content}</span>
                              </div>
                            ))}
                            {c.messages.length > 3 && <p className="text-[10px] text-muted-foreground">+{c.messages.length - 3} پیام دیگر</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Database ───────────────────────────── */}
          <TabsContent value="db">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">تعداد رکوردهای هر جدول</CardTitle></CardHeader>
              <CardContent>
                {allCounts === undefined ? (
                  <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(allCounts).map(([table, count]) => (
                      <div key={table} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                        <span className="text-xs font-mono text-muted-foreground">{table}</span>
                        <Badge variant="secondary" className="text-[10px]">{count === -1 ? "ناموجود" : count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value.toLocaleString("fa-IR")}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
