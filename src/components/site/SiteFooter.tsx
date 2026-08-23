import { Link } from "react-router";
import { Send, Mail, ShieldCheck } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/60">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <BrandLogo />
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              زیست‌آکادمی پلتفرم تخصصی آموزش علوم زیستی برای دانشجویان است؛
              توسط تیمی از دانشجویان میکروبیولوژی و بیوتکنولوژی ساخته شده تا
              مسیر یادگیری از ترم اول تا امتحان و پژوهش، شفاف و همراهانه باشد.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href="https://t.me/zistacademy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Send className="size-4 text-sky-600" />
                کانال تلگرام
              </a>
              <a
                href="mailto:hello@zist.academy"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="size-4 text-primary" />
                تماس
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold">دسترسی سریع</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/courses" className="transition-colors hover:text-foreground">دوره‌های آموزشی</Link></li>
              <li><Link to="/tests" className="transition-colors hover:text-foreground">آزمون تعیین سطح و آزمون‌ها</Link></li>
              <li><Link to="/daily-quiz" className="transition-colors hover:text-foreground">کوئیز روزانه</Link></li>
              <li><Link to="/free-content" className="transition-colors hover:text-foreground">محتوای رایگان</Link></li>
              <li><Link to="/dictionary" className="transition-colors hover:text-foreground">دیکشنری تخصصی</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold">زیست‌آکادمی</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/instructors" className="transition-colors hover:text-foreground">مدرس‌ها و تیم</Link></li>
              <li><Link to="/workshops" className="transition-colors hover:text-foreground">کارگاه‌ها و نشست‌ها</Link></li>
              <li><Link to="/products" className="transition-colors hover:text-foreground">محصولات آموزشی</Link></li>
              <li><Link to="/dashboard" className="transition-colors hover:text-foreground">پنل دانشجویی</Link></li>
              <li>
                <Link to="/rules" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                  <ShieldCheck className="size-3.5" />
                  قوانین، حریم خصوصی و بازگشت وجه
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} زیست‌آکادمی — ساخته‌شده با عشق برای دانشجویان علوم زیستی</p>
          <p className="flex items-center gap-1.5">
            تیم: ۴ دانشجوی میکروبیولوژی + ۱ دانشجوی بیوتکنولوژی
          </p>
        </div>
      </div>
    </footer>
  );
}
