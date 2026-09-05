import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./users";

// ── Permissions ───────────────────────────────────────────────────────────
// Site Studio is permission-based, not role-based. System admins (admin,
// site_admin) get the full set implicitly; other staff get explicit grants
// in the siteStaffPerms table (managed by system admins).
//
// Full set:
//   content.edit      – text, titles, descriptions
//   media.edit        – images, videos, uploads
//   links.edit        – links and buttons
//   style.edit        – per-element styling (colors, font size/weight, spacing…)
//   layout.edit       – visibility, ordering, spacing between sections
//   components.manage – add / remove / reorder block components
//   theme.manage      – page theme (global colors, fonts, radius, shadows)
//   pages.manage      – create / edit / delete pages
//   navigation.manage – header & footer menus
//   preview           – view live preview of drafts
//   publish           – publish drafts to the public site

export const SITE_STUDIO_PERMS = [
  "content.edit",
  "media.edit",
  "links.edit",
  "style.edit",
  "layout.edit",
  "components.manage",
  "theme.manage",
  "pages.manage",
  "navigation.manage",
  "preview",
  "publish",
] as const;

export type SiteStudioPerm = (typeof SITE_STUDIO_PERMS)[number];

const FULL_PERMS: string[] = [...SITE_STUDIO_PERMS];

// Roles with implicit full access (system-level admins of the site console).
const FULL_ACCESS_ROLES = ["admin", "site_admin"];

// Limited default set for site managers without explicit grants: they can
// edit allowed content/media/links/banners but never theme, layout structure,
// pages, or publish.
export const LIMITED_DEFAULT_PERMS: string[] = [
  "content.edit",
  "media.edit",
  "links.edit",
  "preview",
];

type StudioAccess = {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  perms: Set<string>;
  isFull: boolean;
};

async function getStudioAccess(
  ctx: QueryCtx | { db: QueryCtx["db"]; auth: unknown },
): Promise<StudioAccess | null> {
  const user = await getCurrentUser(ctx as QueryCtx);
  if (!user) return null;
  // System admins: full access implicitly.
  if (FULL_ACCESS_ROLES.includes(user.role ?? "")) {
    return { user, perms: new Set(FULL_PERMS), isFull: true };
  }
  // Explicit grants for other staff (content managers etc.).
  const row = await ctx.db
    .query("studioStaffPerms")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
  const perms = new Set<string>(row?.perms ?? []);
  // Content managers automatically get the limited default set (they can
  // still be granted more explicitly by system admins).
  if (user.role === "content_manager") {
    for (const p of LIMITED_DEFAULT_PERMS) perms.add(p);
  }
  return { user, perms, isFull: false };
}

async function requirePerm(
  ctx: QueryCtx,
  perm: string,
): Promise<StudioAccess> {
  const access = await getStudioAccess(ctx);
  if (!access) throw new Error("ابتدا وارد شوید.");
  if (!access.perms.has(perm)) {
    throw new Error(`دسترسی لازم را ندارید (${perm}).`);
  }
  return access;
}

// Returns the permission set for the current user (null when signed out).
export const myPerms = query({
  args: {},
  handler: async (ctx) => {
    const access = await getStudioAccess(ctx);
    if (!access) return null;
    return {
      isFull: access.isFull,
      role: access.user.role ?? "user",
      perms: [...access.perms],
    };
  },
});

// Lists everyone who has explicit Site Studio grants (system admin view).
export const listStaffPerms = query({
  args: {},
  handler: async (ctx) => {
    const access = await getStudioAccess(ctx);
    if (!access || !access.isFull) throw new Error("دسترسی لازم است.");
    const rows = await ctx.db.query("studioStaffPerms").collect();
    const out = [] as {
      _id: string;
      userId: string;
      name: string;
      perms: string[];
    }[];
    for (const r of rows) {
      const u = await ctx.db.get(r.userId);
      out.push({
        _id: r._id,
        userId: r.userId,
        name: u?.name ?? "—",
        perms: r.perms,
      });
    }
    return out;
  },
});

