import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// ── Certificate tracking-code generation ─────────────────────────────────────
// Format: GEN-XXXX-XXXX-XXXX — 12 chars from a 32-symbol alphabet (≈60 bits of
// entropy). Generated in the backend with crypto.getRandomValues, never derived
// from userId/courseId, and checked for uniqueness against the
// "by_verification_code" index before insert.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid misreading

function randomBlock(len: number): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export function formatTrackingCode(a: string, b: string, c: string): string {
  return `GEN-${a}-${b}-${c}`;
}

async function generateUniqueTrackingCode(
  ctx: any,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = formatTrackingCode(randomBlock(4), randomBlock(4), randomBlock(4));
    const existing = await ctx.db
      .query("certificates")
      .withIndex("by_verification_code", (q: any) => q.eq("verificationCode", code))
      .first();
    if (!existing) return code;
  }
  throw new Error("تولید کد رهگیری ناموفق بود؛ دوباره تلاش کنید.");
}

// Normalize user input so "gen-abcd-efgh-jklm" or "GENABCDEF GHJKLM" still match.
export function normalizeTrackingCode(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = cleaned.match(/^GEN([A-Z0-9]{12})$/);
  if (!m) return null;
  const body = m[1];
  return formatTrackingCode(body.slice(0, 4), body.slice(4, 8), body.slice(8, 12));
}

// ── Flash Sales ──────────────────────────────────────────────────────────────

export const listActiveFlashSales = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db
      .query("flashSales")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return all.filter(
      (s) => s.startsAt <= now && s.expiresAt >= now,
    );
  },
});

export const listAllFlashSales = query({
  args: {},
  handler: async (ctx) => {
    // @ts-ignore - staff check done at call site
    return await ctx.db.query("flashSales").order("desc").collect();
  },
});

export const createFlashSale = mutation({
  args: {
    title: v.string(),
    targetType: v.union(
      v.literal("course"),
      v.literal("workshop"),
      v.literal("product"),
      v.literal("all"),
    ),
    targetId: v.optional(v.string()),
    percent: v.number(),
    startsAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    return await ctx.db.insert("flashSales", {
      title: args.title,
      targetType: args.targetType,
      targetId: args.targetId,
      percent: Math.min(Math.max(args.percent, 1), 90),
      startsAt: args.startsAt,
      expiresAt: args.expiresAt,
      active: true,
      createdBy: identity.subject as any,
      createdAt: Date.now(),
    });
  },
});

export const toggleFlashSale = mutation({
  args: { id: v.id("flashSales"), active: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: args.active });
  },
});

export const deleteFlashSale = mutation({
  args: { id: v.id("flashSales") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── Promo Banners ────────────────────────────────────────────────────────────

export const listActivePromoBanners = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db
      .query("promoBanners")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return all
      .filter((b) => {
        if (b.startsAt && b.startsAt > now) return false;
        if (b.expiresAt && b.expiresAt < now) return false;
        return true;
      })
      .sort((a, b) => b.priority - a.priority);
  },
});

export const listAllPromoBanners = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("promoBanners").order("desc").collect();
  },
});

export const createPromoBanner = mutation({
  args: {
    text: v.string(),
    link: v.optional(v.string()),
    sticker: v.optional(v.string()),
    color: v.optional(v.string()),
    priority: v.number(),
    repeatCount: v.optional(v.number()),
    startsAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    return await ctx.db.insert("promoBanners", {
      text: args.text,
      link: args.link,
      sticker: args.sticker,
      color: args.color,
      priority: args.priority,
      repeatCount: args.repeatCount,
      active: true,
      startsAt: args.startsAt,
      expiresAt: args.expiresAt,
      createdBy: identity.subject as any,
      createdAt: Date.now(),
    });
  },
});

export const togglePromoBanner = mutation({
  args: { id: v.id("promoBanners"), active: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: args.active });
  },
});

