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

The model name, description, and domain are inherited from the saved source
version. Values supplied by browser drafts or workbook imports do not overwrite
these settings. Use `PUT /{id}/settings` from the model page to change them for
all versions.

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

For Multiple Selection rows, use `questionType: multiple_selection` and put the
`choices` JSON array of `label`/`rawValue` objects in the `questionChoices` cell.
See [question types](#question-types) for configuration and scoring rules;
workbook export preserves these options and their order.

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

## PUT /api/v1/maturity-model/{id}/settings

Update the name, description, and domain across all versions in a model lineage
without creating a version or changing activation, assessment links, or scoring.

**Access:** Curator/admin.
**Request:** Numeric `id` of any version in the lineage; complete JSON settings:

```json
{"name":"Engineering maturity","description":"Assess engineering capabilities.","domainId":1}
```

Name and description are trimmed and required. Name is limited to 150 characters
and description to 2,000 characters after trimming. `domainId` must identify an
existing domain. All three fields are required; this is not a partial update.
**Response:** `200 OK`, array of [model summaries](#model-summary) for the updated
versions, ordered by version ascending, including the new domain appearance.
Repeating the same update is safe.
**Errors:** `400 MODEL_NAME_REQUIRED` or `400 MODEL_DESCRIPTION_REQUIRED` for
null/blank text; `400 TEXT_TOO_LONG` for oversized text; `400 DOMAIN_REQUIRED`
for a missing domain; `400 DOMAIN_NOT_FOUND` for an unknown domain; `404` when
the model does not exist. Validation failures do not modify any version.

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
The new version inherits the source's current name, description, and domain;
these fields in the request are ignored. Use `PUT /{id}/settings` to update the
whole model lineage.

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
      "visible": true,
      "weight": 1,
      "aggregationRule": "AVERAGE",
      "gatingRules": [],
      "practices": [{
        "code": "review",
        "name": "Code review",
        "requiresEvidence": false,
        "weight": 1,
        "aggregationRule": "AVERAGE",
        "gatingRules": [],
        "questions": [{
          "code": "reviewed",
          "text": "Are changes reviewed before merging?",
          "type": "boolean",
          "weight": 1,
          "required": true,
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

Modules accept `visible` in both editor and public model contracts. It defaults
to `true` when omitted or null. Setting it to `false` preserves the authored
module and descendants, while excluding them from assessment navigation,
required answers/evidence, scoring, aggregation, gating, and maturity mapping.
Dimensions without visible modules are omitted from assessment results. Visibility
belongs to the exact model version; changing it through version editing leaves
existing assessments on their original version.

A dimension's `specificChild` gating rule must reference a visible module.
Saving an explicit reference to a hidden module returns `400 INVALID_GATING_RULES`.
The editor alerts on affected rules and blocks saving until they are repaired.
`anyChild` and `allChildren` evaluate only visible, scored modules. Rules inside a
hidden module are retained for editing and do not run during assessment.
Assessment submissions referencing hidden-module questions are rejected with `400`.
Public model reads and editor reads retain the full authored hierarchy, including
hidden modules; assessment clients filter `visible: false` before presentation.
Workbook exports include optional `moduleVisible` in the Modules sheet. Imports
without that column default all modules to visible.

Modules also accept `prerequisiteModuleCodes`, an optional array of module codes
(default `[]`). References are case-insensitive and resolve only to distinct
**earlier modules in the same dimension**, using array order. Self-references,
forward references, duplicate entries, unknown modules and cross-dimension
references return `400 INVALID_MODULE_PREREQUISITES`. These restrictions prevent
cycles and reject reorders that violate the dependency order. The editor updates
references when modules are renamed or valid reorders renumber their codes.

A visible module must have visible prerequisites; inconsistent API writes return
`400 HIDDEN_MODULE_PREREQUISITE`. The editor blocks hiding a prerequisite while
visible modules depend on it. Showing a dependent module also shows its entire
prerequisite chain. Remove prerequisite references before deleting a module.

During assessment, every selected prerequisite must have all active required
answers and required practice evidence complete. Optional answers may remain
unanswered; no numeric score or evaluator approval is needed. Unmet prerequisites
lock the module and its practice links, with the missing module names shown.
If a prerequisite becomes incomplete, downstream content is retained and locked;
it becomes editable again when prerequisites are complete. Draft writes cannot
modify locked content, and submission is blocked until prerequisites are complete
(`400 MODULE_PREREQUISITES_INCOMPLETE`). This applies to individual and campaign
assessments. Each model version retains its own prerequisite configuration.

Workbook Modules sheets use optional `modulePrerequisites`, a JSON array such as
`["M01_FOUNDATION", "M02_PLANNING"]`. Older workbooks default to no prerequisites.

Modules accept two further optional arrays, defaulting to `[]`:

| Field | Meaning |
|---|---|
| `coRequisiteModuleCodes` | Symmetric co-requisite edges: connected modules share visibility, either all visible or all hidden |
| `mutexModuleCodes` | Symmetric exclusions: a pair may have at most one visible module; both may be hidden |

Both fields reference distinct other modules in the same dimension. Define a pair
on either endpoint; the service canonicalizes spelling/order and returns reciprocal
entries on both. Full-document clients must remove a pair from both endpoints to
remove it. The editor handles both sides automatically in the **Relationships**
tab, alongside prerequisites. Renaming, allowed reordering, drafts, review/revert
and version creation preserve references. Deleting a module removes its reciprocal
co-requisite/mutex edges; prerequisite references must first be removed explicitly.

Validation rejects configurations where showing any module would force both
members of a mutex pair to be visible, regardless of current visibility. This
includes direct/indirect prerequisites (A → B → C forbids mutex A/C), exclusions
inside co-requisite groups, combined co-requisite/prerequisite paths, and a module
requiring both alternatives. Alternatives may share a prerequisite. Mutex edges
remain pairwise and are not transitive.

Errors are `400 INVALID_MODULE_RELATIONSHIPS` for self, duplicate, missing or
out-of-dimension references; `400 CONFLICTING_MODULE_RELATIONSHIPS` for impossible
visibility implications; and `400 INCONSISTENT_MODULE_VISIBILITY` for co-requisites
with different visibility or a mutex pair with both modules visible. API writes
reject inconsistent visibility rather than changing it implicitly.

The editor previews group visibility changes and mutex switches before applying
them. It blocks hiding a prerequisite still needed by another visible module and
alerts about affected gating rules; explicit gates referencing hidden modules
continue to block saving. Sidebar badges summarize relationships. Co-requisites
and mutex affect visibility only: assessment completion, scoring and gating gain
no additional runtime rules. Existing hidden-module exclusion still applies.

Workbook Modules sheets add optional `moduleCoRequisites` and `moduleMutex`, each
a JSON array of sibling codes. Older workbooks default to no such relationships.
The shipped template and exports include both columns.

Modules also carry optional **informational editor badges**:

| Field | Default | Meaning |
|---|---|---|
| `mandatoryBadge` | `false` | Display a “Mandatory” editorial label |
| `reinforcesModuleCodes` | `[]` | Display “Reinforces X” for each target module |
| `substitutesModuleCodes` | `[]` | Display “Substitutes Y” for each target module |

These fields are notes for future model editors. They impose no visibility,
prerequisite, completion, scoring, aggregation, mapping or gating constraints.
A hidden module can carry Mandatory, and a note may refer to a prerequisite,
co-requisite or mutually exclusive module without adding any rule. Notes are
directional; targets receive no reciprocal annotations. Historical/unresolved
codes are retained as notes and do not block saving.

The module editor shows badges below its header and offers controls under
Relationships → Informational badges. It supports multiple targets from the same
dimension, including hidden and later modules. Badges are absent from the sidebar,
model browsing and respondent/evaluator assessment views. Rename/reorder updates
references; deleting a target removes its incoming badge references in the editor
without blocking deletion. Drafts, change review/revert and model versions preserve
the annotations.

Optional workbook columns are `moduleMandatoryBadge` (boolean), `moduleReinforces`
and `moduleSubstitutes` (JSON arrays of module codes). Legacy workbooks default to
no badges. These annotations are included in exports and the shipped template.

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
`dependsOnQuestionCode`, `dependencyCondition` and `required`.

Dependencies target one Yes / No, Multiple choice, or Scale question in the same
practice. Set `dependencyCondition` to one of:

```json
{ "type": "boolean", "answers": [false] }
{ "type": "multiple_choice", "optionIds": ["option-a", "option-b"] }
{ "type": "likert", "points": [3, 4, 5] }
```

Any listed answer activates the child, provided its parent and all ancestors are
active. Conditions match respondent answers independently of scoring direction,
option scores, evaluator scores, and weight. Lists must be nonempty, unique, and
valid for the parent's current configuration. Self-reference, cycles, missing
parents, conflicting parent ID/code, and cross-practice links are rejected.
Conditions without a parent are rejected. Legacy boolean dependencies without a
condition still activate on Yes. Other parent types require an explicit condition.

Multiple-choice options carry a persistent string `id` (generated for legacy
options without one). Preserve it when editing labels or scores, reordering,
exporting/importing, or creating a new model version. Dependency `optionIds`
reference these identifiers, never option labels, scores, or positions. Assessment
responses retain their existing numeric `response` and `choiceIndex` fields;
activation resolves the index against the assessment's model version. Historical
score-only answers activate an option-specific rule only when the score identifies
exactly one option; ambiguous editable answers need an explicit option selection.

Practices define `evidenceRequirements`, an ordered array of up to 50 entries:

```json
[{"code":"monthly-report","name":"Monthly incident report","instructions":"Use the last day of the reporting period as the evidence date.","required":true,"format":"FILE_OR_URL","frequency":"monthly","maxAgeDays":null}]
```

Codes are unique (case-insensitive) within a practice, start with a letter and contain
up to 64 letters, digits, underscores or hyphens. Names are required. `instructions` stores the optional acceptance criteria (up to
500 characters), labelled **Acceptance criteria** in the editor and assessment UI.
These criteria are entirely informational guidance for respondents and evaluators;
the platform does not evaluate them, use them to block submission, or change scores
based on their content. `format` is `FILE`, `URL`, `FILE_OR_URL`, or `ANY`
(the latter also permits notes). Requirements are copied into new model versions.
`required` blocks submission when that specific requirement has no evidence, provided
the practice has an active question. Evidence question references remain optional.
The editor exposes lifecycle configuration in the practice's Evidence tab.
`frequency` is `adhoc` (default), `monthly`, `quarterly` or `yearly`. An omitted/null
`maxAgeDays` uses 31 days for monthly, 92 for quarterly and 366 for yearly; ad hoc
indicators without an override do not expire. An explicit `maxAgeDays` must be a
nonnegative integer and overrides the frequency default (zero means same-day
validity). Expiry uses days, never calendar-month arithmetic. Lifecycle settings
are versioned and survive editor and workbook round-trips. Verification remains
deferred. These informational indicators do not impose score penalties.

`requiresEvidence` remains a compatibility field, derived from mandatory named
requirements on write. Legacy writes with a true flag and no requirements become
one `supporting-evidence` requirement accepting any format. Excel/CSV preserves
requirements as JSON in the optional `practiceEvidenceRequirements` column;
`practiceRequiresEvidence` remains supported for older workbooks. Legacy
question-level evidence flags are ignored.

| Type | Authoring settings | Respondent value |
|---|---|---|
| `boolean` | `booleanCorrectAnswer` | JSON boolean (also accepts 0/1) |
| `likert` | `scalePointCount` (2–100, default 5), `scaleMinLabel`, `scaleMaxLabel` (max 50 each), `scaleHighPointIsMaximum` | Integer point from 1 through the configured count |
| `multiple_choice` | `choices`: 1–100 objects with nonblank `label` and `score` in 0–1 | Configured numeric score, not label or option index |
| `multiple_selection` | `choices`: 1–100 objects with nonblank `label` and finite non-negative `rawValue`; total must be finite and positive | Array of unique zero-based option indexes; `[]` explicitly means none apply |
| `open_answer` | Common fields | Text, up to 10,000 characters |
| `numeric` | Integer `rangeMin` < `rangeMax`, `rangeHighValueIsMaximum` | Integer within inclusive bounds |
| `percentage` | Same range settings as numeric | Integer within inclusive bounds |
|
Multiple Selection uses creator-defined `rawValue` values for cumulative
scoring. For example, a question can include:

```json
{
  "type": "multiple_selection",
  "choices": [
    {"label": "Policy documented", "rawValue": 2},
    {"label": "Staff trained", "rawValue": 3},
    {"label": "Practice audited", "rawValue": 5}
  ]
}
```

Selecting `[0, 2]` sums to 7 out of 10, producing a normalized score of `0.7`.
Selecting every option scores `1`; selecting none scores `0`. Zero-valued options
are allowed, but at least one option must have a positive raw value. The `score`
field is used by Multiple Choice; it is not required or used for Multiple
Selection. See [assessment requests](assessments.md#assessment-request) for
answer validation and [review requests](assessments.md#review-request) for
manual adjustments.

Scores for objective questions normalize to 0–1 according to their configuration.
Open answers need reviewer scores for manual evaluation. Maturity levels and
overall/dimension results are calculated by the backend; clients should use the
returned results instead of deriving them from a fixed five-level formula.

## Model summary

`MaturityModelSummaryDTO` includes `id`, `name`, `description`, `isActive`,
`autoEvaluated`, `version`, `baseModelId`, `domainId`, `domainName`, `domainIconKey`,
`domainColorKey`, `creatorName`, `createdAt`, `dimensionCount`, `moduleCount`,
`totalQuestions`, and `levelCount`. It does not include the nested question hierarchy.
