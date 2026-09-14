import { useMemo, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Blocks,
  BookOpen,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  Lock,
  ShoppingBag,
  Star,
  Users,
  Calendar,
  AlertTriangle,
} from "lucide-react";

/** Build CSS custom properties from a demo theme object. */
function themeVars(theme: Record<string, string> | null | undefined): React.CSSProperties {
  if (!theme) return {};
  return {
    "--demo-primary": theme.primary ?? "#14b8a6",
    "--demo-secondary": theme.secondary ?? "#0ea5e9",
    "--demo-accent": theme.accent ?? "#a855f7",
    "--demo-bg": theme.background ?? "#0b1120",
    "--demo-surface": theme.surface ?? "#111827",
    "--demo-text": theme.text ?? "#f9fafb",
    "--demo-text-muted": theme.textMuted ?? "#9ca3af",
    "--demo-radius": theme.borderRadius ?? "0.75rem",
  } as React.CSSProperties;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Demo Banner ────────────────────────────────────────────────────────────

function DemoBanner({ demoName }: { demoName: string }) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Blocks className="size-4 text-amber-500" />
        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
          DEMO PREVIEW — {demoName}
        </span>
        <Badge variant="outline" className="border-amber-500/30 text-[9px] text-amber-600 dark:text-amber-400">
          فقط نمایش
        </Badge>
      </div>
      <Button asChild size="sm" variant="outline" className="h-6 gap-1 text-[10px]">
        <Link to="/admin">
          <LayoutDashboard className="size-3" />
          بازگشت به پنل مدیریت
        </Link>
      </Button>
    </div>
  );
}

// ── Themed wrapper ─────────────────────────────────────────────────────────

function DemoShell({
  demo,
  children,
}: {
  demo: { name: string; slug: string; theme: Record<string, string> | null };
  children: React.ReactNode;
}) {
  const vars = themeVars(demo.theme);
  const primary = demo.theme?.primary ?? "#14b8a6";
  const secondary = demo.theme?.secondary ?? "#0ea5e9";
  const bg = demo.theme?.background ?? "#0b1120";
  const surface = demo.theme?.surface ?? "#111827";
  const text = demo.theme?.text ?? "#f9fafb";
  const muted = demo.theme?.textMuted ?? "#9ca3af";
  const radius = demo.theme?.borderRadius ?? "0.75rem";

  return (
    <div
      className="min-h-screen font-[Vazirmatn,system-ui,sans-serif]"
      style={{
        ...vars,
        backgroundColor: bg,
        color: text,
        borderRadius: 0,
      }}
    >
      <DemoBanner demoName={demo.name} />
      <DemoNav demo={demo} primary={primary} surface={surface} text={text} />
      <main>{children}</main>
      <DemoFooter demo={demo} primary={primary} bg={bg} text={text} muted={muted} />
    </div>
  );
}

// ── Nav ────────────────────────────────────────────────────────────────────

function DemoNav({
  demo,
  primary,
  surface,
  text,
}: {
  demo: { slug: string };
  primary: string;
  surface: string;
  text: string;
}) {
  const navItems = [
    { label: "خانه", path: `/demo/${demo.slug}` },
    { label: "دوره‌ها", path: `/demo/${demo.slug}/courses` },
    { label: "مقالات", path: `/demo/${demo.slug}/articles` },
    { label: "کارگاه‌ها", path: `/demo/${demo.slug}/workshops` },
    { label: "محصولات", path: `/demo/${demo.slug}/products` },
    { label: "مدرسان", path: `/demo/${demo.slug}/instructors` },
    { label: "دیکشنری", path: `/demo/${demo.slug}/dictionary` },
  ];
  return (
    <nav
      className="flex items-center gap-4 border-b px-6 py-3"
      style={{
        backgroundColor: surface,
        borderColor: `${primary}20`,
        color: text,
      }}
    >
      <Link
        to={`/demo/${demo.slug}`}
        className="flex items-center gap-2 text-sm font-extrabold"
        style={{ color: primary }}
      >
        <Blocks className="size-4" />
        Genova Demo
      </Link>
      <div className="mr-auto flex gap-1 overflow-x-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="rounded-full px-3 py-1 text-xs font-medium transition-colors hover:bg-white/10"
          >
            {item.label}
          </Link>
        ))}
      </div>
      <Link
        to={`/demo/${demo.slug}/auth`}
        className="rounded-full px-3 py-1 text-xs font-bold text-white"
        style={{ backgroundColor: primary }}
      >
        ورود
      </Link>
    </nav>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────

