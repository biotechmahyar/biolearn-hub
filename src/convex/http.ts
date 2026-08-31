import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { handleTelegramWebhook } from "./telegramWebhook";
import { setupWebhookOnce } from "./telegramSetupWebhook";
import { handleSyncData } from "./syncData";

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

// ── Iran Mirror Sync Endpoint ─────────────────────────────────────────────────
// GET /sync/data — serves all public data for the Iran mirror site
// Protected by X-Sync-Key header
http.route({
  path: "/sync/data",
  method: "GET",
  handler: handleSyncData,
});

export default http;
