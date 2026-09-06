// ── Page Registry ────────────────────────────────────────────────────────
// Central registry that maps real site routes to their editable sections.
// Used by Site Studio (editor) AND by real pages (to read published config).
// Each page declares which sections are editable and what props they expose.

import type { FieldDef } from "./blocks";

// ── Section definition ──────────────────────────────────────────────────
export type SectionDef = {
  id: string;           // stable key: "hero", "categories", "advantages" …
  label: string;        // Persian display name in Studio
  editable: boolean;    // whether this section has editable props
  fields: FieldDef[];   // what props can be edited
  order: number;        // default display order
  removable: boolean;   // can be hidden/removed
};

// ── Page definition ─────────────────────────────────────────────────────
export type PageDef = {
  key: string;          // matches studioPages.key AND route params
  title: string;        // Persian page title
  route: string;        // real site route path
  description: string;  // short description for Studio list
  sections: SectionDef[];
};

// ── Default values per section ──────────────────────────────────────────
// These are the hardcoded values in the React components.
// When no config is published, the site falls back to these.
export const SECTION_DEFAULTS: Record<string, Record<string, unknown>> = {
  hero: {
    badge: "Genova · internal v0.1 · life-sciences stack",
    title: "یادگیری عمیق علوم زیستی،",
    titleGradient: "از ترم اول تا امتحان و فراتر از آن",
    subtitle: "Genova اکوسیستم آموزشی تیم ما برای دانشجویان میکروبیولوژی، بیوتکنولوژی و علوم زیستی است: دوره، جزوه، فلش‌کارت، آزمون تعیین سطح، کوئیز روزانه و همراهی واقعی — نه فقط فروش کلاس.",
    buttonText: "مشاهده دوره‌ها",
    buttonLink: "/courses",
    secondaryButtonText: "آزمون تعیین سطح رایگان",
    secondaryButtonLink: "/tests",
    tertiaryButtonText: "کوئیز روزانه",
    tertiaryButtonLink: "/daily-quiz",
    stat1Number: "+۴ هزار",
    stat1Label: "دانشجوی همراه",
    stat2Number: "+۸ دوره",
    stat2Label: "تخصصی علوم زیستی",
    stat3Number: "+۴۰ تست",
    stat3Label: "بانک سؤال استاندارد",
    _visible: true,
  },
  ecosystem: {
    kicker: "اکوسیستم یادگیری",
    title: "مسیری که دانشجو را همراهی می‌کند",
    description: "از محتوای رایگان و آزمون تعیین سطح شروع می‌کنی؛ نقاط ضعف مشخص می‌شود، مسیر پیشنهاد می‌شود و هر قدم پیشرفت تو قابل اندازه‌گیری است.",
    _visible: true,
  },
  categories: {
    kicker: "دسته‌بندی آموزشی",
    title: "هر حوزه‌ای از علوم زیستی، یک مسیر دارد",
    _visible: true,
  },
  popularCourses: {
    kicker: "دوره‌های محبوب",
    title: "دوره‌هایی که دانشجوها به آن‌ها اعتماد کرده‌اند",
    _visible: true,
  },
  diagnosticTest: {
    badge: "رایگان · بدون نیاز به ثبت‌نام دوره",
    title: "نمی‌دانی از کجا شروع کنی؟ از آزمون تعیین سطح شروع کن.",
    description: "ده سؤال از مباحث اصلی علوم زیستی. نتیجه به‌صورت درصد و تحلیل موضوعی (میکروب‌شناسی، ژنتیک، بیوشیمی و...) نشانت داده می‌شود تا دقیقاً بدانی روی چه مباحثی تمرکز کنی.",
    buttonText: "شروع آزمون رایگان",
    buttonLink: "/tests",
    _visible: true,
  },
  dailyQuiz: {
    kicker: "کوئیز روزانه",
    title: "هر روز، یک تست با توضیح کامل",
    description: "یک عادت مطالعاتی کوچک که تفاوت بزرگی می‌سازد. هر روز یک سؤال جدید، پاسخ تشریحی و امتیاز.",
    _visible: true,
  },
  instructors: {
    kicker: "مدرس‌ها و تیم",
    title: "تیمی از جنس خود دانشجوها",
    description: "چهار دانشجوی میکروبیولوژی و یک دانشجوی بیوتکنولوژی + مدرسان مهمان متخصص — همه با تجربهٔ مستقیم از مسیری که شما طی می‌کنید.",
    _visible: true,
  },
  products: {
    kicker: "محصولات آموزشی فیزیکی",
    title: "یادگیری که از صفحهٔ نمایش بیرون می‌آید",
    description: "فلش‌کارت‌ها، کتابچه‌های جمع‌بندی و پوسترهای آموزشی برای مرور فعال و شب امتحان.",
    _visible: true,
  },
  freeContent: {
    kicker: "محتوای رایگان",
    title: "آموزشی که قبل از خرید می‌توانی امتحانش کنی",
    description: "یادداشت‌های علمی، روش‌های مطالعه، نکات امتحانی، گفت‌وگوها و گزارش نشست‌ها — رایگان برای همه.",
    _visible: true,
  },
  advantages: {
    kicker: "چرا Genova؟",
    title: "نه فقط ویدیو؛ یک سیستم یادگیری کامل",
    _visible: true,
  },
  testimonials: {
    kicker: "نظر دانشجوها",
    title: "تجربه‌هایی که واقعاً اتفاق افتاده",
    _visible: true,
  },
  cta: {
    title: "عضویت رایگان است؛ یادگیری جدی شروع می‌شود",
    description: "با حساب رایگانت به کوئیز روزانه، آزمون تعیین سطح، محتوای رایگان و پروفایل یادگیری شخصی دسترسی پیدا می‌کنی. دوره‌ها و آزمون‌های پیشرفته، وقتی آماده‌ای خریداری می‌شوند.",
    buttonText: "عضویت رایگان",
    buttonLink: "/auth?returnTo=%2Fdashboard",
    secondaryButtonText: "اول محتوای رایگان",
    secondaryButtonLink: "/free-content",
    _visible: true,
  },
  // ── Rules page sections ────────────────────────────────────────────────
  rulesUsage: {
    title: "قوانین استفاده",
    item1: "محتوای پولی (دوره‌ها، جزوه‌ها و بانک سؤال) فقط با حساب کاربری خریداری‌شده قابل دسترسی است و اشتراک‌گذاری آن با دیگران مجاز نیست.",
    item2: "تیم زیست‌آکادمی متعهد به دقت علمی محتواست، اما محتوای آموزشی جایگزین نظر پزشک یا متخصص بالینی نیست.",
    item3: "هیچ ادعای غیرقابل اثباتی دربارهٔ نتایج آموزشی مطرح نمی‌کنیم؛ نتایج به تلاش و شرایط هر دانشجو بستگی دارد.",
    item4: "استفاده از نام و محتوای پلتفرم بدون اجازهٔ کتبی مجاز نیست.",
    _visible: true,
  },
  rulesPrivacy: {
    title: "حریم خصوصی",
    item1: "اطلاعات حساب شما (ایمیل و مشخصات) فقط برای ارائهٔ خدمات، پیگیری سفارش‌ها و اطلاع‌رسانی استفاده می‌شود.",
    item2: "نتایج آزمون‌ها برای ساخت پروفایل یادگیری شخصی شما ذخیره می‌شود و بدون رضایت شما در اختیار شخص ثالث قرار نمی‌گیرد.",
    item3: "رمز عبور شما به‌صورت هش‌شده نگهداری می‌شود و دسترسی به داده‌های آموزشی فقط با احراز هویت ممکن است.",
    item4: "می‌توانید هر زمان درخواست حذف حساب و داده‌های خود را ارسال کنید.",
    _visible: true,
  },
  rulesRefund: {
    title: "بازگشت وجه",
    item1: "تا ۷ روز پس از خرید دوره، اگر کمتر از ۲۰٪ محتوا مشاهده شده باشد، مبلغ به‌طور کامل بازگردانده می‌شود.",
    item2: "محصولات فیزیکی تا زمانی که مرسوله باز نشده باشد قابل بازگشت‌اند؛ هزینهٔ ارسال بازگشت با خریدار است.",
    item3: "کارگاه‌های زنده تا ۲۴ ساعت قبل از شروع، قابل انصراف با بازگشت کامل وجه هستند.",
    item4: "برای پیگیری بازگشت وجه از بخش پشتیبانی پنل دانشجویی تیکت ثبت کنید.",
    _visible: true,
  },
  rulesContact: {
    title: "تماس با ما",
    item1: "پشتیبانی و پاسخ‌گویی: شنبه تا پنجشنبه، ۹ تا ۱۸",
    item2: "ایمیل: hello@genova.team",
    item3: "تلگرام: @genova_team",
    item4: "پاسخ‌گویی سریع‌تر از طریق تیکت داخل پنل دانشجویی انجام می‌شود.",
    _visible: true,
  },
};

