import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";

/**
 * Simple data-fetching hook.
 * Returns undefined while loading (matches Convex useQuery semantics).
 */
export function useApi<T>(path: string | null): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!path) {
      setData(undefined);
      return;
    }
    let cancelled = false;
    apiGet<T>(path).then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return data;
}
