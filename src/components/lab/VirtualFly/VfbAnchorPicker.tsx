/**
 * Genova Virtual Lab — Virtual Fly ⇄ Virtual Fly Brain anchor picker
 * ─────────────────────────────────────────────────────────────────────────────
 * A virtual fly is only as meaningful as the real anatomy it points at, so the
 * student picks an anchor by searching **Virtual Fly Brain** itself. Nothing is
 * typed by hand and nothing is invented: the identifier and the label stored on
 * the fly are exactly what the VFBquery `/search` response returned.
 *
 * The component is intentionally lazy — no request is made until the student
 * submits a query, and switching to a different fly never re-fetches on its own.
 */
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearVFBCache, isAbortError, vfbErrorMessage } from "@/services/vfb/client";
import { searchVFB } from "@/services/vfb/queries";
import type { VFBEntitySummary } from "@/services/vfb/types";
import { VFB_SOURCE } from "@/services/vfb/types";
import { cn } from "@/lib/utils";
import { DataKindBadge } from "./dataKind";

export interface VfbAnchor {
  vfbId: string;
  label: string;
  entityType?: string;
}

const PRESETS = ["medulla", "central brain", "mushroom body", "giant fiber neuron"];

const FRAME =
  "rounded-xl border border-emerald-900/5 bg-white shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)]";

interface VfbAnchorPickerProps {
  value: VfbAnchor | null;
  onChange: (anchor: VfbAnchor | null) => void;
  idPrefix: string;
}

export function VfbAnchorPicker({ value, onChange, idPrefix }: VfbAnchorPickerProps) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [rows, setRows] = useState<VFBEntitySummary[]>([]);
  const [resolvedFor, setResolvedFor] = useState<string | null>(null);
  const [error, setError] = useState("");

  // The status is derived from which query has already answered, so the effect
  // never has to push state synchronously (no cascading render, no stale flash).
  const status: "idle" | "loading" | "ready" | "error" =
    submitted === null
      ? "idle"
      : resolvedFor !== submitted
        ? "loading"
        : error
          ? "error"
          : "ready";

  useEffect(() => {
    if (submitted === null) return;
    const controller = new AbortController();
    let cancelled = false;
    searchVFB({ query: submitted, limit: 6, signal: controller.signal }).then(
      (data) => {
        if (cancelled) return;
        setRows(data.rows);
        setError("");
        setResolvedFor(submitted);
      },
      (err: unknown) => {
        if (cancelled || isAbortError(err)) return;
        setRows([]);
        setError(vfbErrorMessage(err));
        setResolvedFor(submitted);
      },
    );
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [submitted]);

  const submit = useCallback((raw: string) => {
    const q = raw.trim();
    if (!q) return;
    clearVFBCache();
    setSubmitted(q);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-slate-600">لنگرگاه مغزی (از Virtual Fly Brain)</p>
        <DataKindBadge kind="real" />
      </div>

      {value ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-bold text-slate-800">{value.label}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span dir="ltr" className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                {value.vfbId}
              </span>
              {value.entityType && <span className="text-[10px] text-slate-500">{value.entityType}</span>}
              <span className="text-[10px] text-slate-500">· {VFB_SOURCE.name}</span>
            </span>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-rose-600"
            title="حذف لنگرگاه"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-emerald-900/10 bg-emerald-50/40 px-3 py-2 text-[11px] text-slate-500">
          بدون لنگرگاه هم می‌توانید مگس را بسازید؛ در آن حالت هیچ دادهٔ اعصابی به آن نسبت داده نمی‌شود.
        </p>
      )}

      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            id={`${idPrefix}-vfb-anchor`}
            dir="ltr"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="medulla"
            className="h-9 pr-8 text-left text-[12px]"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          className="h-9 shrink-0 gap-1 rounded-lg bg-emerald-700 px-3 text-[11.5px] text-white hover:bg-emerald-800"
        >
          {status === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
          یافتن
        </Button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            dir="ltr"
            onClick={() => {
              setQuery(p);
              submit(p);
            }}
            className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
          >
            {p}
          </button>
        ))}
        {submitted && (
          <button
            type="button"
            onClick={() => submit(submitted)}
            className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-500 ring-1 ring-emerald-900/10 hover:text-emerald-700"
          >
            <RefreshCw className={cn(status === "loading" && "animate-spin")} />
            تازه‌سازی
          </button>
        )}
      </div>

      {status === "error" && (
        <p className="rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-2 text-[11px] text-rose-700">
          {error}
          <span dir="ltr" className="mt-1 block text-[10px] text-rose-500">
            Virtual Fly Brain is temporarily unavailable. Please try again.
          </span>
        </p>
      )}

      {status === "ready" && rows.length === 0 && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          No matching VFB entities found.
        </p>
      )}

      {status === "ready" && rows.length > 0 && (
        <ul className={cn("space-y-1 p-1.5", FRAME, "max-h-64 overflow-y-auto")}>
          {rows.map((row) => {
            const chosen = value?.vfbId === row.id;
            return (
              <li key={`${row.id}-${row.rawLabel}`}>
                <button
                  type="button"
                  disabled={!row.id}
                  onClick={() =>
                    onChange({
                      vfbId: row.id,
                      label: row.label,
                      ...(row.entityType ? { entityType: row.entityType } : {}),
                    })
                  }
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-right transition-colors disabled:cursor-default disabled:opacity-60",
                    chosen ? "bg-emerald-50 ring-1 ring-emerald-300" : "hover:bg-slate-50",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold text-slate-800">{row.label}</span>
                    <span dir="ltr" className="mt-0.5 block font-mono text-[10px] text-slate-500">
                      {row.id || "—"}
                    </span>
                  </span>
                  {row.entityType && (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9.5px] text-emerald-700">
                      {row.entityType}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
