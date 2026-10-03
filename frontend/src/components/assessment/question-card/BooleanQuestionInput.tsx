"use client";

import { Check, X } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import type { QuestionInputProps } from "./types";

export type BooleanQuestionInputProps = QuestionInputProps<
  number | undefined
>;

export function BooleanQuestionInput({
  value,
  disabled = false,
  name,
  onChange,
}: BooleanQuestionInputProps) {
  const generatedName = useId();
  const options = [
    { label: "Yes", value: 1, icon: Check },
    { label: "No", value: 0, icon: X },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:max-w-md">
      {options.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;
        return (
          <label
            key={option.label}
            className={cn(
              "flex min-h-14 cursor-pointer items-center justify-center gap-2.5 rounded-xl border px-4 text-sm font-semibold transition",
              selected
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-500"
                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40",
              disabled && "cursor-not-allowed bg-slate-100 text-slate-400"
            )}
          >
            <input
              type="radio"
              name={name ?? generatedName}
              value={option.value}
              checked={selected}
              disabled={disabled}
              onChange={(event) => onChange(Number(event.target.value))}
              className="sr-only"
            />
            <Icon className="h-4 w-4" strokeWidth={2.25} />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
