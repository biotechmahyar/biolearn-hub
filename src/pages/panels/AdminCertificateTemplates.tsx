import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Loader2, Eye, Trash2, Copy, Download, QrCode, Settings2,
  FileImage, Award, CheckCircle2, XCircle, Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { formatJalaliDate } from "@/lib/format";
import type { Id } from "@/convex/_generated/dataModel";

// ── Default field positions (percentage-based, relative to certificate canvas) ──
const DEFAULT_FIELDS = {
  issueDate: { x: 5, y: 5, fontSize: 14, fontWeight: "400", fontFamily: "Vazirmatn", textAlign: "right", maxWidth: 30, color: "#1e293b", direction: "rtl" },
  trackingCode: { x: 5, y: 10, fontSize: 12, fontWeight: "600", fontFamily: "monospace", textAlign: "right", maxWidth: 30, color: "#1e293b", direction: "ltr" },
  courseCode: { x: 5, y: 15, fontSize: 12, fontWeight: "400", fontFamily: "Vazirmatn", textAlign: "right", maxWidth: 30, color: "#1e293b", direction: "rtl" },
  honorific: { x: 50, y: 30, fontSize: 20, fontWeight: "500", fontFamily: "Vazirmatn", textAlign: "center", maxWidth: 50, color: "#0f766e", direction: "rtl" },
  fullName: { x: 50, y: 38, fontSize: 24, fontWeight: "700", fontFamily: "Vazirmatn", textAlign: "center", maxWidth: 40, color: "#0f172a", direction: "rtl" },
  fatherName: { x: 50, y: 45, fontSize: 16, fontWeight: "400", fontFamily: "Vazirmatn", textAlign: "center", maxWidth: 40, color: "#334155", direction: "rtl" },
  nationalCode: { x: 50, y: 50, fontSize: 14, fontWeight: "400", fontFamily: "monospace", textAlign: "center", maxWidth: 30, color: "#334155", direction: "ltr" },
  courseTitle: { x: 50, y: 58, fontSize: 18, fontWeight: "600", fontFamily: "Vazirmatn", textAlign: "center", maxWidth: 50, color: "#0f766e", direction: "rtl" },
  courseDuration: { x: 50, y: 65, fontSize: 14, fontWeight: "400", fontFamily: "Vazirmatn", textAlign: "center", maxWidth: 30, color: "#334155", direction: "rtl" },
  instructorName: { x: 75, y: 82, fontSize: 14, fontWeight: "500", fontFamily: "Vazirmatn", textAlign: "center", maxWidth: 25, color: "#0f172a", direction: "rtl" },
  qrCode: { x: 45, y: 85, fontSize: 1, fontWeight: "400", fontFamily: "monospace", textAlign: "center", maxWidth: 10, color: "#000000" },
};

const FIELD_LABELS: Record<string, string> = {
  issueDate: "تاریخ صدور",
  trackingCode: "کد رهگیری",
  courseCode: "کد دوره",
  honorific: "عنوان خطاب",
  fullName: "نام و نام خانوادگی",
  fatherName: "نام پدر",
  nationalCode: "شماره ملی",
  courseTitle: "عنوان دوره",
  courseDuration: "مدت دوره",
  instructorName: "نام مدرس",
  qrCode: "QR Code",
};

