# Evaluation Readiness Notes

**Implementation snapshot:** 25 July 2026

**Purpose:** preparation for a first usability, accessibility, and cognitive-walkthrough evaluation.

## Readiness summary

The repository compiles and its tested backend behaviors pass, but the safest first evaluation should use a controlled model and test accounts. A five-level model with straightforward boolean, multiple-choice, numeric/percentage, and optional open-answer questions best matches the current respondent UI.

The following should be corrected or excluded from task design before collecting evaluative findings:

- non-five-level assessment execution;
- evidence metadata privacy gap;
- inconsistent authorization status handling;
- model-management screens shown to ordinary users;
- secrets/TLS configuration for any deployment containing real participant data.

## Flows stable enough for an initial evaluation

### Recommended respondent flows

1. **Approved-user login**
   - Clear entry point and conventional form.
   - Token refresh is implemented, though not necessary for a short session.

2. **Start an assessment from a domain**
   - Domain selection, instructions, and structure preview are complete.
   - Use one or two domains with clearly named active models.
   - Selecting Start immediately creates or resumes the current-version draft;
     leaving without an answer produces a visible 0% draft.

3. **Navigate and answer a five-level questionnaire**
   - Practice navigation, dependencies, required markers, answer clearing, and review are implemented.
   - Use a model with moderate size to avoid testing scale problems before basic comprehension.

4. **Save and resume a draft**
   - Answers, files, secure links, and evidence descriptions autosave and are
     restored across leave/resume.
   - Include the navbar's saving, saved, failure, retry, and offline-recovery
     states in the study.

5. **Submit an automatically evaluated assessment**
   - Produces final results without coordination with a curator.
   - Suitable for evaluating task completion and result interpretation.

6. **View and export own results**
   - Overall/dimension results and PDF/XLSX export are implemented.
   - Suitable for comprehension and information-findability tasks.

### Recommended curator/admin flows

1. **Approve a pending user**
   - Implemented and useful for an administrator-focused walkthrough.

2. **Create a simple domain and manual model**
   - The editor provides structured steps, validation, review, and local drafts.
   - Use a small model and provide content to enter; avoid turning the first evaluation into a model-design exercise.

3. **Create a new model version and activate it**
   - Versioning and separate activation are clearly implemented.
   - Useful for testing whether users understand inactive versions and publication.

4. **Review a pending assessment**
   - Manual scoring and evaluator insight are implemented.
   - Use a five-level model and retain a copy of the original answers for research comparison because the final save overwrites eligible response values.

## Flows that should not be evaluated yet

| Flow/area | Reason |
|---|---|
| Assessment with mixed normalized and legacy question formats | Boolean/Scale use 0–1 while remaining formats are temporarily projected at mixed aggregation boundaries |
| Explicit assessment target/scope selection | Not implemented |
| YAML or CSV model import | Not implemented despite older documentation |
| Model duplication/archive | Not implemented |
| Historical trend or benchmark interpretation | Not implemented |
| Integrated AI assessment analysis | Only manual JSON export/import exists |
| Real participant/data deployment | Current secrets, trust-all TLS default, and evidence metadata authorization gap are unsuitable |
| Cross-role error recovery | 401/403 mismatch may distort findings until aligned |

## Areas likely to cause usability problems

### Respondent experience

1. **“Complete assessment” does not complete the assessment.** It first saves and opens a review screen; actual submission occurs later.
2. **“Start over” clears progress in place.** The UI explains that answers and
   evidence are cleared while the draft itself is retained. Test whether users
   understand that this is irreversible and does not create a new assessment ID.
3. **Required versus fully answered.** Navigation distinguishes required-complete from all-answered, but the visual meanings are subtle.
4. **Evidence is conditional on answering.** An optional evidence-based question can be left blank, but once answered it requires a file or secure link. This rule may surprise users.
5. **Evidence save failures are blocking.** Draft response changes remain
   unchanged when an evidence item cannot be validated or stored, and the user
   must retry the complete save.
