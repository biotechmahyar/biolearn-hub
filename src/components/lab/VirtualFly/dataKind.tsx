/**
 * Genova Virtual Lab — data provenance badges
 * ─────────────────────────────────────────────────────────────────────────────
 * The single most important rule of this lab is that a reader can always tell
 * *where a number came from*. These badges make that visible on every block:
 *
 *   REAL DATA        → returned by the Virtual Fly Brain API
 *   GENOVA METADATA  → a Genova-side record about the student's own fly
 *   SIMULATION       → computed by Genova (never experimental data)
 *   OBSERVATION      → recorded by the student
 *   HYPOTHESIS       → a student claim, not a result
 *
 * Keeping this in one file stops the wording from drifting between features.
 */
import { Eye, FlaskConical, PenLine, Sparkles, TestTube2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type DataKind = "real" | "metadata" | "simulation" | "observation" | "hypothesis";

const STYLES: Record<DataKind, { label: string; className: string; icon: typeof TestTube2 }> = {
  real: {
    label: "REAL DATA",
    className: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    icon: FlaskConical,
  },
  metadata: {
    label: "GENOVA METADATA",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
    icon: PenLine,
  },
  simulation: {
    label: "SIMULATION",
    className: "bg-amber-100 text-amber-800 ring-amber-200",
    icon: TestTube2,
  },
  observation: {
    label: "OBSERVATION",
    className: "bg-sky-100 text-sky-800 ring-sky-200",
    icon: Eye,
  },
  hypothesis: {
    label: "HYPOTHESIS",
    className: "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200",
    icon: Sparkles,
  },
};

const TITLES: Record<DataKind, string> = {
  real: "دادهٔ مستقیم از Virtual Fly Brain",
  metadata: "اطلاعات ثبت‌شده در ژنوا دربارهٔ مگس شما (نه دادهٔ VFB)",
  simulation: "خروجی محاسباتی ژنوا — دادهٔ تجربی واقعی نیست",
  observation: "مشاهدهٔ ثبت‌شده توسط دانشجو",
  hypothesis: "فرضیهٔ دانشجو — نتیجهٔ قطعی نیست",
};

export function DataKindBadge({ kind, className }: { kind: DataKind; className?: string }) {
  const style = STYLES[kind];
  const Icon = style.icon;
  return (
    <span
      title={TITLES[kind]}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold tracking-wide ring-1",
        style.className,
        className,
      )}
    >
      <Icon className="size-2.5" />
      {style.label}
    </span>
  );
}
