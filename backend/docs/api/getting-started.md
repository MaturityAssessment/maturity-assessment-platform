# Make your first API request

[API documentation](README.md)

The Spring Boot backend exposes the platform API. The frontend consumes it.
For Java, PostgreSQL, environment configuration, and first-admin bootstrap, see
the [project setup guide](../../../GETTING_STARTED.md) and [backend README](../../README.md).

## Base URL

Local development uses `http://localhost:8080/api/v1`. For a deployed environment,
use its externally accessible backend URL, including any reverse-proxy prefix.
All endpoint paths in this guide include `/api/v1`; do not append that prefix twice.

These examples require cURL. Set a shell variable for the origin:

```bash
API_ORIGIN='http://localhost:8080'
curl --fail-with-body "$API_ORIGIN/api/v1/domain"
```

`GET /domain` is public. It returns a JSON array, possibly `[]` on a new database.

## Sign in

Use an approved account. Public registration creates a pending account and does
not issue tokens; an admin must approve it before login succeeds.

```bash
curl --fail-with-body "$API_ORIGIN/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  --data '{"email":"developer@example.com","password":"replace-with-your-password"}'
```

Successful response:

```json
{
  "accessToken": "<access-token>",
  "refreshToken": "<refresh-token>"
}
```

Copy the returned access token into the variable below, then request your profile:

```bash
ACCESS_TOKEN='replace-with-returned-access-token'
curl --fail-with-body "$API_ORIGIN/api/v1/user/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

The result is a [user object](reference/authentication-and-users.md#user-response).
Use the refresh token to obtain a new token pair when needed; refresh rotates it,
so replace both stored values. See [authentication](authentication.md).
Use placeholders in committed examples, never actual credentials or invitation tokens.

## Choose a workflow

- [Create, save, submit, and review an assessment](workflows/assessments.md).
- [Create a campaign and respond using an invitation](workflows/campaigns.md).
- [Import, create, version, and activate a model](workflows/model-management.md).
- [Browse every endpoint](README.md#endpoint-index).

Before implementing a client, read [conventions](conventions.md), especially
the error-format exceptions and the full-snapshot semantics of draft saves.
