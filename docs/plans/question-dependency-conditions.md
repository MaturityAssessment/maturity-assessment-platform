# Question dependency conditions

Status: implemented. The steps below document the contract and integration order.
See `backend/docs/migrations/question-dependencies.md` for migration verification
and `Maturity models/Question dependencies` in Storybook for the modal example.

## Behavior to deliver

A question can depend on one question in the same practice. The parent can be
Yes / No (`boolean`), Multiple choice (`multiple_choice`), or Scale (`likert`).
The author selects one or more parent answers that activate the child. Matching
any selected answer activates it, provided the parent and all its ancestors are
active. Existing dependencies continue to activate on Yes.

Examples:

| Parent | Selected activation answers | Result |
| --- | --- | --- |
| Yes / No | No | Active when the respondent answers No |
| Multiple choice | Partially implemented, Fully implemented | Active for either selected option |
| Scale with five points | 3, 4, 5 | Active when the selected point is 3, 4, or 5 |

Rules match respondent answers, independently of option scores, scale scoring
direction, evaluator adjustments, and question weight. An unanswered, invalid,
or inactive parent never activates its child. Zero, false, option index zero,
and a zero-scored choice must remain distinguishable from an unanswered question.

The first release retains the single-parent, same-practice dependency model.
Multiple Selection, numeric, percentage, and open-answer parents, range operators,
and combinations of multiple parents are outside this release.

## Findings in the current implementation

- `Question` stores a parent foreign key; both model DTOs carry dependency codes,
  and the read DTO also carries the resolved database ID.
- `MaturityModelService.validatePracticeDependencies` and entity conversion both
  restrict parents to boolean questions. Existing cycle and practice checks must
  remain authoritative.
- `AssessmentService.isQuestionVisible` and
  `assessmentFlowUtils.isDependentQuestionDisabled` independently implement
  Yes-only activation.
- Frontend single-choice form state uses `choice:<index>`. Assessment requests and
  stored evaluation rows carry `choiceIndex` alongside the answer's score.
- Backend `responseValues` helpers discard `choiceIndex`. Extending only the
  visibility predicate would therefore misidentify equal-scored choices.
- Choices currently contain labels and scoring values, without a persistent
  identity. Labels, scores, and array positions are unsuitable as durable rule
  references when authors edit choices.
- Assessment progress, required completion, response pruning, review, scoring,
  resubmission, and accepted-response protections depend on activation behavior.
- The question editor already uses an accessible Headless UI Listbox, with
  constrained width, truncation, hover titles, and keyboard navigation.

## 1. Define the contract and compatibility rules

Keep `dependsOnQuestionCode` and the resolved `dependsOnQuestionId`. Add a typed
`dependencyCondition` to the child question:

```json
{ "type": "boolean", "answers": [true] }
{ "type": "multiple_choice", "optionIds": ["persistent-option-id"] }
{ "type": "likert", "points": [3, 4, 5] }
```

The type must match the parent's type; all lists must be nonempty and contain
unique, valid members. Scale points are integers in `1..scalePointCount`.
Condition without parent, missing parent, self-reference, conflicting ID/code,
unsupported parent type, and cycles are validation errors.

Compatibility rules:

- Boolean dependency without a condition means Yes. Normalize it to the explicit
  boolean condition on hydration/write.
- No parent and no condition means no dependency.
- A non-boolean parent requires an explicit valid condition; never invent a
  trigger for it.
- Removing a dependency removes its condition as one operation.
- New authoring always writes an explicit condition.

Add a persistent string `id` to multiple-choice options. Preserve it through
label/score edits, reorder, draft hydration, API conversion, workbook export,
model cloning, and new versions. New options receive new IDs. Existing answer
payloads can keep `choiceIndex`: resolve that index against the assessment's
model version to obtain the option ID before matching a dependency.

Legacy score-only responses can resolve to an option only when exactly one option
has that score. Ambiguous responses do not activate a new option-specific rule;
an editable assessment must ask the respondent to select the option again.
Existing submitted assessment results remain attached to their original model
version. Do not silently choose the first equal-scored option for activation.

Deliverable: DTO/TypeScript contract, normalization policy, and shared JSON
examples of inputs and expected activation results.

## 2. Add persistence and model validation

Add a new Flyway migration, leaving existing migrations intact. Add serialized
condition storage on `questions`, following the project's existing JSON-in-TEXT
pattern for question configuration. Backfill existing boolean dependencies with
the Yes condition and existing multiple-choice options with stable IDs. Preserve
option order, labels, scores, and assessment choice indices.

Extend `Question`, `QuestionChoiceDTO`, `QuestionDTO`, `MaturityModelEditorDTO`,
and every model read/write/version conversion. Validate conditions after all
questions in a practice have been resolved, so references to later questions
work. Use consistent error codes with the child question identified.

Old option payloads without IDs receive IDs when first normalized and stored.
An import with explicit option-ID conditions must supply matching option IDs;
reject dangling references rather than guessing by label or score.

Tests before proceeding:

- Migration preserves existing Yes-only dependencies and option ordering/data.
- Create, reload, edit, clone, and version preserve conditions and option IDs.
- Same-practice, ID/code consistency, cycle, duplicate-value, and type checks.
- Invalid point, empty selection, missing option, and orphan condition rejection.
- PostgreSQL persistence tests against a disposable test database.

## 3. Integrate the backend assessment engine

Extract a dependency evaluator with typed answer context: raw answer plus
`choiceIndex`, resolved against the parent question on the assessment's model
version. Replace the lossy answer-map usage wherever activation is evaluated;
support both incoming requests and persisted evaluation rows.

