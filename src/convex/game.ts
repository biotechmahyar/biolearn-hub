/**
 * Genova Compute Game — backend
 * ─────────────────────────────────────────────────────────────────────────────
 * A scientific-computation mining game with an internal, hash-chained token
 * ledger ("GVA"). Design rules:
 *
 *  • The server generates every computation job AND holds its expected answer,
 *    so tokens can never be claimed or forged from the client.
 *  • Each wallet has an append-only ledger where every entry stores the hash of
 *    the previous entry — a tamper-evident chain that anyone can verify from
 *    the UI (`getWalletByAddress` returns the chain head).
 *  • Tokens are tradable inside the platform: direct transfer by Genova email,
 *    and an exchange desk where tokens are escrowed while an offer is open.
 *
 * This is an *internal* chain, not a public blockchain: no wallet keys, no gas.
 * Bridging GVA to a public chain (ERC-20) would be a separate integration step
 * and is intentionally not faked here.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const TOKEN_SYMBOL = "GVA";
const TOKEN_NAME = "Genova Compute Token";
/** Anti-farming cap: solved jobs per rolling 24h. */
const DAILY_JOB_LIMIT = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The admin switch is authoritative for both the page and game mutations. */
async function assertGameEnabled(ctx: any) {
  const setting = await ctx.db
    .query("siteSettings")
    .withIndex("by_key", (q: any) => q.eq("key", "game.enabled"))
    .first();
  if (setting?.value === "false") {
    throw new Error("بازی ژنوا در حال حاضر غیرفعال است.");
  }
}

// ── Hashing (hash chain) ────────────────────────────────────────────────────

/**
 * SHA-256 when Web Crypto is available (Convex runtime), with a deterministic
 * non-cryptographic fallback so the ledger keeps working in any runtime.
 */
