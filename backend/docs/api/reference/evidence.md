# Evidence

[API index](../README.md#endpoint-index) · [Assessment multipart contract](assessments.md#multipart-request)

Sources: [controller](../../../src/main/java/com/master_thesis/maturity_assessment/assessments/controllers/EvidenceController.java),
[service](../../../src/main/java/com/master_thesis/maturity_assessment/assessments/services/EvidenceService.java),
[file validation](../../../src/main/java/com/master_thesis/maturity_assessment/assessments/services/FileStorageService.java).

Evidence is uploaded through assessment save/submit operations; there is no
standalone POST upload endpoint. All operations on this page require a bearer
token. Campaign respondents use [campaign-response routes](campaign-responses.md).

## GET /api/v1/evidence/assessment/{assessmentId}

**Access:** Assessment owner; curator/admin only when the assessment is not `DRAFT`.
**Request:** Numeric assessment ID; no body.
**Response:** `200`, [EvidenceDTO array](#evidence-response), ordered by evidence ID.
**Errors:** `403` no access; `404` assessment missing.

## GET /api/v1/evidence/assessment/{assessmentId}/question/{questionId}

**Access:** Same as assessment evidence read.
**Request:** Numeric assessment and question IDs; no body.
**Response:** `200`, EvidenceDTO array restricted to the question.
**Errors:** `403` no access; `404` assessment missing.

## GET /api/v1/evidence/{evidenceId}/download

**Access:** Same as assessment evidence read.
**Request:** Numeric evidence ID; no body.
**Response:** `200` binary `application/octet-stream`, with attachment filename.
**Errors:** `400` for URL evidence; `403` no access; `404` missing evidence or
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
    "questionId": 42,
    "type": "FILE",
    "description": "Code review policy"
  },
  {
    "evidenceId": 80,
    "questionId": 42,
    "type": "FILE",
    "description": "Previously uploaded policy"
  },
  {
    "clientKey": "local-item-2",
    "questionId": 42,
    "type": "URL",
    "description": "Published handbook",
    "url": "https://example.org/handbook"
  }
]
```

| Field | Meaning |
|---|---|
| `questionId` | Required; question must belong to the assessment's exact model |
| `type` | Required: `FILE` or `URL` |
| `evidenceId` | Include to retain/update an existing item in this assessment |
| `itemKey` | Required for a new file; matches one `evidenceFileKey`; can replace an existing file |
| `clientKey` | Optional client correlation value echoed by the save response; do not rely on persistence |
| `description` | Optional text (max 500 characters) |
| `url` | Required HTTPS URL for URL evidence; URL items cannot have a nonblank `itemKey` |

For new files, send one `evidenceFile` and one `evidenceFileKey` per upload, in
corresponding order. Every upload must be referenced exactly once in metadata.
Keep existing file bytes by supplying `evidenceId` without a new upload; replace
them by also supplying an `itemKey` and matching file. Existing items cannot be
moved to another question or changed from FILE to URL (or vice versa).

Example adding one file to an otherwise evidence-free draft:

```bash
curl --fail-with-body -X PUT "$API_ORIGIN/api/v1/assessments/drafts/25" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F 'assessment={"maturityModelId":1,"questionResponses":{"engineering_delivery_12_42":{"questionId":42,"response":1}}};type=application/json' \
  -F 'evidenceMetadata=[{"itemKey":"upload-1","questionId":42,"type":"FILE","description":"Code review policy"}]' \
  -F 'evidenceFile=@policy.pdf;type=application/pdf' \
  -F 'evidenceFileKey=upload-1'
```

Replace the IDs/key/path with real local values. Exact-draft and campaign writes
use authoritative snapshots: omitted existing evidence is removed, and `[]`
removes all evidence. Include every retained item. An evidence item must belong
to an answered, visible question, or a visible evidence-only question. Submission
also checks required evidence. Drafts may still be incomplete.

Defaults: five items per question; 50 MiB per file; 250 MiB total file bytes per
request. Allowed MIME types cover PDF, DOC/DOCX, XLS/XLSX, JPEG/PNG, and plain text.
Specifically: `application/pdf`, `application/msword`,
`application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
`application/vnd.ms-excel`,
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
`image/jpeg`, `image/jpg`, `image/png`, and `text/plain`.
Deployments can override these limits/types.

Malformed metadata, duplicate IDs/keys, wrong question/model, empty files, invalid
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
  "questionId": 42,
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
