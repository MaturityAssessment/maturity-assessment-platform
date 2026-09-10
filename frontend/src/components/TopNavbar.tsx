"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import logoIcon from "../../images/map-logo-icon.png";
import UserMenu from "./UserMenu";

interface TopNavbarProps {
  title: React.ReactNode;
  subtitle?: string;
  rightActions?: React.ReactNode;
  backButton?: {
    href: string;
    label?: string;
  };
  showUserMenu?: boolean;
  showNavigationMenu?: boolean;
  sticky?: boolean;
}

export default function TopNavbar({
  title,
  subtitle,
  rightActions,
  backButton,
  showUserMenu = true,
  sticky = false,
}: TopNavbarProps) {
  return (
    <header
      className={`shrink-0 border-b border-slate-200 bg-white ${
        sticky ? "sticky top-0 z-50" : ""
      }`}
    >
      <div className="flex w-full items-center justify-between gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          {backButton && (
            <Link
              href={backButton.href}
              aria-label={backButton.label ?? "Go back"}
              title={backButton.label ?? "Go back"}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
          <Image src={logoIcon} alt="Maturity Assessment Platform" className="h-11 w-11 shrink-0 object-contain" priority />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
            {subtitle && <p className="text-gray-600">{subtitle}</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          {rightActions}
          {showUserMenu && <UserMenu />}
        </div>
      </div>
    </header>
  );
}
