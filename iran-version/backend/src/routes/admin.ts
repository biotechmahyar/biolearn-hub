/**
 * Admin routes — require content staff or admin role.
 * Mirrors: admin.ts Convex mutations/queries.
 */
import { Hono } from "hono";
import { success, errorResponse } from "../lib/response.js";
import {
  courseService,
  articleService,
  productService,
  workshopService,
  instructorService,
  categoryService,
} from "../services/content.service.js";
import { userService } from "../services/user.service.js";
import {
  createCourseSchema,
  updateCourseSchema,
  createArticleSchema,
  updateArticleSchema,
  createProductSchema,
  updateProductSchema,
  createWorkshopSchema,
  updateWorkshopSchema,
  createInstructorSchema,
  updateInstructorSchema,
  updateCategorySchema,
  setRoleSchema,
} from "../lib/validators.js";

import type { AppEnv } from "../lib/types.js";

const adminRoutes = new Hono<AppEnv>();

import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

// ── Middleware: require admin auth — looks up role from DB ──────────────────
adminRoutes.use("*", async (c, next) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json(errorResponse("\u0628\u0631\u0627\u06cc \u062f\u0633\u062a\u0631\u0633\u06cc \u0644\u0627\u0632\u0645 \u0627\u0633\u062a.", "UNAUTHORIZED"), 401);
  }
  // Look up user role from DB
  const rows = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  const userRole = rows[0]?.role ?? null;
  // Content staff: admin, site_admin, content_manager
  const isContentStaff = ["admin", "site_admin", "content_manager"].includes(userRole ?? "");
  const isAnyAdmin = ["admin", "site_admin"].includes(userRole ?? "");
  if (!isContentStaff && !isAnyAdmin) {
    return c.json(errorResponse("\u062f\u0633\u062a\u0631\u0633\u06cc \u0644\u0627\u0632\u0645 \u0627\u0633\u062a.", "FORBIDDEN"), 403);
  }
  c.set("userRole", userRole ?? "");
  await next();
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Courses ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

adminRoutes.get("/courses", async (c) => {
  const courses = await courseService.listAdmin();
  return c.json(success(courses));
});

adminRoutes.post("/courses", async (c) => {
  const body = await c.req.json();
  const parsed = createCourseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const d = parsed.data;
  const slug =
    d.slug?.trim() ||
    d.title
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
  const course = await courseService.create({ ...d, slug });
  return c.json(success(course), 201);
});

adminRoutes.put("/courses/:id", async (c) => {
  const body = await c.req.json();
  const parsed = updateCourseSchema.safeParse({ ...body, id: c.req.param("id") });
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const { id, ...data } = parsed.data;
  const course = await courseService.update(id, data);
  if (!course) return c.json(errorResponse("Not found"), 404);
  return c.json(success(course));
});

adminRoutes.delete("/courses/:id", async (c) => {
  const deleted = await courseService.delete(c.req.param("id"));
  if (!deleted) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ deleted: true }));
});

adminRoutes.patch("/courses/:id/toggle-publish", async (c) => {
  const { published } = await c.req.json();
  const course = await courseService.togglePublished(c.req.param("id"), published);
  if (!course) return c.json(errorResponse("Not found"), 404);
  return c.json(success(course));
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Articles ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

adminRoutes.get("/articles", async (c) => {
  const articles = await articleService.listAdmin();
  return c.json(success(articles));
});

adminRoutes.post("/articles", async (c) => {
  const body = await c.req.json();
  const parsed = createArticleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const d = parsed.data;
  const slug =
    d.slug?.trim() ||
    d.title
      .trim()
      .replace(/\s+/g, "-");
  const article = await articleService.create({
    ...d,
    authorName: d.authorName ?? "",
    slug,
    authorId: c.get("userId"),
  });
  return c.json(success(article), 201);
});

adminRoutes.put("/articles/:id", async (c) => {
  const body = await c.req.json();
  const parsed = updateArticleSchema.safeParse({ ...body, id: c.req.param("id") });
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const { id, ...data } = parsed.data;
  const article = await articleService.update(id, data);
  if (!article) return c.json(errorResponse("Not found"), 404);
  return c.json(success(article));
});

adminRoutes.delete("/articles/:id", async (c) => {
  const deleted = await articleService.delete(c.req.param("id"));
  if (!deleted) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ deleted: true }));
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Products ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

adminRoutes.get("/products", async (c) => {
  const products = await productService.listAdmin();
  return c.json(success(products));
});

adminRoutes.post("/products", async (c) => {
  const body = await c.req.json();
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const product = await productService.create(parsed.data);
  return c.json(success(product), 201);
});

adminRoutes.put("/products/:id", async (c) => {
  const body = await c.req.json();
  const parsed = updateProductSchema.safeParse({ ...body, id: c.req.param("id") });
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const { id, ...data } = parsed.data;
  const product = await productService.update(id, data);
  if (!product) return c.json(errorResponse("Not found"), 404);
  return c.json(success(product));
});

adminRoutes.delete("/products/:id", async (c) => {
  const deleted = await productService.delete(c.req.param("id"));
  if (!deleted) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ deleted: true }));
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Workshops ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

