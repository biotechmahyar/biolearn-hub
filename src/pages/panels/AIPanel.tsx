import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useSettings, ACCENT_SWATCHES, FONT_OPTIONS } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState, useRef, useEffect } from "react";
import {
  Home,
  Loader2,
  Paperclip,
  Plus,
  Send,
  Trash2,
  X,
  Sparkles,
  Image,
  FileText,
  MessageSquare,
  PanelLeftOpen,
  Dna,
  Settings2,
  Paintbrush,
  Moon,
  Sun,
  Type,
  Check,
  Bot,
  Thermometer,
  Cpu,
  Key,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router";

const AI_STORAGE_KEY = "genova-ai-settings";

interface AISettings {
  model: string;
  temperature: number;
  systemPrompt: string;
}

const DEFAULT_AI_SETTINGS: AISettings = {
  model: "gapgpt-qwen-3.5",
  temperature: 0.7,
  systemPrompt:
    "تو یک دستیار هوش مصنوعی برای پلتفرم Genova هستی — پلتفرم تخصصی آموزش علوم زیستی.",
};

function readAISettings(): AISettings {
  if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;
  try {
    const raw = window.localStorage.getItem(AI_STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

function saveAISettings(s: AISettings) {
  try {
    window.localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export default function AIPanel() {
  const { isLoading: authLoading, user } = useAuth();
  const { settings, setTheme, setAccent, setFont } = useSettings();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chats: any[] | undefined = useQuery(api.ai.listChats);
  const createChat = useMutation(api.ai.createChat);
  const deleteChatMutation = useMutation(api.ai.deleteChat);
  const saveUserMessageMutation = useMutation(api.ai.saveUserMessage);
  const saveAssistantMessageMutation = useMutation(api.ai.saveAssistantMessage);
  const sendAndReplyAction = useAction(api.ai.sendAndReply);
  const saveApiKeyMutation = useMutation(api.ai.saveApiKey);
  const testApiKeyAction = useAction(api.ai.testApiKey);
  const currentApiKey: string = useQuery(api.ai.getApiKey) ?? "";

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] | undefined = useQuery(
    api.ai.getMessages,
    selectedChatId ? ({ chatId: selectedChatId } as any) : "skip",
  );

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<{
    name: string;
    type: string;
  } | null>(null);

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>(readAISettings);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  // Auto-select first chat
  useEffect(() => {
    if (chats && chats.length > 0 && !selectedChatId) {
      setSelectedChatId(chats[0]._id);
    }
  }, [chats, selectedChatId]);

  // Loading state
  if (authLoading || chats === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-4 bg-background">
        <span className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
          <Dna className="size-6 animate-pulse text-primary" />
          <span className="absolute inset-0 animate-ping rounded-2xl border border-primary/20" />
        </span>
        <p className="font-mono text-xs text-muted-foreground">
          در حال بارگذاری...
        </p>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "site_admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">
          دسترسی فقط برای مدیر سایت و ادمین سامانه فعال است.
        </p>
      </div>
    );
  }

  const handleNewChat = async () => {
    const id = (await (createChat as any)({ title: "چت جدید" })) as string;
    setSelectedChatId(id);
    setSidebarOpen(true);
  };

  const handleDeleteChat = async (
    chatId: string,
    e?: React.MouseEvent | React.KeyboardEvent,
  ) => {
    e?.preventDefault();
    e?.stopPropagation();
    await deleteChatMutation({ chatId: chatId as any });
    if (selectedChatId === chatId) {
      const remaining = chats?.filter((c: any) => c._id !== chatId);
      setSelectedChatId(
        remaining && remaining.length > 0 ? remaining[0]._id : null,
      );
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !pendingFile) || !selectedChatId) return;
    setSending(true);
    try {
      const content = pendingFile
        ? `[فایل: ${pendingFile.name}]\n${input.trim()}`
        : input.trim();
      await saveUserMessageMutation({
        chatId: selectedChatId as any,
        content,
      } as any);
      setInput("");
      setPendingFile(null);
      // Build conversation history
      const history = (messages ?? []).map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content as string,
      }));
      history.push({ role: "user", content });
      // Call API (action)
      const reply = await sendAndReplyAction({
        messages: history as any,
        apiKey: currentApiKey || "",
      } as any);
      // Save assistant reply
      await saveAssistantMessageMutation({
        chatId: selectedChatId as any,
        content: String(reply ?? "پاسخی دریافت نشد."),
      } as any);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile({ name: file.name, type: file.type });
    e.target.value = "";
  };

  const openSettings = () => {
    setApiKeyInput(currentApiKey || "");
    setApiKeySaved(false);
    setTestResult(null);
    setSettingsOpen(true);
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    await saveApiKeyMutation({ apiKey: apiKeyInput.trim() });
    setApiKeySaved(true);
    setTestResult(null);
  };

  const handleTestApiKey = async () => {
    const key = apiKeyInput.trim() || currentApiKey;
    if (!key) {
      setTestResult({ ok: false, msg: "کلید API خالی است." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testApiKeyAction({ apiKey: key }) as any;
      setTestResult({ ok: res.ok, msg: res.ok ? (res.reply ?? "") : (res.error ?? "خطا") });
    } catch (e) {
      setTestResult({
        ok: false,
        msg: e instanceof Error ? e.message : "خطا",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAISettings = () => {
    saveAISettings(aiSettings);
    setSettingsOpen(false);
  };

  const userName = user.name || "شما";
  const userInitial = userName.charAt(0);

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir="rtl">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col border-l border-border/70 bg-card/50 transition-all duration-300",
          sidebarOpen ? "w-72" : "w-0 overflow-hidden",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/70 p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-sky-500 text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold">هوش مصنوعی</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                Genova AI
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          className="mx-3 mt-3 gap-2 rounded-lg text-xs"
          onClick={handleNewChat}
        >
          <Plus className="size-3.5" />
          چت جدید
        </Button>

        <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3 py-1">
          {chats?.map((chat: any) => (
            <button
              key={chat._id}
              type="button"
              onClick={() => setSelectedChatId(chat._id)}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-right text-[13px] transition-colors",
                selectedChatId === chat._id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <MessageSquare className="size-4 shrink-0" />
              <span className="flex-1 truncate">{chat.title}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e: any) => handleDeleteChat(chat._id, e)}
                onKeyDown={(e: any) => {
                  if (e.key === "Enter") handleDeleteChat(chat._id, e);
                }}
                className="invisible size-5 shrink-0 rounded-md text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover:visible group-hover:opacity-100"
              >
                <Trash2 className="size-3 mx-auto mt-1" />
              </span>
            </button>
          ))}
          {chats.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-xs text-muted-foreground">
              <Sparkles className="size-8 opacity-30" />
              <p>هنوز چتی ندارید</p>
              <p>روی «چت جدید» کلیک کنید</p>
            </div>
          )}
        </nav>

        <div className="space-y-1 border-t border-border/70 p-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-start rounded-lg text-xs"
          >
            <Link to="/admin">
              <Home className="ml-2 size-4" />
              کنسول مدیریت
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="z-20 flex h-12 shrink-0 items-center gap-3 border-b border-border/70 bg-background/90 px-4 backdrop-blur-lg">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeftOpen className="size-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/15">
              <Sparkles className="size-3.5 text-primary" />
            </span>
            <span className="text-sm font-bold">Genova AI</span>
          </div>
          <div className="me-auto" />
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleNewChat}
            title="چت جدید"
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={openSettings}
            title="تنظیمات"
          >
            <Settings2 className="size-4" />
          </Button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {(!messages || messages.length === 0) && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-sky-500/20">
                <Sparkles className="size-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">سلام! 👋</p>
                <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                  من دستیار هوش مصنوعی Genova هستم. در حوزه علوم زیستی،
                  میکروبیولوژی و بیوتکنولوژی به شما کمک می‌کنم.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "توضیح مکانیزم PCR",
                  "تفاوت بکتری و ویروس",
                  "نقش پروبیوتیک‌ها",
                  "آنتی‌بیوتیک‌های جدید",
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setInput(q)}
                    className="rounded-full border border-border/70 bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mx-auto max-w-3xl space-y-4">
            {messages?.map((msg: any) => (
              <div
                key={msg._id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "flex-row-reverse" : "",
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    msg.role === "user"
                      ? "bg-primary/15 text-primary"
                      : "bg-gradient-to-br from-primary to-sky-500 text-white",
                  )}
                >
                  {msg.role === "user" ? (
                    <span className="text-sm font-bold">{userInitial}</span>
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-7",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {msg.attachmentName && (
                    <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-background/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                      {msg.attachmentType?.startsWith("image/") ? (
                        <Image className="size-3.5" />
                      ) : (
                        <FileText className="size-3.5" />
                      )}
                      {msg.attachmentName}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border/70 bg-background/90 px-4 py-3 backdrop-blur-lg">
          <div className="mx-auto max-w-3xl">
            {pendingFile && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
                <Paperclip className="size-3.5" />
                <span className="flex-1 truncate">{pendingFile.name}</span>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="rounded-md hover:bg-background"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                onChange={handleFileChange}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 rounded-xl"
                onClick={() => fileInputRef.current?.click()}
                title="آپلود فایل یا تصویر"
              >
                <Paperclip className="size-4" />
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="پیام خود را بنویسید..."
                rows={1}
                className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl border-border/70 bg-muted/40 py-3 text-sm"
              />
              <Button
                size="icon"
                className="size-9 shrink-0 rounded-xl"
                onClick={handleSend}
                disabled={sending || (!input.trim() && !pendingFile)}
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
              Genova AI · مبتنی بر Qwen 3.5
            </p>
          </div>
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-5 text-primary" />
              تنظیمات هوش مصنوعی و ظاهر
            </DialogTitle>
            <DialogDescription>
              تنظیمات هوش مصنوعی و ظاهر صفحه را از اینجا مدیریت کنید.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* ── AI Settings ── */}
            <div className="space-y-4 rounded-xl border border-border/70 bg-muted/30 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Bot className="size-3.5" /> تنظیمات هوش مصنوعی
              </p>

              {/* API Key */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Key className="size-3" /> کلید API
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={apiKeyInput}
                    onChange={(e) => {
                      setApiKeyInput(e.target.value);
                      setTestResult(null);
                      setApiKeySaved(false);
                    }}
                    placeholder="sk-..."
                    dir="ltr"
                    className="font-mono text-xs flex-1"
                    type="password"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyInput.trim()}
                    className="shrink-0 text-xs"
                  >
                    ذخیره
                  </Button>
                </div>
                {apiKeySaved && (
                  <p className="text-[11px] text-emerald-500">
                    ✓ کلید ذخیره شد
                  </p>
                )}
                {!apiKeyInput && currentApiKey && (
                  <p className="text-[11px] text-muted-foreground">
                    کلید فعلی: {currentApiKey.slice(0, 8)}...
                    {currentApiKey.slice(-4)}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1.5"
                  onClick={handleTestApiKey}
                  disabled={testing}
                >
                  {testing ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Zap className="size-3" />
                  )}
                  تست اتصال
                </Button>
                {testResult && (
                  <div
                    className={cn(
                      "rounded-lg p-2 text-xs",
                      testResult.ok
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {testResult.ok
                      ? `✓ متصل: ${testResult.msg}`
                      : `✗ ${testResult.msg}`}
                  </div>
                )}
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Cpu className="size-3" /> مدل
                </Label>
                <Input
                  value={aiSettings.model}
                  onChange={(e) =>
                    setAiSettings((s) => ({ ...s, model: e.target.value }))
                  }
                  dir="ltr"
                  className="font-mono text-xs"
                />
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Thermometer className="size-3" /> دما (Temperature):{" "}
                  {aiSettings.temperature}
                </Label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={aiSettings.temperature}
                  onChange={(e) =>
                    setAiSettings((s) => ({
                      ...s,
                      temperature: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-primary"
                />
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <Label className="text-xs">پرامپت سیستم</Label>
                <Textarea
                  value={aiSettings.systemPrompt}
                  onChange={(e) =>
                    setAiSettings((s) => ({
                      ...s,
                      systemPrompt: e.target.value,
                    }))
                  }
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            {/* ── Appearance Settings ── */}
            <div className="space-y-4 rounded-xl border border-border/70 bg-muted/30 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Paintbrush className="size-3.5" /> تنظیمات ظاهر
              </p>

              {/* Theme */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  <Moon className="size-3" /> قالب
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        key: "dark" as const,
                        label: "تیره",
                        icon: <Moon className="size-4" />,
                      },
                      {
                        key: "light" as const,
                        label: "روشن",
                        icon: <Sun className="size-4" />,
                      },
                    ]
                  ).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTheme(t.key)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                        settings.theme === t.key
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                      )}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  <Paintbrush className="size-3" /> رنگ اصلی
                </p>
                <div className="flex flex-wrap gap-2">
                  {ACCENT_SWATCHES.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      title={a.label}
                      onClick={() => setAccent(a.key)}
                      className={cn(
                        "relative flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110",
                        a.className,
                      )}
                    >
                      {settings.accent === a.key && (
                        <Check
                          className="size-3.5 text-white"
                          strokeWidth={3}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  <Type className="size-3" /> فونت
                </p>
                <div className="space-y-1">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFont(f.key)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-3 py-1.5 text-xs transition-colors",
                        settings.font === f.key
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                      )}
                    >
                      {f.label}
                      {settings.font === f.key && (
                        <Check className="size-3.5" strokeWidth={3} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleSaveAISettings}>
              ذخیره تنظیمات
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
