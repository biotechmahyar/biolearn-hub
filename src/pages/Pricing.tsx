import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/site/PublicLayout";
import { api } from "@/convex/_generated/api";
import { faNum, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CheckoutDialog } from "@/components/site/CheckoutDialog";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  Crown,
  Gem,
  MessageSquare,
  Sparkles,
  Star,
  Zap,
  Shield,
  Clock,
  Brain,
  BookOpen,
  HelpCircle,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router";

const FADE_UP = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const STAGGER = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const TIER_META: Record<string, {
  icon: typeof Crown;
  gradient: string;
  border: string;
  badge: string;
  badgeBg: string;
  cta: string;
  features: string[];
  recommended?: boolean;
  audience: string;
}> = {
  bronze: {
    icon: Star,
    gradient: "from-amber-500/20 to-orange-500/10",
    border: "border-amber-500/30 hover:border-amber-500/50",
    badge: "برنزی",
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    cta: "شروع با برنزی",
    features: [
      "۲۵ پیام هوش مصنوعی در روز",
      "دسترسی به مدل‌های پایه AI",
      "پشتیبانی از زبان فارسی",
      "مناسب دانشجویان مبتدی",
      "پاسخ‌های تخصصی علوم زیستی",
    ],
    audience: "برای دانشجویانی که تازه شروع به استفاده از هوش مصنوعی کرده‌اند و می‌خواهند روزانه چند سؤال بپرسند.",
  },
  silver: {
    icon: Gem,
    gradient: "from-slate-400/20 to-blue-400/10",
    border: "border-slate-400/30 hover:border-slate-400/50",
    badge: "نقره‌ای",
    badgeBg: "bg-slate-400/10 text-slate-600 dark:text-slate-300 border-slate-400/20",
    cta: "انتخاب نقره‌ای",
    features: [
      "۵۰ پیام هوش مصنوعی در روز",
      "دسترسی به مدل‌های پیشرفته‌تر",
      "پاسخ‌های تفصیلی‌تر با منابع علمی",
      "مناسب دانشجویان فعال",
      "آمادگی برای امتحانات",
      "توضیح مفاهیم پیچیده",
    ],
    audience: "برای دانشجویانی که روزانه زیاد مطالعه می‌کنند و نیاز به توضیحات دقیق‌تر و مکرر دارند.",
    recommended: true,
  },
  gold: {
    icon: Crown,
    gradient: "from-yellow-500/20 to-amber-500/10",
    border: "border-yellow-500/30 hover:border-yellow-500/50",
    badge: "طلایی",
    badgeBg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    cta: "انتخاب طلایی",
    features: [
      "۱۵۰ پیام هوش مصنوعی در روز",
      "دسترسی به قدرتمندترین مدل‌ها",
      "پاسخ‌های عمیق و تخصصی",
      "مناسب مدرسان و پژوهشگران",
      "تحلیل مقالات و متون علمی",
      "تولید سؤال آزمون",
      "پشتیبانی اولویت‌دار",
    ],
    audience: "برای مدرسان، پژوهشگران و دانشجویانی که نیاز به حجم بالای تعامل با هوش مصنوعی دارند.",
  },
};

const AI_BENEFITS = [
  { icon: Brain, title: "یادگیری هوشمند", desc: "پاسخ‌های شخصی‌سازی شده بر اساس سطح علمی شما" },
  { icon: Clock, title: "صرفه‌جویی در زمان", desc: "به جای ساعت‌ها جستجو، در چند ثانیه پاسخ بگیرید" },
  { icon: BookOpen, title: "آمادگی امتحان", desc: "تولید سؤالات تمرینی و آزمون از روی مطالب درسی" },
  { icon: Shield, title: "پاسخ تخصصی", desc: "مدل‌های آموزش‌دیده در حوزه علوم زیستی و بیوتکنولوژی" },
];

