import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, GraduationCap, Users, ExternalLink, Loader2 } from "lucide-react";
import { faNum } from "@/lib/format";
import { toast } from "sonner";

const SITE_URL = "https://nibrc.ir";

/** Generate a short slug from workshop title (max 128 chars, Latin-safe) */
function shortSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return slug || `ws-${Date.now().toString(36)}`;
}

/** Generate SkyrRoom-compatible username from Latin names + phone */
function makeUsername(firstNameLatin: string, lastNameLatin: string, phone: string): string {
  const first = (firstNameLatin || "").toLowerCase().replace(/[^a-z]/g, "");
  const last = (lastNameLatin || "").toLowerCase().replace(/[^a-z]/g, "");
  const phoneSuffix = (phone || "").replace(/\D/g, "").slice(-4);
  return `${first}${last}${phoneSuffix}` || `user-${Date.now().toString(36)}`;
}

/** Generate a display password from Latin names + phone */
function makePassword(firstNameLatin: string, lastNameLatin: string, phone: string): string {
  const first = (firstNameLatin || "user").replace(/[^a-zA-Z]/g, "");
  const last = (lastNameLatin || "").replace(/[^a-zA-Z]/g, "");
  const phonePart = (phone || "").replace(/\D/g, "").slice(-6);
  return `${first}${last}${phonePart}` || "pass123";
}

