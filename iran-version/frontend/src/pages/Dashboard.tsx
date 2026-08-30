import { useAuth } from "../hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export function Dashboard() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">در حال بارگذاری...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">داشبورد</h1>
            <p className="text-slate-400">خوش آمدید، {user.name || user.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700"
          >
            خروج
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "نقش", value: user.role || "user" },
            { label: "ایمیل", value: user.email || "—" },
            { label: "نام", value: user.name || "—" },
            { label: "وضعیت", value: "فعال" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-700 bg-slate-800/50 p-4"
            >
              <p className="text-xs text-slate-400">{item.label}</p>
              <p className="mt-1 text-sm font-medium text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          🧬 Genova Iran v0.1.0 — در حال توسعه
        </p>
      </div>
    </div>
  );
}