async function digest(input: string): Promise<string> {
  try {
    const subtle = (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
    if (subtle) {
      const buffer = await subtle.digest("SHA-256", new TextEncoder().encode(input));
      return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    // fall through to the deterministic fallback below
  }
  let h1 = 5381;
  let h2 = 52711;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 = ((h1 * 33) ^ code) >>> 0;
    h2 = ((h2 * 31) + code) >>> 0;
  }
  return (
    h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")
  ).repeat(2);
}

async function walletAddressFor(userId: string): Promise<string> {
  const hash = await digest(`genova-wallet:${userId}`);
  return `gnv1${hash.slice(0, 30)}`;
}

// ── Wallet helpers ──────────────────────────────────────────────────────────

async function ensureWallet(ctx: any, user: { _id: string; name?: string | null }) {
  const existing = await ctx.db
    .query("gameWallets")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .first();
  if (existing) return existing;

  const now = Date.now();
  const address = await walletAddressFor(user._id as string);
  const id = await ctx.db.insert("gameWallets", {
    userId: user._id,
    address,
    balance: 0,
    totalEarned: 0,
    totalSpent: 0,
    jobsSolved: 0,
    createdAt: now,
    updatedAt: now,
  });
  return await ctx.db.get(id);
}

async function lastLedgerEntry(ctx: any, userId: any) {
  return await ctx.db
    .query("gameLedger")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .order("desc")
    .first();
}

/**
 * Append a ledger entry with the previous entry's hash chained in, and update
 * the wallet balance in the same mutation (so bookkeeping can never drift).
 */
async function appendLedger(
  ctx: any,
  params: {
    userId: any;
    kind: string;
    amount: number;
    memo?: string;
    counterpartyId?: any;
    jobId?: any;
  },
) {
  const wallet = await ctx.db
    .query("gameWallets")
    .withIndex("by_user", (q: any) => q.eq("userId", params.userId))
    .first();
  if (!wallet) throw new Error("کیف پول یافت نشد.");

  const balanceAfter = wallet.balance + params.amount;
  if (balanceAfter < 0) throw new Error("موجودی توکن کافی نیست.");

  const previous = await lastLedgerEntry(ctx, params.userId);
  const prevHash = previous?.hash ?? "genesis";
  const createdAt = Date.now();
  const hash = await digest(
    [
      prevHash,
      params.userId,
      params.kind,
      params.amount,
      balanceAfter,
      params.memo ?? "",
      createdAt,
    ].join("|"),
  );

  await ctx.db.insert("gameLedger", {
    userId: params.userId,
    kind: params.kind,
    amount: params.amount,
    balanceAfter,
    memo: params.memo,
    counterpartyId: params.counterpartyId,
    jobId: params.jobId,
    prevHash,
    hash,
    createdAt,
  });

  await ctx.db.patch(wallet._id, {
    balance: balanceAfter,
    totalEarned: wallet.totalEarned + (params.amount > 0 ? params.amount : 0),
    totalSpent: wallet.totalSpent + (params.amount < 0 ? -params.amount : 0),
    updatedAt: createdAt,
  });

  return { hash, prevHash, balanceAfter };
}

// ── Job generation (scientific computations) ────────────────────────────────

interface GeneratedJob {
  kind: string;
  prompt: string;
  params: Record<string, unknown>;
  answer: string;
  reward: number;
}

const weightTable: Record<string, number> = { A: 0, T: 0, C: 1, G: 1 };
const COMPLEMENT: Record<string, string> = { A: "T", T: "A", C: "G", G: "C" };

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomSequence(length: number) {
  return Array.from({ length }, () => "ATCG"[randomInt(0, 3)]).join("");
}

const MOLECULES = [
  { name: "NaCl", mw: 58.44 },
  { name: "گلوکز", mw: 180.16 },
  { name: "Tris", mw: 121.14 },
  { name: "EDTA", mw: 372.24 },
  { name: "MgCl₂", mw: 95.21 },
];

function generateJob(): GeneratedJob {
  const roll = randomInt(0, 6);

  if (roll === 0) {
    const sequence = randomSequence(randomInt(24, 40));
    const gc = sequence.split("").filter((base) => weightTable[base] === 1).length;
    const percent = ((gc / sequence.length) * 100).toFixed(1);
    return {
      kind: "gc_content",
      prompt: `درصد محتوای GC این توالی را حساب کن: ${sequence}`,
      params: { sequence },
      answer: percent,
      reward: 10,
    };
  }

  if (roll === 1) {
    const sequence = randomSequence(randomInt(18, 26));
    const reverseComplement = sequence
      .split("")
      .reverse()
      .map((base) => COMPLEMENT[base])
      .join("");
    return {
      kind: "reverse_complement",
      prompt: `توالی مکمل معکوس (reverse complement) این رشته را بنویس: ${sequence}`,
      params: { sequence },
      answer: reverseComplement,
      reward: 14,
    };
  }

  if (roll === 2) {
    const primer = randomSequence(randomInt(16, 22));
    const at = primer.split("").filter((base) => weightTable[base] === 0).length;
    const gc = primer.length - at;
    const tm = 2 * at + 4 * gc;
    return {
      kind: "melting_temperature",
      prompt: `با فرمول والدشو Tm این پرایمر را حساب کن (۲(A+T) + ۴(G+C)): ${primer}`,
      params: { primer },
      answer: String(tm),
      reward: 12,
    };
  }

  if (roll === 3) {
    const molecule = MOLECULES[randomInt(0, MOLECULES.length - 1)];
    const massMg = Number((randomInt(10, 99) / 10).toFixed(1));
    const volumeMl = randomInt(50, 500);
    const molarityMm = (massMg / molecule.mw / volumeMl) * 1000;
    const rounded = molarityMm.toFixed(3);
    return {
      kind: "molarity",
      prompt: `${massMg} میلی‌گرم از ${molecule.name} (وزن مولکولی ${molecule.mw}) را در ${volumeMl} میلی‌لیتر آب حل می‌کنیم. غلظت مولی بر حسب میلی‌مولار (mM) چقدر است؟`,
      params: { massMg, volumeMl, mw: molecule.mw, molecule: molecule.name },
      answer: rounded,
      reward: 18,
    };
  }

  if (roll === 4) {
    const stock = randomInt(5, 20) * 10;
    const target = randomInt(1, 9) * 5;
    const finalVolumeMl = randomInt(5, 50);
    const stockVolumeMl = (target * finalVolumeMl) / stock;
    return {
      kind: "dilution",
      prompt: `از محلول مادر ${stock} mg/mL چه حجمی (میلی‌لیتر) لازم است تا ${finalVolumeMl} میلی‌لیتر محلول ${target} mg/mL بسازیم؟ (C₁V₁ = C₂V₂)`,
      params: { stock, target, finalVolumeMl },
      answer: stockVolumeMl.toFixed(3),
      reward: 16,
    };
  }

  if (roll === 5) {
    const colonies = randomInt(30, 290);
    const exponent = randomInt(4, 7);
    const platedMl = 0.1;
    const cfuPerMl = Math.round(colonies / (Math.pow(10, -exponent) * platedMl));
    return {
      kind: "cfu_count",
      prompt: `${colonies} کلنی روی پلیتی که با ${platedMl} میلی‌لیتر از رقت ۱۰⁻${exponent} تلقیح شده شمارش شد. بار میکروبی نمونه بر حسب CFU/mL چقدر است؟`,
      params: { colonies, exponent, platedMl },
      answer: String(cfuPerMl),
      reward: 22,
    };
  }

  const reactions = randomInt(8, 32);
  const perReaction = randomInt(20, 50);
  const overage = 10;
  const total = Math.ceil((reactions * perReaction * (100 + overage)) / 100);
  return {
    kind: "master_mix",
    prompt: `برای ${reactions} واکنش PCR که هر کدام ${perReaction} میکرولیتر مستر‌میکس لازم دارد، با ۱۰٪ اضافه‌ی احتیاطی در مجموع چند میکرولیتر مستر‌میکس آماده می‌کنیم؟`,
    params: { reactions, perReaction, overage },
    answer: String(total),
    reward: 20,
  };
}

/** Normalize an answer so Persian digits / separators still match. */
function normalizeAnswer(raw: string) {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  let value = raw.trim().toLowerCase();
  value = value.replace(/[۰-۹]/g, (char) => String(persian.indexOf(char)));
  value = value.replace(/[٠-٩]/g, (char) => String(arabic.indexOf(char)));
  value = value.replace(/[٬,\s]/g, "");
  value = value.replace(/[٫]/g, ".");
  return value;
}

function answersMatch(expected: string, submitted: string) {
  const a = normalizeAnswer(expected);
  const b = normalizeAnswer(submitted);
  if (!b) return false;
  if (a === b) return true;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) {
    const tolerance = Math.max(Math.abs(na) * 0.005, 0.01);
    return Math.abs(na - nb) <= tolerance;
  }
  return false;
}

