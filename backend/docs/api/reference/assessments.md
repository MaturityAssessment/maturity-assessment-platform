# Assessments

[API index](../README.md#endpoint-index) · [Assessment workflow](../workflows/assessments.md)

Sources: [controller](../../../src/main/java/com/master_thesis/maturity_assessment/assessments/controllers/AssessmentController.java),
[DTOs](../../../src/main/java/com/master_thesis/maturity_assessment/assessments/dto/),
[service](../../../src/main/java/com/master_thesis/maturity_assessment/assessments/services/AssessmentService.java),
[evidence workflow](../../../src/main/java/com/master_thesis/maturity_assessment/assessments/services/AssessmentEvidenceWorkflowService.java).

All operations require a bearer token. Success is `200` with
[AssessmentResponse](#assessment-response), unless an operation says otherwise.
Use the exact-draft write endpoints for new clients. They preserve the assessment
ID across saves and submission and reject writes after the row stops being editable.

## Assessment request

| Field | Contract |
|---|---|
| `maturityModelId` | Required numeric ID of the exact model version |
| `questionResponses` | Required object keyed by response key; `{}` is valid for an empty draft |
| `respondentUpdatedResponseKeys` | Optional array of response-key strings recording corrections to flagged items |

Each response entry contains required `questionId` and `response`, plus optional
`respondentJustification`. Omit unanswered questions instead of sending null or
blank answers. Text answers and justifications are limited to 10,000 characters.
The legacy top-level `responses` field is explicitly rejected.

Build keys from the full public model read:
`{dimension.id}_{module.code}_{practice.id}_{question.id}`. Practice and question
IDs are numeric database IDs, not editor codes. For example, dimension
`engineering`, module `delivery`, practice `12`, and question `42` give
`engineering_delivery_12_42`. Each key must match its supplied question ID and
belong to the selected model.

```json
{
  "maturityModelId": 1,
  "questionResponses": {
    "engineering_delivery_12_42": {
      "questionId": 42,
      "response": 1,
      "respondentJustification": "All changes receive a review."
    }
  },
  "respondentUpdatedResponseKeys": []
}
```

Use [question-type values](maturity-models.md#question-types). For boolean parents
of dependent questions, use numeric `1`/`0`: current evidence visibility checks
recognize numeric/string affirmative values but do not recognize a JSON boolean
`true`. Evidence-only questions use evidence metadata without an answer entry.

Saves replace the complete answer map, not just changed keys. On returned
assessments, accepted answers and their justifications must remain unchanged.
Record flagged corrections in `respondentUpdatedResponseKeys`; submission fails
with `409` until every flagged item has been marked updated (in this request or
a previous save).

## Multipart request

| Part | Contract |
|---|---|
| `assessment` | Required JSON string using AssessmentRequest above |
| `evidenceMetadata` | JSON array of the complete evidence snapshot; required on exact-draft and campaign writes |
| `evidenceFile` | Optional repeated file part for new/replacement files |
| `evidenceFileKey` | Optional repeated string; pairs each file by position with a metadata `itemKey` |

Send `evidenceMetadata` as `[]` when no evidence is retained. Existing evidence
must be included using `evidenceId`; omitting it removes it. See
[upload/retention examples](evidence.md#upload-and-retain-evidence) and limits.

```bash
curl --fail-with-body -X PUT "$API_ORIGIN/api/v1/assessments/drafts/25" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F 'assessment={"maturityModelId":1,"questionResponses":{"engineering_delivery_12_42":{"questionId":42,"response":1}}};type=application/json' \
  -F 'evidenceMetadata=[]'
```

Replace all IDs/keys with your model and draft. The example removes existing
evidence; use the real retained snapshot if the draft already has evidence.

## PUT /api/v1/assessments/drafts/by-model/{maturityModelId}

Ensure the current user has a `DRAFT` for an active model version.

**Access:** Authenticated. **Request:** Numeric model ID; no body.
**Response:** Existing draft, or a newly created empty draft, including evidence.
Repeated calls reuse the user's draft for that exact version.
**Errors:** `404` model missing; `409` model inactive. This endpoint finds `DRAFT`
rows, not `CHANGES_REQUESTED` rows; resume a returned assessment by its ID.

## PUT /api/v1/assessments/drafts/{draftId}

Save the exact draft's complete answer/evidence snapshot.

**Access:** Owner only, including for curator/admin callers.
**Request:** Numeric assessment `draftId`; required [multipart contract](#multipart-request).
**Response:** Same assessment ID, remaining `DRAFT` or `CHANGES_REQUESTED`.
**Errors:** `400` invalid data/model mismatch/evidence placement; `403` non-owner;
`404` missing draft; `409` non-editable state or changed accepted answers; upload
errors as described in [evidence](evidence.md).
Answer/evidence persistence runs in one transaction; a rejected snapshot is not
partially saved to the database.

## POST /api/v1/assessments/drafts/{draftId}/submit

Submit the exact draft and calculate its results.

**Access:** Owner. **Request:** Numeric draft ID; required multipart contract.
**Response:** Same ID with `COMPLETED` for auto-evaluated models or
`PENDING_REVIEW` for manual models.
**Errors:** Save errors above, plus `400` for missing visible required answers
or required evidence, and `409` for unresolved flagged corrections.
Retrying after a successful submission returns `409`; no fallback row is created.
If the client loses the success response, retrieve the assessment to inspect its state.

## PUT /api/v1/assessments/drafts/{draftId}/reset

**Access:** Owner. **Request:** Numeric draft ID; no body.
**Response:** Same draft ID with answers, evaluations, evidence, dimension results,
and evaluator insight cleared; draft scores reset.
**Errors:** `403` non-owner; `404` absent; `409` unless status is exactly `DRAFT`.
Returned assessments cannot be reset through this operation.

## POST /api/v1/assessments/drafts

Compatibility save that locates or creates a draft by user/model.

**Access:** Authenticated. **Request:** Two supported content types:

- `application/json`: AssessmentRequest; existing evidence is preserved.
- `multipart/form-data`: AssessmentRequest part plus optional evidence fields.
  Providing `evidenceMetadata` enables full-snapshot evidence replacement;
  omitting it uses the compatibility append/preserve path.

**Response:** Saved draft. **Errors:** `400` invalid request, question keys,
model or evidence data; `404` missing model in draft validation.
This route does not provide the exact-ID guarantees of `PUT /drafts/{draftId}`.
For the old file-only contract, `evidenceFileKey` uses the question response key;
new clients should send explicit metadata and use exact-draft writes.

## POST /api/v1/assessments

Compatibility submission that locates or creates an assessment by user/model.

**Access:** Authenticated. **Request:** Multipart; `assessment` required,
`evidenceMetadata` optional, file/key parts optional. Metadata presence controls
snapshot versus compatibility evidence behavior as for the collection draft save.
**Response:** `COMPLETED` or `PENDING_REVIEW` AssessmentResponse.
**Errors:** `400` invalid response/evidence data or missing required content;
upload limits apply. Prefer exact-draft submission for stale-request protection.

## GET /api/v1/assessments

**Access:** Authenticated. **Request:** No body/filters.
**Response:** Array of the user's assessments across statuses, ordered newest
creation first, then ID descending. Invitation-only assessments have no user
owner and are accessed through campaign routes.

## GET /api/v1/assessments/drafts

**Access:** Authenticated. **Request:** No body/filters.
**Response:** Array of the user's `DRAFT` rows, ordered by latest update then ID
descending. Does not include returned (`CHANGES_REQUESTED`) assessments.

## GET /api/v1/assessments/drafts/by-model/{maturityModelId}

**Access:** Authenticated; own draft only. **Request:** Numeric exact model ID; no body.
**Response:** Existing `DRAFT` with evidence. Creates nothing.
**Errors:** `404` if no draft exists for that user/version.

## GET /api/v1/assessments/drafts/by-model-lineage/{maturityModelId}

**Access:** Authenticated; own drafts only. **Request:** Numeric model ID; no body.
**Response:** Array of `DRAFT` rows across that model's lineage, latest update/ID
first. Useful for discovering drafts on older versions; does not migrate them.
**Errors:** `404` if the selected model is absent.

## GET /api/v1/assessments/all

**Access:** Curator/admin. **Request:** No body/filters.
**Response:** AssessmentResponse array across users and statuses, including
respondent identity and campaign metadata when available. Evidence is not
automatically populated by this list endpoint.

## GET /api/v1/assessments/pending

**Access:** Curator/admin. **Request:** No body/filters.
**Response:** Array restricted to `PENDING_REVIEW`, latest update/ID first,
including respondent identity where available.

## GET /api/v1/assessments/{id}

**Access:** Owner or curator/admin. Evidence retrieval additionally denies
curator/admin access to another user's `DRAFT`, so that full-detail request
returns `403` even though the assessment service alone permits the role.
**Request:** Numeric assessment ID; no body.
**Response:** AssessmentResponse with evidence.
**Errors:** `403` non-owner/access denied; missing assessment currently returns
`500` from the generic service exception.

## PUT /api/v1/assessments/{id}/evaluation/reviews

Save a partial set of reviewer decisions without completing the assessment.

**Access:** Curator/admin. **Request:** Numeric ID; JSON [ManualEvaluationRequest](#review-request)
with at least one `questionEvaluations` entry. Existing other reviews are retained.
**Response:** AssessmentResponse remains `PENDING_REVIEW`.
**Errors:** `409` unless pending review; `400` for auto-evaluated models, invalid
review keys/status/scores, empty reviews, or text limits.

## PUT /api/v1/assessments/{id}/evaluation/finish

Finish using already persisted reviews and recalculate results.

**Access:** Curator/admin. **Request:** Numeric ID; optional JSON body containing
`evaluatorInsight`, for example `{"evaluatorInsight":"Review complete."}`.
Incoming `questionEvaluations`/`manualScores` are not applied here; save reviews first.
**Response:** AssessmentResponse becomes `COMPLETED`.
**Errors:** `409` unless pending; `400` for an auto-evaluated model, unclassified
reviewable content, unresolved flags, missing required scores/notes, or invalid insight.
Send the desired insight explicitly; omitting it clears the saved insight.

## PUT /api/v1/assessments/{id}/evaluation/send-back

Return a pending assessment to its respondent for corrections.

**Access:** Curator/admin. **Request:** Numeric ID; optional JSON `evaluatorInsight`.
Uses saved reviews; it does not apply incoming review entries.
**Response:** `CHANGES_REQUESTED`; flagged rows get `respondentUpdated: false`.
**Errors:** `409` unless pending; `400` for auto-evaluated models, no saved flags,
or a flagged item without a reviewer note. Omitted insight clears the saved insight.

## PUT /api/v1/assessments/{id}/evaluate

One-step manual evaluation and completion, retained alongside the staged workflow.

**Access:** Curator/admin. **Request:** Numeric ID; JSON ManualEvaluationRequest.
Provide a complete `questionEvaluations` map for all reviewable content. A legacy
`manualScores` map is also accepted when the review map is empty.
**Response:** Recalculated `COMPLETED` assessment.
**Errors:** `409` unless pending; `400` for empty evaluation, auto-evaluated model,
missing classifications/scores/notes, invalid keys, or flags left unresolved.

## PUT /api/v1/assessments/{id}/complete

Compatibility completion for an assessment with no required review content.

**Access:** Curator/admin. **Request:** Numeric ID; optional JSON `evaluatorInsight`.
**Response:** `COMPLETED` assessment.
**Errors:** `409` unless pending; `400` if answered questions/evidence require
classification. This is not a shortcut around the review workflow, even if reviews
have already been saved; use `/evaluation/finish` for reviewed content.

## POST /api/v1/assessments/{id}/agent-evaluation/draft

Generate suggested reviews with the configured local evaluation agent.

**Access:** Curator/admin. **Request:** Numeric assessment ID; no body.
**Response:** `200` [AgentEvaluationDraftResponse](#agent-draft-response).
Suggestions are not saved as reviewer decisions and do not change assessment status.
**Errors:** `404` assessment/model absent; `409` unless pending review; `400` for
auto-evaluated/missing model; `502` invalid/upstream agent output; `503` agent
disabled, unconfigured, or unreachable. These use `REQUEST_REJECTED` error bodies.

## GET /api/v1/assessments/{id}/open-answers

**Access:** Curator/admin. **Request:** Numeric ID; no body.
**Response:** `200`, map of response keys to answer values, for example
`{"engineering_delivery_12_42":1}`. Despite the route name, the current
implementation returns all persisted response values, not only open-answer text.
**Errors:** Missing assessment currently returns `500`.

## DELETE /api/v1/assessments/{id}

**Access:** Owner or curator/admin. **Request:** Numeric ID; no body.
**Response:** `204`, no body. Deletes the assessment and associated records;
the workflow schedules stored evidence files for deletion after commit.
**Errors:** Missing assessment and unauthorized ownership currently throw generic
exceptions and return `500`, rather than dedicated `404`/`403` responses.

## Assessment response

| Fields | Meaning |
|---|---|
| `id`, `maturityModelId`, `maturityModelVersion`, `domainName` | Assessment and model identity |
| `status`, `isCompleted` | `DRAFT`, `PENDING_REVIEW`, `CHANGES_REQUESTED`, or `COMPLETED`; completion flag |
| `overallAverage`, `overallPercentageScore`, `overallMaturityLevel` | Server-calculated results; drafts start at 0/0/`Draft` |
| `evaluatorInsight` | Reviewer summary, nullable |
| `questionEvaluations` | Map containing respondent answers and review state |
| `evidence` | [EvidenceDTO array](evidence.md#evidence-response); populated by detail and evidence workflows, not all lists |
| `dimensionResults` | Dimension result array |
| `createdAt`, `updatedAt` | Local date/time strings |
| `userEmail`, `userId` | Respondent user identity when populated |
| `campaignId`, `campaignName`, `campaignParticipantId` | Campaign association when present |

Each `questionEvaluations` entry contains `id`, `responseKey`, `questionId`,
`response`, `initialScore`, `respondentJustification`, `validationStatus`,
`manualScore`, `reviewerNote`, `respondentUpdated`, `createdAt`, and `updatedAt`.
Review status can be null before classification. Read answers from this map;
responses do not expose the legacy top-level `responses` map.

Example response excerpt:

```json
{
  "id": 25,
  "maturityModelId": 1,
  "status": "DRAFT",
  "isCompleted": false,
  "questionEvaluations": {
    "engineering_delivery_12_42": {
      "questionId": 42,
      "responseKey": "engineering_delivery_12_42",
      "response": 1,
      "validationStatus": null,
      "manualScore": null,
      "reviewerNote": null
    }
  },
  "evidence": []
}
```

Dimension result fields: `dimensionId`, `dimensionName`, `dimensionDescription`,
`averageScore`, `percentageScore`, `maturityLevel`, `maturityLevelNumber`,
`totalQuestions`, and `totalScore`.

## Review request

`ManualEvaluationRequest` contains optional `manualScores` (legacy map of response
key to numeric score), `questionEvaluations`, and `evaluatorInsight` (max 2,000
characters). Use `questionEvaluations` for new integrations:

```json
{
  "questionEvaluations": {
    "engineering_delivery_12_42": {
      "questionId": 42,
      "validationStatus": "ACCEPTED",
      "manualScore": null,
      "reviewerNote": "Evidence supports the answer."
    }
  },
  "evaluatorInsight": "Review in progress."
}
```

Keys identify questions, including questions with evidence; they are not evidence
IDs. When supplied, `questionId` must match the key. Statuses are `ACCEPTED`,
`ADJUSTED`, `FLAGGED`; progress saves can leave classification null.
Finalization requires all answered/evidence-bearing questions to be classified,
no flags, a manual score for adjusted or answered open questions, and a note for
adjustments. Flagged items need notes before send-back. Notes are limited to
2,000 characters. Save the intended `evaluatorInsight` each time; omission clears it.

| Question type | Manual score contract |
|---|---|
| Boolean | 0 or 1 |
| Multiple choice | A configured option score in 0–1 |
| Scale, numeric, percentage | Normalized number in 0–1 |
| Open answer | Integer level from 1 through the model's maximum level |
| Other types, when a score is supplied | Integer level from 1 through the model's maximum level |

## Agent draft response

Top-level fields: `assessmentId`, `generatedAt`, `model`, `confidence`, `summary`,
`finalRemarks`, `questionEvaluations`, `warnings`, `nextSteps`, `documentSummaries`,
and `processingNotes`.

Suggested review entries have `questionId`, `validationStatus`, `manualScore`,
`reviewerNote`, `confidence`, and `rationale`. Warnings contain `severity`,
`questionId`, `responseKey`, `message`, and `recommendation`. Document summaries
contain `evidenceId`, `questionId`, `evidenceType`, `fileName`, `urlHost`, `urlPath`,
`summary`, `extractedCharacters`, `truncated`, and `warning`. Inspect suggestions
and submit selected decisions through `/evaluation/reviews` before finishing.
