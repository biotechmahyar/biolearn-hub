import { Link } from "react-router-dom";
import { useAuth } from "../hooks/use-auth";

export function Home() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-teal-400">🧬 Genova</h1>
        <p className="mt-2 text-lg text-slate-400">پلتفرم آموزشی علوم زیستی — نسخه ایران</p>
      </div>

      <div className="flex gap-4">
        {user ? (
          <Link
            to="/dashboard"
            className="rounded-lg bg-teal-600 px-6 py-3 text-white transition-colors hover:bg-teal-500"
          >
            ورود به داشبورد
          </Link>
        ) : (
          <Link
            to="/login"
            className="rounded-lg bg-teal-600 px-6 py-3 text-white transition-colors hover:bg-teal-500"
          >
            ورود / ثبت‌نام
          </Link>
        )}
      </div>

      <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
        {["📚 دوره‌ها", "📝 آزمون‌ها", "📖 مقالات"].map((item) => (
          <div
            key={item}
            className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center text-sm text-slate-300"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
