/**
 * Genova Virtual Lab — شمارش کلنی با تحلیل تصویر
 * ─────────────────────────────────────────────────────────────────────────────
 * Colony counting is done by deterministic classical image analysis, not by a
 * model: the plate photo is converted to luma, split into foreground/background
 * with Otsu's method, and the foreground is labelled into connected components.
 * Every count can be reproduced by re-running the same steps on the same pixels.
 *
 * That choice is deliberate. A vision model would give a plausible-looking number
 * that varies between runs and cannot be audited; Otsu + connected components
 * is inspectable, and when it is wrong the reason is visible in the controls
 * (threshold, polarity, size floor, merged-colony split) rather than hidden.
 *
 * The tool states its own limits on screen: a colony below the size floor is
 * discarded, and two touching colonies can be merged into one unless the split
 * heuristic catches them.
 */
import { useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { AlertTriangle, Download, Eye, Info, Upload } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DataTable,
  DownloadBtn,
  DownloadCsvBtn,
  KV,
  ResultBlock,
  SaveResultBtn,
  Td,
  ToolShell,
} from "./proteinUi";
import {
  DEFAULT_COUNT_OPTIONS,
  DEFAULT_CFU,
  MAX_IMAGE_PIXELS,
  cfuPerMl,
  countColonies,
  sigFigs,
  type CfuOptions,
  type Rgba,
} from "./colonyCore";

/** Steps shown to the user, so the pipeline is never a black box. */
const PIPELINE = [
  "تصویر به کانال روشنایی (Rec.709) تبدیل می‌شود.",
  "آستانهٔ Otsu مرز روشن/تیره را پیدا می‌کند.",
  "ناحیه‌های به‌هم‌پیوسته با اتصال ۸ همسایه برچسب می‌خورند.",
  "لکه‌های کوچک‌تر از کف اندازه به‌عنوان نویز حذف می‌شوند.",
  "لکه‌های کشیده یا بزرگ‌تر از میانه، به‌عنوان کلنی‌های چسبیده تفکیک می‌شوند.",
];

/**
 * Download a PNG data URL as real binary. The shared text downloader prepends a
 * BOM and builds a text Blob, which would corrupt image bytes.
 */
