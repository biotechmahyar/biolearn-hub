import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { uploadBlob } from "@/lib/upload";
import { CheckCircle2, Hourglass, Loader2, Save, Upload, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

// Every member (student, instructor, mentor, support, content manager, admin)
// gets the same profile editor. Regular members' edits are staged and need an
// admin's approval; system & site admins publish their own changes instantly.
export function MemberProfileEditor() {
  const { user } = useAuth();
  const me = useQuery(api.profiles.getMyProfile);
  const uploadUrl = useMutation(api.profiles.getProfileUploadUrl);
  const update = useMutation(api.profiles.updateMyProfile);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [about, setAbout] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [avatarStorageId, setAvatarStorageId] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isAdminUser = user?.role === "admin" || user?.role === "site_admin";

  useEffect(() => {
    if (me) {
      setFirstName(me.firstName ?? "");
      setLastName(me.lastName ?? "");
      setAbout(me.about ?? "");
      setPhone(me.phone ?? "");
      setAddress(me.address ?? "");
      setPostalCode(me.postalCode ?? "");
    }
  }, [me]);

  const pickAvatar = async (file: File | undefined) => {
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    try {
      const url = await uploadUrl();
      setAvatarStorageId(await uploadBlob(url, file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "آپلود عکس ناموفق بود");
    }
  };

  const handleSave = async () => {
    setErr(null);
    setMessage(null);
    if (!firstName.trim() && !lastName.trim()) {
      setErr("نام یا نام خانوادگی را وارد کنید.");
      return;
    }
    setBusy(true);
    try {
      const res = await update({
        firstName,
        lastName,
        avatarStorageId: avatarStorageId ?? undefined,
        about,
        phone,
        address,
        postalCode,
      });
      setMessage(
        res.applied
          ? "پروفایل شما اعمال و عمومی شد."
          : "برای تأیید به مدیر سایت ارسال شد — بعد از تأیید، عمومی می‌شود.",
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا در ذخیره");
    } finally {
      setBusy(false);
    }
  };

  const pending = me?.pendingProfile ?? null;

  return (
    <div className="space-y-4">
      {isAdminUser ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          شما ادمین هستید — تغییرات پروفایل‌تان بدون تأیید، همان لحظه اعمال و عمومی می‌شود.
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          <Hourglass className="size-4 shrink-0 text-primary" />
          تغییرات پروفایل شما ابتدا باید توسط مدیر سایت تأیید شود و بعد عمومی می‌شود.
        </div>
      )}

      {pending && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          <Hourglass className="size-4 shrink-0" />
          <span>
            یک ویرایش در انتظار تأیید مدیر سایت است — ارسال‌شده در{" "}
            {new Date(pending.submittedAt).toLocaleDateString("fa-IR")}.
          </span>
        </div>
      )}

      <Card className="border-border/70 shadow-sm">
        <CardContent className="space-y-4 py-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-primary/25 bg-primary/5">
                {avatarPreview || me?.avatarUrl ? (
                  <img src={avatarPreview ?? me?.avatarUrl!} alt="عکس پروفایل" className="size-full object-cover" />
                ) : (
                  <User className="size-8 text-primary" />
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1.5 -left-1.5 flex size-7 items-center justify-center rounded-full border border-primary/40 bg-background text-primary hover:bg-accent"
                title="انتخاب عکس"
              >
                <Upload className="size-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void pickAvatar(e.target.files?.[0])}
              />
            </div>
            <div className="min-w-0">
              <p className="font-bold">
                {firstName || lastName ? `${firstName} ${lastName}`.trim() : (me?.name ?? "عضو")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{me?.email ?? ""}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                عکس پروفایل در پنل و کارت‌های شما نمایش داده می‌شود.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">نام</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="نام" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">نام خانوادگی</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="نام خانوادگی" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">دربارهٔ من (سوابق علمی / نقش)</label>
            <Textarea
              rows={4}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="تحصیلات، تجربه یا نقشی که در تیم دارید را بنویسید…"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">شماره تلفن</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="۰۹۱۲۱۲۳۴۵۶۷" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">کد پستی</label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="۱۲۳۴۵۶۷۸۹۰" dir="ltr" />
            </div>
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-bold text-muted-foreground">آدرس</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="آدرس کامل پستی" />
            </div>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          {message && (
            <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              {message}
            </p>
          )}
          <Button onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Save className="ml-1.5 size-4" />}
            ذخیرهٔ پروفایل
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
