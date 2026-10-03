"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import logoIcon from "../../../images/map-logo-icon.png";

interface TopNavbarWithTabsProps {
  title: ReactNode;
  subtitle?: string;
  rightActions?: ReactNode;
  tabs: ReactNode;
  tabsLabel: string;
}

export default function TopNavbarWithTabs({
  title,
  subtitle,
  rightActions,
  tabs,
  tabsLabel,
}: TopNavbarWithTabsProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 pt-5 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src={logoIcon}
              alt="Maturity Assessment Platform"
              className="h-10 w-10 shrink-0 object-contain"
              priority
            />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
                {title}
              </p>
              {subtitle && (
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {rightActions}
        </div>
        <nav
          className="flex gap-7 overflow-x-auto"
          aria-label={tabsLabel}
          role="tablist"
        >
          {tabs}
        </nav>
      </div>
    </header>
  );
}
