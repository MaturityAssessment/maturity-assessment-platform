# API Documentation

Complete REST API reference for the Maturity Assessment Platform.

## Base URL

```
http://localhost:8080/api/v1
```

## Authentication

Most endpoints require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <your-access-token>
```

### Token Expiration

- **Access tokens** expire after **30 minutes**
- **Refresh tokens** expire after **30 days**
- Use the refresh endpoint to obtain new tokens without re-authenticating

### Role Hierarchy

The platform uses hierarchical role-based access control. Higher roles inherit all permissions of lower roles:

- **ADMIN** > CURATOR > USER
- **CURATOR** > USER
- **USER** (base role)

## Response Format

### Success Response

```json
{
  "id": 1,
  "name": "Example",
  "...": "..."
}
```

### Error Response

```json
{
  "timestamp": "2025-01-15T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/v1/endpoint"
}
```

## Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Successful deletion
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required or token invalid
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Authentication Endpoints

### Register New User

Create a new user account.

**Endpoint:** `POST /api/v1/auth/register`

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "organizationName": "Acme Corp"
}
```

**Response:** `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Notes:**

- All new users are assigned the `USER` role by default
- The `name` and `organizationName` fields are optional
- Both access and refresh tokens are returned immediately

**Errors:**

- `400` - Email already registered or invalid data

---

### Login

Authenticate and receive JWT tokens.

**Endpoint:** `POST /api/v1/auth/login`

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Errors:**

- `401` - Invalid credentials

---

### Refresh Token

Obtain a new access token using a valid refresh token. Implements token rotation (old refresh token is revoked).

**Endpoint:** `POST /api/v1/auth/refresh`

**Authentication:** Not required

**Request Body:**

```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response:** `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "bmV3IHJlZnJlc2ggdG9rZW4..."
}
```

**Notes:**

- The old refresh token is revoked after use (token rotation)
- A new refresh token is issued with each refresh

**Errors:**

- `401` - Invalid or expired refresh token

---

### Get Current User

Retrieve authenticated user's information.

**Endpoint:** `GET /api/v1/user/me`

**Authentication:** Required

**Response:** `200 OK`

```json
{
  "id": 1,
  "email": "user@example.com",
  "role": "USER"
}
```

---

## Admin Endpoints

### Get All Users

Retrieve all users in the system. Supports optional role filtering.

**Endpoint:** `GET /api/v1/admin/users`

**Authentication:** Required (ADMIN only)

**Query Parameters:**

- `role` (optional) - Filter by role: `USER`, `CURATOR`, `ADMIN`

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "email": "admin@example.com",
    "role": "ADMIN"
  },
  {
    "id": 2,
    "email": "user@example.com",
    "role": "USER"
  }
]
```

---

### Create User (Admin)

Create a new user with a specific role.

**Endpoint:** `POST /api/v1/admin/users`

**Authentication:** Required (ADMIN only)

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "role": "CURATOR"
}
```

**Role Options:** `USER`, `CURATOR`, `ADMIN`

**Response:** `200 OK`

```json
{
  "id": 3,
  "email": "newuser@example.com",
  "role": "CURATOR"
}
```

**Errors:**

- `400` - Missing fields or email already exists

---

### Update User (Admin)

Update an existing user's email, password, or role.

**Endpoint:** `PUT /api/v1/admin/users/{id}`

**Authentication:** Required (ADMIN only)

**Path Parameters:**

- `id` (Long) - User ID

**Request Body:** (all fields optional)

```json
{
  "email": "updated@example.com",
  "password": "newPassword123",
  "role": "CURATOR"
}
```

**Response:** `200 OK`

```json
{
  "id": 3,
  "email": "updated@example.com",
  "role": "CURATOR"
}
```

**Errors:**

- `404` - User not found
- `400` - Email already taken by another user

---

### Delete User (Admin)

Delete a user account.

**Endpoint:** `DELETE /api/v1/admin/users/{id}`

**Authentication:** Required (ADMIN only)

**Path Parameters:**

- `id` (Long) - User ID

**Response:** `200 OK`

**Notes:**

- Admins cannot delete their own account

**Errors:**

- `400` - Attempting to delete self
- `404` - User not found

---

## Domain Endpoints

### Get All Domains

Retrieve all domains.

**Endpoint:** `GET /api/v1/domain`

**Authentication:** Not required (public endpoint)

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "Software Engineering",
    "description": "Maturity models for software engineering practices"
  },
  {
    "id": 2,
    "name": "Cybersecurity",
    "description": "Maturity models for cybersecurity assessment"
  }
]
```

---

### Get Domains with Models

Retrieve all domains along with their associated maturity models.

**Endpoint:** `GET /api/v1/domain/with-models`

**Authentication:** Not required (public endpoint)

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "Software Engineering",
    "description": "...",
    "maturityModels": [...]
  }
]
```

---

### Get Domain by ID

Retrieve a specific domain.

