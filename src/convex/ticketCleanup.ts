import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Scheduled cleanup for support tickets.
 *
 * When a teacher closes (or resolves) a ticket, `support.updateTicketStatus`
 * schedules this mutation for two weeks later. It re-checks the status first so
 * a ticket that was reopened in the meantime is kept.
 */
export const deleteExpiredTicket = internalMutation({
  args: { ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return { deleted: false };
    if (ticket.status !== "closed" && ticket.status !== "resolved") {
      // Reopened after closing — keep it.
      return { deleted: false };
    }
    await ctx.db.delete(args.ticketId);
    return { deleted: true };
  },
});