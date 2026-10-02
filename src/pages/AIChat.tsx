import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMode } from "@/hooks/useMode";
import { useApiQuery } from "@/hooks/useApiQuery";
import { api as iranApi } from "@/lib/apiClient";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  FolderOpen,
  History,
  Library,
  Lightbulb,
  Loader2,
  LogOut,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Paperclip,
  PanelLeftClose,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { AssistantOrb } from "@/components/site/AssistantOrb";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";

const SAVED_PROMPTS = [
  {
    label: "چرخهٔ زیستی با مثال گیاهی",
    prompt: "یک چرخهٔ زیستی را با مثال گیاهی توضیح بده و نمودار مراحلش را بنویس.",
  },
  {
    label: "مقایسهٔ میتوز و میوز در جدول",
    prompt: "تفاوت میتوز و میوز را در یک جدول مقایسه کن.",
  },
  {
    label: "وسایل آزمایشگاه میکروبیولوژی",
    prompt: "برای شروع کار آزمایشگاه میکروبیولوژی چه وسایلی لازم دارم؟",
  },
  {
    label: "ساختار DNA و نقش آن در وراثت",
    prompt: "یک خلاصهٔ ساختاری از DNA و نقش آن در وراثت بنویس.",
  },
  {
    label: "سوالات پرتکرار زیست کنکور",
    prompt: "سوالات پرتکرار آزمون زیست‌شناسی کنکور را با پاسخ کوتاه فهرست کن.",
  },
  {
    label: "تنظیم عصبی و انتقال پیام",
    prompt: "تنظیم عصبی و مراحل انتقال پیام در سیناپس را کامل توضیح بده.",
  },
  {
    label: "دورهٔ کربس و تولید انرژی",
    prompt: "دورهٔ کربس را مرحله‌به‌مرحله با تولید ATP توضیح بده.",
  },
  {
    label: "گروه‌های خونی و ناسازگاری",
    prompt: "انواع گروه‌های خونی و ناسازگاری Rh را با جدول توضیح بده.",
  },
  {
    label: "قوانین ژنتیک مندل و جهش",
    prompt: "قوانین ژنتیک مندل را با مثال و تفاوت آن با جهش توضیح بده.",
  },
  {
    label: "ایمنی بدن و سلول‌های دفاعی",
    prompt: "سازوکار ایمنی بدن و نقش سلول‌های دفاعی را خلاصه کن.",
  },
];

type Range = "today" | "week" | "older";
type HistoryFilter = "all" | Range;

const RANGE_LABEL: Record<Range, string> = {
  today: "امروز",
  week: "هفت روز اخیر",
  older: "قدیمی‌تر",
};

const DAY = 24 * 60 * 60 * 1000;

function rangeOf(ts: number, now: number): Range {
  const diff = now - (ts || now);
  if (diff < DAY) return "today";
  if (diff < 7 * DAY) return "week";
  return "older";
}

type Attachment = { name: string; size: number; text: string };

// ── Composer ──────────────────────────────────────────────────────────────
type ComposerHandle = {
  setText: (value: string) => void;
  focus: () => void;
};

type ComposerProps = {
  models: any[];
  selectedModelId: string | null;
  onSelectModel: (id: string) => void;
  onSubmit: (text: string, attachment: Attachment | null, deep: boolean) => void;
  deepResearch: boolean;
  onToggleDeep: (next: boolean) => void;
  isSending: boolean;
  disabled?: boolean;
  placeholder: string;
  autoFocus?: boolean;
};

