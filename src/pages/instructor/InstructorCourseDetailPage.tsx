import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Users,
  Calendar,
  Clock,
  BookOpen,
  Edit2,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function InstructorCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Data ──────────────────────────────────────────────────────────────
  const courseStudioSections = useQuery(
    api.courseStudio.getCourseSectionsWithLessons,
    courseId ? { courseId: courseId as any } : "skip"
  );

  const myCourses = useQuery(api.courseStudio.listMyCourseStudio);

  // Find the current course from the instructor's courses
  const course = useMemo(() => {
    if (!myCourses || !courseId) return null;
    return myCourses.find(
      (c: any) => c._id === courseId || c.courseId === courseId
    );
  }, [myCourses, courseId]);

  const exams = useQuery(api.tests.listExams, {});

  const myPayments = useQuery(api.instructorTools.listMyPayments);

  // ── State ─────────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // ── Loading ───────────────────────────────────────────────────────────
  if (course === undefined || myCourses === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">دوره پیدا نشد</p>
          <Button onClick={() => navigate("/panel/instructor")}>بازگشت</Button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/panel/instructor")}
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            بازگشت
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-6">

          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={course.published ? "default" : "secondary"}>
                  {course.published ? "منتشر شده" : "پیش‌نویس"}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold">{course.title}</h1>
              {course.description && (
                <p className="text-muted-foreground mt-2 line-clamp-3">
                  {course.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">بخش‌ها</p>
                  <p className="text-sm font-bold">
                    {courseStudioSections?.length ?? 0}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">آزمون‌ها</p>
                  <p className="text-sm font-bold">{exams?.length ?? 0}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">وضعیت</p>
                  <p className="text-sm font-bold">
                    {course.status ?? "draft"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sections List ────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              بخش‌ها و درس‌ها ({courseStudioSections?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!courseStudioSections || courseStudioSections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>هنوز بخشی اضافه نشده</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseStudioSections.map((section: any) => (
                  <div
                    key={section._id}
                    className="p-4 rounded-lg border bg-background"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() =>
                        setExpandedSection(
                          expandedSection === section._id
                            ? null
                            : section._id
                        )
                      }
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground opacity-50" />
                        <div>
                          <p className="font-medium">{section.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {section.lessons?.length ?? 0} درس
                          </p>
                        </div>
                      </div>
                      {expandedSection === section._id ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    {expandedSection === section._id &&
                      section.lessons?.length > 0 && (
                        <div className="mt-3 space-y-1 border-t pt-3">
                          {section.lessons.map((lesson: any) => (
                            <div
                              key={lesson._id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                            >
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">
                                  {lesson.title}
                                </p>
                              </div>
                              {lesson.duration && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {lesson.duration} دقیقه
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Exams ──────────────────────────────────────────── */}
        {exams && exams.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                آزمون‌ها ({exams.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {exams.map((q: any) => (
                  <div
                    key={q._id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{q.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {q.questions?.length ?? 0} سوال
                        </p>
                      </div>
                    </div>
                    <Badge variant={q.isPublished ? "default" : "secondary"}>
                      {q.isPublished ? "منتشر" : "پیش‌نویس"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
