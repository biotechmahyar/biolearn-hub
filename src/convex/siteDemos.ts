import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Queries ───────────────────────────────────────────────────────────────

/** List all demos, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const demos = await ctx.db.query("siteDemos").order("desc").collect();
    // Attach creator name
    const demosWithCreator = await Promise.all(
      demos.map(async (d) => {
        const creator = await ctx.db.get(d.createdBy);
        return { ...d, creatorName: creator?.name ?? creator?.email ?? "ناشناخته" };
      })
    );
    return demosWithCreator;
  },
});

/** Get a single demo by slug. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const demo = await ctx.db
      .query("siteDemos")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!demo) return null;
    const creator = await ctx.db.get(demo.createdBy);
    return { ...demo, creatorName: creator?.name ?? creator?.email ?? "ناشناخته" };
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────

/** Create a new demo. */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    theme: v.optional(v.any()),
    previewImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await ctx.auth.getUserIdentity();
    if (!me) throw new Error("Authentication required");
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", me.email ?? ""))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "site_admin")) {
      throw new Error("Only admins can create demos");
    }
    // Ensure slug is unique
    const existing = await ctx.db
      .query("siteDemos")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error("Slug already exists");

    const now = Date.now();
    const id = await ctx.db.insert("siteDemos", {
      name: args.name,
      slug: args.slug,
      description: args.description ?? "",
      status: "active",
      theme: args.theme ?? null,
      previewImage: args.previewImage,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/** Update an existing demo. */
export const update = mutation({
  args: {
    id: v.id("siteDemos"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    theme: v.optional(v.any()),
    previewImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await ctx.auth.getUserIdentity();
    if (!me) throw new Error("Authentication required");
    const demo = await ctx.db.get(args.id);
    if (!demo) throw new Error("Demo not found");

    // If slug is changing, ensure uniqueness
    if (args.slug && args.slug !== demo.slug) {
      const existing = await ctx.db
        .query("siteDemos")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug!))
        .unique();
      if (existing) throw new Error("Slug already exists");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.slug !== undefined) patch.slug = args.slug;
    if (args.description !== undefined) patch.description = args.description;
    if (args.status !== undefined) patch.status = args.status;
    if (args.theme !== undefined) patch.theme = args.theme;
    if (args.previewImage !== undefined) patch.previewImage = args.previewImage;

    await ctx.db.patch(args.id, patch as any);
    return args.id;
  },
});

/** Clone a demo with a new slug and name. */
export const clone = mutation({
  args: {
    sourceId: v.id("siteDemos"),
    newName: v.string(),
    newSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await ctx.auth.getUserIdentity();
    if (!me) throw new Error("Authentication required");
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", me.email ?? ""))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "site_admin")) {
      throw new Error("Only admins can clone demos");
    }
    const source = await ctx.db.get(args.sourceId);
    if (!source) throw new Error("Source demo not found");

    const existing = await ctx.db
      .query("siteDemos")
      .withIndex("by_slug", (q) => q.eq("slug", args.newSlug))
      .unique();
    if (existing) throw new Error("Slug already exists");

    const now = Date.now();
    const id = await ctx.db.insert("siteDemos", {
      name: args.newName,
      slug: args.newSlug,
      description: source.description ?? "",
      status: "active",
      theme: source.theme ?? null,
      previewImage: source.previewImage,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/** Delete a demo. */
export const remove = mutation({
  args: { id: v.id("siteDemos") },
  handler: async (ctx, args) => {
    const me = await ctx.auth.getUserIdentity();
    if (!me) throw new Error("Authentication required");
    const demo = await ctx.db.get(args.id);
    if (!demo) throw new Error("Demo not found");
    await ctx.db.delete(args.id);
    return true;
  },
});

// ── Seed: 14 biology-themed demo designs ──────────────────────────────────

const DEMO_SEEDS: {
  name: string;
  slug: string;
  description: string;
  theme: Record<string, unknown>;
}[] = [
  {
    name: "Demo 01 — DNA Helix Academy",
    slug: "demo_1",
    description: "تم کلاسیک با رنگ‌های سایان و انیمیشن مارپیچ DNA双螺旋",
    theme: {
      primary: "#06b6d4",
      secondary: "#0891b2",
      accent: "#22d3ee",
      background: "#021a1f",
      surface: "#042f36",
      text: "#ecfeff",
      textMuted: "#67e8f9",
      borderRadius: "0.5rem",
      fontFamily: "Vazirmatn, system-ui",
      animation: "dna-helix",
      heroGradient: "linear-gradient(135deg, #021a1f 0%, #083344 50%, #06b6d420 100%)",
    },
  },
  {
    name: "Demo 02 — MicroWorld Lab",
    slug: "demo_2",
    description: "پتری دیش و کلنی باکتریایی با رنگ‌های سبز زنده",
    theme: {
      primary: "#22c55e",
      secondary: "#16a34a",
      accent: "#4ade80",
      background: "#0a1a0d",
      surface: "#0f2a15",
      text: "#f0fdf4",
      textMuted: "#86efac",
      borderRadius: "50%",
      fontFamily: "Vazirmatn, system-ui",
      animation: "petri-dish",
      heroGradient: "linear-gradient(135deg, #0a1a0d 0%, #14532d 50%, #22c55e15 100%)",
    },
  },
  {
    name: "Demo 03 — Bioluminescence",
    slug: "demo_3",
    description: "ارگانیسم‌های دریایی درخشان با پارتیکل‌های نئونی",
    theme: {
      primary: "#a855f7",
      secondary: "#06b6d4",
      accent: "#f472b6",
      background: "#050a14",
      surface: "#0c1424",
      text: "#f5f3ff",
      textMuted: "#c4b5fd",
      borderRadius: "1rem",
      fontFamily: "Vazirmatn, system-ui",
      animation: "bioluminescence",
      heroGradient: "radial-gradient(ellipse at 30% 50%, #a855f720 0%, #06b6d410 50%, #050a14 100%)",
    },
  },
  {
    name: "Demo 04 — NeuroNetwork",
    slug: "demo_4",
    description: "شبکه سیناپسی عصبی با اتصالات نوری",
    theme: {
      primary: "#8b5cf6",
      secondary: "#7c3aed",
      accent: "#c084fc",
      background: "#0f0520",
      surface: "#1a0d30",
      text: "#f5f3ff",
      textMuted: "#a78bfa",
      borderRadius: "0.375rem",
      fontFamily: "Vazirmatn, system-ui",
      animation: "neural-pulse",
      heroGradient: "linear-gradient(135deg, #0f0520 0%, #2e1065 50%, #8b55f720 100%)",
    },
  },
  {
    name: "Demo 05 — Cell Division",
    slug: "demo_5",
    description: "میتوز و تقسیم سلولی با رنگ‌های صورتی/قرمز",
    theme: {
      primary: "#f43f5e",
      secondary: "#e11d48",
      accent: "#fb7185",
      background: "#1a0510",
      surface: "#2a0a1a",
      text: "#fff1f2",
      textMuted: "#fda4af",
      borderRadius: "50% 50% 0.5rem 0.5rem",
      fontFamily: "Vazirmatn, system-ui",
      animation: "cell-division",
      heroGradient: "linear-gradient(135deg, #1a0510 0%, #4c0519 50%, #f43f5e15 100%)",
    },
  },
  {
    name: "Demo 06 — Evolution Tree",
    slug: "demo_6",
      description: "درخت تکاملی با رنگ‌های زمینی و فسیلی",
    theme: {
      primary: "#d97706",
      secondary: "#b45309",
      accent: "#fbbf24",
      background: "#1a1205",
      surface: "#2a1e0a",
      text: "#fefce8",
      textMuted: "#fcd34d",
      borderRadius: "0.25rem",
      fontFamily: "Vazirmatn, system-ui",
      animation: "evolution-tree",
      heroGradient: "linear-gradient(135deg, #1a1205 0%, #713f12 50%, #d9770615 100%)",
    },
  },
  {
    name: "Demo 07 — Molecular Bio",
    slug: "demo_7",
    description: "ساختارهای مولکولی و پروتئینی با رنگ‌های آبی",
    theme: {
      primary: "#3b82f6",
      secondary: "#2563eb",
      accent: "#60a5fa",
      background: "#050f20",
      surface: "#0a1a35",
      text: "#eff6ff",
      textMuted: "#93c5fd",
      borderRadius: "1.5rem",
      fontFamily: "Vazirmatn, system-ui",
      animation: "molecular",
      heroGradient: "linear-gradient(135deg, #050f20 0%, #1e3a5f 50%, #3b82f615 100%)",
    },
  },
  {
    name: "Demo 08 — Ecosystem",
    slug: "demo_8",
    description: "اکوسیستم طبیعی با رنگ‌های جنگلی و جریان آب",
    theme: {
      primary: "#10b981",
      secondary: "#059669",
      accent: "#34d399",
      background: "#041a12",
      surface: "#0a2e1e",
      text: "#ecfdf5",
      textMuted: "#6ee7b7",
      borderRadius: "0.75rem",
      fontFamily: "Vazirmatn, system-ui",
      animation: "eco-flow",
      heroGradient: "linear-gradient(135deg, #041a12 0%, #064e3b 50%, #10b98115 100%)",
    },
  },
  {
    name: "Demo 09 — Immune System",
    slug: "demo_9",
    description: "سیستم ایمنی و مبارزه با پاتوژن‌ها",
    theme: {
      primary: "#ef4444",
      secondary: "#dc2626",
      accent: "#f87171",
      background: "#1a0505",
      surface: "#2a0a0a",
      text: "#fef2f2",
      textMuted: "#fca5a5",
      borderRadius: "0.5rem",
      fontFamily: "Vazirmatn, system-ui",
      animation: "immune-battle",
      heroGradient: "linear-gradient(135deg, #1a0505 0%, #7f1d1d 50%, #ef444415 100%)",
    },
  },
  {
    name: "Demo 10 — CyberBio Tech",
    slug: "demo_10",
    description: "بیوتکنولوژی آینده‌نگرانه با سبک سایبرپانک",
    theme: {
      primary: "#14b8a6",
      secondary: "#0ea5e9",
      accent: "#f43f5e",
      background: "#040a12",
      surface: "#081824",
      text: "#f0fdfa",
      textMuted: "#5eead4",
      borderRadius: "0",
      fontFamily: "Vazirmatn, monospace",
      animation: "cyber-glitch",
      heroGradient: "linear-gradient(135deg, #040a12 0%, #0f766e 30%, #0ea5e9 60%, #040a12 100%)",
    },
  },
  {
    name: "Demo 11 — Ocean Biology",
    slug: "demo_11",
    description: "زیست‌شناسی دریایی با موج‌ها و موجودات اعماق",
    theme: {
      primary: "#0ea5e9",
      secondary: "#0284c7",
      accent: "#38bdf8",
      background: "#021724",
      surface: "#032a3e",
      text: "#f0f9ff",
      textMuted: "#7dd3fc",
      borderRadius: "2rem",
      fontFamily: "Vazirmatn, system-ui",
      animation: "ocean-waves",
      heroGradient: "linear-gradient(180deg, #021724 0%, #0c4a6e 60%, #0284c730 100%)",
    },
  },
  {
    name: "Demo 12 — Genetic Code",
    slug: "demo_12",
    description: "شبیه ترمینال با بارش کد ژنتیکی A/T/C/G",
    theme: {
      primary: "#22d3ee",
      secondary: "#06b6d4",
      accent: "#a3e635",
      background: "#000000",
      surface: "#0a0a0a",
      text: "#22d3ee",
      textMuted: "#0e7490",
      borderRadius: "0",
      fontFamily: "monospace",
      animation: "code-rain",
      heroGradient: "linear-gradient(180deg, #000000 0%, #083344 50%, #000000 100%)",
    },
  },
  {
    name: "Demo 13 — Lab Paper",
    slug: "demo_13",
    description: "سبک مقاله علمی تمیز و مینیمال با حاشیه‌های ظریف",
    theme: {
      primary: "#374151",
      secondary: "#4b5563",
      accent: "#6366f1",
      background: "#fafafa",
      surface: "#ffffff",
      text: "#111827",
      textMuted: "#6b7280",
      borderRadius: "0.25rem",
      fontFamily: "Vazirmatn, Georgia, serif",
      animation: "paper-reveal",
      heroGradient: "linear-gradient(135deg, #fafafa 0%, #f3f4f6 50%, #e5e7eb 100%)",
    },
  },
  {
    name: "Demo 14 — Mycelium Network",
    slug: "demo_14",
    description: "شبکه قارچی مایسلیوم با رنگ‌های کهربایی/گرم",
    theme: {
      primary: "#f59e0b",
      secondary: "#d97706",
      accent: "#fbbf24",
      background: "#1a1005",
      surface: "#2a1a08",
      text: "#fefce8",
      textMuted: "#fcd34d",
      borderRadius: "0.75rem",
      fontFamily: "Vazirmatn, system-ui",
      animation: "mycelium",
      heroGradient: "linear-gradient(135deg, #1a1005 0%, #78350f 50%, #f59e0b15 100%)",
    },
  },
];

/** Seed all 14 biology-themed demos (admin only). Skips existing slugs. */
export const seedDemos = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await ctx.auth.getUserIdentity();
    if (!me) throw new Error("Authentication required");
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", me.email ?? ""))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "site_admin")) {
      throw new Error("Only admins can seed demos");
    }

    let created = 0;
    let skipped = 0;
    const now = Date.now();

    for (const seed of DEMO_SEEDS) {
      const existing = await ctx.db
        .query("siteDemos")
        .withIndex("by_slug", (q) => q.eq("slug", seed.slug))
        .unique();
      if (existing) {
        skipped++;
        continue;
      }
      await ctx.db.insert("siteDemos", {
        name: seed.name,
        slug: seed.slug,
        description: seed.description,
        status: "active",
        theme: seed.theme,
        createdBy: user._id,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }

    return { created, skipped, total: DEMO_SEEDS.length };
  },
});
