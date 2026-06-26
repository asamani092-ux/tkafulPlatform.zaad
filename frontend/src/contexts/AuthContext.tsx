import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface User {
  name: string;
  email: string;
  role: "user" | "admin";
}

interface AuthContextType {
  user: User | null;
  access: string | null;
  refresh: string | null;
  login: (userData: User, access: string, refresh: string) => void;
  logout: () => void;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("takaful_user");
    const storedAccess = localStorage.getItem("accessToken");
    const storedRefresh = localStorage.getItem("refreshToken");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("takaful_user");
      }
    }

    if (storedAccess) setAccess(storedAccess);
    if (storedRefresh) setRefresh(storedRefresh);
  }, []);

  const login = (userData: User, accessToken: string, refreshToken: string) => {
    setUser(userData);
    setAccess(accessToken);
    setRefresh(refreshToken);

    localStorage.setItem("takaful_user", JSON.stringify(userData));
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  };

  const logout = () => {
    setUser(null);
    setAccess(null);
    setRefresh(null);

    localStorage.removeItem("takaful_user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
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
