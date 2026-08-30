import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  users, categories, courses, instructors, articles, products, workshops,
  orders, coupons, enrollments, admins as adminsTable, offlinePayments,
  examAttempts, examReports, questions, tickets, classEnrollRequests,
} from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { requireAnyAdmin, requireAdmin } from "../middleware/rbac.js";
import { successResponse, errorResponse } from "../types/index.js";
import { getCurrentUser } from "../middleware/auth.js";

const admin = new Hono();

// Apply requireAnyAdmin to all admin routes
admin.use("*", requireAnyAdmin);

// ── Stats ───────────────────────────────────────────────────────────────────

admin.get("/stats", async (c) => {
  const [userCount, orderCount, enrollmentCount, courseCount, attemptCount, ticketCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db.select({ count: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, "paid")),
    db.select({ count: sql<number>`count(*)::int` }).from(enrollments),
    db.select({ count: sql<number>`count(*)::int` }).from(courses),
    db.select({ count: sql<number>`count(*)::int` }).from(examAttempts),
    db.select({ count: sql<number>`count(*)::int` }).from(tickets).where(eq(tickets.status, "open")),
  ]);

  const totalRevenue = await db.select({ sum: sql<number>`coalesce(sum(${orders.total}), 0)::int` }).from(orders).where(eq(orders.status, "paid"));

  return c.json(successResponse({
    userCount: userCount[0]?.count ?? 0,
    orderCount: orderCount[0]?.count ?? 0,
    enrollmentCount: enrollmentCount[0]?.count ?? 0,
    courseCount: courseCount[0]?.count ?? 0,
    attemptCount: attemptCount[0]?.count ?? 0,
    openTicketCount: ticketCount[0]?.count ?? 0,
    revenue: totalRevenue[0]?.sum ?? 0,
  }));
});

// ── Courses CRUD ────────────────────────────────────────────────────────────

admin.get("/courses", async (c) => {
  const rows = await db.select().from(courses).orderBy(desc(courses.createdAt));
  return c.json(successResponse(rows));
});

admin.post("/courses", async (c) => {
  const body = await c.req.json();
  const slug = body.slug || body.title.replace(/\s+/g, "-").toLowerCase();
  const [course] = await db.insert(courses).values({
    title: body.title,
    slug,
    categoryId: body.categoryId,
    instructorId: body.instructorId,
    summary: body.summary || "",
    description: body.description || "",
    audience: body.audience || [],
    prerequisites: body.prerequisites || [],
    syllabus: body.syllabus || [],
    durationText: body.durationText || "",
    mode: body.mode || "recorded",
    price: body.price || 0,
    discountPrice: body.discountPrice,
    rating: body.rating || 0,
    ratingCount: body.ratingCount || 0,
    studentsCount: body.studentsCount || 0,
    accent: body.accent || "teal",
    bundle: body.bundle || "economy",
    includes: body.includes || [],
    hasSampleVideo: body.hasSampleVideo || false,
    files: body.files || [],
    published: body.published || false,
    featured: body.featured || false,
    popular: body.popular || false,
    packagePrices: body.packagePrices || [],
    authorId: body.authorId,
    status: body.status,
  }).returning();
  return c.json(successResponse(course), 201);
});

admin.put("/courses/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const [updated] = await db.update(courses).set(body).where(eq(courses.id, id)).returning();
  if (!updated) return c.json(errorResponse("دوره یافت نشد."), 404);
  return c.json(successResponse(updated));
});