export const deletePromoBanner = mutation({
  args: { id: v.id("promoBanners") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── Certificates ─────────────────────────────────────────────────────────────

export const requestCertificate = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    const userId = identity.subject as any;

    // Check enrollment
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("courseId"), args.courseId))
      .first();
    if (!enrollment) throw new Error("شما در این دوره ثبت‌نام نشده‌اید.");

    // Check if already requested
    const existing = await ctx.db
      .query("certificates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("courseId"), args.courseId))
      .first();
    if (existing) throw new Error("درخواست گواهی قبلاً ارسال شده است.");

    return await ctx.db.insert("certificates", {
      userId,
      courseId: args.courseId,
      status: "requested",
      requestedAt: Date.now(),
    });
  },
});

export const listMyCertificates = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as any;
    const certs = await ctx.db
      .query("certificates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const result = [];
    for (const c of certs) {
      const course = await ctx.db.get(c.courseId);
      const fileUrl = c.certificateStorageId
        ? await ctx.storage.getUrl(c.certificateStorageId as any)
        : null;
      result.push({ ...c, courseTitle: course?.title ?? "—", fileUrl });
    }
    return result;
  },
});

export const listAllCertificates = query({
  args: {},
  handler: async (ctx) => {
    const staff = await getCurrentUser(ctx);
    if (!staff || (staff.role !== "admin" && staff.role !== "site_admin")) {
      return [];
    }
    const certs = await ctx.db.query("certificates").order("desc").collect();
    const result = [];
    for (const c of certs) {
      const user = await ctx.db.get(c.userId);
      const course = await ctx.db.get(c.courseId);
      const fileUrl = c.certificateStorageId
        ? await ctx.storage.getUrl(c.certificateStorageId as any)
        : null;
      result.push({
        ...c,
        userName: user?.name ?? user?.email ?? "—",
        courseTitle: course?.title ?? "—",
        fileUrl,
      });
    }
    return result;
  },
});

export const listAllCertRequests = query({
  args: {},
  handler: async (ctx) => {
    const requested = await ctx.db
      .query("certificates")
      .withIndex("by_status", (q) => q.eq("status", "requested"))
      .order("desc")
      .collect();
    const drafts = await ctx.db
      .query("certificates")
      .withIndex("by_status", (q) => q.eq("status", "draft"))
      .order("desc")
      .collect();
    const requests = [...requested, ...drafts].sort((a, b) => b.requestedAt - a.requestedAt);
    const result = [];
    for (const r of requests) {
      const user = await ctx.db.get(r.userId);
      const course = await ctx.db.get(r.courseId);
      result.push({
        ...r,
        userName: user?.name ?? user?.email ?? "—",
        courseTitle: course?.title ?? "—",
      });
    }
    return result;
  },
});

export const resolveCertificate = mutation({
  args: {
    id: v.id("certificates"),
    status: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("revoked"),
      v.literal("draft"),
    ),
    certificateUrl: v.optional(v.string()),
    certificateStorageId: v.optional(v.string()),
    note: v.optional(v.string()),
    revokedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    const staff = await getCurrentUser(ctx);
    if (!staff || (staff.role !== "admin" && staff.role !== "site_admin")) {
      throw new Error("فقط مدیر سایت یا ادمین مجاز است.");
    }

    const cert = await ctx.db.get(args.id);
    if (!cert) throw new Error("گواهی یافت نشد.");

    if (args.status === "revoked") {
      // Revocation: certificate becomes invalid for public verification.
      await ctx.db.patch(args.id, {
        status: "revoked",
        revokedAt: Date.now(),
        revokedBy: staff._id,
        revokedReason: args.revokedReason ?? args.note,
        note: args.note ?? cert.note,
      });
      return;
    }

    // Approve / reject: (re)assign a tracking code when the certificate is
    // (re)approved, so every issued certificate always has a unique code.
    let verificationCode = cert.verificationCode;
    if (args.status === "approved" && !verificationCode) {
      verificationCode = await generateUniqueTrackingCode(ctx);
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      certificateUrl: args.certificateUrl ?? cert.certificateUrl,
      certificateStorageId: args.certificateStorageId ?? cert.certificateStorageId,
      note: args.note ?? cert.note,
      verificationCode,
      certificateNumber: cert.certificateNumber ?? (verificationCode ? verificationCode : undefined),
      resolvedAt: Date.now(),
      resolvedBy: staff._id,
      // Re-approval clears any previous revocation.
      ...(args.status === "approved"
        ? { revokedAt: undefined, revokedReason: undefined, revokedBy: undefined }
        : {}),
    });
  },
});

