import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import { X, ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";

/**
 * SitePopupHost — modern, non-intrusive popup announcements.
 *
 * Shows the highest-priority active popup as a corner card. Dismissals are
 * persisted in localStorage so the same announcement never bothers anyone
 * twice. Auto events (e.g. "دوره جدید اضافه شد") come from popups.listActivePopups.
 */

const STORAGE_KEY = "genova-popup-dismissed";

type PopupItem = {
  key: string;
  kind: string;
  title: string;
  body: string;
  icon: string;
  link: string | null;
  linkLabel: string | null;
  priority: number;
  createdAt: number;
};

function loadDismissed(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveDismissed(keys: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys.slice(-100)));
  } catch {
    /* storage may be unavailable — ignore */
  }
}

export function SitePopupHost() {
  const popups = useQuery(api.popups.listActivePopups);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  const visible: PopupItem | undefined = (popups ?? []).find(
    (p) => !dismissed.includes(p.key),
  );

  const dismiss = () => {
    if (!visible) return;
    const next = [...new Set([...dismissed, visible.key])];
    setDismissed(next);
    saveDismissed(next);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={visible.key}
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 28, scale: 0.96 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 left-4 z-[70] w-[min(92vw,22rem)]"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-4 shadow-2xl shadow-primary/10 backdrop-blur-lg">
            {/* soft gradient wash */}
            <div className="pointer-events-none absolute -left-10 -top-12 size-32 rounded-full bg-primary/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-14 -right-8 size-28 rounded-full bg-emerald-500/10 blur-2xl" />

            <button
              onClick={dismiss}
              aria-label="بستن اعلان"
              className="absolute left-2 top-2 z-10 flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <div className="relative flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl ring-1 ring-primary/20">
                {visible.icon || "📢"}
              </span>
              <div className="min-w-0 pr-1">
                <p className="truncate text-sm font-extrabold text-foreground">
                  {visible.title}
                </p>
                <p className="mt-1 line-clamp-4 text-xs leading-5 text-muted-foreground">
                  {visible.body}
                </p>
              </div>
            </div>

            <div className="relative mt-3 flex items-center justify-between gap-2">
              <button
                onClick={dismiss}
                className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                بعداً
              </button>
              {visible.link && (
                <Link
                  to={visible.link}
                  onClick={dismiss}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {visible.linkLabel ?? "مشاهده"}
                  <ArrowLeft className="size-3.5" />
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
