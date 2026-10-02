/**
 * Genova Virtual Lab — fly brain snapshot
 * ─────────────────────────────────────────────────────────────────────────────
 * Connects a virtual fly to its *real* Virtual Fly Brain entity. Nothing is
 * mirrored and nothing is recomputed: when the student asks for a snapshot we
 * read `get_term_info` (and one level of hierarchy) live, show what came back,
 * and always display the VFB id, the source and the access time.
 *
 * The request is lazy — it only happens when the student presses the button, so
 * opening a fly never triggers a VFB round-trip on its own.
 */
import { useCallback, useRef, useState } from "react";
import { ArrowLeft, Brain, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { faNum, formatJalaliDate } from "@/lib/format";
import { isAbortError, vfbErrorMessage } from "@/services/vfb/client";
import { getVFBHierarchy, getVFBTermInfo } from "@/services/vfb/queries";
import { VFB_SOURCE } from "@/services/vfb/types";
import type { VFBHierarchy, VFBTermInfo } from "@/services/vfb/types";
import { DataKindBadge } from "./dataKind";
import type { FlyRow } from "./types";

interface Snapshot {
  info: VFBTermInfo;
  hierarchy: VFBHierarchy | null;
  accessedAt: number;
}

export function FlyBrainSnapshot({
  fly,
  onOpenBrain,
}: {
  fly: FlyRow;
  onOpenBrain: (term: { id: string; label: string }) => void;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  // One in-flight request at a time; a new load aborts the previous one.
  const abortRef = useRef<AbortController | null>(null);

  const vfbId = fly.brainModel?.vfbId ?? "";

  const load = useCallback(() => {
    if (!vfbId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;
    setStatus("loading");
    getVFBTermInfo({ id: vfbId, signal })
      .then((info) => {
        if (!info.found) {
          setError("No VFB data available for this entity.");
          setStatus("error");
          return null;
        }
        // Hierarchy is secondary: a failure there must not sink the snapshot.
        return getVFBHierarchy({ id: vfbId, maxDepth: 1, signal })
          .then((hierarchy) => ({ info, hierarchy }))
          .catch(() => ({ info, hierarchy: null }));
      })
      .then((result) => {
        if (!result) return;
        setSnapshot({ ...result, accessedAt: Date.now() });
        setError("");
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        setError(vfbErrorMessage(err));
        setStatus("error");
      });
  }, [vfbId]);

  // Reset when the fly changes, so a stale snapshot is never shown for a new fly.
  const [seenFly, setSeenFly] = useState(vfbId);
  if (seenFly !== vfbId) {
    setSeenFly(vfbId);
    setSnapshot(null);
    setStatus("idle");
    setError("");
  }

  // Intentionally no auto-load effect: opening a fly must not fire a VFB
  // request on its own. The student presses "تازه‌سازی" when they want it.

  if (!fly.brainModel) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
          <Brain className="size-3.5 text-emerald-600" />
          وضعیت زندهٔ مغز
        </p>
        <DataKindBadge kind="real" />
      </div>

      <div className="rounded-xl border border-emerald-900/5 bg-white px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-bold text-slate-800">{fly.brainModel.label}</span>
            <span dir="ltr" className="mt-0.5 block text-left font-mono text-[10.5px] text-slate-500">
              {fly.brainModel.vfbId}
            </span>
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={load}
              className="h-8 gap-1 rounded-lg border-emerald-900/10 bg-white text-[11px] text-slate-700 hover:border-emerald-300"
            >
              {status === "loading" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              تازه‌سازی
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenBrain({ id: fly.brainModel!.vfbId, label: fly.brainModel!.label })}
              className="h-8 gap-1 rounded-lg bg-emerald-700 px-2.5 text-[11px] text-white hover:bg-emerald-800"
            >
              اکسپلورر کامل
              <ArrowLeft className="size-3.5" />
            </Button>
          </div>
        </div>

        {status === "idle" && (
          <p className="mt-2 text-[10.5px] text-slate-500">
            برای خواندن اطلاعات ترم از VFB، دکمهٔ «تازه‌سازی» را بزنید. تا آن زمان هیچ درخواستی ارسال نمی‌شود.
          </p>
        )}

        {status === "loading" && (
          <p className="mt-2 flex items-center gap-2 text-[10.5px] text-slate-500">
            <Loader2 className="size-3.5 animate-spin text-emerald-600" />
            در حال خواندن از {VFB_SOURCE.name}…
          </p>
        )}

        {status === "error" && (
          <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-2">
            <p className="text-[11px] text-rose-700">{error}</p>
            <p dir="ltr" className="mt-0.5 text-[10px] text-rose-500">
              Virtual Fly Brain is temporarily unavailable. Please try again.
            </p>
          </div>
        )}

        {status === "ready" && snapshot && (
          <div className="mt-2 space-y-1.5">
            <dl className="grid grid-cols-2 gap-1.5">
              <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                <dt className="text-[10px] text-slate-500">مترادف‌ها</dt>
                <dd className="text-[11.5px] font-semibold text-slate-700">
                  {faNum(snapshot.info.synonyms.length)}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                <dt className="text-[10px] text-slate-500">پرس‌وجوهای نام‌دار</dt>
                <dd className="text-[11.5px] font-semibold text-slate-700">
                  {faNum(snapshot.info.namedQueries.length)}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                <dt className="text-[10px] text-slate-500">والیان‌ها</dt>
                <dd className="text-[11.5px] font-semibold text-slate-700">
                  {faNum(snapshot.hierarchy?.ancestors.length ?? 0)}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                <dt className="text-[10px] text-slate-500">زیرمجموعه‌ها</dt>
                <dd className="text-[11.5px] font-semibold text-slate-700">
                  {faNum(snapshot.hierarchy?.descendants.length ?? 0)}
                </dd>
              </div>
            </dl>
            {snapshot.info.types && (
              <p className="text-[10.5px] text-slate-600">Types: {snapshot.info.types}</p>
            )}
            <p className="text-[10px] leading-5 text-slate-500">
              Source: {VFB_SOURCE.name} · VFB ID:{" "}
              <span dir="ltr" className="font-mono">{snapshot.info.id}</span> · Accessed:{" "}
              {formatJalaliDate(snapshot.accessedAt)}
            </p>
            <p className="text-[10px] leading-5 text-slate-500">
              لنگرگاه ذخیره‌شده در پروفایل مگس: {formatJalaliDate(fly.brainModel.accessedAt)} — داده‌های بالا در همین
              لحظه خوانده شده‌اند.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlyBrainSnapshot;
