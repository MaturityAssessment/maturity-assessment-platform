"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";

export default function ChangePasswordPage() {
  const { isAuthenticated, user, handleLogout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated === false) router.replace("/login");
  }, [isAuthenticated, router]);

  if (!user) return <p className="p-8 text-slate-600">Loading account...</p>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ChangePasswordForm onSuccess={() => handleLogout("/login?status=password-changed")} />
        <Link href="/dashboard" className="mt-5 block text-center text-sm font-medium text-indigo-600">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
