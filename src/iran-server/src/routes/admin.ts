// @ts-nocheck
import { Context } from "hono";
import { db } from "../db.js";
import { users, courses, articles, products, workshops, enrollments, orders, coupons, instructorPayments, categories, storeProducts, storeOrders } from "../schema.js";
import { eq, desc, count, sql } from "drizzle-orm";

// ── RBAC Helper ────────────────────────────────────────────────────────────
function requireAdmin(c: any) {
  const user = c.get("user");
  if (!user || !["admin", "site_admin"].includes(user.role)) {
    return c.json({ ok: false, error: "Admin access required" }, 403);
  }
  return null;
}

// ── DASHBOARD STATS ────────────────────────────────────────────────────────
export async function getDashboardStats(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;

  const [userCount] = await db.select({ value: count() }).from(users);
  const [courseCount] = await db.select({ value: count() }).from(courses);
  const [articleCount] = await db.select({ value: count() }).from(articles);
  const [productCount] = await db.select({ value: count() }).from(products);
  const [orderCount] = await db.select({ value: count() }).from(orders);
  const [enrollmentCount] = await db.select({ value: count() }).from(enrollments);
  const [pendingProducts] = await db.select({ value: count() }).from(storeProducts).where(eq(storeProducts.status, "pending"));

  return c.json({
    ok: true,
    data: {
      users: userCount?.value ?? 0,
      courses: courseCount?.value ?? 0,
      articles: articleCount?.value ?? 0,
      products: productCount?.value ?? 0,
      orders: orderCount?.value ?? 0,
      enrollments: enrollmentCount?.value ?? 0,
      pendingProducts: pendingProducts?.value ?? 0,
    },
  });
}

// ── USER MANAGEMENT ────────────────────────────────────────────────────────
export async function listUsers(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = (page - 1) * limit;

  const rows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  const [total] = await db.select({ value: count() }).from(users);
  return c.json({ ok: true, data: { items: rows, total: total?.value ?? 0, page, limit } });
}

export async function updateUser(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  const body = await c.req.json();
  const safeFields: Record<string, any> = {};
  const allowed = ["name", "role", "secondaryRole", "email", "phone", "avatarUrl"];
  for (const k of allowed) {
    if (body[k] !== undefined) safeFields[k] = body[k];
  }
  if (Object.keys(safeFields).length === 0) {
    return c.json({ ok: false, error: "No valid fields" }, 400);
  }
  await db.update(users).set(safeFields).where(eq(users.id, id));
  return c.json({ ok: true });
}

export async function deleteUser(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  await db.delete(users).where(eq(users.id, id));
  return c.json({ ok: true });
}

// ── CONTENT MANAGEMENT ─────────────────────────────────────────────────────
export async function listAllCourses(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const rows = await db.select().from(courses).orderBy(desc(courses.createdAt));
  return c.json({ ok: true, data: rows });
}

export async function updateCourse(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  const body = await c.req.json();
  await db.update(courses).set(body as any).where(eq(courses.id, id));
  return c.json({ ok: true });
}

export async function listAllArticles(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const rows = await db.select().from(articles).orderBy(desc(articles.createdAt));
  return c.json({ ok: true, data: rows });
}

export async function updateArticle(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  const body = await c.req.json();
  await db.update(articles).set(body as any).where(eq(articles.id, id));
  return c.json({ ok: true });
}

export async function listAllProducts(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const rows = await db.select().from(products).orderBy(desc(products.createdAt));
  return c.json({ ok: true, data: rows });
}

export async function updateProduct(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  const body = await c.req.json();
  await db.update(products).set(body as any).where(eq(products.id, id));
  return c.json({ ok: true });
}

export async function listAllWorkshops(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const rows = await db.select().from(workshops).orderBy(desc(workshops.createdAt));
  return c.json({ ok: true, data: rows });
}

export async function updateWorkshop(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  const body = await c.req.json();
  await db.update(workshops).set(body as any).where(eq(workshops.id, id));
  return c.json({ ok: true });
}

// ── CATEGORIES ─────────────────────────────────────────────────────────────
export async function listAllCategories(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const rows = await db.select().from(categories).orderBy(categories.order);
  return c.json({ ok: true, data: rows });
}

export async function createCategory(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const body = await c.req.json();
  const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(categories)// @ts-ignore.values({ id, ...body, createdAt: Date.now() });
  return c.json({ ok: true, data: { id } });
}

export async function updateCategory(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  const body = await c.req.json();
  await db.update(categories).set(body as any).where(eq(categories.id, id));
  return c.json({ ok: true });
}

export async function deleteCategory(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  await db.delete(categories).where(eq(categories.id, id));
  return c.json({ ok: true });
}

// ── ORDERS & ENROLLMENTS ───────────────────────────────────────────────────
export async function listAllOrders(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200);
  return c.json({ ok: true, data: rows });
}

export async function updateOrder(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  const body = await c.req.json();
  await db.update(orders).set(body as any).where(eq(orders.id, id));
  return c.json({ ok: true });
}

export async function listAllEnrollments(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const rows = await db.select().from(enrollments).orderBy(desc(enrollments.createdAt)).limit(500);
  return c.json({ ok: true, data: rows });
}

// ── COUPONS ────────────────────────────────────────────────────────────────
export async function listCoupons(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  return c.json({ ok: true, data: rows });
}

export async function createCoupon(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const body = await c.req.json();
  const id = `coup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(coupons)// @ts-ignore.values({ id, ...body, createdAt: Date.now() });
  return c.json({ ok: true, data: { id } });
}

export async function deleteCoupon(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  await db.delete(coupons).where(eq(coupons.id, id));
  return c.json({ ok: true });
}

// ── INSTRUCTOR PAYMENTS ────────────────────────────────────────────────────
export async function listInstructorPayments(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const rows = await db.select().from(instructorPayments).orderBy(desc(instructorPayments.createdAt));
  return c.json({ ok: true, data: rows });
}

export async function approvePayment(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  const user = c.get("user");
  await db.update(instructorPayments)
    .set({ status: "paid", approvedBy: user.id })
    .where(eq(instructorPayments.id, id));
  return c.json({ ok: true });
}

export async function deletePayment(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  await db.delete(instructorPayments).where(eq(instructorPayments.id, id));
  return c.json({ ok: true });
}

// ── MARKETPLACE ADMIN ──────────────────────────────────────────────────────
export async function listAllStoreProducts(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const status = c.req.query("status");
  let rows;
  if (status) {
    rows = await db.select().from(storeProducts).where(eq(storeProducts.status, status)).orderBy(desc(storeProducts.createdAt));
  } else {
    rows = await db.select().from(storeProducts).orderBy(desc(storeProducts.createdAt));
  }
  return c.json({ ok: true, data: rows });
}

export async function approveStoreProduct(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const id = c.req.param("id");
  const action = c.req.query("action") || "approve";
  await db.update(storeProducts)
    .set({ status: action === "approve" ? "approved" : "rejected" })
    .where(eq(storeProducts.id, id));
  return c.json({ ok: true });
}

export async function listAllStoreOrders(c: Context) {
  const deny = requireAdmin(c); if (deny) return deny;
  const rows = await db.select().from(storeOrders).orderBy(desc(storeOrders.createdAt)).limit(200);
  return c.json({ ok: true, data: rows });
}
