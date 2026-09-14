import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useLocation } from "react-router";
import { lazy, Suspense } from "react";

const DemoPreview = lazy(() => import("./DemoPreview.tsx"));

export default function NotFound() {
  const location = useLocation();
  const path = location.pathname.replace(/^\//, "").split("/")[0] ?? "";

  // Check if this path matches a demo slug
  const demo = useQuery(
    api.siteDemos.getBySlug,
    path ? { slug: path } : "skip"
  );

  // If a demo exists for this path, render it
  if (demo !== undefined && demo !== null) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <DemoPreview />
      </Suspense>
    );
  }

  // Still loading — show spinner
  if (demo === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Real 404
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        🧪
      </span>
      <p className="mt-6 text-5xl font-black tracking-tight">۴۰۴</p>
      <h1 className="mt-2 text-xl font-extrabold">این صفحه در آزمایشگاه پیدا نشد!</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        آدرس واردشده وجود ندارد یا به صفحهٔ دیگری منتقل شده است.
      </p>
    </div>
  );
}
