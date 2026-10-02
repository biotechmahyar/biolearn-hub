/**
 * Genova Virtual Lab — "My Flies"
 * ─────────────────────────────────────────────────────────────────────────────
 * The bench where a student owns one or more **virtual flies**. A fly is a
 * Genova research object (metadata the student controls), and it can be anchored
 * to a real Virtual Fly Brain entity so every later step — brain inspection,
 * experiments, observations — starts from a traceable scientific source.
 *
 * Scientific integrity rules encoded here:
 *   • fly metadata is always labelled GENOVA METADATA, never "real biology";
 *   • the brain anchor is labelled REAL DATA and stores exactly the VFB id and
 *     label that the VFBquery `/search` response returned;
 *   • nothing about a fly's behaviour is claimed — the fly viewer and the
 *     behaviour engine arrive in later phases and are advertised as such.
 */
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Brain,
  Bug,
  Dna,
  Eye,
  FlaskConical,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { faNum, formatJalaliDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { VFB_SOURCE } from "@/services/vfb/types";
import { DataKindBadge } from "./dataKind";
import { FlyBrainSnapshot } from "./FlyBrainSnapshot";
import { FlyViewer } from "./FlyViewer";
import { SEX_LABEL, STATUS_CHIP, STATUS_LABEL, type FlyRow, type FlySex, type FlyStatus } from "./types";
import { VfbAnchorPicker, type VfbAnchor } from "./VfbAnchorPicker";

const FRAME =
  "rounded-2xl border border-emerald-900/5 bg-white shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)]";

/** Options are declared at module level so the segmented control stays generic. */
const SEX_OPTIONS: { value: FlySex; label: string }[] = [
  { value: "female", label: SEX_LABEL.female },
  { value: "male", label: SEX_LABEL.male },
  { value: "unknown", label: SEX_LABEL.unknown },
];

const STATUS_OPTIONS: { value: FlyStatus; label: string }[] = [
  { value: "healthy", label: STATUS_LABEL.healthy },
  { value: "experimental", label: STATUS_LABEL.experimental },
  { value: "modified", label: STATUS_LABEL.modified },
];

// ── Form ────────────────────────────────────────────────────────────────────

interface FlyFormState {
  name: string;
  sex: FlySex;
  ageDays: string;
  genotype: string;
  phenotype: string;
  notes: string;
  status: FlyStatus;
  anchor: VfbAnchor | null;
}

const EMPTY_FORM: FlyFormState = {
  name: "",
  sex: "unknown",
  ageDays: "5",
  genotype: "",
  phenotype: "",
  notes: "",
  status: "healthy",
  anchor: null,
};

function formFromFly(fly: FlyRow): FlyFormState {
  return {
    name: fly.name,
    sex: fly.sex,
    ageDays: String(fly.ageDays),
    genotype: fly.genotype ?? "",
    phenotype: fly.phenotype ?? "",
    notes: fly.notes ?? "",
    status: fly.status,
    anchor: fly.brainModel
      ? {
          vfbId: fly.brainModel.vfbId,
          label: fly.brainModel.label,
          ...(fly.brainModel.entityType ? { entityType: fly.brainModel.entityType } : {}),
        }
      : null,
  };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  idPrefix,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          id={`${idPrefix}-${o.value}`}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
            value === o.value
              ? "bg-emerald-700 text-white"
              : "bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FlyForm({
  form,
  setForm,
  idPrefix,
}: {
  form: FlyFormState;
  setForm: (next: FlyFormState) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="نام مگس">
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="مثال: Fly #001 — نسل کنترل"
          className="h-9 text-[12px]"
        />
      </Field>

      <Field label="سن (روز)" hint="عدد روز پس از emergence">
        <Input
          id={`${idPrefix}-age`}
          type="number"
          min={0}
          max={365}
          value={form.ageDays}
          onChange={(e) => setForm({ ...form, ageDays: e.target.value })}
          className="h-9 text-[12px]"
        />
      </Field>

      <Field label="جنس">
        <SegmentedControl
          idPrefix={`${idPrefix}-sex`}
          value={form.sex}
          onChange={(sex) => setForm({ ...form, sex })}
          options={SEX_OPTIONS}
        />
      </Field>

      <Field label="وضعیت">
        <SegmentedControl
          idPrefix={`${idPrefix}-status`}
          value={form.status}
          onChange={(status) => setForm({ ...form, status })}
          options={STATUS_OPTIONS}        />
      </Field>

      <div className="sm:col-span-2">
        <Field label="ژنوتایپ">
          <Input
            id={`${idPrefix}-genotype`}
            dir="ltr"
            value={form.genotype}
            onChange={(e) => setForm({ ...form, genotype: e.target.value })}
            placeholder="w1118"
            className="h-9 text-left text-[12px]"
          />
        </Field>
      </div>

      <div className="sm:col-span-2">
        <Field label="فنوتایپ (مشاهدهٔ شما)">
          <Textarea
            id={`${idPrefix}-phenotype`}
            value={form.phenotype}
            onChange={(e) => setForm({ ...form, phenotype: e.target.value })}
            placeholder="آناتومی خارجی، رفتار پرواز، رنگ‌پذیری…"
            className="min-h-[70px] text-[12px]"
          />
        </Field>
      </div>

      <div className="sm:col-span-2">
        <Field label="یادداشت آزمایشگاه">
          <Textarea
            id={`${idPrefix}-notes`}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="شرایط نگهداری، تغذیه، دارو…"
            className="min-h-[70px] text-[12px]"
          />
        </Field>
      </div>

      <div className="sm:col-span-2">
        <VfbAnchorPicker
          idPrefix={idPrefix}
          value={form.anchor}
          onChange={(anchor) => setForm({ ...form, anchor })}
        />
      </div>
    </div>
  );
}

