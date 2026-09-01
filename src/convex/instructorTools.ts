import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
async function isInstructorOrAdmin(ctx: any) {
  const user = await getCurrentUser(ctx);
  if (!user) return false;
  return user.role === "admin" || user.role === "site_admin" || user.role === "instructor";
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Attendance ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const listMyRooms = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rooms = await ctx.db.query("classRooms").collect();
    return rooms.filter((r) => r.instructorId === user._id);
  },
});

export const listRoomStudents = query({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    if (!(await isInstructorOrAdmin(ctx))) return [];
    const messages = await ctx.db
      .query("roomMessages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    // Get unique student IDs from messages
    const studentIds = [...new Set(messages.map((m) => m.userId))];
    const students = await Promise.all(
      studentIds.map(async (id) => {
        const user = await ctx.db.get(id);
        return user ? { _id: user._id, name: user.name ?? "—" } : null;
      }),
    );
    return students.filter(Boolean);
  },
});

export const getAttendance = query({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    if (!(await isInstructorOrAdmin(ctx))) return [];
    return await ctx.db
      .query("attendance")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

export const markAttendance = mutation({
  args: {
    roomId: v.id("classRooms"),
    studentId: v.id("users"),
    studentName: v.string(),
    present: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد شوید.");
    // Check if already marked
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("studentId"), args.studentId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        present: args.present,
        note: args.note,
        markedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("attendance", {
        roomId: args.roomId,
        instructorId: user._id,
        studentId: args.studentId,
        studentName: args.studentName,
        present: args.present,
        note: args.note,
        markedAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Course Resources ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const listCourseResources = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("courseResources")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
  },
});

export const listRoomResources = query({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const resources = await ctx.db
      .query("courseResources")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    // Instructors can only see resources they created; admins see all
    if (user.role === "admin" || user.role === "site_admin") return resources;
    return resources.filter((r) => r.instructorId === user._id);
  },
});

export const addCourseResource = mutation({
  args: {
    courseId: v.optional(v.id("courses")),
    roomId: v.optional(v.id("classRooms")),
    title: v.string(),
    description: v.optional(v.string()),
    fileUrl: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    isFree: v.boolean(),
    price: v.optional(v.number()),
    resourceType: v.optional(v.union(v.literal("file"), v.literal("link"))),
    linkUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد شوید.");
    const basePrice = args.price ?? 0;
    const commission = args.isFree ? 0 : Math.round(basePrice * 0.04);
    await ctx.db.insert("courseResources", {
      courseId: args.courseId,
      roomId: args.roomId,
      instructorId: user._id,
      title: args.title,
      description: args.description,
      fileUrl: args.fileUrl,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      isFree: args.isFree,
      price: basePrice,
      commission,
      resourceType: args.resourceType ?? "file",
      linkUrl: args.linkUrl,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const deleteCourseResource = mutation({
  args: { id: v.id("courseResources") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد شوید.");
    const resource = await ctx.db.get(args.id);
    if (!resource) throw new Error("فایل یافت نشد.");
    if (resource.instructorId !== user._id && user.role !== "admin" && user.role !== "site_admin") {
      throw new Error("دسترسی ندارید.");
    }
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Direct Messages ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const sendMessage = mutation({
  args: {
    receiverId: v.id("users"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد شوید.");
    const text = args.text.trim();
    if (!text) throw new Error("پیام خالی است.");
    await ctx.db.insert("directMessages", {
      senderId: user._id,
      receiverId: args.receiverId,
      text,
      read: false,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const listMyMessages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const received = await ctx.db
      .query("directMessages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
      .order("desc")
      .take(100);
    const sent = await ctx.db
      .query("directMessages")
      .withIndex("by_sender", (q) => q.eq("senderId", userId))
      .order("desc")
      .take(100);
    // Merge and deduplicate by conversation partner
    const all = [...received, ...sent].sort((a, b) => b.createdAt - a.createdAt);
    const conversations = new Map<string, any>();
    for (const msg of all) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!conversations.has(String(partnerId))) {
        const partner = await ctx.db.get(partnerId);
        conversations.set(String(partnerId), {
          partnerId,
          partnerName: partner?.name ?? "—",
          lastMessage: msg.text,
          lastTime: msg.createdAt,
          unread: msg.receiverId === userId && !msg.read ? 1 : 0,
        });
      }
    }
    return [...conversations.values()];
  },
});

export const listConversation = query({
  args: { partnerId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const received = await ctx.db
      .query("directMessages")
      .withIndex("by_receiver", (q) =>
        q.eq("receiverId", userId),
      )
      .filter((q) => q.eq(q.field("senderId"), args.partnerId))
      .order("asc")
      .collect();
    const sent = await ctx.db
      .query("directMessages")
      .withIndex("by_sender", (q) =>
        q.eq("senderId", userId),
      )
      .filter((q) => q.eq(q.field("receiverId"), args.partnerId))
      .order("asc")
      .collect();
    return [...received, ...sent].sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const markRead = mutation({
  args: { partnerId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const unread = await ctx.db
      .query("directMessages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("senderId"), args.partnerId),
          q.eq(q.field("read"), false),
        ),
      )
      .collect();
    for (const msg of unread) {
      await ctx.db.patch(msg._id, { read: true });
    }
    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Payments ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const listMyPayments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("instructorPayments")
      .withIndex("by_instructor", (q) => q.eq("instructorId", userId))
      .order("desc")
      .collect();
  },
});

export const adminCreatePayment = mutation({
  args: {
    instructorId: v.id("users"),
    amount: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin")) {
      throw new Error("فقط ادمین می‌تواند پرداخت ثبت کند.");
    }
    await ctx.db.insert("instructorPayments", {
      instructorId: args.instructorId,
      amount: args.amount,
      description: args.description,
      status: "pending",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const adminMarkPaid = mutation({
  args: {
    id: v.id("instructorPayments"),
    receiptUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "site_admin")) {
      throw new Error("فقط ادمین می‌تواند وضعیت پرداخت را تغییر دهد.");
    }
    await ctx.db.patch(args.id, {
      status: "paid",
      receiptUrl: args.receiptUrl,
      paidAt: Date.now(),
    });
    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Student performance ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const getStudentPerformance = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    // Get all students who interacted with this instructor's rooms
    const myRooms = (await ctx.db.query("classRooms").collect())
      .filter((r) => r.instructorId === user._id);
    const roomIds = myRooms.map((r) => r._id);

    const studentMap = new Map<string, { name: string; questions: number; messages: number; attendance: number }>();

    for (const roomId of roomIds) {
      const messages = await ctx.db
        .query("roomMessages")
        .withIndex("by_room", (q) => q.eq("roomId", roomId))
        .collect();
      for (const m of messages) {
        if (m.userId === user._id) continue;
        const key = String(m.userId);
        const existing = studentMap.get(key) ?? { name: "", questions: 0, messages: 0, attendance: 0 };
        if (m.type === "question") existing.questions++;
        else existing.messages++;
        studentMap.set(key, existing);
      }
      const attendance = await ctx.db
        .query("attendance")
        .withIndex("by_room", (q) => q.eq("roomId", roomId))
        .collect();
      for (const a of attendance) {
        if (a.present) {
          const key = String(a.studentId);
          const existing = studentMap.get(key) ?? { name: a.studentName, questions: 0, messages: 0, attendance: 0 };
          existing.attendance++;
          existing.name = a.studentName;
          studentMap.set(key, existing);
        }
      }
    }

    const results = [];
    for (const [id, stats] of studentMap) {
      const userDoc = await ctx.db.get(id as any) as any;
      results.push({
        studentId: id,
        ...stats,
        name: userDoc?.name ?? stats.name,
        totalRooms: myRooms.length,
      });
    }
    return results;
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Instructor profile: bank account ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const updateBankAccount = mutation({
  args: {
    bankName: v.string(),
    bankAccountNumber: v.string(),
    bankCardNumber: v.string(),
    bankSheba: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ابتدا وارد شوید.");
    await ctx.db.patch(userId, {
      bankName: args.bankName,
      bankAccountNumber: args.bankAccountNumber,
      bankCardNumber: args.bankCardNumber,
      bankSheba: args.bankSheba,
    });
    return { ok: true };
  },
});

export const getBankAccount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      bankName: user.bankName ?? "",
      bankAccountNumber: user.bankAccountNumber ?? "",
      bankCardNumber: user.bankCardNumber ?? "",
      bankSheba: user.bankSheba ?? "",
    };
  },
});
