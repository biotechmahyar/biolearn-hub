/**
 * Genova Virtual Lab — codon analysis & back-translation
 * ─────────────────────────────────────────────────────────────────────────────
 * Two tools that go one level deeper than plain translation:
 *
 *   • Codon Analysis — what the reading frame actually *uses*. Counts codons,
 *     GC in each position, CpG, homopolymer runs, and which amino acids are
 *     encoded by a single synonym in this sequence.
 *   • Back-translation — protein → DNA for a chosen host organism.
 *
 * The one thing this file will not do is pretend to know codon usage
 * frequencies. No reference table is bundled, so no codon is ever called
 * "preferred" or "rare" for an organism. For back-translation the host enters
 * only through its approximate genome GC level, and that limitation is printed
 * in the tool itself.
 */
import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { Dna, Info } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CopyBtn,
  DataTable,
  DownloadBtn,
  DownloadCsvBtn,
  KV,
  MiniBar,
  ResultBlock,
  SaveResultBtn,
  SeqInput,
  Td,
  ToolShell,
  pct,
} from "./proteinUi";
import {
  HOSTS,
  analyseCodons,
  backTranslate,
  cleanDna,
  cleanProtein,
  fastaWrap,
  proteinComposition,
  type HostId,
} from "./proteinCore";
import { FramePicker } from "./OrfTranslateTools";

// ── 3. CODON ANALYSIS ───────────────────────────────────────────────────────