adminRoutes.get("/workshops", async (c) => {
  const workshops = await workshopService.listAdmin();
  return c.json(success(workshops));
});

adminRoutes.post("/workshops", async (c) => {
  const body = await c.req.json();
  const parsed = createWorkshopSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const d = parsed.data;
  const slug =
    d.slug?.trim() ||
    d.title
      .trim()
      .replace(/\s+/g, "-");
  const workshop = await workshopService.create({ ...d, slug });
  return c.json(success(workshop), 201);
});

adminRoutes.put("/workshops/:id", async (c) => {
  const body = await c.req.json();
  const parsed = updateWorkshopSchema.safeParse({ ...body, id: c.req.param("id") });
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const { id, ...data } = parsed.data;
  const workshop = await workshopService.update(id, data);
  if (!workshop) return c.json(errorResponse("Not found"), 404);
  return c.json(success(workshop));
});

adminRoutes.delete("/workshops/:id", async (c) => {
  const deleted = await workshopService.delete(c.req.param("id"));
  if (!deleted) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ deleted: true }));
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Instructors ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

adminRoutes.get("/instructors", async (c) => {
  const instructors = await instructorService.list();
  return c.json(success(instructors));
});

adminRoutes.post("/instructors", async (c) => {
  const body = await c.req.json();
  const parsed = createInstructorSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const instructor = await instructorService.create(parsed.data);
  return c.json(success(instructor), 201);
});

adminRoutes.put("/instructors/:id", async (c) => {
  const body = await c.req.json();
  const parsed = updateInstructorSchema.safeParse({ ...body, id: c.req.param("id") });
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const { id, ...data } = parsed.data;
  const instructor = await instructorService.update(id, data);
  if (!instructor) return c.json(errorResponse("Not found"), 404);
  return c.json(success(instructor));
});

adminRoutes.delete("/instructors/:id", async (c) => {
  const deleted = await instructorService.delete(c.req.param("id"));
  if (!deleted) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ deleted: true }));
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Categories (Admin) ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

adminRoutes.put("/categories/:id", async (c) => {
  const body = await c.req.json();
  const parsed = updateCategorySchema.safeParse({ ...body, id: c.req.param("id") });
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const { id, ...data } = parsed.data;
  const cat = await categoryService.update(id, data);
  if (!cat) return c.json(errorResponse("Not found"), 404);
  return c.json(success(cat));
});

adminRoutes.delete("/categories/:id", async (c) => {
  const deleted = await categoryService.delete(c.req.param("id"));
  if (!deleted) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ deleted: true }));
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Users & Roles ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

adminRoutes.get("/users", async (c) => {
  const users = await userService.listAdmin();
  return c.json(success(users));
});

adminRoutes.put("/users/:id/role", async (c) => {
  const body = await c.req.json();
  const parsed = setRoleSchema.safeParse({ ...body, userId: c.req.param("id") });
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }
  const user = await userService.setRole(parsed.data.userId, parsed.data.role);
  if (!user) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ role: user.role }));
});

adminRoutes.put("/users/:id/secondary-role", async (c) => {
  const { secondaryRole } = await c.req.json();
  const user = await userService.setSecondaryRole(c.req.param("id"), secondaryRole || null);
  if (!user) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ secondaryRole: user.secondaryRole }));
});

adminRoutes.delete("/users/:id", async (c) => {
  const deleted = await userService.delete(c.req.param("id"));
  if (!deleted) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ deleted: true }));
});

// ── Profile Approval ──────────────────────────────────────────────────────

adminRoutes.get("/profiles/pending", async (c) => {
  const profiles = await userService.listPendingProfiles();
  return c.json(success(profiles));
});

adminRoutes.post("/profiles/:id/approve", async (c) => {
  const user = await userService.approvePendingProfile(c.req.param("id"));
  if (!user) return c.json(errorResponse("No pending profile"), 404);
  return c.json(success({ approved: true }));
});

adminRoutes.post("/profiles/:id/reject", async (c) => {
  const user = await userService.rejectPendingProfile(c.req.param("id"));
  if (!user) return c.json(errorResponse("Not found"), 404);
  return c.json(success({ rejected: true }));
});

export { adminRoutes };
