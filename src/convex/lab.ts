/**
 * Genova Virtual Lab — backend
 * ─────────────────────────────────────────────────────────────────────────────
 * The experiment catalog (steps, order, scoring) is a versioned constant inside
 * this module, i.e. the *server* owns the lab protocol. Only per-student state
 * is persisted:
 *
 *   labProgress → which experiment a student started, which steps passed, score
 *   labNotes    → the student's lab notebook entries
 *
 * Step checks are quiz questions attached to each protocol step. The backend
 * validates the chosen option before marking a step as done, so a student can
 * never "complete" a lab from the client side.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ── Catalog ─────────────────────────────────────────────────────────────────

export interface LabStep {
  title: string;
  detail: string;
  /** Optional knowledge check that must pass before the step is marked done. */
  check?: { question: string; options: string[]; correct: number };
}

export interface LabExperiment {
  slug: string;
  title: string;
  category: "microbiology" | "biotechnology" | "molecular" | "analytical";
  difficulty: 1 | 2 | 3;
  durationMin: number;
  summary: string;
  equipment: string[];
  steps: LabStep[];
}

export const LAB_CATALOG: LabExperiment[] = [
  {
    slug: "gram-stain",
    title: "رنگ‌آمیزی گرم و تشخیص باکتری",
    category: "microbiology",
    difficulty: 1,
    durationMin: 25,
    summary:
      "جداسازی باکتری‌های گرم‌مثبت و گرم‌منفی بر اساس ساختار دیواره سلولی و خواندن نتیجه زیر میکروسکوپ.",
    equipment: ["لام", "کریستال ویولت", "ید لوگول", "الکل ۹۵٪", "سافرانین", "میکروسکوپ"],
    steps: [
      {
        title: "۱. تهیه اسمیر و فیکس کردن",
        detail:
          "یک قطره از سوسپانسیون باکتری را روی لام پخش کن، هوا خشک کن و از شعله عبور بده تا سلول‌ها به لام بچسبند (بدون سوزاندن).",
        check: {
          question: "هدف اصلی مرحله فیکس کردن با حرارت چیست؟",
          options: [
            "کشتن و چسباندن سلول‌ها به لام",
            "افزایش نفوذپذیری کریستال ویولت",
            "حذف نیاز به رنگ‌بری",
          ],
          correct: 0,
        },
      },
      {
        title: "۲. رنگ‌آمیزی اولیه و ید",
        detail:
          "کریستال ویولت ۱ دقیقه → شست‌وشو → ید لوگول ۱ دقیقه (تشکیل کمپلکس رنگ–ید در سیتوپلاسم).",
        check: {
          question: "نقش ید لوگول در رنگ‌آمیزی گرم چیست؟",
          options: [
            "تثبیت کمپلکس رنگ در سیتوپلاسم سلول",
            "حل کردن غشای خارجی",
            "رنگ کردن اسپورها",
          ],
          correct: 0,
        },
      },
      {
        title: "۳. رنگ‌بری و رنگ ثانویه",
        detail:
          "الکل ۹۵٪ چند ثانیه (گرم‌منفی‌ها بی‌رنگ می‌شوند) → سافرانین ۱ دقیقه به‌عنوان رنگ ثانویه.",
        check: {
          question: "پس از رنگ‌بری با الکل، باکتری گرم‌مثبت چه رنگی دیده می‌شود؟",
          options: ["بنفش", "صورتی/قرمز", "بی‌رنگ"],
          correct: 0,
        },
      },
      {
        title: "۴. مشاهده و گزارش",
        detail:
          "زیر عدسی روغنی (۱۰۰×) شکل، آرایش و رنگ سلول‌ها را ثبت کن و نتیجه را در دفتر آزمایشگاه بنویس.",
        check: {
          question: "کوکسی‌های گرم‌منفی به‌صورت زنجیره‌ای چه نام دارند؟",
          options: ["استرپتوکوک", "استافیلوکوک", "باسیل"],
          correct: 0,
        },
      },
    ],
  },
  {
    slug: "serial-dilution-cfu",
    title: "رققت سریالی و شمارش CFU",
    category: "microbiology",
    difficulty: 2,
    durationMin: 30,
    summary:
      "ساخت سری رقت ۱۰ برابری، تلقیح به پلیت و محاسبه بار میکروبی نمونه بر حسب CFU/mL.",
    equipment: ["لوله رقت", "پیپت ۱ میلی‌لیتر", "محیط کشت", "پیپت پاستور", "انکوباتور"],
    steps: [
      {
        title: "۱. طراحی سری رقت",
        detail:
          "از نمونه اصلی سری رقت ۱۰⁻¹ تا ۱۰⁻⁷ بساز؛ در هر مرحله ۱ میلی‌لیتر به ۹ میلی‌لیتر رقت‌کننده.",
        check: {
          question: "برای تهیه رقت ۱۰⁻³ چند لوله رقت لازم است؟",
          options: ["۳ لوله", "۱ لوله", "۶ لوله"],
          correct: 0,
        },
      },
      {
        title: "۲. تلقیح و پلیت‌گذاری",
        detail:
          "از هر رقت ۱۰۰ میکرولیتر روی پلیت ببر (دست‌کم دو تکرار) و با میله شیشه‌ای پخش کن.",
        check: {
          question: "کدام رقت معمولاً برای شمارش قابل اعتماد انتخاب می‌شود؟",
          options: [
            "رقی که ۳۰ تا ۳۰۰ کلنی می‌دهد",
            "رقی که بیش از ۵۰۰ کلنی می‌دهد",
            "رقت اولیه بدون رقت",
          ],
          correct: 0,
        },
      },
      {
        title: "۳. شمارش و محاسبه",
        detail:
          "پس از انکوباسیون ۲۴ ساعته کلنی‌ها را بشمار و با فرمول CFU/mL = کلنی ÷ (رقت × حجم تلقیح) محاسبه کن.",
        check: {
          question:
            "۱۵۰ کلنی روی پلیت ۰٫۱ میلی‌لیتر از رقت ۱۰⁻⁵ شمارش شده است. بار میکروبی نمونه چقدر است؟",
          options: ["۱٫۵×۱۰⁸ CFU/mL", "۱٫۵×۱۰⁵ CFU/mL", "۱۵۰ CFU/mL"],
          correct: 0,
        },
      },
    ],
  },
  {
    slug: "streak-plate",
    title: "جداسازی کلنی خالص با کشت خطی",
    category: "microbiology",
    difficulty: 1,
    durationMin: 20,
    summary: "تکنیک کشت خطی چهار مرحله‌ای برای رسیدن به کلنی‌های خالص و یکنواخت.",
    equipment: ["پلیت آگار", "لوپ", "بن‌ماری", "هود بیولوژیک"],
    steps: [
      {
        title: "۱. آماده‌سازی در هود",
        detail:
          "کار را کنار شعله انجام بده، سطح میز را با الکل ۷۰٪ پاک کن و درپوش پلیت را کوتاه باز نگه دار.",
        check: {
          question: "چرا درپوش پلیت را کامل از هود بیرون نمی‌بریم؟",
          options: [
            "برای جلوگیری از آلودگی با اسپورهای هوا",
            "برای گرم نگه داشتن محیط",
            "برای جلوگیری از تبخیر آب",
          ],
          correct: 0,
        },
      },
      {
        title: "۲. کشت خطی چهار مرحله‌ای",
        detail:
          "هر بار ۹۰ درجه پلیت را بچرخان و لوپ را روی شعله قرمز استریل کن؛ از خطوط پرتراکم به کم‌تراکم پیش برو.",
        check: {
          question: "بین هر مرحله کشت خطی، لوپ باید…",
          options: ["استریل و خنک شود", "مرطوب شود", "عوض نشود"],
          correct: 0,
        },
      },
      {
        title: "۳. انکوباسیون و ارزیابی",
        detail: "پلیت را ۲۴ ساعت در ۳۷ درجه بگذار و از تراکم کلنی‌های منفرد نتیجه‌گیری کن.",
        check: {
          question: "کلنی خالص یعنی…",
          options: [
            "توده سلول‌های یک تبار واحد",
            "مخلوطی از چند باکتری",
            "کلنی‌های چسبیده به هم",
          ],
          correct: 0,
        },
      },
    ],
  },
  {
    slug: "growth-curve",
    title: "منحنی رشد باکتری",
    category: "microbiology",
    difficulty: 2,
    durationMin: 35,
    summary: "اندازه‌گیری جذب نوری، ترسیم منحنی رشد و تشخیص فازهای رشد باکتری.",
    equipment: ["اسپکتروفتومتر", "فلاسک کشت", "شیکر انکوباتور", "لوله کوارتز"],
    steps: [
      {
        title: "۱. تلقیح و شروع کشت",
        detail: "کشت شبانه را به محیط تازه با نسبت ۱:۱۰۰ اضافه کن و زمان صفر را ثبت کن.",
        check: {
          question: "در فاز تأخیری (lag) چه اتفاقی می‌افتد؟",
          options: [
            "سلول‌ها خود را برای تقسیم آماده می‌کنند",
            "سلول‌ها با سرعت ثابت تقسیم می‌شوند",
            "سلول‌ها می‌میرند",
          ],
          correct: 0,
        },
      },
      {
        title: "۲. نمونه‌گیری زمان‌بندی‌شده",
        detail: "هر ۳۰ دقیقه جذب نوری در طول موج ۶۰۰ نانومتر را در برابر بلانک بخوان.",
        check: {
          question: "چرا طول موج ۶۰۰ نانومتر انتخاب می‌شود؟",
          options: [
            "حداقل جذب محیط و حداکثر پراکندگی سلول",
            "حداکثر جذب DNA",
            "به‌دلیل جذب پروتئین‌ها",
          ],
          correct: 0,
        },
      },
      {
        title: "۳. ترسیم منحنی",
        detail: "log OD را بر حسب زمان رسم کن و شیب فاز نمایی (نرخ رشد) را به‌دست آور.",
        check: {
          question: "افزایش سریع و خطی log OD نشانه کدام فاز است؟",
          options: ["فاز نمایی", "فاز تأخیری", "فاز مرگ"],
          correct: 0,
        },
      },
    ],
  },
  {
    slug: "disk-diffusion",
    title: "آزمون حساسیت آنتی‌بیوتیکی (دیسک دیفیوژن)",
    category: "microbiology",
    difficulty: 2,
    durationMin: 30,
    summary: "کشت سطحی، قرار دادن دیسک آنتی‌بیوتیک و اندازه‌گیری هاله عدم رشد.",
    equipment: ["دیسک آنتی‌بیوتیک", "سوآب استریل", "کولیس", "پلیت مولر-هینتون"],
    steps: [
      {
        title: "۱. تلقیح سطحی یکنواخت",
        detail:
          "سوسپانسیون با کدورت استاندارد ۰٫۵ مک‌فارلند بساز و با سوآب در سه جهت روی پلیت پخش کن.",
        check: {
          question: "کدورت ۰٫۵ مک‌فارلند معادل تقریبی چند سلول در میلی‌لیتر است؟",
          options: ["۱٫۵×۱۰⁸", "۱٫۵×۱۰³", "۱٫۵×۱۰¹²"],
          correct: 0,
        },
      },
      {
        title: "۲. قرار دادن دیسک‌ها",
        detail:
          "پس از ۱۵ دقیقه، دیسک‌ها را با فاصله مناسب روی سطح بگذار و به آرامی فشار بده.",
        check: {
          question: "فاصله ناکافی دیسک‌ها چه مشکلی ایجاد می‌کند؟",
          options: [
            "همپوشانی هاله‌ها و خطای اندازه‌گیری",
            "رشد نکردن باکتری",
            "تبخیر آنتی‌بیوتیک",
          ],
          correct: 0,
        },
      },
      {
        title: "۳. اندازه‌گیری هاله و تفسیر",
        detail: "قطر هاله عدم رشد را با کولیس اندازه بگیر و با جدول استاندارد مقایسه کن.",
        check: {
          question: "هاله بزرگ‌تر نشانه چیست؟",
          options: [
            "حساسیت بیشتر باکتری به آن آنتی‌بیوتیک",
            "مقاومت بیشتر باکتری",
            "غلظت کمتر آنتی‌بیوتیک",
          ],
          correct: 0,
        },
      },
    ],
  },
  {
    slug: "pcr-amplification",
    title: "واکنش زنجیره‌ای پلیمراز (PCR)",
    category: "molecular",
    difficulty: 3,
    durationMin: 40,
    summary: "طراحی واکنش، تنظیم چرخه‌های حرارتی و تحلیل محصول PCR.",
    equipment: ["ترموسایکلر", "میکروتیوب ۰٫۲", "مخلوط واکنش", "پیپت ۱۰ میکرولیتر"],
    steps: [
      {
        title: "۱. آماده‌سازی مخلوط واکنش",
        detail:
          "برای n واکنش، مستر‌میکس بساز: بافر، dNTP، MgCl₂، پرایمر رفت/برگشت، Taq و آب بدون نوکلئاز.",
        check: {
          question: "چرا پرایمر رفت و برگشت لازم است؟",
          options: [
            "برای تعیین مرزهای دو رشته و همانندسازی هر دو جهت",
            "برای افزایش دمای ذوب",
            "برای فعال کردن Taq",
          ],
          correct: 0,
        },
      },
      {
        title: "۲. برنامه چرخه‌های حرارتی",
        detail:
          "واسرشت ۹۵ درجه → ۳۰ چرخه شامل واسرشت، اتصال پرایمر و گسترش در ۷۲ درجه → گسترش نهایی.",
        check: {
          question: "دمای مرحله اتصال پرایمر (annealing) به چه چیزی بستگی دارد؟",
          options: [
            "دمای ذوب پرایمرها (Tm)",
            "حجم مخلوط واکنش",
            "نوع بافر پلیمراز",
          ],
          correct: 0,
        },
      },
      {
        title: "۳. بررسی محصول",
        detail: "۵ میکرولیتر محصول را روی ژل آگارز برو و باند را با لدر مقایسه کن.",
        check: {
          question: "اگر باند اضافی (non-specific) ببینی، منطقی‌ترین اصلاح چیست؟",
          options: [
            "افزایش دمای annealing",
            "کاهش دمای annealing",
            "افزایش تعداد چرخه‌ها",
          ],
          correct: 0,
        },
      },
    ],
  },
  {
    slug: "gel-electrophoresis",
    title: "الکتروفورز ژل آگارز",
    category: "molecular",
    difficulty: 2,
    durationMin: 30,
    summary: "جداسازی قطعات DNA بر اساس اندازه و تفسیر باندها در برابر لدر.",
    equipment: ["دستگاه الکتروفورز", "ژل آگارز ۱٪", "لدر ۱۰۰-bp", "منبع تغذیه"],
    steps: [
      {
        title: "۱. آماده‌سازی ژل و تانک",
        detail:
          "ژل آگارز ۱٪ با EtBr/رنگ ایمن بریز، شانه بگذار و پس از بستن تانک، بافر را تا پوشش ژل بریز.",
        check: {
          question: "DNA در pH فیزیولوژیک چه باری دارد؟",
          options: ["منفی (به سمت آند حرکت می‌کند)", "مثبت", "خنثی"],
          correct: 0,
        },
      },
      {
        title: "۲. بارگذاری و اجرای ژل",
        detail:
          "نمونه‌ها را با بافر بارگذاری مخلوط کن، در چاهک‌ها بارگذاری کن و ولتاژ را وصل کن.",
        check: {
          question: "قطعه با وزن مولکولی بیشتر…",
          options: [
            "کندتر و نزدیک‌تر به چاهک می‌ماند",
            "سریع‌تر حرکت می‌کند",
            "از ژل خارج می‌شود",
          ],
          correct: 0,
        },
      },
      {
        title: "۳. تفسیر نتیجه",
        detail: "باندها را زیر UV ببین و اندازه تقریبی محصول را با لدر تخمین بزن.",
        check: {
          question: "نمونه در چاهک اول، لدر در چاهک دوم و باند در چاهک سوم دیده می‌شود. یعنی…",
          options: [
            "محصول PCR تشکیل شده است",
            "واکنش شکست خورده است",
            "لدر تخریب شده است",
          ],
          correct: 0,
        },
      },
    ],
  },
  {
    slug: "bacterial-transformation",
    title: "ترانسفورماسیون باکتری و کلون‌سازی",
    category: "biotechnology",
    difficulty: 3,
    durationMin: 45,
    summary: "ساخت سلول‌های مستعد، ترانسفورماسیون با پلاسمید و انتخاب کلنی‌های نوترکیب.",
    equipment: ["CaCl₂", "پلاسمید", "بن‌ماری ۴۲ درجه", "آنت‌بیوتیک انتخابی", "شیکر"],
    steps: [
      {
        title: "۱. ساخت سلول مستعد",
        detail: "سلول‌های در فاز نمایی را با CaCl₂ سرد تیمار کن تا دیواره برای ورود DNA نفوذپذیر شود.",
        check: {
          question: "نقش یون کلسیم در ترانسفورماسیون چیست؟",
          options: [
            "افزایش نفوذپذیری غشا برای DNA",
            "تخریب پلاسمید",
            "رنگ کردن سلول‌ها",
          ],
          correct: 0,
        },
      },
      {
        title: "۲. شوک حرارتی",
        detail: "مخلوط سلول و پلاسمید را ۹۰ ثانیه در ۴۲ درجه بگذار و سریع روی یخ برگردان.",
        check: {
          question: "پس از شوک حرارتی بلافاصله چه باید کرد؟",
          options: [
            "انتقال به یخ و سپس افزودن محیط تازه",
            "افزودن آنتی‌بیوتیک",
            "قرار دادن در فریزر",
          ],
          correct: 0,
        },
      },
      {
        title: "۳. بازیابی و انتخاب",
        detail:
          "یک ساعت در محیط مایع بدون آنتی‌بیوتیک بازیابی کن، سپس روی پلیت دارای آنتی‌بیوتیک بکش.",
        check: {
          question: "چرا مرحله بازیابی بدون آنتی‌بیوتیک انجام می‌شود؟",
          options: [
            "تا سلول‌ها ژن مقاومت را بیان کنند",
            "تا پلاسمید حذف شود",
            "تا کلنی‌ها بزرگ‌تر شوند",
          ],
          correct: 0,
        },
      },
    ],
  },
  {
    slug: "protein-assay",
    title: "سنجش پروتئین به روش Bradford",
    category: "analytical",
    difficulty: 2,
    durationMin: 30,
    summary: "ترسیم منحنی استاندارد و تعیین غلظت پروتئین نمونه ناشناخته.",
    equipment: ["معرف Bradford", "پلیت ۹۶ خانه", "الیزا ریدر", "استاندارد BSA"],
    steps: [
      {
        title: "۱. منحنی استاندارد",
        detail: "از استاندارد BSA سری غلظت ۰ تا ۱ میلی‌گرم بر میلی‌لیتر بساز و معرف اضافه کن.",
        check: {
          question: "چرا ابتدا منحنی استاندارد رسم می‌شود؟",
          options: [
            "برای تبدیل جذب نوری به غلظت",
            "برای اندازه‌گیری pH",
            "برای کالیبره کردن دمای انکوباتور",
          ],
          correct: 0,
        },
      },
      {
        title: "۲. خواندن جذب نوری",
        detail: "پس از ۵ دقیقه انکوباسیون در تاریکی، جذب را در ۵۹۵ نانومتر بخوان.",
        check: {
          question: "کمپلکس Bradford در طیف مرئی چه رنگی است؟",
          options: ["آبی", "سبز", "بی‌رنگ"],
          correct: 0,
        },
      },
      {
        title: "۳. محاسبه غلظت نمونه",
        detail: "با معادله خط منحنی استاندارد، غلظت نمونه را حساب کن و خطای محاسبه را گزارش بده.",
        check: {
          question: "اگر جذب نمونه بالاتر از بالاترین نقطه استاندارد باشد، چه می‌کنیم؟",
          options: [
            "نمونه را رقت می‌دهیم و دوباره می‌خوانیم",
            "معادله را تغییر می‌دهیم",
            "از دستگاه دیگری استفاده می‌کنیم",
          ],
          correct: 0,
        },
      },
    ],
  },
];

