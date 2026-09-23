import { Link } from "react-router";
import { Construction, ArrowLeft, FlaskConical, Pickaxe } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown when a user clicks the Compute Game banner while the game is
 * disabled from the admin panel (siteSettings key: game.enabled).
 * Route: /game/disabled
 */
export default function GameDisabled() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060b18] flex items-center justify-center px-4">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.14),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(99,102,241,0.12),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="relative w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl border border-sky-400/30 bg-gradient-to-br from-sky-500/20 to-indigo-600/20 shadow-lg shadow-sky-900/30">
          <Construction className="size-9 text-sky-300" />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[11px] font-bold text-sky-300">
          <Pickaxe className="size-3.5" />
          Genova Compute Game
        </span>

        <h1 className="mt-4 text-2xl font-black text-white sm:text-3xl">
          این بخش در حال توسعه است
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-300/90">
          پروژه بازی بلاکچین ژنوا هم‌اکنون در دست توسعه است و به‌زودی در دسترس
          قرار می‌گیرد. می‌توانید تا آن زمان از آزمایشگاه مجازی ژنوا استفاده
          کنید.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            className="gap-2 rounded-full bg-gradient-to-l from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-900/40 hover:from-sky-400 hover:to-blue-500"
          >
            <Link to="/">
              بازگشت به صفحه اصلی
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="gap-2 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            <Link to="/lab">
              <FlaskConical className="size-4" />
              آزمایشگاه مجازی ژنوا
            </Link>
          </Button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <FlaskConical className="size-3.5 text-violet-400" />
          <span>محاسبه کن، ماین کن، معامله کن — به‌زودی</span>
          <Pickaxe className="size-3.5 text-sky-400" />
        </div>
      </div>
    </div>
  );
}