**Endpoint:** `GET /api/v1/domain/{id}`

**Authentication:** Not required (public endpoint)

**Path Parameters:**

- `id` (Long) - Domain ID

**Response:** `200 OK`

```json
{
  "id": 1,
  "name": "Software Engineering",
  "description": "Maturity models for software engineering practices"
}
```

**Errors:**

- `404` - Domain not found

---

### Create Domain

Create a new domain.

**Endpoint:** `POST /api/v1/domain`

**Authentication:** Required (CURATOR or ADMIN)

**Request Body:**

```json
{
  "name": "Data Science",
  "description": "Maturity models for data science practices"
}
```

**Response:** `201 Created`

```json
{
  "id": 3,
  "name": "Data Science",
  "description": "Maturity models for data science practices"
}
```

---

### Delete Domain

Delete a domain.

**Endpoint:** `DELETE /api/v1/domain/{id}`

**Authentication:** Required (CURATOR or ADMIN)

**Path Parameters:**

- `id` (Long) - Domain ID

**Response:** `204 No Content`

---

## Maturity Model Endpoints

### Get All Maturity Models

Retrieve all maturity models (summary view).

**Endpoint:** `GET /api/v1/maturity-model`

**Authentication:** Not required (public endpoint)

**Query Parameters:**

- `domainId` (optional, Long) - Filter by domain

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "CMMI Maturity Model",
    "description": "Capability Maturity Model Integration",
    "levelCount": 5,
    "dimensionCount": 3,
    "moduleCount": 8,
    "totalQuestions": 45,
    "isActive": true,
    "autoEvaluated": true,
    "version": 1,
    "domainId": 1,
    "domainName": "Software Engineering"
  }
]
```

---

### Get Maturity Model by ID

Retrieve detailed maturity model including dimensions, modules, practices, levels, and questions.

**Endpoint:** `GET /api/v1/maturity-model/{id}`

**Authentication:** Not required (public endpoint)

**Path Parameters:**

- `id` (Long) - Maturity model ID

**Response:** `200 OK`

```json
{
  "id": 1,
  "name": "CMMI Maturity Model",
  "description": "Capability Maturity Model Integration",
  "isActive": true,
  "autoEvaluated": true,
  "version": 1,
  "domainId": 1,
  "domain": {
    "id": 1,
    "name": "Software Engineering",
    "description": "..."
  },
  "levels": [
    {
      "number": 1,
      "name": "Initial",
      "description": "Processes are unpredictable"
    },
    {
      "number": 2,
      "name": "Managed",
      "description": "Processes are planned and tracked"
    }
  ],
  "dimensions": [
    {
      "id": "process_mgmt",
      "name": "Process Management",
      "description": "How processes are managed",
      "mappingRules": [
        { "levelNumber": 1, "minimumScore": 0.0 },
        { "levelNumber": 2, "minimumScore": 0.2 }
      ],
      "modules": [
        {
          "code": "PM1",
          "name": "Process Definition",
          "description": "...",
          "weight": 1.0,
          "practices": [
            {
              "name": "Documentation",
              "description": "...",
              "weight": 1,
              "questions": [
                {
                  "id": 1,
                  "weight": 1,
                  "text": "Are processes documented?",
                  "type": "boolean",
                  "help": "Check if written process descriptions exist",
                  "requiresEvidence": false,
                  "required": false
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Errors:**

- `404` - Maturity model not found

---

### Get Active Maturity Models

Retrieve every active maturity-model version available for new assessments.
Multiple model lineages in the same domain can be active, while each lineage
has at most one active version.

**Endpoint:** `GET /api/v1/maturity-model/active`

**Authentication:** Not required (public endpoint)

**Query Parameters:**

- `domainId` (optional, Long) - Filter by domain

**Response:** `200 OK` (array of the same structure as Get Maturity Model by ID)

```json
[
  {
    "id": 2,
    "name": "CMMI Maturity Model",
    "isActive": true,
    "version": 2,
    "baseModelId": 1,
    "domainId": 1,
    "...": "..."
  },
  {
    "id": 8,
    "name": "Secure Delivery Model",
    "isActive": true,
    "version": 1,
    "baseModelId": 8,
    "domainId": 1,
    "...": "..."
  }
]
```

**Errors:**

- `404` - No active maturity models match the optional domain filter

---

### Create Maturity Model

Create a new maturity model with dimensions, modules, practices, and questions.

**Endpoint:** `POST /api/v1/maturity-model`

**Authentication:** Required (CURATOR or ADMIN)

**Request Body:**

```json
{
  "name": "Custom Maturity Model",
  "description": "A custom organizational maturity model",
  "autoEvaluated": true,
  "domainId": 1,
  "levels": [
    {
      "number": 1,
      "name": "Initial",
      "description": "Ad-hoc processes"
    },
    {
      "number": 2,
      "name": "Managed",
      "description": "Processes are managed"
    }
  ],
  "dimensions": [
    {
      "id": "quality",
      "name": "Quality Assurance",
      "description": "Quality practices",
      "mappingRules": [
        { "levelNumber": 1, "minimumScore": 0.0 },
        { "levelNumber": 2, "minimumScore": 0.35 }
      ],
      "modules": [
        {
          "code": "QA1",
          "name": "Quality Standards",
          "weight": 1.0,
          "practices": [
            {
              "name": "Standards Definition",
              "weight": 1,
              "questions": [
                {
                  "weight": 1,
                  "text": "Do you have quality standards?",
                  "type": "boolean",
                  "help": "Check if quality criteria are defined",
                  "requiresEvidence": false,
                  "required": false
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

`mappingRules` is configured per dimension. It must contain one entry for each
maturity level, level 1 must start at `0`, and `minimumScore` values must be
strictly increasing within the normalized `0`–`1` range. Omitting the property
uses equal-width defaults for backward compatibility.

Practices, modules, and dimensions may also contain ordered `gatingRules`:

```json
{
  "order": 0,
  "selection": "specificChild",
  "childCode": "P1",
  "operator": "<",
  "threshold": 0.40,
  "operation": "set",
  "value": 0.40
}
```

`selection` is `specificChild`, `anyChild`, or `allChildren`; `operator` is
`<`, `<=`, `==`, `>=`, or `>`; and `operation` is `set`, `add`, or `subtract`.
Orders are contiguous from zero. Thresholds and values are normalized numbers
in `[0,1]` with at most two decimals. `childCode` is required only for
`specificChild` and must identify an immediate child of the owning element.

**Response:** `200 OK` (full maturity model object)

**Errors:**

- `400` - Invalid request data
- `401` - Authentication required

---

### Upload Maturity Model (CSV)

Create a maturity model by uploading a CSV file.

**Endpoint:** `POST /api/v1/maturity-model/upload`

**Authentication:** Required (CURATOR or ADMIN)

**Content-Type:** `multipart/form-data`

**Form Data:**

- `file` - CSV file (.csv)
- `domainId` (optional) - Domain to associate with

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Maturity model uploaded successfully",
  "maturityModel": {
    "id": 4,
    "name": "My Maturity Model",
    "...": "..."
  },
  "errorDetails": null
}
```

**Errors:**

- `400` - Invalid file type or malformed CSV
- `401` - Authentication required

---

### Update Maturity Model

Update an existing maturity model.

**Endpoint:** `PUT /api/v1/maturity-model/{id}`

**Authentication:** Required (CURATOR or ADMIN)

**Path Parameters:**

- `id` (Long) - Maturity model ID

**Request Body:** Same structure as Create Maturity Model

**Response:** `200 OK` (Updated maturity model)

**Errors:**

- `404` - Maturity model not found
- `400` - Invalid request data

---

### Activate Maturity Model

Activate a maturity-model version. If another version of the same model lineage
is active, it is deactivated. Active models from other lineages in the same
domain are unchanged.

**Endpoint:** `PUT /api/v1/maturity-model/{id}/activate`

**Authentication:** Required (CURATOR or ADMIN)

**Path Parameters:**

- `id` (Long) - Maturity model ID

**Response:** `200 OK`

```json
{
  "id": 1,
  "name": "CMMI Maturity Model",
  "isActive": true,
  "...": "..."
}
```

**Note:** Only one version per model lineage can be active at a time. Multiple
model lineages in one domain can be active concurrently.

**Errors:**

- `404` - Maturity model not found

---

### Delete Maturity Model

Delete a maturity model and all related data.

**Endpoint:** `DELETE /api/v1/maturity-model/{id}`

**Authentication:** Required (CURATOR or ADMIN)

**Path Parameters:**

- `id` (Long) - Maturity model ID

**Response:** `200 OK`

**Note:** Cascade deletes dimensions, modules, practices, questions, levels, and results.

**Errors:**

- `404` - Maturity model not found

---

## Campaign Endpoints

Campaign endpoints are available to curators and administrators. Every query is
scoped to campaigns created by the authenticated user.

### List My Campaigns

Retrieve campaign summaries with participant and derived completion counts.

**Endpoint:** `GET /api/v1/campaigns`

**Authentication:** Required (CURATOR or ADMIN)

**Response:** `200 OK`

```json
[
  {
    "id": 12,
    "name": "2026 Security Review",
    "endsAt": "2026-09-01T17:00:00Z",
    "maturityModelId": 4,
    "maturityModelName": "Security Maturity Model",
    "maturityModelVersion": 2,
    "participantCount": 3,
    "completedParticipantCount": 1,
    "createdAt": "2026-07-26T14:00:00Z"
  }
]
```

---

### Create Campaign

Create a campaign and all participant records. Participant emails are normalized
to lowercase and must be unique within the request. The model must be active and
the end date must be in the future.

**Endpoint:** `POST /api/v1/campaigns`

**Authentication:** Required (CURATOR or ADMIN)

**Request Body:**

```json
{
  "name": "2026 Security Review",
  "endsAt": "2026-09-01T17:00:00Z",
  "maturityModelId": 4,
  "participantEmails": [
    "alice@example.com",
    "bob@example.com"
  ]
}
```

**Response:** `201 Created` (campaign detail)

The backend creates a high-entropy invitation token for each participant and
stores only its SHA-256 hash. Once the campaign transaction commits, it
asynchronously sends each participant a separate email containing their
personal `/assessment?campaignToken=...` link when campaign mail is enabled.
Raw tokens are held only in the in-memory delivery event and are neither
returned by this endpoint nor persisted.

An SMTP failure is logged and does not roll back campaign creation. This POC
does not persist email delivery status or retry failed messages.

---

### Get Campaign Detail

Retrieve one creator-owned campaign and its participants.

**Endpoint:** `GET /api/v1/campaigns/{id}`

**Authentication:** Required (CURATOR or ADMIN)

**Path Parameters:**

- `id` (Long) - Campaign ID

**Response:** `200 OK`

```json
{
  "id": 12,
  "name": "2026 Security Review",
  "endsAt": "2026-09-01T17:00:00Z",
  "maturityModelId": 4,
  "maturityModelName": "Security Maturity Model",
  "maturityModelVersion": 2,
  "createdAt": "2026-07-26T14:00:00Z",
  "updatedAt": "2026-07-26T14:00:00Z",
  "participants": [
    {
      "id": 31,
      "email": "alice@example.com",
      "completed": false,
      "assessmentId": null,
      "assessmentStatus": null,
      "revokedAt": null,
      "createdAt": "2026-07-26T14:00:00Z"
    }
  ]
}
```

`completed` is derived from assessment status: `PENDING_REVIEW` and `COMPLETED`
are complete; no assessment, `DRAFT`, and `CHANGES_REQUESTED` are incomplete.
An unknown campaign or a campaign owned by another creator returns `404`.

---

### Get Campaign Results

Retrieve finalized participant results and simple campaign-level aggregates for
a creator-owned campaign.

**Endpoint:** `GET /api/v1/campaigns/{id}/results`

**Authentication:** Required (campaign creator; CURATOR or ADMIN)

**Response:** `200 OK`

The response contains participant and submission counts, the average overall
score, maturity-level distribution, average scores by dimension, and the final
result for every participant whose assessment status is `COMPLETED`. Draft,
changes-requested, and pending-review assessments are excluded from score
aggregation. An unknown campaign or a campaign owned by another creator returns
`404`.

---

### Delete a Campaign

Delete a creator-owned campaign and its unused participant invitations.

**Endpoint:** `DELETE /api/v1/campaigns/{id}`

**Authentication:** Required (campaign creator; CURATOR or ADMIN)

**Response:** `204 No Content`

Campaigns with participant assessment activity cannot be deleted because their
assessment history is retained. In that case the API returns an illegal-operation
response with error code `CAMPAIGN_HAS_ASSESSMENTS`. An unknown campaign or a
campaign owned by another creator returns `404`.

---

### Reissue Participant Invitation

Generate a new invitation token for one participant. The previous token is
invalidated immediately, and the raw token is returned only in this response.

**Endpoint:** `POST /api/v1/campaigns/{campaignId}/participants/{participantId}/invitation`

**Authentication:** Required (campaign creator; CURATOR or ADMIN)

```json
{
  "participantId": 31,
  "invitationToken": "url-safe-high-entropy-token"
}
```

The frontend creates `/assessment?campaignToken={invitationToken}` and copies it
to the clipboard. Invitations cannot be issued after the campaign ends.

---

### Campaign Respondent Assessment

Campaign respondents use the same assessment workspace without creating an
authenticated platform account. These endpoints require the raw token in the
`X-Campaign-Token` header and authorize access only to that participant's one
campaign assessment.

- `GET /api/v1/campaign-response` - Open or lazily create the assessment.
- `PUT /api/v1/campaign-response` - Autosave responses and evidence using the
  same multipart payload as an authenticated assessment.
- `POST /api/v1/campaign-response/submit` - Submit the assessment.
- `GET /api/v1/campaign-response/evidence/{evidenceId}/download` - Download
  evidence belonging to that assessment.

Revoked invitations and ended campaigns return `410 Gone`. Invalid or rotated
tokens return `404 Not Found`. The token grants no access to authenticated user,
campaign-management, dashboard, or review endpoints.

---

## Assessment Endpoints

### Ensure Draft for an Active Model

Create the empty draft used by a new assessment flow, or return the existing
draft for the authenticated user and exact maturity-model version.

**Endpoint:** `PUT /api/v1/assessments/drafts/by-model/{modelId}`

**Authentication:** Required

**Path Parameters:**

- `modelId` (Long) - Exact active maturity-model version to assess

**Request Body:** None

**Response:** `200 OK` (`AssessmentResponse`)

```json
{
  "id": 42,
  "status": "DRAFT",
  "maturityModelId": 7,
  "maturityModelVersion": 3,
  "overallAverage": 0.0,
  "overallPercentageScore": 0.0,
  "overallMaturityLevel": "Draft",
  "questionEvaluations": {},
  "evidence": []
}
```

This operation is idempotent and serialized for the user/model pair. Repeating
it returns the existing draft unchanged; it never clears saved responses or
evidence. A partial unique database index enforces one `DRAFT` per authenticated
user and exact maturity-model version. Starting and immediately leaving therefore
leaves a resumable 0% draft.

The frontend navigates with the returned assessment ID:
`/assessment?draftId={id}`. Assessment execution does not accept `modelId` as
route context.

**Errors:**

- `401` - Authentication required
- `404` - Maturity-model version not found
- `409` - The requested model version is not active

---

### Autosave an Exact Draft

Replace the response and evidence snapshot of one existing draft. The assessment
UI calls this endpoint after one second of inactivity and serializes requests so
only one autosave is in flight.

**Endpoint:** `PUT /api/v1/assessments/drafts/{draftId}`

**Authentication:** Required (draft owner)

**Content-Type:** `multipart/form-data`

**Path Parameters:**

- `draftId` (Long) - Existing assessment ID whose status is `DRAFT` or
  `CHANGES_REQUESTED`

**Form Data:**

- `assessment` (required JSON string) - Exact model ID and complete desired
  `questionResponses` map
- `evidenceMetadata` (required JSON string) - Complete desired evidence
  snapshot; send `[]` when there is none, and note that omitted existing IDs
  are deleted
- `evidenceFile` (optional, repeated file part) - New or replacement files
- `evidenceFileKey` (optional, repeated string) - Key pairing each file part
  with an `evidenceMetadata.itemKey`

Example `assessment` value:

```json
{
  "maturityModelId": 7,
  "respondentUpdatedResponseKeys": ["governance_policy_12_46"],
  "questionResponses": {
    "governance_policy_12_45": {
      "questionId": 45,
      "response": 1
    },
    "governance_policy_12_46": {
      "questionId": 46,
      "response": "Reviewed quarterly"
    }
  }
}
```

`questionResponses` is required and may be `{}` for an empty draft. The removed
legacy `responses` property is rejected. Saves are authoritative: omitted
question rows are deleted for ordinary drafts. Returned assessments preserve
review rows and notes, including evidence-only items. Draft rows have
`initialScore: null`.

For a `CHANGES_REQUESTED` assessment, accepted responses are immutable.
`respondentUpdatedResponseKeys` records flagged or adjusted items changed by
the respondent and is persisted on each evaluation row.

`AssessmentResponse.questionEvaluations` uses the same response keys:

```json
{
  "questionEvaluations": {
    "governance_policy_12_45": {
      "id": 301,
      "responseKey": "governance_policy_12_45",
      "questionId": 45,
      "response": 1,
      "initialScore": null,
      "respondentJustification": null,
      "validationStatus": null,
      "manualScore": null,
      "reviewerNote": null
    }
  }
}
```

On submission, `initialScore` is calculated for objective response types and is
then immutable. Curator evaluation stores any override in `manualScore`. For an
Open Answer, `manualScore` is an integer maturity level from 1 to N; it is
normalized with `(manualScore - 1) / (N - 1)` before aggregation.

Example `evidenceMetadata` value:

```json
[
  {
    "evidenceId": 81,
    "clientKey": "evidence-81",
    "questionId": 45,
    "type": "FILE",
    "description": "Current policy"
  },
  {
    "itemKey": "upload-7f3d",
    "clientKey": "upload-7f3d",
    "questionId": 46,
    "type": "FILE",
    "description": "Latest review record"
  },
  {
    "clientKey": "link-a229",
    "questionId": 47,
    "type": "URL",
    "description": "Controlled document",
    "url": "https://example.com/policy"
  }
]
```

**Response:** `200 OK` (`AssessmentResponse`) with the persisted evidence
snapshot.

`clientKey` is an optional reconciliation value. It is echoed in evidence
objects returned by this save so the browser can replace a newly uploaded
`File` with its persisted evidence ID without uploading it again. It is not
stored in the database and may be absent from later reads.

The endpoint is authoritative for the supplied `draftId`: it rejects ownership,
status, and model-ID mismatches and never creates a different draft. Response
and evidence metadata changes commit in one transaction. New files are removed
after rollback; removed or replaced files are deleted only after commit.

**Errors:**

- `400` - Invalid assessment/evidence data, file, or model mismatch
- `401` - Authentication required
- `403` - The authenticated user does not own the draft
- `404` - Draft not found
- `409` - Assessment is no longer a draft

---

### Reset a Draft

Clear current progress while retaining the draft row and ID.

**Endpoint:** `PUT /api/v1/assessments/drafts/{draftId}/reset`

**Authentication:** Required (draft owner)

**Request Body:** None

**Response:** `200 OK` (`AssessmentResponse`) with empty `questionEvaluations` and
`evidence`.

The reset is transactional. Evidence metadata is removed with the response
snapshot, and physical files are deleted only after commit. It affects only the
specified exact-version draft; inactive-version drafts in the same lineage are
unchanged.

**Errors:**

- `401` - Authentication required
- `403` - The authenticated user does not own the draft
- `404` - Draft not found
- `409` - Assessment is no longer a draft

---

### Save Draft (Compatibility)

**Endpoint:** `POST /api/v1/assessments/drafts`

**Authentication:** Required

**Content-Type:** `application/json` or `multipart/form-data`

This compatibility endpoint creates or updates the authenticated user's draft
for the supplied maturity-model version. The assessment UI no longer uses it;
new clients should first call the ensure endpoint and then autosave through the
exact `draftId` endpoint above.

---

### Submit an Exact Draft

Submit and transition one existing draft without allowing fallback row creation.

**Endpoint:** `POST /api/v1/assessments/drafts/{draftId}/submit`

**Authentication:** Required (draft owner)

**Content-Type:** `multipart/form-data`

**Path Parameters:**

- `draftId` (Long) - Existing assessment ID whose status is `DRAFT` or
  `CHANGES_REQUESTED`

**Form Data:**

- `assessment` (required JSON string) - Exact model ID and complete response map
- `evidenceMetadata` (required JSON string) - Complete authoritative evidence
  snapshot; send `[]` when there is none
- `evidenceFile` (optional, repeated file part) - New or replacement files
- `evidenceFileKey` (optional, repeated string) - Keys pairing files with
  `evidenceMetadata.itemKey`

The `assessment` and `evidenceMetadata` formats are the same as for exact-draft
autosave. The backend locks `draftId`, verifies ownership and an editable
respondent status,
requires the request's maturity-model ID to match the row, reconciles the
evidence snapshot, calculates results, and transitions that same row to
`COMPLETED` or `PENDING_REVIEW`.

**Response:** `200 OK` (`AssessmentResponse`) for the transitioned draft.

The endpoint never creates a fallback assessment. Retrying after a successful
submission, or submitting any stale/non-editable ID, returns `409 Conflict`.
Returned assessments also return `409 Conflict` until every flagged item has
been recorded in `respondentUpdatedResponseKeys`.

**Errors:**

- `400` - Invalid assessment/evidence data, file, or model mismatch
- `401` - Authentication required
- `403` - The authenticated user does not own the draft
- `404` - Draft not found
- `409` - Assessment is no longer a draft

---

### Create Assessment (Compatibility)

Submit an assessment through the legacy collection-level contract. New clients
and the respondent UI should use the exact-draft submission endpoint above.

**Endpoint:** `POST /api/v1/assessments`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Form Data:**

- `assessment` (JSON string) - Assessment data
- `evidenceMetadata` (optional JSON string) - Authoritative retained/new file
  and secure-link evidence snapshot
- `evidenceFile` (optional, multiple files) - Evidence file uploads
- `evidenceFileKey` (optional, multiple strings) - Keys pairing files with
  `evidenceMetadata.itemKey`

**Assessment JSON Structure:**

```json
{
  "maturityModelId": 1,
  "questionResponses": {
    "dim1_mod1_prac1_1": {
      "questionId": 1,
      "response": 1
    },
    "dim1_mod1_prac1_2": {
      "questionId": 2,
      "response": 4
    },
    "dim1_mod1_prac1_3": {
      "questionId": 3,
      "response": "We review quarterly"
    }
  }
}
```

This compatibility endpoint may locate or create an assessment by user/model.
It does not provide the exact-ID, stale-retry guarantees of
`POST /api/v1/assessments/drafts/{draftId}/submit`.

**Response:** `200 OK`

```json
{
  "id": 1,
  "overallAverage": 3.5,
  "overallPercentageScore": 62.5,
  "overallMaturityLevel": "Defined",
  "isCompleted": true,
  "dimensionResults": [
    {
      "dimensionName": "Process Management",
      "dimensionId": "process_mgmt",
      "averageScore": 3.5,
      "maturityLevel": "Defined"
    }
  ],
  "createdAt": "2025-01-15T10:00:00"
}
```

**Scoring Logic:**

- Boolean questions: curator-selected correct answer normalizes to 1; the other to 0
- Scale (`likert`) questions: configured point normalizes linearly to 0–1 in the selected direction
- Open answer questions: excluded from scoring
- Hierarchy aggregation: configured rule on each practice, module, dimension, and model
- Maturity levels: applied only to dimension and overall results

**Errors:**

- `400` - Invalid request data
- `401` - Authentication required

---

### Get User's Assessments

Retrieve all assessments created by the authenticated user.

**Endpoint:** `GET /api/v1/assessments`

**Authentication:** Required

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "overallAverage": 3.5,
    "overallPercentageScore": 62.5,
    "overallMaturityLevel": "Defined",
    "isCompleted": true,
    "dimensionResults": [...],
    "createdAt": "2025-01-15T10:00:00"
  }
]
```

---

### Get All Assessments

Retrieve all assessments across all users. Includes user email and ID.

**Endpoint:** `GET /api/v1/assessments/all`

**Authentication:** Required (CURATOR or ADMIN)

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "overallAverage": 3.5,
    "overallPercentageScore": 62.5,
    "overallMaturityLevel": "Defined",
    "isCompleted": true,
    "dimensionResults": [...],
    "createdAt": "2025-01-15T10:00:00",
    "userEmail": "user@example.com",
    "userId": 2
  }
]
```

---

### Get Assessment by ID

Retrieve a specific assessment with full details.

**Endpoint:** `GET /api/v1/assessments/{id}`

**Authentication:** Required

**Path Parameters:**

- `id` (Long) - Assessment ID

**Response:** `200 OK` (full assessment object)

**Errors:**

- `404` - Assessment not found
- `403` - Not authorized to view this assessment

---

### Get Pending Assessments

Retrieve assessments that are not yet completed (for evaluators).

**Endpoint:** `GET /api/v1/assessments/pending`

**Authentication:** Required (CURATOR or ADMIN)

**Response:** `200 OK`

```json
[
  {
    "id": 3,
    "overallAverage": 0.0,
    "overallMaturityLevel": "Not Calculated",
    "isCompleted": false,
    "dimensionResults": [],
    "createdAt": "2025-01-15T09:00:00"
  }
]
```

---

### Complete Assessment

Mark a pending assessment with no reviewable answer/evidence items as completed.

**Endpoint:** `PUT /api/v1/assessments/{id}/complete`

**Authentication:** Required (CURATOR or ADMIN)

**Path Parameters:**

- `id` (Long) - Assessment ID

**Response:** `200 OK` (updated assessment object)

---

### Save Evaluation Progress

Persist curator classifications, manual scores, and notes directly on the
assessment's `question_evaluations` rows without completing the assessment.

**Endpoint:** `PUT /api/v1/assessments/{id}/evaluation/reviews`

**Authentication:** Required (CURATOR or ADMIN)

**Request Body:**

```json
{
  "questionEvaluations": {
    "D1_M1_101_1001": {
      "questionId": 1001,
      "validationStatus": "FLAGGED",
      "reviewerNote": "Clarify ownership and attach supporting evidence."
    }
  },
  "evaluatorInsight": "General review guidance."
}
```

Review progress may be incomplete. The assessment remains `PENDING_REVIEW`.

---

### Finish Evaluation

Finish an evaluation from the classifications already persisted in
`question_evaluations`.

**Endpoint:** `PUT /api/v1/assessments/{id}/evaluation/finish`

**Authentication:** Required (CURATOR or ADMIN)

**Request Body (optional):**

```json
{
  "evaluatorInsight": "Final recommendations."
}
```

Every answered or evidence-backed item must be `ACCEPTED` or `ADJUSTED`. Open
answers and adjusted items require a manual score, and adjusted items require a
reviewer note. An Open Answer manual score must select one of the model's
integer maturity levels from 1 to N and is normalized internally to 0–1. Any
`FLAGGED` item blocks completion and must be reclassified or sent back. Success
recalculates results and returns status `COMPLETED`.

---

### Send Evaluation Back

Return an assessment for respondent changes while retaining the persisted
review notes.

**Endpoint:** `PUT /api/v1/assessments/{id}/evaluation/send-back`

**Authentication:** Required (CURATOR or ADMIN)

**Request Body (optional):**

```json
{
  "evaluatorInsight": "Please address the flagged items before resubmitting."
}
```

At least one item must be `FLAGGED`, and every flagged item must have a reviewer
note. Success returns status `CHANGES_REQUESTED`.
Each flagged row starts with `respondentUpdated: false`; the respondent-side
autosave marks it true after its answer or evidence is updated.

---

### Get Open-Ended Answers

Retrieve all text/open answers from an assessment.

**Endpoint:** `GET /api/v1/assessments/{id}/open-answers`

**Authentication:** Required (CURATOR or ADMIN)

**Path Parameters:**

- `id` (Long) - Assessment ID

**Response:** `200 OK`

```json
{
  "assessmentId": 1,
  "openAnswers": [
    {
      "questionId": "pm_q2",
      "questionText": "How often are processes reviewed?",
      "dimensionName": "Process Management",
      "answer": "We review quarterly with stakeholder input"
    }
  ]
}
```

---

### Delete Assessment

Delete an assessment and all related data (dimension results, evidence).

**Endpoint:** `DELETE /api/v1/assessments/{id}`

**Authentication:** Required

**Path Parameters:**

- `id` (Long) - Assessment ID

**Response:** `204 No Content`

---

## Evidence Endpoints

### Get Evidence by Assessment

Retrieve all evidence files for an assessment.

**Endpoint:** `GET /api/v1/evidence/assessment/{assessmentId}`

**Authentication:** Required

**Path Parameters:**

- `assessmentId` (Long) - Assessment ID

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "assessmentId": 1,
    "questionId": 5,
    "fileName": "process-document.pdf",
    "fileType": "application/pdf",
    "createdAt": "2025-01-15T10:05:00",
    "downloadUrl": "/api/v1/evidence/1/download"
  }
]
```

---

### Get Evidence by Assessment and Question

Retrieve evidence files for a specific question within an assessment.

**Endpoint:** `GET /api/v1/evidence/assessment/{assessmentId}/question/{questionId}`

**Authentication:** Required

**Path Parameters:**

- `assessmentId` (Long) - Assessment ID
- `questionId` (Long) - Question ID

**Response:** `200 OK` (list of evidence objects)

---

### Download Evidence

Download an evidence file.

**Endpoint:** `GET /api/v1/evidence/{evidenceId}/download`

**Authentication:** Required

**Path Parameters:**

- `evidenceId` (Long) - Evidence ID

**Response:** File download (application/octet-stream)

**Errors:**

- `404` - Evidence file not found

---

### Delete Evidence

Delete an evidence file.

**Endpoint:** `DELETE /api/v1/evidence/{evidenceId}`

**Authentication:** Required

**Path Parameters:**

- `evidenceId` (Long) - Evidence ID

**Response:** `204 No Content`

---

## Data Models Reference

### Question Types

**Boolean Question:**

- Type: `"boolean"`
- Answer: `true` or `false`
- Scoring: configured correct answer = 1, other answer = 0

**Scale Question (internal type `likert`):**

- Type: `"likert"`
- Configuration: 2–100 points, optional endpoint tags, and maximum-score endpoint
- Answer: integer from `1` to configured point count
- Scoring: normalized linearly to 0–1

**Open Answer Question:**

- Type: `"open_answer"`
- Answer: free text string
- Scoring: excluded from automatic scoring

**Numeric Question:**

- Type: `"numeric"`
- Configuration: inclusive integer `rangeMin`/`rangeMax` and `rangeHighValueIsMaximum`
- Answer: whole number within the configured bounds
- Scoring: direction-aware linear normalization to 0–1

**Percentage Question:**

- Type: `"percentage"`
- Configuration: inclusive integer `rangeMin`/`rangeMax` and `rangeHighValueIsMaximum`
- Answer: whole number within the configured bounds
- Scoring: direction-aware linear normalization to 0–1

**Evidence Question:**

- Type: `"evidence"`
- Answer: file upload
- Scoring: based on whether evidence is provided

**Boolean with Justification:**

- Type: `"boolean_justification"`
- Answer: `true`/`false` with text justification
- Scoring: `true = 5`, `false = 1`

### Maturity Level Mapping

The overall maturity level is determined by rounding the average score:

| Score Range | Level | Typical Name           |
| ----------- | ----- | ---------------------- |
| 1.0 - 1.4   | 1     | Initial/Ad-hoc         |
| 1.5 - 2.4   | 2     | Managed                |
| 2.5 - 3.4   | 3     | Defined                |
| 3.5 - 4.4   | 4     | Quantitatively Managed |
| 4.5 - 5.0   | 5     | Optimizing             |

**Note:** Level names are configurable in each maturity model.

---

## CORS Configuration

The backend is configured to accept requests from all origins (`*`) via `@CrossOrigin`.

**Allowed Methods:** GET, POST, PUT, DELETE, OPTIONS

**Allowed Headers:** Authorization, Content-Type, X-Requested-With

---

## Testing with cURL

### Login Example

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'
```

### Refresh Token Example

```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token-here"
  }'
```

### Get Assessments with Token

```bash
TOKEN="your-access-token-here"

curl -X GET http://localhost:8080/api/v1/assessments \
  -H "Authorization: Bearer $TOKEN"
```

### Create Domain

```bash
TOKEN="your-access-token-here"

curl -X POST http://localhost:8080/api/v1/domain \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Software Engineering",
    "description": "SE maturity models"
  }'
```

---

## API Versioning

Current version: **v1** (indicated by `/api/v1/` prefix)

Future versions would use `/api/v2/`, `/api/v3/`, etc., allowing backward compatibility.

---

## Security Considerations

1. **Always use HTTPS in production**
2. **Rotate JWT secret keys regularly**
3. **Implement rate limiting to prevent abuse**
4. **Validate all input data server-side**
5. **Use environment variables for sensitive configuration**
6. **Role hierarchy ensures proper access control**
7. **Refresh token rotation prevents token reuse attacks**
8. **Log all authentication attempts**