admin.delete("/courses/:id", async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(courses).where(eq(courses.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("دوره یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

admin.patch("/courses/:id/toggle-publish", async (c) => {
  const id = c.req.param("id");
  const rows = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("دوره یافت نشد."), 404);
  const [updated] = await db.update(courses).set({ published: !rows[0].published }).where(eq(courses.id, id)).returning();
  return c.json(successResponse(updated));
});

// ── Articles CRUD ───────────────────────────────────────────────────────────

admin.get("/articles", async (c) => {
  const rows = await db.select().from(articles).orderBy(desc(articles.createdAt));
  return c.json(successResponse(rows));
});

admin.post("/articles", async (c) => {
  const body = await c.req.json();
  const slug = body.slug || body.title.replace(/\s+/g, "-").toLowerCase();
  const [article] = await db.insert(articles).values({
    title: body.title,
    slug,
    subtitle: body.subtitle,
    category: body.category || "",
    tags: body.tags || [],
    excerpt: body.excerpt || "",
    body: body.body || "",
    authorName: body.authorName || "",
    authorId: body.authorId,
    featuredImage: body.featuredImage,
    accent: body.accent || "teal",
    readTime: body.readTime || 5,
    level: body.level,
    status: body.status || "draft",
    published: body.published || false,
    featured: body.featured || false,
    seoTitle: body.seoTitle,
    seoDescription: body.seoDescription,
    seoKeywords: body.seoKeywords || [],
    references_: body.references || [],
  }).returning();
  return c.json(successResponse(article), 201);
});

admin.put("/articles/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const [updated] = await db.update(articles).set({ ...body, updatedAt: Date.now() }).where(eq(articles.id, id)).returning();
  if (!updated) return c.json(errorResponse("مقاله یافت نشد."), 404);
  return c.json(successResponse(updated));
});

admin.delete("/articles/:id", async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(articles).where(eq(articles.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("مقاله یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

// ── Products CRUD ───────────────────────────────────────────────────────────

admin.get("/products", async (c) => {
  const rows = await db.select().from(products).orderBy(desc(products.createdAt));
  return c.json(successResponse(rows));
});

admin.post("/products", async (c) => {
  const body = await c.req.json();
  const slug = body.slug || body.title.replace(/\s+/g, "-").toLowerCase();
  const [product] = await db.insert(products).values({
    title: body.title,
    slug,
    type: body.type || "flashcards",
    description: body.description || "",
    price: body.price || 0,
    accent: body.accent || "teal",
    published: body.published || false,
    featured: body.featured || false,
  }).returning();
  return c.json(successResponse(product), 201);
});

admin.put("/products/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const [updated] = await db.update(products).set(body).where(eq(products.id, id)).returning();
  if (!updated) return c.json(errorResponse("محصول یافت نشد."), 404);
  return c.json(successResponse(updated));
});

admin.delete("/products/:id", async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(products).where(eq(products.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("محصول یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

// ── Workshops CRUD ──────────────────────────────────────────────────────────

admin.get("/workshops", async (c) => {
  const rows = await db.select().from(workshops).orderBy(desc(workshops.createdAt));
  return c.json(successResponse(rows));
});

admin.post("/workshops", async (c) => {
  const body = await c.req.json();
  const slug = body.slug || body.title.replace(/\s+/g, "-").toLowerCase();
  const [workshop] = await db.insert(workshops).values({
    title: body.title,
    slug,
    instructorId: body.instructorId,
    topic: body.topic || "",
    date: body.date || "",
    time: body.time || "",
    capacity: body.capacity || 20,
    registeredCount: body.registeredCount || 0,
    price: body.price || 0,
    description: body.description || "",
    agenda: body.agenda || [],
    free: body.free || false,
    expertTalk: body.expertTalk || false,
    published: body.published || false,
  }).returning();
  return c.json(successResponse(workshop), 201);
});

admin.put("/workshops/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const [updated] = await db.update(workshops).set(body).where(eq(workshops.id, id)).returning();
  if (!updated) return c.json(errorResponse("کارگاه یافت نشد."), 404);
  return c.json(successResponse(updated));
});

admin.delete("/workshops/:id", async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(workshops).where(eq(workshops.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("کارگاه یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

// ── Instructors CRUD ────────────────────────────────────────────────────────

admin.get("/instructors", async (c) => {
  const rows = await db.select().from(instructors);
  return c.json(successResponse(rows));
});

admin.post("/instructors", async (c) => {
  const body = await c.req.json();
  const slug = body.slug || body.name.replace(/\s+/g, "-").toLowerCase();
  const [instructor] = await db.insert(instructors).values({
    name: body.name,
    slug,
    title: body.title || "",
    bio: body.bio || "",
    education: body.education || [],
    specialties: body.specialties || [],
    accent: body.accent || "teal",
    verified: body.verified || false,
    userId: body.userId,
  }).returning();
  return c.json(successResponse(instructor), 201);
});

admin.put("/instructors/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const [updated] = await db.update(instructors).set(body).where(eq(instructors.id, id)).returning();
  if (!updated) return c.json(errorResponse("مدرس یافت نشد."), 404);
  return c.json(successResponse(updated));
});

admin.delete("/instructors/:id", async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(instructors).where(eq(instructors.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("مدرس یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

// ── Categories ──────────────────────────────────────────────────────────────

admin.put("/categories/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const [updated] = await db.update(categories).set(body).where(eq(categories.id, id)).returning();
  if (!updated) return c.json(errorResponse("دسته یافت نشد."), 404);
  return c.json(successResponse(updated));
});

admin.delete("/categories/:id", async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(categories).where(eq(categories.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("دسته یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

// ── Users & Roles ───────────────────────────────────────────────────────────

admin.get("/users", async (c) => {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  return c.json(
    successResponse(
      rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        secondaryRole: u.secondaryRole,
        university: u.university,
        major: u.major,
        createdAt: u.createdAt,
      })),
    ),
  );
});

admin.put("/users/:id/role", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const ROLES = ["user", "member", "instructor", "mentor", "content_manager", "support", "site_admin", "admin"];
  if (!ROLES.includes(body.role)) return c.json(errorResponse("نقش نامعتبر است."), 400);

  const me = getCurrentUser(c);
  const targetRows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (targetRows.length === 0) return c.json(errorResponse("کاربر یافت نشد."), 404);
  const target = targetRows[0];

  // Only system admin can manage admin/site_admin roles
  if (me?.role !== "admin" && (target.role === "admin" || body.role === "admin")) {
    return c.json(errorResponse("فقط ادمین سامانه می‌تواند نقش ادمین سامانه را مدیریت کند."), 403);
  }

  const [updated] = await db.update(users).set({ role: body.role }).where(eq(users.id, id)).returning();

  // Keep admins allow-list in sync
  if (target.email) {
    const adminRow = await db.select().from(adminsTable).where(eq(adminsTable.email, target.email)).limit(1);
    if (body.role === "admin" && adminRow.length === 0) {
      await db.insert(adminsTable).values({ email: target.email });
    } else if (body.role !== "admin" && adminRow.length > 0) {
      await db.delete(adminsTable).where(eq(adminsTable.email, target.email));
    }
  }

  return c.json(successResponse(updated));
});

admin.put("/users/:id/secondary-role", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const [updated] = await db.update(users).set({ secondaryRole: body.secondaryRole || null }).where(eq(users.id, id)).returning();
  if (!updated) return c.json(errorResponse("کاربر یافت نشد."), 404);
  return c.json(successResponse(updated));
});

admin.delete("/users/:id", async (c) => {
  const id = c.req.param("id");
  const me = getCurrentUser(c);
  const targetRows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (targetRows.length === 0) return c.json(errorResponse("کاربر یافت نشد."), 404);
  if (me?.id === id) return c.json(errorResponse("نمی‌توانید حساب خودتان را حذف کنید."), 400);

  const target = targetRows[0];
  if (me?.role !== "admin" && (target.role === "admin" || target.role === "site_admin")) {
    return c.json(errorResponse("فقط ادمین سامانه می‌تواند حساب ادمین را حذف کند."), 403);
  }

  await db.delete(users).where(eq(users.id, id));
  return c.json(successResponse({ message: "حذف شد." }));
});

// ── Orders ──────────────────────────────────────────────────────────────────

admin.get("/orders", async (c) => {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  return c.json(successResponse(rows));
});

admin.delete("/orders/:id", async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(orders).where(eq(orders.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("سفارش یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

// ── Coupons ─────────────────────────────────────────────────────────────────

admin.get("/coupons", async (c) => {
  const rows = await db.select().from(coupons);
  return c.json(successResponse(rows));
});

admin.post("/coupons", async (c) => {
  const body = await c.req.json();
  const code = body.code?.trim().toUpperCase();
  if (!code) return c.json(errorResponse("کد تخفیف لازم است."), 400);

  const existing = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  if (existing.length > 0) return c.json(errorResponse("این کد قبلاً ثبت شده است."), 409);
  if (body.percent <= 0 || body.percent > 100) return c.json(errorResponse("درصد نامعتبر است."), 400);

  const [coupon] = await db.insert(coupons).values({
    code,
    percent: body.percent,
    active: true,
    maxUses: body.maxUses || 0,
    usedCount: 0,
    expiresAt: body.expiresAt,
  }).returning();
  return c.json(successResponse(coupon), 201);
});

admin.patch("/coupons/:id/toggle", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const [updated] = await db.update(coupons).set({ active: body.active }).where(eq(coupons.id, id)).returning();
  if (!updated) return c.json(errorResponse("کد تخفیف یافت نشد."), 404);
  return c.json(successResponse(updated));
});

admin.delete("/coupons/:id", async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(coupons).where(eq(coupons.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("کد تخفیف یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

// ── Offline Payments ────────────────────────────────────────────────────────

admin.get("/offline-payments", async (c) => {
  const rows = await db.select().from(offlinePayments).orderBy(desc(offlinePayments.createdAt));
  return c.json(successResponse(rows));
});

admin.post("/offline-payments/:id/approve", async (c) => {
  const id = c.req.param("id");
  const rows = await db.select().from(offlinePayments).where(eq(offlinePayments.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("پرداخت یافت نشد."), 404);
  const payment = rows[0];
  if (payment.status !== "pending") return c.json(errorResponse("این پرداخت قبلاً بررسی شده است."), 400);

  const [updated] = await db.update(offlinePayments).set({ status: "approved" }).where(eq(offlinePayments.id, id)).returning();

  // Create enrollment
  const existingEnrollment = await db.select().from(enrollments).where(
    and(eq(enrollments.userId, payment.userId), eq(enrollments.courseId, payment.courseId))
  ).limit(1);
  if (existingEnrollment.length === 0) {
    await db.insert(enrollments).values({
      userId: payment.userId,
      courseId: payment.courseId,
      completedLessons: [],
      enrolledAt: Date.now(),
      lastActiveAt: Date.now(),
    });
  }

  return c.json(successResponse(updated));
});

admin.post("/offline-payments/:id/reject", async (c) => {
  const id = c.req.param("id");
  const [updated] = await db.update(offlinePayments).set({ status: "rejected" }).where(eq(offlinePayments.id, id)).returning();
  if (!updated) return c.json(errorResponse("پرداخت یافت نشد."), 404);
  return c.json(successResponse(updated));
});

admin.delete("/offline-payments/:id", async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(offlinePayments).where(eq(offlinePayments.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("پرداخت یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

// ── Profile Approval ────────────────────────────────────────────────────────

admin.get("/profiles/pending", async (c) => {
  // Get users with pendingProfile set
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  const pending = rows.filter((u) => u.pendingProfile);
  return c.json(
    successResponse(
      pending.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        currentProfile: { firstName: u.firstName, lastName: u.lastName, about: u.about },
        pendingProfile: u.pendingProfile,
      })),
    ),
  );
});

admin.post("/profiles/:id/approve", async (c) => {
  const id = c.req.param("id");
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (rows.length === 0) return c.json(errorResponse("کاربر یافت نشد."), 404);
  const pending = rows[0].pendingProfile as any;
  if (!pending) return c.json(errorResponse("پروفایل در انتظار تأییدی وجود ندارد."), 400);

  await db.update(users).set({
    firstName: pending.firstName || rows[0].firstName,
    lastName: pending.lastName || rows[0].lastName,
    avatarUrl: pending.avatarUrl || rows[0].avatarUrl,
    about: pending.about || rows[0].about,
    pendingProfile: null,
  }).where(eq(users.id, id));

  return c.json(successResponse({ message: "تأیید شد." }));
});

admin.post("/profiles/:id/reject", async (c) => {
  const id = c.req.param("id");
  await db.update(users).set({ pendingProfile: null }).where(eq(users.id, id));
  return c.json(successResponse({ message: "رد شد." }));
});

// ── Exam Reports ────────────────────────────────────────────────────────────

admin.get("/exam-reports", async (c) => {
  const rows = await db.select().from(examReports).orderBy(desc(examReports.createdAt));
  return c.json(successResponse(rows));
});

admin.patch("/exam-reports/:id/resolve", async (c) => {
  const id = c.req.param("id");
  const [updated] = await db.update(examReports).set({ status: "resolved" }).where(eq(examReports.id, id)).returning();
  if (!updated) return c.json(errorResponse("گزارش یافت نشد."), 404);
  return c.json(successResponse(updated));
});

admin.delete("/exam-reports/:id", async (c) => {
  const id = c.req.param("id");
  const rows = await db.delete(examReports).where(eq(examReports.id, id)).returning();
  if (rows.length === 0) return c.json(errorResponse("گزارش یافت نشد."), 404);
  return c.json(successResponse({ message: "حذف شد." }));
});

// ── Class Enroll Admin ──────────────────────────────────────────────────────

admin.get("/class-enroll-requests", async (c) => {
  const rows = await db.select().from(classEnrollRequests).orderBy(desc(classEnrollRequests.createdAt));
  return c.json(successResponse(rows));
});

admin.post("/class-enroll-requests/:id/approve", async (c) => {
  const id = c.req.param("id");
  const [updated] = await db.update(classEnrollRequests).set({ status: "approved" }).where(eq(classEnrollRequests.id, id)).returning();
  if (!updated) return c.json(errorResponse("درخواست یافت نشد."), 404);
  return c.json(successResponse(updated));
});

admin.post("/class-enroll-requests/:id/reject", async (c) => {
  const id = c.req.param("id");
  const [updated] = await db.update(classEnrollRequests).set({ status: "rejected" }).where(eq(classEnrollRequests.id, id)).returning();
  if (!updated) return c.json(errorResponse("درخواست یافت نشد."), 404);
  return c.json(successResponse(updated));
});

// Import sql from drizzle-orm
import { sql } from "drizzle-orm";

export default admin;
