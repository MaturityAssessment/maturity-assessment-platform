"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import type { QuestionInputProps } from "./types";

import type { QuestionChoiceOption } from "./types";

export interface SingleChoiceQuestionInputProps
  extends QuestionInputProps<number | undefined> {
  options: QuestionChoiceOption[];
  emptyMessage?: string;
}

export function SingleChoiceQuestionInput({
  value,
  disabled = false,
  name,
  options,
  emptyMessage = "No answer options are configured for this question.",
  onChange,
}: SingleChoiceQuestionInputProps) {
  const generatedName = useId();

  if (options.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid max-w-2xl gap-2">
      {options.map((option, index) => {
        const selected = Math.abs(Number(value) - option.value) <= 1e-9;
        return (
          <ChoiceOptionRow
            key={`${option.value}-${index}`}
            label={option.label}
            selected={selected}
            disabled={disabled}
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
            <SelectionIndicator selected={selected} />
          </ChoiceOptionRow>
        );
      })}
    </div>
  );
}

export interface MultiSelectQuestionInputProps
  extends QuestionInputProps<number[] | undefined> {
  options: QuestionChoiceOption[];
  noneLabel?: string;
}

export function MultiSelectQuestionInput({
  value,
  disabled = false,
  name,
  options,
  noneLabel = "None of the above",
  onChange,
}: MultiSelectQuestionInputProps) {
  const generatedName = useId();
  const selected = Array.isArray(value) ? value : undefined;
  const inputName = name ?? generatedName;

  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-blue-50"
        >
          <input
            type="checkbox"
            name={inputName}
            checked={selected?.includes(option.value) ?? false}
            disabled={disabled}
            onChange={(event) => {
              const current = selected ?? [];
              onChange(
                event.target.checked
                  ? [...current, option.value].sort((a, b) => a - b)
                  : current.filter((item) => item !== option.value)
              );
            }}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span>{option.label}</span>
        </label>
      ))}
      <label className="flex cursor-pointer items-center gap-3 p-3">
        <input
          type="checkbox"
          name={inputName}
          checked={Array.isArray(value) && value.length === 0}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.checked ? [] : undefined)
          }
        />
        <span>{noneLabel}</span>
      </label>
    </div>
  );
}

function ChoiceOptionRow({
  label,
  selected,
  disabled,
  children,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition",
        selected
          ? "border-indigo-400 bg-indigo-50 text-slate-950 ring-1 ring-indigo-400"
          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50",
        disabled && "cursor-not-allowed bg-slate-100 text-slate-400"
      )}
    >
      {children}
      <span className="leading-5">{label}</span>
    </label>
  );
}

function SelectionIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
        selected
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-slate-300 bg-white"
      )}
    >
      {selected && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  );
}
