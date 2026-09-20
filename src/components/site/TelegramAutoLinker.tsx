/**
 * Mini App AutoLinker (Telegram & Bale)
 *
 * Detects when the app is opened inside a Mini App (Telegram or Bale) and
 * auto-links the messenger account to the current Genova user using initData
 * HMAC validation on the server.
 *
 * Both linking actions run through the same shared server-side resolver, which
 * decides the real platform from the signature — so the choice made here is
 * only a hint and can never link the wrong identity. initData is never logged.
 */
import { useEffect, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { getMiniAppInitData, platform } from "@/lib/miniApp/platform";

export function TelegramAutoLinker() {
  const linkByTelegramInitData = useAction(api.telegramBotActions.linkByTelegramInitData);
  const linkByBaleInitData = useAction(api.baleBotActions.linkByBaleInitData);
  const { user, isLoading } = useAuth();
  const doneRef = useRef(false);

  useEffect(() => {
    // Only run once
    if (doneRef.current) return;
    if (isLoading) return; // Wait for auth to resolve
    if (!user) return; // Not signed in — skip

    // Get initData through the platform adapter (Telegram or Bale SDK)
    const initData = getMiniAppInitData();
    if (!initData) return; // Not in a Mini App or no initData

    // initData must contain a hash for HMAC validation
    if (!initData.includes("hash=")) return;

    doneRef.current = true;

    // Route to the correct platform-specific linking action
    const linkAction = platform.name === "bale"
      ? linkByBaleInitData
      : linkByTelegramInitData;
    const platformLabel = platform.name === "bale" ? "Bale" : "Telegram";

    linkAction({ initData })
      .then((result) => {
        if (result?.success) {
          console.log(
            result.alreadyLinked
              ? `✅ ${platformLabel} already linked`
              : `✅ ${platformLabel} linked successfully`
          );
        }
      })
      .catch((err) => {
        console.warn(`${platformLabel} auto-link failed:`, err?.message ?? err);
      });
  }, [user, isLoading, linkByTelegramInitData, linkByBaleInitData]);

  return null; // No UI — runs silently in background
}
