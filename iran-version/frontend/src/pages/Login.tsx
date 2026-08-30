import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/use-auth";
import { toast } from "sonner";

export function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      toast.success("ورود موفق");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "خطا در ورود");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
        <h2 className="mb-6 text-center text-2xl font-bold text-teal-400">
          {mode === "login" ? "ورود" : "ثبت‌نام"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <input
              type="text"
              placeholder="نام"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
              required
            />
          )}
          <input
            type="email"
            placeholder="ایمیل"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="رمز عبور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-teal-600 py-3 text-white transition-colors hover:bg-teal-500 disabled:opacity-50"
          >
            {busy ? "در حال پردازش..." : mode === "login" ? "ورود" : "ثبت‌نام"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          {mode === "login" ? "حساب ندارید؟" : "حساب دارید؟"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-teal-400 hover:underline"
          >
            {mode === "login" ? "ثبت‌نام" : "ورود"}
          </button>
        </p>
      </div>
    </div>
  );
}
