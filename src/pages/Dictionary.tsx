import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PublicLayout } from "@/components/site/PublicLayout";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { faNum } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { BookOpen, Loader2, Microscope, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMode } from "@/hooks/useMode";
import { useApiQuery } from "@/hooks/useApiQuery";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-3">
      <p className="text-xs font-bold text-primary">{label}</p>
      <p className="mt-1 text-sm leading-6">{value}</p>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-3">
      <p className="text-xs font-bold text-primary">{label}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-6">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

type TermRow = NonNullable<ReturnType<typeof useQuery<typeof api.content.searchDictionary>>>[number];

// Editors: instructors, content managers, site admins and system admins.
const EDITOR_ROLES = ["instructor", "content_manager", "site_admin", "admin"];

function toLines(s: string) {
  return s
    .split(/\n|،|,/)
    .map((x) => x.trim())
    .filter(Boolean);
}

type TermForm = {
  term: string;
  fullName: string;
  gramStatus: string;
  shape: string;
  oxygen: string;
  habitat: string;
  diseases: string;
  virulence: string;
  diagnosis: string;
  characteristics: string;
  examNotes: string;
  sources: string;
};

const EMPTY_FORM: TermForm = {
  term: "",
  fullName: "",
  gramStatus: "",
  shape: "",
  oxygen: "",
  habitat: "",
  diseases: "",
  virulence: "",
  diagnosis: "",
  characteristics: "",
  examNotes: "",
  sources: "",
};

const LIST_LABELS: { key: keyof TermForm; label: string; placeholder: string }[] = [
  { key: "diseases", label: "بیماری‌ها", placeholder: "هر مورد در یک خط — یا با ویرگول جدا کنید" },
  { key: "virulence", label: "عوامل ویرولانس", placeholder: "هر مورد در یک خط" },
  { key: "characteristics", label: "ویژگی‌های مهم", placeholder: "هر مورد در یک خط" },
  { key: "examNotes", label: "نکات امتحانی", placeholder: "هر مورد در یک خط" },
  { key: "sources", label: "منابع", placeholder: "هر مورد در یک خط" },
];

function TermDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: TermRow | null;
}) {
  const create = useMutation(api.content.createDictionaryTerm);
  const update = useMutation(api.content.updateDictionaryTerm);
  const [form, setForm] = useState<TermForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setForm(
      editing
        ? {
            term: editing.term,
            fullName: editing.fullName,
            gramStatus: editing.gramStatus,
            shape: editing.shape,
            oxygen: editing.oxygen,
            habitat: editing.habitat,
            diseases: editing.diseases.join("\n"),
            virulence: editing.virulence.join("\n"),
            diagnosis: editing.diagnosis,
            characteristics: editing.characteristics.join("\n"),
            examNotes: editing.examNotes.join("\n"),
            sources: editing.sources.join("\n"),
          }
        : EMPTY_FORM,
    );
  }, [open, editing]);

  const set = (key: keyof TermForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    setErr(null);
    if (!form.term.trim()) {
      setErr("نام اصطلاح (لاتین یا فارسی) لازم است.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        term: form.term,
        fullName: form.fullName,
        gramStatus: form.gramStatus,
        shape: form.shape,
        oxygen: form.oxygen,
        habitat: form.habitat,
        diseases: toLines(form.diseases),
        virulence: toLines(form.virulence),
        diagnosis: form.diagnosis,
        characteristics: toLines(form.characteristics),
        examNotes: toLines(form.examNotes),
        sources: toLines(form.sources),
      };
      if (editing) {
        await update({ id: editing._id, ...payload });
        toast.success("اصطلاح ویرایش شد.");
      } else {
        await create(payload);
        toast.success("اصطلاح به دیکشنری اضافه شد.");
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا در ذخیره");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "ویرایش اصطلاح" : "افزودن اصطلاح جدید"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">نام اصطلاح (لاتین یا فارسی) *</label>
              <Input value={form.term} onChange={(e) => set("term", e.target.value)} placeholder="مثلاً: Vibrio cholerae" dir="ltr" className="text-left" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">نام کامل فارسی</label>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="مثلاً: ویبریو کلرا" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">گرم (Gram)</label>
              <Input value={form.gramStatus} onChange={(e) => set("gramStatus", e.target.value)} placeholder="مثلاً: گرم منفی" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">شکل</label>
              <Input value={form.shape} onChange={(e) => set("shape", e.target.value)} placeholder="مثلاً: باسیل خمیده" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">نیاز به اکسیژن</label>
              <Input value={form.oxygen} onChange={(e) => set("oxygen", e.target.value)} placeholder="مثلاً: بی‌هوازی اختیاری" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">محل زندگی (Habitat)</label>
              <Input value={form.habitat} onChange={(e) => set("habitat", e.target.value)} placeholder="مثلاً: آب و خاک" />
            </div>
          </div>
          {LIST_LABELS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">{f.label}</label>
              <Textarea rows={2} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">روش تشخیص</label>
            <Textarea rows={2} value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} placeholder="روش‌های تشخیصی را بنویسید…" />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>انصراف</Button>
            <Button onClick={handleSubmit} disabled={busy}>
              {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Plus className="ml-1.5 size-4" />}
              {editing ? "ذخیرهٔ تغییرات" : "افزودن اصطلاح"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Dictionary() {
  const { isIran } = useMode();
  const { user } = useAuth();
  const canEdit = !!user && EDITOR_ROLES.includes(user.role ?? "");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TermRow | null>(null);
  const [deleting, setDeleting] = useState<TermRow | null>(null);
  const termsConvex = useQuery(api.content.searchDictionary, { query: query || undefined });
  const dictUrl = query ? `/api/content/dictionary?q=${encodeURIComponent(query)}` : "/api/content/dictionary";
  const { data: termsIran } = useApiQuery<any[]>(dictUrl);
  const terms = isIran ? termsIran : termsConvex;
  const removeTerm = useMutation(api.content.deleteDictionaryTerm);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (terms && terms.length > 0 && !selected) {
      setSelected(terms[0]._id);
    }
    if (terms && terms.length > 0 && selected && !terms.some((t) => t._id === selected)) {
      setSelected(terms[0]._id);
    }
  }, [terms, selected]);

  const active = terms?.find((t) => t._id === selected);

  const handleDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await removeTerm({ id: deleting._id });
      toast.success("اصطلاح حذف شد.");
      if (selected === deleting._id) setSelected(null);
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در حذف");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">دیکشنری تخصصی</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
              باکتری‌ها و اصطلاحات علوم زیستی
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[15px]">
              نام یک باکتری یا اصطلاح را جستجو کن؛ گرم، شکل، نیاز اکسیژن، بیماری‌ها،
              عوامل ویرولانس، تشخیص، نکات امتحانی و منابع را یک‌جا ببین.
            </p>
          </div>
          {canEdit && (
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="rounded-full"
            >
              <Plus className="ml-2 size-4" />
              افزودن اصطلاح
            </Button>
          )}
        </div>

        <div className="relative mt-8 max-w-xl">
          <Search className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="جستجو: E. coli، استافیلوکوک، PCR، پلاسمید..."
            className="h-12 pr-10 text-sm"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Results */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {terms ? `${faNum(terms.length)} نتیجه` : "..."}
            </p>
            {(terms ?? []).map((t) => (
              <button
                key={t._id}
                type="button"
                onClick={() => setSelected(t._id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-right transition-all",
                  active?._id === t._id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border/70 bg-card/60 hover:border-primary/30",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Microscope className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold">{t.term}</span>
                  <span className="block text-xs text-muted-foreground">{t.fullName}</span>
                </span>
              </button>
            ))}
            {terms && terms.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
                نتیجه‌ای پیدا نشد. املای لاتین یا فارسی را امتحان کن.
              </div>
            )}
          </div>

          {/* Detail */}
          <div>
            {active ? (
              <div className="rounded-3xl border border-border/70 bg-card/60 p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-extrabold" dir="ltr">{active.term}</h2>
                  <Badge variant="secondary" className="rounded-full">{active.gramStatus}</Badge>
                  <Badge variant="outline" className="rounded-full">{active.shape}</Badge>
                  {canEdit && (
                    <div className="mr-auto flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-primary"
                        onClick={() => {
                          setEditing(active);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                        ویرایش
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleting(active)}
                      >
                        <Trash2 className="size-3.5" />
                        حذف
                      </Button>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-muted-foreground">{active.fullName}</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Field label="گرم (Gram)" value={active.gramStatus} />
                  <Field label="شکل" value={active.shape} />
                  <Field label="نیاز به اکسیژن" value={active.oxygen} />
                  <Field label="محل زندگی (Habitat)" value={active.habitat} />
                </div>

                <div className="mt-4 space-y-3">
                  <ListField label="بیماری‌ها" items={active.diseases} />
                  <ListField label="عوامل ویرولانس" items={active.virulence} />
                  <Field label="روش تشخیص" value={active.diagnosis} />
                  <ListField label="ویژگی‌های مهم" items={active.characteristics} />
                  <ListField label="نکات امتحانی" items={active.examNotes} />
                  <ListField label="منابع" items={active.sources} />
                </div>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/30 text-center">
                <BookOpen className="size-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  یک اصطلاح را انتخاب کن تا جزئیاتش نمایش داده شود.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <TermDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف اصطلاح</AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئن هستید «{deleting?.term}» از دیکشنری حذف شود؟ این کار قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={removing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removing ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PublicLayout>
  );
}