export function CodonAnalysisTool() {
  const [input, setInput] = useState("");
  const [frame, setFrame] = useState<1 | 2 | 3>(1);
  const { isAuthenticated } = useAuth();
  const addNote = useMutation(api.lab.addNote);

  const dna = useMemo(() => cleanDna(input), [input]);
  const valid = dna.length > 0 && dna.length === input.replace(/\s/g, "").length;
  const analysis = useMemo(() => (dna.length >= frame + 2 ? analyseCodons(dna, frame) : null), [dna, frame]);

  const save = async () => {
    if (!isAuthenticated) {
      toast.error("برای ذخیره ابتدا وارد حساب شوید.");
      return;
    }
    if (!analysis) return;
    try {
      await addNote({
        title: "تحلیل کدون",
        body: [
          `چارچوب: ${frame}`,
          `طول خوانده‌شده: ${analysis.totalCodons} کدون`,
          `کدون یکتا: ${analysis.distinctUsed}`,
          `GC کل: ${pct(analysis.gcOverall)}`,
          `GC3: ${pct(analysis.gc3)}`,
          `مترادف‌های استفاده‌نشده: ${analysis.unusedSynonymous}`,
          `CpG مشاهده‌شده: ${analysis.cpgCount}`,
        ].join("\n"),
        tags: ["lab", "codon"],
      });
      toast.success("نتیجه در دفترچهٔ آزمایشگاه ذخیره شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    }
  };

  const csvRows = (analysis?.codons ?? []).map((c) => [
    c.codon,
    c.aa,
    c.aaName,
    c.count,
    (c.frequency * 100).toFixed(2),
  ]);

  return (
    <ToolShell
      title="تحلیل کدون"
      subtitle="ترکیب کدونی یک چارچوب خواند را می‌شمارد: هر کدون چند بار آمده، GC در هر موقعیت، CpG، و کدام اسیدآمینه‌ها فقط با یک مترادف کد شده‌اند."
    >
      <div className="space-y-3">
        <SeqInput
          value={input}
          onChange={setInput}
          placeholder="مثال: ATGGCCTGCAGCTTCGACGGCTACTGA..."
          valid={valid}
          expected="فقط A/T/G/C"
          invalidMessage="توالی فقط باید شامل A، T، G و C باشد"
        />

        <div>
          <p className="mb-1 text-[10.5px] text-slate-500">چارچوب خواند</p>
          <FramePicker value={frame} onChange={setFrame} />
        </div>

        {analysis && (
          <div className="flex flex-wrap items-center gap-2">
            <CopyBtn text={analysis.codons.map((c) => `${c.codon}\t${c.count}`).join("\n")} label="کپی جدول" />
            <DownloadCsvBtn
              headers={["codon", "aa", "amino_acid", "count", "frequency_percent"]}
              rows={csvRows}
              filename="codon-analysis.csv"
            />
            <SaveResultBtn onSave={save} />
          </div>
        )}
      </div>

      {analysis && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <KV label="تعداد کدون" value={String(analysis.totalCodons)} />
            <KV label="کدون یکتای استفاده‌شده" value={String(analysis.distinctUsed)} />
            <KV
              label="مترادف‌های استفاده‌نشده"
              value={String(analysis.unusedSynonymous)}
              hint="از مجموع مترادفهای اسیدهای حاضر در توالی"
            />
            <KV label="GC کل" value={pct(analysis.gcOverall)} />
          </div>

          <ResultBlock title="GC در هر موقعیت کدون">
            <MiniBar
              data={[
                { label: "GC1", value: Number(analysis.gc1.toFixed(2)) },
                { label: "GC2", value: Number(analysis.gc2.toFixed(2)) },
                { label: "GC3", value: Number(analysis.gc3.toFixed(2)) },
              ]}
              color="#0d9488"
            />
            <p className="text-[10.5px] leading-5 text-slate-500">
              مقدار GC در موقعیت سوم (GC3) به ترکیب کدونی حساس است. بالا بودن اختلاف GC3 با GC1 و GC2
              نشانهٔ ترجیح کدونی در همین توالی است.
            </p>
          </ResultBlock>

          <ResultBlock title="پرکاربردترین کدونها">
            <MiniBar
              data={analysis.codons.slice(0, 21).map((c) => ({
                label: c.codon,
                value: c.count,
                caption: c.codon,
              }))}
              color="#047857"
              height={170}
            />
          </ResultBlock>

          <ResultBlock title="جدول کامل کدونها">
            <DataTable headers={["کدون", "اسید آمینه", "نام", "تعداد", "فراوانی", "GC کدون"]}>
              {analysis.codons.map((c) => (
                <tr key={c.codon} className="transition-colors hover:bg-emerald-50/50">
                  <Td mono>{c.codon}</Td>
                  <Td mono>{c.aa}</Td>
                  <Td>{c.aaName}</Td>
                  <Td mono>{c.count}</Td>
                  <Td mono>{(c.frequency * 100).toFixed(2)}</Td>
                  <Td mono>{(c.gc * 100).toFixed(0)}</Td>
                </tr>
              ))}
            </DataTable>
          </ResultBlock>

          <ResultBlock title="شاخص‌های ساختاری توالی">
            <div className="grid gap-2 sm:grid-cols-2">
              <KV label="تعداد CpG" value={String(analysis.cpgCount)} />
              <KV
                label="نسبت CpG به مقدار موردانتظار"
                value={analysis.cpgRatio.toFixed(3)}
                hint="۰٫۶۰ معمولاً برای DNA ژنومی طبیعی تلقی می‌شود"
              />
              <KV
                label="طولانی‌ترین تکرار یک نوکلئوتید"
                value={`${analysis.longestHomopolymer} × ${analysis.longestHomopolymerBase || "—"}`}
              />
              <KV
                label="اسیدهای تک‌مترادف در این توالی"
                value={String(analysis.degenerateAminoAcids.length)}
                hint="با یک مترادف در کل توالی کد شده‌اند"
              />
            </div>
            {analysis.degenerateAminoAcids.length > 0 && (
              <p className="flex flex-wrap gap-1.5">
                {analysis.degenerateAminoAcids.map((d) => (
                  <span
                    key={d.aa}
                    className="rounded-lg bg-amber-50 px-2 py-1 text-[10.5px] text-amber-800 ring-1 ring-amber-200"
                  >
                    {d.name} (تنها با یکی از {d.total} مترادف)
                  </span>
                ))}
              </p>
            )}
          </ResultBlock>

          <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2.5 text-[10.5px] leading-5 text-amber-800">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            این ابزار توالی خودِ شما را می‌شمارد و آن را با هیچ ارگانیسمی مقایسه نمی‌کند، چون هیچ پایگاه
            فراوانی کدونی در سایت بارگذاری نشده است. بنابراین اینجا کلمهٔ «کدون نادر» به کار نمی‌رود؛ فقط
            آنچه واقعاً در توالی شما آمده گزارش می‌شود.
          </p>
        </>
      )}
    </ToolShell>
  );
}

// ── 4. BACK-TRANSLATION ─────────────────────────────────────────────────────

export function BackTranslationTool() {
  const [input, setInput] = useState("");
  const [hostId, setHostId] = useState<HostId>("ecoli");
  const [addStop, setAddStop] = useState(true);
  const [forceStart, setForceStart] = useState(true);
  const { isAuthenticated } = useAuth();
  const addNote = useMutation(api.lab.addNote);

  const protein = useMemo(() => cleanProtein(input), [input]);
  const valid = protein.length > 0;
  const result = useMemo(
    () => (valid ? backTranslate(protein, { host: hostId, addStopCodon: addStop, forceStartMet: forceStart }) : null),
    [protein, valid, hostId, addStop, forceStart],
  );
  const composition = useMemo(() => (valid ? proteinComposition(protein) : null), [protein, valid]);

  const fasta = useMemo(() => {
    if (!result) return "";
    return `>back_translation ${result.host.latin.replace(/\s+/g, "_")} gc=${result.gcOverall.toFixed(1)}%\n${fastaWrap(result.dna)}\n`;
  }, [result]);

  const save = async () => {
    if (!isAuthenticated) {
      toast.error("برای ذخیره ابتدا وارد حساب شوید.");
      return;
    }
    if (!result) return;
    try {
      await addNote({
        title: `Back-translation — ${result.host.latin}`,
        body: [
          `طول پروتئین ورودی: ${result.protein.length} aa`,
          `طول DNA خروجی: ${result.dna.length} bp`,
          `GC خروجی: ${pct(result.gcOverall)} (هدف ژنوم: ${pct(result.host.gcTarget)})`,
          `شکست تکرار کدون: ${result.repeatBreaks}`,
          "",
          result.dna.slice(0, 3800),
        ].join("\n"),
        tags: ["lab", "back-translation"],
      });
      toast.success("نتیجه در دفترچهٔ آزمایشگاه ذخیره شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    }
  };

  return (
    <ToolShell
      title="ترجمهٔ برعکس — پروتئین به DNA"
      subtitle="برای هر اسیدآمینه یک کدون مترادف انتخاب می‌شود که درصد GC توالی را نزدیک هدف ژنوم میزبان نگه دارد."
    >
      <div className="space-y-3">
        <SeqInput
          value={input}
          onChange={setInput}
          placeholder="مثال: MAPPKKKRKV..."
          valid={valid}
          expected="فقط حروف انگلیسی پروتئین"
          invalidMessage="توالی باید فقط شامل حروف پروتئینی باشد"
        />

        <div>
          <p className="mb-1.5 text-[10.5px] text-slate-500">ارگانیسم میزبان (برای بهینه‌سازی کدون)</p>
          <div className="flex flex-wrap gap-1.5">
            {HOSTS.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setHostId(h.id)}
                className={cn(
                  "cursor-pointer rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors",
                  hostId === h.id
                    ? "bg-emerald-700 text-white"
                    : "bg-white text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50",
                )}
              >
                {h.label}
                <span dir="ltr" className="ms-1.5 font-mono text-[9.5px] opacity-75">
                  GC {h.gcTarget}%
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Toggle checked={forceStart} onChange={setForceStart} label="افزودن کدون شروع ATG" />
          <Toggle checked={addStop} onChange={setAddStop} label="افزودن کدون پایان (TAA)" />
        </div>

        {result && (
          <div className="flex flex-wrap items-center gap-2">
            <Button label="کپی DNA" onClick={() => navigator.clipboard.writeText(result.dna)} />
            <DownloadBtn content={result.dna} filename="back-translation.txt" label="دانلود نتیجه (TXT)" />
            <DownloadBtn content={fasta} filename="back-translation.fasta" label="دانلود نتیجه (FASTA)" />
            <DownloadCsvBtn
              headers={["position", "amino_acid", "codon", "gc3_percent", "synonymous_options"]}
              rows={result.choices.map((c) => [c.position, c.aa, c.codon, (c.gc3 * 100).toFixed(0), c.alternatives])}
              filename="back-translation-codons.csv"
            />
            <SaveResultBtn onSave={save} />
          </div>
        )}
      </div>

      {result && composition && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <KV label="طول پروتئین" value={`${result.protein.length} aa`} />
            <KV label="طول DNA خروجی" value={`${result.dna.length} bp`} />
            <KV
              label="GC توالی خروجی"
              value={pct(result.gcOverall)}
              hint={`هدف میزبان: ${pct(result.host.gcTarget)}`}
            />
            <KV label="شکست تکرار کدون" value={String(result.repeatBreaks)} hint="جایی که مترادف جایگزین شد" />
          </div>

          <ResultBlock title="توالی DNA تولیدشده">
            <p
              dir="ltr"
              className="max-h-56 overflow-auto rounded-xl bg-white p-3 text-left font-mono text-[11.5px] leading-6 text-slate-700 ring-1 ring-emerald-900/5"
            >
              {fastaWrap(result.dna)}
            </p>
            <p className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Dna className="size-3" />
              با در نظر گرفتن کدون شروع و پایانی که خودتان اضافه کرده‌اید، ترجمهٔ این توالی در چارچوب ۱ همان
              پروتئین ورودی را برمی‌گرداند — می‌توانید با ابزار ترجمه بررسی کنید.
            </p>
          </ResultBlock>

          <ResultBlock title="GC در هر موقعیت">
            <MiniBar
              data={[
                { label: "GC1", value: Number(result.gc1.toFixed(2)) },
                { label: "GC2", value: Number(result.gc2.toFixed(2)) },
                { label: "GC3", value: Number(result.gc3.toFixed(2)) },
              ]}
              color="#0d9488"
            />
          </ResultBlock>

          <ResultBlock title="انتخاب کدون برای هر اسیدآمینه">
            <DataTable headers={["#", "اسید آمینه", "کدون انتخابی", "GC3", "تعداد مترادف"]}>
              {result.choices.map((c) => (
                <tr key={c.position} className="transition-colors hover:bg-emerald-50/50">
                  <Td>{c.position.toLocaleString("fa-IR")}</Td>
                  <Td>{c.aaName}</Td>
                  <Td mono>{c.codon}</Td>
                  <Td mono>{(c.gc3 * 100).toFixed(0)}</Td>
                  <Td mono>{c.alternatives}</Td>
                </tr>
              ))}
            </DataTable>
          </ResultBlock>

          <ResultBlock title="ترکیب اسیدآمینه‌های پروتئین ورودی">
            <MiniBar
              data={composition.counts.slice(0, 21).map((c) => ({
                label: c.aa,
                value: c.count,
                caption: c.aa,
              }))}
              color="#047857"
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <KV label="درصد اسیدهای باردار" value={pct(composition.chargedPercent)} />
              <KV label="درصد اسیدهای آروماتیک" value={pct(composition.aromaticPercent)} />
              <KV label="گرانشی (Kyte–Doolittle)" value={composition.gravy.toFixed(3)} />
            </div>
          </ResultBlock>
        </>
      )}

      <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2.5 text-[10.5px] leading-5 text-amber-800">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        این ابزار از <strong>جدول فراوانی کدونی</strong> استفاده نمی‌کند، چون هیچ پایگاه داده‌ای در سایت
        بارگذاری نشده است. میزبان فقط از طریق درصد GC ژنوم بر انتخاب کدون اثر می‌گذارد. بنابراین خروجی یک
        توالی معتبر و هم‌معنا با پروتئین شماست، نه یک کدون بهینه‌شده بر پایهٔ فراوانی واقعی بیان ژن.
      </p>
    </ToolShell>
  );
}

/** Local copy-to-clipboard button used by the back-translation toolbar. */
function Button({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick();
        toast.success("در حافظه کپی شد");
      }}
      className="h-7 cursor-pointer rounded-lg px-2.5 text-[11px] font-semibold text-slate-600 ring-1 ring-emerald-900/10 transition-colors hover:bg-emerald-50"
    >
      {label}
    </button>
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
      className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-emerald-900/10 transition-colors hover:bg-emerald-50"
    >
      <span
        className={cn(
          "flex size-3.5 items-center justify-center rounded-[5px] text-[9px] leading-none",
          checked ? "bg-emerald-600 text-white" : "size-3.5 ring-1 ring-slate-300",
        )}
      >
        {checked && "✓"}
      </span>
      {label}
    </button>
  );
}