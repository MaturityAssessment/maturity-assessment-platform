# API conventions

[API documentation](README.md)

## Requests and responses

Use `Content-Type: application/json` for JSON bodies. Multipart operations are
identified explicitly in their reference pages. When using browser `FormData`
or cURL `-F`, let the client set the multipart boundary.

Success responses are direct objects or arrays; there is no common `data`
envelope. Empty responses are documented per operation. For example, user
deletion returns `200` with no body, while campaign deletion returns `204`.
List endpoints currently return complete arrays without pagination parameters.
Only use filters documented on the operation.

IDs such as assessment, question, and model IDs are numeric database identifiers.
Model versions have distinct IDs. Dimension identifiers and hierarchy codes are
strings. Do not substitute a public question code for its numeric question ID
in an assessment payload. [Assessment response keys](reference/assessments.md#assessment-request)
combine both kinds of identifiers.

JSON fields generally use camelCase. Enum spelling is contract-specific: roles
and assessment statuses use uppercase, question types use lowercase, and gating
rules have their own [serialized values](reference/maturity-models.md#model-contracts).

Campaign timestamps use `Instant` (for example `2027-01-15T18:00:00Z`); send an
explicit UTC offset for `endsAt`. Assessment and model timestamps use
`LocalDateTime` strings such as `2026-09-13T10:30:00`, without an offset. Do not
assume those local timestamps carry a UTC designation.

Response examples are illustrative. IDs and model-specific keys must be replaced
with values from the target environment. Examples marked as excerpts omit other
fields for readability; JSON code blocks themselves remain valid JSON.

## Errors

The common error body is:

```json
{
  "errorCode": "REQUEST_REJECTED",
  "message": "Only a draft or returned assessment can be modified."
}
```

| Status | Current uses |
|---|---|
| `400` | Invalid fields, incompatible payload, or rejected business operation |
| `401` | Missing/invalid authentication or insufficient role permissions |
| `403` | Pending account at login/refresh, or service-level ownership denial |
| `404` | Explicit not-found checks, invalid campaign token |
| `409` | Assessment is in the wrong state or a respondent change conflicts with review |
| `410` | Campaign ended or invitation revoked |
| `413` | Upload/request size limit exceeded |
| `500` | Unhandled server errors, including some legacy missing-resource checks |
| `502` | Local evaluation agent upstream failures |
| `503` | Assistant/evaluation agent unavailable |

Common codes include `BAD_REQUEST`, `REQUEST_REJECTED`, `UNAUTHORIZED`,
`INSUFFICIENT_PERMISSIONS`, `UPLOAD_TOO_LARGE`, and `INTERNAL_SERVER_ERROR`.
Operation pages identify additional business-specific codes.

There are exceptions: duplicate-email registration and invalid refresh tokens
return plain text, admin validation/not-found responses can be empty, and Excel
import errors use an import-result object. Some older services throw generic
exceptions for missing records, resulting in `500` instead of `404`. These are
documented as current behavior, not suggested client expectations for future APIs.
Check HTTP status before parsing and tolerate empty or non-JSON error bodies.

See [GlobalExceptionHandler](../../src/main/java/com/master_thesis/maturity_assessment/config/GlobalExceptionHandler.java)
and [authentication](authentication.md#handling-access-failures).

## Uploads and snapshots

Assessment writes use an `assessment` JSON part plus evidence fields. Exact-draft
and campaign writes require `evidenceMetadata`, including `[]` when there is no
evidence. These saves represent the complete response/evidence snapshot: omitting
previously saved items removes them, subject to returned-assessment restrictions.
See [assessment requests](reference/assessments.md#assessment-request) and
[evidence metadata](reference/evidence.md#upload-and-retain-evidence).

The current application limits are 50 MiB per evidence file, 250 MiB of uploaded
file bytes per request, and five evidence items per question. The servlet request
limit is 251 MiB to allow multipart metadata overhead. Deployments may override
these values. Files and HTTPS URL evidence are supported.

Downloads return binary bodies with a `Content-Disposition` attachment filename.
Use the evidence download endpoint for files and the `url` field for URL evidence.

## Browser access

`CORS_ALLOWED_ORIGINS` configures comma-separated browser origins, defaulting to
`http://localhost:3000`. Allowed headers include `Authorization`, `Content-Type`,
`X-Requested-With`, and `X-Campaign-Token`; allowed methods include GET, POST,
PUT, PATCH, DELETE, and OPTIONS. CORS does not replace authentication or ownership
checks. Environment setup belongs in the [backend README](../../README.md).

## Versioning

The current HTTP API prefix is `/api/v1`. Maturity-model versions are separate
business data, not API versions. Compatibility endpoints remain available where
explicitly documented; this guide does not assign removal dates or promise
unsupported routes.
