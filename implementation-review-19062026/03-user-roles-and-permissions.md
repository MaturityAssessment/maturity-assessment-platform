# User Roles and Permissions

**Implementation snapshot:** 19 June 2026

## Authentication model

The platform uses stateless Spring Security authentication with:

- email/password login;
- BCrypt password hashes;
- a JWT access token, configured for 30 minutes by default;
- an opaque database-backed refresh token, configured for 30 days by default;
- refresh-token rotation;
- bearer tokens attached by the frontend Axios client.

The frontend stores both tokens in `localStorage`. Logging out clears browser storage but does not revoke refresh tokens on the server.

References:

- `auth/controllers/AuthenticationController.java`;
- `auth/services/RefreshTokenService.java`;
- `config/JwtAuthFilter.java`;
- `config/SecurityConfig.java`;
- `frontend/src/api/axios.ts`;
- `frontend/src/context/AuthContext.tsx`.

## Registration and approval

Self-registration is public. A new account is created with:

- role `USER`;
- approval status `PENDING`;
- supplied name, organization, email, and password.

Registration does not return login tokens. An administrator must approve the request before the user can log in. Rejection deletes the pending user record.

Approval statuses:

- `PENDING`;
- `APPROVED`.

No suspended, disabled, locked, or rejected status is retained.

## Role hierarchy

The entity authority mapping is hierarchical:

```text
ADMIN   → ROLE_ADMIN + ROLE_CURATOR + ROLE_USER
CURATOR → ROLE_CURATOR + ROLE_USER
USER    → ROLE_USER
```

The same hierarchy is reimplemented in several frontend components. `EVALUATOR` is a deprecated database role migrated to `CURATOR`.

## Permission matrix

The table describes enforced backend behavior unless a frontend qualification is stated.

| Capability | Public | USER | CURATOR | ADMIN |
|---|---:|---:|---:|---:|
| Register | Yes | Yes | Yes | Yes |
| Log in/refresh token | Yes | Yes | Yes | Yes |
| Read domains | Yes | Yes | Yes | Yes |
| Read maturity models and versions | Yes | Yes | Yes | Yes |
| Download model XLSX | Yes | Yes | Yes | Yes |
| Create/delete domains | No | No | Yes | Yes |
| Create/import/version models | No | No | Yes | Yes |
| Activate/deactivate/delete models | No | No | Yes | Yes |
| Start and submit assessment | No | Yes | Yes | Yes |
| Save/read own drafts | No | Yes | Yes | Yes |
| List own assessments | No | Yes | Yes | Yes |
| Read own assessment | No | Yes | Yes | Yes |
| Read any assessment | No | No | Yes | Yes |
| Delete own assessment | No | Yes | Yes | Yes |
| Delete another user's assessment | No | No | Yes | Yes |
| List all assessments | No | No | Yes | Yes |
| List pending-review assessments | No | No | Yes | Yes |
| Manually evaluate/complete pending assessment | No | No | Yes | Yes |
| Download own evidence file | No | Yes | Yes | Yes |
| Download any evidence file | No | No | Yes | Yes |
| Delete evidence | No | Owner only | Owner only | Owner only |
| Use dashboard assistant | No | Yes | Yes | Yes |
| View users | No | No | No | Yes |
| Approve/reject access request | No | No | No | Yes |
| Change user role/email/password | No | No | No | Yes |
| Delete another user | No | No | No | Yes |
| Create approved user through API | No | No | No | Yes |

## Role-specific behavior

### USER

Implemented activities:

- register and wait for approval;
- log in and maintain a token session;
- select a domain with an active model;
- conduct, save, resume, and submit assessments;
- view and export completed own results;
- download evidence from own assessments;
- delete own assessments;
- use the dashboard assistant.

No respondent profile or organization-management page is implemented.

### CURATOR

CURATOR inherits USER permissions and additionally:

- manages domains;
- creates models manually or from Excel;
- creates new model versions;
- activates/deactivates/deletes model versions;
- lists and reads all users' assessments;
- reviews pending assessments;
- manually scores eligible responses;
- downloads evidence from any assessment;
- deletes any assessment;
- exports/imports the advisory agent-report JSON workflow.

The role name combines two responsibilities—model stewardship and assessment evaluation—which may be conceptually distinct for study participants.

### ADMIN

ADMIN inherits CURATOR permissions and additionally:

- lists users;
- filters users by role or approval state through the API;
- approves or rejects pending registrations;
- changes approved-user roles;
- changes email/password through the API;
- deletes users other than the current administrator;
- creates an approved user through the API.

The current admin screen exposes approval/rejection, role changes, and deletion. It does not expose the backend's create-user, email-change, or password-change capabilities.

