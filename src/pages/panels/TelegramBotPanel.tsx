import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Command,
  Globe,
  Key,
  Loader2,
  Power,
  PowerOff,
  RefreshCw,
  Send,
  Settings,
  Trash2,
  Unlink,
  Webhook,
  Wifi,
  WifiOff,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function TelegramBotPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const botConfig = useQuery(api.telegramBot.getBotConfig);
  const saveToken = useMutation(api.telegramBot.saveBotToken);
  const deleteToken = useMutation(api.telegramBot.deleteBotToken);
  const toggleActive = useMutation(api.telegramBot.toggleBotActive);
  const updateStartMsg = useMutation(api.telegramBot.updateStartMessage);

  const saveCommandsToDb = useMutation(api.telegramBot.saveCommands);
  const testConn = useAction(api.telegramBotActions.testConnection);
  const disconnectBot = useAction(api.telegramBotActions.disconnectBot);
  const getCommands = useAction(api.telegramBotActions.getBotCommands);
  const setCommands = useAction(api.telegramBotActions.setBotCommands);
  const setWebhookAction = useAction(api.telegramBotActions.setWebhook);
  const removeWebhookAction = useAction(api.telegramBotActions.removeWebhook);
  const setupWebhookAction = useAction(api.telegramBotActions.setupWebhook);
  const getWebhookInfoAction = useAction(api.telegramBotActions.getWebhookInfo);

  const [tokenInput, setTokenInput] = useState("");
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [welcomeEdit, setWelcomeEdit] = useState(false);
  const [webhookInput, setWebhookInput] = useState("");
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [cmdDialogOpen, setCmdDialogOpen] = useState(false);
  const [cmdList, setCmdList] = useState<{ command: string; description: string }[]>([]);
  const [cmdSyncStatus, setCmdSyncStatus] = useState<"synced" | "failed" | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [webhookInfoLoading, setWebhookInfoLoading] = useState(false);

  useEffect(() => {
    if (botConfig?.startMessage) setWelcomeMsg(botConfig.startMessage);
  }, [botConfig?.startMessage]);

  // Load commands from DB on mount
  useEffect(() => {
    if (botConfig?.commands) setCmdList(botConfig.commands);
  }, [botConfig?.commands]);

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return;
    setLoading("save");
    try {
      await saveToken({ token: tokenInput.trim() });
      toast.success("توکن ذخیره شد. حالا اتصال را تست کنید.");
      setTokenInput("");
      setTokenDialogOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطا در ذخیره توکن");
    } finally { setLoading(null); }
  };

  const handleTest = async () => {
    setLoading("test");
    try {
      const r = await testConn();
      if (r.success) toast.success(`بات متصل شد: @${r.botUsername} (${r.botName})`);
      else toast.error(r.error || "اتصال ناموفق");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطا در تست اتصال");
    } finally { setLoading(null); }
  };

  const handleDisconnect = async () => {
    setLoading("disconnect");
    try { await disconnectBot(); toast.success("بات قطع شد."); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setLoading(null); }
  };

  const handleDeleteToken = async () => {
    setLoading("delete");
    try { await deleteToken(); toast.success("توکن حذف شد."); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setLoading(null); }
  };

  const handleToggleActive = async () => {
    setLoading("toggle");
    try {
      const r = await toggleActive();
      toast.success(r.active ? "بات فعال شد." : "بات غیرفعال شد.");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setLoading(null); }
  };

  const handleSaveWelcome = async () => {
    setLoading("welcome");
    try { await updateStartMsg({ message: welcomeMsg }); toast.success("پیام ذخیره شد."); setWelcomeEdit(false); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setLoading(null); }
  };

  const handleSetWebhook = async () => {
    if (!webhookInput.trim()) return;
    setLoading("webhook");
    try {
      const r = await setWebhookAction({ url: webhookInput.trim() });
      if (r.success) toast.success("Webhook تنظیم شد."); else toast.error(r.error || "خطا");
      setWebhookDialogOpen(false);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setLoading(null); }
  };

  const handleRemoveWebhook = async () => {
    setLoading("webhook");
    try { await removeWebhookAction(); toast.success("Webhook حذف شد."); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setLoading(null); }
  };


  const handleSetupWebhook = async () => {
    setLoading("setup-webhook");
    try {
      const r = await setupWebhookAction({});
      if (r.success) toast.success(`Webhook تنظیم شد: ${r.webhookUrl}`);
      else toast.error(r.error || "خطا در تنظیم Webhook");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setLoading(null); }
  };

  const handleGetWebhookInfo = async () => {
    setWebhookInfoLoading(true);
    try {
      const r = await getWebhookInfoAction();
      setWebhookInfo(r);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setWebhookInfoLoading(false); }
  };
  const handleSaveCommands = async () => {
    setLoading("commands");
    setCmdSyncStatus(null);
    try {
      // Filter out empty commands
      const validCmds = cmdList.filter(c => c.command.trim() && c.description.trim());
      if (validCmds.length === 0) {
        toast.error("حداقل یک دستور معتبر وارد کنید.");
        setLoading(null);
        return;
      }
      // 1. Sync to Telegram API
      const r = await setCommands({ commands: validCmds });
      if (r.success) {
        // 2. Save to DB
        await saveCommandsToDb({ commands: validCmds });
        setCmdSyncStatus("synced");
        toast.success("دستورات در تلگرام و سیستم ذخیره شدند.");
      } else {
        setCmdSyncStatus("failed");
        toast.error(`خطا در همگام‌سازی با تلگرام: ${r.error || "نامشخص"}`);
      }
      setCmdDialogOpen(false);
    } catch (e: unknown) {
      setCmdSyncStatus("failed");
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally { setLoading(null); }
  };

  const handleLoadCommands = async () => {
    setLoading("loadCmds");
    try {
      const r = await getCommands();
      if (r.success && r.commands?.length) setCmdList(r.commands);
      toast.success("دستورات بارگذاری شدند.");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setLoading(null); }
  };

  // Loading
  if (botConfig === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
        </div>
      </div>
    );
  }

  const isConfigured = !!botConfig;
  const isConnected = botConfig?.connected;
  const isActive = botConfig?.active;
  const hasToken = botConfig?.hasToken;

  return (
    <div className="space-y-6 p-4 sm:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
            <Bot className="size-5 text-white" />
          </span>
          <div>
            <h1 className="text-xl font-bold">تلگرام بات</h1>
            <p className="text-sm text-muted-foreground">مدیریت اتصال و تنظیمات ربات تلگرام</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/admin")}>
          <ArrowRight className="size-4" />
          <span className="hidden sm:inline">بازگشت</span>
        </Button>
      </div>

      {/* Status Card */}
      <Card className="border-border/50 overflow-hidden">
        <div className={cn(
          "h-1.5 w-full transition-colors",
          isConnected ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
            : isActive ? "bg-gradient-to-r from-amber-500 to-amber-400"
              : "bg-gradient-to-r from-slate-400 to-slate-300",
        )} />
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex size-14 items-center justify-center rounded-2xl transition-colors",
                isConnected ? "bg-emerald-500/10 text-emerald-500"
                  : isActive ? "bg-amber-500/10 text-amber-500"
                    : "bg-muted text-muted-foreground",
              )}>
                {isConnected ? <Wifi className="size-7" /> : isActive ? <WifiOff className="size-7" /> : <Bot className="size-7" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold">{botConfig?.botName || "بات تنظیم نشده"}</h2>
                  {isConnected && botConfig?.botUsername && (
                    <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400">
                      @{botConfig.botUsername}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {isConnected ? "بات متصل و فعال است" : isActive ? "بات فعال ولی متصل نیست" : "برای شروع توکن بات را وارد کنید"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!hasToken && (
                <Button size="sm" className="gap-1.5 bg-sky-600 text-white hover:bg-sky-700" onClick={() => setTokenDialogOpen(true)}>
                  <Key className="size-4" /> اتصال بات
                </Button>
              )}
              {hasToken && !isConnected && (
                <Button size="sm" className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleTest} disabled={loading === "test"}>
                  {loading === "test" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  تست اتصال
                </Button>
              )}
              {isConnected && (
                <Button size="sm" variant="outline" className="gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={handleDisconnect} disabled={loading === "disconnect"}>
                  {loading === "disconnect" ? <Loader2 className="size-4 animate-spin" /> : <Unlink className="size-4" />}
                  قطع اتصال
                </Button>
              )}
              {hasToken && (
                <Button size="sm" variant="outline" className={cn("gap-1.5", isActive ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10" : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10")} onClick={handleToggleActive} disabled={loading === "toggle"}>
                  {loading === "toggle" ? <Loader2 className="size-4 animate-spin" /> : isActive ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                  {isActive ? "غیرفعال" : "فعال"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Result */}
      {botConfig?.lastTestResult && botConfig.lastTestedAt && (
        <Card className={cn("border",
          botConfig.lastTestResult === "success" ? "border-emerald-500/30 bg-emerald-500/5"
            : botConfig.lastTestResult === "disconnected" ? "border-amber-500/30 bg-amber-500/5"
              : "border-red-500/30 bg-red-500/5",
        )}>
          <CardContent className="flex items-center gap-3 p-4">
            {botConfig.lastTestResult === "success" ? <CheckCircle2 className="size-5 text-emerald-500" />
              : botConfig.lastTestResult === "disconnected" ? <AlertTriangle className="size-5 text-amber-500" />
                : <XCircle className="size-5 text-red-500" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {botConfig.lastTestResult === "success" ? "اتصال موفق"
                  : botConfig.lastTestResult === "disconnected" ? "بات قطع شد"
                    : `خطا: ${botConfig.lastTestResult}`}
              </p>
              <p className="text-xs text-muted-foreground">{new Date(botConfig.lastTestedAt).toLocaleString("fa-IR")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Welcome Message */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Send className="size-4 text-sky-500" /> پیام خوش‌آمدگویی /start
              </CardTitle>
              {!welcomeEdit && hasToken && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setWelcomeEdit(true)}>ویرایش</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {welcomeEdit ? (
              <div className="space-y-2">
                <Textarea value={welcomeMsg} onChange={(e) => setWelcomeMsg(e.target.value)} rows={4} className="text-sm" dir="rtl" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveWelcome} disabled={loading === "welcome"}>
                    {loading === "welcome" ? <Loader2 className="ml-1 size-3 animate-spin" /> : <Check className="ml-1 size-3" />}
                    ذخیره
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setWelcomeEdit(false); setWelcomeMsg(botConfig?.startMessage || ""); }}>انصراف</Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-wrap">{welcomeMsg || "پیامی تنظیم نشده است."}</div>
            )}
          </CardContent>
        </Card>

        {/* Webhook */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Webhook className="size-4 text-violet-500" /> Webhook
              </CardTitle>
              {hasToken && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setWebhookDialogOpen(true)}>تنظیم</Button>
                  {botConfig?.webhookUrl && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={handleRemoveWebhook} disabled={loading === "webhook"}>حذف</Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {botConfig?.webhookUrl ? (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 p-3">
                      <Globe className="size-4 shrink-0 text-emerald-500" />
                      <span className="truncate text-xs font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">{botConfig.webhookUrl}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Webhook تنظیم نشده است.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="gap-1.5 bg-violet-600 text-white hover:bg-violet-700" onClick={handleSetupWebhook} disabled={loading === "setup-webhook" || !isConnected}>
                      {loading === "setup-webhook" ? <Loader2 className="size-4 animate-spin" /> : <Webhook className="size-4" />}
                      راه‌اندازی خودکار
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={handleGetWebhookInfo} disabled={webhookInfoLoading}>
                      {webhookInfoLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                      بررسی وضعیت
                    </Button>
                  </div>
                  {webhookInfo && (
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">URL:</span>
                        <span className="font-mono text-foreground truncate max-w-[200px]" dir="ltr">{webhookInfo.url || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Pending Updates:</span>
                        <span className="text-foreground">{webhookInfo.pendingUpdateCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Last Error:</span>
                        <span className={webhookInfo.lastErrorMessage ? "text-red-500" : "text-emerald-500"}>
                          {webhookInfo.lastErrorMessage || "—"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
        </Card>
        <Card className="border-border/50 sm:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Command className="size-4 text-emerald-500" /> دستورات بات
                </CardTitle>
                {cmdSyncStatus === "synced" && (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] gap-1">
                    <Check className="size-3" /> همگام شده
                  </Badge>
                )}
                {cmdSyncStatus === "failed" && (
                  <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] gap-1">
                    <XCircle className="size-3" /> ناموفق
                  </Badge>
                )}
                {botConfig?.commandsSyncedAt && !cmdSyncStatus && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    آخرین همگام‌سازی: {new Date(botConfig.commandsSyncedAt).toLocaleString("fa-IR")}
                  </Badge>
                )}
              </div>
              {hasToken && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleLoadCommands} disabled={loading === "loadCmds"}>
                    {loading === "loadCmds" ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                    بارگذاری از تلگرام
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCmdDialogOpen(true)}>ویرایش</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {cmdList.length > 0 ? (
              <div className="space-y-2">
                {cmdList.map((cmd, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">/{cmd.command}</span>
                    <span className="text-sm text-muted-foreground">{cmd.description}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">هیچ دستوری تنظیم نشده است. روی «ویرایش» کلیک کنید تا دستورات را اضافه کنید.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bot Info */}
      {isConnected && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Settings className="size-4 text-muted-foreground" /> اطلاعات بات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">شناسه بات</p>
                <p className="mt-1 font-mono text-sm" dir="ltr">{botConfig?.botId || "—"}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">نام</p>
                <p className="mt-1 text-sm font-medium">{botConfig?.botName || "—"}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">نام کاربری</p>
                <p className="mt-1 text-sm font-medium" dir="ltr">@{botConfig?.botUsername || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      {hasToken && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <Trash2 className="size-4" /> حذف توکن
            </CardTitle>
            <CardDescription className="text-xs">با حذف توکن، اتصال بات به‌طور کامل قطع می‌شود.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={handleDeleteToken} disabled={loading === "delete"}>
              {loading === "delete" ? <Loader2 className="ml-1 size-3 animate-spin" /> : <Trash2 className="ml-1 size-3" />}
              حذف توکن و تنظیمات
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="size-5 text-sky-500" /> اتصال ربات تلگرام
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              توکن ربات خود را از <a href="https://t.me/BotFather" target="_blank" rel="noopener" className="text-sky-500 underline">BotFather</a> دریافت کرده و وارد کنید.
            </p>
            <Input
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="font-mono text-sm"
              dir="ltr"
            />
            <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ توکن فقط در سرور ذخیره شده و هرگز به مرورگر ارسال نمی‌شود.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTokenDialogOpen(false)}>انصراف</Button>
            <Button onClick={handleSaveToken} disabled={!tokenInput.trim() || loading === "save"} className="bg-sky-600 text-white hover:bg-sky-700">
              {loading === "save" ? <Loader2 className="ml-1 size-4 animate-spin" /> : <Check className="ml-1 size-4" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="size-5 text-violet-500" /> تنظیم Webhook
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">آدرس URL وب‌هوک ربات را وارد کنید.</p>
            <Input
              placeholder="https://your-domain.com/api/telegram/webhook"
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              className="font-mono text-sm"
              dir="ltr"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWebhookDialogOpen(false)}>انصراف</Button>
            <Button onClick={handleSetWebhook} disabled={!webhookInput.trim() || loading === "webhook"}>
              {loading === "webhook" ? <Loader2 className="ml-1 size-4 animate-spin" /> : <Check className="ml-1 size-4" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cmdDialogOpen} onOpenChange={setCmdDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Command className="size-5 text-emerald-500" /> مدیریت دستورات
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {cmdList.map((cmd, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="/command"
                  value={cmd.command}
                  onChange={(e) => { const next = [...cmdList]; next[i] = { ...next[i], command: e.target.value }; setCmdList(next); }}
                  className="w-32 font-mono text-sm"
                  dir="ltr"
                />
                <Input
                  placeholder="توضیحات"
                  value={cmd.description}
                  onChange={(e) => { const next = [...cmdList]; next[i] = { ...next[i], description: e.target.value }; setCmdList(next); }}
                  className="flex-1 text-sm"
                />
                <Button variant="ghost" size="sm" className="size-8 p-0 text-red-500" onClick={() => setCmdList(cmdList.filter((_, j) => j !== i))}>
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setCmdList([...cmdList, { command: "", description: "" }])}>
              + افزودن دستور
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCmdDialogOpen(false)}>انصراف</Button>
            <Button onClick={handleSaveCommands} disabled={loading === "commands"}>
              {loading === "commands" ? <Loader2 className="ml-1 size-4 animate-spin" /> : <Check className="ml-1 size-4" />}
              ذخیره در تلگرام
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
