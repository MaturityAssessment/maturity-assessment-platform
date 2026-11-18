# Question-level branching — issue #21

Status: functional core and creator UI implemented and validated with the repository-wide limitations recorded below, 18 November 2026. Respondent UI redesign is the next phase.

Source: [issue #21 — Add Question Level Branching](https://github.com/MaturityAssessment/maturity-assessment-platform/issues/21), read with its current body and no comments. It asks for richer question dependencies affecting visibility, authored behavior for hidden questions' score and coverage contributions, and references restricted to a practice.

The [existing dependency plan](question-dependency-conditions.md) documents the implemented single-parent behavior. The [evaluation discussion](assessment-evaluation-discussion.md) and [earlier engine analysis](assessment-evaluation-engine-2026-11.md) are background, not accepted requirements for this issue. The supplied scoring profile, `temp/MM_Scoring&Aggregation_Profile_20261104.docx`, was read directly, especially §§6.2, 7.2–7.5 and 11. The supplied metamodel PDF has no extractable text; metamodel clause references in the earlier discussion have not been independently rechecked for this discovery.

## Implementation before issue #21

| Concern | Current behavior and implementation |
| --- | --- |
| Question dependencies | `Question`, `QuestionDTO`, and `MaturityModelEditorDTO` carry a parent reference and `dependencyCondition`. `QuestionDependencies` matches boolean answers, stable single-choice option IDs, or scale points. Only one parent in the same practice is allowed. |
| Dependency chains | A question is active only when its parent and all ancestors are active and the configured answer matches. Missing/invalid answers do not activate it. `MaturityModelService.validatePracticeDependencies` checks references and cycles, independently of display order. |
| Assessment inputs | `AssessmentService.responseValues` preserves raw answer and `choiceIndex`, then removes inactive answers from the usable map. Save synchronization ordinarily deletes omitted unreviewed response rows; reviewed rows have separate retention rules. Audit logs record response changes. |
| Hidden results | `AssessmentService.aggregateEvaluation` skips inactive questions entirely. They have no `elementResults` entry, no score contribution, no completion denominator contribution, and no presence in practice gating selections. |
| Coverage/completion | Questions count as 100% when answered, including answers awaiting manual scoring. Parent `includedCount` averages child percentages; weighted-mean coverage weights those percentages. Other aggregation methods use equal completion weights. These are the current platform formulas, not profile §6.2. |
| Empty aggregates | An aggregate with no usable scores is `withheld`, even if its question set is empty because of dependencies. Its parent retains it in completion calculations as a zero contribution. |
| N/A answers | `allowNotApplicable` and `notApplicableScore` implement a tagged respondent answer with a numeric score. This N/A counts as answered, contributes to aggregation, and does not activate existing dependencies. It is different from the profile's unscored NA state. |
| Gating | `ConditionalGating` has a versioned two-level AND tree, direct-child selections, typed answer comparisons, and score/state/completion comparisons. Hidden questions are currently absent. Missing operands make every comparison false, including inequality. |
| Score limits | Floors/ceilings refer to complete snapshots of existing flag rules. Withholding wins; active bounds affect the child score seen by ancestors. Altering serialized gating rules can invalidate these links. |
| Completion and review | Hidden required questions do not block submission. Respondents cannot deactivate accepted answers when correcting a returned assessment. Evaluator score adjustments change scoring without changing respondent-answer dependencies. |
| Evidence and prerequisites | Required practice evidence, evidence freshness, and module completion all use question visibility. A practice with no active questions currently has no required-evidence blocker. Existing evidence and its question references are retained when questions become inactive. |
| Frontend runtime | `questionDependencies.ts`, `assessmentFlowUtils.ts`, and `assessmentQuestionResponses.ts` separately compute activation, completion, pruning, and request serialization. Parent edits confirm before clearing populated dependent answers; reactivation does not restore cleared answers. |
| Model interchange | Both DTO families, conversion paths, versions, Excel import/export, and browser drafts preserve dependency settings. Gating references use full public paths and identity-based editor rewrites; ordinary dependency code lookup is case-insensitive. |

Two additional integration points need explicit coverage. `AssessmentEvidenceWorkflowService.responseValues` currently drops `choiceIndex` before evidence validation, which can make equal-scored choices ambiguous. `LocalAgentEvaluationService` builds reviewable questions from stored response rows rather than a shared activation result. Both should consume the same resolved question context as ordinary scoring when this feature is implemented.

## Accepted product behavior

1. **Practice-local DAG.** A question may reference multiple parents in its own practice, with exactly one condition per parent. The backend validates the combined graph, rejecting self-reference, cycles, duplicate parent conditions, and references outside the practice. Parentless questions are visible. Evaluation order follows dependencies, independently of presentation order.
2. **Two parent predicate modes.** A parent condition either checks for any valid answer or tests an accepted-values list. Lists can contain a permitted, scored N/A answer. For multiple selection, every listed option must be selected; additional selected options are allowed. Scalar answers match one of the listed typed values. Use stable option IDs, never labels, positions, or assigned scores, for choice comparisons.
3. **Boolean composition with answer availability.** Parent conditions combine with AND, OR, and NOT. A negated value match waits for an answer; unanswered or hidden parents cannot activate a branch through negation. One satisfied OR alternative can still activate the question even when another parent is unanswered. Stale stored answers to hidden questions are ignored.
4. **Hidden score configuration.** A hidden question normally contributes no score and no coverage weight. The creator may instead configure a default normalized score. A configured score, including zero, contributes to aggregation and coverage using the question's ordinary weight. This is a numeric default, not a fabricated respondent answer; descendants still treat the hidden parent as having no answer. It participates as computed in practice score/state gate selections, with no respondent answer.
5. **No new respondent N/A state.** Non-scored absence arises from a hidden item without a default or an optional unanswered question. It does not require a new selectable N/A option or a fake response row. Absence behaves as no answer for branching. Visible optional unanswered questions retain their coverage weight; hidden questions without a default do not. An answered free-text question awaiting manual evaluation is different: it has an answer even while its numeric score is absent.
6. **Required answers and scored N/A remain compatible.** Only optional visible questions may be left unanswered. A required question may still offer the existing scored N/A answer, and selecting it satisfies the required-response rule. Do not add an optional-only restriction to `allowNotApplicable`. Required hidden questions do not require a respondent answer.
7. **Evidence indicator groups.** A practice indicator may be linked to a group of questions in that practice. It is active when any linked question is visible. If none is visible, hide the indicator and waive its required-evidence check. Existing indicators without a group retain whole-practice scope. An active optional indicator remains optional. A visible unanswered question or visible scored N/A answer keeps its indicator active: activation is about visibility. A hidden question's default score does not activate an indicator. Retain uploads and their question references when indicators become inactive.
8. **Preserve the correction workflow.** Retain existing confirmation-and-clear behavior for newly hidden answers, audit history, and accepted-response locks. A correction cannot hide an accepted child without an explicit future workflow change. Preserve stored historical results. UI design begins only after implementation and feature validation.

The user accepted the compatibility/evidence defaults proposed in the preceding response. Earlier proposals for model-supplied answer options, a required-question N/A restriction, and a general profile NA-propagation engine are superseded by the decisions above.

## Final coverage and gating decisions

The user corrected the earlier coverage statement: optional unanswered questions do not contribute a numeric score but remain in the coverage denominator. Ten equally weighted optional questions with one answered therefore retain 10% coverage. Only a hidden question without a configured default is removed from that denominator. A hidden question with a default contributes its normal weight and 100% completion for that input. Preserve the existing `includedCount` and coverage formulas at every hierarchy level.

The user also accepted exposing hidden defaults to practice score/state gating. Such a question is `computed` with its configured normalized score, `answered` false, and an absent answer value. It can trigger score/state gates and their linked limits; it cannot activate descendants via answer predicates. Existing withholding precedence and finalized-child propagation remain unchanged.

All product questions are resolved. The required-question/N/A clarification and unchanged optional-omission denominator preserve existing model behavior when the new configuration is absent. No model-level evaluation-semantics flag, wider N/A migration, fake respondent N/A rows, or historical recomputation is needed.

If every participating question has no usable score, preserve existing withholding and no numeric result. An answered text question waiting for review remains answered for completion and branching. True zero scores and hidden defaults of zero remain valid inputs.

## Proposed simple implementation contract

- A versioned branching configuration on the question holds a boolean expression over parent predicates and an optional normalized hidden score. AND/OR have child expressions; NOT has one child; each parent appears once. Validate size/depth and the owning-practice boundary on model writes.
- Treat an unavailable parent's predicate as unknown. NOT preserves unknown; AND with a false operand is false; OR with a true operand is true; otherwise unknown propagates. Present the child only for a true result. This implements waiting under NOT without preventing a satisfied OR alternative from working.
- Keep a per-question resolved record containing visibility, respondent-answer availability, nullable score, score source, and participation. A hidden default has score source `default` and no answer identity. An answered text question waiting for review has a respondent answer and no numeric score yet.
- Add an optional nonempty list of question references to `EvidenceRequirement`. Absent means whole-practice scope for compatibility. Explicit empty/dangling groups are invalid rather than silently retargeting the whole practice when the last question is deleted. Keep this authored scope separate from `Evidence.referencedQuestions`.
- Compile legacy single-parent conditions into the same evaluator while retaining their current activation rules until explicitly edited. Do not execute a legacy dependency and a new branching expression independently on the same question.
- Resolve visibility and indicator activation once per practice. Pass the result to scoring, completion, evidence checks, freshness, prerequisites, reviews, and campaigns. Reuse typed answer normalization with gating where safe, without changing gating v1's schema or score-limit snapshot links.

## Implementation order and validation checkpoint

1. **Contract agreed.** Preserve existing completion formulas; include configured hidden defaults in score/state gates; keep missing/hidden answers unavailable to dependencies. Hidden scores use 0–1, including zero.
2. **Persistence and model contract.** Add a migration after V58, question branching/default configuration, indicator question groups, both DTO families, model/editor conversion, clone/version support, and optional Excel columns. Preserve stable references through simultaneous renames, imports, and deletions. Validate the complete DAG on backend model writes.
3. **Pure resolver.** Implement typed presence/list predicates, multiple-selection containment of all accepted options, the missing-answer truth tables, and topological evaluation. Use shared backend/frontend fixture data. Keep numeric defaults separate from answer identity. Reject invalid definitions rather than guessing replacements.
4. **Backend integration.** Use the same resolved context for ordinary/campaign draft saves, submission, numeric scoring, evaluator completion, respondent corrections, required evidence, evidence freshness, module prerequisites, and agent review context. Preserve choice identity in evidence validation. Apply participating question/default scores before practice gates and limits, then use final child results for ancestors. Preserve transactional synchronization and correction locks.
5. **Authoritative results.** Expose enough score-source, visibility, participation, and indicator activation metadata to explain defaults and omitted inputs. Retain old snapshots unchanged; do not materialize default scores as respondent response rows. Keep existing absent-score handling in campaign/report contracts.
6. **Frontend state only.** Update types, model/browser-draft hydration, serialization, identity-based reference rewrites, progress, pruning, autosave, request collection, evidence completion, and returned-answer protection. Add parity tests against backend fixtures. Defer components, rule-builder controls, layouts, cards, and report presentation until the feature-validation checkpoint passes.
7. **Feature validation before UI.** Run semantic fixtures, model/version/Excel round trips, PostgreSQL migration/persistence tests against a disposable database, API-driven ordinary/campaign lifecycle tests, evidence/prerequisite tests, existing gating/score-limit regressions, frontend state/parity tests, and type/lint checks. Report any unavailable/skipped checks explicitly. New authoring must remain unavailable until clients preserve the new configuration.
8. **Then discuss UI.** Design and test authoring and respondent/result presentation after the implemented contract passes the preceding checks.

## Required validation examples

- Multiple parents, one predicate per parent, exact typed scalar lists, and multiple-selection matching all listed options while permitting extras.
- Scored N/A explicitly accepted/rejected by a parent predicate; permitted scored N/A still satisfies a required question; optional missing has no answer.
- NOT waits for missing/hidden parents; OR can succeed through another answered parent; nested truth-table and double-negation cases.
- False, zero, empty multiple-selection, and an empty/unanswered value remain distinguishable. A valid hidden default of zero participates normally.
- Stable choice identity with duplicate scores, reordered choices, deleted targets, forward references, mixed legacy/new edges, duplicate parents, cycles, and display-order independence.
- Hidden default contributes its configured normalized score and normal weight but never activates descendants through answer identity or exempts an accepted-answer lock.
- Exact score, coverage, and `includedCount` results for optional missing, visible required missing, hidden exclusion, hidden default, answered text awaiting review, and reviewed text. Include nonuniform/zero weights and every existing aggregation method.
- No usable scores retains withholding; floors cannot invent a score; child state and conditional gate selections follow the final hidden-default policy; parents read finalized limited scores/states.
- Evidence group with all linked questions hidden, one visible, an unrelated visible root, a hidden default, or a visible unanswered/N/A question. Include optional/unlinked indicators, retained uploads, freshness summaries, module completion, and equal-scored choice identity during evidence checks.
- Ordinary/campaign draft/reload/submit/review/send-back/resubmit parity, accepted-child protection, and flagged items that become hidden.
- Model/browser-draft/Excel/version round trips retain conditions, defaults, indicator groups, option IDs, and references. Existing model versions without new fields retain their behavior.

## Discovery baseline

Existing behavior was checked without changing feature code:

- Backend: `./mvnw -o -Dtest=QuestionDependenciesTest,ConditionalGatingTest,ScoreLimitsTest,AssessmentServiceLifecycleTest test` — 153 tests passed.
- Frontend: `node --no-warnings --experimental-strip-types --test --test-isolation=none --test-reporter=spec tests/unit/lib/questionDependencies.test.mts tests/unit/app/assessment/assessmentQuestionResponses.test.mts tests/unit/app/assessment/assessmentPracticeProgress.test.mts tests/unit/app/assessment/assessmentModulePrerequisites.test.mts` — 61 tests passed. Explicit isolation mode was used after the default Node 26 run reported file-level results only.

These were discovery checks before implementation. Feature verification is recorded below.

## Implemented contract and verification

The functional implementation uses question `branchingRule` (version 1), optional
`hiddenScore`, and evidence-indicator `questionCodes`. References are local to the
practice, matched case-insensitively like legacy dependencies. No general scoring
formula or model semantics version was introduced. New fields are optional.
API and migration documentation describe the concrete schema and examples.

| Check | Result |
| --- | --- |
| Backend regression excluding the two legacy-baseline suites below | 489 discovered: 447 passed, 42 opt-in tests skipped, no failures/errors |
| Final focused branching/dependency/lifecycle/evidence/agent suites | 178 passed, no skips/failures/errors; includes final answer normalization and historical-snapshot compatibility checks |
| Explicit PostgreSQL feature integration suite | 3 passed: actual V59 SQL/data preservation; JSONB/model/Excel/new-version round trips; controller draft/submission, persisted defaults, campaign parity and evidence reactivation |
| Full frontend suite, with Node test isolation disabled to enumerate actual cases | 390 passed, no skips/failures |
| TypeScript type check | Passed |
| ESLint on every changed frontend source file plus the new resolver | Passed without warnings/errors |
| Whitespace, new documentation links, and branching JSON example checks | Passed |

The PostgreSQL checks used a newly initialized server under `/tmp/issue21-postgres.*`
and database `issue21` on localhost port 55439. No application database was used.
The temporary server was stopped after validation. The API integration test uses
MockMvc with the actual services/repositories and a user principal, not a deployed
HTTP server or a replacement for the repository's separate security tests.

Full-project limitations were investigated, not counted as feature passes:

- The unfiltered backend run discovered 509 tests: 447 passed, 42 skipped, and 20
  initialization errors in the existing `CampaignPersistenceIntegrationTest`
  and `MaturityModelActivationPersistenceIntegrationTest`. They enable the old
  Flyway upgrade chain, which fails on an empty database at V3 because no initial
  `dimensions` table exists. The repository's setup guide documents that the old
  scripts are not a reproducible empty-database baseline. The successful backend
  regression excludes only those two classes. V59 itself was executed and tested
  separately against a legacy-shaped fixture.
- Full `yarn lint` reports eight pre-existing `@next/next/no-assign-module-variable`
  errors in unchanged files: `assessmentModulePrerequisites.ts`,
  `editor/model/modulePrerequisites.ts`, and `editor/model/moduleRelationships.ts`.
  The changed/new source files pass scoped lint. No unrelated naming cleanup was
  included in this feature.

The UI checkpoint remains separate: no new authoring controls, layout redesign,
or browser interaction validation was performed. The functional API, serialization,
state, progress, correction protection, evidence activation, import/export and
scoring contracts are ready for that phase.

## Follow-up Next.js compilation check

The initial verification missed Next.js's directive-order check: an added import
preceded `"use client"` in `assessmentEvidence.ts`. The directive is now first.
The ambiguous easing utility in `AssessmentStep.tsx` was replaced with the explicit
`transition-timing-function` arbitrary property, preserving the same cubic curve.

Verified after the fix:

- All changed/new frontend modules place client directives first.
- Next.js 14.2.5 compilation succeeded using `next build --no-lint
  --experimental-build-mode compile` in an isolated source copy. Compiler workers
  were disabled only in that copy to surface diagnostics under Node 26. The
  application's Next config and active development build directory were untouched.
- The affected local editor route returned HTTP 200:
  `/filipevm/maturity-models/5/edit?returnTo=%2Fmaturity-models%2F5%2Fversions%2F5`.
- TypeScript checks and lint for the two corrected source files passed.
- The compilation log contains neither the ambiguous-easing warning nor the
  client-directive error.

## Creator UI implementation (18 November 2026)

The creator UI is now implemented; the earlier UI checkpoint above describes the
functional-core milestone, not the current state.

- The question dialog separates **Question details** and **Dependencies**. The
  dependency tab offers Always / When rules match, parent answer presence or
  accepted values, nested All/Any groups, NOT on a rule/group, and an optional
  hidden score. It explains waiting-for-answer behavior and coverage/gating effects.
- Parent candidates exclude self, descendants across both legacy/new edges, and
  parents already used elsewhere in the expression. Invalid imported references
  remain visible for repair. Editing legacy rules converts them only on a rule
  change; merely opening the dialog preserves their stored representation.
- The practice **Dependencies** tab renders a scrollable directed graph with
  keyboard-accessible question buttons, default-score labels, readable rules,
  evidence links and validation messages. Selecting a node opens its dependency
  editor directly. The graph shows structure, not simulated respondent answers.
- The **Evidence** tab supports whole-practice applicability or a group of linked
  questions. Empty/missing groups are flagged. Visibility follows any linked
  visible question, regardless of its answer or default score.
- Question-list summaries and change previews describe branching rules. Change
  comparison uses stable question identities for branching/evidence references,
  avoiding false rule changes after reordering. Deleting a legacy parent also
  clears its dependent's now-inapplicable hidden default.
- A multiple-selection accepted list can contain ordinary option IDs and N/A:
  ordinary answers must include all listed IDs; N/A is a separate alternative.
  When a respondent selects N/A, it replaces ordinary selections. Only N/A and
  its configured score participate. Removing N/A does not restore old selections.
  The creator UI states this distinction explicitly. Backend/frontend evaluators
  share five additional fixtures for mixed N/A/option lists and N/A-only lists.

Validation for this phase:

- **402 frontend tests passed**, including legacy-rule conversion, combined cycle
  checks, graph topology, save/reload, reorder/change previews, hidden-default
  cleanup, and N/A replacing multiple selections.
- **178 focused backend tests passed**, including the shared branching fixtures,
  assessment lifecycle, evidence workflow, agent evaluation and legacy dependencies.
- TypeScript and scoped ESLint passed for every changed creator UI/model file and
  the branching resolver.
- Local Chromium browser checks passed against the interactive Storybook creator
  workspace and legacy dependency story: graph navigation, creating from Always,
  OR/NOT and nested groups, duplicate/descendant filtering, typed accepted values,
  N/A, hidden zero score, removing groups/defaults, evidence scope, and legacy edits.
  No browser exceptions. Desktop and 390px viewport screenshots were inspected;
  the narrow viewport had no page-level horizontal overflow.
- Story: **Maturity models / Question dependencies / Branching Creator**. Browser
  checks used a temporary Chromium profile and local Storybook server; no live
  assessment/model writes were made.

Respondent UI redesign remains a subsequent phase. Existing respondent N/A
exclusivity was verified with a new regression test rather than redesigned here.
