"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export type AlertNotificationPayload = {
  variant: "error" | "success";
  title?: string;
  message: string;
  detail?: string;
  /** Auto-dismiss after ms; 0 = manual dismiss only. Default 8000 for error, 5000 for success. */
  durationMs?: number;
};

type AlertNotificationProps = {
  payload: AlertNotificationPayload | null;
  onDismiss: () => void;
};

const defaultDuration = (variant: "error" | "success") =>
  variant === "success" ? 5000 : 8000;

export function AlertNotification({ payload, onDismiss }: AlertNotificationProps) {
  useEffect(() => {
    if (!payload) return;
    const ms =
      payload.durationMs !== undefined
        ? payload.durationMs
        : defaultDuration(payload.variant);
    if (ms <= 0) return;
    const t = window.setTimeout(onDismiss, ms);
    return () => window.clearTimeout(t);
  }, [payload, onDismiss]);

  const node = (
    <AnimatePresence>
      {payload && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -12, x: 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="fixed top-4 right-4 z-[100] w-[min(100vw-2rem,24rem)] pointer-events-auto"
        >
          <div
            className={`rounded-lg border shadow-lg overflow-hidden ${
              payload.variant === "error"
                ? "border-red-200 bg-white text-gray-900"
                : "border-emerald-200 bg-white text-gray-900"
            }`}
          >
            <div className="flex gap-3 p-4">
              <div className="shrink-0 pt-0.5">
                {payload.variant === "error" ? (
                  <ExclamationTriangleIcon
                    className="h-6 w-6 text-red-600"
                    aria-hidden
                  />
                ) : (
                  <CheckCircleIcon
                    className="h-6 w-6 text-emerald-600"
                    aria-hidden
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {payload.title && (
                  <p className="text-sm font-semibold text-gray-900">
                    {payload.title}
                  </p>
                )}
                <p
                  className={`text-sm ${payload.title ? "mt-1 text-gray-700" : "font-medium text-gray-900"}`}
                >
                  {payload.message}
                </p>
                {payload.detail && (
                  <p className="mt-2 text-xs text-gray-600 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {payload.detail}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onDismiss}
                className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Dismiss notification"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}
