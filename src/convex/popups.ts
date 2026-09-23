import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { isAnyAdmin } from "./admin";

/**
 * Site popups (پاپ‌آپ اعلان‌های سایت)
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-created popups shown as a modern, dismissible corner card on public
 * pages (SitePopupHost). Dismissal is client-side (localStorage), so nothing
 * spams users twice.
 *
 * In addition to admin popups, `listActivePopups` derives a lightweight
 * automatic event ("دوره جدید اضافه شد") for courses published in the last
 * 72 hours — so new-content announcements happen without manual work.
 */

const POPUP_WINDOW_MS = 72 * 60 * 60 * 1000; // auto events: 72 hours

async function requireAdmin(ctx: any) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("ابتدا وارد حساب شوید.");
  if (!(await isAnyAdmin(ctx))) throw new Error("فقط مدیر سایت به این بخش دسترسی دارد.");
  return user;
}

/** Admin: list every popup (management table). */
export const listPopups = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !(await isAnyAdmin(ctx))) return [];
    const popups = await ctx.db.query("sitePopups").order("desc").collect();
    return popups;
  },
});

/** Admin: create a popup. */
export const createPopup = mutation({
  args: {
    kind: v.union(
      v.literal("new_course"),
      v.literal("new_instructor"),
      v.literal("new_workshop"),
      v.literal("published"),
      v.literal("important"),
      v.literal("custom"),
    ),
    title: v.string(),
    body: v.string(),
    icon: v.optional(v.string()),
    link: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
    priority: v.optional(v.number()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    if (args.title.trim().length < 3) throw new Error("عنوان پاپ‌آپ لازم است.");
    return await ctx.db.insert("sitePopups", {
      kind: args.kind,
      title: args.title.trim(),
      body: args.body.trim(),
      icon: args.icon?.trim() || defaultIcon(args.kind),
      link: args.link?.trim() || undefined,
      linkLabel: args.linkLabel?.trim() || undefined,
      active: true,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      priority: args.priority ?? 5,
      createdBy: user._id,
      createdAt: Date.now(),
    });
  },
});

/** Admin: update a popup (content, schedule, active state). */
export const updatePopup = mutation({
  args: {
    id: v.id("sitePopups"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    icon: v.optional(v.string()),
    link: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
    active: v.optional(v.boolean()),
    priority: v.optional(v.number()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const popup = await ctx.db.get(args.id);
    if (!popup) throw new Error("پاپ‌آپ یافت نشد.");
    const { id, ...rest } = args;
    const patch: Record<string, unknown> = {};
    if (rest.title !== undefined) patch.title = rest.title.trim();
    if (rest.body !== undefined) patch.body = rest.body.trim();
    if (rest.icon !== undefined) patch.icon = rest.icon;
    if (rest.link !== undefined) patch.link = rest.link;
    if (rest.linkLabel !== undefined) patch.linkLabel = rest.linkLabel;
    if (rest.active !== undefined) patch.active = rest.active;
    if (rest.priority !== undefined) patch.priority = rest.priority;
    if (rest.startsAt !== undefined) patch.startsAt = rest.startsAt;
    if (rest.endsAt !== undefined) patch.endsAt = rest.endsAt;
    await ctx.db.patch(id, patch);
    return { ok: true };
  },
});

/** Admin: delete a popup (only touches sitePopups — never real content). */
export const deletePopup = mutation({
  args: { id: v.id("sitePopups") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

function defaultIcon(kind: string): string {
  switch (kind) {
    case "new_course":
      return "🎓";
    case "new_instructor":
      return "🧑‍🏫";
    case "new_workshop":
      return "🧪";
    case "published":
      return "✨";
    case "important":
      return "📣";
    default:
      return "📢";
  }
}

/**
 * Public: popups a visitor should see right now.
 * Returns a small ordered list; the client shows the first non-dismissed one.
 */
export const listActivePopups = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("sitePopups")
      .withIndex("by_active", (q) => q.eq("active", true))
      .order("desc")
      .take(50);

    const active = rows.filter((p) => {
      if (p.startsAt && now < p.startsAt) return false;
      if (p.endsAt && now > p.endsAt) return false;
      return true;
    });

    const out = active.map((p) => ({
      key: `popup:${p._id}`,
      kind: p.kind,
      title: p.title,
      body: p.body,
      icon: p.icon || "📢",
      link: p.link ?? null,
      linkLabel: p.linkLabel ?? null,
      priority: p.priority ?? 5,
      createdAt: p.createdAt,
    }));

    // ── Automatic event: a course published in the last 72 hours ──
    try {
      const cutoff = now - POPUP_WINDOW_MS;
      const recentCourses = await ctx.db
        .query("courses")
        .withIndex("by_published", (q) => q.eq("published", true))
        .order("desc")
        .take(30);
      const fresh = recentCourses.find((c) => c.createdAt >= cutoff);
      if (fresh) {
        out.push({
          key: `evt-course:${fresh._id}`,
          kind: "new_course",
          title: "دوره جدید اضافه شد 🎓",
          body: `دوره «${fresh.title}» به ژنوا اضافه شد. همین حالا ببینید!`,
          icon: "🎓",
          link: `/courses/${fresh.slug}`,
          linkLabel: "مشاهده دوره",
          priority: 8,
          createdAt: fresh.createdAt,
        });
      }
    } catch {
      /* auto event must never break the query */
    }

    return out.sort((a, b) => b.priority - a.priority || b.createdAt - a.createdAt).slice(0, 6);
  },
});
