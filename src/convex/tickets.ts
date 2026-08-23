import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { isAdmin } from "./admin";

// Support staff can also run the ticket desk, not only admins.
export const isSupportStaff = async (ctx: any) => {
  const user = await getCurrentUser(ctx);
  return !!user && (user.role === "support" || user.role === "admin");
};

// ── Student side ────────────────────────────────────────────────────────────
export const createTicket = mutation({
  args: { subject: v.string(), message: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ایجاد تیکت ابتدا وارد حساب شوید.");
    if (args.subject.trim().length === 0 || args.message.trim().length === 0) {
      throw new Error("عنوان و متن پیام را وارد کنید.");
    }
    const now = Date.now();
    return await ctx.db.insert("tickets", {
      userId: user._id,
      subject: args.subject.trim(),
      status: "open",
      createdAt: now,
      updatedAt: now,
      messages: [{ author: "student", text: args.message.trim(), at: now }],
    });
  },
});

export const replyTicket = mutation({
  args: { ticketId: v.id("tickets"), message: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("تیکت یافت نشد.");

    const staff = await isSupportStaff(ctx);
    const isOwner = ticket.userId === user._id;
    if (!staff && !isOwner) throw new Error("دسترسی ندارید.");

    const author = staff ? "admin" : "student";
    const messages = [
      ...ticket.messages,
      { author, text: args.message.trim(), at: Date.now() },
    ];
    await ctx.db.patch(args.ticketId, {
      messages,
      status: staff ? "answered" : ticket.status === "closed" ? "closed" : "open",
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.ticketId);
  },
});

export const deleteTicket = mutation({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    if (!(await isSupportStaff(ctx))) throw new Error("دسترسی پشتیبانی لازم است.");
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("تیکت یافت نشد.");
    await ctx.db.delete(args.ticketId);
    return { ok: true };
  },
});

export const updateTicketStatus = mutation({
  args: { ticketId: v.id("tickets"), status: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    if (!(await isSupportStaff(ctx))) throw new Error("دسترسی پشتیبانی لازم است.");
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("تیکت یافت نشد.");
    await ctx.db.patch(args.ticketId, { status: args.status as any, updatedAt: Date.now() });
    return await ctx.db.get(args.ticketId);
  },
});

export const getMyTickets = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("tickets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getTicket = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return null;
    if (ticket.userId !== user._id && !(await isAdmin(ctx))) return null;
    return ticket;
  },
});

// ── Support desk (admins + support role) ───────────────────────────────────
export const listAllTickets = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !(await isSupportStaff(ctx))) return [];
    const tickets = await ctx.db.query("tickets").order("desc").collect();
    return Promise.all(
      tickets.map(async (t) => {
        const u = await ctx.db.get(t.userId);
        return { ...t, user: u ? { name: u.name, email: u.email } : null };
      }),
    );
  },
});
