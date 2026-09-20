"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { linkMiniAppIdentity, type MiniAppRunnerCtx } from "./miniAppAuth";

/**
 * Validate Bale Mini App initData and link the Bale account
 * to the currently signed-in Genova user.
 *
 * Flow: Bale WebApp → initData → backend HMAC validation → account linking.
 *
 * Security:
 * - initData is validated server-side with HMAC-SHA256 against the Bale bot
 *   token (see ./miniAppAuth). The token never leaves the server.
 * - auth_date freshness is enforced (24h) inside the shared validator.
 * - The platform is resolved server-side from the signature itself, so a
 *   wrong platform hint from the client cannot link the wrong identity.
 * - A client-supplied user id is never accepted: the Bale user id always comes
 *   from the verified initData.
 * - Linking is a single transaction that refuses duplicates in both
 *   directions (one user ↔ one Bale account).
 */
export const linkByBaleInitData = action({
  args: { initData: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("لطفاً وارد شوید.");

    return await linkMiniAppIdentity(ctx as unknown as MiniAppRunnerCtx, args.initData, userId);
  },
});
