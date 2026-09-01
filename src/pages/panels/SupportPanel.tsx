import { api } from "@/convex/_generated/api";
import { MemberProfileEditor } from "@/components/site/MemberProfileEditor";
import { useAuth } from "@/hooks/use-auth";
import { useMode } from "@/hooks/useMode";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  Headset,
  Inbox,
  LifeBuoy,
  Lock,
  MessageSquare,
  Send,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type TicketRow = (typeof api.tickets.listAllTickets)["_returnType"][number];
type Status = "open" | "answered" | "closed";

const STATUS_LABEL: Record<Status, string> = {
  open: "باز",
  answered: "پاسخ‌داده‌شده",
  closed: "بسته",
};

export default function SupportPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Status | "all">("all");
  const [view, setView] = useState<"tickets" | "profile">("tickets");
  const [expanded, setExpanded] = useState<string | null>(null);

  const tickets = useQuery(api.tickets.listAllTickets) ?? [];
  const replyTicket = useMutation(api.tickets.replyTicket);
  const updateTicketStatus = useMutation(api.tickets.updateTicketStatus);
  const touchPresence = useMutation(api.collab.touchPresence);

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    touchPresence({ location: "میز پشتیبانی" });
    const t = setInterval(() => touchPresence({ location: "میز پشتیبانی" }), 25_000);
    return () => clearInterval(t);
  }, [touchPresence]);

  const counts = useMemo(
    () => ({
      open: tickets.filter((t) => t.status === "open").length,
      answered: tickets.filter((t) => t.status === "answered").length,
      closed: tickets.filter((t) => t.status === "closed").length,
    }),
    [tickets],
  );

  const visible = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  async function handleReply(t: TicketRow) {
    const text = drafts[t._id];
    if (!text?.trim()) return;
    try {
      await replyTicket({ ticketId: t._id, message: text });
      setDrafts((d) => ({ ...d, [t._id]: "" }));
      toast.success("پاسخ ثبت شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  }

  return (
    <div className="min-h-screen bg-[#03130f] text-emerald-50" dir="rtl">
      <header className="sticky top-0 z-20 border-b border-emerald-400/10 bg-[#03130f]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10">
              <Headset className="size-5 text-emerald-300" />
            </span>
            <div>
              <h1 className="text-sm font-bold text-emerald-100">میز پشتیبانی</h1>
              <p className="font-mono text-[10px] tracking-wide text-emerald-400/60">
                support desk · tickets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-300">
              <CheckCircle2 className="size-3" />
              {counts.open} باز
            </span>
            <Badge variant="outline" className="border-white/10 font-mono text-[10px] text-emerald-100/70">
              {user?.name ?? "پشتیبانی"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-100/70 hover:bg-emerald-400/10"
              onClick={() => setView(view === "tickets" ? "profile" : "tickets")}
            >
              <User className="size-4" />
              {view === "tickets" ? "پروفایل من" : "تیکت‌ها"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-100/50"
              onClick={() => navigate(user?.role === "admin" || user?.role === "site_admin" ? "/admin" : "/")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {view === "profile" ? (
          <SupportProfileView />
        ) : (
          <>
        {/* Queue stats */}
        <div className="grid grid-cols-3 gap-3">
          {(["open", "answered", "closed"] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? "all" : s)}
              className={`rounded-xl border p-4 text-right transition-colors ${
                filter === s
                  ? "border-emerald-400/40 bg-emerald-400/10"
                  : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
              }`}
            >
              <p className="text-2xl font-bold text-emerald-100">{counts[s]}</p>
              <p className="mt-1 text-xs text-emerald-100/50">{STATUS_LABEL[s]}</p>
            </button>
          ))}
        </div>

        {/* Queue */}
        <div className="space-y-3">
          {visible.map((t) => {
            const isOpen = expanded === t._id;
            const last = t.messages[t.messages.length - 1];
            return (
              <Card key={t._id} className="border-white/5 bg-white/[0.02]">
                <CardContent className="py-4">
                  <button
                    className="flex w-full flex-wrap items-center gap-3 text-right"
                    onClick={() => setExpanded(isOpen ? null : t._id)}
                  >
                    <span
                      className={`flex size-9 items-center justify-center rounded-full ${
                        t.status === "open"
                          ? "bg-red-400/10 text-red-300"
                          : t.status === "answered"
                            ? "bg-amber-400/10 text-amber-300"
                            : "bg-emerald-400/10 text-emerald-300"
                      }`}
                    >
                      <Inbox className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-emerald-50">{t.subject}</p>
                      <p className="text-[11px] text-emerald-100/40">
                        {t.user?.name ?? "کاربر"} · {t.user?.email ?? "—"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        t.status === "open"
                          ? "border-red-400/30 text-red-300"
                          : t.status === "answered"
                            ? "border-amber-400/30 text-amber-300"
                            : "border-emerald-400/30 text-emerald-300"
                      }
                    >
                      {STATUS_LABEL[t.status as Status]}
                    </Badge>
                  </button>

                  {isOpen && (
                    <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                      {/* Thread */}
                      <div className="max-h-72 space-y-2 overflow-y-auto">
                        {t.messages.map((m, i) => (
                          <div
                            key={i}
                            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                              m.author === "admin"
                                ? "mr-auto bg-emerald-400/15 text-emerald-100"
                                : "bg-white/5 text-emerald-100/80"
                            }`}
                          >
                            <p className="mb-1 text-[10px] font-bold opacity-60">
                              {m.author === "admin" ? "پشتیبانی" : "کاربر"}
                            </p>
                            {m.text}
                            <p className="mt-1 text-right font-mono text-[9px] opacity-40">
                              {new Date(m.at).toLocaleString("fa-IR")}
                            </p>
                          </div>
                        ))}
                      </div>

                      {last?.author === "student" && t.status !== "closed" && (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="پاسخ کاربر…"
                            value={drafts[t._id] ?? ""}
                            onChange={(e) => setDrafts((d) => ({ ...d, [t._id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && handleReply(t)}
                            className="flex-1 border-white/10 bg-white/5 text-emerald-50 placeholder:text-emerald-100/30"
                          />
                          <Button size="sm" onClick={() => handleReply(t)}>
                            <Send className="size-3.5" />
                            ارسال
                          </Button>
                        </div>
                      )}

                      {t.status !== "closed" && (
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/10 text-emerald-100/60 hover:bg-white/5"
                            onClick={() => updateTicketStatus({ ticketId: t._id, status: "closed" })}
                          >
                            <Lock className="size-3.5" />
                            بستن تیکت
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {visible.length === 0 && (
            <Card className="border-white/5 bg-white/[0.02]">
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                <LifeBuoy className="size-8 text-emerald-100/25" />
                <p className="text-sm text-emerald-100/50">
                  {filter === "all" ? "تیکتی در صف نیست." : "در این وضعیت تیکتی نیست."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center font-mono text-[10px] text-emerald-100/30">
          <MessageSquare className="size-3" />
          پاسخ‌ها به‌صورت لحظه‌ای برای دانشجو نمایش داده می‌شوند
        </p>
          </>
        )}
      </main>
    </div>
  );
}

// ── My profile ──────────────────────────────────────────────────────────────
function SupportProfileView() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-emerald-100">پروفایل من</h2>
        <p className="mt-1 text-sm text-emerald-100/50">
          عکس، نام و معرفی کوتاه خود را ثبت کنید؛ تغییرات پس از تأیید مدیر سایت اعمال می‌شود.
        </p>
      </div>
      <MemberProfileEditor />
    </div>
  );
}