export const setStaffPerms = mutation({
  args: {
    userId: v.id("users"),
    perms: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await getStudioAccess(ctx);
    if (!access || !access.isFull) throw new Error("فقط مدیریت سامانه مجاز است.");
    const valid = new Set<string>(SITE_STUDIO_PERMS);
    const perms = args.perms.filter((p) => valid.has(p));
    const existing = await ctx.db
      .query("studioStaffPerms")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) {
      if (perms.length === 0) {
        await ctx.db.delete(existing._id);
      } else {
        await ctx.db.patch(existing._id, {
          perms,
          updatedBy: access.user._id,
          updatedAt: Date.now(),
        });
      }
    } else if (perms.length > 0) {
      await ctx.db.insert("studioStaffPerms", {
        userId: args.userId,
        perms,
        updatedBy: access.user._id,
        updatedAt: Date.now(),
      });
    }
  },
});

// ── Pages ─────────────────────────────────────────────────────────────────
export const listPages = query({
  args: {},
  handler: async (ctx) => {
    await requirePerm(ctx, "preview");
    return await ctx.db.query("studioPages").withIndex("by_key").collect();
  },
});

// Public: reads only published pages/elements — used by SiteContentProvider.
export const listPublishedPages = query({
  args: {},
  handler: async (ctx) => {
    const pages = await ctx.db.query("studioPages").collect();
    const out = [];
    for (const p of pages) {
      if (!p.published) continue;
      const elements = await ctx.db
        .query("studioElements")
        .withIndex("by_page", (q) => q.eq("pageId", p._id))
        .collect();
      const theme = await ctx.db
        .query("studioThemes")
        .withIndex("by_page", (q) => q.eq("pageId", p._id))
        .first();
      out.push({
        key: p.key,
        title: p.title,
        route: p.route,
        theme: theme?.published ?? null,
        elements: elements
          .filter((e) => e.publishedVisible !== false)
          .sort((a, b) => (a.publishedOrder ?? a.order) - (b.publishedOrder ?? b.order))
          .map((e) => ({
            id: e._id,
            type: e.type,
            props: e.publishedProps ?? {},
            style: e.publishedStyle ?? {},
          })),
      });
    }
    return out;
  },
});

export const getPage = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await requirePerm(ctx, "preview");
    const page = await ctx.db
      .query("studioPages")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!page) return null;
    const elements = await ctx.db
      .query("studioElements")
      .withIndex("by_page_order", (q) => q.eq("pageId", page._id))
      .collect();
    elements.sort((a, b) => a.order - b.order);
    const theme = await ctx.db
      .query("studioThemes")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .first();
    return { page, elements, theme: theme ?? null };
  },
});

export const upsertPage = mutation({
  args: {
    key: v.string(),
    title: v.string(),
    route: v.string(),
    description: v.optional(v.string()),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    const access = await requirePerm(ctx, "pages.manage");
    const existing = await ctx.db
      .query("studioPages")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        route: args.route,
        description: args.description,
        published: args.published,
        updatedBy: access.user._id,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("studioPages", {
      key: args.key,
      title: args.title,
      route: args.route,
      description: args.description,
      published: args.published,
      updatedBy: access.user._id,
      updatedAt: Date.now(),
    });
  },
});

export const removePage = mutation({
  args: { pageId: v.id("studioPages") },
  handler: async (ctx, args) => {
    await requirePerm(ctx, "pages.manage");
    const elements = await ctx.db
      .query("studioElements")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect();
    for (const e of elements) await ctx.db.delete(e._id);
    const theme = await ctx.db
      .query("studioThemes")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .first();
    if (theme) await ctx.db.delete(theme._id);
    await ctx.db.delete(args.pageId);
  },
});

// ── Elements ──────────────────────────────────────────────────────────────
// Which permission guards editing which part of an element.
function permForKind(kind: "content" | "media" | "links" | "style" | "layout" | "components"): string {
  switch (kind) {
    case "content": return "content.edit";
    case "media": return "media.edit";
    case "links": return "links.edit";
    case "style": return "style.edit";
    case "layout": return "layout.edit";
    case "components": return "components.manage";
  }
}

export const addElement = mutation({
  args: {
    pageId: v.id("studioPages"),
    type: v.string(),
    label: v.optional(v.string()),
    props: v.optional(v.any()),
    style: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const access = await requirePerm(ctx, permForKind("components"));
    const existing = await ctx.db
      .query("studioElements")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect();
    const maxOrder = existing.reduce((m, e) => Math.max(m, e.order), 0);
    return await ctx.db.insert("studioElements", {
      pageId: args.pageId,
      type: args.type,
      label: args.label ?? args.type,
      order: maxOrder + 1,
      visible: true,
      props: args.props ?? {},
      style: args.style ?? {},
      hasDraftChanges: true,
      updatedBy: access.user._id,
      updatedAt: Date.now(),
    });
  },
});

