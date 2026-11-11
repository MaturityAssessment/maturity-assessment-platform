import test from "node:test";
import assert from "node:assert/strict";
import { effectiveMaxAgeDays, nextFreshnessRefresh, freshnessWarning } from "../../../../src/app/assessment/evidenceLifecycle.ts";
import type { EvidenceRequirement, EvidenceFreshnessSummary } from "../../../../src/api/types.ts";

const requirement: EvidenceRequirement = { code: "report", name: "Report", instructions: "", required: true, format: "FILE_OR_URL" };

test("day-based defaults and explicit overrides round trip", () => {
  assert.equal(effectiveMaxAgeDays(requirement), null);
  assert.equal(effectiveMaxAgeDays({ ...requirement, frequency: "monthly" }), 31);
  assert.equal(effectiveMaxAgeDays({ ...requirement, frequency: "quarterly" }), 92);
  assert.equal(effectiveMaxAgeDays({ ...requirement, frequency: "yearly" }), 366);
  assert.equal(effectiveMaxAgeDays({ ...requirement, frequency: "yearly", maxAgeDays: 0 }), 0);
});

test("refresh uses server transition or UTC midnight, including a suspended tab", () => {
  const now = Date.parse("2026-12-01T23:59:00Z");
  assert.equal(nextFreshnessRefresh(null, now), 60_000);
  assert.equal(nextFreshnessRefresh("2026-12-02T00:00:00Z", now), 60_000);
  assert.equal(nextFreshnessRefresh("2026-12-03T00:00:00Z", now), 60_000);
  assert.equal(nextFreshnessRefresh("2026-12-01T00:00:00Z", now), 60_000);
  assert.equal(nextFreshnessRefresh("invalid", now), 60_000);
});

test("warnings concern current freshness without changing completion or result data", () => {
  const summary: EvidenceFreshnessSummary = { evaluatedOn: "2026-12-02", calculatedAt: "2026-12-02T10:00:00Z", nextRefreshAt: null,
    requiredIndicatorCount: 2, outdatedIndicatorCount: 1, unknownDateIndicatorCount: 0, missingIndicatorCount: 0, indicators: [] };
  assert.equal(freshnessWarning(summary), "1 evidence requirement needs updating");
  assert.match(freshnessWarning({ ...summary, outdatedIndicatorCount: 0, unknownDateIndicatorCount: 1 })!, /unknown legacy dates/);
  assert.equal(freshnessWarning({ ...summary, outdatedIndicatorCount: 0 }), null);
});
