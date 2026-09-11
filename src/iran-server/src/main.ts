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
import { getWallet, getWalletTransactions, getMarketplaceProducts, getMarketplaceProduct, addToCart, getCart, removeFromCart, toggleWishlist, addReview, getSellerStats, getSellerProducts, createSellerProduct, updateSellerProduct, deleteSellerProduct, boostSellerProduct, confirmSellerShipment, getSellerOrders, checkoutCart, getMarketplaceCategories, updateCartItem, getSellerWallet, getSellerTransactions } from "./routes/wallet.js";
import { getClasses, getClass, requestClass } from "./routes/classes.js";
import { getModels, aiChat, getConversations, getConversationMessages, deleteConversation } from "./routes/ai.js";

// New routes
import * as admin from "./routes/admin.js";
import * as instructor from "./routes/instructor.js";
import { getExamQuestions, submitExam, getMyExamResults, getExamResult, getDailyQuiz, submitDailyQuiz } from "./routes/examRoutes.js";
import * as notifRoutes from "./routes/notifications.js";
import * as supportRoutes from "./routes/support.js";
import * as aiMgmt from "./routes/aiManagement.js";
import * as dashboard from "./routes/dashboard.js";

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
app.post("/api/marketplace/seller/products/:id/boost", authMiddleware, boostSellerProduct);
app.post("/api/marketplace/seller/orders/:id/ship", authMiddleware, confirmSellerShipment);
app.get("/api/marketplace/seller/orders", authMiddleware, getSellerOrders);
app.post("/api/marketplace/checkout", authMiddleware, checkoutCart);
app.get("/api/marketplace/categories", getMarketplaceCategories);
app.patch("/api/marketplace/cart/:id", authMiddleware, updateCartItem);
app.get("/api/marketplace/seller/wallet", authMiddleware, getSellerWallet);
app.get("/api/marketplace/seller/transactions", authMiddleware, getSellerTransactions);

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

// ── EXAM SUBMISSION ───────────────────────────────────────────────────────

app.get("/api/exams/:id/questions", authMiddleware, getExamQuestions);
app.post("/api/exams/:id/submit", authMiddleware, submitExam);
app.get("/api/exams/my-results", authMiddleware, getMyExamResults);
app.get("/api/exams/results/:id", authMiddleware, getExamResult);
app.get("/api/daily-quiz", authMiddleware, getDailyQuiz);
app.post("/api/daily-quiz/submit", authMiddleware, submitDailyQuiz);

// ── NOTIFICATIONS ──────────────────────────────────────────────────────────

app.get("/api/notifications", authMiddleware, notifRoutes.getMyNotifications);
app.get("/api/notifications/unread", authMiddleware, notifRoutes.getUnreadCount);
app.patch("/api/notifications/:id/read", authMiddleware, notifRoutes.markNotificationRead);
app.patch("/api/notifications/read-all", authMiddleware, notifRoutes.markAllRead);
app.delete("/api/notifications/:id", authMiddleware, notifRoutes.deleteNotification);
app.post("/api/notifications", authMiddleware, notifRoutes.createNotification);

// ── SUPPORT TICKETS ────────────────────────────────────────────────────────

app.get("/api/support/tickets", authMiddleware, supportRoutes.getMyTickets);
app.post("/api/support/tickets", authMiddleware, supportRoutes.createTicket);
app.get("/api/support/tickets/:id/replies", authMiddleware, supportRoutes.getTicketReplies);
app.post("/api/support/tickets/:id/reply", authMiddleware, supportRoutes.replyToTicket);
app.patch("/api/support/tickets/:id/close", authMiddleware, supportRoutes.closeTicket);
app.delete("/api/support/tickets/:id", authMiddleware, supportRoutes.deleteTicket);
app.get("/api/support/all-tickets", authMiddleware, supportRoutes.getAllTickets);

// ── AI MANAGEMENT (admin) ──────────────────────────────────────────────────

app.get("/api/ai-admin/config", authMiddleware, aiMgmt.getAIConfig);
app.put("/api/ai-admin/config", authMiddleware, aiMgmt.setAIConfig);
app.get("/api/ai-admin/models", authMiddleware, aiMgmt.listAIModels);
app.post("/api/ai-admin/models", authMiddleware, aiMgmt.createAIModel);
app.patch("/api/ai-admin/models/:id", authMiddleware, aiMgmt.updateAIModel);
app.delete("/api/ai-admin/models/:id", authMiddleware, aiMgmt.deleteAIModel);
app.get("/api/ai-admin/quotas", authMiddleware, aiMgmt.listQuotas);
app.post("/api/ai-admin/quotas", authMiddleware, aiMgmt.setQuota);
app.get("/api/ai-admin/usage", authMiddleware, aiMgmt.getUsageStats);
app.get("/api/ai/my-usage", authMiddleware, aiMgmt.getMyUsage);

// ── ADMIN ROUTES ───────────────────────────────────────────────────────────

