import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "mentorReplies" as const, label: "پاسخ منتور به سؤال", emoji: "💬" },
  { key: "tasks" as const, label: "تکالیف جدید", emoji: "📚" },
  { key: "deadlines" as const, label: "یادآوری Deadline", emoji: "⏰" },
  { key: "meetings" as const, label: "جلسات Mentoring", emoji: "📅" },
  { key: "groupNotifs" as const, label: "اعلان گروه", emoji: "👥" },
  { key: "articles" as const, label: "مقالات جدید", emoji: "📰" },
  { key: "system" as const, label: "اعلان سیستم", emoji: "📢" },
];

export default function TelegramNotifications() {
  const prefs = useQuery(api.telegramNotifications.getNotifPrefs);
  const toggleMaster = useMutation(api.telegramNotifications.toggleMaster);
  const updatePref = useMutation(api.telegramNotifications.updateCategoryPref);

  if (prefs === undefined) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!prefs || !prefs.linked) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="size-4 text-amber-500" />
            اعلان‌های Telegram
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Link2 className="size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Telegram متصل نیست</p>
              <p className="text-xs text-muted-foreground">
                برای فعال‌سازی اعلان‌ها، ابتدا حساب Telegram خود را متصل کنید.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleMasterToggle = async () => {
    try {
      const result = await toggleMaster();
      toast.success(result.enabled ? "اعلان‌های Telegram فعال شد" : "اعلان‌های Telegram غیرفعال شد");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "خطا");
    }
  };

  const handleCategoryToggle = async (category: string, enabled: boolean) => {
    try {
      await updatePref({ category: category as any, enabled });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "خطا");
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="size-4 text-sky-500" />
            اعلان‌های Telegram
          </CardTitle>
          <Badge variant={prefs.masterEnabled ? "default" : "secondary"} className="text-[10px]">
            {prefs.masterEnabled ? "فعال" : "غیرفعال"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Master toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            {prefs.masterEnabled ? (
              <Bell className="size-4 text-sky-500" />
            ) : (
              <BellOff className="size-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">فعال‌سازی اعلان‌های Telegram</span>
          </div>
          <Switch checked={prefs.masterEnabled} onCheckedChange={handleMasterToggle} />
        </div>

        {/* Category toggles */}
        {prefs.masterEnabled && (
          <div className="space-y-1">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.key}
                className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{cat.emoji}</span>
                  <span className="text-sm text-muted-foreground">{cat.label}</span>
                </div>
                <Switch
                  checked={(prefs.categories as any)[cat.key]}
                  onCheckedChange={(v) => handleCategoryToggle(cat.key, v)}
                />
              </div>
            ))}
          </div>
        )}

        {!prefs.masterEnabled && (
          <p className="text-xs text-muted-foreground text-center py-2">
            اعلان‌ها غیرفعال هستند. برای دریافت اعلان از طریق Telegram، اعلان‌ها را فعال کنید.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
