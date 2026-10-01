import { useCallback, useEffect, useRef, useState } from "react";
import { HelpCircle, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type LiveMessage = {
  _id: string;
  name?: string;
  text?: string;
  type?: string;
  answer?: string | null;
};

type ToastItem = {
  id: string;
  name: string;
  text: string;
  isQuestion: boolean;
  answered: boolean;
};

const VISIBLE_MS = 10_000;

function isHidden(text?: string) {
  return !text || text.startsWith("__");
}

/**
 * Floating popups for what students send during a live class: every new message
 * or question pops up on top of the classroom screen for ten seconds (with an
 * underline that drains as the timer runs) and disappears immediately when the
 * instructor answers the question.
 */
export function LiveActivityToasts({
  messages,
  onOpen,
}: {
  messages: LiveMessage[];
  onOpen?: (message: LiveMessage) => void;
}) {
  const seenRef = useRef<Set<string> | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // New arrivals: history present on mount is marked as seen without popping.
  useEffect(() => {
    if (seenRef.current === null) {
      seenRef.current = new Set(messages.map((m) => m._id));
      return;
    }
    const fresh = messages.filter(
      (m) => !seenRef.current!.has(m._id) && !isHidden(m.text),
    );
    if (fresh.length === 0) return;
    fresh.forEach((m) => seenRef.current!.add(m._id));
    const timer = setTimeout(() => {
      setToasts((prev) => [
        ...prev.slice(-2),
        ...fresh.map((m) => ({
          id: m._id,
          name: m.name || "دانشجو",
          text: m.text || "",
          isQuestion: m.type === "question",
          answered: false,
        })),
      ]);
    }, 0);
    return () => clearTimeout(timer);
  }, [messages]);

  // Answered questions close their popup straight away.
  useEffect(() => {
    const answered = new Set(
      messages.filter((m) => m.answer).map((m) => m._id),
    );
    if (answered.size === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => !answered.has(t.id)));
    }, 0);
    return () => clearTimeout(timer);
  }, [messages]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex flex-col items-center gap-2 px-3">
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={() => dismiss(toast.id)}
          onOpen={() => {
            const source = messages.find((m) => m._id === toast.id);
            if (source) onOpen?.(source);
            dismiss(toast.id);
          }}
        />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
  onOpen,
}: {
  toast: ToastItem;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur">
      <div className="flex items-start gap-2.5 p-3">
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
            toast.isQuestion
              ? "bg-amber-50 text-amber-600"
              : "bg-primary/10 text-primary",
          )}
        >
          {toast.isQuestion ? (
            <HelpCircle className="size-3.5" />
          ) : (
            <MessageSquare className="size-3.5" />
          )}
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-right"
          title={toast.isQuestion ? "رفتن به پرسش و پاسخ" : "رفتن به گفت‌وگو"}
        >
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[12.5px] font-bold">{toast.name}</span>
            {toast.isQuestion && (
              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
                سؤال
              </span>
            )}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-5 text-muted-foreground">
            {toast.text}
          </span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted"
          title="بستن"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <span className="genova-toast-progress block h-[3px] w-full bg-primary" />
    </div>
  );
}