// ── Cards & detail ──────────────────────────────────────────────────────────

function FlyCard({
  fly,
  active,
  onOpen,
}: {
  fly: FlyRow;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full rounded-2xl border p-3.5 text-right transition-all",
        active
          ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
          : "border-emerald-900/5 bg-white hover:border-emerald-200 hover:shadow-[0_1px_2px_rgba(6,78,59,0.05),0_16px_32px_-24px_rgba(6,78,59,0.4)]",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Bug className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-bold text-slate-800">{fly.name}</span>
            <span dir="ltr" className="mt-0.5 block text-left font-mono text-[10px] text-slate-400">
              {fly.genovaFlyId}
            </span>
          </span>
        </span>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_CHIP[fly.status])}>
          {STATUS_LABEL[fly.status]}
        </span>
      </span>

      <span className="mt-2.5 block text-[11px] text-slate-500">
        <span dir="ltr" className="font-mono text-[10.5px]">{fly.species}</span> · {SEX_LABEL[fly.sex]} ·{" "}
        <span dir="ltr">{faNum(fly.ageDays)}</span> روز
      </span>

      <span className="mt-2 flex flex-wrap items-center gap-1.5">
        {fly.brainModel ? (
          <>
            <DataKindBadge kind="real" />
            <span className="min-w-0 truncate text-[10.5px] text-emerald-800">{fly.brainModel.label}</span>
          </>
        ) : (
          <span className="text-[10.5px] text-slate-400">بدون لنگرگاه VFB</span>
        )}
        {fly.archived && (
          <Badge className="rounded-full bg-slate-100 px-1.5 py-0 text-[9.5px] text-slate-600 hover:bg-slate-100">
            بایگانی
          </Badge>
        )}
      </span>
    </button>
  );
}

