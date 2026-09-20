/**
 * Mini App — catalog screens
 * ─────────────────────────────────────────────────────────────────────────────
 * Courses, workshops and digital products. All data comes from the existing
 * Genova backend:
 *   • content.listCourses / getCourseBySlug / listCategories
 *   • content.listWorkshops / getWorkshopBySlug
 *   • content.listProducts / getProductBySlug
 *   • courseStudio.getCourseSectionsWithLessons (curriculum)
 *   • enroll.getMyOrders            (owned / registered state)
 *   • enroll.markLessonComplete     (progress, existing mutation)
 *
 * Purchasing reuses the existing <CheckoutDialog> (coupons, online/offline
 * payment, receipt upload, `enroll.purchase`). The Mini App never marks
 * anything as owned itself — the server is authoritative.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Search,
  ShoppingBag,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { CheckoutDialog } from "@/components/site/CheckoutDialog";
import {
  BUNDLE_LABELS,
  MODE_LABELS,
  PRODUCT_TYPE_LABELS,
  accent,
  faNum,
  formatJalaliDateString,
  formatPrice,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Chip,
  InfoRow,
  MiniButton,
  MiniCard,
  MiniEmpty,
  MiniLoading,
  ProgressBar,
  ScreenHeader,
  SectionTitle,
  type MiniNav,
} from "./ui";

// ── Shared helpers ──────────────────────────────────────────────────────────

/** `type:refId` keys of everything the student already owns/registered. */
function useOwnedKeys() {
  const orders = useQuery(api.enroll.getMyOrders, {});
  return useMemo(() => {
    const set = new Set<string>();
    for (const order of orders ?? []) {
      for (const item of order.items) set.add(`${item.type}:${item.refId}`);
    }
    return set;
  }, [orders]);
}

// ── Courses list ────────────────────────────────────────────────────────────

