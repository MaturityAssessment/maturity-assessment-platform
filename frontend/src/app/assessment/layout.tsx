"use client";

import { Suspense } from "react";
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
  return <AssessmentFlow key={search.get("campaignToken") || search.get("draftId") || "none"} />;
}