function FlyDetail({
  fly,
  busy,
  onOpenBrain,
  onEdit,
  onArchive,
  onDelete,
  onClose,
}: {
  fly: FlyRow;
  busy: boolean;
  onOpenBrain: (anchor: { id: string; label: string }) => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Genova Fly ID", value: fly.genovaFlyId },
    { label: "گونه", value: fly.species },
    { label: "جنس", value: SEX_LABEL[fly.sex] },
    { label: "سن", value: `${faNum(fly.ageDays)} روز` },
    { label: "وضعیت", value: STATUS_LABEL[fly.status] },
    { label: "ژنوتایپ", value: fly.genotype || "—"},
    { label: "فنوتایپ", value: fly.phenotype || "—"},
    { label: "ساخته‌شده", value: formatJalaliDate(fly.createdAt) },
    { label: "آخرین ویرایش", value: formatJalaliDate(fly.updatedAt) },
  ];

  return (
    <div className={cn(FRAME, "overflow-hidden")}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-900/5 bg-gradient-to-l from-emerald-50/80 to-white px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-700">
            <Bug className="size-3.5" />
            My Laboratory
          </p>
          <h2 className="mt-0.5 text-[17px] font-extrabold tracking-tight text-slate-900">{fly.name}</h2>
          <p dir="ltr" className="mt-0.5 text-left font-mono text-[11px] text-slate-500">
            {fly.genovaFlyId} · {fly.species}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
          title="بستن"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="space-y-5 p-4 sm:p-5">
        {/* Metadata — Genova's own record, never presented as biology. */}
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-700">
              <Dna className="size-3.5 text-emerald-600" />
              مشخصات مگس
            </p>
            <DataKindBadge kind="metadata" />
          </div>
          <dl className="grid gap-1.5 sm:grid-cols-2">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-baseline justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5"
              >
                <dt className="text-[10.5px] text-slate-500">{r.label}</dt>
                <dd className="text-left text-[11.5px] font-medium text-slate-700" dir="auto">
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
          {fly.notes && (
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-[11.5px] leading-6 text-slate-600">
              {fly.notes}
            </p>
          )}
        </section>

        {/* Brain model — real VFB provenance */}
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-700">
              <Brain className="size-3.5 text-emerald-600" />
              مدل مغزی
            </p>
            <DataKindBadge kind="real" />
          </div>

          {fly.brainModel ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-3">
              <p className="text-[12.5px] font-bold text-slate-800">{fly.brainModel.label}</p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5">
                <span dir="ltr" className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[10.5px] text-slate-700">
                  {fly.brainModel.vfbId}
                </span>
                {fly.brainModel.entityType && (
                  <span className="text-[10.5px] text-slate-600">{fly.brainModel.entityType}</span>
                )}
              </p>
              <p className="mt-1.5 text-[10.5px] leading-5 text-slate-500">
                Source: {fly.brainModel.source} · Accessed: {formatJalaliDate(fly.brainModel.accessedAt)}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenBrain({ id: fly.brainModel!.vfbId, label: fly.brainModel!.label })}
                className="mt-3 h-9 gap-1.5 rounded-xl bg-emerald-700 px-3 text-[12px] text-white hover:bg-emerald-800"
              >
                <Brain className="size-3.5" />
                باز کردن مغز
                <ArrowLeft className="size-3.5" />
              </Button>
              <p className="mt-2 text-[10.5px] leading-5 text-emerald-800">
                آناتومی، سلسله‌مراتب، تصاویر، اتصال‌پذیری و ارجاعات این ترم مستقیماً از{" "}
                <a
                  href={VFB_SOURCE.site}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-semibold underline underline-offset-2"
                >
                  {VFB_SOURCE.name}
                </a>{" "}
                خوانده می‌شود؛ چیزی در ژنوا ذخیره یا بازسازی نمی‌شود.
              </p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-emerald-900/10 bg-emerald-50/40 px-3 py-4 text-[11.5px] leading-6 text-slate-500">
              این مگس هنوز به هیکل واقعی در Virtual Fly Brain متصل نشده است. با «ویرایش» یک ترم واقعی (مثلاً{" "}
              <span dir="ltr" className="font-mono text-emerald-700">medulla</span>) را از VFB جست‌وجو و انتخاب
              کنید تا همهٔ داده‌های اعصابی بعدی منشأ مشخص داشته باشند.
            </p>
          )}
        </section>

        {/* Actions */}
        <section className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onEdit}
            className="h-9 gap-1.5 rounded-xl border-emerald-900/10 bg-white text-[12px] text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
          >
            <Pencil className="size-3.5" />
            ویرایش
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onArchive}
            className="h-9 gap-1.5 rounded-xl border-emerald-900/10 bg-white text-[12px] text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
          >
            {fly.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
            {fly.archived ? "بازگردانی" : "بایگانی"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onDelete}
            className="h-9 gap-1.5 rounded-xl border-rose-200 bg-white text-[12px] text-rose-600 hover:border-rose-300"
          >
            <Trash2 className="size-3.5" />
            حذف
          </Button>
        </section>

        {/* Live brain status — real VFB data, read on demand. */}
        {fly.brainModel && <FlyBrainSnapshot fly={fly} onOpenBrain={onOpenBrain} />}

        {/* Fly viewer — simulated behaviour, never presented as biology. */}
        <section className="border-t border-emerald-900/5 pt-4">
          <FlyViewer fly={fly} />
        </section>

        {/* Roadmap — honest about what does not exist yet. */}
        <section className="rounded-xl border border-emerald-900/5 bg-slate-50 px-3 py-3">
          <p className="text-[11.5px] font-bold text-slate-700">مراحل بعدی این مگس</p>
          <ul className="mt-2 space-y-1.5">
            {[
              { icon: FlaskConical, label: "تعریف آزمایش و اتصال محرک به رفتار", tag: "Phase C" },
              { icon: Eye, label: "ثبت مشاهده و نتیجهٔ آزمایش", tag: "Phase D" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label} className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Icon className="size-3.5 shrink-0 text-slate-400" />
                  <span className="flex-1">{item.label}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[9.5px] text-slate-500 ring-1 ring-slate-200">
                    {item.tag}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[10.5px] leading-5 text-slate-500">
            رفتار بالا یک شبیه‌سازی محاسباتی است. تا وقتی مدل علمی واقعی جایگزین نشود، هیچ‌جای سایت به‌عنوان
            دادهٔ تجربی گزارش نخواهد شد.
          </p>
        </section>
      </div>
    </div>
  );
}

// ── Main view ───────────────────────────────────────────────────────────────

export function MyFlies({ onOpenBrain }: { onOpenBrain: (term: { id: string; label: string }) => void }) {
  const { isAuthenticated, isLoading } = useAuth();
  const flies = useQuery(api.virtualFlies.listMyFlies, { includeArchived: true });
  const summary = useQuery(api.virtualFlies.myFlySummary);
  const createMut = useMutation(api.virtualFlies.createFly);
  const updateMut = useMutation(api.virtualFlies.updateFly);
  const archiveMut = useMutation(api.virtualFlies.archiveFly);
  const deleteMut = useMutation(api.virtualFlies.deleteFly);

  const [showArchived, setShowArchived] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "create" | "edit">("idle");
  const [form, setForm] = useState<FlyFormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const all: FlyRow[] = useMemo(() => (flies ?? []) as FlyRow[], [flies]);
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return all
      .filter((f) => showArchived || !f.archived)
      .filter(
        (f) =>
          !q ||
          f.name.toLowerCase().includes(q) ||
          f.genovaFlyId.toLowerCase().includes(q) ||
          (f.genotype ?? "").toLowerCase().includes(q) ||
          (f.brainModel?.label ?? "").toLowerCase().includes(q) ||
          (f.brainModel?.vfbId ?? "").toLowerCase().includes(q),
      );
  }, [all, filter, showArchived]);

  const selected = useMemo(() => all.find((f) => f._id === selectedId) ?? null, [all, selectedId]);

  const startCreate = useCallback(() => {
    setForm(EMPTY_FORM);
    setMode("create");
  }, []);

  const startEdit = useCallback(() => {
    if (!selected) return;
    setForm(formFromFly(selected));
    setMode("edit");
  }, [selected]);

  const cancelForm = useCallback(() => {
    setMode("idle");
    setForm(EMPTY_FORM);
  }, []);

  const save = useCallback(async () => {
    const ageDays = Number.parseInt(form.ageDays, 10);
    if (!Number.isFinite(ageDays) || ageDays < 0) {
      toast.error("سن مگس باید یک عدد صحیح و نامنفی باشد.");
      return;
    }
    setBusy(true);
    const payload = {
      ageDays,
      sex: form.sex,
      status: form.status,
      genotype: form.genotype,
      phenotype: form.phenotype,
      notes: form.notes,
      brainModel: form.anchor
        ? {
            vfbId: form.anchor.vfbId,
            label: form.anchor.label,
            ...(form.anchor.entityType ? { entityType: form.anchor.entityType } : {}),
          }
        : undefined,
    };
    try {
      if (mode === "edit" && selected) {
        await updateMut({ id: selected._id as never, ...payload, name: form.name });
        toast.success("مگس به‌روزرسانی شد");
      } else {
        const id = await createMut({ ...payload, name: form.name || undefined });
        setSelectedId(id);
        toast.success("مگس مجازی ساخته شد");
      }
      cancelForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیرهٔ مگس ناموفق بود");
    } finally {
      setBusy(false);
    }
  }, [form, mode, selected, createMut, updateMut, cancelForm]);

  const toggleArchive = useCallback(async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await archiveMut({ id: selected._id as never, archived: !selected.archived });
      toast.success(selected.archived ? "مگس بازگردانی شد" : "مگس بایگانی شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تغییر وضعیت ناموفق بود");
    } finally {
      setBusy(false);
    }
  }, [selected, archiveMut]);

  const remove = useCallback(async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await deleteMut({ id: selected._id as never });
      setSelectedId(null);
      toast.success("مگس حذف شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حذف ناموفق بود");
    } finally {
      setBusy(false);
    }
  }, [selected, deleteMut]);

  // ── Signed out ────────────────────────────────────────────────────────────
  if (!isLoading && !isAuthenticated) {
    return (
      <div className={cn(FRAME, "p-8 text-center")}>
        <User className="mx-auto size-7 text-emerald-600" />
        <p className="mt-2 text-[13px] font-bold text-slate-800">برای ساخت مگس مجازی وارد شوید</p>
        <p className="mx-auto mt-1 max-w-sm text-[11.5px] leading-6 text-slate-500">
          مگس‌های شما روی حسابتان ذخیره می‌شوند تا بین جلسات ادامه داده شوند. مرورگر شما فقط نسخهٔ محلی را
          نشان می‌دهد.
        </p>
        <Button
          asChild
          size="sm"
          className="mt-3 h-9 rounded-xl bg-emerald-700 px-4 text-[12px] text-white hover:bg-emerald-800"
        >
          <Link to="/auth?returnTo=/lab">ورود به حساب</Link>
        </Button>
      </div>
    );
  }

  const stats = [
    { label: "کل مگس‌ها", value: faNum(summary?.total ?? 0) },
    { label: "فعال", value: faNum(summary?.active ?? 0) },
    { label: "بایگانی‌شده", value: faNum(summary?.archived ?? 0) },
    { label: "متصل به VFB", value: faNum(summary?.anchored ?? 0) },
  ];

  return (
    <section className="space-y-4">
      {/* Header */}
      <header className="relative overflow-hidden rounded-[24px] bg-gradient-to-l from-emerald-900 via-emerald-800 to-teal-700 px-5 py-5 text-white shadow-[0_24px_60px_-30px_rgba(4,47,46,0.7)] sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(110%_120%_at_88%_15%,rgba(45,212,191,0.3),transparent_60%)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold text-emerald-100">
              <Bug className="size-4" />
              My Laboratory
            </p>
            <h2 className="mt-1 text-[20px] font-extrabold tracking-tight">مگس‌های من</h2>
            <p className="mt-1 max-w-lg text-[11.5px] leading-6 text-emerald-50/80">
              هر مگس یک رکورد آزمایشگاهی ژنواست. می‌توانید آن را به یک موجودیت واقعی در Virtual Fly Brain وصل کنید تا
              تمام داده‌های مغزی بعدی — آناتومی، تصاویر، اتصال‌پذیری — از همان منبع خوانده شوند.
            </p>
          </div>
          <div className="flex gap-1.5">
            {stats.map((s) => (
              <span
                key={s.label}
                className="rounded-xl bg-white/12 px-3 py-2 text-center backdrop-blur-sm"
              >
                <span className="block text-[15px] font-extrabold leading-none">{s.value}</span>
                <span className="mt-1 block text-[9.5px] text-emerald-100/80">{s.label}</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className={cn(FRAME, "flex flex-wrap items-center gap-2 p-3")}>
        <Button
          type="button"
          size="sm"
          onClick={() => (mode === "create" ? cancelForm() : startCreate())}
          className="h-9 gap-1.5 rounded-xl bg-emerald-700 px-3 text-[12px] text-white hover:bg-emerald-800"
        >
          {mode === "create" ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {mode === "create" ? "انصراف" : "ساخت مگس جدید"}
        </Button>
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="جست‌وجوی نام، ژنوتایپ یا شناسهٔ VFB"
            className="h-9 pr-8 text-[12px]"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-slate-600">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="size-3.5 accent-emerald-700"
          />
          نمایش بایگانی‌شده
        </label>
      </div>

      {/* Create / edit form */}
      {mode !== "idle" && (
        <div className={cn(FRAME, "space-y-3 p-4 sm:p-5")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-extrabold text-slate-900">
              {mode === "create" ? "ساخت مگس مجازی" : `ویرایش ${selected?.name ?? ""}`}
            </p>
            <DataKindBadge kind="metadata" />
          </div>
          <FlyForm form={form} setForm={setForm} idPrefix={mode === "create" ? "new-fly" : "edit-fly"} />
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={save}
              className="h-9 gap-1.5 rounded-xl bg-emerald-700 px-4 text-[12px] text-white hover:bg-emerald-800"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              {mode === "create" ? "ساخت مگس" : "ذخیرهٔ تغییرات"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={cancelForm}
              className="h-9 rounded-xl border-emerald-900/10 bg-white text-[12px] text-slate-700 hover:border-emerald-300"
            >
              انصراف
            </Button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="space-y-2">
          {flies === undefined && (
            <p className="flex items-center justify-center gap-2 py-10 text-[12px] text-slate-500">
              <Loader2 className="size-4 animate-spin text-emerald-600" />
              در حال بارگذاری مگس‌ها…
            </p>
          )}
          {flies !== undefined && visible.length === 0 && (
            <p className="rounded-2xl border border-dashed border-emerald-900/10 bg-emerald-50/40 px-4 py-8 text-center text-[12px] text-slate-500">
              {all.length === 0
                ? "هنوز مگسی نساخته‌اید. با «ساخت مگس جدید» اولین مگس آزمایشگاه خود را بسازید."
                : "مگسی با این فیلتر پیدا نشد."}
            </p>
          )}
          {visible.map((fly) => (
            <FlyCard
              key={fly._id}
              fly={fly}
              active={fly._id === selectedId}
              onOpen={() => {
                setSelectedId(fly._id);
                if (mode === "edit") cancelForm();
              }}
            />
          ))}
        </div>

        <div>
          {selected ? (
            <FlyDetail
              fly={selected}
              busy={busy}
              onOpenBrain={onOpenBrain}
              onEdit={startEdit}
              onArchive={toggleArchive}
              onDelete={remove}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div
              className={cn(
                FRAME,
                "flex min-h-[260px] flex-col items-center justify-center gap-2 p-8 text-center",
              )}
            >
              <Bug className="size-7 text-emerald-500" />
              <p className="text-[13px] font-bold text-slate-800">یک مگس را انتخاب کنید</p>
              <p className="max-w-md text-[11.5px] leading-6 text-slate-500">
                مشخصات مگز، منشأ دادهٔ اعصابی و دکمهٔ «باز کردن مغز» در این‌جا نمایش داده می‌شود.
              </p>
              <p className="mt-2 text-[10.5px] text-slate-400">
                Metadata = Genova · Brain data ={" "}
                <a
                  href={VFB_SOURCE.site}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-semibold text-emerald-700 hover:underline"
                >
                  {VFB_SOURCE.name}
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default MyFlies;
