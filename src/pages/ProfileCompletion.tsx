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
import { BrandMark } from "@/components/site/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { Dna, Loader2, Save, User } from "lucide-react";
import { Suspense, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

function ProfileCompletionInner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState(user?.name?.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState(user?.name?.split(" ").slice(1).join(" ") ?? "");
  const [isSaving, setIsSaving] = useState(false);

  // If user already has a full name, skip to dashboard
  if (user?.name && user.name.trim().length > 1) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("نام و نام خانوادگی الزامی است.");
      return;
    }
    setIsSaving(true);
    try {
      await apiClient.put("/api/users/me", {
        name: `${firstName.trim()} ${lastName.trim()}`,
      });
      toast.success("مشخصات شما ثبت شد.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err?.message ?? "خطا در ثبت مشخصات.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background lg:grid lg:grid-cols-2">
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
            تکمیل پروفایل شما
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/80">
            لطفاً نام و نام خانوادگی خود را وارد کنید تا پس از تأیید مدیر سایت،
            به پنل شخصی خود دسترسی داشته باشید.
          </p>
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
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <User className="size-5" />
              </div>
              <CardTitle className="text-xl">تکمیل اطلاعات</CardTitle>
              <CardDescription>
                نام و نام خانوادگی خود را وارد کنید تا پروفایل شما کامل شود.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      نام *
                    </label>
                    <Input
                      placeholder="نام"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      نام خانوادگی *
                    </label>
                    <Input
                      placeholder="نام خانوادگی"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={isSaving}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  پس از ثبت، مشخصات شما برای تأیید مدیر سایت ارسال می‌شود.
                  اطلاعات تکمیلی مانند دانشگاه و رشته را می‌توانید بعداً از
                  بخش پروفایل ویرایش کنید.
                </p>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="ml-2 size-4 animate-spin" />
                      در حال ثبت...
                    </>
                  ) : (
                    <>
                      <Save className="ml-2 size-4" />
                      ثبت مشخصات
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate("/dashboard")}
                  disabled={isSaving}
                >
                  رد شدن — بعداً تکمیل می‌کنم
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProfileCompletionPage() {
  return (
    <Suspense>
      <ProfileCompletionInner />
    </Suspense>
  );
}
