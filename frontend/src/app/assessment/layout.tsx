"use client";

import { usePathname } from "next/navigation";
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

  return <AssessmentFlow />;
}