6. **No Not Applicable choice.** Users may use “No,” leave blank, or seek a skip option depending on their interpretation.
7. **Dependent answer loss.** Changing a parent from Yes clears child answers/evidence. The instructions state this, but the destructive effect has no immediate confirmation.
8. **Normalized scores remain internal.** Respondents see the accepted Numeric/Percentage bounds, while the resulting 0–1 score remains hidden.
9. **Generic submission errors.** Users may not know which question/evidence caused backend rejection.
10. **Domain card details appear on hover/focus.** Touch users do not have a hover state; selection also immediately advances.

### Curator experience

1. **Model terminology and public codes.** Curators must reason about dimensions, modules, practices, stable codes, weights, dependencies, and question types simultaneously.
2. **Inactive-by-default save behavior.** This is safe but may be mistaken for publication failure.
3. **Version versus edit.** “Edit” always creates a new version; the original is not modified.
4. **Activation scope.** Activation deactivates another active version of the
   same model lineage, while active models from other lineages in the domain
   remain available.
5. **Weight meaning is incomplete.** Module weight is editable but does not influence scoring.
6. **Manual review shows preliminary results.** Curators may anchor on scores calculated before manual scoring.
7. **Manual scores overwrite original answers.** This is not explained in the UI.
8. **Agent JSON workflow is technical.** Exporting, external processing, schema-conformant JSON, importing, then manually scoring imposes high cognitive load.
10. **Score labels say 1–5 even when the model can define another N.**

## Cognitive-load risks

### Hierarchical navigation

Respondents navigate four conceptual levels:

```text
Domain → Dimension → Module → Practice → Question
```

The domain is selected before the questionnaire; the side navigation then displays dimensions, modules, and practices. Test whether participants can:

- identify their current location;
- predict where a question belongs;
- understand dimension completion versus practice completion;
- recover after jumping non-linearly.

### Model editor

The editor combines content authoring, information architecture, identifiers, scoring configuration, dependencies, and publication workflow. A cognitive walkthrough should examine:

- whether “Overview / Scale / Structure / Review” matches curators' mental model;
- whether users know when codes can or cannot be edited;
- whether moving an element is understood to change respondent order;
- whether dependency choices and cycle restrictions are discoverable;
- whether range-boundary rules are comprehensible;
- whether issue messages help users locate and fix errors.

### Manual evaluation

Reviewers must compare:

- original response;
- evidence metadata/file;
- preliminary dimension score;
- maturity-scale labels;
- imported agent advice, if used;
- their own manual score;
- optional evaluator insight.

This is a high-load screen and should be evaluated only with a focused task and a small number of eligible questions.

## Terminology to test

| Term | Possible confusion |
|---|---|
| Domain | Could mean industry, department, knowledge area, or assessment topic |
| Maturity model | May be unfamiliar to respondents |
| Dimension | May overlap conceptually with module or practice |
| Module | Generic software term; may not communicate assessment grouping |
| Practice | Could mean an activity, control, requirement, or question group |
| Maturity level | Could be interpreted as score, category, or target |
| Overall average vs maturity level | Numeric score and named band may appear contradictory |
| Automatic evaluation | Could imply AI rather than deterministic scoring |
| Manual evaluation | Could imply all answers are rescored, though only eligible ones are |
| Curator | Combines model manager and evaluator duties |
| Evidence | Can mean an uploaded file or a secure HTTPS link |
| Required complete | Differs from fully answered |
| Complete assessment | Actually proceeds to review |
| Pending review / In evaluation / On Hold | Three labels are used for the same lifecycle stage |
| Active model | A model lineage's version that is available for new assessments; one domain can have several active model lineages |
| New version | Creates a separate inactive model row |
| Agent report | Manual external advisory file, not an integrated agent |

## Nielsen heuristic review targets

### Visibility of system status

Check:

