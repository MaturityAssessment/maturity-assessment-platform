# Target profiles — issue #18

Status: implemented and validated. Campaign profiling remains out of scope.

Source: [GitHub issue #18](https://github.com/MaturityAssessment/maturity-assessment-platform/issues/18),
read on 18 November 2026, and the user's accompanying feature description.

## Goal and agreed scope

Creators define contextual expectations for an assessment through target profiles
belonging to a particular maturity-model version. A decision tree of profiling
questions resolves to at most one profile, or explicitly to no profile.

Profiling does not change assessment content, question applicability, scoring,
weights, completion requirements, or evaluation. It only supplies expectations
against which the final evaluated results are compared.

- Add a **Target profiles** tab to the model editor.
- Profiles contain dimension minimum scores, optional module minimum scores, and
  an optional expected overall maturity level. Creators choose which dimensions
  have targets; dimension/module inputs are percentages.
- Present profiling at the beginning of an individual assessment when the model
  version has profile configuration.
- Identify the matched profile on the respondent dashboard and assessment overview.
- Show actual scores against targets after evaluation, with **met**, **not met**,
  and **not evaluated** outcomes and explanations.
- Campaign profiling, campaign configuration, and campaign aggregate comparisons
  are outside this change.

The issue mentions direct profile selection as an alternative. The user's later
instruction chooses identification through profiling questions and permits no
matching profile. No separate manual profile picker is proposed.

## Findings in the current platform

| Area | Existing behavior | Proposed integration |
| --- | --- | --- |
| Model authoring | Editor has Overview, Scale, Structure, and Review tabs. Its ID-free document is distinct from the runtime model DTO. | Add Target profiles before Review; preserve configuration through both DTOs, browser drafts, validation, and change previews. |
| Versioning | Editing creates a new inactive model version. Assessments retain their exact model version. | Store the tree and profile requirements per version, copying them into new versions without changing previous ones. |
| Assessment creation | Start opens or creates one draft per user and exact model version. Drafts can be resumed or reset. | Track profiling separately from scored question responses; show the prelude for incomplete profiling; retain it on resume and clear it on Start Over. |
| Evaluation | Automatic submission completes immediately; manual submission waits for evaluator completion and may enter corrections. | Produce comparisons only for completed evaluations. Preserve the profile across review and respondent corrections. |
| Result data | Persisted element snapshots include normalized dimension/module scores and score states. Dimension results also contain percentages and mapped levels. | Compare against finalized normalized scores, including score limits and gates, without recalculating questionnaire answers. |
| Missing scores | Scores can be withheld; completed status does not guarantee every element has a numeric result. Review flags are separate from withholding. | Preserve missing values and explain why a requirement cannot be evaluated. Do not treat absent scores as zero. |
| Presentation | Assessment results already use Recharts; assessment lists and the individual overview are separate components. | Add profile identity to both dashboard contexts; use actual-versus-target charts and a requirement table in results. |
| Model exchange | Excel import/export and editor conversions explicitly enumerate configuration. | Extend round trips so saving, versioning, importing, or exporting cannot silently discard profiles. |

Primary integration files:

- `frontend/src/app/maturity-models/editor/MaturityModelEditorPage.tsx`
- `frontend/src/app/maturity-models/editor/model/editorTypes.ts`
- `frontend/src/app/maturity-models/editor/model/editorDocument.ts`
- `frontend/src/app/maturity-models/editor/model/editorChanges.ts`
- `frontend/src/app/maturity-models/useModelAssessmentStart.ts`
- `frontend/src/app/assessment/AssessmentFlow.tsx`
- `frontend/src/app/assessment/useAssessmentAutosave.ts`
- `frontend/src/app/assessment/AssessmentDashboard.tsx`
- `frontend/src/app/assessment/AssessmentResultsTab.tsx`
- `frontend/src/app/dashboard/hooks/useDashboardAssessments.ts`
- `frontend/src/api/types.ts`
- `backend/src/main/java/com/master_thesis/maturity_assessment/maturity_models/services/MaturityModelService.java`
- `backend/src/main/java/com/master_thesis/maturity_assessment/maturity_models/services/MaturityModelExcelService.java`
- `backend/src/main/java/com/master_thesis/maturity_assessment/assessments/services/AssessmentService.java`

## Confirmed product decisions

The user confirmed single-choice profiling questions; each answer leads to another
question, a profile, or no profile. Creators may target selected dimensions, with
optional module targets and an optional expected overall maturity level. Any failed
requirement makes the outcome **not met**, even when another score is unavailable.

## Implemented behavior

The remaining behavior follows the defaults presented during discovery:

- Only the questions along the selected path need answers. A no-profile terminal
  permits the respondent to proceed; it is different from unfinished profiling.
- Resolve the profile on the backend from validated answers. Do not trust a
  client-supplied profile ID to establish applicability.
- Let respondents revise profiling while the assessment is a draft. Lock it after
  first submission, including during corrections. Start Over clears profiling.
- Inclusive comparisons: actual score greater than or equal to the minimum meets
  a score target; a higher overall maturity level also meets the expected level.
- All configured requirements must be satisfied to report **met**. Omitted optional
  targets impose no requirement. Any failure wins over unavailable results; if
  none fails but a required result is unavailable, the outcome is not evaluated.
- Comparison is saved only after evaluation; it is null while evaluation is pending.
  No matched profile and profiles without requirements yield **not evaluated**
  with distinct explanations. Profiles without requirements receive an authoring warning.
- Treat a withheld required score as unavailable. Treat a required
  score flagged for review as not yet valid for target comparison.
- Reject invalid targets and malformed trees when saving a model: out-of-range
  scores, missing referenced elements/levels, duplicate identities, cycles, and
  dangling question/profile destinations. Hidden modules cannot supply a target
  score; their references must be repaired or removed explicitly.
- Use stable identities for profiles, profiling questions, and options. Preserve
  requirement references when model items are renamed or reordered; report
  deleted references instead of silently redirecting targets.
- Preserve legacy assessments and model versions without profile configuration.
  Do not retroactively assign profiles or recompute historical scores.
- Include profile identity, requirements, and comparison in individual assessment
  PDF/Excel reports so exported results retain their context.

## Implementation and validation

1. The confirmed contract is covered by shared routing fixtures and backend
   comparison tests: matching, no match, boundaries, failure precedence, and
   unavailable results.
2. Add a new migration after V59 and extend model/assessment persistence and both
   model DTO contracts. Keep configuration optional for existing data.
3. Implement tree validation, authoritative profile resolution, and comparison as
   separately testable backend logic. Integrate automatic/manual completion,
   draft save/resume/reset, correction locks, and assessment access controls.
4. Extend editor state, serialization, reference updates, change previews, model
   versioning, and Excel round trips before enabling new authoring controls.
5. Build the Target profiles tab and respondent profiling step, then dashboard
   identity and accessible visual comparisons with explicit unavailable states.
6. Verify tree paths and invalid definitions, minimum boundaries including zero,
   optional requirements, maturity-level ordering, missing/withheld/review states,
   automatic and manual evaluation, resume/reset/corrections, old versions,
   reference preservation, and persistence/Excel round trips.
7. Run focused backend/frontend tests, type checking, scoped lint, database
   migration/integration checks in a disposable database, and browser checks for
   creator and respondent flows. Update API, schema, and feature documentation.

## Verification

- Backend regression: 470 passed, 46 opt-in checks skipped, no failures/errors.
  The two documented legacy Flyway-baseline suites were excluded:
  CampaignPersistenceIntegrationTest and MaturityModelActivationPersistenceIntegrationTest.
  The temporary database used SPRING_FLYWAY_ENABLED=false and HIBERNATE_DDL_AUTO=create-drop
  so the application-context check could initialize an empty schema. With Flyway
  enabled it hits the existing V3 missing-baseline failure, unrelated to V60.
- The final focused backend suite passed 173 tests, including Unicode workbook
  chunk boundaries and the additional legacy manual-completion path.
- Four explicitly enabled PostgreSQL tests passed: actual/repeated V60 migration
  and legacy-row preservation; JSONB/model/editor/Excel/new-version round trips
  and frozen comparisons; manual review/campaign exclusion; and controller
  draft save, reload and submission. These use real services and repositories,
  with MockMvc for the HTTP contract rather than a deployed backend.
- All 414 frontend tests passed, including shared routing fixtures, pruning,
  invalid trees, reference changes/deletion, hydration, serialization and revert.
- TypeScript and scoped ESLint passed. Next.js production compilation passed in
  an isolated source copy; worker settings changed only in that copy for Node 26.
- Chromium checks passed for creator editing, percentage/zero minima, routing,
  profile matches/no match, upstream pruning, and final visual comparisons.
  Desktop and 390px screenshots were inspected; no page overflow or browser
  exceptions were found.
- The compiled application's actual AssessmentFlow passed a separate browser
  check for multipart autosave, incomplete-path reload, completion flush,
  profile identity, editing, no-match continuation and completed-path resume.
  API responses were intercepted fixtures; PostgreSQL/MockMvc verify the backend.
- Individual PDF/Excel data includes profile identity, requirement outcomes and
  profiling labels. Model workbooks retain the optional chunked TargetProfiles
  JSON sheet, including large Unicode configurations.

Temporary services/artifacts are under /tmp and are stopped after validation.
No application database or production model/assessment was changed. This work
does not include committing, pushing or deploying.
