import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

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
  // Inline web_app buttons work in-chat once the bot's menu button is set to
  // this URL (Bot API attaches the domain automatically via setChatMenuButton).
  // Keep the URL version first — if Telegram rejects it, clients fall back to
  // the /start hint below which points at the menu button.
  return { text, web_app: { url: `${SITE_URL}${path}` } };
}

/** Deep link that opens the bot's Mini App inside Telegram (t.me/bot?startapp). */
function miniAppDeepLink(text: string, botUsername: string | null | undefined) {
  if (!botUsername) return null;
  return { text, url: `https://t.me/${botUsername}?startapp=mini` };
}

function urlBtn(text: string, url: string) {
  return { text, url };
}

/**
 * Genova's persistent Reply Keyboard — buttons glued to the message input
 * (same UX as the reference screenshot). Pressing a button simply SENDS its
 * text as a normal message; the webhook maps these texts to commands via
 * replyTextToCommand(). resize_keyboard → compact button height.
 */
const GENOVA_REPLY_KEYBOARD = {
  keyboard: [
    [
      { text: "🤖 هوش مصنوعی" },
      { text: "💬 ثبت سؤال" },
    ],
    [
      { text: "👤 پروفایل" },
      { text: "💰 اشتراک و سکه" },
    ],
    [{ text: "🔗 معرفی به دوستان (سکه رایگان)" }],
    [{ text: "🚀 باز کردن Genova" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

/** Map a reply-keyboard button text to a callback command (or null). */
function replyTextToCommand(text: string): string | null {
  switch (text) {
    case "🤖 هوش مصنوعی": return "cmd_ai";
    case "💬 ثبت سؤال": return "cmd_ask";
    case "👤 پروفایل": return "cmd_profile";
    case "💰 اشتراک و سکه": return "cmd_genova"; // subscription/coins → open mini app
    case "🔗 معرفی به دوستان (سکه رایگان)": return "cmd_referral";
    case "🚀 باز کردن Genova": return "cmd_genova";
    default: return null;
  }
}

// ── Bot-only interactive flows (AI / ask / session request) ───────────────

async function notifyAdminsOfQuestion(ctx: any, admins: { telegramId: number; name: string }[], fromName: string, topic: string, text: string) {
  for (const a of admins) {
    try {
      await sendMsg(
        ctx.token,
        a.telegramId,
        `❓ <b>سؤال جدید از تلگرام</b>\n\n👤 ${fromName}\n📚 موضوع: ${topic}\n\n${text}\n\nبرای پاسخ: /answer`,
      );
    } catch { /* ignore per-admin failures */ }
  }
}

async function handleAsk(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
  if (!user) {
    await sendMsg(token, chatId, "❌ حساب شما متصل نیست. ابتدا از سایت حساب خود را متصل کنید.");
    return;
  }
  await ctx.runMutation(internal.telegramBotExtras.setPendingInput, {
    telegramId,
    kind: "ask",
  });
  await sendMsg(token, chatId, "💬 سؤال خود را بنویسید و ارسال کنید:\n\n(برای لغو /cancel را بفرستید)");
}

async function handleAiStart(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
  if (!user) {
    await sendMsg(token, chatId, "❌ حساب شما متصل نیست. ابتدا از سایت حساب خود را متصل کنید.");
    return;
  }
  const usage = await ctx.runQuery(internal.telegramBotExtras.getBotUserAiUsage, { userId: user._id });
  if (!usage) {
    await sendMsg(token, chatId, "❌ کاربر یافت نشد.");
    return;
  }
  if (usage.remaining <= 0) {
    await sendMsg(token, chatId, `⚠️ سهمیه روزانه هوش مصنوعی شما تمام شده است\n\n(${usage.dailyLimit}/${usage.dailyLimit}) — فردا دوباره شارژ می‌شود.`);
    return;
  }
  await ctx.runMutation(internal.telegramBotExtras.setPendingInput, {
    telegramId,
    kind: "ai",
  });
  await sendMsg(token, chatId, `🤖 سؤال خود را از هوش مصنوعی بپرسید:\n\nسهمیه امروز: ${usage.sent}/${usage.dailyLimit} (باقی‌مانده: ${usage.remaining})\n\n(برای لغو /cancel را بفرستید)`);
}

async function handleSessionRequest(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
  if (!user) {
    await sendMsg(token, chatId, "❌ حساب شما متصل نیست. ابتدا از سایت حساب خود را متصل کنید.");
    return;
  }
  await ctx.runMutation(internal.telegramBotExtras.setPendingInput, {
    telegramId,
    kind: "session_title",
    payload: {},
  });
  await sendMsg(token, chatId, "📅 درخواست جلسه\n\n۱️⃣ موضوع جلسه را بنویسید:\n\n(برای لغو /cancel را بفرستید)");
}

/** Handle a plain text message that may belong to a pending bot flow. */
async function handlePendingText(ctx: any, token: string, chatId: number, telegramId: number, firstName: string, username: string | undefined, text: string): Promise<boolean> {
  const pending = await ctx.runQuery(internal.telegramBotExtras.getPendingInput, { telegramId });
  if (!pending) return false;

  // Linking-code entry — must run BEFORE the linked-user lookup because the
  // caller is not linked yet.
  if (pending.kind === "link_code") {
    await ctx.runMutation(internal.telegramBotExtras.clearPendingInput, { telegramId });
    await applyLinkingCode(ctx, token, chatId, telegramId, firstName, username, text);
    return true;
  }

  const user = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
  if (!user) {
    await ctx.runMutation(internal.telegramBotExtras.clearPendingInput, { telegramId });
    return false;
  }

  if (pending.kind === "ask") {
    await ctx.runMutation(internal.telegramBotExtras.clearPendingInput, { telegramId });
    const result = await ctx.runMutation(internal.telegramBotExtras.createBotQuestion, {
      userId: user._id,
      text,
      topic: "عمومی",
    });
    await sendMsg(token, chatId, "✅ سؤال شما ثبت شد و به مدیران اطلاع داده شد.\n\nپاسخ را از همین‌جا یا سایت دریافت می‌کنید.", {
      inline_keyboard: [[miniAppBtn("💬 مشاهده سؤالات", "/mini")]],
    });
    await notifyAdminsOfQuestion(
      { token }, admins(result), user.name ?? firstName, "عمومی", text,
    );
    return true;
  }

  if (pending.kind === "ai") {
    await ctx.runMutation(internal.telegramBotExtras.clearPendingInput, { telegramId });
    await sendMsg(token, chatId, "🤖 در حال فکر کردن…");
    const result = await ctx.runAction(api.telegramBotExtras.botAiAsk, {
      telegramId,
      prompt: text,
    });
    if (result.ok) {
      const truncated = result.answer.length > 3800 ? result.answer.slice(0, 3800) + "\n\n…" : result.answer;
      await sendMsg(token, chatId, `🤖 <b>پاسخ:</b>\n\n${truncated}\n\n📊 باقی‌مانده امروز: ${result.remaining}/${result.limit}`);
    } else {
      await sendMsg(token, chatId, `⚠️ ${result.error}`);
    }
    return true;
  }

  // Admin answer flow: pick a question number, then type the answer
  if (pending.kind === "answer_pick") {
    await ctx.runMutation(internal.telegramBotExtras.clearPendingInput, { telegramId });
    await handleAnswerPick(ctx, token, chatId, telegramId, text.trim());
    return true;
  }

  if (pending.kind === "answer_text") {
    await ctx.runMutation(internal.telegramBotExtras.clearPendingInput, { telegramId });
    const qid = (pending.payload ?? {}).questionId as string | undefined;
    const role = await ctx.runQuery(internal.telegramBotExtras.getBotUserRole, { telegramId });
    if (!qid || (role !== "admin" && role !== "site_admin" && role !== "mentor")) {
      await sendMsg(token, chatId, "⚠️ خطا در پاسخ‌دهی. دوباره /answer را بفرستید.");
      return true;
    }
    const me = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
    const result = await ctx.runMutation(internal.telegramBotExtras.answerBotQuestion, {
      questionId: qid as any,
      answer: text,
      answeredByName: me?.name ?? "مدیر",
    });
    if (result.ok) {
      await sendMsg(token, chatId, "✅ پاسخ شما ثبت شد.");
      // Notify the student in Telegram if they are linked
      if (result.studentTelegramId) {
        try {
          await sendMsg(token, result.studentTelegramId,
            `💬 <b>پاسخ به سؤال شما</b>\n\n${text.slice(0, 1500)}`, {
              inline_keyboard: [[{ text: "💬 سؤالات من", callback_data: "cmd_questions" }]],
            });
        } catch { /* ignore */ }
      }
    } else {
      await sendMsg(token, chatId, "⚠️ سؤال یافت نشد یا حذف شده است.");
    }
    return true;
  }

  // Session request multi-step: title → date → time → done
  if (pending.kind.startsWith("session_")) {
    const state = (pending.payload ?? {}) as Record<string, string>;
    if (pending.kind === "session_title") {
      await ctx.runMutation(internal.telegramBotExtras.setPendingInput, {
        telegramId,
        kind: "session_date",
        payload: { title: text },
      });
      await sendMsg(token, chatId, "۲️⃣ تاریخ پیشنهادی (مثلاً ۱۴۰۴/۰۷/۲۵):");
      return true;
    }
    if (pending.kind === "session_date") {
      await ctx.runMutation(internal.telegramBotExtras.setPendingInput, {
        telegramId,
        kind: "session_time",
        payload: { ...state, date: text },
      });
      await sendMsg(token, chatId, "۳️⃣ ساعت پیشنهادی (مثلاً ۱۶:۰۰):");
      return true;
    }
    if (pending.kind === "session_time") {
      await ctx.runMutation(internal.telegramBotExtras.clearPendingInput, { telegramId });
      const result = await ctx.runMutation(internal.telegramBotExtras.createBotSessionRequest, {
        userId: user._id,
        title: state.title ?? "جلسه منتورینگ",
        date: state.date ?? "—",
        time: text,
        notes: "ثبت‌شده از طریق ربات تلگرام",
      });
      if (result.ok) {
        await sendMsg(token, chatId, `✅ درخواست جلسه ثبت شد!\n\n📌 ${state.title}\n🕐 ${state.date} — ${text}\n👤 منتور: ${result.mentorName}\n\nبه منتور اطلاع داده شد؛ پس از تأیید، جلسه در لیست شما قرار می‌گیرد.`);
      } else {
        await sendMsg(token, chatId, "⚠️ فعلاً منتوری برای اختصاص یافت نشد. بعداً تلاش کنید.");
      }
      return true;
    }
  }

  return false;
}

// tiny helper so notifyAdminsOfQuestion can be called with the mutation result
function admins(result: { admins: { telegramId: number; name: string }[] }) {
  return result.admins;
}

// ── Admin: /answer <questionIndex> — answer an open question from Telegram ──
async function handleAnswerStart(ctx: any, token: string, chatId: number, telegramId: number) {
  const role = await ctx.runQuery(internal.telegramBotExtras.getBotUserRole, { telegramId });
  if (role !== "admin" && role !== "site_admin" && role !== "mentor") {
    await sendMsg(token, chatId, "❌ این دستور فقط برای مدیران و منتورها است.");
    return;
  }
  const open = await ctx.runQuery(internal.telegramBotExtras.listOpenBotQuestions, {});
  if (open.length === 0) {
    await sendMsg(token, chatId, "✅ سؤال بازی وجود ندارد. همه سؤالات پاسخ داده شده‌اند.");
    return;
  }
  let text = "💬 <b>سؤالات بازی</b>\n\n";
  open.forEach((q: any, i: number) => {
    text += `${i + 1}. ${q.topic}\n   ${q.text.slice(0, 80)}${q.text.length > 80 ? "…" : ""}\n   👤 ${q.studentName}\n\n`;
  });
  text += `برای پاسخ: <code>/answer 1</code> (شماره سؤال) را بفرستید.`;
  await ctx.runMutation(internal.telegramBotExtras.setPendingInput, {
    telegramId,
    kind: "answer_pick",
  });
  await sendMsg(token, chatId, text, {
    inline_keyboard: [[{ text: "❌ انصراف", callback_data: "cmd_cancel" }]],
  });
}

/** /answer N — select question N from the open list and ask for the answer text. */
async function handleAnswerPick(ctx: any, token: string, chatId: number, telegramId: number, rawNum: string) {
  const num = parseInt(rawNum.replace(/[^0-9]/g, ""), 10);
  const open = await ctx.runQuery(internal.telegramBotExtras.listOpenBotQuestions, {});
  if (!num || num < 1 || num > open.length) {
    await sendMsg(token, chatId, `⚠️ شماره نامعتبر است. عدد ۱ تا ${open.length} را بفرستید یا /answer را دوباره بزنید.`);
    return;
  }
  const q = open[num - 1];
  await ctx.runMutation(internal.telegramBotExtras.setPendingInput, {
    telegramId,
    kind: "answer_text",
    payload: { questionId: q._id },
  });
  await sendMsg(token, chatId,
    `💬 <b>پاسخ به سؤال ${num}</b>\n\n👤 ${q.studentName}\n📚 ${q.topic}\n\n${q.text}\n\n✍️ پاسخ خود را بنویسید و ارسال کنید:\n\n(برای لغو /cancel را بفرستید)`,
    { inline_keyboard: [[{ text: "❌ انصراف", callback_data: "cmd_cancel" }]] },
  );
}

// ── Admin: /cancel — abort any pending multi-step flow ──────────────────────
async function handleCancel(ctx: any, token: string, chatId: number, telegramId: number) {
  await ctx.runMutation(internal.telegramBotExtras.clearPendingInput, { telegramId });
  await sendMsg(token, chatId, "✅ عملیات لغو شد.", {
    inline_keyboard: [[{ text: "🚀 باز کردن Genova", callback_data: "cmd_genova" }]],
  });
}

// ── Command handlers ──────────────────────────────────────────────────────

/** Shared linking-by-code flow: used by `/start <CODE>` and the "کد دارم" button. */
async function applyLinkingCode(
  ctx: any,
  token: string,
  chatId: number,
  telegramId: number,
  firstName: string,
  username: string | undefined,
  rawCode: string,
) {
    const code = rawCode.trim().toUpperCase();
    const codeDoc = await ctx.runQuery(internal.telegramBot._findLinkingCode, { code });
    if (!codeDoc) {
      await sendMsg(token, chatId, "❌ لینک اتصال معتبر نیست یا منقضی شده است.\n\nلطفاً از سایت کد جدید دریافت کنید.");
      return;
    }
    if (Date.now() > codeDoc.expiresAt) {
      await sendMsg(token, chatId, "⏰ لینک اتصال منقضی شده است.\n\nلطفاً از سایت کد جدید دریافت کنید.");
      return;
    }
    if (codeDoc.usedAt && !codeDoc.telegramId && !codeDoc.baleId) {
      await sendMsg(token, chatId, "⚠️ این لینک اتصال قبلاً استفاده شده است.\n\nاگر می‌خواهید حساب جدیدی متصل کنید، از سایت کد جدید دریافت کنید.");
      return;
    }
    const existingUser = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
    if (existingUser && existingUser._id !== codeDoc.userId) {
      await sendMsg(token, chatId, "⚠️ این حساب Telegram قبلاً به حساب دیگری متصل شده است.\n\nبرای اتصال به حساب جدید، ابتدا اتصال قبلی را قطع کنید.");
      return;
    }
    if (existingUser && existingUser._id === codeDoc.userId) {
      await sendMsg(token, chatId, `✅ این حساب Telegram قبلاً به حساب Genova شما متصل شده است.\n\nخوش آمدید ${firstName}!`);
      return;
    }
    const result = await ctx.runMutation(internal.telegramBot._completeLinking, {
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
}

async function handleStart(ctx: any, token: string, chatId: number, telegramId: number, firstName: string, username: string | undefined, text: string) {
  const parts = text.split(/\s+/);
  const code = parts[1]?.trim().toUpperCase();

  // Account linking flow (/start <CODE>)
  if (code && code.length >= 6) {
    await applyLinkingCode(ctx, token, chatId, telegramId, firstName, username, code);
    return;
  }

  // Check if user is linked — if not, prompt for code
  const existingUser = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
  if (!existingUser) {
    await sendMsg(token, chatId, `سلام ${firstName}! 👋\n\nحساب شما هنوز به Genova متصل نشده است.\n\n🔑 آیا کد اتصال حساب دارید؟`, {
      inline_keyboard: [
        [{ text: "🔑 کد دارم", callback_data: "cmd_enter_code" }],
        [{ text: "📋 دریافت کد از سایت", url: `${SITE_URL}/profile` }],
      ],
    });
    return;
  }

  // Normal /start — welcome with inline keyboard
  // Role badge in the welcome message for admins/mentors
  const role = await ctx.runQuery(internal.telegramBotExtras.getBotUserRole, { telegramId });
  const roleLabel =
    role === "admin" || role === "site_admin" ? "\n\n🛡️ شما مدیر سامانه هستید — با /answer به سؤالات پاسخ دهید."
    : role === "mentor" ? "\n\n🎓 شما منتور هستید — با /answer به سؤالات پاسخ دهید."
    : "";

  const welcomeMsg = `سلام ${firstName}! 👋\nبه Genova خوش آمدید.\n\nاز دکمه‌های پایین صفحه استفاده کنید یا دستور بفرستید:\n🤖 /ai — هوش مصنوعی\n💬 /ask — ثبت سؤال\n📅 /session — درخواست جلسه${roleLabel}`;

  // Reference-style layout: two rows of two, one wide referral row, one
  // wide mini-app row — glued to the message keyboard (persistent).
  await sendMsg(token, chatId, welcomeMsg, GENOVA_REPLY_KEYBOARD);
}

async function handleEnterCode(ctx: any, token: string, chatId: number, telegramId: number) {
  await ctx.runMutation(internal.telegramBotExtras.setPendingInput, {
    telegramId,
    kind: "link_code",
  });
  await sendMsg(token, chatId, "لطفاً کد اتصال حساب خود را ارسال کنید:\n\n(کد ۸ کاراکتری که از بخش پروفایل سایت دریافت کرده‌اید)", {
    inline_keyboard: [[{ text: "❌ انصراف", callback_data: "cmd_cancel" }]],
  });
}

async function handleHelp(ctx: any, token: string, chatId: number) {
  const text = `📖 <b>راهنمای Genova</b>

/start — شروع کار با Genova
🤖 /ai — سؤال از هوش مصنوعی (طبق سهمیه حساب شما)
💬 /ask — ثبت سؤال از مدیران
📅 /sessions — جلسات من + درخواست جلسه
💬 /questions — سؤالات من
👤 /profile — مشاهده پروفایل
🔔 /notifications — اعلان‌ها
❌ /cancel — لغو عملیات جاری
🤖 /answer — پاسخ به سؤالات (فقط مدیر/منتور)
🎁 /referral — معرفی به دوستان (سکه رایگان)
/help — نمایش این راهنما
🚀 /genova — باز کردن Genova

💡 از دکمه‌های چسبیده به کیبورد هم می‌توانید استفاده کنید.`;

  // Re-show the persistent reply keyboard so buttons stay glued to the input
  await sendMsg(token, chatId, text, GENOVA_REPLY_KEYBOARD);
}

async function handleUnlink(ctx: any, token: string, chatId: number, telegramId: number) {
  const result = await ctx.runMutation(internal.telegramBot._unlinkTelegramById, { telegramId });
  if (result?.success) {
    await sendMsg(token, chatId, "✅ اتصال Telegram قطع شد.\n\nبرای اتصال دوباره، از سایت کد جدید بگیرید و همین کد را در ربات ارسال کنید.", {
      inline_keyboard: [[{ text: "🔑 دریافت کد از سایت", url: `${SITE_URL}/dashboard` }]],
    });
  } else {
    await sendMsg(token, chatId, "❌ اتصالی برای این حساب پیدا نشد.");
  }
}

async function handleProfile(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
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
    inline_keyboard: [
      [miniAppBtn("🚀 باز کردن پروفایل", "/mini")],
      [{ text: "🔌 قطع اتصال Telegram", callback_data: "cmd_unlink" }],
    ],
  });
}

async function handleQuestions(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
  if (!user) {
    await sendMsg(token, chatId, "❌ حساب شما متصل نیست. ابتدا /start را ارسال کنید.");
    return;
  }

  // Bot has no auth session — use the internal bot query instead of api.mentor
  const questions = await ctx.runQuery(internal.telegramBotExtras.listMyBotQuestions, { studentId: user._id });

  if (questions.length === 0) {
    await sendMsg(token, chatId, "💬 سؤالی ثبت نکرده‌اید.", {
      inline_keyboard: [[{ text: "💬 ثبت سؤال جدید", callback_data: "cmd_ask" }]],
    });
    return;
  }

  let text = "💬 <b>سؤالات من</b>\n\n";
  questions.forEach((q: any, i: number) => {
    const status = q.status === "answered" ? "✅ پاسخ داده شده" : "⏳ در انتظار پاسخ";
    text += `${i + 1}. ${q.topic}\n   ${status}\n`;
    if (q.answer) text += `   ↳ ${String(q.answer).slice(0, 100)}${String(q.answer).length > 100 ? "…" : ""}\n`;
    text += `\n`;
  });

  await sendMsg(token, chatId, text, {
    inline_keyboard: [[
      { text: "💬 ثبت سؤال جدید", callback_data: "cmd_ask" },
      { text: "🔄 بروزرسانی", callback_data: "cmd_questions" },
    ]],
  });
}

async function handleSessions(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
  if (!user) {
    await sendMsg(token, chatId, "❌ حساب شما متصل نیست. ابتدا /start را ارسال کنید.");
    return;
  }

  // Bot has no auth session — use the internal bot query instead of api.mentor
  const mySessions = await ctx.runQuery(internal.telegramBotExtras.listMyBotSessions, { studentId: user._id });

  if (mySessions.length === 0) {
    await sendMsg(token, chatId, "📅 جلسه‌ای برای شما ثبت نشده است.", {
      inline_keyboard: [[
        { text: "📅 درخواست جلسه", callback_data: "cmd_session" },
        { text: "🔄 بروزرسانی", callback_data: "cmd_sessions" },
      ]],
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
    inline_keyboard: [[
      { text: "📅 درخواست جلسه جدید", callback_data: "cmd_session" },
      { text: "🔄 بروزرسانی", callback_data: "cmd_sessions" },
    ]],
  });
}

async function handleTasks(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
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
        inline_keyboard: [[miniAppBtn("📚 مشاهده Tasks", "/mini")]],
      });
      return;
    }

    let text = "📚 <b>Tasks من</b>\n\n";
    userTasks.forEach((t: any, i: number) => {
      text += `${i + 1}. ${t.title}\n   📅 ${t.date} — ${t.time}\n\n`;
    });

    await sendMsg(token, chatId, text, {
      inline_keyboard: [[miniAppBtn("📚 مشاهده همه Tasks", "/mini")]],
    });
  } catch {
    await sendMsg(token, chatId, "✅ در حال حاضر Task فعالی ندارید.", {
      inline_keyboard: [[miniAppBtn("📚 مشاهده Tasks", "/mini")]],
    });
  }
}

async function handleNotifications(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
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
    inline_keyboard: [[miniAppBtn("⚙️ تنظیمات اعلان‌ها", "/mini")]],
  });
}

