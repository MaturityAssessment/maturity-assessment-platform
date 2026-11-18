# Completion gating

Practices, modules and dimensions store `minimumCoverage` and
`minimumIncludedCount` as percentages from 0 to 100. Both default to 0 (disabled).
A result equal to the minimum passes. These replace the previous score-changing
rules; V54 retains their historical database rows but they are no longer executed.
Existing models start with both minima disabled. Existing assessment scores are
preserved; their new metrics remain null until evaluated again.

For each visible question, included count and coverage are 100% when answered and
0% when unanswered. An N/A response with a configured numeric score is answered.
An answered question awaiting a manual score still counts as answered. Hidden
modules are omitted. Hidden questions are omitted unless they have a configured
`hiddenScore`; those defaults count as computed inputs with 100% included count
and coverage, using the normal question weight. Visible optional unanswered
questions retain their completion-denominator weight and contribute no score.

At a practice, included count is the percentage of visible questions answered,
including both required and optional questions. At a module, dimension or global
result, it is the arithmetic mean of direct-child included-count percentages. A
withheld child contributes zero, while remaining in the denominator.

Coverage is the weighted mean of those same direct-child included-count values
when the current element uses weighted mean. Other methods use equal weights,
so coverage equals included count. If all weights are zero, coverage also equals
included count. Parent coverage uses child included count, not child coverage or
flattened descendant totals.

For example, a practice with two visible questions, weights 9 and 1, has 50%
included count and 90% coverage when only the first question is answered. If that
practice and a fully answered practice have weights 3 and 1, their module has
75% included count and 62.5% coverage under weighted mean. Withholding the first
practice changes the module's percentages to 50% and 25% respectively.

Failing the included-count minimum withholds an aggregate for every method.
Failing the coverage minimum withholds it only for weighted mean. An aggregate
with no usable child scores is also withheld, even with both thresholds disabled.
Withheld elements have no score or maturity level, and their scores are excluded
from every parent aggregation. Their measured completion percentages are retained
for inspection; only their contribution to parent completion becomes zero.

Submission and final evaluation store `elementResults` on the assessment as an
immutable JSON snapshot of the calculation. Each visible question, practice,
module, dimension and global result has its location, name, state, normalized
score (nullable), `includedCount`, and `coverage`. States are `computed`,
`withheld`, `flagForReview`, `unanswered` or `unscored`. Completion metrics use 0–100 and scores use
0–1. Dimension results and the assessment also expose their percentages and
`scoreState` directly. Final evaluation replaces the preliminary snapshot using
the effective reviewed scores.

This implements the low-coverage/too-few-inputs withholding purpose of section 9
of the scoring profile, with the percentage formulas specified for this platform.
It does not implement the profile's general condition language or other patterns.

## Child-state rules

Practices, modules and dimensions also store `childStateGatingRules` (default
empty array), introduced by V55. Each rule is an object such as:

```json
{"quantifier":"any","state":"withheld","effect":"flagForReview"}
```

`quantifier` accepts `any`, `every` or `no`. `state` accepts `computed` or
`withheld`. `effect` accepts `withheld` or `flagForReview`. Rules test visible
direct children: questions for practices, practices for modules, and modules
for dimensions. Unanswered or unscored questions match neither condition.
Flagged children also match `computed`. Empty selections make `every` and `no`
true, and `any` false.

Rules run after children are evaluated. Any matching withhold effect or failing
minimum wins over all flag effects, regardless of rule order. A flag retains the
score, maturity level and completion percentages; it contributes normally to
parent aggregation and completion. The flag itself has no review workflow or
other operational consequence. It is stored and displayed in results/exports.

## Conditional rules (V56)

`conditionalGatingRules` adds a versioned, typed condition tree alongside the
existing minima and child-state rules. These configurations remain independent;
any matching withhold effect or failed minimum wins over every flag effect.
Conditional rules are supported on practices, modules and dimensions.

```json
{
  "version": 1,
  "when": {
    "kind": "and",
    "conditions": [{
      "kind": "children",
      "quantifier": "any",
      "selection": {"codes": ["D1.M1.P1", "D1.M1.P2"]},
      "where": {
        "kind": "and",
        "conditions": [
          {"kind": "comparison", "field": "coverage", "operator": ">",
           "right": {"kind": "literal", "value": 70}},
          {"kind": "comparison", "field": "score", "operator": "==",
           "right": {"kind": "field", "code": "D1.M1.P3", "field": "score"}}
        ]
      }
    }]
  },
  "effect": "flagForReview"
}
```

