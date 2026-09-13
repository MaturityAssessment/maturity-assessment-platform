# Campaign responses

[API index](../README.md#endpoint-index) · [Campaign workflow](../workflows/campaigns.md)

Sources: [controller](../../../src/main/java/com/master_thesis/maturity_assessment/campaigns/controllers/CampaignRespondentController.java),
[service](../../../src/main/java/com/master_thesis/maturity_assessment/campaigns/services/CampaignRespondentService.java).

Every operation requires the `X-Campaign-Token` header. No bearer token or platform
account is required. The token selects one participant and the campaign's exact
model version. Common token errors: `404` unknown/invalid invitation, `410` revoked
invitation or ended campaign. The header is mandatory; do not use an Authorization
bearer token or a query parameter as a substitute.

## GET /api/v1/campaign-response

Open the participant session. **This GET can create a draft** on first access.

**Request:** Campaign-token header; no body or parameters.
**Response:** `200`, `CampaignAssessmentSessionResponse`:

| Field | Type |
|---|---|
| `campaignName` | String |
| `participantEmail` | String |
| `endsAt` | ISO instant |
| `assessment` | [AssessmentResponse](assessments.md#assessment-response), including evidence |

Subsequent calls return the same participant assessment, including submitted or
returned state while the campaign token remains valid. Load the public model
using `assessment.maturityModelId` to obtain the question hierarchy.

```bash
CAMPAIGN_TOKEN='replace-with-invitation-token'
curl --fail-with-body "$API_ORIGIN/api/v1/campaign-response" \
  -H "X-Campaign-Token: $CAMPAIGN_TOKEN"
```

## PUT /api/v1/campaign-response

Save the participant's complete draft snapshot.

**Request:** Campaign-token header; [multipart assessment request](assessments.md#multipart-request).
`assessment` and `evidenceMetadata` are required. Numeric `maturityModelId` must
match the campaign version; the assessment is selected by the token, not by a
client-supplied assessment ID.
**Response:** `200` AssessmentResponse, still `DRAFT` or `CHANGES_REQUESTED`.
**Errors:** Common token errors; `400` invalid/mismatched data, evidence placement,
or file pairing; `409` non-editable state or changed accepted answers; upload limits apply.

## POST /api/v1/campaign-response/submit

Submit the participant assessment and calculate results.

**Request:** Same header and required multipart parts as draft save.
**Response:** `200` AssessmentResponse, now `COMPLETED` for automatic models or
`PENDING_REVIEW` for manual models.
**Errors:** Save errors plus `400` missing visible required answers/evidence and
`409` unresolved flagged corrections. Repeating a successful submission returns
`409`. A returned assessment can be corrected and resubmitted before the deadline.

## GET /api/v1/campaign-response/evidence/{evidenceId}/download

Download a file belonging to this participant's assessment.

**Request:** Campaign-token header; numeric evidence ID; no body.
**Response:** `200` binary `application/octet-stream` with attachment filename.
**Errors:** Common token errors; `404` evidence absent; `403` evidence belongs to
another participant; `400` URL evidence is not downloadable. A missing physical
file currently reaches the generic `500` handler on this route.

Use this path instead of the ordinary evidence `downloadUrl` when authenticating
with an invitation. There is no standalone campaign evidence-delete route; remove
the item from the complete evidence snapshot when saving an editable assessment.
