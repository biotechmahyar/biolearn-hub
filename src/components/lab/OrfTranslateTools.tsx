/**
 * Genova Virtual Lab — ORF Finder & translation
 * ─────────────────────────────────────────────────────────────────────────────
 * Two tools that only need the standard genetic code:
 *
 *   • ORF Finder — scans all six frames and reports every open reading frame
 *     that reaches the minimum length, with the translated protein.
 *   • DNA → Protein — translates one reading frame of one strand, with a
 *     codon-by-codon table.
 *
 * Neither tool invents anything: every codon comes from `proteinCore.ts`, and an
 * ORF that runs off the end of the sequence is reported as incomplete rather
 * than being padded or closed artificially.
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileSearch, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CopyBtn,
  DataTable,
  DownloadBtn,
  KV,
  MiniBar,
  ResultBlock,
  SeqInput,
  Td,
  ToolShell,
} from "./proteinUi";
import {
  cleanDna,
  findOrfs,
  fastaWrap,
  translate,
  DEFAULT_ORF_OPTIONS,
  type Orf,
} from "./proteinCore";

// ── Shared controls ─────────────────────────────────────────────────────────

const FRAME_OPTIONS = [1, 2, 3] as const;

export function FramePicker({
  value,
  onChange,
}: {
  value: 1 | 2 | 3;
  onChange: (next: 1 | 2 | 3) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {FRAME_OPTIONS.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          className={
            value === f
              ? "rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white"
              : "rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50"
          }
        >
          چارچوب {f.toLocaleString("fa-IR")} ({f > 0 ? "+" : ""}
          {f.toLocaleString("fa-IR")})
        </button>
      ))}
    </div>
  );
}

function StrandPicker({
  value,
  onChange,
}: {
  value: "+" | "-";
  onChange: (next: "+" | "-") => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {(["+", "-"] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={
            value === s
              ? "rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white"
              : "rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50"
          }
        >
          رشتهٔ {s === "+" ? "مثبت" : "منفی"} ({s})
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50"
    >
      <span
        className={
          checked
            ? "flex size-3.5 items-center justify-center rounded-[5px] bg-emerald-600 text-white"
            : "size-3.5 rounded-[5px] ring-1 ring-slate-300"
        }
      >
        {checked && <span className="text-[9px] leading-none">✓</span>}
      </span>
      {label}
    </button>
  );
}

// ── 1. ORF FINDER ───────────────────────────────────────────────────────────

export function OrfFinderTool() {
  const [input, setInput] = useState("");
  const [minAa, setMinAa] = useState(String(DEFAULT_ORF_OPTIONS.minAa));
  const [altStarts, setAltStarts] = useState(DEFAULT_ORF_OPTIONS.allowAltStarts);
  const [bothStrands, setBothStrands] = useState(DEFAULT_ORF_OPTIONS.bothStrands);
  const [openId, setOpenId] = useState<string | null>(null);

  const dna = useMemo(() => cleanDna(input), [input]);
  const valid = dna.length > 0 && dna.length === input.replace(/\s/g, "").length;
  const minValue = Math.max(1, Number.parseInt(minAa, 10) || 1);

  const orfs: Orf[] = useMemo(
    () =>
      dna.length >= 3
        ? findOrfs(dna, { minAa: minValue, allowAltStarts: altStarts, bothStrands })
        : [],
    [dna, minValue, altStarts, bothStrands],
  );

  const longest = orfs[0] ?? null;
  const fasta = useMemo(() => {
    const header =
      longest
        ? `>ORF1 ${longest.strand}${longest.frame} ${longest.start}-${longest.end} aa=${longest.aaLength}`
        : ">no_orf_found";
    return `${header}\n${fastaWrap(longest ? longest.dna : "")}\n`;
  }, [longest]);

  const report = useMemo(() => {
    const lines = [
      "ORF Finder — Genova Virtual Lab",
      "──────────────────────────────",
      `طول توالی ورودی: ${dna.length} bp`,
      `حداقل طول ORF: ${minValue} اسید آمینه`,
      `کدون شروع جایگزین (GTG/TTG): ${altStarts ? "فعال" : "غیرفعال"}`,
      `رشته‌های بررسی‌شده: ${bothStrands ? "مثبت و منفی" : "فقط مثبت"}`,
      `تعداد ORF یافت‌شده: ${orfs.length}`,
      "",
      "id | strand | frame | start | end | nt | aa | complete",
      ...orfs.map(
        (o) =>
          `${o.id} | ${o.strand} | ${o.frame} | ${o.start} | ${o.end} | ${o.ntLength} | ${o.aaLength} | ${o.complete}`,
      ),
      "",
      ...orfs.flatMap((o) => [
        `--- ${o.id} ---`,
        `start_codon: ${o.startCodon}`,
        `stop_codon: ${o.stopCodon ?? "none (incomplete)"}`,
        `protein (${o.aaLength} aa):`,
        o.protein,
        "",
      ]),
      "روش: جدول کد ژنتیکی استاندارد (translation table 1). هیچ داده‌ای از بیرون افزوده نشده است.",
    ];
    return lines.join("\n");
  }, [dna.length, minValue, altStarts, bothStrands, orfs]);

  return (
    <ToolShell
      title="یابندهٔ چارچوب باز (ORF Finder)"
      subtitle="هر شش چارچوب خواند را می‌گردد و هر ORF را که به کدون پایان می‌رسد و به حداقل طول برسد، با ترجمهٔ پروتئینی‌اش گزارش می‌کند."
    >
      <div className="space-y-3">
        <SeqInput
          value={input}
          onChange={setInput}
          placeholder="مثال: ATGCCGTAAGCTTGCATGC..."
          valid={valid}
          expected="فقط A/T/G/C"
          invalidMessage="توالی فقط باید شامل A، T، G و C باشد"
        />

        <div className="flex flex-wrap items-end gap-2">
          <label className="block w-32">
            <span className="mb-1 block text-[10.5px] text-slate-500">حداقل طول ORF (aa)</span>
            <Input
              type="number"
              min={1}
              value={minAa}
              onChange={(e) => setMinAa(e.target.value)}
              className="h-9 text-[12px]"
            />
          </label>
          <Toggle checked={bothStrands} onChange={setBothStrands} label="بررسی هر دو رشته" />
          <Toggle
            checked={altStarts}
            onChange={setAltStarts}
            label="پذیرش GTG/TTG به‌عنوان شروع"
          />
        </div>

        {dna.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled
              className="h-9 gap-1.5 rounded-xl bg-emerald-700 px-3 text-[12px] text-white opacity-90"
            >
              <FileSearch className="size-3.5" />
              نتیجه زنده محاسبه می‌شود
            </Button>
            <CopyBtn text={fasta} label="کپی FASTA" />
            <DownloadBtn content={report} filename="orf-finder-report.txt" />
            <DownloadBtn content={fasta} filename="orf.fasta" label="دانلود FASTA" />
            <span className="text-[11px] text-slate-500">
              {orfs.length.toLocaleString("fa-IR")} ORF یافت شد
            </span>
          </div>
        )}
      </div>

      {dna.length >= 3 && orfs.length === 0 && (
        <p className="rounded-2xl border border-dashed border-emerald-900/10 bg-emerald-50/40 px-4 py-6 text-center text-[12px] leading-6 text-slate-500">
          با این حداقل طول، هیچ ORF کاملی پیدا نشد. اگر توالی شما کدک‌های پایان ندارد، هیچ چارچوب بازی
          بسته‌ای وجود ندارد — ژنوا برای شما کدون پایان نمی‌سازد.
        </p>
      )}

      {orfs.length > 0 && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <KV label="تعداد ORF" value={String(orfs.length)} />
            <KV label="بلندترین ORF" value={longest ? `${longest.aaLength} aa` : "—"} />
            <KV label="طول کل توالی" value={`${dna.length} bp`} />
            <KV
              label="ORF کامل (دارای کدون پایان)"
              value={String(orfs.filter((o) => o.complete).length)}
              hint="بدون کدون پایان یعنی توالی ناقص است"
            />
          </div>

          <ResultBlock title="نمودار طول ORFها (بر حسب اسید آمینه)">
            <MiniBar
              data={orfs.slice(0, 20).map((o) => ({ label: o.id, value: o.aaLength }))}
              color="#0d9488"
            />
          </ResultBlock>

          <ResultBlock title="فهرست ORFها">
            <DataTable headers={["شناسه", "رشته", "فریم", "شروع", "پایان", "bp", "aa", "کامل؟"]}>
              {orfs.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setOpenId(openId === o.id ? null : o.id)}
                  className="cursor-pointer transition-colors hover:bg-emerald-50/60"
                >
                  <Td mono>{o.id}</Td>
                  <Td mono>{o.strand}</Td>
                  <Td>{o.frame.toLocaleString("fa-IR")}</Td>
                  <Td mono>{o.start}</Td>
                  <Td mono>{o.end}</Td>
                  <Td mono>{o.ntLength}</Td>
                  <Td mono>{o.aaLength}</Td>
                  <Td>{o.complete ? "بله" : "ناقص"}</Td>
                </tr>
              ))}
            </DataTable>

            {openId && orfs.some((o) => o.id === openId) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-emerald-900/5"
              >
                {(() => {
                  const o = orfs.find((x) => x.id === openId)!;
                  return (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] font-bold text-emerald-700">
                          ترجمهٔ {o.id} — {o.aaLength.toLocaleString("fa-IR")} اسید آمینه
                        </p>
                        <CopyBtn text={o.protein} label="کپی پروتئین" />
                      </div>
                      <p className="text-[10px] text-slate-500">
                        کدون شروع: <span dir="ltr" className="font-mono">{o.startCodon}</span> · کدون پایان:{" "}
                        <span dir="ltr" className="font-mono">{o.stopCodon ?? "ندارد"}</span>
                      </p>
                      <p
                        dir="ltr"
                        className="max-h-40 overflow-auto rounded-lg bg-slate-50 p-2.5 text-left font-mono text-[11px] leading-6 text-slate-700"
                      >
                        {o.protein}
                      </p>
                      <details>
                        <summary className="cursor-pointer text-[11px] text-slate-500">
                          نمایش توالی نوکلئوتیدی
                        </summary>
                        <p dir="ltr" className="mt-1 text-left font-mono text-[10.5px] leading-5 text-slate-600">
                          {fastaWrap(o.dna)}
                        </p>
                      </details>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </ResultBlock>
        </>
      )}

      <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2.5 text-[10.5px] leading-5 text-amber-800">
        <Sparkles className="mt-0.5 size-3.5 shrink-0" />
        این ابزار فقط از جدول کد ژنتیکی استاندارد استفاده می‌کند. هیچ پایگاه دادهٔ ژنومی بارگذاری نشده
        است، پس ابزار ادعایی دربارهٔ ژن واقعی، اینترون یا ناحیهٔ کدک‌دهنده نمی‌کند؛ فقط ساختار احتمالی
        توالیِ داده‌شده را نشان می‌دهد.
      </p>
    </ToolShell>
  );
}

// ── 2. DNA → PROTEIN ────────────────────────────────────────────────────────

export function TranslateTool() {
  const [input, setInput] = useState("");
  const [frame, setFrame] = useState<1 | 2 | 3>(1);
  const [strand, setStrand] = useState<"+" | "-">("+");

  const dna = useMemo(() => cleanDna(input), [input]);
  const valid = dna.length > 0 && dna.length === input.replace(/\s/g, "").length;
  const result = useMemo(
    () => (dna.length >= 3 ? translate(dna, frame, strand) : null),
    [dna, frame, strand],
  );

  const report = useMemo(() => {
    if (!result) return "";
    const lines = [
      "DNA → Protein — Genova Virtual Lab",
      "──────────────────────────────",
      `رشته: ${result.strand}`,
      `چارچوب: ${result.frame}`,
      `طول توالی: ${dna.length} bp`,
      `طول پروتئین: ${result.protein.length} aa`,
      `کدون پایان: ${result.stoppedAt !== null ? `در کدون ${result.stoppedAt + 1}` : "یافت نشد"}`,
      "",
      result.protein,
      "",
      "جدول کدون:",
      "position | start | codon | aa | name",
      ...result.rows.map(
        (r) => `${r.position} | ${r.start} | ${r.codon} | ${r.aa} | ${r.aaName}`,
      ),
      "",
      "روش: جدول کد ژنتیکی استاندارد. ترجمه در نخستین کدون پایان متوقف می‌شود.",
    ];
    return lines.join("\n");
  }, [result, dna.length]);

  return (
    <ToolShell
      title="ترجمهٔ DNA به پروتئین"
      subtitle="یک چارچوب خواند و یک رشته را انتخاب کنید؛ ترجمه در نخستین کدون پایان متوقف می‌شود، همان‌طور که ریبوزوم رفتار می‌کند."
    >
      <div className="space-y-3">
        <SeqInput
          value={input}
          onChange={setInput}
          placeholder="مثال: ATGGCCTGCAGCTTCGACGGCTAC..."
          valid={valid}
          expected="فقط A/T/G/C"
          invalidMessage="توالی فقط باید شامل A، T، G و C باشد"
        />

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="mb-1 text-[10.5px] text-slate-500">چارچوب خواند</p>
            <FramePicker value={frame} onChange={setFrame} />
          </div>
          <div>
            <p className="mb-1 text-[10.5px] text-slate-500">رشته</p>
            <StrandPicker value={strand} onChange={setStrand} />
          </div>
        </div>

        {result && result.rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <CopyBtn text={result.protein} label="کپی پروتئین" />
            <DownloadBtn content={report} filename="translation.txt" />
          </div>
        )}
      </div>

      {result && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <KV label="طول پروتئین" value={`${result.protein.length} aa`} />
            <KV
              label="کدون پایان"
              value={result.stoppedAt !== null ? `کدون ${result.stoppedAt + 1}` : "یافت نشد"}
              hint={result.stoppedAt !== null ? "ترجمه اینجا متوقف شد" : "توالی بدون کدون پایان است"}
            />
            <KV label="نوکلئوتید ترجمه‌نشده" value={String(result.trailingNt)} />
            <KV label="چارچوب" value={`${result.strand}${result.frame}`} />
          </div>

          <ResultBlock title="توالی پروتئین">
            <p
              dir="ltr"
              className="max-h-56 overflow-auto rounded-xl bg-white p-3 text-left font-mono text-[12px] leading-7 text-slate-700 ring-1 ring-emerald-900/5"
            >
              {result.protein}
            </p>
          </ResultBlock>

          <ResultBlock title="جدول کدون به کدون">
            <DataTable headers={["#", "موقعیت", "کدون", "اسید آمینه", "نام", "سه‌حرفی"]}>
              {result.rows.map((r) => (
                <tr key={r.position}>
                  <Td>{r.position.toLocaleString("fa-IR")}</Td>
                  <Td mono>{r.start}</Td>
                  <Td mono>{r.codon}</Td>
                  <Td mono>{r.aa}</Td>
                  <Td>{r.aaName}</Td>
                  <Td mono>{r.three}</Td>
                </tr>
              ))}
            </DataTable>
          </ResultBlock>
        </>
      )}

      {result && result.rows.length === 0 && (
        <p className="rounded-2xl border border-dashed border-emerald-900/10 bg-emerald-50/40 px-4 py-6 text-center text-[12px] text-slate-500">
          در این چارچوب هیچ کدون کاملی وجود ندارد یا توالی خیلی کوتاه است.
        </p>
      )}
    </ToolShell>
  );
}