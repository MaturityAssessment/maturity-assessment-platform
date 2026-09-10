"use client";

import { ClipboardList, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageLoading, SideNavbar } from "@/components";
import { useAuth } from "@/context";

const adminPages = [
  {
    href: "/admin/users",
    title: "User management",
    description: "Review access requests and manage user roles and accounts.",
    icon: Users,
  },
  {
    href: "/admin/assessments",
    title: "Assessment management",
    description: "Review and manage individual and campaign assessments.",
    icon: ClipboardList,
  },
];

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated === false) {
      router.replace("/");
    } else if (user && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router, user]);

  if (isAuthenticated === null || (isAuthenticated && !user)) {
    return <PageLoading message="Loading admin tools..." />;
  }

  if (!isAuthenticated || user?.role !== "ADMIN") {
    return <PageLoading message="Redirecting..." />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 [&>aside]:sticky [&>aside]:top-0">
      <SideNavbar />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <header className="mb-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
              Administration
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Admin
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Manage platform access and administration settings.
            </p>
          </header>

          <section aria-label="Administration applications">
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {adminPages.map((page) => {
                const Icon = page.icon;

                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    className="group flex min-w-0 flex-col items-center rounded-2xl px-2 py-3 text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <span className="flex h-20 w-20 items-center justify-center rounded-2xl border border-indigo-100 bg-white text-indigo-600 shadow-sm transition duration-200 group-hover:-translate-y-1 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:shadow-md">
                      <Icon className="h-8 w-8" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="mt-3 block text-sm font-semibold text-slate-900 transition group-hover:text-indigo-700">
                      {page.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {page.description}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
