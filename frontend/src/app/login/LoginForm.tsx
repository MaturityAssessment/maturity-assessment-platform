"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
} from "@/config/authStorage";

interface LoginFormProps {
  registrationSubmitted?: boolean;
}

export default function LoginForm({
  registrationSubmitted = false,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { refreshUserData } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
      }>("/api/v1/auth/login", {
        email,
        password,
      });

      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, response.data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.data.refreshToken);

      await refreshUserData();

      router.push("/dashboard");
    } catch (error: any) {
      if (error.errorCode === "ACCOUNT_PENDING_APPROVAL") {
        setError(
          "Your access request was submitted. Admins will review it before approving your login."
        );
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 flex items-center justify-center p-6 rounded-lg border border-gray-200">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        {registrationSubmitted && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md px-4 py-3">
            Your access request was submitted. Admins will review it and approve
            your account if eligible.
          </div>
        )}
        <form
          className="mt-8 flex flex-col gap-6"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@organization.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white"
            />
          </div>

          {error && (
            <div role="alert" className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>

          <p className="text-center text-sm text-gray-700">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