This rule is owned by `D1.M1`. One of P1/P2 must have both coverage above 70%
and the same score as P3. A separate entry in the outer `conditions` array is a
separate quantified selection; different children can satisfy those entries.
Every outer entry must pass. Every comparison in a child's `where` must pass on
that same child. OR, NOT, nested selections, expressions, arithmetic, maturity
levels and cross-owner references are rejected in version 1.

All `code` and `codes` values use the full, case-sensitive public path:
`dimension.module`, `dimension.module.practice`, or
`dimension.module.practice.question`. Relative suffixes are invalid. References
are confined to direct children of the rule owner, so children always finish
evaluation before their parent reads them. Omit `codes` to select all visible
direct children. Explicit lists must be nonempty, contain distinct valid full
paths, and may select a subset. The editor rewrites references by item identity
when codes or ancestor codes change, including simultaneous prefix swaps. A
deleted target stays invalid instead of retargeting the child that inherits its
code. Model saves reject dangling references. Renaming through the API or Excel
requires updating the full paths in the same document.

Fields and operators:

| Field | Available on | Operators | Literal format |
| --- | --- | --- | --- |
| `score` | All child types | `< <= == != >= >` | Normalized number, 0–1 |
| `coverage` | Practices/modules | `< <= == != >= >` | Percentage, 0–100 |
| `includedCount` | Practices/modules | `< <= == != >= >` | Existing completion percentage, 0–100 |
| `state` | All child types | `is isNot` | `computed`, `withheld`, `flagForReview`; questions also `unanswered`, `unscored` |
| `answered` | Questions | `== !=` | Boolean |
| `answer` | Questions | Depends on response type | Raw answer, described below |

The right operand is either `{"kind":"literal","value":...}` or
`{"kind":"field","code":"full.path","field":"score"}`. Field references
are limited to the **same numeric field** on one direct child. They read its
final value, even if that child was not part of the left-hand selection.

Boolean answers use true/false and equality. Scale, numeric and percentage answers
use integer thresholds within the configured response range and numeric
operators. Text answers use case-sensitive, exact equality/inequality. Single
choice answers use stable option IDs with equality/inequality. Multiple selection
uses `contains` with one option ID or `containsAny`/`containsAll` with a nonempty
array of distinct IDs. IDs, not labels, indexes or assigned scores, identify the
options; multiple-selection choices now also preserve stable IDs. An empty
selection response remains an answered question with an empty ID set. N/A uses
`{"notApplicable":true}` with equality/inequality when N/A is enabled. N/A's
configured numeric score remains independently available through `score`.
Legacy choice answers without an option index can be identified only if their
score uniquely identifies an option; ambiguous answers have no comparable answer
identity. Accepted string representations of boolean/integer answers are
normalized by question type; numeric-looking free text remains text.

Missing operands make **every comparison false**, including `!=` and `isNot`.
A withheld score is absent, not zero. Its stored coverage/includedCount remain
readable. A reference to an unpresented child is absent. Unpresented children are
removed from selections; Any is false and Every/No are true on an empty runtime
selection. A flag retains its score and still matches `state is computed`.
Numeric comparisons use tolerance 1e-9 for normalized scores and 1e-7 for
percentage metrics. Rounding for display never determines rule matching.

Unknown object fields, unsupported versions, mixed/incompatible answer types,
invalid operators, missing required values and wrong units are rejected with
`INVALID_GATING_RULES`. Explicit answer selections can restrict mixed question
sets to compatible types. Model validation permits at most 100 conditional
rules per owner, 50 selection clauses per rule and 50 comparisons per clause.
Excel appends optional `dimensionConditionalGatingRules`,
`moduleConditionalGatingRules`, and `practiceConditionalGatingRules` JSON columns;
older workbooks default to empty rules. V56 adds JSONB columns with empty-array
defaults, preserving all existing models and assessment results.

## Rule editor and metadata (V57)

The Gating tab separates baseline completion thresholds from the custom-rule list.
Thresholds are edited directly in their own section; they have a fixed withhold
effect and do not use names, descriptions or the custom-rule wizard. Existing
completion metadata is preserved for compatibility. Custom rules use compact
summary rows. The editor opens a dialog with an editable name and optional description in the
header. Each condition is a pool lane with selection, quantifier, and comparison
cells. Desktop cells open anchored editors. Mobile editors open as bottom sheets,
with other lanes summarized. All lanes join through AND into shared outcome cards.
Save commits the complete draft. A nonblank name (maximum
255 characters) is required for rules saved through this editor. Descriptions
are optional, up to 2000 characters. Changes remain in a local draft until Save;
Cancel, closing the dialog, or Escape discards them.

