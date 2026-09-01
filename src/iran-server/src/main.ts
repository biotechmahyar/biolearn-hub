import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { initDb } from "./db.js";
import { authRoutes, authMiddleware, optionalAuth } from "./auth.js";

// Routes
import { getCourses, getCourseBySlug, getCategories, getInstructors, getInstructorBySlug, getMyEnrollments, getMyOrders } from "./routes/courses.js";
import { getArticles, getArticleBySlug } from "./routes/articles.js";
import { getProducts, getProductBySlug, getWorkshops, getDictionaryTerms, getExams, getExamBySlug } from "./routes/products.js";
import { getProfile, updateProfile, getMyClasses, getMyStudents, getBookmarks, addBookmark, removeBookmark, getFlashcards, addFlashcard, removeFlashcard, getAnnouncements } from "./routes/users.js";
import { getWallet, getWalletTransactions, getMarketplaceProducts, getMarketplaceProduct, addToCart, getCart, removeFromCart, toggleWishlist, addReview, getSellerStats, getSellerProducts, createSellerProduct, updateSellerProduct, deleteSellerProduct } from "./routes/wallet.js";
import { getClasses, getClass, requestClass } from "./routes/classes.js";
import { getModels, aiChat, getConversations, getConversationMessages, deleteConversation } from "./routes/ai.js";

const app = new Hono();

// ── MIDDLEWARE ────────────────────────────────────────────────────────────

app.use("*", logger());
app.use("*", cors({
  origin: ["*"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// ── HEALTH CHECK ──────────────────────────────────────────────────────────

app.get("/health", (c) => c.json({ ok: true, service: "nibrc-iran", timestamp: Date.now() }));

// ── AUTH ROUTES (public) ──────────────────────────────────────────────────

const auth = authRoutes();
app.post("/api/auth/register", auth.register);
app.post("/api/auth/login", auth.login);
app.post("/api/auth/refresh", auth.refresh);

// ── AUTH ROUTES (authenticated) ───────────────────────────────────────────

app.get("/api/auth/me", authMiddleware, auth.me);
app.post("/api/auth/logout", authMiddleware, auth.logout);
app.get("/api/auth/is-admin", authMiddleware, auth.isAdmin);

// ── PUBLIC CONTENT ────────────────────────────────────────────────────────

app.get("/api/content/courses", getCourses);
app.get("/api/content/courses/:slug", getCourseBySlug);
app.get("/api/content/categories", getCategories);
app.get("/api/content/instructors", getInstructors);
app.get("/api/content/instructors/:slug", getInstructorBySlug);
app.get("/api/content/articles", getArticles);
app.get("/api/content/articles/:slug", getArticleBySlug);
app.get("/api/content/products", getProducts);
app.get("/api/content/products/:slug", getProductBySlug);
app.get("/api/content/workshops", getWorkshops);
app.get("/api/content/dictionary", getDictionaryTerms);
app.get("/api/content/exams", getExams);
app.get("/api/content/exams/:slug", getExamBySlug);
app.get("/api/announcements", getAnnouncements);

// ── AUTHENTICATED ROUTES ──────────────────────────────────────────────────

// Profile & Users
app.get("/api/users/profile", authMiddleware, getProfile);
app.patch("/api/users/profile", authMiddleware, updateProfile);
app.get("/api/users/my-classes", authMiddleware, getMyClasses);
app.get("/api/users/my-students", authMiddleware, getMyStudents);

// Enrollments & Orders
app.get("/api/enrollments", authMiddleware, getMyEnrollments);
app.get("/api/orders", authMiddleware, getMyOrders);

// Bookmarks
app.get("/api/bookmarks", authMiddleware, getBookmarks);
app.post("/api/bookmarks", authMiddleware, addBookmark);
app.delete("/api/bookmarks/:id", authMiddleware, removeBookmark);

// Flashcards
app.get("/api/flashcards", authMiddleware, getFlashcards);
app.post("/api/flashcards", authMiddleware, addFlashcard);
app.delete("/api/flashcards/:id", authMiddleware, removeFlashcard);

// Wallet
app.get("/api/wallet", authMiddleware, getWallet);
app.get("/api/wallet/transactions", authMiddleware, getWalletTransactions);

// Marketplace
app.get("/api/marketplace/products", optionalAuth, getMarketplaceProducts);
app.get("/api/marketplace/products/:slug", optionalAuth, getMarketplaceProduct);
app.post("/api/marketplace/cart", authMiddleware, addToCart);
app.get("/api/marketplace/cart", authMiddleware, getCart);
app.delete("/api/marketplace/cart/:id", authMiddleware, removeFromCart);
app.post("/api/marketplace/wishlist", authMiddleware, toggleWishlist);
app.post("/api/marketplace/reviews", authMiddleware, addReview);
app.get("/api/marketplace/seller/stats", authMiddleware, getSellerStats);
app.get("/api/marketplace/seller/products", authMiddleware, getSellerProducts);
app.post("/api/marketplace/seller/products", authMiddleware, createSellerProduct);
app.patch("/api/marketplace/seller/products/:id", authMiddleware, updateSellerProduct);
app.delete("/api/marketplace/seller/products/:id", authMiddleware, deleteSellerProduct);

// Classes
app.get("/api/classes", authMiddleware, getClasses);
app.get("/api/classes/:id", authMiddleware, getClass);
app.post("/api/classes/request", authMiddleware, requestClass);

// AI
app.get("/api/ai/models", authMiddleware, getModels);
app.post("/api/ai/chat", authMiddleware, aiChat);
app.get("/api/ai/conversations", authMiddleware, getConversations);
app.get("/api/ai/conversations/:id/messages", authMiddleware, getConversationMessages);
app.delete("/api/ai/conversations/:id", authMiddleware, deleteConversation);

// ── 404 ───────────────────────────────────────────────────────────────────

app.notFound((c) => c.json({ ok: false, error: "Not Found" }, 404));

// ── START ─────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3000", 10);

async function main() {
  console.log("[STARTUP] Initializing database...");
  await initDb();
  console.log("[STARTUP] Database initialized");

  // Attempt initial sync
  try {
    const { syncFromMain } = await import("./sync.js");
    const syncResult = await syncFromMain();
    console.log("[STARTUP] Initial sync:", syncResult);
  } catch (err) {
    console.log("[STARTUP] Initial sync skipped:", (err as Error).message || "Main site unreachable");
  }

  // Background sync every 30 minutes
  setInterval(async () => {
    try {
      const { syncFromMain } = await import("./sync.js");
      await syncFromMain();
      console.log("[SYNC] Background sync completed");
    } catch (err) {
      console.log("[SYNC] Background sync failed:", (err as Error).message || "Unknown error");
    }
  }, 30 * 60 * 1000);

  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`\n🚀 NIBRC Iran Server running on http://0.0.0.0:${PORT}`);
    console.log(`   Health: http://0.0.0.0:${PORT}/health`);
    console.log(`   API:    http://0.0.0.0:${PORT}/api`);
    console.log(`   Press Ctrl+C to stop\n`);
  });
}

main().catch(console.error);