export function CoursesScreen({ nav }: { nav: MiniNav }) {
  const [search, setSearch] = useState("");
  const [categorySlug, setCategorySlug] = useState<string | null>(null);

  const categories = useQuery(api.content.listCategories, {});
  const courses = useQuery(api.content.listCourses, {
    search: search.trim() || undefined,
    categorySlug: categorySlug ?? undefined,
  });

  return (
    <div className="pb-4">
      <h2 className="mb-3 text-base font-bold">دورهها</h2>

      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی دوره…"
          className="h-10 w-full rounded-xl border bg-transparent pr-9 pl-3 text-sm outline-none focus:border-teal-500"
        />
      </div>

      {categories && categories.length > 0 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategorySlug(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-[11px]",
              !categorySlug && "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
            )}
          >
            همه
          </button>
          {categories.map((category) => (
            <button
              key={category._id}
              type="button"
              onClick={() => setCategorySlug(category.slug)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-[11px]",
                categorySlug === category.slug &&
                  "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {courses === undefined ? (
          <MiniLoading />
        ) : courses.length === 0 ? (
          <MiniEmpty
            icon={BookOpen}
            title="دورهای پیدا نشد"
            description="عبارت جستجو یا دستهبندی را تغییر بده."
          />
        ) : (
          courses.map((course) => {
            const a = accent(course.accent);
            const hasDiscount =
              !!course.discountPrice && course.discountPrice > 0 && course.discountPrice < course.price;
            return (
              <MiniCard key={course._id} onClick={() => nav({ name: "course", slug: course.slug })}>
                <div className={cn("mb-2 h-1.5 w-12 rounded-full bg-gradient-to-l", a.grad)} />
                <p className="text-sm font-semibold">{course.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{course.summary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {course.category ? <Chip tone="info">{course.category.name}</Chip> : null}
                  <Chip>{MODE_LABELS[course.mode] ?? course.mode}</Chip>
                  {course.instructor ? <Chip>{course.instructor.name}</Chip> : null}
                  <Chip tone={hasDiscount ? "success" : "neutral"}>
                    {formatPrice(hasDiscount ? course.discountPrice! : course.price)}
                  </Chip>
                </div>
              </MiniCard>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Course detail ───────────────────────────────────────────────────────────

export function CourseDetailScreen({
  slug,
  onBack,
}: {
  slug: string;
  onBack: () => void;
}) {
  const course = useQuery(api.content.getCourseBySlug, { slug });
  const sections = useQuery(
    api.courseStudio.getCourseSectionsWithLessons,
    course ? { courseId: course._id } : "skip",
  );
  const markLesson = useMutation(api.enroll.markLessonComplete);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [tier, setTier] = useState<{ tier: string; price: number } | null>(null);
  const [busyLesson, setBusyLesson] = useState<string | null>(null);

  if (course === undefined) {
    return (
      <>
        <ScreenHeader title="جزئیات دوره" onBack={onBack} />
        <MiniLoading />
      </>
    );
  }
  if (course === null) {
    return (
      <>
        <ScreenHeader title="جزئیات دوره" onBack={onBack} />
        <MiniEmpty icon={BookOpen} title="دوره پیدا نشد" />
      </>
    );
  }

  const isEnrolled = !!course.enrollment;
  const lessons = (sections ?? []).flatMap((section) => section.lessons ?? []);
  const hasSections = lessons.length > 0;
  const syllabusItems = hasSections
    ? lessons.map((lesson) => ({
        id: String(lesson._id),
        title: lesson.title,
        durationMin: lesson.durationMin ?? 0,
        free: false,
      }))
    : course.syllabus.map((item) => ({
        id: item.id,
        title: item.title,
        durationMin: item.durationMin,
        free: item.free,
      }));

  const completed = course.enrollment?.completedLessons ?? [];
  const percent = syllabusItems.length === 0 ? 0 : (completed.length / syllabusItems.length) * 100;
  const hasDiscount =
    !!course.discountPrice && course.discountPrice > 0 && course.discountPrice < course.price;
  const effectivePrice = hasDiscount ? course.discountPrice! : course.price;
  const tiers = course.packagePrices ?? [];

  const toggleLesson = async (lessonId: string) => {
    setBusyLesson(lessonId);
    try {
      await markLesson({
        courseId: course._id,
        lessonId,
        completed: !completed.includes(lessonId),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره پیشرفت");
    } finally {
      setBusyLesson(null);
    }
  };

  return (
    <div className="pb-4">
      <ScreenHeader title={course.title} onBack={onBack} />

      {/* Header card */}
      <MiniCard className={cn("border-0 bg-gradient-to-br text-white", accent(course.accent).grad)}>
        <p className="text-sm font-bold">{course.title}</p>
        <p className="mt-1 text-[11px] opacity-90">{course.summary}</p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
          <span className="rounded-full bg-white/20 px-2 py-0.5">
            {MODE_LABELS[course.mode] ?? course.mode}
          </span>
          <span className="rounded-full bg-white/20 px-2 py-0.5">{course.durationText}</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5">
            {faNum(syllabusItems.length)} جلسه
          </span>
        </div>
      </MiniCard>

      {/* Status */}
      {isEnrolled ? (
        <MiniCard className="mt-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              شما ثبتنام کردهاید
            </span>
            <Chip tone="success">{faNum(Math.round(percent))}٪</Chip>
          </div>
          <div className="mt-2">
            <ProgressBar percent={percent} />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {faNum(completed.length)} از {faNum(syllabusItems.length)} جلسه تکمیل شده
          </p>
        </MiniCard>
      ) : (
        <MiniCard className="mt-3">
          <div className="flex items-center justify-between">
            <div>
              {hasDiscount ? (
                <p className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-teal-600 dark:text-teal-400">
                    {formatPrice(effectivePrice)}
                  </span>
                  <span className="text-[11px] text-muted-foreground line-through">
                    {formatPrice(course.price)}
                  </span>
                </p>
              ) : (
                <p className="text-lg font-black text-teal-600 dark:text-teal-400">
                  {formatPrice(course.price)}
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                برای دسترسی کامل، دوره را تهیه کنید
              </p>
            </div>
            {tiers.length === 0 ? (
              <MiniButton
                onClick={() => {
                  setTier(null);
                  setCheckoutOpen(true);
                }}
              >
                <ShoppingBag className="size-3.5" />
                {course.price === 0 ? "ثبتنام رایگان" : "خرید دوره"}
              </MiniButton>
            ) : null}
          </div>

          {tiers.length > 0 ? (
            <div className="mt-3 space-y-2">
              {tiers.map((packageTier) => (
                <div
                  key={packageTier.tier}
                  className="rounded-xl border p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      پکیج {BUNDLE_LABELS[packageTier.tier] ?? packageTier.tier}
                    </span>
                    <span className="text-xs font-bold">
                      {formatPrice(packageTier.price)}
                    </span>
                  </div>
                  {packageTier.features?.length ? (
                    <ul className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
                      {packageTier.features.slice(0, 3).map((feature) => (
                        <li key={feature}>• {feature}</li>
                      ))}
                    </ul>
                  ) : null}
                  <MiniButton
                    className="mt-2 w-full"
                    onClick={() => {
                      setTier({ tier: packageTier.tier, price: packageTier.price });
                      setCheckoutOpen(true);
                    }}
                  >
                    انتخاب این پکیج
                  </MiniButton>
                </div>
              ))}
            </div>
          ) : null}
        </MiniCard>
      )}

      {/* Instructor */}
      {course.instructor ? (
        <MiniCard className="mt-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-teal-100 text-sm dark:bg-teal-900">
              {course.instructor.name?.[0] ?? "م"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{course.instructor.name}</p>
              <p className="text-[11px] text-muted-foreground">{course.instructor.title}</p>
            </div>
          </div>
        </MiniCard>
      ) : null}

      {/* Description */}
      <SectionTitle title="درباره دوره" />
      <MiniCard>
        <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
          {course.description}
        </p>
        {course.audience?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {course.audience.slice(0, 4).map((item) => (
              <Chip key={item}>{item}</Chip>
            ))}
          </div>
        ) : null}
      </MiniCard>

      {/* Curriculum */}
      <SectionTitle title="سرفصلها" />
      {sections === undefined && hasSections ? (
        <MiniLoading />
      ) : syllabusItems.length === 0 ? (
        <MiniEmpty icon={Layers} title="سرفصلی ثبت نشده است" />
      ) : (
        <div className="space-y-1.5">
          {syllabusItems.map((item, index) => {
            const isDone = completed.includes(item.id);
            const locked = !isEnrolled && !item.free;
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    isDone
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {faNum(index + 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs font-medium">{item.title}</p>
                  {item.durationMin ? (
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="size-3" />
                      {faNum(item.durationMin)} دقیقه
                    </p>
                  ) : null}
                </div>
                {isEnrolled ? (
                  <button
                    type="button"
                    disabled={busyLesson === item.id}
                    onClick={() => toggleLesson(item.id)}
                    className="shrink-0 rounded-lg border px-2 py-1 text-[10px] disabled:opacity-50"
                  >
                    {isDone ? "لغو" : "تکمیل"}
                  </button>
                ) : locked ? (
                  <Chip>قفل</Chip>
                ) : (
                  <Chip tone="success">پیشنمایش</Chip>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isEnrolled ? (
        <div className="mt-4">
          <MiniCard className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ExternalLink className="size-3.5" />
            برای پخش ویدیوی جلسات از نسخه کامل سایت استفاده کن.
          </MiniCard>
        </div>
      ) : null}

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        items={[
          {
            type: "course",
            refId: course._id,
            title: course.title,
            price: tier?.price ?? effectivePrice,
          },
        ]}
        bundleTier={tier?.tier}
        successTitle="ثبتنام شما انجام شد"
        successDescription="دسترسی به دوره فعال شد؛ از بخش «یادگیری من» ادامه بده."
      />
    </div>
  );
}

// ── Workshops ───────────────────────────────────────────────────────────────

export function WorkshopsScreen({ nav }: { nav: MiniNav }) {
  const workshops = useQuery(api.content.listWorkshops, {});
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = (workshops ?? []).filter((w) => !w.date || w.date >= today);
  const past = (workshops ?? []).filter((w) => w.date && w.date < today);

  const renderCard = (workshop: (typeof upcoming)[number], muted = false) => (
    <MiniCard
      key={workshop._id}
      onClick={() => nav({ name: "workshop", slug: workshop.slug })}
      className={muted ? "opacity-70" : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-1 text-sm font-semibold">{workshop.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="size-3" />
            {workshop.date ? formatJalaliDateString(workshop.date) : "—"}
            {workshop.time ? ` · ${workshop.time}` : ""}
          </p>
          {workshop.instructor ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              مدرس: {workshop.instructor.name}
            </p>
          ) : null}
        </div>
        <Chip tone={workshop.free ? "success" : "neutral"}>
          {workshop.free ? "رایگان" : formatPrice(workshop.price)}
        </Chip>
      </div>
    </MiniCard>
  );

  return (
    <div className="pb-4">
      <h2 className="mb-3 text-base font-bold">کارگاهها</h2>
      {workshops === undefined ? (
        <MiniLoading />
      ) : workshops.length === 0 ? (
        <MiniEmpty icon={Calendar} title="کارگاهی منتشر نشده است" />
      ) : (
        <>
          <div className="space-y-2">{upcoming.map((w) => renderCard(w))}</div>
          {past.length > 0 ? (
            <>
              <SectionTitle title="برگزارشده" />
              <div className="space-y-2">{past.map((w) => renderCard(w, true))}</div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

export function WorkshopDetailScreen({
  slug,
  onBack,
}: {
  slug: string;
  onBack: () => void;
}) {
  const workshop = useQuery(api.content.getWorkshopBySlug, { slug });
  const owned = useOwnedKeys();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (workshop === undefined) {
    return (
      <>
        <ScreenHeader title="جزئیات کارگاه" onBack={onBack} />
        <MiniLoading />
      </>
    );
  }
  if (workshop === null) {
    return (
      <>
        <ScreenHeader title="جزئیات کارگاه" onBack={onBack} />
        <MiniEmpty icon={Calendar} title="کارگاه پیدا نشد" />
      </>
    );
  }

  const isRegistered = owned.has(`workshop:${workshop._id}`);
  const seatsLeft = Math.max(0, workshop.capacity - workshop.registeredCount);
  const isFull = seatsLeft === 0;

  return (
    <div className="pb-4">
      <ScreenHeader title={workshop.title} onBack={onBack} />

      <MiniCard>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone={workshop.free ? "success" : "neutral"}>
            {workshop.free ? "رایگان" : formatPrice(workshop.price)}
          </Chip>
          {workshop.expertTalk ? <Chip tone="info">گفتوگو با متخصص</Chip> : null}
          {isRegistered ? <Chip tone="success">ثبتنام شدهاید</Chip> : isFull ? <Chip tone="danger">تکمیل ظرفیت</Chip> : <Chip tone="warn">{faNum(seatsLeft)} صندلی باقی مانده</Chip>}
        </div>

        <div className="mt-2 divide-y">
          <InfoRow
            label="تاریخ"
            value={workshop.date ? formatJalaliDateString(workshop.date) : "—"}
          />
          <InfoRow label="ساعت" value={workshop.time || "—"} />
          <InfoRow
            label="مدرس"
            value={workshop.instructor ? workshop.instructor.name : "—"}
          />
          <InfoRow label="موضوع" value={workshop.topic || "—"} />
        </div>

        {!isRegistered ? (
          <MiniButton
            className="mt-3 w-full"
            disabled={isFull}
            onClick={() => setCheckoutOpen(true)}
          >
            <Users className="size-3.5" />
            {isFull ? "ظرفیت تکمیل است" : workshop.free ? "ثبتنام رایگان" : "ثبتنام در کارگاه"}
          </MiniButton>
        ) : workshop.platformUrl ? (
          <MiniButton
            className="mt-3 w-full"
            onClick={() => window.open(workshop.platformUrl!, "_blank")}
          >
            <ExternalLink className="size-3.5" />
            ورود به کلاس (اسکایروم)
          </MiniButton>
        ) : null}
      </MiniCard>

      <SectionTitle title="توضیحات" />
      <MiniCard>
        <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
          {workshop.description}
        </p>
      </MiniCard>

      {workshop.agenda?.length ? (
        <>
          <SectionTitle title="سرفصل کارگاه" />
          <MiniCard>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {workshop.agenda.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </MiniCard>
        </>
      ) : null}

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        items={[
          {
            type: "workshop",
            refId: workshop._id,
            title: workshop.title,
            price: workshop.free ? 0 : workshop.price,
          },
        ]}
        successTitle="ثبتنام کارگاه انجام شد"
        successDescription="جزئیات ورود به کلاس در همین صفحه نمایش داده میشود."
      />
    </div>
  );
}

// ── Products / notes ────────────────────────────────────────────────────────

export function ProductsScreen({ nav }: { nav: MiniNav }) {
  const products = useQuery(api.content.listProducts, {});
  const owned = useOwnedKeys();

  return (
    <div className="pb-4">
      <ScreenHeader title="جزوه و محصولات" onBack={() => nav({ name: "home" })} />
      {products === undefined ? (
        <MiniLoading />
      ) : products.length === 0 ? (
        <MiniEmpty icon={ShoppingBag} title="محصولی منتشر نشده است" />
      ) : (
        <div className="space-y-2">
          {products.map((product) => {
            const isOwned = owned.has(`product:${product._id}`);
            return (
              <MiniCard
                key={product._id}
                onClick={() => nav({ name: "product", slug: product.slug })}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold">{product.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {PRODUCT_TYPE_LABELS[product.type] ?? product.type}
                    </p>
                  </div>
                  {isOwned ? (
                    <Chip tone="success">خریداری شده</Chip>
                  ) : (
                    <Chip>{formatPrice(product.discountPrice ?? product.price)}</Chip>
                  )}
                </div>
              </MiniCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProductDetailScreen({
  slug,
  onBack,
}: {
  slug: string;
  onBack: () => void;
}) {
  const product = useQuery(api.content.getProductBySlug, { slug });
  const owned = useOwnedKeys();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (product === undefined) {
    return (
      <>
        <ScreenHeader title="جزئیات محصول" onBack={onBack} />
        <MiniLoading />
      </>
    );
  }
  if (product === null) {
    return (
      <>
        <ScreenHeader title="جزئیات محصول" onBack={onBack} />
        <MiniEmpty icon={ShoppingBag} title="محصول پیدا نشد" />
      </>
    );
  }

  const isOwned = owned.has(`product:${product._id}`);
  const hasDiscount =
    !!product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price;

  return (
    <div className="pb-4">
      <ScreenHeader title={product.title} onBack={onBack} />

      <MiniCard>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{product.title}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {PRODUCT_TYPE_LABELS[product.type] ?? product.type}
            </p>
          </div>
          {isOwned ? (
            <Chip tone="success">خریداری شده</Chip>
          ) : (
            <Chip>{formatPrice(hasDiscount ? product.discountPrice! : product.price)}</Chip>
          )}
        </div>

        {!isOwned ? (
          <MiniButton className="mt-3 w-full" onClick={() => setCheckoutOpen(true)}>
            <ShoppingBag className="size-3.5" />
            {product.price === 0 ? "دریافت رایگان" : "خرید محصول"}
          </MiniButton>
        ) : null}
        {typeof product.stock === "number" ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            موجودی: {faNum(product.stock)}
          </p>
        ) : null}
      </MiniCard>

      <SectionTitle title={isOwned ? "محتوای محصول" : "توضیحات"} />
      <MiniCard>
        <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
          {product.description}
        </p>
      </MiniCard>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        items={[
          {
            type: "product",
            refId: product._id,
            title: product.title,
            price: product.discountPrice ?? product.price,
          },
        ]}
        successTitle="خرید ثبت شد"
        successDescription="محصول به سفارشهای شما اضافه شد."
      />
    </div>
  );
}