async function handleGroups(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
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
      inline_keyboard: [[miniAppBtn("👥 مشاهده گروه‌ها", "/mini")]],
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
    inline_keyboard: [[miniAppBtn("👥 مشاهده گروه‌ها", "/mini")]],
  });
}

async function handleSettings(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
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
      [miniAppBtn("⚙️ باز کردن تنظیمات", "/mini")],
      [urlBtn("🌐 باز کردن سایت", SITE_URL)],
    ],
  });
}

async function handleGenova(ctx: any, token: string, chatId: number) {
  await sendMsg(token, chatId, "🚀 Genova", {
    inline_keyboard: [[miniAppBtn("🚀 باز کردن Genova", "/mini")]],
  });
}

/**
 * Referral — user shares their personal invite link; friends who join and
 * link their account earn them free coins (coins themselves are managed in
 * the mini app / website wallet).
 */
async function handleReferral(ctx: any, token: string, chatId: number, telegramId: number) {
  const user = await ctx.runQuery(internal.telegramBot._findUserByTelegramId, { telegramId });
  if (!user) {
    await sendMsg(token, chatId, "❌ حساب شما متصل نیست. ابتدا از سایت حساب خود را متصل کنید.", {
      inline_keyboard: [[urlBtn("🔗 اتصال حساب", `${SITE_URL}/auth`)]],
    });
    return;
  }

  // Personal deep link: REF + userId → /start REF<id> credits the inviter
  const botConfig = await ctx.runQuery(internal.telegramBot.getBotConfigPublic);
  const botUsername = (botConfig?.[0] as any)?.botUsername ?? null;
  const link = botUsername
    ? `https://t.me/${botUsername}?start=REF${user._id}`
    : `${SITE_URL}/auth?ref=${user._id}`;

  const text = `🎁 <b>معرفی به دوستان</b>\n\nبا اشتراک‌گذاری لینک زیر، به ازای هر دوستی که حسابش را متصل کند\n🪙 <b>سکه رایگان</b> دریافت می‌کنید.\n\n🔗 لینک اختصاصی شما:\n<code>${link}</code>\n\nبرای مشاهده سکه‌ها و اشتراک، مینی اپ را باز کنید:`;

  await sendMsg(token, chatId, text, {
    inline_keyboard: [[miniAppBtn("🚀 باز کردن Genova", "/mini")]],
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
    case "cmd_genova":
      await handleGenova(ctx, token, chatId);
      break;
    case "cmd_referral":
      await handleReferral(ctx, token, chatId, telegramId);
      break;
    case "cmd_ai":
      await handleAiStart(ctx, token, chatId, telegramId);
      break;
    case "cmd_ask":
      await handleAsk(ctx, token, chatId, telegramId);
      break;
    case "cmd_session":
      await handleSessionRequest(ctx, token, chatId, telegramId);
      break;
    case "cmd_enter_code":
      await handleEnterCode(ctx, token, chatId, telegramId);
      break;
    case "cmd_unlink":
      await handleUnlink(ctx, token, chatId, telegramId);
      break;
    case "cmd_answer":
      await handleAnswerStart(ctx, token, chatId, telegramId);
      break;
    case "cmd_cancel":
      await handleCancel(ctx, token, chatId, telegramId);
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

      const bots = await ctx.runQuery(internal.telegramBot.getBotConfigPublic);
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

    const bots = await ctx.runQuery(internal.telegramBot.getBotConfigPublic);
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
      case "unlink":
      case "disconnect":
        await handleUnlink(ctx, token, chatId, telegramId);
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
      case "ai":
        await handleAiStart(ctx, token, chatId, telegramId);
        break;
      case "ask":
        await handleAsk(ctx, token, chatId, telegramId);
        break;
      case "session":
        await handleSessionRequest(ctx, token, chatId, telegramId);
        break;
      case "answer":
        // /answer          → list open questions + set pending
        // /answer 2        → immediately select question 2
        if (cmdMatch?.[2]?.trim()) {
          await handleAnswerPick(ctx, token, chatId, telegramId, cmdMatch[2].trim());
        } else {
          await handleAnswerStart(ctx, token, chatId, telegramId);
        }
        break;
      case "cancel":
        await handleCancel(ctx, token, chatId, telegramId);
        break;
      default:
        if (cmd) {
          await sendMsg(token, chatId,
            `❓ دستور «/${cmd}» شناخته نشد.\n\nبرای مشاهده دستورات، /help را ارسال کنید.`,
            { inline_keyboard: [[{ text: "📖 راهنما", callback_data: "cmd_help" }]] }
          );
        } else if (text) {
          // Reply-keyboard buttons arrive as plain text — map them to commands first
          const kbCmd = replyTextToCommand(text);
          if (kbCmd) {
            await handleCallbackQuery(ctx, token, chatId, telegramId, firstName, username, kbCmd);
            break;
          }
          // Any other plain text: try the pending bot flows (AI / ask / session / answer)
          const handled = await handlePendingText(ctx, token, chatId, telegramId, firstName, username, text);
          if (!handled) {
            await sendMsg(token, chatId,
              `برای شروع /start را ارسال کنید.\nبرای راهنما /help را ارسال کنید.`,
              { inline_keyboard: [[{ text: "📖 راهنما", callback_data: "cmd_help" }]] }
            );
          }
        }
    }

    return new Response("OK", { status: 200 });
  } catch (err: unknown) {
    console.error("Telegram webhook error:", err);
    return new Response("OK", { status: 200 });
  }
});
