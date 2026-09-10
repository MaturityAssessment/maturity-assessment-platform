"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X } from "lucide-react";
import {
  computeTourPosition,
  type TourPlacement,
  type TourRect,
} from "./guidedTourGeometry";

export interface GuidedTourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  placement?: TourPlacement;
}

export type GuidedTourExitReason = "completed" | "skipped";

interface GuidedTourProps {
  open: boolean;
  steps: readonly GuidedTourStep[];
  onExit: (reason: GuidedTourExitReason) => void;
  label?: string;
}

interface Size {
  width: number;
  height: number;
}

const TARGET_PADDING = 6;

function getTarget(target: string) {
  return document.querySelector<HTMLElement>(`[data-help-tour~="${target}"]`);
}

function toTourRect(rect: DOMRect): TourRect {
  const left = Math.max(4, rect.left - TARGET_PADDING);
  const top = Math.max(4, rect.top - TARGET_PADDING);
  const right = Math.min(window.innerWidth - 4, rect.right + TARGET_PADDING);
  const bottom = Math.min(window.innerHeight - 4, rect.bottom + TARGET_PADDING);

  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

export default function GuidedTour({
  open,
  steps,
  onExit,
  label = "Page tour",
}: GuidedTourProps) {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TourRect | null>(null);
  const [cardSize, setCardSize] = useState<Size | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const progressId = useId();
  const step = steps[activeIndex];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) setActiveIndex(0);
  }, [open]);

  const exitTour = useCallback(
    (reason: GuidedTourExitReason) => onExit(reason),
    [onExit]
  );

  useEffect(() => {
    if (!open || steps.length === 0) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const appContent = document.getElementById("main-content");
    const contentWasInert = appContent?.hasAttribute("inert") ?? false;
    const previousOverflow = document.body.style.overflow;

    appContent?.setAttribute("inert", "");
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      if (!contentWasInert) appContent?.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [open, steps.length]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus({ preventScroll: true });
  }, [activeIndex, open]);

  useLayoutEffect(() => {
    if (!open || !step) {
      setTargetRect(null);
      return;
    }

    const target = getTarget(step.target);
    if (!target) {
      setTargetRect(null);
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const initialRect = target.getBoundingClientRect();
    const isOutsideViewport =
      initialRect.bottom < 24 ||
      initialRect.top > window.innerHeight - 24 ||
      initialRect.right < 24 ||
      initialRect.left > window.innerWidth - 24;

    if (isOutsideViewport) {
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
    }

    let animationFrame = 0;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const updateTarget = () => {
      animationFrame = 0;
      setTargetRect(toTourRect(target.getBoundingClientRect()));
    };
    const scheduleUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateTarget);
    };

    updateTarget();
    if (isOutsideViewport && !reduceMotion) {
      settleTimer = setTimeout(scheduleUpdate, 350);
    }

    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(target);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (settleTimer) clearTimeout(settleTimer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
    };
  }, [open, step]);

  useLayoutEffect(() => {
    if (!open || !dialogRef.current) return;

    const card = dialogRef.current;
    const updateCardSize = () => {
      const rect = card.getBoundingClientRect();
      setCardSize({ width: rect.width, height: rect.height });
    };

    updateCardSize();
    const resizeObserver = new ResizeObserver(updateCardSize);
    resizeObserver.observe(card);
    return () => resizeObserver.disconnect();
  }, [activeIndex, open]);

  if (!mounted || !open || !step || steps.length === 0) return null;

  const position =
    targetRect && cardSize
      ? computeTourPosition(
          targetRect,
          cardSize,
          { width: window.innerWidth, height: window.innerHeight },
          step.placement ?? "bottom"
        )
      : null;
  const isLastStep = activeIndex === steps.length - 1;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      exitTour("skipped");
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === dialogRef.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const arrowStyle = getArrowStyle(position, targetRect, cardSize);

  return createPortal(
    <div className="fixed inset-0 z-[110]">
      <div
        className={`fixed inset-0 z-0 ${targetRect ? "bg-transparent" : "bg-slate-950/60"}`}
        aria-hidden="true"
      />

      {targetRect && (
        <div
          className="pointer-events-none fixed z-10 rounded-xl border-2 border-indigo-300 ring-4 ring-indigo-300/30 motion-safe:transition-all motion-safe:duration-200"
          style={{
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: "0 0 0 9999px rgb(15 23 42 / 0.58)",
          }}
          aria-hidden="true"
        />
      )}

      <div
        key={step.id}
        ref={dialogRef}
        role="dialog"
        aria-roledescription={label}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${descriptionId} ${progressId}`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="fixed z-20 w-[min(22.5rem,calc(100vw-2rem))] animate-in rounded-2xl border border-slate-200 bg-white text-left shadow-2xl fade-in zoom-in-95 focus:outline-none motion-reduce:animate-none"
        style={
          position
            ? { left: position.left, top: position.top }
            : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }
        }
      >
        {arrowStyle && (
          <span
            className={`absolute h-3 w-3 rotate-45 border-slate-200 bg-white ${arrowStyle.className}`}
            style={arrowStyle.style}
            aria-hidden="true"
          />
        )}

        <div className="relative z-10 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                id={progressId}
                className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600"
                aria-live="polite"
              >
                Tip {activeIndex + 1} of {steps.length}
              </p>
              <h2
                id={titleId}
                className="mt-2 text-xl font-bold tracking-tight text-slate-950"
              >
                {step.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => exitTour("skipped")}
              className="-mr-2 -mt-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              aria-label="Skip page tour"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p id={descriptionId} className="mt-3 text-sm leading-6 text-slate-600">
            {step.description}
          </p>

          <div className="mt-5 flex gap-1.5" aria-hidden="true">
            {steps.map((tourStep, index) => (
              <span
                key={tourStep.id}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeIndex
                    ? "w-6 bg-indigo-600"
                    : index < activeIndex
                      ? "w-3 bg-indigo-300"
                      : "w-3 bg-slate-200"
                }`}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => exitTour("skipped")}
              className="rounded-lg px-2 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              Skip tour
            </button>

            <div className="ml-auto flex items-center gap-2">
              {activeIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveIndex((current) => current - 1)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  isLastStep
                    ? exitTour("completed")
                    : setActiveIndex((current) => current + 1)
                }
                className="inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
              >
                {isLastStep ? "Done" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function getArrowStyle(
  position: ReturnType<typeof computeTourPosition> | null,
  targetRect: TourRect | null,
  cardSize: Size | null
) {
  if (!position || !targetRect || !cardSize) return null;

  const borderByPlacement: Record<TourPlacement, string> = {
    right: "border-b border-l",
    left: "border-r border-t",
    bottom: "border-l border-t",
    top: "border-b border-r",
  };
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const clamp = (value: number, max: number) =>
    Math.min(Math.max(value, 18), Math.max(18, max - 18));

  switch (position.placement) {
    case "right":
      return {
        style: {
          left: -6,
          top: clamp(targetCenterY - position.top - 6, cardSize.height),
        },
        className: borderByPlacement.right,
      };
    case "left":
      return {
        style: {
          right: -6,
          top: clamp(targetCenterY - position.top - 6, cardSize.height),
        },
        className: borderByPlacement.left,
      };
    case "bottom":
      return {
        style: {
          left: clamp(targetCenterX - position.left - 6, cardSize.width),
          top: -6,
        },
        className: borderByPlacement.bottom,
      };
    case "top":
      return {
        style: {
          bottom: -6,
          left: clamp(targetCenterX - position.left - 6, cardSize.width),
        },
        className: borderByPlacement.top,
      };
  }
}
