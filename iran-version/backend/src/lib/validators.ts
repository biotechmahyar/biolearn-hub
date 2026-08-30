/**
 * Zod validation schemas for all core API inputs.
 * Mirrors the Convex validators from src/convex/schema.ts and admin.ts
 */
import { z } from "zod";

// ── Shared ─────────────────────────────────────────────────────────────────

export const idSchema = z.string().uuid();

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ── Users ──────────────────────────────────────────────────────────────────

export const roleEnum = z.enum([
  "user",
  "member",
  "instructor",
  "mentor",
  "content_manager",
  "support",
  "site_admin",
  "admin",
]);

export const setRoleSchema = z.object({
  userId: idSchema,
  role: roleEnum,
});

export const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  about: z.string().optional(),
});

// ── Categories ─────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, "نام دسته لازم است").max(200),
});

export const updateCategorySchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(200),
  slug: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  accent: z.string().max(20).optional(),
  order: z.number().int().optional(),
});

// ── Courses ────────────────────────────────────────────────────────────────

export const courseModeEnum = z.enum(["live", "recorded", "hybrid"]);
export const bundleEnum = z.enum(["economy", "basic", "plus", "premium"]);

const syllabusItemSchema = z.object({
  title: z.string(),
  durationMin: z.number().int().positive(),
  free: z.boolean(),
});

const packagePriceSchema = z.object({
  tier: bundleEnum,
  price: z.number().min(0),
  features: z.array(z.string()),
});

export const listCoursesQuerySchema = z.object({
  categorySlug: z.string().optional(),
  search: z.string().optional(),
  featuredOnly: z.coerce.boolean().optional(),
  popularOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createCourseSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  categoryId: idSchema,
  instructorId: idSchema,
  summary: z.string().min(1),
  price: z.number().min(0),
  mode: courseModeEnum,
  bundle: bundleEnum,
  published: z.boolean(),
  audience: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  syllabus: z.array(syllabusItemSchema).optional(),
  packagePrices: z.array(packagePriceSchema).optional(),
});

export const updateCourseSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  categoryId: idSchema,
  instructorId: idSchema,
  summary: z.string().min(1),
  price: z.number().min(0),
  mode: courseModeEnum,
  bundle: bundleEnum,
  published: z.boolean(),
  audience: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  syllabus: z.array(syllabusItemSchema).optional(),
  packagePrices: z.array(packagePriceSchema).optional(),
});

// ── Instructors ────────────────────────────────────────────────────────────

export const createInstructorSchema = z.object({
  name: z.string().min(1, "نام مدرس لازم است"),
  title: z.string().min(1),
  bio: z.string(),
  education: z.array(z.string()),
  specialties: z.array(z.string()),
  accent: z.string().default("teal"),
  verified: z.boolean(),
  userId: idSchema.optional(),
});

export const updateInstructorSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  title: z.string().min(1),
  bio: z.string(),
  education: z.array(z.string()),
  specialties: z.array(z.string()),
  accent: z.string().default("teal"),
  verified: z.boolean(),
  userId: idSchema.optional().nullable(),
});

// ── Articles ───────────────────────────────────────────────────────────────

export const listArticlesQuerySchema = z.object({
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createArticleSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  category: z.string().default("عمومی"),
  excerpt: z.string().min(1),
  body: z.string(),
  authorName: z.string().optional(),
  readTime: z.number().int().positive().default(5),
  published: z.boolean(),
  featuredImage: z.string().url().optional(),
  status: z.enum(["draft", "in_review", "scheduled", "published", "archived"]).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.array(z.string()).optional(),
  seoCanonical: z.string().url().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().url().optional(),
});

export const updateArticleSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  category: z.string().default("عمومی"),
  excerpt: z.string().min(1),
  body: z.string(),
  authorName: z.string().optional(),
  readTime: z.number().int().positive().default(5),
  published: z.boolean(),
  featuredImage: z.string().url().optional(),
  status: z.enum(["draft", "in_review", "scheduled", "published", "archived"]).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.array(z.string()).optional(),
  seoCanonical: z.string().url().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().url().optional(),
});

// ── Products ───────────────────────────────────────────────────────────────

export const productTypeEnum = z.enum(["flashcards", "guide", "poster"]);

export const createProductSchema = z.object({
  title: z.string().min(1),
  type: productTypeEnum,
  description: z.string().min(1),
  price: z.number().min(0),
  published: z.boolean(),
});

export const updateProductSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  type: productTypeEnum,
  description: z.string().min(1),
  price: z.number().min(0),
  published: z.boolean(),
});

// ── Workshops ──────────────────────────────────────────────────────────────

export const createWorkshopSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  instructorId: idSchema,
  topic: z.string().min(1),
  date: z.string(),
  time: z.string(),
  capacity: z.number().int().positive(),
  price: z.number().min(0),
  description: z.string(),
  free: z.boolean(),
  expertTalk: z.boolean(),
  published: z.boolean(),
});

export const updateWorkshopSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  instructorId: idSchema,
  topic: z.string().min(1),
  date: z.string(),
  time: z.string(),
  capacity: z.number().int().positive(),
  price: z.number().min(0),
  description: z.string(),
  free: z.boolean(),
  expertTalk: z.boolean(),
  published: z.boolean(),
});
