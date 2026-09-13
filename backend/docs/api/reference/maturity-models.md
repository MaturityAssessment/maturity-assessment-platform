# Maturity models

[API index](../README.md#endpoint-index) · [Model workflow](../workflows/model-management.md)

Sources: [controller](../../../src/main/java/com/master_thesis/maturity_assessment/maturity_models/controllers/MaturityModelController.java),
[DTOs](../../../src/main/java/com/master_thesis/maturity_assessment/maturity_models/dto/),
[service](../../../src/main/java/com/master_thesis/maturity_assessment/maturity_models/services/MaturityModelService.java).

The editor contract is the preferred way to author models. Public model reads
include database IDs needed to submit assessments. Each version has its own
numeric model ID; `baseModelId` groups a lineage.

Unless stated otherwise, success is `200` JSON. Missing model IDs in these
services currently commonly return `500 INTERNAL_SERVER_ERROR`, not `404`.
Writes require curator/admin access and may return `400` for model validation.

## GET /api/v1/maturity-model

**Access:** Public. **Request:** Optional numeric `domainId` query filter; no body.
**Response:** Array of [model summaries](#model-summary), including versions.

## GET /api/v1/maturity-model/{id}

**Access:** Public. **Request:** Numeric model/version `id`; no body.
**Response:** Full [MaturityModelDTO](#model-contracts), with nested dimensions,
modules, practices, questions, and numeric question IDs.

## GET /api/v1/maturity-model/{id}/versions

**Access:** Public. **Request:** Numeric model `id` from the lineage; no body.
**Response:** Array of model summaries for that lineage, ordered by version ascending.

## GET /api/v1/maturity-model/{id}/export.xlsx

**Access:** Public. **Request:** Numeric model `id`; no body.
**Response:** `200` binary Excel workbook, content type
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, with attachment
filename `maturity-model-{id}.xlsx`. Do not parse the response as JSON.

## GET /api/v1/maturity-model/active

**Access:** Public. **Request:** Optional numeric `domainId` query filter; no body.
**Response:** Array of full MaturityModelDTO objects for active versions.

## POST /api/v1/maturity-model

**Access:** Curator/admin. **Request:** JSON [MaturityModelDTO](#model-contracts),
including an existing `domainId` and a complete hierarchy. Use the editor endpoint
below for the simpler authoring contract.
**Response:** Created full model. Defaults to version `1` and inactive when not
specified; the base-model reference is assigned to the created model when absent.
**Errors:** `400 DOMAIN_REQUIRED`, model structure/code/question validation failures.

## GET /api/v1/maturity-model/{id}/editor

**Access:** Curator/admin, even though other model GET endpoints are public.
**Request:** Numeric model `id`; no body.
**Response:** [Editor document](#editor-document), using hierarchy codes instead
of database primary/foreign keys for nested items.
**Errors:** `400` if persisted public codes are missing or invalid.

## POST /api/v1/maturity-model/editor

**Access:** Curator/admin. **Request:** Complete JSON [editor document](#editor-document).
**Response:** Created full MaturityModelDTO; an inactive first version with new
database IDs. The response is not an editor document.
**Errors:** `400` for missing domain, hierarchy, invalid levels/codes/questions,
mapping rules, gating rules, dependencies, or text limits.

## POST /api/v1/maturity-model/{id}/versions/editor

**Access:** Curator/admin. **Request:** Numeric source-version `id` and complete
JSON editor document. This is not a partial update.
**Response:** New inactive MaturityModelDTO in the same lineage, with new `id`,
incremented `version`, `updateMode: "VERSIONED"`, and `assessmentUsageCount`
for the source version. Existing assessments retain their original model IDs.
**Errors:** Same model validation as creation; missing source currently returns `500`.

## POST /api/v1/maturity-model/editor/parse-upload

Parse an Excel workbook into an editable document without saving a model.

**Access:** Curator/admin. **Request:** `multipart/form-data`, required `file`
with a nonempty `.xlsx` filename (case-insensitive), and optional numeric `domainId`.

```bash
curl --fail-with-body "$API_ORIGIN/api/v1/maturity-model/editor/parse-upload" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F 'file=@model.xlsx' \
  -F 'domainId=1'
```

Use an [exported workbook](#get-apiv1maturity-modelidexportxlsx) or the
[repository template](../../../../frontend/public/templates/maturity-model-template.xlsx)
for the expected workbook layout. Review the parsed document and submit it to
`POST /editor` or `POST /{id}/versions/editor` to persist it.

**Response:** `200`, `MaturityModelEditorImportResponse`:

| Field | Type / meaning |
|---|---|
| `success` | Boolean |
| `message` | Result description |
| `document` | Editor document on success; null on failure |
| `warnings` | Array of strings to review before saving |
| `errorDetails` | Error explanation, usually null on success |

**Errors:** `400` for empty/wrong-type/invalid workbooks, using this same response
shape with `success: false`; `500` for processing failures; request-size `413` may
use the common error body. The former `/api/v1/maturity-model/upload` CSV route is
not exposed by the current controller.

## DELETE /api/v1/maturity-model/{id}

**Access:** Curator/admin. **Request:** Numeric model/version `id`; no body.
**Response:** Deleted model object, not an empty response.
**Errors:** `400 MATURITY_MODEL_IN_USE` when assessments use that exact version.
Other database relationships can also prevent deletion and produce `500`.

## PUT /api/v1/maturity-model/{id}/activate

**Access:** Curator/admin. **Request:** Numeric model/version `id`; no body.
**Response:** Updated model with `isActive: true`. Deactivates other active versions
in the same lineage. Other model lineages can remain active.

## PUT /api/v1/maturity-model/{id}/deactivate

**Access:** Curator/admin. **Request:** Numeric model/version `id`; no body.
**Response:** Updated model with `isActive: false`. Does not delete historical assessments.

## PUT /api/v1/maturity-model/{id}

**Access:** Curator/admin. **Request:** Numeric source-version `id` and complete
JSON MaturityModelDTO hierarchy.
**Response:** New inactive version, with `updateMode: "VERSIONED"` and
`assessmentUsageCount`. Despite the PUT method, this endpoint **always creates a
new version**, even when the source has no assessments. It does not replace the
source in place. A retry can create another version; use the returned model ID.

## Editor document

This example creates a small model. Replace `domainId` with an existing domain.

```json
{
  "name": "Engineering maturity",
  "description": "A small example model",
  "changelogMarkdown": "Initial version.",
  "autoEvaluated": true,
  "domainId": 1,
  "aggregationRule": "AVERAGE",
  "levels": [
    {"number":1,"name":"Initial","description":"Starting point"},
    {"number":2,"name":"Established","description":"Consistent practice"}
  ],
  "dimensions": [{
    "code": "engineering",
    "name": "Engineering",
    "weight": 1,
    "aggregationRule": "AVERAGE",
    "mappingRules": [],
    "gatingRules": [],
    "modules": [{
      "code": "delivery",
      "name": "Delivery",
      "weight": 1,
      "aggregationRule": "AVERAGE",
      "gatingRules": [],
      "practices": [{
        "code": "review",
        "name": "Code review",
        "weight": 1,
        "aggregationRule": "AVERAGE",
        "gatingRules": [],
        "questions": [{
          "code": "reviewed",
          "text": "Are changes reviewed before merging?",
          "type": "boolean",
          "weight": 1,
          "required": true,
          "requiresEvidence": false,
          "booleanCorrectAnswer": true
        }]
      }]
    }]
  }]
}
```

The top-level fields are exactly the authoring fields shown above. Each nested
dimension, module, and practice can also have `description`. Questions can have
`help` and `dependsOnQuestionCode`, plus type-specific settings below. Array order
determines display order. Dimensions require modules, modules require practices,
and practices require questions; each collection must contain at least one item.
Dependencies must resolve inside the same practice and must not form cycles.

## Model contracts

MaturityModelDTO uses `dimensions[].id` for the string dimension code, while the
editor uses `dimensions[].code`. Its remaining authoring hierarchy corresponds
to the editor structure; public DTOs additionally carry database identifiers and
response metadata:

| Object | Additional public fields |
|---|---|
| Model | `id`, `isActive`, `version`, `baseModelId`, `domain`, `creatorId`, `creatorName`, `createdAt`, `updateMode`, `assessmentUsageCount` |
| Dimension | String `id` in place of `code`; `sortOrder` |
| Module | Numeric `dimensionId`; `sortOrder` |
| Practice | Numeric `id`, `moduleId` |
| Question | Numeric `id`, `practiceId`, `dependsOnQuestionId`; `sortOrder` |

Use server-returned identifiers for assessment requests. Do not copy nested
database IDs into editor writes. Public codes are at most 64 characters; missing
codes can be generated, but explicit stable codes make authoring easier to track.
Codes must start with a letter and contain only letters, numbers, underscores,
or hyphens. Uniqueness is case-insensitive among siblings: dimensions within a
model, modules within a dimension, practices within a module, and questions
within a practice.
Names are limited to 150 characters, descriptions to 2,000, question text/help
to 500, and `changelogMarkdown` to 50,000.

Levels have `number`, `name`, and optional `description`; explicit scales contain
2–12 sequential levels numbered `1..N`. When omitted, the service supplies its
default five-level scale. Read the returned `levels`; do not hard-code level names.

Aggregation rules at model/dimension/module/practice level are `AVERAGE`,
`WEIGHTED_AVERAGE`, `MINIMUM`, `MAXIMUM`, `SUM`, and `MEDIAN`. Weights apply according
to the configured rule. Dimension `mappingRules` entries have `levelNumber` and
`minimumScore`. Explicit mappings need one entry for every level, starting with
level 1 at zero, then strictly increasing thresholds in 0–1. Omitted/empty rules
receive equal-width defaults. Gating rules are supported on dimensions, modules,
and practices:

| Gating field | Serialized value |
|---|---|
| `order` | Contiguous integer rule order starting at 0 |
| `selection` | `specificChild`, `anyChild`, `allChildren` |
| `childCode` | Selected immediate child's code for `specificChild` |
| `operator` | `<`, `<=`, `==`, `>=`, `>` |
| `threshold` | Numeric comparison threshold in 0–1, at most two decimals |
| `operation` | `set`, `add`, `subtract` |
| `value` | Numeric amount in 0–1, at most two decimals |

Omit `childCode` for `anyChild` and `allChildren`; `specificChild` must identify
an immediate child of the element containing the rule.

Preserve mapping/gating configuration when editing an existing document. These
rules affect calculated results, not which REST endpoints are available.

## Question types

Common question fields are `code`, `weight`, `text`, `type`, `help`,
`dependsOnQuestionCode`, `required`, and `requiresEvidence`.

| Type | Authoring settings | Respondent value |
|---|---|---|
| `boolean` | `booleanCorrectAnswer` | JSON boolean (also accepts 0/1) |
| `likert` | `scalePointCount` (2–100, default 5), `scaleMinLabel`, `scaleMaxLabel` (max 50 each), `scaleHighPointIsMaximum` | Integer point from 1 through the configured count |
| `multiple_choice` | `choices`: 1–100 objects with nonblank `label` and `score` in 0–1 | Configured numeric score, not label or option index |
| `open_answer` | Common fields | Text, up to 10,000 characters |
| `numeric` | Integer `rangeMin` < `rangeMax`, `rangeHighValueIsMaximum` | Integer within inclusive bounds |
| `percentage` | Same range settings as numeric | Integer within inclusive bounds |
| `evidence` | Evidence-only; forces `requiresEvidence: true` | Evidence metadata; omit an answer entry |

Scores for objective questions normalize to 0–1 according to their configuration.
Open answers need reviewer scores for manual evaluation. Maturity levels and
overall/dimension results are calculated by the backend; clients should use the
returned results instead of deriving them from a fixed five-level formula.

## Model summary

`MaturityModelSummaryDTO` includes `id`, `name`, `description`, `isActive`,
`autoEvaluated`, `version`, `baseModelId`, `domainId`, `domainName`, `domainIconKey`,
`domainColorKey`, `creatorName`, `createdAt`, `dimensionCount`, `moduleCount`,
`totalQuestions`, and `levelCount`. It does not include the nested question hierarchy.
