import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId, modifyAccountCredentials } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

/**
 * Change the signed-in user's own password.
 *
 * This MUST be an action (not a mutation): modifyAccountCredentials from
 * @convex-dev/auth/server requires ActionCtx for password hashing, and dynamic
 * imports inside mutations are unsupported in the Convex runtime.
 *
 * Security: the target email is resolved server-side from the authenticated
 * user — a caller can only ever change their own password. Verifying the
 * *current* password happens through the real Password provider sign-in on the
 * client before this action is called (see ProfilePage.handleChangePassword).
 */
export const changeMyPasswordAction = action({
  args: { newPassword: v.string() },
  handler: async (ctx, args) => {
    if (args.newPassword.length < 6) {
      throw new Error("رمز عبور جدید باید حداقل ۶ کاراکتر باشد.");
    }
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("برای تغییر رمز عبور ابتدا وارد شوید.");
    }

    const user = await ctx.runQuery(api.users.currentUser, {});
    if (!user?.email) {
      throw new Error(
        "ایمیلی برای این حساب یافت نشد. تغییر رمز عبور فقط برای حساب‌های ایمیل/رمز ممکن است.",
      );
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: user.email, secret: args.newPassword },
    });

    return { ok: true };
  },
});
