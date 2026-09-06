import { PublicLayout } from "@/components/site/PublicLayout";
import { usePageConfig } from "@/hooks/usePageConfig";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router";

const SECTION_IDS = ["rulesUsage", "rulesPrivacy", "rulesRefund", "rulesContact"] as const;

export default function Rules() {
  const { getSection, isSectionVisible } = usePageConfig("rules");

  const sections = SECTION_IDS.map((id) => {
    const s = getSection(id) as Record<string, unknown>;
    const items = [s.item1, s.item2, s.item3, s.item4].filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
    return { id, title: String(s.title ?? ""), items, visible: isSectionVisible(id) };
  }).filter((s) => s.visible && s.title);

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
          {sections.map((s) => (
            <section key={s.id} className="rounded-2xl border border-border/70 bg-card/60 p-6">
              <h2 className="text-lg font-extrabold">{s.title}</h2>
              <ul className="mt-4 space-y-3">
                {s.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm leading-7 text-muted-foreground">
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