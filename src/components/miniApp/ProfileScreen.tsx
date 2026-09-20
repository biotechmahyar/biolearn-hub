/**
 * Mini App — Profile
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows the authenticated Genova user. All reads/writes go through existing
 * backend functions, so the client is never authoritative:
 *   • profiles.getMyProfile / updateMyProfile   → editable profile fields
 *   • telegramBot.getLinkingStatus              → Telegram link state
 *   • baleBot.getLinkingStatus                  → Bale link state
 *   • telegramNotifications.getNotifPrefs       → notification preferences
 *
 * Platform identity (telegramId / baleId / role) is intentionally read-only:
 * there is no client path to change it.
 */
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  BadgeCheck,
  ExternalLink,
  LinkIcon,
  LogOut,
  Pencil,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { faNum } from "@/lib/format";
import { platform } from "@/lib/miniApp/platform";
import {
  Chip,
  InfoRow,
  MiniButton,
  MiniCard,
  MiniLoading,
  SectionTitle,
} from "./ui";

const ROLE_LABELS: Record<string, string> = {
  user: "دانشجو",
  member: "عضو",
  instructor: "مدرس",
  mentor: "منتور",
  content_manager: "مدیر محتوا",
  support: "پشتیبانی",
  site_admin: "مدیر سایت",
  admin: "مدیر سامانه",
};

const EDITABLE = ["firstName", "lastName", "firstNameLatin", "lastNameLatin", "phone", "address", "postalCode", "about"] as const;
type EditableField = (typeof EDITABLE)[number];

