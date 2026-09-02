import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PublicLayout } from "@/components/site/PublicLayout";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Download,
  FileText,
  Film,
  Loader2,
  Play,
} from "lucide-react";
import { toast } from "sonner";

export default function LessonPlayerPage() {
  const { slug = "", lessonId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const course = useQuery(api.content.getCourseBySlug, { slug });
  const sectionsWithLessons = useQuery(
    api.courseStudio.getCourseSectionsWithLessons,
    course ? { courseId: course._id } : "skip"
  );
  const allProgress = useQuery(
    api.courseStudio.getMyLessonProgress,
    course ? { courseId: course._id } : "skip"
  );
  const updateProgress = useMutation(api.courseStudio.updateLessonProgress);

  const [saving, setSaving] = useState(false);

  // Build flat ordered lesson list
  const flatLessons = useCallback(() => {
    if (!sectionsWithLessons) return [];
    const result: any[] = [];
    for (const section of sectionsWithLessons) {
      for (const lesson of section.lessons ?? []) {
        result.push({ ...lesson, sectionTitle: section.title, sectionOrder: section.order });
      }
    }
    return result;
  }, [sectionsWithLessons]);

  const lessons = flatLessons();
  const currentIndex = lessons.findIndex((l: any) => l._id === lessonId);
  const currentLesson = currentIndex >= 0 ? lessons[currentIndex] : null;
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  // Progress map
  const progressMap: Record<string, any> = {};
  for (const p of allProgress ?? []) {
    progressMap[p.lessonId] = p;
  }

  const myProgress = currentLesson ? progressMap[currentLesson._id] : null;
  const completedCount = allProgress?.filter((p: any) => p.completed).length ?? 0;
  const totalLessons = lessons.length;
  const percent = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

  const isEnrolled = !!course?.enrollment;
  const isPreview = currentLesson?.isPreview;

  // Save video position periodically
  const savePosition = useCallback(
    async (positionSeconds: number) => {
      if (!course || !currentLesson || !isEnrolled) return;
      try {
        await updateProgress({
          courseId: course._id,
          lessonId: currentLesson._id,
          lastPositionSeconds: Math.floor(positionSeconds),
        });
      } catch {
        // Silently fail for position saves
      }
    },
    [course, currentLesson, isEnrolled, updateProgress]
  );

  // Debounced save
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTimeUpdate = useCallback(
    (currentTime: number) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => savePosition(currentTime), 5000);
    },
    [savePosition]
  );

  // Mark complete
  const handleMarkComplete = async () => {
    if (!course || !currentLesson) return;
    setSaving(true);
    try {
      await updateProgress({
        courseId: course._id,
        lessonId: currentLesson._id,
        completed: true,
      });
      toast.success("جلسه تکمیل شد");
      // Auto-navigate to next lesson
      if (nextLesson) {
        navigate(`/courses/${slug}/lesson/${nextLesson._id}`, { replace: true });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (course === undefined || sectionsWithLessons === undefined) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </PublicLayout>
    );
  }

  if (!course || !currentLesson) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <p className="text-lg font-bold">جلسه پیدا نشد</p>
          <Button asChild variant="outline">
            <Link to={`/courses/${slug}`}>بازگشت به دوره</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  // Check access
  if (!isEnrolled && !isPreview) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
          <div className="size-12 rounded-full border-2 border-muted-foreground/30" />
          <p className="text-lg font-bold">این جلسه خصوصی است</p>
          <p className="text-sm text-muted-foreground">
            برای دسترسی به این محتوا باید در دوره ثبت‌نام کنید.
          </p>
          <Button asChild>
            <Link to={`/courses/${slug}`}>خرید دوره</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">خانه</Link>
          <ChevronLeft className="size-3" />
          <Link to="/courses" className="hover:text-foreground">دوره‌ها</Link>
          <ChevronLeft className="size-3" />
          <Link to={`/courses/${slug}`} className="hover:text-foreground">{course.title}</Link>
          <ChevronLeft className="size-3" />
          <span className="text-foreground">{currentLesson.title}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Main content */}
          <div className="space-y-6">
            {/* Video Player */}
            {currentLesson.videoUrl && (
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
                <video
                  key={currentLesson._id}
                  className="h-full w-full"
                  controls
                  autoPlay={false}
                  onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget.currentTime)}
                  onEnded={handleMarkComplete}
                >
                  <source src={currentLesson.videoUrl} />
                  مرورگر شما از پخش ویدئو پشتیبانی نمی‌کند.
                </video>
              </div>
            )}

            {/* Video from storage */}
            {currentLesson.videoStorageId && !currentLesson.videoUrl && (
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
                <video
                  key={currentLesson._id}
                  className="h-full w-full"
                  controls
                  autoPlay={false}
                  onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget.currentTime)}
                  onEnded={handleMarkComplete}
                >
                  <source src={currentLesson.videoStorageId} />
                  مرورگر شما از پخش ویدئو پشتیبانی نمی‌کند.
                </video>
              </div>
            )}

            {/* No video placeholder */}
            {!currentLesson.videoUrl && !currentLesson.videoStorageId && (
              <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-border bg-muted/30">
                <div className="text-center">
                  <Film className="mx-auto size-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">محتوای ویدئویی وجود ندارد</p>
                </div>
              </div>
            )}

            {/* Lesson info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[10px]">
                  {currentLesson.sectionTitle}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {currentLesson.durationMin} دقیقه
                </span>
                {myProgress?.completed && (
                  <Badge className="bg-emerald-500/15 text-emerald-300 text-[10px]">
                    <CheckCircle2 className="ml-1 size-3" /> تکمیل شده
                  </Badge>
                )}
              </div>
              <h1 className="text-xl font-extrabold tracking-tight">{currentLesson.title}</h1>
              {currentLesson.description && (
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{currentLesson.description}</p>
              )}
            </div>

            {/* Text content */}
            {currentLesson.textContent && (
              <Card className="border-border/70">
                <CardContent className="prose prose-sm dark:prose-invert max-w-none py-4">
                  <div className="whitespace-pre-wrap text-sm leading-7">{currentLesson.textContent}</div>
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            {currentLesson.attachments && currentLesson.attachments.length > 0 && (
              <Card className="border-border/70">
                <CardContent className="py-4">
                  <h3 className="mb-3 text-sm font-bold">فایل‌های پیوست</h3>
                  <div className="space-y-2">
                    {currentLesson.attachments.map((att: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="flex-1 text-sm">{att.name}</span>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={`/api/storage/${att.storageId}`} download={att.name}>
                            <Download className="ml-1 size-3.5" />
                            دانلود
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/50">
              {prevLesson ? (
                <Button variant="outline" asChild>
                  <Link to={`/courses/${slug}/lesson/${prevLesson._id}`}>
                    <ArrowRight className="ml-2 size-4" />
                    جلسه قبلی
                  </Link>
                </Button>
              ) : (
                <div />
              )}

              {/* Mark complete */}
              {!myProgress?.completed && (
                <Button
                  onClick={handleMarkComplete}
                  disabled={saving}
                  className="bg-emerald-500 text-white hover:bg-emerald-400"
                >
                  {saving ? <Loader2 className="ml-1 size-4 animate-spin" /> : <CheckCircle2 className="ml-1 size-4" />}
                  تکمیل جلسه
                </Button>
              )}

              {nextLesson ? (
                <Button asChild>
                  <Link to={`/courses/${slug}/lesson/${nextLesson._id}`}>
                    جلسه بعدی
                    <ArrowLeft className="mr-2 size-4" />
                  </Link>
                </Button>
              ) : myProgress?.completed ? (
                <Badge className="bg-emerald-500/15 text-emerald-300 px-4 py-2">
                  🎉 دوره تمام شد!
                </Badge>
              ) : (
                <div />
              )}
            </div>
          </div>

          {/* Sidebar - Course outline */}
          <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
            <Card className="border-border/70">
              <CardContent className="p-4">
                <h3 className="mb-1 text-sm font-bold">پیشرفت دوره</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  {completedCount} از {totalLessons} جلسه ({percent}%)
                </p>
                <Progress value={percent} className="h-1.5 mb-4" />

                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {sectionsWithLessons?.map((section: any) => (
                    <div key={section._id}>
                      <p className="mb-1 text-[10px] font-bold text-primary">{section.title}</p>
                      <div className="space-y-0.5">
                        {section.lessons?.map((lesson: any) => {
                          const isCurrent = lesson._id === currentLesson._id;
                          const p = progressMap[lesson._id];
                          const isCompleted = p?.completed;
                          return (
                            <Link
                              key={lesson._id}
                              to={`/courses/${slug}/lesson/${lesson._id}`}
                              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] transition-colors ${
                                isCurrent
                                  ? "bg-primary/10 text-primary font-bold"
                                  : isCompleted
                                    ? "text-emerald-400 hover:bg-white/5"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="size-3 shrink-0" />
                              ) : isCurrent ? (
                                <Play className="size-3 shrink-0" />
                              ) : (
                                <span className="size-3 shrink-0" />
                              )}
                              <span className="truncate">{lesson.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}
