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

**Request:** JSON with optional `email`, `password`, and `role`:

```json
{"role":"CURATOR"}
```

Despite using PUT, this operation updates only supplied values. Empty email or
password values are ignored. `approvalStatus` is changed through approval, not here.
**Response:** `200`, updated UserDTO.
**Errors:** `404` if missing; `400` if the email belongs to another user. Both
controller responses are empty.

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
