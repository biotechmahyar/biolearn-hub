import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dna, Loader2, Mail, Lock, User } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("returnTo") || "/dashboard";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") || "");
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { name, email, password };

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.detail || "خطا در ورود");
        setIsLoading(false);
        return;
      }

      // Store token
      localStorage.setItem("iran_token", data.token);
      localStorage.setItem("iran_user", JSON.stringify(data.user));
      navigate(redirect);
    } catch {
      setError("خطا در ارتباط با سرور");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-extrabold">
            <Dna className="size-8 text-primary" />
            Genova
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            نسخه ایران — {mode === "login" ? "ورود به حساب" : "ساخت حساب جدید"}
          </p>
        </div>

        <Card className="border-border/70 shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="relative">
                  <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <input name="name" required placeholder="نام" className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <input name="email" type="email" required placeholder="ایمیل" className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <input name="password" type="password" required minLength={6} placeholder="رمز عبور" className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="ml-2 size-4 animate-spin" /> : null}
                {mode === "login" ? "ورود" : "ثبت‌نام"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              {mode === "login" ? (
                <p className="text-muted-foreground">
                  حساب ندارید؟{" "}
                  <button onClick={() => setMode("register")} className="text-primary font-semibold hover:underline">ثبت‌نام</button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  قبلاً ثبت‌نام کرده‌اید؟{" "}
                  <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">ورود</button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
