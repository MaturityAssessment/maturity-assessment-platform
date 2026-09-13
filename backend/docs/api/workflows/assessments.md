# Assessment workflow

[API documentation](../README.md) · [Endpoint reference](../reference/assessments.md)

## Start and submit

1. Sign in with an approved account and keep the access token.
2. Load `GET /api/v1/maturity-model/active`, optionally with `?domainId=...`.
   Choose an exact model ID. Use its full hierarchy and question configuration to
   render the assessment; do not substitute another version's question IDs.
3. Call `PUT /api/v1/assessments/drafts/by-model/{maturityModelId}` with no body.
   Store the returned assessment `id` as the draft ID. This operation requires an
   active model and reuses the user's existing draft for that exact version.
4. Build the [response map](../reference/assessments.md#assessment-request) using
   keys from that version. Save with `PUT /api/v1/assessments/drafts/{draftId}`.
   Each save sends the complete answer map and retained/new evidence snapshot.
   Omission removes saved content; do not send just the changed question.
5. Submit with `POST /api/v1/assessments/drafts/{draftId}/submit` using the same
   multipart contract. Complete visible required questions and required evidence.
6. Inspect `status`: automatic models become `COMPLETED`; manual models become
   `PENDING_REVIEW`. Display server-returned scores and maturity levels.

For request examples, see [multipart saves](../reference/assessments.md#multipart-request)
and [file/URL evidence](../reference/evidence.md#upload-and-retain-evidence).

## Resume, reset, and handle retries

Use `GET /api/v1/assessments/{id}` to reopen a known assessment. To discover
unfinished drafts, use `/assessments/drafts` or
`/assessments/drafts/by-model-lineage/{maturityModelId}`. These draft lists only
contain `DRAFT`, not returned assessments. The user's full assessment list includes
`CHANGES_REQUESTED` rows.

Resume a draft against its existing model/version; the lineage endpoint does not
migrate answers. `PUT /drafts/{draftId}/reset` clears a `DRAFT` but preserves its ID.
It cannot reset a returned or submitted assessment.

Serialize saves in the client to avoid an older full snapshot overwriting a newer
one. Wait for a save to finish before submitting. Exact-draft writes reject a
non-editable state with `409`; they do not provide a client revision/ETag mechanism
to resolve concurrent saves. If a submission response is lost, retrieve the row's
status before retrying. A submitted row rejects duplicate submission with `409`.

## Review a manual assessment

1. As curator/admin, load `GET /api/v1/assessments/pending`, then retrieve the
   selected assessment, its model, and evidence.
2. Classify answered questions and questions with evidence as `ACCEPTED`,
   `ADJUSTED`, or `FLAGGED`. Use the response keys and the
   [review score rules](../reference/assessments.md#review-request).
3. Save decisions with `PUT /api/v1/assessments/{id}/evaluation/reviews`. Partial
   review maps are supported; the assessment remains pending.
4. If corrections are needed, save flagged decisions with reviewer notes, then
   call `PUT /api/v1/assessments/{id}/evaluation/send-back`.
5. Otherwise, classify all reviewable content and supply required scores/notes,
   then call `PUT /api/v1/assessments/{id}/evaluation/finish`.

Finish/send-back use saved reviews. Their optional bodies supply the desired
`evaluatorInsight`, not unsaved question decisions. Always resend the insight you
want to retain; omitting it clears it. Finish returns `COMPLETED` and recalculated
results. Flagged content must be resolved or sent back first.

Optionally request `POST /api/v1/assessments/{id}/agent-evaluation/draft` for
suggestions. The configured agent can summarize answers/evidence, but its output
does not save reviews or finish the assessment. Review the suggestions and submit
decisions through the same review endpoints.

## Correct a returned assessment

Open the existing `CHANGES_REQUESTED` row by ID. Read reviewer notes and update
flagged content. Preserve accepted answers and justifications unchanged, and
include the complete retained evidence snapshot. Save using the existing exact
draft ID, adding corrected keys to `respondentUpdatedResponseKeys`.

Resubmit that same ID after every flagged item has been recorded as updated. The
assessment returns to review for a manual model. Do not call “ensure draft” to
resume a returned assessment: that operation selects or creates a separate `DRAFT`.

| Current status | Action | Result |
|---|---|---|
| `DRAFT` | Save/reset | `DRAFT` |
| `DRAFT` | Submit automatic model | `COMPLETED` |
| `DRAFT` | Submit manual model | `PENDING_REVIEW` |
| `PENDING_REVIEW` | Save reviews | `PENDING_REVIEW` |
| `PENDING_REVIEW` | Send back | `CHANGES_REQUESTED` |
| `CHANGES_REQUESTED` | Save corrections | `CHANGES_REQUESTED` |
| `CHANGES_REQUESTED` | Resubmit manual model | `PENDING_REVIEW` |
| `PENDING_REVIEW` | Finish | `COMPLETED` |
