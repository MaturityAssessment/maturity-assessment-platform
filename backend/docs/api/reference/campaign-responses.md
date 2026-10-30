# Campaign responses

[API index](../README.md#endpoint-index) · [Campaign workflow](../workflows/campaigns.md)

Every operation requires a bearer token for an approved user who has completed password and profile setup and belongs to the campaign. Campaign IDs identify a resource, not a credential. Wrong-account access returns `403`; revoked memberships or ended campaigns return `410`. Anonymous requests return `401`.

## GET /api/v1/campaign-response/{campaignId}

Open or resume the user's assessment. First access creates a draft. Returns `200` with `campaignName`, `participantEmail`, `endsAt`, and `assessment` (including evidence). Load the model using `assessment.maturityModelId`.

## PUT /api/v1/campaign-response/{campaignId}

Save a complete draft snapshot using the [multipart assessment format](assessments.md#multipart-request). `assessment` and `evidenceMetadata` are required. The model must match the campaign. Returns `200` AssessmentResponse. Invalid payloads return `400`; non-editable state or changed accepted answers return `409`.

## POST /api/v1/campaign-response/{campaignId}/submit

Submit using the same multipart format. Returns `200` with `COMPLETED` for automatic models or `PENDING_REVIEW` for manual models. Missing required answers/evidence return `400`; repeated submission or unresolved corrections return `409`.

## GET /api/v1/campaign-response/{campaignId}/evidence/{evidenceId}/download

Download evidence belonging to the user's campaign assessment. Returns `200` binary content with an attachment filename. Missing evidence returns `404`, another participant's evidence returns `403`, and a non-file item returns `400`.

There is no separate evidence-delete endpoint for respondents. Remove evidence from the complete snapshot when saving an editable assessment. All operations enforce the campaign deadline, including downloads.
