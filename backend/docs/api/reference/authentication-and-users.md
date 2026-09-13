# Authentication and users

[API index](../README.md#endpoint-index) · [Access rules](../authentication.md)

Sources: [controllers](../../../src/main/java/com/master_thesis/maturity_assessment/auth/controllers/),
[DTOs](../../../src/main/java/com/master_thesis/maturity_assessment/auth/dto/),
[help-tour service](../../../src/main/java/com/master_thesis/maturity_assessment/auth/services/UserHelpTourService.java).

## POST /api/v1/auth/register

Submit an account registration for admin approval.

**Access:** Public. **Request:** JSON with `email`, `password`, and optional
`name` and `organizationName`. The role is assigned by the server.

```json
{
  "email": "developer@example.com",
  "password": "replace-with-your-password",
  "name": "Example Developer",
  "organizationName": "Example Organization"
}
```

**Response:** `200`, with the body below. Creates a pending `USER`; no tokens.

```json
{
  "errorCode": "REGISTRATION_SUBMITTED",
  "message": "Your request was submitted. Admins will review it before granting access."
}
```

**Errors:** `400` with plain text `Email already registered` for an existing email.
Do not interpret the success body's `errorCode` field as a failed HTTP request.

## POST /api/v1/auth/login

**Access:** Public. **Request:** JSON:

```json
{"email":"developer@example.com","password":"replace-with-your-password"}
```

**Response:** `200`:

```json
{"accessToken":"<access-token>","refreshToken":"<refresh-token>"}
```

**Errors:** `401 INVALID_CREDENTIALS`; `403 ACCOUNT_PENDING_APPROVAL` for a
pending/disabled account; `500 INTERNAL_SERVER_ERROR` if authenticated user
details cannot be loaded.

## POST /api/v1/auth/refresh

**Access:** Public route; valid refresh token required. **Request:** JSON:

```json
{"refreshToken":"<refresh-token>"}
```

**Response:** `200`, the same token-pair shape as login. Revokes the old refresh
token and issues a replacement. Store both returned tokens.

**Errors:** `401` with plain text `Invalid or expired refresh token` for an
unknown, expired, or revoked token; `403 ACCOUNT_PENDING_APPROVAL` if the user
is not approved (also revokes that user's refresh tokens).

## GET /api/v1/user/me

Read the authenticated user's profile and help-tour preferences.

**Access:** Authenticated. **Request:** No body or parameters.
**Response:** `200` [UserDTO](#user-response).
**Errors:** Authentication failures; controller-level `404` with no body if the
profile cannot be found.

## PUT /api/v1/user/me/help-tours/{tourKey}/complete

Record completion of a supported help-tour version.

**Access:** Authenticated; changes the current user only.
**Request:** String `tourKey` path parameter; JSON `{"version":1}`.
Supported keys: `dashboard`, `assessment-dashboard`, `assessment-module`, and
`assessment-questions`. Each currently supports version `1`.

**Response:** `200` [UserDTO](#user-response). Repeated completion is idempotent;
completing a version clears an applicable dismissed prompt.
**Errors:** `400 UNKNOWN_HELP_TOUR`, `400 INVALID_HELP_TOUR_VERSION`, or
`400 BAD_REQUEST` for invalid body validation.

## PUT /api/v1/user/me/help-tours/{tourKey}/dismiss-prompt

Dismiss the invitation to start a help tour without marking it complete.

**Access:** Authenticated; current user only.
**Request:** Same `tourKey` and `{"version":1}` contract as completion.
**Response:** `200` [UserDTO](#user-response). Repeated dismissal is idempotent;
an already completed version is not added to dismissals.
**Errors:** Same tour-key/version validation as completion.

## User response

`UserDTO` is also returned by admin create/update/approve endpoints. It contains
no password or token fields. Profile names may be null, especially for accounts
created through the admin endpoint.

```json
{
  "id": 7,
  "email": "developer@example.com",
  "name": "Example Developer",
  "organizationName": "Example Organization",
  "role": "USER",
  "approvalStatus": "APPROVED",
  "helpBalloonsEnabled": true,
  "completedHelpTours": {"dashboard": 1},
  "dismissedHelpTourPrompts": {}
}
```

`role` is `USER`, `CURATOR`, or `ADMIN`; `approvalStatus` is `PENDING` or
`APPROVED`. Tour maps associate string keys with integer versions.