export const updateElement = mutation({
  args: {
    id: v.id("studioElements"),
    label: v.optional(v.string()),
    props: v.optional(v.any()),
    style: v.optional(v.any()),
    visible: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const el = await ctx.db.get(args.id);
    if (!el) throw new Error("عنصر یافت نشد.");
    const patch: Record<string, unknown> = {
      updatedBy: (await requirePerm(ctx, "content.edit")).user._id,
      updatedAt: Date.now(),
      hasDraftChanges: true,
    };
    if (args.label !== undefined) {
      await requirePerm(ctx, permForKind("content"));
      patch.label = args.label;
    }
    if (args.props !== undefined) {
      // Infer the most restrictive relevant permission from props content.
      await requirePerm(ctx, permForKind("content"));
      patch.props = args.props;
    }
    if (args.style !== undefined) {
      await requirePerm(ctx, permForKind("style"));
      patch.style = args.style;
    }
    if (args.visible !== undefined) {
      await requirePerm(ctx, permForKind("layout"));
      patch.visible = args.visible;
    }
    if (args.order !== undefined) {
      await requirePerm(ctx, permForKind("layout"));
      patch.order = args.order;
    }
    await ctx.db.patch(args.id, patch);
  },
});

export const removeElement = mutation({
  args: { id: v.id("studioElements") },
  handler: async (ctx, args) => {
    await requirePerm(ctx, permForKind("components"));
    await ctx.db.delete(args.id);
  },
});

// Reorder: move an element up/down in one call (layout.edit required).
export const reorderElement = mutation({
  args: { id: v.id("studioElements"), direction: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, args) => {
    await requirePerm(ctx, permForKind("layout"));
    const el = await ctx.db.get(args.id);
    if (!el) return;
    const siblings = await ctx.db
      .query("studioElements")
      .withIndex("by_page_order", (q) => q.eq("pageId", el.pageId))
      .collect();
    siblings.sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((s) => s._id === args.id);
    const swapWith = args.direction === "up" ? siblings[idx - 1] : siblings[idx + 1];
    if (!swapWith) return;
    await ctx.db.patch(el._id, { order: swapWith.order, hasDraftChanges: true });
    await ctx.db.patch(swapWith._id, { order: el.order, hasDraftChanges: true });
  },
});

// ── Theme ─────────────────────────────────────────────────────────────────
export const getTheme = query({
  args: { pageId: v.id("studioPages") },
  handler: async (ctx, args) => {
    await requirePerm(ctx, "preview");
    return (
      (await ctx.db
        .query("studioThemes")
        .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
        .first()) ?? null
    );
  },
});

export const saveTheme = mutation({
  args: {
    pageId: v.id("studioPages"),
    draft: v.any(),
  },
  handler: async (ctx, args) => {
    const access = await requirePerm(ctx, "theme.manage");
    const existing = await ctx.db
      .query("studioThemes")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        draft: args.draft,
        hasDraftChanges: true,
        updatedBy: access.user._id,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("studioThemes", {
        pageId: args.pageId,
        draft: args.draft,
        hasDraftChanges: true,
        updatedBy: access.user._id,
        updatedAt: Date.now(),
      });
    }
  },
});

