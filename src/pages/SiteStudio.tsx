import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowDown,
  ArrowUp,
  Blocks,
  Check,
  Eye,
  FileText,
  History,
  Image as ImageIcon,
  Layers,
  Loader2,
  Monitor,
  Palette,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  Upload,
  UserCog,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadBlob } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { BlockRenderer } from "@/components/studio/BlockRenderer";
import {
  BLOCKS,
  COMMON_STYLE_FIELDS,
  DEFAULT_THEME,
  PERM_KEY,
  PERM_LABEL,
  SITE_STUDIO_PERMS_LABELS,
  THEME_FONTS,
  blockDef,
  themeToWrapperCss,
  type ElementStyle,
  type FieldDef,
  type SiteTheme,
  type StudioElement,
} from "@/components/studio/blocks";
import { RequireAuth } from "@/components/RequireAuth";

// ── Shared types ──────────────────────────────────────────────────────────
type PageDoc = {
  _id: Id<"studioPages">;
  key: string;
  title: string;
  route: string;
  description?: string;
  published: boolean;
  updatedAt?: number;
};

type ElementDoc = {
  _id: Id<"studioElements">;
  pageId: Id<"studioPages">;
  type: string;
  label?: string;
  order: number;
  visible: boolean;
  props?: Record<string, unknown>;
  style?: ElementStyle;
  hasDraftChanges?: boolean;
};

type Perms = { isFull: boolean; role: string; perms: string[] };

const has = (perms: Perms | null | undefined, perm: string) =>
  !!perms && (perms.isFull || perms.perms.includes(perm));

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 bg-background text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      در حال بارگذاری استودیو…
    </div>
  );
}

// Small labeled field wrapper that shows a lock icon when no permission.
function PermGate({
  ok,
  permLabel,
  children,
}: {
  ok: boolean;
  permLabel: string;
  children: React.ReactNode;
}) {
  if (ok) return <>{children}</>;
  return (
    <div className="relative select-none opacity-55" title={`نیاز به دسترسی: ${permLabel}`}>
      {children}
      <div className="absolute inset-0 cursor-not-allowed rounded-md" />
    </div>
  );
}

