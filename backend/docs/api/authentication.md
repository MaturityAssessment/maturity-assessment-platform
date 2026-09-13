# Authentication and access

[API documentation](README.md)

## Account lifecycle

Public registration creates a `USER` with `approvalStatus: "PENDING"`. It returns
a submission message, not tokens. An admin approves the account through
`PATCH /api/v1/admin/users/{id}/approve`. Rejecting a pending registration deletes
the account; there is no persisted `REJECTED` status. Admin-created users are
immediately `APPROVED`.

Login returns `403 ACCOUNT_PENDING_APPROVAL` for a disabled pending account and
`401 INVALID_CREDENTIALS` for invalid credentials. See the
[authentication endpoints](reference/authentication-and-users.md).

## Bearer tokens

Send the access token on authenticated requests:

```http
Authorization: Bearer <access-token>
```

The backend uses stateless JWT authentication. The configured default access-token
lifetime is 30 minutes; refresh tokens last 30 days. Deployments can override
`jwt.access-token.expiration` and `jwt.refresh-token.expiration` (milliseconds).
Refresh tokens are opaque values; do not assume they are JWTs.

`POST /api/v1/auth/refresh` accepts `{"refreshToken":"<refresh-token>"}` and returns
a new pair. The old refresh token is revoked. Coordinate refresh requests in
your client and replace both values after a successful refresh. There is no
logout/revoke endpoint in the current controller API.

## Permissions

| Access label | Meaning in the reference |
|---|---|
| Public | No bearer token required |
| Authenticated | Signed-in user; roles are `USER`, `CURATOR`, and `ADMIN` |
| Curator/admin | Requires `CURATOR` or `ADMIN` |
| Admin | Requires `ADMIN` |
| Owner | Requires the relevant user/resource ownership check as well as authentication |
| Campaign token | Requires `X-Campaign-Token`, independently of user login |

Roles do not override every ownership restriction. Campaign management is scoped
to the creator, including for admins. Exact-draft writes require the respondent
owner. Curators/admins can review submitted assessments, but cannot use evidence
reads to inspect another user's draft.

Domain reads and most model reads are public. The model editor read endpoint
`GET /api/v1/maturity-model/{id}/editor` additionally requires curator/admin access.
Read each endpoint's permission rule; a public path prefix does not imply that
every operation under it is public.

## Campaign invitations

Campaign respondents send:

```http
X-Campaign-Token: <invitation-token>
```

These endpoints do not require a platform account or bearer token. The invitation
grants access to one campaign participant's assessment. Invalid tokens return
`404`; revoked invitations and ended campaigns return `410`. Reissuing an
invitation replaces its token, invalidating the old one. Tokens are not returned
by campaign list/detail endpoints. See [campaign responses](reference/campaign-responses.md).

## Handling access failures

The current security layer returns `401` for both unauthenticated requests and
role denials, with different codes (`UNAUTHORIZED` and `INSUFFICIENT_PERMISSIONS`).
Service-level ownership checks can return `403`. Do not implement an endless
refresh/retry loop for every `401`; inspect the error code.

Implementation sources: [SecurityConfig](../../src/main/java/com/master_thesis/maturity_assessment/config/SecurityConfig.java),
[JwtAuthFilter](../../src/main/java/com/master_thesis/maturity_assessment/config/JwtAuthFilter.java),
[RefreshTokenService](../../src/main/java/com/master_thesis/maturity_assessment/auth/services/RefreshTokenService.java).
