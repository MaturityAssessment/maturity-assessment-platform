import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeColor =
  | "amber"
  | "blue"
  | "cyan"
  | "emerald"
  | "gray"
  | "indigo"
  | "orange"
  | "red"
  | "rose"
  | "slate"
  | "violet";

const colorClasses: Record<BadgeColor, string> = {
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-blue-50 text-blue-700",
  cyan: "bg-cyan-50 text-cyan-700",
  emerald: "bg-emerald-50 text-emerald-700",
  gray: "bg-gray-100 text-gray-600",
  indigo: "bg-indigo-50 text-indigo-700",
  orange: "bg-orange-50 text-orange-700",
  red: "bg-red-50 text-red-700",
  rose: "bg-rose-50 text-rose-700",
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-50 text-violet-700",
};

const dotClasses: Record<BadgeColor, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  cyan: "bg-cyan-500",
  emerald: "bg-emerald-500",
  gray: "bg-gray-400",
  indigo: "bg-indigo-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
  violet: "bg-violet-500",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
  dot?: boolean;
  outlined?: boolean;
}

export function Badge({
  children,
  color = "slate",
  dot = false,
  outlined = false,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        colorClasses[color],
        outlined && "ring-1 ring-inset",
        outlined && color === "emerald" && "ring-emerald-200",
        outlined && color === "gray" && "ring-gray-200",
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[color])} aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
