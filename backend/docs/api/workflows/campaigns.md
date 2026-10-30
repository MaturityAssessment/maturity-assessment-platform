# Campaign workflow

[API documentation](../README.md) · [Management](../reference/campaigns.md) · [Responses](../reference/campaign-responses.md)

1. An approved user creates a campaign using an active model, deadline, and unique email addresses. Management remains restricted to its creator.
2. Existing accounts are matched case-insensitively without changing their credentials or approval. Missing accounts become permanent `USER` accounts awaiting admin approval, with no name or organization yet.
3. Invitation notices are sent after commit. Pending users are told approval is required; new users receive their temporary password only when approved. SMTP invitation failures are logged; the creator can copy the link again.
4. An admin approves a new account. Credential email failure rolls back approval so it can be retried. Rejection deletes the pending account and its memberships.
5. The invitee opens `/assessment?campaignId=...` under the configured frontend base URL and signs in with the invited account. New users change their temporary password, sign in again, and complete name and organization. The campaign destination survives these steps.
6. The frontend opens `GET /api/v1/campaign-response/{campaignId}`, creating one draft per membership if necessary. Save with `PUT` at the same path and submit with `POST .../submit`, using bearer authentication and the existing assessment/evidence multipart format.
7. Download files through `GET /api/v1/campaign-response/{campaignId}/evidence/{evidenceId}/download`.

Campaign discovery remains email-based. No invited-campaign list is added. The creator's copy-link action returns a stable campaign link, which still requires the invited account. Old anonymous links no longer work.

Wrong-account access returns `403`; revoked memberships and expired campaigns return `410` for reads, writes, and downloads. Submitted assessments reject edits with `409`. Returned assessments can be corrected before the deadline. Standalone assessment routes do not grant campaign respondent access.

Creators monitor participant progress and campaign results as before. Curators/admins retain review access to submitted assessments. Campaign deletion remains restricted to campaigns without assessments; user deletion is blocked when campaign memberships exist.
