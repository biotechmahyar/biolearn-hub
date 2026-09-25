import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { handleTelegramWebhook } from "./telegramWebhook";
import { handleBaleWebhook } from "./baleWebhook";
import { handleSyncData, handleSyncPush } from "./syncData";

const http = httpRouter();

auth.addHttpRoutes(http);

// ── Telegram Bot Webhook ─────────────────────────────────────────────────────
// POST /telegram/webhook — receives updates from Telegram servers
http.route({
  path: "/telegram/webhook",
  method: "POST",
  handler: handleTelegramWebhook,
});

// ── Bale Bot Webhook ─────────────────────────────────────────────────────────
// POST /bale/webhook — receives updates from Bale servers.
// Bale offers no webhook signature, so this handler stays non-privileged: it
// validates structure, ignores unsupported updates and performs no
// authentication or database writes (see src/convex/baleWebhook.ts).
http.route({
  path: "/bale/webhook",
  method: "POST",
  handler: handleBaleWebhook,
});

// ── Iran Mirror Sync Endpoint ─────────────────────────────────────────────────
// GET /sync/data — serves all public data for the Iran mirror site
// Protected by X-Sync-Key header
http.route({
  path: "/sync/data",
  method: "GET",
  handler: handleSyncData,
});

// ── Iran Mirror Sync Push Endpoint ──────────────────────────────────────────
// POST /sync/push — receives offline changes from Iran mirror
http.route({
  path: "/sync/push",
  method: "POST",
  handler: handleSyncPush,
});

export default http;
