/**
 * AI Panel — Secure AI Chat + Admin-only Configuration
 *
 * - All users: chat with the AI (messages saved per-user, scoped)
 * - Admin/site_admin only: configure API key, test connection
 * - API key never leaves the server; frontend only sees masked version
 * - External API call happens inside a Convex Action ("use node")
 */

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation, useAction } from "convex/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bot,
  Send,
  Plus,
  Trash2,
  Settings2,
  Loader2,
  MessageSquare,
  Eye,
  EyeOff,
  Plug,
  PlugZap,
  X,
  PanelLeftOpen,
  Dna,
} from "lucide-react";
import { toast } from "sonner";

/* ── helpers ──────────────────────────────────────────────────────── */

const isAdmin = (role?: string) => role === "admin" || role === "site_admin";

/* ── component ────────────────────────────────────────────────────── */

export default function AIPanel() {
  const { user, isLoading: authLoading } = useAuth();
  const role = user?.role as string | undefined;
  const admin = isAdmin(role);

  // ── queries / mutations / actions ───────────────────────────────
  const chats = useQuery(api.ai.listChats);
  const configMeta = useQuery(api.ai.getConfigMeta, admin ? {} : "skip");
  const createChat = useMutation(api.ai.createChat);
  const deleteChatMutation = useMutation(api.ai.deleteChat);
  const saveUserMessage = useMutation(api.ai.saveUserMessage);
  const saveAssistantMessage = useMutation(api.ai.saveAssistantMessage);
  const saveConfigMutation = useMutation(api.ai.saveConfig);
  const deleteConfigMutation = useMutation(api.ai.deleteConfig);
  const chatCompletionAction = useAction(api.aiActions.chatCompletion);
  const testConnectionAction = useAction(api.aiActions.testConnection);

  // ── state ──────────────────────────────────────────────────────
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  // Config state
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    message: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── messages: reactive per-chat ────────────────────────────────
  const rawMessages = useQuery(
    api.ai.getMessages,
    selectedChatId ? { chatId: selectedChatId as any } : "skip",
  );

  // Map to simple format
  const messages =
    rawMessages?.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content as string,
      createdAt: m.createdAt as number,
    })) ?? [];

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  // ── send message ───────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !selectedChatId || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    try {
      await saveUserMessage({
        chatId: selectedChatId as any,
        content,
      });

      // Build conversation history for context
      const history = [
        {
          role: "system" as const,
          content:
            "تو یک دستیار تخصصی علوم زیستی به نام Genova هستی. در حوزه‌های میکروبیولوژی، بیوتکنولوژی، ژنتیک، بیوشیمی و علوم زیستی تخصص داری. به سؤالات علمی با دقت و به فارسی پاسخ بده.",
        },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content },
      ];

      // Call AI via Convex Action (server-side)
      const response = await chatCompletionAction({ messages: history });

      await saveAssistantMessage({
        chatId: selectedChatId as any,
        content: response.content,
      });
    } catch (err: any) {
      console.error("AI error:", err);
      toast.error(err?.message || "خطا در برقراری ارتباط با هوش مصنوعی");
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  // ── new chat ───────────────────────────────────────────────────
  const handleNewChat = async () => {
    try {
      const id = await createChat({ title: "چت جدید" });
      setSelectedChatId(String(id));
      setSidebarOpen(false);
    } catch {
      toast.error("خطا در ساخت چت جدید");
    }
  };

  // ── delete chat ────────────────────────────────────────────────
  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChatMutation({ chatId: chatId as any });
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
      }
      toast.success("چت حذف شد");
    } catch {
      toast.error("خطا در حذف چت");
    }
  };

  // ── config: save key ───────────────────────────────────────────
  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      toast.error("کلید API را وارد کنید");
      return;
    }
    setSavingKey(true);
    try {
      await saveConfigMutation({ apiKey: apiKey.trim() });
      toast.success("کلید API ذخیره شد");
      setApiKey("");
    } catch (err: any) {
      toast.error(err?.message || "خطا در ذخیره کلید");
    } finally {
      setSavingKey(false);
    }
  };

  // ── config: delete key ─────────────────────────────────────────
  const handleDeleteKey = async () => {
    try {
      await deleteConfigMutation();
      setTestResult(null);
      toast.success("کلید API حذف شد");
    } catch (err: any) {
      toast.error(err?.message || "خطا در حذف کلید");
    }
  };

  // ── config: test connection ────────────────────────────────────
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnectionAction();
      setTestResult(result);
      if (result.connected) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      setTestResult({
        connected: false,
        message: err?.message || "خطا در تست اتصال",
      });
      toast.error("خطا در تست اتصال");
    } finally {
      setTesting(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────
  if (authLoading || !user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Dna className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background text-foreground">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <div
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } flex-shrink-0 overflow-hidden border-l border-border/50 transition-all duration-300`}
      >
        <div className="flex h-full w-72 flex-col bg-card/50">
          <div className="flex items-center justify-between border-b border-border/50 p-3">
            <span className="text-xs font-bold">چت‌ها</span>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            className="m-3 gap-1.5 text-xs"
            onClick={handleNewChat}
          >
            <Plus className="size-3.5" /> چت جدید
          </Button>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {chats === undefined && (
              <Loader2 className="mx-auto mt-8 size-4 animate-spin text-muted-foreground" />
            )}
            {chats?.length === 0 && (
              <p className="mt-8 text-center text-xs text-muted-foreground">
                هنوز چتی ندارید
              </p>
            )}
            {chats?.map((chat: any) => (
              <div
                key={chat._id}
                className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                  selectedChatId === chat._id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
                onClick={() => {
                  setSelectedChatId(chat._id);
                  setSidebarOpen(false);
                }}
              >
                <MessageSquare className="size-3.5 flex-shrink-0" />
                <span className="flex-1 truncate">{chat.title}</span>
                <button
                  className="hidden size-5 flex-shrink-0 items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive group-hover:flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat._id);
                  }}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <PanelLeftOpen
              className={`size-4 transition-transform ${
                sidebarOpen ? "rotate-180" : ""
              }`}
            />
          </Button>
          <Bot className="size-5 text-primary" />
          <span className="flex-1 text-sm font-bold">هوش مصنوعی</span>

          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={handleNewChat}
          >
            <Plus className="size-4" />
          </Button>

          {/* Settings — admin only */}
          {admin && (
            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="size-8">
                  <Settings2 className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-sm">
                    <Settings2 className="size-4" />
                    تنظیمات هوش مصنوعی
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  {/* Current key */}
                  <div className="space-y-2">
                    <Label className="text-xs">کلید API فعلی</Label>
                    {configMeta ? (
                      <div className="flex items-center gap-2">
                        <code
                          dir="ltr"
                          className="flex-1 rounded-md bg-muted/50 px-3 py-2 font-mono text-xs"
                        >
                          {configMeta.maskedKey}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={handleDeleteKey}
                          title="حذف کلید"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        هنوز کلیدی ذخیره نشده است
                      </p>
                    )}
                  </div>

                  {/* Enter new key */}
                  <div className="space-y-2">
                    <Label className="text-xs">
                      {configMeta
                        ? "تغییر کلید API"
                        : "کلید API را وارد کنید"}
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showKey ? "text" : "password"}
                          dir="ltr"
                          placeholder="sk-..."
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="pr-9 font-mono text-xs"
                        />
                        <button
                          type="button"
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowKey(!showKey)}
                        >
                          {showKey ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </button>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleSaveKey}
                        disabled={savingKey || !apiKey.trim()}
                        className="gap-1.5 text-xs"
                      >
                        {savingKey ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : null}
                        ذخیره
                      </Button>
                    </div>
                  </div>

                  {/* Test connection */}
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={testing || !configMeta}
                      className="gap-1.5 text-xs"
                    >
                      {testing ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : testResult?.connected ? (
                        <PlugZap className="size-3 text-green-500" />
                      ) : (
                        <Plug className="size-3" />
                      )}
                      تست اتصال
                    </Button>
                    {testResult && (
                      <div
                        className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs ${
                          testResult.connected
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {testResult.connected ? "✓" : "✕"}{" "}
                        {testResult.message}
                      </div>
                    )}
                  </div>

                  {/* Provider info */}
                  <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-bold">ارائه‌دهنده: GapGPT</p>
                    <p className="mt-1">مدل: gapgpt-qwen-3.5</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {!selectedChatId ? (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Bot className="size-10 text-primary" />
              </div>
              <h2 className="text-lg font-bold">چت با هوش مصنوعی</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                از هوش مصنوعی Genova سؤالات تخصصی علوم زیستی بپرسید. روی دکمه
                «چت جدید» کلیک کنید تا شروع کنید.
              </p>
              <Button onClick={handleNewChat} className="gap-1.5">
                <Plus className="size-4" /> شروع چت جدید
              </Button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {rawMessages === undefined ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 && !sending ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <Bot className="size-8 text-primary/40" />
                    <p className="text-xs text-muted-foreground">
                      پیام خود را بنویسید...
                    </p>
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl space-y-4">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/60 text-foreground"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {sending &&
                      messages[messages.length - 1]?.role === "user" && (
                        <div className="flex justify-start">
                          <div className="rounded-2xl bg-muted/60 px-4 py-3">
                            <Loader2 className="size-4 animate-spin text-primary" />
                          </div>
                        </div>
                      )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-border/50 p-4">
                <form
                  className="mx-auto flex max-w-3xl gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                >
                  <textarea
                    ref={inputRef}
                    dir="rtl"
                    rows={1}
                    placeholder="پیام خود را بنویسید..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="min-h-[40px] flex-1 resize-none rounded-md border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim() || sending}
                    className="size-10 flex-shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
