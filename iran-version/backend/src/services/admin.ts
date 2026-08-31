import { db } from "../db/index.js";
import {
  users, categories, courses, instructors, articles, products,
  workshops, enrollments, coupons, offlinePayments, exams,
} from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

// ── Courses ───────────────────────────────────────────────────────────────
export async function listAllCourses() {
  return db.query.courses.findMany({ orderBy: (c, { desc }) => [desc(c.createdAt)] });
}

export async function createCourse(data: Record<string, any>) {
  const slug = data.slug || nanoid(8);
  const [row] = await db.insert(courses).values({ ...data, slug }).returning();
  return row;
}

export async function updateCourse(id: string, data: Record<string, any>) {
  const [row] = await db.update(courses).set(data).where(eq(courses.id, id)).returning();
  if (!row) throw new Error("دوره یافت نشد.");
  return row;
}

export async function deleteCourse(id: string) {
  await db.delete(courses).where(eq(courses.id, id));
}

export async function toggleCoursePublish(id: string) {
  const course = await db.query.courses.findFirst({ where: eq(courses.id, id) });
  if (!course) throw new Error("دوره یافت نشد.");
  const [row] = await db.update(courses).set({ published: !course.published }).where(eq(courses.id, id)).returning();
  return row;
}

// ── Articles ──────────────────────────────────────────────────────────────
export async function listAllArticles() {
  return db.query.articles.findMany({ orderBy: (a, { desc }) => [desc(a.createdAt)] });
}

export async function createArticle(data: Record<string, any>) {
  const slug = data.slug || nanoid(8);
  const [row] = await db.insert(articles).values({ ...data, slug }).returning();
  return row;
}

export async function updateArticle(id: string, data: Record<string, any>) {
  const [row] = await db.update(articles).set(data).where(eq(articles.id, id)).returning();
  if (!row) throw new Error("مقاله یافت نشد.");
  return row;
}

export async function deleteArticle(id: string) {
  await db.delete(articles).where(eq(articles.id, id));
}

// ── Products ──────────────────────────────────────────────────────────────
export async function listAllProducts() {
  return db.query.products.findMany({ orderBy: (p, { desc }) => [desc(p.createdAt)] });
}

export async function createProduct(data: Record<string, any>) {
  const slug = data.slug || nanoid(8);
  const [row] = await db.insert(products).values({ ...data, slug }).returning();
  return row;
}

export async function updateProduct(id: string, data: Record<string, any>) {
  const [row] = await db.update(products).set(data).where(eq(products.id, id)).returning();
  if (!row) throw new Error("محصول یافت نشد.");
  return row;
}

export async function deleteProduct(id: string) {
  await db.delete(products).where(eq(products.id, id));
}

// ── Workshops ─────────────────────────────────────────────────────────────
export async function listAllWorkshops() {
  return db.query.workshops.findMany({ orderBy: (w, { desc }) => [desc(w.createdAt)] });
}

export async function createWorkshop(data: Record<string, any>) {
  const slug = data.slug || nanoid(8);
  const [row] = await db.insert(workshops).values({ ...data, slug }).returning();
  return row;
}

export async function updateWorkshop(id: string, data: Record<string, any>) {
  const [row] = await db.update(workshops).set(data).where(eq(workshops.id, id)).returning();
  if (!row) throw new Error("کارگاه یافت نشد.");
  return row;
}

export async function deleteWorkshop(id: string) {
  await db.delete(workshops).where(eq(workshops.id, id));
}

// ── Instructors ───────────────────────────────────────────────────────────
export async function listAllInstructors() {
  return db.query.instructors.findMany();
}

export async function createInstructor(data: Record<string, any>) {
  const slug = data.slug || nanoid(8);
  const [row] = await db.insert(instructors).values({ ...data, slug }).returning();
  return row;
}

export async function updateInstructor(id: string, data: Record<string, any>) {
  const [row] = await db.update(instructors).set(data).where(eq(instructors.id, id)).returning();
  if (!row) throw new Error("مدرس یافت نشد.");
  return row;
}

export async function deleteInstructor(id: string) {
  await db.delete(instructors).where(eq(instructors.id, id));
}

// ── Categories ────────────────────────────────────────────────────────────
export async function createCategory(data: Record<string, any>) {
  const [row] = await db.insert(categories).values(data).returning();
  return row;
}

export async function updateCategory(id: string, data: Record<string, any>) {
  const [row] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
  if (!row) throw new Error("دسته‌بندی یافت نشد.");
  return row;
}

export async function deleteCategory(id: string) {
  await db.delete(categories).where(eq(categories.id, id));
}

// ── Users & Roles ─────────────────────────────────────────────────────────
export async function listUsers() {
  return db.query.users.findMany({ orderBy: (u, { desc }) => [desc(u.createdAt)] });
}

export async function setRole(userId: string, role: string) {
  const [row] = await db.update(users).set({ role }).where(eq(users.id, userId)).returning();
  if (!row) throw new Error("کاربر یافت نشد.");
  return row;
}

export async function setSecondaryRole(userId: string, role: string) {
  const [row] = await db.update(users).set({ secondaryRole: role }).where(eq(users.id, userId)).returning();
  if (!row) throw new Error("کاربر یافت نشد.");
  return row;
}

export async function deleteUser(userId: string) {
  await db.delete(users).where(eq(users.id, userId));
}

// ── Coupons ───────────────────────────────────────────────────────────────
export async function listCoupons() {
  return db.query.coupons.findMany({ orderBy: (c, { desc }) => [desc(c.createdAt)] });
}

export async function createCoupon(data: Record<string, any>) {
  const [row] = await db.insert(coupons).values(data).returning();
  return row;
}

export async function toggleCoupon(id: string) {
  const coupon = await db.query.coupons.findFirst({ where: eq(coupons.id, id) });
  if (!coupon) throw new Error("کد تخفیف یافت نشد.");
  const [row] = await db.update(coupons).set({ active: !coupon.active }).where(eq(coupons.id, id)).returning();
  return row;
}

export async function deleteCoupon(id: string) {
  await db.delete(coupons).where(eq(coupons.id, id));
}

// ── Exam Reports ──────────────────────────────────────────────────────────
export async function listExamReports() {
  const { examReports } = await import("../db/schema.js");
  return db.query.examReports.findMany({ orderBy: (r, { desc }) => [desc(r.createdAt)] });
}

export async function resolveExamReport(id: string) {
  const { examReports } = await import("../db/schema.js");
  const [row] = await db.update(examReports).set({ status: "resolved" }).where(eq(examReports.id, id)).returning();
  return row;
}

export async function deleteExamReport(id: string) {
  const { examReports } = await import("../db/schema.js");
  await db.delete(examReports).where(eq(examReports.id, id));
}

// ── Profile Approval ──────────────────────────────────────────────────────
export async function listPendingProfiles() {
  const rows = await db.query.users.findMany();
  return rows.filter((u) => u.pendingProfile);
}

export async function approveProfile(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user?.pendingProfile) throw new Error("درخواست یافت نشد.");
  const pp = user.pendingProfile as any;
  const [row] = await db.update(users).set({
    firstName: pp.firstName ?? user.firstName,
    lastName: pp.lastName ?? user.lastName,
    avatarUrl: pp.avatarUrl ?? user.avatarUrl,
    about: pp.about ?? user.about,
    pendingProfile: null,
  }).where(eq(users.id, userId)).returning();
  return row;
}

export async function rejectProfile(userId: string) {
  const [row] = await db.update(users).set({ pendingProfile: null }).where(eq(users.id, userId)).returning();
  return row;
}
