/**
 * Genova Virtual Lab — sequence format converters
 * ───────────────────────────────────────────────
 * Three converters in the «تبدیل فرمت» group:
 *
 *   • FASTA ↔ CSV
 *   • FASTA ↔ JSON
 *   • FASTA ↔ GenBank
 *
 * They all share one component because they share one pipeline: parse →
 * (optional validation) → serialise. Only the format pair and the format
 * specific options differ.
 *
 * Two rules the shared component enforces:
 *   • Nothing is uploaded. Files are read with the FileReader API in the page.
 *   • Nothing is dropped silently. Records that fail validation are listed by
 *     id, and every warning is shown, so a conversion cannot quietly lose data.
 */
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation } from "convex/react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileUp,
  RotateCcw,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DataTable, KV, MiniBar, ResultBlock, SaveResultBtn, Td, ToolShell } from "./proteinUi";
import {
  parseFormat,
  toCsv,
  toFasta,
  toGenBank,
  toJson,
  validateSequence,
  type Alphabet,
  type Format,
  type SequenceRecord,
} from "./formatCore";

const FORMAT_LABEL: Record<Format, string> = {
  fasta: "FASTA",
  csv: "CSV",
  json: "JSON",
  genbank: "GenBank",
};

// ── Drop zone ───────────────────────────────────────────────────────────────

function FileDrop({
  accept,
  onText,
  hint,
}: {
  accept: string;
  onText: (text: string, name: string) => void;
  hint: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const read = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      file
        .text()
        .then((t) => onText(t, file.name))
        .catch(() => toast.error("خواندن فایل ممکن نشد"));
    },
    [onText],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        read(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
        over ? "border-emerald-400 bg-emerald-50" : "border-emerald-900/15 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40",
      )}
    >
      <FileUp className="size-5 text-emerald-600" />
      <p className="text-[11.5px] font-semibold text-slate-600">
        برای آپلود فایل کلیک کنید یا فایل را بکشید و رها کنید
      </p>
      <p className="text-[10px] text-slate-400">فرمت‌های مجاز: {accept}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          read(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <span className="sr-only">{hint}</span>
    </div>
  );
}

// ── Shared converter ────────────────────────────────────────────────────────

interface ConverterProps {
  title: string;
  subtitle: string;
  directions: { from: Format; to: Format }[];
  accept: Partial<Record<Format, string>>;
  placeholders: Partial<Record<Format, string>>;
  options: (
    state: OptionsState,
    set: (updater: (prev: OptionsState) => OptionsState) => void,
  ) => ReactNode;
  build: (records: SequenceRecord[], state: OptionsState, to: Format) => string;
  extension: Record<Format, string>;
}

interface OptionsState {
  header: boolean;
  delimiter: string;
  pretty: boolean;
  validate: boolean;
  alphabet: Alphabet;
  includeFeatures: boolean;
  includeDescription: boolean;
  locusId: string;
}

const DEFAULT_OPTIONS: OptionsState = {
  header: true,
  delimiter: ",",
  pretty: true,
  validate: true,
  alphabet: "dna",
  includeFeatures: true,
  includeDescription: false,
  locusId: "",
};

