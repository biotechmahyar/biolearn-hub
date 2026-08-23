import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/PublicLayout";
import { motion } from "framer-motion";
import { FlaskConical } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <PublicLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center"
      >
        <span className="flex size-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <FlaskConical className="size-8" />
        </span>
        <p className="mt-6 text-5xl font-black tracking-tight">۴۰۴</p>
        <h1 className="mt-2 text-xl font-extrabold">این صفحه در آزمایشگاه پیدا نشد!</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          آدرس واردشده وجود ندارد یا به صفحهٔ دیگری منتقل شده است. از صفحهٔ اصلی
          یا دوره‌ها ادامه بده.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild className="rounded-full">
            <Link to="/">بازگشت به خانه</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/courses">دوره‌ها</Link>
          </Button>
        </div>
      </motion.div>
    </PublicLayout>
  );
}
