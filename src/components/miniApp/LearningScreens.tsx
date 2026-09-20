/**
 * Mini App — My Learning + Orders
 * ─────────────────────────────────────────────────────────────────────────────
 * Everything here is derived from existing Genova records:
 *   • enroll.getMyEnrollments → owned courses + completion percent
 *   • enroll.getMyOrders      → purchase history (source of truth for ownership)
 *   • enroll.getMyDownloads   → course files
 *   • content.listWorkshops   → details/links of workshops bought earlier
 *
 * No progress or payment status is invented on the client.
 */
import { useQuery } from "convex/react";
import {
  Calendar,
  Download,
  ExternalLink,
  GraduationCap,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { faNum, formatDateTime, formatJalaliDateString, formatPrice } from "@/lib/format";
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

/** Item type labels for order lines. */
const ITEM_LABELS: Record<string, string> = {
  course: "دوره",
  product: "محصول",
  workshop: "کارگاه",
  ai_subscription: "اشتراک هوش مصنوعی",
};

export function LearningScreen({ nav }: { nav: MiniNav }) {
  const enrollments = useQuery(api.enroll.getMyEnrollments, {});
  const downloads = useQuery(api.enroll.getMyDownloads, {});
  const orders = useQuery(api.enroll.getMyOrders, {});
  const workshops = useQuery(api.content.listWorkshops, {});

  // Workshops the student registered for = workshop line items in paid orders.
  const registeredWorkshopIds = new Set(
    (orders ?? [])
      .flatMap((order) => order.items)
      .filter((item) => item.type === "workshop")
      .map((item) => item.refId),
  );
  const myWorkshops = (workshops ?? []).filter((w) => registeredWorkshopIds.has(w._id));

  return (
    <div className="pb-4">
      <h2 className="mb-3 text-base font-bold">یادگیری من</h2>

      {enrollments === undefined ? (
        <MiniLoading />
      ) : enrollments.length === 0 ? (
        <MiniEmpty
          icon={GraduationCap}
          title="هنوز دورهای نداری"
          description="با تهیه یک دوره، از همینجا ادامه بده."
          action={{ label: "مشاهده دورهها", onClick: () => nav({ name: "courses" }) }}
        />
      ) : (
        <div className="space-y-2">
          {enrollments.map((enrollment) => (
            <MiniCard
              key={enrollment._id}
              onClick={() => nav({ name: "course", slug: enrollment.course.slug })}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-1 text-sm font-semibold">{enrollment.course.title}</p>
                <Chip tone={enrollment.percent >= 100 ? "success" : "info"}>
                  {enrollment.percent >= 100 ? "تکمیل شده" : `${faNum(enrollment.percent)}٪`}
                </Chip>
              </div>
              <div className="mt-2">
                <ProgressBar percent={enrollment.percent} />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{faNum(enrollment.completedLessons.length)} جلسه تکمیل شده</span>
                <span>ثبتنام: {formatJalaliDateString(new Date(enrollment.enrolledAt).toISOString().slice(0, 10))}</span>
              </div>
            </MiniCard>
          ))}
        </div>
      )}

      {/* Workshops the student signed up for (existing order records) */}
      {myWorkshops.length > 0 ? (
        <>
          <SectionTitle title="کارگاههای من" />
          <div className="space-y-2">
            {myWorkshops.map((workshop) => (
              <MiniCard key={workshop._id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold">{workshop.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="size-3" />
                      {workshop.date ? formatJalaliDateString(workshop.date) : "—"}
                      {workshop.time ? ` · ${workshop.time}` : ""}
                    </p>
                  </div>
                  {workshop.platformUrl ? (
                    <MiniButton
                      variant="outline"
                      onClick={() => window.open(workshop.platformUrl!, "_blank")}
                    >
                      <ExternalLink className="size-3" />
                      کلاس
                    </MiniButton>
                  ) : null}
                </div>
              </MiniCard>
            ))}
          </div>
        </>
      ) : null}

      {/* Course files (existing downloads data) */}
      <SectionTitle title="فایلهای دورهها" />
      {downloads === undefined ? (
        <MiniLoading />
      ) : downloads.length === 0 ? (
        <MiniEmpty icon={Download} title="فایلی برای دورههایت ثبت نشده" />
      ) : (
        <div className="space-y-2">
          {downloads.map((entry) => (
            <MiniCard key={entry.courseId}>
              <p className="text-xs font-semibold">{entry.courseTitle}</p>
              <ul className="mt-1.5 space-y-1">
                {entry.files.map((file) => (
                  <li
                    key={file.name}
                    className="flex items-center justify-between text-[11px] text-muted-foreground"
                  >
                    <span className="line-clamp-1">{file.name}</span>
                    <span className="shrink-0">{file.size}</span>
                  </li>
                ))}
              </ul>
            </MiniCard>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrdersScreen({ onBack }: { onBack: () => void }) {
  const orders = useQuery(api.enroll.getMyOrders, {});

  return (
    <div className="pb-4">
      <ScreenHeader title="سفارشهای من" onBack={onBack} />

      {orders === undefined ? (
        <MiniLoading />
      ) : orders.length === 0 ? (
        <MiniEmpty
          icon={Receipt}
          title="سفارشی ثبت نشده"
          description="خریدهای شما اینجا نمایش داده میشوند."
        />
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <MiniCard key={order._id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold">فاکتور {order.invoiceNumber}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <Chip
                  tone={
                    order.status === "paid"
                      ? "success"
                      : order.status === "pending"
                        ? "warn"
                        : "danger"
                  }
                >
                  {order.status === "paid"
                    ? "پرداختشده"
                    : order.status === "pending"
                          ? "در انتظار پرداخت"
                          : "لغوشده"}
                </Chip>
              </div>

              <div className="mt-2 space-y-1">
                {order.items.map((item, index) => (
                  <div
                    key={`${item.refId}-${index}`}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-2 py-1.5 text-[11px]"
                  >
                    <span className="min-w-0 truncate">
                      <ShoppingBag className="mr-1 inline size-3 text-muted-foreground" />
                      {item.title}
                    </span>
                    <span className="shrink-0 font-medium">{formatPrice(item.price)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-2 divide-y border-t pt-1">
                <InfoRow label="جمع کل" value={formatPrice(order.subtotal)} />
                {order.discountAmount > 0 ? (
                  <InfoRow
                    label="تخفیف"
                    value={`− ${formatPrice(order.discountAmount)}${order.couponCode ? ` (${order.couponCode})` : ""}`}
                  />
                ) : null}
                <InfoRow
                  label="مبلغ پرداختی"
                  value={<span className="font-bold text-teal-600 dark:text-teal-400">{formatPrice(order.total)}</span>}
                />
                {order.payMethod ? (
                  <InfoRow
                    label="روش پرداخت"
                    value={
                      order.payMethod === "offline"
                        ? "آفلاین"
                        : order.payMethod === "wallet"
                          ? "کیف پول"
                          : "آنلاین"
                    }
                  />
                ) : null}
              </div>
            </MiniCard>
          ))}
        </div>
      )}
    </div>
  );
}
