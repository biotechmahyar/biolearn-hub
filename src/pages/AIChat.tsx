import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
  Bot,
  User,
  AlertTriangle,
  Zap,
  Home,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/site/BrandLogo";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AIChat() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Sidebar hidden by default
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect to auth if not logged in (only after auth loading is complete)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth?returnTo=/ai-chat");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const conversations = useQuery(
    api.aiChat.listMyConversations,
    isAuthenticated ? {} : "skip"
  );
  const usage = useQuery(
    api.aiChat.getMyUsage,
    isAuthenticated ? {} : "skip"
  );
  const messages = useQuery(
    api.aiChat.getConversationMessages,
    selectedConvo ? { conversationId: selectedConvo as any } : "skip"
  );

  const createConvo = useMutation(api.aiChat.createConversation);
  const sendMessageMut = useMutation(api.aiChat.sendMessage);
  const deleteConvo = useMutation(api.aiChat.deleteConversation);
  const deleteMessageMut = useMutation(api.aiChat.deleteMessage);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = async () => {
    try {
      const id = await createConvo({ title: "چت جدید" });
      setSelectedConvo(id as string);
      setSidebarOpen(false);
      inputRef.current?.focus();
    } catch (e) {
      console.error("Failed to create conversation:", e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedConvo || isSending) return;
    const content = input.trim();
    setInput("");
    setIsSending(true);
    try {
      await sendMessageMut({
        conversationId: selectedConvo as any,
        content,
      });
    } catch (e: any) {
      console.error("Send failed:", e);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("این چت حذف شود؟")) {
      try {
        await deleteConvo({ conversationId: id as any });
        if (selectedConvo === id) setSelectedConvo(null);
      } catch (e) {
        console.error("Delete failed:", e);
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessageMut({ messageId: messageId as any });
    } catch (e) {
      console.error("Delete message failed:", e);
    }
  };

  // Loading state
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

  // Safe access
  const dailyLimit = usage?.dailyLimit ?? 0;
  const messagesSent = usage?.messagesSent ?? 0;
  const remaining = usage?.remaining ?? 0;
  const hasReachedLimit = dailyLimit > 0 && remaining <= 0;

  // Detect if AI is still processing: last message is from user = waiting for response
  const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;
  const isWaitingForAI = !!lastMessage && lastMessage.role === "user";

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "flex w-72 flex-col border-l border-border bg-card transition-all duration-300",
          sidebarOpen
            ? "translate-x-0"
            : "translate-x-full fixed inset-y-0 right-0 z-40 lg:relative lg:translate-x-0"
        )}
      >
        {/* Close sidebar on mobile */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-sm font-bold">سابقه چت‌ها</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 hover:bg-accent lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <Button
            onClick={handleNewChat}
            variant="outline"
            className="w-full gap-2"
          >
            <Plus className="size-4" />
            چت جدید
          </Button>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 py-1">
            {conversations === undefined && (
              <div className="flex justify-center py-6">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {conversations?.map((c) => (
              <button
                key={c._id}
                onClick={() => {
                  setSelectedConvo(c._id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-right text-sm transition-colors",
                  selectedConvo === c._id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <MessageSquare className="size-4 shrink-0" />
                <span className="flex-1 truncate">{c.title}</span>
                <button
                  onClick={(e) => handleDelete(c._id, e)}
                  className="hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:block"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </button>
            ))}
            {conversations?.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                هنوز چتی ندارید
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Usage Bar */}
        {usage && (
          <div className="border-t border-border p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Zap className="size-3 text-amber-500" />
                پیام‌های امروز
              </span>
              <span className="font-mono">
                {messagesSent}/{dailyLimit}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  hasReachedLimit
                    ? "bg-destructive"
                    : remaining <= 1
                      ? "bg-amber-500"
                      : "bg-primary"
                )}
                style={{
                  width: `${Math.min(100, (messagesSent / Math.max(dailyLimit, 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex h-14 items-center gap-3 border-b border-border px-4">
          <button
            onClick={() => navigate("/")}
            className="rounded-lg p-2 hover:bg-accent"
            title="بازگشت به خانه"
          >
            <Home className="size-5" />
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 hover:bg-accent lg:hidden"
          >
            <MessageSquare className="size-5" />
          </button>
          <BrandMark className="hidden sm:flex" />
          <span className="text-sm font-bold text-foreground">چت هوشمند</span>
          <div className="flex-1" />
          {usage && (
            <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              <Zap className="size-3 text-amber-500" />
              {remaining} پیام باقی‌مانده
            </div>
          )}
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {!selectedConvo ? (
              /* Empty state — always shown when no conversation is selected */
              <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
                <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10">
                  <Bot className="size-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">چت هوشمند Genova</h2>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    از هوش مصنوعی درباره علوم زیستی، میکروبیولوژی، بیوتکنولوژی
                    و موضوعات مرتبط سؤال بپرسید.
                  </p>
                </div>
                <Button onClick={handleNewChat} size="lg" className="gap-2">
                  <Plus className="size-4" />
                  شروع چت جدید
                </Button>
                <div className="grid max-w-lg grid-cols-2 gap-2 text-sm">
                  {[
                    "توضیح فتوسنتز",
                    "تفاوت DNA و RNA",
                    "سلول‌های بنیادی",
                    "روش‌های رنگ‌آمیزی گرم",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={async () => {
                        try {
                          const id = await createConvo({ title: q });
                          setSelectedConvo(id as string);
                          setSidebarOpen(false);
                          setTimeout(async () => {
                            try {
                              await sendMessageMut({
                                conversationId: id as any,
                                content: q,
                              });
                            } catch (e) {
                              console.error("Auto-send failed:", e);
                            }
                          }, 500);
                        } catch (e) {
                          console.error("Quick chat failed:", e);
                        }
                      }}
                      className="rounded-xl border border-border bg-card p-3 text-right text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Messages list */
              <div className="space-y-6">
                {messages === undefined && (
                  <div className="flex justify-center py-12">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {messages?.map((m) => (
                  <motion.div
                    key={m._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "group/msg flex gap-3",
                      m.role === "user" ? "flex-row-reverse" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        m.role === "user"
                          ? "bg-primary/10 text-primary"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {m.role === "user" ? (
                        <User className="size-4" />
                      ) : (
                        <Bot className="size-4" />
                      )}
                    </div>
                    <div className="max-w-[80%] space-y-1">
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 text-sm leading-7",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                      {/* Delete button — visible on hover */}
                      <button
                        onClick={() => handleDeleteMessage(m._id)}
                        className={cn(
                          "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/msg:opacity-100",
                          m.role === "user" ? "mr-auto" : "ml-auto"
                        )}
                      >
                        <Trash2 className="size-3" />
                        حذف
                      </button>
                    </div>
                  </motion.div>
                ))}
                {(isSending || isWaitingForAI) && (
                  <div className="flex gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Bot className="size-4" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                      <span className="flex gap-1">
                        <span className="inline-block size-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:0ms]" />
                        <span className="inline-block size-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms]" />
                        <span className="inline-block size-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms]" />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        {selectedConvo && (
          <div className="border-t border-border bg-card p-4">
            <div className="mx-auto max-w-3xl">
              {hasReachedLimit && (
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-4" />
                  محدودیت روزانه تمام شده. فردا دوباره شارژ می‌شود.
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    hasReachedLimit
                      ? "محدودیت روزانه تمام شده..."
                      : "پیام خود را بنویسید..."
                  }
                  disabled={isSending || hasReachedLimit}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || isSending || hasReachedLimit}
                >
                  {isSending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