function SequenceConverter(props: ConverterProps) {
  const [direction, setDirection] = useState(props.directions[0]);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [options, setOptions] = useState<OptionsState>(DEFAULT_OPTIONS);
  const { isAuthenticated } = useAuth();
  const addNote = useMutation(api.lab.addNote);

  const { from, to } = direction;

  const parsed = useMemo(() => (text.trim() ? parseFormat(from, text) : null), [from, text]);

  const { kept, rejected } = useMemo(() => {
    if (!parsed) return { kept: [] as SequenceRecord[], rejected: [] as { id: string; reason: string }[] };
    if (!options.validate) return { kept: parsed.records, rejected: [] };
    const ok: SequenceRecord[] = [];
    const bad: { id: string; reason: string }[] = [];
    for (const r of parsed.records) {
      const v = validateSequence(r.sequence, options.alphabet);
      if (v.ok) ok.push(r);
      else bad.push({ id: r.id, reason: v.reason ?? "نامعتبر" });
    }
    return { kept: ok, rejected: bad };
  }, [parsed, options.validate, options.alphabet]);

  const output = useMemo(() => {
    if (kept.length === 0) return "";
    return props.build(kept, options, to);
    // `props` is a module-scope constant for all three tools, so this only
    // recomputes when the records, options or target format actually change.
  }, [kept, options, to, props]);

  const lengthBars = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0];
    for (const r of kept) {
      const len = r.sequence.length;
      if (len === 0) buckets[4] += 1;
      else if (len < 100) buckets[0] += 1;
      else if (len < 500) buckets[1] += 1;
      else if (len < 2000) buckets[2] += 1;
      else buckets[3] += 1;
    }
    return [
      { label: "<100", value: buckets[0], caption: "<100" },
      { label: "100-500", value: buckets[1], caption: "100-500" },
      { label: "500-2k", value: buckets[2], caption: "500-2k" },
      { label: "≥2k", value: buckets[3], caption: "2k+" },
      { label: "خالی", value: buckets[4], caption: "خالی" },
    ];
  }, [kept]);

  const save = async () => {
    if (!isAuthenticated) {
      toast.error("برای ذخیره ابتدا وارد حساب شوید.");
      return;
    }
    if (!parsed || kept.length === 0) return;
    try {
      const preview = kept.slice(0, 10).map((r) => `- ${r.id} (${r.sequence.length.toLocaleString("fa-IR")} نوکلئوتید)`);
      await addNote({
        title: `تبدیل ${FORMAT_LABEL[from]} به ${FORMAT_LABEL[to]}`,
        body: [
          `جهت: ${FORMAT_LABEL[from]} ← ${FORMAT_LABEL[to]}`,
          `رکورد خوانده‌شده: ${parsed.records.length}`,
          `رکورد معتبر: ${kept.length}`,
          `رکورد ردشده: ${rejected.length}`,
          `مجموع نوکلئوتید: ${kept.reduce((a, r) => a + r.sequence.length, 0)}`,
          `اعتبارسنجی: ${options.validate ? "فعال" : "غیرفعال"}`,
          "",
          "نمونهٔ رکوردها:",
          ...preview,
        ].join("\n"),
        tags: ["lab", "format"],
      });
      toast.success("نتیجه در دفترچهٔ آزمایشگاه ذخیره شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    }
  };

  const optionsPanel = <div className="space-y-2">{props.options(options, setOptions)}</div>;

  const reset = () => {
    setText("");
    setFileName(null);
    setOptions(DEFAULT_OPTIONS);
  };

  return (
    <ToolShell title={props.title} subtitle={props.subtitle}>
      {/* Direction switch */}
      <div className="flex flex-wrap gap-1.5">
        {props.directions.map((d) => (
          <button
            key={`${d.from}-${d.to}`}
            type="button"
            onClick={() => setDirection(d)}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
              d.from === from
                ? "bg-emerald-700 text-white"
                : "bg-white text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50",
            )}
          >
            {FORMAT_LABEL[d.from]}
            <ArrowLeftRight className="size-3" />
            {FORMAT_LABEL[d.to]}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-slate-700">ورودی {FORMAT_LABEL[from]}:</p>
        <FileDrop
          accept={props.accept[from] ?? ".txt"}
          hint="بارگذاری فایل"
          onText={(t, name) => {
            setText(t);
            setFileName(name);
          }}
        />
        <p className="text-center text-[10px] text-slate-400">— یا —</p>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFileName(null);
          }}
          dir="ltr"
          spellCheck={false}
          rows={7}
          placeholder={props.placeholders[from] ?? ""}
          className="w-full resize-y rounded-xl border border-emerald-900/10 bg-white p-3 font-mono text-[11.5px] leading-6 outline-none focus:border-emerald-300"
        />
        {fileName && <p className="text-[10px] text-emerald-600">فایل بارگذاری‌شده: {fileName}</p>}
      </div>

      {/* Format-specific options */}
      {optionsPanel}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!output) {
              toast.error("چیزی برای تبدیل وجود ندارد");
              return;
            }
            toast.success(`تبدیل انجام شد — ${kept.length} رکورد`);
          }}
          className="h-9 cursor-pointer rounded-xl bg-emerald-700 px-4 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          تبدیل کن
        </button>
        <button
          type="button"
          disabled={!output}
          onClick={() => {
            navigator.clipboard.writeText(output);
            toast.success("در حافظه کپی شد");
          }}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 text-[11.5px] font-semibold text-slate-600 ring-1 ring-emerald-900/10 disabled:opacity-40"
        >
          <ClipboardCopy className="size-3.5" />
          کپی نتیجه
        </button>
        <button
          type="button"
          disabled={!output}
          onClick={() => {
            // BOM so Excel opens the downloaded FASTA/CSV in UTF-8 instead of mojibake.
            const blob = new Blob(["﻿" + output], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `converted.${props.extension[to]}`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("فایل دانلود شد");
          }}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 text-[11.5px] font-semibold text-slate-600 ring-1 ring-emerald-900/10 disabled:opacity-40"
        >
          <Download className="size-3.5" />
          دانلود فایل
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-[11.5px] text-slate-500 hover:bg-slate-50"
        >
          <RotateCcw className="size-3.5" />
          بازنشانی
        </button>
        {kept.length > 0 && <SaveResultBtn onSave={save} />}
      </div>

      {/* Parsing feedback */}
      {parsed && (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <KV label="رکورد ورودی" value={String(parsed.records.length)} />
            <KV label="رکورد معتبر" value={String(kept.length)} />
            <KV label="رکورد ردشده" value={String(rejected.length)} />
            <KV
              label="مجموع نوکلئوتید"
              value={kept.reduce((a, r) => a + r.sequence.length, 0).toLocaleString("fa-IR")}
            />
          </div>

          {rejected.length > 0 && (
            <div className="rounded-xl bg-rose-50 px-3 py-2.5 ring-1 ring-rose-200">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-rose-700">
                <AlertTriangle className="size-3.5" />
                {rejected.length} رکورد به‌دلیل اعتبارسنجی کنار گذاشته شد
              </p>
              <ul className="max-h-32 space-y-0.5 overflow-auto text-[10px] text-rose-700">
                {rejected.slice(0, 40).map((r) => (
                  <li key={r.id}>
                    · <span dir="ltr" className="font-mono">{r.id}</span> — {r.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.warnings.length > 0 && (
            <div className="rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-amber-800">
                هشدارهای تبدیل
              </p>
              <ul className="max-h-32 space-y-0.5 overflow-auto text-[10px] text-amber-700">
                {parsed.warnings.slice(0, 40).map((w, i) => (
                  <li key={i}>· {w}</li>
                ))}
              </ul>
            </div>
          )}

          {kept.length > 0 && (
            <ResultBlock title="توزیع طول رکوردها" badge={<MiniBar data={lengthBars} color="#047857" height={120} />}>
              <p className="text-[10.5px] text-slate-500">
                طول بر حسب نوکلئوتید (<span className="font-mono">nt</span>).
              </p>
            </ResultBlock>
          )}
        </div>
      )}

      {/* Output */}
      {output && (
        <>
          <ResultBlock
            title={`خروجی ${FORMAT_LABEL[to]}`}
            badge={
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-bold text-emerald-800">
                <CheckCircle2 className="size-2.5" />
                {kept.length} رکورد
              </span>
            }
          >
            <textarea
              value={output}
              readOnly
              dir="ltr"
              spellCheck={false}
              rows={12}
              className="w-full resize-y rounded-xl border border-emerald-900/10 bg-white p-3 font-mono text-[11px] leading-5 outline-none"
            />
          </ResultBlock>

          <ResultBlock title="فهرست رکوردهای تبدیل‌شده">
            <DataTable headers={["#", "شناسه", "توضیح", "طول"]}>
              {kept.slice(0, 200).map((r, i) => (
                <tr key={`${r.id}-${i}`} className="hover:bg-emerald-50/50">
                  <Td>{(i + 1).toLocaleString("fa-IR")}</Td>
                  <Td mono>{r.id}</Td>
                  <Td>{r.description || "—"}</Td>
                  <Td mono>{r.sequence.length.toLocaleString("fa-IR")}</Td>
                </tr>
              ))}
            </DataTable>
          </ResultBlock>
        </>
      )}

      {!text.trim() && (
        <p className="rounded-2xl border border-dashed border-emerald-900/10 bg-emerald-50/40 px-4 py-6 text-center text-[12px] text-slate-500">
          یک فایل بارگذاری کنید یا متن را در کادر بگذارید.
        </p>
      )}
    </ToolShell>
  );
}

// ── Shared option pickers ───────────────────────────────────────────────────

function OptionRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 px-3 py-2.5">{children}</div>;
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] text-slate-500">{label}</p>
      <div className="flex gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
              value === o.value
                ? "bg-emerald-700 text-white"
                : "bg-white text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Flag({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-white px-2.5 text-[11px] font-semibold text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50"
    >
      <span
        className={cn(
          "flex size-3.5 items-center justify-center rounded-[5px] text-[9px] leading-none",
          checked ? "bg-emerald-600 text-white" : "ring-1 ring-slate-300",
        )}
      >
        {checked && "✓"}
      </span>
      {label}
    </button>
  );
}

/**
 * Which alphabet the validator checks against. This has to be explicit:
 * "sequence" means nucleotides in a .fna and amino acids in a .faa, and the
 * default (DNA) would otherwise reject every protein file.
 */
function AlphabetPicker({ value, onChange }: { value: Alphabet; onChange: (next: Alphabet) => void }) {
  return (
    <Choice
      label="الفبای توالی"
      value={value}
      options={[
        { value: "dna", label: "DNA" },
        { value: "rna", label: "RNA" },
        { value: "protein", label: "پروتئین" },
        { value: "any", label: "بدون بررسی" },
      ]}
      onChange={(v) => onChange(v as Alphabet)}
    />
  );
}

const EXTENSIONS: Record<Format, string> = { csv: "csv", fasta: "fasta", json: "json", genbank: "gb" };

// ── Tool 1 · FASTA ↔ CSV ────────────────────────────────────────────────────
//
// The three configs below live at module scope on purpose: a config built
// inside the component would be a fresh object on every render, which would
// invalidate the serialisation memo in `SequenceConverter` on every keystroke.

const CSV_CONFIG: ConverterProps = {
  title: "تبدیل FASTA ↔ CSV",
  subtitle:
    "رکوردهای FASTA را به سطرهای CSV و برعکس تبدیل می‌کند؛ ستون توالی با هدر sequence یا seq شناسایی می‌شود.",
  directions: [
    { from: "fasta", to: "csv" },
    { from: "csv", to: "fasta" },
  ],
  accept: { fasta: ".fasta, .fa, .fna, .faa, .txt", csv: ".csv, .txt" },
  extension: EXTENSIONS,
  placeholders: {
    fasta:
      ">seq1\nATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAAATCTTAGAG\n>seq2\nATGGAGGAGCCGCAGTCAGATCCTAGCGTCGAGCCCCCTCTGAGTCAGGAAACATTTTCAGACCTATGG",
    csv: "ID,Sequence\nseq1,ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAA\nseq2,ATGGAGGAGCCGCAGTCAGATCCTAGCGTCGAGCC",
  },
  options: (o, set) => (
    <OptionRow>
      <Choice
        label="هدر CSV"
        value={o.header ? "yes" : "no"}
        options={[
          { value: "yes", label: "با هدر (ID,Sequence)" },
          { value: "no", label: "بدون هدر" },
        ]}
        onChange={(v) => set((p) => ({ ...p, header: v === "yes" }))}
      />
      <Choice
        label="جداکننده"
        value={o.delimiter}
        options={[
          { value: ",", label: "کاما (,)" },
          { value: ";", label: "سمی‌کالن (;)" },
          { value: "\t", label: "تب (Tab)" },
        ]}
        onChange={(v) => set((p) => ({ ...p, delimiter: v }))}
      />
      <Flag
        label="ستون توضیح"
        checked={o.includeDescription}
        onChange={(v) => set((p) => ({ ...p, includeDescription: v }))}
      />
      <Flag
        label="اعتبارسنجی توالی"
        checked={o.validate}
        onChange={(v) => set((p) => ({ ...p, validate: v }))}
      />
      <AlphabetPicker value={o.alphabet} onChange={(v) => set((p) => ({ ...p, alphabet: v }))} />
    </OptionRow>
  ),
  build: (records, o, to) =>
    to === "fasta"
      ? toFasta(records)
      : toCsv(records, {
          header: o.header,
          delimiter: o.delimiter,
          includeDescription: o.includeDescription,
        }),
};

export function FastaCsvTool() {
  return <SequenceConverter {...CSV_CONFIG} />;
}

// ── Tool 2 · FASTA ↔ JSON ───────────────────────────────────────────────────

const JSON_CONFIG: ConverterProps = {
  title: "تبدیل FASTA ↔ JSON",
  subtitle: "رکوردهای FASTA را به آرایهٔ JSON با کلیدهای id و sequence و برعکس تبدیل می‌کند.",
  directions: [
    { from: "fasta", to: "json" },
    { from: "json", to: "fasta" },
  ],
  accept: { fasta: ".fasta, .fa, .fna, .faa, .txt", json: ".json, .txt" },
  extension: EXTENSIONS,
  placeholders: {
    fasta: ">seq1\nATGCGTACGTAGCTAGCT",
    json: '[\n  {\n    "id": "seq1",\n    "sequence": "ATGCGTACGTAGCTAGCT"\n  }\n]',
  },
  options: (o, set) => (
    <OptionRow>
      <Choice
        label="قالب JSON"
        value={o.pretty ? "pretty" : "min"}
        options={[
          { value: "pretty", label: "Pretty (خوانا)" },
          { value: "min", label: "فشرده" },
        ]}
        onChange={(v) => set((p) => ({ ...p, pretty: v === "pretty" }))}
      />
      <Flag
        label="اعتبارسنجی توالی (پیشنهادی)"
        checked={o.validate}
        onChange={(v) => set((p) => ({ ...p, validate: v }))}
      />
      <AlphabetPicker value={o.alphabet} onChange={(v) => set((p) => ({ ...p, alphabet: v }))} />
    </OptionRow>
  ),
  build: (records, o, to) => (to === "fasta" ? toFasta(records) : toJson(records, o.pretty)),
};

export function FastaJsonTool() {
  return <SequenceConverter {...JSON_CONFIG} />;
}

// ── Tool 3 · FASTA ↔ GenBank ────────────────────────────────────────────────

const GENBANK_CONFIG: ConverterProps = {
  title: "تبدیل FASTA ↔ GenBank",
  subtitle:
    "رکوردهای FASTA را به فرمت فلت GenBank با بلوک FEATURES و ORIGIN و برعکس تبدیل می‌کند.",
  directions: [
    { from: "fasta", to: "genbank" },
    { from: "genbank", to: "fasta" },
  ],
  accept: { fasta: ".fasta, .fa, .fna, .faa, .txt", genbank: ".gb, .gbk, .genbank, .txt" },
  extension: EXTENSIONS,
  placeholders: {
    fasta: ">seq1\nATGCGTACGTAGCTAGCTTACGGCATCGATCGATT",
    genbank: [
      "LOCUS       seq1                 300 bp    DNA    linear   UNK 01-JAN-2025",
      "DEFINITION  Sample sequence.",
      "ACCESSION   SEQ001",
      "VERSION     SEQ001.1",
      "KEYWORDS    .",
      "SOURCE      Homo sapiens",
      "  ORGANISM  Homo sapiens",
      "            Eukaryota; Metazoa; Chordata; Mammalia; Primates; Hominidae; Homo.",
      "FEATURES             Location/Qualifiers",
      "     source          1..300",
      "                     /organism=",
      "ORIGIN",
      "        1 atggatttat ctgctcttcg cgttgaagaa gtacaaaatg tcattaatgc",
      "//",
    ].join("\n"),
  },
  options: (o, set) => (
    <OptionRow>
      <Choice
        label="قالب خروجی"
        value={o.includeFeatures ? "full" : "minimal"}
        options={[
          { value: "full", label: "کامل (با Features)" },
          { value: "minimal", label: "حداقلی" },
        ]}
        onChange={(v) => set((p) => ({ ...p, includeFeatures: v === "full" }))}
      />
      <div>
        <p className="mb-1 text-[10px] text-slate-500">شناسهٔ دستی LOCUS (اختیاری)</p>
        <input
          value={o.locusId}
          onChange={(e) => set((p) => ({ ...p, locusId: e.target.value }))}
          dir="ltr"
          placeholder="LOCUS ID"
          className="h-8 w-40 rounded-lg bg-white px-2 font-mono text-[11px] outline-none ring-1 ring-emerald-900/10"
        />
      </div>
      <Flag
        label="اعتبارسنجی توالی"
        checked={o.validate}
        onChange={(v) => set((p) => ({ ...p, validate: v }))}
      />
      <AlphabetPicker value={o.alphabet} onChange={(v) => set((p) => ({ ...p, alphabet: v }))} />
    </OptionRow>
  ),
  build: (records, o, to) =>
    to === "fasta"
      ? toFasta(records)
      : toGenBank(records, { includeFeatures: o.includeFeatures, locusId: o.locusId.trim() }),
};

export function FastaGenBankTool() {
  return <SequenceConverter {...GENBANK_CONFIG} />;
}