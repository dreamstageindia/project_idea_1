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
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  points: number;
  employeeId?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  employee: Employee | null;
  token: string | null;
  sessionExpiry: string | null;
  isLoading: boolean;
  isInitializing: boolean;
  login: (token: string, employee: Employee, expiresAt: string) => void;
  logout: () => void;
  refreshEmployee: () => Promise<void>;
  isNewUser?: boolean;
}

interface SessionResponse {
  employee: Employee;
  expiresAt: string;
  isNewUser?: boolean;
}

interface LoginResponse {
  token: string;
  employee: Employee;
  expiresAt: string;
  isNewUser?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("auth_token")
  );
  const [employee, setEmployee] = useState<Employee | null>(() => {
    const stored = localStorage.getItem("auth_employee");
    return stored ? JSON.parse(stored) : null;
  });
  const [sessionExpiry, setSessionExpiry] = useState<string | null>(() =>
    localStorage.getItem("session_expiry")
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const [isNewUser, setIsNewUser] = useState<boolean>(() => {
    const stored = localStorage.getItem("is_new_user");
    return stored === "true";
  });

  const { toast } = useToast();

  // keep a single timer ref for auto-logout
  const logoutTimerRef = useRef<number | null>(null);

  const { 
    data: sessionData, 
    isLoading: isSessionLoading,
    error: sessionError,
    refetch: refetchSession 
  } = useQuery<SessionResponse>({
    queryKey: ["/api/auth/session"],
    enabled: !!token, // only try when we believe we're logged in
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (token) {
        await apiRequest("POST", "/api/auth/logout", {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
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
      setIsNewUser(false);
      
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_employee");
      localStorage.removeItem("session_expiry");
      localStorage.removeItem("is_new_user");
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error) => {
      console.error("Logout error:", error);
      // Still clear local state even if API call fails
      setToken(null);
      setEmployee(null);
      setSessionExpiry(null);
      setIsNewUser(false);
      
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_employee");
      localStorage.removeItem("session_expiry");
      localStorage.removeItem("is_new_user");
    },
  });

  // Handle session initialization and errors
  useEffect(() => {
    const initializeAuth = async () => {
      setIsInitializing(true);
      
      // If we have a token but session query failed (401), log out
      if (token && sessionError) {
        console.log("Session invalid, logging out...");
        logout();
      }
      
      setIsInitializing(false);
    };

    initializeAuth();
  }, [token, sessionError]);

  // Hydrate from /api/auth/session when available
  useEffect(() => {
    if (sessionData) {
      const nextEmp = sessionData.employee ?? null;
      const nextExp = sessionData.expiresAt ?? null;
      const nextIsNewUser = sessionData.isNewUser ?? false;

      setEmployee((prev: Employee | null) => {
        if (JSON.stringify(prev) === JSON.stringify(nextEmp)) return prev;
        if (nextEmp) localStorage.setItem("auth_employee", JSON.stringify(nextEmp));
        return nextEmp;
      });
      
      setSessionExpiry((prev) => {
        if (prev === nextExp) return prev;
        if (nextExp) localStorage.setItem("session_expiry", nextExp);
        return nextExp;
      });
      
      setIsNewUser(nextIsNewUser);
      if (nextIsNewUser) {
        localStorage.setItem("is_new_user", "true");
      }
    }
  }, [sessionData]);

  const login = (newToken: string, employeeData: Employee, expiresAt: string, isNewUser: boolean = false) => {
    setToken(newToken);
    setEmployee(employeeData);
    setSessionExpiry(expiresAt);
    setIsNewUser(isNewUser);
    
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("auth_employee", JSON.stringify(employeeData));
    localStorage.setItem("session_expiry", expiresAt);
    localStorage.setItem("is_new_user", isNewUser.toString());
    
    toast({
      title: "Login Successful",
      description: isNewUser 
        ? `Welcome ${employeeData.firstName}! Your account has been created.`
        : `Welcome back, ${employeeData.firstName}!`,
    });
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  const refreshEmployee = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest("GET", "/api/auth/session", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.employee) {
          setEmployee(data.employee);
          localStorage.setItem("auth_employee", JSON.stringify(data.employee));
          
          // Update points in toast if they changed
          const currentPoints = employee?.points || 0;
          const newPoints = data.employee.points || 0;
          
          if (newPoints !== currentPoints) {
            toast({
              title: "Points Updated",
              description: `Your points balance is now ${newPoints}`,
              duration: 3000,
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to refresh employee:", error);
    }
  };

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
        console.log("Auto-logout due to session expiry");
        logout();
      }, delay);
      
      // Show warning 5 minutes before expiry
      if (delay > 5 * 60 * 1000) {
        const warningDelay = delay - 5 * 60 * 1000;
        setTimeout(() => {
          toast({
            title: "Session Expiring Soon",
            description: "Your session will expire in 5 minutes. Please save your work.",
            variant: "destructive",
            duration: 10000,
          });
        }, warningDelay);
      }
    }
    // if delay <= 0, do nothing here; session query will 401 and the UI will show Login.

    return () => {
      if (logoutTimerRef.current) {
        window.clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };
  }, [token, sessionExpiry]);

  // Clean up stale data if token disappears
  useEffect(() => {
    if (!token) {
      if (employee) setEmployee(null);
      if (sessionExpiry) {
        localStorage.removeItem("session_expiry");
        setSessionExpiry(null);
      }
      if (isNewUser) {
        localStorage.removeItem("is_new_user");
        setIsNewUser(false);
      }
    }
  }, [token]);

  // Handle window focus to refresh session
  useEffect(() => {
    const handleFocus = () => {
      if (token && employee && !isSessionLoading) {
        refetchSession();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [token, employee, isSessionLoading, refetchSession]);

  // Handle beforeunload to clean up
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (logoutTimerRef.current) {
        window.clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated: !!token && !!employee,
      employee,
      token,
      sessionExpiry,
      isLoading: isSessionLoading || isInitializing,
      isInitializing,
      login,
      logout,
      refreshEmployee,
      isNewUser,
    }),
    [token, employee, sessionExpiry, isSessionLoading, isInitializing, isNewUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

// Helper hook for checking auth in components
export function useRequireAuth() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      logout();
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, logout, setLocation]);

  return { isAuthenticated, isLoading };
}

// Helper hook for protected routes
export function useProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  return { isAuthenticated, isLoading };
}

// Custom hook for checking domain authorization
export function useDomainAuth() {
  const [domainStatus, setDomainStatus] = useState<{
    isWhitelisted: boolean;
    domain: any;
    isLoading: boolean;
    checked: boolean;
  }>({
    isWhitelisted: false,
    domain: null,
    isLoading: false,
    checked: false,
  });

  const checkDomain = async (email: string) => {
    const emailDomain = email.split('@')[1];
    if (!emailDomain) {
      setDomainStatus({
        isWhitelisted: false,
        domain: null,
        isLoading: false,
        checked: false,
      });
      return;
    }

    setDomainStatus((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`/api/auth/check-domain/${emailDomain}`);
      if (response.ok) {
        const data = await response.json();
        setDomainStatus({
          isWhitelisted: data.isWhitelisted,
          domain: data.domain,
          isLoading: false,
          checked: true,
        });
      }
    } catch (error) {
      setDomainStatus({
        isWhitelisted: false,
        domain: null,
        isLoading: false,
        checked: true,
      });
    }
  };

  return { domainStatus, checkDomain };
}