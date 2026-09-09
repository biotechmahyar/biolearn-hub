"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { validateMiniAppInitData } from "./miniAppAuth";

/**
 * Validate Bale Mini App initData and link the Bale account
 * to the currently signed-in Genova user.
 *
 * Flow: Bale WebApp → initData → Backend HMAC validation → Account linking.
 *
 * Security:
 * - initData is validated server-side using HMAC-SHA256 (same algorithm as Telegram).
 * - auth_date freshness is enforced (24-hour window).
 * - Bot token never leaves the server.
 * - Client-supplied user IDs are never trusted before HMAC verification.
 */
export const linkByBaleInitData = action({
  args: { initData: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("لطفاً وارد شوید.");

    // 1. Get the Bale bot token (server-side only)
    const tokenData = await ctx.runQuery(api.baleBot._getRawToken);
    if (!tokenData?.token) throw new Error("توکن بات Bale ذخیره نشده است.");
    const botToken: string = tokenData.token;

    // 2. Validate initData using shared HMAC validator with freshness check
    // Bale documentation requires 24-hour auth_date freshness.
    const validated = validateMiniAppInitData(args.initData, botToken, {
      authDateFreshnessSeconds: 24 * 60 * 60, // 24 hours
    });
    const { user: baleUser } = validated;
    const baleId = baleUser.id;

    // 3. Check if this Bale account is already linked to THIS user
    const currentUser = await ctx.runQuery(api.baleBot._findUserById, { userId });
    if (!currentUser) throw new Error("کاربر Genova یافت نشد.");

    if (currentUser.baleId === baleId) {
      // Already linked — just return success
      return { success: true, alreadyLinked: true };
    }

    if (currentUser.baleId && currentUser.baleId !== baleId) {
      // This Genova user is linked to a DIFFERENT Bale account
      throw new Error("حساب Bale شما قبلاً به حساب دیگری متصل است. ابتدا آن را قطع کنید.");
    }

    // 4. Check if this Bale ID is linked to ANOTHER Genova user
    const existingOwner = await ctx.runQuery(api.baleBot._findUserByBaleId, { baleId });
    if (existingOwner) {
      throw new Error("این حساب Bale قبلاً به یک حساب Genova دیگر متصل شده است.");
    }

    // 5. Link!
    await ctx.runMutation(api.baleBot._linkDirect, {
      userId,
      baleId,
      baleUsername: baleUser.username,
      baleFirstName: baleUser.first_name,
    });

    return { success: true, alreadyLinked: false };
  },
});
