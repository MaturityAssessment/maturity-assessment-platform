"use client";

import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export type NoticeType = "error" | "success" | "warning";

type NoticeProps = {
  type: NoticeType;
  message: string;
  onDismiss: () => void;
  durationMs?: number;
};

const defaultDuration: Record<NoticeType, number> = {
  success: 5000,
  warning: 8000,
  error: 10000,
};

export default function Notice({
  type,
  message,
  onDismiss,
  durationMs,
}: NoticeProps) {
  useEffect(() => {
    const timeout = window.setTimeout(
      onDismiss,
      durationMs ?? defaultDuration[type]
    );
    return () => window.clearTimeout(timeout);
  }, [durationMs, message, onDismiss, type]);

  const colors =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : type === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-green-200 bg-green-50 text-green-800";

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`mb-6 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${colors}`}
    >
      <p className="min-w-0 flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notice"
        className="shrink-0 rounded p-0.5 opacity-70 transition hover:bg-black/5 hover:opacity-100"
      >
        <XMarkIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
