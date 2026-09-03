import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db.get(identity.subject);
  return user;
}

// ── Create a support ticket ────────────────────────────────────────────────
export const createTicket = mutation({
  args: {
    teacherId: v.id("users"),
    subject: v.string(),
    message: v.string(),
    courseId: v.optional(v.id("courses")),
    courseName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const teacher = await ctx.db.get(args.teacherId);
    if (!teacher) throw new Error("استاد یافت نشد.");
    if (args.subject.trim().length < 3) throw new Error("موضوع لازم است.");
    if (args.message.trim().length < 3) throw new Error("پیام لازم است.");

    const now = Date.now();
    const ticketId = await ctx.db.insert("supportTickets", {
      studentId: user._id,
      studentName: user.name ?? "دانشجو",
      teacherId: args.teacherId,
      courseId: args.courseId,
      courseName: args.courseName,
      subject: args.subject.trim(),
      status: "waiting_for_teacher",
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      unreadByStudent: 0,
      unreadByTeacher: 1,
    });

    await ctx.db.insert("supportMessages", {
      ticketId,
      senderId: user._id,
      senderName: user.name ?? "دانشجو",
      senderRole: user.role ?? "user",
      message: args.message.trim(),
      createdAt: now,
    });

    // Create notification for teacher
    await ctx.db.insert("notifications", {
      userId: args.teacherId,
      type: "SUPPORT_NEW_TICKET",
      title: "درخواست پشتیبانی جدید",
      body: `${user.name ?? "دانشجو"} در مورد «${args.subject.trim()}» پیام ارسال کرده است.`,
      entityType: "SUPPORT_TICKET",
      entityId: ticketId,
      isRead: false,
      createdAt: now,
    });

    return { ticketId };
  },
});

// ── List student's tickets ─────────────────────────────────────────────────
export const listMyTickets = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("supportTickets")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .order("desc")
      .take(50);
  },
});

// ── List teacher's tickets ─────────────────────────────────────────────────
export const listTeacherTickets = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const role = user.role ?? "";
    if (role !== "instructor" && role !== "admin" && role !== "site_admin") return [];
    return await ctx.db
      .query("supportTickets")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
      .order("desc")
      .take(50);
  },
});

// ── Get a single ticket with messages ──────────────────────────────────────
export const getTicket = query({
  args: { ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return null;
    // Permission check
    const role = user.role ?? "";
    const isTeacher = role === "instructor" || role === "admin" || role === "site_admin";
    if (ticket.studentId !== user._id && ticket.teacherId !== user._id && !isTeacher) {
      return null;
    }
    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_ticket_created", (q) => q.eq("ticketId", args.ticketId))
      .order("asc")
      .take(100);
    return { ...ticket, messages };
  },
});

// ── Send a message in a ticket ─────────────────────────────────────────────
export const sendMessage = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    message: v.string(),
    attachmentStorageId: v.optional(v.string()),
    attachmentName: v.optional(v.string()),
    attachmentSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("تیکت یافت نشد.");
    // Permission
    if (ticket.studentId !== user._id && ticket.teacherId !== user._id) {
      throw new Error("دسترسی غیرمجاز.");
    }
    if (args.message.trim().length === 0 && !args.attachmentStorageId) {
      throw new Error("پیام خالی نمی‌تواند ارسال شود.");
    }

    const now = Date.now();
    const isStudent = user._id === ticket.studentId;
    await ctx.db.insert("supportMessages", {
      ticketId: args.ticketId,
      senderId: user._id,
      senderName: user.name ?? "کاربر",
      senderRole: user.role ?? "user",
      message: args.message.trim(),
      attachmentStorageId: args.attachmentStorageId,
      attachmentName: args.attachmentName,
      attachmentSize: args.attachmentSize,
      createdAt: now,
    });

    // Update ticket
    const updates: Record<string, any> = {
      updatedAt: now,
      lastMessageAt: now,
    };
    if (isStudent) {
      updates.unreadByTeacher = (ticket.unreadByTeacher ?? 0) + 1;
      if (ticket.status === "waiting_for_student" || ticket.status === "open") {
        updates.status = "waiting_for_teacher";
      }
    } else {
      updates.unreadByStudent = (ticket.unreadByStudent ?? 0) + 1;
      if (ticket.status === "waiting_for_teacher" || ticket.status === "open") {
        updates.status = "waiting_for_student";
      }
    }
    await ctx.db.patch(args.ticketId, updates);

    // Notify the other party
    const notifyUserId = isStudent ? ticket.teacherId : ticket.studentId;
    const senderName = user.name ?? "کاربر";
    await ctx.db.insert("notifications", {
      userId: notifyUserId,
      type: "SUPPORT_NEW_MESSAGE",
      title: "پیام جدید در پشتیبانی",
      body: `${senderName}: ${args.message.trim().slice(0, 80)}${args.message.trim().length > 80 ? "…" : ""}`,
      entityType: "SUPPORT_TICKET",
      entityId: args.ticketId,
      isRead: false,
      createdAt: now,
    });

    return { ok: true };
  },
});

