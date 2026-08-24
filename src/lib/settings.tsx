import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Check, Moon, Paintbrush, Settings2, Sun, Type } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "dark" | "light";
export type AccentKey = "teal" | "emerald" | "sky" | "indigo" | "violet" | "rose" | "amber";
export type FontKey = "vazirmatn" | "plex" | "naskh";

export interface AppSettings {
  theme: ThemeMode;
  accent: AccentKey;
  font: FontKey;
}

const DEFAULT_SETTINGS: AppSettings = { theme: "dark", accent: "teal", font: "vazirmatn" };

const STORAGE_KEY = "genova-settings";

export const ACCENT_SWATCHES: { key: AccentKey; label: string; className: string }[] = [
  { key: "teal", label: "سبز آبی", className: "bg-teal-500" },
  { key: "emerald", label: "زمردی", className: "bg-emerald-500" },
  { key: "sky", label: "آبی آسمانی", className: "bg-sky-500" },
  { key: "indigo", label: "نیلی", className: "bg-indigo-500" },
  { key: "violet", label: "بنفش", className: "bg-violet-500" },
  { key: "rose", label: "رز", className: "bg-rose-500" },
  { key: "amber", label: "کهربایی", className: "bg-amber-500" },
];

export const FONT_OPTIONS: { key: FontKey; label: string; className: string }[] = [
  { key: "vazirmatn", label: "وزیرمتن (پیش‌فرض)", className: "font-sans" },
  { key: "plex", label: "IBM Plex Arabic", className: "font-sans" },
  { key: "naskh", label: "نستعلیق‌محور (نَسخ)", className: "font-sans" },
];

interface SettingsContextValue {
  settings: AppSettings;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentKey) => void;
  setFont: (font: FontKey) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function readStoredSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      accent: ACCENT_SWATCHES.some((a) => a.key === parsed.accent) ? parsed.accent! : "teal",
      font: FONT_OPTIONS.some((f) => f.key === parsed.font) ? parsed.font! : "vazirmatn",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(readStoredSettings);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", settings.theme === "dark");
    root.setAttribute("data-accent", settings.accent);
    root.setAttribute("data-font", settings.font);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // storage unavailable — settings still apply for this session
    }
  }, [settings]);

  const value: SettingsContextValue = {
    settings,
    setTheme: (theme) => setSettings((s) => ({ ...s, theme })),
    setAccent: (accent) => setSettings((s) => ({ ...s, accent })),
    setFont: (font) => setSettings((s) => ({ ...s, font })),
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

// Floating button — visible on every page, no login needed.
function SettingsButton() {
  const { settings, setTheme, setAccent, setFont } = useSettings();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="تنظیمات ظاهر"
        className="fixed bottom-4 left-4 z-40 flex size-11 items-center justify-center rounded-full border border-border/70 bg-card/90 text-muted-foreground shadow-lg shadow-black/20 backdrop-blur transition-colors hover:text-foreground"
      >
        <Settings2 className="size-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paintbrush className="size-5 text-primary" />
              تنظیمات ظاهر
            </DialogTitle>
            <DialogDescription>
              بدون نیاز به حساب، برای همهٔ صفحات اعمال می‌شود و ذخیره می‌ماند.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Theme */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <Moon className="size-3.5" /> قالب
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "dark", label: "تیره", icon: <Moon className="size-4" /> },
                    { key: "light", label: "روشن", icon: <Sun className="size-4" /> },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTheme(t.key)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
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
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <Paintbrush className="size-3.5" /> رنگ اصلی
              </p>
              <div className="flex flex-wrap gap-2">
                {ACCENT_SWATCHES.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    title={a.label}
                    onClick={() => setAccent(a.key)}
                    className={cn(
                      "relative flex size-9 items-center justify-center rounded-full transition-transform hover:scale-110",
                      a.className,
                    )}
                  >
                    {settings.accent === a.key && (
                      <Check className="size-4 text-white" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Font */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <Type className="size-3.5" /> فونت
              </p>
              <div className="space-y-1.5">
                {FONT_OPTIONS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFont(f.key)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors",
                      settings.font === f.key
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    {f.label}
                    {settings.font === f.key && <Check className="size-4" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
            بستن
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
