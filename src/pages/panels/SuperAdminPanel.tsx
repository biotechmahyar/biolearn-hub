import { useState } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMode } from "@/hooks/useMode";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Lock, Users, BookOpen, FileText, Database, Trash2, Save, Loader2, Eye, EyeOff, ArrowLeft, Globe, Code, MessageSquare, AlertTriangle, KeyRound, Activity, Mail, Heart, UserX, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLES = ["user", "member", "instructor", "mentor", "content_manager", "support", "site_admin", "admin"];
const ROLE_LABELS: Record<string, string> = { user: "دانشجو", member: "عضو", instructor: "مدرس", mentor: "منتور", content_manager: "مدیر محتوا", support: "پشتیبانی", site_admin: "مدیر سایت", admin: "مدیر سامانه" };
const TABLE_LIST = ["users", "categories", "courses", "exams", "questions", "orders", "enrollments", "articles", "workshops", "products", "aiConversations", "aiMessages", "aiConfig", "tickets", "announcements", "coupons", "sitePages", "siteTexts"];

export default function SuperAdminPanel() {
  const { isIran } = useMode();
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

  if (!authLoading && checkSession === true && !authenticated) setAuthenticated(true);

  const handleVerify = async () => {
    if (!password.trim()) return;
    setVerifying(true); setAuthError(null);
    try { await verifyPassword({ password: password.trim() }); setAuthenticated(true); setPassword(""); toast.success("دسترسی تأیید شد"); }
    catch (e: any) { setAuthError(e?.message ?? "خطا"); } finally { setVerifying(false); }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  if (!user || user.role !== "admin") return <div className="flex min-h-screen items-center justify-center px-4"><p className="text-muted-foreground">دسترسی غیرمجاز</p></div>;

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm"><CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10"><Lock className="size-7 text-primary" /></div>
          <CardTitle className="text-lg">پنل مدیر سامانه</CardTitle><CardDescription>رمز عبور وارد کنید</CardDescription>
        </CardHeader><CardContent className="space-y-3">
          <div className="relative"><Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleVerify(); }} placeholder="رمز عبور" autoFocus />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>
          {authError && <p className="flex items-center gap-1.5 text-xs text-destructive"><AlertTriangle className="size-3" /> {authError}</p>}
          <Button onClick={handleVerify} disabled={verifying || !password.trim()} className="w-full">{verifying ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <KeyRound className="ml-1.5 size-4" />} تأیید</Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/admin")}><ArrowLeft className="ml-1.5 size-4" /> بازگشت</Button>
        </CardContent></Card>
      </div>
    );
  }
  return <Dashboard onLogout={async () => { await logoutSession(); setAuthenticated(false); }} />;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();
  const convex = useConvex();
  const stats = useQuery(api.superAdmin.getSystemStats);
  const health = useQuery(api.superAdmin.getSystemHealth);
  const users = useQuery(api.superAdmin.getAllUsers);
  const siteTexts = useQuery(api.superAdmin.getSiteTexts);
  const sitePages = useQuery(api.superAdmin.getSitePages);
  const aiConversations = useQuery(api.superAdmin.getAIConversations);
  const auditLog = useQuery(api.superAdmin.getAuditLog);
  const updateRole = useMutation(api.superAdmin.updateUserRole);
  const updateField = useMutation(api.superAdmin.updateUserField);
  const deleteUserM = useMutation(api.superAdmin.deleteUser);
  const saveText = useMutation(api.superAdmin.updateSiteText);
  const deleteText = useMutation(api.superAdmin.deleteSiteText);
  const savePage = useMutation(api.superAdmin.saveSitePage);
  const deletePage = useMutation(api.superAdmin.deleteSitePage);
  const sendBroadcast = useMutation(api.superAdmin.sendBroadcast);
  const logAction = useMutation(api.superAdmin.addAuditLog);
  const revokeSessions = useMutation(api.superAdmin.revokeAllSessions);

  const [selUser, setSelUser] = useState<any>(null);
  const detail = useQuery(api.superAdmin.getUserDetail, selUser ? { userId: selUser._id } : "skip");
  const [eRole, setERole] = useState(""); const [eName, setEName] = useState(""); const [eEmail, setEEmail] = useState("");

  const [edTable, setEdTable] = useState("users"); const [edData, setEdData] = useState<any[]>([]); const [edLoading, setEdLoading] = useState(false);
  const [bcSubject, setBcSubject] = useState(""); const [bcBody, setBcBody] = useState(""); const [bcRole, setBcRole] = useState("all");

  const loadTable = async (t: string) => { setEdTable(t); setEdLoading(true); try { const d = await convex.query(api.superAdmin.getTableData, { table: t }); setEdData(d); } catch { setEdData([]); } setEdLoading(false); };

  return (
    <div className="min-h-screen bg-background"><div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10"><Shield className="size-5 text-primary" /></div><div><h1 className="text-xl font-bold sm:text-2xl">پنل مدیر سامانه</h1><p className="text-xs text-muted-foreground">دسترسی کامل</p></div></div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => navigate("/admin")}><ArrowLeft className="ml-1.5 size-4" /></Button><Button variant="destructive" size="sm" onClick={onLogout}>خروج</Button></div>
      </div>
      <Tabs defaultValue="stats" className="space-y-4">
        <div className="overflow-x-auto"><TabsList className="inline-flex w-auto min-w-full">
          <TabsTrigger value="stats" className="gap-1 text-xs"><Activity className="size-3.5" /> آمار</TabsTrigger>
          <TabsTrigger value="users" className="gap-1 text-xs"><Users className="size-3.5" /> کاربران</TabsTrigger>
          <TabsTrigger value="content" className="gap-1 text-xs"><FileText className="size-3.5" /> محتوا</TabsTrigger>
          <TabsTrigger value="pages" className="gap-1 text-xs"><Globe className="size-3.5" /> صفحات</TabsTrigger>
          <TabsTrigger value="ai" className="gap-1 text-xs"><MessageSquare className="size-3.5" /> AI</TabsTrigger>
          <TabsTrigger value="editor" className="gap-1 text-xs"><Code className="size-3.5" /> ویرایشگر</TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1 text-xs"><Mail className="size-3.5" /> اطلاع‌رسانی</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1 text-xs"><Eye className="size-3.5" /> گزارش</TabsTrigger>
        </TabsList></div>

        {/* Stats */}
        <TabsContent value="stats">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stats ? (<>
            <SC l="کاربران" v={stats.users} i={<Users className="size-5" />} /><SC l="دوره‌ها" v={stats.courses} i={<BookOpen className="size-5" />} />
            <SC l="آزمون‌ها" v={stats.exams} i={<FileText className="size-5" />} /><SC l="سؤالات" v={stats.questions} i={<Database className="size-5" />} />
            <SC l="سفارشات" v={stats.orders} i={<KeyRound className="size-5" />} /><SC l="ثبت‌نام‌ها" v={stats.enrollments} i={<Users className="size-5" />} />
            <SC l="گفتگوی AI" v={stats.aiConversations} i={<MessageSquare className="size-5" />} /><SC l="پیام AI" v={stats.aiMessages} i={<MessageSquare className="size-5" />} />
            <SC l="مقالات" v={stats.articles} i={<FileText className="size-5" />} /><SC l="کارگاه" v={stats.workshops} i={<BookOpen className="size-5" />} />
            <SC l="محصولات" v={stats.products} i={<FileText className="size-5" />} /><SC l="تیکت‌ها" v={stats.tickets} i={<MessageSquare className="size-5" />} />
          </>) : <div className="col-span-full flex justify-center py-8"><Loader2 className="size-5 animate-spin" /></div>}</div>
          {health && <Card className="mt-4"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Heart className="size-4 text-emerald-500" /> سلامت سیستم</CardTitle></CardHeader><CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3"><p className="text-[10px] text-muted-foreground">جدید (۲۴ساعت)</p><p className="text-lg font-bold">{health.newUsersToday}</p></div>
              <div className="rounded-lg border p-3"><p className="text-[10px] text-muted-foreground">سفارش امروز</p><p className="text-lg font-bold">{health.ordersToday}</p></div>
              <div className="rounded-lg border p-3"><p className="text-[10px] text-muted-foreground">AI</p><p className={cn("text-lg font-bold", health.aiConfigured ? "text-emerald-500" : "text-destructive")}>{health.aiConfigured ? `فعال (${health.aiProvider})` : "غیرفعال"}</p></div>
              <div className="rounded-lg border p-3"><p className="text-[10px] text-muted-foreground">زمان سرور</p><p className="text-[10px] font-mono">{health.serverTime}</p></div>
            </div></CardContent></Card>}
          {stats?.roleCounts && <Card className="mt-4"><CardHeader className="pb-2"><CardTitle className="text-sm">نقش‌ها</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-2">{Object.entries(stats.roleCounts).map(([r, c]) => <Badge key={r} variant="secondary" className="text-xs">{ROLE_LABELS[r] ?? r}: {c}</Badge>)}</div></CardContent></Card>}
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">کاربران — کلیک برای جزئیات</CardTitle></CardHeader><CardContent className="p-0">
            {users === undefined ? <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin" /></div> : (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>نام</TableHead><TableHead>ایمیل</TableHead><TableHead>نقش</TableHead><TableHead>تاریخ</TableHead><TableHead className="text-left">عملیات</TableHead></TableRow></TableHeader>
                <TableBody>{users.map((u) => (<TableRow key={u._id} className="cursor-pointer hover:bg-accent/30" onClick={() => { setSelUser(u); setERole(u.role ?? "user"); setEName(u.name ?? ""); setEEmail(u.email ?? ""); }}>
                  <TableCell className="font-medium">{u.name ?? "—"}</TableCell><TableCell className="text-xs text-muted-foreground">{u.email ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{ROLE_LABELS[u.role ?? "user"]}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(u._creationTime).toLocaleDateString("fa-IR")}</TableCell>
                  <TableCell className="text-left"><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setSelUser(u); setERole(u.role ?? "user"); setEName(u.name ?? ""); setEEmail(u.email ?? ""); }}>ویرایش</Button></TableCell>
                </TableRow>))}</TableBody></Table></div>)}
          </CardContent></Card>
          <Dialog open={!!selUser} onOpenChange={(v) => { if (!v) setSelUser(null); }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>جزئیات کاربر</DialogTitle></DialogHeader>
              {detail === undefined ? <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin" /></div> : detail && (<div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">نام: </span>{detail.name ?? "—"}</div><div><span className="text-muted-foreground text-xs">ایمیل: </span>{detail.email ?? "—"}</div>
                  <div><span className="text-muted-foreground text-xs">نقش: </span><Badge variant="secondary" className="text-[10px]">{ROLE_LABELS[detail.role ?? "user"]}</Badge></div>
                  <div><span className="text-muted-foreground text-xs">دانشگاه: </span>{detail.university ?? "—"}</div><div><span className="text-muted-foreground text-xs">رشته: </span>{detail.major ?? "—"}</div>
                  <div><span className="text-muted-foreground text-xs">تاریخ: </span>{new Date(detail._creationTime).toLocaleDateString("fa-IR")}</div>
                </div>
                {detail.passwordHash && <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"><p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1">🔑 هش رمز عبور</p><p className="font-mono text-[10px] break-all text-muted-foreground select-all">{detail.passwordHash}</p></div>}
                <div className="text-xs text-muted-foreground">روش‌های ورود: {detail.providers?.join(", ")}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border p-2 text-center"><p className="text-lg font-bold">{detail.enrollmentCount}</p><p className="text-[10px] text-muted-foreground">ثبت‌نام</p></div>
                  <div className="rounded-lg border p-2 text-center"><p className="text-lg font-bold">{detail.examAttempts}</p><p className="text-[10px] text-muted-foreground">آزمون</p></div>
                  <div className="rounded-lg border p-2 text-center"><p className="text-lg font-bold">{Math.round(detail.avgScore)}%</p><p className="text-[10px] text-muted-foreground">معدل</p></div>
                  <div className="rounded-lg border p-2 text-center"><p className="text-lg font-bold">{detail.aiConversations}</p><p className="text-[10px] text-muted-foreground">گفتگو AI</p></div>
                </div>
                <Button variant="destructive" size="sm" className="w-full" onClick={async () => { if (confirm("لغو تمام نشست‌ها؟")) { await revokeSessions({ userId: selUser._id }); toast.success("لغو شد"); } }}><UserX className="ml-1 size-3" /> لغو نشست‌ها</Button>
                <div className="border-t pt-3 space-y-2"><p className="text-xs font-bold">ویرایش</p>
                  <Input placeholder="نام" value={eName} onChange={(e) => setEName(e.target.value)} /><Input placeholder="ایمیل" value={eEmail} onChange={(e) => setEEmail(e.target.value)} />
                  <Select value={eRole} onValueChange={setERole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent></Select>
                  <Button className="w-full" onClick={async () => { await updateRole({ userId: selUser._id, role: eRole }); if (eName !== (selUser.name ?? "")) await updateField({ userId: selUser._id, field: "name", value: eName }); if (eEmail !== (selUser.email ?? "")) await updateField({ userId: selUser._id, field: "email", value: eEmail }); setSelUser(null); toast.success("ذخیره شد"); logAction({ action: "ویرایش کاربر", details: selUser.name ?? selUser.email }); }}><Save className="ml-1 size-3" /> ذخیره</Button>
                </div>
              </div>)}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Content */}
        <TabsContent value="content"><Card><CardHeader className="pb-2"><CardTitle className="text-sm">متن‌های سایت</CardTitle></CardHeader><CardContent className="space-y-2">
          {siteTexts?.map((t) => (<div key={t._id} className="flex items-center gap-2 rounded-lg border p-2 text-sm"><span className="font-mono text-xs text-muted-foreground min-w-28">{t.key}</span><span className="flex-1 truncate">{t.value}</span><Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={async () => { await deleteText({ key: t.key }); toast.success("حذف شد"); }}><Trash2 className="size-3" /></Button></div>))}
          {siteTexts?.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">خالی</p>}
        </CardContent></Card></TabsContent>

        {/* Pages */}
        <TabsContent value="pages"><Card><CardHeader className="pb-2"><CardTitle className="text-sm">صفحات</CardTitle></CardHeader><CardContent className="space-y-2">
          {sitePages?.map((p) => (<div key={p._id} className="flex items-center gap-3 rounded-lg border p-3"><div className="flex-1"><p className="text-sm font-medium">{p.title}</p><p className="text-xs text-muted-foreground font-mono" dir="ltr">/{p.slug}</p></div><Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={async () => { if (confirm("حذف؟")) { await deletePage({ slug: p.slug }); toast.success("حذف شد"); } }}><Trash2 className="size-3.5" /></Button></div>))}
          {sitePages?.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">خالی</p>}
        </CardContent></Card></TabsContent>

        {/* AI */}
        <TabsContent value="ai"><Card><CardHeader className="pb-2"><CardTitle className="text-sm">گفتگوهای AI</CardTitle></CardHeader><CardContent className="p-0">
          {aiConversations === undefined ? <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin" /></div> : (
            <div className="space-y-3 p-4">{aiConversations.map((c) => (<div key={c._id} className="rounded-lg border p-3"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">{c.title}</p><p className="text-xs text-muted-foreground">{c.userName} · {c.messageCount} پیام</p></div><Badge variant="secondary" className="text-[10px]">{new Date(c.updatedAt).toLocaleDateString("fa-IR")}</Badge></div>
              {c.messages.length > 0 && <div className="mt-2 space-y-1 border-t pt-2">{c.messages.slice(0, 3).map((m: any) => <div key={m._id} className="flex gap-2 text-xs"><Badge variant={m.role === "user" ? "default" : "secondary"} className="text-[9px] shrink-0">{m.role === "user" ? "کاربر" : "AI"}</Badge><span className="truncate text-muted-foreground">{m.content}</span></div>)}{c.messages.length > 3 && <p className="text-[10px] text-muted-foreground">+{c.messages.length - 3}</p>}</div>}
            </div>))}</div>)}
        </CardContent></Card></TabsContent>

        {/* Data Editor */}
        <TabsContent value="editor"><Card><CardHeader className="pb-2"><CardTitle className="text-sm">ویرایشگر دیتابیس</CardTitle></CardHeader><CardContent className="space-y-3">
          <div className="flex gap-2"><Select value={edTable} onValueChange={loadTable}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{TABLE_LIST.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            <Button size="sm" variant="outline" onClick={() => loadTable(edTable)}><RefreshCw className="ml-1 size-3" /></Button></div>
          {edLoading ? <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin" /></div> : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>ID</TableHead><TableHead>JSON</TableHead><TableHead className="text-left">opy</TableHead></TableRow></TableHeader>
              <TableBody>{edData.map((doc: any, i: number) => <TableRow key={doc._id}><TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell><TableCell className="font-mono text-[10px]">{String(doc._id).slice(0, 14)}</TableCell><TableCell className="max-w-xs"><pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all max-h-16 overflow-hidden">{JSON.stringify(doc).slice(0, 200)}</pre></TableCell><TableCell className="text-left"><Button size="sm" variant="ghost" className="h-7" onClick={() => { navigator.clipboard.writeText(JSON.stringify(doc, null, 2)); toast.success("کپی"); }}><Copy className="size-3" /></Button></TableCell></TableRow>)}</TableBody></Table></div>)}
        </CardContent></Card></TabsContent>

        {/* Broadcast */}
        <TabsContent value="broadcast"><Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Mail className="size-4" /> اطلاع‌رسانی</CardTitle></CardHeader><CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2"><Input placeholder="موضوع" value={bcSubject} onChange={(e) => setBcSubject(e.target.value)} />
            <Select value={bcRole} onValueChange={setBcRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">همه</SelectItem>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent></Select></div>
          <Textarea placeholder="متن پیام..." rows={4} value={bcBody} onChange={(e) => setBcBody(e.target.value)} />
          <Button onClick={async () => { if (!bcSubject.trim() || !bcBody.trim()) return; const r = await sendBroadcast({ subject: bcSubject, body: bcBody, targetRole: bcRole === "all" ? undefined : bcRole }); toast.success(`${r.sent} پیام ارسال شد`); setBcSubject(""); setBcBody(""); }}><Mail className="ml-1.5 size-4" /> ارسال</Button>
        </CardContent></Card></TabsContent>

        {/* Audit */}
        <TabsContent value="audit"><Card><CardHeader className="pb-2"><CardTitle className="text-sm">گزارش فعالیت</CardTitle></CardHeader><CardContent>
          {auditLog === undefined ? <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin" /></div> : (<div className="space-y-2">
            {auditLog.map((l: any) => <div key={l._id} className="flex items-center gap-3 rounded-lg border p-2 text-sm"><Badge variant="secondary" className="text-[10px] shrink-0">{l.action}</Badge><span className="flex-1 text-xs text-muted-foreground truncate">{l.details}</span><span className="text-[10px] text-muted-foreground shrink-0">{new Date(l.timestamp).toLocaleString("fa-IR")}</span></div>)}
            {auditLog.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">خالی</p>}
          </div>)}
        </CardContent></Card></TabsContent>
      </Tabs>
    </div></div>
  );
}

function SC({ l, v, i }: { l: string; v: number; i: React.ReactNode }) {
  return <Card><CardContent className="flex items-center gap-3 py-4"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{i}</div><div><p className="text-2xl font-bold">{v.toLocaleString("fa-IR")}</p><p className="text-xs text-muted-foreground">{l}</p></div></CardContent></Card>;
}
