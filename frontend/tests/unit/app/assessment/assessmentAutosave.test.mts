import test from "node:test";
import assert from "node:assert/strict";
import type {
  AssessmentEvidenceInputItem,
  Evidence,
} from "../../../../src/api/types.ts";
import {
  cloneEvidenceSnapshot,
  reconcileSavedEvidence,
  SingleFlightAutosaveQueue,
} from "../../../../src/app/assessment/assessmentAutosave.ts";

function fileItem(
  overrides: Partial<AssessmentEvidenceInputItem> = {}
): AssessmentEvidenceInputItem {
  const file = new File(["policy"], "policy.txt", {
    type: "text/plain",
  });
  return {
    id: "client-file",
    questionId: 100,
    type: "file",
    description: "Original",
    file,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    url: "",
    ...overrides,
  };
}

function persisted(
  overrides: Partial<Evidence> = {}
): Evidence {
  return {
    id: 44,
    assessmentId: 9,
    questionId: 100,
    clientKey: "client-file",
    description: "Original",
    evidenceType: "FILE",
    fileName: "policy.txt",
    fileSize: 6,
    fileType: "text/plain",
    createdAt: "2026-07-25T12:00:00",
    downloadUrl: "/api/v1/evidence/44/download",
    ...overrides,
  };
}

test("hydrates an uploaded file without changing its client identity", () => {
  const sent = new Map([["field", [fileItem()]]]);
  const reconciled = reconcileSavedEvidence(
    sent,
    cloneEvidenceSnapshot(sent),
    [persisted()]
  );
  const item = reconciled.get("field")?.[0];

  assert.equal(item?.id, "client-file");
  assert.equal(item?.evidenceId, 44);
  assert.equal(item?.file, null);
  assert.equal(item?.downloadUrl, "/api/v1/evidence/44/download");
});

test("preserves edits made while an upload is in flight", () => {
  const original = fileItem();
  const sent = new Map([["field", [original]]]);
  const current = new Map([
    ["field", [{ ...original, description: "Edited while saving" }]],
  ]);
  const reconciled = reconcileSavedEvidence(sent, current, [persisted()]);

  assert.equal(
    reconciled.get("field")?.[0].description,
    "Edited while saving"
  );
  assert.equal(reconciled.get("field")?.[0].evidenceId, 44);
  assert.equal(reconciled.get("field")?.[0].file, null);
});

test("keeps a newer replacement file for the trailing save", () => {
  const original = fileItem();
  const replacement = new File(["replacement"], "replacement.txt", {
    type: "text/plain",
  });
  const sent = new Map([["field", [original]]]);
  const current = new Map([
    [
      "field",
      [
        {
          ...original,
          file: replacement,
          fileName: replacement.name,
          fileSize: replacement.size,
        },
      ],
    ],
  ]);
  const reconciled = reconcileSavedEvidence(sent, current, [persisted()]);
  const item = reconciled.get("field")?.[0];

  assert.equal(item?.evidenceId, 44);
  assert.equal(item?.file, replacement);
  assert.equal(item?.fileName, "replacement.txt");
});

test("does not restore removed items or drop newly added items", () => {
  const original = fileItem();
  const newLink: AssessmentEvidenceInputItem = {
    id: "new-link",
    questionId: 100,
    type: "link",
    description: "",
    file: null,
    url: "https://example.com/policy",
  };
  const sent = new Map([["field", [original]]]);
  const current = new Map([["field", [newLink]]]);
  const reconciled = reconcileSavedEvidence(sent, current, [persisted()]);

  assert.deepEqual(reconciled.get("field"), [newLink]);
});

test("serializes requests and performs one trailing save for newer edits", async () => {
  let revision = 1;
  let activeRequests = 0;
  let maximumActiveRequests = 0;
  const requestedRevisions: number[] = [];
  const firstSave = deferred<number>();
  const secondSave = deferred<number>();
  const completions = [firstSave, secondSave];

  const queue = new SingleFlightAutosaveQueue({
    getRevision: () => revision,
    save: async (requestedRevision) => {
      requestedRevisions.push(requestedRevision);
      activeRequests += 1;
      maximumActiveRequests = Math.max(
        maximumActiveRequests,
        activeRequests
      );
      try {
        return await completions[requestedRevisions.length - 1].promise;
      } finally {
        activeRequests -= 1;
      }
    },
  });

  const firstDrain = queue.drain();
  const concurrentDrain = queue.drain();
  assert.equal(firstDrain, concurrentDrain);
  assert.deepEqual(requestedRevisions, [1]);

  revision = 2;
  firstSave.resolve(1);
  await waitFor(() => requestedRevisions.length === 2);
  assert.deepEqual(requestedRevisions, [1, 2]);

  secondSave.resolve(2);
  assert.equal(await firstDrain, true);
  assert.equal(maximumActiveRequests, 1);
  assert.equal(queue.getSavedRevision(), 2);
});

test("keeps a failed revision pending so a later retry can save it", async () => {
  let attempts = 0;
  const errors: unknown[] = [];
  const queue = new SingleFlightAutosaveQueue({
    getRevision: () => 1,
    save: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("offline");
      return 1;
    },
    onError: (error) => errors.push(error),
  });

  assert.equal(await queue.drain(), false);
  assert.equal(queue.getSavedRevision(), 0);
  assert.equal(errors.length, 1);

  assert.equal(await queue.drain(), true);
  assert.equal(attempts, 2);
  assert.equal(queue.getSavedRevision(), 1);
});

test("does not issue a request when there are no unsaved revisions", async () => {
  let requests = 0;
  const queue = new SingleFlightAutosaveQueue({
    getRevision: () => 0,
    save: async () => {
      requests += 1;
      return 0;
    },
  });

  assert.equal(await queue.drain(), true);
  assert.equal(requests, 0);
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function waitFor(predicate: () => boolean) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  assert.fail("Timed out waiting for asynchronous autosave work");
}
