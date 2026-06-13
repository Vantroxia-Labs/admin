import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authApi, type TokenClaims, type LoginPayload } from "../lib/api";
import { setAccessToken } from "../lib/apiClient";
import { USE_MOCK, MOCK_USER } from "../lib/mockData";

export interface AuthUser {
  userId: string;
  businessId?: string;
  NRStName?: string;
  lastName?: string;
  email?: string;
  roles: string[];
  permissions: string[];
  isAegisUser: boolean;
  aegisRole?: string;
  subscriptionTier?: string; // "SaaS" | "SFTP" | "ApiOnly"
  mustChangePassword: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<{ mustChangePassword: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const claimsToUser = (claims: TokenClaims, userId: string, mustChangePassword: boolean): AuthUser => ({
  userId,
  businessId: claims.businessId,
  NRStName: claims.NRStName,
  lastName: claims.lastName,
  email: claims.email,
  roles: claims.roles ?? [],
  permissions: claims.permissions ?? [],
  isAegisUser: claims.isAegisUser,
  aegisRole: claims.aegisRole,
  subscriptionTier: claims.subscriptionTier,
  mustChangePassword,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, try to restore session via cookie-based token-claims
  useEffect(() => {
    if (USE_MOCK) {
      setUser(MOCK_USER);
      setIsLoading(false);
      return;
    }
    const restoreSession = async () => {
      try {
        // Try refresh NRSt to get a new access token using the cookie
        const refreshed = await authApi.refresh();
        if (refreshed.accessToken) {
          setAccessToken(refreshed.accessToken);
          const claims = await authApi.tokenClaims();
          setUser(claimsToUser(claims, "", false));
        }
      } catch {
        // No valid session
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (_payload: LoginPayload) => {
    if (USE_MOCK) {
      setUser(MOCK_USER);
      return { mustChangePassword: false };
    }
    const result = await authApi.login(_payload);
    setAccessToken(result.accessToken);
    const u = claimsToUser(result.claims, result.userId, result.mustChangePassword);
    setUser(u);
    return { mustChangePassword: result.mustChangePassword };
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const claims = await authApi.tokenClaims();
      setUser(prev => prev ? claimsToUser(claims, prev.userId, false) : null);
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// Convenience role helpers
// eslint-disable-next-line react-refresh/only-export-components
export const useIsAegis = () => {
  const { user } = useAuth();
  return user?.isAegisUser === true || user?.roles.includes("Aegis") === true;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useIsAdmin = () => {
  const { user } = useAuth();
  return user?.roles.includes("Admin") === true;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useIsUser = () => {
  const { user } = useAuth();
  return user?.roles.includes("User") === true;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCanCreateInvoice = () => {
  const { user } = useAuth();
  if (!user) return false;
  // Portal (SaaS) plan can create invoices on portal
  // SFTP and API plans cannot
  if (user.subscriptionTier === "SFTP" || user.subscriptionTier === "ApiOnly") return false;
  return true;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSubscriptionTier = () => {
  const { user } = useAuth();
  return user?.subscriptionTier ?? null;
};
