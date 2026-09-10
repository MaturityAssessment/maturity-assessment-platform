import type { ReactNode } from "react";
import { TEXT_LIMITS } from "@/config/textLimits";

export const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export const labelClass = "block text-sm font-medium text-gray-800";

export function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-950">{title}</h2>
      {description && (
        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
          {description}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function CodeField({
  id,
  value,
  locked,
  onChange,
}: {
  id: string;
  value: string;
  locked?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={labelClass}>
      Public code *
      <input
        id={id}
        className={`${inputClass} font-mono ${locked ? "bg-gray-100 text-gray-500" : ""}`}
        value={value}
        maxLength={TEXT_LIMITS.code}
        readOnly={locked}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="mt-1 block text-xs font-normal text-gray-500">
        {locked
          ? "This code cannot be changed."
          : "You can change this code; references in this model version are updated automatically."}
      </span>
    </label>
  );
}
