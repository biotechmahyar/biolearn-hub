import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, GraduationCap } from "lucide-react";
import { faNum } from "@/lib/format";
import { toast } from "sonner";

export function AdminEduManagement() {
  const enrollments = useQuery(api.admin.adminListEnrollments) ?? [];
  const classRooms = useQuery(api.admin.adminListClassRooms) ?? [];
  const workshops = useQuery(api.admin.adminListWorkshops) ?? [];
  const users = useQuery(api.admin.adminListUsers) ?? [];
  const [activeTab, setActiveTab] = useState<"courses" | "classes" | "workshops">("courses");

  const userMap = useMemo(() => {
    const m = new Map<string, any>();
    users.forEach((u: any) => m.set(u._id, u));
    return m;
  }, [users]);

  const courseData = useMemo(() => {
    return enrollments.map((e: any) => {
      const user = userMap.get(e.userId);
      return {
        "شناسه": e._id,
        "تلفن همراه": user?.phone || "—",
        "نام": user?.firstName || user?.name?.split(" ")[0] || "—",
        "نام خانوادگی": user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "—",
        "نام کاربری": user?.email?.split("@")[0] || "—",
        "ایمیل": user?.email || "—",
        "نقش": e.packageTier || "—",
        "درس‌ها": e.targetTitle || "—",
        "وضعیت": "فعال",
      };
    });
  }, [enrollments, userMap]);

  const classData = useMemo(() => {
    return classRooms.map((c: any) => {
      const instructor = userMap.get(c.instructorId);
      return {
        "شناسه": c._id,
        "تلفن همراه": instructor?.phone || "—",
        "نام": c.instructorName?.split(" ")[0] || "—",
        "نام خانوادگی": c.instructorName?.split(" ").slice(1).join(" ") || "—",
        "نام کاربری": instructor?.email?.split("@")[0] || "—",
        "ایمیل": instructor?.email || "—",
        "درس‌ها": c.title,
        "وضعیت": c.status === "live" ? "زنده" : c.status === "scheduled" ? "زمان‌بندی شده" : "پایان‌یافته",
        "توضیحات": c.topic || "—",
      };
    });
  }, [classRooms, userMap]);

  const workshopData = useMemo(() => {
    return workshops.map((w: any) => {
      const instructor = userMap.get(w.instructorId);
      return {
        "شناسه": w._id,
        "تلفن همراه": instructor?.phone || "—",
        "نام": instructor?.name?.split(" ")[0] || "—",
        "نام خانوادگی": instructor?.name?.split(" ").slice(1).join(" ") || "—",
        "نام کاربری": instructor?.email?.split("@")[0] || "—",
        "ایمیل": instructor?.email || "—",
        "درس‌ها": w.title,
        "وضعیت": w.published ? "منتشر" : "پیش‌نویس",
        "توضیحات": w.topic || "—",
      };
    });
  }, [workshops, userMap]);

  function downloadExcel(data: any[], filename: string) {
    if (data.length === 0) {
      toast.error("داده‌ای برای دانلود وجود ندارد.");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
      { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "edu");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success(`فایل ${filename}.xlsx دانلود شد.`);
  }

  const currentData = activeTab === "courses" ? courseData : activeTab === "classes" ? classData : workshopData;
  const currentFilename = activeTab === "courses" ? "edu-courses" : activeTab === "classes" ? "edu-classes" : "edu-workshops";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" />
            مدیریت آموزش
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            مشاهده و دانلود اطلاعات دوره‌ها، کلاس‌ها و کارگاه‌ها
          </p>
        </div>
        <Button onClick={() => downloadExcel(currentData, currentFilename)} className="gap-2" size="sm">
          <Download className="size-4" />
          دانلود اکسل ({faNum(currentData.length)})
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="courses">دوره‌ها ({faNum(courseData.length)})</TabsTrigger>
          <TabsTrigger value="classes">کلاس‌ها ({faNum(classData.length)})</TabsTrigger>
          <TabsTrigger value="workshops">کارگاه‌ها ({faNum(workshopData.length)})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>شناسه</TableHead>
                  <TableHead>تلفن همراه</TableHead>
                  <TableHead>نام</TableHead>
                  <TableHead>نام خانوادگی</TableHead>
                  <TableHead>نام کاربری</TableHead>
                  <TableHead>ایمیل</TableHead>
                  <TableHead>{activeTab === "courses" ? "پکیج" : "درس‌ها"}</TableHead>
                  <TableHead>{activeTab === "courses" ? "تکمیل" : "وضعیت"}</TableHead>
                  <TableHead>{activeTab === "courses" ? "وضعیت" : "توضیحات"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      داده‌ای یافت نشد.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((row: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">{row["شناسه"]}</TableCell>
                      <TableCell className="text-xs" dir="ltr">{row["تلفن همراه"]}</TableCell>
                      <TableCell className="text-xs">{row["نام"]}</TableCell>
                      <TableCell className="text-xs">{row["نام خانوادگی"]}</TableCell>
                      <TableCell className="text-xs">{row["نام کاربری"]}</TableCell>
                      <TableCell className="text-xs" dir="ltr">{row["ایمیل"]}</TableCell>
                      <TableCell className="text-xs">{row["درس‌ها"]}</TableCell>
                      <TableCell className="text-xs">{row["وضعیت"]}</TableCell>
                      <TableCell className="text-xs">{row["توضیحات"]}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
