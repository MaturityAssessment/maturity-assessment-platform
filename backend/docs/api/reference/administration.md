# Administration

[API index](../README.md#endpoint-index) · [Authentication](../authentication.md)

All operations require an `ADMIN` bearer token. Role denial currently returns
`401 INSUFFICIENT_PERMISSIONS`. Validation failures below often have **empty
bodies**, rather than the common JSON error shape.

Source: [AdminController](../../../src/main/java/com/master_thesis/maturity_assessment/auth/controllers/AdminController.java).
Object responses use [UserDTO](authentication-and-users.md#user-response).

## GET /api/v1/admin/users

List users, optionally filtering by `role` and/or `approvalStatus` query parameters.
Both filters are case-insensitive; roles are `USER`, `CURATOR`, `ADMIN`, and
approval statuses are `PENDING`, `APPROVED`. Empty filters are ignored.

**Request:** No body. Example: `/api/v1/admin/users?role=USER&approvalStatus=PENDING`.
**Response:** `200`, array of UserDTO objects; no pagination.
**Errors:** `400`, empty body, for invalid filter values.

## POST /api/v1/admin/users

Create an immediately approved account.

**Request:** JSON; `email`, `password`, and `role` are required:

```json
{"email":"reviewer@example.com","password":"replace-with-your-password","role":"CURATOR"}
```

**Response:** `200`, created UserDTO with `approvalStatus: "APPROVED"`.
**Errors:** `400`, empty body, for missing required values or an existing email.
This endpoint's request DTO does not include `name` or `organizationName`.

## PUT /api/v1/admin/users/{id}

Update an existing user. Numeric `id` is the target user ID.

**Request:** JSON with optional `email` and `role`:

```json
{"role":"CURATOR"}
```

Despite using PUT, this operation updates only supplied values. Empty email
values are ignored. `approvalStatus` is changed through approval, not here.
Supplying the legacy `password` field returns `400 PASSWORD_RESET_REQUIRED`;
use the reset endpoint below to change an existing user's password.
**Response:** `200`, updated UserDTO.
**Errors:** `404` if missing; `400` if the email belongs to another user. Both
controller responses are empty.

## POST /api/v1/admin/users/{id}/reset-password

Generate a cryptographically random temporary password for an approved user
and email it to that user's stored email address. The admin user-management
page provides a **Reset password** action with a confirmation dialog.

**Access:** Admin only. **Request:** Numeric user `id`; no body.
**Response:** `204`, no body. The generated password is never returned to the
administrator. Only its BCrypt hash is stored. All previous access/refresh
tokens are invalidated, and `passwordChangeRequired` becomes true.

The temporary password expires after 24 hours. The user signs in with it and
must replace it through `PUT /api/v1/user/me/password` before continuing.
The temporary password is entered as `currentPassword` in that request.
A subsequent reset replaces the earlier temporary password.

**Errors:** `404 USER_NOT_FOUND`; `400 ACCOUNT_NOT_APPROVED` for pending users;
`503 REQUEST_REJECTED` if email is disabled, the sender is missing, or SMTP
reports failure. Those failures roll back the password and session changes.
Uses the existing `APP_MAIL_ENABLED`, `MAIL_*`, and `APP_FRONTEND_URL` settings.
SMTP acceptance confirms submission to the mail server; later bounces are not
tracked. As with any database/SMTP operation, a database commit failure after
SMTP acceptance can leave an email containing an unusable password; an admin
can retry the reset.

User requests for an admin password reset are not implemented.

## DELETE /api/v1/admin/users/{id}

Delete a user and the assessments selected by that user's ID.

**Request:** Numeric user `id`; no body.
**Response:** `200`, no body.
**Errors:** `400` when deleting your own account; `404` if absent. Other database
relationships can still cause a `500` integrity error; this is not a general
campaign/evidence cleanup endpoint.

## PATCH /api/v1/admin/users/{id}/approve

Approve a pending account so it can log in.

**Request:** Numeric user `id`; no body.
**Response:** `200`, UserDTO with `approvalStatus: "APPROVED"`.
**Errors:** `404` if absent; `400` unless the account is currently `PENDING`.
Repeating approval after success returns `400`.

## PATCH /api/v1/admin/users/{id}/reject

Reject a pending registration by deleting the account.

**Request:** Numeric user `id`; no body.
**Response:** `200`, no body.
**Errors:** `400` for your own account or a non-pending account; `404` if absent.