- whether **Saving…**, **All changes saved**, and
  **Changes not saved · Retry** are noticed and understood;
- whether selected domain/model is always visible;
- progress meanings in questionnaire and evaluator screens;
- model import duration and validation;
- activation/deactivation success;
- token expiry/refresh behavior;
- assistant waiting/error states.

Components:

- `assessment/page.tsx`;
- `AssessmentNavigationMenu.tsx`;
- `EditorChrome.tsx`;
- `evaluate/[id]/page.tsx`;
- `AlertNotification.tsx`.

### Match between system and real world

Check:

- domain/dimension/module/practice vocabulary;
- score and maturity-level representation;
- evidence requirements;
- version activation;
- “automatic evaluation” wording.

### User control and freedom

Check:

- answer clearing;
- back navigation from review;
- start-over semantics;
- absence of draft history/undo after clearing progress;
- editor undo absence;
- destructive model/user/assessment deletion.

There is no general undo/redo.

### Consistency and standards

Check:

- inconsistent labels for pending review;
- `/5.0` displays versus custom scales;
- native `confirm`/`alert` mixed with custom modals/notices;
- back-button props that are currently commented out in `TopNavbar`;
- icon-only delete buttons across screens.

### Error prevention

Check:

- model review validation;
- required-question/evidence gating;
- numeric and percentage boundaries;
- destructive dependency clearing;
- role-inappropriate model actions;
- manual review submission with missing scores.

### Recognition rather than recall

Check:

- whether help tooltips are sufficient;
- whether score meanings are visible during curator review;
- whether respondents need to remember model structure;
- whether public code generation reduces or adds mental burden.

### Flexibility and efficiency

Check:

- practice jump navigation;
- keyboard reordering;
- model import versus manual entry;
- catalog search/filter/sort;
- absence of bulk user/model operations.

### Aesthetic and minimalist design

Check:

- long structure preview;
- dense model detail page;
- dense manual evaluation plus agent report;
- repeated score/status blocks.

### Error recovery and help

Check:

- generic registration/login/submission failures;
- access-denied response mismatch;
- editor issue navigation;
- import parse messages;
- missing evidence/file errors.

## Cognitive walkthrough targets

### Respondent task: save and resume

Questions:

1. Will the user notice and correctly interpret each navbar save state?
2. Will they wait for **All changes saved** before leaving, or trust
   **Continue Later** to flush pending changes?
3. Can they recover through **Retry** after a simulated network failure?
4. Will they recognize the 0% draft created immediately after Start?
5. Will answers and file/link evidence feel continuous after resume?
6. Will the first-incomplete-practice jump feel correct?

### Respondent task: resolve a dependency

Questions:

1. Will the user notice the disabled question?
2. Will they understand which prior answer enables it?
3. Will they predict that changing the parent clears child data?
4. Will the review screen's “Not applicable” label match their expectation?

### Curator task: create and publish a model version

Questions:

1. Will the curator understand that Edit creates a new version?
2. Can they locate scale and question-type configuration?
3. Can they resolve validation issues from Review?
4. Will they know saving does not activate?
5. Can they return to detail and activate the correct version?

### Curator task: manually evaluate

Questions:

1. Can the curator identify every question requiring a score?
2. Can they interpret response and evidence together?
3. Do they understand the effect of manual score on final results?
4. Can they distinguish optional insight from required scoring?
5. Do preliminary scores bias their choices?

## Initial WCAG-oriented risks

### Perceivable

- Several status/progress distinctions rely partly on color; textual labels exist in many places but should be checked systematically.
- Low-contrast gray text and pale status colors should be measured.
- Help content is provided through tooltips; verify touch, zoom, and screen-reader access.
- No text alternative is needed for decorative icons when hidden correctly, but icon-only controls need accessible names consistently.
- Model and assessment hierarchy may become difficult at 200–400% zoom.

### Operable

