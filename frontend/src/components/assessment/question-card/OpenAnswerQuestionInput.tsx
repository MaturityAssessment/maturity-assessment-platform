"use client";

import type { QuestionInputProps } from "./types";

export interface OpenAnswerQuestionInputProps
  extends QuestionInputProps<string | undefined> {
  maxLength: number;
  placeholder?: string;
  helperText?: string;
}

export function OpenAnswerQuestionInput({
  value,
  disabled = false,
  name,
  maxLength,
  placeholder = "Write a concise response with the relevant details…",
  helperText,
  onChange,
}: OpenAnswerQuestionInputProps) {
  const length = String(value ?? "").length;

  return (
    <div>
      <textarea
        name={name}
        value={value ?? ""}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-36 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
        placeholder={placeholder}
      />
      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>{helperText}</span>
        <span>
          {length.toLocaleString()} / {maxLength.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
