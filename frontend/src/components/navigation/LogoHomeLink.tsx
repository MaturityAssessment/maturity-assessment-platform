"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface LogoHomeLinkProps {
  children: ReactNode;
  className?: string;
  beforeNavigateHome?: () => Promise<boolean>;
}

export default function LogoHomeLink({
  children,
  className = "",
  beforeNavigateHome,
}: LogoHomeLinkProps) {
  const router = useRouter();
  const navigating = useRef(false);

  const handleClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (!beforeNavigateHome || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    if (navigating.current) return;
    navigating.current = true;
    try {
      if (await beforeNavigateHome()) router.push("/dashboard");
    } finally {
      navigating.current = false;
    }
  };

  return (
    <Link
      href="/dashboard"
      aria-label="Go to home"
      title="Go to home"
      className={`shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${className}`}
      // Page-owned saving takes precedence over document-level link guards.
      data-navigation-guard={beforeNavigateHome ? "page" : undefined}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
