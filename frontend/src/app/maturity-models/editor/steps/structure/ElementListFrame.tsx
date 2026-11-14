import type { ReactNode } from "react";

export default function ElementListFrame({ label, weighted, children, questionLayout = false }: { label: string; weighted: boolean; children: ReactNode; questionLayout?: boolean }) {
  return (
    <div className="overflow-visible rounded-xl border border-gray-200">
      <div aria-hidden="true" className={`hidden items-center gap-3 rounded-t-xl border-b border-gray-200 bg-gray-50/70 px-4 py-3 text-xs font-medium text-gray-500 @lg:grid ${questionLayout ? (weighted ? "grid-cols-[2rem_minmax(0,1fr)_5rem_2rem]" : "grid-cols-[2rem_minmax(0,1fr)_2rem]") : (weighted ? "grid-cols-[2.5rem_minmax(0,1fr)_5rem_7rem]" : "grid-cols-[2.5rem_minmax(0,1fr)_7rem]")}`}>
        <span className="text-center">#</span>
        <span>{label}</span>
        {weighted && <span>Weight</span>}
        <span className={questionLayout ? "sr-only" : "text-right"}>{questionLayout ? "Delete" : "Reorder / delete"}</span>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}
