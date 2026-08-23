import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PublicLayout } from "@/components/site/PublicLayout";
import { api } from "@/convex/_generated/api";
import { faNum } from "@/lib/format";
import { useQuery } from "convex/react";
import { BookOpen, Microscope, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-3">
      <p className="text-xs font-bold text-primary">{label}</p>
      <p className="mt-1 text-sm leading-6">{value}</p>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-3">
      <p className="text-xs font-bold text-primary">{label}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-6">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dictionary() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const terms = useQuery(api.content.searchDictionary, { query: query || undefined });

  useEffect(() => {
    if (terms && terms.length > 0 && !selected) {
      setSelected(terms[0]._id);
    }
    if (terms && terms.length > 0 && selected && !terms.some((t) => t._id === selected)) {
      setSelected(terms[0]._id);
    }
  }, [terms, selected]);

  const active = terms?.find((t) => t._id === selected);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">دیکشنری تخصصی</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            باکتری‌ها و اصطلاحات علوم زیستی
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[15px]">
            نام یک باکتری یا اصطلاح را جستجو کن؛ گرم، شکل، نیاز اکسیژن، بیماری‌ها،
            عوامل ویرولانس، تشخیص، نکات امتحانی و منابع را یک‌جا ببین.
          </p>
        </div>

        <div className="relative mt-8 max-w-xl">
          <Search className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="جستجو: E. coli، استافیلوکوک، PCR، پلاسمید..."
            className="h-12 pr-10 text-sm"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Results */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {terms ? `${faNum(terms.length)} نتیجه` : "..."}
            </p>
            {(terms ?? []).map((t) => (
              <button
                key={t._id}
                type="button"
                onClick={() => setSelected(t._id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-right transition-all",
                  active?._id === t._id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border/70 bg-card/60 hover:border-primary/30",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Microscope className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold">{t.term}</span>
                  <span className="block text-xs text-muted-foreground">{t.fullName}</span>
                </span>
              </button>
            ))}
            {terms && terms.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
                نتیجه‌ای پیدا نشد. املای لاتین یا فارسی را امتحان کن.
              </div>
            )}
          </div>

          {/* Detail */}
          <div>
            {active ? (
              <div className="rounded-3xl border border-border/70 bg-card/60 p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-extrabold" dir="ltr">{active.term}</h2>
                  <Badge variant="secondary" className="rounded-full">{active.gramStatus}</Badge>
                  <Badge variant="outline" className="rounded-full">{active.shape}</Badge>
                </div>
                <p className="mt-2 text-sm font-medium text-muted-foreground">{active.fullName}</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Field label="گرم (Gram)" value={active.gramStatus} />
                  <Field label="شکل" value={active.shape} />
                  <Field label="نیاز به اکسیژن" value={active.oxygen} />
                  <Field label="محل زندگی (Habitat)" value={active.habitat} />
                </div>

                <div className="mt-4 space-y-3">
                  <ListField label="بیماری‌ها" items={active.diseases} />
                  <ListField label="عوامل ویرولانس" items={active.virulence} />
                  <Field label="روش تشخیص" value={active.diagnosis} />
                  <ListField label="ویژگی‌های مهم" items={active.characteristics} />
                  <ListField label="نکات امتحانی" items={active.examNotes} />
                  <ListField label="منابع" items={active.sources} />
                </div>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/30 text-center">
                <BookOpen className="size-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  یک اصطلاح را انتخاب کن تا جزئیاتش نمایش داده شود.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
