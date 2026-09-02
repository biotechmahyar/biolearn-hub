import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  LinkIcon,
  Lock,
  Play,
  Video,
} from "lucide-react";

interface SyllabusItem {
  id: string;
  title: string;
  durationMin: number;
  free: boolean;
}

export function LessonPlayer({
  courseId,
  syllabus,
  isEnrolled,
}: {
  courseId: string;
  syllabus: SyllabusItem[];
  isEnrolled: boolean;
}) {
  const lessonContents =
    useQuery(api.courseStudio.getLessonContentByCourse, {
      courseId: courseId as any,
    }) ?? [];
  const progressRows =
    useQuery(api.courseStudio.getMyLessonProgress, {
      courseId: courseId as any,
    }) ?? [];
  const markComplete = useMutation(api.courseStudio.markLessonComplete);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [completing, setCompleting] = useState(false);

  const contentMap = new Map(
    lessonContents.map((c: any) => [c.lessonId, c]),
  );
  const progressMap = new Map(
    progressRows.map((p: any) => [p.lessonId, p.completed]),
  );

  const current = syllabus[currentIdx];
  const currentContent = current ? contentMap.get(current.id) : null;
  const isCurrentCompleted = current ? progressMap.get(current.id) : false;
  const completedCount = syllabus.filter((s) => progressMap.get(s.id)).length;
  const progressPercent =
    syllabus.length > 0
      ? Math.round((completedCount / syllabus.length) * 100)
      : 0;

  const handleMarkComplete = async () => {
    if (!current) return;
    setCompleting(true);
    try {
      await markComplete({
        courseId: courseId as any,
        lessonId: current.id,
      });
      toast.success("جلسه به‌عنوان تکمیل‌شده ثبت شد");
      // Auto-advance to next lesson
      if (currentIdx < syllabus.length - 1) {
        setTimeout(() => setCurrentIdx(currentIdx + 1), 800);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setCompleting(false);
    }
  };

  if (syllabus.length === 0) {
    return (
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <BookOpen className="size-8 text-slate-600" />
          <p className="text-sm text-slate-400">هنوز سرفصلی برای این دوره ثبت نشده است.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>پیشرفت دوره</span>
          <span>{completedCount}/{syllabus.length} جلسه ({progressPercent}%)</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Lesson navigation sidebar */}
      <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <div className="space-y-1">
          {syllabus.map((s, i) => {
            const done = progressMap.get(s.id);
            const hasContent = contentMap.has(s.id);
            const isCurrent = i === currentIdx;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentIdx(i)}
                disabled={!isEnrolled && !s.free}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-right text-xs transition-colors ${
                  isCurrent
                    ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                    : done
                      ? "text-emerald-300 hover:bg-white/5"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                } ${!isEnrolled && !s.free ? "opacity-40" : ""}`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    done
                      ? "bg-emerald-400/15 text-emerald-300"
                      : isCurrent
                        ? "bg-cyan-400/15 text-cyan-300"
                        : "bg-white/5 text-slate-500"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="size-3" />
                  ) : !isEnrolled && !s.free ? (
                    <Lock className="size-2.5" />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="text-[10px] text-slate-500">{s.durationMin} دقیقه</p>
                </div>
                {hasContent && !done && (
                  <span className="size-1.5 shrink-0 rounded-full bg-cyan-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="space-y-4">
          {current && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  جلسه {currentIdx + 1}: {current.title}
                </h3>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-slate-400"
                    onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                    disabled={currentIdx === 0}
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-slate-400"
                    onClick={() =>
                      setCurrentIdx(Math.min(syllabus.length - 1, currentIdx + 1))
                    }
                    disabled={currentIdx === syllabus.length - 1}
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                </div>
              </div>

              {!isEnrolled && !current.free ? (
                <Card className="border-amber-400/20 bg-amber-400/5">
                  <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                    <Lock className="size-8 text-amber-400/60" />
                    <p className="text-sm text-amber-200">
                      برای دسترسی به این جلسه ابتدا دوره را خریداری کنید.
                    </p>
                  </CardContent>
                </Card>
              ) : currentContent ? (
                <div className="space-y-4">
                  {/* Video */}
                  {currentContent.videoUrl && (
                    <div className="overflow-hidden rounded-xl border border-white/5 bg-black">
                      {currentContent.videoUrl.includes("aparat.com") ||
                      currentContent.videoUrl.includes("youtube.com") ||
                      currentContent.videoUrl.includes("youtu.be") ? (
                        <div className="aspect-video">
                          <iframe
                            src={
                              currentContent.videoUrl.includes("aparat.com")
                                ? currentContent.videoUrl.replace(
                                    /aparat\.com\/embed\/(\w+)/,
                                    "aparat.com/embed/$1",
                                  )
                                : currentContent.videoUrl.replace(
                                    /watch\?v=([^&]+)/,
                                    "embed/$1",
                                  )
                            }
                            className="h-full w-full"
                            allowFullScreen
                            title={current.title}
                          />
                        </div>
                      ) : (
                        <video
                          src={currentContent.videoUrl}
                          controls
                          className="aspect-video w-full"
                        />
                      )}
                    </div>
                  )}

                  {/* Text content */}
                  {currentContent.textContent && (
                    <Card className="border-white/5 bg-white/[0.02]">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                          <FileText className="size-3.5" />
                          متن آموزشی
                        </div>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                          {currentContent.textContent}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Attachments */}
                  {currentContent.attachments &&
                    currentContent.attachments.length > 0 && (
                      <Card className="border-white/5 bg-white/[0.02]">
                        <CardContent className="py-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                            <Download className="size-3.5" />
                            فایل‌های پیوست
                          </div>
                          <div className="space-y-1.5">
                            {currentContent.attachments.map((a: any, i: number) => (
                              <a
                                key={i}
                                href={a.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-cyan-300 hover:bg-white/5"
                              >
                                <LinkIcon className="size-3 shrink-0" />
                                <span className="truncate">{a.name}</span>
                                <span className="mr-auto text-slate-500">
                                  {(a.size / 1024).toFixed(0)} KB
                                </span>
                              </a>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </div>
              ) : (
                <Card className="border-white/5 bg-white/[0.02]">
                  <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                    <Video className="size-8 text-slate-600" />
                    <p className="text-sm text-slate-400">
                      محتوای این جلسه هنوز اضافه نشده است.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Mark complete button */}
              {isEnrolled && !isCurrentCompleted && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleMarkComplete}
                    disabled={completing}
                    className="bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  >
                    {completing ? (
                      <span className="animate-pulse">در حال ثبت...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="ml-1 size-3.5" />
                        تکمیل این جلسه
                      </>
                    )}
                  </Button>
                </div>
              )}
              {isCurrentCompleted && (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  این جلسه را تکمیل کرده‌اید ✓
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
