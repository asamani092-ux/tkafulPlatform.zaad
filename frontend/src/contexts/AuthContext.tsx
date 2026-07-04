import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { API_BASE_URL } from "../config";

interface User {
  name: string;
  email: string;
  // الأدوار الموحّدة عبر المنصّة (تكافل + تنفيذية + كفالات السقيا)
  role: string;
}

interface AuthContextType {
  user: User | null;
  access: string | null;
  refresh: string | null;
  login: (userData: User, access: string, refresh: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const USER_KEY = "takaful_user";

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    const storedAccess = localStorage.getItem(ACCESS_KEY);
    const storedRefresh = localStorage.getItem(REFRESH_KEY);

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }

    if (storedAccess) setAccess(storedAccess);
    if (storedRefresh) setRefresh(storedRefresh);
  }, []);

  const login = (userData: User, accessToken: string, refreshToken: string) => {
    setUser(userData);
    setAccess(accessToken);
    setRefresh(refreshToken);

    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  };

  const logout = async () => {
    const storedRefresh = localStorage.getItem(REFRESH_KEY);
    const storedAccess = localStorage.getItem(ACCESS_KEY);

    if (storedRefresh) {
      try {
        await fetch(`${API_BASE_URL}/api/accounts/logout/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(storedAccess ? { Authorization: `Bearer ${storedAccess}` } : {}),
          },
          body: JSON.stringify({ refresh: storedRefresh }),
        });
      } catch {
        // still clear local session
      }
    }

    setUser(null);
    setAccess(null);
    setRefresh(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  };

  const value: AuthContextType = {
    user,
    access,
    refresh,
    login,
    logout,
    isAuthenticated: !!access,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