Match raw Yes / No answers, option IDs, and scale points. Use identical behavior
for draft saves, submission, required-answer validation, evaluation, resubmission,
and results. Audit every caller of `responseValues` and `isQuestionVisible`, along
with metadata/scoring paths, to prevent an inactive answer contributing to results
or blocking completion. Preserve accepted-answer edit restrictions.

Keep practice evidence attached to the practice; deactivating a child must not
delete evidence shared by its siblings. Preserve current rules for when evidence
is required.

Tests before proceeding:

- Yes, No, several matching choices, and several selected scale points.
- Equal-scored choices activate independently; option zero and zero score work.
- Reverse-scored scales match the selected point, not normalized score.
- Missing, malformed, nonintegral, or out-of-range answers remain inactive.
- Nested dependencies remain inactive when an ancestor is inactive, even if a
  stale descendant answer would otherwise match.
- Draft/reload/submit/review/resubmit agree; inactive required questions do not
  block submission; inactive responses do not contribute to scoring.
- Accepted responses cannot be invalidated through a parent edit.

## 4. Integrate and test frontend state before changing controls

Extend frontend API types and editor hydrate/serialize functions. Normalize old
browser drafts to explicit boolean conditions and persistent option IDs. Preserve
conditions during question code changes, renumbering, and reordering.

Implement a pure frontend evaluator using the same fixture cases as the backend.
Update assessment activation, progress, required completion, pruning, request
serialization, and reload behavior to use it. Extend response context plumbing
where necessary to retain choice identity.

Parent-answer changes must continue to identify all newly inactive descendants,
confirm before clearing populated answers, and respect accepted-response locks.
Switching between two matching answers must retain child answers. Clearing an
answer follows the same path as selecting a nonmatching answer.

For model edits, preserve matching rules on label/score edits and option reorder.
Deleting a referenced option, shrinking a scale past a selected point, or changing
the parent to another type must mark affected dependencies invalid and block save
until the author repairs or removes them. Never silently select a replacement
answer, truncate the rule, or broaden activation. Deleting the parent keeps the
existing dependency-removal confirmation and clears both reference and condition.

Tests before proceeding:

- Frontend/backend fixture parity for every supported parent type and bad input.
- Draft migration and serialization round trips, including empty selections.
- Choice IDs survive edit/remove/add/reorder and new model versions.
- Descendant pruning, cancellation, progress, required completion, and locks.
- Parent edits expose invalid conditions through the existing review mechanism.

This is the integration checkpoint: backend and frontend state tests pass before
the editor exposes the new authoring interactions.

## 5. Extend spreadsheet interchange

Add optional `dependencyCondition` JSON to the Questions sheet and denormalized
row DTO; retain `dependsOnQuestionCode`. Preserve option IDs in `questionChoices`.
Old workbooks with boolean dependencies continue to mean Yes.

Validate after resolving all parent questions. Export explicit conditions and
option IDs. Update the template, workbook guidance, API examples, and regression
checklist. Make invalid references and conditions actionable with row/question
context.

Tests before UI work: export/import/editor-save round trips for every parent type,
legacy workbook compatibility, duplicate scores, and invalid condition errors.

## 6. Add the editor interactions

Extract a focused dependency field component from `QuestionEditor`. Keep its
placement and visual language: the same labels, border treatment, spacing, error
colors, and constrained Headless UI dropdown. List only eligible same-practice
parents that cannot create a cycle.

Selecting a parent reveals an adjacent/full-width group labeled **Activate when
the answer is**:

- Yes / No: compact Yes and No checkboxes, with Yes preselected for a newly
  selected boolean parent.
- Multiple choice: checkbox rows showing option labels, with any number selectable.
- Scale: compact selectable points `1..N`, with endpoint labels when configured.

For a new multiple-choice or scale dependency, begin with no activation answers
selected and require a selection before save. Switching parents resets the
condition, using Yes only for a boolean parent. Selecting No dependency removes
the condition and its controls.

Show a short summary such as “Active when Q02 is Partially implemented or Fully
implemented.” Keep the full label available on hover, truncate long dropdown
entries, and constrain option-list dimensions as in the existing selector. For
checkbox labels, allow wrapping inside the panel so answer names remain readable.
Associate validation messages with the parent and answer controls; ensure keyboard
operation and visible focus. Keep an invalid existing parent visible as an error
instead of displaying No dependency.

Update the question-list dependency summary and assessment's hard-coded
“answered Yes” message to describe the actual trigger. Keep disabled cards and
the current respondent workflow consistent with existing behavior.

## 7. Verify the complete flow and release

Create a small fixture model containing Yes / No, equal-scored choice options,
forward/reverse scales, nested dependencies, a required child, and a zero-weight
optional question. Exercise create, save/reload, version, workbook round trip,
assessment draft/reload, submit, evaluator review, and resubmit.

Check long labels, small screens, modal overflow, keyboard navigation, focus,
empty selections, parent changes, and error navigation. Use UI interaction tests
where the existing harness supports them, plus explicit manual browser checks;
TypeScript checks alone do not verify these interactions.

Run the focused model, import, assessment lifecycle, editor mutation/validation,
and assessment progress/response suites, followed by the normal frontend lint and
type checks. Run PostgreSQL migration/persistence tests with the documented
integration-test environment and report separately if unavailable.

Release schema and backend support first, followed by compatible frontend runtime
support. Expose new authoring/import behavior only once all assessment and editor
clients understand and preserve the new fields. Do not run an older editor on
models with new conditions: it can drop configuration. Test rollback/read-only
behavior before enabling authoring; no destructive schema rollback is needed.

Acceptance: every supported parent activates exactly the configured answers,
existing boolean dependencies retain their behavior, frontend and backend agree,
model round trips preserve intent, inactive answers follow existing lifecycle
rules, and the new controls fit the current modal at desktop and mobile widths.
