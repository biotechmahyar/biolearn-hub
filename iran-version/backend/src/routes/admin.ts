import { Hono } from "hono";
import { db } from "../db/index.js";
import {
  courses, articles, products, workshops, instructors, categories,
  users, orders, coupons, admins, questions, exams, enrollments,
} from "../db/schema.js";
import { requireAuth, requireAdmin, requireContentStaff } from "../middleware/auth.js";
import { eq, desc, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

const admin = new Hono();

// ── Stats ───────────────────────────────────────────────────────────────────

admin.get("/stats", requireAdmin, async (c) => {
  const [userList, orderList, enrollmentList, attemptList, courseList, questionList, ticketList] = await Promise.all([
    db.query.users.findMany(),
    db.query.orders.findMany(),
    db.query.enrollments.findMany(),
    (async () => { const r = await db.execute(sql`SELECT count(*)::int as count FROM exam_attempts`); return r.rows; })(),
    db.query.courses.findMany(),
    db.query.questions.findMany(),
    (async () => { const r = await db.execute(sql`SELECT count(*)::int as count FROM tickets WHERE status = 'open'`); return r.rows; })(),
  ]);
  const paidOrders = orderList.filter((o) => o.status === "paid");
  const revenue = paidOrders.reduce((acc, o) => acc + o.total, 0);
  return c.json({
    ok: true,
    data: {
      userCount: userList.length,
      orderCount: orderList.length,
      paidOrderCount: paidOrders.length,
      revenue,
      enrollmentCount: enrollmentList.length,
      courseCount: courseList.length,
      questionCount: questionList.length,
      openTicketCount: ticketList[0]?.count ?? 0,
    },
  });
});

// ── Courses ─────────────────────────────────────────────────────────────────

admin.get("/courses", requireContentStaff, async (c) => {
  const list = await db.query.courses.findMany({ orderBy: [desc(courses.createdAt)] });
  const enriched = await Promise.all(
    list.map(async (course) => ({
      ...course,
      category: (await db.query.categories.findFirst({ where: eq(categories.id, course.categoryId) }))?.name ?? null,
      instructor: (await db.query.instructors.findFirst({ where: eq(instructors.id, course.instructorId) }))?.name ?? null,
    }))
  );
  return c.json({ ok: true, data: enriched });
});

admin.post("/courses", requireContentStaff, async (c) => {
  const body = await c.req.json();
  const slug = (body.slug || body.title || "").trim().replace(/\s+/g, "-").toLowerCase();
  const [created] = await db.insert(courses).values({
    title: (body.title || "").trim(),
    slug,
    categoryId: body.categoryId,
    instructorId: body.instructorId,
    summary: (body.summary || "").trim(),
    description: (body.summary || "").trim(),
    price: body.price || 0,
    mode: body.mode || "hybrid",
    bundle: body.bundle || "basic",
    published: body.published ?? false,
    audience: body.audience ?? [],
    prerequisites: body.prerequisites ?? [],
    syllabus: (body.syllabus ?? []).map((s: any, i: number) => ({ ...s, id: `s${i}` })),
    packagePrices: body.packagePrices,
    accent: "teal",
    includes: [],
    hasSampleVideo: false,
    files: [],
    featured: false,
    popular: false,
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

admin.put("/courses/:id", requireContentStaff, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const patch: Record<string, unknown> = {
    title: (body.title || "").trim(),
    categoryId: body.categoryId,
    instructorId: body.instructorId,
    summary: (body.summary || "").trim(),
    description: (body.summary || "").trim(),
    price: body.price || 0,
    mode: body.mode,
    bundle: body.bundle,
    published: body.published,
  };
  if (body.audience !== undefined) patch.audience = body.audience;
  if (body.prerequisites !== undefined) patch.prerequisites = body.prerequisites;
  if (body.syllabus !== undefined) patch.syllabus = body.syllabus.map((s: any, i: number) => ({ ...s, id: `s${i}` }));
  if (body.packagePrices !== undefined) patch.packagePrices = body.packagePrices;
  await db.update(courses).set(patch).where(eq(courses.id, id));
  return c.json({ ok: true, data: patch });
});

admin.delete("/courses/:id", requireContentStaff, async (c) => {
  const id = c.req.param("id");
  await db.delete(courses).where(eq(courses.id, id));
  return c.json({ ok: true });
});

admin.patch("/courses/:id/toggle-publish", requireContentStaff, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  await db.update(courses).set({ published: body.published }).where(eq(courses.id, id));
  return c.json({ ok: true });
});

// ── Articles ────────────────────────────────────────────────────────────────

admin.get("/articles", requireContentStaff, async (c) => {
  const list = await db.query.articles.findMany({ orderBy: [desc(articles.createdAt)] });
  return c.json({ ok: true, data: list });
});

admin.post("/articles", requireContentStaff, async (c) => {
  const body = await c.req.json();
  const now = Date.now();
  const [created] = await db.insert(articles).values({
    title: (body.title || "").trim(),
    slug: (body.slug || body.title || "").trim().replace(/\s+/g, "-"),
    category: (body.category || "عمومی").trim(),
    excerpt: (body.excerpt || "").trim(),
    body: body.body || "",
    authorName: (body.authorName || "تیم NIBRC").trim(),
    readTime: body.readTime || 5,
    published: body.published ?? false,
    featured: false,
    status: body.published ? "published" : "draft",
    accent: "teal",
    createdAt: now,
    updatedAt: now,
    seoTitle: body.seoTitle,
    seoDescription: body.seoDescription,
    seoKeywords: body.seoKeywords,
    seoCanonical: body.seoCanonical,
    ogTitle: body.ogTitle,
    ogDescription: body.ogDescription,
    ogImage: body.ogImage,
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

admin.put("/articles/:id", requireContentStaff, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const patch: Record<string, unknown> = {
    title: (body.title || "").trim(),
    category: (body.category || "عمومی").trim(),
    excerpt: (body.excerpt || "").trim(),
    body: body.body || "",
    authorName: (body.authorName || "تیم NIBRC").trim(),
    readTime: body.readTime || 5,
    published: body.published,
  };
  if (body.seoTitle !== undefined) patch.seoTitle = body.seoTitle || undefined;
  if (body.seoDescription !== undefined) patch.seoDescription = body.seoDescription || undefined;
  if (body.seoKeywords !== undefined) patch.seoKeywords = body.seoKeywords?.length ? body.seoKeywords : undefined;
  if (body.seoCanonical !== undefined) patch.seoCanonical = body.seoCanonical || undefined;
  if (body.ogTitle !== undefined) patch.ogTitle = body.ogTitle || undefined;
  if (body.ogDescription !== undefined) patch.ogDescription = body.ogDescription || undefined;
  if (body.ogImage !== undefined) patch.ogImage = body.ogImage || undefined;
  patch.updatedAt = Date.now();
  await db.update(articles).set(patch).where(eq(articles.id, id));
  return c.json({ ok: true, data: patch });
});

admin.delete("/articles/:id", requireContentStaff, async (c) => {
  const id = c.req.param("id");
  await db.delete(articles).where(eq(articles.id, id));
  return c.json({ ok: true });
});

// ── Products ────────────────────────────────────────────────────────────────

admin.get("/products", requireContentStaff, async (c) => {
  const list = await db.query.products.findMany({ orderBy: [desc(products.createdAt)] });
  return c.json({ ok: true, data: list });
});

admin.post("/products", requireContentStaff, async (c) => {
  const body = await c.req.json();
  if (!["flashcards", "guide", "poster"].includes(body.type)) {
    return c.json({ ok: false, error: "نوع محصول نامعتبر است." }, 400);
  }
  const [created] = await db.insert(products).values({
    title: (body.title || "").trim(),
    slug: (body.title || "").trim().replace(/\s+/g, "-").toLowerCase(),
    type: body.type,
    description: (body.description || "").trim(),
    price: body.price || 0,
    published: body.published ?? false,
    featured: false,
    accent: "teal",
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

admin.put("/products/:id", requireContentStaff, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  await db.update(products).set({
    title: (body.title || "").trim(),
    type: body.type,
    description: (body.description || "").trim(),
    price: body.price || 0,
    published: body.published,
  }).where(eq(products.id, id));
  return c.json({ ok: true });
});

admin.delete("/products/:id", requireContentStaff, async (c) => {
  await db.delete(products).where(eq(products.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ── Workshops ───────────────────────────────────────────────────────────────

admin.get("/workshops", requireContentStaff, async (c) => {
  const list = await db.query.workshops.findMany({ orderBy: [desc(workshops.createdAt)] });
  return c.json({ ok: true, data: list });
});

admin.post("/workshops", requireContentStaff, async (c) => {
  const body = await c.req.json();
  const [created] = await db.insert(workshops).values({
    title: (body.title || "").trim(),
    slug: (body.title || "").trim().replace(/\s+/g, "-").toLowerCase(),
    instructorId: body.instructorId,
    topic: body.topic || "",
    date: body.date || "",
    time: body.time || "",
    capacity: body.capacity || 0,
    price: body.price || 0,
    description: (body.description || "").trim(),
    agenda: body.agenda ?? [],
    free: body.free ?? false,
    expertTalk: body.expertTalk ?? false,
    published: body.published ?? false,
    registeredCount: 0,
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

admin.put("/workshops/:id", requireContentStaff, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  await db.update(workshops).set({
    title: (body.title || "").trim(),
    instructorId: body.instructorId,
    topic: body.topic,
    date: body.date,
    time: body.time,
    capacity: body.capacity,
    price: body.price,
    description: (body.description || "").trim(),
    agenda: body.agenda ?? [],
    free: body.free,
    expertTalk: body.expertTalk,
    published: body.published,
  }).where(eq(workshops.id, id));
  return c.json({ ok: true });
});

admin.delete("/workshops/:id", requireContentStaff, async (c) => {
  await db.delete(workshops).where(eq(workshops.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ── Instructors ─────────────────────────────────────────────────────────────

admin.get("/instructors", requireAdmin, async (c) => {
  const list = await db.query.instructors.findMany();
  return c.json({ ok: true, data: list });
});

admin.post("/instructors", requireAdmin, async (c) => {
  const body = await c.req.json();
  const name = (body.name || "").trim();
  if (!name) return c.json({ ok: false, error: "نام مدرس لازم است." }, 400);
  const [created] = await db.insert(instructors).values({
    name,
    slug: name.replace(/\s+/g, "-").toLowerCase(),
    title: (body.title || "").trim(),
    bio: body.bio || "",
    education: body.education?.filter((e: string) => e.trim()) ?? [],
    specialties: body.specialties?.filter((s: string) => s.trim()) ?? [],
    accent: body.accent || "teal",
    verified: body.verified ?? false,
    userId: body.userId,
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

admin.put("/instructors/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const patch: Record<string, unknown> = {
    name: (body.name || "").trim(),
    title: (body.title || "").trim(),
    bio: body.bio || "",
    education: body.education?.filter((e: string) => e.trim()) ?? [],
    specialties: body.specialties?.filter((s: string) => s.trim()) ?? [],
    accent: body.accent || "teal",
    verified: body.verified ?? false,
  };
  if (body.userId !== undefined) patch.userId = body.userId || null;
  await db.update(instructors).set(patch).where(eq(instructors.id, id));
  return c.json({ ok: true });
});

admin.delete("/instructors/:id", requireAdmin, async (c) => {
  await db.delete(instructors).where(eq(instructors.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ── Categories ──────────────────────────────────────────────────────────────

admin.put("/categories/:id", requireContentStaff, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  await db.update(categories).set({ name: (body.name || "").trim() }).where(eq(categories.id, id));
  return c.json({ ok: true });
});

admin.delete("/categories/:id", requireContentStaff, async (c) => {
  const id = c.req.param("id");
  // Delete questions in this category
  const catQuestions = await db.query.questions.findMany({ where: eq(questions.topicId, id) });
  for (const q of catQuestions) {
    await db.delete(questions).where(eq(questions.id, q.id));
  }
  await db.delete(categories).where(eq(categories.id, id));
  return c.json({ ok: true, deleted: catQuestions.length });
});

// ── Users ───────────────────────────────────────────────────────────────────

admin.get("/users", requireAdmin, async (c) => {
  const list = await db.query.users.findMany();
  return c.json({
    ok: true,
    data: list.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      secondaryRole: u.secondaryRole,
      university: u.university,
      major: u.major,
      createdAt: u.createdAt,
    })),
  });
});

const ROLES = ["user", "member", "instructor", "mentor", "content_manager", "support", "site_admin", "admin"];

admin.put("/users/:id/role", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const { role } = await c.req.json();
  if (!ROLES.includes(role)) return c.json({ ok: false, error: "نقش نامعتبر است." }, 400);
  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target) return c.json({ ok: false, error: "کاربر یافت نشد." }, 404);
  const caller = c.get("user");
  // Site admins cannot promote to admin role
  if (caller.role !== "admin" && (target.role === "admin" || role === "admin")) {
    return c.json({ ok: false, error: "فقط ادمین سامانه می‌تواند نقش ادمین را مدیریت کند." }, 403);
  }
  await db.update(users).set({ role }).where(eq(users.id, id));
  // Sync admins table
  if (target.email) {
    if (role === "admin") {
      const existing = await db.query.admins.findFirst({ where: eq(admins.email, target.email) });
      if (!existing) await db.insert(admins).values({ email: target.email });
    } else {
      await db.delete(admins).where(eq(admins.email, target.email));
    }
  }
  return c.json({ ok: true });
});

admin.put("/users/:id/secondary-role", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const { secondaryRole } = await c.req.json();
  const caller = c.get("user");
  if (caller.role !== "admin" && caller.role !== "site_admin") {
    return c.json({ ok: false, error: "فقط ادمین و مدیر سایت می‌توانند نقش ثانویه داشته باشند." }, 403);
  }
  await db.update(users).set({
    secondaryRole: secondaryRole && secondaryRole !== "" ? secondaryRole : null,
  }).where(eq(users.id, id));
  return c.json({ ok: true });
});

admin.delete("/users/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const caller = c.get("user");
  if (caller.id === id) return c.json({ ok: false, error: "نمی‌توانید حساب خودتان را حذف کنید." }, 400);
  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target) return c.json({ ok: false, error: "کاربر یافت نشد." }, 404);
  if (caller.role !== "admin" && (target.role === "admin" || target.role === "site_admin")) {
    return c.json({ ok: false, error: "فقط ادمین سامانه می‌تواند حساب ادمین را حذف کند." }, 403);
  }
  // Cleanup dependent records
  if (target.email) {
    await db.delete(admins).where(eq(admins.email, target.email));
  }
  await db.delete(enrollments).where(eq(enrollments.userId, id));
  await db.delete(orders).where(eq(orders.userId, id));
  await db.delete(users).where(eq(users.id, id));
  return c.json({ ok: true });
});

admin.put("/users/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.email !== undefined) {
    const email = body.email.trim().toLowerCase();
    if (!email.includes("@")) return c.json({ ok: false, error: "ایمیل نامعتبر است." }, 400);
    patch.email = email;
  }
  if (Object.keys(patch).length > 0) {
    await db.update(users).set(patch).where(eq(users.id, id));
  }
  return c.json({ ok: true });
});

// ── Orders ──────────────────────────────────────────────────────────────────

admin.get("/orders", requireAdmin, async (c) => {
  const list = await db.query.orders.findMany({ orderBy: [desc(orders.createdAt)] });
  const enriched = await Promise.all(
    list.map(async (o) => {
      const u = await db.query.users.findFirst({ where: eq(users.id, o.userId) });
      return { ...o, user: u ? { name: u.name, email: u.email } : null };
    })
  );
  return c.json({ ok: true, data: enriched });
});

// ── Coupons ─────────────────────────────────────────────────────────────────

admin.get("/coupons", requireAdmin, async (c) => {
  const list = await db.query.coupons.findMany();
  return c.json({ ok: true, data: list });
});

admin.post("/coupons", requireAdmin, async (c) => {
  const body = await c.req.json();
  const code = (body.code || "").trim().toUpperCase();
  if (!code) return c.json({ ok: false, error: "کد لازم است." }, 400);
  const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, code) });
  if (existing) return c.json({ ok: false, error: "این کد قبلاً ثبت شده است." }, 409);
  if (body.percent <= 0 || body.percent > 100) return c.json({ ok: false, error: "درصد نامعتبر است." }, 400);
  const [created] = await db.insert(coupons).values({
    code,
    percent: body.percent,
    active: true,
    maxUses: body.maxUses || 0,
    usedCount: 0,
    expiresAt: body.expiresAt,
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

admin.patch("/coupons/:id/toggle", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const { active } = await c.req.json();
  await db.update(coupons).set({ active }).where(eq(coupons.id, id));
  return c.json({ ok: true });
});

admin.delete("/coupons/:id", requireAdmin, async (c) => {
  await db.delete(coupons).where(eq(coupons.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ── Exams ───────────────────────────────────────────────────────────────────

admin.get("/exams", requireContentStaff, async (c) => {
  const list = await db.query.exams.findMany({ orderBy: [desc(exams.createdAt)] });
  return c.json({
    ok: true,
    data: list.map((e) => ({
      ...e,
      questionCount: (e.questionIds as string[])?.length ?? 0,
      kindLabel: e.diagnostic ? "تعیین سطح" : e.free ? "رایگان" : "پولی",
    })),
  });
});

admin.post("/exams", requireContentStaff, async (c) => {
  const body = await c.req.json();
  let pool = await db.query.questions.findMany();
  if (body.topicId) pool = pool.filter((q) => q.topicId === body.topicId);
  if (pool.length === 0) return c.json({ ok: false, error: "در این موضوع سؤالی وجود ندارد." }, 400);
  const count = Math.min(body.count || 10, pool.length);
  const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
  const slug = (body.title || "").trim().replace(/\s+/g, "-").toLowerCase() + "-" + Date.now().toString(36);
  const [created] = await db.insert(exams).values({
    title: (body.title || "").trim(),
    slug,
    description: (body.description || "").trim(),
    durationMinutes: body.durationMinutes || 30,
    questionIds: picked.map((q) => q.id),
    free: body.free ?? false,
    published: body.published ?? false,
    featured: false,
    diagnostic: body.diagnostic ?? false,
    accent: "teal",
    order: Date.now(),
  }).returning();
  return c.json({ ok: true, data: { ...created, questionCount: picked.length } }, 201);
});

admin.patch("/exams/:id/toggle-publish", requireContentStaff, async (c) => {
  const { published } = await c.req.json();
  await db.update(exams).set({ published }).where(eq(exams.id, c.req.param("id")));
  return c.json({ ok: true });
});

admin.delete("/exams/:id", requireContentStaff, async (c) => {
  const id = c.req.param("id");
  await db.delete(exams).where(eq(exams.id, id));
  return c.json({ ok: true });
});

// ── Questions ───────────────────────────────────────────────────────────────

admin.get("/questions", requireContentStaff, async (c) => {
  const list = await db.query.questions.findMany();
  const enriched = await Promise.all(
    list.map(async (q) => ({
      ...q,
      topic: (await db.query.categories.findFirst({ where: eq(categories.id, q.topicId) }))?.name ?? null,
    }))
  );
  return c.json({ ok: true, data: enriched });
});

admin.post("/questions", requireContentStaff, async (c) => {
  const body = await c.req.json();
  if (!body.options || body.options.length < 2) return c.json({ ok: false, error: "حداقل دو گزینه لازم است." }, 400);
  const [created] = await db.insert(questions).values({
    text: (body.text || "").trim(),
    options: body.options,
    correctIndex: body.correctIndex,
    explanation: (body.explanation || "").trim(),
    topicId: body.topicId,
    difficulty: body.difficulty || 1,
  }).returning();
  return c.json({ ok: true, data: created }, 201);
});

admin.put("/questions/:id", requireContentStaff, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  await db.update(questions).set({
    text: (body.text || "").trim(),
    options: body.options,
    correctIndex: body.correctIndex,
    explanation: (body.explanation || "").trim(),
    difficulty: body.difficulty || 1,
  }).where(eq(questions.id, id));
  return c.json({ ok: true });
});

admin.delete("/questions/:id", requireContentStaff, async (c) => {
  await db.delete(questions).where(eq(questions.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ── Profile Approval ────────────────────────────────────────────────────────

admin.get("/profiles/pending", requireAdmin, async (c) => {
  const list = await db.query.users.findMany();
  const pending = list.filter((u) => u.pendingProfile);
  return c.json({ ok: true, data: pending });
});

admin.post("/profiles/:id/approve", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user || !user.pendingProfile) return c.json({ ok: false, error: "درخواستی یافت نشد." }, 404);
  const pp = user.pendingProfile as any;
  await db.update(users).set({
    firstName: pp.firstName,
    lastName: pp.lastName,
    avatarUrl: pp.avatarUrl,
    about: pp.about,
    pendingProfile: null,
  }).where(eq(users.id, id));
  return c.json({ ok: true });
});

admin.post("/profiles/:id/reject", requireAdmin, async (c) => {
  const id = c.req.param("id");
  await db.update(users).set({ pendingProfile: null }).where(eq(users.id, id));
  return c.json({ ok: true });
});

export default admin;
