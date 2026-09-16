import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getCurrentUser } from "./users";

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateTrackingCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `GEN-${seg(4)}-${seg(4)}-${seg(4)}`;
}

async function ensureAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("ورود لازم است.");
  const user = await ctx.db.get(userId);
  if (!user || (user.role !== "admin" && user.role !== "site_admin")) {
    throw new Error("فقط مدیر سایت یا ادمین مجاز است.");
  }
  return { userId, user };
}

// ── Template CRUD ───────────────────────────────────────────────────────────

export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("certificateTemplates").order("desc").collect();
    return templates;
  },
});

export const getActiveTemplate = query({
  args: {},
  handler: async (ctx) => {
    const t = await ctx.db
      .query("certificateTemplates")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();
    return t;
  },
});

export const getTemplate = query({
  args: { id: v.id("certificateTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    backgroundImageUrl: v.optional(v.string()),
    backgroundStorageId: v.optional(v.string()),
    width: v.number(),
    height: v.number(),
    fields: v.any(),
    staticTexts: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId } = await ensureAdmin(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("certificateTemplates", {
      name: args.name,
      description: args.description,
      backgroundImageUrl: args.backgroundImageUrl,
      backgroundStorageId: args.backgroundStorageId,
      width: args.width,
      height: args.height,
      fields: args.fields,
      staticTexts: args.staticTexts,
      isActive: false,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const updateTemplate = mutation({
  args: {
    id: v.id("certificateTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    backgroundImageUrl: v.optional(v.string()),
    backgroundStorageId: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    fields: v.optional(v.any()),
    staticTexts: v.optional(v.any()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    const { id, ...patch } = args;
    const updates: Record<string, any> = { updatedAt: Date.now() };
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) updates[k] = v;
    }
    // If activating, deactivate all others
    if (args.isActive === true) {
      const all = await ctx.db.query("certificateTemplates").collect();
      for (const t of all) {
        if (t._id !== id && t.isActive) {
          await ctx.db.patch(t._id, { isActive: false });
        }
      }
    }
    await ctx.db.patch(id, updates);
    return { ok: true };
  },
});

export const deleteTemplate = mutation({
  args: { id: v.id("certificateTemplates") },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    // Check if any issued certificates use this template
    const issued = await ctx.db
      .query("issuedCertificates")
      .withIndex("by_template", (q) => q.eq("templateId", args.id))
      .first();
    if (issued) {
      throw new Error("این قالب دارای گواهی صادره است و قابل حذف نیست.");
    }
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Issue Certificate ───────────────────────────────────────────────────────

export const issueCertificate = mutation({
  args: {
    templateId: v.id("certificateTemplates"),
    userId: v.id("users"),
    courseId: v.id("courses"),
    instructorId: v.optional(v.id("instructors")),
    firstName: v.string(),
    lastName: v.string(),
    fatherName: v.optional(v.string()),
    nationalCode: v.optional(v.string()),
    courseTitle: v.string(),
    courseDuration: v.optional(v.string()),
    instructorName: v.optional(v.string()),
    honorific: v.optional(v.string()),
    courseCode: v.optional(v.string()),
    issueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: staffId } = await ensureAdmin(ctx);
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("قالب یافت نشد.");
    if (!template.isActive) throw new Error("قالب فعال نیست.");

    // Generate unique tracking code
    let trackingCode: string;
    let attempts = 0;
    do {
      trackingCode = generateTrackingCode();
      const existing = await ctx.db
        .query("issuedCertificates")
        .withIndex("by_tracking_code", (q) => q.eq("trackingCode", trackingCode))
        .first();
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) throw new Error("خطا در تولید کد رهگیری.");

    const now = Date.now();
    const siteUrl = process.env.SITE_URL || "https://nibrc.ir";
    const qrUrl = `${siteUrl}/verify-certificate?code=${trackingCode}`;

    // Generate Jalali issue date if not provided
    let issueDate = args.issueDate;
    if (!issueDate) {
      issueDate = new Date().toLocaleDateString("fa-IR");
    }

    const id = await ctx.db.insert("issuedCertificates", {
      templateId: args.templateId,
      userId: args.userId,
      courseId: args.courseId,
      instructorId: args.instructorId,
      firstName: args.firstName,
      lastName: args.lastName,
      fatherName: args.fatherName,
      nationalCode: args.nationalCode,
      courseTitle: args.courseTitle,
      courseDuration: args.courseDuration,
      instructorName: args.instructorName,
      honorific: args.honorific,
      trackingCode,
      courseCode: args.courseCode,
      issueDate,
      qrUrl,
      status: "issued",
      issuedAt: now,
      issuedBy: staffId,
    });

    return { id, trackingCode };
  },
});

// ── List Issued Certificates ────────────────────────────────────────────────

export const listIssuedCertificates = query({
  args: {},
  handler: async (ctx) => {
    const staff = await getCurrentUser(ctx);
    if (!staff || (staff.role !== "admin" && staff.role !== "site_admin")) {
      return [];
    }
    const certs = await ctx.db.query("issuedCertificates").order("desc").collect();
    const result = [];
    for (const c of certs) {
      const user = await ctx.db.get(c.userId);
      const course = await ctx.db.get(c.courseId);
      const template = await ctx.db.get(c.templateId);
      result.push({
        ...c,
        userName: user?.name ?? user?.email ?? "—",
        courseTitle: course?.title ?? c.courseTitle,
        templateName: template?.name ?? "—",
      });
    }
    return result;
  },
});

export const getIssuedCertificate = query({
  args: { id: v.id("issuedCertificates") },
  handler: async (ctx, args) => {
    const cert = await ctx.db.get(args.id);
    if (!cert) return null;
    const user = await ctx.db.get(cert.userId);
    const course = await ctx.db.get(cert.courseId);
    const template = await ctx.db.get(cert.templateId);
    return {
      ...cert,
      userName: user?.name ?? user?.email ?? "—",
      courseTitle: course?.title ?? cert.courseTitle,
      templateName: template?.name ?? "—",
    };
  },
});

// ── Verify (public) ────────────────────────────────────────────────────────

export const verifyIssuedCertificate = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    if (!code) return { found: false as const };

    const cert = await ctx.db
      .query("issuedCertificates")
      .withIndex("by_tracking_code", (q) => q.eq("trackingCode", code))
      .first();

    if (!cert) return { found: false as const };

    if (cert.status === "revoked") {
      return {
        found: true as const,
        revoked: true as const,
        trackingCode: code,
      };
    }

    const user = await ctx.db.get(cert.userId);
    const course = await ctx.db.get(cert.courseId);

    return {
      found: true as const,
      revoked: false as const,
      trackingCode: code,
      firstName: cert.firstName,
      lastName: cert.lastName,
      fatherName: cert.fatherName ?? "",
      nationalCode: cert.nationalCode ?? "",
      courseTitle: course?.title || cert.courseTitle,
      courseDuration: cert.courseDuration ?? "",
      instructorName: cert.instructorName ?? "",
      honorific: cert.honorific ?? "",
      courseCode: cert.courseCode ?? "",
      issueDate: cert.issueDate,
      issuedAt: cert.issuedAt,
      status: cert.status,
    };
  },
});

// ── Revoke ──────────────────────────────────────────────────────────────────

export const revokeIssuedCertificate = mutation({
  args: {
    id: v.id("issuedCertificates"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: "revoked",
      revokedAt: Date.now(),
      revokedReason: args.reason,
    });
    return { ok: true };
  },
});

export const deleteIssuedCertificate = mutation({
  args: { id: v.id("issuedCertificates") },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});
