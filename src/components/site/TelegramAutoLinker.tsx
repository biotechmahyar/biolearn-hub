/**
 * TelegramAutoLinker
 *
 * Detects when the app is opened inside a Mini App
 * and auto-links the platform account to the current Genova user
 * using the platform's initData validation.
 *
 * Currently handles Telegram only. Bale will be added later.
 */
import { useEffect, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { platform } from "@/lib/miniApp/platform";

export function TelegramAutoLinker() {
  const linkByTelegramInitData = useAction(api.telegramBotActions.linkByTelegramInitData);
  const { user, isLoading } = useAuth();
  const doneRef = useRef(false);

  useEffect(() => {
    // Only run once
    if (doneRef.current) return;
    if (isLoading) return; // Wait for auth to resolve
    if (!user) return; // Not signed in — skip

    // Get initData through the platform adapter instead of directly
    // accessing window.Telegram.WebApp.
    const initData = platform.getInitData();
    if (!initData) return; // Not in a Mini App or no initData

    // initData must contain a hash for Telegram HMAC validation
    if (!initData.includes("hash=")) return;

    doneRef.current = true;

    linkByTelegramInitData({ initData })
      .then((result) => {
        if (result?.success) {
          console.log(
            result.alreadyLinked
              ? "✅ Telegram already linked"
              : "✅ Telegram linked successfully"
          );
        }
      })
      .catch((err) => {
        console.warn("Telegram auto-link failed:", err?.message ?? err);
      });
  }, [user, isLoading, linkByTelegramInitData]);

  return null; // No UI — runs silently in background
}
