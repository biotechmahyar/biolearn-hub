import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ExternalLink,
  Globe,
  Key,
  ListChecks,
  Loader2,
  MessageCircle,
  Power,
  PowerOff,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Unlink,
  Webhook,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BaleBotPanel() {
  const navigate = useNavigate();
  const botConfig = useQuery(api.baleBot.getBotConfig);
  const saveToken = useMutation(api.baleBot.saveBotToken);
  const deleteToken = useMutation(api.baleBot.deleteBotToken);
  const toggleActive = useMutation(api.baleBot.toggleBotActive);
  const updateStartMessage = useMutation(api.baleBot.updateStartMessage);
  const testConnection = useAction(api.baleBotActions.testConnection);
  const setupWebhook = useAction(api.baleBotActions.setWebhook);
  const syncCommands = useAction(api.baleBotActions.syncCommands);
  const getWebhookInfo = useAction(api.baleBotActions.getWebhookInfo);
  const removeWebhook = useAction(api.baleBotActions.deleteWebhook);

  const [tokenInput, setTokenInput] = useState("");
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [editingWelcome, setEditingWelcome] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<{
    url: string | null;
    pendingUpdateCount: number | null;
    lastErrorMessage: string | null;
  } | null>(null);

  useEffect(() => {
    if (botConfig?.startMessage) setWelcomeMessage(botConfig.startMessage);
  }, [botConfig?.startMessage]);

  const run = async (key: string, task: () => Promise<void>) => {
    setLoading(key);
    try {
      await task();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "خطا در انجام عملیات");
    } finally {
      setLoading(null);
    }
  };

  const handleSaveToken = () =>
    run("save", async () => {
      if (!tokenInput.trim()) return;
      await saveToken({ token: tokenInput.trim() });
      setTokenInput("");
      setTokenDialogOpen(false);
      toast.success("توکن بات بله ذخیره شد. حالا اتصال را تست کنید.");
    });

  const handleTest = () =>
    run("test", async () => {
      const result = await testConnection({});
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`اتصال برقرار شد: ${result.botName ?? "ربات بله"}`);
    });

  const handleToggle = () =>
    run("toggle", async () => {
      const result = await toggleActive({});
      toast.success(result.active ? "بات بله فعال شد." : "بات بله غیرفعال شد.");
    });

  const handleSaveWelcome = () =>
    run("welcome", async () => {
      await updateStartMessage({ message: welcomeMessage });
      setEditingWelcome(false);
      toast.success("پیام خوش‌آمدگویی ذخیره شد.");
    });

  const handleSetupWebhook = () =>
    run("setup-webhook", async () => {
      const result = await setupWebhook({});
      if (!result.success) {
        toast.error(result.error ?? "خطا در راه‌اندازی وب‌هوک");
        return;
      }
      toast.success("وب‌هوک بله با موفقیت تنظیم شد.");
    });

  const handleSyncCommands = () =>
    run("sync-commands", async () => {
      const result = await syncCommands({});
      if (!result.success) {
        toast.error(result.error ?? "خطا در همگام‌سازی دستورهای بله");
        return;
      }
      toast.success("منوی دستورهای بله همگام‌سازی شد.");
    });

  const handleRefreshWebhook = () =>
    run("webhook-info", async () => {
      const result = await getWebhookInfo({});
      if (!result.success) {
        toast.error(result.error ?? "خطا در دریافت وضعیت وب‌هوک");
        return;
      }
      setWebhookInfo({
        url: result.url,
        pendingUpdateCount: result.pendingUpdateCount,
        lastErrorMessage: result.lastErrorMessage,
      });
    });

  const handleRemoveWebhook = () =>
    run("remove-webhook", async () => {
      const result = await removeWebhook({});
      if (!result.success) {
        toast.error(result.error ?? "خطا در حذف وب‌هوک");
        return;
      }
      setWebhookInfo(null);
      toast.success("وب‌هوک بله حذف شد.");
    });

  const handleDeleteToken = () =>
    run("delete", async () => {
      await deleteToken({});
      toast.success("توکن و تنظیمات بات بله حذف شد.");
    });

  if (botConfig === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-emerald-600" />
          در حال دریافت تنظیمات ربات بله…
        </div>
      </div>
    );
  }

  const hasToken = !!botConfig?.hasToken;
  const isConnected = !!botConfig?.connected;
  const isActive = !!botConfig?.active;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-emerald-500/5 p-4 sm:p-6" dir="rtl">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-600/20">
              <MessageCircle className="size-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black">بات بله</h1>
                <Badge variant="outline" className="border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Genova Messenger
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">مدیریت اتصال، وب‌هوک و پیام‌های ربات بله</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowRight className="size-4" />
            بازگشت به پنل
          </Button>
        </header>

        <Card className="overflow-hidden border-border/60 shadow-sm">
          <div className={cn(
            "h-1.5 w-full",
            isConnected ? "bg-gradient-to-l from-emerald-500 to-teal-400" : isActive ? "bg-gradient-to-l from-amber-500 to-orange-400" : "bg-slate-300",
          )} />
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <span className={cn(
                  "flex size-14 shrink-0 items-center justify-center rounded-2xl",
                  isConnected ? "bg-emerald-500/10 text-emerald-600" : isActive ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground",
                )}>
                  {isConnected ? <Wifi className="size-7" /> : isActive ? <WifiOff className="size-7" /> : <Bot className="size-7" />}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold">{botConfig?.botName || "بات بله تنظیم نشده"}</h2>
                    {botConfig?.botUsername && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" dir="ltr">
                        @{botConfig.botUsername}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {!hasToken
                      ? "توکن ربات را وارد کنید تا اتصال آغاز شود."
                      : isConnected
                        ? "ربات متصل است و آماده دریافت پیام و وب‌هوک است."
                        : isActive
                          ? "ربات فعال است، اما اتصال API هنوز تأیید نشده."
                          : "ربات غیرفعال است؛ در صورت نیاز آن را فعال کنید."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!hasToken && (
                  <Button onClick={() => setTokenDialogOpen(true)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                    <Key className="size-4" />
                    اتصال بات
                  </Button>
                )}
                {hasToken && !isConnected && (
                  <Button onClick={handleTest} disabled={loading === "test"} className="bg-emerald-600 text-white hover:bg-emerald-700">
                    {loading === "test" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    تست اتصال
                  </Button>
                )}
                {isConnected && botConfig?.botUsername && (
                  <Button variant="outline" onClick={() => window.open(`https://ble.ir/${botConfig.botUsername}`, "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="size-4" />
                    باز کردن ربات
                  </Button>
                )}
                {hasToken && (
                  <Button
                    variant="outline"
                    onClick={handleToggle}
                    disabled={loading === "toggle"}
                    className={cn(
                      isActive
                        ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                        : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10",
                    )}
                  >
                    {loading === "toggle" ? <Loader2 className="size-4 animate-spin" /> : isActive ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                    {isActive ? "غیرفعال کردن" : "فعال کردن"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {botConfig?.lastTestResult && botConfig.lastTestedAt && (
          <Card className={cn(
            "border",
            botConfig.lastTestResult === "success"
              ? "border-emerald-500/25 bg-emerald-500/5"
              : botConfig.lastTestResult === "disconnected"
                ? "border-amber-500/25 bg-amber-500/5"
                : "border-red-500/25 bg-red-500/5",
          )}>
            <CardContent className="flex items-center gap-3 p-4">
              {botConfig.lastTestResult === "success" ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
              ) : botConfig.lastTestResult === "disconnected" ? (
                <AlertTriangle className="size-5 shrink-0 text-amber-500" />
              ) : (
                <XCircle className="size-5 shrink-0 text-red-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {botConfig.lastTestResult === "success" ? "آخرین اتصال موفق بوده" : `نتیجه: ${botConfig.lastTestResult}`}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{new Date(botConfig.lastTestedAt).toLocaleString("fa-IR")}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Send className="size-4 text-emerald-600" />
                  پیام خوش‌آمدگویی
                </CardTitle>
                {hasToken && !editingWelcome && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingWelcome(true)}>ویرایش</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingWelcome ? (
                <div className="space-y-3">
                  <Textarea value={welcomeMessage} onChange={(event) => setWelcomeMessage(event.target.value)} rows={7} dir="rtl" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveWelcome} disabled={loading === "welcome"}>
                      {loading === "welcome" ? <Loader2 className="ml-1 size-3.5 animate-spin" /> : <Check className="ml-1 size-3.5" />}
                      ذخیره پیام
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingWelcome(false); setWelcomeMessage(botConfig?.startMessage || ""); }}>
                      انصراف
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="min-h-32 whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/35 p-4 text-sm leading-7 text-muted-foreground">
                  {welcomeMessage || "پیامی تنظیم نشده است."}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Webhook className="size-4 text-teal-600" />
                وب‌هوک بله
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={cn(
                "flex items-center gap-2 rounded-xl border p-3 text-xs",
                botConfig?.webhookUrl
                  ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-300",
              )}>
                <Globe className="size-4 shrink-0" />
                <span className="truncate font-mono" dir="ltr">{botConfig?.webhookUrl || "وب‌هوک تنظیم نشده است"}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleSetupWebhook} disabled={loading === "setup-webhook" || !hasToken}>
                  {loading === "setup-webhook" ? <Loader2 className="size-4 animate-spin" /> : <Webhook className="size-4" />}
                  راه‌اندازی خودکار
                </Button>
                <Button size="sm" variant="outline" onClick={handleSyncCommands} disabled={loading === "sync-commands" || !hasToken}>
                  {loading === "sync-commands" ? <Loader2 className="size-4 animate-spin" /> : <ListChecks className="size-4" />}
                  همگام‌سازی دستورها
                </Button>
                <Button size="sm" variant="outline" onClick={handleRefreshWebhook} disabled={loading === "webhook-info" || !hasToken}>
                  {loading === "webhook-info" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  بررسی وضعیت
                </Button>
                {botConfig?.webhookUrl && (
                  <Button size="sm" variant="ghost" onClick={handleRemoveWebhook} disabled={loading === "remove-webhook"} className="text-red-500 hover:text-red-600">
                    {loading === "remove-webhook" ? <Loader2 className="size-4 animate-spin" /> : <Unlink className="size-4" />}
                    حذف وب‌هوک
                  </Button>
                )}
              </div>
              {webhookInfo && (
                <div className="grid gap-2 rounded-xl bg-muted/40 p-3 text-xs sm:grid-cols-2">
                  <div className="flex justify-between gap-2 sm:block">
                    <span className="text-muted-foreground">آدرس وب‌هوک</span>
                    <span className="block truncate font-mono" dir="ltr">{webhookInfo.url || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2 sm:block">
                    <span className="text-muted-foreground">پیام‌های در انتظار</span>
                    <span className="block font-mono">{webhookInfo.pendingUpdateCount ?? "—"}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {isConnected && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Settings className="size-4 text-muted-foreground" />
                اطلاعات ربات
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Info label="شناسه ربات" value={botConfig?.botId || "—"} mono />
              <Info label="نام نمایشی" value={botConfig?.botName || "—"} />
              <Info label="نام کاربری" value={botConfig?.botUsername ? `@${botConfig.botUsername}` : "—"} mono />
            </CardContent>
          </Card>
        )}

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-bold">تنظیم امن توکن</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                می‌توانید توکن را از همین پنل ذخیره کنید یا متغیر محیطی <code className="font-mono" dir="ltr">BALE_BOT_TOKEN</code> را در بخش کلیدهای پروژه تنظیم کنید. توکن هرگز به مرورگر برگردانده نمی‌شود.
              </p>
            </div>
          </CardContent>
        </Card>

        {hasToken && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <Trash2 className="size-4" />
                حذف توکن
              </CardTitle>
              <CardDescription className="text-xs">با حذف توکن، تمام تنظیمات ربات بله نیز پاک می‌شود.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" onClick={handleDeleteToken} disabled={loading === "delete"} className="border-red-500/30 text-red-500 hover:bg-red-500/10">
                {loading === "delete" ? <Loader2 className="ml-1 size-3.5 animate-spin" /> : <Trash2 className="ml-1 size-3.5" />}
                حذف توکن و تنظیمات
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {tokenDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-lg border-border/70 shadow-2xl">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Key className="size-5 text-emerald-600" />
                    اتصال ربات بله
                  </CardTitle>
                  <CardDescription className="mt-2 leading-6">توکن دریافتی از پنل ربات‌ساز بله را وارد کنید. توکن فقط در سمت سرور ذخیره می‌شود.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setTokenDialogOpen(false)} aria-label="بستن">
                  <XCircle className="size-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="توکن ربات بله"
                dir="ltr"
                autoComplete="off"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setTokenDialogOpen(false)}>انصراف</Button>
                <Button onClick={handleSaveToken} disabled={loading === "save" || !tokenInput.trim()} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {loading === "save" && <Loader2 className="ml-1 size-4 animate-spin" />}
                  ذخیره و اتصال
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/35 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-sm font-semibold", mono && "font-mono")} dir={mono ? "ltr" : "rtl"}>{value}</p>
    </div>
  );
}
