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
      "practice_10_evidence",
      [
        {
          id: "new-file",
          practiceId: 10,
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
          practiceId: 10,
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

test("hydrates persisted evidence into its practice field", () => {
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
        practiceId: 10,
        description: "Policy",
        evidenceType: "FILE",
        fileName: "policy.pdf",
        fileSize: 123,
        createdAt: "2026-06-19T12:00:00",
      },
    ],
    steps
  );

  const items = hydrated.get("practice_10_evidence");
  assert.equal(items?.[0].evidenceId, 7);
  assert.equal(items?.[0].fileName, "policy.pdf");
  assert.equal(hasValidEvidenceItems(items), true);
});

test("rejects insecure links", () => {
  const evidence = new Map([
    [
      "practice_10_evidence",
      [
        {
          id: "link",
          practiceId: 10,
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

test("retains over-limit migrated evidence but rejects new additions", () => {
  const items = Array.from({ length: 6 }, (_, index) => ({
    id: String(index), evidenceId: index + 1, practiceId: 10,
    type: "link" as const, description: "", file: null, url: "https://example.com/" + index,
  }));
  assert.equal(validateEvidenceForSave(new Map([["practice_10_evidence", items]])), null);
  assert.match(validateEvidenceForSave(new Map([["practice_10_evidence",
    [...items, { ...items[0], id: "new", evidenceId: undefined }]]]))!, /five evidence items/);
});


test("respondent notes count as evidence and serialize without a file or URL", async () => {
  const note = { id: "note", practiceId: 10, type: "text" as const,
    description: "Policy reviewed annually.\n\tOwner: Governance team.", file: null, url: "" };
  const evidence = new Map([["practice_10_evidence", [note]]]);
  assert.equal(hasValidEvidenceItems([note]), true);
  assert.equal(validateEvidenceForSave(evidence), null);
  const payload = buildEvidencePayload(evidence);
  assert.equal(payload.metadata[0].type, "TEXT");
  assert.equal(payload.metadata[0].description, note.description);
  assert.equal(payload.metadata[0].url, undefined);
  assert.deepEqual(payload.uploads, []);
  assert.equal(hasValidEvidenceItems([{ ...note, description: " \n\t" }]), false);
  assert.match(validateEvidenceForSave(new Map([["practice_10_evidence", [{ ...note, description: "" }]]]))!, /Enter text/);
  assert.match(validateEvidenceForSave(new Map([["practice_10_evidence", [{ ...note, description: "a".repeat(10001) }]]]))!, /10,000/);
  assert.match(validateEvidenceForSave(new Map([["practice_10_evidence", Array.from({ length: 6 }, (_, index) => ({ ...note, id: String(index) }))]]))!, /five/);
  const steps = [{ key: "practice-10", dimension: { id: "D", name: "Dimension", modules: [] },
    module: { code: "M", name: "Module", practices: [] }, practice: { id: 10, name: "Practice", questions: [] } }];
  const hydrated = hydrateEvidenceByField([{ id: 3, clientKey: "note", practiceId: 10, assessmentId: 2,
    evidenceType: "TEXT", description: note.description, createdAt: "" }], steps);
  assert.equal(hydrated.get("practice_10_evidence")![0].type, "text");
  assert.equal(hydrated.get("practice_10_evidence")![0].description, note.description);
  const { isPracticeRequiredComplete } = await import("../../../../src/app/assessment/assessmentFlowUtils.ts");
  const requiredStep = { ...steps[0], practice: { ...steps[0].practice, requiresEvidence: true,
    questions: [{ id: 100, text: "Question", type: "boolean" as const, weight: 1, help: "", required: true }] } };
  assert.equal(isPracticeRequiredComplete(requiredStep, { D_M_10_100: 1 }, evidence), true);
  assert.equal(isPracticeRequiredComplete(requiredStep, { D_M_10_100: 1 }, new Map()), false);
});
