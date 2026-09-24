import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ArrowDown, ArrowUp, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InstructorRow = {
  _id: Id<"instructors">;
  name: string;
  title?: string;
  order?: number;
};

export function InstructorOrderManager() {
  const instructors = useQuery(api.admin.adminListInstructors) as InstructorRow[] | undefined;
  const updateInstructor = useMutation(api.admin.adminUpdateInstructor);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!instructors) return;
    setDrafts(Object.fromEntries(instructors.map((i) => [i._id, String(i.order ?? "")])));
  }, [instructors]);

  const setDraft = (id: string, value: string) => {
    setDrafts((current) => ({ ...current, [id]: value }));
  };

  const saveOrder = async (instructor: InstructorRow) => {
    const raw = drafts[instructor._id]?.trim();
    const order = raw === "" ? undefined : Number(raw);
    if (order !== undefined && (!Number.isFinite(order) || order < 1)) {
      toast.error("ترتیب باید عدد مثبت باشد.");
      return;
    }
    setSavingId(instructor._id);
    try {
      await updateInstructor({ id: instructor._id, order });
      toast.success(`ترتیب ${instructor.name} ذخیره شد.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ذخیره ترتیب انجام نشد.");
    } finally {
      setSavingId(null);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!instructors) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= instructors.length) return;
    const current = instructors[index];
    const target = instructors[targetIndex];
    const currentOrder = Number(drafts[current._id] ?? current.order ?? index + 1);
    const targetOrder = Number(drafts[target._id] ?? target.order ?? targetIndex + 1);
    setDrafts((state) => ({ ...state, [current._id]: String(targetOrder), [target._id]: String(currentOrder) }));
    setSavingId(current._id);
    try {
      await Promise.all([
        updateInstructor({ id: current._id, order: targetOrder }),
        updateInstructor({ id: target._id, order: currentOrder }),
      ]);
      toast.success("ترتیب مدرس‌ها جابه‌جا شد.");
    } catch (error) {
      setDrafts((state) => ({ ...state, [current._id]: String(currentOrder), [target._id]: String(targetOrder) }));
      toast.error(error instanceof Error ? error.message : "جابه‌جایی انجام نشد.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card className="mt-5 border-primary/20 bg-primary/[0.02] shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">ترتیب نمایش مدرس‌ها در صفحه اصلی</CardTitle>
        <p className="text-xs leading-5 text-muted-foreground">عدد کمترتر بالاتر نمایش داده می‌شود؛ مثلاً ۱، ۲، ۳. پس از تغییر، ترتیب جدید بلافاصله در صفحه اصلی اعمال می‌شود.</p>
      </CardHeader>
      <CardContent>
        {(!instructors || instructors.length === 0) ? (
          <p className="rounded-lg border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground">مدرسی برای تنظیم ترتیب وجود ندارد.</p>
        ) : (
          <div className="space-y-2">
            {instructors.map((instructor, index) => {
              const isSaving = savingId === instructor._id;
              return (
                <div key={instructor._id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/60 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{instructor.name}</p>
                    {instructor.title && <p className="truncate text-xs text-muted-foreground">{instructor.title}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" className="size-8" disabled={index === 0 || isSaving} onClick={() => void move(index, -1)} title="انتقال به بالا">
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="size-8" disabled={index === instructors.length - 1 || isSaving} onClick={() => void move(index, 1)} title="انتقال به پایین">
                      <ArrowDown className="size-4" />
                    </Button>
                  </div>
                  <Input
                    aria-label={`ترتیب ${instructor.name}`}
                    type="number"
                    min={1}
                    value={drafts[instructor._id] ?? ""}
                    onChange={(event) => setDraft(instructor._id, event.target.value)}
                    className={cn("h-9 w-24 text-center", isSaving && "opacity-60")}
                    placeholder="—"
                  />
                  <Button type="button" size="sm" variant="outline" className="h-9 min-w-20" disabled={isSaving} onClick={() => void saveOrder(instructor)}>
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    <span className="mr-1">ذخیره</span>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
