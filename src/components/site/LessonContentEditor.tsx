import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

export function LessonContentEditor({
  courseId,
  syllabus,
}: {
  courseId: string;
  syllabus: SyllabusItem[];
}) {
  const lessonContents =
    useQuery(api.courseStudio.getLessonContentByCourse, {
      courseId: courseId as any,
    }) ?? [];
  const saveContent = useMutation(api.courseStudio.saveLessonContent);
  const getUploadUrl = useMutation(api.collab.getUploadUrl);

  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        {
          name: file.name,
          url: storageId,
          size: file.size,
          type: file.type,
        },
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
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white">محتوای جلسات</h3>
        <p className="mt-1 text-xs text-slate-400">
          برای هر جلسه ویدئو، متن آموزشی و فایل پیوست اضافه کنید.
        </p>
      </div>

      {/* Lesson list */}
      <div className="grid gap-2 sm:grid-cols-2">
        {syllabus.map((s, i) => {
          const hasContent = contentMap.has(s.id);
          return (
            <button
              key={s.id}
              onClick={() => loadLesson(s.id)}
              className={`flex items-center gap-3 rounded-lg border p-3 text-right transition-colors ${
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
                {hasContent ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">
                  {s.title}
                </p>
                <p className="text-[10px] text-slate-500">
                  {s.durationMin} دقیقه{s.free ? " · رایگان" : ""}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Content editor */}
      {selectedLesson && (
        <Card className="border-cyan-400/20 bg-[#0b1a2a]">
          <CardContent className="space-y-4 py-4">
            <h4 className="text-sm font-bold text-cyan-200">
              ویرایش محتوا —{" "}
              {syllabus.find((s) => s.id === selectedLesson)?.title}
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
                <Upload className="size-3.5" /> فایل‌های پیوست
              </label>
              <div className="flex flex-wrap gap-2">
                {attachments.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5"
                  >
                    <LinkIcon className="size-3 text-cyan-300" />
                    <span className="text-xs text-slate-300">{a.name}</span>
                    <button
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        )
                      }
                      className="text-red-400/50 hover:text-red-400"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-xs"
                    asChild
                  >
                    <span>
                      {uploading ? (
                        <Loader2 className="ml-1 size-3 animate-spin" />
                      ) : (
                        <Upload className="ml-1 size-3" />
                      )}
                      آپلود فایل
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20"
              >
                {saving ? (
                  <Loader2 className="ml-1 size-3 animate-spin" />
                ) : (
                  <Save className="ml-1 size-3" />
                )}
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
