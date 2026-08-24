// @ts-nocheck
import { Scrypt } from "lucia";
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";

// aliases used by the run() mutation defined at the bottom of this file
const api_seed_seedPart2 = api.seed.seedPart2;
const api_seed_seedPart3 = api.seed.seedPart3;

const day = 24 * 60 * 60 * 1000;

const rebrand = (s: string) =>
  s.replace(/زیست‌آکادمی/g, "Genova").replace(/ZistAcademy/g, "Genova");
const rebrandArr = (arr: string[]) => arr.map(rebrand);

// Migrates already-seeded documents to the Genova brand (idempotent).
export const refreshBrand = mutation({
  args: {},
  handler: async (ctx) => {
    for (const a of await ctx.db.query("articles").collect()) {
      const next = {
        title: rebrand(a.title),
        excerpt: rebrand(a.excerpt),
        body: rebrand(a.body),
        authorName: rebrand(a.authorName),
      };
      if (
        next.title !== a.title ||
        next.excerpt !== a.excerpt ||
        next.body !== a.body ||
        next.authorName !== a.authorName
      ) {
        await ctx.db.patch(a._id, next);
      }
    }
    for (const t of await ctx.db.query("testimonials").collect()) {
      const next = { role: rebrand(t.role), text: rebrand(t.text), course: rebrand(t.course) };
      if (next.role !== t.role || next.text !== t.text || next.course !== t.course) {
        await ctx.db.patch(t._id, next);
      }
    }
    for (const c of await ctx.db.query("courses").collect()) {
      const next = {
        title: rebrand(c.title),
        summary: rebrand(c.summary),
        description: rebrand(c.description),
        includes: rebrandArr(c.includes),
        audience: rebrandArr(c.audience),
      };
      if (
        next.title !== c.title ||
        next.summary !== c.summary ||
        next.description !== c.description ||
        JSON.stringify(next.includes) !== JSON.stringify(c.includes) ||
        JSON.stringify(next.audience) !== JSON.stringify(c.audience)
      ) {
        await ctx.db.patch(c._id, next);
      }
    }
    for (const i of await ctx.db.query("instructors").collect()) {
      const bio = rebrand(i.bio);
      if (bio !== i.bio) await ctx.db.patch(i._id, { bio });
    }
    // migrate seeded admin emails to the new domain
    const emails = ["admin@zist.academy", "team@zist.academy"];
    for (const e of emails) {
      const admin = await ctx.db.query("admins").withIndex("by_email", (q) => q.eq("email", e)).first();
      if (admin) {
        const replacement = e === "admin@zist.academy" ? "admin@genova.team" : "team@genova.team";
        const exists = await ctx.db.query("admins").withIndex("by_email", (q) => q.eq("email", replacement)).first();
        if (!exists) await ctx.db.patch(admin._id, { email: replacement });
        else await ctx.db.delete(admin._id);
      }
    }
    // migrate old coupon codes to the Genova brand
    for (const c of await ctx.db.query("coupons").collect()) {
      const code = c.code === "ZIST10" ? "GEN10" : c.code === "ZIST15" ? "GEN15" : c.code;
      if (code !== c.code) await ctx.db.patch(c._id, { code });
    }
    return { ok: true };
  },
});

// Creates the built-in admin account (admin@gmail.com / admin) with a
// password-hashed auth account, so the team can sign in without an OTP code.
// Idempotent: safe to call on every load.
export const ensureAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const email = "admin@gmail.com";
    const existingAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email),
      )
      .first();
    if (existingAccount) {
      // Reset password to 'admin' so the team always has a known password
      const secret = await new Scrypt().hash("admin");
      await ctx.db.patch(existingAccount._id, { secret });
      // make sure the linked user still has admin role + admins entry
      const user = await ctx.db.get(existingAccount.userId as any);
      if (user) {
        if (user.role !== "admin") await ctx.db.patch(user._id as any, { role: "admin" });
        if (!user.email) await ctx.db.patch(user._id as any, { email });
      }
      const adminRow = await ctx.db
        .query("admins")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (!adminRow) await ctx.db.insert("admins", { email });
      return { ok: true, created: false };
    }

    const secret = await new Scrypt().hash("admin");

    const userId = await ctx.db.insert("users", {
      name: "مدیر سامانه",
      email,
      role: "admin",
    });
    await ctx.db.insert("authAccounts", {
      userId: userId as any,
      provider: "password",
      providerAccountId: email,
      secret,
    });
    const adminRow = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!adminRow) await ctx.db.insert("admins", { email });
    return { ok: true, created: true };
  },
});

export const seedPart1 = mutation({
  args: {},
  handler: async (ctx) => {
    // ── Categories ──────────────────────────────────────────────────────────
    if ((await ctx.db.query("categories").collect()).length === 0) {
      const categories = [
        ["میکروبیولوژی", "microbiology", "مطالعهٔ میکروارگانیسم‌ها؛ از باکتری و قارچ تا ویروس و انگل", "microscope", "teal", 1],
        ["زیست‌شناسی مولکولی", "molecular-biology", "از DNA و RNA تا پروتئین؛ مکانیسم‌های مولکولی حیات", "dna", "indigo", 2],
        ["ژنتیک", "genetics", "وراثت، ژن‌ها و کروموزوم‌ها؛ از مندل تا ژنومیکس", "branch", "violet", 3],
        ["بیوتکنولوژی", "biotechnology", "کاربردهای مهندسی زیستی در پزشکی، صنعت و کشاورزی", "flask", "emerald", 4],
        ["بیوشیمی", "biochemistry", "مولکول‌های حیات و مسیرهای متابولیکی", "atom", "amber", 5],
        ["ایمونولوژی", "immunology", "سیستم ایمنی؛ دفاع بدن در برابر عوامل بیماری‌زا", "shield", "rose", 6],
        ["بیوانفورماتیک", "bioinformatics", "ابزارهای محاسباتی و تحلیل داده‌های زیستی", "database", "sky", 7],
        ["راهنمای عمومی", "general-guide", "شروع دانشگاه، روش مطالعه و مهارت‌های دانشجویی", "graduation", "slate", 8],
      ] as const;
      for (const [name, slug, description, icon, accent, order] of categories) {
        await ctx.db.insert("categories", {
          name,
          slug,
          description,
          icon,
          accent,
          order,
        });
      }
    }

    // ── Instructors ─────────────────────────────────────────────────────────
    if ((await ctx.db.query("instructors").collect()).length === 0) {
      const instructors = [
        ["زهرا احمدی", "zahra-ahmadi", "دانشجوی کارشناسی میکروبیولوژی، دانشگاه تهران", ["دانشجوی سال آخر میکروبیولوژی با تمرکز بر باکتری‌شناسی و میکروب‌شناسی عمومی. مدرس دوره‌های پایهٔ میکروب‌شناسی و طراح بانک سؤال."], ["کارشناسی میکروبیولوژی — دانشگاه تهران"], ["باکتری‌شناسی", "میکروب‌شناسی عمومی", "آزمون‌سازی"], "teal", true],
        ["علی رضایی", "ali-rezaei", "دانشجوی کارشناسی میکروبیولوژی، دانشگاه شهید بهشتی", ["علاقه‌مند به قارچ‌شناسی و انگل‌شناسی؛ مسئول تولید محتوای آموزشی و جمع‌بندی‌های امتحانی."], ["کارشناسی میکروبیولوژی — دانشگاه شهید بهشتی"], ["قارچ‌شناسی", "انگل‌شناسی", "جمع‌بندی امتحانی"], "indigo", true],
        ["مریم کریمی", "maryam-karimi", "دانشجوی کارشناسی میکروبیولوژی، دانشگاه علوم پزشکی ایران", ["تمرکز بر ویروس‌شناسی و ایمونولوژی؛ طراح فلش‌کارت‌ها و آزمون‌های طبقه‌بندی‌شده."], ["کارشناسی میکروبیولوژی — دانشگاه علوم پزشکی ایران"], ["ویروس‌شناسی", "ایمونولوژی", "فلش‌کارت"], "violet", true],
        ["محمد حسینی", "mohammad-hosseini", "دانشجوی کارشناسی میکروبیولوژی، دانشگاه تبریز", ["مسئول دوره‌های بیوشیمی و متابولیسم؛ علاقه‌مند به تدریس مفهومی و حل تمرین."], ["کارشناسی میکروبیولوژی — دانشگاه تبریز"], ["بیوشیمی", "متابولیسم", "حل تمرین"], "amber", true],
        ["سارا محمدی", "sara-mohammadi", "دانشجوی کارشناسی بیوتکنولوژی، دانشگاه صنعتی اصفهان", ["مسئول مسیر بیوتکنولوژی و بیوانفورماتیک؛ تیم را با ابزارهای محاسباتی و داده آشنا می‌کند."], ["کارشناسی بیوتکنولوژی — دانشگاه صنعتی اصفهان"], ["بیوتکنولوژی", "بیوانفورماتیک", "ابزارهای دیجیتال"], "emerald", true],
        ["دکتر امیر توکلی", "amir-tavakoli", "PhD بیوتکنولوژی پزشکی، دانشگاه تهران", ["پژوهشگر بیوتکنولوژی پزشکی با سابقهٔ کار روی سلول‌های بنیادی و درمان‌های نوین؛ مدرس مهمان کارگاه‌های تخصصی."], ["PhD بیوتکنولوژی پزشکی — دانشگاه تهران", "Postdoc — دانشگاه علوم پزشکی تهران"], ["بیوتکنولوژی پزشکی", "سلول‌های بنیادی", "مسیر پژوهش"], "sky", true],
        ["دکتر نگار صادقی", "negar-sadeghi", "PhD ایمونولوژی، دانشگاه علوم پزشکی شهید بهشتی", ["پژوهشگر ایمونولوژی و ایمونوتراپی؛ برگزارکنندهٔ کارگاه‌های مقاله‌نویسی و نشست‌های رایگان تخصصی."], ["PhD ایمونولوژی — دانشگاه علوم پزشکی شهید بهشتی"], ["ایمونولوژی", "ایمونوتراپی", "مقاله‌نویسی"], "rose", true],
      ] as const;
      for (const [name, slug, title, bio, education, specialties, accent, verified] of instructors) {
        await ctx.db.insert("instructors", {
          name,
          slug,
          title,
          bio: bio.join(" "),
          education: [...education],
          specialties: [...specialties],
          accent,
          verified,
        });
      }
    }

    // ── Coupons ─────────────────────────────────────────────────────────────
    if ((await ctx.db.query("coupons").collect()).length === 0) {
      await ctx.db.insert("coupons", { code: "GEN10", percent: 10, active: true, maxUses: 1000, usedCount: 0 });
      await ctx.db.insert("coupons", { code: "GEN15", percent: 15, active: true, maxUses: 500, usedCount: 0 });
      await ctx.db.insert("coupons", { code: "START5", percent: 5, active: true, maxUses: 2000, usedCount: 0 });
    }

    // ── Admins ──────────────────────────────────────────────────────────────
    if ((await ctx.db.query("admins").collect()).length === 0) {
      await ctx.db.insert("admins", { email: "admin@genova.team" });
      await ctx.db.insert("admins", { email: "team@genova.team" });
    }

    // ── Testimonials ────────────────────────────────────────────────────────
    if ((await ctx.db.query("testimonials").collect()).length === 0) {
      const testimonials = [
        ["نگار فلاح", "دانشجوی میکروبیولوژی — ترم ۴", "دورهٔ میکروب‌شناسی عمومی دقیقاً چیزی بود که برای امتحان نیاز داشتم؛ تست‌ها و پاسخ‌های تشریحی باعث شد مبحث را واقعاً بفهمم نه اینکه حفظ کنم.", 5, "میکروب‌شناسی عمومی", "teal"],
        ["امیرحسین نوری", "دانشجوی زیست‌شناسی سلولی", "آزمون تعیین سطح رایگان نقاط ضعفم را نشان داد و بعدش پیشنهاد دوره دقیقاً درست از آب درآمد. مسیر یادگیری شفاف است.", 5, "آزمون تعیین سطح", "emerald"],
        ["فاطمه رحیمی", "دانشجوی میکروبیولوژی — ترم ۶", "جزوه‌ها و فلش‌کارت‌های جمع‌بندی عالی‌اند. تیم پشتیبانی خیلی سریع جواب می‌دهد و رفع اشکال زنده واقعاً کار راه‌انداز است.", 5, "بیوشیمی ساختاری", "amber"],
        ["حسین کاظمی", "دانشجوی بیوتکنولوژی — ترم ۲", "به‌عنوان دانشجوی سال اول، راهنمای شروع دانشگاه خیلی بهم کمک کرد؛ احساس کردم یک دانشجوی سال بالایی کنارم است.", 4, "استارت دانشگاه", "violet"],
        ["پریسا جعفری", "دانشجوی میکروبیولوژی — ترم ۸", "آمادگی برای ارشد را با آزمون‌های طبقه‌بندی‌شده شروع کردم. تحلیل عملکرد هر آزمون، ضعف‌هایم را دقیق نشان می‌دهد.", 5, "آزمون میکروب‌شناسی ۱", "indigo"],
        ["مهدی صالحی", "دانشجوی میکروبیولوژی — ترم ۳", "کوئیز روزانه یک عادت خوب مطالعاتی برایم ساخته؛ هر روز یک تست با توضیح کامل. دقیقاً همین‌طور محتوا باید باشد.", 5, "کوئیز روزانه", "rose"],
      ] as const;
      for (const [name, role, text, rating, course, accent] of testimonials) {
        await ctx.db.insert("testimonials", { name, role, text, rating, course, accent });
      }
    }
  },
});

