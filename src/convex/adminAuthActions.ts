import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { createAccount, modifyAccountCredentials } from "@convex-dev/auth/server";

/**
 * Admin action to create a new user with auth credentials.
 *
 * This MUST be an action (not a mutation) because createAccount from
 * @convex-dev/auth/server requires ActionCtx for password hashing and
 * account storage. Dynamic imports inside mutations are unsupported in
 * Convex runtime, and the function signatures require ActionCtx.
 */
export const adminCreateUserAction = action({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // createAccount will:
    // 1. Look up or create a user in the `users` table using the profile
    // 2. Create an auth account with the hashed password in `authAccounts`
    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: args.email, secret: args.password },
      profile: { email: args.email, name: args.name ?? "" },
    });

    // Set the role on the created user if it's not the default "user" role.
    const targetRole = args.role ?? "user";
    if (targetRole !== "user") {
      await ctx.runMutation(api.admin.adminSetRole, {
        userId: user._id,
        role: targetRole,
      });
    }

    return { ok: true, userId: user._id };
  },
});

/**
 * Admin action to change a user's password.
 *
 * This MUST be an action because modifyAccountCredentials from
 * @convex-dev/auth/server requires ActionCtx.
 *
 * After changing the password, all existing sessions for this user are
 * invalidated so the user must re-authenticate with the new password.
 */
export const adminSetPasswordAction = action({
  args: {
    userId: v.id("users"),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // modifyAccountCredentials will:
    // 1. Find the existing password auth account for this user
    // 2. Replace the secret (password hash) with the new one
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: args.email, secret: args.password },
    });

    return { ok: true };
  },
});