const FAQS = [
  {
    q: "آیا پس از خرید اشتراک می‌توانم پلن را ارتقا دهم؟",
    a: "بله، شما در هر زمان می‌توانید از پلن پایین‌تر به پلن بالاتر ارتقا دهید. مابه‌التفاوت بر اساس مدت باقی‌مانده محاسبه می‌شود.",
  },
  {
    q: "پیام‌های استفاده نشده به روز بعد منتقل می‌شوند؟",
    a: "خیر، محدودیت پیام روزانه هر ساعت ۰۰:۰۰ بازنشانی می‌شود. پیام‌های استفاده نشده قابل انتقال به روز بعد نیستند.",
  },
  {
    q: "آیا امکان پرداخت اقساطی وجود دارد؟",
    a: "در حال حاضر پرداخت به صورت کامل انجام می‌شود. اما با خرید اشتراک‌های بلندمدت‌تر، تخفیف ویژه دریافت می‌کنید.",
  },
  {
    q: "آیا هوش مصنوعی جایگزین مدرس می‌شود؟",
    a: "خیر، هوش مصنوعی ابزار مکمل است. برای درک عمیق مفاهیم، حل تمرین و آمادگی امتحان بسیار مفید است، اما جایگزین تدریس حضوری استاد نیست.",
  },
  {
    q: "آیا پشتیبانی فنی دارد؟",
    a: "بله، تمام کاربران از پشتیبانی فنی برخوردارند. کاربران طلایی از پشتیبانی اولویت‌دار بهره‌مند می‌شوند.",
  },
];