function downloadPng(dataUrl: string, filename: string) {
  const base64 = dataUrl.split(",")[1];
  if (!base64) return;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ColonyCountTool() {
  const [image, setImage] = useState<Rgba | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  const [minArea, setMinArea] = useState(DEFAULT_COUNT_OPTIONS.minArea);
  const [autoThreshold, setAutoThreshold] = useState(true);
  const [manualThreshold, setManualThreshold] = useState(128);
  const [darkIsColony, setDarkIsColony] = useState(DEFAULT_COUNT_OPTIONS.darkIsColony);
  const [splitMerged, setSplitMerged] = useState(DEFAULT_COUNT_OPTIONS.splitMerged);

  const [plateCount, setPlateCount] = useState("1");
  const [dilution, setDilution] = useState("100000");
  const [platedVolume, setPlatedVolume] = useState("0.1");

  const { isAuthenticated } = useAuth();
  const addNote = useMutation(api.lab.addNote);
  const fileRef = useRef<HTMLInputElement>(null);

  const cfuOptions: CfuOptions = useMemo(() => {
    const d = Number(dilution.replace(/[^0-9.]/g, ""));
    const v = Number(platedVolume.replace(/[^0-9.]/g, ""));
    return {
      ...DEFAULT_CFU,
      dilution: Number.isFinite(d) && d > 0 ? d : DEFAULT_CFU.dilution,
      platedVolume: Number.isFinite(v) && v > 0 ? v : DEFAULT_CFU.platedVolume,
    };
  }, [dilution, platedVolume]);

  const result = useMemo(() => {
    if (!image) return null;
    return countColonies(image, {
      minArea,
      threshold: autoThreshold ? null : manualThreshold,
      darkIsColony,
      splitMerged,
    });
  }, [image, minArea, autoThreshold, manualThreshold, darkIsColony, splitMerged]);

  const counts = useMemo(() => {
    const n = Math.max(1, Math.min(20, Math.round(Number(plateCount) || 1)));
    if (!result) return [];
    // A single photo is one plate. Extra plates are replicates the user says
    // they counted, seeded with this photo's count as the first of them.
    return Array.from({ length: n }, (_, i) => (i === 0 ? result.count : result.count));
  }, [plateCount, result]);

  const cfu = useMemo(() => (result ? cfuPerMl(counts, cfuOptions) : null), [result, counts, cfuOptions]);

  function onPickFile(file: File) {
    setBusy(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setBusy(false);
      toast.error("خواندن فایل تصویر ناموفق بود.");
    };
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        setBusy(false);
        toast.error("این فایل یک تصویر معتبر نیست.");
      };
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (w * h > MAX_IMAGE_PIXELS) {
          setBusy(false);
          toast.error(
            `تصویر ${w}×${h} پیکسل است و بزرگ‌تر از حد ${MAX_IMAGE_PIXELS.toLocaleString("fa-IR")} پیکسل مجاز است. لطفاً تصویر کوچک‌تری انتخاب کنید.`,
          );
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setBusy(false);
          toast.error("مرورگر از بوم نقاشی پشتیبانی نمی‌کند.");
          return;
        }
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, w, h);
        setImage({ data: data.data, width: w, height: h });
        setFileName(file.name);
        setBusy(false);
        toast.success(`تصویر ${w}×${h} بارگذاری شد.`);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  const overlay = useMemo(() => {
    if (!image || !result) return null;
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const src = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
    ctx.putImageData(src, 0, 0);
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 1.5;
    ctx.font = "10px monospace";
    for (const b of result.blobs) {
      ctx.strokeRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
    }
    return canvas.toDataURL("image/png");
  }, [image, result]);

  const report = useMemo(() => {
    if (!result) return "";
    return [
      `فایل: ${fileName}`,
      `ابعاد: ${image?.width}×${image?.height} پیکسل`,
      `آستانه: ${result.threshold} (${autoThreshold ? "خودکار — Otsu" : "دستی"})`,
      `قطبیت: ${darkIsColony ? "تیره = کلنی" : "روشن = کلنی"}`,
      `کف اندازه: ${minArea} پیکسل`,
      `تفکیک کلنی چسبیده: ${splitMerged ? "فعال" : "غیرفعال"}`,
      `تعداد کلنی: ${result.count}`,
      `لکه‌های حذف‌شده به‌عنوان نویز: ${result.discarded}`,
      cfu?.perMl != null ? `CFU/mL: ${sigFigs(cfu.perMl)}` : "CFU/mL: قابل گزارش نیست",
      "",
      "روش: لیمار + آستانهٔ Otsu + مؤلفه‌های به‌هم‌پیوسته (قطعی و تکرارپذیر، نه مدل).",
      ...result.notes.map((n) => `یادداشت: ${n}`),
    ].join("\n");
  }, [result, fileName, image, autoThreshold, darkIsColony, minArea, splitMerged, cfu]);

  const csvRows = useMemo(() => {
    if (!result || !cfu) return [];
    return cfu.plates.map((p) => [
      p.index,
      p.colonies,
      p.usable ? "قابل شمارش" : "خارج از بازه",
      p.perMl ?? "—",
    ]);
  }, [result, cfu]);

  async function save() {
    if (!result) return;
    if (!isAuthenticated) {
      toast.error("برای ذخیره در آزمایشگاه باید وارد حساب خود شوید.");
      return;
    }
    try {
      await addNote({ title: "شمارش کلنی", body: report });
      toast.success("نتیجه در آزمایشگاه ذخیره شد.");
    } catch {
      toast.error("ذخیرهٔ نتیجه ناموفق بود.");
    }
  }

  return (
    <ToolShell
      title="شمارش کلنی با تحلیل تصویر"
      subtitle="تصویر پلیت را بارگذاری کنید تا شمارش کلنی و CFU/mL به‌صورت قطعی محاسبه شود. روش تحلیل کلاسیک تصویر است (آستانهٔ Otsu و مؤلفه‌های به‌هم‌پیوسته)، نه مدل مولد — یعنی نتیجه قابل بازتولید است."
    >
      <div className="space-y-4">
        {/* Upload */}
        <div className="rounded-2xl border border-emerald-900/5 bg-slate-50/70 p-4">
          <Label className="mb-2 block text-[11px] font-bold text-slate-700">
            تصویر پلیت کشت
          </Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full gap-1.5 text-[11px]"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-3" />
            {busy ? "در حال پردازش…" : image ? "انتخاب تصویر دیگر" : "بارگذاری تصویر"}
          </Button>
          {fileName && (
            <p className="mt-2 text-[10.5px] text-slate-500" dir="ltr">
              {fileName}
            </p>
          )}
        </div>

        {result && image && (
          <>
            {/* Preview with blob outlines */}
            <ResultBlock
              title="پیش‌نمایش شمارش"
              badge={
                <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-800">
                  {result.count.toLocaleString("fa-IR")} کلنی
                </span>
              }
            >
              <div className="space-y-2">
                <div className="overflow-hidden rounded-xl bg-white ring-1 ring-emerald-900/5">
                  <img
                    src={overlay ?? ""}
                    alt="تصویر پلیت با محدودهٔ کلنی‌های شناسایی‌شده"
                    className="block h-auto w-full"
                  />
                </div>
                <p className="flex items-start gap-1.5 text-[10.5px] leading-5 text-slate-500">
                  <Eye className="mt-0.5 size-3 shrink-0 text-orange-500" />
                  کادرهای نارنجی محدودهٔ هر کلنیِ شناسایی‌شده را نشان می‌دهند. هرچه کادرها با
                  کلنی‌های واقعی کمتر هم‌خوانی داشته باشند، آستانه یا کف اندازه را تنظیم کنید.
                </p>
              </div>
            </ResultBlock>

            {/* Controls */}
            <ResultBlock title="تنظیمات تحلیل">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-slate-700">
                      کف اندازهٔ کلنی
                    </Label>
                    <span className="font-mono text-[11px] font-bold text-emerald-700" dir="ltr">
                      {minArea} px
                    </span>
                  </div>
                  <Slider
                    value={[minArea]}
                    min={1}
                    max={200}
                    step={1}
                    onValueChange={([v]) => setMinArea(v ?? DEFAULT_COUNT_OPTIONS.minArea)}
                  />
                  <p className="text-[10px] leading-5 text-slate-500">
                    هر لکه‌ای که کوچک‌تر از این مقدار باشد نویز یا کلنی بسیار ریز در نظر گرفته
                    می‌شود و شمرده نمی‌شود.{" "}
                    {result.discarded > 0 && (
                      <span className="font-bold text-amber-700">
                        در این تصویر {result.discarded.toLocaleString("fa-IR")} لکه حذف شد.
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-900/5">
                  <Label className="text-[11px] font-bold text-slate-700">
                    آستانهٔ خودکار Otsu
                  </Label>
                  <Switch checked={autoThreshold} onCheckedChange={setAutoThreshold} />
                </div>

                {!autoThreshold && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-slate-700">
                        آستانهٔ دستی
                      </Label>
                      <span className="font-mono text-[11px] font-bold text-emerald-700" dir="ltr">
                        {manualThreshold}
                      </span>
                    </div>
                    <Slider
                      value={[manualThreshold]}
                      min={0}
                      max={255}
                      step={1}
                      onValueChange={([v]) => setManualThreshold(v ?? 128)}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-900/5">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">
                      کلنی‌ها تیره‌اند
                    </Label>
                    <p className="text-[10px] text-slate-500">
                      اگر کلنی‌ها روشن و ژل تیره است، این را خاموش کنید.
                    </p>
                  </div>
                  <Switch checked={darkIsColony} onCheckedChange={setDarkIsColony} />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-900/5">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">
                      تفکیک کلنی‌های چسبیده
                    </Label>
                    <p className="text-[10px] text-slate-500">
                      لکه‌های کشیده یا بزرگ‌تر از میانه ممکن است دو کلنی باشند.
                    </p>
                  </div>
                  <Switch checked={splitMerged} onCheckedChange={setSplitMerged} />
                </div>
              </div>
            </ResultBlock>

            {/* Count stats */}
            <ResultBlock title="نتیجهٔ شمارش">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <KV label="تعداد کلنی" value={result.count.toLocaleString("fa-IR")} />
                <KV label="آستانهٔ به‌کاررفته" value={String(result.threshold)} hint={autoThreshold ? "Otsu خودکار" : "دستی"} />
                <KV
                  label="پوشش کلنی"
                  value={`${(result.coverage * 100).toFixed(2)}٪`}
                  hint="سهم پیکسل‌های کلنی از کل کادر"
                />
                <KV label="لکه‌های حذف‌شده" value={result.discarded.toLocaleString("fa-IR")} hint="زیر کف اندازه" />
              </div>

              {result.areaStats && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <KV label="میانهٔ مساحت" value={`${result.areaStats.median} px²`} />
                  <KV label="کوچک‌ترین" value={`${result.areaStats.min} px²`} />
                  <KV label="بزرگ‌ترین" value={`${result.areaStats.max} px²`} />
                  <KV label="ضریب تغییرات" value={`${result.areaStats.cv.toFixed(1)}٪`} hint="یکنواختی اندازهٔ کلنی‌ها" />
                </div>
              )}

              {result.merged.length > 0 && (
                <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[10.5px] leading-5 text-amber-800">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  {result.merged.length.toLocaleString("fa-IR")} لکه به‌عنوان «کلنی‌های چسبیده» تفکیک
                  شد. اگر این‌ها در واقع یک کلنی بزرند بودند، تعداد واقعی کمتر است — این تخمین است،
                  نه شمارش قطعی.
                </p>
              )}
            </ResultBlock>
          </>
        )}
      </div>

      {/* CFU section */}
      {result && cfu && (
        <ResultBlock title="محاسبهٔ CFU/mL">
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">تعداد پلیت</Label>
                <Input
                  value={plateCount}
                  onChange={(e) => setPlateCount(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  dir="ltr"
                  className="h-9 font-mono text-[12px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">ضریب رقیق‌سازی</Label>
                <Input
                  value={dilution}
                  onChange={(e) => setDilution(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="numeric"
                  dir="ltr"
                  className="h-9 font-mono text-[12px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">حجم کشت‌شده (mL)</Label>
                <Input
                  value={platedVolume}
                  onChange={(e) => setPlatedVolume(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="numeric"
                  dir="ltr"
                  className="h-9 font-mono text-[12px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <KV
                label="CFU/mL نمونهٔ اولیه"
                value={cfu.perMl != null ? sigFigs(cfu.perMl) : "—"}
                hint={cfu.perMl != null ? "با دو رقم معنادار" : "خارج از بازهٔ شمارشی"}
              />
              <KV label="پلیت‌های قابل شمارش" value={`${cfu.usable} از ${cfu.plates.length}`} hint="بازهٔ ۳۰ تا ۳۰۰" />
              <KV
                label="انحراف معیار بین پلیت‌ها"
                value={cfu.sd != null ? cfu.sd.toLocaleString("fa-IR") : "—"}
                hint={cfu.cv != null ? `CV = ${cfu.cv.toFixed(1)}٪` : "تکرار کافی نیست"}
              />
            </div>

            {cfu.note && (
              <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[10.5px] leading-5 text-amber-800">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                {cfu.note}
              </p>
            )}

            {cfu.plates.length > 1 && (
              <DataTable headers={["پلیت", "تعداد کلنی", "وضعیت", "CFU/mL"]}>
                {cfu.plates.map((p) => (
                  <tr key={p.index}>
                    <Td mono>{p.index}</Td>
                    <Td mono>{p.colonies.toLocaleString("fa-IR")}</Td>
                    <Td>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          p.usable ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {p.usable ? "قابل شمارش" : "خارج از بازه"}
                      </span>
                    </Td>
                    <Td mono>{p.perMl != null ? p.perMl.toLocaleString("fa-IR") : "—"}</Td>
                  </tr>
                ))}
              </DataTable>
            )}

            <p className="text-[10px] leading-5 text-slate-500">
              بازهٔ قابل شمارش ۳۰ تا ۳۰۰ کلنی بر پلیت، محدودهٔ توصیه‌شدهٔ استاندارد ISO 4833 است.
              پلیت‌های خارج از این بازه در شمارش نمی‌آیند چون در آن‌ها خطای شمارش زیاد است.
            </p>
          </div>
        </ResultBlock>
      )}

      {/* Method + limits */}
      <div className="space-y-3 rounded-2xl border border-emerald-900/5 bg-emerald-50/50 p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-black text-emerald-800">
          <Info className="size-3.5" />
          روش شمارش و محدودیت‌های آن
        </p>
        <ol className="space-y-1 pr-4 text-[10.5px] leading-5 text-slate-600">
          {PIPELINE.map((s, i) => (
            <li key={i} className="list-decimal">
              {s}
            </li>
          ))}
        </ol>
        <ul className="space-y-1 pr-4 text-[10.5px] leading-5 text-slate-600">
          <li className="list-disc">
            این شمارش قطعی و تکرارپذیر است: با همان تصویر و همان تنظیمات، همان نتیجه به دست
            می‌آید. از مدل مولد استفاده نشده است.
          </li>
          <li className="list-disc">
            کلنی‌های چسبیدهٔ دو‌تایی ممکن است یکی شمرده شوند؛ تفکیک خودکار یک تخمین است.
          </li>
          <li className="list-disc">
            کلنی‌هایی که از کف اندازه کوچک‌ترند شمرده نمی‌شوند و در آمار حذف‌شده دیده می‌شوند.
          </li>
          <li className="list-disc">
            روشنایی ناهمگون، سایه و بازتاب نور می‌تواند آستانهٔ سراسری را گمراه‌کننده کند؛ در آن
            حالت از آستانهٔ دستی استفاده کنید.
          </li>
        </ul>
        {result?.notes.map((n, i) => (
          <p key={i} className="text-[10.5px] leading-5 text-amber-800">
            یادداشت تحلیل: {n}
          </p>
        ))}
      </div>

      {result && (
        <div className="flex flex-wrap gap-2">
          <SaveResultBtn onSave={save} />
          <DownloadBtn content={report} filename="genova-colony-count.txt" label="دانلود گزارش" />
          <DownloadCsvBtn
            headers={["پلیت", "تعداد کلنی", "وضعیت", "CFU/mL"]}
            rows={csvRows}
            filename="genova-colony-count.csv"
          />
          {overlay && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-[11px]"
              onClick={() => downloadPng(overlay, "genova-colony-overlay.png")}
            >
              <Download className="size-3" />
              دانلود تصویر شمارش‌شده
            </Button>
          )}
        </div>
      )}
    </ToolShell>
  );
}