import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { BrandMark } from "@/components/site/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Dna, KeyRound, Loader2, Mail, Send, UserX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { panelForRole } from "@/components/RoleGate";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Staff members always land on their own panel instead of the student dashboard.
  const roleHome = user ? panelForRole(user.role) : redirectAfterAuth ?? "/dashboard";
  const redirect = resolveRedirectAfterAuth(searchParams.get("returnTo"), roleHome);
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError("ارسال کد ناموفق بود. لطفاً دوباره تلاش کنید.");
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("کد واردشده صحیح نیست. دوباره بررسی کنید.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handlePasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const res = await signIn("password", formData);
      if (res.signingIn) {
        navigate(redirect);
      }
    } catch (error) {
      console.error("Password sign-in error:", error);
      setError("ورود ناموفق بود. ایمیل یا رمز عبور را بررسی کنید.");
      setIsLoading(false);
    }
  };

  const showLoadingOverlay = isLoading && step === "signIn";

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      setError("ورود مهمان ناموفق بود. دوباره تلاش کنید.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background lg:grid lg:grid-cols-2">
      {/* Sign-in transition overlay — covers the pause after submitting */}
      <AnimatePresence>
        {showLoadingOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background/90 backdrop-blur-md"
          >
            <div className="relative flex size-16 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-2xl border border-primary/30" />
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <Dna className="size-7 animate-pulse text-primary" />
              </span>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold">در حال ورود به Genova…</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">establishing secure session</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-emerald-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-lab-grid opacity-20" />
        <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-3">
          <BrandMark className="bg-white/15 text-white" />
          <span className="text-lg font-extrabold">Genova</span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-[10px] text-white/70 backdrop-blur">internal</span>
        </Link>
        <div className="relative">
          <Dna className="mb-6 size-12 text-white/70" />
          <h1 className="max-w-md text-3xl font-black leading-relaxed text-balance">
            یک حساب، کل مسیر یادگیری علوم زیستی
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/80">
            یک ورود واحد برای کل پلتفرم Genova: کوئیز روزانه، آزمون تعیین سطح،
            پروفایل یادگیری شخصی، دوره‌ها و پشتیبانی. همین حساب در ربات تلگرام
            هم فعال می‌شود.
          </p>
          <div className="mt-8 flex flex-wrap gap-2 text-xs">
            {["کوئیز روزانه", "آزمون تعیین سطح", "پروفایل یادگیری", "دوره و آزمون", "پشتیبانی"].map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
                {t}
              </span>
            ))}
          </div>
        </div>
        <p className="relative font-mono text-xs text-white/60">
          © {new Date().getFullYear()} Genova · internal life-sciences platform
        </p>
      </div>

      {/* Form */}
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 inline-flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="text-lg font-extrabold">Genova</span>
          </Link>

          <Card className="border-border/70 shadow-xl shadow-primary/5">
            {step === "signIn" ? (
              <>
                <CardHeader className="text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {mode === "otp" ? <Mail className="size-5" /> : <KeyRound className="size-5" />}
                  </div>
                  <CardTitle className="text-xl">ورود یا ساخت حساب</CardTitle>
                  <CardDescription>
                    {mode === "otp"
                      ? "ایمیلت را وارد کن؛ کد تأیید برایت ارسال می‌شود."
                      : "با ایمیل و رمز عبور وارد شو (حساب‌های تیم)."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => setMode("otp")}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        mode === "otp"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      کد یک‌بارمصرف
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("password")}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        mode === "password"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      رمز عبور
                    </button>
                  </div>

                  {mode === "password" ? (
                    <form onSubmit={handlePasswordLogin}>
                      <div className="space-y-3">
                        <div className="relative">
                          <Mail className="absolute right-3 top-3 size-4 text-muted-foreground" />
                          <Input
                            name="email"
                            placeholder="name@genova.team"
                            type="email"
                            dir="ltr"
                            className="pr-10 text-left"
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <div className="relative">
                          <KeyRound className="absolute right-3 top-3 size-4 text-muted-foreground" />
                          <Input
                            name="password"
                            placeholder="رمز عبور"
                            type="password"
                            className="pr-10"
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <input type="hidden" name="flow" value="signIn" />
                        {error && (
                          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {error}
                          </p>
                        )}
                        <Button type="submit" className="w-full" disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="ml-2 size-4 animate-spin" />
                              در حال ورود...
                            </>
                          ) : (
                            <>
                              ورود با رمز عبور
                              <ArrowLeft className="mr-2 size-4" />
                            </>
                          )}
                        </Button>
                        <p className="text-center text-xs leading-5 text-muted-foreground">
                          حساب تیم توسط ادمین ساخته می‌شود؛ رمز فراموش‌شده را می‌توانی از
                          ادمین بخواهی دوباره تنظیم کند.
                        </p>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleEmailSubmit}>
                      <div className="relative flex items-center gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute right-3 top-3 size-4 text-muted-foreground" />
                          <Input
                            name="email"
                            placeholder="name@example.com"
                            type="email"
                            dir="ltr"
                            className="pr-10 text-left"
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <Button
                          type="submit"
                          size="icon"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <ArrowLeft className="size-4" />
                          )}
                        </Button>
                      </div>
                      {error && (
                        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {error}
                        </p>
                      )}
                      <div className="my-5">
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs">
                            <span className="bg-background px-2 text-muted-foreground">
                              یا
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleGuestLogin}
                        disabled={isLoading}
                      >
                        <UserX className="ml-2 size-4" />
                        ادامه به‌عنوان مهمان
                      </Button>
                    </form>
                  )}
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="mt-4 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Send className="size-5" />
                  </div>
                  <CardTitle>کد تأیید را بررسی کن</CardTitle>
                  <CardDescription dir="ltr" className="font-mono">
                    {step.email}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleOtpSubmit}>
                  <CardContent className="pb-4">
                    <input type="hidden" name="email" value={step.email} />
                    <input type="hidden" name="code" value={otp} />
                    <div className="flex justify-center">
                      <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                        disabled={isLoading}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                            const form = (e.target as HTMLElement).closest("form");
                            if (form) form.requestSubmit();
                          }
                        }}
                      >
                        <InputOTPGroup>
                          {Array.from({ length: 6 }).map((_, index) => (
                            <InputOTPSlot key={index} index={index} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {error && (
                      <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                        {error}
                      </p>
                    )}
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                      کد را دریافت نکردی؟{" "}
                      <Button
                        variant="link"
                        className="h-auto p-0"
                        onClick={() => setStep("signIn")}
                      >
                        دوباره ارسال کن
                      </Button>
                    </p>
                  </CardContent>
                  <CardFooter className="flex-col gap-2">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="ml-2 size-4 animate-spin" />
                          در حال ورود...
                        </>
                      ) : (
                        <>
                          تأیید و ورود
                          <ArrowLeft className="mr-2 size-4" />
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setStep("signIn")}
                      disabled={isLoading}
                    >
                      استفاده از ایمیل دیگر
                    </Button>
                  </CardFooter>
                </form>
              </>
            )}
          </Card>

          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            با ورود، <Link to="/rules" className="underline hover:text-foreground">قوانین</Link> و{" "}
            <Link to="/rules" className="underline hover:text-foreground">حریم خصوصی</Link> Genova را می‌پذیری.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
