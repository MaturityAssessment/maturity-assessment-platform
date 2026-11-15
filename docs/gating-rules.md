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
modules and dependent questions whose conditions were not triggered are omitted.

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