// ── Mark ticket messages as read ───────────────────────────────────────────
export const markAsRead = mutation({
  args: { ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return;
    const isStudent = user._id === ticket.studentId;
    const now = Date.now();
    if (isStudent) {
      await ctx.db.patch(args.ticketId, { unreadByStudent: 0 });
    } else {
      await ctx.db.patch(args.ticketId, { unreadByTeacher: 0 });
    }
    // Mark individual messages as read
    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .collect();
    for (const m of messages) {
      if (m.senderId !== user._id && !m.readAt) {
        await ctx.db.patch(m._id, { readAt: now });
      }
    }
  },
});

// ── Update ticket status ───────────────────────────────────────────────────
export const updateTicketStatus = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    status: v.union(
      v.literal("open"),
      v.literal("waiting_for_teacher"),
      v.literal("waiting_for_student"),
      v.literal("resolved"),
      v.literal("closed"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("تیکت یافت نشد.");
    if (ticket.teacherId !== user._id && ticket.studentId !== user._id) {
      throw new Error("دسترسی غیرمجاز.");
    }
    await ctx.db.patch(args.ticketId, { status: args.status, updatedAt: Date.now() });
    return { ok: true };
  },
});

// ── Get unread counts ──────────────────────────────────────────────────────
export const getUnreadCounts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { tickets: 0, notifications: 0 };
    const role = user.role ?? "";
    const isTeacher = role === "instructor" || role === "admin" || role === "site_admin";

    let ticketCount = 0;
    if (isTeacher) {
      const tickets = await ctx.db
        .query("supportTickets")
        .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
        .collect();
      ticketCount = tickets.reduce((sum, t) => sum + (t.unreadByTeacher ?? 0), 0);
    } else {
      const tickets = await ctx.db
        .query("supportTickets")
        .withIndex("by_student", (q) => q.eq("studentId", user._id))
        .collect();
      ticketCount = tickets.reduce((sum, t) => sum + (t.unreadByStudent ?? 0), 0);
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("isRead", false))
      .collect();

    return { tickets: ticketCount, notifications: notifications.length };
  },
});

// ── List notifications ─────────────────────────────────────────────────────
export const listNotifications = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(30);
  },
});

// ── Mark notifications as read ─────────────────────────────────────────────
export const markNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("isRead", false))
      .collect();
    for (const n of unread) {
      await ctx.db.patch(n._id, { isRead: true });
    }
  },
});

// ── Get upload URL for attachments ─────────────────────────────────────────
export const getUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// ── List instructors (for student to pick when creating ticket) ─────────────
export const listInstructors = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u: any) => u.role === "instructor" || u.role === "admin" || u.role === "site_admin")
      .map((u: any) => ({ id: u._id, name: u.name ?? "مدرس" }));
  },
});
