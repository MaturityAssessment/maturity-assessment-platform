# Campaign management

[API index](../README.md#endpoint-index) · [Campaign workflow](../workflows/campaigns.md)

Sources: [controller](../../../src/main/java/com/master_thesis/maturity_assessment/campaigns/controllers/CampaignController.java),
[service](../../../src/main/java/com/master_thesis/maturity_assessment/campaigns/services/CampaignService.java),
[DTOs](../../../src/main/java/com/master_thesis/maturity_assessment/campaigns/dto/).

All routes require a bearer token. Any authenticated role can create campaigns.
Detail, results, deletion, and invitation reissue are restricted to the creator;
admins do not get an ownership bypass. An inaccessible campaign is reported as
`404`, the same as a missing one.

## GET /api/v1/campaigns

**Request:** No body or filters.
**Response:** `200`, array of [campaign summaries](#campaign-contracts) created
by the current user, newest creation first.

## POST /api/v1/campaigns

Create a campaign tied to an active model version and queue participant invitations.

**Request:** JSON:

```json
{
  "name": "Engineering review",
  "endsAt": "2027-01-15T18:00:00Z",
  "maturityModelId": 1,
  "participantEmails": ["respondent@example.com"]
}
```

Replace `endsAt` with a future instant and use an active model ID. `name` is
required, nonblank, at most 150 characters. `participantEmails` must contain
1–1,000 valid addresses, each at most 255 characters. Addresses are normalized
to lowercase/trimmed and must be unique after normalization.

**Response:** `201`, [campaign detail](#campaign-contracts). Participant token
values are not included. Initial invitations are dispatched asynchronously after
commit when email is enabled; a successful API response does not confirm delivery.
The current email implementation has no persisted delivery status or retry API.

**Errors:** `400` invalid fields, `CAMPAIGN_MODEL_INACTIVE`,
`DUPLICATE_PARTICIPANT_EMAIL`, or `INVALID_PARTICIPANT_EMAIL`; `404` missing model.

## GET /api/v1/campaigns/{id}

**Request:** Numeric campaign ID; no body.
**Response:** `200`, campaign detail with participant progress and assessment IDs.
**Errors:** `404` missing/not owned.

## GET /api/v1/campaigns/{id}/results

**Request:** Numeric campaign ID; no body.
**Response:** `200`, [results contract](#results-contract). Aggregates scores only
from `COMPLETED` assessments. Submitted counts include `PENDING_REVIEW` and
`COMPLETED`; returned assessments are not included in that submitted count.
**Errors:** `404` missing/not owned.

## DELETE /api/v1/campaigns/{id}

**Request:** Numeric campaign ID; no body.
**Response:** `204`, no body. Deletes an eligible campaign and its participants.
**Errors:** `404` missing/not owned; `400 CAMPAIGN_HAS_ASSESSMENTS` if any participant
assessment exists, even an empty draft created by opening an invitation.

## POST /api/v1/campaigns/{campaignId}/participants/{participantId}/invitation

Replace a participant's invitation token.

**Request:** Numeric campaign and participant IDs; no body.
**Response:** `200`:

```json
{"participantId":12,"invitationToken":"<new-invitation-token>"}
```

The previous token stops working and any `revokedAt` value is cleared. The raw
replacement token is returned once; list/detail endpoints expose no token. This
operation does not send a replacement email. The caller must deliver the new link
through its intended invitation flow. A retry rotates the token again.
**Errors:** `404` participant/campaign missing or not owned; `400 CAMPAIGN_ENDED`
after the campaign deadline.

## Campaign contracts

| Contract | Fields |
|---|---|
| Summary | `id`, `name`, `endsAt`, `maturityModelId`, `maturityModelName`, `maturityModelVersion`, `participantCount`, `completedParticipantCount`, `createdAt` |
| Detail | `id`, `name`, `endsAt`, `maturityModelId`, `maturityModelName`, `maturityModelVersion`, `createdAt`, `updatedAt`, `participants` |
| Participant | `id`, `email`, `completed`, `assessmentId`, `assessmentStatus`, `revokedAt`, `createdAt` |

Campaign timestamps are ISO instants. Participant assessment fields may be null
before first opening the invitation. `completed` and `completedParticipantCount`
represent submitted responses (`PENDING_REVIEW` or `COMPLETED`), not just finished
evaluations. Detail does not return raw invitation tokens or assessment answers.

Example detail excerpt:

```json
{
  "id": 3,
  "name": "Engineering review",
  "endsAt": "2027-01-15T18:00:00Z",
  "maturityModelId": 1,
  "maturityModelVersion": 1,
  "participants": [{
    "id": 12,
    "email": "respondent@example.com",
    "completed": false,
    "assessmentId": null,
    "assessmentStatus": null,
    "revokedAt": null
  }]
}
```

## Results contract

| Field | Meaning |
|---|---|
| `campaignId` | Campaign ID |
| `participantCount` | All participants |
| `submittedParticipantCount` | Pending-review plus completed assessments |
| `evaluatedParticipantCount` | Completed assessments |
| `overallAverage` | Average of non-null completed assessment scores; null with no scores |
| `maturityLevels` | Objects with `maturityLevel`, `participantCount`, `percentage` |
| `dimensions` | Objects with `dimensionId`, `dimensionName`, `averageScore`, `responseCount` |
| `participants` | Completed results with `participantId`, `email`, `assessmentId`, `overallScore`, `overallMaturityLevel`, `evaluatedAt` |

`evaluatedAt` is the assessment's local `updatedAt`, not a separate evaluation
audit timestamp. Empty campaigns return empty aggregate/result arrays.