const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  {
    models,
    selectedModelId,
    onSelectModel,
    onSubmit,
    deepResearch,
    onToggleDeep,
    isSending,
    disabled,
    placeholder,
    autoFocus,
  },
  ref,
) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [reading, setReading] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    setText: (value: string) => {
      setText(value);
      window.setTimeout(() => areaRef.current?.focus(), 40);
    },
    focus: () => areaRef.current?.focus(),
  }));

  const canSend = !disabled && !isSending && (!!text.trim() || !!attachment);

  const submit = () => {
    if (!canSend) return;
    const body = text.trim();
    onSubmit(body, attachment, deepResearch);
    setText("");
    setAttachment(null);
  };

  const readFile = async (file: File) => {
    setReading(true);
    try {
      const content = await file.text();
      setAttachment({ name: file.name, size: file.size, text: content.slice(0, 4000) });
    } catch {
      toast.error("خواندن این فایل ممکن نشد");
    } finally {
      setReading(false);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("مرورگر شما از ورودی صوتی پشتیبانی نمی‌کند");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "fa-IR";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const said: string = e.results?.[0]?.[0]?.transcript ?? "";
      if (said) {
        setText((prev) => (prev ? `${prev} ${said}` : said));
        areaRef.current?.focus();
      }
    };
    rec.onerror = () => toast.error("تشخیص صدا انجام نشد");
    rec.start();
    toast.info("در حال شنیدن…");
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-2.5 shadow-sm transition-colors focus-within:border-primary/40 sm:p-3">
      <Textarea
        ref={areaRef}
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        // 16px on phones so iOS Safari does not zoom the whole page on focus.
        className="max-h-36 resize-none border-0 bg-transparent p-2 text-[16px] leading-7 shadow-none focus-visible:ring-0 sm:max-h-none sm:text-[14px]"
      />

      {attachment && (
        <div className="mx-1 mb-2 flex items-center gap-2.5 rounded-2xl border border-border bg-muted/60 p-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold" dir="auto">
              {attachment.name}
            </span>
            <span className="block text-[10.5px] text-muted-foreground">
              {(attachment.size / 1024).toLocaleString("fa-IR")} کیلوبایت · آمادهٔ ارسال
            </span>
          </span>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="حذف پیوست"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Controls wrap onto a second line below `sm` instead of squeezing
          the deep-research and attach buttons off the edge of a phone. */}
      <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1">
        {/* Send / mic / model stay pinned to the far right of the composer. */}
        <Button
          type="button"
          size="icon"
          onClick={submit}
          disabled={!canSend}
          className="size-10 shrink-0 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 transition-colors hover:bg-emerald-600 disabled:opacity-40"
          title="ارسال"
        >
          {isSending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 rounded-full"
          title="ورودی صوتی"
          onClick={startVoiceInput}
        >
          <Mic className="size-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9 rounded-full" title="انتخاب مدل">
              <Wand2 className="size-4" />
            </Button>
          </PopoverTrigger>            <PopoverContent align="end" className="w-64">
              <p className="mb-2 text-[11px] font-bold text-muted-foreground">
                مدل فعال{models.length === 1 ? " · تنها مدل تنظیم‌شده" : ""}
              </p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => onSelectModel("default")}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[12.5px] transition-colors",
                  !selectedModelId
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                مدل پیش‌فرض سایت
                {!selectedModelId && <Check className="size-3.5" />}
              </button>
              {models.length === 0 && (
                <p className="px-2 py-3 text-[12px] text-muted-foreground">
                  مدلی برای این حساب فعال نشده است.
                </p>
              )}
              {models.map((m) => (
                <button
                  key={m._id}
                  type="button"
                  onClick={() => onSelectModel(m._id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[12.5px] transition-colors",
                    selectedModelId === m._id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {m.name}
                  <span className="text-[10px] text-muted-foreground">
                    {m.isFree ? "رایگان" : m.dailyLimit ? `${faNum(m.dailyLimit)} پیام/روز` : ""}
                  </span>
                  {selectedModelId === m._id && <Check className="size-3.5" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="hidden flex-1 sm:block" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onToggleDeep(!deepResearch)}
          className={cn(
            "h-9 shrink-0 rounded-full px-3 text-[11.5px] sm:px-3.5 sm:text-[12.5px]",
            deepResearch && "border-primary bg-primary/10 text-primary",
          )}
        >
          <Sparkles className="ml-1.5 size-3.5" />
          پژوهش عمیق
        </Button>

        <label className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[11.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:text-[12.5px]">
          {reading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Paperclip className="size-3.5" />
          )}
          پیوست فایل
          <input
            type="file"
            className="hidden"
            accept=".txt,.md,.csv,.json,text/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void readFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
});

// ── Saved prompts: two slow RTL marquee rows right under the greeting ─────
function PromptChips({
  items,
  onPick,
}: {
  items: { label: string; prompt: string }[];
  onPick: (prompt: string) => void;
}) {
  // The list is rendered twice so the -50%/+50% loop never shows a gap.
  const track = [...items, ...items];
  return (
    <div className="genova-marquee">
      <div className="genova-marquee__track flex w-max items-center gap-1.5 py-0.5">
        {track.map((p, i) => (
          <button
            key={`${p.label}-${i}`}
            type="button"
            onClick={() => onPick(p.prompt)}
            title={p.prompt}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 text-[11.5px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
          >
            <Sparkles className="size-3 shrink-0 text-primary/70" />
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const SavedPromptsRows = memo(function SavedPromptsRows({
  onPick,
}: {
  onPick: (prompt: string) => void;
}) {
  const half = Math.ceil(SAVED_PROMPTS.length / 2);
  const rows = [SAVED_PROMPTS.slice(0, half), SAVED_PROMPTS.slice(half)];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.12 }}
      className="w-full max-w-2xl space-y-1"
    >
      <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <Lightbulb className="size-3.5" />
        پرامپت‌های آماده — روی هرکدام کلیک کن
      </p>
      {rows.map((row, i) => (
        <div
          key={i}
          className={cn(
            "genova-marquee__row",
            i === 0 ? "genova-marquee__row--a" : "genova-marquee__row--b",
          )}
          style={{ animationDelay: i === 0 ? "0s" : "-2.5s" }}
        >
          <PromptChips items={row} onPick={onPick} />
        </div>
      ))}
    </motion.div>
  );
});

// ── Empty hero (memoised so typing never re-runs the orb animation) ───────
const EmptyHero = memo(function EmptyHero({ firstName }: { firstName: string }) {
  return (
    <>
      {/* Scaled down on phones so the composer below stays above the fold. */}
      <div className="scale-80 sm:scale-100">
        <AssistantOrb thinking={false} compact />
      </div>
      <div className="-mt-1 text-center">
        <h2 className="bg-gradient-to-l from-primary via-primary to-primary/60 bg-clip-text text-2xl font-black text-transparent sm:text-4xl">
          سلام، {firstName}
        </h2>
        <p className="mt-2 text-base font-bold text-foreground sm:text-xl">
          چطور می‌توانم کمکت کنم؟
        </p>
        <p className="mx-auto mt-2.5 max-w-md text-[12.5px] leading-7 text-muted-foreground sm:text-[13px]">
          دربارهٔ زیست‌شناسی، ژنتیک، میکروبیولوژی و برنامهٔ درسی‌ات بپرس؛ پاسخ‌ها همراه با
          توضیح مرحله‌به‌مرحله و منابع پیشنهادی ارائه می‌شود.
        </p>
      </div>
    </>
  );
});

// ── Message thread (memoised) ─────────────────────────────────────────────
const MessageThread = memo(function MessageThread({
  messages,
  isSending,
  isWaiting,
  endRef,
}: {
  messages: any[] | undefined;
  isSending: boolean;
  isWaiting: boolean;
  endRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="space-y-4 py-2 sm:space-y-6">
      {messages === undefined && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {messages?.map((m: any) => (
        <div
          key={m._id}
          className={cn("flex gap-2 sm:gap-3", m.role === "user" ? "flex-row-reverse" : "")}
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:size-8">
            {m.role === "user" ? <User className="size-3.5 sm:size-4" /> : <Bot className="size-3.5 sm:size-4" />}
          </div>
          <div
            className={cn(
              // `break-words` keeps long tokens (FBbt ids, URLs, Latin gene
              // names) from pushing the bubble past the phone viewport.
              "max-w-[86%] break-words whitespace-pre-wrap rounded-3xl px-3.5 py-2.5 text-[14px] leading-7 sm:max-w-[80%] sm:px-4 sm:py-3 sm:text-[13.5px]",
              m.role === "user"
                ? "rounded-ee-md bg-primary text-primary-foreground"
                : "rounded-es-md border border-border bg-card text-foreground",
            )}
          >
            {m.content}
          </div>
        </div>
      ))}
      {(isSending || isWaiting) && (
        <div className="flex gap-2 sm:gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary sm:size-8">
            <Bot className="size-3.5 sm:size-4" />
          </div>
          <div className="flex items-center gap-2 rounded-3xl border border-border bg-card px-3.5 py-2.5 text-[12.5px] text-muted-foreground sm:px-4 sm:py-3 sm:text-[13px]">
            <span className="flex gap-1">
              <span className="inline-block size-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
              <span className="inline-block size-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
              <span className="inline-block size-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
            </span>
            در حال نوشتن پاسخ…
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
});

export default function AIChat() {
  const { isIran } = useMode();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<ComposerHandle>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<any>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [query, setQuery] = useState("");
  const [searchFocusTick, setSearchFocusTick] = useState(0);
  const [promptFillTick, setPromptFillTick] = useState(0);
  const [deepResearch, setDeepResearch] = useState(false);
  // Single timestamp used to bucket the history list (stable across renders).
  const [clock] = useState(() => Date.now());

  // Delete mode state
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth?returnTo=/ai-chat");
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Opens the sidebar and focuses its search box (⌘K / Ctrl+K or the "کاوش" item)
  const focusSearch = useCallback(() => {
    setCollapsed(false);
    setSidebarOpen(true);
    setSearchFocusTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (searchFocusTick === 0) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [searchFocusTick]);

  // "پرامپت‌های آماده" in the sidebar drops a starter prompt into the composer.
  useEffect(() => {
    if (promptFillTick === 0) return;
    const prompt = SAVED_PROMPTS[promptFillTick % SAVED_PROMPTS.length].prompt;
    composerRef.current?.setText(prompt);
  }, [promptFillTick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusSearch]);

  // Convex queries (global mode)
  const conversationsConvex = useQuery(api.aiChat.listMyConversations, isAuthenticated ? {} : "skip");
  const activeModelsConvex = useQuery(api.aiChat.listActiveModels, isAuthenticated ? {} : "skip");
  const usageConvex = useQuery(api.aiChat.getMyUsage, isAuthenticated ? {} : "skip");
  const messagesConvex = useQuery(api.aiChat.getConversationMessages, selectedConvo ? { conversationId: selectedConvo as any } : "skip");

  // Iran server queries
  const { data: conversationsIran } = useApiQuery<any[]>(isIran && isAuthenticated ? "/api/ai/conversations" : "");
  const { data: activeModelsIran } = useApiQuery<any[]>(isIran && isAuthenticated ? "/api/ai/models" : "");
  const { data: usageIran } = useApiQuery<any>(isIran && isAuthenticated ? "/api/ai/my-usage" : "");
  const { data: messagesIran } = useApiQuery<any[]>(isIran && isAuthenticated && selectedConvo ? `/api/ai/conversations/${selectedConvo}/messages` : "");

  // Merge dual mode data
  const conversations = isIran ? conversationsIran : conversationsConvex;
  const activeModels = (isIran ? activeModelsIran : activeModelsConvex) ?? [];
  const subConvex = useQuery(api.aiSubscriptions.getMySubscription, isAuthenticated ? {} : "skip");
  const sub = isIran ? null : subConvex;
  const usage = isIran ? usageIran : usageConvex;
  const messages = isIran ? messagesIran : messagesConvex;

  const selectedConvoDoc = useMemo(
    () => (conversations ?? []).find((c: any) => c._id === selectedConvo),
    [conversations, selectedConvo],
  );

  useEffect(() => {
    if (selectedConvoDoc) {
      setSelectedModelId((selectedConvoDoc as any).modelId ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConvo]);

  const setConvoModelMut = useMutation(api.aiChat.setConversationModel);
  // "default" / empty = the site default model. Selecting is idempotent (no
  // toggle) so clicking the same model twice can never silently drop back to
  // the default and make the pick look like it "did not register".
  const handleModelSelect = useCallback(
    (rawId: string) => {
      const modelId = rawId && rawId !== "default" ? rawId : null;
      setSelectedModelId(modelId);
      if (selectedConvo) {
        setConvoModelMut({
          conversationId: selectedConvo as any,
          ...(modelId ? { modelId: modelId as any } : {}),
        }).catch((e) => toast.error(e instanceof Error ? e.message : "خطا در تغییر مدل"));
      }
    },
    [selectedConvo, setConvoModelMut],
  );

  const createConvoConvex = useMutation(api.aiChat.createConversation);
  const sendMessageConvex = useMutation(api.aiChat.sendMessage);
  const deleteConvoConvex = useMutation(api.aiChat.deleteConversation);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeModel = useMemo(
    () => activeModels.find((m: any) => m._id === selectedModelId) ?? null,
    [activeModels, selectedModelId],
  );

  // With no explicit pick the first configured (active) model is the one that
  // answers, so the UI shows — and highlights — that same model everywhere
  // instead of a vague placeholder that looks like "nothing selected".
  const effectiveModel = activeModel ?? activeModels[0] ?? null;
  const isDefaultPicked = !activeModel;

  const filteredConversations = useMemo(() => {
    const list = [...((conversations ?? []) as any[])].sort(
      (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
    );
    const q = query.trim().toLowerCase();
    return list.filter((c) => {
      if (historyFilter !== "all" && rangeOf(c.createdAt ?? clock, clock) !== historyFilter) return false;
      if (!q) return true;
      return (c.title ?? "").toLowerCase().includes(q);
    });
  }, [conversations, historyFilter, query, clock]);

  const groupedConversations = useMemo(() => {
    const groups: { label: string; items: any[] }[] = [
      { label: RANGE_LABEL.today, items: [] },
      { label: RANGE_LABEL.week, items: [] },
      { label: RANGE_LABEL.older, items: [] },
    ];
    filteredConversations.forEach((c) => {
      const bucket = groups.find(
        (g) => g.label === RANGE_LABEL[rangeOf(c.createdAt ?? clock, clock)],
      );
      bucket?.items.push(c);
    });
    return groups.filter((g) => g.items.length > 0);
  }, [filteredConversations, clock]);

  const createConversation = useCallback(
    async (title: string) => {
      if (isIran) {
        const res = await iranApi.post("/api/ai/conversations", {
          title,
          modelId: selectedModelId ?? undefined,
        });
        return (res.data as any)?.id as string;
      }
      return (await createConvoConvex({ title, modelId: selectedModelId ?? undefined })) as string;
    },
    [createConvoConvex, isIran, selectedModelId],
  );

  const sendToConversation = useCallback(
    async (conversationId: string, content: string) => {
      if (isIran) {
        await iranApi.post("/api/ai/chat", { conversationId, content });
      } else {
        await sendMessageConvex({ conversationId: conversationId as any, content });
      }
    },
    [isIran, sendMessageConvex],
  );

  /** The single send path used by the button, Enter and the suggestion cards. */
  const submitPrompt = useCallback(
    async (raw: string, attachment: Attachment | null, deep: boolean) => {
      const parts: string[] = [];
      if (attachment) {
        parts.push(`📎 پیوست: ${attachment.name}\n\n${attachment.text}`);
      }
      if (raw) parts.push(raw);
      const body = parts.join("\n\n").trim();
      if (!body) return;
      if (deep) parts.push("با جزئیات و مثال توضیح بده.");
      const content = parts.join("\n\n").trim();
      setIsSending(true);
      try {
        if (selectedConvo) {
          await sendToConversation(selectedConvo, content);
        } else {
          const id = await createConversation((raw || attachment?.name || "چت جدید").slice(0, 40));
          setSelectedConvo(id);
          await sendToConversation(id, content);
        }
      } catch (e) {
        console.error("Send failed:", e);
        toast.error("ارسال پیام ناموفق بود");
      } finally {
        setIsSending(false);
      }
    },
    [createConversation, selectedConvo, sendToConversation],
  );

  const handleNewChat = useCallback(async () => {
    try {
      const id = await createConversation("چت جدید");
      setSelectedConvo(id);
      setSidebarOpen(false);
      composerRef.current?.focus();
    } catch (e) {
      console.error("Failed to create conversation:", e);
    }
  }, [createConversation]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (selectedForDelete.size === 0) return;
    if (!confirm(`${selectedForDelete.size} چت حذف شود؟`)) return;
    for (const id of selectedForDelete) {
      try {
        if (isIran) {
          await iranApi.delete(`/api/ai/conversations/${id}`);
        } else {
          await deleteConvoConvex({ conversationId: id as any });
        }
        if (selectedConvo === id) setSelectedConvo(null);
      } catch (e) {
        console.error("Delete failed:", e);
      }
    }
    setSelectedForDelete(new Set());
    setDeleteMode(false);
  }, [deleteConvoConvex, isIran, selectedConvo, selectedForDelete]);

  const exitDeleteMode = useCallback(() => {
    setDeleteMode(false);
    setSelectedForDelete(new Set());
  }, []);

  const selectConversation = useCallback((id: string) => {
    setSelectedConvo(id);
    setSidebarOpen(false);
  }, []);

  const transcript = useMemo(
    () =>
      ((messages ?? []) as any[])
        .map((m) => `${m.role === "user" ? "شما" : "ژنوا"}: ${m.content}`)
        .join("\n\n"),
    [messages],
  );

  const copyTranscript = useCallback(async () => {
    if (!transcript) {
      toast.error("پیامی برای کپی وجود ندارد");
      return;
    }
    try {
      await navigator.clipboard.writeText(transcript);
      toast.success("متن گفتگو کپی شد");
    } catch {
      toast.error("کپی ممکن نشد");
    }
  }, [transcript]);

  const exportTranscript = useCallback(() => {
    if (!transcript) {
      toast.error("پیامی برای خروجی گرفتن وجود ندارد");
      return;
    }
    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedConvoDoc?.title || "genova-chat"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("فایل گفتگو دانلود شد");
  }, [selectedConvoDoc, transcript]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const dailyLimit = usage?.dailyLimit ?? 0;
  const messagesSent = usage?.messagesSent ?? 0;
  const remaining = usage?.remaining ?? 0;
  // A model configured with its own daily limit wins over the account quota.
  const effectiveLimit = effectiveModel?.dailyLimit ?? dailyLimit;
  const effectiveRemaining = effectiveModel?.dailyLimit
    ? Math.max(effectiveModel.dailyLimit - messagesSent, 0)
    : remaining;
  const hasReachedLimit = effectiveLimit > 0 && effectiveRemaining <= 0;

  const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;
  const isWaitingForAI = !!lastMessage && lastMessage.role === "user";
  const firstName = (user?.name || "دوست عزیز").split(" ")[0];
  const userName = user?.name || user?.email || "کاربر ژنوا";

  const navItem = (
    Icon: typeof History,
    label: string,
    onClick: () => void,
    active?: boolean,
  ) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </button>
  );

  return (
    <div className="flex h-screen [@supports(height:100dvh)]:h-dvh overflow-hidden bg-background" dir="rtl">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "z-40 flex w-[300px] max-w-[88vw] shrink-0 flex-col border-l border-border bg-card transition-[width,transform] duration-300",
          "lg:static lg:z-auto lg:translate-x-0",
          sidebarOpen ? "fixed inset-y-0 right-0 translate-x-0 shadow-2xl" : "fixed inset-y-0 right-0 translate-x-full",
          collapsed && "lg:w-0 lg:overflow-hidden lg:border-l-0",
        )}
      >
        <div className="flex w-full items-center gap-2.5 px-4 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[14px] font-extrabold">چت ژنوا</span>
            <span className="block truncate text-[10px] text-muted-foreground">
              دستیار هوشمند زیست‌شناسی
            </span>
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="hidden rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:block"
            title="جمع کردن منو"
          >
            <PanelLeftClose className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            title="بستن"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="w-full px-4">
          {deleteMode ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-2">
              <p className="px-1 pb-2 text-[11.5px] font-bold text-destructive">
                {faNum(selectedForDelete.size)} گفتگو انتخاب شد
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-9 flex-1 rounded-xl text-[12px]"
                  disabled={selectedForDelete.size === 0}
                  onClick={confirmDelete}
                >
                  <Trash2 className="ml-1.5 size-3.5" />
                  حذف
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 flex-1 rounded-xl text-[12px]"
                  onClick={exitDeleteMode}
                >
                  لغو
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleNewChat}
              className="h-11 w-full justify-center rounded-2xl bg-foreground text-background hover:bg-foreground/90"
            >
              <Plus className="ml-1.5 size-4" />
              گفتگوی جدید
            </Button>
          )}
        </div>

        <div className="w-full px-4 pt-3">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:border-primary/50">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جست‌وجوی گفتگوها"
              className="w-full bg-transparent text-[16px] outline-none placeholder:text-muted-foreground sm:text-[12.5px]"
            />
            <kbd className="hidden shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground sm:block">
              ⌘K
            </kbd>
          </div>
        </div>

        <nav className="w-full space-y-0.5 px-4 pt-3">
          {navItem(Search, "کاوش", focusSearch)}
          {navItem(
            Library,
            "پرامپت‌های آماده",
            () => setPromptFillTick((t) => t + 1),
          )}
          {navItem(FolderOpen, "همهٔ گفتگوها", () => setHistoryFilter("all"), historyFilter === "all")}
          {navItem(History, "امروز", () => setHistoryFilter("today"), historyFilter === "today")}
        </nav>

        <ScrollArea className="mt-3 min-h-0 flex-1 overscroll-contain px-4">
          <div className="w-[276px] max-w-full space-y-4 pb-3">
            {conversations === undefined && (
              <div className="flex justify-center py-6">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {groupedConversations.length === 0 && conversations !== undefined && (
              <p className="px-2 py-8 text-center text-[12px] text-muted-foreground">
                {query ? "گفتگویی با این عنوان پیدا نشد." : "هنوز گفتگویی ندارید."}
              </p>
            )}
            {groupedConversations.map((group) => (
              <div key={group.label}>
                <p className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((c) => {
                    const isSelected = selectedForDelete.has(c._id);
                    return (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => (deleteMode ? toggleSelect(c._id) : selectConversation(c._id))}
                        className={cn(
                          "group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-[12.5px] transition-colors",
                          deleteMode
                            ? isSelected
                              ? "bg-destructive/10 text-destructive"
                              : "text-muted-foreground hover:bg-muted"
                            : selectedConvo === c._id
                              ? "bg-primary/10 font-semibold text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {deleteMode ? (
                          <span
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                              isSelected
                                ? "border-destructive bg-destructive text-white"
                                : "border-border bg-background",
                            )}
                          >
                            {isSelected && <Check className="size-3" />}
                          </span>
                        ) : (
                          <MessageSquare className="size-4 shrink-0 opacity-70" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{c.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="w-full space-y-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="rounded-2xl border border-border bg-muted/40 p-3">
            <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Zap className="size-3 text-amber-500" />
                پیام‌های امروز
              </span>
              <span className="font-mono">
                {usage ? `${faNum(messagesSent)}/${faNum(effectiveLimit)}` : "—"}
              </span>
            </div>
            <p className="mt-1 truncate text-[10.5px] text-muted-foreground">
              {effectiveModel
                ? `مدل: ${effectiveModel.name}${activeModel ? "" : " (پیش‌فرض)"}`
                : "مدل پیش‌فرض سایت"}
              {usage ? ` · ${faNum(Math.max(effectiveRemaining, 0))} پیام باقی‌مانده` : ""}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  hasReachedLimit
                    ? "bg-destructive"
                    : effectiveRemaining <= 1
                      ? "bg-amber-500"
                      : "bg-primary",
                )}
                style={{
                  width: `${Math.min(100, (messagesSent / Math.max(effectiveLimit, 1)) * 100)}%`,
                }}
              />
            </div>
            {conversations && conversations.length > 0 && !deleteMode && (
              <button
                type="button"
                onClick={() => setDeleteMode(true)}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11.5px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3" />
                حذف سوابق
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-background p-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
              {userName.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[12.5px] font-semibold">{userName}</span>
              <span className="block truncate text-[10px] text-muted-foreground">
                {user?.email ?? "کاربر ژنوا"}
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              title="بازگشت به سایت"
              onClick={() => navigate("/")}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-border px-2.5 sm:h-16 sm:gap-2 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl"
            onClick={() => {
              if (collapsed) setCollapsed(false);
              else setSidebarOpen((v) => !v);
            }}
            title="منوی گفتگوها"
          >
            {collapsed ? (
              <PanelLeftClose className="size-4 rotate-180" />
            ) : (
              <MessageSquare className="size-4" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 min-w-0 gap-1.5 rounded-2xl px-2.5 sm:gap-2 sm:px-3">
                <Sparkles className="size-4 shrink-0 text-primary" />
                <span className="max-w-[84px] truncate text-[12px] sm:max-w-[140px] sm:text-sm">
                  {effectiveModel?.name ?? "مدل پیش‌فرض"}
                  {!activeModel && effectiveModel ? " (پیش‌فرض)" : ""}
                </span>
                <ChevronDown className="size-3.5 shrink-0 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem
                onClick={() => handleModelSelect("default")}
                className={cn(isDefaultPicked && "bg-primary/10 text-primary")}
              >
                <span className="min-w-0 flex-1 truncate">مدل پیش‌فرض سایت</span>
                {isDefaultPicked && <Check className="size-3.5" />}
              </DropdownMenuItem>
              {activeModels.map((m: any) => (
                <DropdownMenuItem
                  key={m._id}
                  onClick={() => handleModelSelect(m._id)}
                  className={cn(
                    activeModel?._id === m._id && "bg-primary/10 text-primary",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  <span className="mr-auto text-[10px] text-muted-foreground">
                    {m.isFree ? "رایگان" : m.dailyLimit ? `${faNum(m.dailyLimit)} پیام/روز` : ""}
                  </span>
                  {activeModel?._id === m._id && <Check className="size-3.5" />}
                </DropdownMenuItem>
              ))}
              {activeModels.length === 0 && (
                <p className="px-2 py-3 text-[12px] text-muted-foreground">
                  مدلی برای این حساب فعال نشده است.
                </p>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          {/* Remaining quota: the wide pill from md up, a compact dot below it
              so a phone still shows the budget before it runs out. */}
          {usage && (
            <>
              <div className="hidden items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-[11.5px] text-muted-foreground md:flex">
                <Zap className="size-3 text-amber-500" />
                {faNum(Math.max(remaining, 0))} پیام باقی‌مانده
              </div>
              <span
                dir="ltr"
                title={`${faNum(Math.max(effectiveRemaining, 0))} پیام باقی‌مانده`}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl md:hidden",
                  hasReachedLimit
                    ? "bg-destructive/10 text-destructive"
                    : effectiveRemaining <= 1
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-muted/60 text-muted-foreground",
                )}
              >
                <Zap className="size-3.5" />
              </span>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 rounded-xl" title="بیشتر">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyTranscript}>
                <Copy className="size-4" />
                کپی متن گفتگو
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportTranscript}>
                <Download className="size-4" />
                خروجی فایل متنی
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/ai-chat")}>
                <Sparkles className="size-4" />
                صفحهٔ هوش مصنوعی ژنوا
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            className="hidden h-10 gap-2 rounded-2xl sm:flex"
            onClick={copyTranscript}
            disabled={!transcript}
          >
            <Copy className="size-4" />
            کپی گفتگو
          </Button>

          <Button
            className="h-10 shrink-0 whitespace-nowrap rounded-2xl bg-foreground px-2.5 text-[11.5px] text-background hover:bg-foreground/90 sm:px-4 sm:text-sm"
            onClick={() => navigate("/pricing")}
            disabled={!!sub}
          >
            {sub ? sub.label : (
              <>
                <span className="hidden sm:inline">ارتقای اشتراک</span>
                <span className="sm:hidden">ارتقا</span>
              </>
            )}
          </Button>
        </header>

        {/* Messages / hero */}
        <ScrollArea className="min-h-0 flex-1 overscroll-contain">
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-3 py-5 sm:px-6 sm:py-6">
            {!selectedConvo ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4">
                <EmptyHero firstName={firstName} />

                {/* Two slow RTL rows of saved prompts, right under the greeting */}
                <SavedPromptsRows
                  onPick={(prompt) => composerRef.current?.setText(prompt)}
                />

                <div className="w-full max-w-2xl">
                  <Composer
                    ref={composerRef}
                    models={activeModels}
                    selectedModelId={selectedModelId}
                    onSelectModel={handleModelSelect}
                    onSubmit={submitPrompt}
                    deepResearch={deepResearch}
                    onToggleDeep={setDeepResearch}
                    isSending={isSending}
                    disabled={hasReachedLimit}
                    placeholder={
                      hasReachedLimit ? "محدودیت روزانه تمام شده..." : "از من هر چیزی بپرس…"
                    }
                  />
                </div>
              </div>
            ) : (
              <MessageThread
                messages={messages as any[] | undefined}
                isSending={isSending}
                isWaiting={isWaitingForAI}
                endRef={messagesEndRef}
              />
            )}
          </div>
        </ScrollArea>

        {/* Composer (docked when a conversation is open) */}
        {selectedConvo && (
          <div className="shrink-0 border-t border-border bg-card/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:p-4">
            <div className="mx-auto w-full max-w-4xl">
              {hasReachedLimit && (
                <div className="mb-3 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-[13px] text-amber-600">
                  <AlertTriangle className="size-4" />
                  محدودیت روزانه تمام شده. فردا دوباره شارژ می‌شود.
                </div>
              )}
              <Composer
                ref={composerRef}
                models={activeModels}
                selectedModelId={selectedModelId}
                onSelectModel={handleModelSelect}
                onSubmit={submitPrompt}
                deepResearch={deepResearch}
                onToggleDeep={setDeepResearch}
                isSending={isSending}
                disabled={hasReachedLimit}
                placeholder={
                  hasReachedLimit ? "محدودیت روزانه تمام شده..." : "از من هر چیزی بپرس…"
                }
              />
            </div>
          </div>
        )}

        <footer className="shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[11px] text-muted-foreground sm:text-[11.5px]">
          برای بینش‌های بیشتر به جامعهٔ ژنوا بپیوندید —{" "}
          <button
            type="button"
            onClick={() => navigate("/about")}
            className="font-semibold text-primary hover:underline"
          >
            دربارهٔ ژنوا
          </button>
        </footer>
      </div>
    </div>
  );
}
