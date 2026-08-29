import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

// ── Telegram Webhook Handler ─────────────────────────────────────────────────
// This is a PUBLIC httpAction — Telegram sends POST requests here.
// No auth required (Telegram doesn't send Convex auth tokens).

const SITE_URL = "https://nibrc.ir";

async function sendMsg(token: string, chatId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function miniAppBtn(text: string, path: string) {
  return { text, web_app: { url: `${SITE_URL}${path}` } };
}

function urlBtn(text: string, url: string) {
  return { text, url };
}

// ── Command handlers ──────────────────────────────────────────────────────

async function handleStart(ctx: any, token: string, chatId: number, telegramId: number, firstName: string, username: string | undefined, text: string) {
  const parts = text.split(/\s+/);
  const code = parts[1]?.trim().toUpperCase();

  // Account linking flow
  if (code && code.length >= 6) {
    const codeDoc = await ctx.runQuery(api.telegramBot._findLinkingCode, { code });
    if (!codeDoc) {
      await sendMsg(token, chatId, "❌ لینک اتصال معتبر نیست یا منقضی شده است.\n\nلطفاً از سایت کد جدید دریافت کنید.");
      return;
    }
    if (Date.now() > codeDoc.expiresAt) {
      await sendMsg(token, chatId, "⏰ لینک اتصال منقضی شده است.\n\nلطفاً از سایت کد جدید دریافت کنید.");
      return;
    }
    if (codeDoc.usedAt) {
      await sendMsg(token, chatId, "⚠️ این لینک اتصال قبلاً استفاده شده است.\n\nاگر می‌خواهید حساب جدیدی متصل کنید، از سایت کد جدید دریافت کنید.");
      return;
    }
    const existingUser = await ctx.runQuery(api.telegramBot._findUserByTelegramId, { telegramId });
    if (existingUser && existingUser._id !== codeDoc.userId) {
      await sendMsg(token, chatId, "⚠️ این حساب Telegram قبلاً به حساب دیگری متصل شده است.\n\nبرای اتصال به حساب جدید، ابتدا اتصال قبلی را قطع کنید.");
      return;
    }
    if (existingUser && existingUser._id === codeDoc.userId) {
      await sendMsg(token, chatId, `✅ این حساب Telegram قبلاً به حساب Genova شما متصل شده است.\n\nخوش آمدید ${firstName}!`);
      return;
    }
    const result = await ctx.runMutation(api.telegramBot._completeLinking, {
      codeId: codeDoc._id, telegramId, telegramUsername: username, telegramFirstName: firstName,
    });
    if (result.success) {
      await sendMsg(token, chatId, `✅ حساب Telegram شما با موفقیت به Genova متصل شد!\n\nخوش آمدید ${firstName}! 🎉`);
    } else {
      const reasons: Record<string, string> = {
        already_used: "⚠️ این لینک قبلاً استفاده شده است.",
        expired: "⏰ این لینک منقضی شده است.",
        already_linked: "⚠️ این حساب Telegram قبلاً به حساب دیگری متصل شده.",
      };
      await sendMsg(token, chatId, reasons[result.reason] || "❌ خطای نامشخص.");
    }
    return;
  }

  // Normal /start — welcome with inline keyboard
  const welcomeMsg = `سلام ${firstName}! 👋\nبه Genova خوش آمدید.\n\nبرای شروع یکی از دستورات زیر را ارسال کنید:`;

  const inlineKeyboard = [
    [miniAppBtn("🚀 باز کردن Genova", "/")],
    [
      { text: "👤 پروفایل", callback_data: "cmd_profile" },
      { text: "💬 سؤالات", callback_data: "cmd_questions" },
    ],
    [
      { text: "📅 جلسات", callback_data: "cmd_sessions" },
      { text: "📚 Tasks", callback_data: "cmd_tasks" },
    ],
    [
      { text: "🔔 اعلان‌ها", callback_data: "cmd_notifications" },
      { text: "❓ راهنما", callback_data: "cmd_help" },
    ],
  ];

  await sendMsg(token, chatId, welcomeMsg, { inline_keyboard: inlineKeyboard });
}

async function handleHelp(ctx: any, token: string, chatId: number) {
  const text = `📖 <b>راهنمای Genova</b>

/start — شروع کار با Genova
/help — نمایش این راهنما
/profile — مشاهده پروفایل
/questions — سؤالات من
/sessions — جلسات من
/tasks — Tasks من
🔔 /notifications — اعلان‌ها
/groups — گروه‌های منتورینگ
/settings — تنظیمات
/genova — باز کردن Genova`;

  const inlineKeyboard = [
    [miniAppBtn("🚀 باز کردن Genova", "/")],
    [urlBtn("📖 مستندات", `${SITE_URL}`)],
  ];

  await sendMsg(token, chatId, text, { inline_keyboard: inlineKeyboard });
}

async function handleProfile(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(api.telegramBot._findUserByTelegramId, { telegramId });
  if (!user) {
    await sendMsg(token, chatId,
      "❌ حساب Telegram شما هنوز به Genova متصل نشده است.\n\nبرای اتصال، از سایت کد اتصال دریافت کنید.",
      { inline_keyboard: [[urlBtn("🔗 اتصال حساب", `${SITE_URL}/auth`)]] }
    );
    return;
  }

  const isLinked = !!user.telegramId;
  const text = `👤 <b>پروفایل</b>

نام: ${user.name || "—"}
username: ${user.email || "—"}
وضعیت Telegram: ${isLinked ? "✅ متصل" : "❌ متصل نیست"}`;

  await sendMsg(token, chatId, text, {
    inline_keyboard: [[miniAppBtn("🚀 باز کردن پروفایل", "/profile")]],
  });
}

async function handleQuestions(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(api.telegramBot._findUserByTelegramId, { telegramId });
  if (!user) {
    await sendMsg(token, chatId, "❌ حساب شما متصل نیست. ابتدا /start را ارسال کنید.");
    return;
  }

  const questions = await ctx.runQuery(api.mentor.listMentorQuestions);
  const myQs = questions.filter((q: any) => q.studentId === user._id).slice(0, 5);

  if (myQs.length === 0) {
    await sendMsg(token, chatId, "💬 سؤالی ثبت نکرده‌اید.", {
      inline_keyboard: [[miniAppBtn("💬 ثبت سؤال جدید", "/questions")]],
    });
    return;
  }

  let text = "💬 <b>سؤالات من</b>\n\n";
  myQs.forEach((q: any, i: number) => {
    const status = q.status === "answered" ? "✅ پاسخ داده شده" : "⏳ در انتظار پاسخ";
    text += `${i + 1}. ${q.topic}\n   ${status}\n\n`;
  });

  await sendMsg(token, chatId, text, {
    inline_keyboard: [[miniAppBtn("💬 مشاهده همه سؤالات", "/questions")]],
  });
}

async function handleSessions(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(api.telegramBot._findUserByTelegramId, { telegramId });
  if (!user) {
    await sendMsg(token, chatId, "❌ حساب شما متصل نیست. ابتدا /start را ارسال کنید.");
    return;
  }

  const sessions = await ctx.runQuery(api.mentor.listSessions);
  const mySessions = sessions
    .filter((s: any) => s.studentId === user._id && s.status === "scheduled")
    .slice(0, 5);

  if (mySessions.length === 0) {
    await sendMsg(token, chatId, "📅 جلسه‌ای برای شما ثبت نشده است.", {
      inline_keyboard: [[miniAppBtn("📅 مشاهده جلسات", "/sessions")]],
    });
    return;
  }

  let text = "📅 <b>جلسات من</b>\n\n";
  mySessions.forEach((s: any) => {
    text += `🕐 ${s.date} — ${s.time}\n`;
    text += `📌 ${s.title}\n`;
    text += `👤 ${s.mentorName}\n\n`;
  });

  await sendMsg(token, chatId, text, {
    inline_keyboard: [[miniAppBtn("📅 مشاهده همه جلسات", "/sessions")]],
  });
}

async function handleTasks(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(api.telegramBot._findUserByTelegramId, { telegramId });
  if (!user) {
    await sendMsg(token, chatId, "❌ حساب شما متصل نیست. ابتدا /start را ارسال کنید.");
    return;
  }

  // Check if tasks table exists — use a safe query
  try {
    const tasks = await ctx.runQuery(api.mentor.listSessions);
    const userTasks = tasks.filter((t: any) => t.studentId === user._id && t.status === "scheduled").slice(0, 5);

    if (userTasks.length === 0) {
      await sendMsg(token, chatId, "✅ در حال حاضر Task فعالی ندارید.", {
        inline_keyboard: [[miniAppBtn("📚 مشاهده Tasks", "/tasks")]],
      });
      return;
    }

    let text = "📚 <b>Tasks من</b>\n\n";
    userTasks.forEach((t: any, i: number) => {
      text += `${i + 1}. ${t.title}\n   📅 ${t.date} — ${t.time}\n\n`;
    });

    await sendMsg(token, chatId, text, {
      inline_keyboard: [[miniAppBtn("📚 مشاهده همه Tasks", "/tasks")]],
    });
  } catch {
    await sendMsg(token, chatId, "✅ در حال حاضر Task فعالی ندارید.", {
      inline_keyboard: [[miniAppBtn("📚 مشاهده Tasks", "/tasks")]],
    });
  }
}

async function handleNotifications(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(api.telegramBot._findUserByTelegramId, { telegramId });
  if (!user) {
    await sendMsg(token, chatId, "❌ حساب شما متصل نیست. ابتدا /start را ارسال کنید.");
    return;
  }

  const prefs = await ctx.runQuery(api.telegramNotifications.getNotifPrefs);
  const masterEnabled = prefs?.masterEnabled ?? false;

  const text = `🔔 <b>اعلان‌های Telegram</b>

وضعیت: ${masterEnabled ? "✅ فعال" : "❌ غیرفعال"}

${masterEnabled ? "اعلان‌های شما فعال هستند و از طریق Telegram ارسال می‌شوند." : "برای فعال‌سازی اعلان‌ها، از سایت اقدام کنید."}`;

  await sendMsg(token, chatId, text, {
    inline_keyboard: [[miniAppBtn("⚙️ تنظیمات اعلان‌ها", "/settings")]],
  });
}

async function handleGroups(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(api.telegramBot._findUserByTelegramId, { telegramId });
  if (!user) {
    await sendMsg(token, chatId, "❌ حساب شما متصل نیست. ابتدا /start را ارسال کنید.");
    return;
  }

  const groups = await ctx.runQuery(api.collab.listMentorGroups);
  // Check membership for each group
  const myGroups: any[] = [];
  for (const g of groups) {
    const isMember = await ctx.runQuery(api.collab.isGroupMember, { groupId: g._id });
    if (isMember) myGroups.push(g);
  }

  if (myGroups.length === 0) {
    await sendMsg(token, chatId, "👥 عضو هیچ گروه منتورینگی نیستید.", {
      inline_keyboard: [[miniAppBtn("👥 مشاهده گروه‌ها", "/groups")]],
    });
    return;
  }

  let text = "👥 <b>گروه‌های من</b>\n\n";
  myGroups.forEach((g: any) => {
    text += `📌 ${g.title}\n`;
    text += `👤 ${g.mentorName}\n`;
    text += `👥 ${g.memberCount}/${g.capacity} عضو\n\n`;
  });

  await sendMsg(token, chatId, text, {
    inline_keyboard: [[miniAppBtn("👥 مشاهده گروه‌ها", "/groups")]],
  });
}

async function handleSettings(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(api.telegramBot._findUserByTelegramId, { telegramId });
  if (!user) {
    await sendMsg(token, chatId, "❌ حساب شما متصل نیست. ابتدا /start را ارسال کنید.");
    return;
  }

  const prefs = await ctx.runQuery(api.telegramNotifications.getNotifPrefs);
  const masterEnabled = prefs?.masterEnabled ?? false;

  const text = `⚙️ <b>تنظیمات</b>

🔗 اتصال Telegram: ✅ متصل
🔔 اعلان‌ها: ${masterEnabled ? "✅ فعال" : "❌ غیرفعال"}

برای تغییر تنظیمات از سایت استفاده کنید.`;

  await sendMsg(token, chatId, text, {
    inline_keyboard: [
      [miniAppBtn("⚙️ باز کردن تنظیمات", "/settings")],
      [urlBtn("🌐 باز کردن سایت", SITE_URL)],
    ],
  });
}

async function handleGenova(ctx: any, token: string, chatId: number) {
  await sendMsg(token, chatId, "🚀 Genova", {
    inline_keyboard: [[miniAppBtn("🚀 باز کردن Genova", "/")]],
  });
}

async function handleCallbackQuery(ctx: any, token: string, chatId: number, telegramId: number, firstName: string, username: string | undefined, callbackData: string) {
  const callbackQueryId = callbackData;

  // Route callback_data to the right handler
  switch (callbackData) {
    case "cmd_profile":
      await handleProfile(ctx, token, chatId, telegramId);
      break;
    case "cmd_questions":
      await handleQuestions(ctx, token, chatId, telegramId);
      break;
    case "cmd_sessions":
      await handleSessions(ctx, token, chatId, telegramId);
      break;
    case "cmd_tasks":
      await handleTasks(ctx, token, chatId, telegramId);
      break;
    case "cmd_notifications":
      await handleNotifications(ctx, token, chatId, telegramId);
      break;
    case "cmd_help":
      await handleHelp(ctx, token, chatId);
      break;
    case "cmd_groups":
      await handleGroups(ctx, token, chatId, telegramId);
      break;
    case "cmd_settings":
      await handleSettings(ctx, token, chatId, telegramId);
      break;
    default:
      await sendMsg(token, chatId, "❓ عملیات شناخته نشد.");
  }
}

// ── Main webhook handler ─────────────────────────────────────────────────

export const handleTelegramWebhook = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await request.json();

    // Handle callback queries (inline button clicks)
    if (body.callback_query) {
      const cq = body.callback_query;
      const chatId = cq.message?.chat?.id;
      const telegramId = cq.from?.id;
      const firstName = cq.from?.first_name || "کاربر";
      const username = cq.from?.username;
      const callbackData = cq.data;

      if (!chatId || !telegramId || !callbackData) {
        return new Response("OK", { status: 200 });
      }

      const bots = await ctx.runQuery(api.telegramBot.getBotConfigPublic);
      if (!bots || !bots[0]?.token) return new Response("OK", { status: 200 });

      await handleCallbackQuery(ctx, bots[0].token, chatId, telegramId, firstName, username, callbackData);
      return new Response("OK", { status: 200 });
    }

    // Handle messages
    const message = body?.message;
    if (!message) return new Response("OK", { status: 200 });

    const chatId = message.chat?.id;
    const text = (message.text || "").trim();
    const telegramId = message.from?.id;
    const firstName = message.from?.first_name || "کاربر";
    const username = message.from?.username;

    if (!chatId || !telegramId) return new Response("OK", { status: 200 });

    const bots = await ctx.runQuery(api.telegramBot.getBotConfigPublic);
    if (!bots || !bots[0]?.token) return new Response("OK", { status: 200 });

    const token = bots[0].token;
    if (!token) return new Response("OK", { status: 200 });

    // Parse command
    const cmdMatch = text.match(/^\/([a-zA-Z0-9_]+)(\s+.*)?$/);
    const cmd = cmdMatch ? cmdMatch[1].toLowerCase() : null;

    switch (cmd) {
      case "start":
        await handleStart(ctx, token, chatId, telegramId, firstName, username, text);
        break;
      case "help":
        await handleHelp(ctx, token, chatId);
        break;
      case "profile":
        await handleProfile(ctx, token, chatId, telegramId);
        break;
      case "questions":
        await handleQuestions(ctx, token, chatId, telegramId);
        break;
      case "sessions":
        await handleSessions(ctx, token, chatId, telegramId);
        break;
      case "tasks":
        await handleTasks(ctx, token, chatId, telegramId);
        break;
      case "notifications":
        await handleNotifications(ctx, token, chatId, telegramId);
        break;
      case "groups":
        await handleGroups(ctx, token, chatId, telegramId);
        break;
      case "settings":
        await handleSettings(ctx, token, chatId, telegramId);
        break;
      case "genova":
        await handleGenova(ctx, token, chatId);
        break;
      default:
        if (cmd) {
          await sendMsg(token, chatId,
            `❓ دستور «/${cmd}» شناخته نشد.\n\nبرای مشاهده دستورات، /help را ارسال کنید.`,
            { inline_keyboard: [[{ text: "📖 راهنما", callback_data: "cmd_help" }]] }
          );
        } else if (text) {
          // Regular text message — send help hint
          await sendMsg(token, chatId,
            `برای شروع /start را ارسال کنید.\nبرای راهنما /help را ارسال کنید.`,
            { inline_keyboard: [[{ text: "🚀 شروع", callback_data: "cmd_help" }]] }
          );
        }
    }

    return new Response("OK", { status: 200 });
  } catch (err: unknown) {
    console.error("Telegram webhook error:", err);
    return new Response("OK", { status: 200 });
  }
});
