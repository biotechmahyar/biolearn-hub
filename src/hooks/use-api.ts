/**
 * useApiQuery — fetches data from the Iranian REST API.
 *
 * Returns { data, isLoading, error } matching Convex useQuery semantics.
 * data is `undefined` while loading (not null), matching Convex behavior.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api-client";

export function useApiQuery<T>(
  endpoint: string | null,
  options?: { enabled?: boolean }
): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const enabled = options?.enabled !== false && endpoint !== null;

  useEffect(() => {
    if (!enabled) {
      setData(undefined);
      setIsLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setData(undefined);

    apiClient
      .get<T>(endpoint!, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error(`[useApiQuery] ${endpoint}:`, err);
          setData(undefined);
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [endpoint, enabled]);

  // Return undefined while loading (matches Convex useQuery semantics)
  if (isLoading && data === undefined) return undefined;
  return data;
}

/**
 * useApiMutation — returns a function that calls a mutation endpoint.
 *
 * Returns { mutate, isLoading } matching Convex useMutation semantics.
 */

export function useApiMutation<TArgs, TResult>(
  endpoint: string | ((args: TArgs) => string),
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST"
): {
  mutate: (args: TArgs) => Promise<TResult>;
  isLoading: boolean;
} {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(
    async (args: TArgs): Promise<TResult> => {
      setIsLoading(true);
      try {
        const url = typeof endpoint === "function" ? endpoint(args) : endpoint;
        const result = await apiClient.request<TResult>(url, {
          method,
          body: args,
        } as any);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [endpoint, method]
  );

  return { mutate, isLoading };
}

/**
 * Convenience mutation for simple POST endpoints that don't need the args in the URL.
 */
export function useApiPost<TArgs, TResult>(
  endpoint: string
): { mutate: (args: TArgs) => Promise<TResult>; isLoading: boolean } {
  return useApiMutation<TArgs, TResult>(endpoint, "POST");
}
