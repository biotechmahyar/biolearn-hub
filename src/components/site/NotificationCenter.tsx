import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

type ReminderRow = (typeof api.notifications.refreshReminders)["_returnType"][number];

// Browser notifications need explicit permission. We ask only when the user
// acts on it (e.g. pressing "یادآوری آزمون بعدی"), never on page load.
export function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return Promise.resolve(false);
  }
  if (Notification.permission === "granted") return Promise.resolve(true);
  if (Notification.permission === "denied") return Promise.resolve(false);
  return Notification.requestPermission().then((p) => p === "granted");
}

function showBrowserNotification(reminder: ReminderRow) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(reminder.title, {
      body: reminder.body,
      icon: "/logo.svg",
      tag: `genova-${reminder._id}`,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = reminder.link;
      n.close();
    };
  } catch {
    // some browsers restrict Notification in iframes — fall back to toast
  }
}

// Mounted once in the app. When a user is signed in it computes due reminders
// (fresh exams, course nudges), shows each one (browser + in-app toast) and
// marks it as shown — every reminder appears up to two times.
export function NotificationCenter() {
  const { isAuthenticated, isLoading } = useAuth();
  const refresh = useMutation(api.notifications.refreshReminders);
  const markShown = useMutation(api.notifications.markReminderShown);
  const inFlightRef = useRef(false);

  const run = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const reminders = await refresh();
      for (const r of reminders) {
        if (r.kind === "exam_next") continue; // marker, not a notification
        showBrowserNotification(r);
        toast(r.title, {
          description: r.body,
          action: {
            label: "مشاهده",
            onClick: () => {
              window.location.href = r.link;
            },
          },
          duration: 8000,
        });
        await markShown({ id: r._id });
      }
    } catch {
      // reminder refresh is best-effort
    } finally {
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    void run();
    const t = setInterval(() => void run(), 5 * 60 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated]);

  return null;
}