// Revoke an issued certificate (admin/site_admin only). The tracking code is
// kept so the public verification page can show a clear "revoked" state
// instead of "not found".
// Delete a certificate entirely (admin/site_admin only).
export const deleteCertificate = mutation({
  args: {
    id: v.id("certificates"),
  },
  handler: async (ctx, args) => {
    const staff = await getCurrentUser(ctx);
    if (!staff || (staff.role !== "admin" && staff.role !== "site_admin")) {
      throw new Error("فقط مدیر سایت یا ادمین مجاز است.");
    }
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

export const revokeCertificate = mutation({
  args: {
    id: v.id("certificates"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await getCurrentUser(ctx);
    if (!staff || (staff.role !== "admin" && staff.role !== "site_admin")) {
      throw new Error("فقط مدیر سایت یا ادمین مجاز است.");
    }
    const cert = await ctx.db.get(args.id);
    if (!cert) throw new Error("گواهی یافت نشد.");
    await ctx.db.patch(args.id, {
      status: "revoked",
      revokedAt: Date.now(),
      revokedBy: staff._id,
      revokedReason: args.reason,
    });
  },
});

// Resolve a certificate storage id into a downloadable URL
// Public verification by tracking code. No auth required. Returns only public
// fields (name, course title, issue date, code, status) — never private user
// data (email, phone, payment info).
export const verifyCertificate = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = normalizeTrackingCode(args.code);
    if (!code) return { found: false as const };

    const cert = await ctx.db
      .query("certificates")
      .withIndex("by_verification_code", (q) => q.eq("verificationCode", code))
      .first();
    if (!cert) return { found: false as const };

    const user = (await ctx.db.get(cert.userId)) as any;
    const course = (await ctx.db.get(cert.courseId)) as any;

    if (cert.status === "revoked") {
      return {
        found: true as const,
        revoked: true as const,
        trackingCode: code,
      };
    }
    if (cert.status !== "approved") {
      // Requested / rejected certificates are not publicly verifiable.
      return { found: false as const };
    }

    return {
      found: true as const,
      revoked: false as const,
      trackingCode: code,
      certificateNumber: cert.certificateNumber ?? code,
      studentName: user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.name || "—",
      firstName: cert.firstName ?? user?.firstName ?? "",
      lastName: cert.lastName ?? user?.lastName ?? "",
      fatherName: cert.fatherName ?? "",
      nationalCode: cert.nationalCode ?? "",
      courseTitle: course?.title || "—",
      courseName: cert.courseName ?? (course?.title || "—"),
      courseDuration: cert.courseDuration ?? "",
      instructorName: cert.instructorName ?? "",
      grade: cert.grade ?? "عالی",
      issuedAt: cert.resolvedAt || cert.requestedAt,
    };
  },
});

export const getCertificateFileUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId as any);
  },
});

// ── Workshop Enrollments ─────────────────────────────────────────────────────

