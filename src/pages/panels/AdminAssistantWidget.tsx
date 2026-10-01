import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowUp,
  CornerDownLeft,
  Eraser,
  Maximize2,
  Paperclip,
  Sparkles,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AssistantOrb } from "@/components/site/AssistantOrb";

const EASE = [0.4, 0, 0.2, 1] as const;

type Turn = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "وضعیت فروش ۳۰ روز اخیر چطور است؟",
  "کدام دوره‌ها کم‌فروش‌تر هستند؟",
  "برای کاهش تیکت‌های باز چه کنم؟",
];

function MessageList({ turns, thinking }: { turns: Turn[]; thinking: boolean }) {
  if (turns.length === 0 && !thinking) return null;
  return (
    <div className="admin-scroll max-h-56 space-y-2.5 overflow-y-auto rounded-2xl bg-muted/40 p-3 text-right">
      {turns.map((t, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={cn("flex", t.role === "user" ? "justify-start" : "justify-end")}
        >
          <p
            className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[12.5px] leading-6",
              t.role === "user"
                ? "rounded-ee-sm bg-primary text-primary-foreground"
                : "rounded-es-sm border border-border bg-card text-foreground",
            )}
          >
            {t.content}
          </p>
        </motion.div>
      ))}
      {thinking && (
        <div className="flex justify-end">
          <span className="flex items-center gap-1 rounded-2xl rounded-es-sm border border-border bg-card px-3 py-2.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-1.5 rounded-full bg-primary/60"
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: EASE }}
              />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="rounded-2xl border border-border bg-card p-1.5 transition-shadow focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
      <div className="flex items-end gap-1.5">
        <span className="flex size-8 shrink-0 items-center justify-center text-muted-foreground">
          <Paperclip className="size-3.5" />
        </span>
        <textarea
          ref={ref}
          value={value}
          rows={1}
          onChange={(e) => {
            onChange(e.target.value);
            const el = e.target;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="از دستیار بپرسید..."
          className="max-h-24 flex-1 resize-none bg-transparent py-2 text-[13px] leading-6 outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="button"
          size="icon"
          onClick={onSend}
          disabled={busy || !value.trim()}
          className="size-8 shrink-0 rounded-xl"
        >
          <ArrowUp className="size-4" />
        </Button>
      </div>
      <p className="flex items-center gap-1 px-2 pb-0.5 text-[10px] text-muted-foreground">
        <CornerDownLeft className="size-2.5" />
        برای ارسال Enter و برای خط جدید Shift+Enter
      </p>
    </div>
  );
}

export default function AdminAssistantWidget({ days = 30 }: { days?: number }) {
  const ask = useAction(api.aiActions.adminAssistantAsk);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [open, setOpen] = useState(false);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || thinking) return;
    const next: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setInput("");
    setThinking(true);
    try {
      const res = await ask({ messages: next, days });
      setTurns([...next, { role: "assistant", content: res.text }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطای ناشناخته";
      setTurns([...next, { role: "assistant", content: `خطا: ${msg}` }]);
    } finally {
      setThinking(false);
    }
  };

  const clear = () => {
    setTurns([]);
    setInput("");
  };

  return (
    <>
      <Card className="gap-0 overflow-hidden rounded-2xl border-border py-0">
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <h3 className="text-[15px] font-bold tracking-tight text-foreground">دستیار هوشمند</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {thinking ? "در حال بررسی داده‌های پلتفرم..." : "پاسخ بر پایهٔ آمار زندهٔ سایت"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {turns.length > 0 && (
              <button
                type="button"
                onClick={clear}
                title="پاک کردن گفتگو"
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Eraser className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(true)}
              title="بزرگ‌نمایی"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Maximize2 className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 pt-1">
          <AssistantOrb thinking={thinking} />

          {turns.length === 0 && !thinking && (
            <div className="mb-3 flex flex-wrap justify-center gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border border-border bg-card px-2.5 py-1.5 text-[11px] text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <MessageList turns={turns} thinking={thinking} />

          <div className={cn(turns.length > 0 || thinking ? "mt-3" : "mt-1")}>
            <Composer
              value={input}
              onChange={setInput}
              onSend={() => void send()}
              busy={thinking}
            />
          </div>
        </div>
      </Card>

      {/* Expanded view */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetTitle className="sr-only">دستیار هوشمند</SheetTitle>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold">دستیار هوشمند پنل</p>
                <p className="text-[11px] text-muted-foreground">
                  بر پایهٔ آمار زندهٔ {days} روز اخیر
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={clear}>
              <Eraser className="size-4" />
            </Button>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-hidden p-5">
            <div className="flex justify-center">
              <AssistantOrb thinking={thinking} compact />
            </div>
            {turns.length === 0 && !thinking && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-border bg-card px-2.5 py-1.5 text-[11px] text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="admin-scroll min-h-0 flex-1 overflow-y-auto">
              {turns.length === 0 && !thinking ? (
                <p className="py-8 text-center text-xs leading-6 text-muted-foreground">
                  هر سؤالی دربارهٔ فروش، اعضا، محتوا یا تیکت‌ها بپرسید.
                  <br />
                  پاسخ‌ها فقط از داده‌های همین پلتفرم ساخته می‌شوند.
                </p>
              ) : (
                <MessageList turns={turns} thinking={thinking} />
              )}
            </div>
            <Composer
              value={input}
              onChange={setInput}
              onSend={() => void send()}
              busy={thinking}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