const STEP_POINTS = 10;
const COMPLETION_BONUS = 25;

function findExperiment(slug: string) {
  return LAB_CATALOG.find((experiment) => experiment.slug === slug) ?? null;
}

// ── Queries ─────────────────────────────────────────────────────────────────

/** The lab protocol catalog (public — no student data). */
export const listExperiments = query({
  args: {},
  handler: async () => {
    return LAB_CATALOG.map((experiment) => ({
      slug: experiment.slug,
      title: experiment.title,
      category: experiment.category,
      difficulty: experiment.difficulty,
      durationMin: experiment.durationMin,
      summary: experiment.summary,
      equipment: experiment.equipment,
      stepCount: experiment.steps.length,
      totalPoints: experiment.steps.length * STEP_POINTS + COMPLETION_BONUS,
      // Note: the correct option is intentionally NOT sent to the client — the
      // server grades every step in `recordStep`.
      steps: experiment.steps.map((step) => ({
        title: step.title,
        detail: step.detail,
        check: step.check
          ? { question: step.check.question, options: step.check.options }
          : undefined,
      })),
    }));
  },
});

/** Progress rows for the signed-in student. */
export const listMyProgress = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("labProgress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

/** Aggregated lab stats (points, completed experiments, notebook size). */
export const myLabSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const [progress, notes] = await Promise.all([
      ctx.db
        .query("labProgress")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("labNotes")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
    ]);
    return {
      points: progress.reduce((acc, row) => acc + (row.score ?? 0), 0),
      completed: progress.filter((row) => row.status === "completed").length,
      inProgress: progress.filter((row) => row.status === "in_progress").length,
      notes: notes.length,
      catalogSize: LAB_CATALOG.length,
    };
  },
});

