import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  MessageCircle,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";



export default function TelegramAccount() {
  const status = useQuery(api.telegramBot.getLinkingStatus);
  const generateCode = useMutation(api.telegramBot.generateLinkingCode);
  const unlinkTelegram = useMutation(api.telegramBot.unlinkTelegram);

  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  if (status === undefined) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isLinked = status?.linked === true;
  const botUsername = status?.botUsername ?? null;

  const handleConnect = async () => {
    setLoading(true);
    try {
      const result = await generateCode();
      setLinkingCode(result.code);
      toast.success("کد اتصال ساخته شد. کد را در تلگرام ارسال کنید.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "خطا در ساخت کد");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      return;
    }
    setLoading(true);
    try {
      await unlinkTelegram();
      setLinkingCode(null);
      setConfirmDisconnect(false);
      toast.success("اتصال Telegram قطع شد.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  };

  const telegramLink = linkingCode && botUsername
    ? `https://t.me/${botUsername}?start=${linkingCode}`
    : null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageCircle className="size-4 text-sky-500" />
          حساب Telegram
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLinked ? (
          /* ── Connected State ────────────────────────────────────────── */
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-emerald-500/5 p-3">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  متصل شده
                </p>
                <p className="text-xs text-muted-foreground">
                  {status.telegramFirstName}
                  {status.telegramUsername && (
                    <> · @{status.telegramUsername}</>
                  )}
                </p>
                {status.linkedAt && (
                  <p className="text-[10px] text-muted-foreground">
                    تاریخ اتصال: {new Date(status.linkedAt).toLocaleDateString("fa-IR")}
                  </p>
                )}
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10"
              onClick={handleDisconnect}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Unlink className="size-4" />
              )}
              {confirmDisconnect ? "تأیید قطع اتصال" : "قطع اتصال"}
            </Button>
            {confirmDisconnect && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => setConfirmDisconnect(false)}
              >
                انصراف
              </Button>
            )}
          </div>
        ) : (
          /* ── Not Connected State ──────────────────────────────────────── */
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <Link2 className="size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">حساب متصل نیست</p>
                <p className="text-xs text-muted-foreground">
                  حساب Telegram خود را به Genova متصل کنید
                </p>
              </div>
            </div>

            {!linkingCode ? (
              <Button
                size="sm"
                className="gap-1.5 bg-sky-600 text-white hover:bg-sky-700"
                onClick={handleConnect}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MessageCircle className="size-4" />
                )}
                اتصال با Telegram
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
                  <p className="mb-1 text-xs font-medium text-sky-600 dark:text-sky-400">
                    کد اتصال شما:
                  </p>
                  <p
                    className="font-mono text-lg font-bold tracking-wider text-foreground"
                    dir="ltr"
                  >
                    {linkingCode}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  مراحل اتصال:
                </p>
                <ol className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 font-bold text-sky-500">۱.</span>
                    ربات Telegram Genova را باز کنید
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 font-bold text-sky-500">۲.</span>
                    <span className="font-mono" dir="ltr">/start {linkingCode}</span>
                    {" "}را ارسال کنید
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 font-bold text-sky-500">۳.</span>
                    پیام تأیید را دریافت خواهید کرد
                  </li>
                </ol>

                {telegramLink && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => window.open(telegramLink, "_blank")}
                  >
                    <ExternalLink className="size-3.5" />
                    باز کردن ربات تلگرام
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => {
                    setLinkingCode(null);
                    setConfirmDisconnect(false);
                  }}
                >
                  کد جدید بساز
                </Button>
              </div>
            )}

            {!botUsername && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  ربات تلگرام هنوز تست نشده است. لطفاً ابتدا اتصال ربات را در پنل مدیریت بررسی کنید.
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
