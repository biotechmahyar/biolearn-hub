import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VideoRenderer, VideoSourceBadge } from "@/components/site/VideoRenderer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  FileText,
  Film,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

type Props = {
  courseId: string;
  onBack: () => void;
};

export function CourseManageView({ courseId, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<"info" | "curriculum" | "content">("curriculum");
  const course = useQuery(
    api.courseStudio.listMyCourseStudio,
  );
  const sectionsWithLessons = useQuery(
    api.courseStudio.getCourseSectionsWithLessons,
    { courseId: courseId as any },
  );
  const migrateSyllabus = useMutation(api.courseStudio.migrateSyllabusToSections);

  const courseData = course?.find((c: any) => c._id === courseId);

  // Auto-migrate if no sections exist but syllabus has items
  const [migrated, setMigrated] = useState(false);
  if (
    sectionsWithLessons &&
    sectionsWithLessons.length === 0 &&
    courseData?.syllabusCount &&
    courseData.syllabusCount > 0 &&
    !migrated
  ) {
    setMigrated(true);
    migrateSyllabus({ courseId: courseId as any }).catch(() => {});
  }

  if (course === undefined || sectionsWithLessons === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400">
          <ArrowLeft className="ml-1 size-4" /> بازگشت
        </Button>
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpen className="size-8 text-slate-600" />
            <p className="text-sm text-slate-400">دوره یافت نشد.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400">
          <ArrowLeft className="ml-1 size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white truncate">{courseData.title}</h2>
          <p className="text-xs text-slate-400">
            {courseData.categoryName ?? ""} · {sectionsWithLessons.length} سرفصل
          </p>
        </div>
        <a
          href={`/courses/${courseData.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
        >
          مشاهده در سایت ↗
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1">
        {([
          { key: "info" as const, label: "اطلاعات دوره" },
          { key: "curriculum" as const, label: "سرفصل‌ها و جلسات" },
          { key: "content" as const, label: "محتوای جلسات" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
              activeTab === t.key ? "bg-cyan-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === "info" && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500">عنوان</label>
                <p className="text-sm font-bold text-white">{courseData.title}</p>
              </div>
              <div>
                <label className="text-[10px] text-slate-500">وضعیت</label>
                <p className="text-sm text-white">{courseData.status ?? "ناشناخته"}</p>
              </div>
              <div>
                <label className="text-[10px] text-slate-500">قیمت</label>
                <p className="text-sm text-white">
                  {courseData.price?.toLocaleString("fa-IR") ?? 0} تومان
                </p>
              </div>
              <div>
                <label className="text-[10px] text-slate-500">سرفصل‌ها</label>
                <p className="text-sm text-white">{sectionsWithLessons.length}</p>
              </div>
            </div>
            {courseData.summary && (
              <div>
                <label className="text-[10px] text-slate-500">خلاصه</label>
                <p className="text-sm text-slate-300">{courseData.summary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Curriculum */}
      {activeTab === "curriculum" && (
        <CurriculumManager courseId={courseId} sections={sectionsWithLessons} />
      )}

      {/* Tab: Content */}
      {activeTab === "content" && (
        <ContentManager courseId={courseId} sections={sectionsWithLessons} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Curriculum Manager (Sections + Lessons tree) ────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function CurriculumManager({
  courseId,
  sections,
}: {
  courseId: string;
  sections: any[];
}) {
  const addSection = useMutation(api.courseStudio.addSection);
  const deleteSection = useMutation(api.courseStudio.deleteSection);
  const addLesson = useMutation(api.courseStudio.addLesson);
  const deleteLesson = useMutation(api.courseStudio.deleteLesson);

  const [showAddSection, setShowAddSection] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDesc, setSectionDesc] = useState("");
  const [busy, setBusy] = useState(false);

  // Per-section lesson dialog
  const [lessonDialog, setLessonDialog] = useState<{
    sectionId: string;
    sectionTitle: string;
  } | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDuration, setLessonDuration] = useState("60");
  const [lessonContentType, setLessonContentType] = useState<string>("videoUrl");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonText, setLessonText] = useState("");
  const [lessonIsPreview, setLessonIsPreview] = useState(false);

  const handleAddSection = async () => {
    if (!sectionTitle.trim()) return;
    setBusy(true);
    try {
      await addSection({
        courseId: courseId as any,
        title: sectionTitle.trim(),
        description: sectionDesc.trim() || undefined,
      });
      toast.success("سرفصل اضافه شد");
      setSectionTitle("");
      setSectionDesc("");
      setShowAddSection(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("آیا از حذف این سرفصل و تمام جلسات آن مطمئنید؟")) return;
    try {
      await deleteSection({ sectionId: sectionId as any });
      toast.success("سرفصل حذف شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  const handleAddLesson = async () => {
    if (!lessonDialog || !lessonTitle.trim()) return;
    setBusy(true);
    try {
      const payload: any = {
        courseId: courseId as any,
        sectionId: lessonDialog.sectionId as any,
        title: lessonTitle.trim(),
        durationMin: Number(lessonDuration) || 60,
        contentType: lessonContentType as any,
        isPreview: lessonIsPreview,
      };
      if (lessonContentType === "videoUrl" && lessonVideoUrl.trim()) {
        payload.videoUrl = lessonVideoUrl.trim();
      }
      if (lessonContentType === "text" && lessonText.trim()) {
        payload.textContent = lessonText.trim();
      }
      await addLesson(payload);
      toast.success("جلسه اضافه شد");
      setLessonTitle("");
      setLessonDuration("60");
      setLessonVideoUrl("");
      setLessonText("");
      setLessonIsPreview(false);
      setLessonDialog(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("آیا از حذف این جلسه مطمئنید؟")) return;
    try {
      await deleteLesson({ lessonId: lessonId as any });
      toast.success("جلسه حذف شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  return (
    <div className="space-y-4">
      {/* Sections list */}
      {sections.length === 0 ? (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpen className="size-8 text-slate-600" />
            <p className="text-sm text-slate-400">هنوز سرفصلی ایجاد نشده.</p>
            <Button
              size="sm"
              className="bg-emerald-500/10 text-emerald-300"
              onClick={() => setShowAddSection(true)}
            >
              <Plus className="ml-1 size-3.5" /> افزودن اولین سرفصل
            </Button>
          </CardContent>
        </Card>
      ) : (
        sections.map((section: any, si: number) => (
          <Card key={section._id} className="border-white/5 bg-white/[0.02]">
            <CardContent className="py-3">
              {/* Section header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-300">
                  {si + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{section.title}</p>
                  {section.description && (
                    <p className="text-[11px] text-slate-500">{section.description}</p>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {section.lessons?.length ?? 0} جلسه
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] text-red-400 hover:text-red-300"
                  onClick={() => handleDeleteSection(section._id)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>

              {/* Lessons in this section */}
              <div className="mr-10 space-y-1">
                {(section.lessons ?? []).length === 0 ? (
                  <p className="text-[11px] text-slate-600 py-1">هنوز جلسه‌ای اضافه نشده.</p>
                ) : (
                  (section.lessons ?? []).map((lesson: any, li: number) => (
                    <div
                      key={lesson._id}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2"
                    >
                      <span className="size-5 shrink-0 rounded bg-white/5 text-center leading-5 text-[10px] text-slate-500">
                        {li + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-200 truncate">{lesson.title}</p>
                        <p className="text-[10px] text-slate-600">
                          {lesson.durationMin} دقیقه
                          {lesson.contentType === "video" || lesson.contentType === "videoUrl"
                            ? " · 🎬 ویدئو"
                            : lesson.contentType === "text"
                              ? " · 📝 متن"
                              : ""}
                          {lesson.isPreview ? " · رایگان" : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] text-red-400 hover:text-red-300"
                        onClick={() => handleDeleteLesson(lesson._id)}
                      >
                        <Trash2 className="size-2.5" />
                      </Button>
                    </div>
                  ))
                )}

                {/* Add lesson button for this section */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/5"
                  onClick={() =>
                    setLessonDialog({ sectionId: section._id, sectionTitle: section.title })
                  }
                >
                  <Plus className="ml-1 size-3" /> افزودن جلسه
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add Section button */}
      <Button
        className="w-full border-dashed border-white/10 bg-transparent text-slate-400 hover:border-white/20 hover:text-white"
        variant="outline"
        onClick={() => setShowAddSection(true)}
      >
        <Plus className="ml-1 size-4" /> افزودن سرفصل
      </Button>

      {/* Add Section Dialog */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>افزودن سرفصل جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="عنوان سرفصل"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              className="border-white/10 bg-white/5 text-sm text-slate-100"
            />
            <Textarea
              placeholder="توضیحات اختیاری"
              value={sectionDesc}
              onChange={(e) => setSectionDesc(e.target.value)}
              rows={2}
              className="border-white/10 bg-white/5 text-sm text-slate-100"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAddSection(false)}>
                انصراف
              </Button>
              <Button
                size="sm"
                onClick={handleAddSection}
                disabled={busy || !sectionTitle.trim()}
                className="bg-cyan-500 text-white"
              >
                {busy ? <Loader2 className="ml-1 size-3 animate-spin" /> : <Save className="ml-1 size-3" />}
                ذخیره
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog
        open={!!lessonDialog}
        onOpenChange={(o) => {
          if (!o) setLessonDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              افزودن جلسه به: {lessonDialog?.sectionTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">عنوان جلسه</label>
              <Input
                placeholder="مثلاً DNA چیست؟"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                className="border-white/10 bg-white/5 text-sm text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">مدت (دقیقه)</label>
                <Input
                  type="number"
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(e.target.value)}
                  className="border-white/10 bg-white/5 text-sm text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">نوع محتوا</label>
                <Select value={lessonContentType} onValueChange={setLessonContentType}>
                  <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="videoUrl">
                      <span className="flex items-center gap-1.5">
                        <Link2 className="size-3" /> لینک ویدئو
                      </span>
                    </SelectItem>
                    <SelectItem value="video">
                      <span className="flex items-center gap-1.5">
                        <Upload className="size-3" /> آپلود ویدئو
                      </span>
                    </SelectItem>
                    <SelectItem value="text">
                      <span className="flex items-center gap-1.5">
                        <FileText className="size-3" /> متن آموزشی
                      </span>
                    </SelectItem>
                    <SelectItem value="file">
                      <span className="flex items-center gap-1.5">
                        <Film className="size-3" /> فایل
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {lessonContentType === "videoUrl" && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">لینک ویدئو</label>
                <Input
                  placeholder="https://www.aparat.com/v/...  یا  https://youtube.com/watch?v=..."
                  value={lessonVideoUrl}
                  onChange={(e) => setLessonVideoUrl(e.target.value)}
                  className="border-white/10 bg-white/5 text-sm text-slate-100"
                  dir="ltr"
                />
                <p className="text-[10px] text-slate-600">
                  لینک مستقیم ویدئو یا لینک Embed سرویس‌هایی مانند آپارات، یوتیوب یا Vimeo
                </p>
                {lessonVideoUrl.trim() && (
                  <div className="mt-2 space-y-2">
                    <VideoSourceBadge url={lessonVideoUrl} />
                    <VideoRenderer url={lessonVideoUrl} />
                  </div>
                )}
              </div>
            )}

            {lessonContentType === "text" && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">متن آموزشی</label>
                <Textarea
                  placeholder="محتوای متنی درس..."
                  value={lessonText}
                  onChange={(e) => setLessonText(e.target.value)}
                  rows={6}
                  className="border-white/10 bg-white/5 text-sm text-slate-100"
                />
              </div>
            )}

            {lessonContentType === "video" && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
                آپلود ویدئو: ابتدا جلسه را بسازید، سپس از تب «محتوای جلسات» فایل ویدئو را آپلود کنید.
              </div>
            )}

            {lessonContentType === "file" && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
                آپلود فایل: ابتدا جلسه را بسازید، سپس از تب «محتوای جلسات» فایل را آپلود کنید.
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPreview"
                checked={lessonIsPreview}
                onChange={(e) => setLessonIsPreview(e.target.checked)}
                className="size-3.5 rounded border-white/20"
              />
              <label htmlFor="isPreview" className="text-xs text-slate-400">
                پیش‌نمایش رایگان (بدون نیاز به خرید)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setLessonDialog(null)}>
                انصراف
              </Button>
              <Button
                size="sm"
                onClick={handleAddLesson}
                disabled={busy || !lessonTitle.trim()}
                className="bg-cyan-500 text-white"
              >
                {busy ? <Loader2 className="ml-1 size-3 animate-spin" /> : <Save className="ml-1 size-3" />}
                ذخیره جلسه
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Content Manager (edit lesson content: video URL, text, files) ───────────
// ══════════════════════════════════════════════════════════════════════════════

function ContentManager({
  courseId,
  sections,
}: {
  courseId: string;
  sections: any[];
}) {
  const updateLesson = useMutation(api.courseStudio.updateLesson);

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);

  // Find selected lesson across all sections
  let selectedLesson: any = null;
  let selectedSectionTitle = "";
  for (const section of sections) {
    for (const lesson of section.lessons ?? []) {
      if (lesson._id === selectedLessonId) {
        selectedLesson = lesson;
        selectedSectionTitle = section.title;
        break;
      }
    }
  }

  // Load existing content when selecting a lesson
  if (selectedLesson && loaded !== selectedLessonId) {
    setVideoUrl(selectedLesson.videoUrl ?? "");
    setTextContent(selectedLesson.textContent ?? "");
    setLoaded(selectedLessonId);
  }

  const handleSaveContent = async () => {
    if (!selectedLesson) return;
    setSaving(true);
    try {
      const patch: any = {};
      if (selectedLesson.contentType === "videoUrl" || selectedLesson.contentType === "video") {
        patch.videoUrl = videoUrl || undefined;
      }
      if (selectedLesson.contentType === "text") {
        patch.textContent = textContent || undefined;
      }
      // Always save both for flexibility
      if (videoUrl.trim()) patch.videoUrl = videoUrl.trim();
      if (textContent.trim()) patch.textContent = textContent.trim();

      await updateLesson({
        lessonId: selectedLesson._id,
        ...patch,
      });
      toast.success("محتوای جلسه ذخیره شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* Lesson list sidebar */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="py-3">
          <p className="mb-2 text-xs font-bold text-slate-400">انتخاب جلسه</p>
          {sections.length === 0 ? (
            <p className="text-[11px] text-slate-600">سرفصلی وجود ندارد.</p>
          ) : (
            <div className="space-y-3">
              {sections.map((section: any) => (
                <div key={section._id}>
                  <p className="mb-1 text-[10px] font-bold text-cyan-400">{section.title}</p>
                  <div className="space-y-0.5">
                    {(section.lessons ?? []).map((lesson: any) => {
                      const hasContent = !!(lesson.videoUrl || lesson.textContent);
                      return (
                        <button
                          key={lesson._id}
                          onClick={() => {
                            setSelectedLessonId(lesson._id);
                            setLoaded(null);
                          }}
                          className={`w-full rounded-lg px-2 py-1.5 text-right text-[11px] transition-colors ${
                            selectedLessonId === lesson._id
                              ? "bg-cyan-500/10 text-cyan-200"
                              : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {hasContent ? (
                              <span className="size-1.5 rounded-full bg-emerald-400" />
                            ) : (
                              <span className="size-1.5 rounded-full bg-slate-600" />
                            )}
                            {lesson.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content editor */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="py-4">
          {!selectedLesson ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Film className="size-8 text-slate-600" />
              <p className="text-sm text-slate-400">یک جلسه را از لیست انتخاب کنید.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-white">{selectedLesson.title}</p>
                <p className="text-[11px] text-slate-500">
                  {selectedSectionTitle} · {selectedLesson.durationMin} دقیقه
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Link2 className="size-3.5" /> لینک ویدئو
                </label>
                <Input
                  placeholder="https://www.aparat.com/v/...  یا  https://youtube.com/watch?v=...  یا  link.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="border-white/10 bg-white/5 text-sm text-slate-100"
                  dir="ltr"
                />
                <p className="text-[10px] text-slate-600">
                  لینک مستقیم فایل ویدئو یا لینک Embed سرویس‌هایی مانند آپارات، یوتیوب یا Vimeo
                </p>
                {videoUrl.trim() && (
                  <div className="mt-2 space-y-2">
                    <VideoSourceBadge url={videoUrl} />
                    <VideoRenderer url={videoUrl} />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs text-slate-400">
                  <FileText className="size-3.5" /> متن آموزشی
                </label>
                <Textarea
                  placeholder="محتوای متنی درس..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={8}
                  className="border-white/10 bg-white/5 text-sm text-slate-100"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveContent}
                  disabled={saving}
                  className="bg-cyan-500 text-white"
                >
                  {saving ? <Loader2 className="ml-1 size-3 animate-spin" /> : <Save className="ml-1 size-3" />}
                  ذخیره محتوا
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
