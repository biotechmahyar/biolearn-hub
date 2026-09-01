import { WorkshopCard } from "@/components/site/WorkshopCard";
import { PublicLayout } from "@/components/site/PublicLayout";
import { SectionHeading } from "@/components/site/SectionHeading";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Mic2 } from "lucide-react";
import { Link } from "react-router";

import { useMode } from "@/hooks/useMode";
import { useApiQuery } from "@/hooks/useApiQuery";

export default function Workshops() {
  const { isIran } = useMode();
  const workshopsConvex = useQuery(api.content.listWorkshops);
  const { data: workshopsIran } = useApiQuery<any[]>("/api/content/workshops");
  const workshops = isIran ? workshopsIran : workshopsConvex;
  const freeTalks = (workshops ?? []).filter((w) => w.expertTalk);
  const others = (workshops ?? []).filter((w) => !w.expertTalk);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">کارگاه‌ها و نشست‌ها</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            از تخصص مدرسان مهمان استفاده کن
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[15px]">
            کارگاه‌های زنده با مدرسان و متخصصان، به‌همراه نشست‌های رایگان برای
            آشنایی با مسیرهای تخصصی و پژوهشی.
          </p>
        </div>

        {freeTalks.length > 0 && (
          <div className="mt-10">
            <SectionHeading
              kicker="رایگان"
              title="Free Expert Talks"
              description="نشست‌های رایگان برای جذب مخاطب و آشنایی با مسیرهای تخصصی."
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {freeTalks.map((w) => (
                <WorkshopCard key={w._id} workshop={w as any} />
              ))}
            </div>
          </div>
        )}

        {others.length > 0 && (
          <div className="mt-10">
            <SectionHeading
              kicker="کارگاه‌های تخصصی"
              title="ظرفیت محدود · ثبت‌نام آنلاین"
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((w) => (
                <WorkshopCard key={w._id} workshop={w as any} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 flex items-start gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-6">
          <Mic2 className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="text-sm leading-6 text-muted-foreground">
            <p className="font-bold text-foreground">مدرس یا متخصص هستی؟</p>
            <p className="mt-1">
              اگر در حوزهٔ علوم زیستی تخصص داری و می‌خواهی کارگاه برگزار کنی، با
              تیم Genova در تماس باش:{" "}
              <Link to="/rules" className="underline hover:text-foreground">صفحهٔ تماس</Link>
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
