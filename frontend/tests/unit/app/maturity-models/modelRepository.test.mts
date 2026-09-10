import test from "node:test";
import assert from "node:assert/strict";
import type { MaturityModelSummary } from "../../../../src/api/types.ts";
import { selectModelIdentity } from "../../../../src/app/maturity-models/[id]/modelRepository.ts";

function version(
  id: number,
  versionNumber: number,
  isActive: boolean
): MaturityModelSummary {
  return {
    id,
    name: `Model v${versionNumber}`,
    description: `Description v${versionNumber}`,
    dimensionCount: 2,
    moduleCount: 4,
    totalQuestions: 12,
    levelCount: 5,
    isActive,
    version: versionNumber,
    baseModelId: 1,
    createdAt: `2026-0${versionNumber}-01T00:00:00Z`,
  };
}

test("uses the active version as the repository identity", () => {
  const versions = [version(1, 1, false), version(2, 2, true), version(3, 3, false)];

  assert.equal(selectModelIdentity(versions)?.id, 2);
});

test("falls back to the latest version when the lineage is inactive", () => {
  const versions = [version(3, 3, false), version(1, 1, false), version(2, 2, false)];

  assert.equal(selectModelIdentity(versions)?.id, 3);
});