// ── Publish / versions ────────────────────────────────────────────────────
// Publishes every draft change on the page (elements + theme) and stores an
// immutable version snapshot for restore.
export const publishPage = mutation({
  args: { pageId: v.id("studioPages"), label: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const access = await requirePerm(ctx, "publish");
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("صفحه یافت نشد.");
    const elements = await ctx.db
      .query("studioElements")
      .withIndex("by_page_order", (q) => q.eq("pageId", args.pageId))
      .collect();
    elements.sort((a, b) => a.order - b.order);

    const now = Date.now();
    const snapshot: {
      version: number;
      label?: string;
      publishedAt: number;
      publishedBy: string;
      theme: unknown;
      elements: {
        id: string;
        type: string;
        label?: string;
        props: unknown;
        style: unknown;
        visible: boolean;
        order: number;
      }[];
    } = {
      version: 0,
      label: args.label,
      publishedAt: now,
      publishedBy: access.user.name ?? "—",
      theme: null,
      elements: [],
    };

    for (const e of elements) {
      await ctx.db.patch(e._id, {
        publishedProps: e.props ?? {},
        publishedStyle: e.style ?? {},
        publishedVisible: e.visible,
        publishedOrder: e.order,
        hasDraftChanges: false,
      });
      snapshot.elements.push({
        id: e._id,
        type: e.type,
        label: e.label ?? undefined,
        props: e.props ?? {},
        style: e.style ?? {},
        visible: e.visible,
        order: e.order,
      });
    }

    const theme = await ctx.db
      .query("studioThemes")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .first();
    if (theme) {
      await ctx.db.patch(theme._id, {
        published: theme.draft ?? null,
        hasDraftChanges: false,
        updatedBy: access.user._id,
        updatedAt: now,
      });
      snapshot.theme = theme.draft ?? null;
    }

    await ctx.db.patch(args.pageId, {
      published: true,
      updatedBy: access.user._id,
      updatedAt: now,
    });

    // Version snapshot
    const versions = await ctx.db
      .query("studioVersions")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect();
    const nextVersion = versions.reduce((m, v) => Math.max(m, v.version), 0) + 1;
    snapshot.version = nextVersion;
    await ctx.db.insert("studioVersions", {
      pageId: args.pageId,
      version: nextVersion,
      label: args.label,
      snapshot,
      createdBy: access.user._id,
      createdAt: now,
    });
    return nextVersion;
  },
});

export const listVersions = query({
  args: { pageId: v.id("studioPages") },
  handler: async (ctx, args) => {
    await requirePerm(ctx, "preview");
    const rows = await ctx.db
      .query("studioVersions")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect();
    rows.sort((a, b) => b.version - a.version);
    return rows.map((r) => ({
      _id: r._id,
      version: r.version,
      label: r.label,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      elementCount: (r.snapshot?.elements as unknown[] | undefined)?.length ?? 0,
    }));
  },
});

export const getVersionDetail = query({
  args: { versionId: v.id("studioVersions") },
  handler: async (ctx, args) => {
    await requirePerm(ctx, "preview");
    const v = await ctx.db.get(args.versionId);
    if (!v) return null;
    return v.snapshot;
  },
});

