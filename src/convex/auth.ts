// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { emailOtp } from "./emailOtp";

// Google login provider: client calls signIn("google", { email, name, picture })
// with data pre-verified by googleAuth:verifyGoogleToken action.
const GoogleProvider = ConvexCredentials({
  id: "google",
  authorize: async (credentials, ctx) => {
    const email = credentials.email as string | undefined;
    const name = credentials.name as string | undefined;
    const picture = credentials.picture as string | undefined;

    if (!email || typeof email !== "string") {
      throw new Error("Google sign-in requires an email.");
    }

    // createAccount from @convex-dev/auth/server handles account lookup & creation
    const { createAccount } = await import("@convex-dev/auth/server");
    const { user } = await createAccount(ctx, {
      provider: "google",
      account: { id: email },
      profile: {
        name: name ?? "",
        image: picture ?? "",
        email,
      },
    });
    return { userId: user._id };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [emailOtp, Password, Anonymous, GoogleProvider],
});