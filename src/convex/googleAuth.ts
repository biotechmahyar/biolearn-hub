"use node";

import { action } from "./_generated/server";

/**
 * Verify a Google ID token by calling Google's tokeninfo endpoint.
 * Returns safe user info (no secrets exposed to client).
 */
import { v } from "convex/values";

export const verifyGoogleToken = action({
  args: { idToken: v.string() },
  handler: async (_ctx, args) => {
    const clientId = process.env.GOOGLE_CLIENT_ID ?? "249113399223-scvp6ehrm1l4cam42rnh7ohq4hipnn9t.apps.googleusercontent.com";
    if (!clientId) {
      throw new Error("GOOGLE_CLIENT_ID is not configured on the server.");
    }

    try {
      const resp = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(args.idToken)}`,
      );

      if (!resp.ok) {
        throw new Error("Google token verification failed.");
      }

      const payload: Record<string, unknown> = await resp.json();

      // Verify the token is intended for our app
      if (payload.aud !== clientId) {
        throw new Error("Token audience mismatch.");
      }

      // Verify issuer
      if (
        payload.iss !== "https://accounts.google.com" &&
        payload.iss !== "accounts.google.com"
      ) {
        throw new Error("Token issuer mismatch.");
      }

      // Check token hasn't expired
      const exp = Number(payload.exp);
      if (!exp || Date.now() / 1000 > exp) {
        throw new Error("Token has expired.");
      }

      return {
        email: String(payload.email ?? ""),
        name: String(payload.name ?? ""),
        picture: String(payload.picture ?? ""),
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Google token verification failed:", msg);
      throw new Error(
        msg.includes("Token") || msg.includes("Google")
          ? msg
          : "Failed to verify Google token. Please try again.",
      );
    }
  },
});