// Restores a previous version into the DRAFT (does not auto-publish; admin
// reviews in preview then publishes deliberately).
export const restoreVersion = mutation({
  args: { versionId: v.id("studioVersions") },
  handler: async (ctx, args) => {
    const access = await requirePerm(ctx, "components.manage");
    const row = await ctx.db.get(args.versionId);
    if (!row) throw new Error("نسخه یافت نشد.");
    const snap = row.snapshot as {
      theme?: unknown;
      elements: { type: string; label?: string; props: unknown; style: unknown; visible: boolean; order: number }[];
    };
    const elements = await ctx.db
      .query("studioElements")
      .withIndex("by_page", (q) => q.eq("pageId", row.pageId))
      .collect();
    for (const e of elements) await ctx.db.delete(e._id);
    for (const el of snap.elements) {
      await ctx.db.insert("studioElements", {
        pageId: row.pageId,
        type: el.type,
        label: el.label ?? el.type,
        order: el.order,
        visible: el.visible,
        props: el.props as Record<string, unknown>,
        style: el.style as Record<string, unknown>,
        hasDraftChanges: true,
        updatedBy: access.user._id,
        updatedAt: Date.now(),
      });
    }
    if (snap.theme) {
      const theme = await ctx.db
        .query("studioThemes")
        .withIndex("by_page", (q) => q.eq("pageId", row.pageId))
        .first();
      if (theme) {
        await ctx.db.patch(theme._id, {
          draft: snap.theme,
          hasDraftChanges: true,
          updatedBy: access.user._id,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

// Discard draft changes on a page (elements + theme) back to last published.
export const discardDraft = mutation({
  args: { pageId: v.id("studioPages") },
  handler: async (ctx, args) => {
    await requirePerm(ctx, "components.manage");
    const elements = await ctx.db
      .query("studioElements")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect();
    for (const e of elements) {
      await ctx.db.patch(e._id, {
        props: e.publishedProps ?? {},
        style: e.publishedStyle ?? {},
        visible: e.publishedVisible ?? true,
        order: e.publishedOrder ?? e.order,
        hasDraftChanges: false,
      });
    }
    const theme = await ctx.db
      .query("studioThemes")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .first();
    if (theme) {
      await ctx.db.patch(theme._id, {
        draft: theme.published ?? null,
        hasDraftChanges: false,
      });
    }
  },
});

// Unpublish: hide the page from the public site while keeping content.
export const unpublishPage = mutation({
  args: { pageId: v.id("studioPages") },
  handler: async (ctx, args) => {
    await requirePerm(ctx, "publish");
    await ctx.db.patch(args.pageId, { published: false });
  },
});

// ── Media library ─────────────────────────────────────────────────────────
export const listMedia = query({
  args: {},
  handler: async (ctx) => {
    await requirePerm(ctx, "preview");
    const rows = await ctx.db.query("studioMedia").collect();
    const out = [];
    for (const m of rows.sort((a, b) => b.createdAt - a.createdAt)) {
      const url = await ctx.storage.getUrl(m.storageId);
      out.push({
        _id: m._id,
        name: m.name,
        kind: m.kind,
        size: m.size,
        url: url ?? m.url ?? null,
      });
    }
    return out;
  },
});

export const addMedia = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    kind: v.union(v.literal("image"), v.literal("video")),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    size: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePerm(ctx, "media.edit");
    return await ctx.db.insert("studioMedia", {
      storageId: args.storageId,
      name: args.name,
      kind: args.kind,
      width: args.width,
      height: args.height,
      size: args.size,
      createdAt: Date.now(),
    });
  },
});

export const removeMedia = mutation({
  args: { id: v.id("studioMedia") },
  handler: async (ctx, args) => {
    await requirePerm(ctx, "media.edit");
    const m = await ctx.db.get(args.id);
    if (m) {
      await ctx.storage.delete(m.storageId);
      await ctx.db.delete(args.id);
    }
  },
});

// Public read of a media URL (published pages may reference studio media).
export const mediaUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Draft preview of a single page (permission-gated) for the preview window.
export const previewPage = query({
  args: { key: v.string(), draft: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requirePerm(ctx, "preview");
    const page = await ctx.db
      .query("studioPages")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!page) return null;
    const elements = await ctx.db
      .query("studioElements")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .collect();
    const theme = await ctx.db
      .query("studioThemes")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .first();
    const useDraft = args.draft !== false;
    return {
      key: page.key,
      title: page.title,
      route: page.route,
      theme: useDraft ? theme?.draft ?? null : theme?.published ?? null,
      elements: (useDraft ? elements.filter((e) => e.visible !== false) : elements.filter((e) => e.publishedVisible !== false))
        .sort((a, b) =>
          useDraft
            ? a.order - b.order
            : (a.publishedOrder ?? a.order) - (b.publishedOrder ?? b.order),
        )
        .map((e) => ({
          id: e._id,
          type: e.type,
          props: (useDraft ? e.props : e.publishedProps) ?? {},
          style: (useDraft ? e.style : e.publishedStyle) ?? {},
        })),
    };
  },
});

// ── Bootstrap: seed default editable pages once ───────────────────────────
export const bootstrapPages = mutation({
  args: {},
  handler: async (ctx) => {
    const access = await getStudioAccess(ctx);
    if (!access || !access.isFull) {
      // Allow seeding only when empty regardless, but only system admins can seed.
      const existing = await ctx.db.query("studioPages").first();
      if (existing) return "exists";
      return "denied";
    }
    const existing = await ctx.db.query("studioPages").first();
    if (existing) return "exists";
    const defaults = [
      { key: "home", title: "صفحهٔ اصلی", route: "/", description: "بخش‌های قابل ویرایش صفحهٔ اصلی" },
      { key: "about", title: "درباره ما", route: "/about", description: "متن‌ها و تصاویر صفحهٔ درباره ما" },
      { key: "rules", title: "قوانین", route: "/rules", description: "متن قوانین و حریم خصوصی" },
      { key: "header", title: "هدر و منو", route: "(header)", description: "لوگو، منو و بنر بالای سایت" },
      { key: "footer", title: "فوتر", route: "(footer)", description: "لینک‌ها و متن‌های فوتر" },
    ];
    for (const d of defaults) {
      await ctx.db.insert("studioPages", { ...d, published: false });
    }
    return "seeded";
  },
});
