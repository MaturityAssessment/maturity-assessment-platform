import type { EvidenceRequirement, EvidenceFreshnessSummary, EvidenceFreshnessStatus } from "@/api/types";

export const EVIDENCE_AGE_DEFAULTS = { adhoc: null, monthly: 31, quarterly: 92, yearly: 366 } as const;
export function effectiveMaxAgeDays(requirement: EvidenceRequirement) {
  return requirement.maxAgeDays ?? EVIDENCE_AGE_DEFAULTS[requirement.frequency ?? "adhoc"];
}
export const freshnessLabel: Record<EvidenceFreshnessStatus, string> = {
  MISSING: "Missing", CURRENT: "Current", OUTDATED: "Outdated", UNKNOWN_DATE: "Date unknown (legacy)", NO_EXPIRY: "No expiry",
};

/** Midnight refresh also updates displayed ages; visibility/focus refresh catches missed timers. */
export function nextFreshnessRefresh(nextRefreshAt?: string | null, now = Date.now()) {
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  const transition = nextRefreshAt ? Date.parse(nextRefreshAt) : NaN;
  return Math.max(1000, Math.min(tomorrow.getTime(), Number.isFinite(transition) && transition > now ? transition : Infinity) - now);
}

export function freshnessWarning(summary?: EvidenceFreshnessSummary) {
  if (!summary) return null;
  if (summary.outdatedIndicatorCount) return `${summary.outdatedIndicatorCount} evidence requirement${summary.outdatedIndicatorCount === 1 ? " needs" : "s need"} updating`;
  if (summary.unknownDateIndicatorCount) return `${summary.unknownDateIndicatorCount} evidence requirement${summary.unknownDateIndicatorCount === 1 ? " has" : "s have"} unknown legacy dates`;
  return null;
}