/** Lab notebook entries of the signed-in student. */
export const myNotes = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("labNotes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

/** Mark the experiment as started (idempotent). */
export const startExperiment = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای شروع آزمایش ابتدا وارد حساب شوید.");
    const experiment = findExperiment(args.slug);
    if (!experiment) throw new Error("آزمایش یافت نشد.");

    const existing = await ctx.db
      .query("labProgress")
      .withIndex("by_user_experiment", (q) =>
        q.eq("userId", user._id).eq("experimentSlug", args.slug),
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("labProgress", {
      userId: user._id,
      experimentSlug: args.slug,
      status: "in_progress",
      stepsDone: [],
      startedAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Submit a step. The server checks the answer, so a step can only be completed
 * with a correct choice — and only in order.
 */
export const recordStep = mutation({
  args: {
    slug: v.string(),
    stepIndex: v.number(),
    /** Chosen option for the step's knowledge check (if it has one). */
    choice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ثبت مرحله ابتدا وارد حساب شوید.");

    const experiment = findExperiment(args.slug);
    if (!experiment) throw new Error("آزمایش یافت نشد.");

    const step = experiment.steps[args.stepIndex];
    if (!step) throw new Error("مرحله نامعتبر است.");

    const row = await ctx.db
      .query("labProgress")
      .withIndex("by_user_experiment", (q) =>
        q.eq("userId", user._id).eq("experimentSlug", args.slug),
      )
      .first();
    if (!row) throw new Error("ابتدا آزمایش را شروع کنید.");
    if (row.stepsDone.includes(args.stepIndex)) {
      return { ok: true, alreadyDone: true, correct: true, expected: null };
    }

    // Order enforcement: only the next pending step can be submitted.
    const nextIndex = row.stepsDone.length;
    if (args.stepIndex !== nextIndex) {
      throw new Error("مراحل باید به‌ترتیب انجام شوند.");
    }

    if (step.check) {
      if (args.choice === undefined) {
        throw new Error("پاسخ این مرحله لازم است.");
      }
      if (args.choice !== step.check.correct) {
        return { ok: false, correct: false, expected: step.check.correct, alreadyDone: false };
      }
    }

    const stepsDone = [...row.stepsDone, args.stepIndex];
    const finished = stepsDone.length === experiment.steps.length;
    const earned = STEP_POINTS + (finished ? COMPLETION_BONUS : 0);

    await ctx.db.patch(row._id, {
      stepsDone,
      score: (row.score ?? 0) + earned,
      status: finished ? "completed" : "in_progress",
      completedAt: finished ? Date.now() : undefined,
      updatedAt: Date.now(),
    });

    return {
      ok: true,
      correct: true,
      expected: step.check?.correct ?? null,
      earned,
      finished,
      stepsDone: stepsDone.length,
    };
  },
});

/** Reset an experiment (keeps the notebook untouched). */
export const resetExperiment = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const row = await ctx.db
      .query("labProgress")
      .withIndex("by_user_experiment", (q) =>
        q.eq("userId", user._id).eq("experimentSlug", args.slug),
      )
      .first();
    if (!row) return { ok: true };
    await ctx.db.delete(row._id);
    return { ok: true };
  },
});

/** Add a lab notebook entry. */
export const addNote = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    tags: v.optional(v.array(v.string())),
    experimentSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ثبت یادداشت ابتدا وارد حساب شوید.");
    if (args.title.trim().length < 2) throw new Error("عنوان یادداشت لازم است.");
    if (args.body.trim().length < 2) throw new Error("متن یادداشت لازم است.");
    const now = Date.now();
    return await ctx.db.insert("labNotes", {
      userId: user._id,
      experimentSlug: args.experimentSlug,
      title: args.title.trim().slice(0, 160),
      body: args.body.trim().slice(0, 4000),
      tags: (args.tags ?? []).map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Delete one of my notebook entries. */
export const deleteNote = mutation({
  args: { id: v.id("labNotes") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const note = await ctx.db.get(args.id);
    if (!note) return { ok: true };
    if (note.userId !== user._id) throw new Error("دسترسی غیرمجاز.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});