export default function Pricing() {
  const tiers = useQuery(api.aiSubscriptions.getTiers);
  const subscription = useQuery(api.aiSubscriptions.getMySubscription);
  const navigate = useNavigate();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<string | null>(null);

  const meta = (key: string) => TIER_META[key] ?? TIER_META.bronze;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* ── Hero ─────────────────────────────────── */}
        <motion.div {...FADE_UP} className="text-center">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
            <Sparkles className="ml-1 size-3" />
            هوش مصنوعی اختصاصی علوم زیستی
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            با هوش مصنوعی،{" "}
            <span className="bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">
              سریع‌تر یاد بگیرید
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            دستیار هوش مصنوعی Genova با دانش تخصصی علوم زیستی و بیوتکنولوژی،
            پاسخ‌های دقیق، تفصیلی و متناسب با سطح علمی شما ارائه می‌دهد.
          </p>

          {/* Current subscription status */}
          {subscription && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto mt-6 max-w-md rounded-xl border border-primary/20 bg-primary/5 p-4"
            >
              <p className="text-sm text-muted-foreground">اشتراک فعلی شما</p>
              <p className="mt-1 text-lg font-extrabold text-primary">
                {subscription.label} — {faNum(subscription.dailyLimit)} پیام روزانه
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                تا {new Date(subscription.expiresAt).toLocaleDateString("fa-IR")} معتبر
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* ── Pricing Cards ─────────────────────────── */}
        <motion.div
          variants={STAGGER}
          initial="initial"
          animate="animate"
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {(tiers ?? []).map((tier: any) => {
            const m = meta(tier.key);
            const Icon = m.icon;
            const isCurrent = subscription?.tier === tier.key;
            return (
              <motion.div key={tier.key} variants={FADE_UP} className="relative">
                {m.recommended && (
                  <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                    <Badge className="bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground shadow-lg">
                      ⭐ بهترین انتخاب
                    </Badge>
                  </div>
                )}
                <Card
                  className={cn(
                    "relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg",
                    m.border,
                    m.recommended && "ring-2 ring-primary/30",
                    isCurrent && "ring-2 ring-emerald-500/50",
                  )}
                >
                  <div className={cn("absolute inset-0 bg-gradient-to-b opacity-50", m.gradient)} />
                  <CardContent className="relative space-y-5 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={cn("flex size-10 items-center justify-center rounded-xl", m.badgeBg)}>
                          <Icon className="size-5" />
                        </span>
                        <div>
                          <p className="text-lg font-extrabold">{m.badge}</p>
                        </div>
                      </div>
                      {isCurrent && (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400">
                          فعال
                        </Badge>
                      )}
                    </div>

                    <div>
                      <p className="text-3xl font-black">{faNum(tier.price)}</p>
                      <p className="text-xs text-muted-foreground">تومان / ماه</p>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2">
                      <MessageSquare className="size-4 text-primary" />
                      <p className="text-sm font-bold">{faNum(tier.dailyLimit)} پیام در روز</p>
                    </div>

                    <p className="text-xs leading-5 text-muted-foreground">{m.audience}</p>

                    <ul className="space-y-2">
                      {m.features.map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={cn(
                        "w-full",
                        m.recommended && "shadow-md",
                      )}
                      variant={m.recommended ? "default" : "outline"}
                      size="lg"
                      onClick={() => {
                        if (isCurrent) return;
                        setCheckoutTier(tier.key);
                        setCheckoutOpen(true);
                      }}
                      disabled={isCurrent}
                    >
                      {isCurrent ? (
                        "اشتراک فعلی شما"
                      ) : (
                        <>
                          {m.cta}
                          <ArrowLeft className="mr-2 size-4" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Comparison Table ──────────────────────── */}
        <motion.div {...FADE_UP} className="mt-16">
          <h2 className="text-center text-2xl font-extrabold">مقایسه پلن‌ها</h2>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 text-right font-bold">ویژگی</th>
                  <th className="py-3 text-center font-bold text-amber-600 dark:text-amber-400">برنزی</th>
                  <th className="py-3 text-center font-bold text-primary">نقره‌ای</th>
                  <th className="py-3 text-center font-bold text-yellow-600 dark:text-yellow-400">طلایی</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ["پیام روزانه", "۲۵", "۵۰", "۱۵۰"],
                  ["مدل‌های پایه", "✓", "✓", "✓"],
                  ["مدل‌های پیشرفته", "—", "✓", "✓"],
                  ["قدتمندترین مدل‌ها", "—", "—", "✓"],
                  ["تولید سؤال آزمون", "—", "✓", "✓"],
                  ["تحلیل مقالات", "—", "—", "✓"],
                  ["پشتیبانی اولویت‌دار", "—", "—", "✓"],
                ].map(([label, bronze, silver, gold], i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3 font-medium">{label}</td>
                    <td className="py-3 text-center">
                      {bronze === "✓" ? (
                        <CheckCircle2 className="mx-auto size-4 text-emerald-500" />
                      ) : (
                        <span className="text-muted-foreground">{bronze}</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {silver === "✓" ? (
                        <CheckCircle2 className="mx-auto size-4 text-emerald-500" />
                      ) : (
                        <span className="text-muted-foreground">{silver}</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {gold === "✓" ? (
                        <CheckCircle2 className="mx-auto size-4 text-emerald-500" />
                      ) : (
                        <span className="text-muted-foreground">{gold}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ── AI Benefits ──────────────────────────── */}
        <motion.div {...FADE_UP} className="mt-16">
          <h2 className="text-center text-2xl font-extrabold">چرا هوش مصنوعی در مطالعه؟</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
            استفاده از هوش مصنوعی در فرآیند یادگیری مزایای بی‌شماری دارد.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AI_BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <Card key={i} className="border-border/70 text-center shadow-sm transition-colors hover:border-primary/30">
                  <CardContent className="space-y-3 py-6">
                    <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Icon className="size-6 text-primary" />
                    </span>
                    <p className="text-sm font-bold">{b.title}</p>
                    <p className="text-xs leading-5 text-muted-foreground">{b.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>

        {/* ── FAQ ──────────────────────────────────── */}
        <motion.div {...FADE_UP} className="mx-auto mt-16 max-w-2xl">
          <h2 className="text-center text-2xl font-extrabold">سؤالات متداول</h2>
          <div className="mt-8 space-y-4">
            {FAQS.map((faq, i) => (
              <Card key={i} className="border-border/70 shadow-sm">
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                    <p className="text-sm font-bold">{faq.q}</p>
                  </div>
                  <p className="mr-6 text-xs leading-6 text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* ── Final CTA ────────────────────────────── */}
        <motion.div {...FADE_UP} className="mt-16 text-center">
          <Card className="mx-auto max-w-2xl border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="space-y-4 py-10">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <Bot className="size-7 text-primary" />
              </span>
              <h2 className="text-2xl font-extrabold">آماده شروع هستید؟</h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                همین الان با هوش مصنوعی Genova مطالعه خود را متحول کنید.
                اولین پیام‌های خود را رایگان ارسال کنید!
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button size="lg" onClick={() => navigate("/ai-chat")}>
                  <MessageSquare className="ml-2 size-4" />
                  شروع رایگان
                </Button>
                <Button size="lg" variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                  مقایسه پلن‌ها
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      {/* Checkout Dialog */}
      {checkoutTier && (
        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          items={[{
            type: "ai_subscription",
            refId: checkoutTier,
            title: "اشتراک هوش مصنوعی",
            price: checkoutTier === "bronze" ? 199000 : checkoutTier === "silver" ? 499000 : 1499000,
          }]}
          successTitle="اشتراک هوش مصنوعی فعال شد!"
          successDescription="محدودیت پیام روزانه شما افزایش یافت. از AI Chat استفاده کنید."
          onSuccess={() => {
            setCheckoutOpen(false);
            setCheckoutTier(null);
          }}
        />
      )}
    </PublicLayout>
  );
}


