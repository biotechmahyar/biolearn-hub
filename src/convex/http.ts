import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { handleTelegramWebhook } from "./telegramWebhook";

const http = httpRouter();

auth.addHttpRoutes(http);

// ── Telegram Bot Webhook ─────────────────────────────────────────────────────
// POST /telegram/webhook — receives updates from Telegram servers
http.route({
  path: "/telegram/webhook",
  method: "POST",
  handler: handleTelegramWebhook,
});

export default http;
