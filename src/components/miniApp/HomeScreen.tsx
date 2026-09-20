/**
 * Mini App — Home
 *
 * Mobile-first summary for the signed-in student. Every number comes from an
 * existing Genova query; nothing is duplicated or cached in component state.
 *   • enroll.getMyEnrollments        → continue-learning + progress
 *   • content.listCourses            → available courses
 *   • content.listWorkshops          → upcoming workshops
 *   • support.getUnreadCounts        → badges (notifications + support)
 *   • support.listNotifications      → latest personal notification
 *   • notifications.listAnnouncements → latest announcement visible to me
 *   • tests.getDailyQuiz             → daily-quiz state
 */
import { useQuery } from "convex/react";
import {
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
  HelpCircle,
  Bell,
  ListChecks,
  ShoppingBag,
  Sparkles,
  Target,
  Users,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { faNum, formatJalaliDateString, formatPrice } from "@/lib/format";
import {
  Chip,
  MiniCard,
  MiniEmpty,
  MiniLoading,
  ProgressBar,
  SectionTitle,
  StatTile,
  type MiniNav,
  type MiniUser,
} from "./ui";

export function HomeScreen({ nav, user }: { nav: MiniNav; user: MiniUser }) {
  const enrollments = useQuery(api.enroll.getMyEnrollments);
  const courses = useQuery(api.content.listCourses, { featuredOnly: true, limit: 3 });
  const workshops = useQuery(api.content.listWorkshops, {});
  const unread = useQuery(api.support.getUnreadCounts);
  const notifications = useQuery(api.support.listNotifications, {});
  const announcements = useQuery(api.notifications.listAnnouncements, {});
  const quiz = useQuery(api.tests.getDailyQuiz, {});

  const isAdmin = user.role === "admin" || user.role === "site_admin";
  const loading = enrollments === undefined;

  const continueCourse = enrollments?.[0] ?? null;
  const upcomingWorkshops = (workshops ?? [])
    .filter((w) => !w.date || w.date >= new Date().toISOString().slice(0, 10))
    .slice(0, 2);
  const latestNotification = notifications?.[0] ?? null;
  const latestAnnouncement = announcements?.[0] ?? null;
  const quizDone = !!quiz?.myAnswer;

  const tiles: { label: string; icon: typeof BookOpen; onClick: () => void; badge?: number }[] = [
    { label: "یادگیری من", icon: GraduationCap, onClick: () => nav({ name: "learning" }) },
    { label: "آزمون روزانه", icon: Target, onClick: () => nav({ name: "quiz" }) },
    { label: "آزمونها", icon: ListChecks, onClick: () => nav({ name: "exams" }) },
    { label: "سفارشها", icon: FileText, onClick: () => nav({ name: "orders" }) },
    { label: "جزوه و محصولات", icon: ShoppingBag, onClick: () => nav({ name: "products" }) },
    {
      label: "پشتیبانی",
      icon: HelpCircle,
      onClick: () => nav({ name: "support" }),
      badge: unread?.tickets,
    },
    { label: "سؤالات من", icon: ClipboardList, onClick: () => nav({ name: "questions" }) },
    { label: "جلسات", icon: Calendar, onClick: () => nav({ name: "sessions" }) },
    { label: "گروهها", icon: Users, onClick: () => nav({ name: "groups" }) },
  ];

  return (
    <div className="space-y-1 pb-4">
      {/* Greeting */}
      <MiniCard className="border-0 bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
        <p className="text-xs opacity-90">سلام 👋</p>
        <p className="text-base font-bold">{user.name ?? "دانشجوی عزیز"}</p>
        <p className="mt-0.5 text-[11px] opacity-80">
          {quizDone
            ? "آزمون امروز را پاسخ دادهای — ادامه بده!"
            : "آزمون روزانه امروز منتظر توست."}
        </p>
      </MiniCard>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatTile value={faNum(enrollments?.length ?? 0)} label="دوره فعال" />
        <StatTile value={faNum(upcomingWorkshops.length)} label="کارگاه پیشرو" tone="sky" />
        <StatTile value={faNum(unread?.notifications ?? 0)} label="اعلان نخوانده" tone="amber" />
      </div>

      {/* Continue learning */}
      <SectionTitle
        title="ادامه یادگیری"
        action={{ label: "همه", onClick: () => nav({ name: "learning" }) }}
      />
      {loading ? (
        <MiniLoading />
      ) : continueCourse ? (
        <MiniCard
          onClick={() => nav({ name: "course", slug: continueCourse.course.slug })}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-1 text-sm font-semibold">{continueCourse.course.title}</p>
            <Chip tone="success">{faNum(continueCourse.percent)}٪</Chip>
          </div>
          <div className="mt-2">
            <ProgressBar percent={continueCourse.percent} />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {faNum(continueCourse.completedLessons.length)} جلسه تکمیل شده
          </p>
        </MiniCard>
      ) : (
        <MiniEmpty
          icon={GraduationCap}
          title="هنوز در دورهای ثبت‌نام نکردهای"
          description="از بخش دورهها یک دوره انتخاب کن."
          action={{ label: "مشاهده دوره‌ها", onClick: () => nav({ name: "courses" }) }}
        />
      )}

      {/* Quick access */}
      <SectionTitle title="دسترسی سریع" />
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.label}
              type="button"
              onClick={tile.onClick}
              className="relative flex flex-col items-center gap-1 rounded-2xl border bg-card px-2 py-3 text-[10px] font-medium active:bg-muted/60"
            >
              <Icon className="size-4 text-teal-600 dark:text-teal-400" />
              <span className="text-center leading-tight">{tile.label}</span>
              {tile.badge ? (
                <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {tile.badge > 9 ? "۹+" : faNum(tile.badge)}
                </span>
              ) : null}
            </button>
          );
        })}
        {isAdmin ? (
          <button
            type="button"
            onClick={() => nav({ name: "admin" })}
            className="flex flex-col items-center gap-1 rounded-2xl border bg-card px-2 py-3 text-[10px] font-medium active:bg-muted/60"
          >
            <ShieldCheck className="size-4 text-violet-600 dark:text-violet-400" />
            <span className="text-center leading-tight">مدیریت</span>
          </button>
        ) : null}
      </div>

      {/* Available courses */}
      <SectionTitle
        title="دورههای پیشنهادی"
        action={{ label: "همه دورهها", onClick: () => nav({ name: "courses" }) }}
      />
      {courses === undefined ? (
        <MiniLoading />
      ) : courses.length === 0 ? (
        <MiniEmpty icon={BookOpen} title="دورهای منتشر نشده است" />
      ) : (
        <div className="space-y-2">
          {courses.map((course) => (
            <MiniCard key={course._id} onClick={() => nav({ name: "course", slug: course.slug })}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-semibold">{course.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {course.summary}
                  </p>
                </div>
                <Chip tone="info">{formatPrice(course.discountPrice ?? course.price)}</Chip>
              </div>
            </MiniCard>
          ))}
        </div>
      )}

      {/* Upcoming workshops */}
      <SectionTitle
        title="کارگاههای پیشرو"
        action={{ label: "همه", onClick: () => nav({ name: "workshops" }) }}
      />
      {workshops === undefined ? (
        <MiniLoading />
      ) : upcomingWorkshops.length === 0 ? (        <MiniEmpty icon={Calendar} title="کارگاه فعالی وجود ندارد" />
      ) : (
        <div className="space-y-2">
          {upcomingWorkshops.map((workshop) => (
            <MiniCard
              key={workshop._id}
              onClick={() => nav({ name: "workshop", slug: workshop.slug })}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-semibold">{workshop.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {workshop.date ? formatJalaliDateString(workshop.date) : "—"}
                    {workshop.time ? ` · ${workshop.time}` : ""}
                  </p>
                </div>
                <Chip tone={workshop.free ? "success" : "neutral"}>
                  {workshop.free ? "رایگان" : formatPrice(workshop.price)}
                </Chip>
              </div>
            </MiniCard>
          ))}
        </div>
      )}

      {/* Latest activity */}
      <SectionTitle
        title="آخرین اطلاعرسانی"
        action={{ label: "همه", onClick: () => nav({ name: "notifications" }) }}
      />
      {notifications === undefined || announcements === undefined ? (
        <MiniLoading />
      ) : latestNotification || latestAnnouncement ? (
        <MiniCard onClick={() => nav({ name: "notifications" })}>
          <div className="flex items-start gap-2">
            <Bell className="mt-0.5 size-4 shrink-0 text-teal-500" />
            <div className="min-w-0">
              <p className="line-clamp-1 text-sm font-medium">
                {latestNotification?.title ?? latestAnnouncement?.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                {latestNotification?.body ?? latestAnnouncement?.body}
              </p>
            </div>
          </div>
        </MiniCard>
      ) : (
        <MiniEmpty icon={Sparkles} title="اطلاعرسانی جدیدی نیست" />
      )}
    </div>
  );
}
