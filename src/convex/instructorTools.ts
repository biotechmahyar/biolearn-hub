import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

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
    return await ctx.db
      .query("courseResources")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
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
    if (!args.courseId && !args.roomId) throw new Error("یک دوره یا کلاس انتخاب کنید.");
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
    if (!args.text.trim()) throw new Error("متن پیام خالی است.");
    await ctx.db.insert("messages", {
      senderId: user._id,
      receiverId: args.receiverId,
      text: args.text.trim(),
      read: false,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const listMyMessages = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const sent = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("senderId", user._id))
      .collect();
    const received = await ctx.db
      .query("messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", user._id))
      .collect();
    const all = [...sent, ...received];
    const partnerMap = new Map<string, { partnerId: string; partnerName: string; lastMessage: string; unread: number; lastTs: number }>();
    for (const m of all) {
      const partnerId = String(m.senderId) === String(user._id) ? m.receiverId : m.senderId;
      const partnerUser = await ctx.db.get(partnerId);
      const existing = partnerMap.get(String(partnerId));
      if (!existing || m.createdAt > existing.lastTs) {
        const unread = String(m.senderId) !== String(user._id) && !m.read ? 1 : 0;
        partnerMap.set(String(partnerId), {
          partnerId: String(partnerId),
          partnerName: (partnerUser as any)?.name ?? "کاربر",
          lastMessage: m.text,
          unread: existing ? existing.unread + unread : unread,
          lastTs: m.createdAt,
        });
      }
    }
    return [...partnerMap.values()].sort((a, b) => b.lastTs - a.lastTs);
  },
});

export const listConversation = query({
  args: { partnerId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const sent = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("senderId", user._id))
      .collect();
    const received = await ctx.db
      .query("messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", user._id))
      .collect();
    return [...sent, ...received]
      .filter(
        (m) =>
          (String(m.senderId) === String(user._id) && String(m.receiverId) === args.partnerId) ||
          (String(m.senderId) === args.partnerId && String(m.receiverId) === String(user._id)),
      )
      .sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const markRead = mutation({
  args: { partnerId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;
    const unread = await ctx.db
      .query("messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", user._id))
      .collect();
    for (const m of unread) {
      if (String(m.senderId) === args.partnerId && !m.read) {
        await ctx.db.patch(m._id, { read: true });
      }
    }
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Student Performance ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const getStudentPerformance = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const role = user.role ?? null;
    if (role !== "instructor" && role !== "admin" && role !== "site_admin") return [];
    const rooms = await ctx.db
      .query("classRooms")
      .withIndex("by_instructor", (q) => q.eq("instructorId", user._id))
      .collect();
    const roomIds = new Set(rooms.map((r) => String(r._id)));
    const allMessages = await ctx.db.query("roomMessages").collect();
    const studentData = new Map<string, { name: string; questions: number; messages: number; attendance: number; totalRooms: number }>();
    for (const m of allMessages) {
      if (!roomIds.has(String(m.roomId))) continue;
      if (m.role === "instructor") continue;
      const sid = String(m.userId);
      const existing = studentData.get(sid) ?? { name: m.name, questions: 0, messages: 0, attendance: 0, totalRooms: 0 };
      if (m.type === "question") existing.questions++;
      else existing.messages++;
      studentData.set(sid, existing);
    }
    // attendance
    const allAttendance = await ctx.db.query("attendance").collect();
    for (const a of allAttendance) {
      if (!roomIds.has(String(a.roomId))) continue;
      const sid = String(a.studentId);
      const existing = studentData.get(sid);
      if (existing && a.present) existing.attendance++;
    }
    return [...studentData.entries()].map(([studentId, data]) => ({
      studentId,
      ...data,
      totalRooms: roomIds.size,
    }));
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Attendance ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const listRoomStudents = query({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("roomMessages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const seen = new Map<string, any>();
    for (const m of messages) {
      if (m.role !== "instructor" && !seen.has(String(m.userId))) {
        const u = await ctx.db.get(m.userId);
        seen.set(String(m.userId), { _id: m.userId, name: m.name, role: m.role });
      }
    }
    return [...seen.values()];
  },
});

export const getAttendance = query({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
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
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد شوید.");
    const role = user.role ?? null;
    if (role !== "instructor" && role !== "admin" && role !== "site_admin") throw new Error("دسترسی ندارید.");
    // Check if already marked
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const found = existing.find(
      (a) => String(a.studentId) === String(args.studentId),
    );
    if (found) {
      await ctx.db.patch(found._id, { present: args.present });
    } else {
      await ctx.db.insert("attendance", {
        roomId: args.roomId,
        instructorId: user._id,
        studentId: args.studentId,
        studentName: args.studentName,
        present: args.present,
        markedAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Instructor Payments ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const listMyPayments = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("instructorPayments")
      .withIndex("by_instructor", (q) => q.eq("instructorId", user._id))
      .order("desc")
      .collect();
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Instructor Bank Info ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const getMyBankInfo = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return await ctx.db
      .query("instructorBankInfo")
      .withIndex("by_instructor", (q) => q.eq("instructorId", user._id))
      .first();
  },
});

export const saveBankInfo = mutation({
  args: {
    bankCardNumber: v.string(),
    bankName: v.optional(v.string()),
    accountHolderName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد شوید.");
    const existing = await ctx.db
      .query("instructorBankInfo")
      .withIndex("by_instructor", (q) => q.eq("instructorId", user._id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        bankCardNumber: args.bankCardNumber,
        bankName: args.bankName,
        accountHolderName: args.accountHolderName,
      });
    } else {
      await ctx.db.insert("instructorBankInfo", {
        instructorId: user._id,
        bankCardNumber: args.bankCardNumber,
        bankName: args.bankName,
        accountHolderName: args.accountHolderName,
        createdAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Instructor Announcements ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const listMyAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("notifications")
      .order("desc")
      .take(50);
  },
});
