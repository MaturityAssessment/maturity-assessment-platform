"use client";

import { useState } from "react";
import { inputClass } from "./FormFields";

export default function WeightInput({ id, value, onChange, className = "" }: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const invalid = !Number.isFinite(value) || value <= 0;
  const showError = invalid && !focused;

  return (
    <span className={className}>
      <input
        id={id}
        type="number"
        min="0.01"
        step="0.01"
        aria-required="true"
        aria-invalid={showError}
        aria-describedby={showError ? `${id}-error` : undefined}
        className={`${inputClass} ${showError ? "border-red-500 ring-1 ring-red-500" : ""}`}
        value={Number.isFinite(value) ? value : ""}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(event.target.value === "" ? NaN : Number(event.target.value))}
      />
      {showError && (
        <span id={`${id}-error`} role="alert" className="mt-1 block text-xs font-normal text-red-600">
          Weight is required and must be greater than zero.
        </span>
      )}
    </span>
  );
}
