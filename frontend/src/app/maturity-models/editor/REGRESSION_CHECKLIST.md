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
- Prevent non-boolean, cross-practice, broken, and cyclic dependencies.
- Configure boolean, Likert, multiple-choice, numeric, percentage, and
  open-answer questions with the existing defaults and constraints.

## Review and save

- Show error counts on the correct wizard steps.
- Navigate from review issues to the correct item and focusable field.
- Block save while errors remain and retain non-blocking warnings.
- Create inactive models through `/api/v1/maturity-model/editor`.
- Create inactive versions through
  `/api/v1/maturity-model/{id}/versions/editor`.
- Clear the browser draft and redirect to the saved model after success.
# Text length limits

- Model, level, dimension, module, and practice names stop at 150 characters.
- Public codes stop at 64 characters.
- Descriptions stop at 2,000 characters.
- Question text and guidance stop at 500 characters.
- Multiple-choice option labels stop at 150 characters.
- Open assessment answers stop at 10,000 characters and show a live count.
- Evidence descriptions stop at 500 characters and evidence URLs at 1,000.
- Evaluator insight stops at 2,000 characters.
- Spreadsheet imports and direct API requests exceeding a limit are rejected with a clear validation error.