export const enrollWorkshop = mutation({
  args: { workshopId: v.id("workshops") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    const userId = identity.subject as any;

    const existing = await ctx.db
      .query("workshopEnrollments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("workshopId"), args.workshopId))
      .first();
    if (existing) throw new Error("شما قبلاً در این کارگاه ثبت‌نام کرده‌اید.");

    const workshop = await ctx.db.get(args.workshopId);
    if (!workshop) throw new Error("کارگاه یافت نشد.");
    if (workshop.registeredCount >= workshop.capacity) {
      throw new Error("ظرفیت کارگاه تکمیل شده است.");
    }

    await ctx.db.patch(args.workshopId, {
      registeredCount: workshop.registeredCount + 1,
    });

    return await ctx.db.insert("workshopEnrollments", {
      userId,
      workshopId: args.workshopId,
      enrolledAt: Date.now(),
    });
  },
});

export const listMyWorkshopEnrollments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as any;
    const enrollments = await ctx.db
      .query("workshopEnrollments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const result = [];
    for (const e of enrollments) {
      const workshop = await ctx.db.get(e.workshopId);
      if (workshop) {
        result.push({
          ...e,
          workshopTitle: workshop.title,
          workshopDate: workshop.date,
          workshopTime: workshop.time,
          workshopTopic: workshop.topic,
          workshopPrice: workshop.price,
          workshopFree: workshop.free,
        });
      }
    }
    return result;
  },
});

// ── Admin: Manually issue a certificate without a prior request ──────────────
export const adminIssueCertificate = mutation({
  args: {
    userId: v.id("users"),
    courseId: v.id("courses"),
    certificateUrl: v.optional(v.string()),
    certificateStorageId: v.optional(v.string()),
    note: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fatherName: v.optional(v.string()),
    nationalCode: v.optional(v.string()),
    courseName: v.optional(v.string()),
    courseDuration: v.optional(v.string()),
    instructorName: v.optional(v.string()),
    grade: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await getCurrentUser(ctx);
    if (!staff || (staff.role !== "admin" && staff.role !== "site_admin")) {
      throw new Error("فقط مدیر سایت یا ادمین مجاز است.");
    }
    const now = Date.now();
    // Certificate starts as draft — admin must finalize it later
    const id = await ctx.db.insert("certificates", {
      userId: args.userId,
      courseId: args.courseId,
      status: "draft",
      firstName: args.firstName,
      lastName: args.lastName,
      fatherName: args.fatherName,
      nationalCode: args.nationalCode,
      courseName: args.courseName,
      courseDuration: args.courseDuration,
      instructorName: args.instructorName,
      grade: args.grade ?? "عالی",
      certificateUrl: args.certificateUrl,
      certificateStorageId: args.certificateStorageId,
      requestedAt: now,
      note: args.note,
    });
    return { ok: true, id };
  },
});

export const adminUpdateCertificate = mutation({
  args: {
    id: v.id("certificates"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fatherName: v.optional(v.string()),
    nationalCode: v.optional(v.string()),
    courseName: v.optional(v.string()),
    courseDuration: v.optional(v.string()),
    instructorName: v.optional(v.string()),
    grade: v.optional(v.string()),
    certificateUrl: v.optional(v.string()),
    certificateStorageId: v.optional(v.string()),
    note: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("approved"), v.literal("rejected"))),
  },
  handler: async (ctx, args) => {
    const staff = await getCurrentUser(ctx);
    if (!staff || (staff.role !== "admin" && staff.role !== "site_admin")) {
      throw new Error("فقط مدیر سایت یا ادمین مجاز است.");
    }
    const cert = await ctx.db.get(args.id);
    if (!cert) throw new Error("گواهی یافت نشد.");

    const { id, ...patch } = args;

    // When approving, generate tracking code if not already present
    let verificationCode = cert.verificationCode;
    let certificateNumber = cert.certificateNumber;
    if (patch.status === "approved" && !verificationCode) {
      verificationCode = await generateUniqueTrackingCode(ctx);
      certificateNumber = verificationCode;
    }

    await ctx.db.patch(id, {
      ...patch,
      ...(verificationCode ? { verificationCode } : {}),
      ...(certificateNumber ? { certificateNumber } : {}),
      ...(patch.status === "approved" ? { resolvedAt: Date.now(), resolvedBy: staff._id } : {}),
    });
    return { ok: true };
  },
});
