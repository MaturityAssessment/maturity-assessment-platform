"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import type { QuestionInputProps } from "./types";

function hasValue(value: unknown) {
  return (
    value !== undefined &&
    value !== null &&
    (typeof value !== "string" || value.trim() !== "")
  );
}

interface BoundedNumberQuestionInputProps
  extends QuestionInputProps<string | number | undefined> {
  min?: number;
  max?: number;
  invalid?: boolean;
  suffix?: string;
  showSlider?: boolean;
  ariaLabel?: string;
}

function BoundedNumberQuestionInput({
  value,
  disabled = false,
  name,
  min,
  max,
  invalid = false,
  suffix,
  showSlider = false,
  ariaLabel,
  onChange,
}: BoundedNumberQuestionInputProps) {
  const generatedId = useId();
  const inputId = name ?? generatedId;
  const descriptionId = `${inputId}-range-description`;
  const errorId = `${inputId}-range-error`;
  const hasBounds = typeof min === "number" && typeof max === "number";

  return (
    <div className={showSlider ? "max-w-2xl" : "max-w-sm"}>
      <div
        className={cn(
          showSlider &&
            hasBounds &&
            "grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center"
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center overflow-hidden rounded-xl border bg-white transition focus-within:ring-2",
            invalid
              ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-100"
              : "border-slate-300 focus-within:border-indigo-500 focus-within:ring-indigo-100"
          )}
        >
          <input
            id={inputId}
            name={name}
            type="number"
            step={1}
            min={min}
            max={max}
            value={value ?? ""}
            disabled={disabled}
            aria-invalid={invalid}
            aria-describedby={
              hasBounds
                ? invalid
                  ? `${descriptionId} ${errorId}`
                  : descriptionId
                : undefined
            }
            onChange={(event) =>
              onChange(
                event.target.value === "" ? "" : Number(event.target.value)
              )
            }
            className="h-full min-w-0 flex-1 border-0 bg-transparent px-4 text-lg font-semibold text-slate-950 outline-none ring-0 placeholder:font-normal placeholder:text-slate-400 focus:ring-0 disabled:bg-slate-100"
            placeholder={hasBounds ? `${min} – ${max}` : "0"}
          />
          {suffix && (
            <span className="border-l border-slate-200 px-4 text-base font-semibold text-slate-500">
              {suffix}
            </span>
          )}
        </div>
        {showSlider && hasBounds && (
          <div className="px-1">
            <input
              type="range"
              min={min}
              max={max}
              step={1}
              value={hasValue(value) ? Number(value) : min}
              disabled={disabled}
              onPointerDown={(event) => {
                if (disabled) return;
                const slider = event.currentTarget.getBoundingClientRect();
                const position = Math.max(
                  0,
                  Math.min(1, (event.clientX - slider.left) / slider.width)
                );
                onChange(Math.round(min + position * (max - min)));
              }}
              onChange={(event) => onChange(Number(event.target.value))}
              aria-label={ariaLabel}
              className="h-2 w-full cursor-pointer accent-indigo-600 disabled:cursor-not-allowed"
            />
            <div className="mt-1 flex justify-between text-[11px] font-medium text-slate-500">
              <span>
                {min}
                {suffix}
              </span>
              <span>
                {max}
                {suffix}
              </span>
            </div>
          </div>
        )}
      </div>
      {hasBounds && (
        <p id={descriptionId} className="mt-2 text-xs text-slate-500">
          Accepted range: {min} to {max}
          {suffix}
        </p>
      )}
      {invalid && hasBounds && (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-xs font-medium text-red-600"
        >
          Enter a whole number between {min} and {max}
          {suffix}.
        </p>
      )}
    </div>
  );
}

export interface NumericQuestionInputProps
  extends QuestionInputProps<string | number | undefined> {
  min?: number;
  max?: number;
  invalid?: boolean;
}

export function NumericQuestionInput(props: NumericQuestionInputProps) {
  return <BoundedNumberQuestionInput {...props} />;
}

export interface PercentageQuestionInputProps
  extends QuestionInputProps<string | number | undefined> {
  min?: number;
  max?: number;
  invalid?: boolean;
}

export function PercentageQuestionInput(
  props: PercentageQuestionInputProps
) {
  return (
    <BoundedNumberQuestionInput
      {...props}
      suffix="%"
      showSlider
      ariaLabel="Percentage"
    />
  );
}