export function ProfileScreen() {
  const profile = useQuery(api.profiles.getMyProfile, {});
  const telegram = useQuery(api.telegramBot.getLinkingStatus, {});
  const bale = useQuery(api.baleBot.getLinkingStatus, {});
  const notifPrefs = useQuery(api.telegramNotifications.getNotifPrefs, {});
  const updateProfile = useMutation(api.profiles.updateMyProfile);
  const { signOut } = useAuthActions();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Record<EditableField, string>>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const startEditing = () => {
    if (!profile) return;
    setForm({
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      firstNameLatin: profile.firstNameLatin ?? "",
      lastNameLatin: profile.lastNameLatin ?? "",
      phone: profile.phone ?? "",
      address: profile.address ?? "",
      postalCode: profile.postalCode ?? "",
      about: profile.about ?? "",
    });
    setNotice(null);
    setEditing(true);
  };

  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await updateProfile(form as never);
      setEditing(false);
      setNotice(
        res?.applied
          ? "پروفایل ذخیره شد."
          : "تغییرات ثبت شد و پس از تأیید مدیر اعمال میشود.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "خطا در ذخیره پروفایل");
    } finally {
      setBusy(false);
    }
  };

  if (profile === undefined) return <MiniLoading />;
  if (!profile) {
    return (
      <MiniCard>
        <p className="text-xs text-muted-foreground">
          برای مشاهده پروفایل ابتدا وارد حساب شوید.
        </p>
      </MiniCard>
    );
  }

  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    profile.name ||
    "کاربر";

  return (
    <div className="pb-4">
      <h2 className="mb-3 text-base font-bold">پروفایل</h2>

      {/* Identity card */}
      <MiniCard className="border-0 bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
        <div className="flex items-center gap-3">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={displayName}
              className="size-12 shrink-0 rounded-full border-2 border-white/40 object-cover"
            />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
              {displayName.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{displayName}</p>
            <p className="truncate text-[11px] opacity-90">{profile.email ?? "—"}</p>
            <p className="mt-0.5 text-[10px] opacity-80">
              {ROLE_LABELS[profile.role ?? "user"] ?? profile.role}
            </p>
          </div>
        </div>
      </MiniCard>

      {/* Profile fields */}
      <SectionTitle
        title="اطلاعات پروفایل"
        action={{ label: editing ? "انصراف" : "ویرایش", onClick: editing ? () => setEditing(false) : startEditing }}
      />

      {editing ? (
        <MiniCard>
          {(EDITABLE).map((field) => (
            <div key={field} className="mb-2">
              <label className="block text-[11px] text-muted-foreground">{FIELD_LABELS[field]}</label>
              {field === "about" ? (
                <textarea
                  rows={3}
                  value={form[field] ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-xs"
                />
              ) : (
                <input
                  value={form[field] ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                  dir={field === "firstNameLatin" || field === "lastNameLatin" ? "ltr" : undefined}
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-xs"
                />
              )}
            </div>
          ))}
          <MiniButton className="w-full" disabled={busy} onClick={save}>
            <Pencil className="size-3" />
            {busy ? "در حال ذخیره…" : "ذخیره تغییرات"}
          </MiniButton>
          <p className="mt-2 text-[10px] text-muted-foreground">
            تغییرات پروفایل برای تأیید به مدیر ارسال میشود (مدیران بدون تأیید ذخیره میشوند).
          </p>
        </MiniCard>
      ) : (
        <MiniCard>
          <div className="divide-y">
            <InfoRow label="نام" value={profile.firstName ?? "—"} />
            <InfoRow label="نام خانوادگی" value={profile.lastName ?? "—"} />
            <InfoRow label="نام لاتین" value={profile.firstNameLatin ?? "—"} />
            <InfoRow label="نام خانوادگی لاتین" value={profile.lastNameLatin ?? "—"} />
            <InfoRow label="ایمیل" value={profile.email ?? "—"} />
            <InfoRow label="تلفن" value={profile.phone ?? "—"} />
            <InfoRow label="کد پستی" value={profile.postalCode ?? "—"} />
            <InfoRow label="نشانی" value={profile.address ?? "—"} />
            <InfoRow label="درباره من" value={profile.about ?? "—"} />
          </div>
          {profile.pendingProfile ? (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              یک ویرایش در انتظار تأیید مدیر دارید.
            </p>
          ) : null}
        </MiniCard>
      )}

      {notice ? (
        <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-center text-[11px]">{notice}</p>
      ) : null}

      {/* Platform linking — read-only identity */}
      <SectionTitle title="اتصال حسابها" />
      <MiniCard>
        <div className="divide-y">
          <InfoRow
            label="تلگرام"
            value={
              telegram?.linked ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="size-3.5" />
                  {telegram.telegramUsername ? `@${telegram.telegramUsername}` : "متصل"}
                </span>
              ) : (
                <Chip tone="warn">متصل نیست</Chip>
              )
            }
          />
          <InfoRow
            label="بله"
            value={
              bale?.linked ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="size-3.5" />
                  {bale.baleUsername ? `@${bale.baleUsername}` : "متصل"}
                </span>
              ) : (
                <Chip tone="warn">متصل نیست</Chip>
              )
            }
          />
          <InfoRow
            label="اعلانهای پیامرسان"
            value={notifPrefs?.masterEnabled ? "فعال" : "غیرفعال"}
          />
          <InfoRow label="پلتفرم فعلی" value={PLATFORM_LABELS[platform.name]} />
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <LinkIcon className="size-3" />
          اتصال حساب پیامرسان از طریق ربات یا ورود در همین محیط انجام میشود و از اینجا قابل تغییر نیست.
        </p>
      </MiniCard>

      {/* Learning snapshot */}
      <SectionTitle title="وضعیت حساب" />
      <MiniCard>
        <div className="divide-y">
          <InfoRow
            label="پیشنهادهای اختصاصی"
            value={faNum(profile.suggestedCourseIds.length)}
          />
          <InfoRow label="نقش" value={ROLE_LABELS[profile.role ?? "user"] ?? profile.role} />
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldCheck className="size-3" />
          نقش و دسترسیها فقط توسط مدیران قابل تغییر است.
        </p>
      </MiniCard>

      {/* Actions */}
      <div className="mt-4 space-y-2">
        <MiniButton
          variant="outline"
          className="w-full"
          onClick={() => platform.openLink("https://nibrc.ir/dashboard")}
        >
          <ExternalLink className="size-3" />
          باز کردن پنل کامل Genova
        </MiniButton>
        <MiniButton
          variant="ghost"
          className="w-full"
          onClick={() => {
            void signOut();
          }}
        >
          <LogOut className="size-3" />
          خروج از حساب
        </MiniButton>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        <UserRound className="size-3" />
        حساب ژنوا · {profile.email ?? ""}
      </p>
    </div>
  );
}

const FIELD_LABELS: Record<EditableField, string> = {
  firstName: "نام",
  lastName: "نام خانوادگی",
  firstNameLatin: "نام (لاتین)",
  lastNameLatin: "نام خانوادگی (لاتین)",
  phone: "شماره تلفن",
  address: "نشانی",
  postalCode: "کد پستی",
  about: "درباره من",
};

const PLATFORM_LABELS: Record<string, string> = {
  telegram: "تلگرام",
  bale: "بله",
  browser: "مرورگر",
};
