/**
 * Genova Compute Game — «بازی بلاکچین ژنوا»
 * ─────────────────────────────────────────────────────────────────────────────
 * Solve scientific computations, earn the GVA token and trade it with other
 * students.
 *
 * Honest architecture notes:
 *  • The backend generates each computation AND holds its answer, verifies the
 *    submission and only then mints tokens (`convex/game.ts`) — the client can
 *    never claim a reward.
 *  • Every wallet has an append-only hash-chained ledger; the chain head is shown
 *    here so anyone can audit the history (each entry stores the previous hash).
 *  • This is an internal chain, not a public blockchain: no wallet keys and no
 *    gas. Bridging GVA to a public token (e.g. ERC-20) would be a separate,
 *    explicitly verified integration.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  Coins,
  Copy,
  Cpu,
  Hash,
  Link2,
  Pickaxe,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { GameMarket } from "@/components/game/GameMarket";
import GameDisabled from "@/pages/GameDisabled";
import { useAuth } from "@/hooks/use-auth";
import { faNum, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TOKEN = "GVA";

const KIND_LABELS: Record<string, string> = {
  gc_content: "محتوای GC",
  reverse_complement: "مکمل معکوس",
  melting_temperature: "دمای ذوب (Tm)",
  molarity: "غلظت مولی",
  dilution: "رقت محلول",
  cfu_count: "شمارش CFU",
  master_mix: "مستر‌میکس PCR",
};

const LEDGER_LABELS: Record<string, string> = {
  mint: "پاداش محاسبه",
  transfer_in: "دریافت از کاربر",
  transfer_out: "ارسال به کاربر",
  escrow_out: "رزرو برای آگهی",
  escrow_in: "آزادسازی رزرو",
  trade_in: "خرید از میز معاملات",
};

const shortHash = (value?: string | null) =>
  value ? `${value.slice(0, 10)}…${value.slice(-6)}` : "—";

export default function GenovaGame() {
  const { isAuthenticated } = useAuth();
  const enabled = useQuery(api.siteSettings.isGameEnabled);
  const wallet = useQuery(
    api.game.getMyWallet,
    isAuthenticated && enabled === true ? {} : "skip",
  );
  const offers = useQuery(api.game.listOffers, enabled === true ? {} : "skip");
  const leaderboard = useQuery(api.game.leaderboard, enabled === true ? {} : "skip");

  const [job, setJob] = useState<{
    jobId: string;
    kind: string;
    prompt: string;
    reward: number;
    resumed: boolean;
  } | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; reward: number; hash: string; balance: number }
    | { ok: false }
    | null
  >(null);

  // Resume an open job (covers page refreshes / switching devices).
  const openJob = wallet?.openJobs?.[0];
  useEffect(() => {
    if (!job && openJob) {
      setJob({
        jobId: openJob._id,
        kind: openJob.kind,
        prompt: openJob.prompt,
        reward: openJob.reward,
        resumed: true,
      });
    }
  }, [openJob, job]);

  const startJob = useMutation(api.game.startJob);
  const submitJob = useMutation(api.game.submitJob);
  const skipJob = useMutation(api.game.skipJob);

  if (enabled === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        در حال بررسی وضعیت بازی…
      </div>
    );
  }

  if (!enabled) {
    return <GameDisabled />;
  }

  const miningTotal = Math.max(1, (wallet?.solvedToday ?? 0) + (wallet?.dailyLimit ?? 1) * 0);
  const usingPercent = Math.round(
    ((wallet?.solvedToday ?? 0) / Math.max(1, wallet?.dailyLimit ?? 1)) * 100,
  );

  return (
    <PublicLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-sky-500/20 bg-gradient-to-br from-sky-950 via-slate-950 to-blue-950">
        <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_15%_25%,rgba(56,189,248,0.35),transparent_45%),radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.3),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {[0, 1, 2, 3, 4].map((index) => (
            <motion.div
              key={index}
              className="absolute rounded-xl border border-sky-400/30 bg-sky-400/10"
              style={{ left: `${8 + index * 18}%`, top: `${18 + (index % 3) * 22}%`, width: 54, height: 54 }}
              animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }}
              transition={{ duration: 7 + index, repeat: Infinity, delay: index * 0.7 }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <Badge className="mb-4 rounded-full border-sky-400/40 bg-sky-500/15 text-sky-200">
              <Link2 className="mr-1 size-3.5" />
              Genova Compute · {TOKEN}
            </Badge>
            <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">
              بازی بلاکچین ژنوا
            </h1>
            <p className="mt-4 text-sm leading-7 text-sky-100/85 sm:text-base">
              محاسبات علمی واقعی را حل کن و توکن <b>{TOKEN}</b> بگیر: محتوای GC، مکمل معکوس، دمای ذوب
              پرایمر، غلظت مولی، رقت سریالی، شمارش CFU و مستر‌میکس PCR. هر پاداش سمت سرور تأیید و در یک
              دفتر کل زنجیره‌ای (Hash-chained) ثبت می‌شود؛ توکن قابل انتقال و معامله بین دانشجویان ژنواست.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild className="bg-sky-600 hover:bg-sky-700">
                <a href="#mine">
                  <Pickaxe className="mr-1.5 size-4" />
                  شروع محاسبه
                </a>
              </Button>
              <Button asChild variant="outline" className="border-sky-300/40 text-sky-100">
                <a href="#market">
                  <Coins className="mr-1.5 size-4" />
                  میز معاملات
                </a>
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "موجودی توکن من", value: faNum(wallet?.balance ?? 0) },
                { label: "توکن کسب‌شده", value: faNum(wallet?.totalEarned ?? 0) },
                { label: "بهترین قیمت", value: offers?.bestPrice ? faNum(offers.bestPrice) : "—" },
                { label: "ماینرهای فعال", value: faNum(leaderboard?.length ?? 0) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-sky-400/25 bg-white/5 px-3 py-3 backdrop-blur"
                >
                  <p className="text-xl font-black text-white">{stat.value}</p>
                  <p className="mt-0.5 text-[11px] text-sky-200/80">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Mining + wallet ──────────────────────────────────────────────── */}
      <section id="mine" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Job panel */}
          <Card className="border-sky-500/30">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <BrainCircuit className="size-4 text-sky-500" />
                  کارگاه محاسبات علمی
                </h2>
                {wallet ? (
                  <Badge variant="secondary" className="rounded-full text-[10px]">
                    سهمیه امروز: {faNum(wallet.solvedToday)} از {faNum(wallet.dailyLimit)}
                  </Badge>
                ) : null}
              </div>

              {wallet ? <Progress value={usingPercent} className="h-1.5" /> : null}

              {!isAuthenticated ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-xs">
                  <span>برای حل محاسبات و کسب توکن، وارد حساب ژنوا شو.</span>
                  <Button asChild size="sm" className="bg-sky-600 hover:bg-sky-700">
                    <Link to="/auth?returnTo=/game">ورود به حساب</Link>
                  </Button>
                </div>
              ) : (
                <>
                  {job ? (
                    <div className="space-y-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge className="rounded-full bg-sky-600 text-white">
                          {KIND_LABELS[job.kind] ?? job.kind}
                        </Badge>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                          <Coins className="size-3.5" />
                          پاداش: {faNum(job.reward)} {TOKEN}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-7">{job.prompt}</p>
                      <Input
                        dir="ltr"
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value)}
                        placeholder="پاسخ محاسبه (عدد یا توالی)"
                        className="text-left"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          className="bg-sky-600 hover:bg-sky-700"
                          disabled={busy || !answer.trim()}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              const res = (await submitJob({
                                jobId: job.jobId as never,
                                answer,
                              })) as
                                | { correct: true; reward: number; hash: string; balance: number }
                                | { correct: false };
                              if (res.correct) {
                                setResult({
                                  ok: true,
                                  reward: res.reward,
                                  hash: res.hash,
                                  balance: res.balance,
                                });
                                toast.success(`درست بود! ${faNum(res.reward)} ${TOKEN} به کیف پول اضافه شد`);
                              } else {
                                setResult({ ok: false });
                                toast.error("پاسخ درست نبود — کار جدید بگیر و دوباره تلاش کن");
                              }
                              setJob(null);
                              setAnswer("");
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "خطا در ثبت پاسخ");
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          <Cpu className="mr-1.5 size-4" />
                          {busy ? "در حال محاسبه…" : "ثبت پاسخ و دریافت توکن"}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={async () => {
                            await skipJob({ jobId: job.jobId as never });
                            setJob(null);
                            setAnswer("");
                          }}
                        >
                          رد کردن این محاسبه
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="w-full bg-sky-600 hover:bg-sky-700"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setResult(null);
                        try {
                          const res = (await startJob({})) as {
                            jobId: string;
                            kind: string;
                            prompt: string;
                            reward: number;
                            resumed: boolean;
                          };
                          setJob(res);
                          setAnswer("");
                          if (res.resumed) toast("یک محاسبه در جریان داشتی — همان را ادامه بده");
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "خطا در دریافت محاسبه");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <Pickaxe className="mr-1.5 size-4" />
                      {busy ? "در حال آماده‌سازی…" : "دریافت محاسبه جدید"}
                    </Button>
                  )}

                  {result?.ok ? (
                    <motion.div
                      initial={{ scale: 0.96, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="rounded-2xl bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300"
                    >
                      <p className="flex items-center gap-1.5 font-bold">
                        <Sparkles className="size-3.5" />
                        {faNum(result.reward)} {TOKEN} ثبت شد — موجودی جدید: {faNum(result.balance)}
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px]" dir="ltr">
                        <Hash className="size-3" />
                        {shortHash(result.hash)}
                      </p>
                    </motion.div>
                  ) : null}
                  {result && !result.ok ? (
                    <div className="rounded-2xl bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300">
                      پاسخ درست نبود؛ در این بازی هر پاسخ اشتباه فقط محاسبه را می‌بندد و امتیازی کم نمی‌کند.
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          {/* Wallet + chain */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Wallet className="size-4 text-sky-500" />
                کیف پول {TOKEN}
              </h2>

              {wallet?.address ? (
                <div className="rounded-2xl border bg-muted/40 p-3">
                  <p className="text-[10px] text-muted-foreground">آدرس کیف پول</p>
                  <p className="mt-1 break-all font-mono text-[11px]" dir="ltr">
                    {wallet.address}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1"
                    onClick={() => {
                      void navigator.clipboard?.writeText(wallet.address ?? "");
                      toast.success("آدرس کپی شد");
                    }}
                  >
                    <Copy className="mr-1 size-3.5" />
                    کپی آدرس
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  با حل اولین محاسبه، کیف پول تو به‌صورت خودکار ساخته می‌شود.
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "موجودی", value: faNum(wallet?.balance ?? 0) },
                  { label: "کسب‌شده", value: faNum(wallet?.totalEarned ?? 0) },
                  { label: "محاسبه حل‌شده", value: faNum(wallet?.jobsSolved ?? 0) },
                  { label: "مصرف‌شده", value: faNum(wallet?.totalSpent ?? 0) },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-muted/40 px-3 py-2 text-center">
                    <p className="text-lg font-black text-sky-600 dark:text-sky-400">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="size-3.5" />
                  سر دفتر کل زنجیره (Chain head)
                </p>
                <p className="mt-1 break-all font-mono text-[10px]" dir="ltr">
                  {wallet?.chainHead ?? "—"}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  هر رکورد هش رکورد قبلی را در خود دارد؛ تغییر گذشته، زنجیره را می‌شکند.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ledger */}
        {isAuthenticated ? (
          <Card className="mt-6">
            <CardContent className="p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Hash className="size-4 text-sky-500" />
                دفتر کل من (آخرین ۴۰ تراکنش)
              </h2>
              {wallet == null ? (
                <p className="text-xs text-muted-foreground">در حال بارگذاری…</p>
              ) : wallet.ledger.length === 0 ? (
                <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">
                  هنوز تراکنشی ثبت نشده — اولین محاسبه‌ات را حل کن.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-[11px]">
                    <thead className="text-muted-foreground">
                      <tr className="border-b">
                        <th className="px-3 py-2 text-right font-medium">نوع</th>
                        <th className="px-3 py-2 text-right font-medium">مقدار</th>
                        <th className="px-3 py-2 text-right font-medium">موجودی پس از</th>
                        <th className="px-3 py-2 text-right font-medium">هش</th>
                        <th className="px-3 py-2 text-right font-medium">زمان</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wallet.ledger.map((entry) => (
                        <tr key={entry._id} className="border-b last:border-0">
                          <td className="px-3 py-2">{LEDGER_LABELS[entry.kind] ?? entry.kind}</td>
                          <td
                            className={cn(
                              "px-3 py-2 font-bold",
                              entry.amount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500",
                            )}
                            dir="ltr"
                          >
                            {entry.amount > 0 ? "+" : ""}
                            {entry.amount}
                          </td>
                          <td className="px-3 py-2" dir="ltr">
                            {entry.balanceAfter}
                          </td>
                          <td className="px-3 py-2 font-mono text-[10px]" dir="ltr">
                            {shortHash(entry.hash)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatDateTime(entry.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </section>

      {/* ── Market ───────────────────────────────────────────────────────── */}
      <section id="market" className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="mb-6 text-xl font-black">معامله توکن {TOKEN}</h2>
          <GameMarket isAuthenticated={isAuthenticated} myBalance={wallet?.balance ?? 0} />
        </div>
      </section>

      {/* ── Transparency note ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <Card className="border-sky-500/20 bg-sky-500/5">
          <CardContent className="space-y-2 p-5 text-[11px] leading-6 text-muted-foreground">
            <p className="text-xs font-bold text-foreground">شفافیت درباره فناوری</p>
            <p>
              توکن {TOKEN} در همین پلتفرم و روی دفتر کل زنجیره‌ای ژنوا ثبت می‌شود (زنجیره داخلی، بدون
              کلید خصوصی و بدون کارمزد شبکه). پاداش‌ها فقط پس از تأیید محاسبه در سرور صادر می‌شوند و تسویه
              ریالی معاملات مستقیماً بین دو دانشجو انجام می‌شود.
            </p>
            <p>
              برای انتقال واقعی توکن به یک بلاکچین عمومی (مثل ERC-20 روی Polygon یا Base) باید کیف پول و
              قرارداد هوشمند جداگانه راه‌اندازی و تأیید شود؛ تا آن زمان هیچ پرداخت رمزارزی در این صفحه
              انجام نمی‌شود.
            </p>
          </CardContent>
        </Card>
      </section>
    </PublicLayout>
  );
}
