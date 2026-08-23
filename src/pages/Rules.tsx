import { PublicLayout } from "@/components/site/PublicLayout";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router";

const SECTIONS = [
  {
    title: "قوانین استفاده",
    items: [
      "محتوای پولی (دوره‌ها، جزوه‌ها و بانک سؤال) فقط با حساب کاربری خریداری‌شده قابل دسترسی است و اشتراک‌گذاری آن با دیگران مجاز نیست.",
      "تیم زیست‌آکادمی متعهد به دقت علمی محتواست، اما محتوای آموزشی جایگزین نظر پزشک یا متخصص بالینی نیست.",
      "هیچ ادعای غیرقابل اثباتی دربارهٔ نتایج آموزشی مطرح نمی‌کنیم؛ نتایج به تلاش و شرایط هر دانشجو بستگی دارد.",
      "استفاده از نام و محتوای پلتفرم بدون اجازهٔ کتبی مجاز نیست.",
    ],
  },
  {
    title: "حریم خصوصی",
    items: [
      "اطلاعات حساب شما (ایمیل و مشخصات) فقط برای ارائهٔ خدمات، پیگیری سفارش‌ها و اطلاع‌رسانی استفاده می‌شود.",
      "نتایج آزمون‌ها برای ساخت پروفایل یادگیری شخصی شما ذخیره می‌شود و بدون رضایت شما در اختیار شخص ثالث قرار نمی‌گیرد.",
      "رمز عبور شما به‌صورت هش‌شده نگهداری می‌شود و دسترسی به داده‌های آموزشی فقط با احراز هویت ممکن است.",
      "می‌توانید هر زمان درخواست حذف حساب و داده‌های خود را ارسال کنید.",
    ],
  },
  {
    title: "بازگشت وجه",
    items: [
      "تا ۷ روز پس از خرید دوره، اگر کمتر از ۲۰٪ محتوا مشاهده شده باشد، مبلغ به‌طور کامل بازگردانده می‌شود.",
      "محصولات فیزیکی تا زمانی که مرسوله باز نشده باشد قابل بازگشت‌اند؛ هزینهٔ ارسال بازگشت با خریدار است.",
      "کارگاه‌های زنده تا ۲۴ ساعت قبل از شروع، قابل انصراف با بازگشت کامل وجه هستند.",
      "برای پیگیری بازگشت وجه از بخش پشتیبانی پنل دانشجویی تیکت ثبت کنید.",
    ],
  },
  {
    title: "تماس با ما",
    items: [
      "پشتیبانی و پاسخ‌گویی: شنبه تا پنجشنبه، ۹ تا ۱۸",
      "ایمیل: hello@genova.team",
      "تلگرام: @genova_team",
      "پاسخ‌گویی سریع‌تر از طریق تیکت داخل پنل دانشجویی انجام می‌شود.",
    ],
  },
];

export default function Rules() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">خانه</Link>
          <ChevronLeft className="size-3.5" />
          <span className="text-foreground">قوانین و حریم خصوصی</span>
        </nav>

        <h1 className="text-3xl font-extrabold tracking-tight">قوانین، حریم خصوصی و بازگشت وجه</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Genova ابزار داخلی تیم ماست و اعتماد، مهم‌ترین سرمایهٔ آن. این صفحه
          شفاف‌سازی می‌کند که چطور با داده‌ها و خریدها رفتار می‌شود.
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title} className="rounded-2xl border border-border/70 bg-card/60 p-6">
              <h2 className="text-lg font-extrabold">{s.title}</h2>
              <ul className="mt-4 space-y-3">
                {s.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm leading-7 text-muted-foreground">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-gradient-to-l from-primary to-emerald-700 p-7 text-center text-white">
          <p className="text-base font-bold">سؤال یا پیشنهاد داری؟</p>
          <p className="mt-1 text-sm text-white/80">
            از پنل دانشجویی تیکت ثبت کن یا در تلگرام پیام بده.
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex rounded-full bg-white px-6 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-white/90"
          >
            رفتن به پشتیبانی
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
