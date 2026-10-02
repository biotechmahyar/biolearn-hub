/**
 * Genova Virtual Lab — shared UI for the protein / codon tools
 * ─────────────────────────────────────────────────────────────────────────────
 * The four tools in this folder all need the same handful of pieces: a sequence
 * input with a validation state, a compact bar chart, download buttons and a
 * small stat row. They live here so the wording and the styling stay identical
 * between tools instead of drifting.
 */
import { useMemo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ClipboardCopy, Download, FlaskConical, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const UTF8_BOM = "\uFEFF";

export function downloadFile(content: string, filename: string, mime = "text/plain") {
  const blob = new Blob([UTF8_BOM + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  downloadFile(csv, filename, "text/csv");
}

/** RTL-friendly wrapper: the panel keeps the app's light emerald lab theme. */
export function ToolShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-black tracking-tight text-slate-800">
          <FlaskConical className="size-4 text-emerald-600" />
          {title}
        </h3>
        <p className="text-[11.5px] leading-6 text-slate-500">{subtitle}</p>
      </header>
      {children}
    </div>
  );
}

export function SeqInput({
  value,
  onChange,
  placeholder,
  valid,
  expected,
  invalidMessage,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  valid: boolean;
  expected: string;
  invalidMessage: string;
}) {
  const length = value.length;
  return (
    <div className="space-y-1.5">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir="ltr"
        spellCheck={false}
        className="min-h-[96px] font-mono text-[12.5px] leading-6"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
        <span dir="ltr" className="text-slate-400">
          {expected} · {length.toLocaleString("fa-IR")} نوکلئوتید
        </span>
        {length > 0 && (
          <span className={cn("font-semibold", valid ? "text-emerald-600" : "text-amber-600")}>
            {valid ? "توالی معتبر است" : invalidMessage}
          </span>
        )}
      </div>
    </div>
  );
}

export function ResultBlock({ title, badge, children }: { title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-emerald-900/5 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-black text-emerald-700">{title}</h4>
        {badge}
      </div>
      {children}
    </section>
  );
}

export function KV({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-900/5">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p dir="ltr" className="mt-0.5 text-left font-mono text-[12.5px] font-bold text-slate-800">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[9.5px] text-slate-400">{hint}</p>}
    </div>
  );
}

export function CopyBtn({ text, label = "کپی" }: { text: string; label?: string }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 gap-1 text-[11px]"
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast.success("کپی شد");
      }}
    >
      <ClipboardCopy className="size-3" />
      {label}
    </Button>
  );
}

export function DownloadBtn({
  content,
  filename,
  mime,
  label = "دانلود TXT",
}: {
  content: string;
  filename: string;
  mime?: string;
  label?: string;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 gap-1 text-[11px]"
      onClick={() => {
        downloadFile(content, filename, mime);
        toast.success("فایل دانلود شد");
      }}
    >
      <Download className="size-3" />
      {label}
    </Button>
  );
}

export function DownloadCsvBtn({
  headers,
  rows,
  filename,
}: {
  headers: string[];
  rows: (string | number)[][];
  filename: string;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 gap-1 text-[11px]"
      onClick={() => {
        downloadCsv(headers, rows, filename);
        toast.success("فایل CSV دانلود شد");
      }}
    >
      <Download className="size-3" />
      دانلود CSV
    </Button>
  );
}

export function SaveResultBtn({
  onSave,
  busy,
}: {
  onSave: () => Promise<void> | void;
  busy?: boolean;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 gap-1 text-[11px]"
      disabled={busy}
      onClick={() => void onSave()}
    >
      <Save className="size-3" />
      ذخیره در آزمایشگاه
    </Button>
  );
}

/**
 * Compact bar chart. Matches the visual language of the other lab tools and
 * animates bars in on mount.
 */
export function MiniBar({
  data,
  color = "#059669",
  height = 150,
}: {
  data: { label: string; value: number; caption?: string }[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const labelH = 30;
  const barMax = height - labelH;
  if (data.length === 0) return null;
  return (
    <div className="w-full px-1">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d) => {
          const h = Math.max((d.value / max) * barMax, 3);
          return (
            <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="font-mono text-[10px] font-bold" style={{ color }} dir="ltr">
                {d.value}
              </span>
              <div className="flex w-full flex-1 items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: h }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  title={`${d.label}: ${d.value}`}
                  className="w-full rounded-t-md"
                  style={{ background: `linear-gradient(to top, ${color}33, ${color})` }}
                />
              </div>
              <span
                dir="ltr"
                className="w-full truncate text-center font-mono text-[9px] text-slate-500"
              >
                {d.caption ?? d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Small table helper — keeps column styling identical across all four tools. */
export function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="max-h-[320px] overflow-auto rounded-xl ring-1 ring-emerald-900/5">
      <table className="w-full border-collapse text-[11px]">
        <thead className="sticky top-0 bg-white">
          <tr className="bg-emerald-50/80">
            {headers.map((h) => (
              <th
                key={h}
                className="border-b border-emerald-900/10 px-2.5 py-2 text-right font-bold text-emerald-800"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return (
    <td
      dir={mono ? "ltr" : undefined}
      className={cn(
        "border-b border-emerald-900/5 px-2.5 py-1.5 text-slate-700",
        mono && "text-left font-mono",
      )}
    >
      {children}
    </td>
  );
}

/** Persian digit formatting consistent with the rest of the lab. */
export function pct(value: number): string {
  return `${value.toFixed(2).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}٪`;
}

export function useSortedCodonBars<T extends { count: number; codon: string }>(rows: T[], limit = 21) {
  return useMemo(
    () => [...rows].sort((a, b) => b.count - a.count || a.codon.localeCompare(b.codon)).slice(0, limit),
    [rows, limit],
  );
}