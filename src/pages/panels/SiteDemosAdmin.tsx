import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Blocks,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Plus,
  ExternalLink,
  Archive,
  RotateCcw,
  Loader2,
  Search,
  Calendar,
  User,
} from "lucide-react";

type Demo = {
  _id: Id<"siteDemos">;
  _creationTime: number;
  name: string;
  slug: string;
  description?: string;
  status: "active" | "archived";
  theme?: unknown;
  previewImage?: string;
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
  creatorName: string;
};

const DEFAULT_THEME = {
  primary: "#14b8a6",
  secondary: "#0ea5e9",
  accent: "#a855f7",
  background: "#0b1120",
  surface: "#111827",
  text: "#f9fafb",
  textMuted: "#9ca3af",
  borderRadius: "0.75rem",
  fontFamily: "Vazirmatn, system-ui, sans-serif",
  buttonStyle: "rounded-full",
  cardStyle: "border-border/70",
};

export function SiteDemosAdmin() {
  const demos = useQuery(api.siteDemos.list);
  const createDemo = useMutation(api.siteDemos.create);
  const updateDemo = useMutation(api.siteDemos.update);
  const deleteDemo = useMutation(api.siteDemos.remove);
  const cloneDemo = useMutation(api.siteDemos.clone);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Demo | null>(null);
  const [showClone, setShowClone] = useState<Demo | null>(null);
  const [showDelete, setShowDelete] = useState<Demo | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "archived">("active");

  // Clone form
  const [cloneName, setCloneName] = useState("");
  const [cloneSlug, setCloneSlug] = useState("");

  const filtered = useMemo(() => {
    if (!demos) return [];
    if (!search.trim()) return demos;
    const q = search.toLowerCase();
    return demos.filter(
      (d: Demo) =>
        d.name.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q)
    );
  }, [demos, search]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("نام دمو الزامی است");
      return;
    }
    const slug = newSlug.trim() || newName.trim().toLowerCase().replace(/\s+/g, "_");
    setLoading(true);
    try {
      await createDemo({
        name: newName.trim(),
        slug,
        description: newDesc.trim() || undefined,
      });
      toast.success("دمو با موفقیت ایجاد شد");
      setShowCreate(false);
      setNewName("");
      setNewSlug("");
      setNewDesc("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ایجاد دمو");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    setLoading(true);
    try {
      await updateDemo({
        id: showEdit._id,
        name: editName.trim() || undefined,
        slug: editSlug.trim() || undefined,
        description: editDesc.trim() || undefined,
        status: editStatus,
      });
      toast.success("دمو ویرایش شد");
      setShowEdit(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ویرایش");
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async () => {
    if (!showClone || !cloneName.trim()) {
      toast.error("نام دمو کپی الزامی است");
      return;
    }
    const slug = cloneSlug.trim() || cloneName.trim().toLowerCase().replace(/\s+/g, "_");
    setLoading(true);
    try {
      await cloneDemo({
        sourceId: showClone._id,
        newName: cloneName.trim(),
        newSlug: slug,
      });
      toast.success("دمو کپی شد");
      setShowClone(null);
      setCloneName("");
      setCloneSlug("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در کپی‌گیری");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    setLoading(true);
    try {
      await deleteDemo({ id: showDelete._id });
      toast.success("دمو حذف شد");
      setShowDelete(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در حذف");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (demo: Demo) => {
    setEditName(demo.name);
    setEditSlug(demo.slug);
    setEditDesc(demo.description ?? "");
    setEditStatus(demo.status);
    setShowEdit(demo);
  };

  const openClone = (demo: Demo) => {
    const nextNum =
      (demos?.length ?? 0) + 1;
    setCloneName(`${demo.name} — کپی`);
    setCloneSlug(`demo_${nextNum}`);
    setShowClone(demo);
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            <Blocks className="size-5 text-primary" />
            دمو سایت
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            طراحی، ذخیره و مقایسه پوسته‌های مختلف سایت بدون تغییر در سایت اصلی
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="size-4" />
          دمو جدید
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="جستجو در دموها..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Gallery */}
      {!demos ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Blocks className="mb-4 size-12 text-muted-foreground/30" />
            <p className="text-sm font-bold text-muted-foreground">
              {search ? "دمویی یافت نشد" : "هنوز دمویی ساخته نشده"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {!search && "برای شروع، اولین دموی خود را بسازید"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((demo: Demo) => (
            <Card
              key={demo._id}
              className={cn(
                "group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5",
                demo.status === "archived" && "opacity-60"
              )}
            >
              {/* Preview banner */}
              <div
                className="h-32 w-full"
                style={{
                  background: `linear-gradient(135deg, ${
                    (demo.theme as Record<string, string>)?.primary ?? "#14b8a6"
                  }20, ${(demo.theme as Record<string, string>)?.secondary ?? "#0ea5e9"}20)`,
                }}
              >
                <div className="flex h-full items-center justify-center">
                  <Blocks className="size-10 text-primary/20" />
                </div>
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-bold leading-tight">
                    {demo.name}
                  </CardTitle>
                  <Badge
                    variant={demo.status === "active" ? "default" : "secondary"}
                    className="shrink-0 text-[10px]"
                  >
                    {demo.status === "active" ? "فعال" : "آرشیو"}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {demo.description || "بدون توضیح"}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="size-3" />
                    {demo.creatorName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {formatDate(demo.updatedAt)}
                  </span>
                </div>

                {/* Slug */}
                <div className="rounded-md bg-muted/50 px-2 py-1 font-mono text-[10px] text-muted-foreground" dir="ltr">
                  /{demo.slug}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 gap-1 text-[11px]"
                    asChild
                  >
                    <a href={`/${demo.slug}`} target="_blank" rel="noindex nofollow">
                      <Eye className="size-3" />
                      مشاهده
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => openEdit(demo)}
                  >
                    <Pencil className="size-3" />
                    ویرایش
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => openClone(demo)}
                  >
                    <Copy className="size-3" />
                    کپی
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-[11px] text-destructive hover:text-destructive"
                    onClick={() => setShowDelete(demo)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={!!showCreate} onOpenChange={(v) => !v && setShowCreate(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ساخت دمو جدید</DialogTitle>
            <DialogDescription>
              یک دموی جدید برای طراحی ظاهر سایت ایجاد کنید
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1 block text-xs font-bold">نام دمو *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثلاً: Demo 01 — Clean Academy"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-bold">
                شناسه (Slug)
              </Label>
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="مثلاً: demo_1 (خودکار ساخته می‌شود)"
                dir="ltr"
                className="text-left"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                اگر خالی بگذارید، از نام ساخته می‌شود. آدرس: /{newSlug || "new_name"}
              </p>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-bold">توضیح کوتاه</Label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="توضیحی کوتاه درباره این نسخه طراحی..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              انصراف
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="ml-1.5 size-4 animate-spin" />}
              ایجاد دمو
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!showEdit} onOpenChange={(v) => !v && setShowEdit(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ویرایش دمو</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1 block text-xs font-bold">نام</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-bold">شناسه (Slug)</Label>
              <Input
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-bold">توضیح</Label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-bold">وضعیت</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={editStatus === "active" ? "default" : "outline"}
                  onClick={() => setEditStatus("active")}
                  className="gap-1"
                >
                  <RotateCcw className="size-3" />
                  فعال
                </Button>
                <Button
                  size="sm"
                  variant={editStatus === "archived" ? "default" : "outline"}
                  onClick={() => setEditStatus("archived")}
                  className="gap-1"
                >
                  <Archive className="size-3" />
                  آرشیو
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>
              انصراف
            </Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading && <Loader2 className="ml-1.5 size-4 animate-spin" />}
              ذخیره تغییرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={!!showClone} onOpenChange={(v) => !v && setShowClone(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>کپی دمو</DialogTitle>
            <DialogDescription>
              یک کپی از «{showClone?.name}» بسازید
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1 block text-xs font-bold">نام دمو جدید *</Label>
              <Input value={cloneName} onChange={(e) => setCloneName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-bold">شناسه (Slug)</Label>
              <Input
                value={cloneSlug}
                onChange={(e) => setCloneSlug(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClone(null)}>
              انصراف
            </Button>
            <Button onClick={handleClone} disabled={loading}>
              {loading && <Loader2 className="ml-1.5 size-4 animate-spin" />}
              کپی‌گیری
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!showDelete} onOpenChange={(v) => !v && setShowDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>حذف دمو</DialogTitle>
            <DialogDescription>
              آیا مطمئنید که می‌خواهید «{showDelete?.name}» را حذف کنید؟
              <br />
              <span className="text-destructive">
                این عمل غیرقابل بازگشت است و هیچ داده واقعی سایت را تغییر نمی‌دهد.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading && <Loader2 className="ml-1.5 size-4 animate-spin" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
