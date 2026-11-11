# Evidence

[API index](../README.md#endpoint-index) · [Assessment multipart contract](assessments.md#multipart-request)

Sources: [controller](../../../src/main/java/com/master_thesis/maturity_assessment/assessments/controllers/EvidenceController.java),
[service](../../../src/main/java/com/master_thesis/maturity_assessment/assessments/services/EvidenceService.java),
[file validation](../../../src/main/java/com/master_thesis/maturity_assessment/assessments/services/FileStorageService.java).

Evidence is uploaded through assessment save/submit operations; there is no
standalone POST upload endpoint. All operations on this page require a bearer
token. Campaign respondents use [campaign-response routes](campaign-responses.md).

Evidence creation and deletion in a module with unmet prerequisites return
`400 MODULE_PREREQUISITES_INCOMPLETE`. Retained evidence remains readable while
the module is locked. Multipart assessment saves validate prerequisite access
after synchronizing evidence, within the same transaction.

## GET /api/v1/evidence/assessment/{assessmentId}

**Access:** Assessment owner; curator/admin only when the assessment is not `DRAFT`.
**Request:** Numeric assessment ID; no body.
**Response:** `200`, [EvidenceDTO array](#evidence-response), ordered by evidence ID.
**Errors:** `403` no access; `404` assessment missing.

## GET /api/v1/evidence/assessment/{assessmentId}/practice/{practiceId}

**Access:** Same as assessment evidence read.
**Request:** Numeric assessment and practice IDs; no body.
**Response:** `200`, EvidenceDTO array restricted to the practice.
**Errors:** `400` practice/model mismatch; `403` no access; `404` assessment or practice missing.

## GET /api/v1/evidence/{evidenceId}/download

**Access:** Same as assessment evidence read.
**Request:** Numeric evidence ID; no body.
**Response:** `200` binary `application/octet-stream`, with attachment filename.
**Errors:** `400` for non-file evidence; `403` no access; `404` missing evidence or
unreadable/missing stored file (the latter returns an empty body).

```bash
curl --fail-with-body "$API_ORIGIN/api/v1/evidence/80/download" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  --output evidence.pdf
```

## DELETE /api/v1/evidence/{evidenceId}

**Access:** The assessment's user owner; curator/admin role alone does not grant it.
**Request:** Numeric evidence ID; no body.
**Response:** `204`, no body; stored file deletion is scheduled after commit.
**Errors:** `403` non-owner; `404` missing evidence. Invitation-only evidence has
no user owner and is not supported by this operation (the current implementation
can return `500` for it). Campaign clients remove evidence through a draft snapshot.
This standalone endpoint currently has no assessment-status guard; use draft
snapshot saves to coordinate answer/evidence edits in the respondent workflow.

## Upload and retain evidence

`evidenceMetadata` is a JSON array serialized into a multipart field:

```json
[
  {
    "itemKey": "upload-1",
    "clientKey": "local-item-1",
    "practiceId": 42,
    "referencedQuestionIds": [100, 101],
    "type": "FILE",
    "description": "Code review policy"
  },
  {
    "evidenceId": 80,
    "practiceId": 42,
    "type": "FILE",
    "description": "Previously uploaded policy"
  },
  {
    "clientKey": "local-item-2",
    "practiceId": 42,
    "type": "URL",
    "description": "Published handbook",
    "url": "https://example.org/handbook"
  }
]
```

| Field | Meaning |
|---|---|
| `practiceId` | Required; practice must belong to the assessment's exact model |
| `requirementCode` | Optional code of a named evidence requirement in this practice; null/omitted means additional supporting evidence |
| `collectedAt` | ISO date (`YYYY-MM-DD`), on or before today (UTC); required for every new/replaced/reclassified record, including additional supporting evidence |
| `referencedQuestionIds` | Optional array of unique positive integer question IDs in this practice; omitted/null preserves existing references, `[]` clears them, and new items default to `[]` |
| `type` | Required: `FILE`, `URL`, or `TEXT` |
| `evidenceId` | Include to retain/update an existing item in this assessment |
| `itemKey` | Required for a new file; matches one `evidenceFileKey`; can replace an existing file |
| `clientKey` | Optional client correlation value echoed by the save response; do not rely on persistence |
| `description` | Optional text for files/links (max 500 characters); required nonblank note text for `TEXT` (max 10,000 characters) |
| `url` | Required HTTPS URL for URL evidence; URL items cannot have a nonblank `itemKey` |

For new files, send one `evidenceFile` and one `evidenceFileKey` per upload, in
corresponding order. Every upload must be referenced exactly once in metadata.
Keep existing file bytes by supplying `evidenceId` without a new upload; replace
them by also supplying an `itemKey` and matching file. Existing items cannot be
moved to another practice or changed to a different evidence type.

Respondent notes use `type: "TEXT"` with the note in `description`, without a URL
or uploaded file. They count as practice evidence and share the five-item limit within each evidence field
with files and links. Named requirements may restrict accepted formats and exclude notes. Notes are included in review and local-agent text extraction.

Evidence remains owned by its practice. References only explain which questions
an item supports: one item may reference several questions, and each question
may reference several items without copying uploads or consuming extra slots.
References may target unanswered or inactive questions and survive answer changes.
They do not introduce question-level evidence requirements or change scoring.
IDs from another practice/model version, unknown IDs, duplicates, null elements,
strings, and non-integer IDs return `400`. References are validated before new
files are stored, within the same transaction as the evidence snapshot.

Example adding one file to an otherwise evidence-free draft:

```bash
curl --fail-with-body -X PUT "$API_ORIGIN/api/v1/assessments/drafts/25" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F 'assessment={"maturityModelId":1,"questionResponses":{"engineering_delivery_12_42":{"questionId":42,"response":1}}};type=application/json' \
  -F 'evidenceMetadata=[{"itemKey":"upload-1","practiceId":42,"type":"FILE","description":"Code review policy"}]' \
  -F 'evidenceFile=@policy.pdf;type=application/pdf' \
  -F 'evidenceFileKey=upload-1'
```

Replace the IDs/key/path with real local values. Exact-draft and campaign writes
use authoritative snapshots: omitted existing evidence is removed, and `[]`
removes all evidence. Include every retained item. An evidence item must belong
to a practice in the assessment’s exact model version; it can be attached before
answering any questions. Submission requires evidence for every mandatory named requirement in each practice
with at least one visible child question. Unclassified evidence cannot fulfil a named
requirement. Legacy practices without named requirements retain the `requiresEvidence`
rule (at least one practice item). Drafts may
still be incomplete. Clearing an answer does not remove practice evidence.

Defaults: five items per named requirement, plus five additional supporting items per practice; 50 MiB per file; 250 MiB total file bytes per
request. Allowed MIME types cover PDF, DOC/DOCX, XLS/XLSX, JPEG/PNG, and plain text.
Specifically: `application/pdf`, `application/msword`,
`application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
`application/vnd.ms-excel`,
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
`image/jpeg`, `image/jpg`, `image/png`, and `text/plain`.
Deployments can override file limits/types. Existing migrated practices with more
than five items in a field may retain, replace, or remove those items. Adding or moving an
item into a field requires a final count of at most five in that field.

Malformed metadata, duplicate IDs/keys, wrong practice/model, empty files, invalid
MIME types, and non-HTTPS links return `400`. Request-size enforcement returns
`413`; file validation can also return `400` for an oversized file. Browser
`FormData` should set its own boundary; do not manually set a bare multipart
Content-Type header.

## Evidence response

```json
{
  "id": 80,
  "clientKey": null,
  "assessmentId": 25,
  "practiceId": 42,
  "referencedQuestionIds": [100, 101],
  "requirementCode": "policy",
  "collectedAt": "2026-08-15",
  "description": "Code review policy",
  "evidenceType": "FILE",
  "fileName": "policy.pdf",
  "fileSize": 1024,
  "fileType": "application/pdf",
  "url": null,
  "createdAt": "2026-09-13T10:30:00",
  "downloadUrl": "/api/v1/evidence/80/download"
}
```

The response uses `id` and `evidenceType`; metadata writes use `evidenceId` and
`type`. For URL items, use `url` instead of trying to download a file. When using
campaign authentication, construct the campaign download path from the evidence
ID; the ordinary `downloadUrl` is not a campaign-token route.

`referencedQuestionIds` is always an array (including `[]`) in responses.

## Source dates and named requirements

Evidence remains owned by its practice and can still reference multiple questions.
`requirementCode` classifies an item into one named requirement; a requirement may
have several attachments. Requirements are owned by the exact model version.
Unknown or cross-practice codes and disallowed formats return `400`, before file storage.

`collectedAt` is the document issue/approval date or reporting-period end, according
to the model author's instructions. `createdAt` remains the upload timestamp. Neither
is inferred from the other. Legacy attachments with unknown dates may be retained;
replacing their content or reclassifying them needs a source date. A known date cannot
be cleared. Only unchanged legacy records may retain an unknown date. Authoritative
metadata includes these fields for retained items as well as new ones; null clears
optional classification, while dates remain required once known.

The canonical date attribute is `collectedAt`; `evidenceDate` remains accepted as a
legacy write alias. It is never inferred from the upload timestamp.

Freshness follows Scoring Profile v1.1 clause 10: a record is outdated only when its
age in days is strictly greater than the indicator's effective `maxAgeDays`. An
indicator remains satisfied when outdated. It is outdated only when every present
record is outdated; one current record prevents that status. A legacy unknown date
cannot establish that all records are outdated.

Assessment responses expose separate `historicalEvidenceValidity` (evaluated at
`referenceDate`) and `currentEvidenceFreshness` (evaluated today, UTC). These are
derived on every read, with batch evidence metadata queries and no file parsing.
New/revised evidence and reference dates refresh validity within the save transaction.
Evidence age never changes numeric scores, completion or reviewer decisions. Missing
mandatory indicators still block submission. Submitted evidence cannot be deleted
through the standalone delete route; use the returned-assessment revision workflow.

See [V50 deployment notes](../../migrations/evidence-lifecycle.md).
