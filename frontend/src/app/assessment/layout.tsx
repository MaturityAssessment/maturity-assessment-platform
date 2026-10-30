"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import AssessmentFlow from "./AssessmentFlow";

export default function AssessmentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  if (
    pathname === "/assessment/setup" ||
    pathname.startsWith("/assessment/setup/")
  ) {
    return children;
  }

  return <Suspense fallback={<p className="p-8">Loading assessment...</p>}><AssessmentSession /></Suspense>;
}

function AssessmentSession() {
  const search = useSearchParams();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const campaignId = search.get("campaignId");
  useEffect(() => {
    if (campaignId && isAuthenticated === false) {
      router.replace(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [campaignId, isAuthenticated, router]);
  if (search.has("campaignToken")) return <p className="p-8">This invitation is no longer valid. Request a new campaign invitation.</p>;
  if (campaignId && !isAuthenticated) return <p className="p-8">Sign in to open your campaign assessment...</p>;
  return <AssessmentFlow key={search.get("campaignId") || search.get("draftId") || "none"} />;
}