// ── Color / number / field controls for the inspector ─────────────────────
function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const getUploadUrl = useMutation(api.upload.getUploadUrl);
  const addMedia = useMutation(api.siteStudio.addMedia);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const url = await getUploadUrl();
      const storageId = await uploadBlob(url, file);
      const kind: "image" | "video" = file.type.startsWith("video/")
        ? "video"
        : "image";
      // Resolve a serving URL through the same storage deployment.
      const serveUrl = await new Promise<string>((resolve) => {
        // Convex storage serving URL format: <origin>/api/storage/<id>
        resolve(`${(url.split("/upload")[0]).replace(/\/api\/storage.*$/, "")}/api/storage/${storageId}`);
      });
      await addMedia({
        storageId: storageId as Id<"_storage">,
        url: serveUrl,
        name: file.name,
        kind,
        size: file.size,
      });
      onChange(serveUrl);
      toast.success("رسانه آپلود شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "آپلود ناموفق بود");
    } finally {
      setUploading(false);
    }
  };

  switch (field.type) {
    case "text":
      return (
        <Input
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "textarea":
      return (
        <Textarea
          rows={3}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "link":
      return (
        <Input
          dir="ltr"
          className="text-left font-mono text-xs"
          value={String(value ?? "")}
          placeholder={field.placeholder ?? "/courses یا https://…"}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "boolean":
      return (
        <Switch checked={!!value} onCheckedChange={(v) => onChange(v)} />
      );
    case "select":
      return (
        <Select value={String(value ?? "")} onValueChange={(v) => onChange(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "color":
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value ?? "#000000")}
            onChange={(e) => onChange(e.target.value)}
            className="size-9 cursor-pointer rounded-md border border-border bg-transparent"
          />
          <Input
            dir="ltr"
            className="h-9 flex-1 font-mono text-xs"
            value={String(value ?? "")}
            placeholder="transparent"
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "number":
      return (
        <div className="flex items-center gap-3">
          <Slider
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={1}
            value={[Number(value ?? field.min ?? 0)]}
            onValueChange={([v]) => onChange(v)}
            className="flex-1"
          />
          <span className="w-10 text-center font-mono text-xs text-muted-foreground">
            {Number(value ?? 0)}
          </span>
        </div>
      );
    case "image":
    case "video": {
      const media = useQuery(api.siteStudio.listMedia) ?? [];
      const filtered = media.filter((m) =>
        field.type === "video" ? m.kind === "video" : m.kind === "image",
      );
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              dir="ltr"
              className="h-9 flex-1 font-mono text-xs"
              value={String(value ?? "")}
              placeholder="آدرس مستقیم یا از کتابخانه"
              onChange={(e) => onChange(e.target.value)}
            />
            <input
              ref={fileRef}
              type="file"
              accept={field.type === "video" ? "video/*" : "image/*"}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              title="آپلود جدید"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            </Button>
          </div>
          {filtered.length > 0 && (
            <div className="grid max-h-32 grid-cols-4 gap-1.5 overflow-y-auto rounded-lg border border-border/60 p-1.5">
              {filtered.slice(0, 24).map((m) => (
                <button
                  key={m._id}
                  type="button"
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-md border",
                    value === m.url ? "border-primary ring-1 ring-primary" : "border-border/60",
                  )}
                  onClick={() => onChange(m.url)}
                  title={m.name}
                >
                  {m.kind === "image" ? (
                    <img src={m.url} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center bg-muted text-[10px]">ویدئو</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}

// ── Theme panel (theme.manage) ────────────────────────────────────────────
function ThemePanel({
  pageId,
  theme,
  canTheme,
  onSave,
}: {
  pageId: Id<"studioPages">;
  theme: SiteTheme;
  canTheme: boolean;
  onSave: (t: SiteTheme) => void;
}) {
  const fields: FieldDef[] = [
    {
      key: "fontFamily",
      label: "فونت پایه",
      type: "select",
      perm: "theme",
      options: THEME_FONTS,
    },
    { key: "baseFontSize", label: "اندازه فونت پایه (px)", type: "number", perm: "theme", min: 12, max: 22 },
    { key: "textColor", label: "رنگ متن سراسری", type: "color", perm: "theme" },
    { key: "backgroundColor", label: "رنگ پس‌زمینه سراسری", type: "color", perm: "theme" },
    { key: "radius", label: "گردی سراسری (px)", type: "number", perm: "theme", min: 0, max: 36 },
    { key: "sectionSpacing", label: "فاصله بخش‌ها (px)", type: "number", perm: "theme", min: 0, max: 96 },
    {
      key: "shadow",
      label: "سایه سراسری",
      type: "select",
      perm: "theme",
      options: [
        { value: "none", label: "بدون سایه" },
        { value: "sm", label: "کم" },
        { value: "md", label: "متوسط" },
        { value: "lg", label: "زیاد" },
      ],
    },
    { key: "maxWidth", label: "حداکثر عرض محتوا (px)", type: "number", perm: "theme", min: 720, max: 1440 },
  ];
  return (
    <div className="space-y-3.5">
      <p className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
        تم روی کل صفحه اعمال می‌شود (فونت، رنگ پایه، گردی و فاصله‌ها). برای انتشار، دکمهٔ «انتشار تغییرات» را بزنید.
      </p>
      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label className="text-xs">{f.label}</Label>
          <PermGate ok={canTheme} permLabel="theme.manage">
            <div className={cn(!canTheme && "pointer-events-none")}>
              <FieldControl
                field={f}
                value={theme[f.key as keyof SiteTheme]}
                onChange={(v) => onSave({ ...theme, [f.key]: v })}
              />
            </div>
          </PermGate>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          void pageId;
          onSave({ ...DEFAULT_THEME });
        }}
      >
        <RotateCcw className="ml-1.5 size-3.5" />
        بازنشانی تم
      </Button>
    </div>
  );
}

// ── Version history dialog ────────────────────────────────────────────────
function VersionHistory({
  pageId,
  open,
  onOpenChange,
}: {
  pageId: Id<"studioPages">;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const versions = useQuery(
    api.siteStudio.listVersions,
    open ? { pageId } : "skip",
  );
  const restore = useMutation(api.siteStudio.restoreVersion);
  const [restoring, setRestoring] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="size-4 text-primary" />
            تاریخچه نسخه‌ها
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 space-y-2 overflow-y-auto pl-1">
          {versions === undefined && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> در حال بارگذاری…
            </div>
          )}
          {versions?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              هنوز نسخه‌ای منتشر نشده است.
            </p>
          )}
          {versions?.map((v) => (
            <div
              key={v._id}
              className="flex items-center justify-between rounded-xl border border-border/70 bg-card/60 px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-bold">نسخه {v.version}</p>
                <p className="text-xs text-muted-foreground">
                  {v.elementCount} بلوک ·{" "}
                  {new Date(v.createdAt).toLocaleString("fa-IR")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={restoring === v._id}
                onClick={async () => {
                  setRestoring(v._id);
                  try {
                    await restore({ versionId: v._id as Id<"studioVersions"> });
                    toast.success(`نسخه ${v.version} به پیش‌نویس بازیابی شد — برای اعمال، انتشار بدهید.`);
                    onOpenChange(false);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "بازیابی ناموفق بود");
                  } finally {
                    setRestoring(null);
                  }
                }}
              >
                {restoring === v._id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Undo2 className="size-3.5" />
                )}
                بازیابی
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          بازیابی، محتوای آن نسخه را در «پیش‌نویس» قرار می‌دهد؛ سایت عمومی تا انتشار تغییر نمی‌کند.
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ── Media manager dialog ──────────────────────────────────────────────────
function MediaManager({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const media = useQuery(api.siteStudio.listMedia, open ? {} : "skip");
  const remove = useMutation(api.siteStudio.removeMedia);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="size-4 text-primary" />
            کتابخانه رسانه
          </DialogTitle>
        </DialogHeader>
        <div className="grid max-h-96 grid-cols-4 gap-2 overflow-y-auto">
          {media === undefined && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">در حال بارگذاری…</p>
          )}
          {media?.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">کتابخانه خالی است.</p>
          )}
          {media?.map((m) => (
            <div key={m._id} className="group relative aspect-square overflow-hidden rounded-xl border border-border/60">
              {m.kind === "image" ? (
                <img src={m.url} alt={m.name} className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center bg-muted text-xs">ویدئو</span>
              )}
              <button
                type="button"
                className="absolute left-1 top-1 rounded-full bg-red-500/90 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                onClick={async () => {
                  try {
                    await remove({ id: m._id });
                    toast.success("حذف شد");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "حذف ناموفق بود");
                  }
                }}
                title="حذف"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Permissions manager (system admins only) ──────────────────────────────
function PermsManager({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const staff = useQuery(api.siteStudio.listStaffPerms, open ? {} : "skip");
  const users = useQuery(api.admin.adminGetUsers, open ? {} : "skip");
  const setPerms = useMutation(api.siteStudio.setStaffPerms);
  const candidates = (users ?? []).filter(
    (u) =>
      (u.role === "content_manager" || u.role === "mentor" || u.role === "support") &&
      !(staff ?? []).some((s) => s.userId === u._id),
  );
  const [newUserId, setNewUserId] = useState("");
  const ALL_PERMS = Object.values(PERM_KEY).concat(["pages.manage", "navigation.manage", "preview", "publish"]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" />
            دسترسی مدیران سایت به استودیو
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-96 space-y-2 overflow-y-auto pl-1">
          {staff === undefined && (
            <p className="py-6 text-center text-sm text-muted-foreground">در حال بارگذاری…</p>
          )}
          {staff?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              هنوز دسترسی محدودی تعریف نشده — ادمین‌های سامانه دسترسی کامل دارند.
            </p>
          )}
          {staff?.map((s) => (
            <div key={s._id} className="rounded-xl border border-border/70 bg-card/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">{s.name}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-red-400"
                  onClick={() => void setPerms({ userId: s.userId as Id<"users">, perms: [] })}
                >
                  <Trash2 className="size-3.5" />
                  حذف کامل
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ALL_PERMS.map((p) => {
                  const active = s.perms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      className={cn(
                        "rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors",
                        active
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                      onClick={() =>
                        void setPerms({
                          userId: s.userId as Id<"users">,
                          perms: active ? s.perms.filter((x) => x !== p) : [...s.perms, p],
                        })
                      }
                    >
                      {PERM_LABEL[p] ?? p}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border/70 p-3">
          <Label className="text-xs">افزودن دسترسی برای مدیر جدید</Label>
          <div className="mt-2 flex gap-2">
            <Select value={newUserId} onValueChange={setNewUserId}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="انتخاب کاربر…" /></SelectTrigger>
              <SelectContent>
                {candidates.map((u) => (
                  <SelectItem key={u._id} value={u._id}>{u.name ?? u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!newUserId}
              onClick={() => {
                void setPerms({
                  userId: newUserId as Id<"users">,
                  perms: ["content.edit", "media.edit", "links.edit", "preview"],
                });
                setNewUserId("");
                toast.success("دسترسی محدود ایجاد شد");
              }}
            >
              <Plus className="ml-1 size-3.5" />
              افزودن (دسترسی محدود)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main studio ───────────────────────────────────────────────────────────
export default function SiteStudio() {
  const perms = useQuery(api.siteStudio.myPerms);
  const pages = useQuery(api.siteStudio.listPages, perms ? {} : "skip");
  const [pageKey, setPageKey] = useState<string | null>(null);
  const activePage = pages?.find((p) => p.key === pageKey) ?? pages?.[0] ?? null;
  const pageId = activePage?._id ?? null;
  const detail = useQuery(
    api.siteStudio.getPage,
    perms && pageKey ? { key: pageKey } : "skip",
  );

  const addElement = useMutation(api.siteStudio.addElement);
  const updateElement = useMutation(api.siteStudio.updateElement);
  const removeElementM = useMutation(api.siteStudio.removeElement);
  const reorder = useMutation(api.siteStudio.reorderElement);
  const saveTheme = useMutation(api.siteStudio.saveTheme);
  const publish = useMutation(api.siteStudio.publishPage);
  const discard = useMutation(api.siteStudio.discardDraft);
  const bootstrap = useMutation(api.siteStudio.bootstrapPages);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [busy, setBusy] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showPerms, setShowPerms] = useState(false);
  const [rightTab, setRightTab] = useState<"inspector" | "theme">("inspector");
  const [autosaveOn, setAutosaveOn] = useState(true);
  const pendingRef = useRef<Map<string, { props?: Record<string, unknown>; style?: ElementStyle }>>(new Map());
  const [savingNow, setSavingNow] = useState(false);

  useEffect(() => {
    if (!pageKey && pages?.length) setPageKey(pages[0].key);
  }, [pages, pageKey]);

  useEffect(() => {
    if (perms && !pages && perms.isFull) {
      void bootstrap().then((r) => {
        if (r === "seeded") toast.success("صفحات پیش‌فرض ساخته شد");
      });
    }
  }, [perms, pages, bootstrap]);

  const elements: ElementDoc[] = useMemo(
    () => (detail?.elements ?? []) as unknown as ElementDoc[],
    [detail],
  );
  const selected = elements.find((e) => e._id === selectedId) ?? null;

  const themeDraft: SiteTheme = useMemo(() => {
    const raw = detail?.theme?.draft as SiteTheme | undefined;
    return raw ?? { ...DEFAULT_THEME };
  }, [detail]);

  const hasDraft = useMemo(
    () =>
      elements.some((e) => e.hasDraftChanges) || detail?.theme?.hasDraftChanges === true,
    [elements, detail],
  );

  // Debounced autosave of prop/style edits (draft only).
  const scheduleAutosave = useCallback(
    (id: string, patch: { props?: Record<string, unknown>; style?: ElementStyle }) => {
      pendingRef.current.set(id, { ...pendingRef.current.get(id), ...patch });
      if (!autosaveOn) return;
      window.setTimeout(() => {
        const batch = new Map(pendingRef.current);
        pendingRef.current.clear();
        if (batch.size === 0) return;
        setSavingNow(true);
        Promise.all(
          [...batch.entries()].map(([eid, p]) =>
            updateElement({
              id: eid as Id<"studioElements">,
              ...(p.props ? { props: p.props } : {}),
              ...(p.style ? { style: p.style } : {}),
            }),
          ),
        )
          .catch((e) => toast.error(e instanceof Error ? e.message : "ذخیرهٔ خودکار ناموفق بود"))
          .finally(() => setSavingNow(false));
      }, 700);
    },
    [autosaveOn, updateElement],
  );

  const patchProps = (id: string, key: string, value: unknown) => {
    const el = elements.find((e) => e._id === id);
    if (!el) return;
    const props = { ...(el.props ?? {}), [key]: value };
    scheduleAutosave(id, { props });
  };
  const patchStyle = (id: string, key: string, value: unknown) => {
    const el = elements.find((e) => e._id === id);
    if (!el) return;
    const style = { ...(el.style ?? {}), [key]: value };
    scheduleAutosave(id, { style });
  };

  const doPublish = async () => {
    if (!pageId) return;
    if (pendingRef.current.size > 0) {
      // flush pending autosave first
      const batch = new Map(pendingRef.current);
      pendingRef.current.clear();
      await Promise.all(
        [...batch.entries()].map(([eid, p]) =>
          updateElement({
            id: eid as Id<"studioElements">,
            ...(p.props ? { props: p.props } : {}),
            ...(p.style ? { style: p.style } : {}),
          }),
        ),
      );
    }
    setBusy("publish");
    try {
      const ver = await publish({ pageId });
      toast.success(`انتشار شد — نسخهٔ ${ver} در تاریخچه ذخیره شد`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "انتشار ناموفق بود");
    } finally {
      setBusy(null);
    }
  };

  const doDiscard = async () => {
    if (!pageId) return;
    setBusy("discard");
    try {
      await discard({ pageId });
      toast.success("پیش‌نویس به آخرین نسخهٔ منتشرشده برگشت");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "بازگردانی ناموفق بود");
    } finally {
      setBusy(null);
    }
  };

  if (perms === undefined) return <Loading />;
  if (!perms) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <ShieldCheck className="size-10 text-muted-foreground" />
        <p className="text-lg font-bold">دسترسی به استودیو ندارید</p>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          Site Studio بر پایهٔ Permission است. اگر دسترسی لازم را دارید با ادمین سامانه هماهنگ کنید.
        </p>
      </div>
    );
  }
  if (pages === undefined) return <Loading />;

  const deviceWidth = device === "desktop" ? 1200 : device === "tablet" ? 834 : 420;

  return (
    <div className="flex h-screen flex-col bg-background" dir="rtl">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-card/60 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
            <Blocks className="size-4 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-4">طراحی سایت — Site Studio</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {activePage ? `${activePage.title} · ${activePage.route}` : "صفحه‌ای انتخاب نشده"}
            </p>
          </div>
          {savingNow && (
            <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
              <Loader2 className="size-3 animate-spin" /> ذخیرهٔ خودکار…
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Device switcher */}
          <div className="hidden items-center rounded-lg border border-border bg-background p-0.5 md:flex">
            {([
              ["desktop", Monitor],
              ["tablet", Tablet],
              ["mobile", Smartphone],
            ] as const).map(([d, Icon]) => (
              <button
                key={d}
                type="button"
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  device === d ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent",
                )}
                onClick={() => setDevice(d)}
                title={d}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
          {has(perms, PERM_KEY.preview) && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs"
              onClick={() => {
                if (!activePage) return;
                const previewRoute =
                  activePage.route === "/" ? "/studio-preview" : `/studio-preview${activePage.route}`;
                window.open(previewRoute, "_blank");
              }}
            >
              <Eye className="ml-1.5 size-3.5" />
              پیش‌نمایش
            </Button>
          )}
          {has(perms, "components.manage") && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs"
              disabled={!pageId || busy !== null || !hasDraft}
              onClick={doDiscard}
            >
              {busy === "discard" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Undo2 className="size-3.5" />
              )}
              بازگردانی
            </Button>
          )}
          {has(perms, PERM_KEY.publish) && (
            <Button
              size="sm"
              className="h-8 rounded-lg text-xs"
              disabled={!pageId || busy !== null || !hasDraft}
              onClick={doPublish}
            >
              {busy === "publish" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              انتشار تغییرات
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => setShowVersions(true)}
            title="تاریخچه نسخه‌ها"
          >
            <History className="size-4" />
          </Button>
          {perms.isFull && (
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg"
              onClick={() => setShowPerms(true)}
              title="مدیریت دسترسی‌ها"
            >
              <UserCog className="size-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Left: pages + blocks palette ────────────────────────────── */}
        <aside className="hidden w-60 shrink-0 flex-col border-l border-border/70 bg-card/40 lg:flex">
          <ScrollArea className="flex-1">
            <div className="space-y-4 p-3">
              <div>
                <p className="mb-2 px-1 text-[11px] font-bold text-muted-foreground">صفحات سایت</p>
                <div className="space-y-1">
                  {pages.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => {
                        setPageKey(p.key);
                        setSelectedId(null);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                        activePage?.key === p.key
                          ? "bg-primary/15 font-medium text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FileText className="size-3.5 shrink-0" />
                        {p.title}
                      </span>
                      {p.published ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[9px] text-emerald-400">عمومی</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[9px] text-amber-400">پیش‌نویس</Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {has(perms, "components.manage") && (
                <div>
                  <p className="mb-2 px-1 text-[11px] font-bold text-muted-foreground">افزودن بلوک</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {BLOCKS.map((b) => (
                      <button
                        key={b.type}
                        type="button"
                        disabled={!pageId || busy !== null}
                        className="flex flex-col items-center gap-1 rounded-lg border border-border/60 bg-background/60 p-2 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                        onClick={async () => {
                          if (!pageId) return;
                          setBusy("add");
                          try {
                            const id = await addElement({
                              pageId,
                              type: b.type,
                              label: b.label,
                              props: { ...b.defaultProps },
                            });
                            setSelectedId(id);
                            toast.success(`بلوک «${b.label}» اضافه شد`);
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "افزودن ناموفق بود");
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        <b.icon className="size-4 text-primary" />
                        <span className="leading-3">{b.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="flex-1 text-[11px]" onClick={() => setShowMedia(true)}>
                  <ImageIcon className="ml-1 size-3.5" /> رسانه‌ها
                </Button>
              </div>

              <Switch
                checked={autosaveOn}
                onCheckedChange={setAutosaveOn}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => setAutosaveOn((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-border/60 px-2.5 py-2 text-xs"
              >
                <span className="text-muted-foreground">ذخیرهٔ خودکار</span>
                <span className={cn("font-mono", autosaveOn ? "text-emerald-400" : "text-amber-400")}>
                  {autosaveOn ? "ON" : "OFF"}
                </span>
              </button>
            </div>
          </ScrollArea>
        </aside>

        {/* ── Center: canvas ──────────────────────────────────────────── */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-muted/30 p-4">
          {detail === undefined && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="ml-2 size-4 animate-spin" /> در حال بارگذاری صفحه…
            </div>
          )}
          {detail === null && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Layers className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">این صفحه هنوز محتوایی ندارد.</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                از پنل کنار، بلوک اضافه کنید (هیرو، تیتر، متن، تصویر، …) و نتیجه را همین‌جا ببینید.
              </p>
            </div>
          )}
          {detail && (
            <div
              className="mx-auto overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm transition-[max-width] duration-300"
              style={{ maxWidth: deviceWidth, ...themeToWrapperCss(themeDraft) }}
            >
              {/* Studio elements stack */}
              {elements.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 p-16 text-center">
                  <Blocks className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">صفحه خالی است — از پنل راست بلوک اضافه کنید.</p>
                </div>
              )}
              {elements.map((el, idx) => {
                const def = blockDef(el.type);
                return (
                  <div
                    key={el._id}
                    className={cn(
                      "group relative cursor-pointer p-3 transition-shadow",
                      selectedId === el._id
                        ? "rounded-2xl outline outline-2 outline-primary"
                        : "hover:outline hover:outline-1 hover:outline-primary/40",
                      !el.visible && "opacity-40",
                    )}
                    style={{ paddingTop: 6, paddingBottom: 6 }}
                    onClick={() => {
                      setSelectedId(el._id);
                      setRightTab("inspector");
                    }}
                  >
                    {/* Element overlay label */}
                    <span
                      className={cn(
                        "absolute -top-2 right-3 z-10 hidden items-center gap-1 rounded-full border border-primary/40 bg-background px-2 py-0.5 text-[10px] font-medium text-primary group-hover:flex",
                        selectedId === el._id && "flex",
                      )}
                    >
                      <def?.icon && <def.icon className="size-3" />}
                      {def?.label ?? el.type}
                      {!el.visible && <X className="size-3 text-amber-500" />}
                      {el.hasDraftChanges && <span className="size-1.5 rounded-full bg-amber-400" />}
                    </span>
                    {/* Quick layout controls */}
                    {selectedId === el._id && has(perms, "layout.edit") && (
                      <div className="absolute left-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          className="rounded-md border border-border bg-background p-1 shadow-sm hover:text-primary"
                          title="انتقال به بالا"
                          onClick={(e) => {
                            e.stopPropagation();
                            void reorder({ id: el._id, direction: "up" }).catch((err) =>
                              toast.error(err instanceof Error ? err.message : "جابه‌جایی ناموفق بود"),
                            );
                          }}
                        >
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-border bg-background p-1 shadow-sm hover:text-primary"
                          title="انتقال به پایین"
                          onClick={(e) => {
                            e.stopPropagation();
                            void reorder({ id: el._id, direction: "down" }).catch((err) =>
                              toast.error(err instanceof Error ? err.message : "جابه‌جایی ناموفق بود"),
                            );
                          }}
                        >
                          <ArrowDown className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-border bg-background p-1 shadow-sm hover:text-amber-500"
                          title={el.visible ? "پنهان کردن" : "نمایش"}
                          onClick={(e) => {
                            e.stopPropagation();
                            void updateElement({ id: el._id, visible: !el.visible }).catch((err) =>
                              toast.error(err instanceof Error ? err.message : "تغییر وضعیت ناموفق بود"),
                            );
                          }}
                        >
                          {el.visible ? <Eye className="size-3.5" /> : <X className="size-3.5" />}
                        </button>
                        {has(perms, "components.manage") && (
                          <button
                            type="button"
                            className="rounded-md border border-border bg-background p-1 shadow-sm hover:text-red-500"
                            title="حذف بلوک"
                            onClick={(e) => {
                              e.stopPropagation();
                              void removeElementM({ id: el._id }).catch((err) =>
                                toast.error(err instanceof Error ? err.message : "حذف ناموفق بود"),
                              );
                              setSelectedId(null);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                    {/* Draft preview of this element */}
                    <div style={{ paddingInline: 4 }}>
                      <BlockRenderer
                        el={{
                          id: el._id,
                          type: el.type,
                          label: el.label,
                          props: el.props ?? {},
                          style: el.style ?? {},
                        }}
                        theme={themeDraft}
                      />
                    </div>
                    {idx < elements.length - 1 && (
                      <div
                        className="pointer-events-none absolute inset-x-6 -bottom-0.5 border-b border-dashed border-border/40"
                        style={{ height: 0 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ── Right: inspector ────────────────────────────────────────── */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-border/70 bg-card/40 md:flex">
          <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as "inspector" | "theme")} className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-border/70 p-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="inspector" className="text-xs">تنظیمات بلوک</TabsTrigger>
                <TabsTrigger value="theme" className="text-xs">تم صفحه</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="inspector" className="mt-0 min-h-0 flex-1">
              <ScrollArea className="h-full">
                <div className="space-y-3.5 p-3">
                  {!selected && (
                    <div className="space-y-3 py-8 text-center">
                      <Settings2 className="mx-auto size-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">یک بلوک را روی بوم انتخاب کنید</p>
                    </div>
                  )}
                  {selected && (
                    <>
                      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-2.5 py-2">
                        {(() => {
                          const d = blockDef(selected.type);
                          return d ? <d.icon className="size-4 text-primary" /> : null;
                        })()}
                        <span className="text-sm font-bold">{selected.label ?? selected.type}</span>
                        <span className="mr-auto font-mono text-[10px] text-muted-foreground">{selected.type}</span>
                      </div>
                      {blockDef(selected.type)?.fields.map((f) => {
                        const allowed =
                          f.perm === "content"
                            ? has(perms, "content.edit")
                            : f.perm === "media"
                              ? has(perms, "media.edit")
                              : f.perm === "links"
                                ? has(perms, "links.edit")
                                : has(perms, "style.edit");
                        return (
                          <div key={f.key} className="space-y-1.5">
                            <Label className="text-xs">{f.label}</Label>
                            <PermGate ok={allowed} permLabel={PERM_LABEL[PERM_KEY[f.perm]]}>
                              <div className={cn(!allowed && "pointer-events-none")}>
                                <FieldControl
                                  field={f}
                                  value={(selected.props ?? {})[f.key]}
                                  onChange={(v) => patchProps(selected._id, f.key, v)}
                                />
                              </div>
                            </PermGate>
                          </div>
                        );
                      })}

                      <div className="border-t border-border/70 pt-3">
                        <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                          <Palette className="size-3.5" />
                          استایل بلوک
                        </p>
                        {COMMON_STYLE_FIELDS.map((f) => {
                          const allowed = has(perms, "style.edit");
                          return (
                            <div key={f.key} className="mb-3 space-y-1.5">
                              <Label className="text-xs">{f.label}</Label>
                              <PermGate ok={allowed} permLabel={PERM_LABEL["style.edit"]}>
                                <div className={cn(!allowed && "pointer-events-none")}>
                                  <FieldControl
                                    field={f}
                                    value={(selected.style ?? {})[f.key as keyof ElementStyle]}
                                    onChange={(v) => patchStyle(selected._id, f.key, v)}
                                  />
                                </div>
                              </PermGate>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="theme" className="mt-0 min-h-0 flex-1">
              <ScrollArea className="h-full">
                <div className="p-3">
                  <ThemePanel
                    pageId={pageId!}
                    theme={themeDraft}
                    canTheme={has(perms, "theme.manage")}
                    onSave={(t) => {
                      if (!pageId) return;
                      void saveTheme({ pageId, draft: t }).catch((e) =>
                        toast.error(e instanceof Error ? e.message : "ذخیرهٔ تم ناموفق بود"),
                      );
                    }}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      <VersionHistory open={showVersions} onOpenChange={setShowVersions} pageId={pageId!} />
      <MediaManager open={showMedia} onOpenChange={setShowMedia} />
      {perms.isFull && <PermsManager open={showPerms} onOpenChange={setShowPerms} />}
    </div>
  );
}

// Public preview of published content (opens in new tab from the toolbar).
export function StudioPreviewPage() {
  const published = useQuery(api.siteStudio.listPublishedPages);
  return (
    <div className="min-h-screen bg-background">
      <RequireAuth>
        <StudioPreviewInner data={published} />
      </RequireAuth>
    </div>
  );
}

function StudioPreviewInner({
  data,
}: {
  data:
    | {
        key: string;
        title: string;
        route: string;
        theme: SiteTheme | null;
        elements: StudioElement[];
      }[]
    | undefined;
}) {
  const elements = data?.[0]?.elements ?? [];
  const theme = data?.[0]?.theme ?? null;
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4" style={themeToWrapperCss(theme)}>
      {elements.length === 0 && (
        <p className="py-24 text-center text-sm text-muted-foreground">
          هنوز چیزی منتشر نشده است.
        </p>
      )}
      {elements.map((el) => (
        <BlockRenderer key={el.id} el={el} theme={theme} />
      ))}
    </div>
  );
}
