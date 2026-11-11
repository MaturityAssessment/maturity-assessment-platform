# Maturity Model Editor Regression Checklist

Use this checklist when changing editor state, persistence, hierarchy operations,
or question configuration.

## Entry and persistence

- Start a new model manually and from a valid `.xlsx` workbook.
- Reject non-`.xlsx` files and show workbook parsing failures.
- Load an existing model for version editing with public codes editable.
- Resume and discard browser drafts for both new and existing models.
- Autosave dirty documents under the existing user/model key after 500 ms.
- Preserve unload, link-navigation, cancel, and dirty-import confirmations.
- Click the header logo with dirty edits: cancelling keeps the editor open;
  confirming goes to the dashboard and preserves the resumable browser draft.

## Editing

- Edit overview fields, automatic evaluation, and two to twelve scale levels.
- Add, edit, move, drag, reorder, and delete dimensions, modules, practices,
  and questions.
- Toggle module visibility using both its switch and the outline actions menu;
  verify the hidden indicator and restore visibility through either control.
- Hide a module referenced by a dimension gate: show the dependency alert and
  block save until the rule is fixed or visibility restored. Any/all-child gates
  use visible modules and alert that their scope changes.
- Preserve visibility through browser drafts, version review/revert, save/reload,
  and Excel export/import. Workbooks without moduleVisible default to visible.
- Exclude hidden modules from assessment overviews, navigation, deep links,
  progress, required answers/evidence, manual/automatic evaluation, and results.
  A dimension with only hidden modules contributes no result or overall weight.
- Preserve the current selection behavior after additions and deletions.
- Generate editable codes for new items and preserve manually changed codes.
- Update dependency references when a question code changes.
- Change dimension, module, practice, and question codes in a new version and
  verify the saved version uses the new codes while the source version is unchanged.
- Clear dependency references after deleting their parent question.
- Configure Yes / No, Multiple choice, and Scale dependencies with one or more
  activation answers. Existing dependencies default to Yes.
- Prevent unsupported parent types, cross-practice, broken, and cyclic dependencies.
- Preserve choice option IDs through label/score edits, reorder, drafts, versions,
  and spreadsheet export/import; equal-scored options activate independently.
- Flag deleted activation options, reduced scales, and changed parent types for
  explicit repair. Clear conditions when removing the dependency.
- Verify inactive descendants do not block required completion or affect scoring;
  changing a parent retains the answer-clearing confirmation and accepted locks.
- Check the Question dependencies Storybook example at desktop and mobile widths,
  including long dropdown names, wrapping answer labels, and keyboard navigation.
- Configure boolean, Likert, multiple-choice, Multiple Selection, numeric,
  percentage, and open-answer questions with the existing defaults and constraints.
- Configure Multiple Selection with 1–100 labeled options and non-negative raw
  values. Reject missing/non-finite/negative values and a zero or non-finite total.
- Verify equal-valued options remain separately selectable and “None of the
  above” remains distinct from an unanswered question after assessment save/reload.

## Module prerequisites

- In Relationships, select zero or more earlier modules in the same dimension; later
  modules and modules from other dimensions are unavailable.
- Reject duplicate, missing, self and forward references through the API/import.
- Arrow moves, drag reorders and change-review reverts cannot violate dependency
  order. Allowed moves and renames preserve references by module identity.
- Hide dependents before hiding their prerequisite. Showing a dependent restores
  prerequisite visibility through the entire chain. Referenced modules cannot be
  deleted until their references are removed.
- Preserve prerequisites in browser drafts, new versions, review/revert and Excel
  round trips. Older workbooks and models start without prerequisites.
- Assessments grey out locked modules and show unmet names in desktop/mobile
  navigation. Direct practice links show the locked module overview.
- Required answers and evidence unlock dependents; optional unanswered questions,
  low scores and inactive conditional questions do not block completion.
- Incomplete prerequisites relock downstream modules while retaining their answers
  and evidence. Recompletion restores access; submission remains blocked until
  prerequisites are satisfied. Check individual and campaign assessments.
- Locked modules cannot be edited through feedback review or direct API writes.

## Co-requisites and mutually exclusive modules

- Relationships lists prerequisites, co-requisites and mutex in one tab. Only
  modules from the same dimension are selectable; invalid options explain why.
- Setting/removing a co-requisite or mutex pair from either module updates both
  endpoints. Sidebar badges summarize co-requisite groups and excluded modules.
- Showing/hiding a module changes its whole co-requisite group. Mutex switches
  preview all modules to show/hide and affected gates before applying; cancelling
  leaves the document unchanged. Both mutex alternatives may be hidden.
- Block switches that hide prerequisites needed by other visible modules. Repair
  explicit gating references to hidden modules before saving.
- Reject mutex with direct or indirect prerequisites, mutex within co-requisite
  groups, mixed visibility implication conflicts, and modules requiring both
  alternatives. Permit alternatives sharing a prerequisite. Mutex is pairwise.
- Preserve both arrays through rename, reorder, drafts, review/revert, versions and
  Excel round trips. Legacy workbooks default to empty arrays. Deletion removes
  reciprocal edges, while prerequisite references still prevent deletion.
- Co-requisites/mutex add no completion locks or score operations during assessment;
  only visible modules appear and contribute to evaluation.

## Review and save

- Show error counts on the correct wizard steps.
- Navigate from review issues to the correct item and focusable field.
- Block save while errors remain and retain non-blocking warnings.
- Create inactive models through `/api/v1/maturity-model/editor`.
- Create inactive versions through
  `/api/v1/maturity-model/{id}/versions/editor`.
- Preserve Multiple Selection option labels, order, and raw values through
  save/reload, version creation, and workbook export/import.
- Verify selected raw values are summed and normalized by the total available
  value; evaluator adjustments use the normalized 0–1 score.
- Clear the browser draft and redirect to the saved model after success.
# Text length limits

- Model, level, dimension, module, and practice names stop at 150 characters.
- Public codes stop at 64 characters.
- Descriptions stop at 2,000 characters.
- Question text and guidance stop at 500 characters.
- Multiple-choice and Multiple Selection option labels stop at 150 characters in the editor.
- Open assessment answers stop at 10,000 characters and show a live count.
- Evidence descriptions stop at 500 characters and evidence URLs at 1,000.
- Evaluator insight stops at 2,000 characters.
- Spreadsheet imports and direct API requests exceeding a limit are rejected with a clear validation error.

## Shared model settings

- Creation offers name, description, and domain; version editing offers release notes and evaluation settings.
- Model page Settings opens a prefilled modal for curators/admins; ordinary users have no settings action.
- Saving updates the name, description, domain label, and domain appearance across all versions without creating a version or changing activation.
- Cancel, Escape, backdrop, and the close button discard unsaved changes; closing is blocked during a save.
- Empty fields, failed domain loading, and failed saving keep the modal open with actionable feedback.
- Restoring an old browser draft or importing a workbook while editing preserves the current shared settings.
