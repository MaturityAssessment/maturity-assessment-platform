"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Clock3, X } from "lucide-react";
import { Button } from "@/components";

export type SubmissionStatus = "completed" | "pending";

type SubmissionStatusPopupProps = {
  status: SubmissionStatus;
  durationMs?: number;
  onDismiss: () => void;
  onViewResults?: () => void;
};

export default function SubmissionStatusPopup({
  status,
  durationMs = 12000,
  onDismiss,
  onViewResults,
}: SubmissionStatusPopupProps) {
  const reduceMotion = useReducedMotion();
  const completed = status === "completed";

  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs, onDismiss]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/45 p-4 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onDismiss();
        }}
      >
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-labelledby="submission-status-title"
          aria-describedby="submission-status-description"
          initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl"
        >
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Dismiss submission status"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="px-6 pb-6 pt-8 text-center sm:px-9 sm:pb-8">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                completed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {completed ? (
                <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
              ) : (
                <Clock3 className="h-9 w-9" aria-hidden="true" />
              )}
            </div>

            <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Assessment submitted
            </p>
            <h2
              id="submission-status-title"
              className="mt-2 text-2xl font-bold text-gray-950"
            >
              {completed
                ? "Your results are ready"
                : "Your results are pending evaluation"}
            </h2>
            <p
              id="submission-status-description"
              className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600"
            >
              {completed
                ? "The assessment was evaluated automatically. You can open the results now or find them later in All assessments."
                : "An evaluator will review your answers and submitted evidence. Once complete, the results will appear on this dashboard."}
            </p>

            <div className="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <Button variant="outline" onClick={onDismiss}>
                Stay on this page
              </Button>
              {completed && onViewResults && (
                <Button onClick={onViewResults}>View results</Button>
              )}
            </div>
          </div>

          <div
            className="h-1 bg-gray-100"
            aria-label="This message will close automatically"
          >
            <motion.div
              className={
                completed ? "h-full bg-emerald-500" : "h-full bg-blue-500"
              }
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: durationMs / 1000, ease: "linear" }}
              style={{ originX: 0 }}
            />
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
