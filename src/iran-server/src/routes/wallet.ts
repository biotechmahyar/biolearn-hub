import { Context } from "hono";
import { db, generateId, now } from "../db.js";
import { wallet, walletTransactions, storeProducts, storeOrders, storeReviews, storeCart, storeWishlists } from "../schema.js";
import { eq, desc, and, sql } from "drizzle-orm";

// ── WALLET ────────────────────────────────────────────────────────────────

// GET /api/wallet
export async function getWallet(c: Context) {
  const userId = c.get("userId") as string;
  try {
    const result = await db.select().from(wallet).where(eq(wallet.userId, userId)).limit(1);
    if (result.length === 0) {
      // Create wallet if not exists
      const id = generateId();
      await db.insert(wallet).values({ id, userId, balance: 0, frozenBalance: 0, totalEarned: 0, totalSpent: 0, updatedAt: now() });
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
      await db.insert(storeCart).values({ id, userId, productId, quantity, createdAt: now() });
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
      await db.insert(storeWishlists).values({ id, userId, productId, createdAt: now() });
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
    await db.insert(storeReviews).values({ id, productId, userId, rating, text, createdAt: now() });
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
    await db.insert(storeProducts).values({
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
