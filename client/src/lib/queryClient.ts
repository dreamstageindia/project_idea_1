// src/lib/queryClient.ts
import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function readErrorMessage(res: Response): Promise<string> {
  // Try JSON first (many APIs return { message })
  try {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await res.json().catch(() => null);
      if (data && typeof data === "object") {
        const msg =
          (data as any).message ||
          (data as any).error ||
          (data as any).details ||
          JSON.stringify(data);
        return String(msg);
      }
    }
  } catch {
    // ignore
  }

  // Fallback to text
  try {
    const text = await res.text();
    if (text) return text;
  } catch {
    // ignore
  }

  return res.statusText || "Request failed";
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const msg = await readErrorMessage(res);
    throw new Error(`${res.status}: ${msg}`);
  }
}

function getToken(): string | null {
  try {
    return localStorage.getItem("auth_token");
  } catch {
    return null;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

/** Default queryFn that includes Authorization if present. */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401 }) =>
  async ({ queryKey }) => {
    const token = getToken();
    const url = String(queryKey[0]);

    const res = await fetch(url, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (on401 === "returnNull" && res.status === 401) {
      return null as unknown as T;
    }

    await throwIfResNotOk(res);
    return (await res.json()) as T;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