app.get("/api/admin/stats", authMiddleware, admin.getDashboardStats);
app.get("/api/admin/users", authMiddleware, admin.listUsers);
app.patch("/api/admin/users/:id", authMiddleware, admin.updateUser);
app.delete("/api/admin/users/:id", authMiddleware, admin.deleteUser);
app.get("/api/admin/courses", authMiddleware, admin.listAllCourses);
app.patch("/api/admin/courses/:id", authMiddleware, admin.updateCourse);
app.get("/api/admin/articles", authMiddleware, admin.listAllArticles);
app.patch("/api/admin/articles/:id", authMiddleware, admin.updateArticle);
app.get("/api/admin/products", authMiddleware, admin.listAllProducts);
app.patch("/api/admin/products/:id", authMiddleware, admin.updateProduct);
app.get("/api/admin/workshops", authMiddleware, admin.listAllWorkshops);
app.patch("/api/admin/workshops/:id", authMiddleware, admin.updateWorkshop);
app.get("/api/admin/categories", authMiddleware, admin.listAllCategories);
app.post("/api/admin/categories", authMiddleware, admin.createCategory);
app.patch("/api/admin/categories/:id", authMiddleware, admin.updateCategory);
app.delete("/api/admin/categories/:id", authMiddleware, admin.deleteCategory);
app.get("/api/admin/orders", authMiddleware, admin.listAllOrders);
app.patch("/api/admin/orders/:id", authMiddleware, admin.updateOrder);
app.get("/api/admin/enrollments", authMiddleware, admin.listAllEnrollments);
app.get("/api/admin/coupons", authMiddleware, admin.listCoupons);
app.post("/api/admin/coupons", authMiddleware, admin.createCoupon);
app.delete("/api/admin/coupons/:id", authMiddleware, admin.deleteCoupon);
app.get("/api/admin/payments", authMiddleware, admin.listInstructorPayments);
app.patch("/api/admin/payments/:id/approve", authMiddleware, admin.approvePayment);
app.delete("/api/admin/payments/:id", authMiddleware, admin.deletePayment);
app.get("/api/admin/store-products", authMiddleware, admin.listAllStoreProducts);
app.patch("/api/admin/store-products/:id", authMiddleware, admin.approveStoreProduct);
app.get("/api/admin/store-orders", authMiddleware, admin.listAllStoreOrders);

// ── DASHBOARD ROUTES (student panel) ────────────────────────────────────

app.get("/api/dashboard/enrollments", authMiddleware, dashboard.getMyEnrollments);
app.get("/api/dashboard/exam-attempts", authMiddleware, dashboard.getMyExamAttempts);
app.get("/api/dashboard/exams", authMiddleware, dashboard.getExamList);
app.get("/api/dashboard/learning-profile", authMiddleware, dashboard.getLearningProfile);
app.get("/api/dashboard/flashcards", authMiddleware, dashboard.getDashboardFlashcards);
app.post("/api/dashboard/flashcards", authMiddleware, dashboard.addDashboardFlashcard);
app.delete("/api/dashboard/flashcards/:id", authMiddleware, dashboard.deleteDashboardFlashcard);
app.get("/api/dashboard/bookmarks", authMiddleware, dashboard.getDashboardBookmarks);
app.get("/api/dashboard/tickets", authMiddleware, dashboard.getDashboardTickets);
app.post("/api/dashboard/tickets", authMiddleware, dashboard.createDashboardTicket);
app.post("/api/dashboard/tickets/:id/reply", authMiddleware, dashboard.replyDashboardTicket);
app.get("/api/dashboard/announcements", authMiddleware, dashboard.getDashboardAnnouncements);
app.get("/api/dashboard/downloads", authMiddleware, dashboard.getDashboardDownloads);
app.get("/api/dashboard/daily-quiz", authMiddleware, dashboard.getDashboardDailyQuiz);

// ── INSTRUCTOR ROUTES ──────────────────────────────────────────────────────

app.get("/api/instructor/courses", authMiddleware, instructor.getMyCourses);
app.get("/api/instructor/classes", authMiddleware, instructor.getInstructorClasses);
app.post("/api/instructor/classes", authMiddleware, instructor.createClass);
app.patch("/api/instructor/classes/:id", authMiddleware, instructor.updateClass);
app.patch("/api/instructor/classes/:id/cancel", authMiddleware, instructor.cancelClass);
app.delete("/api/instructor/classes/:id", authMiddleware, instructor.deleteClass);
app.get("/api/instructor/resources", authMiddleware, instructor.getClassResources);
app.post("/api/instructor/resources", authMiddleware, instructor.addClassResource);
app.patch("/api/instructor/resources/:id", authMiddleware, instructor.updateClassResource);
app.delete("/api/instructor/resources/:id", authMiddleware, instructor.deleteClassResource);
app.get("/api/instructor/students", authMiddleware, instructor.getMyStudents);
app.get("/api/instructor/payments", authMiddleware, instructor.getMyPayments);
app.get("/api/instructor/announcements", authMiddleware, instructor.getInstructorAnnouncements);
app.post("/api/instructor/announcements", authMiddleware, instructor.createAnnouncement);
app.delete("/api/instructor/announcements/:id", authMiddleware, instructor.deleteAnnouncement);
app.get("/api/instructor/suggested-courses", authMiddleware, instructor.getMySuggestedCourses);
app.post("/api/instructor/suggested-courses", authMiddleware, instructor.toggleSuggestedCourse);

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
