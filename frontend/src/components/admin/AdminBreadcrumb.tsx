import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function AdminBreadcrumb({ current }: { current: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-500"
    >
      <Link
        href="/admin"
        className="rounded px-1 py-0.5 transition hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        Admin
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate text-indigo-600" aria-current="page">
        {current}
      </span>
    </nav>
  );
}
