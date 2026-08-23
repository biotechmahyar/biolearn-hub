import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { accent, faNum, formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowLeft, CalendarDays, Clock, Users } from "lucide-react";
import { Link } from "react-router";
import { InstructorAvatar } from "./InstructorAvatar";

type Workshop = {
  _id: string;
  title: string;
  slug: string;
  topic: string;
  date: string;
  time: string;
  capacity: number;
  registeredCount: number;
  price: number;
  free: boolean;
  expertTalk: boolean;
  instructor?: { name: string; accent: string } | null;
};

export function WorkshopCard({ workshop }: { workshop: Workshop }) {
  const a = accent(workshop.instructor?.accent);
  const fill = Math.min(100, Math.round((workshop.registeredCount / Math.max(1, workshop.capacity)) * 100));

  return (
    <Card className="group overflow-hidden border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className={cn("rounded-full ring-1", a.chip)}>
            {workshop.topic}
          </Badge>
          {workshop.expertTalk && (
            <Badge className="border-0 bg-emerald-500/10 text-emerald-700">نشست رایگان</Badge>
          )}
        </div>
        <h3 className="mt-3 text-[15px] font-bold leading-6">{workshop.title}</h3>

        {workshop.instructor && (
          <div className="mt-3 flex items-center gap-2.5">
            <InstructorAvatar name={workshop.instructor.name} accent={workshop.instructor.accent} className="size-8 text-xs" />
            <span className="text-sm font-medium">{workshop.instructor.name}</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {formatDate(workshop.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            ساعت {workshop.time}
          </span>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Users className="size-3.5" />
              ظرفیت
            </span>
            <span className="font-medium">
              {faNum(workshop.registeredCount)} / {faNum(workshop.capacity)} نفر
            </span>
          </div>
          <Progress value={fill} className="h-1.5" />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
          <span className="text-[15px] font-extrabold">
            {workshop.free || workshop.price === 0 ? (
              <span className="text-emerald-600">رایگان</span>
            ) : (
              formatPrice(workshop.price)
            )}
          </span>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to={`/workshops/${workshop.slug}`}>
              ثبت‌نام
              <ArrowLeft className="mr-1.5 size-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
