# Campaign workflow

[API documentation](../README.md) · [Management reference](../reference/campaigns.md)
· [Respondent reference](../reference/campaign-responses.md)

## Create and distribute invitations

1. Sign in. Any authenticated role can create a campaign; later management is
   restricted to its creator.
2. Select an active model through `GET /api/v1/maturity-model/active`.
3. Call `POST /api/v1/campaigns` with a name, future `endsAt`, exact model ID,
   and unique participant email addresses. Store the returned campaign and
   participant IDs.
4. When mail is enabled, initial invitations are queued for asynchronous delivery
   after creation. The response confirms campaign creation, not email delivery.

The email contains a frontend `/assessment?campaignToken=...` link. That query
parameter is consumed by the frontend; API calls send the value in
`X-Campaign-Token`. Backend mail/frontend URL configuration is described in the
[backend README](../../../README.md#gmail-campaign-invitations).

For a replacement invitation, call
`POST /api/v1/campaigns/{campaignId}/participants/{participantId}/invitation`.
Use the returned raw token in the replacement link. This rotates the token and
does not send an email. Calling it again invalidates the previous replacement.
Never expect list/detail endpoints to reveal existing tokens.

## Respond without a platform account

1. Send `GET /api/v1/campaign-response` with `X-Campaign-Token`. Opening the
   invitation creates the participant's draft if absent.
2. Read the session's `assessment.maturityModelId` and load the public full model.
   Invitations stay tied to the campaign's selected version.
3. Save with `PUT /api/v1/campaign-response`: use the same answer-map and evidence
   metadata format as individual assessments, with the campaign-token header.
4. Submit with `POST /api/v1/campaign-response/submit`. An automatic model completes
   immediately; a manual model enters `PENDING_REVIEW`.
5. Use `/api/v1/campaign-response/evidence/{evidenceId}/download` for file evidence.

Save and submit require `assessment` and `evidenceMetadata` multipart parts. Send
the full snapshot and retain existing evidence IDs. See the
[assessment workflow](assessments.md) for response keys and review transitions.
There is no campaign-specific reset or standalone evidence deletion endpoint.

An unknown token returns `404`; a revoked invitation or ended campaign returns
`410`. Expiry applies to session reads and downloads as well as writes. A
submitted assessment rejects edits with `409`. If a reviewer sends it back, the
participant can reopen the same invitation, correct flagged items, and resubmit
before the deadline.

## Monitor and review

Read `GET /api/v1/campaigns/{id}` for participant progress. “Completed participant”
means submitted, including responses awaiting review. Use
`GET /api/v1/campaigns/{id}/results` for aggregates from completed evaluations;
its evaluated count distinguishes finished reviews from submissions.

Curators/admins review submitted campaign assessments using the ordinary
[assessment review endpoints](assessments.md#review-a-manual-assessment).
Campaign ownership alone does not grant curator review permissions.

Deletion is allowed only while the campaign has no participant assessments.
Simply opening an invitation creates a draft and therefore prevents campaign
deletion, even before answers are submitted.
