/**
 * Mini App — Mentor / student extras + admin tab
 * ─────────────────────────────────────────────────────────────────────────────
 * These screens keep the functionality the Mini App already had, but on top of
 * the shared UI atoms and with correct server data:
 *   • mentor.askMentor / listMentorQuestions        → ask & follow my questions
 *   • mentor.answerMentorQuestion                    → mentors answer
 *   • mentor.listSessions                            → my 1:1 sessions
 *   • collab.listMentorGroups / joinGroup            → mentoring groups
 *   • telegramMiniAppAuth.miniApp*                   → admin summary (admins only)
 *   • profiles.approveProfile / rejectProfile        → admin approvals
 */
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  MessageCircle,
  Send,
  ShieldCheck,
  Users,
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
  StatTile,
} from "./ui";

// ── My questions ────────────────────────────────────────────────────────────

export function QuestionsScreen({ onBack }: { onBack: () => void }) {
  const questions = useQuery(api.mentor.listMentorQuestions, {});
  const askMentor = useMutation(api.mentor.askMentor);

  const [text, setText] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (text.trim().length < 5 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await askMentor({ text: text.trim(), topic: topic.trim() || "عمومی" });
      setText("");
      setTopic("");
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت سؤال");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-4">
      <ScreenHeader title="سؤالات من" onBack={onBack} />

      <MiniCard>
        <p className="text-xs font-semibold">پرسیدن سؤال از منتور</p>
        <input
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="موضوع (مثلاً میکروبشناسی)"
          className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-xs"
        />
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setSent(false);
          }}
          rows={3}
          placeholder="سؤال خود را کامل بنویسید…"
          className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-xs"
        />
        <MiniButton
          className="mt-2 w-full"
          disabled={busy || text.trim().length < 5}
          onClick={submit}
        >
          <Send className="size-3" />
          {busy ? "در حال ارسال…" : "ارسال به منتور"}
        </MiniButton>
        {error ? <p className="mt-2 text-[11px] text-destructive">{error}</p> : null}
        {sent ? (
          <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
            سؤال ثبت شد — پس از پاسخ منتور در همین صفحه و اعلانها میبینید.
          </p>
        ) : null}
      </MiniCard>

      <SectionTitle title="تاریخچه سؤالات" />
      {questions === undefined ? (
        <MiniLoading />
      ) : questions.length === 0 ? (
        <MiniEmpty icon={ClipboardList} title="هنوز سؤالی نپرسیدهای" />
      ) : (
        <div className="space-y-2">
          {questions.map((question) => (
            <MiniCard key={question._id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-5">{question.text}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {question.topic} · {formatDateTime(question.createdAt)}
                  </p>
                </div>
                <Chip tone={question.status === "answered" ? "success" : "warn"}>
                  {question.status === "answered" ? "پاسخ داده شده" : "در انتظار"}
                </Chip>
              </div>
              {question.answer ? (
                <div className="mt-2 rounded-xl bg-teal-50 px-3 py-2 text-[11px] leading-5 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
                  <p className="mb-0.5 font-semibold">
                    پاسخ {question.answeredByName ? `· ${question.answeredByName}` : "منتور"}
                  </p>
                  <p className="whitespace-pre-wrap">{question.answer}</p>
                </div>
              ) : null}
            </MiniCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ── My sessions ─────────────────────────────────────────────────────────────

export function SessionsScreen({ onBack }: { onBack: () => void }) {
  const sessions = useQuery(api.mentor.listSessions, {});

  const upcoming = (sessions ?? []).filter((s) => s.status === "scheduled");
  const others = (sessions ?? []).filter((s) => s.status !== "scheduled");

  type SessionRow = NonNullable<typeof sessions>[number];
  const renderSession = (session: SessionRow) => (
    <MiniCard key={session._id}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-1 text-xs font-semibold">{session.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="size-3" />
            {session.date} · {session.time}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            منتور: {session.mentorName}
          </p>
          {session.notes ? (
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{session.notes}</p>
          ) : null}
        </div>
        <Chip
          tone={
            session.status === "scheduled"
              ? "info"
              : session.status === "done"
                ? "success"
                : "danger"
          }
        >
          {session.status === "scheduled"
            ? "برنامهریزی شده"
            : session.status === "done"
              ? "برگزار شد"
              : "لغو شده"}
        </Chip>
      </div>
    </MiniCard>
  );

  return (
    <div className="pb-4">
      <ScreenHeader title="جلسات من" onBack={onBack} />

      {sessions === undefined ? (
        <MiniLoading />
      ) : sessions.length === 0 ? (
        <MiniEmpty
          icon={Calendar}
          title="جلسهای ثبت نشده"
          description="برای درخواست جلسه از دکمه «جلسات» در ربات تلگرام/بله استفاده کنید."
        />
      ) : (
        <>
          {upcoming.length > 0 ? (
            <>
              <SectionTitle title="جلسات آینده" />
              <div className="space-y-2">{upcoming.map(renderSession)}</div>
            </>
          ) : null}
          {others.length > 0 ? (
            <>
              <SectionTitle title="سایر جلسات" />
              <div className="space-y-2">{others.map(renderSession)}</div>
            </>
          ) : null}
        </>
      )}

      <p className="mt-4 flex items-center gap-1 rounded-xl bg-muted px-3 py-2 text-[10px] text-muted-foreground">
        <Clock className="size-3" />
        درخواست جلسه جدید از طریق ربات پیامرسان (تلگرام یا بله) ثبت میشود.
      </p>
    </div>
  );
}

// ── Mentoring groups ────────────────────────────────────────────────────────

export function GroupsScreen({ onBack }: { onBack: () => void }) {
  const groups = useQuery(api.collab.listMentorGroups, {});
  const joinGroup = useMutation(api.collab.joinGroup);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const join = async (groupId: string) => {
    setBusyId(groupId);
    setError(null);
    try {
      await joinGroup({ groupId: groupId as never });
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در عضویت");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pb-4">
      <ScreenHeader title="گروههای منتورینگ" onBack={onBack} />

      {error ? (
        <p className="mb-2 rounded-xl bg-destructive/10 px-3 py-2 text-center text-[11px] text-destructive">
          {error}
        </p>
      ) : null}

      {groups === undefined ? (
        <MiniLoading />
      ) : groups.length === 0 ? (
        <MiniEmpty icon={Users} title="گروهی فعال نیست" />
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const full = group.memberCount >= group.capacity;
            return (
              <MiniCard key={group._id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{group.title}</p>
                    <p className="mt-0.5 text-[10px] leading-5 text-muted-foreground">
                      {group.description}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      منتور: {group.mentorName} · {group.meetingDay} {group.meetingTime}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      ظرفیت: {faNum(group.memberCount)} از {faNum(group.capacity)}
                    </p>
                  </div>
                  <MiniButton
                    variant="outline"
                    disabled={full || busyId === group._id}
                    onClick={() => join(group._id)}
                  >
                    {full ? "تکمیل" : busyId === group._id ? "…" : "عضویت"}
                  </MiniButton>
                </div>
              </MiniCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Admin summary (admins only) ─────────────────────────────────────────────

export function AdminScreen({ onBack }: { onBack: () => void }) {
  const stats = useQuery(api.telegramMiniAppAuth.miniAppAdminStats, {});
  const openQuestions = useQuery(api.telegramMiniAppAuth.miniAppOpenQuestions, {});
  const pendingProfiles = useQuery(api.telegramMiniAppAuth.miniAppPendingProfiles, {});
  const approveProfile = useMutation(api.profiles.approveProfile);
  const rejectProfile = useMutation(api.profiles.rejectProfile);
  const answerQuestion = useMutation(api.mentor.answerMentorQuestion);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در انجام عملیات");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pb-4">
      <ScreenHeader title="مدیریت" onBack={onBack} />

      {error ? (
        <p className="mb-2 rounded-xl bg-destructive/10 px-3 py-2 text-center text-[11px] text-destructive">
          {error}
        </p>
      ) : null}

      {stats === undefined ? (
        <MiniLoading />
      ) : !stats ? null : (
        <div className="grid grid-cols-2 gap-2">
          <StatTile value={faNum(stats.users)} label="کاربر" />
          <StatTile value={faNum(stats.courses)} label="دوره" tone="sky" />
          <StatTile value={faNum(stats.openQuestions)} label="سؤال باز" tone="amber" />
          <StatTile value={faNum(stats.pendingProfiles)} label="پروفایل در انتظار" tone="violet" />
        </div>
      )}

      <SectionTitle title="تأیید پروفایلها" />
      {pendingProfiles === undefined ? (
        <MiniLoading />
      ) : pendingProfiles.length === 0 ? (
        <MiniEmpty icon={ShieldCheck} title="پروفایلی در انتظار تأیید نیست" />
      ) : (
        <div className="space-y-2">
          {pendingProfiles.map((profile) => (
            <MiniCard key={profile._id}>
              <p className="text-xs font-semibold">{profile.name ?? "کاربر"}</p>
              <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                {profile.pendingFirstName ?? ""} {profile.pendingLastName ?? ""}
                {profile.pendingAbout ? ` — ${profile.pendingAbout}` : ""}
              </p>
              <div className="mt-2 flex gap-2">
                <MiniButton
                  disabled={busyId === profile._id}
                  onClick={() =>
                    run(profile._id, () => approveProfile({ userId: profile._id as never }))
                  }
                >
                  <CheckCircle2 className="size-3" />
                  تأیید
                </MiniButton>
                <MiniButton
                  variant="outline"
                  disabled={busyId === profile._id}
                  onClick={() =>
                    run(profile._id, () => rejectProfile({ userId: profile._id as never }))
                  }
                >
                  رد
                </MiniButton>
              </div>
            </MiniCard>
          ))}
        </div>
      )}

      <SectionTitle title="سؤالات باز دانشجویان" />
      {openQuestions === undefined ? (
        <MiniLoading />
      ) : openQuestions.length === 0 ? (
        <MiniEmpty icon={MessageCircle} title="سؤال بازی وجود ندارد" />
      ) : (
        <div className="space-y-2">
          {openQuestions.map((question) => (
            <MiniCard key={question._id}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium leading-5">{question.text}</p>
                <Chip>{question.topic ?? "عمومی"}</Chip>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                — {question.studentName ?? "دانشجو"}
              </p>
              <div className="mt-2 flex items-end gap-2">
                <textarea
                  rows={2}
                  value={answers[question._id] ?? ""}
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [question._id]: event.target.value }))
                  }
                  placeholder="پاسخ کوتاه…"
                  className="flex-1 rounded-xl border bg-background px-3 py-2 text-xs"
                />
                <MiniButton
                  disabled={busyId === question._id || !(answers[question._id] ?? "").trim()}
                  onClick={() =>
                    run(question._id, async () => {
                      await answerQuestion({
                        questionId: question._id as never,
                        answer: (answers[question._id] ?? "").trim(),
                      });
                      setAnswers((prev) => ({ ...prev, [question._id]: "" }));
                    })
                  }
                >
                  ارسال
                </MiniButton>
              </div>
            </MiniCard>
          ))}
        </div>
      )}

      {openQuestions?.length === 0 && pendingProfiles?.length === 0 ? (
        <p
          className={cn(
            "mt-4 flex items-center justify-center gap-1 rounded-xl bg-muted px-3 py-3 text-[11px] text-muted-foreground",
          )}
        >
          <AlertCircle className="size-3" />
          همهچیز مرتب است ✅
        </p>
      ) : null}
    </div>
  );
}
