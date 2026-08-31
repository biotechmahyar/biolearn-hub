import { useState, useEffect, useMemo } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  ChevronLeft,
  ClipboardList,
  Clock,
  FileText,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Settings,
  Trophy,
  Download,
  Bookmark,
  Zap,
  HelpCircle,
  Star,
  Send,
  ArrowLeft,
  Inbox,
  Bell,
} from "lucide-react";
import { Link } from "react-router";
import { faNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function EnrollmentsView() {
  const enrollments = useApiQuery<any[]>("/api/commerce/enrollments/my");
  if (enrollments === undefined) {
    return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold">دوره‌های من</h2>
      {enrollments.length === 0 ? (
        <Card className="border-dashed border-border bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <BookOpen className="size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">هنوز در دوره‌ای ثبت‌نام نکرده‌اید.</p>
            <Button asChild variant="outline" className="mt-4 rounded-full">
              <Link to="/courses">مشاهده دوره‌ها</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {enrollments.map((e: any) => (
            <Card key={e.id} className="border-border/70 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">{e.courseTitle ?? "دوره"}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{faNum(e.progress ?? 0)}٪ پیشرفت</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full">{faNum(e.progress ?? 0)}٪</Badge>
                </div>
                <Progress value={e.progress ?? 0} className="mt-3 h-1.5" />
                <Button asChild variant="outline" size="sm" className="mt-3 w-full rounded-full">
                  <Link to={e.courseSlug ? `/courses/${e.courseSlug}` : "/courses"}>
                    <ArrowLeft className="ml-2 size-3.5" />ادامه دوره
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AttemptsView() {
  const attempts = useApiQuery<any[]>("/api/exams/my-attempts");
  if (attempts === undefined) {
    return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold">آزمون‌های من</h2>
      {attempts.length === 0 ? (
        <Card className="border-dashed border-border bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <ClipboardList className="size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">هنوز آزمونی نداده‌اید.</p>
            <Button asChild variant="outline" className="mt-4 rounded-full">
              <Link to="/tests">آزمون تعیین سطح</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {attempts.map((a: any) => (
            <Card key={a.id} className="border-border/70 shadow-sm">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h3 className="text-sm font-bold">{a.exam?.title ?? "آزمون"}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.finishedAt ? new Date(a.finishedAt).toLocaleDateString("fa-IR") : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={a.percent >= 70 ? "default" : a.percent >= 40 ? "secondary" : "destructive"} className="rounded-full">
                    {faNum(a.percent)}٪
                  </Badge>
                  <Button asChild variant="ghost" size="sm" className="rounded-full">
                    <Link to={`/tests/result/${a.id}`}>مشاهده</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DownloadsView() {
  const downloads = useApiQuery<any[]>("/api/commerce/enrollments/downloads");
  if (downloads === undefined) {
    return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold">دانلودهای من</h2>
      {downloads.length === 0 ? (
        <Card className="border-dashed border-border bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Download className="size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">فایلی برای دانلود ندارید.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {downloads.map((d: any) => (
            <Card key={d.id} className="border-border/70 shadow-sm">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-primary" />
                  <div>
                    <p className="text-sm font-bold">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{d.courseTitle ?? ""}</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <a href={d.url} target="_blank" rel="noopener noreferrer">
                    <Download className="ml-2 size-3.5" />دانلود
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TicketsView() {
  const tickets = useApiQuery<any[]>("/api/tickets/my");
  if (tickets === undefined) {
    return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold">تیکت‌های من</h2>
      {tickets.length === 0 ? (
        <Card className="border-dashed border-border bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <MessageSquare className="size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">تیکتی ندارید.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((t: any) => (
            <Card key={t.id} className="border-border/70 shadow-sm">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-bold">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">{t.status}</p>
                </div>
                <Badge variant={t.status === "open" ? "default" : "secondary"} className="rounded-full">
                  {t.status === "open" ? "باز" : "بسته‌شده"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InboxView() {
  const inbox = useApiQuery<any[]>("/api/notifications/inbox");
  const { mutate: markRead } = useApiMutation<any, any>((args: any) => `/api/notifications/inbox/${args.id}/read`, "POST");
  if (inbox === undefined) {
    return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold">صندوق پیام</h2>
      {inbox.length === 0 ? (
        <Card className="border-dashed border-border bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Inbox className="size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">پیامی ندارید.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {inbox.map((msg: any) => (
            <Card key={msg.id} className={cn("border-border/70 shadow-sm", !msg.read && "border-primary/30 bg-primary/5")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold">{msg.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{msg.body}</p>
                  </div>
                  {!msg.read && (
                    <Button variant="ghost" size="sm" className="shrink-0 text-xs" onClick={() => markRead({ id: msg.id })}>
                      خواندم
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementsView() {
  const anns = useApiQuery<any[]>("/api/notifications/");
  if (anns === undefined) {
    return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold">اطلاعیه‌ها</h2>
      {anns.length === 0 ? (
        <Card className="border-dashed border-border bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Bell className="size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">اطلاعیه‌ای نیست.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {anns.map((a: any) => (
            <Card key={a.id} className="border-border/70 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm font-bold">{a.title}</p>
                {a.body && <p className="mt-1 text-xs text-muted-foreground">{a.body}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-extrabold">پنل دانشجویی</h1>
            <p className="text-sm text-muted-foreground">سلام {user?.name ?? "دانشجو"} 👋</p>
          </div>
        </div>
        <Tabs defaultValue="enrollments" className="mt-8">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="enrollments" className="gap-1.5"><BookOpen className="size-3.5" />دوره‌ها</TabsTrigger>
            <TabsTrigger value="attempts" className="gap-1.5"><ClipboardList className="size-3.5" />آزمون‌ها</TabsTrigger>
            <TabsTrigger value="downloads" className="gap-1.5"><Download className="size-3.5" />دانلودها</TabsTrigger>
            <TabsTrigger value="tickets" className="gap-1.5"><MessageSquare className="size-3.5" />تیکت‌ها</TabsTrigger>
            <TabsTrigger value="inbox" className="gap-1.5"><Inbox className="size-3.5" />پیام‌ها</TabsTrigger>
            <TabsTrigger value="announcements" className="gap-1.5"><Bell className="size-3.5" />اطلاعیه‌ها</TabsTrigger>
          </TabsList>
          <TabsContent value="enrollments" className="mt-6"><EnrollmentsView /></TabsContent>
          <TabsContent value="attempts" className="mt-6"><AttemptsView /></TabsContent>
          <TabsContent value="downloads" className="mt-6"><DownloadsView /></TabsContent>
          <TabsContent value="tickets" className="mt-6"><TicketsView /></TabsContent>
          <TabsContent value="inbox" className="mt-6"><InboxView /></TabsContent>
          <TabsContent value="announcements" className="mt-6"><AnnouncementsView /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
