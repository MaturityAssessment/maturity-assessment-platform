"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import type { QuestionInputProps } from "./types";

export interface ScaleQuestionInputProps
  extends QuestionInputProps<number | undefined> {
  pointCount: number;
  minLabel?: string | null;
  maxLabel?: string | null;
}

export function ScaleQuestionInput({
  value,
  disabled = false,
  name,
  pointCount,
  minLabel,
  maxLabel,
  onChange,
}: ScaleQuestionInputProps) {
  const generatedId = useId();
  const inputId = name ?? generatedId;

  return (
    <div className="max-w-2xl overflow-x-auto pb-1">
      <div style={{ minWidth: `${Math.max(280, pointCount * 44)}px` }}>
        <div className="flex items-center justify-between gap-3">
          <span className="max-w-[40%] truncate text-xs font-medium text-slate-500">
            {minLabel?.trim() || "Minimum"}
          </span>
          <output
            htmlFor={inputId}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              value !== undefined
                ? "bg-indigo-50 text-indigo-700"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {value !== undefined ? `Point ${value}` : "Select a point"}
          </output>
          <span className="max-w-[40%] truncate text-right text-xs font-medium text-slate-500">
            {maxLabel?.trim() || "Maximum"}
          </span>
        </div>

        <div className="relative mt-5 h-12 rounded-lg px-2">
          <div className="absolute left-4 right-4 top-3 h-1 rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-500 transition-[width]"
              style={{
                width: value !== undefined
                  ? `${((Number(value) - 1) / (pointCount - 1)) * 100}%`
                  : "0%",
              }}
            />
          </div>
          <div className="pointer-events-none absolute left-4 right-4 top-1.5 flex justify-between">
            {Array.from({ length: pointCount }, (_, index) => index + 1).map(
              (level) => (
                <span
                  key={level}
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white transition",
                    Number(value) >= level
                      ? "border-indigo-500"
                      : "border-slate-300"
                  )}
                >
                  {Number(value) === level && (
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                  )}
                </span>
              )
            )}
          </div>
          <input
            id={inputId}
            type="range"
            min={1}
            max={pointCount}
            step={1}
            value={value !== undefined ? Number(value) : 1}
            disabled={disabled}
            onPointerDown={(event) => {
              if (disabled) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const position = Math.max(
                0,
                Math.min(1, (event.clientX - bounds.left) / bounds.width)
              );
              onChange(Math.round(1 + position * (pointCount - 1)));
            }}
            onKeyDown={(event) => {
              if (disabled) return;
              if (
                value === undefined &&
                (event.key === "Enter" ||
                  event.key === " " ||
                  event.key === "Home")
              ) {
                event.preventDefault();
                onChange(1);
              }
            }}
            onChange={(event) => onChange(Number(event.target.value))}
            aria-label="Scale point"
            className="absolute left-2 right-2 top-0 h-7 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <div className="absolute bottom-0 left-2 right-2 flex justify-between text-[11px] font-semibold text-slate-500">
            {Array.from({ length: pointCount }, (_, index) => (
              <span key={index + 1} className="w-4 text-center">
                {index + 1}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
