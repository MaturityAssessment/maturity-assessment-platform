"use client";

import { CircleHelp, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TourInvitationProps {
  title: string;
  description: string;
  onAccept: () => void;
  onDismiss: () => void;
  acceptLabel?: string;
  dismissLabel?: string;
  note?: string;
  compact?: boolean;
  className?: string;
}

export default function TourInvitation({
  title,
  description,
  onAccept,
  onDismiss,
  acceptLabel = "Show me around",
  dismissLabel = "Explore on my own",
  note = "You can start this tour anytime from the help icon.",
  compact = false,
  className,
}: TourInvitationProps) {
  return (
    <section
      aria-label="Optional guided tour"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-white via-white to-indigo-50/80 shadow-sm",
        compact ? "px-4 py-3.5 sm:px-5" : "p-5 sm:p-6",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-indigo-100/50"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700",
              compact ? "h-9 w-9" : "h-11 w-11"
            )}
            aria-hidden="true"
          >
            <Compass className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </span>
          <div className="min-w-0">
            <h2
              className={cn(
                "font-bold tracking-tight text-slate-950",
                compact ? "text-base" : "text-lg sm:text-xl"
              )}
            >
              {title}
            </h2>
            <p
              className={cn(
                "mt-1 max-w-3xl leading-6 text-slate-600",
                compact ? "text-sm" : "text-sm sm:text-[15px]"
              )}
            >
              {description}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
              {note}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pl-[3.25rem] lg:pl-0">
          <Button type="button" onClick={onAccept}>
            {acceptLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onDismiss}>
            {dismissLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