// ── Certificate Preview Component ────────────────────────────────────────────
function CertificatePreview({
  template,
  data,
  scale = 1,
}: {
  template: any;
  data?: Record<string, string>;
  scale?: number;
}) {
  const fields = template?.fields || DEFAULT_FIELDS;
  const bgUrl = template?.backgroundImageUrl;

  const renderField = (key: string, field: any, value: string) => {
    if (!value && key !== "qrCode") return null;
    if (key === "qrCode") {
      // QR code placeholder - will be rendered as a simple box
      return (
        <div
          key={key}
          className="absolute flex items-center justify-center border border-gray-300 bg-white"
          style={{
            left: `${field.x}%`,
            top: `${field.y}%`,
            width: "8%",
            height: "8%",
            transform: "translate(-50%, 0)",
          }}
        >
          {data?.qrUrl ? (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data.qrUrl)}`}
              alt="QR"
              className="size-full p-1"
            />
          ) : (
            <QrCode className="size-8 text-gray-300" />
          )}
        </div>
      );
    }
    return (
      <div
        key={key}
        className="absolute whitespace-pre-wrap break-words"
        style={{
          left: `${field.x}%`,
          top: `${field.y}%`,
          fontSize: `${field.fontSize * scale}px`,
          fontWeight: field.fontWeight,
          fontFamily: field.fontFamily === "monospace" ? "monospace, monospace" : "Vazirmatn, sans-serif",
          textAlign: field.textAlign as any,
          maxWidth: `${field.maxWidth}%`,
          color: field.color,
          direction: (field.direction || "rtl") as any,
          transform: "translateX(-50%)",
          lineHeight: "1.6",
        }}
      >
        {value}
      </div>
    );
  };

  return (
    <div
      className="relative overflow-hidden bg-white"
      style={{
        width: "100%",
        paddingBottom: `${(template?.height / template?.width) * 100}%`,
      }}
    >
      {/* Background image */}
      {bgUrl && (
        <img
          src={bgUrl}
          alt="Certificate background"
          className="absolute inset-0 size-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}

      {/* Dynamic fields overlay */}
      <div className="absolute inset-0">
        {Object.entries(fields).map(([key, field]: [string, any]) => {
          let value = "";
          if (key === "fullName") {
            value = data ? `${data.firstName || ""} ${data.lastName || ""}`.trim() : "";
          } else if (data) {
            value = data[key] || "";
          }
          return renderField(key, field, value);
        })}
      </div>
    </div>
  );
}

// ── Main Admin Panel ────────────────────────────────────────────────────────
export default function AdminCertificateTemplates() {
  const templates = useQuery(api.certificates.listTemplates);
  const createTemplate = useMutation(api.certificates.createTemplate);
  const updateTemplate = useMutation(api.certificates.updateTemplate);
  const deleteTemplate = useMutation(api.certificates.deleteTemplate);
  const issueCert = useMutation(api.certificates.issueCertificate);
  const issuedCerts = useQuery(api.certificates.listIssuedCertificates);
  const revokeCert = useMutation(api.certificates.revokeIssuedCertificate);
  const deleteIssuedCert = useMutation(api.certificates.deleteIssuedCertificate);
  const users = useQuery(api.admin.adminListUsers);
  const courses = useQuery(api.admin.adminListCourses);
  const instructors = useQuery(api.admin.adminListInstructors);

  const [tab, setTab] = useState<"templates" | "issue" | "issued">("templates");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Create form
  const [form, setForm] = useState({
    name: "",
    description: "",
    backgroundImageUrl: "",
    width: 1200,
    height: 850,
  });

  // Issue form
  const [issueForm, setIssueForm] = useState({
    templateId: "",
    userId: "",
    courseId: "",
    instructorId: "",
    firstName: "",
    lastName: "",
    fatherName: "",
    nationalCode: "",
    courseTitle: "",
    courseDuration: "",
    instructorName: "",
    honorific: "سرکار خانم / جناب آقای",
    courseCode: "",
  });

  const [issueBusy, setIssueBusy] = useState(false);
  const [issuedResult, setIssuedResult] = useState<any>(null);

  // Field editor state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("نام قالب را وارد کنید");
      return;
    }
    try {
      const id = await createTemplate({
        name: form.name,
        description: form.description || undefined,
        backgroundImageUrl: form.backgroundImageUrl || undefined,
        width: form.width,
        height: form.height,
        fields: DEFAULT_FIELDS,
      });
      toast.success("قالب با موفقیت ساخته شد");
      setCreateOpen(false);
      setForm({ name: "", description: "", backgroundImageUrl: "", width: 1200, height: 850 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  const handleIssue = async () => {
    if (!issueForm.templateId || !issueForm.userId || !issueForm.courseId || !issueForm.firstName || !issueForm.lastName) {
      toast.error("فیلدهای ضروری را پر کنید");
      return;
    }
    setIssueBusy(true);
    try {
      const result = await issueCert({
        templateId: issueForm.templateId as Id<"certificateTemplates">,
        userId: issueForm.userId as Id<"users">,
        courseId: issueForm.courseId as Id<"courses">,
        instructorId: issueForm.instructorId ? issueForm.instructorId as Id<"instructors"> : undefined,
        firstName: issueForm.firstName,
        lastName: issueForm.lastName,
        fatherName: issueForm.fatherName || undefined,
        nationalCode: issueForm.nationalCode || undefined,
        courseTitle: issueForm.courseTitle,
        courseDuration: issueForm.courseDuration || undefined,
        instructorName: issueForm.instructorName || undefined,
        honorific: issueForm.honorific || undefined,
        courseCode: issueForm.courseCode || undefined,
      });
      setIssuedResult(result);
      toast.success(`گواهی صادر شد! کد رهگیری: ${result.trackingCode}`);
      setIssueForm({
        templateId: "", userId: "", courseId: "", instructorId: "",
        firstName: "", lastName: "", fatherName: "", nationalCode: "",
        courseTitle: "", courseDuration: "", instructorName: "",
        honorific: "سرکار خانم / جناب آقای", courseCode: "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در صدور گواهی");
    } finally {
      setIssueBusy(false);
    }
  };

  // Auto-fill from user selection
  const handleUserSelect = (userId: string) => {
    setIssueForm((f) => ({ ...f, userId }));
    const user = (users as any[])?.find((u: any) => u._id === userId);
    if (user) {
      if (user.firstNameLatin || user.lastNameLatin) {
        setIssueForm((f) => ({
          ...f,
          userId,
          firstName: user.firstName || user.name || "",
          lastName: user.lastName || "",
        }));
      } else {
        setIssueForm((f) => ({
          ...f,
          userId,
          firstName: user.firstName || user.name || "",
          lastName: user.lastName || "",
        }));
      }
    }
  };

  // Auto-fill from course selection
  const handleCourseSelect = (courseId: string) => {
    setIssueForm((f) => ({ ...f, courseId }));
    const course = (courses as any[])?.find((c: any) => c._id === courseId);
    if (course) {
      setIssueForm((f) => ({
        ...f,
        courseId,
        courseTitle: course.title || "",
        courseDuration: course.duration ? `${course.duration} ساعت` : "",
      }));
    }
  };

  // Auto-fill instructor
  const handleInstructorSelect = (instId: string) => {
    setIssueForm((f) => ({ ...f, instructorId: instId }));
    const inst = (instructors as any[])?.find((i: any) => i._id === instId);
    if (inst) {
      setIssueForm((f) => ({ ...f, instructorId: instId, instructorName: inst.name || "" }));
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">مدیریت قالب و صدور گواهی</h2>
          <p className="text-xs text-muted-foreground mt-1">قالب‌بندی، پیش‌نمایش و صدور گواهینامه آکادمی Genova</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border/70 bg-muted/30 p-1">
        {[
          { key: "templates" as const, label: "قالب‌ها", icon: FileImage },
          { key: "issue" as const, label: "صدور گواهی", icon: Award },
          { key: "issued" as const, label: "گواهی‌های صادره", icon: CheckCircle2 },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              tab === t.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Templates Tab ─── */}
      {tab === "templates" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button className="rounded-lg text-xs" onClick={() => setCreateOpen(true)}>
              <Plus className="ml-1 size-3.5" />
              قالب جدید
            </Button>
          </div>

          {(templates ?? []).length === 0 ? (
            <Card className="border-border/70">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <FileImage className="mb-3 size-10 text-muted-foreground/40" />
                <p className="text-sm font-bold">هنوز قالبی ساخته نشده</p>
                <p className="mt-1 text-xs text-muted-foreground">اولین قالب گواهی خود را بسازید</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(templates ?? []).map((t: any) => (
                <Card key={t._id} className="border-border/70 overflow-hidden">
                  <div className="relative h-40 bg-muted/30">
                    <CertificatePreview template={t} scale={0.5} />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold">{t.name}</h3>
                        {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {t.width}×{t.height}px · {formatJalaliDate(t.createdAt)}
                        </p>
                      </div>
                      {t.isActive && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          فعال
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-md text-[10px]"
                        onClick={() => {
                          setSelectedTemplate(t);
                          setFieldValues(t.fields || {});
                          setEditOpen(true);
                        }}
                      >
                        <Settings2 className="ml-1 size-3" />
                        تنظیمات فیلدها
                      </Button>
                      {!t.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-md text-[10px] text-emerald-600"
                          onClick={async () => {
                            try {
                              await updateTemplate({ id: t._id, isActive: true });
                              toast.success("قالب فعال شد");
                            } catch (e) { toast.error("خطا"); }
                          }}
                        >
                          فعال‌سازی
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 rounded-md text-[10px] text-destructive"
                        onClick={async () => {
                          if (!confirm("حذف قالب؟")) return;
                          try {
                            await deleteTemplate({ id: t._id });
                            toast.success("قالب حذف شد");
                          } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); }
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Issue Tab ─── */}
      {tab === "issue" && (
        <div className="space-y-4">
          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">صدور گواهی جدید</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template selection */}
              <div>
                <Label className="text-xs font-bold">قالب گواهی</Label>
                <Select value={issueForm.templateId} onValueChange={(v) => setIssueForm((f) => ({ ...f, templateId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="انتخاب قالب" /></SelectTrigger>
                  <SelectContent>
                    {(templates as any[])?.filter((t: any) => t.isActive).map((t: any) => (
                      <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">دانشجو</Label>
                  <Select value={issueForm.userId} onValueChange={handleUserSelect}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="انتخاب دانشجو" /></SelectTrigger>
                    <SelectContent>
                      {(users as any[])?.map((u: any) => (
                        <SelectItem key={u._id} value={u._id}>{u.name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold">دوره</Label>
                  <Select value={issueForm.courseId} onValueChange={handleCourseSelect}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="انتخاب دوره" /></SelectTrigger>
                    <SelectContent>
                      {(courses as any[])?.map((c: any) => (
                        <SelectItem key={c._id} value={c._id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Holder details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">عنوان خطاب</Label>
                  <Select value={issueForm.honorific} onValueChange={(v) => setIssueForm((f) => ({ ...f, honorific: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="سرکار خانم">سرکار خانم</SelectItem>
                      <SelectItem value="جناب آقای">جناب آقای</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold">نام</Label>
                  <Input value={issueForm.firstName} onChange={(e) => setIssueForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="نام" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-bold">نام خانوادگی</Label>
                  <Input value={issueForm.lastName} onChange={(e) => setIssueForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="نام خانوادگی" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-bold">نام پدر</Label>
                  <Input value={issueForm.fatherName} onChange={(e) => setIssueForm((f) => ({ ...f, fatherName: e.target.value }))} placeholder="نام پدر" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-bold">شماره ملی</Label>
                  <Input value={issueForm.nationalCode} onChange={(e) => setIssueForm((f) => ({ ...f, nationalCode: e.target.value }))} placeholder="کد ملی" dir="ltr" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-bold">عنوان دوره</Label>
                  <Input value={issueForm.courseTitle} onChange={(e) => setIssueForm((f) => ({ ...f, courseTitle: e.target.value }))} placeholder="عنوان دوره" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-bold">مدت دوره (ساعت)</Label>
                  <Input value={issueForm.courseDuration} onChange={(e) => setIssueForm((f) => ({ ...f, courseDuration: e.target.value }))} placeholder="مثلاً ۴۰ ساعت" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-bold">کد دوره</Label>
                  <Input value={issueForm.courseCode} onChange={(e) => setIssueForm((f) => ({ ...f, courseCode: e.target.value }))} placeholder="اختیاری" dir="ltr" className="mt-1" />
                </div>
              </div>

              {/* Instructor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">مدرس (اختیاری)</Label>
                  <Select value={issueForm.instructorId} onValueChange={handleInstructorSelect}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="انتخاب مدرس" /></SelectTrigger>
                    <SelectContent>
                      {(instructors as any[])?.map((i: any) => (
                        <SelectItem key={i._id} value={i._id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold">نام مدرس (دستی)</Label>
                  <Input value={issueForm.instructorName} onChange={(e) => setIssueForm((f) => ({ ...f, instructorName: e.target.value }))} placeholder="یا نام را دستی وارد کنید" className="mt-1" />
                </div>
              </div>

              {/* Live Preview */}
              {issueForm.templateId && (
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <h4 className="mb-2 text-xs font-bold text-muted-foreground">پیش‌نمایش زنده</h4>
                  <CertificatePreview
                    template={(templates as any[])?.find((t: any) => t._id === issueForm.templateId)}
                    data={{
                      firstName: issueForm.firstName,
                      lastName: issueForm.lastName,
                      fatherName: issueForm.fatherName,
                      nationalCode: issueForm.nationalCode,
                      courseTitle: issueForm.courseTitle,
                      courseDuration: issueForm.courseDuration,
                      instructorName: issueForm.instructorName,
                      honorific: issueForm.honorific,
                      courseCode: issueForm.courseCode,
                    }}
                  />
                </div>
              )}

              <Button className="w-full" disabled={issueBusy || !issueForm.templateId || !issueForm.userId || !issueForm.courseId} onClick={handleIssue}>
                {issueBusy ? <Loader2 className="ml-1 size-4 animate-spin" /> : <Award className="ml-1 size-4" />}
                صدور گواهینامه
              </Button>

              {/* Result */}
              {issuedResult && (
                <Card className="border-emerald-200 bg-emerald-500/5">
                  <CardContent className="flex items-center gap-3 p-4">
                    <CheckCircle2 className="size-8 text-emerald-500" />
                    <div>
                      <p className="font-bold text-emerald-700">گواهی با موفقیت صادر شد!</p>
                      <p className="text-xs text-muted-foreground">کد رهگیری: <span className="font-mono font-bold" dir="ltr">{issuedResult.trackingCode}</span></p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Issued Certificates Tab ─── */}
      {tab === "issued" && (
        <div className="space-y-4">
          {(issuedCerts ?? []).length === 0 ? (
            <Card className="border-border/70">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Award className="mb-3 size-10 text-muted-foreground/40" />
                <p className="text-sm font-bold">هنوز گواهی صادر نشده</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(issuedCerts ?? []).map((c: any) => (
                <Card key={c._id} className="border-border/70">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Award className="size-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-muted-foreground">{c.courseTitle} · {c.instructorName || "—"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          کد: <span className="font-mono" dir="ltr">{c.trackingCode}</span> · {formatJalaliDate(c.issuedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.status === "issued" ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"
                      }`}>
                        {c.status === "issued" ? "صادره" : "باطل"}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px]"
                        onClick={() => setPreviewCert(c)}
                      >
                        <Eye className="ml-1 size-3" />
                        پیش‌نمایش
                      </Button>
                      {c.status === "issued" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px] text-amber-500"
                          onClick={async () => {
                            if (!confirm("این گواهی باطل شود؟")) return;
                            try { await revokeCert({ id: c._id }); toast.success("باطل شد"); } catch { toast.error("خطا"); }
                          }}
                        >
                          باطل کردن
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] text-destructive"
                        onClick={async () => {
                          if (!confirm("حذف گواهی؟")) return;
                          try { await deleteIssuedCert({ id: c._id }); toast.success("حذف شد"); } catch { toast.error("خطا"); }
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Create Template Dialog ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>قالب جدید گواهی</DialogTitle>
            <DialogDescription>مشخصات قالب را وارد کنید. پس از ساخت می‌توانید موقعیت فیلدها را تنظیم کنید.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold">نام قالب *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثلاً قالب استاندارد Genova" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-bold">توضیحات</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="توضیحات اختیاری" rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-bold">لینک تصویر پس‌زمینه</Label>
              <Input value={form.backgroundImageUrl} onChange={(e) => setForm((f) => ({ ...f, backgroundImageUrl: e.target.value }))} placeholder="https://..." dir="ltr" className="mt-1" />
              <p className="mt-1 text-[10px] text-muted-foreground">تصویر قالب گواهی را در جایی آپلود کنید و لینک را اینجا وارد کنید</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">عرض (px)</Label>
                <Input type="number" value={form.width} onChange={(e) => setForm((f) => ({ ...f, width: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold">ارتفاع (px)</Label>
                <Input type="number" value={form.height} onChange={(e) => setForm((f) => ({ ...f, height: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate}>ساخت قالب</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Field Editor Dialog ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تنظیمات موقعیت فیلدها — {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>موقعیت، اندازه فونت و تراز هر فیلد را تنظیم کنید</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Preview */}
              <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
                <CertificatePreview template={{ ...selectedTemplate, fields: fieldValues }} scale={0.6} />
              </div>

              {/* Fields editor */}
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {Object.entries(FIELD_LABELS).map(([key, label]) => {
                  const field = fieldValues[key] || DEFAULT_FIELDS[key as keyof typeof DEFAULT_FIELDS];
                  return (
                    <div key={key} className="rounded-lg border border-border/50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold">{label}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{key}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[10px]">X (%)</Label>
                          <Input
                            type="number"
                            value={field?.x ?? 0}
                            onChange={(e) => setFieldValues((fv) => ({
                              ...fv,
                              [key]: { ...field, x: Number(e.target.value) },
                            }))}
                            className="mt-0.5 h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Y (%)</Label>
                          <Input
                            type="number"
                            value={field?.y ?? 0}
                            onChange={(e) => setFieldValues((fv) => ({
                              ...fv,
                              [key]: { ...field, y: Number(e.target.value) },
                            }))}
                            className="mt-0.5 h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">سایز فونت</Label>
                          <Input
                            type="number"
                            value={field?.fontSize ?? 14}
                            onChange={(e) => setFieldValues((fv) => ({
                              ...fv,
                              [key]: { ...field, fontSize: Number(e.target.value) },
                            }))}
                            className="mt-0.5 h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">تراز</Label>
                          <Select
                            value={field?.textAlign ?? "center"}
                            onValueChange={(v) => setFieldValues((fv) => ({
                              ...fv,
                              [key]: { ...field, textAlign: v },
                            }))}
                          >
                            <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="right">راست</SelectItem>
                              <SelectItem value="center">وسط</SelectItem>
                              <SelectItem value="left">چپ</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <Label className="text-[10px]">عرض حداکثر (%)</Label>
                          <Input
                            type="number"
                            value={field?.maxWidth ?? 40}
                            onChange={(e) => setFieldValues((fv) => ({
                              ...fv,
                              [key]: { ...field, maxWidth: Number(e.target.value) },
                            }))}
                            className="mt-0.5 h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">ضخامت فونت</Label>
                          <Select
                            value={field?.fontWeight ?? "400"}
                            onValueChange={(v) => setFieldValues((fv) => ({
                              ...fv,
                              [key]: { ...field, fontWeight: v },
                            }))}
                          >
                            <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="300">سبک</SelectItem>
                              <SelectItem value="400">عادی</SelectItem>
                              <SelectItem value="500">متوسط</SelectItem>
                              <SelectItem value="600">نیمه‌بولد</SelectItem>
                              <SelectItem value="700">بولد</SelectItem>
                              <SelectItem value="800">سنگین</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px]">رنگ</Label>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Input
                              type="color"
                              value={field?.color ?? "#1e293b"}
                              onChange={(e) => setFieldValues((fv) => ({
                                ...fv,
                                [key]: { ...field, color: e.target.value },
                              }))}
                              className="h-7 w-8 p-0 cursor-pointer"
                            />
                            <Input
                              value={field?.color ?? "#1e293b"}
                              onChange={(e) => setFieldValues((fv) => ({
                                ...fv,
                                [key]: { ...field, color: e.target.value },
                              }))}
                              className="h-7 text-[10px] flex-1"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Button
                  className="w-full"
                  onClick={async () => {
                    try {
                      await updateTemplate({
                        id: selectedTemplate._id,
                        fields: fieldValues,
                      });
                      toast.success("موقعیت فیلدها ذخیره شد");
                      setEditOpen(false);
                    } catch (e) { toast.error("خطا"); }
                  }}
                >
                  ذخیره تنظیمات
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Preview Dialog ─── */}
      <Dialog open={!!previewCert} onOpenChange={() => setPreviewCert(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>پیش‌نمایش گواهی — {previewCert?.firstName} {previewCert?.lastName}</DialogTitle>
          </DialogHeader>
          {previewCert && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
                <CertificatePreview
                  template={(templates as any[])?.find((t: any) => t._id === previewCert.templateId)}
                  data={{
                    firstName: previewCert.firstName,
                    lastName: previewCert.lastName,
                    fatherName: previewCert.fatherName,
                    nationalCode: previewCert.nationalCode,
                    courseTitle: previewCert.courseTitle,
                    courseDuration: previewCert.courseDuration,
                    instructorName: previewCert.instructorName,
                    honorific: previewCert.honorific,
                    courseCode: previewCert.courseCode,
                    issueDate: previewCert.issueDate,
                    trackingCode: previewCert.trackingCode,
                    qrUrl: previewCert.qrUrl,
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">کد رهگیری:</span> <span className="font-mono font-bold" dir="ltr">{previewCert.trackingCode}</span></div>
                <div><span className="text-muted-foreground">تاریخ صدور:</span> {previewCert.issueDate}</div>
                <div><span className="text-muted-foreground">دوره:</span> {previewCert.courseTitle}</div>
                <div><span className="text-muted-foreground">وضعیت:</span> {previewCert.status === "issued" ? "صادره" : "باطل"}</div>
              </div>
              {previewCert.status === "issued" && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    // Download QR verification link
                    const url = previewCert.qrUrl || `https://nibrc.ir/verify-certificate?code=${previewCert.trackingCode}`;
                    window.open(url, "_blank");
                  }}
                >
                  <QrCode className="ml-1 size-4" />
                  مشاهده صفحه اعتبارسنجی
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
