/**
 * useAuth hook — provides authentication state and actions.
 *
 * Now backed by the JWT auth provider instead of Convex Auth.
 * Compatible with existing components that use useAuth().
 * signIn accepts both:
 *   - signIn(email, password) — new JWT form
 *   - signIn(method, data) — backward compat with Convex Auth form
 */

import { useAuthContext } from "@/lib/auth-provider";

// Backward-compatible signIn that handles both new and old Convex Auth patterns
type SignInFn = (
  emailOrMethod: string,
  passwordOrData?: string | FormData | Record<string, unknown>,
) => Promise<any>;

export function useAuth() {
  const { isLoading, isAuthenticated, user, signIn: rawSignIn, signUp: rawSignUp, signOut } = useAuthContext();

  const signIn: SignInFn = async (emailOrMethod, passwordOrData?) => {
    // New pattern: signIn("user@example.com", "password123")
    if (typeof passwordOrData === "string") {
      return rawSignIn(emailOrMethod, passwordOrData);
    }

    // Old Convex Auth patterns — extract email+password and delegate
    if (passwordOrData instanceof FormData) {
      const email = passwordOrData.get("email") as string;
      const password = passwordOrData.get("password") as string;

      if (emailOrMethod === "password" && email && password) {
        return rawSignIn(email, password);
      }

      // email-otp or other methods — use OTP flow via REST
      if (emailOrMethod === "email-otp" && email) {
        // Check if we have an OTP code (second form submission)
        const code = passwordOrData.get("code") as string | null;
        if (code) {
          // Verify OTP
          const res = await fetch("/api/auth/otp/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code }),
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "OTP verification failed");
          return data.data;
        } else {
          // Send OTP
          const res = await fetch("/api/auth/otp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "OTP send failed");
          return { ok: true };
        }
      }

      // Fallback: try as email+password if both available
      if (email && password) {
        return rawSignIn(email, password);
      }
    }

    // Old Convex Auth: signIn("google", { email, name, picture })
    // Old Convex Auth: signIn("anonymous")
    // These don't have a direct REST equivalent — throw descriptive error
    if (emailOrMethod === "anonymous") {
      throw new Error("ورود مهمان پشتیبانی نمی‌شود. لطفاً با ایمیل وارد شوید.");
    }
    if (emailOrMethod === "google") {
      throw new Error("ورود با گوگل پشتیبانی نمی‌شود. لطفاً با ایمیل و رمز عبور وارد شوید.");
    }

    throw new Error(`روش ورود پشتیبانی نمی‌شود: ${emailOrMethod}`);
  };

  const signUp = async (name: string, email: string, password: string) => {
    return rawSignUp(name, email, password);
  };

  return { isLoading, isAuthenticated, user, signIn, signUp, signOut };
}
