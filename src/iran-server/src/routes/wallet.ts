// @ts-nocheck
import { Context } from "hono";
import { db, generateId, now } from "../db.js";
import { wallet, walletTransactions, storeProducts, storeOrders, storeReviews, storeCart, storeWishlists, storeCoupons, users } from "../schema.js";
import { eq, desc, and, sql, count as drizzleCount } from "drizzle-orm";

// ── WALLET ────────────────────────────────────────────────────────────────

// GET /api/wallet
export async function getWallet(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const result = await db.select().from(wallet).where(eq(wallet.userId, userId)).limit(1);
    if (result.length === 0) {
      // Create wallet if not exists
      const id = generateId();
      await db.insert(wallet)// @ts-ignore.values({ id, userId, balance: 0, frozenBalance: 0, totalEarned: 0, totalSpent: 0, updatedAt: now() });
      return c.json({ ok: true, data: { id, balance: 0, frozenBalance: 0, totalEarned: 0, totalSpent: 0 } });
    }
    return c.json({ ok: true, data: result[0] });
  } catch (error) {
    console.error("[WALLET] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت کیف پول" }, 500);
  }
}

// GET /api/wallet/transactions
export async function getWalletTransactions(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const result = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(50);
    return c.json({ ok: true, data: result });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── MARKETPLACE PRODUCTS ──────────────────────────────────────────────────

// GET /api/marketplace/products
export async function getMarketplaceProducts(c: Context) {
  try {
    const category = c.req.query("category");
    const search = c.req.query("q");
    const minPrice = c.req.query("minPrice");
    const maxPrice = c.req.query("maxPrice");
    const sortBy = c.req.query("sort") || "newest";

    let query = db.select().from(storeProducts).where(eq(storeProducts.status, "approved"));
    // Note: drizzle-orm filtering would be more complex in production
    // This is a simplified version
    const result = await db.select().from(storeProducts).where(eq(storeProducts.status, "approved")).orderBy(desc(storeProducts.createdAt));

    return c.json({ ok: true, data: result });
  } catch (error) {
    console.error("[MARKETPLACE] Error:", error);
    return c.json({ ok: false, error: "خطا در دریافت محصولات بازارچه" }, 500);
  }
}

// GET /api/marketplace/products/:slug
export async function getMarketplaceProduct(c: Context) {
  try {
    const slug = c.req.param("slug");
    const result = await db.select().from(storeProducts).where(eq(storeProducts.slug, slug)).limit(1);
    if (result.length === 0) {
      return c.json({ ok: false, error: "محصول یافت نشد" }, 404);
    }

    // Get reviews
    const reviews = await db.select().from(storeReviews).where(eq(storeReviews.productId, result[0].id)).orderBy(desc(storeReviews.createdAt));

    // Get seller info
    const { users } = await import("../schema.js");
    const seller = await db.select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
      .from(users).where(eq(users.id, result[0].sellerId)).limit(1);

    return c.json({
      ok: true,
      data: {
        ...result[0],
        reviews,
        seller: seller[0] || null,
      },
    });
  } catch (error) {
    console.error("[MARKETPLACE] Error:", error);
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// POST /api/marketplace/cart
export async function addToCart(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const { productId, quantity = 1 } = await c.req.json();

    // Check if already in cart
    const existing = await db.select().from(storeCart).where(
      and(eq(storeCart.userId, userId), eq(storeCart.productId, productId))
    ).limit(1);

    if (existing.length > 0) {
      await db.update(storeCart).set({ quantity: (existing[0].quantity || 0) + quantity }).where(eq(storeCart.id, existing[0].id));
    } else {
      const id = generateId();
      await db.insert(storeCart)// @ts-ignore.values({ id, userId, productId, quantity, createdAt: now() });
    }

    return c.json({ ok: true });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// GET /api/marketplace/cart
export async function getCart(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const result = await db.select().from(storeCart).where(eq(storeCart.userId, userId));
    return c.json({ ok: true, data: result });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// DELETE /api/marketplace/cart/:id
export async function removeFromCart(c: Context) {
  const id = c.req.param("id");
  try {
    await db.delete(storeCart).where(eq(storeCart.id, id));
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// POST /api/marketplace/wishlist
export async function toggleWishlist(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const { productId } = await c.req.json();
    const existing = await db.select().from(storeWishlists).where(
      and(eq(storeWishlists.userId, userId), eq(storeWishlists.productId, productId))
    ).limit(1);

    if (existing.length > 0) {
      await db.delete(storeWishlists).where(eq(storeWishlists.id, existing[0].id));
      return c.json({ ok: true, data: { wishlisted: false } });
    } else {
      const id = generateId();
      await db.insert(storeWishlists)// @ts-ignore.values({ id, userId, productId, createdAt: now() });
      return c.json({ ok: true, data: { wishlisted: true } });
    }
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// POST /api/marketplace/reviews
export async function addReview(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const { productId, rating, text } = await c.req.json();
    const id = generateId();
    await db.insert(storeReviews)// @ts-ignore.values({ id, productId, userId, rating, text, createdAt: now() });
    return c.json({ ok: true, data: { id } });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// GET /api/marketplace/seller/stats
export async function getSellerStats(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const products = await db.select().from(storeProducts).where(eq(storeProducts.sellerId, userId));
    const orders = await db.select().from(storeOrders).where(eq(storeOrders.sellerId, userId));

    const totalRevenue = orders.reduce((sum, o) => sum + (o.sellerEarning || 0), 0);
    const totalSold = products.reduce((sum, p) => sum + (p.soldCount || 0), 0);
    const pendingOrders = orders.filter((o) => o.status === "pending").length;

    return c.json({
      ok: true,
      data: {
        totalProducts: products.length,
        totalSold,
        totalRevenue,
        pendingOrders,
        totalOrders: orders.length,
      },
    });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// GET /api/marketplace/seller/products
export async function getSellerProducts(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const result = await db.select().from(storeProducts).where(eq(storeProducts.sellerId, userId)).orderBy(desc(storeProducts.createdAt));
    return c.json({ ok: true, data: result });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// POST /api/marketplace/seller/products
export async function createSellerProduct(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const body = await c.req.json();
    const slug = body.title.replace(/\s+/g, "-").toLowerCase() + "-" + Date.now().toString(36);
    const id = generateId();
    await db.insert(storeProducts)// @ts-ignore.values({
      id,
      sellerId: userId,
      title: body.title,
      slug,
      description: body.description,
      category: body.category,
      condition: body.condition,
      price: body.price,
      images: body.images || [],
      coverImage: body.coverImage,
      stock: body.stock || 0,
      status: "pending",
      deliveryCities: body.deliveryCities || ["تبریز"],
      tags: body.tags || [],
      createdAt: now(),
      updatedAt: now(),
    });
    return c.json({ ok: true, data: { id, slug } });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// PATCH /api/marketplace/seller/products/:id
export async function updateSellerProduct(c: Context) {
  const userId = c.get("userId") as string;
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    // Verify ownership
    const existing = await db.select().from(storeProducts).where(eq(storeProducts.id, id)).limit(1);
    if (!existing.length || existing[0].sellerId !== userId) {
      return c.json({ ok: false, error: "دسترسی غیرمجاز" }, 403);
    }
    await db.update(storeProducts).set({ ...body, updatedAt: now() }).where(eq(storeProducts.id, id));
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// DELETE /api/marketplace/seller/products/:id
export async function deleteSellerProduct(c: Context) {
  const userId = c.get("userId") as string;
  const id = c.req.param("id");
  try {
    const existing = await db.select().from(storeProducts).where(eq(storeProducts.id, id)).limit(1);
    if (!existing.length || existing[0].sellerId !== userId) {
      return c.json({ ok: false, error: "دسترسی غیرمجاز" }, 403);
    }
    await db.delete(storeProducts).where(eq(storeProducts.id, id));
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── SELLER BOOST ─────────────────────────────────────────────────────────

// POST /api/marketplace/seller/products/:id/boost
export async function boostSellerProduct(c: Context) {
  const userId = c.get("userId") as string;
  const id = c.req.param("id");
  try {
    const { boostLevel } = await c.req.json(); // "silver" | "gold"
    const existing = await db.select().from(storeProducts).where(eq(storeProducts.id, id)).limit(1);
    if (!existing.length || existing[0].sellerId !== userId) {
      return c.json({ ok: false, error: "دسترسی غیرمجاز" }, 403);
    }
    const durationDays = boostLevel === "gold" ? 30 : 7;
    const boostCost = boostLevel === "gold" ? Math.round(existing[0].price * 0.09) : Math.round(existing[0].price * 0.045);
    const expiresAt = Math.floor(Date.now() / 1000) + durationDays * 86400;

    // Check wallet balance
    const w = await db.select().from(wallet).where(eq(wallet.userId, userId)).limit(1);
    if (!w.length || w[0].balance < boostCost) {
      return c.json({ ok: false, error: "موجودی کیف پول کافی نیست" }, 400);
    }

    // Deduct from wallet
    await db.update(wallet).set({
      balance: w[0].balance - boostCost,
      totalSpent: w[0].totalSpent + boostCost,
      updatedAt: now(),
    }).where(eq(wallet.userId, userId));

    // Record transaction
    await db.insert(walletTransactions).values({
      id: generateId(),
      userId,
      type: "boost",
      amount: -boostCost,
      description: `نردبان ${boostLevel === "gold" ? "طلایی" : "نقره‌ای"} محصول ${existing[0].title}`,
      relatedProductId: id,
      createdAt: now(),
    } as any);

    // Apply boost
    await db.update(storeProducts).set({
      boostLevel,
      boostExpiresAt: expiresAt,
      updatedAt: now(),
    }).where(eq(storeProducts.id, id));

    return c.json({ ok: true, data: { boostCost, expiresAt } });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── SELLER SHIPMENT CONFIRM ──────────────────────────────────────────────

// POST /api/marketplace/seller/orders/:id/ship
export async function confirmSellerShipment(c: Context) {
  const userId = c.get("userId") as string;
  const id = c.req.param("id");
  try {
    const existing = await db.select().from(storeOrders).where(eq(storeOrders.id, id)).limit(1);
    if (!existing.length || existing[0].sellerId !== userId) {
      return c.json({ ok: false, error: "دسترسی غیرمجاز" }, 403);
    }
    if (existing[0].status !== "paid") {
      return c.json({ ok: false, error: "این سفارش قابل ارسال نیست" }, 400);
    }
    await db.update(storeOrders).set({
      status: "shipped",
      updatedAt: now(),
    }).where(eq(storeOrders.id, id));
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── SELLER ORDERS (list orders for seller's products) ────────────────────

// GET /api/marketplace/seller/orders
export async function getSellerOrders(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const result = await db.select().from(storeOrders)
      .where(eq(storeOrders.sellerId, userId))
      .orderBy(desc(storeOrders.createdAt));
    return c.json({ ok: true, data: result });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── CART CHECKOUT ────────────────────────────────────────────────────────

// POST /api/marketplace/checkout
export async function checkoutCart(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const { deliveryCity = "تبریز", deliveryAddress, deliveryNote, couponCode } = await c.req.json();

    // Get cart items
    const cartItems = await db.select().from(storeCart).where(eq(storeCart.userId, userId));
    if (cartItems.length === 0) {
      return c.json({ ok: false, error: "سبد خرید خالی است" }, 400);
    }

    // Get wallet
    const w = await db.select().from(wallet).where(eq(wallet.userId, userId)).limit(1);
    if (!w.length) {
      return c.json({ ok: false, error: "کیف پول یافت نشد" }, 400);
    }

    // Calculate total
    let subtotal = 0;
    const orderItems: any[] = [];
    for (const item of cartItems) {
      const product = await db.select().from(storeProducts).where(eq(storeProducts.id, item.productId)).limit(1);
      if (product.length === 0 || product[0].stock < (item.quantity || 1)) continue;
      const unitPrice = product[0].price;
      subtotal += unitPrice * (item.quantity || 1);
      orderItems.push({
        productId: product[0].id,
        sellerId: product[0].sellerId,
        quantity: item.quantity || 1,
        unitPrice,
      });
    }

    // Apply coupon if provided
    let discount = 0;
    if (couponCode) {
      const coupons = await db.select().from(storeCoupons).where(eq(storeCoupons.code, couponCode)).limit(1);
      if (coupons.length > 0 && coupons[0].active && subtotal >= coupons[0].minPurchase) {
        discount = Math.min(Math.round(subtotal * coupons[0].percent / 100), coupons[0].maxDiscount);
      }
    }

    const total = subtotal - discount;
    if (w[0].balance < total) {
      return c.json({ ok: false, error: "موجودی کیف پول کافی نیست" }, 400);
    }

    // Deduct from wallet
    await db.update(wallet).set({
      balance: w[0].balance - total,
      totalSpent: w[0].totalSpent + total,
      updatedAt: now(),
    }).where(eq(wallet.userId, userId));

    // Create orders for each seller product
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    for (const item of orderItems) {
      const commission = Math.round(item.unitPrice * item.quantity * 0.09);
      const sellerEarning = item.unitPrice * item.quantity - commission;
      const orderId = generateId();

      await db.insert(storeOrders).values({
        id: orderId,
        buyerId: userId,
        sellerId: item.sellerId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        commission,
        total: item.unitPrice * item.quantity,
        sellerEarning,
        status: "paid",
        deliveryCity,
        deliveryAddress: deliveryAddress || null,
        deliveryNote: deliveryNote || null,
        paidWithWallet: true,
        invoiceNumber,
        createdAt: now(),
        updatedAt: now(),
      } as any);

      // Update stock and sold count
      const prod = await db.select().from(storeProducts).where(eq(storeProducts.id, item.productId)).limit(1);
      if (prod.length > 0) {
        await db.update(storeProducts).set({
          stock: Math.max(0, (prod[0].stock || 0) - item.quantity),
          soldCount: (prod[0].soldCount || 0) + item.quantity,
          updatedAt: now(),
        }).where(eq(storeProducts.id, item.productId));
      }

      // Credit seller wallet
      const sellerW = await db.select().from(wallet).where(eq(wallet.userId, item.sellerId)).limit(1);
      if (sellerW.length > 0) {
        await db.update(wallet).set({
          balance: sellerW[0].balance + sellerEarning,
          totalEarned: sellerW[0].totalEarned + sellerEarning,
          updatedAt: now(),
        }).where(eq(wallet.userId, item.sellerId));

        await db.insert(walletTransactions).values({
          id: generateId(),
          userId: item.sellerId,
          type: "sale",
          amount: sellerEarning,
          description: `فروش محصول - سفارش ${invoiceNumber}`,
          relatedOrderId: orderId,
          relatedProductId: item.productId,
          createdAt: now(),
        } as any);
      }
    }

    // Record buyer transaction
    await db.insert(walletTransactions).values({
      id: generateId(),
      userId,
      type: "purchase",
      amount: -total,
      description: `خرید از بازارچه - سفارش ${invoiceNumber}`,
      relatedOrderId: invoiceNumber,
      createdAt: now(),
    } as any);

    // Clear cart
    await db.delete(storeCart).where(eq(storeCart.userId, userId));

    return c.json({ ok: true, data: { invoiceNumber, total, discount } });
  } catch (error) {
    console.error("[CHECKOUT] Error:", error);
    return c.json({ ok: false, error: "خطا در ثبت سفارش" }, 500);
  }
}

// ── MARKETPLACE CATEGORIES (counts) ─────────────────────────────────────

// GET /api/marketplace/categories
export async function getMarketplaceCategories(c: Context) {
  try {
    const categories = ["notes", "flashcards", "book", "package", "other"];
    const result: Record<string, number> = {};
    for (const cat of categories) {
      const rows = await db.select({ value: drizzleCount() }).from(storeProducts)
        .where(and(eq(storeProducts.status, "approved"), eq(storeProducts.category, cat)));
      result[cat] = rows[0]?.value ?? 0;
    }
    return c.json({ ok: true, data: result });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── UPDATE CART ITEM QUANTITY ────────────────────────────────────────────

// PATCH /api/marketplace/cart/:id
export async function updateCartItem(c: Context) {
  const userId = c.get("userId") as string;
  const id = c.req.param("id");
  try {
    const { quantity } = await c.req.json();
    await db.update(storeCart).set({ quantity }).where(eq(storeCart.id, id));
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// ── SELLER WALLET (get specific seller's wallet) ────────────────────────

// GET /api/marketplace/seller/wallet
export async function getSellerWallet(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const result = await db.select().from(wallet).where(eq(wallet.userId, userId)).limit(1);
    if (result.length === 0) {
      const id = generateId();
      await db.insert(wallet).values({ id, userId, balance: 0, frozenBalance: 0, totalEarned: 0, totalSpent: 0, updatedAt: now() } as any);
      return c.json({ ok: true, data: { id, balance: 0, frozenBalance: 0, totalEarned: 0, totalSpent: 0 } });
    }
    return c.json({ ok: true, data: result[0] });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

// GET /api/marketplace/seller/transactions
export async function getSellerTransactions(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const limit = parseInt(c.req.query("limit") || "30");
    const result = await db.select().from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit);
    return c.json({ ok: true, data: result });
  } catch (error) {
    return c.json({ ok: false, error: "خطا" }, 500);
  }
}

