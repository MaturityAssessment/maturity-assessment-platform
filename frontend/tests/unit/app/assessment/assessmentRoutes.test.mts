import test from "node:test";
import assert from "node:assert/strict";
import type { MaturityModel } from "../../../../src/api/types.ts";
import {
  buildAssessmentModuleHref,
  buildAssessmentOverviewHref,
  buildAssessmentParentHref,
  buildAssessmentPracticeHref,
  buildPracticeSteps,
  getModulePracticeSteps,
  getNextPracticeInModule,
  isAssessmentModulePath,
  isAssessmentPracticePath,
  readAssessmentRouteContext,
  replaceAssessmentPathContext,
  resolveAssessmentModuleLocation,
  resolveAssessmentPracticeLocation,
} from "../../../../src/app/assessment/assessmentRoutes.ts";

const model: MaturityModel = {
  id: 7,
  name: "Cybersecurity",
  description: "Security assessment",
  isActive: true,
  dimensions: [
    {
      id: "GOV",
      name: "Governance",
      modules: [
        {
          code: "PROTECT",
          name: "Protect",
          practices: [
            {
              id: 11,
              code: "IDENTITY",
              name: "Identity management",
              questions: [],
            },
            {
              id: 12,
              code: "ACCESS_CONTROL",
              name: "Access control",
              questions: [],
            },
          ],
        },
        {
          code: "RESPOND",
          name: "Respond",
          practices: [
            {
              id: 13,
              code: "INCIDENTS",
              name: "Incident response",
              questions: [],
            },
          ],
        },
      ],
    },
  ],
};

test("builds canonical practice and overview locations with a draft ID", () => {
  const steps = buildPracticeSteps(model);

  assert.equal(
    buildAssessmentPracticeHref(steps[1], { draftId: 41 }),
    "/assessment/GOV/PROTECT/ACCESS_CONTROL?draftId=41"
  );
  assert.equal(
    buildAssessmentOverviewHref({ draftId: 41 }),
    "/assessment?draftId=41"
  );
  assert.equal(
    replaceAssessmentPathContext("/assessment/GOV/PROTECT/IDENTITY", {
      draftId: 41,
    }),
    "/assessment/GOV/PROTECT/IDENTITY?draftId=41"
  );
  assert.equal(
    replaceAssessmentPathContext("/assessment", { draftId: -1 }),
    "/assessment"
  );
});

test("reads only valid positive route context identifiers", () => {
  assert.deepEqual(readAssessmentRouteContext("?draftId=41"), {
    draftId: 41,
  });
  assert.equal(
    readAssessmentRouteContext("?draftId=41&modelId=7"),
    null
  );
  assert.equal(readAssessmentRouteContext("?modelId=7"), null);
  assert.equal(readAssessmentRouteContext("?draftId=-1&modelId=nope"), null);
});

test("preserves a campaign invitation token across assessment routes", () => {
  const token = "a".repeat(43);

  assert.deepEqual(
    readAssessmentRouteContext(`?campaignToken=${token}`),
    { campaignToken: token }
  );
  assert.equal(
    buildAssessmentOverviewHref({ campaignToken: token }),
    `/assessment?campaignToken=${token}`
  );
  assert.equal(
    readAssessmentRouteContext("?campaignToken=unsafe/token"),
    null
  );
});

test("resolves a nested hierarchy and returns its canonical casing", () => {
  const resolved = resolveAssessmentPracticeLocation(
    model,
    "/assessment/gov/protect/access_control"
  );

  assert.equal(resolved?.step.practice.name, "Access control");
  assert.equal(resolved?.dimensionIndex, 0);
  assert.equal(resolved?.moduleIndex, 0);
  assert.equal(resolved?.practiceIndex, 1);
  assert.equal(
    resolved?.canonicalPath,
    "/assessment/GOV/PROTECT/ACCESS_CONTROL"
  );
  assert.equal(
    isAssessmentPracticePath("/assessment/GOV/PROTECT/ACCESS_CONTROL"),
    true
  );
});

test("resolves module landing pages independently from practice routes", () => {
  const resolved = resolveAssessmentModuleLocation(
    model,
    "/assessment/gov/protect"
  );

  assert.equal(resolved?.dimension.name, "Governance");
  assert.equal(resolved?.module.name, "Protect");
  assert.equal(resolved?.moduleIndex, 0);
  assert.equal(resolved?.canonicalPath, "/assessment/GOV/PROTECT");
  assert.equal(isAssessmentModulePath("/assessment/GOV/PROTECT"), true);
  assert.equal(isAssessmentPracticePath("/assessment/GOV/PROTECT"), false);
  assert.equal(
    buildAssessmentModuleHref(
      model.dimensions[0],
      model.dimensions[0].modules[1],
      { draftId: 41 }
    ),
    "/assessment/GOV/RESPOND?draftId=41"
  );
});

test("moves one level up through the assessment hierarchy", () => {
  assert.equal(
    buildAssessmentParentHref(
      model,
      "/assessment/GOV/PROTECT/IDENTITY",
      { draftId: 41 }
    ),
    "/assessment/GOV/PROTECT?draftId=41"
  );
  assert.equal(
    buildAssessmentParentHref(
      model,
      "/assessment/GOV/PROTECT",
      { draftId: 41 }
    ),
    "/assessment?draftId=41"
  );
  assert.equal(
    buildAssessmentParentHref(model, "/assessment", { draftId: 41 }),
    null
  );
});

test("rejects hierarchy mismatches and incomplete assessment paths", () => {
  assert.equal(
    resolveAssessmentPracticeLocation(
      model,
      "/assessment/GOV/RESPOND/ACCESS_CONTROL"
    ),
    null
  );
  assert.equal(isAssessmentPracticePath("/assessment/GOV/PROTECT"), false);
  assert.equal(isAssessmentModulePath("/assessment/GOV"), false);
  assert.equal(isAssessmentModulePath("/assessment/GOV/UNKNOWN"), true);
  assert.equal(
    resolveAssessmentModuleLocation(model, "/assessment/GOV/UNKNOWN"),
    null
  );
  assert.equal(isAssessmentPracticePath("/assessment/setup"), false);
});

test("scopes progression to the active module and never crosses its boundary", () => {
  const steps = buildPracticeSteps(model);
  const protectSteps = getModulePracticeSteps(steps, steps[0]);

  assert.deepEqual(
    protectSteps.map((step) => step.practice.code),
    ["IDENTITY", "ACCESS_CONTROL"]
  );
  assert.equal(
    getNextPracticeInModule(protectSteps, protectSteps[0].key)?.practice.code,
    "ACCESS_CONTROL"
  );
  assert.equal(
    getNextPracticeInModule(protectSteps, protectSteps[1].key),
    null
  );
});
