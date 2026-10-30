"use client";

import {
  useCallback,
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/api/axios";
import { UserDTO } from "@/api/types";
import CompleteProfileForm from "@/components/auth/CompleteProfileForm";
import { currentReturnTo } from "@/lib/authRedirect";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
} from "@/config/authStorage";

export interface AuthContextType {
  isAuthenticated: boolean | null;
  user: UserDTO | null;
  handleLogout: (redirectTo?: string) => void;
  refreshUserData: () => Promise<void>;
  completeHelpTour: (tourKey: string, version: number) => Promise<void>;
  dismissHelpTourPrompt: (tourKey: string, version: number) => Promise<void>;
}

// Create the context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<UserDTO | null>(null);
  const router = useRouter();

  const refreshUserData = useCallback(async () => {
    try {
      const response = await apiClient.get<UserDTO>("/api/v1/user/me");
      setIsAuthenticated(true);
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  }, []);

  const completeHelpTour = useCallback(
    async (tourKey: string, version: number) => {
      const response = await apiClient.put<UserDTO>(
        `/api/v1/user/me/help-tours/${encodeURIComponent(tourKey)}/complete`,
        { version }
      );
      setUser(response.data);
    },
    []
  );

  const dismissHelpTourPrompt = useCallback(
    async (tourKey: string, version: number) => {
      const response = await apiClient.put<UserDTO>(
        `/api/v1/user/me/help-tours/${encodeURIComponent(tourKey)}/dismiss-prompt`,
        { version }
      );
      setUser(response.data);
    },
    []
  );

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (token && refreshToken) {
      refreshUserData();
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [refreshUserData]);

  const handleLogout = useCallback((redirectTo = "/") => {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    setIsAuthenticated(false);
    setUser(null);
    router.push(redirectTo);
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        handleLogout,
        refreshUserData,
        completeHelpTour,
        dismissHelpTourPrompt,
      }}
    >
      {user?.passwordChangeRequired ? (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <ChangePasswordForm required onSuccess={() => handleLogout(`/login?status=password-changed&returnTo=${encodeURIComponent(currentReturnTo())}`)} />
            <button type="button" onClick={() => handleLogout("/login")}
              className="mt-5 w-full text-sm font-medium text-slate-600 hover:text-slate-900">
              Sign out
            </button>
          </div>
        </div>
      ) : user?.profileCompletionRequired ? (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
            <CompleteProfileForm onSuccess={refreshUserData} />
            <button className="mt-5 text-sm" onClick={() => handleLogout(`/login?returnTo=${encodeURIComponent(currentReturnTo())}`)}>Sign out</button>
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