function DemoFooter({
  demo,
  primary,
  bg,
  text,
  muted,
}: {
  demo: { slug: string };
  primary: string;
  bg: string;
  text: string;
  muted: string;
}) {
  return (
    <footer
      className="border-t px-6 py-8 text-center"
      style={{ backgroundColor: bg, borderColor: `${primary}20`, color: muted }}
    >
      <p className="text-xs">
        این یک نسخه آزمایشی (Demo) از سایت Genova است.
      </p>
      <p className="mt-1 text-[10px] opacity-50">
        DEMO PREVIEW • {demo.slug}
      </p>
    </footer>
  );
}

// ── Sub-page: Home ─────────────────────────────────────────────────────────

function DemoHome({ demo }: { demo: { slug: string; theme: Record<string, string> | null; name: string } }) {
  const categories = useQuery(api.content.listCategories);
  const courses = useQuery(api.content.listCourses, {});
  const instructors = useQuery(api.content.listInstructors);
  const articles = useQuery(api.content.listArticles, {});
  const workshops = useQuery(api.content.listWorkshops);

  const primary = demo.theme?.primary ?? "#14b8a6";
  const secondary = demo.theme?.secondary ?? "#0ea5e9";
  const surface = demo.theme?.surface ?? "#111827";
  const text = demo.theme?.text ?? "#f9fafb";

  return (
    <div className="space-y-16 px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="mx-auto max-w-4xl text-center">
        <h1
          className="text-3xl font-extrabold leading-tight sm:text-5xl"
          style={{ color: text }}
        >
          پلتفرم تخصصی علوم زیستی
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          Genova — اکوسیستم آموزشی برای دانشجویان علوم زیستی
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            className="gap-2 text-white"
            style={{ backgroundColor: primary }}
            asChild
          >
            <Link to={`/demo/${demo.slug}/courses`}>
              <BookOpen className="size-4" />
              مشاهده دوره‌ها
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/demo/${demo.slug}/auth`}>
              <Lock className="size-4 ml-1.5" />
              شروع یادگیری
            </Link>
          </Button>
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="mx-auto max-w-6xl">
          <h2 className="mb-6 text-center text-lg font-bold">دسته‌بندی‌های آموزشی</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.slice(0, 8).map((cat: { _id: string; name: string; slug: string; icon: string }) => (
              <Card
                key={cat._id}
                className="transition-all hover:shadow-md"
                style={{ backgroundColor: surface, borderColor: `${primary}20` }}
              >
                <CardContent className="flex flex-col items-center gap-2 py-5 text-center">
                  <span className="text-2xl">🧬</span>
                  <span className="text-xs font-bold">{cat.name}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Popular Courses */}
      {courses && courses.length > 0 && (
        <section className="mx-auto max-w-6xl">
          <h2 className="mb-6 text-center text-lg font-bold">دوره‌های محبوب</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 6).map(
              (c: {
                _id: string;
                title: string;
                slug: string;
                summary: string;
                price: number;
                rating: number;
                studentsCount: number;
                instructorId: string;
              }) => (
                <Link
                  key={c._id}
                  to={`/demo/${demo.slug}/courses/${c.slug}`}
                >
                  <Card
                    className="transition-all hover:shadow-lg"
                    style={{ backgroundColor: surface, borderColor: `${primary}20` }}
                  >
                    <div
                      className="h-24 w-full rounded-t-lg"
                      style={{ background: `linear-gradient(135deg, ${primary}30, ${secondary}30)` }}
                    />
                    <CardHeader className="pb-1">
                      <CardTitle className="text-sm">{c.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{c.summary}</p>
                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 text-amber-400">
                          <Star className="size-3" />
                          {c.rating}
                        </span>
                        <span className="text-muted-foreground">{c.studentsCount} دانشجو</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            )}
          </div>
        </section>
      )}

      {/* Articles */}
      {articles && articles.length > 0 && (
        <section className="mx-auto max-w-6xl">
          <h2 className="mb-6 text-center text-lg font-bold">مقالات رایگان</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.slice(0, 3).map(
              (a: { _id: string; title: string; slug: string; excerpt: string; readTime: number }) => (
                <Link
                  key={a._id}
                  to={`/demo/${demo.slug}/articles/${a.slug}`}
                >
                  <Card
                    className="transition-all hover:shadow-md"
                    style={{ backgroundColor: surface, borderColor: `${primary}20` }}
                  >
                    <CardContent className="py-4">
                      <h3 className="text-sm font-bold">{a.title}</h3>
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{a.excerpt}</p>
                      <p className="mt-2 text-[10px] text-muted-foreground">{a.readTime} دقیقه مطالعه</p>
                    </CardContent>
                  </Card>
                </Link>
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-page: Courses ──────────────────────────────────────────────────────

function DemoCourses({ demo }: { demo: { slug: string; theme: Record<string, string> | null } }) {
  const courses = useQuery(api.content.listCourses, {});
  const primary = demo.theme?.primary ?? "#14b8a6";
  const secondary = demo.theme?.secondary ?? "#0ea5e9";
  const surface = demo.theme?.surface ?? "#111827";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-extrabold">تمام دوره‌ها</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses?.map(
          (c: {
            _id: string;
            title: string;
            slug: string;
            summary: string;
            price: number;
            rating: number;
            studentsCount: number;
          }) => (
            <Link key={c._id} to={`/demo/${demo.slug}/courses/${c.slug}`}>
              <Card
                className="transition-all hover:shadow-lg"
                style={{ backgroundColor: surface, borderColor: `${primary}20` }}
              >
                <div
                  className="h-20 w-full rounded-t-lg"
                  style={{ background: `linear-gradient(135deg, ${primary}30, ${secondary}30)` }}
                />
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm">{c.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{c.summary}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Star className="size-3" /> {c.rating}
                    </span>
                    <span className="font-bold" style={{ color: primary }}>
                      {c.price > 0 ? `${c.price.toLocaleString("fa-IR")} تومان` : "رایگان"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        )}
      </div>
    </div>
  );
}

// ── Sub-page: Course Detail ────────────────────────────────────────────────

function DemoCourseDetail({
  demo,
  courseSlug,
}: {
  demo: { slug: string; theme: Record<string, string> | null };
  courseSlug: string;
}) {
  const courses = useQuery(api.content.listCourses, {});
  const primary = demo.theme?.primary ?? "#14b8a6";
  const surface = demo.theme?.surface ?? "#111827";
  const course = courses?.find(
    (c: { slug: string }) => c.slug === courseSlug
  );

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BookOpen className="mb-4 size-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">دوره یافت نشد</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        to={`/demo/${demo.slug}/courses`}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-3" />
        بازگشت به دوره‌ها
      </Link>
      <div
        className="h-40 w-full rounded-lg"
        style={{ background: `linear-gradient(135deg, ${primary}30, ${demo.theme?.secondary ?? "#0ea5e9"}30)` }}
      />
      <h1 className="mt-4 text-xl font-extrabold">{course.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{course.summary}</p>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Star className="size-3 text-amber-400" /> {course.rating}
        </span>
        <span>{course.studentsCount} دانشجو</span>
        <span>{course.durationText}</span>
      </div>
      <div
        className="mt-6 rounded-lg border p-4"
        style={{ backgroundColor: surface, borderColor: `${primary}20` }}
      >
        <p className="text-xs text-muted-foreground">
          این بخش در حالت Demo فقط نمایشی است. برای مشاهده محتوای واقعی، به سایت اصلی مراجعه کنید.
        </p>
      </div>
    </div>
  );
}

// ── Sub-page: Articles ─────────────────────────────────────────────────────

function DemoArticles({ demo }: { demo: { slug: string; theme: Record<string, string> | null } }) {
  const articles = useQuery(api.content.listArticles, {});
  const primary = demo.theme?.primary ?? "#14b8a6";
  const surface = demo.theme?.surface ?? "#111827";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-extrabold">مقالات رایگان</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles?.map(
          (a: { _id: string; title: string; slug: string; excerpt: string; readTime: number; category: string }) => (
            <Link key={a._id} to={`/demo/${demo.slug}/articles/${a.slug}`}>
              <Card
                className="transition-all hover:shadow-md"
                style={{ backgroundColor: surface, borderColor: `${primary}20` }}
              >
                <CardContent className="py-4">
                  <Badge variant="outline" className="mb-2 text-[9px]">{a.category}</Badge>
                  <h3 className="text-sm font-bold">{a.title}</h3>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{a.excerpt}</p>
                  <p className="mt-2 text-[10px] text-muted-foreground">{a.readTime} دقیقه</p>
                </CardContent>
              </Card>
            </Link>
          )
        )}
      </div>
    </div>
  );
}

// ── Sub-page: Article Detail ───────────────────────────────────────────────

function DemoArticleDetail({
  demo,
  articleSlug,
}: {
  demo: { slug: string; theme: Record<string, string> | null };
  articleSlug: string;
}) {
  const articles = useQuery(api.content.listArticles, {});
  const primary = demo.theme?.primary ?? "#14b8a6";
  const article = articles?.find((a: { slug: string }) => a.slug === articleSlug);

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <FileText className="mb-4 size-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">مقاله یافت نشد</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        to={`/demo/${demo.slug}/articles`}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-3" />
        بازگشت به مقالات
      </Link>
      <h1 className="text-xl font-extrabold">{article.title}</h1>
      {article.subtitle && (
        <p className="mt-2 text-sm text-muted-foreground">{article.subtitle}</p>
      )}
      <div className="mt-4 flex gap-3 text-xs text-muted-foreground">
        <span>{article.authorName}</span>
        <span>{article.readTime} دقیقه مطالعه</span>
      </div>
      <div
        className="prose prose-invert mt-6 max-w-none text-sm leading-7"
        style={{ color: "inherit" }}
        dangerouslySetInnerHTML={{ __html: article.body }}
      />
    </div>
  );
}

// ── Sub-page: Workshops ────────────────────────────────────────────────────

function DemoWorkshops({ demo }: { demo: { slug: string; theme: Record<string, string> | null } }) {
  const workshops = useQuery(api.content.listWorkshops);
  const primary = demo.theme?.primary ?? "#14b8a6";
  const surface = demo.theme?.surface ?? "#111827";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-extrabold">کارگاه‌ها</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workshops?.map(
          (w: {
            _id: string;
            title: string;
            slug: string;
            topic: string;
            date: string;
            time: string;
            price: number;
            free: boolean;
          }) => (
            <Card
              key={w._id}
              className="transition-all hover:shadow-md"
              style={{ backgroundColor: surface, borderColor: `${primary}20` }}
            >
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">{w.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{w.topic}</p>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="size-3" />
                    {w.date}
                  </span>
                  <span className="font-bold" style={{ color: primary }}>
                    {w.free ? "رایگان" : `${w.price.toLocaleString("fa-IR")} تومان`}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}

// ── Sub-page: Products ─────────────────────────────────────────────────────

function DemoProducts({ demo }: { demo: { slug: string; theme: Record<string, string> | null } }) {
  const products = useQuery(api.content.listProducts, {});
  const primary = demo.theme?.primary ?? "#14b8a6";
  const surface = demo.theme?.surface ?? "#111827";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-extrabold">محصولات آموزشی</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products?.map(
          (p: {
            _id: string;
            title: string;
            slug: string;
            description: string;
            price: number;
            type: string;
          }) => (
            <Card
              key={p._id}
              className="transition-all hover:shadow-md"
              style={{ backgroundColor: surface, borderColor: `${primary}20` }}
            >
              <CardContent className="py-4">
                <Badge variant="outline" className="mb-2 text-[9px]">{p.type}</Badge>
                <h3 className="text-sm font-bold">{p.title}</h3>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                <p className="mt-3 text-xs font-bold" style={{ color: primary }}>
                  {p.price.toLocaleString("fa-IR")} تومان
                </p>
              </CardContent>
            </Card>
          )
        )}
        {products && products.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
            <ShoppingBag className="mx-auto mb-4 size-12 text-muted-foreground/30" />
            هنوز محصولی اضافه نشده
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-page: Instructors ──────────────────────────────────────────────────

function DemoInstructors({ demo }: { demo: { slug: string; theme: Record<string, string> | null } }) {
  const instructors = useQuery(api.content.listInstructors);
  const primary = demo.theme?.primary ?? "#14b8a6";
  const surface = demo.theme?.surface ?? "#111827";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-extrabold">مدرسان</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {instructors?.map(
          (i: {
            _id: string;
            name: string;
            slug: string;
            title: string;
            specialties: string[];
          }) => (
            <Card
              key={i._id}
              className="transition-all hover:shadow-md"
              style={{ backgroundColor: surface, borderColor: `${primary}20` }}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div
                  className="flex size-12 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: primary }}
                >
                  {i.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold">{i.name}</h3>
                  <p className="text-xs text-muted-foreground">{i.title}</p>
                  {i.specialties.length > 0 && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {i.specialties.slice(0, 3).join(" • ")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}

// ── Sub-page: Dictionary ───────────────────────────────────────────────────

function DemoDictionary({ demo }: { demo: { slug: string; theme: Record<string, string> | null } }) {
  const terms = useQuery(api.content.searchDictionary, {});
  const primary = demo.theme?.primary ?? "#14b8a6";
  const surface = demo.theme?.surface ?? "#111827";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-extrabold">دیکشنری تخصصی</h1>
      <div className="space-y-3">
        {terms?.slice(0, 20).map(
          (t: { _id: string; term: string; fullName: string; gramStatus: string; shape: string }) => (
            <Card
              key={t._id}
              style={{ backgroundColor: surface, borderColor: `${primary}20` }}
            >
              <CardContent className="py-3">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-bold" dir="ltr">{t.term}</h3>
                  <span className="text-xs text-muted-foreground">{t.fullName}</span>
                </div>
                <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                  <span>گرم: {t.gramStatus}</span>
                  <span>شکل: {t.shape}</span>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}

// ── Sub-page: Auth (demo/mock) ─────────────────────────────────────────────

function DemoAuth({ demo }: { demo: { slug: string; theme: Record<string, string> | null } }) {
  const primary = demo.theme?.primary ?? "#14b8a6";
  const surface = demo.theme?.surface ?? "#111827";

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card
        className="w-full max-w-md"
        style={{ backgroundColor: surface, borderColor: `${primary}20` }}
      >
        <CardHeader className="text-center">
          <CardTitle className="text-lg font-extrabold">ورود به Genova</CardTitle>
          <p className="text-xs text-muted-foreground">
            این صفحه فقط نمایشی است. عملیات احراز هویت انجام نمی‌شود.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center text-xs text-amber-600 dark:text-amber-400">
            <Lock className="mx-auto mb-1 size-4" />
            حالت Demo — اینجا فقط ظاهر صفحه نمایش داده می‌شود
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">ایمیل</label>
            <div
              className="h-10 w-full rounded-lg border bg-white/5 px-3 text-sm text-muted-foreground"
              style={{ borderColor: `${primary}30` }}
            >
              demo@example.com
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">رمز عبور</label>
            <div
              className="h-10 w-full rounded-lg border bg-white/5 px-3 text-sm text-muted-foreground"
              style={{ borderColor: `${primary}30` }}
            >
              ••••••••
            </div>
          </div>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold text-white"
            style={{ backgroundColor: primary }}
            type="button"
            onClick={() => {}}
          >
            <Lock className="size-4" />
            ورود (Demo)
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-page: 404 ──────────────────────────────────────────────────────────

function DemoNotFound({ demo }: { demo: { slug: string } }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="mb-4 size-16 text-muted-foreground/20" />
      <h1 className="text-4xl font-extrabold">۴۰۴</h1>
      <p className="mt-2 text-sm text-muted-foreground">صفحه مورد نظر یافت نشد</p>
      <Button asChild variant="outline" className="mt-6">
        <Link to={`/demo/${demo.slug}`}>بازگشت به صفحه اصلی دمو</Link>
      </Button>
    </div>
  );
}

// ── Main Demo Preview Router ───────────────────────────────────────────────

export default function DemoPreview() {
  const { demoSlug, "*": subPath } = useParams();
  const location = useLocation();

  const demo = useQuery(
    api.siteDemos.getBySlug,
    demoSlug ? { slug: demoSlug } : "skip"
  );

  // If no demo found, show 404
  if (demo === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <Blocks className="mx-auto mb-4 size-12 text-muted-foreground/30" />
          <p className="text-sm font-bold">دمو یافت نشد</p>
          <p className="mt-1 text-xs text-muted-foreground">Slug: /{demoSlug}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">بازگشت به سایت</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (demo === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const theme = demo.theme as Record<string, string> | null;

  // Parse sub-route
  const segments = (subPath ?? "").split("/").filter(Boolean);
  const mainSection = segments[0] ?? "home";
  const subParam = segments[1] ?? null;

  const renderPage = () => {
    switch (mainSection) {
      case "home":
      case "":
        return <DemoHome demo={{ ...demo, theme }} />;
      case "auth":
        return <DemoAuth demo={{ ...demo, theme }} />;
      case "courses":
        if (subParam) {
          return <DemoCourseDetail demo={{ ...demo, theme }} courseSlug={subParam} />;
        }
        return <DemoCourses demo={{ ...demo, theme }} />;
      case "articles":
        if (subParam) {
          return <DemoArticleDetail demo={{ ...demo, theme }} articleSlug={subParam} />;
        }
        return <DemoArticles demo={{ ...demo, theme }} />;
      case "workshops":
        return <DemoWorkshops demo={{ ...demo, theme }} />;
      case "products":
        return <DemoProducts demo={{ ...demo, theme }} />;
      case "instructors":
        return <DemoInstructors demo={{ ...demo, theme }} />;
      case "dictionary":
        return <DemoDictionary demo={{ ...demo, theme }} />;
      default:
        return <DemoNotFound demo={demo} />;
    }
  };

  return (
    <>
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <title>DEMO: {demo.name}</title>
      </head>
      <DemoShell demo={{ ...demo, theme }}>
        {renderPage()}
      </DemoShell>
    </>
  );
}
