import test from "node:test";
import assert from "node:assert/strict";
import type {
  AssessmentResponse,
  Domain,
  MaturityModelSummary,
} from "../../../../../src/api/types.ts";
import type { MaturityModelGroup } from "../../../../../src/app/maturity-models/catalog.ts";
import {
  buildSetupCatalogItems,
  filterAndSortSetupItems,
  getSetupDomainOptions,
} from "../../../../../src/app/assessment/setup/setupCatalog.ts";

function model(
  id: number,
  name: string,
  domainId: number,
  domainName: string,
  overrides: Partial<MaturityModelSummary> = {}
): MaturityModelSummary {
  return {
    id,
    name,
    description: `${name} description`,
    dimensionCount: 2,
    moduleCount: 4,
    totalQuestions: 10,
    levelCount: 5,
    isActive: true,
    version: 1,
    domainId,
    domainName,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function group(
  activeVersion: MaturityModelSummary,
  versions: MaturityModelSummary[] = [activeVersion]
): MaturityModelGroup {
  return {
    baseModelId: activeVersion.baseModelId ?? activeVersion.id,
    activeVersion,
    latestVersion: versions[versions.length - 1],
    representative: activeVersion,
    versions,
    createdAt: versions[0].createdAt,
  };
}

function draft(
  id: number,
  maturityModelId: number,
  overrides: Partial<AssessmentResponse> = {}
): AssessmentResponse {
  return {
    id,
    overallAverage: 0,
    overallMaturityLevel: "Draft",
    isCompleted: false,
    status: "DRAFT",
    maturityModelId,
    createdAt: "2026-07-01T10:00:00Z",
    ...overrides,
  };
}

const security = model(10, "Security Foundations", 1, "Cybersecurity");
const data = model(20, "Data Essentials", 2, "Data Management", {
  totalQuestions: 25,
});

test("associates current and legacy drafts with their active model lineage", () => {
  const securityV1 = model(9, "Security Foundations", 1, "Cybersecurity", {
    isActive: false,
    version: 1,
    baseModelId: 9,
  });
  const securityV2 = { ...security, version: 2, baseModelId: 9 };
  const currentDraft = draft(1, securityV2.id, {
    questionEvaluations: {
      question_1: {
        responseKey: "question_1",
        questionId: 1,
        response: 1,
        respondentJustification: "Note",
      },
      question_2: {
        responseKey: "question_2",
        questionId: 2,
        response: 2,
      },
    },
    updatedAt: "2026-07-11T11:00:00Z",
  });
  const legacyDraft = draft(2, securityV1.id, {
    maturityModelVersion: 1,
    updatedAt: "2026-07-10T11:00:00Z",
  });

  const [item] = buildSetupCatalogItems(
    [group(securityV2, [securityV1, securityV2])],
    [legacyDraft, currentDraft],
    new Date("2026-07-11T12:00:00Z").getTime()
  );

  assert.equal(item.currentDraft?.id, currentDraft.id);
  assert.deepEqual(item.legacyDrafts.map((entry) => entry.id), [legacyDraft.id]);
  assert.equal(item.progress, 20);
  assert.equal(item.updatedLabel, "1 hour ago");
});

test("matches search text across models, domains, and descriptions", () => {
  const items = buildSetupCatalogItems(
    [
      group(security),
      group(
        model(30, "Engineering Health", 3, "Technology", {
          description: "Software delivery practices",
        })
      ),
    ],
    []
  );

  assert.deepEqual(
    filterAndSortSetupItems(items, "security foundations", null, "domain-asc")
      .map(({ model }) => model.id),
    [security.id]
  );
  assert.deepEqual(
    filterAndSortSetupItems(items, "technology", null, "domain-asc").map(
      ({ model }) => model.id
    ),
    [30]
  );
  assert.deepEqual(
    filterAndSortSetupItems(items, "delivery practices", null, "domain-asc")
      .map(({ model }) => model.id),
    [30]
  );
});

test("keeps multiple active model lineages in one domain and supports every deterministic sort mode", () => {
  const secondSecurity = model(
    11,
    "Advanced Security",
    1,
    "Cybersecurity",
    { totalQuestions: 40 }
  );
  const currentDataDraft = draft(3, data.id, {
    updatedAt: "2026-07-12T10:00:00Z",
  });
  const items = buildSetupCatalogItems(
    [group(security), group(data), group(secondSecurity)],
    [currentDataDraft]
  );

  assert.deepEqual(
    filterAndSortSetupItems(items, "", 1, "domain-asc").map(
      ({ model }) => model.id
    ),
    [secondSecurity.id, security.id]
  );
  assert.deepEqual(
    filterAndSortSetupItems(items, "", null, "model-asc").map(
      ({ model }) => model.id
    ),
    [secondSecurity.id, data.id, security.id]
  );
  assert.deepEqual(
    filterAndSortSetupItems(items, "", null, "in-progress").map(
      ({ model }) => model.id
    ),
    [data.id, secondSecurity.id, security.id]
  );
  assert.deepEqual(
    filterAndSortSetupItems(items, "", null, "questions-desc").map(
      ({ model }) => model.id
    ),
    [secondSecurity.id, data.id, security.id]
  );
});

test("offers only domains represented by active setup items", () => {
  const domains: Domain[] = [
    { id: 2, name: "Data Management" },
    { id: 1, name: "Cybersecurity" },
    { id: 3, name: "Operations" },
  ];
  const items = buildSetupCatalogItems(
    [group(security), group(data)],
    []
  );

  assert.deepEqual(
    getSetupDomainOptions(domains, items).map(({ id }) => id),
    [1, 2]
  );
  assert.deepEqual(
    getSetupDomainOptions([], items).map(({ id }) => id),
    [1, 2]
  );
});
