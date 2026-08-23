import { api } from "@/convex/_generated/api";
import { CategoryField } from "@/components/site/CategoryField";
import { MemberProfileEditor } from "@/components/site/MemberProfileEditor";
import { WhiteboardCanvas, type WbTool } from "@/components/site/WhiteboardCanvas";
import { useAuth } from "@/hooks/use-auth";
import { useInstructorBroadcast } from "@/hooks/use-live";
import { formatFileSize, fileKindFromMime, uploadBlob } from "@/lib/upload";
import { useMutation, useQuery } from "convex/react";
import {
  BellRing,
  BookOpen,
  BookUser,
  BookmarkCheck,
  BookmarkPlus,
  Brush,
  Camera,
  CheckCircle2,
  CircleDot,
  Dna,
  DoorOpen,
  Eraser,
  FileText,
  HelpCircle,
  Highlighter,
  Hourglass,
  Loader2,
  MessageSquare,
  Mic,
  MonitorPlay,
  Paperclip,
  Plus,
  Presentation,
  Radio,
  Save,
  Send,
  Square,
  Trash2,
  Upload,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Tab = "rooms" | "online" | "courses" | "announcements" | "profile";

type RoomRow = (typeof api.collab.listRooms)["_returnType"][number];
type OnlineRow = (typeof api.collab.listOnline)["_returnType"][number];
type StrokeRow = (typeof api.collab.listStrokes)["_returnType"][number];

const BOARD_BGS = [
  { label: "تیره", value: "#0f172a" },
  { label: "سیاه", value: "#000000" },
  { label: "سفید", value: "#f8fafc" },
  { label: "کرم", value: "#f5f0e1" },
  { label: "سبز تخته", value: "#14532d" },
  { label: "آبی", value: "#1e3a5f" },
];

const PEN_COLORS = [
  "#ffffff",
  "#fde047",
  "#ef4444",
  "#22c55e",
  "#38bdf8",
  "#a78bfa",
  "#000000",
];

const ANNO_COLORS = ["#ef4444", "#fde047", "#22c55e", "#38bdf8", "#ffffff"];

const TOOL_SIZES: Record<WbTool, number> = {
  pen: 0.012,
  highlighter: 0.03,
  eraser: 0.05,
};

const TABS: { id: Tab; label: string; icon: typeof Video }[] = [
  { id: "rooms", label: "کلاس‌های زنده", icon: Video },
  { id: "courses", label: "طراحی دوره", icon: BookOpen },
  { id: "profile", label: "پروفایل من", icon: User },
  { id: "announcements", label: "اطلاعیه‌ها", icon: BellRing },
  { id: "online", label: "دانشجویان آنلاین", icon: Users },
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
    touchPresence({ location: "استودیوی مدرس" });
    const t = setInterval(() => touchPresence({ location: "استودیوی مدرس" }), 25_000);
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
              <h1 className="text-sm font-bold text-cyan-100">استودیوی مدرس</h1>
              <p className="font-mono text-[10px] tracking-wide text-cyan-400/60">
                instructor studio · live
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-300 sm:flex">
              <CircleDot className="size-3 animate-pulse" />
              آنلاین
            </span>
            <Badge variant="outline" className="hidden border-cyan-400/20 font-mono text-[10px] text-cyan-300 md:inline-flex">
              {user?.name ?? "مدرس"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400"
              onClick={() => navigate(user?.role === "admin" || user?.role === "site_admin" ? "/admin" : "/")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        {/* Side nav */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="flex flex-wrap gap-1 lg:flex-col">
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
                <t.icon className="size-4 shrink-0" />
                <span className="whitespace-nowrap">{t.label}</span>
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
          {tab === "courses" && <CourseStudioView />}
          {tab === "profile" && <ProfileView />}
          {tab === "announcements" && <AnnouncementsView instructorName={user?.name ?? null} />}
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
  const deleteRoom = useMutation(api.collab.deleteRoom);

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {live.map((room) => (
          <button
            key={room._id}
            onClick={() => onOpen(room._id)}
            className="group min-w-0 rounded-xl border border-cyan-400/15 bg-[#0b1a2a] p-4 text-right transition-all hover:border-cyan-400/40 hover:bg-[#0e2033]"
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
            <h3 className="mt-3 break-words font-bold text-white group-hover:text-cyan-200">{room.title}</h3>
            <p className="mt-1 break-words text-xs text-slate-400">{room.topic}</p>
            <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="flex min-w-0 items-center gap-1.5">
                <BookUser className="size-3.5 shrink-0 text-cyan-300/70" />
                <span className="truncate">{room.instructorName}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <HelpCircle className="size-3.5 text-amber-300" />
                {room.openQuestions} سؤال بی‌پاسخ
              </span>
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
              <div
                key={room._id}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 hover:bg-white/[0.05]"
              >
                <button
                  onClick={() => onOpen(room._id)}
                  className="min-w-0 flex-1 text-right"
                >
                  <p className="truncate text-sm text-slate-300">{room.title}</p>
                  <p className="truncate text-[11px] text-slate-500">{room.topic}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-cyan-300/60">
                    <BookUser className="size-3 shrink-0" />
                    مدرس: {room.instructorName}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-white/10 text-[10px] text-slate-400"
                  >
                    {room.status === "ended" ? "پایان‌یافته" : "زمان‌بندی‌شده"}
                  </Badge>
                  <button
                    onClick={() => void deleteRoom({ roomId: room._id as any })}
                    title="حذف جلسه و تمام محتویاتش"
                    className="text-slate-600 transition-colors hover:text-red-400"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Room detail: realtime Q&A + live broadcast + attachments ───────────────
function RoomView({
  roomId,
  onClose,
  rooms,
}: {
  roomId: string;
  onClose: () => void;
  rooms: RoomRow[];
}) {
  const { user } = useAuth();
  const room = rooms.find((r) => r._id === roomId);
  const detail = useQuery(api.collab.getRoom, { roomId: roomId as any });
  const [text, setText] = useState("");
  const [asQuestion, setAsQuestion] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const sendMessage = useMutation(api.collab.sendMessage);
  const answerQuestion = useMutation(api.collab.answerQuestion);
  const setRoomStatus = useMutation(api.collab.setRoomStatus);
  const getUploadUrl = useMutation(api.collab.getUploadUrl);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Whiteboard + screen-share annotation (instructor draws, students watch).
  const boardStrokes = useQuery(api.collab.listStrokes, {
    roomId: roomId as any,
    layer: "board",
  }) ?? [];
  const screenStrokes = useQuery(api.collab.listStrokes, {
    roomId: roomId as any,
    layer: "screen",
  }) ?? [];
  const addStroke = useMutation(api.collab.addStroke);
  const clearStrokes = useMutation(api.collab.clearStrokes);
  const setBoardBg = useMutation(api.collab.setBoardBg);
  const [subTab, setSubTab] = useState<"live" | "board" | "chat">("live");
  const [screenShare, setScreenShare] = useState(false);

  // Live broadcast: publish camera/mic/screen to every student.
  const broadcast = useInstructorBroadcast(roomId, user?._id);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (localVideoRef.current && broadcast.localStream) {
      localVideoRef.current.srcObject = broadcast.localStream;
    }
  }, [broadcast.localStream]);

  // Reset screen-share mode when the broadcast ends for any reason.
  useEffect(() => {
    if (broadcast.status !== "live") setScreenShare(false);
  }, [broadcast.status]);

  // Voice recorder
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleSendAttachment(blob: Blob, kind: "file" | "voice" | "image", name?: string) {
    setUploading(true);
    try {
      const url = await getUploadUrl();
      const storageId = await uploadBlob(url, blob);
      await sendMessage({
        roomId: roomId as any,
        text: kind === "voice" ? "🎙️ پیام صوتی" : "📎 " + (name ?? "فایل"),
        type: "message",
        attachmentType: kind,
        attachmentName: name ?? "voice.webm",
        attachmentStorageId: storageId,
        attachmentSize: blob.size,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در آپلود");
    } finally {
      setUploading(false);
    }
  }

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const kind = fileKindFromMime(file.type);
    void handleSendAttachment(file, kind, file.name);
    e.target.value = "";
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("مرورگر شما از ضبط صدا پشتیبانی نمی‌کند.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        if (blob.size > 0) void handleSendAttachment(blob, "voice");
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "دسترسی به میکروفون ممکن نشد");
    }
  }

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      if (recTimerRef.current) clearInterval(recTimerRef.current);
    };
  }, []);

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
            <p className="text-xs text-slate-400">
              {room?.topic ?? detail?.topic} ·{" "}
              <span className="text-cyan-300/70">مدرس: {room?.instructorName ?? detail?.instructorName}</span>
            </p>
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

      {/* Sub-tabs: live / board / chat */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-white/5 bg-white/[0.02] p-1">
        {(
          [
            { id: "live", label: "پخش زنده", icon: Video },
            { id: "board", label: "تخته", icon: Presentation },
            { id: "chat", label: "گفتگو", icon: MessageSquare },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-bold transition-colors ${
              subTab === t.id
                ? "bg-cyan-400/15 text-cyan-200"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "live" && (
        <LiveSection
          broadcast={broadcast}
          localVideoRef={localVideoRef}
          isLive={isLive}
          screenShare={screenShare}
          setScreenShare={setScreenShare}
          roomId={roomId}
          screenStrokes={screenStrokes}
          addStroke={addStroke}
          clearStrokes={clearStrokes}
        />
      )}

      {subTab === "board" && (
        <BoardSection
          isLive={isLive}
          roomId={roomId}
          strokes={boardStrokes}
          boardBg={detail?.boardBg ?? "#0f172a"}
          addStroke={addStroke}
          clearStrokes={clearStrokes}
          setBoardBg={setBoardBg}
        />
      )}

      {subTab === "chat" && (
        <>
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
                    {m.role === "instructor" ? "مدرس" : "دانشجو"}
                  </span>
                  <span className="mr-auto font-mono text-[10px] text-slate-600">
                    {new Date(m.createdAt).toLocaleTimeString("fa-IR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-300">{m.text}</p>

                {m.attachmentType === "image" && m.attachmentUrl && (
                  <img
                    src={m.attachmentUrl}
                    alt={m.attachmentName ?? "تصویر"}
                    className="mt-2 max-h-64 rounded-lg border border-white/10"
                  />
                )}
                {m.attachmentType === "voice" && m.attachmentUrl && (
                  <audio
                    controls
                    src={m.attachmentUrl}
                    className="mt-2 h-10 w-full max-w-sm"
                  />
                )}
                {m.attachmentType === "file" && m.attachmentUrl && (
                  <a
                    href={m.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex max-w-sm items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10"
                  >
                    <FileText className="size-4 shrink-0 text-cyan-300" />
                    <span className="truncate">{m.attachmentName}</span>
                    {m.attachmentSize ? (
                      <span className="mr-auto shrink-0 font-mono text-[10px] text-slate-500">
                        {formatFileSize(m.attachmentSize)}
                      </span>
                    ) : null}
                  </a>
                )}

                {isQuestion && !answered && isLive && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      placeholder="پاسخ مدرس…"
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
                      پاسخ مدرس
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
            {recording && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-[11px] font-bold text-red-300">
                <span className="size-2 animate-pulse rounded-full bg-red-500" />
                ضبط… {recSeconds}s
              </span>
            )}
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
            <div className="flex shrink-0 items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip,.txt"
                hidden
                onChange={handleFilePicked}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="پیوست فایل / تصویر"
                className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Paperclip className="size-4" />
                )}
              </button>
              <button
                onClick={() => void toggleRecording()}
                title={recording ? "پایان ضبط" : "ضبط پیام صوتی"}
                className={`flex size-8 items-center justify-center rounded-lg border transition-colors ${
                  recording
                    ? "border-red-400/40 bg-red-400/15 text-red-300"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {recording ? <Square className="size-3.5" /> : <Mic className="size-4" />}
              </button>
            </div>
            <Button size="sm" onClick={handleSend} disabled={sending || uploading}>
              <Send className="size-4" />
              ارسال
            </Button>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  );
}

// ── Live broadcast section: camera / mic / screen share + annotation ───────
function LiveSection({
  broadcast,
  localVideoRef,
  isLive,
  screenShare,
  setScreenShare,
  roomId,
  screenStrokes,
  addStroke,
  clearStrokes,
}: {
  broadcast: ReturnType<typeof useInstructorBroadcast>;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  isLive: boolean;
  screenShare: boolean;
  setScreenShare: (v: boolean) => void;
  roomId: string;
  screenStrokes: StrokeRow[];
  addStroke: (args: {
    roomId: any;
    layer: "board" | "screen";
    tool: WbTool;
    color: string;
    size: number;
    points: { x: number; y: number }[];
  }) => void;
  clearStrokes: (args: { roomId: any; layer: "board" | "screen" }) => void;
}) {
  const [annoTool, setAnnoTool] = useState<WbTool>("pen");
  const [annoColor, setAnnoColor] = useState("#ef4444");

  return (
    <Card className="border-cyan-400/20 bg-[#0b1a2a]">
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-cyan-200">
              <Video className="size-4" />
              پخش زنده برای دانشجویان
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {broadcast.status === "live"
                ? screenShare
                  ? "در حال اشتراک صفحه — روی تصویر بکشید تا نکات مهم را مشخص کنید."
                  : "در حال پخش — دانشجویان صدای شما را می‌شنوند و تصویر را می‌بینند."
                : "صدا، دوربین یا صفحهٔ خود را پخش کنید تا دانشجویان زنده ببینند."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {broadcast.status === "live" ? (
              <Button
                size="sm"
                variant="outline"
                className="border-red-400/30 text-red-300 hover:bg-red-400/10"
                onClick={() => void broadcast.stop()}
              >
                <Square className="size-3.5" />
                پایان پخش
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => void broadcast.start(false)}
                  disabled={broadcast.status === "starting"}
                >
                  {broadcast.status === "starting" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Mic className="size-3.5" />
                  )}
                  پخش صدا
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10"
                  onClick={() => void broadcast.start(true)}
                  disabled={broadcast.status === "starting"}
                >
                  <Camera className="size-3.5" />
                  صدا + دوربین
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10"
                  onClick={() => {
                    setScreenShare(true);
                    void broadcast.start(true, "screen");
                  }}
                  disabled={broadcast.status === "starting"}
                >
                  <MonitorPlay className="size-3.5" />
                  اشتراک صفحه
                </Button>
              </>
            )}
          </div>
        </div>
        {broadcast.error && (
          <p className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">
            {broadcast.error}
          </p>
        )}
        {(broadcast.status === "live" || broadcast.localStream) && (
          <div className="relative w-full">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full rounded-lg border border-cyan-400/20 bg-black"
            />
            {screenShare && isLive && (
              <>
                <WhiteboardCanvas
                  strokes={screenStrokes}
                  bg="transparent"
                  tool={annoTool}
                  color={annoColor}
                  size={TOOL_SIZES[annoTool]}
                  onDraw={(s) =>
                    void addStroke({ roomId: roomId as any, layer: "screen", ...s })
                  }
                  className="absolute inset-0 rounded-lg"
                  minHeight={0}
                  borderClass=""
                />
                <div className="absolute bottom-2 left-1/2 flex max-w-[94%] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/75 px-2 py-1.5 backdrop-blur">
                  <button
                    onClick={() => setAnnoTool("pen")}
                    title="قلم"
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      annoTool === "pen" ? "bg-white/20 text-white" : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <Brush className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setAnnoTool("highlighter")}
                    title="هایلایت"
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      annoTool === "highlighter" ? "bg-white/20 text-yellow-300" : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <Highlighter className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setAnnoTool("eraser")}
                    title="پاک‌کن"
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      annoTool === "eraser" ? "bg-white/20 text-white" : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <Eraser className="size-3.5" />
                  </button>
                  <span className="mx-1 h-4 w-px shrink-0 bg-white/15" />
                  {ANNO_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAnnoColor(c)}
                      title={c}
                      className={`size-5 shrink-0 rounded-full border transition-transform ${
                        annoColor === c ? "scale-110 border-white" : "border-white/25 hover:scale-105"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                  <span className="mx-1 h-4 w-px shrink-0 bg-white/15" />
                  <button
                    onClick={() => void clearStrokes({ roomId: roomId as any, layer: "screen" })}
                    title="پاک کردن همهٔ علامت‌ها"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-red-300 transition-colors hover:bg-red-400/15"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Whiteboard section: instructor draws, students watch live ──────────────
function BoardSection({
  isLive,
  roomId,
  strokes,
  boardBg,
  addStroke,
  clearStrokes,
  setBoardBg,
}: {
  isLive: boolean;
  roomId: string;
  strokes: StrokeRow[];
  boardBg: string;
  addStroke: (args: {
    roomId: any;
    layer: "board" | "screen";
    tool: WbTool;
    color: string;
    size: number;
    points: { x: number; y: number }[];
  }) => void;
  clearStrokes: (args: { roomId: any; layer: "board" | "screen" }) => void;
  setBoardBg: (args: { roomId: any; bg: string }) => void;
}) {
  const [penTool, setPenTool] = useState<WbTool>("pen");
  const [penColor, setPenColor] = useState("#ffffff");

  return (
    <Card className="border-cyan-400/20 bg-[#0b1a2a]">
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-cyan-200">
              <Presentation className="size-4" />
              تختهٔ کلاس
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              رنگ زمینه و نوشته را عوض کنید و آزادانه بکشید — دانشجویان همین لحظه می‌بینند.
            </p>
          </div>
          {isLive && (
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
              <button
                onClick={() => setPenTool("pen")}
                title="قلم"
                className={`flex size-8 items-center justify-center rounded-md transition-colors ${
                  penTool === "pen" ? "bg-cyan-400/20 text-cyan-200" : "text-slate-400 hover:bg-white/10"
                }`}
              >
                <Brush className="size-4" />
              </button>
              <button
                onClick={() => setPenTool("highlighter")}
                title="هایلایت"
                className={`flex size-8 items-center justify-center rounded-md transition-colors ${
                  penTool === "highlighter" ? "bg-yellow-400/20 text-yellow-300" : "text-slate-400 hover:bg-white/10"
                }`}
              >
                <Highlighter className="size-4" />
              </button>
              <button
                onClick={() => setPenTool("eraser")}
                title="پاک‌کن"
                className={`flex size-8 items-center justify-center rounded-md transition-colors ${
                  penTool === "eraser" ? "bg-white/15 text-white" : "text-slate-400 hover:bg-white/10"
                }`}
              >
                <Eraser className="size-4" />
              </button>
              <span className="mx-1 h-4 w-px bg-white/10" />
              <button
                onClick={() => void clearStrokes({ roomId: roomId as any, layer: "board" })}
                title="پاک کردن تخته"
                className="flex size-8 items-center justify-center rounded-md text-red-300 transition-colors hover:bg-red-400/15"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          )}
        </div>

        {isLive && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">زمینه:</span>
              {BOARD_BGS.map((b) => (
                <button
                  key={b.value}
                  title={b.label}
                  onClick={() => void setBoardBg({ roomId: roomId as any, bg: b.value })}
                  className={`size-6 rounded-full border transition-transform hover:scale-110 ${
                    boardBg === b.value ? "border-cyan-300 ring-2 ring-cyan-400/40" : "border-white/20"
                  }`}
                  style={{ background: b.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">رنگ قلم:</span>
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  title={c}
                  className={`size-6 rounded-full border transition-transform hover:scale-110 ${
                    penColor === c ? "scale-110 border-cyan-300 ring-2 ring-cyan-400/40" : "border-white/20"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        )}

        <WhiteboardCanvas
          strokes={strokes}
          bg={boardBg}
          readOnly={!isLive}
          tool={penTool}
          color={penColor}
          size={TOOL_SIZES[penTool]}
          onDraw={(s) => void addStroke({ roomId: roomId as any, layer: "board", ...s })}
          className="min-h-[320px]"
        />
        <p className="text-[11px] text-slate-500">
          {isLive
            ? "تخته به‌صورت زنده برای همهٔ دانشجویان داخل کلاس نمایش داده می‌شود."
            : "کلاس پایان یافته — تخته به‌صورت فقط‌خواندنی نمایش داده می‌شود."}
        </p>
      </CardContent>
    </Card>
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

// ── Course studio: design a course, send it to the site admin ──────────────
const STUDIO_STATUS: Record<string, { label: string; cls: string }> = {
  published: { label: "منتشرشده", cls: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" },
  pending: { label: "در انتظار تأیید", cls: "border-amber-400/20 bg-amber-400/10 text-amber-300" },
  draft: { label: "پیش‌نویس", cls: "border-slate-400/20 bg-slate-400/10 text-slate-300" },
  rejected: { label: "رد شده", cls: "border-red-400/20 bg-red-400/10 text-red-300" },
};

function CourseStudioView() {
  const courses = useQuery(api.courseStudio.listMyCourseStudio) ?? [];
  const create = useMutation(api.courseStudio.createDraftCourse);
  const update = useMutation(api.courseStudio.updateDraftCourse);
  const submit = useMutation(api.courseStudio.submitCourseForReview);
  const remove = useMutation(api.courseStudio.deleteDraftCourse);

  const empty = { title: "", summary: "", description: "", price: "0", mode: "recorded", durationText: "", categoryId: "" };
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; course: any } | null>(null);
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const openCreate = () => { setForm(empty); setErr(null); setDialog({ mode: "create" }); };
  const openEdit = (c: any) => {
    setForm({
      title: c.title,
      summary: c.summary,
      description: c.description ?? "",
      price: String(c.price ?? 0),
      mode: c.mode ?? "recorded",
      durationText: c.durationText ?? "",
      categoryId: c.categoryId ?? "",
    });
    setErr(null);
    setDialog({ mode: "edit", course: c });
  };

  const handleSave = async () => {
    setErr(null);
    if (!form.title.trim() || !form.categoryId) {
      setErr("عنوان و دستهٔ دوره الزامی است.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: form.title,
        summary: form.summary,
        description: form.description,
        categoryId: form.categoryId as any,
        price: Number(form.price) || 0,
        mode: form.mode,
        durationText: form.durationText,
      };
      if (dialog?.mode === "edit") {
        await update({ courseId: dialog.course._id, ...payload });
      } else {
        await create(payload);
      }
      setDialog(null);
      toast.success(dialog?.mode === "edit" ? "تغییرات ذخیره شد" : "دوره به‌عنوان پیش‌نویس ساخته شد");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (id: string) => {
    setSubmittingId(id);
    try {
      await submit({ courseId: id as any });
      toast.success("دوره برای بررسی به مدیر سایت ارسال شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">طراحی دوره</h2>
          <p className="mt-1 text-sm text-slate-400">
            دوره را طراحی کنید و برای تأیید به مدیر سایت بفرستید؛ پس از تأیید، در سایت منتشر می‌شود.
          </p>
        </div>
        <Button className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20" onClick={openCreate}>
          <Plus className="size-4" />
          دورهٔ جدید
        </Button>
      </div>

      <div className="space-y-3">
        {courses.map((c) => {
          const st = STUDIO_STATUS[c.status] ?? STUDIO_STATUS.draft;
          const editable = c.status === "draft" || c.status === "rejected";
          return (
            <Card key={c._id} className="border-white/5 bg-[#0b1a2a]">
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 break-words font-bold text-white">{c.title}</h3>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-xs text-slate-400">
                      {c.categoryName ?? "—"} · {c.studentsCount ?? 0} دانشجو · {c.syllabusCount ?? 0} جلسه
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {editable && (
                      <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" onClick={() => openEdit(c)}>
                        ویرایش
                      </Button>
                    )}
                    {editable && (
                      <Button
                        size="sm"
                        disabled={submittingId === c._id}
                        className="bg-cyan-500 text-white hover:bg-cyan-400"
                        onClick={() => handleSubmit(c._id)}
                      >
                        {submittingId === c._id ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Send className="ml-1.5 size-4" />}
                        ارسال برای بررسی
                      </Button>
                    )}
                    {(c.status === "draft" || c.status === "pending" || c.status === "rejected") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-red-400"
                        onClick={() => remove({ courseId: c._id })}
                        title="حذف دوره"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {c.summary && <p className="break-words text-sm text-slate-300">{c.summary}</p>}
                {c.reviewNote && (
                  <p className="rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-300">
                    دلیل بازگشت از مدیر سایت: {c.reviewNote}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
        {courses.length === 0 && (
          <Card className="border-white/5 bg-white/[0.02]">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <BookOpen className="size-8 text-slate-600" />
              <p className="text-sm text-slate-400">
                هنوز دوره‌ای طراحی نکرده‌اید. با «دورهٔ جدید» شروع کنید — پیش‌نویس فقط برای شما قابل مشاهده است.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialog !== null} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "ویرایش دوره" : "طراحی دورهٔ جدید"}</DialogTitle>
            <DialogDescription>
              ابتدا به‌صورت پیش‌نویس ذخیره می‌شود؛ بعد از تکمیل، «ارسال برای بررسی» را بزنید تا مدیر سایت تأیید یا بازگرداند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="عنوان دوره" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-400">دستهٔ دوره (می‌توانید دستهٔ جدید هم بسازید)</label>
              <CategoryField
                value={form.categoryId || undefined}
                onValueChange={(v) => setForm({ ...form, categoryId: v })}
              />
            </div>
            <Input placeholder="خلاصهٔ دوره" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
            <Textarea placeholder="توضیحات کامل دوره…" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input placeholder="قیمت (تومان)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
              <Input placeholder="مدت دوره (مثلاً ۱۲ ساعت)" value={form.durationText} onChange={(e) => setForm({ ...form, durationText: e.target.value })} className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500" />
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
                  <SelectValue placeholder="نوع دوره" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recorded">ویدئویی</SelectItem>
                  <SelectItem value="live">زنده</SelectItem>
                  <SelectItem value="hybrid">ترکیبی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {err && <p className="text-sm text-red-400">{err}</p>}
            <Button onClick={handleSave} disabled={busy} className="bg-cyan-500 text-white hover:bg-cyan-400">
              {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Save className="ml-1.5 size-4" />}
              {dialog?.mode === "edit" ? "ذخیرهٔ تغییرات" : "ذخیره به‌عنوان پیش‌نویس"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── My profile (name, photo, about) + suggested courses ─────────────────────
function ProfileView() {
  const suggested = useQuery(api.profiles.listSuggestedCourses);
  const toggle = useMutation(api.profiles.toggleSuggestedCourse);
  const [query, setQuery] = useState("");

  const catalog = suggested?.catalog ?? [];
  const filtered = catalog.filter(
    (c) =>
      !query.trim() ||
      c.title.includes(query.trim()) ||
      (c.instructorName ?? "").includes(query.trim()),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">پروفایل من</h2>
        <p className="mt-1 text-sm text-slate-400">
          نام، عکس و سوابق علمی‌تان را ثبت کنید؛ تغییرات شما برای مدیر سایت ارسال می‌شود و بعد از تأیید، روی سایت نمایش داده می‌شود.
        </p>
      </div>

      <MemberProfileEditor />

      {/* Suggested courses */}
      <div className="space-y-3">
        <div>
          <h3 className="font-bold text-white">دوره‌های پیشنهادی مدرس</h3>
          <p className="mt-1 text-sm text-slate-400">
            دوره‌هایی از مدرسان دیگر که به دانشجویان پیشنهاد می‌دهید — روی پروفایل شما نمایش داده می‌شود.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(suggested?.mine ?? []).map((c) => (
            <Card key={c._id} className="border-emerald-400/20 bg-[#0b1a2a]">
              <CardContent className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="min-w-0 break-words text-sm font-bold text-white">{c.title}</h4>
                  <button
                    onClick={() => void toggle({ courseId: c._id }).catch((e) => toast.error(e instanceof Error ? e.message : "خطا"))}
                    className="shrink-0 text-emerald-300 hover:text-emerald-200"
                    title="حذف از پیشنهادها"
                  >
                    <BookmarkCheck className="size-4" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">{c.instructorName ?? "—"} · {c.category ?? ""}</p>
              </CardContent>
            </Card>
          ))}
          {(suggested?.mine ?? []).length === 0 && (
            <p className="text-sm text-slate-500">هنوز دوره‌ای پیشنهاد نداده‌اید.</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white">افزودن دوره از مدرسان دیگر</h3>
            <p className="mt-1 text-sm text-slate-400">
              همهٔ دوره‌های منتشرشدهٔ مدرسان تیم — با «افزودن به پیشنهادها» در پروفایل شما نمایش داده می‌شود.
            </p>
          </div>
          <Input
            placeholder="جستجوی دوره…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-56 border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c._id} className="border-white/5 bg-[#0b1a2a]">
              <CardContent className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="min-w-0 break-words text-sm font-bold text-white">{c.title}</h4>
                  <button
                    onClick={() => void toggle({ courseId: c._id }).catch((e) => toast.error(e instanceof Error ? e.message : "خطا"))}
                    className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors ${
                      c.suggested
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
                    }`}
                    title={c.suggested ? "حذف از پیشنهادها" : "افزودن به پیشنهادها"}
                  >
                    {c.suggested ? (
                      <span className="flex items-center gap-1"><BookmarkCheck className="size-3" /> پیشنهادشده</span>
                    ) : (
                      <span className="flex items-center gap-1"><BookmarkPlus className="size-3" /> افزودن به پیشنهادها</span>
                    )}
                  </button>
                </div>
                <p className="line-clamp-2 break-words text-xs text-slate-400">{c.summary}</p>
                <p className="text-[11px] text-slate-500">
                  {c.instructorName ?? "—"} · {c.category ?? ""} · {c.studentsCount ?? 0} دانشجو
                </p>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-slate-500">دوره‌ای یافت نشد.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Announcements to my students ────────────────────────────────────────────
function AnnouncementsView({ instructorName }: { instructorName: string | null }) {
  const courses = useQuery(api.content.listCourses, {}) ?? [];
  const mine = courses.filter((c) => c.instructor?.name === instructorName);
  const myAnns = useQuery(api.notifications.listMyAnnouncements) ?? [];
  const create = useMutation(api.notifications.createAnnouncement);
  const remove = useMutation(api.notifications.deleteAnnouncement);

  const [mode, setMode] = useState<"all" | "course">("all");
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    setErr(null);
    if (title.trim().length < 3) {
      setErr("عنوان اطلاعیه لازم است.");
      return;
    }
    if (mode === "course" && !courseId) {
      setErr("دوره را انتخاب کنید تا به دانشجویانش اطلاعیه برسد.");
      return;
    }
    setBusy(true);
    try {
      await create({
        targetType: mode,
        targetId: mode === "course" ? courseId : undefined,
        title,
        body,
      });
      setTitle("");
      setBody("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا در ارسال اطلاعیه");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">اطلاعیه برای دانشجویان</h2>
        <p className="mt-1 text-sm text-slate-400">
          اطلاعیه‌ای عمومی برای همه بفرستید یا فقط به دانشجویان یکی از دوره‌های خودتان — مثلاً «کلاس آنلاین جمع‌بندی امشب ساعت ۲۰».
        </p>
      </div>

      <Card className="border-cyan-400/20 bg-[#0b1a2a]">
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                mode === "all"
                  ? "bg-cyan-500 text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              🌐 عمومی (همه کاربران)
            </button>
            <button
              type="button"
              onClick={() => setMode("course")}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                mode === "course"
                  ? "bg-cyan-500 text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              📚 دانشجویان یک دوره
            </button>
          </div>

          {mode === "course" && (
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
                <SelectValue placeholder="دوره را انتخاب کنید…" />
              </SelectTrigger>
              <SelectContent>
                {mine.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {mode === "course" && mine.length === 0 && (
            <p className="text-xs text-slate-500">
              دوره‌ای با نام شما ثبت نشده. از پنل مدیریت، پروفایل مدرسی‌تان را به دوره وصل کنید.
            </p>
          )}
          <Input
            placeholder="عنوان اطلاعیه (مثلاً: کلاس آنلاین جمع‌بندی امشب)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
          />
          <Textarea
            placeholder="متن اطلاعیه…"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
          />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <Button onClick={handleCreate} disabled={busy} className="bg-cyan-500 text-white hover:bg-cyan-400">
            {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Send className="ml-1.5 size-4" />}
            ارسال اطلاعیه
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">اطلاعیه‌های قبلی</p>
        {myAnns.map((a) => (
          <Card key={a._id} className="border-white/5 bg-white/[0.02]">
            <CardContent className="flex items-start gap-3 py-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/10">
                <BellRing className="size-4 text-cyan-300" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-100">{a.title}</p>
                  <button
                    onClick={() => remove({ id: a._id })}
                    className="text-slate-600 transition-colors hover:text-red-400"
                    title="حذف"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {a.targetType === "all" ? "همه" : `برای: ${a.targetTitle ?? "—"}`} ·{" "}
                  {new Date(a.createdAt).toLocaleDateString("fa-IR")}
                </p>
                {a.body && <p className="mt-1.5 text-sm text-slate-300">{a.body}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {myAnns.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">هنوز اطلاعیه‌ای نفرستاده‌اید.</p>
        )}
      </div>
    </div>
  );
}
