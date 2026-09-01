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
import { PasswordInput } from "@/components/ui/password-input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { BrandMark } from "@/components/site/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Dna, KeyRound, Loader2, Mail, Send, UserX } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { panelForRole } from "@/components/RoleGate";
import { useMode } from "@/hooks/useMode";
import { authApi } from "@/lib/apiClient";

declare global {
  interface Window {
    google?: { accounts: { id: { initialize: (opts: any) => void; prompt: (cb?: (res: any) => void) => void } } };
  }
}

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
  const { isIran } = useMode();
  const { isLoading: authLoading, isAuthenticated, signIn, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verifyGoogle = useAction(api.googleAuth.verifyGoogleToken);
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
    } catch (error: any) {
      console.error("Email sign-in error:", error);
      const msg = error?.message || "";
      if (msg.includes("RESEND_API_KEY")) {
        setError("سرویس ایمیل تنظیم نشده است. با مدیر سایت تماس بگیرید.");
      } else if (msg.includes("زیاد است") || msg.includes("ثانیه صبر")) {
        setError(msg);
      } else if (msg.includes("ایمیل")) {
        setError("خطا در ارسال ایمیل. لطفاً ایمیل را بررسی کنید.");
      } else {
        setError("ارسال کد ناموفق بود. لطفاً دوباره تلاش کنید.");
      }
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
      if (isIran) {
        // Iran mode: use local JWT auth
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const res = await authApi.login(email, password);
        if (res.ok) {
          navigate(redirect);
        } else {
          setError(res.error || "ورود ناموفق بود.");
        }
      } else {
        // Global mode: use Convex auth
        const res = await signIn("password", formData);
        if (res.signingIn) {
          navigate(redirect);
        }
      }
    } catch (error) {
      console.error("Password sign-in error:", error);
      setError("ورود ناموفق بود. ایمیل یا رمز عبور را بررسی کنید.");
    } finally {
      setIsLoading(false);
    }
  };

  const showLoadingOverlay = isLoading && step === "signIn";

  const handleGoogleLogin = useCallback(async (credential: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Step 1: Verify token server-side
      const verified = await verifyGoogle({ idToken: credential });
      // Step 2: Sign in with verified user data
      await signIn("google", {
        email: verified.email,
        name: verified.name,
        picture: verified.picture,
      });
      // New Google users without a name go to profile completion
      if (!verified.name) {
        navigate("/complete-profile");
      } else {
        navigate(redirect);
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError("ورود با گوگل ناموفق بود. دوباره تلاش کنید.");
      setIsLoading(false);
    }
  }, [verifyGoogle, signIn, navigate, redirect]);

  const GOOGLE_CLIENT_ID = "249113399223-scvp6ehrm1l4cam42rnh7ohq4hipnn9t.apps.googleusercontent.com";

  const handleGoogleClick = useCallback(() => {
    const clientId = GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google sign-in is not configured. Ask the admin for the Client ID.");
      return;
    }
    // Initialize Google Identity Services and trigger prompt
    const loadGIS = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            if (response.credential) {
              handleGoogleLogin(response.credential);
            }
          },
        });
        window.google.accounts.id.prompt();
      } else {
        // Script not loaded yet, load it and retry
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.onload = () => {
          if (window.google) {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: (response: any) => {
                if (response.credential) {
                  handleGoogleLogin(response.credential);
                }
              },
            });
            window.google.accounts.id.prompt();
          }
        };
        document.head.appendChild(script);
      }
    };
    loadGIS();
  }, [handleGoogleLogin]);

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isIran) {
        // Iran mode: register as guest with temp email
        const tempEmail = `guest-${Date.now()}@genova.local`;
        const res = await authApi.register(tempEmail, "guest-" + Date.now(), "مهمان");
        if (res.ok) {
          navigate(redirect);
        } else {
          setError("ورود مهمان ناموفق بود.");
        }
      } else {
        await signIn("anonymous");
        navigate(redirect);
      }
    } catch (error) {
      console.error("Guest login error:", error);
      setError("ورود مهمان ناموفق بود. دوباره تلاش کنید.");
    } finally {
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
                          <PasswordInput
                            name="password"
                            placeholder="رمز عبور"
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
                        className="w-full cursor-pointer border-border/70 bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-50 dark:hover:bg-gray-100"
                        onClick={handleGoogleClick}
                        disabled={isLoading}
                      >
                        <svg className="ml-2 size-4" viewBox="0 0 24 24" fill="none">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        ورود با Google
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full mt-2"
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
                        dir="ltr"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                            const form = (e.target as HTMLElement).closest("form");
                            if (form) form.requestSubmit();
                          }
                        }}
                      >
                        <InputOTPGroup className="gap-2" dir="ltr">
                          {Array.from({ length: 6 }).map((_, index) => (
                            <InputOTPSlot key={index} index={index} className="!w-11 !h-12 !text-lg !font-bold !border-emerald-400 dark:!border-emerald-500 !rounded-lg" />
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
