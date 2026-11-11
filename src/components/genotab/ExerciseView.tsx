import { useEffect, useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Check, Loader2, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";

export interface GenotabExercise {
  id: string;
  kind: "single" | "multi" | "truefalse" | "fill" | "order" | "match";
  prompt: string;
  options?: string[];
  lefts?: string[];
  rights?: string[];
  items?: string[];
}

export interface AnswerFeedback {
  correct: boolean;
  explain: string;
  correctAnswer: string;
  xp: number;
  /** Practice feedback must not block moving on when hearts are empty. */
  hearts?: number;
}

/**
 * One exercise card. The component owns only the *input* state; correctness is
 * decided by the server (`gradeOne`) and arrives through `feedback`.
 */
export function ExerciseView({
  exercise,
  index,
  total,
  feedback,
  pending,
  onSubmit,
  onNext,
  nextLabel = "ادامه",
}: {
  exercise: GenotabExercise;
  index: number;
  total: number;
  feedback: AnswerFeedback | null;
  pending: boolean;
  onSubmit: (responseJson: string) => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  const [single, setSingle] = useState<number | null>(null);
  const [multi, setMulti] = useState<number[]>([]);
  const [bool, setBool] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [order, setOrder] = useState<string[]>([]);
  const [match, setMatch] = useState<string[]>([]);

  useEffect(() => {
    setSingle(null);
    setMulti([]);
    setBool(null);
    setText("");
    setOrder(exercise.items ?? []);
    setMatch(exercise.lefts ? exercise.lefts.map(() => "") : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when moving to another exercise, not on every reactive re-read
  }, [exercise.id]);

  const canSubmit = useMemo(() => {
    if (feedback) return false;
    switch (exercise.kind) {
      case "single":
        return single !== null;
      case "multi":
        return multi.length > 0;
      case "truefalse":
        return bool !== null;
      case "fill":
        return text.trim().length > 0;
      case "order":
        return order.length === (exercise.items?.length ?? 0);
      case "match":
        return match.length > 0 && match.every(Boolean);
      default:
        return false;
    }
  }, [exercise, feedback, single, multi, bool, text, order, match]);

  const submit = () => {
    if (!canSubmit) return;
    switch (exercise.kind) {
      case "single":
        onSubmit(JSON.stringify(single));
        break;
      case "multi":
        onSubmit(JSON.stringify(multi));
        break;
      case "truefalse":
        onSubmit(JSON.stringify(bool));
        break;
      case "fill":
        onSubmit(JSON.stringify(text));
        break;
      case "order":
        onSubmit(JSON.stringify(order));
        break;
      case "match":
        onSubmit(JSON.stringify(match));
        break;
    }
  };

  const move = (at: number, direction: -1 | 1) => {
    const next = [...order];
    const target = at + direction;
    if (target < 0 || target >= next.length) return;
    [next[at], next[target]] = [next[target], next[at]];
    setOrder(next);
  };

  const optionClass = (active: boolean, isCorrect?: boolean) =>
    cn(
      "w-full rounded-xl border px-3 py-2.5 text-right text-[12.5px] font-semibold leading-6 transition-colors",
      feedback
        ? isCorrect
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : active
            ? "border-rose-300 bg-rose-50 text-rose-700"
            : "border-slate-200 bg-white text-slate-500"
        : active
          ? "border-emerald-500 bg-emerald-50 text-emerald-900"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40",
    );

  return (
    <div className="rounded-3xl border border-emerald-900/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-500">
          {faNum(index + 1)} از {faNum(total)}
        </span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
          {exercise.kind === "single"
            ? "تک‌گزینه‌ای"
            : exercise.kind === "multi"
              ? "چندگزینه‌ای"
              : exercise.kind === "truefalse"
                ? "درست / نادرست"
                : exercise.kind === "fill"
                  ? "جای خالی"
                  : exercise.kind === "order"
                    ? "مرتب‌سازی"
                    : "تطبیق"}
        </span>
      </div>

      <p className="mb-4 text-[14px] font-extrabold leading-7 text-slate-900">{exercise.prompt}</p>

      {exercise.kind === "single" && exercise.options ? (
        <div className="space-y-2">
          {exercise.options.map((option, optionIndex) => (
            <button
              key={option}
              type="button"
              disabled={Boolean(feedback)}
              onClick={() => setSingle(optionIndex)}
              className={optionClass(single === optionIndex, Boolean(feedback) && exercise.options?.[optionIndex] === feedback?.correctAnswer)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}

      {exercise.kind === "multi" && exercise.options ? (
        <div className="space-y-2">
          {exercise.options.map((option, optionIndex) => {
            const active = multi.includes(optionIndex);
            return (
              <button
                key={option}
                type="button"
                disabled={Boolean(feedback)}
                onClick={() =>
                  setMulti((prev) => (prev.includes(optionIndex) ? prev.filter((i) => i !== optionIndex) : [...prev, optionIndex]))
                }
                className={optionClass(active, Boolean(feedback) && active && feedback?.correct)}
              >
                <span
                  className={cn(
                    "mr-1 inline-flex size-4 items-center justify-center rounded border",
                    active ? "border-emerald-500 bg-emerald-600 text-white" : "border-slate-300",
                  )}
                >
                  {active ? <Check className="size-3" /> : null}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      ) : null}

      {exercise.kind === "truefalse" ? (
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((value) => (
            <button
              key={String(value)}
              type="button"
              disabled={Boolean(feedback)}
              onClick={() => setBool(value)}
              className={optionClass(bool === value, Boolean(feedback) && bool === value && feedback?.correct)}
            >
              {value ? "درست" : "نادرست"}
            </button>
          ))}
        </div>
      ) : null}

      {exercise.kind === "fill" ? (
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={Boolean(feedback)}
          placeholder="پاسخ را بنویسید…"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-800 outline-none focus:border-emerald-400"
        />
      ) : null}

      {exercise.kind === "order" ? (
        <div className="space-y-1.5">
          {order.map((item, at) => (
            <div key={`${item}-${at}`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2">
              <span className="w-4 text-[10px] font-bold text-slate-300">{faNum(at + 1)}</span>
              <span className="min-w-0 flex-1 text-[12px] font-semibold text-slate-700">{item}</span>
              <button
                type="button"
                disabled={Boolean(feedback)}
                onClick={() => move(at, -1)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                title="بالا"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={Boolean(feedback)}
                onClick={() => move(at, 1)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                title="پایین"
              >
                <ArrowDown className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {exercise.kind === "match" && exercise.lefts && exercise.rights ? (
        <div className="space-y-2">
          {exercise.lefts.map((left, at) => (
            <div key={left} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] font-bold text-slate-700">
                {left}
              </span>
              <select
                value={match[at] ?? ""}
                disabled={Boolean(feedback)}
                onChange={(event) => setMatch((prev) => prev.map((value, i) => (i === at ? event.target.value : value)))}
                className="w-[52%] rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11.5px] font-semibold text-slate-700 outline-none focus:border-emerald-400"
              >
                <option value="">انتخاب کنید…</option>
                {(exercise.rights ?? []).map((right) => (
                  <option key={right} value={right}>
                    {right}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : null}

      {feedback ? (
        <div
          className={cn(
            "mt-4 rounded-2xl border px-3 py-3",
            feedback.correct ? "border-emerald-200 bg-emerald-50/70" : "border-rose-200 bg-rose-50/70",
          )}
        >
          <p className={cn("flex items-center gap-1.5 text-[12px] font-extrabold", feedback.correct ? "text-emerald-700" : "text-rose-700")}>
            {feedback.correct ? <Check className="size-4" /> : <X className="size-4" />}
            {feedback.correct ? "درست است" : "پاسخ درست نبود"}
            {feedback.xp > 0 ? (
              <span className="mr-auto inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <Sparkles className="size-3" /> +{faNum(feedback.xp)} XP
              </span>
            ) : null}
          </p>
          {!feedback.correct ? (
            <p className="mt-1.5 text-[11.5px] leading-6 text-slate-600">
              <b className="text-slate-800">پاسخ درست:</b> {feedback.correctAnswer}
            </p>
          ) : null}
          <p className="mt-1 text-[11.5px] leading-6 text-slate-600">{feedback.explain}</p>
          <button
            type="button"
            onClick={onNext}
            className="mt-3 inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-[12.5px] font-extrabold text-white transition-colors hover:bg-emerald-800"
          >
            {nextLabel}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || pending}
          className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2.5 text-[12.5px] font-extrabold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          بررسی پاسخ
        </button>
      )}
    </div>
  );
}
