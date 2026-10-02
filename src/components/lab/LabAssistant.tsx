/**
 * Virtual Lab assistant — the same orb + sheet experience as the admin panel,
 * themed for the lab's emerald canvas and grounded in the tool the visitor is
 * currently working with.
 */
import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { motion } from "framer-motion";
import { ArrowUp, Eraser, FlaskConical, Maximize2, Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AssistantOrb } from "@/components/site/AssistantOrb";
import { cn } from "@/lib/utils";

const EASE = [0.4, 0, 0.2, 1] as const;

type Turn = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "برای طراحی پرایمر چه نکاتی را رعایت کنم؟",
  "GC% توالی را چطور حساب می‌کنند؟",
  "تفاوت آنزیم‌های ایزوشیزومر چیست؟",
  "یک پروتکل PCR استاندارد پیشنهاد بده.",
];

function MessageList({ turns, thinking }: { turns: Turn[]; thinking: boolean }) {
  if (turns.length === 0 && !thinking) return null;
  return (
    <div className="lab-scrollbar max-h-64 space-y-2.5 overflow-y-auto rounded-2xl bg-emerald-50/60 p-3 text-right">
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
                ? "rounded-ee-sm bg-emerald-600 text-white"
                : "rounded-es-sm border border-emerald-200/70 bg-white text-slate-700",
            )}
          >
            {t.content}
          </p>
        </motion.div>
      ))}
      {thinking && (
        <div className="flex justify-end">
          <span className="flex items-center gap-1 rounded-2xl rounded-es-sm border border-emerald-200/70 bg-white px-3 py-2.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-1.5 rounded-full bg-emerald-500/70"
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
    <div className="rounded-2xl border border-emerald-200/80 bg-white p-1.5 transition-shadow focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
      <div className="flex items-end gap-1.5">
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
          placeholder="از دستیار آزمایشگاه بپرسید..."
          className="max-h-24 flex-1 resize-none bg-transparent py-2 text-[13px] leading-6 text-slate-700 outline-none placeholder:text-slate-400"
        />
        <Button
          type="button"
          size="icon"
          onClick={onSend}
          disabled={busy || !value.trim()}
          className="size-8 shrink-0 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <ArrowUp className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function LabAssistant({
  tool,
  defaultOpen = false,
}: {
  /** Title of the tool currently open, used to ground the answers. */
  tool?: string;
  defaultOpen?: boolean;
}) {
  const ask = useAction(api.aiActions.labAssistantAsk);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [open, setOpen] = useState(defaultOpen);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || thinking) return;
    const next: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setInput("");
    setThinking(true);
    try {
      const res = await ask({ messages: next, ...(tool ? { tool } : {}) });
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
      {/* Floating orb — bottom-left, exactly where the reference keeps it. */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        whileHover={{ scale: 1.06 }}
        title="دستیار هوشمند آزمایشگاه"
        className="fixed bottom-6 left-6 z-40 flex size-12 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xl shadow-emerald-900/25 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-800"
      >
        <FlaskConical className="size-5" />
        {thinking && (
          <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-emerald-400 ring-2 ring-white" />
        )}
      </motion.button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-full flex-col gap-0 border-emerald-200/70 bg-[#f6faf8] p-0 sm:max-w-lg">
          <SheetTitle className="sr-only">دستیار هوشمند آزمایشگاه</SheetTitle>
          <div className="flex items-center justify-between border-b border-emerald-200/70 bg-white/80 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800">دستیار هوشمند آزمایشگاه</p>
                <p className="text-[11px] text-slate-500">
                  {thinking
                    ? "در حال بررسی..."
                    : tool
                      ? `متصل به ابزار «${tool}»`
                      : "متصل به کاتالوگ آزمایشگاه"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {turns.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clear}
                  title="پاک کردن گفتگو"
                  className="size-8 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Eraser className="size-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                title="بزرگ‌نمایی"
                className="size-8 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
              >
                <Maximize2 className="size-4" />
              </Button>
            </div>
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
                    className="rounded-full border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600 transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:text-emerald-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="lab-scrollbar min-h-0 flex-1 overflow-y-auto">
              {turns.length === 0 && !thinking ? (
                <p className="py-8 text-center text-xs leading-6 text-slate-500">
                  هر سؤالی دربارهٔ توالی، پرایمر، آنزیم‌ها یا پروتکل‌های آزمایشگاهی بپرسید.
                  <br />
                  پاسخ‌ها بر پایهٔ همان مدلی ساخته می‌شود که مدیر سایت تنظیم کرده است.
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

export default LabAssistant;