export function AdminEduManagement() {
  const workshops = useQuery(api.admin.adminListWorkshops) ?? [];
  const registrations = useQuery(api.admin.adminGetWorkshopRegistrations, {}) ?? [];
  const [activeTab, setActiveTab] = useState<"bulk" | "perWorkshop">("bulk");
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  /** Tab 1: Bulk workshop export — SkyrRoom format */
  const handleBulkExport = () => {
    if (workshops.length === 0) {
      toast.error("کارگاهی یافت نشد.");
      return;
    }
    setBusy(true);
    try {
      const rows = workshops.map((w: any) => {
        const slug = shortSlug(w.title);
        const url = slug;
        return {
          A: url,
          B: (w.title || "").slice(0, 128),
          C: "no",
          D: "yes",
          E: "yes",
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows, { header: ["A", "B", "C", "D", "E"] });
      ws["!cols"] = [{ wch: 50 }, { wch: 60 }, { wch: 5 }, { wch: 5 }, { wch: 5 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "SkyrRoom");
      XLSX.writeFile(wb, `skyrroom-workshops.xlsx`);
      toast.success(`فایل skyrroom-workshops.xlsx دانلود شد (${faNum(rows.length)} کارگاه)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  /** Tab 2: Per-workshop user export — username/password/display name */
  const handlePerWorkshopExport = () => {
    if (!selectedWorkshopId) {
      toast.error("یک کارگاه انتخاب کنید.");
      return;
    }
    const workshop = workshops.find((w: any) => w._id === selectedWorkshopId);
    if (!workshop) return;
    const users = registrations.filter((r: any) => r.workshopId === selectedWorkshopId);
    if (users.length === 0) {
      toast.error("کاربر ثبت‌نام‌شده‌ای برای این کارگاه یافت نشد.");
      return;
    }
    setBusy(true);
    try {
      const rows = users.map((u: any) => {
        const username = makeUsername(u.firstNameLatin, u.lastNameLatin, u.phone);
        const password = makePassword(u.firstNameLatin, u.lastNameLatin, u.phone);
        const displayName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.name || username;
        return { A: username, B: password, C: displayName };
      });
      const ws = XLSX.utils.json_to_sheet(rows, { header: ["A", "B", "C"] });
      ws["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 30 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users");
      const filename = `skyrroom-${shortSlug(workshop.title)}-users`;
      XLSX.writeFile(wb, `${filename}.xlsx`);
      toast.success(`فایل ${filename}.xlsx دانلود شد (${faNum(rows.length)} کاربر)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const selectedWorkshop = workshops.find((w: any) => w._id === selectedWorkshopId);
  const workshopUsers = selectedWorkshopId
    ? registrations.filter((r: any) => r.workshopId === selectedWorkshopId)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" />
            مدیریت آموزش — SkyrRoom
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            خروجی XLSX برای آپلود در SkyrRoom و مدیریت کاربران کارگاه‌ها
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="bulk">خروجی کلی کارگاه‌ها</TabsTrigger>
          <TabsTrigger value="perWorkshop">خروجی کاربران هر کارگاه</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "bulk" && (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="space-y-4 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">خروجی XLSX — فرمت SkyrRoom</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  همه کارگاه‌ها با آدرس کوتاه، عنوان، و تنظیمات SkyrRoom خروجی گرفته می‌شود.
                </p>
              </div>
              <Button onClick={handleBulkExport} disabled={busy} className="gap-2" size="sm">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                دانلود خروجی کلی ({faNum(workshops.length)})
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>عنوان</TableHead>
                    <TableHead>آدرس کوتاه</TableHead>
                    <TableHead>وضعیت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workshops.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        کارگاهی یافت نشد.
                      </TableCell>
                    </TableRow>
                  ) : (
                    workshops.map((w: any, i: number) => (
                      <TableRow key={w._id}>
                        <TableCell className="text-xs font-bold">{faNum(i + 1)}</TableCell>
                        <TableCell className="text-xs font-medium max-w-[300px] truncate">{w.title}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground" dir="ltr">
                          {shortSlug(w.title)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className={w.published ? "text-emerald-600" : "text-amber-600"}>
                            {w.published ? "منتشر" : "پیش‌نویس"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-[11px] text-muted-foreground">
              <p className="font-bold mb-1">فرمت خروجی SkyrRoom:</p>
              <p>ستون A: slug کارگاه (فقط نام لاتین) — ستون B: عنوان (حداکثر ۱۲۸ کاراکتر) — ستون C: no — ستون D: yes — ستون E: yes</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "perWorkshop" && (
        <div className="space-y-4">
          <Card className="border-border/70 shadow-sm">
            <CardContent className="space-y-4 py-5">
              <div>
                <p className="text-sm font-bold">انتخاب کارگاه</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  کاربران ثبت‌نام‌شده در کارگاه انتخابی با نام کاربری و رمز عبور لاتین خروجی گرفته می‌شوند.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="flex h-9 w-full max-w-md rounded-lg border bg-background px-3 text-sm"
                  value={selectedWorkshopId}
                  onChange={(e) => setSelectedWorkshopId(e.target.value)}
                >
                  <option value="">— انتخاب کارگاه —</option>
                  {workshops.map((w: any) => (
                    <option key={w._id} value={w._id}>{w.title}</option>
                  ))}
                </select>
                <Button onClick={handlePerWorkshopExport} disabled={busy || !selectedWorkshopId} className="gap-2" size="sm">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  دانلود خروجی کاربران
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedWorkshopId && (
            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <p className="text-sm font-bold">
                    <Users className="ml-1.5 inline size-4" />
                    {selectedWorkshop?.title} — {faNum(workshopUsers.length)} کاربر
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>نام کاربری (لاتین)</TableHead>
                        <TableHead>رمز عبور</TableHead>
                        <TableHead>نام نمایشی</TableHead>
                        <TableHead>ایمیل</TableHead>
                        <TableHead>تلفن</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workshopUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                            کاربر ثبت‌نام‌شده‌ای یافت نشد.
                          </TableCell>
                        </TableRow>
                      ) : (
                        workshopUsers.map((u: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs" dir="ltr">
                              {makeUsername(u.firstNameLatin, u.lastNameLatin, u.phone)}
                            </TableCell>
                            <TableCell className="font-mono text-xs" dir="ltr">
                              {makePassword(u.firstNameLatin, u.lastNameLatin, u.phone)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.name || "—"}
                            </TableCell>
                            <TableCell className="text-xs" dir="ltr">{u.email || "—"}</TableCell>
                            <TableCell className="text-xs" dir="ltr">{u.phone || "—"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {workshopUsers.length > 0 && (
                  <div className="rounded-b-lg bg-muted/50 px-4 py-2 text-[11px] text-muted-foreground">
                    <p>
                      ⚠️ نام کاربری و رمز عبور از نام لاتین و شماره تلفن پروفایل کاربر ساخته می‌شود.
                      اگر کاربر نام لاتین یا تلفن وارد نکرده باشد، مقدار پیش‌فرض تولید می‌شود.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