- Shared `Modal` lacks `role="dialog"`, `aria-modal`, focus trapping, initial focus, and focus restoration.
- Navigation drawer declares dialog semantics but does not trap/restore focus.
- User avatar menu button lacks a clear accessible name and expanded/menu attributes.
- Clickable result table rows are not keyboard-operable.
- Several icon-only delete buttons use `title` or tooltip but no `aria-label`.
- Assessment visual progress bars lack progressbar semantics.
- Fixed bottom editor controls and fixed assistant button should be checked for overlap at zoom/mobile sizes.
- Drag-and-drop provides keyboard sensors for question reorder, but announcements and instructions need screen-reader testing.

### Understandable

- Inconsistent pending-state labels can confuse users.
- “Complete assessment” versus “Submit assessment” needs clearer sequencing.
- Errors are often generic and not linked to fields.
- Numeric/range scoring rules are hidden from respondents.
- Session timeout/refresh is not communicated.

### Robust

- Question prompt labels are not consistently programmatically associated with numeric/textarea controls through `htmlFor`/`id` or `fieldset`/`legend`.
- Custom modal/menu implementations need assistive-technology testing.
- The autosave indicator uses a live region; verify that rapid state changes are
  announced without becoming repetitive.
- `AuthContext` failure state may leave ambiguous rendering.

## Recommended first evaluation tasks

### Respondent study

1. Log in with an approved account.
2. Start an assessment in a named domain.
3. Explain the model structure after the preview.
4. Answer a required boolean question and its dependent question.
5. Clear/change the parent answer and explain what happened.
6. Answer a question requiring a file and attach evidence.
7. Observe **All changes saved**, then choose **Continue Later** midway.
8. Resume and finish the assessment.
9. Review and submit.
10. Interpret overall and one dimension result.
11. Download a PDF or XLSX report.

Use a five-level automatic model with approximately:

- 2 dimensions;
- 2 modules per dimension;
- 1–2 practices per module;
- 2–4 questions per practice;
- one dependency;
- at most one evidence item.

### Curator study

1. Create a domain.
2. Create a small model manually from supplied content.
3. Configure one multiple-choice and one percentage question.
4. Add a boolean dependency.
5. Resolve a deliberately introduced validation error.
6. Save the inactive model.
7. Activate it.
8. Create a new version and explain which version respondents will receive.
9. Review a prepared pending assessment.
10. Assign manual scores and add evaluator guidance.

### Administrator study

1. Locate a pending access request.
2. Use name/organization information to decide whether to approve.
3. Approve the user.
4. Change an approved user's role.
5. Identify why the current admin cannot delete itself.

## Data to collect

- task completion and critical errors;
- time on task;
- navigation reversals and dead ends;
- terminology questions;
- points where users request help;
- incorrect mental models of required/full completion;
- confidence interpreting scores and maturity levels;
- keyboard-only completion;
- screen-reader announcements and focus order;
- zoom/reflow observations;
- evidence privacy expectations;
- curator understanding of version versus activation.

## Pre-evaluation remediation checklist

1. Fix custom maturity-scale execution and all hardcoded `/5.0` labels.
2. Add evidence-list ownership/curator authorization.
3. Align backend 401/403 behavior and frontend handling.
4. Add model-route and model-action role guards.
5. Externalize/rotate secrets and disable trust-all TLS.
6. Verify that backend required-answer errors are clearly associated with the
   missing questionnaire items in the UI.
7. Validate autosave/retry, clear-progress, and “Complete assessment” wording
   through the first evaluation.
8. Decide how to preserve original responses after manual scoring.
9. Add dialog focus management and accessible names to icon controls.
10. Run automated axe/Lighthouse checks, then manual keyboard and screen-reader tests.
11. Execute the existing model-editor regression checklist.
12. Perform one end-to-end rehearsal for each study role with seeded data.

## Verification completed for this documentation

- Backend test suite: 56 tests passed.
- Frontend production build: passed for all 17 routes.
- No automated frontend unit, end-to-end, visual-regression, or accessibility tests were found.
