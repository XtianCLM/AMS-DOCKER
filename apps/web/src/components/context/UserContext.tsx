


"use client";

import api from "@/lib/axios";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type User = {
  id: number;
  username: string;
  email?: string | null;
  roles: string[];

  branch?: {
    branchCode: string;
    companyName?: string | null;
    location?: string | null;
  } | null;

  permissions: string[];

  agent?: {
    id: string;
    fullName: string;
    agentCode: string;
    level: string;
    status: string;
    accountType: string;
    email?: string | null;
    telephone?: string | null;
  } | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  setUser: (
    user: User | null
  ) => void;
  logout: () => Promise<void>;
  hasRole: (
    role: string
  ) => boolean;
  refreshUser: () => Promise<User | null>;
  hasPermission: (
    permission: string
  ) => boolean;
};

const AuthContext =
  createContext<AuthContextType | null>(
    null
  );

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    user,
    setUser,
  ] = useState<User | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const refreshUser =
    useCallback(
      async (): Promise<User | null> => {
        try {
          const response =
            await api.get<User>(
              "/auth/me"
            );

          setUser(
            response.data
          );

          return response.data;
        } catch {
          setUser(null);

          return null;
        }
      },
      []
    );

  useEffect(() => {
    const initializeAuth =
      async () => {
        try {
          await refreshUser();
        } finally {
          setLoading(false);
        }
      };

    void initializeAuth();
  }, [
    refreshUser,
  ]);

  const logout =
    async () => {
      try {
        await api.post(
          "/auth/logout"
        );
      } finally {
        setUser(null);

        window.location.replace(
          "/login"
        );
      }
    };

  const hasRole = (
    role: string
  ) =>
    user?.roles?.includes(
      role
    ) ?? false;

  const hasPermission = (
    permission: string
  ) =>
    user?.permissions?.includes(
      permission
    ) ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
        logout,
        hasRole,
        refreshUser,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};
