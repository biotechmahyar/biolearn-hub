import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function BaleAccount() {
  const status = useQuery(api.baleBot.getLinkingStatus);
  const generateCode = useMutation(api.telegramBot.generateLinkingCode);
  const unlinkBale = useMutation(api.baleBot.unlinkBale);
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

  if (status === null) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4 text-sm text-muted-foreground">
          برای مشاهده وضعیت اتصال بله وارد حساب شوید.
        </CardContent>
      </Card>
    );
  }

  const isLinked = status.linked;
  const botUsername = status.botUsername;
  const baleLink = linkingCode && botUsername
    ? `https://ble.ir/${botUsername}?start=${linkingCode}`
    : null;

  const handleConnect = async () => {
    setLoading(true);
    try {
      const result = await generateCode({});
      setLinkingCode(result.code);
      toast.success("کد اتصال ساخته شد. کد را در ربات بله ارسال کنید.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "خطا در ساخت کد اتصال");
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
      await unlinkBale({});
      setLinkingCode(null);
      setConfirmDisconnect(false);
      toast.success("اتصال بله قطع شد.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "خطا در قطع اتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageCircle className="size-4 text-emerald-600" />
          حساب بله
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLinked ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-emerald-500/5 p-3">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  متصل شده
                </p>
                <p className="text-xs text-muted-foreground">
                  {status.baleFirstName || "حساب بله"}
                  {status.baleUsername ? ` · @${status.baleUsername}` : ""}
                </p>
                {status.linkedAt ? (
                  <p className="text-[10px] text-muted-foreground">
                    تاریخ اتصال: {new Date(status.linkedAt).toLocaleDateString("fa-IR")}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10"
                onClick={handleDisconnect}
                disabled={loading}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Unlink className="size-4" />}
                {confirmDisconnect ? "تأیید قطع اتصال" : "قطع اتصال"}
              </Button>
              {confirmDisconnect ? (
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setConfirmDisconnect(false)}>
                  انصراف
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <Link2 className="size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">حساب متصل نیست</p>
                <p className="text-xs text-muted-foreground">حساب بله خود را به Genova متصل کنید</p>
              </div>
            </div>
            {!linkingCode ? (
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={handleConnect}
                disabled={loading}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
                اتصال با بله
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <p className="mb-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">کد اتصال شما:</p>
                  <p className="font-mono text-lg font-bold tracking-wider text-foreground" dir="ltr">{linkingCode}</p>
                </div>
                <ol className="space-y-1 text-xs text-muted-foreground">
                  <li>۱. ربات Genova در بله را باز کنید.</li>
                  <li>۲. روی «کد دارم» بزنید.</li>
                  <li>۳. کد بالا را ارسال کنید.</li>
                </ol>
                {baleLink ? (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(baleLink, "_blank")}>
                    <ExternalLink className="size-3.5" />
                    باز کردن ربات بله
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setLinkingCode(null)}>
                  کد جدید بساز
                </Button>
              </div>
            )}
            {!botUsername ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>نام کاربری ربات بله تنظیم نشده است؛ ابتدا ربات را در پنل مدیریت بررسی کنید.</span>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
