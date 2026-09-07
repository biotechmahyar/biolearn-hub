import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldCheck, AlertCircle, Loader2, Award, Calendar, User, BookOpen } from "lucide-react";

export default function VerifyCertificate() {
  const [certId, setCertId] = useState("");
  const [searchKey, setSearchKey] = useState("");

  const cert = useQuery(
    api.promotions.verifyCertificate,
    searchKey ? { certificateId: searchKey } : "skip"
  );

  const handleVerify = () => {
    if (!certId.trim()) return;
    setSearchKey(certId.trim());
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
            <h1 className="text-3xl font-extrabold">اعتبارسنجی مدرک</h1>
            <p className="mt-2 text-muted-foreground">
              شماره گواهینامه را وارد کنید تا از اصالت آن مطمئن شوید.
            </p>
          </div>

          {/* Search */}
          <Card className="border-border/70">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <Input
                  value={certId}
                  onChange={(e) => setCertId(e.target.value)}
                  placeholder="شماره گواهینامه را وارد کنید..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                />
                <Button onClick={handleVerify} disabled={!certId.trim()}>
                  <Search className="ml-1.5 size-4" />
                  جستجو
                </Button>
              </div>
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
              ) : !cert ? (
                <Card className="border-red-200 bg-red-500/5">
                  <CardContent className="flex items-center gap-4 py-8 px-6">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-red-500/10">
                      <AlertCircle className="size-6 text-red-500" />
                    </div>
                    <div>
                      <p className="font-bold text-red-600">گواهینامه یافت نشد</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        گواهینامه‌ای با شماره &quot;{searchKey}&quot; در سیستم ثبت نشده است.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-emerald-200 bg-emerald-500/5">
                  <CardContent className="space-y-4 py-8 px-6">
                    <div className="flex items-center gap-4">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10">
                        <Award className="size-6 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-bold text-emerald-600">گواهینامه معتبر ✓</p>
                        <p className="text-sm text-muted-foreground">این گواهینامه توسط Genova صادر شده است.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 rounded-lg bg-background p-4 border border-border/50">
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-[11px] text-muted-foreground">دانشجو</p>
                          <p className="text-sm font-medium">{cert.studentName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-[11px] text-muted-foreground">دوره</p>
                          <p className="text-sm font-medium">{cert.courseTitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-[11px] text-muted-foreground">تاریخ صدور</p>
                          <p className="text-sm font-medium">
                            {cert.issuedAt
                              ? new Date(cert.issuedAt).toLocaleDateString("fa-IR")
                              : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-[11px] text-muted-foreground">وضعیت</p>
                          <Badge variant="default" className="text-xs mt-0.5">معتبر</Badge>
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
            <p>شماره گواهینامه در صفحه یا فایل گواهینامه شما درج شده است.</p>
            <p className="mt-1">برای سؤال بیشتر با پشتیبانی تماس بگیرید.</p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
