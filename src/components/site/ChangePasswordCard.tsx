import { useState } from "react";
import { useAction } from "convex/react";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordCard() {
  const { user, signIn } = useAuth();
  const changeMyPassword = useAction(api.userAuthActions.changeMyPasswordAction);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("رمز عبور فعلی و رمز عبور جدید را کامل وارد کنید.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("رمز عبور جدید باید حداقل ۶ کاراکتر باشد.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("رمز عبور جدید و تکرار آن یکسان نیستند.");
      return;
    }
    if (!user?.email) {
      toast.error("تغییر رمز فقط برای حساب‌های ایمیل/رمز ممکن است.");
      return;
    }

    setIsChanging(true);
    try {
      try {
        await signIn("password", { email: user.email, password: currentPassword });
      } catch {
        toast.error("رمز عبور فعلی اشتباه است.");
        return;
      }

      await changeMyPassword({ newPassword });

      try {
        await signIn("password", { email: user.email, password: newPassword });
      } catch {
        // The old session is invalidated after changing the password; normal sign-in will handle it.
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("رمز عبور با موفقیت تغییر کرد.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در تغییر رمز عبور.");
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-5" />
          تغییر رمز عبور
        </CardTitle>
        <p className="text-sm text-muted-foreground">برای امنیت بیشتر، رمز جدید را حداقل ۶ کاراکتر انتخاب کنید.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="profile-current-password">رمز عبور فعلی</Label>
          <div className="relative">
            <Input
              id="profile-current-password"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="pl-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowCurrent((value) => !value)}
              aria-label={showCurrent ? "پنهان کردن رمز فعلی" : "نمایش رمز فعلی"}
            >
              {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-new-password">رمز عبور جدید</Label>
          <div className="relative">
            <Input
              id="profile-new-password"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="pl-10"
              autoComplete="new-password"
              placeholder="حداقل ۶ کاراکتر"
            />
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowNew((value) => !value)}
              aria-label={showNew ? "پنهان کردن رمز جدید" : "نمایش رمز جدید"}
            >
              {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-confirm-password">تکرار رمز عبور جدید</Label>
          <div className="relative">
            <Input
              id="profile-confirm-password"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="pl-10"
              autoComplete="new-password"
              placeholder="رمز جدید را دوباره وارد کنید"
            />
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowConfirm((value) => !value)}
              aria-label={showConfirm ? "پنهان کردن تکرار رمز" : "نمایش تکرار رمز"}
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Button type="button" onClick={handleChangePassword} disabled={isChanging} className="gap-2">
          {isChanging ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
          تغییر رمز عبور
        </Button>
      </CardContent>
    </Card>
  );
}
