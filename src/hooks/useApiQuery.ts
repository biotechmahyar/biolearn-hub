import { useState, useEffect, useCallback } from "react";
import { useMode } from "./useMode";
import { api, type ApiResponse } from "@/lib/apiClient";

// Hook for fetching data from Iran server when in iran mode
// When in global mode, returns null so components fall back to their existing Convex query
export function useApiQuery<T = unknown>(
  path: string | null,
  options?: { enabled?: boolean },
): { data: T | null; loading: boolean; error: string | null } {
  const { isIran } = useMode();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shouldFetch = isIran && path && (options?.enabled !== false);

  useEffect(() => {
    if (!shouldFetch) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api.get<T>(path!).then((res: ApiResponse<T>) => {
      if (cancelled) return;
      if (res.ok && res.data !== undefined) {
        setData(res.data);
      } else {
        setError(res.error || "خطا در دریافت داده");
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [shouldFetch, path]);

  return { data, loading, error };
}

// Hook for mutations on Iran server
export function useApiMutation<TArgs = unknown, TResult = unknown>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
) {
  const { isIran } = useMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (args?: TArgs): Promise<ApiResponse<TResult> | null> => {
      if (!isIran) return null;

      setLoading(true);
      setError(null);

      const fn = method === "POST" ? api.post : method === "PUT" ? api.put : method === "PATCH" ? api.patch : api.delete;
      const res = await fn<TResult>(path, args as unknown as Record<string, unknown>);

      if (!res.ok) {
        setError(res.error || "خطا");
      }
      setLoading(false);
      return res;
    },
    [isIran, path, method],
  );

  return { mutate, loading, error };
}