State and conditional rules carry optional `name` and `description` properties.
Legacy unnamed rules remain valid and receive readable fallback titles in the
editor. Completion minima store the same information in
`completionGatingMetadata`, backed by a nullable JSONB column added in V57 on
practices, modules and dimensions. Excel includes an optional completion-metadata
JSON column at each scope. Rule evaluation ignores this descriptive metadata.

## Score limits (V58)

Practices, modules and dimensions can store `scoreLimits`, defaulting to an empty
array. A limit belongs to the same element as its linked **Flag for Review** gate
rule. `kind` is `floor` or `ceiling` (cap); `value` is a finite normalized score
from 0 to 1. Exactly one of `childStateRule` or `conditionalRule` must contain a
snapshot of an existing rule on that element:

```json
{
  "childStateGatingRules": [
    {"quantifier":"any","state":"computed","effect":"flagForReview","name":"Check inputs"}
  ],
  "scoreLimits": [
    {"kind":"ceiling","value":0.6,"childStateRule":
      {"quantifier":"any","state":"computed","effect":"flagForReview","name":"Check inputs"}}
  ]
}
```

The snapshot links by complete rule content, including its name and description,
independently of list order. Identical rule definitions are interchangeable.
Editing or removing the referenced definition invalidates the link; changing its
effect to withhold also invalidates it. The editor shows an alert and requires
the creator to select a current flag rule or remove the limit. API writes reject
stale links with `INVALID_SCORE_LIMITS`. Relinking explicitly approves the current
rule definition. Changing a conditional rule's referenced public paths also
requires relinking its limits. Initial editor loading preserves valid links when
it canonicalizes imported codes; this does not repair already stale links.
Equivalent JSON number encodings such as `1` and `1.0` identify the same value.

After gating, any withhold effect, failed completion minimum or absence of usable
scores takes precedence. Otherwise only **matching** linked flag rules activate
limits. Start with floor 0 and ceiling 1, accumulate the highest active floor and
lowest active ceiling, then clamp the aggregate score to that interval. Limits
are applied after ordinary score rounding, so rounding cannot cross a precise
bound. Equal bounds are valid. A ceiling strictly below the floor withholds the
element: its score and maturity level are absent and parents exclude its score,
using the existing completion treatment for withheld children. Nonmatching limits
cannot cause a conflict, and a floor cannot create a missing score.

Parents read the limited child scores and final states in both their aggregation
and gate conditions. Dimension maturity mapping uses the limited dimension score.
The shared scoring flow applies this during submission and final evaluation;
existing stored assessment snapshots are unchanged until recalculated. Defensive
evaluation of a stale persisted link also withholds the affected score.

V58 adds JSONB columns to the three element tables. Limits survive model/editor
conversion and new model versions. Excel adds optional `dimensionScoreLimits`,
`moduleScoreLimits` and `practiceScoreLimits` JSON columns; older workbooks use
empty arrays. The minimal editor controls are in each element's Gating rules tab.

## Question branching and defaults (V59)

Branching is evaluated from respondent answers before scoring. It cannot read
scores, result state, coverage, review decisions or evidence. Parent conditions
are restricted to the same practice. Backend validation rejects cycles across
both branching and legacy dependencies. NOT waits for an unavailable answer;
OR can succeed through another answered parent.

A hidden question without a default is absent from scoring and gating selections.
A configured `hiddenScore` (0–1, including zero) is a computed scoring input.
Practice score/state gates can see it and matching flag gates can activate limits.
Its answer is absent and `answered` is false: a numeric default cannot activate
a descendant or match an answer-value comparison. Withholding precedence and
propagation of finalized limited scores remain unchanged. A hidden module also
excludes its questions' defaults.

Participating question snapshots include `visible` and `scoreSource` (`respondent`,
`default`, or null). Older snapshots remain readable. New fields are optional;
existing model behavior and historical results remain unchanged when absent.
See the [branching contract](../backend/docs/api/reference/maturity-models.md#question-branching-v59)
and [migration verification](../backend/docs/migrations/question-branching.md).
