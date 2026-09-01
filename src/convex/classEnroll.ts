import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Student: request to join a class room
export const requestClassEnroll = mutation({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");

    // Check for existing request
    const existing = await ctx.db
      .query("classEnrollRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const dup = existing.find(
      (r) =>
        r.roomId === args.roomId &&
        (r.status === "pending" || r.status === "approved"),
    );
    if (dup) {
      if (dup.status === "approved")
        throw new Error("شما قبلاً به این کلاس اضافه شده‌اید.");
      throw new Error("درخواست شما در انتظار تأیید است.");
    }

    await ctx.db.insert("classEnrollRequests", {
      userId: user._id,
      roomId: args.roomId,
      status: "pending",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

// Instructor: list pending requests for their rooms
export const listPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const requests = await ctx.db
      .query("classEnrollRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const result = [];
    for (const r of requests) {
      const [room, student] = await Promise.all([
        ctx.db.get(r.roomId!),
        ctx.db.get(r.userId),
      ]) as [any, any];
      // Only show requests for rooms this instructor owns (or admins see all)
      if (
        room?.instructorId !== user._id &&
        user.role !== "admin" &&
        user.role !== "site_admin"
      )
        continue;
      result.push({
        ...r,
        roomTitle: room?.title ?? "—",
        studentName: student?.name ?? student?.firstName ?? "ناشناخته",
        studentEmail: student?.email ?? "",
      });
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Instructor/admin: approve a class enrollment request
export const approveClassEnroll = mutation({
  args: { requestId: v.id("classEnrollRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("درخواست یافت نشد.");
    if (req.status !== "pending")
      throw new Error("این درخواست قبلاً بررسی شده است.");

    const room = await ctx.db.get(req.roomId!) as any;
    if (!room) throw new Error("کلاس یافت نشد.");
    if (
      room.instructorId !== user._id &&
      user.role !== "admin" &&
      user.role !== "site_admin"
    ) {
      throw new Error("فقط استاد کلاس می‌تواند درخواست را تأیید کند.");
    }

    await ctx.db.patch(args.requestId, { status: "approved" });
    return { ok: true };
  },
});

// Instructor/admin: reject a class enrollment request
export const rejectClassEnroll = mutation({
  args: { requestId: v.id("classEnrollRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("درخواست یافت نشد.");

    const room = await ctx.db.get(req.roomId!) as any;
    if (!room) throw new Error("کلاس یافت نشد.");
    if (
      room.instructorId !== user._id &&
      user.role !== "admin" &&
      user.role !== "site_admin"
    ) {
      throw new Error("فقط استاد کلاس می‌تواند درخواست را رد کند.");
    }

    await ctx.db.patch(args.requestId, { status: "rejected" });
    return { ok: true };
  },
});

// Student: check my request status for a specific room
export const myRequestStatus = query({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const requests = await ctx.db
      .query("classEnrollRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return requests.find((r) => r.roomId === args.roomId) ?? null;
  },
});

// Instructor: list all requests for my rooms (all statuses)
export const listAllMyRoomRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const requests = await ctx.db.query("classEnrollRequests").collect();
    const result = [];
    for (const r of requests) {
      const [room, student] = await Promise.all([
        ctx.db.get(r.roomId!),
        ctx.db.get(r.userId),
      ]) as [any, any];
      if (
        room?.instructorId !== user._id &&
        user.role !== "admin" &&
        user.role !== "site_admin"
      )
        continue;
      result.push({
        ...r,
        roomTitle: room?.title ?? "—",
        studentName: student?.name ?? student?.firstName ?? "ناشناخته",
        studentEmail: student?.email ?? "",
      });
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  },
});
