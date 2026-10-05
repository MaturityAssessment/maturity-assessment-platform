import type { ReactNode } from "react";
import { TEXT_LIMITS } from "@/config/textLimits";
import { codeSuffix, codeWithPrefix } from "../model/editorCodes";

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
  prefix,
  locked,
  onChange,
}: {
  id: string;
  value: string;
  prefix: string;
  locked?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={labelClass} htmlFor={id}>
      Public code *
      <div className="mt-1 flex overflow-hidden rounded-md border border-gray-300 bg-white font-mono shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <span
          className="shrink-0 border-r border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
          aria-hidden="true"
        >
          {prefix}
        </span>
        <input
          id={id}
          aria-describedby={`${id}-help`}
          className={`min-w-0 flex-1 border-0 px-3 py-2 text-sm text-gray-950 outline-none focus:ring-0 ${locked ? "bg-gray-100 text-gray-500" : "bg-transparent"}`}
          value={codeSuffix(value)}
          maxLength={TEXT_LIMITS.code - prefix.length}
          readOnly={locked}
          onChange={(event) => onChange(codeWithPrefix(prefix, event.target.value))}
        />
      </div>
      <span
        id={`${id}-help`}
        className="mt-1 block text-xs font-normal text-gray-500"
      >
        {locked
          ? "This code cannot be changed."
          : "The prefix follows this element’s position. Only the suffix is editable."}
      </span>
    </label>
  );
}
