import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import {
  BookOpen,
  CheckCircle2,
  CircleDot,
  Dna,
  DoorOpen,
  HelpCircle,
  MessageSquare,
  MonitorPlay,
  Plus,
  Radio,
  Send,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Tab = "rooms" | "online" | "courses";

type RoomRow = (typeof api.collab.listRooms)["_returnType"][number];
type OnlineRow = (typeof api.collab.listOnline)["_returnType"][number];

const TABS: { id: Tab; label: string; icon: typeof Video }[] = [
  { id: "rooms", label: "کلاس‌های زنده", icon: Video },
  { id: "online", label: "دانشجویان آنلاین", icon: Users },
  { id: "courses", label: "دوره‌های من", icon: BookOpen },
];

export default function InstructorPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("rooms");
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  const rooms = useQuery(api.collab.listRooms) ?? [];
  const online = useQuery(api.collab.listOnline) ?? [];
  const touchPresence = useMutation(api.collab.touchPresence);

  // Heartbeat so students/instructors show as online while in the studio.
  useEffect(() => {
    touchPresence({ location: "استودیوی استاد" });
    const t = setInterval(() => touchPresence({ location: "استودیوی استاد" }), 25_000);
    return () => clearInterval(t);
  }, [touchPresence]);

  return (
    <div className="min-h-screen bg-[#071019] text-slate-200" dir="rtl">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-cyan-400/10 bg-[#071019]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10">
              <Dna className="size-5 text-cyan-300" />
            </span>
            <div>
              <h1 className="text-sm font-bold text-cyan-100">استودیوی استاد</h1>
              <p className="font-mono text-[10px] tracking-wide text-cyan-400/60">
                instructor studio · live
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-300">
              <CircleDot className="size-3 animate-pulse" />
              آنلاین
            </span>
            <Badge variant="outline" className="border-cyan-400/20 font-mono text-[10px] text-cyan-300">
              {user?.name ?? "استاد"}
            </Badge>
            <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => navigate("/")}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        {/* Side nav */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  tab === t.id
                    ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <t.icon className="size-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="min-w-0">
          {tab === "rooms" && !activeRoom && (
            <RoomsView rooms={rooms} onOpen={setActiveRoom} />
          )}
          {tab === "rooms" && activeRoom && (
            <RoomView
              roomId={activeRoom}
              onClose={() => setActiveRoom(null)}
              rooms={rooms}
            />
          )}
          {tab === "online" && <OnlineView online={online} />}
          {tab === "courses" && <CoursesView instructorName={user?.name ?? null} />}
        </main>
      </div>
    </div>
  );
}

// ── Rooms list + create ─────────────────────────────────────────────────────
function RoomsView({
  rooms,
  onOpen,
}: {
  rooms: RoomRow[];
  onOpen: (id: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const createRoom = useMutation(api.collab.createRoom);

  async function handleCreate() {
    try {
      const id = await createRoom({ title, topic, description });
      toast.success("کلاس ساخته شد و اکنون زنده است");
      setShowCreate(false);
      setTitle("");
      setTopic("");
      setDescription("");
      onOpen(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ساخت کلاس");
    }
  }

  const live = rooms.filter((r) => r.status === "live");
  const past = rooms.filter((r) => r.status !== "live");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">کلاس‌های زنده</h2>
          <p className="mt-1 text-sm text-slate-400">
            {live.length} کلاس در حال برگزاری — دانشجویان فقط کلاس‌های زنده را می‌بینند.
          </p>
        </div>
        <Button
          className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20"
          onClick={() => setShowCreate((s) => !s)}
        >
          <Plus className="size-4" />
          کلاس جدید
        </Button>
      </div>

      {showCreate && (
        <Card className="border-cyan-400/20 bg-[#0b1a2a]">
          <CardHeader>
            <CardTitle className="text-sm text-cyan-200">راه‌اندازی کلاس زنده</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="عنوان کلاس (مثلاً: میکروب‌شناسی — گفتگوی زنده)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
            />
            <Input
              placeholder="موضوع (مثلاً: باکتری‌شناسی)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
            />
            <Textarea
              placeholder="توضیح کوتاه دربارهٔ این جلسه…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                انصراف
              </Button>
              <Button size="sm" onClick={handleCreate}>
                <Radio className="size-4" />
                شروع کلاس
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {live.length === 0 && !showCreate && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Video className="size-8 text-slate-600" />
            <p className="text-sm text-slate-400">
              کلاسی در حال برگزاری نیست. یک کلاس جدید بسازید تا دانشجویان بتوانند سؤال بپرسند.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {live.map((room) => (
          <button
            key={room._id}
            onClick={() => onOpen(room._id)}
            className="group rounded-xl border border-cyan-400/15 bg-[#0b1a2a] p-4 text-right transition-all hover:border-cyan-400/40 hover:bg-[#0e2033]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
                <CircleDot className="size-2.5 animate-pulse" />
                LIVE
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                {room.messageCount} پیام
              </span>
            </div>
            <h3 className="mt-3 font-bold text-white group-hover:text-cyan-200">{room.title}</h3>
            <p className="mt-1 text-xs text-slate-400">{room.topic}</p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
              <HelpCircle className="size-3.5 text-amber-300" />
              {room.openQuestions} سؤال بی‌پاسخ
            </div>
          </button>
        ))}
      </div>

      {past.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            جلسات گذشته
          </p>
          <div className="space-y-2">
            {past.map((room) => (
              <button
                key={room._id}
                onClick={() => onOpen(room._id)}
                className="flex w-full items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 text-right hover:bg-white/[0.05]"
              >
                <div>
                  <p className="text-sm text-slate-300">{room.title}</p>
                  <p className="text-[11px] text-slate-500">{room.topic}</p>
                </div>
                <Badge
                  variant="outline"
                  className="border-white/10 text-[10px] text-slate-400"
                >
                  {room.status === "ended" ? "پایان‌یافته" : "زمان‌بندی‌شده"}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Room detail: realtime Q&A ───────────────────────────────────────────────
function RoomView({
  roomId,
  onClose,
  rooms,
}: {
  roomId: string;
  onClose: () => void;
  rooms: RoomRow[];
}) {
  const room = rooms.find((r) => r._id === roomId);
  const detail = useQuery(api.collab.getRoom, { roomId: roomId as any });
  const [text, setText] = useState("");
  const [asQuestion, setAsQuestion] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const sendMessage = useMutation(api.collab.sendMessage);
  const answerQuestion = useMutation(api.collab.answerQuestion);
  const setRoomStatus = useMutation(api.collab.setRoomStatus);
  const [sending, setSending] = useState(false);

  const messages = detail?.messages ?? [];

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMessage({
        roomId: roomId as any,
        text,
        type: asQuestion ? "question" : "message",
      });
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ارسال");
    } finally {
      setSending(false);
    }
  }

  async function handleAnswer(msgId: string) {
    const answer = answers[msgId];
    if (!answer?.trim()) return;
    try {
      await answerQuestion({ messageId: msgId as any, answer });
      setAnswers((a) => ({ ...a, [msgId]: "" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ارسال پاسخ");
    }
  }

  async function handleEnd() {
    try {
      await setRoomStatus({ roomId: roomId as any, status: "ended" });
      toast.success("کلاس پایان یافت");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  }

  const isLive = detail?.status === "live";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400">
            <X className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{room?.title ?? detail?.title}</h2>
              {isLive && (
                <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
                  <CircleDot className="size-2.5 animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">{room?.topic ?? detail?.topic}</p>
          </div>
        </div>
        {isLive && (
          <Button
            variant="outline"
            size="sm"
            className="border-red-400/30 text-red-300 hover:bg-red-400/10"
            onClick={handleEnd}
          >
            <DoorOpen className="size-4" />
            پایان کلاس
          </Button>
        )}
      </div>

      {/* Chat stream */}
      <Card className="border-white/5 bg-[#0b1a2a]">
        <CardContent className="max-h-[52vh] space-y-3 overflow-y-auto py-4">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              هنوز پیامی نیست. از دانشجویان بخواهید سؤال بپرسند.
            </p>
          )}
          {messages.map((m) => {
            const isQuestion = m.type === "question";
            const answered = !!m.answer;
            return (
              <div
                key={m._id}
                className={`rounded-lg border p-3 ${
                  isQuestion
                    ? answered
                      ? "border-emerald-400/20 bg-emerald-400/5"
                      : "border-amber-400/25 bg-amber-400/5"
                    : "border-white/5 bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isQuestion ? (
                    <HelpCircle className="size-4 text-amber-300" />
                  ) : (
                    <MessageSquare className="size-4 text-cyan-300" />
                  )}
                  <span className="text-xs font-bold text-slate-200">{m.name}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {m.role === "instructor" ? "استاد" : "دانشجو"}
                  </span>
                  <span className="mr-auto font-mono text-[10px] text-slate-600">
                    {new Date(m.createdAt).toLocaleTimeString("fa-IR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-300">{m.text}</p>

                {isQuestion && !answered && isLive && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      placeholder="پاسخ استاد…"
                      value={answers[m._id] ?? ""}
                      onChange={(e) =>
                        setAnswers((a) => ({ ...a, [m._id]: e.target.value }))
                      }
                      className="h-8 border-amber-400/20 bg-white/5 text-sm text-slate-100 placeholder:text-slate-500"
                    />
                    <Button
                      size="sm"
                      className="h-8 shrink-0"
                      onClick={() => handleAnswer(m._id)}
                    >
                      <Send className="size-3.5" />
                      پاسخ
                    </Button>
                  </div>
                )}
                {isQuestion && answered && (
                  <div className="mt-2 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                      <CheckCircle2 className="size-3.5" />
                      پاسخ استاد
                    </p>
                    <p className="mt-1 text-sm text-emerald-100/90">{m.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Composer */}
      {isLive && (
        <Card className="border-white/5 bg-[#0b1a2a]">
          <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
            <div className="flex shrink-0 gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
              <button
                onClick={() => setAsQuestion(true)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  asQuestion ? "bg-amber-400/20 text-amber-200" : "text-slate-400"
                }`}
              >
                سؤال
              </button>
              <button
                onClick={() => setAsQuestion(false)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  !asQuestion ? "bg-cyan-400/20 text-cyan-200" : "text-slate-400"
                }`}
              >
                پیام
              </button>
            </div>
            <Input
              placeholder={
                asQuestion
                  ? "سؤالی که دانشجو پرسیده را اینجا می‌بینید… (شما هم می‌توانید پیام بگذارید)"
                  : "اعلان یا توضیح برای کلاس…"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
            />
            <Button size="sm" onClick={handleSend} disabled={sending}>
              <Send className="size-4" />
              ارسال
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Online students ─────────────────────────────────────────────────────────
function OnlineView({ online }: { online: OnlineRow[] }) {
  const students = online.filter((u) => u.role === "user" || u.role === "member" || !u.role);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">دانشجویان آنلاین</h2>
        <p className="mt-1 text-sm text-slate-400">
          {students.length} نفر همین حالا در پلتفرم فعال‌اند (بروزرسانی هر ۶۰ ثانیه).
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((s) => (
          <Card key={s.userId} className="border-white/5 bg-[#0b1a2a]">
            <CardContent className="flex items-center gap-3 py-4">
              <span className="relative flex size-10 items-center justify-center rounded-full bg-cyan-400/10 font-bold text-cyan-200">
                {(s.name ?? "؟").slice(0, 1)}
                <span className="absolute -bottom-0.5 -left-0.5 size-3 rounded-full border-2 border-[#0b1a2a] bg-emerald-400" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-200">{s.name}</p>
                <p className="text-[11px] text-slate-500">{s.location ?? "در حال گشت‌وگذار"}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {students.length === 0 && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="size-8 text-slate-600" />
            <p className="text-sm text-slate-400">الان کسی آنلاین نیست.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── My courses ──────────────────────────────────────────────────────────────
function CoursesView({ instructorName }: { instructorName: string | null }) {
  const courses = useQuery(api.content.listCourses, {}) ?? [];
  const mine = courses.filter((c) => c.instructor?.name === instructorName);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">دوره‌های من</h2>
        <p className="mt-1 text-sm text-slate-400">
          دوره‌هایی که به نام شما ثبت شده‌اند؛ دانشجویان از این‌جا پیشرفتشان را دنبال می‌کنند.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {mine.map((c) => (
          <Card key={c._id} className="border-white/5 bg-[#0b1a2a]">
            <CardContent className="space-y-3 py-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-white">{c.title}</h3>
                <MonitorPlay className="size-5 shrink-0 text-cyan-300" />
              </div>
              <p className="text-xs text-slate-400">{c.summary}</p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Users className="size-3.5" />
                {c.studentsCount ?? 0} دانشجو · {c.syllabus?.length ?? 0} جلسه
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {mine.length === 0 && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpen className="size-8 text-slate-600" />
            <p className="text-sm text-slate-400">
              هنوز دوره‌ای به نام شما ثبت نشده. از پنل مدیریت، دوره را به پروفایل استادی خود متصل کنید.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