export const seedPart2 = mutation({
  args: {},
  handler: async (ctx) => {
    const getCat = async (slug: string) =>
      await ctx.db.query("categories").filter((q) => q.eq(q.field("slug"), slug)).first();
    const getIns = async (slug: string) =>
      await ctx.db.query("instructors").filter((q) => q.eq(q.field("slug"), slug)).first();

    // ── Courses ─────────────────────────────────────────────────────────────
    if ((await ctx.db.query("courses").collect()).length === 0) {
      const cat = {
        microbiology: await getCat("microbiology"),
        biochemistry: await getCat("biochemistry"),
        genetics: await getCat("genetics"),
        molecular: await getCat("molecular-biology"),
        biotechnology: await getCat("biotechnology"),
        immunology: await getCat("immunology"),
        bioinformatics: await getCat("bioinformatics"),
        general: await getCat("general-guide"),
      };
      const ins = {
        zahra: await getIns("zahra-ahmadi"),
        ali: await getIns("ali-rezaei"),
        maryam: await getIns("maryam-karimi"),
        mohammad: await getIns("mohammad-hosseini"),
        sara: await getIns("sara-mohammadi"),
        negar: await getIns("negar-sadeghi"),
      };

      const courses = [
        {
          title: "میکروب‌شناسی عمومی: از صفر تا امتحان",
          slug: "mikrob-shenasi-omumi",
          categoryId: cat.microbiology!._id,
          instructorId: ins.zahra!._id,
          summary: "درسنامهٔ کامل میکروب‌شناسی عمومی برای دانشجویان علوم زیستی؛ از ساختار باکتری تا تشخیص آزمایشگاهی، با ۱۵۰ تست و دو آزمون جامع.",
          description: "این دوره یک نقشهٔ کامل برای درس میکروب‌شناسی عمومی است. در ۶ جلسهٔ ویدیویی، ساختار و فیزیولوژی باکتری‌ها، قارچ‌ها، ویروس‌ها و انگل‌ها را از پایه مرور می‌کنیم و هر جلسه با تست‌های طبقه‌بندی‌شده و نکات امتحانی تکمیل می‌شود. جزوهٔ اختصاصی، بانک ۱۵۰ تایی سؤال، دو آزمون جامع و یک جلسهٔ رفع اشکال زنده، همه در این پکیج گنجانده شده تا بدون نیاز به منبع دیگری به سراغ امتحان بروی.",
          audience: [
            "دانشجویان میکروبیولوژی از ترم ۱ تا ۴",
            "دانشجویان علوم زیستی که درس میکروب‌شناسی دارند",
            "داوطلبان آمادگی برای آزمون‌های جامع",
          ],
          prerequisites: ["آشنایی مقدماتی با زیست‌شناسی سلولی (مرور سریع در جلسهٔ اول انجام می‌شود)"],
          syllabus: [
            { id: "l1", title: "معرفی دنیای میکروارگانیسم‌ها و تاریخچهٔ میکروب‌شناسی", durationMin: 48, free: true },
            { id: "l2", title: "ساختار و دیوارهٔ سلولی باکتری (گرم مثبت و گرم منفی)", durationMin: 52, free: true },
            { id: "l3", title: "رشد و فیزیولوژی باکتری‌ها؛ محیط‌های کشت", durationMin: 45, free: false },
            { id: "l4", title: "قارچ‌ها، ویروس‌ها و انگل‌های مهم بالینی", durationMin: 50, free: false },
            { id: "l5", title: "تشخیص آزمایشگاهی؛ رنگ‌آمیزی و تست‌های بیوشیمیایی", durationMin: 47, free: false },
            { id: "l6", title: "جمع‌بندی و تکنیک‌های تست‌زنی + رفع اشکال زنده", durationMin: 60, free: false },
          ],
          durationText: "۶ هفته (حدود ۵ ساعت محتوای ویدیویی)",
          mode: "hybrid" as const,
          price: 890000,
          discountPrice: 690000,
          rating: 4.9,
          ratingCount: 214,
          studentsCount: 1284,
          accent: "teal",
          bundle: "premium" as const,
          includes: [
            "۶ جلسهٔ ویدیویی با کیفیت بالا",
            "جزوهٔ اختصاصی PDF (فصل‌بندی‌شده)",
            "بانک ۱۵۰ تستی با پاسخ تشریحی",
            "۲ آزمون جامع با تحلیل عملکرد",
            "جلسهٔ رفع اشکال زنده",
            "فلش‌کارت دیجیتال برای مرور",
            "پشتیبانی و پاسخ‌گویی در گروه",
          ],
          hasSampleVideo: true,
          files: [
            { name: "جزوهٔ میکروب‌شناسی عمومی (PDF)", size: "۴.۲ مگابایت", type: "PDF" },
            { name: "بانک ۱۵۰ تستی (PDF)", size: "۱.۱ مگابایت", type: "PDF" },
            { name: "فلش‌کارت باکتری‌شناسی (Anki)", size: "۲.۸ مگابایت", type: "APKG" },
          ],
          featured: true,
          popular: true,
        },
        {
          title: "بیوشیمی ساختاری و متابولیسم",
          slug: "biyoshimi-sakhtari",
          categoryId: cat.biochemistry!._id,
          instructorId: ins.mohammad!._id,
          summary: "درس بیوشیمی را با مفاهیم عمیق، نمودارهای مسیرهای متابولیکی و تست‌های هدفمند به شکل کامل یاد بگیر.",
          description: "بیوشیمی اغلب سخت‌ترین درس علوم زیستی به حساب می‌آید. در این دورهٔ ضبط‌شده، ساختار پروتئین‌ها و آنزیم‌ها، کربوهیدرات‌ها و لیپیدها و مهم‌ترین مسیرهای متابولیکی (گلیکولیز، چرخهٔ کربس، زنجیرهٔ انتقال الکترون) را قدم‌به‌قدم با رسم نمودار یاد می‌گیریم. هر فصل با جمع‌بندی و تست‌های کنکوری همراه است.",
          audience: ["دانشجویان کارشناسی علوم زیستی", "داوطلبان آزمون‌های جامع و ارشد"],
          prerequisites: ["شیمی عمومی در سطح دبیرستان"],
          syllabus: [
            { id: "b1", title: "آب، پیوند هیدروژنی و ساختار زیستی مولکول‌ها", durationMin: 42, free: true },
            { id: "b2", title: "ساختار و عملکرد پروتئین‌ها و آنزیم‌ها", durationMin: 55, free: false },
            { id: "b3", title: "کربوهیدرات‌ها و لیپیدها", durationMin: 48, free: false },
            { id: "b4", title: "گلیکولیز و چرخهٔ کربس", durationMin: 58, free: false },
            { id: "b5", title: "زنجیرهٔ انتقال الکترون و فسفریلاسیون اکسیداتیو", durationMin: 52, free: false },
          ],
          durationText: "۵ هفته (حدود ۴.۵ ساعت ویدیو)",
          mode: "recorded" as const,
          price: 740000,
          discountPrice: 590000,
          rating: 4.8,
          ratingCount: 96,
          studentsCount: 863,
          accent: "amber",
          bundle: "plus" as const,
          includes: ["۵ جلسهٔ ویدیویی ضبط‌شده", "جزوهٔ PDF با نمودارهای رنگی", "۸۰ تست طبقه‌بندی‌شده", "دسترسی مادام‌العمر"],
          hasSampleVideo: false,
          files: [
            { name: "جزوهٔ بیوشیمی (PDF)", size: "۳.۶ مگابایت", type: "PDF" },
          ],
          featured: false,
          popular: true,
        },
        {
          title: "ژنتیک مولکولی پایه",
          slug: "genetiks-molekuli",
          categoryId: cat.genetics!._id,
          instructorId: ins.ali!._id,
          summary: "از قوانین مندل تا ساختار ژن و بیان ژن؛ پایه‌های ژنتیک را برای امتحان و مسیر آینده محکم بچین.",
          description: "دورهٔ پایهٔ ژنتیک مولکولی با رویکردی مفهومی: وراثت مندلی، ساختار کروموزوم و ژن، همانندسازی DNA، رونویسی و ترجمه و جهش‌ها. مناسب دانشجویانی که می‌خواهند ژنتیک را برای اولین بار جدی یاد بگیرند.",
          audience: ["دانشجویان ترم ۲ تا ۴ علوم زیستی", "علاقه‌مندان به ژنتیک و زیست‌شناسی مولکولی"],
          prerequisites: ["زیست‌شناسی سلولی مقدماتی"],
          syllabus: [
            { id: "g1", title: "وراثت مندلی و استثناهای آن", durationMin: 46, free: true },
            { id: "g2", title: "ساختار ژن و کروموزوم", durationMin: 44, free: false },
            { id: "g3", title: "همانندسازی DNA", durationMin: 50, free: false },
            { id: "g4", title: "رونویسی، ترجمه و جهش‌ها", durationMin: 54, free: false },
          ],
          durationText: "۴ هفته (حدود ۳.۵ ساعت ویدیو)",
          mode: "recorded" as const,
          price: 520000,
          rating: 4.7,
          ratingCount: 71,
          studentsCount: 642,
          accent: "violet",
          bundle: "basic" as const,
          includes: ["۴ جلسهٔ ویدیویی", "جزوهٔ PDF", "۶۰ تست با پاسخ تشریحی"],
          hasSampleVideo: false,
          files: [],
          featured: false,
          popular: false,
        },
        {
          title: "زیست‌شناسی مولکولی: از DNA تا پروتئین",
          slug: "zist-shenasi-molekuli",
          categoryId: cat.molecular!._id,
          instructorId: ins.maryam!._id,
          summary: "مهم‌ترین درس پایهٔ علوم زیستی را با نقشهٔ مفهومی، انیمیشن‌های آموزشی و تست یاد بگیر.",
          description: "زیست‌شناسی مولکولی زبان مشترک همهٔ رشته‌های علوم زیستی است. این دوره با ترکیب جلسات ضبط‌شده و کلاس‌های زندهٔ رفع اشکال، مسیر DNA تا پروتئین، تنظیم بیان ژن و تکنیک‌های پایهٔ مولکولی (PCR، الکتروفورز، کلونینگ) را پوشش می‌دهد.",
          audience: ["دانشجویان میکروبیولوژی و بیوتکنولوژی", "دانشجویان علوم سلولی و مولکولی"],
          prerequisites: ["آشنایی با ساختار سلول"],
          syllabus: [
            { id: "m1", title: "ساختار DNA و RNA؛ کروماتین و نوکلئوزوم", durationMin: 48, free: true },
            { id: "m2", title: "همانندسازی و ترمیم DNA", durationMin: 52, free: false },
            { id: "m3", title: "رونویسی و پردازش RNA", durationMin: 50, free: false },
            { id: "m4", title: "ترجمه و بلوغ پروتئین", durationMin: 47, free: false },
            { id: "m5", title: "تکنیک‌های پایه: PCR، الکتروفورز، کلونینگ", durationMin: 55, free: false },
            { id: "m6", title: "رفع اشکال زنده و جمع‌بندی", durationMin: 60, free: false },
          ],
          durationText: "۶ هفته (حدود ۵.۵ ساعت محتوا)",
          mode: "hybrid" as const,
          price: 690000,
          discountPrice: 549000,
          rating: 4.9,
          ratingCount: 138,
          studentsCount: 927,
          accent: "indigo",
          bundle: "plus" as const,
          includes: ["۵ جلسهٔ ویدیویی", "۱ جلسهٔ رفع اشکال زنده", "جزوهٔ PDF", "۱۰۰ تست تشریحی", "فایل‌های تکنیک‌های آزمایشگاهی"],
          hasSampleVideo: true,
          files: [
            { name: "جزوهٔ زیست‌شناسی مولکولی (PDF)", size: "۵ مگابایت", type: "PDF" },
            { name: "بانک تست (PDF)", size: "۱.۴ مگابایت", type: "PDF" },
          ],
          featured: true,
          popular: false,
        },
        {
          title: "مقدمه‌ای بر بیوتکنولوژی و کاربردهای آن",
          slug: "biyotexnoloji-moghadamati",
          categoryId: cat.biotechnology!._id,
          instructorId: ins.sara!._id,
          summary: "دورهٔ رایگان ورود به دنیای بیوتکنولوژی؛ با مثال‌های واقعی از پزشکی، صنعت و کشاورزی.",
          description: "بیوتکنولوژی چیست و چه فرصت‌هایی دارد؟ در این دورهٔ رایگان با مفاهیم پایه، محصولات زیستی، مهندسی ژنتیک و مسیرهای شغلی آشنا می‌شویم. بهترین نقطهٔ شروع برای دانشجویانی که تازه می‌خواهند این حوزه را بشناسند.",
          audience: ["دانشجویان سال اول و دوم", "هر کسی که به بیوتکنولوژی علاقه دارد"],
          prerequisites: ["هیچ — این دوره از صفر شروع می‌شود"],
          syllabus: [
            { id: "t1", title: "بیوتکنولوژی چیست؟ تاریخچه و چشم‌انداز", durationMin: 40, free: true },
            { id: "t2", title: "مهندسی ژنتیک و محصولات نوترکیب", durationMin: 44, free: true },
            { id: "t3", title: "بیوتکنولوژی در پزشکی، صنعت و کشاورزی", durationMin: 46, free: true },
          ],
          durationText: "۳ هفته (حدود ۲ ساعت ویدیو)",
          mode: "recorded" as const,
          price: 0,
          rating: 4.8,
          ratingCount: 320,
          studentsCount: 2413,
          accent: "emerald",
          bundle: "basic" as const,
          includes: ["۳ جلسهٔ ویدیویی رایگان", "اسلایدهای دوره", "گواهی تکمیل دوره"],
          hasSampleVideo: true,
          files: [],
          featured: true,
          popular: true,
        },
        {
          title: "ایمونولوژی پایه برای علوم زیستی",
          slug: "immunology-paye",
          categoryId: cat.immunology!._id,
          instructorId: ins.negar!._id,
          summary: "ایمنی ذاتی و اکتسابی، آنتی‌بادی‌ها و واکنش‌های ایمنی با تدریس دکتر نگار صادقی.",
          description: "ایمونولوژی پایه با نگاهی کاربردی: سلول‌های ایمنی، سیتوکین‌ها، کمپلمان، آنتی‌بادی‌ها و انواع واکنش‌های حساسیتی. این دوره با ترکیب کلاس زنده و ویدیوهای ضبط‌شده برگزار می‌شود و برای دانشجویانی که ایمونولوژی را دشوار می‌بینند طراحی شده است.",
          audience: ["دانشجویان میکروبیولوژی و علوم زیستی", "داوطلبان ارشد ایمونولوژی"],
          prerequisites: ["زیست‌شناسی سلولی"],
          syllabus: [
            { id: "i1", title: "مروری بر سیستم ایمنی و اندام‌های لنفاوی", durationMin: 50, free: true },
            { id: "i2", title: "ایمنی ذاتی؛ سدها، فاگوسیتوز و التهاب", durationMin: 52, free: false },
            { id: "i3", title: "ایمنی اکتسابی؛ لنفوسیت‌های B و T", durationMin: 58, free: false },
            { id: "i4", title: "آنتی‌بادی‌ها، کمپلمان و واکنش‌های حساسیتی", durationMin: 55, free: false },
            { id: "i5", title: "جمع‌بندی و حل تست", durationMin: 48, free: false },
          ],
          durationText: "۵ هفته (کلاس زنده + ویدیو)",
          mode: "live" as const,
          price: 980000,
          discountPrice: 790000,
          rating: 4.9,
          ratingCount: 88,
          studentsCount: 486,
          accent: "rose",
          bundle: "premium" as const,
          includes: ["کلاس‌های زندهٔ هفتگی", "ویدیوهای ضبط‌شدهٔ جلسات", "جزوهٔ PDF", "فلش‌کارت آنتی‌بادی", "جلسهٔ رفع اشکال"],
          hasSampleVideo: false,
          files: [{ name: "جزوهٔ ایمونولوژی (PDF)", size: "۳.۱ مگابایت", type: "PDF" }],
          featured: true,
          popular: false,
        },
        {
          title: "بیوانفورماتیک مقدماتی با ابزارهای رایگان",
          slug: "bioinformatics-moghadamati",
          categoryId: cat.bioinformatics!._id,
          instructorId: ins.sara!._id,
          summary: "آشنایی با BLAST، NCBI و تحلیل توالی؛ پل ورود به دنیای داده‌های زیستی.",
          description: "بیوانفورماتیک مهارتی است که در بازار کار و مسیر پژوهش تمایز ایجاد می‌کند. در این دوره با پایگاه‌های دادهٔ اصلی (NCBI، UniProt)، جستجوی BLAST، هم‌ترازی توالی‌ها و اصول تحلیل دادهٔ زیستی آشنا می‌شویم. همهٔ ابزارها رایگان‌اند.",
          audience: ["دانشجویان ترم ۴ به بالا", "علاقه‌مندان به مسیر پژوهش و بیوانفورماتیک"],
          prerequisites: ["آشنایی مقدماتی با زیست‌شناسی مولکولی"],
          syllabus: [
            { id: "f1", title: "بیوانفورماتیک چیست؟ پایگاه‌های دادهٔ اصلی", durationMin: 42, free: true },
            { id: "f2", title: "کار عملی با NCBI و جستجوی توالی", durationMin: 48, free: false },
            { id: "f3", title: "BLAST و هم‌ترازی توالی‌ها", durationMin: 50, free: false },
            { id: "f4", title: "پروژهٔ کوچک: تحلیل یک ژن از ابتدا تا انتها", durationMin: 55, free: false },
          ],
          durationText: "۴ هفته (حدود ۳.۵ ساعت ویدیو)",
          mode: "recorded" as const,
          price: 620000,
          rating: 4.6,
          ratingCount: 42,
          studentsCount: 315,
          accent: "sky",
          bundle: "plus" as const,
          includes: ["۴ جلسهٔ ویدیویی با تمرین عملی", "فایل‌های تمرینی", "جزوهٔ PDF"],
          hasSampleVideo: false,
          files: [],
          featured: false,
          popular: false,
        },
        {
          title: "استارت دانشگاه: راهنمای شروع برای دانشجویان جدید",
          slug: "start-daneshgah",
          categoryId: cat.general!._id,
          instructorId: ins.zahra!._id,
          summary: "رایگان؛ برای دانشجویان ترم اول: آشنایی با رشته، انتخاب منابع، روش مطالعه و برنامه‌ریزی.",
          description: "ورود به دانشگاه برای خیلی‌ها گیج‌کننده است: کدام درس‌ها مهم‌ترند؟ از کجا شروع کنم؟ این دورهٔ رایگان که حاصل تجربهٔ مستقیم تیم ماست، نقشهٔ راه ترم اول شماست؛ از شناخت دروس رشته تا روش مطالعهٔ صحیح و برنامه‌ریزی برای امتحانات.",
          audience: ["دانشجویان ترم اول علوم زیستی", "دانشجویانی که احساس می‌کنند شروع شان شفاف نیست"],
          prerequisites: ["هیچ"],
          syllabus: [
            { id: "s1", title: "نقشهٔ راه رشته: کدام درس‌ها مهم‌ترند؟", durationMin: 45, free: true },
            { id: "s2", title: "انتخاب منبع و جزوه؛ چه بخوانیم و چه نخوانیم؟", durationMin: 40, free: true },
            { id: "s3", title: "روش مطالعهٔ علمی و برنامه‌ریزی امتحان", durationMin: 48, free: true },
            { id: "s4", title: "پرسش و پاسخ: تجربه‌های تیم ما از ترم اول", durationMin: 55, free: true },
          ],
          durationText: "۴ هفته (رایگان)",
          mode: "recorded" as const,
          price: 0,
          rating: 4.9,
          ratingCount: 156,
          studentsCount: 1872,
          accent: "slate",
          bundle: "basic" as const,
          includes: ["۴ جلسهٔ رایگان", "چک‌لیست شروع ترم", "دسترسی به گروه راهنمایی دانشجویی"],
          hasSampleVideo: true,
          files: [{ name: "چک‌لیست شروع ترم (PDF)", size: "۰.۴ مگابایت", type: "PDF" }],
          featured: false,
          popular: true,
        },
      ];

      for (const c of courses) {
        await ctx.db.insert("courses", {
          ...c,
          published: true,
          createdAt: now() - Math.floor(Math.random() * 40) * day,
        });
      }
    }

    // ── Products ────────────────────────────────────────────────────────────
    if ((await ctx.db.query("products").collect()).length === 0) {
      const products = [
        ["فلش‌کارت باکتری‌شناسی (۱۰۰ کارت)", "flashcards-bacteriology", "flashcards", "۱۰۰ کارت فیزیکی برای مرور سریع باکتری‌های مهم: گرم، شکل، بیماری، عوامل ویرولانس و نکات امتحانی. مناسب مرور شب امتحان.", 185000, "teal", true],
        ["فلش‌کارت آنزیم‌ها و مسیرهای متابولیکی", "flashcards-enzymes", "flashcards", "۶۰ کارت برای یادگیری آنزیم‌های کلیدی و مسیرهای متابولیکی (گلیکولیز، کربس، زنجیرهٔ تنفسی) با فرمول و نکتهٔ کلیدی.", 215000, "amber", false],
        ["کتابچهٔ جمع‌بندی میکروب‌شناسی", "guide-microbiology", "guide", "کتابچهٔ ۸۰ صفحه‌ای چاپی شامل جمع‌بندی تمام مباحث میکروب‌شناسی عمومی به زبان ساده با جدول‌های مقایسه‌ای.", 149000, "teal", true],
        ["کتابچهٔ جمع‌بندی بیوشیمی", "guide-biochemistry", "guide", "جمع‌بندی بیوشیمی با نمودارهای رنگی مسیرهای متابولیکی و نکات کنکوری؛ همراه با تست‌های منتخب.", 149000, "amber", false],
        ["پوستر چرخهٔ کربس و تنفس سلولی", "poster-krebs", "poster", "پوستر A2 رنگی با طراحی دقیق چرخهٔ کربس و زنجیرهٔ انتقال الکترون؛ مناسب دیوار اتاق مطالعه.", 98000, "emerald", true],
        ["پوستر طبقه‌بندی باکتری‌ها", "poster-bacteria", "poster", "پوستر A2 شامل طبقه‌بندی باکتری‌های گرم مثبت و منفی، شکل‌ها و بیماری‌های مهم هر گروه.", 98000, "violet", false],
      ] as const;
      for (const [title, slug, type, description, price, accent, featured] of products) {
        await ctx.db.insert("products", {
          title,
          slug,
          type,
          description,
          price,
          accent,
          published: true,
          featured,
          createdAt: now() - Math.floor(Math.random() * 30) * day,
        });
      }
    }

    // ── Workshops ───────────────────────────────────────────────────────────
    if ((await ctx.db.query("workshops").collect()).length === 0) {
      const amir = await getIns("amir-tavakoli");
      const negar = await getIns("negar-sadeghi");
      const d = (offset: number) => new Date(now() + offset * day).toISOString().slice(0, 10);

      const workshops = [
        {
          title: "بیوتکنولوژی پزشکی با دکتر توکلی",
          slug: "medical-biotechnology-workshop",
          instructorId: amir!._id,
          topic: "بیوتکنولوژی پزشکی",
          date: d(18),
          time: "۱۷:۰۰",
          capacity: 40,
          registeredCount: 12,
          price: 480000,
          description: "یک کارگاه ۳ ساعته دربارهٔ کاربردهای بیوتکنولوژی در پزشکی: داروهای نوترکیب، سلول‌های بنیادی و ژن‌درمانی. مناسب دانشجویانی که می‌خواهند تصویر واقعی از این مسیر داشته باشند.",
          agenda: ["آشنایی با داروهای بیولوژیک", "سلول‌های بنیادی و پزشکی بازساختی", "ژن‌درمانی و CRISPR در کلینیک", "پرسش و پاسخ"],
          free: false,
          expertTalk: false,
        },
        {
          title: "کارگاه مقاله‌نویسی مقدماتی",
          slug: "article-writing-workshop",
          instructorId: negar!._id,
          topic: "نگارش مقالهٔ علمی",
          date: d(25),
          time: "۱۶:۰۰",
          capacity: 25,
          registeredCount: 8,
          price: 350000,
          description: "یاد بگیرید اولین مقالهٔ علمی‌تان را چگونه شروع کنید: ساختار IMRAD، انتخاب ژورنال، ابزارهای رفرنس‌دهی و اشتباهات رایج.",
          agenda: ["ساختار مقالهٔ علمی (IMRAD)", "انتخاب مجلهٔ مناسب", "ابزارهای کاربردی (Zotero، EndNote)", "تمرین عملی: شروع مقدمه"],
          free: false,
          expertTalk: false,
        },
        {
          title: "Free Expert Talk: مسیر ارشد و پژوهش در علوم زیستی",
          slug: "expert-talk-research",
          instructorId: amir!._id,
          topic: "مسیر تحصیلی و پژوهش",
          date: d(10),
          time: "۲۰:۰۰",
          capacity: 100,
          registeredCount: 43,
          price: 0,
          description: "نشست رایگان و آنلاین با دکتر توکلی دربارهٔ انتخاب مسیر ارشد، پژوهش در آزمایشگاه، مقاله‌نویسی و مهارت‌هایی که در بازار کار امروز مهم‌اند.",
          agenda: ["انتخاب گرایش ارشد", "چطور وارد یک آزمایشگاه پژوهشی شویم؟", "مهارت‌های نرم‌افزاری و آزمایشگاهی", "پرسش و پاسخ آزاد"],
          free: true,
          expertTalk: true,
        },
      ];
      for (const w of workshops) {
        await ctx.db.insert("workshops", { ...w, published: true });
      }
    }

    // ── Articles ────────────────────────────────────────────────────────────
    if ((await ctx.db.query("articles").collect()).length === 0) {
      const articles = [
        {
          title: "چگونه از هفتهٔ اول دانشگاه بهترین شروع را داشته باشیم؟",
          slug: "start-university-guide",
          category: "راهنمای دانشجو",
          excerpt: "ترم اول مهم‌تر از آن است که فکر می‌کنید. این راهنما از تجربهٔ مستقیم تیم ما می‌گوید: چه کارهایی را از هفتهٔ اول انجام بدهید و از چه اشتباهاتی دور بمانید.",
          body: "ورود به دانشگاه یک نقطهٔ عطف است، اما بدون نقشه می‌تواند گیج‌کننده باشد.\n\nاولین نکته: درس‌های پایه را جدی بگیرید. میکروب‌شناسی، بیوشیمی و سلولی مولکولی پایهٔ همهٔ درس‌های بعدی‌اند. اگر این‌ها را در همان ترم اول خوب یاد بگیرید، ترم‌های بعدی چند برابر راحت‌تر می‌شود.\n\nدوم: منبع را زیاد عوض نکنید. یک منبع اصلی انتخاب کنید و همان را کامل بخوانید. تغییر مداوم منبع بزرگ‌ترین دشمن یادگیری عمیق است.\n\nسوم: از دانشجویان سال بالایی کمک بگیرید. یک گفتگوی ۲۰ دقیقه‌ای با کسی که همین مسیر را رفته، می‌تواند ماه‌ها سردرگمی را کم کند. دقیقاً به همین دلیل بخش «استارت دانشگاه» و جلسات منتورینگ را طراحی کرده‌ایم.\n\nو چهارم: مطالعه را به یک عادت روزانه تبدیل کنید. سی دقیقه مطالعهٔ منظم، از یک شب‌بیداری ده ساعته نتیجهٔ بهتری دارد.",
          authorName: "زهرا احمدی",
          accent: "teal",
          readTime: 4,
          featured: true,
        },
        {
          title: "تفاوت گرم‌مثبت و گرم‌منفی در یک نگاه",
          slug: "gram-positive-negative",
          category: "یادداشت علمی",
          excerpt: "چرا بعضی باکتری‌ها بنفش می‌شوند و بعضی صورتی؟ ساختار دیواره، رنگ‌آمیزی گرم و پیامدهای بالینی آن را ساده توضیح می‌دهیم.",
          body: "رنگ‌آمیزی گرم مهم‌ترین تست اولیه در شناسایی باکتری‌هاست.\n\nباکتری‌های گرم‌مثبت دیوارهٔ ضخیمی از پپتیدوگلیکان دارند (۲۰ تا ۸۰ نانومتر) که کریستال ویوله را نگه می‌دارد؛ به همین دلیل بنفش دیده می‌شوند. گرم‌منفی‌ها دیوارهٔ نازک (حدود ۱۰ نانومتر) و غشای خارجی دوم دارند و بعد از رنگ‌بری با الکل، با سافرین صورتی رنگ می‌شوند.\n\nنکتهٔ امتحانی: غشای خارجی گرم‌منفی‌ها حاوی LPS (لیپوپلی‌ساکارید) است که همان اندوتوکسین معروف است و در شوک سپتیک نقش دارد.\n\nنکتهٔ دیگر: باکتری‌های گرم‌مثبت به آنتی‌بیوتیک‌های مهارکنندهٔ سنتز پپتیدوگلیکان مثل پنی‌سیلین حساس‌ترند، چون دیواره شان در دسترس‌تر است.",
          authorName: "تیم زیست‌آکادمی",
          accent: "indigo",
          readTime: 5,
          featured: true,
        },
        {
          title: "روش مطالعهٔ دروس آزمایشگاهی علوم زیستی",
          slug: "lab-study-method",
          category: "روش مطالعه",
          excerpt: "دروس عملی با درس‌های نظری فرق دارند؛ این‌جا روشی را می‌نویسیم که هم نمره بیاورد هم مهارت واقعی بسازد.",
          body: "بسیاری از دانشجویان دروس عملی را «کم‌اهمیت‌تر» می‌دانند؛ در حالی که همین دروس در مصاحبه‌های ارشد و بازار کار مهم‌ترین نقطهٔ تمایز شماست.\n\n۱) قبل از آزمایشگاه، دستور کار را بخوانید و هدف هر مرحله را بفهمید. «چه چیزی قرار است اتفاق بیفتد و چرا؟»\n\n۲) در آزمایشگاه فقط کپی نکنید؛ دلیل هر قدم را بپرسید. چرا اتوکلاو ۱۲۱ درجه؟ چرا این محیط کشت؟\n\n۳) بعد از آزمایشگاه، همان شب یک گزارش خلاصه بنویسید. نوشتن بلافاصله بعد از آزمایش، ماندگاری اطلاعات را چند برابر می‌کند.\n\n۴) مهارت‌های پایه (پیپت کردن، کشت، رنگ‌آمیزی، میکروسکوپی) را تا حد تسلط تمرین کنید؛ این‌ها سرمایهٔ اصلی شما در آینده‌اند.",
          authorName: "علی رضایی",
          accent: "emerald",
          readTime: 6,
          featured: false,
        },
        {
          title: "۵ اشتباه رایج در تست‌زنی میکروب‌شناسی",
          slug: "test-taking-mistakes",
          category: "نکات امتحانی",
          excerpt: "این اشتباه‌ها باعث می‌شود درصدتان از سطح واقعی‌تان پایین‌تر بیاید؛ هر کدام را با راه‌حل بشناسید.",
          body: "۱) حفظ کردن اسم بدون ارتباط: باکتری را همراه با بیماری و ویژگی کلیدی‌اش در یک نقشهٔ ذهنی یاد بگیرید.\n\n۲) بی‌توجهی به کلمات کلیدی سؤال: «همهٔ موارد درست است به جز...»، «اولین»، «مهم‌ترین» — این کلمات کل سؤال را عوض می‌کنند.\n\n۳) تست‌زدن بدون تحلیل: بعد از هر آزمون، سؤالات غلط را با پاسخ تشریحی کامل تحلیل کنید. هدف یادگیری است، نه فقط عدد.\n\n۴) نادیده گرفتن تفاوت‌های ظریف: مثلاً «بیهوازی اختیاری» با «میکروآئروفیل» فرق دارد؛ دقیق بخوانید.\n\n۵) تست‌زدن بدون زمان‌بندی: از همان ابتدا با تایمر تست بزنید تا سر جلسه غافلگیر نشوید.",
          authorName: "مریم کریمی",
          accent: "amber",
          readTime: 5,
          featured: false,
        },
        {
          title: "گفت‌وگو با تیم زیست‌آکادمی: چرا این پلتفرم را ساختیم؟",
          slug: "team-interview",
          category: "گفت‌وگو",
          excerpt: "پنج دانشجوی علوم زیستی تصمیم گرفتند پلتفرمی بسازند که خودشان در ترم‌های اول به آن نیاز داشتند. این گفت‌وگو را بخوانید.",
          body: "زیست‌آکادمی با یک سؤال ساده شروع شد: «کاش وقتی ترم اول بودیم کسی این‌ها را به ما می‌گفت.»\n\nتیم ما چهار دانشجوی میکروبیولوژی و یک دانشجوی بیوتکنولوژی است. همهٔ ما تجربهٔ مستقیم سردرگمی در انتخاب منبع، تست‌زنی بی‌نتیجه و شب‌های امتحان را داریم.\n\nبه همین دلیل پلتفرم را حول یک چرخه طراحی کردیم: محتوای رایگان و آزمون تعیین سطح، سپس تشخیص نقاط ضعف و پیشنهاد مسیر، بعد دوره و آزمون، و در نهایت پیشرفت قابل اندازه‌گیری.\n\nما ادعای «بهترین آموزش کشور» نداریم؛ فقط می‌خواهیم محتوای دقیق، تست استاندارد و مسیری شفاف برای دانشجویان علوم زیستی بسازیم — و آن را مدام با بازخورد شما بهتر کنیم.",
          authorName: "تیم زیست‌آکادمی",
          accent: "rose",
          readTime: 7,
          featured: true,
        },
        {
          title: "بیوانفورماتیک چیست و از کجا شروع کنم؟",
          slug: "bioinformatics-start",
          category: "راهنمای مسیر",
          excerpt: "اگر فکر می‌کنید بیوانفورماتیک فقط برای برنامه‌نویس‌هاست، این مطلب را بخوانید. با ابزارهای رایگان شروع کنید.",
          body: "بیوانفورماتیک یعنی استفاده از ابزارهای محاسباتی برای فهمیدن داده‌های زیستی: توالی‌ها، ژنوم‌ها، ساختار پروتئین‌ها و ...\n\nبرای شروع به برنامه‌نویسی حرفه‌ای نیاز ندارید. نقطهٔ شروع ساده است:\n\n۱) با NCBI آشنا شوید و یاد بگیرید یک توالی را چطور جستجو کنید.\n\n۲) BLAST را امتحان کنید و ببینید دو توالی چقدر شبیه‌اند.\n\n۳) با UniProt ساختار و عملکرد پروتئین‌ها را بخوانید.\n\n۴) بعد از راحتی با این ابزارها، به سراغ Python و R بروید.\n\nاین مهارت امروز در آزمایشگاه‌ها، بازار کار و پژوهش یک مزیت جدی است و با کمی تمرین منظم خیلی زود به دست می‌آید.",
          authorName: "سارا محمدی",
          accent: "sky",
          readTime: 5,
          featured: false,
        },
        {
          title: "چطور از فلش‌کارت برای جمع‌بندی استفاده کنیم؟",
          slug: "flashcard-method",
          category: "روش مطالعه",
          excerpt: "فلش‌کارت فقط ساختنش کافی نیست؛ روش مرور درست است که فرق ایجاد می‌کند. تکنیک‌های عملی این‌جا آمده است.",
          body: "فلش‌کارت‌ها برای مرور فعال عالی‌اند، به شرطی که درست استفاده شوند.\n\n۱) هر کارت فقط یک سؤال ساده داشته باشد. «E. coli چه ویژگی‌هایی دارد؟» کارت بدی است؛ «گرم E. coli چیست؟» کارت خوبی است.\n\n۲) از سیستم مرور فاصله‌دار استفاده کنید: کارت‌های سخت را زودتر و بیشتر مرور کنید.\n\n۳) پاسخ را قبل از برگرداندن کارت با صدای بلند بگویید؛ این کار حافظهٔ فعال را درگیر می‌کند.\n\n۴) کارت‌ها را بر اساس موضوع مرتب کنید تا بتوانید روی نقاط ضعف تمرکز کنید.\n\nدر پنل دانشجویی زیست‌آکادمی می‌توانید فلش‌کارت‌های شخصی خودتان را بسازید و مرور کنید.",
          authorName: "محمد حسینی",
          accent: "violet",
          readTime: 4,
          featured: false,
        },
        {
          title: "خلاصهٔ نشست رایگان: مسیر ارشد و پژوهش",
          slug: "research-path-summary",
          category: "گزارش نشست",
          excerpt: "مهم‌ترین نکات نشست رایگان با دکتر توکلی دربارهٔ انتخاب گرایش ارشد، ورود به آزمایشگاه و مهارت‌های لازم.",
          body: "در نشست رایگان اخیر، دکتر توکلی به سؤالات دانشجویان دربارهٔ مسیر پژوهش پاسخ داد. مهم‌ترین نکات:\n\n• برای انتخاب گرایش ارشد، اول مهارت‌ها و علاقه‌تان را بشناسید، بعد رتبهٔ دانشگاه را.\n\n• بهترین راه ورود به آزمایشگاه، مطالعهٔ مقاله‌های همان گروه و شروع با کارهای کوچک است.\n\n• مهارت‌های نرم‌افزاری (بیوانفورماتیک، آمار) امروز از برخی مهارت‌های آزمایشگاهی هم تمایز بیشتری ایجاد می‌کنند.\n\n• مقاله‌نویسی یک مهارت اکتسابی است؛ اولین مقاله‌تان لازم نیست عالی باشد، لازم است شروع شده باشد.\n\nنسخهٔ کامل نشست به‌زودی در کانال تلگرام منتشر می‌شود.",
          authorName: "تیم زیست‌آکادمی",
          accent: "indigo",
          readTime: 4,
          featured: false,
        },
      ];
      for (const a of articles) {
        await ctx.db.insert("articles", {
          ...a,
          published: true,
          createdAt: now() - Math.floor(Math.random() * 60) * day,
        });
      }
    }

    // ── Dictionary ──────────────────────────────────────────────────────────
    if ((await ctx.db.query("dictionaryTerms").collect()).length === 0) {
      const terms = [
        {
          term: "E. coli",
          slug: "e-coli",
          fullName: "اشریشیا کلی (Escherichia coli)",
          gramStatus: "گرم منفی",
          shape: "باسیل (میله‌ای)",
          oxygen: "بی‌هوازی اختیاری",
          habitat: "رودهٔ انسان و حیوانات خونگرم؛ همچنین در آب و خاک آلوده",
          diseases: ["عفونت‌های ادراری (شایع‌ترین علت)", "اسهال مسافرتی (ETEC)", "اسهال خونی (EIEC, EHEC)", "سندرم همولیتیک-اورمیک (EHEC, سروتیپ O157:H7)", "مننژیت نوزادی (K1)"],
          virulence: ["فیمبریه و پیلی (چسبیدن به سلول)", "انتروتوکسین‌ها (LT و ST)", "شیگاتوکسین در سویه‌های EHEC", "کپسول (در سویه‌های مهاجم)"],
          diagnosis: "کشت بر روی محیط مک‌کانکی (کلنی صورتی/لاکتوز مثبت)، آزمایش‌های IMViC، آگلوتیناسیون با آنتی‌سرم O و H",
          characteristics: ["باکتری شاخص آلودگی مدفوعی آب", "لاکتوز مثبت، اکسیداز منفی", "رشد در ۴۴.۵ درجه (متمایز از سایر کلیفرم‌ها)", "مهم‌ترین عضو خانوادهٔ انتروباکتریاسه"],
          examNotes: ["IMViC برای E. coli: ایندول مثبت، VP منفی", "سروتیپ O157:H7 علت HUS است", "در تست UTI، وجود ۱۰۵ باکتری در میلی‌لیتر ادرار معنی‌دار است"],
          sources: ["Jawetz, Melnick & Adelberg's Medical Microbiology", "Bailey & Scott's Diagnostic Microbiology"],
        },
        {
          term: "Staphylococcus aureus",
          slug: "staphylococcus-aureus",
          fullName: "استافیلوکوک اورئوس",
          gramStatus: "گرم مثبت",
          shape: "کوکسی خوشه‌ای (خوشه انگور)",
          oxygen: "هوازی/بی‌هوازی اختیاری",
          habitat: "پوست، مجاری بینی و حلق انسان (کلونیزاسیون طبیعی)",
          diseases: ["آبسه و عفونت‌های پوستی (جوش، کورک)", "پنومونی و آمپیم", "اندوکاردیت", "مسمومیت غذایی (انتروتوکسین گرماپایدار)", "سندرم شوک سمی (TSST-1)", "عفونت‌های بیمارستانی (MRSA)"],
          virulence: ["کواگولاز (مهم‌ترین آنزیم تشخیصی)", "پروتئین A (اتصال به Fc ایمونوگلوبولین)", "انتروتوکسین‌ها (گرماپایدار)", "TSST-1", "همولیزین‌ها و لوکوسیدین"],
          diagnosis: "کشت روی مانیتول سالت آگار (تخمیر مانیتول، کلنی زرد)، تست کواگولاز، تست DNase",
          characteristics: ["طلایی رنگ در کشت (پیگمان کاروتنوئیدی)", "کاتالاز مثبت (تمایز از استرپتوکوک)", "مقاوم به نمک ۷.۵٪", "MRSA چالش مهم بیمارستانی"],
          examNotes: ["کاتالاز مثبت، کواگولاز مثبت", "انتروتوکسین در برابر جوشیدن مقاوم است", "TSST-1 یک سوپرآنتی‌ژن است"],
          sources: ["Jawetz, Melnick & Adelberg's Medical Microbiology"],
        },
        {
          term: "Streptococcus pyogenes",
          slug: "streptococcus-pyogenes",
          fullName: "استرپتوکوک پیوژنز (گروه A)",
          gramStatus: "گرم مثبت",
          shape: "کوکسی زنجیره‌ای",
          oxygen: "بی‌هوازی اختیاری",
          habitat: "حلق و پوست انسان",
          diseases: ["فارنژیت چرکی (گلودرد استرپتوکوکی)", "مخملک (سکارلاتینا)", "عفونت‌های پوستی (زردزخم/امپتیگو)", "تب روماتیسمی (عوارض تأخیری)", "گلومرولونفریت حاد (عوارض تأخیری)"],
          virulence: ["پروتئین M (ضد فاگوسیتوز — مهم‌ترین عامل)", "استرپتولیزین O و S", "هیالورونیداز و استرپتوکیناز", "اگزوتوکسین‌های اریتروژنیک (مخملک)"],
          diagnosis: "کشت روی بلاد آگار (بتا همولیز)، تست حساسیت به باسیتراسین، ASO تیتر (عوارض تأخیری)",
          characteristics: ["بتا همولیتیک گروه A", "حساس به باسیتراسین", "تب روماتیسمی عمدتاً در پی فارنژیت رخ می‌دهد نه عفونت پوستی"],
          examNotes: ["پروتئین M اصلی‌ترین فاکتور ویرولانس است", "ASO بعد از عفونت بالا می‌رود", "مخملک = فارنژیت + راش"],
          sources: ["Jawetz, Melnick & Adelberg's Medical Microbiology"],
        },
        {
          term: "Bacillus subtilis",
          slug: "bacillus-subtilis",
          fullName: "باسیلوس سوبتیلیس",
          gramStatus: "گرم مثبت",
          shape: "باسیل بزرگ",
          oxygen: "هوازی اجباری",
          habitat: "خاک و گیاهان",
          diseases: ["عفونت فرصت‌طلب در افراد نقص ایمنی (نادر)", "مهم‌تر: آلودگی آزمایشگاهی"],
          virulence: ["اندوسپور مقاوم به حرارت", "آنزیم‌های برون‌ریز"],
          diagnosis: "کشت هوازی، تست کاتالاز مثبت، افتراق از باسیلوس سرئوس با تست لسیتیناز و همولیز",
          characteristics: ["GRAS محسوب می‌شود (مطمئن برای مصرف)", "مولد آنزیم‌های صنعتی (آمیلاز، پروتئاز)", "مدل کلاسیک برای مطالعهٔ اندوسپور و بیوانفورماتیک", "عدم تولید انتروتوکسین (برخلاف B. cereus)"],
          examNotes: ["اندوسپور مرکزی دارد و دیوارهٔ آن را متورم نمی‌کند (برخلاف C. perfringens)", "B. subtilis موتیل است", "در صنعت برای تولید آنزیم و ویتامین استفاده می‌شود"],
          sources: ["Brock Biology of Microorganisms"],
        },
        {
          term: "Salmonella enterica",
          slug: "salmonella-enterica",
          fullName: "سالمونلا انتریکا",
          gramStatus: "گرم منفی",
          shape: "باسیل",
          oxygen: "بی‌هوازی اختیاری",
          habitat: "رودهٔ حیوانات (مرغ، گاو) و انسان",
          diseases: ["تب تیفوئید (سروتیپ Typhi)", "گاستروانتریت (غذاآلودگی)", "باکتریمی"],
          virulence: ["فیمبریه (چسبیدن)", "اینوازین (ورود به سلول)", "اندوتوکسین (LPS)", "آنتی‌ژن Vi در سروتیپ Typhi"],
          diagnosis: "کشت خون (تب تیفوئید) و مدفوع (گاستروانتریت)، آگلوتیناسیون Widal (کم‌اعتبار امروزی)",
          characteristics: ["لاکتوز منفی، H2S مثبت (XLD آگار)", "تب تیفوئید فقط از انسان به انسان منتقل می‌شود", "درمان تیفوئید با سفتریاکسون/آزیترومایسین"],
          examNotes: ["Typhi = انسان، غیر تیفوئیدی = حیوانات", "H2S مثبت، اوره منفی", "ناقل مزمن در کیسهٔ صفرا (کانون عفونت)"],
          sources: ["Jawetz, Melnick & Adelberg's Medical Microbiology"],
        },
        {
          term: "Pseudomonas aeruginosa",
          slug: "pseudomonas-aeruginosa",
          fullName: "سودوموناس آئروژینوزا",
          gramStatus: "گرم منفی",
          shape: "باسیل راست یا کمی خمیده",
          oxygen: "هوازی اجباری",
          habitat: "آب، خاک، گیاهان و محیط‌های بیمارستانی (سینک، دستگاه‌ها)",
          diseases: ["عفونت زخم و سوختگی", "پنومونی بیمارستانی", "عفونت ریه در بیماران CF", "اوتیت خارجی (گوش شناگر)", "عفونت‌های مرتبط با کاتتر"],
          virulence: ["پیوسیانین (رنگدانه سبز-آبی)", "اگزوآنزیم‌ها (S و U)", "بیوفیلم", "مقاومت آنتی‌بیوتیکی ذاتی و اکتسابی", "الیگوساکارید آلژینات (در CF)"],
          diagnosis: "کشت روی بلاد آگار (بوی میوه‌ای/گلی), اکسیداز مثبت، رشد در ۴۲ درجه",
          characteristics: ["مقاوم ذاتی به بسیاری از آنتی‌بیوتیک‌ها", "اکسیداز مثبت (تمایز از انتروباکتریاسه)", "بوی شیرین مشخصه دارد", "مهم‌ترین عامل عفونت سوختگی"],
          examNotes: ["اکسیداز مثبت، اکسیداتیو", "در CF علت اصلی مرگ است", "پیوسیانین = رنگدانهٔ فنازینی"],
          sources: ["Jawetz, Melnick & Adelberg's Medical Microbiology"],
        },
        {
          term: "Helicobacter pylori",
          slug: "helicobacter-pylori",
          fullName: "هلیکوباکتر پیلوری",
          gramStatus: "گرم منفی",
          shape: "مارپیچی (کمی خمیده)",
          oxygen: "میکروآئروفیل",
          habitat: "مخاط معدهٔ انسان",
          diseases: ["گاستریت مزمن", "زخم پپتیک (معده و دوازدهه)", "آدنوکارسینوم معده", "لنفوم MALT معده"],
          virulence: ["اوره‌آز (خنثی‌سازی اسید با آمونیاک)", "فلاژل (تحرک در موکوس)", "CagA و VacA (سیتوتوکسین‌ها)", "آداپتاسیون به محیط اسیدی"],
          diagnosis: "تست اوره‌آز سریع (بیوپسی)، تست تنفسی اوره، آنتی‌ژن مدفوع، سرولوژی",
          characteristics: ["میکروآئروفیل و اوره‌آز مثبت", "عامل سرطان معده (گروه ۱ کارسینوژن WHO)", "درمان: رژیم سه‌گانه (PPI + دو آنتی‌بیوتیک)"],
          examNotes: ["اوره‌آز کلید بقا در معده است", "مارپیچی = سازگاری با موکوس", "تست تنفسی برای تأیید ریشه‌کنی استفاده می‌شود"],
          sources: ["Jawetz, Melnick & Adelberg's Medical Microbiology"],
        },
        {
          term: "Mycobacterium tuberculosis",
          slug: "mycobacterium-tuberculosis",
          fullName: "مایکوباکتریوم توبرکلوزیس",
          gramStatus: "گرم مثبت (اما اسید فست)",
          shape: "باسیل باریک",
          oxygen: "هوازی اجباری",
          habitat: "ریهٔ انسان (انتقال هوایی)",
          diseases: ["سل ریوی", "سل خارج ریوی (مننژیت، سل استخوان، سل کلیوی)", "سل میلیاری"],
          virulence: ["دیوارهٔ غنی از اسید مایکولیک (مقاومت و اسیدفستی)", "کورد فاکتور (کورد فاکتور = سمی)", "توانایی بقای داخل ماکروفاژ", "سولفولیپیدها"],
          diagnosis: "رنگ‌آمیزی Ziehl-Neelsen، کشت (لوون‌شتاین-جانسون — رشد آهسته)، PCR (GeneXpert)",
          characteristics: ["اسید فست به دلیل اسید مایکولیک", "رشد بسیار آهسته (تقسیم ۱۵-۲۰ ساعت)", "BCG واکسن پیشگیرانه است", "مقاومت دارویی (MDR-TB) چالش جهانی"],
          examNotes: ["اسید فست = قرمز در ZN، سایر باکتری‌ها آبی", "کورد فاکتور = رشد زنجیره‌ای روی محیط مایع", "سل عمدتاً ریوی است اما می‌تواند هر عضوی را درگیر کند"],
          sources: ["Jawetz, Melnick & Adelberg's Medical Microbiology"],
        },
        {
          term: "Clostridium tetani",
          slug: "clostridium-tetani",
          fullName: "کلستریدیوم تتانی",
          gramStatus: "گرم مثبت",
          shape: "باسیل با اندوسپور انتهایی (شکل چوب طبل)",
          oxygen: "بی‌هوازی اجباری",
          habitat: "خاک، گرد و غبار و مدفوع حیوانات",
          diseases: ["کزاز (تتانی) — اسپاسم عضلانی عمومی"],
          virulence: ["تتانوسپاسمین (نوروتوکسین — مسدودکنندهٔ GABA و گلایسین)", "اندوسپور مقاوم"],
          diagnosis: "تشخیص بالینی است؛ کشت و شناسایی توکسین برای تأیید",
          characteristics: ["توکسین به اعصاب حرکتی می‌رسد و اسپاسم ایجاد می‌کند", "پیشگیری با واکسن DTP/Tdap", "عفونت زخم آلوده به خاک + بافت نکروزه"],
          examNotes: ["تتانوسپاسمین = فلج اسپاستیک", "توکسین در برابر حرارت حساس است اما اسپور مقاوم", "واکسن DTP = دیفتری، کزاز، سیاه‌سرفه"],
          sources: ["Jawetz, Melnick & Adelberg's Medical Microbiology"],
        },
        {
          term: "Neisseria gonorrhoeae",
          slug: "neisseria-gonorrhoeae",
          fullName: "نایسریا گونوره",
          gramStatus: "گرم منفی",
          shape: "دیپلوکوک کلیوی (دانه قهوه)",
          oxygen: "هوازی (غنی از CO2)",
          habitat: "مجرای تناسلی-ادراری انسان",
          diseases: ["سوزاک (اورتریت، سرویسیت)", "بیماری التهابی لگن (PID)", "عفونت چشمی نوزاد (افتالمی نوزادی)"],
          virulence: ["پیلی (چسبیدن و مقاومت به فاگوسیتوز)", "پروتئین Opa", "IgA پروتئاز", "تغییر آنتی‌ژنی پیلی"],
          diagnosis: "رنگ‌آمیزی گرم (دیپلوکوک داخل نوتروفیل)، کشت روی Thayer-Martin، تست NAAT (PCR)",
          characteristics: ["کشت به CO2 و محیط غنی نیاز دارد", "عفونت علامت‌دار در مردان، اغلب بدون علامت در زنان", "پیشگیری چشمی نوزاد با نیترات نقره/اریترومایسین", "همراهی شایع با کلامیدیا"],
          examNotes: ["دیپلوکوک کلیوی داخل لکوسیت = کلاسیک", "Thayer-Martin حاوی آنتی‌بیوتیک برای مهار فلور", "عامل اصلی ناباروری قابل پیشگیری در زنان"],
          sources: ["Jawetz, Melnick & Adelberg's Medical Microbiology"],
        },
      ];
      for (const t of terms) {
        await ctx.db.insert("dictionaryTerms", t);
      }
    }
  },
});

