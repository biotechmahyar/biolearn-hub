import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";

// Lets the user pick an existing category OR create and select a new one on
// the spot, so content creators are never stuck with only the seeded choices.
export function CategoryField({
  value,
  onValueChange,
  className,
  allValue,
  allLabel,
  placeholder,
}: {
  value?: string;
  onValueChange: (id: string) => void;
  className?: string;
  // Optional "all" choice (e.g. exams can pull questions from all topics).
  allValue?: string;
  allLabel?: string;
  placeholder?: string;
}) {
  const categories = useQuery(api.content.listCategories) ?? [];
  const create = useMutation(api.content.createCategory);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleCreate = async () => {
    setErr(null);
    if (!name.trim()) {
      setErr("نام دسته را بنویسید.");
      return;
    }
    setBusy(true);
    try {
      const id = await create({ name });
      onValueChange(id);
      setName("");
      setAdding(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا در ساخت دسته");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      {adding ? (
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="نام دستهٔ جدید…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreate();
              }
            }}
            className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500 dark:border-white/10 dark:bg-white/5"
          />
          <Button
            size="icon"
            onClick={() => void handleCreate()}
            disabled={busy}
            className="shrink-0"
            title="ساخت دسته"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Select value={value || undefined} onValueChange={onValueChange}>
            <SelectTrigger className="flex-1 border-white/10 bg-white/5 text-slate-100">
              <SelectValue placeholder={placeholder ?? "انتخاب دسته…"} />
            </SelectTrigger>
            <SelectContent>
              {allValue !== undefined && (
                <SelectItem value={allValue}>{allLabel ?? "همه"}</SelectItem>
              )}
              {categories.map((c) => (
                <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
              ))}
              {categories.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">دسته‌ای هنوز تعریف نشده.</div>
              )}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            title="افزودن دستهٔ جدید"
            onClick={() => {
              setAdding(true);
              setErr(null);
            }}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}
