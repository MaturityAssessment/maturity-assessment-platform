# Campaign identity and legacy-code map

Reviewed against repository source on 2026-11-12. This is a source audit, not a
verification that any particular deployed database has applied its migrations.

## Current account model

All authenticated people are `User` accounts. `UserRole` contains only `USER`,
`CURATOR`, and `ADMIN`. A campaign invitation reuses an account by email, or
provisions a permanent `USER` account. `CampaignParticipant` is the retained name
for a campaign membership: its required `user_id` points to that account.
Membership survives password changes and records campaign-specific access,
revocation, and the associated assessment.

The temporary state is on `User`, not a participant account type. The current
implementation also requires approval and profile completion for newly provisioned
invitees. Those additional requirements are recorded here as existing behavior;
this mapping does not change onboarding policy.

| Concern | Source | Current behavior |
| --- | --- | --- |
| Roles and account flags | `backend/src/main/java/com/master_thesis/maturity_assessment/auth/models/UserRole.java`, `User.java` | Three platform roles; `passwordChangeRequired`, `temporaryPasswordExpiresAt`, `profileCompletionRequired`, `initialCredentialsPending`, and approval state belong to the user. |
| Provisioning | `backend/src/main/java/com/master_thesis/maturity_assessment/auth/services/AccountProvisioningService.java` | Reuses existing accounts without changing credentials; new invitees are pending `USER` accounts. Approval issues initial credentials when needed. |
| Temporary credentials | `backend/src/main/java/com/master_thesis/maturity_assessment/auth/services/PasswordService.java` | Temporary passwords expire after 24 hours. Password change clears the required-change flag and expiry. |
| Access gate | `backend/src/main/java/com/master_thesis/maturity_assessment/config/JwtAuthFilter.java`, `SecurityConfig.java` | Normal bearer authentication; setup restrictions enforced before application access, including campaign endpoints. |
| Membership | `backend/src/main/java/com/master_thesis/maturity_assessment/campaigns/models/CampaignParticipant.java`, `repository/CampaignParticipantRepository.java` | Required `User` relation; membership lookup by campaign and signed-in user. |
| Campaign creation/link recovery | `backend/src/main/java/com/master_thesis/maturity_assessment/campaigns/services/CampaignService.java`, `email/CampaignInvitationEmailService.java` | Creates memberships; emails a campaign-ID link. `reissueInvitation` reactivates membership and returns IDs; it does not rotate authentication tokens. |
| Campaign assessment access | `backend/src/main/java/com/master_thesis/maturity_assessment/campaigns/controllers/CampaignRespondentController.java`, `services/CampaignRespondentService.java` | Signed-in user plus active membership; wrong account denied, revoked/expired access denied. Separate resource routes remain intentional. |
| Assessment ownership | `backend/src/main/java/com/master_thesis/maturity_assessment/assessments/models/Assessment.java`, `services/AssessmentService.java` | User owns the assessment; campaign assessments additionally reference a campaign and membership. Campaign overloads resolve membership scope, not another authentication type. |
| Evidence | `backend/src/main/java/com/master_thesis/maturity_assessment/assessments/services/EvidenceService.java`, `AssessmentEvidenceWorkflowService.java` | Campaign overloads check membership; uploader is the membership's normal user. |
| Frontend | `frontend/src/app/assessment/layout.tsx`, `AssessmentFlow.tsx`, `useAssessmentAutosave.ts`, `assessmentRoutes.ts` | Campaign ID selects the assessment context; normal authentication is still required. Campaign management uses membership/progress DTOs named `CampaignParticipant`. |
| New audit records | `backend/src/main/java/com/master_thesis/maturity_assessment/assessments/services/AssessmentAuditService.java`, `models/AssessmentLog.java` | `actorUserId` is always the person. `actorCampaignParticipantId` is optional membership context. `actorRole` identifies `RESPONDENT` or `EVALUATOR` for the action, not a platform account type. Evaluator records use the reviewer's user ID and do not inherit the respondent's membership ID. |

## Legacy artifacts and their disposition

| Artifact | Location | Classification / disposition |
| --- | --- | --- |
| Original accountless campaign schema and hashed invitation tokens | `backend/src/main/resources/db/migration/V21__add_campaign_persistence.sql` | Historical migration. Preserve it; V43 supersedes this identity model. |
| Removal of accountless access | `backend/src/main/resources/db/migration/V43__campaign_user_accounts.sql` | Adds required membership `user_id`, removes invitation token hashes and participant-only evidence uploaders, requires assessment user ownership. Includes a pre-launch reset of old campaign data; do not rerun as a cleanup script. |
| Old `campaignToken` query parameter | `frontend/src/app/assessment/layout.tsx` | Intentional rejection of old links with a request for a new invitation; grants no access. |
| `X-Campaign-Token` in tests | `backend/src/test/java/com/master_thesis/maturity_assessment/campaigns/controllers/CampaignRespondentSecurityTest.java` | Negative regression test asserting old token-only requests are unauthorized. Keep it. |
| Old schema columns in fixtures | `backend/src/test/java/com/master_thesis/maturity_assessment/campaigns/CampaignAccountMigrationTest.java`, `assessments/services/PracticeEvidenceMigrationTest.java` | Historical migration inputs, not runtime authentication. Keep them to test upgrades. |
| Accountless participant described as a user type | `PROJECT_OVERVIEW.md` | Corrected to an invited member using a normal account. |
| Accountless participation and token replacement claims | `CORE_FEATURES.md` | Corrected to authenticated accounts, membership reactivation, and stable campaign links. |
| Token-link/hash email description | `backend/README.md` | Corrected to campaign-ID links and normal sign-in. |
| Unauthenticated membership and removed hash column | `DATABASE_SCHEMA.md` | Corrected to the current user-backed membership schema and required assessment user ownership. |
| `CampaignParticipant` naming | Backend entity/repository/DTOs and frontend campaign types | Active membership terminology, not dead authentication code. A rename to `CampaignMembership` could improve clarity, but would span API contracts, persistence mappings, and tests; no rename was performed in this mapping. |

No runtime token-only campaign authentication path was found in the inspected
backend or frontend source. Existing tests and current API documentation explicitly
require normal accounts. Older migrations and negative tests intentionally retain
references to the retired model.
