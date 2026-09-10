"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, PageLoading } from "@/components";
import { useAuth } from "@/context";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated === null) {
    return <PageLoading message="Loading..." />;
  }

  if (isAuthenticated) {
    return <PageLoading message="Redirecting..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Maturity Assessment Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Assess and improve your organization&apos;s maturity in any domain using CMMI principles.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">Register</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
