import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getCurrentUser } from "./users";

// ══════════════════════════════════════════════════════════════════════════════
// ── WALLET ───────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/** Get or create wallet for current user */
export const getMyWallet = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const wallet = await ctx.db
      .query("wallet")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return wallet;
  },
});

/** Get wallet transactions for current user */
export const getMyTransactions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("walletTransactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

/** Admin: deposit funds into user wallet */
export const depositToWallet = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me || (me.role !== "admin" && me.role !== "site_admin"))
      throw new Error("دسترسی مدیریتی لازم است.");
    if (args.amount <= 0) throw new Error("مبلغ باید مثبت باشد.");

    let wallet = await ctx.db
      .query("wallet")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!wallet) {
      const walletId = await ctx.db.insert("wallet", {
        userId: args.userId,
        balance: args.amount,
        frozenBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
        updatedAt: Date.now(),
      });
      wallet = await ctx.db.get(walletId);
    } else {
      await ctx.db.patch(wallet._id, {
        balance: wallet.balance + args.amount,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("walletTransactions", {
      userId: args.userId,
      type: "deposit",
      amount: args.amount,
      description: args.description,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

/** Admin: withdraw from user wallet */
export const withdrawFromWallet = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me || (me.role !== "admin" && me.role !== "site_admin"))
      throw new Error("دسترسی مدیریتی لازم است.");
    if (args.amount <= 0) throw new Error("مبلغ باید مثبت باشد.");

    const wallet = await ctx.db
      .query("wallet")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!wallet) throw new Error("کیف پول یافت نشد.");
    if (wallet.balance < args.amount)
      throw new Error("موجودی کیف پول کافی نیست.");

    await ctx.db.patch(wallet._id, {
      balance: wallet.balance - args.amount,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("walletTransactions", {
      userId: args.userId,
      type: "withdrawal",
      amount: -args.amount,
      description: args.description,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── STORE PRODUCTS ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/** Create a new product listing */
export const createProduct = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("notes"),
      v.literal("flashcards"),
      v.literal("book"),
      v.literal("package"),
      v.literal("other"),
    ),
    condition: v.union(
      v.literal("new"),
      v.literal("like_new"),
      v.literal("used"),
    ),
    price: v.number(),
    stock: v.number(),
    images: v.array(v.string()),
    coverImage: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("برای ارسال آگهی ابتدا وارد شوید.");
    if (!args.title.trim()) throw new Error("عنوان الزامی است.");
    if (args.price < 1000) throw new Error("حداقل قیمت ۱,۰۰۰ تومان است.");

    const slug =
      args.title
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w\u0600-\u06FF-]/g, "")
        .toLowerCase() +
      "-" +
      Date.now().toString(36);

    const productId = await ctx.db.insert("storeProducts", {
      sellerId: userId,
      title: args.title.trim(),
      slug,
      description: args.description,
      category: args.category,
      condition: args.condition,
      price: args.price,
      images: args.images,
      coverImage: args.coverImage ?? args.images[0] ?? undefined,
      stock: args.stock,
      soldCount: 0,
      rating: 0,
      ratingCount: 0,
      status: "pending",
      boostLevel: "none",
      deliveryCities: ["tabriz"],
      tags: args.tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { ok: true, id: productId, slug };
  },
});

/** Update product listing */
export const updateProduct = mutation({
  args: {
    productId: v.id("storeProducts"),
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("notes"),
      v.literal("flashcards"),
      v.literal("book"),
      v.literal("package"),
      v.literal("other"),
    ),
    condition: v.union(
      v.literal("new"),
      v.literal("like_new"),
      v.literal("used"),
    ),
    price: v.number(),
    stock: v.number(),
    images: v.array(v.string()),
    coverImage: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ابتدا وارد شوید.");
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("محصول یافت نشد.");
    if (product.sellerId !== userId)
      throw new Error("فقط فروشنده می‌تواند محصول را ویرایش کند.");

    await ctx.db.patch(args.productId, {
      title: args.title.trim(),
      description: args.description,
      category: args.category,
      condition: args.condition,
      price: args.price,
      stock: args.stock,
      images: args.images,
      coverImage: args.coverImage ?? args.images[0] ?? undefined,
      tags: args.tags,
      status: "pending", // re-approve after edit
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

/** Delete own product */
export const deleteProduct = mutation({
  args: { productId: v.id("storeProducts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ابتدا وارد شوید.");
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("محصول یافت نشد.");
    if (product.sellerId !== userId)
      throw new Error("فقط فروشنده می‌تواند محصول را حذف کند.");
    await ctx.db.delete(args.productId);
    return { ok: true };
  },
});

/** List approved products (public) with filtering */
export const listProducts = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("notes"),
        v.literal("flashcards"),
        v.literal("book"),
        v.literal("package"),
        v.literal("other"),
      ),
    ),
    search: v.optional(v.string()),
    sort: v.optional(
      v.union(
        v.literal("newest"),
        v.literal("cheapest"),
        v.literal("expensive"),
        v.literal("popular"),
        v.literal("boosted"),
      ),
    ),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const pageSize = args.limit ?? 24;
    const page = args.page ?? 1;

    let all = await ctx.db
      .query("storeProducts")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    // Filter by category
    if (args.category) {
      all = all.filter((p) => p.category === args.category);
    }

    // Filter by search text
    if (args.search) {
      const s = args.search.toLowerCase();
      all = all.filter(
        (p) =>
          p.title.toLowerCase().includes(s) ||
          p.description.toLowerCase().includes(s) ||
          p.tags?.some((t) => t.toLowerCase().includes(s)),
      );
    }

    // Enrich with seller info
    const enriched = await Promise.all(
      all.map(async (p) => {
        const seller = await ctx.db.get(p.sellerId);
        return { ...p, sellerName: seller?.name ?? "ناشناس" };
      }),
    );

    // Sort: boosted items first
    const now = Date.now();
    enriched.sort((a, b) => {
      // Boosted items first
      const aBoosted =
        (a.boostLevel === "gold" && (a.boostExpiresAt ?? 0) > now) ||
        (a.boostLevel === "silver" && (a.boostExpiresAt ?? 0) > now);
      const bBoosted =
        (b.boostLevel === "gold" && (b.boostExpiresAt ?? 0) > now) ||
        (b.boostLevel === "silver" && (b.boostExpiresAt ?? 0) > now);
      if (aBoosted && !bBoosted) return -1;
      if (!aBoosted && bBoosted) return 1;

      // Then by sort preference
      switch (args.sort) {
        case "cheapest":
          return a.price - b.price;
        case "expensive":
          return b.price - a.price;
        case "popular":
          return b.soldCount - a.soldCount;
        case "boosted":
          if (a.boostLevel === "gold" && b.boostLevel !== "gold") return -1;
          if (a.boostLevel !== "gold" && b.boostLevel === "gold") return 1;
          return 0;
        default:
          return b.createdAt - a.createdAt;
      }
    });

    const total = enriched.length;
    const start = (page - 1) * pageSize;
    const items = enriched.slice(start, start + pageSize);

    return { items, total, page, totalPages: Math.ceil(total / pageSize) };
  },
});

/** Get single product by slug */
export const getProduct = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("storeProducts").collect();
    const product = all.find((p) => p.slug === args.slug);
    if (!product || product.status !== "approved") return null;

    const seller = await ctx.db.get(product.sellerId);
    const reviews = await ctx.db
      .query("storeReviews")
      .withIndex("by_product", (q) => q.eq("productId", product._id))
      .order("desc")
      .take(20);

    const enrichedReviews = await Promise.all(
      reviews.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        return { ...r, userName: user?.name ?? "ناشناس" };
      }),
    );

    return {
      ...product,
      sellerName: seller?.name ?? "ناشناس",
      reviews: enrichedReviews,
    };
  },
});

