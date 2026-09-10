"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  FolderKanban,
  PanelsTopLeft,
  Home,
  ShieldCheck,
  Settings,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context";
import logo from "../../images/map-logo-big.png";
import UserMenu from "./UserMenu";

interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  activePaths?: string[];
  minimumRole?: "CURATOR" | "ADMIN";
}

const navigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  {
    href: "/evaluate",
    label: "Evaluate Assessments",
    icon: ClipboardCheck,
    minimumRole: "CURATOR",
  },
  {
    href: "/maturity-models",
    label: "Maturity Models",
    icon: FolderKanban,
  },
  {
    href: "/campaigns",
    label: "Campaigns",
    icon: ClipboardList,
    minimumRole: "CURATOR",
  },
  { href: "/domains", label: "Domains", icon: PanelsTopLeft },
  {
    href: "/admin",
    label: "Admin",
    icon: ShieldCheck,
    minimumRole: "ADMIN",
  },
];

const roleLevel = { USER: 1, CURATOR: 2, ADMIN: 3 } as const;

export default function SideNavbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = user?.role ?? "USER";

  const visibleItems = navigationItems.filter(
    ({ minimumRole }) => !minimumRole || roleLevel[userRole] >= roleLevel[minimumRole]
  );

  const isActive = ({ href, activePaths }: NavigationItem) =>
    (activePaths ?? [href]).some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

  return (
    <aside
      data-help-tour="dashboard-side-nav"
      className="flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white px-4 py-6"
    >
      <Link href="/dashboard" className="mb-8 block px-2" aria-label="Maturity Assessment Platform home">
        <Image
          src={logo}
          alt="Maturity Assessment Platform"
          className="h-auto w-44 object-contain"
          priority
        />
      </Link>

      <nav aria-label="Main navigation" className="space-y-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                active
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-gray-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          <span>Settings</span>
        </button>

        <button
          type="button"
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-gray-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <CircleHelp className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          <span>Help &amp; Resources</span>
        </button>
      </nav>

      <div className="mt-auto border-t border-gray-100 pt-5">
        <UserMenu variant="sidebar" />
      </div>
    </aside>
  );
}