// ── Pages registry ──────────────────────────────────────────────────────
// Only pages with editable content are listed here.
// Pages without editable content still appear in the Studio page list
// (via bootstrapPages) but have no sections to edit.
export const PAGE_REGISTRY: PageDef[] = [
  {
    key: "home",
    title: "صفحهٔ اصلی",
    route: "/",
    description: "هیرو، ویژگی‌ها، دوره‌ها، کارگاه‌ها و بخش‌های صفحه اصلی",
    sections: [
      {
        id: "hero", label: "هیرو (Hero)", editable: true, order: 1, removable: true,
        fields: [
          { key: "badge", label: "متن Badge", type: "text", perm: "content" },
          { key: "title", label: "عنوان اصلی", type: "text", perm: "content" },
          { key: "titleGradient", label: "عنوان گرادیانت", type: "text", perm: "content" },
          { key: "subtitle", label: "توضیحات", type: "textarea", perm: "content" },
          { key: "buttonText", label: "متن دکمه اصلی", type: "text", perm: "content" },
          { key: "buttonLink", label: "لینک دکمه اصلی", type: "link", perm: "links" },
          { key: "secondaryButtonText", label: "متن دکمه دوم", type: "text", perm: "content" },
          { key: "secondaryButtonLink", label: "لینک دکمه دوم", type: "link", perm: "links" },
          { key: "stat1Number", label: "آمار ۱ عدد", type: "text", perm: "content" },
          { key: "stat1Label", label: "آمار ۱ برچسب", type: "text", perm: "content" },
          { key: "stat2Number", label: "آمار ۲ عدد", type: "text", perm: "content" },
          { key: "stat2Label", label: "آمار ۲ برچسب", type: "text", perm: "content" },
          { key: "stat3Number", label: "آمار ۳ عدد", type: "text", perm: "content" },
          { key: "stat3Label", label: "آمار ۳ برچسب", type: "text", perm: "content" },
        ],
      },
      {
        id: "ecosystem", label: "اکوسیستم یادگیری", editable: true, order: 2, removable: true,
        fields: [
          { key: "kicker", label: "Kicker", type: "text", perm: "content" },
          { key: "title", label: "عنوان", type: "text", perm: "content" },
          { key: "description", label: "توضیحات", type: "textarea", perm: "content" },
        ],
      },
      {
        id: "categories", label: "دسته‌بندی‌ها", editable: true, order: 3, removable: true,
        fields: [
          { key: "kicker", label: "Kicker", type: "text", perm: "content" },
          { key: "title", label: "عنوان", type: "text", perm: "content" },
        ],
      },
      {
        id: "popularCourses", label: "دوره‌های محبوب", editable: true, order: 4, removable: true,
        fields: [
          { key: "kicker", label: "Kicker", type: "text", perm: "content" },
          { key: "title", label: "عنوان", type: "text", perm: "content" },
        ],
      },
      {
        id: "diagnosticTest", label: "آزمون تعیین سطح", editable: true, order: 5, removable: true,
        fields: [
          { key: "badge", label: "متن Badge", type: "text", perm: "content" },
          { key: "title", label: "عنوان", type: "text", perm: "content" },
          { key: "description", label: "توضیحات", type: "textarea", perm: "content" },
          { key: "buttonText", label: "متن دکمه", type: "text", perm: "content" },
          { key: "buttonLink", label: "لینک دکمه", type: "link", perm: "links" },
        ],
      },
      {
        id: "dailyQuiz", label: "کوئیز روزانه", editable: true, order: 6, removable: true,
        fields: [
          { key: "kicker", label: "Kicker", type: "text", perm: "content" },
          { key: "title", label: "عنوان", type: "text", perm: "content" },
          { key: "description", label: "توضیحات", type: "textarea", perm: "content" },
        ],
      },
      {
        id: "instructors", label: "مدرس‌ها", editable: true, order: 7, removable: true,
        fields: [
          { key: "kicker", label: "Kicker", type: "text", perm: "content" },
          { key: "title", label: "عنوان", type: "text", perm: "content" },
          { key: "description", label: "توضیحات", type: "textarea", perm: "content" },
        ],
      },
      {
        id: "products", label: "محصولات", editable: true, order: 8, removable: true,
        fields: [
          { key: "kicker", label: "Kicker", type: "text", perm: "content" },
          { key: "title", label: "عنوان", type: "text", perm: "content" },
          { key: "description", label: "توضیحات", type: "textarea", perm: "content" },
        ],
      },
      {
        id: "freeContent", label: "محتوای رایگان", editable: true, order: 9, removable: true,
        fields: [
          { key: "kicker", label: "Kicker", type: "text", perm: "content" },
          { key: "title", label: "عنوان", type: "text", perm: "content" },
          { key: "description", label: "توضیحات", type: "textarea", perm: "content" },
        ],
      },
      {
        id: "advantages", label: "مزایا", editable: true, order: 10, removable: true,
        fields: [
          { key: "kicker", label: "Kicker", type: "text", perm: "content" },
          { key: "title", label: "عنوان", type: "text", perm: "content" },
        ],
      },
      {
        id: "testimonials", label: "نظرات دانشجوها", editable: true, order: 11, removable: true,
        fields: [
          { key: "kicker", label: "Kicker", type: "text", perm: "content" },
          { key: "title", label: "عنوان", type: "text", perm: "content" },
        ],
      },
      {
        id: "cta", label: "عضویت (CTA)", editable: true, order: 12, removable: true,
        fields: [
          { key: "title", label: "عنوان", type: "text", perm: "content" },
          { key: "description", label: "توضیحات", type: "textarea", perm: "content" },
          { key: "buttonText", label: "متن دکمه اصلی", type: "text", perm: "content" },
          { key: "buttonLink", label: "لینک دکمه اصلی", type: "link", perm: "links" },
          { key: "secondaryButtonText", label: "متن دکمه دوم", type: "text", perm: "content" },
          { key: "secondaryButtonLink", label: "لینک دکمه دوم", type: "link", perm: "links" },
        ],
      },
    ],
  },
  {
    key: "about",
    title: "درباره ما",
    route: "/about",
    description: "درباره تیم Genova و ماموریت",
    sections: [],
  },
  {
    key: "courses",
    title: "دوره‌ها",
    route: "/courses",
    description: "لیست دوره‌های آموزشی و فیلترها",
    sections: [],
  },
  {
    key: "workshops",
    title: "کارگاه‌ها",
    route: "/workshops",
    description: "کارگاه‌ها و نشست‌ها",
    sections: [],
  },
  {
    key: "tests",
    title: "آزمون‌ها",
    route: "/tests",
    description: "آزمون‌های تعیین سطح و ارزیابی",
    sections: [],
  },
  {
    key: "dictionary",
    title: "دیکشنری",
    route: "/dictionary",
    description: "دیکشنری تخصصی علوم زیستی",
    sections: [],
  },
  {
    key: "instructors",
    title: "مدرس‌ها",
    route: "/instructors",
    description: "تیم مدرسان و اساتید",
    sections: [],
  },
  {
    key: "products",
    title: "محصولات",
    route: "/products",
    description: "محصولات آموزشی فیزیکی",
    sections: [],
  },
  {
    key: "marketplace",
    title: "بازارچه",
    route: "/marketplace",
    description: "بازارچه محصولات دانشجویی",
    sections: [],
  },
  {
    key: "rules",
    title: "قوانین",
    route: "/rules",
    description: "قوانین، حریم خصوصی و بازگشت وجه",
    sections: [
      { id: "rulesUsage", label: "قوانین استفاده", editable: true, order: 1, removable: false, fields: [
        { key: "title", label: "عنوان بخش", type: "text", perm: "content" },
        { key: "item1", label: "بند ۱", type: "textarea", perm: "content" },
        { key: "item2", label: "بند ۲", type: "textarea", perm: "content" },
        { key: "item3", label: "بند ۳", type: "textarea", perm: "content" },
        { key: "item4", label: "بند ۴", type: "textarea", perm: "content" },
      ]},
      { id: "rulesPrivacy", label: "حریم خصوصی", editable: true, order: 2, removable: false, fields: [
        { key: "title", label: "عنوان بخش", type: "text", perm: "content" },
        { key: "item1", label: "بند ۱", type: "textarea", perm: "content" },
        { key: "item2", label: "بند ۲", type: "textarea", perm: "content" },
        { key: "item3", label: "بند ۳", type: "textarea", perm: "content" },
        { key: "item4", label: "بند ۴", type: "textarea", perm: "content" },
      ]},
      { id: "rulesRefund", label: "بازگشت وجه", editable: true, order: 3, removable: false, fields: [
        { key: "title", label: "عنوان بخش", type: "text", perm: "content" },
        { key: "item1", label: "بند ۱", type: "textarea", perm: "content" },
        { key: "item2", label: "بند ۲", type: "textarea", perm: "content" },
        { key: "item3", label: "بند ۳", type: "textarea", perm: "content" },
        { key: "item4", label: "بند ۴", type: "textarea", perm: "content" },
      ]},
      { id: "rulesContact", label: "تماس با ما", editable: true, order: 4, removable: false, fields: [
        { key: "title", label: "عنوان بخش", type: "text", perm: "content" },
        { key: "item1", label: "بند ۱", type: "textarea", perm: "content" },
        { key: "item2", label: "بند ۲", type: "textarea", perm: "content" },
        { key: "item3", label: "بند ۳", type: "textarea", perm: "content" },
        { key: "item4", label: "بند ۴", type: "textarea", perm: "content" },
      ]},
    ],
  },
  {
    key: "free-content",
    title: "محتوای رایگان",
    route: "/free-content",
    description: "مقاله‌ها و محتوای رایگان",
    sections: [],
  },
  {
    key: "header",
    title: "هدر و منو",
    route: "(header)",
    description: "لوگو، منوی اصلی و بنر بالای سایت",
    sections: [],
  },
  {
    key: "footer",
    title: "فوتر",
    route: "(footer)",
    description: "لینک‌ها، اطلاعات تماس و متن فوتر",
    sections: [],
  },
];

// ── Helper: get page def by key ─────────────────────────────────────────
export function getPageDef(key: string): PageDef | undefined {
  return PAGE_REGISTRY.find((p) => p.key === key);
}

// ── Helper: get merged section props (config overrides + defaults) ──────
export function mergeSectionProps(
  sectionId: string,
  publishedSections: Record<string, Record<string, unknown>> | null | undefined,
): Record<string, unknown> {
  const defaults = SECTION_DEFAULTS[sectionId] ?? {};
  const overrides = publishedSections?.[sectionId] ?? {};
  // _visible defaults to true if not set
  return { ...defaults, ...overrides, _visible: overrides._visible !== false };
}
