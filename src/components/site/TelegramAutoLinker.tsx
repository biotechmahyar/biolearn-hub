/**
 * TelegramAutoLinker
 *
 * Detects when the app is opened inside a Telegram Mini App
 * and auto-links the Telegram account to the current Genova user
 * using Telegram WebApp initData validation.
 */
import { useEffect, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";

export function TelegramAutoLinker() {
  const linkByTelegramInitData = useAction(api.telegramBotActions.linkByTelegramInitData);
  const { user, isLoading } = useAuth();
  const doneRef = useRef(false);

  useEffect(() => {
    // Only run once
    if (doneRef.current) return;
    if (isLoading) return; // Wait for auth to resolve
    if (!user) return; // Not signed in — skip

    // Check if running inside Telegram WebApp
    // Telegram.WebApp is available when opened as a Mini App
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return; // Not in Telegram — skip

    const initData: string | undefined = tg.initData;
    if (!initData) return; // No initData available

    // initData must be non-empty and contain a hash
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
