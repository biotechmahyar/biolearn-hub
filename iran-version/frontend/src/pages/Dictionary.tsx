import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { Search } from "lucide-react";

export default function Dictionary() {
  const [query, setQuery] = useState("");
  const terms = useApi<any[]>(`/api/content/dictionary?q=${encodeURIComponent(query)}`);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-primary">دیکشنری تخصصی</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">فرهنگ علوم زیستی</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          جستجوی اصطلاحات تخصصی میکروبیولوژی و بیوتکنولوژی.
        </p>
      </div>

      {/* Search */}
      <div className="relative mt-8">
        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="جستجوی اصطلاح..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Results */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {(terms ?? []).map((term: any) => (
          <div
            key={term._id}
            className="rounded-2xl border border-border/70 bg-card p-5"
          >
            <h3 className="font-extrabold">{term.term}</h3>
            <p className="mt-1 text-xs text-primary">{term.fullName}</p>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p><span className="font-medium">وضعیت گرم:</span> {term.gramStatus}</p>
              <p><span className="font-medium">شکل:</span> {term.shape}</p>
              <p><span className="fontien:</span> {term.oxygen}</p>
              <p><span className="font-medium">زیستگاه:</span> {term.habitat}</p>
            </div>
            {term.diseases && term.diseases.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium">بیماری‌ها:</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {term.diseases.map((d: string) => (
                    <span key={d} className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] text-red-700">{d}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {terms && terms.length === 0 && query && (
        <p className="mt-10 text-center text-sm text-muted-foreground">اصطلاحی یافت نشد.</p>
      )}
    </div>
  );
}
