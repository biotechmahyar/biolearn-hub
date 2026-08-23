import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarClock,
  CheckCircle2,
  Compass,
  HelpCircle,
  MessageCircleQuestion,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Tab = "questions" | "groups" | "sessions";

type QuestionRow = (typeof api.mentor.listMentorQuestions)["_returnType"][number];
type GroupRow = (typeof api.collab.listMentorGroups)["_returnType"][number];
type SessionRow = (typeof api.mentor.listSessions)["_returnType"][number];

const TABS: { id: Tab; label: string; icon: typeof Compass; hint: string }[] = [
  { id: "questions", label: "سؤالات دانشجویان", icon: MessageCircleQuestion, hint: "پاسخ به سؤالات" },
  { id: "groups", label: "گروه‌های منتورینگ", icon: Users, hint: "حلقه‌های مطالعه" },
  { id: "sessions", label: "جلسات انفرادی", icon: CalendarClock, hint: "برنامه‌ریزی ۱:۱" },
];

export default function MentorPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("questions");

  const stats = useQuery(api.mentor.mentorStats);
  const touchPresence = useMutation(api.collab.touchPresence);

  useEffect(() => {
    touchPresence({ location: "میز منتور" });
    const t = setInterval(() => touchPresence({ location: "میز منتور" }), 25_000);
    return () => clearInterval(t);
  }, [touchPresence]);

  return (
    <div className="min-h-screen bg-[#17100a] text-amber-50" dir="rtl">
      <header className="sticky top-0 z-20 border-b border-amber-400/10 bg-[#17100a]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10">
              <Compass className="size-5 text-amber-300" />
            </span>
            <div>
              <h1 className="text-sm font-bold text-amber-100">میز منتور</h1>
              <p className="font-mono text-[10px] tracking-wide text-amber-400/60">
                mentor desk · guidance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-400/20 bg-amber-400/10 text-[11px] text-amber-200">
              <HelpCircle className="size-3" />
              {stats?.openQuestions ?? 0} سؤال در انتظار
            </Badge>
            <Badge variant="outline" className="border-white/10 font-mono text-[10px] text-amber-100/70">
              {user?.name ?? "منتور"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-100/50"
              onClick={() => navigate(user?.role === "admin" || user?.role === "site_admin" ? "/admin" : "/")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  tab === t.id
                    ? "border border-amber-400/30 bg-amber-400/10 text-amber-200"
                    : "text-amber-100/40 hover:bg-white/5 hover:text-amber-100"
                }`}
              >
                <t.icon className="size-4" />
                <span>{t.label}</span>
                <span className="mr-auto hidden font-mono text-[10px] text-amber-100/30 lg:inline">
                  {t.hint}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          {tab === "questions" && <QuestionsView />}
          {tab === "groups" && <GroupsView />}
          {tab === "sessions" && <SessionsView />}
        </main>
      </div>
    </div>
  );
}

// ── Q&A ─────────────────────────────────────────────────────────────────────
function QuestionsView() {
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("عمومی");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [replyTarget, setReplyTarget] = useState<string | null>(null);

  const questions = useQuery(api.mentor.listMentorQuestions) ?? [];
  const askMentor = useMutation(api.mentor.askMentor);
  const answerMentorQuestion = useMutation(api.mentor.answerMentorQuestion);

  const open = questions.filter((q) => q.status === "open");
  const answered = questions.filter((q) => q.status === "answered");

  async function handleAsk() {
    if (text.trim().length < 5) return;
    try {
      await askMentor({ text, topic });
      setText("");
      toast.success("سؤال برای منتور ارسال شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  }

  async function handleAnswer(q: QuestionRow) {
    const answer = answers[q._id];
    if (!answer?.trim()) return;
    try {
      await answerMentorQuestion({ questionId: q._id, answer });
      setAnswers((a) => ({ ...a, [q._id]: "" }));
      setReplyTarget(null);
      toast.success("پاسخ ثبت شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-amber-50">سؤالات دانشجویان</h2>
        <p className="mt-1 text-sm text-amber-100/50">
          دانشجویان در هر لحظه می‌توانند سؤال بپرسند؛ پاسخ‌ها برای همان دانشجو نمایش داده می‌شود.
        </p>
      </div>

      {/* Ask box (mentors can test the flow as a student too) */}
      <Card className="border-amber-400/15 bg-[#201609]">
        <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
          <Input
            placeholder="سؤال جدید خود را بنویسید…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            className="flex-1 border-white/10 bg-white/5 text-amber-50 placeholder:text-amber-100/30"
          />
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger className="w-full border-white/10 bg-white/5 text-amber-50 sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="عمومی">عمومی</SelectItem>
              <SelectItem value="برنامه تحصیلی">برنامه تحصیلی</SelectItem>
              <SelectItem value="پروژه">پروژه</SelectItem>
              <SelectItem value="مسیر شغلی">مسیر شغلی</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAsk}>
            <Send className="size-4" />
            پرسیدن
          </Button>
        </CardContent>
      </Card>

      {open.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400/70">
            در انتظار پاسخ ({open.length})
          </p>
          {open.map((q) => (
            <Card key={q._id} className="border-amber-400/20 bg-[#201609]">
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-amber-400/10 text-sm font-bold text-amber-300">
                    {(q.studentName ?? "؟").slice(0, 1)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-amber-50">{q.studentName}</p>
                    <Badge variant="outline" className="mt-0.5 border-amber-400/20 text-[10px] text-amber-300">
                      {q.topic}
                    </Badge>
                  </div>
                  <span className="mr-auto font-mono text-[10px] text-amber-100/30">
                    {new Date(q.createdAt).toLocaleDateString("fa-IR")}
                  </span>
                </div>
                <p className="text-sm text-amber-100/80">{q.text}</p>

                {replyTarget === q._id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      placeholder="پاسخ شما…"
                      value={answers[q._id] ?? ""}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q._id]: e.target.value }))}
                      className="flex-1 border-amber-400/30 bg-white/5 text-amber-50 placeholder:text-amber-100/30"
                    />
                    <Button size="sm" onClick={() => handleAnswer(q)}>
                      <Send className="size-3.5" />
                      ارسال
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setReplyTarget(null)}>
                      انصراف
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-400/30 text-amber-300 hover:bg-amber-400/10"
                    onClick={() => setReplyTarget(q._id)}
                  >
                    <MessageCircleQuestion className="size-4" />
                    پاسخ دادن
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {answered.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-100/40">
            پاسخ‌داده‌شده ({answered.length})
          </p>
          {answered.map((q) => (
            <Card key={q._id} className="border-white/5 bg-white/[0.02]">
              <CardContent className="space-y-2 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <span className="font-bold text-amber-100/80">{q.studentName}</span>
                  <span className="text-xs text-amber-100/40">— {q.topic}</span>
                </div>
                <p className="text-sm text-amber-100/70">{q.text}</p>
                <div className="rounded-md border border-emerald-400/15 bg-emerald-400/5 px-3 py-2 text-sm text-emerald-200/90">
                  {q.answer}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {questions.length === 0 && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Sparkles className="size-8 text-amber-100/30" />
            <p className="text-sm text-amber-100/50">
              هنوز سؤالی نیامده. وقتی دانشجویی سؤال بپرسد اینجا نمایش داده می‌شود.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Mentoring groups ────────────────────────────────────────────────────────
function GroupsView() {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDay, setMeetingDay] = useState("پنجشنبه");
  const [meetingTime, setMeetingTime] = useState("۱۸:۰۰");
  const [capacity, setCapacity] = useState(8);

  const groups = useQuery(api.collab.listMentorGroups) ?? [];
  const createMentorGroup = useMutation(api.collab.createMentorGroup);
  const deleteMentorGroup = useMutation(api.collab.deleteMentorGroup);

  async function handleCreate() {
    try {
      await createMentorGroup({ title, description, meetingDay, meetingTime, capacity });
      toast.success("گروه منتورینگ ساخته شد");
      setShowCreate(false);
      setTitle("");
      setDescription("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-amber-50">گروه‌های منتورینگ</h2>
          <p className="mt-1 text-sm text-amber-100/50">
            حلقه‌های مطالعهٔ کوچک با جلسات هفتگی؛ دانشجویان می‌توانند عضو شوند.
          </p>
        </div>
        <Button
          className="border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
          onClick={() => setShowCreate((s) => !s)}
        >
          <Plus className="size-4" />
          گروه جدید
        </Button>
      </div>

      {showCreate && (
        <Card className="border-amber-400/20 bg-[#201609]">
          <CardHeader>
            <CardTitle className="text-sm text-amber-200">ایجاد گروه جدید</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="نام گروه (مثلاً: حلقهٔ میکروب‌شناسی)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-white/10 bg-white/5 text-amber-50 placeholder:text-amber-100/30"
            />
            <Textarea
              placeholder="توضیح: این گروه برای چه کسانی است و چه کاری انجام می‌دهد؟"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-white/10 bg-white/5 text-amber-50 placeholder:text-amber-100/30"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Select value={meetingDay} onValueChange={setMeetingDay}>
                <SelectTrigger className="border-white/10 bg-white/5 text-amber-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="ساعت (۱۸:۰۰)"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="border-white/10 bg-white/5 text-amber-50 placeholder:text-amber-100/30"
              />
              <Input
                type="number"
                placeholder="ظرفیت"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="border-white/10 bg-white/5 text-amber-50 placeholder:text-amber-100/30"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreate}>ایجاد گروه</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((g) => (
          <Card key={g._id} className="border-amber-400/15 bg-[#201609]">
            <CardContent className="space-y-3 py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-amber-300" />
                  <h3 className="font-bold text-amber-50">{g.title}</h3>
                </div>
                <button
                  onClick={async () => {
                    await deleteMentorGroup({ groupId: g._id });
                    toast.success("گروه حذف شد");
                  }}
                  className="text-amber-100/30 transition-colors hover:text-red-400"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="text-xs text-amber-100/60">{g.description}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-amber-100/50">
                <Badge variant="outline" className="border-amber-400/20 text-amber-300">
                  {g.meetingDay} · {g.meetingTime}
                </Badge>
                <span>
                  {g.memberCount}/{g.capacity} عضو
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && !showCreate && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="size-8 text-amber-100/30" />
            <p className="text-sm text-amber-100/50">هنوز گروهی نساخته‌اید.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Sessions ────────────────────────────────────────────────────────────────
function SessionsView() {
  const [showPlan, setShowPlan] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("۱۷:۰۰");
  const [notes, setNotes] = useState("");

  const sessions = useQuery(api.mentor.listSessions) ?? [];
  const students = useQuery(api.mentor.listStudents) ?? [];
  const planSession = useMutation(api.mentor.planSession);
  const setSessionStatus = useMutation(api.mentor.setSessionStatus);

  async function handlePlan() {
    if (!studentId || !title.trim()) {
      toast.error("دانشجو و عنوان جلسه را انتخاب کنید");
      return;
    }
    try {
      await planSession({ studentId: studentId as any, title, date, time, notes });
      toast.success("جلسه برنامه‌ریزی شد");
      setShowPlan(false);
      setTitle("");
      setDate("");
      setNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-amber-50">جلسات انفرادی</h2>
          <p className="mt-1 text-sm text-amber-100/50">
            جلسات ۱:۱ با دانشجویان را زمان‌بندی و پیگیری کنید.
          </p>
        </div>
        <Button
          className="border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
          onClick={() => setShowPlan((s) => !s)}
        >
          <Plus className="size-4" />
          جلسهٔ جدید
        </Button>
      </div>

      {showPlan && (
        <Card className="border-amber-400/20 bg-[#201609]">
          <CardHeader>
            <CardTitle className="text-sm text-amber-200">برنامه‌ریزی جلسه</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="border-white/10 bg-white/5 text-amber-50">
                <SelectValue placeholder="دانشجو را انتخاب کنید…" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name} {s.email ? `(${s.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="عنوان جلسه (مثلاً: مرور روش تحقیق)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-white/10 bg-white/5 text-amber-50 placeholder:text-amber-100/30"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-white/10 bg-white/5 text-amber-50"
              />
              <Input
                placeholder="ساعت (۱۷:۰۰)"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="border-white/10 bg-white/5 text-amber-50 placeholder:text-amber-100/30"
              />
            </div>
            <Textarea
              placeholder="یادداشت‌ها (اختیاری)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border-white/10 bg-white/5 text-amber-50 placeholder:text-amber-100/30"
            />
            <div className="flex justify-end">
              <Button onClick={handlePlan}>
                <CalendarClock className="size-4" />
                ثبت جلسه
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {sessions.map((s) => (
          <Card key={s._id} className="border-amber-400/15 bg-[#201609]">
            <CardContent className="flex flex-wrap items-center gap-3 py-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-amber-400/10">
                <CalendarClock className="size-4 text-amber-300" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-amber-50">{s.title}</p>
                <p className="text-xs text-amber-100/50">
                  {s.studentName} · {s.date || "بدون تاریخ"} · {s.time}
                </p>
                {s.notes && <p className="mt-1 text-xs text-amber-100/40">{s.notes}</p>}
              </div>
              <Badge
                variant="outline"
                className={
                  s.status === "done"
                    ? "border-emerald-400/30 text-emerald-300"
                    : s.status === "cancelled"
                      ? "border-red-400/30 text-red-300"
                      : "border-amber-400/30 text-amber-300"
                }
              >
                {s.status === "done" ? "انجام‌شده" : s.status === "cancelled" ? "لغوشده" : "زمان‌بندی‌شده"}
              </Badge>
              {s.status === "scheduled" && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setSessionStatus({ sessionId: s._id, status: "done" })}>
                    انجام شد
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] text-red-300" onClick={() => setSessionStatus({ sessionId: s._id, status: "cancelled" })}>
                    لغو
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {sessions.length === 0 && !showPlan && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CalendarClock className="size-8 text-amber-100/30" />
            <p className="text-sm text-amber-100/50">جلسه‌ای ثبت نشده است.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
