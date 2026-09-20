/**
 * Genova Compute Game — exchange desk, transfers and leaderboard
 * ─────────────────────────────────────────────────────────────────────────────
 * The token (GVA) can be transferred to another Genova student or listed on the
 * internal exchange desk. All movement happens server-side in
 * `convex/game.ts`: tokens are escrowed while an offer is open and the ledger is
 * hash-chained, so balances can never be forged from the client.
 *
 * The fiat side of a trade is settled directly between the two students — the
 * platform never claims a payment happened.
 */
import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  BadgeCheck,
  Handshake,
  Send,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { faNum, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TOKEN = "GVA";

export function GameMarket({
  isAuthenticated,
  myBalance,
}: {
  isAuthenticated: boolean;
  myBalance: number;
}) {
  const offers = useQuery(api.game.listOffers, {});
  const leaderboard = useQuery(api.game.leaderboard, {});
  const createOffer = useMutation(api.game.createOffer);
  const cancelOffer = useMutation(api.game.cancelOffer);
  const acceptOffer = useMutation(api.game.acceptOffer);
  const transfer = useMutation(api.game.transfer);

  const [amount, setAmount] = useState("10");
  const [price, setPrice] = useState("5000");
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [toEmail, setToEmail] = useState("");
  const [transferAmount, setTransferAmount] = useState("5");
  const [memo, setMemo] = useState("");
  const [sending, setSending] = useState(false);

  const myOffers = offers?.mine.filter((offer) => offer.status === "open") ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      {/* ── Exchange desk ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <ArrowLeftRight className="size-4 text-sky-500" />
                میز معاملات توکن
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <Badge variant="secondary" className="rounded-full">
                  بهترین قیمت: {offers?.bestPrice ? formatPrice(offers.bestPrice) : "—"}
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  حجم آگهی‌ها: {faNum(offers?.totalVolume ?? 0)} {TOKEN}
                </Badge>
              </div>
            </div>

            {/* Sell form */}
            {isAuthenticated ? (
              <div className="rounded-2xl border bg-muted/30 p-3">
                <p className="mb-2 text-[11px] font-semibold">
                  فروش توکن (موجودی: {faNum(myBalance)} {TOKEN})
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    dir="ltr"
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="مقدار"
                  />
                  <Input
                    dir="ltr"
                    type="number"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="قیمت هر توکن (تومان)"
                  />
                  <Input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="توضیح (اختیاری)"
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-sky-600 hover:bg-sky-700"
                    onClick={async () => {
                      try {
                        await createOffer({
                          amount: Math.round(Number(amount)),
                          unitPriceToman: Math.round(Number(price)),
                          note: note || undefined,
                        });
                        setNote("");
                        toast.success("آگهی ثبت شد و توکن‌ها رزرو شدند");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "خطا در ثبت آگهی");
                      }
                    }}
                  >
                    ثبت آگهی فروش
                  </Button>
                  <span className="text-[10px] text-muted-foreground">
                    ارزش کل:{" "}
                    {formatPrice(Math.max(0, Math.round(Number(amount) || 0) * Math.round(Number(price) || 0)))}
                  </span>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  توکن‌های آگهی تا زمان فروش یا لغو، در حساب شما رزرو می‌شوند. تسویه ریالی مستقیماً بین دو
                  دانشجو انجام می‌شود.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 text-[11px]">
                <span>برای فروش یا خرید توکن وارد حساب شو.</span>
                <Button asChild size="sm" className="bg-sky-600 hover:bg-sky-700">
                  <Link to="/auth?returnTo=/game">ورود به حساب</Link>
                </Button>
              </div>
            )}

            {/* Open offers */}
            {offers === undefined ? (
              <p className="text-xs text-muted-foreground">در حال بارگذاری آگهی‌ها…</p>
            ) : offers.open.length === 0 ? (
              <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
                آگهی فعالی وجود ندارد — اولین فروشنده باش.
              </p>
            ) : (
              <div className="space-y-2">
                {offers.open.map((offer, index) => (
                  <motion.div
                    key={offer._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">
                        {faNum(offer.amount)} {TOKEN} · {formatPrice(offer.unitPriceToman)} برای هر توکن
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        فروشنده: {offer.sellerName} · ارزش کل:{" "}
                        {formatPrice(offer.amount * offer.unitPriceToman)}
                        {offer.note ? ` · ${offer.note}` : ""}
                      </p>
                    </div>
                    {isAuthenticated ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === offer._id}
                        onClick={async () => {
                          setBusyId(offer._id);
                          try {
                            const result = (await acceptOffer({ offerId: offer._id })) as {
                              totalToman: number;
                              sellerName: string;
                            };
                            toast.success(
                              `توکن‌ها به حساب تو منتقل شد — ${formatPrice(result.totalToman)} را با ${result.sellerName} تسویه کن.`,
                            );
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "خطا در خرید");
                          } finally {
                            setBusyId(null);
                          }
                        }}
                      >
                        <Handshake className="mr-1 size-3.5" />
                        خرید
                      </Button>
                    ) : null}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My offers */}
        {isAuthenticated && myOffers.length > 0 ? (
          <Card>
            <CardContent className="space-y-2 p-5">
              <h3 className="text-sm font-bold">آگهی‌های من</h3>
              {myOffers.map((offer) => (
                <div
                  key={offer._id}
                  className="flex items-center justify-between gap-3 rounded-2xl border px-3 py-2"
                >
                  <span className="text-[11px]">
                    {faNum(offer.amount)} {TOKEN} × {formatPrice(offer.unitPriceToman)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await cancelOffer({ offerId: offer._id });
                        toast.success("آگهی لغو و توکن‌ها آزاد شد");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "خطا در لغو آگهی");
                      }
                    }}
                  >
                    <XCircle className="mr-1 size-3.5" />
                    لغو
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* ── Sidebar: transfer + leaderboard ─────────────────────────────── */}
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Send className="size-4 text-sky-500" />
              انتقال توکن به دانشجوی دیگر
            </h3>
            <Input
              dir="ltr"
              type="email"
              value={toEmail}
              onChange={(event) => setToEmail(event.target.value)}
              placeholder="email@example.com"
            />
            <Input
              dir="ltr"
              type="number"
              value={transferAmount}
              onChange={(event) => setTransferAmount(event.target.value)}
              placeholder="مقدار توکن"
            />
            <Input value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="یادداشت (اختیاری)" />
            <Button
              className="w-full bg-sky-600 hover:bg-sky-700"
              disabled={!isAuthenticated || sending}
              onClick={async () => {
                setSending(true);
                try {
                  await transfer({
                    toEmail,
                    amount: Math.round(Number(transferAmount)),
                    memo: memo || undefined,
                  });
                  setToEmail("");
                  setMemo("");
                  toast.success("انتقال انجام شد و در زنجیره ثبت شد");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "خطا در انتقال");
                } finally {
                  setSending(false);
                }
              }}
            >
              {sending ? "در حال انتقال…" : "انتقال توکن"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Trophy className="size-4 text-amber-500" />
              برترین ماینرها
            </h3>
            {leaderboard === undefined ? (
              <p className="text-xs text-muted-foreground">در حال بارگذاری…</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                هنوز کسی توکنی کسب نکرده — اولین نفر باش.
              </p>
            ) : (
              leaderboard.map((row, index) => (
                <motion.div
                  key={row.address}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[11px]",
                    index === 0 ? "bg-amber-500/10" : "bg-muted/40",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-background text-[10px] font-bold">
                      {faNum(index + 1)}
                    </span>
                    <span className="truncate">{row.name}</span>
                    {index === 0 ? <BadgeCheck className="size-3.5 text-amber-500" /> : null}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400">
                    <TrendingUp className="size-3" />
                    {faNum(row.totalEarned)} {TOKEN}
                  </span>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
