// @ts-nocheck
import { mutation } from "./_generated/server";

// Seed 20 biology diagnostic questions + exam. Safe to re-run (idempotent).
export const seedBioDiagnostic = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if exam already exists
    const existing = await ctx.db
      .query("exams")
      .filter((q) => q.eq(q.field("slug"), "bio-diagnostic"))
      .first();
    if (existing) return { ok: true, msg: "already seeded" };

    // Find or use first category
    const cats = await ctx.db.query("categories").collect();
    const topicId = cats.length > 0 ? cats[0]._id : null;
    if (!topicId) return { ok: false, msg: "no categories found" };

    // 20 Biology diagnostic questions (cell biology, genetics, microbiology, ecology, biochemistry)
    const qs = [
      // 1-5: Cell Biology
      { text: "کدام اندامک وظیفه تولید ATP را در سلول‌های یوکاریوتی بر عهده دارد؟", options: ["ریبوزوم","میتوکندری","دوک تقسیم","دستگاه گلژی"], correctIndex: 1, explanation: "میتوکندری به عنوان نیروگاه سلول شناخته می‌شود و محل چرخه کربس و زنجیره انتقال الکترون است.", difficulty: 1 },
      { text: "سلول‌های prokaryote دارای کدام ویژگی هستند؟", options: ["هسته جداگانه","دیواره سلولی پپتیدوگلیکان","میتوکندری","پوشش غشایی هسته"], correctIndex: 1, explanation: "باکتری‌ها دیواره سلولی از جنس پپتیدوگلیکان دارند.", difficulty: 1 },
      { text: "کدام مولکول اصلی‌ترین نقش را در انتقال اکسیژن در خون دارد؟", options: ["آلبومین","هموگلوبین","فیبرینوژن","آنتی‌بادی"], correctIndex: 1, explanation: "هموگلوبین در گلبول‌های قرمز به اکسیژن متصل می‌شود.", difficulty: 1 },
      { text: "فرآیند فتوسنتز در چه اندامکی رخ می‌دهد؟", options: ["میتوکندری","کلروپلاست","لیزوزوم","هسته"], correctIndex: 1, explanation: "کلروپلاست محل انجام فتوسنتز در سلول‌های گیاهی است.", difficulty: 1 },
      { text: "سیستم ایمنی ذاتی شامل کدام مورد است؟", options: ["آنتی‌بادی‌ها","سلول‌های B","پوست و مخاط","سلول‌های T"], correctIndex: 2, explanation: "پوست و مخاط خط اول دفاعی بدن هستند.", difficulty: 1 },

      // 6-10: Genetics
      { text: "DNA از کدام زنجیره‌ها تشکیل شده است؟", options: ["آمینه","نوکلئوتیدها","اسیدهای چرب","قند‌ها"], correctIndex: 1, explanation: "هر نوکلئوتید شامل باز نیتروژن‌دار، دئوکسی‌ریبوز و گروه فسفات است.", difficulty: 1 },
      { text: "کدام آنزیم در همانندسازی DNA نقش دارد؟", options: ["لیگاز","RNA پلی‌مراز","DNA پلی‌مراز","آمینوآسیل tRNA سینتتاز"], correctIndex: 2, explanation: "DNA پلی‌مراز رشته‌های جدید DNA را می‌سازد.", difficulty: 2 },
      { text: "تعداد کروموزوم‌های انسانی عادی چقدر است؟", options: ["23","44","46","48"], correctIndex: 2, explanation: "انسان 23 جفت (۴۶ عدد) کروموزوم دارد.", difficulty: 1 },
      { text: "کدام نوع جهش باعث تغییر در توالی آمینواسیدی پروتئین نمی‌شود؟", options: ["جهش بی‌معنی (Silent)","جهش جابه‌جایی چارچوب","جهش جایگزینی","جهش حذفی"], correctIndex: 0, explanation: "جهش بی‌معنی به دلیل کدون‌های هم‌معنا، تغییری در آمینواسید ایجاد نمی‌کند.", difficulty: 2 },
      { text: "违法Segregation در تقسیم میوز معمولاً در کدام مرحله رخ می‌دهد؟", options: ["میوز I","میوز II","_splitsNone","حذف"], correctIndex: 0, explanation: "در میوز I جداسازی کروموزوم‌های هم‌تبار رخ می‌دهد.", difficulty: 2 },

      // 11-15: Microbiology
      { text: "کدام باکتری عامل اصلی سل است؟", options: ["استافیلوکوکوس اورئوس","مایکوباکتریوم توبرکلوزیس","اسچریشیا کلی","استرپتوکوکوس"], correctIndex: 1, explanation: "مایکوباکتریوم توبرکلوزیس عامل بیماری سل (TB) است.", difficulty: 2 },
      { text: "آنتی‌بیوتیک‌های β-لاکتام با کدام ساختار سلول باکتریایی اثر می‌کنند؟", options: ["دیواره سلولی","غشای سلولی","ریبوزوم","DNA"], correctIndex: 0, explanation: "پنی‌سیلین و سفالوسپورین‌ها سنتز پپتیدوگلیکان را مهار می‌کنند.", difficulty: 2 },
      { text: "کدام یک از موارد زیر یک ویروس DNA است؟", options: ["آنفلوانزا","HIV","هپاتیت B","سارس-کوو-۲"], correctIndex: 2, explanation: "هپاتیت B یک ویروس DNA دولنگه‌ای است.", difficulty: 2 },
      { text: "تکثیر باکتری‌ها در شرایط آزمایشگاهی معمولاً در کدام فاز رشد می‌کنند؟", options: ["فاز lag","فاز log (نمونه‌برداری)","فاز stationary","فاز death"], correctIndex: 1, explanation: "فاز log فاز رشد نمایی و فعال باکتری است.", difficulty: 2 },
      { text: "کدام رنگ‌آمیزی برای تمایز باکتری‌های گرم مثبت و منفی استفاده می‌شود؟", options: ["گیمسا","فرول","گرم","زیل نیلسن"], correctIndex: 2, explanation: "رنگ‌آمیزی گرم بر اساس ساختار دیواره سلولی، باکتری‌ها را دسته‌بندی می‌کند.", difficulty: 1 },

      // 16-18: Biochemistry / Molecular
      { text: "کدام آمینواسید ضروری است و باید از طریق غذا دریافت شود؟", options: ["گلایسین","آلانین","لیزین","سیستئین"], correctIndex: 2, explanation: "لیزین یکی از آمینواسیدهای ضروری است که بدن نمی‌تواند بسازد.", difficulty: 2 },
      { text: "آنزیم DNA پلی‌مراز چه نوع فعالیتی دارد؟", options: ["پروتئاز","لیپاز","پلی‌مراز و اکزوئو۵'-نوکلئاز","اکسیدوردوکتاز"], correctIndex: 2, explanation: "DNA پلی‌مراز علاوه بر ساخت DNA، فعالیت proofreading نیز دارد.", difficulty: 3 },
      { text: "چرخه کربس در کدام بخش میتوکندری انجام می‌شود؟", options: ["غشای بیرونی","فضای بینابینی","غشای داخلی","ماتریکس"], correctIndex: 3, explanation: "چرخه کربس (سیکل تری‌کربوکسیلیک اسید) در ماتریکس میتوکندری رخ می‌دهد.", difficulty: 2 },

      // 19-20: Ecology & Evolution
      { text: "کدام مفهوم توصیف‌کننده رابطه دو گونه‌ای است که هر دو از آن سود می‌برند؟", options: ["پارازیتیسم",".commensalism"," mutualism (همیاری)","رقابت"], correctIndex: 2, explanation: "در همیاری (mutualism) هر دو گونه منتفع می‌شوند.", difficulty: 1 },
      { text: "کدام گونه‌ها بیشترین تنوع زیستی را در اقیانوس دارند؟", options: ["ماهی‌ها","مرجان‌ها","بی‌مهره‌ها (zooplankton)","پستانداران"], correctIndex: 2, explanation: "بی‌مهره‌ها بیشترین تنوع و فراوانی را در اقیانوس‌ها تشکیل می‌دهند.", difficulty: 1 },
    ];

    const questionIds = [];
    for (const q of qs) {
      const id = await ctx.db.insert("questions", {
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        topicId,
        difficulty: q.difficulty,
      });
      questionIds.push(id);
    }

    const accent = "teal";
    await ctx.db.insert("exams", {
      title: "آزمون تعیین سطح زیست‌شناسی",
      slug: "bio-diagnostic",
      description: "آزمون ۲۰ سوالی تعیین سطح در حوزه‌های سلولی، ژنتیک، میکروبیولوژی، بیوشیمی و بوم‌شناسی. مناسب دانشجویان ورودی رشته‌های علوم زیستی.",
      durationMinutes: 30,
      questionIds,
      free: true,
      published: true,
      featured: true,
      diagnostic: true,
      accent,
      order: 1,
    });

    return { ok: true, count: questionIds.length };
  },
});
