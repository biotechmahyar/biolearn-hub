/**
 * Genova Virtual Lab — "Virtual Fly Brain"
 * ─────────────────────────────────────────────────────────────────────────────
 * Drosophila melanogaster Neurobiology Explorer, backed by the official
 * read-only VFBquery API (https://v3-cached.virtualflybrain.org/).
 *
 * Scientific rules that this component enforces on purpose:
 *   • every scientific value shown here comes from a VFB response; nothing is
 *     inferred, rounded into existence, or filled in as a placeholder;
 *   • a connectivity edge is always presented as *evidence reported by VFB for
 *     a particular reconstruction/connectome*, never as a biological fact;
 *   • images are linked from their VFB source URL, never mirrored, and their
 *     dataset / license strings are shown exactly as returned;
 *   • every view carries the "Data source: Virtual Fly Brain" attribution.
 *
 * Performance: the expensive endpoints (hierarchy, images, connectivity,
 * cross-references, datasets) are fetched only when their tab is opened.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Brain,
  Database,
  Dna,
  ExternalLink,
  Image as ImageIcon,
  Info,
  Layers,
  Link2,
  Loader2,
  Microscope,
  Network,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearVFBCache, isAbortError, vfbErrorMessage } from "@/services/vfb/client";
import {
  getVFBConnectivity,
  getVFBConnectomeDatasets,
  getVFBHierarchy,
  getVFBImages,
  getVFBTermInfo,
  getVFBXrefs,
  resolveVFBEntity,
  runVFBQuery,
  searchVFB,
} from "@/services/vfb/queries";
import type {
  VFBConnectivity,
  VFBConnectomeDataset,
  VFBCrossRef,
  VFBEntitySummary,
  VFBHierarchy,
  VFBImage,
  VFBQueryColumn,
  VFBQueryResult,
  VFBResolveResult,
  VFBTermInfo,
} from "@/services/vfb/types";
import { VFB_SOURCE } from "@/services/vfb/types";
import { cn } from "@/lib/utils";

// ── Constants & helpers ──────────────────────────────────────────────────────

const PAGE_SIZE = 20;

/** Named query VFB offers for images; the response never renames it. */
const IMAGE_QUERY = "ListAllAvailableImages";

/** Facet / tag values that mean "VFB has single-cell data attached". */
const SCRNA_MARKERS = ["hasscrnaseq", "scrna", "snrna", "sc-rna", "singlecell"];

const COPY = {
  unavailable: "Virtual Fly Brain is temporarily unavailable. Please try again.",
  noResults: "No matching VFB entities found.",
  noConnectivity: "No connectivity data is currently available for this entity.",
  noImages: "No registered images are available for this entity.",
  noData: "No VFB data available for this entity.",
} as const;

const FRAME =
  "rounded-2xl border border-emerald-900/5 bg-white shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)]";

type Status = "idle" | "loading" | "ready" | "error";

interface Resource<T> {
  status: Status;
  data: T | null;
  error: string;
  reload: () => void;
}

/**
 * Lazy loader: nothing runs until `enabled` is true (i.e. the user opened the
 * tab). The loading state is *derived* from the absence of data rather than
 * being pushed by an effect, which keeps the request strictly one-shot per key.
 */
function useLazyResource<T>(
  enabled: boolean,
  loader: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let cancelled = false;
    loader(controller.signal).then(
      (value) => {
        if (cancelled) return;
        setData(value);
        setError("");
      },
      (err: unknown) => {
        if (cancelled || isAbortError(err)) return;
        setData(null);
        setError(vfbErrorMessage(err));
      },
    );
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);

  const reload = useCallback(() => {
    setData(null);
    setError("");
    setNonce((n) => n + 1);
  }, []);

  const status: Status = !enabled ? "idle" : error ? "error" : data ? "ready" : "loading";
  return { status, data, error, reload };
}

// ── Small presentational pieces ──────────────────────────────────────────────

function VfbSpinner({ label = "در حال دریافت از Virtual Fly Brain…" }: { label?: string }) {
  return (
    <p className="flex items-center justify-center gap-2 py-8 text-[12px] text-slate-500">
      <Loader2 className="size-4 animate-spin text-emerald-600" />
      {label}
    </p>
  );
}

function VfbEmpty({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-emerald-900/10 bg-emerald-50/40 px-4 py-6 text-center">
      <p className="text-[12.5px] font-semibold text-slate-700">{primary}</p>
      {secondary && <p className="mt-1 text-[11px] text-slate-500">{secondary}</p>}
    </div>
  );
}

function VfbErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-5 text-center">
      <p className="text-[12.5px] font-semibold text-rose-700">{message}</p>
      <p dir="ltr" className="mt-1 text-[10.5px] text-rose-500">
        {COPY.unavailable}
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onRetry}
        className="mt-3 h-8 gap-1.5 rounded-lg border-rose-200 bg-white text-[11.5px] text-rose-700 hover:border-rose-300"
      >
        <RefreshCw className="size-3.5" />
        تلاش دوباره
      </Button>
    </div>
  );
}

function VfbIdChip({ id, label }: { id: string; label?: string }) {
  if (!id) return null;
  return (
    <span dir="ltr" className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
      {label ? `${label}: ` : ""}
      {id}
    </span>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Search; children: string }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold text-slate-700">
      <Icon className="size-3.5 text-emerald-600" />
      {children}
    </p>
  );
}

/** Attribution footer used by every VFB-derived block. */
function VfbAttribution({ note }: { note?: string }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-slate-500">
      <span>Data source: {VFB_SOURCE.name}</span>
      <a
        href={VFB_SOURCE.site}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
      >
        virtualflybrain.org
        <ExternalLink className="size-3" />
      </a>
      {note && <span>· {note}</span>}
    </p>
  );
}

// ── Search ───────────────────────────────────────────────────────────────────

