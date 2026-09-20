/**
 * Mini App — Notifications + Support
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses the existing ticketing/notification records; nothing is duplicated:
 *   • support.listNotifications / markNotificationsRead → personal notifications
 *   • notifications.listAnnouncements                   → announcements visible to me
 *   • support.listMyTickets / getTicket / sendMessage   → my support threads
 *   • support.listInstructors / createTicket            → open a new request
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  ChevronLeft,
  HelpCircle,
  Megaphone,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { faNum, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Chip,
  MiniButton,
  MiniCard,
  MiniEmpty,
  MiniLoading,
  ScreenHeader,
  SectionTitle,
} from "./ui";

const TICKET_STATUS: Record<string, { label: string; tone: "success" | "warn" | "info" | "neutral" }> = {
  waiting_for_teacher: { label: "در انتظار پاسخ", tone: "warn" },
  waiting_for_student: { label: "پاسخ داده شده", tone: "info" },
  open: { label: "باز", tone: "warn" },
  answered: { label: "پاسخ داده شده", tone: "info" },
  closed: { label: "بسته", tone: "neutral" },
  resolved: { label: "حل شده", tone: "success" },
};

// ── Notifications ───────────────────────────────────────────────────────────

export function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const notifications = useQuery(api.support.listNotifications, {});
  const announcements = useQuery(api.notifications.listAnnouncements, {});
  const markRead = useMutation(api.support.markNotificationsRead);

  // Mark personal notifications as read when the screen opens (same as the web app).
  useEffect(() => {
    if ((notifications?.length ?? 0) > 0) {
      void markRead({}).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications?.length]);

  const loading = notifications === undefined || announcements === undefined;

  return (
    <div className="pb-4">
      <ScreenHeader title="اعلانها" onBack={onBack} />

      {loading ? (
        <MiniLoading />
      ) : (
        <>
          <SectionTitle title="اعلانهای من" />
          {(notifications ?? []).length === 0 ? (
            <MiniEmpty icon={Bell} title="اعلان شخصی نداری" />
          ) : (
            <div className="space-y-2">
              {(notifications ?? []).map((item) => (
                <MiniCard key={item._id}>
                  <div className="flex items-start gap-2">
                    {!item.isRead ? (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-teal-500" />
                    ) : (
                      <Bell className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
                        {item.body}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/70">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </MiniCard>
              ))}
            </div>
          )}

          <SectionTitle title="اطلاعیههای آکادمی" />
          {(announcements ?? []).length === 0 ? (
            <MiniEmpty icon={Megaphone} title="اطلاعیهای منتشر نشده" />
          ) : (
            <div className="space-y-2">
              {(announcements ?? []).map((item) => (
                <MiniCard key={item._id}>
                  <div className="flex items-start gap-2">
                    <Megaphone className="mt-0.5 size-3.5 shrink-0 text-teal-500" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
                        {item.body}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/70">
                        {formatDateTime(item.createdAt)}
                        {item.targetTitle ? ` · ${item.targetTitle}` : ""}
                      </p>
                    </div>
                  </div>
                </MiniCard>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Support list + new request ──────────────────────────────────────────────

export function SupportScreen({
  onBack,
  onOpenTicket,
}: {
  onBack: () => void;
  onOpenTicket: (id: string) => void;
}) {
  const tickets = useQuery(api.support.listMyTickets, {});
  const instructors = useQuery(api.support.listInstructors, {});
  const createTicket = useMutation(api.support.createTicket);

  const [showForm, setShowForm] = useState(false);
  const [teacherId, setTeacherId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!teacherId) {
      setError("یک استاد/پشتیبان انتخاب کنید.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createTicket({
        teacherId: teacherId as never,
        subject,
        message,
      });
      setSubject("");
      setMessage("");
      setShowForm(false);
      if (res?.ticketId) onOpenTicket(res.ticketId as unknown as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت درخواست");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-4">
      <ScreenHeader
        title="پشتیبانی"
        onBack={onBack}
        trailing={
          <MiniButton variant="ghost" onClick={() => setShowForm((value) => !value)}>
            {showForm ? "بستن" : "درخواست جدید"}
          </MiniButton>
        }
      />

      {showForm ? (
        <MiniCard className="mb-3">
          <p className="text-xs font-semibold">درخواست پشتیبانی جدید</p>

          <label className="mt-2 block text-[11px] text-muted-foreground">استاد / پشتیبان</label>
          <select
            value={teacherId}
            onChange={(event) => setTeacherId(event.target.value)}
            className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-xs"
          >
            <option value="">انتخاب کنید…</option>
            {(instructors ?? []).map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>

          <label className="mt-2 block text-[11px] text-muted-foreground">موضوع</label>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="مثلاً مشکل در دسترسی به جلسات"
            className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-xs"
          />

          <label className="mt-2 block text-[11px] text-muted-foreground">پیام</label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            placeholder="توضیح کامل مشکل…"
            className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-xs"
          />

          {error ? <p className="mt-2 text-[11px] text-destructive">{error}</p> : null}

          <MiniButton
            className="mt-2 w-full"
            disabled={busy || subject.trim().length < 3 || message.trim().length < 3}
            onClick={submit}
          >
            {busy ? "در حال ارسال…" : "ارسال درخواست"}
          </MiniButton>
        </MiniCard>
      ) : null}

      {tickets === undefined ? (
        <MiniLoading />
      ) : tickets.length === 0 ? (
        <MiniEmpty
          icon={HelpCircle}
          title="درخواستی ثبت نشده"
          description="سؤالی داری؟ یک درخواست پشتیبانی باز کن."
          action={{ label: "درخواست جدید", onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const status = TICKET_STATUS[ticket.status] ?? {
              label: ticket.status,
              tone: "neutral" as const,
            };
            return (
              <MiniCard key={ticket._id} onClick={() => onOpenTicket(ticket._id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-xs font-semibold">{ticket.subject}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      آخرین بهروزرسانی: {formatDateTime(ticket.lastMessageAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Chip tone={status.tone}>{status.label}</Chip>
                    {ticket.unreadByStudent > 0 ? (
                      <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {faNum(ticket.unreadByStudent)} پیام جدید
                      </span>
                    ) : null}
                  </div>
                </div>
                {ticket.courseName ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">{ticket.courseName}</p>
                ) : null}
                <ChevronLeft className="mt-2 size-4 text-muted-foreground/50" />
              </MiniCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Single ticket ───────────────────────────────────────────────────────────

export function TicketScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const ticket = useQuery(api.support.getTicket, { ticketId: id as never });
  const sendMessage = useMutation(api.support.sendMessage);
  const markAsRead = useMutation(api.support.markAsRead);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void markAsRead({ ticketId: id as never }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const send = async () => {
    if (text.trim().length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendMessage({ ticketId: id as never, message: text.trim() });
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ارسال پیام");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col pb-4">
      <ScreenHeader title={ticket?.subject ?? "درخواست پشتیبانی"} onBack={onBack} />

      {ticket === undefined ? (
        <MiniLoading />
      ) : !ticket ? (
        <MiniEmpty icon={HelpCircle} title="این درخواست در دسترس نیست" />
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2">
            <Chip tone={TICKET_STATUS[ticket.status]?.tone ?? "neutral"}>
              {TICKET_STATUS[ticket.status]?.label ?? ticket.status}
            </Chip>
            {ticket.courseName ? <Chip tone="info">{ticket.courseName}</Chip> : null}
          </div>

          <div className="space-y-2">
            {ticket.messages.map((msg) => {
              const mine = msg.senderId === ticket.studentId;
              return (
                <div
                  key={msg._id}
                  className={cn("flex", mine ? "justify-start" : "justify-end")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-5",
                      mine
                        ? "bg-muted text-foreground"
                        : "bg-teal-600 text-white",
                    )}
                  >
                    <p className="mb-0.5 text-[10px] opacity-80">{msg.senderName}</p>
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <p className="mt-1 text-[9px] opacity-70">{formatDateTime(msg.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {ticket.status === "closed" ? (
            <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-center text-[11px] text-muted-foreground">
              این درخواست بسته شده است. برای پیگیری، درخواست جدیدی باز کنید.
            </p>
          ) : (
            <div className="mt-3 flex items-end gap-2">
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={2}
                placeholder="پاسخ خود را بنویسید…"
                className="flex-1 rounded-xl border bg-background px-3 py-2 text-xs"
              />
              <MiniButton disabled={busy || text.trim().length === 0} onClick={send}>
                <Send className="size-3" />
                {busy ? "…" : "ارسال"}
              </MiniButton>
            </div>
          )}

          {error ? <p className="mt-2 text-[11px] text-destructive">{error}</p> : null}

          <p className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
            <MessageCircle className="size-3" />
            پاسخها پس از ثبت توسط استاد، همینجا و در اعلانها نمایش داده میشوند.
          </p>
        </>
      )}

      <div className="mt-auto" />
      <Sparkles className="hidden" />
    </div>
  );
}
