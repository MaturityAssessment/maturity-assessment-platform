import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEvidencePayload,
  hasValidEvidenceItems,
  hydrateEvidenceByField,
  validateEvidenceForSave,
} from "../../../../src/app/assessment/assessmentEvidence.ts";

test("serializes retained links and uploads only local files", () => {
  const file = new File(["evidence"], "control.txt", { type: "text/plain" });
  const evidence = new Map([
    [
      "D1_M1_10_100",
      [
        {
          id: "new-file",
          questionId: 100,
          type: "file" as const,
          description: "Control export",
          file,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          url: "",
        },
        {
          id: "saved-link",
          evidenceId: 42,
          questionId: 100,
          type: "link" as const,
          description: "",
          file: null,
          url: "https://example.com/control",
        },
      ],
    ],
  ]);

  const payload = buildEvidencePayload(evidence);

  assert.equal(payload.metadata.length, 2);
  assert.equal(payload.uploads.length, 1);
  assert.equal(payload.uploads[0].itemKey, "new-file");
  assert.equal(payload.metadata[0].clientKey, "new-file");
  assert.equal(payload.metadata[1].clientKey, "saved-link");
  assert.equal(payload.metadata[1].evidenceId, 42);
  assert.equal(validateEvidenceForSave(evidence), null);
});

test("hydrates persisted evidence into its question field", () => {
  const steps = [
    {
      key: "practice-10",
      dimension: { id: "D1", name: "Dimension", modules: [] },
      module: { code: "M1", name: "Module", practices: [] },
      practice: {
        id: 10,
        name: "Practice",
        questions: [
          {
            id: 100,
            weight: 1,
            text: "Question",
            type: "boolean" as const,
            help: "",
          },
        ],
      },
    },
  ];

  const hydrated = hydrateEvidenceByField(
    [
      {
        id: 7,
        assessmentId: 3,
        questionId: 100,
        description: "Policy",
        evidenceType: "FILE",
        fileName: "policy.pdf",
        fileSize: 123,
        createdAt: "2026-06-19T12:00:00",
      },
    ],
    steps
  );

  const items = hydrated.get("D1_M1_10_100");
  assert.equal(items?.[0].evidenceId, 7);
  assert.equal(items?.[0].fileName, "policy.pdf");
  assert.equal(hasValidEvidenceItems(items), true);
});

test("rejects insecure links", () => {
  const evidence = new Map([
    [
      "D1_M1_10_100",
      [
        {
          id: "link",
          questionId: 100,
          type: "link" as const,
          description: "",
          file: null,
          url: "http://example.com",
        },
      ],
    ],
  ]);

  assert.match(validateEvidenceForSave(evidence) || "", /https/);
});
