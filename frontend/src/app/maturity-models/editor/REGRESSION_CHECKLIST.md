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

## Editing

- Edit overview fields, automatic evaluation, and two to twelve scale levels.
- Add, edit, move, drag, reorder, and delete dimensions, modules, practices,
  and questions.
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