## Frontend route visibility

The navigation menu hides curator/admin links based on `AuthContext.user.role`. Some individual screens also redirect lower roles.

Implemented route checks include:

- `/domains`: redirects non-curators;
- `/assessments/all`: redirects non-curators;
- menu visibility for model/domain/evaluation/admin links.

Important gaps:

- `/maturity-models`, `/maturity-models/[id]`, and `/maturity-models/new` have no consistent frontend role guard;
- model detail renders activate, deactivate, edit, and delete controls without checking the role;
- `/evaluate` relies primarily on backend rejection and does not first validate the current role;
- public model/domain `GET` APIs mean model contents are readable without authentication by design.

Backend authorization still blocks protected mutations, but these gaps can produce confusing dead-end interactions for USER accounts.

## Ownership and access rules

### Assessments

- A USER can retrieve an assessment only when `assessment.user.id` matches the current user.
- CURATOR and ADMIN can retrieve any assessment.
- A USER can delete an owned assessment.
- CURATOR and ADMIN can delete any assessment.
- There is no assignment of a specific curator to an assessment.

### Evidence

- File creation is allowed only for the assessment owner.
- File download is allowed to the owner, CURATOR, or ADMIN.
- Evidence deletion is allowed only to the assessment owner, even for CURATOR/ADMIN.
- **Authorization gap:** evidence metadata list endpoints do not check ownership or elevated role. Any authenticated user who knows an assessment ID can request its evidence metadata.
- URL evidence cannot be downloaded as a file.

### Models and domains

- All read endpoints are public.
- Domain/model mutations require CURATOR or ADMIN.
- Model deletion is blocked if that exact model version has assessments.
- Domain deletion is blocked while any models reference it.

## Hardcoded assumptions

1. Role hierarchy is fixed as `ADMIN > CURATOR > USER`.
2. Self-registered users always receive role `USER`.
3. Self-registered users always require admin approval.
4. There is no self-service password reset, email verification, profile editing, logout revocation, or multi-factor authentication.
5. ADMIN is allowed to change its own role; the backend reads the current user in the update method but does not use it to prevent self-demotion.
6. ADMIN cannot delete itself, but can delete another user and that user's assessments.
7. Deleting a user explicitly deletes the user's assessments before deleting the user.
8. CURATOR is both model author and assessment evaluator.
9. Access-denied responses are currently emitted as HTTP 401 by the configured handler, even when the user is authenticated but lacks a role.

## Gaps and unclear boundaries

| Issue | Status | Verification or remediation |
|---|---|---|
| Evidence metadata list lacks ownership check | Implemented security gap | Add the same owner/curator rule used for download |
| Model-management screens lack reliable client guards | Partial | Hide/disable controls and redirect USER accounts |
| Backend returns 401 for insufficient role | Implemented mismatch | Prefer 403 for authenticated authorization failure and align frontend handling |
| Registration validation is minimal | Partial | Add backend bean validation, password policy, normalized email handling |
| Public model/domain reads | Intentional in code, product intent uncertain | Confirm whether model intellectual property should be public |
| No evaluator assignment or review ownership | Not implemented | Decide whether any curator may review any pending assessment |
| No immutable audit of role changes or approvals | Not implemented | Add audit events if evaluation or governance requires traceability |
| No server-side logout/revocation endpoint | Not implemented | Consider revoking all active refresh tokens |
| `UserController /me` omits name and organization | Partial | Populate all `UserDTO` fields if the UI will use profile identity |

## Security configuration risks

These do not change the role matrix, but they affect deployment readiness:

- JWT signing material is hardcoded in source.
- The external assistant has a configured default credential in application properties.
- Trust-all TLS can be enabled and is currently defaulted on for the assistant integration.
- tokens are readable by JavaScript because they are in `localStorage`.
- broad controller-level `@CrossOrigin("*")` annotations coexist with centralized CORS configuration.

Do not use real evaluation-participant data until secrets are externalized, the exposed credential is rotated, TLS verification is enabled, and authorization gaps are resolved.

## Primary traceability references

- `backend/src/main/java/com/master_thesis/maturity_assessment/auth/`
- `backend/src/main/java/com/master_thesis/maturity_assessment/config/SecurityConfig.java`
- `backend/src/main/java/com/master_thesis/maturity_assessment/assessments/services/EvidenceService.java`
- `backend/src/main/java/com/master_thesis/maturity_assessment/assessments/services/AssessmentService.java`
- `frontend/src/components/AppNavigationMenu.tsx`
- `frontend/src/app/admin/page.tsx`
- `frontend/src/app/domains/page.tsx`
- `frontend/src/app/maturity-models/[id]/page.tsx`