// ── Queries ─────────────────────────────────────────────────────────────────

/** My wallet, recent ledger entries and daily quota state (creates on first earn). */
export const getMyWallet = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const wallet = await ctx.db
      .query("gameWallets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const entries = await ctx.db
      .query("gameLedger")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(40);

    const since = Date.now() - DAY_MS;
    const recentJobs = await ctx.db
      .query("gameJobs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(60);
    const solvedToday = recentJobs.filter(
      (job) => job.status === "solved" && (job.solvedAt ?? 0) > since,
    ).length;

    const openJobs = recentJobs.filter((job) => job.status === "open");

    return {
      symbol: TOKEN_SYMBOL,
      name: TOKEN_NAME,
      address: wallet?.address ?? null,
      balance: wallet?.balance ?? 0,
      totalEarned: wallet?.totalEarned ?? 0,
      totalSpent: wallet?.totalSpent ?? 0,
      jobsSolved: wallet?.jobsSolved ?? 0,
      solvedToday,
      dailyLimit: DAILY_JOB_LIMIT,
      chainHead: entries[0]?.hash ?? null,
      ledger: entries,
      openJobs: openJobs.slice(0, 5),
    };
  },
});

/** Public wallet lookup: balance + ledger chain (for verification / trading). */
export const getWalletByAddress = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("gameWallets")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    if (!wallet) return null;
    const owner = await ctx.db.get(wallet.userId);
    const entries = await ctx.db
      .query("gameLedger")
      .withIndex("by_user", (q) => q.eq("userId", wallet.userId))
      .order("desc")
      .take(20);
    return {
      address: wallet.address,
      ownerName: owner?.name ?? "کاربر ژنوا",
      balance: wallet.balance,
      totalEarned: wallet.totalEarned,
      jobsSolved: wallet.jobsSolved,
      createdAt: wallet.createdAt,
      chainHead: entries[0]?.hash ?? null,
      ledger: entries.map((entry) => ({
        kind: entry.kind,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        hash: entry.hash,
        prevHash: entry.prevHash,
        createdAt: entry.createdAt,
      })),
    };
  },
});

/** Open exchange offers (+ my own offers in any state). */
export const listOffers = query({
  args: {},
  handler: async (ctx) => {
    const open = await ctx.db
      .query("gameOffers")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .take(40);

    const user = await getCurrentUser(ctx);
    const mine = user
      ? await ctx.db
          .query("gameOffers")
          .withIndex("by_seller", (q) => q.eq("sellerId", user._id))
          .order("desc")
          .take(20)
      : [];

    const bestPrice = open.reduce(
      (acc: number | null, offer) =>
        acc === null || offer.unitPriceToman < acc ? offer.unitPriceToman : acc,
      null,
    );
    const totalVolume = open.reduce((acc, offer) => acc + offer.amount, 0);

    return { open, mine, bestPrice, totalVolume };
  },
});

