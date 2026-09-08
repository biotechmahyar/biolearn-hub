import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  Award,
  Calendar,
  User,
  BookOpen,
  Hash,
  BadgeCheck,
} from "lucide-react";

// Format a timestamp as Jalali (Shamsi) — consistent with the rest of the site.
function faDate(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function VerifyCertificate() {
  const [codeInput, setCodeInput] = useState("");
  const [searchKey, setSearchKey] = useState("");

  const result = useQuery(
    api.promotions.verifyCertificate,
    searchKey ? { code: searchKey } : "skip",
  );

  const handleVerify = () => {
    if (!codeInput.trim()) return;
    setSearchKey(codeInput.trim());
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5">
        <div className="mx-auto max-w-2xl px-4 py-16">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10">
              <ShieldCheck className="size-8 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">اصالت‌سنجی گواهی</h1>
            <p className="mt-2 text-muted-foreground">
              کد رهگیری درج‌شده روی گواهی را وارد کنید تا اصالت آن بررسی شود.
            </p>
          </div>

          {/* Search */}
          <Card className="border-border/70">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <Input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="GEN-XXXX-XXXX-XXXX"
                  dir="ltr"
                  className="flex-1 text-center font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                />
                <Button onClick={handleVerify} disabled={!codeInput.trim()}>
                  <Search className="ml-1.5 size-4" />
                  بررسی گواهی
                </Button>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                کد رهگیری روی گواهی صادرشده توسط آکادمی درج شده است (مثال: GEN-AB12-CD34-EF56).
              </p>
            </CardContent>
          </Card>

          {/* Result */}
          {searchKey && (
            <div className="mt-6">
              {cert === undefined ? (
                <Card className="border-border/70">
                  <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </CardContent>
                </Card>
              ) : !result.found ? (
                <Card className="border-red-200 bg-red-500/5">
                  <CardContent className="flex items-center gap-4 px-6 py-8">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                      <ShieldX className="size-6 text-red-500" />
                    </div>
                    <div>
                      <p className="font-bold text-red-600">گواهی‌ای با این کد رهگیری یافت نشد.</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        کد را با دقت وارد کنید یا با پشتیبانی تماس بگیرید.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : result.revoked ? (
                <Card className="border-amber-200 bg-amber-500/5">
                  <CardContent className="flex items-center gap-4 px-6 py-8">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                      <ShieldAlert className="size-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-bold text-amber-600">این گواهی در حال حاضر معتبر نیست.</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        این گواهی توسط آکادمی باطل شده است.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-emerald-200 bg-emerald-500/5">
                  <CardContent className="space-y-4 px-6 py-8">
                    <div className="flex items-center gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                        <BadgeCheck className="size-6 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-bold text-emerald-600">✓ گواهی معتبر است</p>
                        <p className="text-sm text-muted-foreground">
                          این گواهی توسط آکادمی Genova صادر شده و اصالت آن تأیید می‌شود.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 rounded-lg border border-border/50 bg-background p-4 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-[11px] text-muted-foreground">دریافت‌کننده</p>
                          <p className="text-sm font-medium">{result.studentName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-[11px] text-muted-foreground">دوره</p>
                          <p className="text-sm font-medium">{result.courseTitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-[11px] text-muted-foreground">تاریخ صدور</p>
                          <p className="text-sm font-medium">{faDate(result.issuedAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-[11px] text-muted-foreground">شماره گواهی</p>
                          <p className="font-mono text-sm font-medium" dir="ltr">
                            {result.certificateNumber}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <Award className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-[11px] text-muted-foreground">کد رهگیری</p>
                          <p className="font-mono text-sm font-medium tracking-wider" dir="ltr">
                            {result.trackingCode}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <ShieldCheck className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-[11px] text-muted-foreground">وضعیت</p>
                          <Badge className="mt-0.5 bg-emerald-500/15 text-xs text-emerald-600">
                            معتبر
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Info */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>کد رهگیری در صفحه یا فایل گواهی شما درج شده است.</p>
            <p className="mt-1">برای سؤال بیشتر با پشتیبانی تماس بگیرید.</p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