/** Get my own products (seller panel) */
export const getMyProducts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("storeProducts")
      .withIndex("by_seller", (q) => q.eq("sellerId", userId))
      .order("desc")
      .collect();
  },
});

/** Admin: list all products for approval */
export const adminListAllProducts = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me || (me.role !== "admin" && me.role !== "site_admin")) return [];

    let products = await ctx.db.query("storeProducts").collect();
    if (args.status) {
      products = products.filter((p) => p.status === args.status);
    }

    return Promise.all(
      products.map(async (p) => {
        const seller = await ctx.db.get(p.sellerId);
        return { ...p, sellerName: seller?.name ?? "ناشناس" };
      }),
    );
  },
});

/** Admin: approve/reject product */
export const adminReviewProduct = mutation({
  args: {
    productId: v.id("storeProducts"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me || (me.role !== "admin" && me.role !== "site_admin"))
      throw new Error("دسترسی مدیریتی لازم است.");

    await ctx.db.patch(args.productId, {
      status: args.status,
      rejectionReason:
        args.status === "rejected" ? args.rejectionReason : undefined,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── STORE ORDERS ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/** Purchase a product */
export const purchaseProduct = mutation({
  args: {
    productId: v.id("storeProducts"),
    quantity: v.number(),
    deliveryCity: v.string(),
    deliveryAddress: v.optional(v.string()),
    deliveryNote: v.optional(v.string()),
    couponCode: v.optional(v.string()),
    payWithWallet: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("برای خرید ابتدا وارد شوید.");
    if (args.quantity < 1) throw new Error("تعداد باید حداقل ۱ باشد.");

    // Central payment gateway enforcement (wallet payments bypass the gateway)
    if (!args.payWithWallet) {
      const paymentSetting = await ctx.db
        .query("siteSettings")
        .withIndex("by_key", (q) => q.eq("key", "payment.enabled"))
        .first();
      const paymentEnabled = paymentSetting
        ? (() => { try { return JSON.parse(paymentSetting.value); } catch { return true; } })()
        : true;
      if (!paymentEnabled) {
        throw new Error("پرداخت آنلاین موقتاً غیرفعال است — از کیف پول استفاده کنید یا بعداً تلاش کنید.");
      }
    }

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("محصول یافت نشد.");
    if (product.status !== "approved")
      throw new Error("محصول در دسترس نیست.");
    if (product.sellerId === userId)
      throw new Error("نمی‌توانید محصول خودتان را بخرید.");
    if (product.stock < args.quantity)
      throw new Error("موجودی کافی نیست.");
    if (!product.deliveryCities.includes(args.deliveryCity))
      throw new Error("ارسال به این شهر پشتیبانی نمی‌شود.");

    const COMMISSION_RATE = 0.09; // 9% base commission
    let unitPrice = product.price;
    let discountAmount = 0;

    // Apply coupon if provided
    if (args.couponCode) {
      const coupon = await ctx.db
        .query("storeCoupons")
        .withIndex("by_code", (q) => q.eq("code", args.couponCode!.toUpperCase()))
        .first();
      if (coupon && coupon.active && coupon.usedCount < coupon.maxUses) {
        if (!coupon.expiresAt || coupon.expiresAt > Date.now()) {
          const subtotal = unitPrice * args.quantity;
          if (subtotal >= coupon.minPurchase) {
            discountAmount = Math.min(
              Math.round(subtotal * coupon.percent / 100),
              coupon.maxDiscount,
            );
            await ctx.db.patch(coupon._id, {
              usedCount: coupon.usedCount + 1,
            });
          }
        }
      }
    }

    const subtotal = unitPrice * args.quantity;
    const total = subtotal - discountAmount;
    const commission = Math.round(total * COMMISSION_RATE);
    const sellerEarning = total - commission;

    // Check wallet balance if paying with wallet
    if (args.payWithWallet) {
      const wallet = await ctx.db
        .query("wallet")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (!wallet || wallet.balance < total)
        throw new Error("موجودی کیف پول کافی نیست.");

      // Deduct from wallet
      await ctx.db.patch(wallet._id, {
        balance: wallet.balance - total,
        frozenBalance: wallet.frozenBalance + total,
        totalSpent: wallet.totalSpent + total,
        updatedAt: Date.now(),
      });

      await ctx.db.insert("walletTransactions", {
        userId,
        type: "purchase",
        amount: -total,
        description: `خرید: ${product.title}`,
        createdAt: Date.now(),
      });
    }

    const invoiceNumber =
      "ST-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

    const orderId = await ctx.db.insert("storeOrders", {
      buyerId: userId,
      sellerId: product.sellerId,
      productId: args.productId,
      quantity: args.quantity,
      unitPrice,
      commission,
      total,
      sellerEarning,
      status: args.payWithWallet ? "paid" : "pending_payment",
      deliveryCity: args.deliveryCity,
      deliveryAddress: args.deliveryAddress,
      deliveryNote: args.deliveryNote,
      paidWithWallet: args.payWithWallet,
      invoiceNumber,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update stock
    await ctx.db.patch(args.productId, {
      stock: product.stock - args.quantity,
      soldCount: product.soldCount + args.quantity,
      status: product.stock - args.quantity <= 0 ? "sold_out" : product.status,
      updatedAt: Date.now(),
    });

    return { ok: true, orderId, invoiceNumber };
  },
});

/** Get my purchases */
export const getMyPurchases = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("storeOrders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", userId))
      .order("desc")
      .collect();
  },
});

/** Get my sales (seller) */
export const getMySales = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("storeOrders")
      .withIndex("by_seller", (q) => q.eq("sellerId", userId))
      .order("desc")
      .collect();
  },
});