function now() {
  return Date.now();
}

export const seedPart3 = mutation({
  args: {},
  handler: async (ctx) => {
    const getCat = async (slug: string) =>
      await ctx.db.query("categories").filter((q) => q.eq(q.field("slug"), slug)).first();

    // ── Questions ───────────────────────────────────────────────────────────
    if ((await ctx.db.query("questions").collect()).length === 0) {
      const cats = {
        microbio: (await getCat("microbiology"))!,
        biochem: (await getCat("biochemistry"))!,
        genetics: (await getCat("genetics"))!,
        molecular: (await getCat("molecular-biology"))!,
        immunology: (await getCat("immunology"))!,
        biotech: (await getCat("biotechnology"))!,
        bioinfo: (await getCat("bioinformatics"))!,
      };

      // [topic, text, options, correctIndex, explanation, difficulty]
      const qs: [any, string, string[], number, string, number][] = [
        // ── Microbiology ──
        [cats.microbio, "در رنگ‌آمیزی گرم، کدام ویژگی باعث نگه‌داشتن کریستال ویوله در باکتری‌های گرم مثبت می‌شود؟", ["غشای خارجی حاوی LPS", "لایهٔ ضخیم پپتیدوگلیکان", "کپسول پلی‌ساکاریدی", "پیلی جنسی"], 1, "دیوارهٔ ضخیم پپتیدوگلیکان در گرم مثبت‌ها (۲۰ تا ۸۰ نانومتر) کریستال ویوله را نگه می‌دارد و پس از رنگ‌بری با الکل، باکتری بنفش باقی می‌ماند.", 1],
        [cats.microbio, "کدام باکتری کاتالاز مثبت و کواگولاز مثبت است؟", ["استرپتوکوک پیوژنز", "اشریشیا کلی", "استافیلوکوک اورئوس", "استرپتوکوک پنومونیه"], 2, "استافیلوکوک اورئوس کاتالاز مثبت (تمایز از استرپتوکوک) و کواگولاز مثبت (تمایز از سایر استافیلوکوک‌ها) است.", 1],
        [cats.microbio, "اندوتوکسین باکتری‌های گرم منفی در کدام بخش قرار دارد؟", ["پپتیدوگلیکان", "لیپوپلی‌ساکارید غشای خارجی", "ریبوزوم", "پلاسمید"], 1, "LPS (لیپوپلی‌ساکارید) در غشای خارجی گرم منفی‌ها قرار دارد و لیپید A آن خاصیت اندوتوکسینی دارد.", 1],
        [cats.microbio, "مهم‌ترین عامل ویرولانس استرپتوکوک پیوژنز که ضد فاگوسیتوز عمل می‌کند کدام است؟", ["استرپتولیزین O", "پروتئین M", "هیالورونیداز", "استرپتوکیناز"], 1, "پروتئین M به C3b و فیبرینوژن متصل می‌شود و از فاگوسیتوز جلوگیری می‌کند؛ مهم‌ترین فاکتور ویرولانس این باکتری است.", 1],
        [cats.microbio, "کدام باکتری اوره‌آز مثبت است و در مخاط معده زندگی می‌کند؟", ["هلیکوباکتر پیلوری", "سالمونلا تیفی", "ویبریو کلرا", "شیگلا دیسانتری"], 0, "هلیکوباکتر پیلوری با آنزیم اوره‌آز، اوره را به آمونیاک و CO2 تبدیل می‌کند و اسید معده را خنثی می‌کند.", 2],
        [cats.microbio, "کدام باکتری اسید فست است؟", ["مایکوباکتریوم توبرکلوزیس", "نایسریا گونوره", "کلستریدیوم تتانی", "باسیلوس سوبتیلیس"], 0, "به دلیل وجود اسید مایکولیک در دیواره، مایکوباکتریوم‌ها با روش Ziehl-Neelsen قرمز دیده می‌شوند.", 1],
        [cats.microbio, "در تست IMViC، نتیجهٔ کلاسیک E. coli کدام است؟", ["ایندول منفی، VP مثبت", "ایندول مثبت، VP منفی", "ایندول منفی، VP منفی", "ایندول مثبت، VP مثبت"], 1, "E. coli ایندول مثبت و VP منفی است؛ این الگو آن را از کلیبسیلا (VP مثبت) متمایز می‌کند.", 2],
        [cats.microbio, "سندرم همولیتیک-اورمیک (HUS) بیشتر با کدام سروتیپ همراه است؟", ["E. coli O157:H7", "سالمونلا تیفی", "هلیکوباکتر پیلوری", "سودوموناس آئروژینوزا"], 0, "سویه‌های EHEC حاوی شیگاتوکسین (مثل O157:H7) باعث HUS با نارسایی کلیه می‌شوند.", 2],
        [cats.microbio, "کدام باکتری برای رشد به اکسیژن نیاز ندارد و بی‌هوازی اجباری است؟", ["کلستریدیوم تتانی", "سودوموناس آئروژینوزا", "مایکوباکتریوم توبرکلوزیس", "باسیلوس سوبتیلیس"], 0, "کلستریدیوم‌ها بی‌هوازی اجباری‌اند؛ سودوموناس، مایکوباکتریوم و باسیلوس هوازی‌اند.", 1],
        [cats.microbio, "شایع‌ترین عامل عفونت ادراری کدام باکتری است؟", ["استافیلوکوک اورئوس", "اشریشیا کلی", "استرپتوکوک پیوژنز", "کلستریدیوم دیفیسیل"], 1, "E. coli عامل حدود ۸۰٪ عفونت‌های ادراری است.", 1],
        // ── Biochemistry ──
        [cats.biochem, "محصول نهایی گلیکولیز برای هر مولکول گلوکز کدام است؟", ["۲ پیرووات، ۲ ATP و ۲ NADH", "۱ پیرووات، ۱ ATP و ۱ NADH", "۲ استیل-CoA و ۴ ATP", "۲ لاکتات و ۴ ATP"], 0, "گلیکولیز: گلوکز → ۲ پیرووات + ۲ ATP (خالص) + ۲ NADH.", 1],
        [cats.biochem, "کدام آنزیم چرخهٔ کربس در ماتریکس میتوکندری واقع است؟", ["فسفوفروکتوکیناز", "سیترات سینتاز", "هگزوکیناز", "پیروات کیناز"], 1, "سیترات سینتاز اولین آنزیم چرخهٔ کربس در ماتریکس است و اگزالواستات را با استیل-CoA ترکیب می‌کند.", 2],
        [cats.biochem, "کدام کمپلکس زنجیرهٔ انتقال الکترون ATP تولید مستقیم می‌کند؟", ["کمپلکس I", "کمپلکس II", "کمپلکس III", "ATP سنتاز (کمپلکس V)"], 3, "ATP سنتاز با عبور پروتون‌ها از غشای داخلی میتوکندری ATP می‌سازد (فسفریلاسیون اکسیداتیو).", 1],
        [cats.biochem, "کدام ویتامین پیش‌ساز کوآنزیم NAD+ است؟", ["نیاسین (B3)", "تیامین (B1)", "ریبوفلاوین (B2)", "پیریدوکسین (B6)"], 0, "نیاسین پیش‌ساز NAD+ و NADP+ است؛ ریبوفلاوین پیش‌ساز FAD.", 2],
        [cats.biochem, "در کدام شرایط بدن بیشتر از گلوکونئوژنز استفاده می‌کند؟", ["بلافاصله بعد از غذا", "در حالت ناشتایی طولانی", "در حین گلیکولیز فعال", "در حین چرخهٔ کربس"], 1, "در ناشتایی، گلوکز خون باید حفظ شود؛ گلوکونئوژنز در کبد از لاکتات، گلیسرول و آمینواسیدها گلوکز می‌سازد.", 2],
        [cats.biochem, "ساختار دوم پروتئین (آلفا هلیکس) با کدام پیوند پایدار می‌شود؟", ["پیوند دی‌سولفیدی", "پیوند هیدروژنی بین گروه‌های NH و CO", "پیوند هیدروفوب", "پیوند یونی"], 1, "آلفا هلیکس و بتا شیت با پیوندهای هیدروژنی بین گروه‌های پپتیدی پایدار می‌شوند.", 1],
        [cats.biochem, "کدام مولکول کوآنزیم حمل‌کنندهٔ استیل است؟", ["NADH", "FADH2", "CoA", "ATP"], 2, "کوآنزیم A با گروه تیول خود، گروه استیل را حمل می‌کند و استیل-CoA می‌سازد.", 1],
        [cats.biochem, "کدام آنزیم گلیکولیز نقطهٔ تنظیم اصلی مسیر است؟", ["هگزوکیناز", "فسفوفروکتوکیناز-۱", "تریوز فسفات ایزومراز", "انوولاز"], 1, "فسفوفروکتوکیناز-۱ (PFK-1) مهم‌ترین نقطهٔ تنظیم گلیکولیز است و توسط ATP مهار و AMP فعال می‌شود.", 2],
        // ── Genetics ──
        [cats.genetics, "در تلاقی دو دودگرگشت (AaBb × AaBb) با ژن‌های مستقل، نسبت فنوتیپی نسل دوم کدام است؟", ["۱:۲:۱", "۳:۱", "۹:۳:۳:۱", "۱:۱:۱:۱"], 2, "قانون تفکیک مستقل: نسبت ۹:۳:۳:۱ در نسل دوم تلاقی دودودگرگشت.", 1],
        [cats.genetics, "کدام آنزیم در همانندسازی DNA قطعات اوکازاکی را به هم متصل می‌کند؟", ["هلیکاز", "DNA لیگاز", "پریماز", "توپوایزومراز"], 1, "DNA لیگاز شکاف‌های بین قطعات اوکازاکی در رشتهٔ تأخیری را می‌بندد.", 1],
        [cats.genetics, "جهش «بدمعنی» (Missense) چه اثری دارد؟", ["توقف زودرس ترجمه", "تغییر یک آمینواسید", "بدون تغییر آمینواسید", "جابه‌جایی قاب خواندن"], 1, "در جهش بدمعنی یک نوکلئوتید عوض می‌شود و یک آمینواسید متفاوت جایگزین می‌شود.", 1],
        [cats.genetics, "کدام ساختار در یوکاریوت‌ها DNA را دور خود می‌پیچد؟", ["هیستون", "پلیمراز", "لیگاز", "ریبوزوم"], 0, "DNA دور اکتامر هیستون (H2A, H2B, H3, H4) می‌پیچد و نوکلئوزوم می‌سازد.", 1],
        [cats.genetics, "چند کروماتید در یک کروموزوم متراکم متافاز وجود دارد؟", ["یک", "دو", "چهار", "هشت"], 1, "کروموزوم متافاز از دو کروماتید خواهر تشکیل شده که با سانترومر به هم متصل‌اند.", 1],
        [cats.genetics, "کدام نوع RNA بیشترین فراوانی را در سلول دارد؟", ["mRNA", "tRNA", "rRNA", "snRNA"], 2, "rRNA حدود ۸۰٪ RNA سلول را تشکیل می‌دهد و جزء ساختاری ریبوزوم است.", 1],
        [cats.genetics, "در بیماری‌های با وراثت اتوزومال مغلوب، کدام حالت والدین معمول است؟", ["هر دو مبتلا", "هر دو ناقل سالم", "یکی مبتلا و یکی سالم", "هر دو سالم و بدون ناقل"], 1, "در اتوزومال مغلوب، والدین معمولاً ناقل هتروزیگوت سالم‌اند و ۲۵٪ فرزندان مبتلا می‌شوند.", 2],
        [cats.genetics, "کدام فرایند در یوکاریوت‌ها قبل از ترجمه روی pre-mRNA انجام می‌شود؟", ["حذف اینترون‌ها و اتصال اگزون‌ها", "پلی‌آدنیلاسیون ۵'", "متیلاسیون ۳'", "همانندسازی"], 0, "پردازش pre-mRNA شامل حذف اینترون‌ها (Splicing)، کلاهک ۵' و دم poly-A است.", 1],
        // ── Molecular biology ──
        [cats.molecular, "کدام آنزیم برای PCR از باکتری مقاوم به حرارت گرفته شده است؟", ["DNA پلیمراز I", "Taq پلیمراز", "هلیکاز", "ترانس کریپتاز معکوس"], 1, "Taq پلیمراز از Thermus aquaticus گرفته شده و در دمای بالا پایدار است.", 1],
        [cats.molecular, "کدام فرایند DNA را به RNA تبدیل می‌کند؟", ["ترجمه", "رونویسی", "همانندسازی", "ترانس‌دوشن"], 1, "رونویسی توسط RNA پلیمراز، DNA را به mRNA تبدیل می‌کند.", 1],
        [cats.molecular, "کدون شروع ترجمه در یوکاریوت‌ها کدام است؟", ["UAA", "AUG", "UGA", "GUA"], 1, "AUG کدون شروع (متیونین) است؛ UAA، UAG و UGA کدون‌های توقف‌اند.", 1],
        [cats.molecular, "در الکتروفورز ژل آگارز، DNA چگونه حرکت می‌کند؟", ["به سمت آند (قطب مثبت)", "به سمت کاتد (قطب منفی)", "حرکت نمی‌کند", "فقط در خلأ حرکت می‌کند"], 0, "DNA بار منفی دارد و در میدان الکتریکی به سمت آند حرکت می‌کند؛ قطعات کوچک‌تر سریع‌ترند.", 1],
        [cats.molecular, "کدام مولکول توسط ریبوزوم ساخته می‌شود؟", ["DNA", "mRNA", "پروتئین", "ATP"], 2, "ریبوزوم mRNA را ترجمه می‌کند و زنجیرهٔ پلی‌پپتیدی (پروتئین) می‌سازد.", 1],
        [cats.molecular, "«پروموتر» در کجای ژن قرار دارد؟", ["پایین‌دست ژن", "بالادست ژن", "داخل اینترون", "روی ریبوزوم"], 1, "پروموتر ناحیهٔ بالادست ژن است که RNA پلیمراز به آن متصل می‌شود.", 2],
        [cats.molecular, "چند نوکلئوتید یک کدون را می‌سازد؟", ["۲", "۳", "۴", "۶"], 1, "هر کدون سه نوکلئوتید است و یک آمینواسید را کد می‌کند.", 1],
        [cats.molecular, "کدام فرایند برای ساخت cDNA از mRNA استفاده می‌شود؟", ["PCR معمولی", "ترانس‌کریپتاز معکوس", "لیگاسیون", "محدودکننده"], 1, "آنزیم ترانس‌کریپتاز معکوس (Reverse Transcriptase) RNA را به cDNA تبدیل می‌کند.", 2],
        // ── Immunology ──
        [cats.immunology, "کدام سلول آنتی‌بادی تولید می‌کند؟", ["سلول T سیتوتوکسیک", "سلول پلاسما (B فعال‌شده)", "ماکروفاژ", "سلول NK"], 1, "سلول‌های B پس از فعال‌شدن به سلول پلاسما تمایز می‌یابند و آنتی‌بادی ترشح می‌کنند.", 1],
        [cats.immunology, "کدام ایمونوگلوبولین از جفت عبور می‌کند؟", ["IgA", "IgM", "IgG", "IgE"], 2, "IgG تنها ایمونوگلوبولینی است که از جفت عبور می‌کند و ایمنی غیرفعال به جنین می‌دهد.", 1],
        [cats.immunology, "کدام سلول مسئول ایمنی ذاتی علیه سلول‌های آلوده به ویروس است؟", ["سلول NK", "سلول T کمکی", "سلول B", "سلول پلاسما"], 0, "سلول‌های NK (قاتل طبیعی) بدون نیاز به آنتی‌ژن اختصاصی، سلول‌های آلوده را از بین می‌برند.", 1],
        [cats.immunology, "کمپلمان در کدام مسیر ابتدا فعال می‌شود؟", ["مسیر کلاسیک", "مسیر لکتین", "مسیر جایگزین", "هر سه مسیر همزمان"], 2, "مسیر جایگزین به‌صورت خودبه‌خود و بدون نیاز به آنتی‌بادی فعال می‌شود؛ سریع‌ترین پاسخ است.", 2],
        [cats.immunology, "کدام سلول MHC کلاس II را به‌طور پیوسته بیان می‌کند و به سلول T کمکی آنتی‌ژن ارائه می‌دهد؟", ["سلول دندریتیک", "گلبول قرمز", "نورون", "سلول ماهیچه"], 0, "سلول‌های ارائه‌دهندهٔ آنتی‌ژن حرفه‌ای (دندریتیک، ماکروفاژ، B) MHC کلاس II دارند.", 1],
        // ── Biotechnology ──
        [cats.biotech, "کدام محصول با فناوری DNA نوترکیب تولید می‌شود؟", ["انسولین انسانی", "آسپرین", "پاراستامول", "ویتامین C"], 0, "انسولین انسانی اولین محصول تجاری مهم DNA نوترکیب است که در E. coli یا مخمر تولید می‌شود.", 1],
        [cats.biotech, "CRISPR-Cas9 برای چه کاری استفاده می‌شود؟", ["ویرایش ژنوم", "تولید آنتی‌بادی", "رنگ‌آمیزی گرم", "کشت سلول"], 0, "CRISPR-Cas9 با هدایت RNA راهنما، DNA هدف را برش می‌دهد و ویرایش ژنومی دقیق ممکن می‌کند.", 1],
        [cats.biotech, "پلاسمید به‌عنوان چه چیزی در مهندسی ژنتیک به کار می‌رود؟", ["وکتور (حامل ژن)", "آنزیم محدودکننده", "پرایمر", "مادهٔ مغذی"], 0, "پلاسمید وکتوری است که ژن خارجی را به سلول میزبان منتقل می‌کند.", 1],
        // ── Bioinformatics ──
        [cats.bioinfo, "کدام پایگاه داده برای جستجوی توالی‌های زیستی استفاده می‌شود؟", ["NCBI/GenBank", "SQLite", "Excel", "Photoshop"], 0, "NCBI (GenBank) پایگاه مرکزی توالی‌های نوکلئوتیدی و پروتئینی است.", 1],
        [cats.bioinfo, "ابزار BLAST برای چه کاری استفاده می‌شود؟", ["هم‌ترازی و مقایسهٔ توالی‌ها", "رنگ‌آمیزی سلول", "محاسبهٔ pH", "تولید آنتی‌بادی"], 0, "BLAST توالی پرس‌وجو را با توالی‌های پایگاه داده مقایسه می‌کند و شباهت‌ها را نشان می‌دهد.", 1],
      ];

      const byTopic = new Map<any, any[]>();
      for (const [topic, text, options, correctIndex, explanation, difficulty] of qs) {
        const id = await ctx.db.insert("questions", {
          text,
          options,
          correctIndex,
          explanation,
          topicId: topic._id,
          difficulty,
        });
        if (!byTopic.has(topic._id)) byTopic.set(topic._id, []);
        byTopic.get(topic._id).push(id);
      }

      // ── Exams ─────────────────────────────────────────────────────────────
      const microbioQs = byTopic.get(cats.microbio._id)!;
      const biochemQs = byTopic.get(cats.biochem._id)!;
      const geneticsQs = byTopic.get(cats.genetics._id)!;
      const molecularQs = byTopic.get(cats.molecular._id)!;
      const immunologyQs = byTopic.get(cats.immunology._id)!;

      if ((await ctx.db.query("exams").collect()).length === 0) {
        const pick = (arr: any[], n: number) => {
          const copy = [...arr].sort(() => Math.random() - 0.5);
          return copy.slice(0, n);
        };

        const diagnostic = [
          ...pick(microbioQs, 3),
          ...pick(biochemQs, 2),
          ...pick(geneticsQs, 2),
          ...pick(molecularQs, 2),
          ...pick(immunologyQs, 1),
        ];

        await ctx.db.insert("exams", {
          title: "آزمون تعیین سطح علوم زیستی",
          slug: "diagnostic-test",
          description: "۱۰ سؤال از مباحث اصلی علوم زیستی برای تشخیص نقاط قوت و ضعف شما. رایگان و بدون نیاز به ثبت‌نام دوره.",
          durationMinutes: 15,
          questionIds: diagnostic,
          free: true,
          published: true,
          featured: true,
          diagnostic: true,
          accent: "teal",
          order: 1,
        });
        await ctx.db.insert("exams", {
          title: "آزمون میکروب‌شناسی ۱",
          slug: "microbiology-test-1",
          description: "۱۰ سؤال از مباحث پایهٔ میکروب‌شناسی: رنگ‌آمیزی گرم، باکتری‌های مهم و فاکتورهای ویرولانس.",
          durationMinutes: 15,
          questionIds: microbioQs,
          free: true,
          published: true,
          featured: true,
          diagnostic: false,
          accent: "teal",
          order: 2,
        });
        await ctx.db.insert("exams", {
          title: "آزمون بیوشیمی ۱",
          slug: "biochemistry-test-1",
          description: "۸ سؤال از ساختار و متابولیسم: گلیکولیز، چرخهٔ کربس و زنجیرهٔ انتقال الکترون.",
          durationMinutes: 12,
          questionIds: biochemQs,
          free: true,
          published: true,
          featured: false,
          diagnostic: false,
          accent: "amber",
          order: 3,
        });
        await ctx.db.insert("exams", {
          title: "آزمون ژنتیک ۱",
          slug: "genetics-test-1",
          description: "۸ سؤال از وراثت مندلی و ژنتیک مولکولی برای سنجش پایه‌های شما.",
          durationMinutes: 12,
          questionIds: geneticsQs,
          free: true,
          published: true,
          featured: false,
          diagnostic: false,
          accent: "violet",
          order: 4,
        });
      }

      // ── Daily quiz (14 days) ─────────────────────────────────────────────
      if ((await ctx.db.query("dailyQuiz").collect()).length === 0) {
        const pool = [
          ...microbioQs,
          ...biochemQs,
          ...geneticsQs,
          ...molecularQs,
          ...immunologyQs,
        ];
        const d = new Date();
        for (let i = 0; i < 14; i++) {
          const day = new Date(d.getTime() + i * 24 * 60 * 60 * 1000);
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
          await ctx.db.insert("dailyQuiz", {
            date: key,
            questionId: pool[i % pool.length],
            points: 10,
          });
        }
      }
    }
  },
});

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(api_seed_seedPart1 as any, {});
    await ctx.runMutation(api_seed_seedPart2 as any, {});
    await ctx.runMutation(api_seed_seedPart3 as any, {});
    return { ok: true };
  },
});

import { api as api_seed_seedPart1 } from "./_generated/api";
