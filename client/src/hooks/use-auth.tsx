import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthContextType {
  isAuthenticated: boolean;
  employee: any;
  token: string | null;
  sessionExpiry: string | null;
  isLoading: boolean;
  login: (token: string, employee: any, expiresAt: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("auth_token")
  );
  const [employee, setEmployee] = useState<any>(null);
  const [sessionExpiry, setSessionExpiry] = useState<string | null>(() =>
    localStorage.getItem("session_expiry")
  );

  // keep a single timer ref for auto-logout
  const logoutTimerRef = useRef<number | null>(null);

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ["/api/auth/session"],
    enabled: !!token, // only try when we believe we're logged in
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSettled: () => {
      // clear timer on any logout completion
      if (logoutTimerRef.current) {
        window.clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
      setToken(null);
      setEmployee(null);
      setSessionExpiry(null);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("session_expiry");
    },
  });

  // Hydrate from /api/auth/session when available
  useEffect(() => {
    if (sessionData && typeof sessionData === "object" && "employee" in sessionData) {
      const nextEmp = (sessionData as any).employee ?? null;
      const nextExp = (sessionData as any).expiresAt ?? null;

      setEmployee((prev: any) => (prev === nextEmp ? prev : nextEmp));
      setSessionExpiry((prev) => {
        if (prev === nextExp) return prev;
        if (nextExp) localStorage.setItem("session_expiry", nextExp);
        return nextExp;
      });
    }
  }, [sessionData]);

  const login = (newToken: string, employeeData: any, expiresAt: string) => {
    setToken(newToken);
    setEmployee(employeeData);
    setSessionExpiry(expiresAt);
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("session_expiry", expiresAt);
  };

  const logout = () => logoutMutation.mutate();

  // Schedule a single auto-logout exactly at expiry
  useEffect(() => {
    // clear any existing timer first
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }

    if (!token || !sessionExpiry) return;

    const expiryTime = new Date(sessionExpiry).getTime();
    if (!Number.isFinite(expiryTime)) return;

    const delay = expiryTime - Date.now();

    // only schedule future timeouts; do NOT force immediate logout here.
    // Let the /api/auth/session query inform us if we're already invalid.
    if (delay > 0) {
      logoutTimerRef.current = window.setTimeout(() => {
        logout();
      }, delay);
    }
    // if delay <= 0, do nothing here; session query will 401 and the UI will show Login.

    return () => {
      if (logoutTimerRef.current) {
        window.clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };
  }, [token, sessionExpiry]); // key fix: no “instant compare-and-logout” anymore

  // Clean up stale expiry if token disappears
  useEffect(() => {
    if (!token && sessionExpiry) {
      localStorage.removeItem("session_expiry");
      setSessionExpiry(null);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated: !!token && !!employee,
      employee,
      token,
      sessionExpiry,
      isLoading,
      login,
      logout,
    }),
    [token, employee, sessionExpiry, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