/** Seller: confirm shipment */
export const confirmShipment = mutation({
  args: { orderId: v.id("storeOrders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ابتدا وارد شوید.");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("سفارش یافت نشد.");
    if (order.sellerId !== userId) throw new Error("دسترسی ندارید.");
    if (order.status !== "paid") throw new Error("وضعیت سفارش نامعتبر است.");

    await ctx.db.patch(args.orderId, {
      status: "shipped",
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Buyer: confirm delivery */
export const confirmDelivery = mutation({
  args: { orderId: v.id("storeOrders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ابتدا وارد شوید.");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("سفارش یافت نشد.");
    if (order.buyerId !== userId) throw new Error("دسترسی ندارید.");
    if (order.status !== "shipped")
      throw new Error("سفارش هنوز ارسال نشده است.");

    await ctx.db.patch(args.orderId, {
      status: "completed",
      updatedAt: Date.now(),
    });

    // Release funds to seller wallet
    let sellerWallet = await ctx.db
      .query("wallet")
      .withIndex("by_user", (q) => q.eq("userId", order.sellerId))
      .first();

    if (!sellerWallet) {
      await ctx.db.insert("wallet", {
        userId: order.sellerId,
        balance: order.sellerEarning,
        frozenBalance: 0,
        totalEarned: order.sellerEarning,
        totalSpent: 0,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(sellerWallet._id, {
        balance: sellerWallet.balance + order.sellerEarning,
        frozenBalance: Math.max(
          0,
          sellerWallet.frozenBalance - order.total,
        ),
        totalEarned: sellerWallet.totalEarned + order.sellerEarning,
        updatedAt: Date.now(),
      });
    }

    // Record sale earning for seller
    await ctx.db.insert("walletTransactions", {
      userId: order.sellerId,
      type: "sale",
      amount: order.sellerEarning,
      description: `فروش: سفارش ${order.invoiceNumber}`,
      relatedOrderId: String(order._id),
      relatedProductId: String(order.productId),
      createdAt: Date.now(),
    });

    // Record commission for platform
    await ctx.db.insert("walletTransactions", {
      userId: order.sellerId,
      type: "commission",
      amount: -order.commission,
      description: `کارمزد سیستم: سفارش ${order.invoiceNumber}`,
      relatedOrderId: String(order._id),
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

/** Buyer: request refund */
export const requestRefund = mutation({
  args: {
    orderId: v.id("storeOrders"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ابتدا وارد شوید.");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("سفارش یافت نشد.");
    if (order.buyerId !== userId) throw new Error("دسترسی ندارید.");
    if (!["paid", "shipped"].includes(order.status))
      throw new Error("وضعیت سفارش قابل بازگشت نیست.");

    await ctx.db.patch(args.orderId, {
      status: "refunded",
      updatedAt: Date.now(),
    });

    // Refund buyer
    if (order.paidWithWallet) {
      let buyerWallet = await ctx.db
        .query("wallet")
        .withIndex("by_user", (q) => q.eq("userId", order.buyerId))
        .first();
      if (buyerWallet) {
        await ctx.db.patch(buyerWallet._id, {
          balance: buyerWallet.balance + order.total,
          frozenBalance: Math.max(
            0,
            buyerWallet.frozenBalance - order.total,
          ),
          updatedAt: Date.now(),
        });
        await ctx.db.insert("walletTransactions", {
          userId: order.buyerId,
          type: "refund",
          amount: order.total,
          description: `بازگشت وجه: ${args.reason}`,
          relatedOrderId: String(order._id),
          createdAt: Date.now(),
        });
      }
    }

    // Restore stock
    const product = await ctx.db.get(order.productId);
    if (product) {
      await ctx.db.patch(order.productId, {
        stock: product.stock + order.quantity,
        status: product.status === "sold_out" ? "approved" : product.status,
        updatedAt: Date.now(),
      });
    }

    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── BOOST / PROMOTION ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/** Boost a product listing */
export const boostProduct = mutation({
  args: {
    productId: v.id("storeProducts"),
    boostLevel: v.union(v.literal("silver"), v.literal("gold")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ابتدا وارد شوید.");
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("محصول یافت نشد.");
    if (product.sellerId !== userId)
      throw new Error("فقط فروشنده می‌تواند محصول را تبلیغ کند.");

    const BOOST_PRICES: Record<string, { cost: number; days: number }> = {
      silver: { cost: 15000, days: 7 },   // 4.5% of 333K ≈ 15K
      gold: { cost: 30000, days: 30 },     // 9% of 333K ≈ 30K
    };

    const config = BOOST_PRICES[args.boostLevel];
    const wallet = await ctx.db
      .query("wallet")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!wallet || wallet.balance < config.cost)
      throw new Error("موجودی کیف پول کافی نیست.");

    // Extend boost if already active
    const currentExpiry =
      product.boostLevel === args.boostLevel ? (product.boostExpiresAt ?? 0) : Date.now();
    const newExpiry = Math.max(currentExpiry, Date.now()) + config.days * 86400000;

    await ctx.db.patch(args.productId, {
      boostLevel: args.boostLevel,
      boostExpiresAt: newExpiry,
      updatedAt: Date.now(),
    });

    // Deduct from wallet
    await ctx.db.patch(wallet._id, {
      balance: wallet.balance - config.cost,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("walletTransactions", {
      userId,
      type: "boost",
      amount: -config.cost,
      description: `تبلیغ آگهی: ${args.boostLevel === "gold" ? "طلایی ۳۰ روز" : "نقره‌ای ۱ هفته"}`,
      relatedProductId: String(args.productId),
      createdAt: Date.now(),
    });

    await ctx.db.insert("boostTransactions", {
      productId: args.productId,
      sellerId: userId,
      boostLevel: args.boostLevel,
      amount: config.cost,
      durationDays: config.days,
      expiresAt: newExpiry,
      createdAt: Date.now(),
    });

    return { ok: true, expiresAt: newExpiry };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── REVIEWS ──────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/** Add a review for a product */
export const addReview = mutation({
  args: {
    productId: v.id("storeProducts"),
    rating: v.number(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ابتدا وارد شوید.");
    if (args.rating < 1 || args.rating > 5)
      throw new Error("امتیاز باید بین ۱ تا ۵ باشد.");

    // Check if already reviewed
    const existing = await ctx.db
      .query("storeReviews")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", userId).eq("productId", args.productId),
      )
      .first();
    if (existing) throw new Error("شما قبلاً این محصول را امتیاز داده‌اید.");

    // Verify buyer has completed order for this product
    const order = await ctx.db
      .query("storeOrders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", userId))
      .collect();
    const hasBought = order.some(
      (o) =>
        String(o.productId) === String(args.productId) &&
        o.status === "completed",
    );
    if (!hasBought)
      throw new Error("فقط خریداران محصول می‌توانند نظر بدهند.");

    await ctx.db.insert("storeReviews", {
      productId: args.productId,
      userId,
      rating: args.rating,
      text: args.text,
      createdAt: Date.now(),
    });

    // Update product average rating
    const reviews = await ctx.db
      .query("storeReviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await ctx.db.patch(args.productId, {
      rating: Math.round(avgRating * 10) / 10,
      ratingCount: reviews.length,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── STORE STATS (admin dashboard) ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const getStoreStats = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me || (me.role !== "admin" && me.role !== "site_admin")) return null;

    const allProducts = await ctx.db.query("storeProducts").collect();
    const allOrders = await ctx.db.query("storeOrders").collect();
    const pendingProducts = allProducts.filter(
      (p) => p.status === "pending",
    ).length;
    const totalRevenue = allOrders
      .filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + o.commission, 0);
    const totalSales = allOrders.filter(
      (o) => o.status === "completed",
    ).length;
    const activeProducts = allProducts.filter(
      (p) => p.status === "approved",
    ).length;

    return {
      totalProducts: allProducts.length,
      activeProducts,
      pendingProducts,
      totalOrders: allOrders.length,
      totalSales,
      totalRevenue,
    };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── ADMIN STORE COUPONS ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const adminCreateStoreCoupon = mutation({
  args: {
    code: v.string(),
    percent: v.number(),
    maxDiscount: v.number(),
    minPurchase: v.number(),
    maxUses: v.number(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me || (me.role !== "admin" && me.role !== "site_admin"))
      throw new Error("دسترسی مدیریتی لازم است.");

    await ctx.db.insert("storeCoupons", {
      code: args.code.toUpperCase(),
      percent: args.percent,
      maxDiscount: args.maxDiscount,
      minPurchase: args.minPurchase,
      active: true,
      maxUses: args.maxUses,
      usedCount: 0,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

export const adminListStoreCoupons = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me || (me.role !== "admin" && me.role !== "site_admin")) return [];
    return await ctx.db.query("storeCoupons").order("desc").collect();
  },
});

export const adminDeleteStoreCoupon = mutation({
  args: { couponId: v.id("storeCoupons") },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me || (me.role !== "admin" && me.role !== "site_admin"))
      throw new Error("دسترسی مدیریتی لازم است.");
    await ctx.db.delete(args.couponId);
    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── ADMIN ALL ORDERS ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const adminListAllOrders = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me || (me.role !== "admin" && me.role !== "site_admin")) return [];

    const orders = await ctx.db
      .query("storeOrders")
      .order("desc")
      .collect();

    return Promise.all(
      orders.map(async (o) => {
        const buyer = await ctx.db.get(o.buyerId);
        const seller = await ctx.db.get(o.sellerId);
        const product = await ctx.db.get(o.productId);
        return {
          ...o,
          buyerName: buyer?.name ?? "ناشناس",
          sellerName: seller?.name ?? "ناشناس",
          productTitle: product?.title ?? "حذف شده",
        };
      }),
    );
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── ADMIN WALLET MANAGEMENT ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const adminGetUserWallet = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me || (me.role !== "admin" && me.role !== "site_admin"))
      return null;

    const wallet = await ctx.db
      .query("wallet")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const transactions = await ctx.db
      .query("walletTransactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);

    return { wallet, transactions };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── CATEGORIES COUNT ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const getCategoryCounts = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("storeProducts")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    const counts: Record<string, number> = {
      notes: 0,
      flashcards: 0,
      book: 0,
      package: 0,
      other: 0,
    };
    for (const p of products) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    return counts;
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── SIMILAR PRODUCTS ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const getSimilarProducts = query({
  args: { productId: v.id("storeProducts"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return [];

    const all = await ctx.db
      .query("storeProducts")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    const similar = all
      .filter((p) => p._id !== args.productId && p.category === product.category)
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, args.limit ?? 4);

    return Promise.all(
      similar.map(async (p) => {
        const seller = await ctx.db.get(p.sellerId);
        return { ...p, sellerName: seller?.name ?? "ناشناس" };
      }),
    );
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── SHOPPING CART ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const getCart = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const items = await ctx.db
      .query("storeCart")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const enriched = await Promise.all(
      items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        const seller = product ? await ctx.db.get(product.sellerId) : null;
        return {
          ...item,
          product,
          sellerName: seller?.name ?? "ناشناس",
        };
      }),
    );
    return enriched.filter((e) => e.product);
  },
});

export const addToCart = mutation({
  args: {
    productId: v.id("storeProducts"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("برای افزودن به سبد خرید ابتدا وارد شوید.");
    if (args.quantity < 1) throw new Error("تعداد باید حداقل ۱ باشد.");

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("محصول یافت نشد.");
    if (product.status !== "approved") throw new Error("محصول در دسترس نیست.");
    if (product.sellerId === userId) throw new Error("نمی‌توانید محصول خودتان را به سبد اضافه کنید.");
    if (product.stock < args.quantity) throw new Error("موجودی کافی نیست.");

    const existing = await ctx.db
      .query("storeCart")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", userId).eq("productId", args.productId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: existing.quantity + args.quantity,
      });
    } else {
      await ctx.db.insert("storeCart", {
        userId,
        productId: args.productId,
        quantity: args.quantity,
        createdAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

export const updateCartItem = mutation({
  args: {
    cartItemId: v.id("storeCart"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ابتدا وارد شوید.");
    const item = await ctx.db.get(args.cartItemId);
    if (!item) throw new Error("آیتم سبد یافت نشد.");
    if (item.userId !== userId) throw new Error("دسترسی ندارید.");
    if (args.quantity < 1) {
      await ctx.db.delete(args.cartItemId);
    } else {
      await ctx.db.patch(args.cartItemId, { quantity: args.quantity });
    }
    return { ok: true };
  },
});

export const removeFromCart = mutation({
  args: { cartItemId: v.id("storeCart") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ابتدا وارد شوید.");
    const item = await ctx.db.get(args.cartItemId);
    if (!item) throw new Error("آیتم سبد یافت نشد.");
    if (item.userId !== userId) throw new Error("دسترسی ندارید.");
    await ctx.db.delete(args.cartItemId);
    return { ok: true };
  },
});

export const clearCart = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const items = await ctx.db
      .query("storeCart")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    return { ok: true };
  },
});

/** Checkout entire cart */
export const checkoutCart = mutation({
  args: {
    deliveryCity: v.string(),
    deliveryAddress: v.optional(v.string()),
    deliveryNote: v.optional(v.string()),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("برای خرید ابتدا وارد شوید.");

    const cartItems = await ctx.db
      .query("storeCart")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (cartItems.length === 0) throw new Error("سبد خرید خالی است.");

    const COMMISSION_RATE = 0.09;
    const orderIds: string[] = [];
    let grandTotal = 0;
    let totalCommission = 0;
    let totalSellerEarnings = 0;

    // Apply coupon once to total
    let discountAmount = 0;
    if (args.couponCode) {
      const coupon = await ctx.db
        .query("storeCoupons")
        .withIndex("by_code", (q) => q.eq("code", args.couponCode!.toUpperCase()))
        .first();
      if (coupon && coupon.active && coupon.usedCount < coupon.maxUses && (!coupon.expiresAt || coupon.expiresAt > Date.now())) {
        const subtotal = cartItems.reduce((sum, item) => sum + item.quantity, 0); // rough calc
        // We'll apply after per-item calc
      }
    }

    for (const item of cartItems) {
      const product = await ctx.db.get(item.productId);
      if (!product || product.status !== "approved" || product.stock < item.quantity) continue;

      const unitPrice = product.price;
      const itemTotal = unitPrice * item.quantity;
      const commission = Math.round(itemTotal * COMMISSION_RATE);
      const sellerEarning = itemTotal - commission;

      // Create order per item
      const invoiceNumber =
        "ST-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

      const orderId = await ctx.db.insert("storeOrders", {
        buyerId: userId,
        sellerId: product.sellerId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        commission,
        total: itemTotal,
        sellerEarning,
        status: "paid",
        deliveryCity: args.deliveryCity,
        deliveryAddress: args.deliveryAddress,
        deliveryNote: args.deliveryNote,
        paidWithWallet: true,
        invoiceNumber,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      orderIds.push(orderId);
      grandTotal += itemTotal;
      totalCommission += commission;
      totalSellerEarnings += sellerEarning;

      // Update stock
      await ctx.db.patch(product._id, {
        stock: product.stock - item.quantity,
        soldCount: product.soldCount + item.quantity,
        updatedAt: Date.now(),
        status: product.stock - item.quantity <= 0 ? "sold_out" : product.status,
      });

      // Delete cart item
      await ctx.db.delete(item._id);
    }

    // Deduct from wallet
    if (grandTotal > 0) {
      const wallet = await ctx.db
        .query("wallet")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (!wallet || wallet.balance < grandTotal) {
        throw new Error(`موجودی کیف پول کافی نیست. نیاز: ${grandTotal} تومان`);
      }
      await ctx.db.patch(wallet._id, {
        balance: wallet.balance - grandTotal,
        totalSpent: wallet.totalSpent + grandTotal,
        updatedAt: Date.now(),
      });
      await ctx.db.insert("walletTransactions", {
        userId,
        type: "purchase",
        amount: -grandTotal,
        description: `خرید ${orderIds.length} محصول از بازارچه`,
        createdAt: Date.now(),
      });
    }

    return { ok: true, orderIds, grandTotal };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── WISHLIST ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const getMyWishlist = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const items = await ctx.db
      .query("storeWishlists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const enriched = await Promise.all(
      items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        const seller = product ? await ctx.db.get(product.sellerId) : null;
        return { ...item, product, sellerName: seller?.name ?? "ناشناس" };
      }),
    );
    return enriched.filter((e) => e.product);
  },
});

export const toggleWishlist = mutation({
  args: { productId: v.id("storeProducts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ابتدا وارد شوید.");

    const existing = await ctx.db
      .query("storeWishlists")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", userId).eq("productId", args.productId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { ok: true, wishlisted: false };
    } else {
      await ctx.db.insert("storeWishlists", {
        userId,
        productId: args.productId,
        createdAt: Date.now(),
      });
      return { ok: true, wishlisted: true };
    }
  },
});

export const isWishlisted = query({
  args: { productId: v.id("storeProducts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const item = await ctx.db
      .query("storeWishlists")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", userId).eq("productId", args.productId),
      )
      .first();
    return !!item;
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── BUYER-SELLER MESSAGES ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const sendMessage = mutation({
  args: {
    receiverId: v.id("users"),
    productId: v.optional(v.id("storeProducts")),
    orderId: v.optional(v.id("storeOrders")),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ابتدا وارد شوید.");
    if (!args.text.trim()) throw new Error("متن پیام خالی است.");

    await ctx.db.insert("storeMessages", {
      senderId: userId,
      receiverId: args.receiverId,
      productId: args.productId,
      orderId: args.orderId,
      text: args.text.trim(),
      read: false,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const getMyMessages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const sent = await ctx.db
      .query("storeMessages")
      .withIndex("by_sender", (q) => q.eq("senderId", userId))
      .order("desc")
      .take(100);
    const received = await ctx.db
      .query("storeMessages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
      .order("desc")
      .take(100);

    const allIds = new Set([...sent.map((m) => m._id), ...received.map((m) => m._id)]);
    const all = [...sent, ...received].filter((m, i, arr) =>
      arr.findIndex((x) => x._id === m._id) === i,
    );
    all.sort((a, b) => b.createdAt - a.createdAt);

    const enriched = await Promise.all(
      all.map(async (m) => {
        const sender = await ctx.db.get(m.senderId);
        const receiver = await ctx.db.get(m.receiverId);
        return {
          ...m,
          senderName: sender?.name ?? "ناشناس",
          receiverName: receiver?.name ?? "ناشناس",
        };
      }),
    );

    return enriched;
  },
});

export const getConversation = query({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const sent = await ctx.db
      .query("storeMessages")
      .withIndex("by_sender", (q) => q.eq("senderId", userId))
      .collect();
    const received = await ctx.db
      .query("storeMessages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
      .collect();

    const all = [...sent, ...received]
      .filter(
        (m) =>
          (m.senderId === args.otherUserId && m.receiverId === userId) ||
          (m.senderId === userId && m.receiverId === args.otherUserId),
      )
      .sort((a, b) => a.createdAt - b.createdAt);

    return all;
  },
});

export const markMessagesRead = mutation({
  args: { senderId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const unread = await ctx.db
      .query("storeMessages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
      .collect();
    for (const m of unread) {
      if (m.senderId === args.senderId && !m.read) {
        await ctx.db.patch(m._id, { read: true });
      }
    }
    return { ok: true };
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const all = await ctx.db
      .query("storeMessages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
      .collect();
    return all.filter((m) => !m.read).length;
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── SELLER STATS ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const getSellerStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const products = await ctx.db
      .query("storeProducts")
      .withIndex("by_seller", (q) => q.eq("sellerId", userId))
      .collect();

    const orders = await ctx.db
      .query("storeOrders")
      .withIndex("by_seller", (q) => q.eq("sellerId", userId))
      .collect();

    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.status === "approved").length;
    const totalSales = orders.filter((o) => o.status === "completed" || o.status === "delivered" || o.status === "paid" || o.status === "shipped").length;
    const totalRevenue = orders
      .filter((o) => o.status !== "cancelled" && o.status !== "refunded")
      .reduce((sum, o) => sum + o.sellerEarning, 0);
    const totalCommission = orders
      .filter((o) => o.status !== "cancelled" && o.status !== "refunded")
      .reduce((sum, o) => sum + o.commission, 0);

    // Recent orders
    const recentOrders = orders
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);

    const enrichedOrders = await Promise.all(
      recentOrders.map(async (o) => {
        const buyer = await ctx.db.get(o.buyerId);
        const product = await ctx.db.get(o.productId);
        return { ...o, buyerName: buyer?.name ?? "ناشناس", productTitle: product?.title ?? "محصول حذف‌شده" };
      }),
    );

    return {
      totalProducts,
      activeProducts,
      totalSales,
      totalRevenue,
      totalCommission,
      avgRating: products.length > 0 ? products.reduce((sum, p) => sum + p.rating, 0) / products.length : 0,
      recentOrders: enrichedOrders,
    };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── BUYER ORDERS ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const getMyOrders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const orders = await ctx.db
      .query("storeOrders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", userId))
      .order("desc")
      .collect();
    return Promise.all(
      orders.map(async (o) => {
        const seller = await ctx.db.get(o.sellerId);
        const product = await ctx.db.get(o.productId);
        return { ...o, sellerName: seller?.name ?? "ناشناس", productTitle: product?.title ?? "محصول حذف‌شده" };
      }),
    );
  },
});
