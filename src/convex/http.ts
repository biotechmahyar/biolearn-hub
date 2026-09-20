import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { handleTelegramWebhook } from "./telegramWebhook";
import { setupWebhookOnce } from "./telegramSetupWebhook";
import { handleBaleWebhook, setupBaleWebhookOnce } from "./baleWebhook";
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

// ── One-time: setup webhook ────────────────────────────────────────────────────
// GET /telegram/setup-webhook — reads token from DB, registers webhook with Telegram
http.route({
  path: "/telegram/setup-webhook",
  method: "GET",
  handler: setupWebhookOnce,
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

// GET /bale/setup-webhook — registers this deployment's webhook with Bale
// using the server-side token (mirrors /telegram/setup-webhook).
http.route({
  path: "/bale/setup-webhook",
  method: "GET",
  handler: setupBaleWebhookOnce,
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
