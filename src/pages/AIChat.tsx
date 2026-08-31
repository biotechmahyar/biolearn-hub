import { useState, useRef, useEffect } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/use-api";
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
  Check,
} from "lucide-react";
import { BrandMark } from "@/components/site/BrandLogo";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
}

interface ActiveModel {
  id: string;
  name: string;
  isFree: boolean;
}

interface Usage {
  dailyLimit: number;
  messagesSent: number;
  remaining: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export default function AIChat() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  // Delete mode state
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth?returnTo=/ai-chat");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const conversations = useApiQuery<Conversation[]>(
    isAuthenticated ? "/api/ai/conversations" : null,
  );
  const activeModels = useApiQuery<ActiveModel[]>(
    isAuthenticated ? "/api/ai/models/active" : null,
  );
  const usage = useApiQuery<Usage>(
    isAuthenticated ? "/api/ai/usage/me" : null,
  );
  const messages = useApiQuery<ChatMessage[]>(
    selectedConvo ? `/api/ai/conversations/${selectedConvo}/messages` : null,
  );

  // Auto-select if only 1 model
  useEffect(() => {
    if (!selectedModelId && activeModels && activeModels.length === 1) {
      setSelectedModelId(activeModels[0].id);
    }
  }, [activeModels, selectedModelId]);

  const { mutate: createConvo } = useApiMutation<any, any>("/api/ai/conversations", "POST");
  const { mutate: sendMessageMut } = useApiMutation<any, any>("/api/ai/chat", "POST");
  const { mutate: deleteConvo } = useApiMutation<any, any>(
    (args: any) => `/api/ai/conversations/${args.conversationId}`,
    "DELETE",
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = async () => {
    try {
      const res = await createConvo({ title: "چت جدید", modelId: selectedModelId ?? undefined });
      setSelectedConvo(res.id as string);
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
        conversationId: selectedConvo,
        content,
        modelId: selectedModelId ?? undefined,
      });
    } catch (e: any) {
      console.error("Send failed:", e);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // Toggle a conversation in the selection set
  const toggleSelect = (id: string) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Confirm and delete selected conversations
  const confirmDelete = async () => {
    if (selectedForDelete.size === 0) return;
    if (!confirm(`${selectedForDelete.size} چت حذف شود؟`)) return;
    for (const id of selectedForDelete) {
      try {
        await deleteConvo({ conversationId: id });
        if (selectedConvo === id) setSelectedConvo(null);
      } catch (e) {
        console.error("Delete failed:", e);
      }
    }
    setSelectedForDelete(new Set());
    setDeleteMode(false);
  };

  // Exit delete mode
  const exitDeleteMode = () => {
    setDeleteMode(false);
    setSelectedForDelete(new Set());
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

  const dailyLimit = usage?.dailyLimit ?? 0;
  const messagesSent = usage?.messagesSent ?? 0;
  const remaining = usage?.remaining ?? 0;
  const hasReachedLimit = dailyLimit > 0 && remaining <= 0;

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
            : "translate-x-full fixed inset-y-0 right-0 z-50 lg:relative lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-sm font-bold">
            {deleteMode ? `${selectedForDelete.size} انتخاب شده` : "سابقه چت‌ها"}
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 hover:bg-accent lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* New Chat Button (hidden in delete mode) */}
        {!deleteMode && (
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
        )}

        {/* Conversation List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 py-1">
            {conversations === undefined && (
              <div className="flex justify-center py-6">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {conversations?.map((c) => {
              const isSelected = selectedForDelete.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    if (deleteMode) {
                      toggleSelect(c.id);
                    } else {
                      setSelectedConvo(c.id);
                      setSidebarOpen(false);
                    }
                  }}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-right text-sm transition-colors",
                    deleteMode
                      ? isSelected
                        ? "bg-destructive/15 text-destructive ring-1 ring-destructive/30"
                        : "text-muted-foreground hover:bg-accent/50"
                      : selectedConvo === c.id
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  {deleteMode ? (
                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "border-destructive bg-destructive text-white"
                          : "border-border bg-background"
                      )}
                    >
                      {isSelected && <Check className="size-3" />}
                    </div>
                  ) : (
                    <MessageSquare className="size-4 shrink-0" />
                  )}
                  <span className="flex-1 truncate">{c.title}</span>
                </button>
              );
            })}
            {conversations?.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                هنوز چتی ندارید
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Delete mode bar OR Usage bar */}
        {deleteMode ? (
          <div className="flex gap-2 border-t border-border p-3">
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 gap-1.5"
              disabled={selectedForDelete.size === 0}
              onClick={confirmDelete}
            >
              <Trash2 className="size-3.5" />
              حذف ({selectedForDelete.size})
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={exitDeleteMode}>
              لغو
            </Button>
          </div>
        ) : (
          usage && (
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
              {/* Delete history button */}
              {conversations && conversations.length > 0 && (
                <button
                  onClick={() => setDeleteMode(true)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3" />
                  حذف سوابق
                </button>
              )}
            </div>
          )
        )}
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
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
              /* Empty state */
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
                {(activeModels ?? []).length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="text-xs text-muted-foreground">مدل:</span>
                    {(activeModels ?? []).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedModelId(m.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          selectedModelId === m.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {m.name}
                        {m.isFree && <span className="mr-1 text-[10px] opacity-70">رایگان</span>}
                      </button>
                    ))}
                  </div>
                )}
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
                          const res = await createConvo({ title: q, modelId: selectedModelId ?? undefined });
                          const id = res.id as string;
                          setSelectedConvo(id);
                          setSidebarOpen(false);
                          setTimeout(async () => {
                            try {
                              await sendMessageMut({
                                conversationId: id,
                                content: q,
                                modelId: selectedModelId ?? undefined,
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
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-3",
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
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-7",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
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
              {(activeModels ?? []).length > 0 && (
                <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">مدل:</span>
                  {(activeModels ?? []).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModelId(m.id)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        selectedModelId === m.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
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