interface VfbSearchProps {
  rows: VFBEntitySummary[];
  total: number;
  selectedId: string;
  busy: boolean;
  hasSearched: boolean;
  error: string;
  onSelect: (entity: VFBEntitySummary) => void;
  onLoadMore: () => void;
  onRetry: () => void;
}

function VfbSearchPanel({
  rows,
  total,
  selectedId,
  busy,
  hasSearched,
  error,
  onSelect,
  onLoadMore,
  onRetry,
}: VfbSearchProps) {
  return (
    <div className={cn(FRAME, "p-4")}>
      <SectionTitle icon={Search}>نتایج جست‌وجو</SectionTitle>

      {hasSearched && error && <VfbErrorState message={error} onRetry={onRetry} />}

      {!hasSearched && (
        <p className="py-6 text-center text-[11.5px] text-slate-500">
          عبارتی مانند <span dir="ltr" className="font-mono text-emerald-700">medulla</span>،{" "}
          <span dir="ltr" className="font-mono text-emerald-700">Kenyon cell</span> یا{" "}
          <span dir="ltr" className="font-mono text-emerald-700">dpp</span> را جست‌وجو کنید.
        </p>
      )}

      {hasSearched && !error && rows.length === 0 && !busy && (
        <VfbEmpty primary={COPY.noResults} secondary="عبارت کوتاه‌تر یا نام لاتین را امتحان کنید." />
      )}

      {busy && rows.length === 0 && <VfbSpinner />}

      {rows.length > 0 && (
        <>
          <p className="mb-2 text-[11px] text-slate-500">
            <span dir="ltr">{rows.length}</span> نتیجه نمایش داده می‌شود از{" "}
            <span dir="ltr">{total.toLocaleString("en-US")}</span> نتیجهٔ گزارش‌شده توسط VFB.
          </p>
          <ul className="space-y-1.5">
            {rows.map((row) => (
              <li key={row.id || row.rawLabel}>
                <button
                  type="button"
                  onClick={() => onSelect(row)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-right transition-colors",
                    selectedId && selectedId === row.id
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-emerald-900/5 bg-white hover:border-emerald-200 hover:bg-emerald-50/50",
                  )}
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12.5px] font-bold text-slate-800">{row.label}</span>
                    {row.entityType && (
                      <Badge className="rounded-full bg-emerald-100 px-1.5 py-0 text-[9.5px] font-semibold text-emerald-800 hover:bg-emerald-100">
                        {row.entityType}
                      </Badge>
                    )}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {row.id && <VfbIdChip id={row.id} />}
                    {row.facets.slice(0, 3).map((f) => (
                      <span key={f} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9.5px] text-slate-500">
                        {f}
                      </span>
                    ))}
                  </span>
                  {row.description && (
                    <span className="mt-1 block text-[11px] leading-5 text-slate-500">{row.description}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onLoadMore}
            className="mt-3 h-8 w-full rounded-lg border-emerald-900/10 bg-white text-[11.5px] text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUpRight className="size-3.5" />}
            نمایش نتایج بیشتر
          </Button>
        </>
      )}

      <VfbAttribution note="جست‌وجو مستقیماً از VFBquery انجام می‌شود." />
    </div>
  );
}

// ── Gene / entity resolver ───────────────────────────────────────────────────

function VfbResolverPanel({ onSelect }: { onSelect: (entity: VFBEntitySummary) => void }) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const loader = useCallback(
    (signal: AbortSignal) => {
      if (submitted === null) return Promise.reject(new Error("idle"));
      return resolveVFBEntity({ query: submitted, signal });
    },
    [submitted],
  );
  const resource = useLazyResource<VFBResolveResult>(submitted !== null, loader, [submitted]);

  return (
    <div className={cn(FRAME, "p-4")}>
      <SectionTitle icon={Dna}>حل‌کنندهٔ نام ژن / موجودیت</SectionTitle>
      <p className="mb-2 text-[11px] leading-5 text-slate-500">
        نامی مثل <span dir="ltr" className="font-mono text-emerald-700">dpp</span> را وارد کنید تا نامزدهای
        FlyBase که VFB برمی‌گرداند ببینید. این نتایج «نامزد» هستند، نه تأیید قطعی ژن.
      </p>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          const q = value.trim();
          if (!q) return;
          setSubmitted(q);
        }}
      >
        <Input
          dir="ltr"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="dpp"
          className="h-9 text-left"
        />
        <Button
          type="submit"
          size="sm"
          className="h-9 shrink-0 rounded-lg bg-emerald-700 px-3 text-[12px] text-white hover:bg-emerald-800"
        >
          حل
        </Button>
      </form>

      {resource.status === "loading" && <VfbSpinner label="در حال جست‌وجوی نامزدها…" />}
      {resource.status === "error" && (
        <div className="mt-3">
          <VfbErrorState message={resource.error} onRetry={resource.reload} />
        </div>
      )}
      {resource.status === "ready" && resource.data && (
        <div className="mt-3">
          {resource.data.candidates.length === 0 ? (
            <VfbEmpty primary={COPY.noResults} secondary={`VFB موجودیتی برای «${submitted}» پیدا نکرد.`} />
          ) : (
            <>
              <p className="mb-1.5 text-[10.5px] text-slate-500">
                نوع تطبیق گزارش‌شده توسط VFB:{" "}
                <span dir="ltr" className="font-mono text-slate-700">
                  {resource.data.matchType ?? "—"}
                </span>
              </p>
              <ul className="space-y-1.5">
                {resource.data.candidates.map((c) => (
                  <li
                    key={`${c.uniquename ?? c.name}`}
                    className="rounded-xl border border-emerald-900/5 bg-emerald-50/40 px-3 py-2"
                  >
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[12px] font-bold text-slate-800">{c.name}</span>
                      {c.type && (
                        <Badge className="rounded-full bg-slate-100 px-1.5 py-0 text-[9.5px] text-slate-700 hover:bg-slate-100">
                          {c.type}
                        </Badge>
                      )}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      {c.uniquename && <VfbIdChip id={c.uniquename} label="FlyBase" />}
                      {c.matchedSynonym && (
                        <span className="text-[10.5px] text-slate-500">مترادف تطبیق: {c.matchedSynonym}</span>
                      )}
                      {c.uniquename && (
                        <button
                          type="button"
                          onClick={() =>
                            onSelect({
                              id: c.uniquename ?? "",
                              label: c.name,
                              rawLabel: c.name,
                              facets: c.type ? [c.type] : [],
                              entityType: c.type ?? null,
                            })
                          }
                          className="text-[10.5px] font-semibold text-emerald-700 hover:underline"
                        >
                          مشاهده جزئیات
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <VfbAttribution note="VFB یکپارچه‌کنندهٔ چند منبع است؛ مالک داده‌های اصلی نیست." />
        </div>
      )}
    </div>
  );
}

// ── Detail tabs ──────────────────────────────────────────────────────────────

type TabId = "overview" | "anatomy" | "images" | "connectivity" | "transcriptomics" | "xrefs" | "source";

interface TabDef {
  id: TabId;
  label: string;
  icon: typeof Search;
}

const TAB_DEFS: TabDef[] = [
  { id: "overview", label: "نمای کلی", icon: Info },
  { id: "anatomy", label: "آناتومی", icon: Layers },
  { id: "images", label: "تصاویر", icon: ImageIcon },
  { id: "connectivity", label: "اتصال‌پذیری", icon: Network },
  { id: "transcriptomics", label: "ترنسکریپتومیکس", icon: Dna },
  { id: "xrefs", label: "ارجاعات متقابل", icon: Link2 },
  { id: "source", label: "منبع و دیتاست", icon: Database },
];

function OverviewTab({ info }: { info: VFBTermInfo }) {
  const facts: { label: string; value: string }[] = [];
  if (info.types) facts.push({ label: "نوع (Types)", value: info.types });
  if (info.relationships) facts.push({ label: "روابط (Relationships)", value: info.relationships });
  for (const t of info.superTypes) facts.push({ label: "SuperType", value: t });

  const hasBody = Boolean(info.description || info.comment || info.synonyms.length || facts.length);

  return (
    <div className="space-y-4">
      {!hasBody && <VfbEmpty primary={COPY.noData} />}

      {(info.description || info.comment) && (
        <div>
          <SectionTitle icon={Info}>تعریف</SectionTitle>
          {info.description && (
            <p className="whitespace-pre-wrap text-[12.5px] leading-7 text-slate-700">{info.description}</p>
          )}
          {info.comment && (
            <p className="mt-2 whitespace-pre-wrap text-[11.5px] leading-6 text-slate-500">{info.comment}</p>
          )}
        </div>
      )}

      {facts.length > 0 && (
        <div>
          <SectionTitle icon={Layers}>اطلاعات سلسله‌مراتبی</SectionTitle>
          <dl className="space-y-1.5">
            {facts.map((f) => (
              <div key={`${f.label}-${f.value}`} className="flex flex-wrap items-baseline gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-[11px] font-semibold text-slate-500">{f.label}</dt>
                <dd dir="ltr" className="text-left text-[11.5px] text-slate-700">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {info.synonyms.length > 0 && (
        <div>
          <SectionTitle icon={Dna}>مترادف‌ها</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {info.synonyms.map((s, i) => (
              <span
                key={`${s.label}-${i}`}
                className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-800"
              >
                {s.label}
                {s.scope ? ` · ${s.scope}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {info.tags.length > 0 && (
        <div>
          <SectionTitle icon={ShieldCheck}>برچسب‌های VFB</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {info.tags.map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10.5px] text-slate-600">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {info.namedQueries.length > 0 && (
        <div>
          <SectionTitle icon={Search}>پرس‌وجوهای نام‌دار موجود</SectionTitle>
          <ul className="space-y-1">
            {info.namedQueries.map((q) => (
              <li key={q.query} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5">
                <span dir="ltr" className="font-mono text-[11px] text-slate-700">
                  {q.query}
                </span>
                {q.label && <span className="text-[10.5px] text-slate-500">— {q.label}</span>}
                {q.previewCount > 0 && (
                  <span className="mr-auto text-[10px] text-slate-400">{q.previewCount} پیش‌نمایش</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {info.publications.length > 0 && (
        <div>
          <SectionTitle icon={ExternalLink}>مقالات مرتبط (بازگشتی از VFB)</SectionTitle>
          <ul className="space-y-1.5">
            {info.publications.map((p, i) => (
              <li key={`${p.shortForm ?? p.title}-${i}`} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[11.5px] leading-6 text-slate-700">{p.title}</p>
                {p.microref && (
                  <p className="mt-0.5 text-[10px] text-slate-500" dir="ltr">
                    {p.microref}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <VfbAttribution note="مقالات، مترادف‌ها و برچسب‌ها عیناً از پاسخ VFB آمده‌اند." />
    </div>
  );
}

function AnatomyTab({
  info,
  onOpenTerm,
}: {
  info: VFBTermInfo;
  onOpenTerm: (id: string, label: string) => void;
}) {
  const loader = useCallback((signal: AbortSignal) => getVFBHierarchy({ id: info.id, maxDepth: 1, signal }), [info.id]);
  const resource = useLazyResource<VFBHierarchy>(true, loader, [info.id]);

  if (resource.status === "loading") return <VfbSpinner />;
  if (resource.status === "error") return <VfbErrorState message={resource.error} onRetry={resource.reload} />;

  const hierarchy = resource.data;
  if (!hierarchy) return <VfbEmpty primary={COPY.noData} />;

  const groups: { title: string; nodes: { id: string; label: string }[] }[] = [
    { title: `والیان‌ها (${hierarchy.relationship})`, nodes: hierarchy.ancestors },
    { title: "زیرمجموعه‌ها / نوادگان مستقیم", nodes: hierarchy.descendants },
  ];

  if (hierarchy.ancestors.length === 0 && hierarchy.descendants.length === 0) {
    return <VfbEmpty primary={COPY.noData} secondary="VFB برای این شناسه رابطهٔ سلسله‌مراتبی برنگرداند." />;
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-500">
        تنها یک سطح از آنتولوژی درخواست می‌شود (<span dir="ltr">max_depth = 1</span>) تا از انفجار درخواست
        جلوگیری شود. روی هر شناسه کلیک کنید تا جزئیات همان ترم باز شود.
      </p>
      {groups.map((g) =>
        g.nodes.length === 0 ? null : (
          <div key={g.title}>
            <SectionTitle icon={Layers}>{g.title}</SectionTitle>
            <ul className="space-y-1">
              {g.nodes.map((n) => (
                <li key={`${n.id}-${n.label}`}>
                  <button
                    type="button"
                    disabled={!n.id}
                    onClick={() => onOpenTerm(n.id, n.label)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-emerald-900/5 bg-white px-3 py-2 text-right transition-colors hover:border-emerald-200 hover:bg-emerald-50/60 disabled:cursor-default disabled:opacity-70"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold text-slate-800">{n.label}</span>
                      {n.id && <span dir="ltr" className="mt-0.5 block font-mono text-[10px] text-slate-500">{n.id}</span>}
                    </span>
                    {n.id && <ArrowUpRight className="size-3.5 shrink-0 text-emerald-600" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
      <VfbAttribution note="سلسله‌مراتب از FBbt و روابط VFB گرفته شده است." />
    </div>
  );
}

function ImagesTab({ info }: { info: VFBTermInfo }) {
  const [images, setImages] = useState<VFBImage[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>("loading");

  // One page per `offset`: `ListAllAvailableImages` is never fetched in bulk.
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    getVFBImages({
      id: info.id,
      queryType: IMAGE_QUERY,
      offset,
      limit: PAGE_SIZE,
      signal: controller.signal,
    }).then(
      (data) => {
        if (cancelled) return;
        setImages((prev) => (offset === 0 ? data.images : [...prev, ...data.images]));
        setTotal(data.total);
        setError("");
        setStatus("ready");
      },
      (err: unknown) => {
        if (cancelled || isAbortError(err)) return;
        setError(vfbErrorMessage(err));
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [info.id, offset, nonce]);

  const reload = useCallback(() => {
    setImages([]);
    setOffset(0);
    setNonce((n) => n + 1);
  }, []);

  if (status === "loading" && images.length === 0) return <VfbSpinner />;
  if (status === "error" && images.length === 0) return <VfbErrorState message={error} onRetry={reload} />;
  if (images.length === 0) return <VfbEmpty primary={COPY.noImages} />;

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">
        تصاویر از نشانی اصلی VFB نمایش داده می‌شوند و در ژنوا کپی یا آینه نمی‌شوند. نام دیتاست و مجوز دقیقاً
        همان چیزی است که VFB برگردانده است.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((img) => (
          <figure key={img.id} className="overflow-hidden rounded-xl border border-emerald-900/5 bg-white">
            {img.thumbnailUrl ? (
              <img
                src={img.thumbnailUrl}
                alt={img.label}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-32 w-full bg-slate-50 object-contain"
              />
            ) : (
              <div className="flex h-32 items-center justify-center bg-slate-50 text-slate-300">
                <ImageIcon className="size-6" />
              </div>
            )}
            <figcaption className="space-y-1 p-2.5">
              <p className="truncate text-[11.5px] font-semibold text-slate-800">{img.label}</p>
              <div className="flex flex-wrap gap-1">
                {img.id && <VfbIdChip id={img.id} />}
                {img.license && (
                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9.5px] text-amber-700">
                    License: {img.license}
                  </span>
                )}
              </div>
              {img.dataset && <p className="truncate text-[10px] text-slate-500">Dataset: {img.dataset}</p>}
              {img.source && <p className="truncate text-[10px] text-slate-500">Source: {img.source}</p>}
              {img.thumbnailUrl && (
                <a
                  href={img.thumbnailUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 hover:underline"
                >
                  مشاهده در VFB
                  <ExternalLink className="size-3" />
                </a>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      {images.length < total && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={status === "loading"}
          onClick={() => setOffset((o) => o + PAGE_SIZE)}
          className="h-8 rounded-lg border-emerald-900/10 bg-white text-[11.5px] text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
        >
          نمایش تصاویر بیشتر
        </Button>
      )}
      <VfbAttribution note="تصاویر متعلق به تولیدکنندگان اصلی دیتاست‌ها هستند، نه VFB." />
    </div>
  );
}

function ConnectivityTab({ info }: { info: VFBTermInfo }) {
  const [upstream, setUpstream] = useState(info.name);
  const [downstream, setDownstream] = useState("");
  const [submitted, setSubmitted] = useState<{ up: string; down: string } | null>(null);

  const loader = useCallback(
    (signal: AbortSignal) => {
      if (!submitted) return Promise.reject(new Error("idle"));
      return getVFBConnectivity({ upstreamType: submitted.up, downstreamType: submitted.down, signal });
    },
    [submitted],
  );
  const resource = useLazyResource<VFBConnectivity>(submitted !== null, loader, [submitted]);

  const datasetLabel = (dataSource?: string) => (dataSource ? dataSource : null);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5">
        <p className="text-[11.5px] font-semibold text-amber-800">
          Evidence from VFB connectome data
        </p>
        <p className="mt-1 text-[11px] leading-5 text-amber-700">
          VFB این اتصال را در بازسازی/کانکتوم انتخاب‌شده گزارش می‌کند. این یک گزارش شواهد است، نه یک واقعیت
          زیستی مطلق؛ بازسازی‌های مختلف می‌توانند نتایج متفاوتی بدهند.
        </p>
      </div>

      <form
        className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!upstream.trim() || !downstream.trim()) return;
          setSubmitted({ up: upstream.trim(), down: downstream.trim() });
        }}
      >
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-500">نوع نورون بالادست (upstream_type)</span>
          <Input dir="ltr" value={upstream} onChange={(e) => setUpstream(e.target.value)} className="h-9 text-left" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-500">نوع نورون پایین‌دست (downstream_type)</span>
          <Input
            dir="ltr"
            value={downstream}
            onChange={(e) => setDownstream(e.target.value)}
            placeholder="giant fiber neuron"
            className="h-9 text-left"
          />
        </label>
        <Button
          type="submit"
          size="sm"
          className="h-9 rounded-lg bg-emerald-700 px-4 text-[12px] text-white hover:bg-emerald-800"
        >
          استعلام
        </Button>
      </form>

      {submitted === null && (
        <p className="text-[11px] text-slate-500">
          برای دیدن اتصال‌ها، دو نوع نورون را وارد کنید و «استعلام» را بزنید. این بخش تا پیش از درخواست شما
          هیچ داده‌ای بارگذاری نمی‌کند.
        </p>
      )}

      {submitted && resource.status === "loading" && <VfbSpinner />}
      {submitted && resource.status === "error" && (
        <VfbErrorState message={resource.error} onRetry={resource.reload} />
      )}

      {submitted && resource.status === "ready" && resource.data && (
        <div className="space-y-3">
          {resource.data.warnings.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2">
              {resource.data.warnings.map((w) => (
                <li key={w} className="text-[11px] leading-5 text-amber-700">
                  {w}
                </li>
              ))}
            </ul>
          )}

          {resource.data.excludedDbs.length > 0 && (
            <p className="text-[10.5px] text-slate-500">
              دیتاست‌های مستثنا شده در این پرس‌وجو:{" "}
              <span dir="ltr" className="font-mono">{resource.data.excludedDbs.join(", ")}</span>
            </p>
          )}

          {resource.data.connections.length === 0 ? (
            <VfbEmpty primary={COPY.noConnectivity} secondary="VFB برای این جفت، اتصالی برنگرداند." />
          ) : (
            <>
              <p className="text-[11px] text-slate-500">
                <span dir="ltr">{resource.data.count.toLocaleString("en-US")}</span> اتصال گزارش‌شده توسط VFB.
              </p>
              <div className="overflow-x-auto rounded-xl border border-emerald-900/5">
                <table className="w-full min-w-[640px] text-right text-[11px]">
                  <thead className="bg-slate-50 text-[10.5px] text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">نورون بالادست</th>
                      <th className="px-3 py-2 font-semibold">نورون پایین‌دست</th>
                      <th className="px-3 py-2 font-semibold">وزن (synapses)</th>
                      <th className="px-3 py-2 font-semibold">Dataset</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resource.data.connections.map((c, i) => (
                      <tr key={`${c.upstreamNeuronId ?? i}-${c.downstreamNeuronId ?? i}`} className="border-t border-emerald-900/5">
                        <td className="px-3 py-2 text-slate-700">
                          {c.upstreamNeuronName ?? c.upstreamClass ?? "—"}
                          {c.upstreamNeuronId && <VfbIdChip id={c.upstreamNeuronId} />}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {c.downstreamNeuronName ?? c.downstreamClass ?? "—"}
                          {c.downstreamNeuronId && <VfbIdChip id={c.downstreamNeuronId} />}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{c.weight ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-500">
                          {datasetLabel(c.upstreamDataSource) ?? "—"}
                          {c.downstreamDataSource && c.downstreamDataSource !== c.upstreamDataSource && (
                            <> / {c.downstreamDataSource}</>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10.5px] text-slate-500">
                Dataset: همان چیزی که VFB در پاسخ برگردانده است (نمونه:{" "}
                <span dir="ltr" className="font-mono">flywire783</span>). نسخه‌ها در ژنوا ثابت نشده‌اند و همیشه از
                API خوانده می‌شوند.
              </p>
            </>
          )}
          <VfbAttribution note="VFB یکپارچه‌کنندهٔ کانکتوم‌های متعدد است." />
        </div>
      )}
    </div>
  );
}

function TranscriptomicsTab({ info }: { info: VFBTermInfo }) {
  const available = useMemo(() => {
    const haystack = [
      ...info.tags,
      ...info.namedQueries.map((q) => `${q.query} ${q.label ?? ""}`),
    ]
      .join(" ")
      .toLowerCase();
    return SCRNA_MARKERS.some((m) => haystack.includes(m));
  }, [info.tags, info.namedQueries]);

  const scQueries = useMemo(
    () =>
      info.namedQueries.filter((q) =>
        SCRNA_MARKERS.some((m) => `${q.query} ${q.label ?? ""}`.toLowerCase().includes(m)),
      ),
    [info.namedQueries],
  );

  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const loader = useCallback(
    (signal: AbortSignal) => {
      if (!activeQuery) return Promise.reject(new Error("idle"));
      return runVFBQuery({ id: info.id, queryType: activeQuery, limit: PAGE_SIZE, signal });
    },
    [activeQuery, info.id],
  );
  const resource = useLazyResource<VFBQueryResult>(Boolean(activeQuery), loader, [activeQuery, info.id]);

  if (!available && scQueries.length === 0) {
    return <VfbEmpty primary={COPY.noData} secondary="VFB برای این ترم دادهٔ تک‌سلولی معرفی نکرده است." />;
  }

  const columns = resource.data?.columns ?? [];
  const rows = resource.data?.rows ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
        <p className="text-[11.5px] font-semibold text-emerald-800">Transcriptomics available</p>
        <p className="mt-1 text-[11px] leading-5 text-emerald-700">
          VFB داده‌های scRNA/snRNA را به آناتومی متصل کرده است. در این مرحله فقط مقادیری نمایش داده می‌شوند که
          واقعاً در پاسخ API آمده‌اند؛ هیچ نمودار یا مقدار بازسازی‌شده‌ای ساخته نمی‌شود.
        </p>
      </div>

      {scQueries.length > 0 ? (
        <>
          <div>
            <SectionTitle icon={Dna}>پرس‌وجوهای تک‌سلولی موجود برای این ترم</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {scQueries.map((q) => (
                <button
                  key={q.query}
                  type="button"
                  onClick={() => setActiveQuery(q.query)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    activeQuery === q.query
                      ? "bg-emerald-700 text-white"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
                  )}
                >
                  {q.query}
                </button>
              ))}
            </div>
          </div>

          {activeQuery && resource.status === "loading" && <VfbSpinner />}
          {activeQuery && resource.status === "error" && (
            <VfbErrorState message={resource.error} onRetry={resource.reload} />
          )}

          {activeQuery && resource.status === "ready" && resource.data && (
            <VfbQueryTable columns={columns} rows={rows} total={resource.data.total} />
          )}
        </>
      ) : (
        <p className="text-[11px] text-slate-500">
          برای این شناسه پرس‌وجوی تک‌سلولی مشخصی در پاسخ VFB فهرست نشده است. تحلیل کامل ترنسکریپتومیکس در
          فازهای بعدی اضافه می‌شود.
        </p>
      )}

      <VfbAttribution note="داده‌های تک‌سلولی از تولیدکنندگان اصلی می‌آیند و در VFB یکپارچه شده‌اند." />
    </div>
  );
}

function VfbQueryTable({
  columns,
  rows,
  total,
}: {
  columns: VFBQueryColumn[];
  rows: Record<string, unknown>[];
  total: number;
}) {
  if (rows.length === 0) return <VfbEmpty primary={COPY.noData} />;
  const usable = columns.filter((c) => c.key.length > 0);
  if (usable.length === 0) return <VfbEmpty primary={COPY.noData} />;

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-500">
        <span dir="ltr">{total.toLocaleString("en-US")}</span> ردیف بازگشتی از VFB (نمایش{" "}
        <span dir="ltr">{rows.length}</span> ردیف اول).
      </p>
      <div className="overflow-x-auto rounded-xl border border-emerald-900/5">
        <table className="w-full min-w-[520px] text-right text-[11px]">
          <thead className="bg-slate-50 text-[10.5px] text-slate-500">
            <tr>
              {usable.map((c) => (
                <th key={c.key} className="px-3 py-2 font-semibold">
                  {c.title ?? c.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-emerald-900/5">
                {usable.map((c) => (
                  <td key={c.key} className="max-w-[220px] truncate px-3 py-1.5 text-slate-700">
                    {String(row[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function XrefsTab({ info }: { info: VFBTermInfo }) {
  const loader = useCallback((signal: AbortSignal) => getVFBXrefs({ id: info.id, signal }), [info.id]);
  const resource = useLazyResource<VFBCrossRef[]>(true, loader, [info.id]);

  if (resource.status === "loading") return <VfbSpinner />;
  if (resource.status === "error") return <VfbErrorState message={resource.error} onRetry={resource.reload} />;
  const rows = resource.data ?? [];
  if (rows.length === 0) return <VfbEmpty primary={COPY.noData} />;

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">
        پیوندها فقط زمانی ساخته می‌شوند که خود VFB آدرس رسمی برگردانده باشد؛ هیچ آدرسی حدس زده نمی‌شود.
      </p>
      <div className="overflow-x-auto rounded-xl border border-emerald-900/5">
        <table className="w-full min-w-[520px] text-right text-[11px]">
          <thead className="bg-slate-50 text-[10.5px] text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">پایگاه داده</th>
              <th className="px-3 py-2 font-semibold">شناسهٔ بیرونی</th>
              <th className="px-3 py-2 font-semibold">برچسب</th>
              <th className="px-3 py-2 font-semibold">پیوند</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x, i) => (
              <tr key={`${x.db}-${x.accession ?? i}`} className="border-t border-emerald-900/5">
                <td className="px-3 py-2">
                  <span className="font-semibold text-slate-700">{x.dbLabel ?? x.db}</span>
                  {x.isDataSource && (
                    <Badge className="mr-1.5 rounded-full bg-emerald-100 px-1.5 py-0 text-[9px] text-emerald-800 hover:bg-emerald-100">
                      data source
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-700" dir="ltr">
                  {x.accession ?? x.id ?? "—"}
                </td>
                <td className="max-w-[220px] truncate px-3 py-2 text-slate-600">{x.label ?? "—"}</td>
                <td className="px-3 py-2">
                  {x.link ? (
                    <a
                      href={x.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                    >
                      مشاهده
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <VfbAttribution note="ارجاعات متقابل همان‌طور که VFB برگردانده نمایش داده می‌شوند." />
    </div>
  );
}

function SourceTab({ info }: { info: VFBTermInfo }) {
  const loader = useCallback((signal: AbortSignal) => getVFBConnectomeDatasets({ signal }), []);
  const resource = useLazyResource<VFBConnectomeDataset[]>(true, loader, []);

  const licenseEntries = useMemo(
    () => Object.entries(info.licenses ?? {}).filter(([, v]) => typeof v === "string" && v.length > 0),
    [info.licenses],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-900/5 bg-slate-50 px-3 py-3">
        <p className="text-[11.5px] font-bold text-slate-700">منبع داده</p>
        <p className="mt-1 text-[11.5px] leading-6 text-slate-600">
          همهٔ داده‌های این صفحه از{" "}
          <a href={VFB_SOURCE.site} target="_blank" rel="noreferrer noopener" className="font-semibold text-emerald-700 hover:underline">
            {VFB_SOURCE.name}
          </a>{" "}
          و API خواندنی <span dir="ltr">{VFB_SOURCE.api}</span> گرفته شده‌اند. VFB یک پایگاه یکپارچه است و لزوماً
          تولیدکنندهٔ همهٔ دیتاست‌های زیربنایی نیست؛ بازتوزیع داده‌ها فقط با رعایت مجوز هر دیتاست مجاز است.
        </p>
        <p className="mt-2 text-[11px] text-slate-500">
          شناسهٔ ترم فعلی: <VfbIdChip id={info.id} />
        </p>
      </div>

      {licenseEntries.length > 0 && (
        <div>
          <SectionTitle icon={ShieldCheck}>مجوزها (بازگشتی از VFB)</SectionTitle>
          <ul className="space-y-1">
            {licenseEntries.map(([k, v]) => (
              <li key={k} className="rounded-lg bg-amber-50/70 px-3 py-1.5 text-[11px] text-amber-800">
                {k}: {String(v)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <SectionTitle icon={Database}>دیتاست‌های کانکتوم (از list_connectome_datasets)</SectionTitle>
        {resource.status === "loading" && <VfbSpinner label="در حال دریافت فهرست دیتاست‌ها…" />}
        {resource.status === "error" && <VfbErrorState message={resource.error} onRetry={resource.reload} />}
        {resource.status === "ready" && (resource.data ?? []).length === 0 && (
          <VfbEmpty primary={COPY.noData} />
        )}
        {resource.status === "ready" && (resource.data ?? []).length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {(resource.data ?? []).map((d) => (
              <li
                key={d.symbol ?? d.label}
                className="rounded-full border border-emerald-900/5 bg-white px-2.5 py-1 text-[11px] text-slate-700"
              >
                {d.label}
                {d.symbol ? (
                  <span dir="ltr" className="mr-1.5 font-mono text-[10px] text-slate-500">
                    {d.symbol}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[10.5px] text-slate-500">
          نسخه‌ها هرگز در کد ثابت نمی‌شوند؛ همیشه از خود API خوانده می‌شوند.
        </p>
      </div>

      <VfbAttribution />
    </div>
  );
}

function DetailPanel({
  entity,
  onOpenTerm,
}: {
  entity: VFBEntitySummary;
  onOpenTerm: (id: string, label: string) => void;
}) {
  const loader = useCallback((signal: AbortSignal) => getVFBTermInfo({ id: entity.id, signal }), [entity.id]);
  const resource = useLazyResource<VFBTermInfo>(true, loader, [entity.id]);
  const [tab, setTab] = useState<TabId>("overview");

  // A different term resets the reader to its first (cheapest) section.
  const termKey = entity.id;
  const [seenTerm, setSeenTerm] = useState(termKey);
  if (seenTerm !== termKey) {
    setSeenTerm(termKey);
    setTab("overview");
  }

  const info = resource.data;

  const tabs = useMemo(() => {
    if (!info) return [TAB_DEFS[0]];
    const hasImages = info.namedQueries.some((q) => q.query === IMAGE_QUERY);
    return TAB_DEFS.filter((t) => {
      if (t.id === "images") return hasImages;
      if (t.id === "transcriptomics") {
        const haystack = [...info.tags, ...info.namedQueries.map((q) => `${q.query} ${q.label ?? ""}`)]
          .join(" ")
          .toLowerCase();
        return SCRNA_MARKERS.some((m) => haystack.includes(m));
      }
      return true;
    });
  }, [info]);

  const activeTab = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;

  return (
    <div className={cn(FRAME, "overflow-hidden")}>
      <header className="border-b border-emerald-900/5 bg-gradient-to-l from-emerald-50/80 to-white px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-extrabold tracking-tight text-slate-900">{info?.name ?? entity.label}</h2>
              {entity.entityType && (
                <Badge className="rounded-full bg-emerald-100 px-2 py-0 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100">
                  {entity.entityType}
                </Badge>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <VfbIdChip id={info?.id ?? entity.id} label="ID" />
              {info?.types && <span className="text-[10.5px] text-slate-500">Types: {info.types}</span>}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={resource.reload}
            className="h-8 gap-1.5 rounded-lg border-emerald-900/10 bg-white text-[11.5px] text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
          >
            <RefreshCw className={cn("size-3.5", resource.status === "loading" && "animate-spin")} />
            تازه‌سازی
          </Button>
        </div>
      </header>

      <div className="lab-scrollbar flex gap-1 overflow-x-auto border-b border-emerald-900/5 px-3 py-2 sm:px-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.id === activeTab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                active ? "bg-emerald-700 text-white" : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-800",
              )}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-5">
        {resource.status === "loading" && <VfbSpinner />}
        {resource.status === "error" && <VfbErrorState message={resource.error} onRetry={resource.reload} />}
        {resource.status === "ready" && info && !info.found && (
          <VfbEmpty primary={COPY.noData} secondary={`VFB رکوردی برای ${entity.id} برنگرداند.`} />
        )}

        {resource.status === "ready" && info && info.found && (
          <>
            {activeTab === "overview" && <OverviewTab info={info} />}
            {activeTab === "anatomy" && <AnatomyTab info={info} onOpenTerm={onOpenTerm} />}
            {activeTab === "images" && <ImagesTab info={info} />}
            {activeTab === "connectivity" && <ConnectivityTab info={info} />}
            {activeTab === "transcriptomics" && <TranscriptomicsTab info={info} />}
            {activeTab === "xrefs" && <XrefsTab info={info} />}
            {activeTab === "source" && <SourceTab info={info} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Module shell ─────────────────────────────────────────────────────────────

export function VirtualFlyBrain({ initialTerm }: { initialTerm?: { id: string; label: string } | null }) {
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<{ q: string; offset: number } | null>(null);
  const [searchNonce, setSearchNonce] = useState(0);
  const [searchData, setSearchData] = useState<{ rows: VFBEntitySummary[]; total: number } | null>(null);
  const [searchError, setSearchError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<VFBEntitySummary | null>(null);

  // A fly can hand its VFB anchor to this explorer. The hand-off is applied
  // during render (not in an effect) so the term is already selected on the
  // very first paint after the switch.
  const incomingId = initialTerm?.id ?? "";
  const [lastHandoff, setLastHandoff] = useState(incomingId);
  if (incomingId && incomingId !== lastHandoff) {
    setLastHandoff(incomingId);
    setSelected({
      id: incomingId,
      label: initialTerm?.label ?? incomingId,
      rawLabel: initialTerm?.label ?? incomingId,
      facets: [],
      entityType: null,
    });
  }

  const searchLoader = useCallback(
    (signal: AbortSignal) => {
      if (!searchState) return Promise.reject(new Error("idle"));
      return searchVFB({ query: searchState.q, limit: PAGE_SIZE, offset: searchState.offset, signal });
    },
    [searchState],
  );

  const searchStatus: Status = !searchState
    ? "idle"
    : searchError
      ? "error"
      : searchData && !loadingMore
        ? "ready"
        : "loading";

  useEffect(() => {
    if (!searchState) return;
    const controller = new AbortController();
    let cancelled = false;
    searchLoader(controller.signal).then(
      (data) => {
        if (cancelled) return;
        setSearchData((prev) =>
          searchState.offset > 0 && prev
            ? { rows: [...prev.rows, ...data.rows], total: data.total }
            : { rows: data.rows, total: data.total },
        );
        setSearchError("");
        setLoadingMore(false);
      },
      (err: unknown) => {
        if (cancelled || isAbortError(err)) return;
        setSearchError(vfbErrorMessage(err));
        setLoadingMore(false);
      },
    );
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLoader, searchNonce]);

  const runSearch = useCallback((raw: string) => {
    const q = raw.trim();
    if (!q) return;
    clearVFBCache();
    setSelected(null);
    setSearchData(null);
    setSearchError("");
    setLoadingMore(false);
    setSearchState({ q, offset: 0 });
  }, []);

  const loadMore = useCallback(() => {
    setSearchState((s) => (s ? { ...s, offset: s.offset + PAGE_SIZE } : s));
    setLoadingMore(true);
  }, []);

  const retrySearch = useCallback(() => {
    setSearchError("");
    setSearchNonce((n) => n + 1);
  }, []);

  const openTerm = useCallback((id: string, label: string) => {
    if (!id) return;
    setSelected({
      id,
      label,
      rawLabel: label,
      facets: [],
      entityType: null,
    });
  }, []);

  const rows = searchData?.rows ?? [];

  return (
    <section className="space-y-4">
      {/* Header */}
      <header className="relative overflow-hidden rounded-[24px] bg-gradient-to-l from-emerald-900 via-emerald-800 to-teal-700 px-5 py-5 text-white shadow-[0_24px_60px_-30px_rgba(4,47,46,0.7)] sm:px-7 sm:py-6">
        <div className="absolute inset-0 bg-[radial-gradient(110%_120%_at_88%_15%,rgba(45,212,191,0.32),transparent_60%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold text-emerald-100">
              <Brain className="size-4" />
              Neurobiology Explorer
            </p>
            <h1 dir="ltr" className="mt-1 text-left text-[24px] font-extrabold tracking-tight sm:text-[28px]">
              Virtual Fly Brain
            </h1>
            <p dir="ltr" className="mt-1 text-left text-[12.5px] text-emerald-100/90">
              Drosophila melanogaster Neurobiology Explorer
            </p>
            <p className="mt-2 max-w-xl text-[11.5px] leading-6 text-emerald-50/80">
              جست‌وجوی نورون‌ها، کلاس‌ها، نواحی مغز، ژن‌ها و دیتاست‌ها در{" "}
              <a href={VFB_SOURCE.site} target="_blank" rel="noreferrer noopener" className="underline decoration-emerald-300/60 underline-offset-4">
                Virtual Fly Brain
              </a>{" "}
              — با ذخیره‌سازی موقت پاسخ‌ها و بارگذاری تنبل بخش‌های سنگین.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/12 px-3 py-1 text-[10.5px] font-semibold text-emerald-50">
              VFBquery · read-only
            </span>
            <span className="rounded-full bg-white/12 px-3 py-1 text-[10.5px] font-semibold text-emerald-50">
              بدون کلید API
            </span>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className={cn(FRAME, "p-4 sm:p-5")}>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              dir="ltr"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="medulla · Kenyon cell · dpp · FBbt_00003748"
              className="h-11 pr-9 text-left"
            />
          </div>
          <Button
            type="submit"
            className="h-11 shrink-0 gap-1.5 rounded-xl bg-emerald-700 px-5 text-[12.5px] text-white hover:bg-emerald-800"
          >
            {searchStatus === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            جست‌وجو در VFB
          </Button>
        </form>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["medulla", "Kenyon cell", "dpp", "giant fiber neuron"].map((s) => (
            <button
              key={s}
              type="button"
              dir="ltr"
              onClick={() => {
                setQuery(s);
                runSearch(s);
              }}
              className="rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-[10.5px] text-emerald-800 transition-colors hover:bg-emerald-100"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <VfbSearchPanel
            rows={rows}
            total={searchData?.total ?? 0}
            selectedId={selected?.id ?? ""}
            busy={loadingMore}
            hasSearched={searchState !== null}
            error={searchError}
            onSelect={setSelected}
            onLoadMore={loadMore}
            onRetry={retrySearch}
          />
          <VfbResolverPanel onSelect={setSelected} />
        </div>

        <div>
          {selected ? (
            <DetailPanel entity={selected} onOpenTerm={openTerm} />
          ) : (
            <div className={cn(FRAME, "flex min-h-[280px] flex-col items-center justify-center gap-2 p-8 text-center")}>
              <Microscope className="size-7 text-emerald-500" />
              <p className="text-[13px] font-bold text-slate-800">یک موجودیت را انتخاب کنید</p>
              <p className="max-w-md text-[11.5px] leading-6 text-slate-500">
                از فهرست نتایج یک نورون، کلاس، ناحیهٔ مغز یا ژن انتخاب کنید تا نمای کلی، آناتومی، تصاویر،
                اتصال‌پذیری، ترنسکریپتومیکس و ارجاعات متقابل همان ترم از VFB بارگذاری شود.
              </p>
              <VfbAttribution />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default VirtualFlyBrain;
