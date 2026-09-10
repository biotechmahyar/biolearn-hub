import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Calendar, Users, Edit2 } from "lucide-react";
import { toast } from "sonner";

export function WorkshopsView() {
  const workshops = useQuery(api.admin.instructorListWorkshops) ?? [];
  const updateWorkshopUrl = useMutation(api.admin.instructorUpdateWorkshopUrl);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState("");

  async function handleSaveUrl() {
    if (!editingId) return;
    try {
      await updateWorkshopUrl({ id: editingId as any, platformUrl: urlValue.trim() || undefined });
      toast.success("لینک کارگاه ذخیره شد.");
      setEditingId(null);
      setUrlValue("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ذخیره");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">کارگاه‌های من</h2>
        <p className="mt-1 text-sm text-slate-400">مدیریت کارگاه‌ها و لینک برگزاری خارجی.</p>
      </div>

      {workshops.length === 0 ? (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Calendar className="size-8 text-slate-600" />
            <p className="text-sm text-slate-400">هنوز کارگاهی ثبت نشده است.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workshops.map((w: any) => (
            <Card key={w._id} className="border-white/5 bg-white/[0.02]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white">{w.title}</h3>
                    <p className="mt-1 text-xs text-slate-400">{w.topic}</p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {w.date} · {w.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {w.registeredCount}/{w.capacity}
                      </span>
                    </div>
                    {w.platformUrl && (
                      <button
                        onClick={() => window.open(w.platformUrl!, "_blank", "noopener,noreferrer")}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-cyan-500/15 px-2.5 py-1 text-[11px] font-medium text-cyan-300 transition-colors hover:bg-cyan-500/25"
                      >
                        <ExternalLink className="size-3" />
                        برگزاری در پلتفرم خارجی ↗
                      </button>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-slate-400 hover:text-white"
                    onClick={() => {
                      setEditingId(w._id);
                      setUrlValue(w.platformUrl || "");
                    }}
                  >
                    <Edit2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingId && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm text-white">تنظیم لینک برگزاری</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://zoom.us/... یا Google Meet"
              className="h-8 text-xs"
              dir="ltr"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveUrl} className="text-xs">ذخیره</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-xs">لغو</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
