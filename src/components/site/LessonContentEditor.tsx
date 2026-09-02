import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileText,
  LinkIcon,
  Loader2,
  Save,
  Upload,
  Video,
  CheckCircle2,
  Trash2,
  Plus,
  ClipboardList,
  BookOpen,
  HelpCircle,
  GripVertical,
  X,
} from "lucide-react";
import { uploadBlob } from "@/lib/upload";

interface SyllabusItem {
  id: string;
  title: string;
  durationMin: number;
  free: boolean;
}

interface Attachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface QuizQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

interface Homework {
  title: string;
  description: string;
}

export function LessonContentEditor({
  courseId,
  syllabus,
  onSyllabusChange,
}: {
  courseId: string;
  syllabus: SyllabusItem[];
  onSyllabusChange?: () => void;
}) {
  const lessonContents =
    useQuery(api.courseStudio.getLessonContentByCourse, {
      courseId: courseId as any,
    }) ?? [];
  const saveContent = useMutation(api.courseStudio.saveLessonContent);
  const getUploadUrl = useMutation(api.collab.getUploadUrl);
  const addLesson = useMutation(api.courseStudio.addSyllabusLesson);
  const removeLesson = useMutation(api.courseStudio.removeSyllabusLesson);

  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [homework, setHomework] = useState<Homework>({ title: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // New lesson form
  const [showNewLesson, setShowNewLesson] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState("60");
  const [newFree, setNewFree] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);

  const contentMap = new Map(
    lessonContents.map((c: any) => [c.lessonId, c]),
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await getUploadUrl();
      const storageId = await uploadBlob(url, file);
      setAttachments((prev) => [
        ...prev,
        { name: file.name, url: storageId, size: file.size, type: file.type },
      ]);
      toast.success(`فایل "${file.name}" آپلود شد`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در آپلود");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!selectedLesson) return;
    setSaving(true);
    try {
      const idx = syllabus.findIndex((s) => s.id === selectedLesson);
      await saveContent({
        courseId: courseId as any,
        lessonId: selectedLesson,
        videoUrl: videoUrl || undefined,
        textContent: textContent || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        order: idx >= 0 ? idx : 0,
      });
      toast.success("محتوای جلسه ذخیره شد");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  const loadLesson = (lessonId: string) => {
    setSelectedLesson(lessonId);
    const existing = contentMap.get(lessonId);
    setVideoUrl(existing?.videoUrl ?? "");
    setTextContent(existing?.textContent ?? "");
    setAttachments(existing?.attachments ?? []);
    setQuizQuestions([]);
    setHomework({ title: "", description: "" });
  };

  const handleAddLesson = async () => {
    if (!newTitle.trim()) {
      toast.error("عنوان جلسه را وارد کنید");
      return;
    }
    setAddingLesson(true);
    try {
      await addLesson({
        courseId: courseId as any,
        title: newTitle.trim(),
        durationMin: Number(newDuration) || 60,
        free: newFree,
      });
      toast.success("جلسه جدید اضافه شد");
      setNewTitle("");
      setNewDuration("60");
      setNewFree(false);
      setShowNewLesson(false);
      onSyllabusChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setAddingLesson(false);
    }
  };

  const handleRemoveLesson = async (lessonId: string) => {
    if (!confirm("آیا از حذف این جلسه مطمئنید؟")) return;
    try {
      await removeLesson({ courseId: courseId as any, lessonId });
      toast.success("جلسه حذف شد");
      if (selectedLesson === lessonId) setSelectedLesson(null);
      onSyllabusChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    }
  };

  const addQuizQuestion = () => {
    setQuizQuestions((prev) => [
      ...prev,
      { text: "", options: ["", "", "", ""], correctIndex: 0 },
    ]);
  };

  const updateQuizQuestion = (idx: number, field: string, value: any) => {
    setQuizQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)),
    );
  };

  const removeQuizQuestion = (idx: number) => {
    setQuizQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">محتوای جلسات</h3>
          <p className="mt-1 text-xs text-slate-400">
            برای هر جلسه ویدئو، متن، فایل، آزمون و تکلیف اضافه کنید.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10"
          onClick={() => setShowNewLesson(!showNewLesson)}
        >
          <Plus className="ml-1 size-3.5" />
          جلسه جدید
        </Button>
      </div>

      {/* Add new lesson form */}
      {showNewLesson && (
        <Card className="border-emerald-400/20 bg-emerald-400/5">
          <CardContent className="space-y-3 py-4">
            <h4 className="text-xs font-bold text-emerald-200">افزودن جلسه جدید</h4>
            <Input
              placeholder="عنوان جلسه"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="border-white/10 bg-white/5 text-sm text-slate-100"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">مدت (دقیقه)</label>
                <Input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="border-white/10 bg-white/5 text-sm text-slate-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">نوع دسترسی</label>
                <Select value={newFree ? "free" : "paid"} onValueChange={(v) => setNewFree(v === "free")}>
                  <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">رایگان</SelectItem>
                    <SelectItem value="paid">پولی</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowNewLesson(false)}>
                انصراف
              </Button>
              <Button
                size="sm"
                onClick={handleAddLesson}
                disabled={addingLesson || !newTitle.trim()}
                className="bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              >
                {addingLesson ? <Loader2 className="ml-1 size-3 animate-spin" /> : <Plus className="ml-1 size-3" />}
                افزودن
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lesson list */}
      <div className="grid gap-2 sm:grid-cols-2">
        {syllabus.map((s, i) => {
          const hasContent = contentMap.has(s.id);
          return (
            <div key={s.id} className="flex items-center gap-1">
              <button
                onClick={() => loadLesson(s.id)}
                className={`flex flex-1 items-center gap-3 rounded-lg border p-3 text-right transition-colors ${
                  selectedLesson === s.id
                    ? "border-cyan-400/40 bg-cyan-400/10"
                    : "border-white/5 bg-white/[0.02] hover:border-white/10"
                }`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    hasContent
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-white/5 text-slate-400"
                  }`}
                >
                  {hasContent ? <CheckCircle2 className="size-3.5" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">{s.title}</p>
                  <p className="text-[10px] text-slate-500">
                    {s.durationMin} دقیقه{s.free ? " · رایگان" : ""}
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleRemoveLesson(s.id)}
                className="size-7 shrink-0 flex items-center justify-center rounded-lg text-slate-500 hover:bg-red-400/10 hover:text-red-400"
                title="حذف جلسه"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Content editor */}
      {selectedLesson && (
        <Card className="border-cyan-400/20 bg-[#0b1a2a]">
          <CardContent className="space-y-4 py-4">
            <h4 className="text-sm font-bold text-cyan-200">
              ویرایش محتوا — {syllabus.find((s) => s.id === selectedLesson)?.title}
            </h4>

            {/* Video URL */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-slate-400">
                <Video className="size-3.5" /> لینک ویدئو (آپارات، یوتیوب، یا URL مستقیم)
              </label>
              <Input
                placeholder="https://www.aparat.com/v/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="border-white/10 bg-white/5 text-sm text-slate-100"
                dir="ltr"
              />
            </div>

            {/* Text content */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-slate-400">
                <FileText className="size-3.5" /> متن آموزشی
              </label>
              <Textarea
                placeholder="متن درس، نکات کلیدی، توضیحات..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={6}
                className="border-white/10 bg-white/5 text-sm text-slate-100"
              />
            </div>

            {/* Attachments */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-slate-400">
                <Upload className="size-3.5" /> فایل‌های پیوست (PDF، جزوه، اسلاید)
              </label>
              <div className="flex flex-wrap gap-2">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                    <LinkIcon className="size-3 text-cyan-300" />
                    <span className="text-xs text-slate-300">{a.name}</span>
                    <button onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-400/50 hover:text-red-400">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="cursor-pointer">
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                <Button size="sm" variant="outline" className="border-white/10 text-xs" asChild>
                  <span>
                    {uploading ? <Loader2 className="ml-1 size-3 animate-spin" /> : <Upload className="ml-1 size-3" />}
                    آپلود فایل
                  </span>
                </Button>
              </label>
            </div>

            {/* Quiz section */}
            <div className="space-y-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-amber-300">
                  <ClipboardList className="size-3.5" /> آزمون پایان جلسه
                </label>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-amber-300 hover:text-amber-200" onClick={addQuizQuestion}>
                  <Plus className="ml-1 size-3" /> سؤال جدید
                </Button>
              </div>
              {quizQuestions.length > 0 && (
                <div className="space-y-3">
                  {quizQuestions.map((q, qi) => (
                    <div key={qi} className="space-y-2 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] text-slate-500">سؤال {qi + 1}</span>
                        <button onClick={() => removeQuizQuestion(qi)} className="text-red-400/50 hover:text-red-400">
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                      <Input
                        placeholder="متن سؤال"
                        value={q.text}
                        onChange={(e) => updateQuizQuestion(qi, "text", e.target.value)}
                        className="border-white/10 bg-white/5 text-xs text-slate-100"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => (
                          <Input
                            key={oi}
                            placeholder={`گزینه ${oi + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...q.options];
                              newOpts[oi] = e.target.value;
                              updateQuizQuestion(qi, "options", newOpts);
                            }}
                            className={`border-white/10 bg-white/5 text-xs text-slate-100 ${q.correctIndex === oi ? "border-emerald-400/50" : ""}`}
                          />
                        ))}
                      </div>
                      <Select value={String(q.correctIndex)} onValueChange={(v) => updateQuizQuestion(qi, "correctIndex", Number(v))}>
                        <SelectTrigger className="border-white/10 bg-white/5 text-[10px] text-slate-300">
                          <SelectValue placeholder="پاسخ صحیح" />
                        </SelectTrigger>
                        <SelectContent>
                          {q.options.map((_, oi) => (
                            <SelectItem key={oi} value={String(oi)}>گزینه {oi + 1} صحیح</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
              {quizQuestions.length === 0 && (
                <p className="text-[10px] text-amber-400/60">هنوز سؤالی اضافه نشده. روی «سؤال جدید» کلیک کنید.</p>
              )}
            </div>

            {/* Homework section */}
            <div className="space-y-2 rounded-lg border border-purple-400/20 bg-purple-400/5 p-3">
              <label className="flex items-center gap-1.5 text-xs text-purple-300">
                <BookOpen className="size-3.5" /> تکلیف این جلسه
              </label>
              <Input
                placeholder="عنوان تکلیف"
                value={homework.title}
                onChange={(e) => setHomework((h) => ({ ...h, title: e.target.value }))}
                className="border-white/10 bg-white/5 text-xs text-slate-100"
              />
              <Textarea
                placeholder="توضیحات تکلیف، سؤالات، تاریخ تحویل..."
                value={homework.description}
                onChange={(e) => setHomework((h) => ({ ...h, description: e.target.value }))}
                rows={3}
                className="border-white/10 bg-white/5 text-xs text-slate-100"
              />
            </div>

            {/* Save */}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20"
              >
                {saving ? <Loader2 className="ml-1 size-3 animate-spin" /> : <Save className="ml-1 size-3" />}
                ذخیره محتوا
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedLesson && (
        <p className="text-center text-xs text-slate-500">
          یک جلسه را از لیست بالا انتخاب کنید تا محتوای آن را ویرایش کنید.
        </p>
      )}
    </div>
  );
}