/** Top miners (public leaderboard). */
export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const wallets = await ctx.db.query("gameWallets").collect();
    const sorted = wallets
      .sort((a, b) => b.totalEarned - a.totalEarned)
      .slice(0, 10);
    return await Promise.all(
      sorted.map(async (wallet) => {
        const owner = await ctx.db.get(wallet.userId);
        return {
          name: owner?.name ?? "کاربر ژنوا",
          address: wallet.address,
          totalEarned: wallet.totalEarned,
          balance: wallet.balance,
          jobsSolved: wallet.jobsSolved,
        };
      }),
    );
  },
});

// ── Mining ──────────────────────────────────────────────────────────────────

/** Server issues a fresh computation job (answer stays server-side). */
export const startJob = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای شرکت در بازی ابتدا وارد حساب شوید.");
    await assertGameEnabled(ctx);

    const since = Date.now() - DAY_MS;
    const recent = await ctx.db
      .query("gameJobs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(80);
    const solvedToday = recent.filter(
      (job) => job.status === "solved" && (job.solvedAt ?? 0) > since,
    ).length;
    if (solvedToday >= DAILY_JOB_LIMIT) {
      throw new Error(
        `سهمیه امروز شما تکمیل شده است (${DAILY_JOB_LIMIT} محاسبه). فردا دوباره سر بزنید.`,
      );
    }
    const openJob = recent.find((job) => job.status === "open");
    if (openJob) {
      return {
        jobId: openJob._id,
        kind: openJob.kind,
        prompt: openJob.prompt,
        params: openJob.params,
        reward: openJob.reward,
        resumed: true,
        solvedToday,
        dailyLimit: DAILY_JOB_LIMIT,
      };
    }

    const generated = generateJob();
    const jobId = await ctx.db.insert("gameJobs", {
      userId: user._id,
      kind: generated.kind,
      prompt: generated.prompt,
      params: generated.params,
      answer: generated.answer,
      reward: generated.reward,
      status: "open",
      createdAt: Date.now(),
    });

    return {
      jobId,
      kind: generated.kind,
      prompt: generated.prompt,
      params: generated.params,
      reward: generated.reward,
      resumed: false,
      solvedToday,
      dailyLimit: DAILY_JOB_LIMIT,
    };
  },
});

/** Verify the submitted computation and mint tokens on success. */
export const submitJob = mutation({
  args: { jobId: v.id("gameJobs"), answer: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ثبت پاسخ ابتدا وارد حساب شوید.");
    await assertGameEnabled(ctx);

    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("محاسبه یافت نشد.");
    if (job.userId !== user._id) throw new Error("این محاسبه متعلق به شما نیست.");
    if (job.status !== "open") throw new Error("این محاسبه قبلاً بسته شده است.");
    if (!args.answer.trim()) throw new Error("پاسخ را وارد کنید.");

    const correct = answersMatch(job.answer, args.answer);
    if (!correct) {
      await ctx.db.patch(job._id, {
        status: "failed",
        solvedAt: Date.now(),
      });
      return { correct: false as const, reward: 0, expected: null };
    }

    await ensureWallet(ctx, user);
    const ledger = await appendLedger(ctx, {
      userId: user._id,
      kind: "mint",
      amount: job.reward,
      memo: `پاداش محاسبه علمی (${job.kind})`,
      jobId: job._id,
    });
    await ctx.db.patch(job._id, { status: "solved", solvedAt: Date.now() });

    const wallet = await ctx.db
      .query("gameWallets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (wallet) {
      await ctx.db.patch(wallet._id, { jobsSolved: wallet.jobsSolved + 1 });
    }

    return {
      correct: true as const,
      reward: job.reward,
      balance: ledger.balanceAfter,
      hash: ledger.hash,
      prevHash: ledger.prevHash,
    };
  },
});

/** Give up on the current job so a new one can be issued. */
export const skipJob = mutation({
  args: { jobId: v.id("gameJobs") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    await assertGameEnabled(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== user._id) return { ok: true };
    if (job.status === "open") {
      await ctx.db.patch(job._id, { status: "failed", solvedAt: Date.now() });
    }
    return { ok: true };
  },
});

// ── Trading ─────────────────────────────────────────────────────────────────

/** Send tokens to another Genova user by email. */
export const transfer = mutation({
  args: {
    toEmail: v.string(),
    amount: v.number(),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای انتقال توکن ابتدا وارد حساب شوید.");
    await assertGameEnabled(ctx);
    if (!Number.isInteger(args.amount) || args.amount <= 0) {
      throw new Error("مقدار توکن باید یک عدد صحیح مثبت باشد.");
    }

    const email = args.toEmail.trim().toLowerCase();
    if (!email) throw new Error("ایمیل گیرنده لازم است.");
    if (email === (user.email ?? "").toLowerCase()) {
      throw new Error("انتقال به حساب خودتان امکان‌پذیر نیست.");
    }

    const recipient = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (!recipient) throw new Error("کاربری با این ایمیل در Genova ثبت نشده است.");

    await ensureWallet(ctx, user);
    const outgoing = await appendLedger(ctx, {
      userId: user._id,
      kind: "transfer_out",
      amount: -args.amount,
      memo: args.memo?.slice(0, 120) || `انتقال به ${recipient.name ?? email}`,
      counterpartyId: recipient._id,
    });

    await ensureWallet(ctx, recipient);
    await appendLedger(ctx, {
      userId: recipient._id,
      kind: "transfer_in",
      amount: args.amount,
      memo: args.memo?.slice(0, 120) || `دریافت از ${user.name ?? "کاربر ژنوا"}`,
      counterpartyId: user._id,
    });

    return { ok: true, balance: outgoing.balanceAfter, hash: outgoing.hash };
  },
});

/** List tokens for sale (tokens are escrowed until the offer is closed). */
export const createOffer = mutation({
  args: {
    amount: v.number(),
    unitPriceToman: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ثبت آگهی ابتدا وارد حساب شوید.");
    await assertGameEnabled(ctx);
    if (!Number.isInteger(args.amount) || args.amount <= 0) {
      throw new Error("مقدار توکن باید یک عدد صحیح مثبت باشد.");
    }
    if (!Number.isInteger(args.unitPriceToman) || args.unitPriceToman < 1) {
      throw new Error("قیمت هر توکن باید یک عدد صحیح (تومان) باشد.");
    }

    await ensureWallet(ctx, user);
    const escrow = await appendLedger(ctx, {
      userId: user._id,
      kind: "escrow_out",
      amount: -args.amount,
      memo: `رزرو توکن برای آگهی فروش (${args.amount} ${TOKEN_SYMBOL})`,
    });

    const offerId = await ctx.db.insert("gameOffers", {
      sellerId: user._id,
      sellerName: user.name ?? "کاربر ژنوا",
      amount: args.amount,
      unitPriceToman: args.unitPriceToman,
      status: "open",
      note: args.note?.slice(0, 200),
      createdAt: Date.now(),
    });

    return { ok: true, offerId, balance: escrow.balanceAfter };
  },
});

/** Cancel my offer and get the escrowed tokens back. */
export const cancelOffer = mutation({
  args: { offerId: v.id("gameOffers") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    await assertGameEnabled(ctx);
    const offer = await ctx.db.get(args.offerId);
    if (!offer) throw new Error("آگهی یافت نشد.");
    if (offer.sellerId !== user._id) throw new Error("این آگهی متعلق به شما نیست.");
    if (offer.status !== "open") throw new Error("این آگهی دیگر باز نیست.");

    await appendLedger(ctx, {
      userId: user._id,
      kind: "escrow_in",
      amount: offer.amount,
      memo: `بازگشت توکن از آگهی لغوشده (${offer.amount} ${TOKEN_SYMBOL})`,
    });
    await ctx.db.patch(offer._id, { status: "cancelled", closedAt: Date.now() });
    return { ok: true };
  },
});

/**
 * Accept an offer: escrowed tokens move to the buyer's wallet.
 * The fiat side is settled directly between the two students — the platform
 * never claims a payment happened.
 */
export const acceptOffer = mutation({
  args: { offerId: v.id("gameOffers") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    await assertGameEnabled(ctx);
    const offer = await ctx.db.get(args.offerId);
    if (!offer) throw new Error("آگهی یافت نشد.");
    if (offer.status !== "open") throw new Error("این آگهی دیگر باز نیست.");
    if (offer.sellerId === user._id) throw new Error("نمی‌توانید آگهی خودتان را بخرید.");

    await ensureWallet(ctx, user);
    const incoming = await appendLedger(ctx, {
      userId: user._id,
      kind: "trade_in",
      amount: offer.amount,
      memo: `خرید ${offer.amount} ${TOKEN_SYMBOL} از ${offer.sellerName}`,
      counterpartyId: offer.sellerId,
    });

    await ctx.db.patch(offer._id, {
      status: "settled",
      buyerId: user._id,
      buyerName: user.name ?? "کاربر ژنوا",
      closedAt: Date.now(),
    });

    return {
      ok: true,
      balance: incoming.balanceAfter,
      totalToman: offer.amount * offer.unitPriceToman,
      sellerName: offer.sellerName,
    };
  },
});
