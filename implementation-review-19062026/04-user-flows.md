# User Flows

**Implementation snapshot:** 25 July 2026

## 1. Register for access

**Status:** Implemented  
**Actor:** Unauthenticated prospective user

**Preconditions**

- The email is not already registered.
- The backend and database are available.

**Steps**

1. Open `/register`.
2. Enter full name, organization, email, and password.
3. Submit the form.
4. The frontend posts to `POST /api/v1/auth/register`.
5. The backend creates a `USER` with `PENDING` approval status.
6. The frontend redirects to `/login?status=registration-submitted`.
7. The login page explains that an administrator must approve access.

**Validation and error states**

- Browser fields are required and email uses `type="email"`.
- Backend only explicitly checks duplicate email; stronger request/password validation is not implemented.
- All frontend registration failures are shown as the same generic message.

**Postconditions**

- A pending user record exists.
- The user cannot log in until approved.

**Screens/components**

- `frontend/src/app/register/RegisterForm.tsx`
- `frontend/src/app/login/LoginForm.tsx`
- `auth/controllers/AuthenticationController.java`

## 2. Approve or reject an access request

**Status:** Implemented  
**Actor:** ADMIN

**Preconditions**

- Administrator is authenticated.
- A pending registration exists.

**Steps**

1. Open `/admin`.
2. Review the Pending tab.
3. Choose approve or reject.
4. Approval changes status to `APPROVED`.
5. Rejection deletes the pending user.

**Validation and feedback**

- Only ADMIN is authorized by the backend.
- Approve/reject is rejected if the user is not currently pending.
- The table updates in place; no explicit success announcement is provided.

**Postconditions**

- Approved user can log in, or rejected user no longer exists.

**Uncertainty**

- The admin page handles HTTP 403, while the backend access-denied handler currently emits HTTP 401. Verify the unauthorized-screen behavior manually.

## 3. Log in and refresh a session

**Status:** Implemented  
**Actor:** APPROVED user

**Preconditions**

- Account exists and is approved.

**Steps**

1. Open `/login`.
2. Enter email and password.
3. Backend authenticates credentials.
4. Backend returns an access token and opaque refresh token.
5. Frontend stores both in `localStorage`.
6. Frontend calls `/api/v1/user/me`.
7. User is redirected to `/dashboard`.
8. On a later 401 response, Axios attempts one refresh, rotates tokens, and retries queued requests.

**Errors**

- Pending accounts receive a specific approval message.
- Other login failures receive a generic message.
- Failed refresh clears tokens and navigates to the hardcoded `/filipevm/login` path.

**Postconditions**

- `AuthContext` contains the authenticated user and role.

**Partial behavior**

- If `/user/me` fails during initial context refresh, `AuthContext` logs the error but does not reliably set authentication to false. A loading/authorization edge case should be tested.

## 4. Access the dashboard and navigation

**Status:** Implemented  
**Actor:** Authenticated user

**Steps**

1. Open `/dashboard`.
2. The screen loads the user's assessments.
3. The user can start, continue, or view completed assessments.
4. The navigation drawer exposes actions according to the frontend role hierarchy.
5. The user can open the assessment assistant modal.

**Feedback and errors**

- A full-page loader is shown while assessments load.
- Assessment-load failure is logged but not prominently surfaced on the dashboard.
- Assistant errors are displayed inside the chat.

**Postconditions**

- User enters an assessment, result, management, or assistant flow.

## 5. Create a domain

**Status:** Implemented  
**Actor:** CURATOR or ADMIN

**Preconditions**

- Authenticated with sufficient role.

**Steps**

1. Open `/domains`.
2. Select **Create Domain**.
3. Enter a required name and optional description.
4. Submit to `POST /api/v1/domain`.
5. The new domain is added to the table.

**Validation and errors**

- Empty name is blocked in the modal and by `@NotBlank`.
- Duplicate names are rejected.
- Delete is blocked when the domain has associated models.

**Postconditions**

- Domain is available for model creation.

## 6. Create a maturity model manually

**Status:** Implemented  
**Actor:** CURATOR or ADMIN

**Preconditions**

- At least one domain exists.

**Steps**

1. Open `/maturity-models`.
2. Select **Create model**.
3. Choose **Build manually**.
4. Complete the four editor steps:
   1. Overview: name, domain, description, evaluation mode.
   2. Scale: define 2–12 ordered maturity levels.
   3. Structure: edit dimensions, modules, practices, and questions.
   4. Review: inspect counts and blocking issues.
5. Add/reorder/delete model elements as needed.
6. Configure question type, weight, guidance, dependency, required flag, evidence flag, and type-specific options.
7. Save.
8. Backend validates the document and creates an inactive version 1 model.
9. Frontend clears the browser draft and opens the model detail page.

**Validation**

- Required model name, description, domain, levels, and non-empty hierarchy.
- Public code format and parent-scope uniqueness.
- Allowed question types.
- Multiple-choice option validity.
- Scale point count (2–100), endpoint tags, and scoring direction.
- Numeric/Percentage inclusive integer bounds and best-endpoint direction.
- Boolean-only, same-practice, acyclic dependencies.
- Frontend blocks automatic evaluation when an open-answer question exists.

**Error states and feedback**

- Editor errors are counted per step and review issues link back to the relevant field/item.
- Unsaved documents are stored in `localStorage` after a 500 ms delay.
- Browser unload, links, cancel, and replacing import prompt for confirmation.
- Save errors appear as editor notices.

**Postconditions**

- An inactive model exists; activation remains separate.

**Partial behavior**

- Frontend route controls do not consistently enforce CURATOR role before entering the flow. Backend save endpoints enforce it.
- Backend direct model creation does not appear to enforce the frontend-only “open answer requires manual evaluation” rule.

## 7. Import a maturity model from Excel

**Status:** Implemented  
**Actor:** CURATOR or ADMIN

**Preconditions**

- An `.xlsx` workbook uses the supported sheet structure.

**Steps**

1. Open the new-model entry screen or the editor.
2. Choose an `.xlsx` file.
3. Frontend uploads it to `/api/v1/maturity-model/editor/parse-upload`.
4. Backend validates sheets, headers, references, levels, rows, options, and bounded integer configurations.
5. Parsed content is converted into an editor document.
6. Frontend displays a warning to review imported content and generated codes.
7. Curator edits and saves as an inactive model or version.

**Errors**

- Non-XLSX files are rejected.
- Missing sheets, invalid references, invalid rows, or parsing errors are returned to the editor.
- Import into a dirty editor requires confirmation because it replaces the current document.

**Not implemented**

- YAML import.
- CSV import through a current controller/UI flow.
- Direct import-and-publish without editor review.

## 8. Edit/version a maturity model

**Status:** Implemented  
**Actor:** CURATOR or ADMIN

**Preconditions**

- Source model version exists.

**Steps**

1. Open `/maturity-models/{id}`.
2. Select **Edit**.
3. Backend returns an ID-free editor document with public codes.
4. Existing public codes are locked in the editor.
5. Curator changes content, order, scale, or configuration.
6. Save through `/api/v1/maturity-model/{id}/versions/editor`.
7. Backend creates the next inactive version in the same lineage.
8. Version history is visible on the detail page.

**Postconditions**

- Original version remains unchanged.
- New version is inactive and must be activated explicitly.

**Deletion/activation rules**

- Activating a version deactivates any other active version in the same model
  lineage. Active models from other lineages in the domain are unchanged.
- Deactivation leaves that model lineage without an active version. The domain
  remains available while at least one other model lineage is active.
- Deletion is blocked if the exact version is referenced by assessments.

## 9. Start an assessment and select scope

**Status:** Implemented

**Actor:** USER, CURATOR, or ADMIN

**Preconditions**

- At least one domain has an active model.

**Steps**

1. Open `/assessment/setup`.
2. The system fetches domains with models and all model summaries.
3. Only domains with at least one active model are shown.
4. Select a domain and one of its active models.
5. Read assessment instructions.
6. Review the selected active model's dimensions, modules, practices, and
   question counts.
7. Select **Start Assessment**.
8. If a draft exists for the selected active model version, choose to continue
   it or clear its current progress.
9. The backend atomically returns the existing draft or creates one empty
   `DRAFT` for the user and exact model version.
10. The questionnaire opens at `/assessment?draftId={id}`.

**Scope limitation**

The selected domain/model is the only implemented scope choice. There is no selection of organization, department, team, project, capability area subset, assessment period, or respondent group.

**Postconditions**

- A durable draft exists even if the respondent leaves before answering;
  abandoned starts therefore appear as 0% drafts.
- Questionnaire opens at the first practice or first incomplete practice in a
  resumed draft.
- **Start over** clears responses and evidence from the current-version draft
  while retaining its database row and ID.
- Drafts for inactive versions in the same lineage remain available and are not
  reset when starting the active version.

**Routing**

- Assessment execution routes require a positive `draftId`.
- `/assessment`, nested assessment routes without `draftId`, and old
  `?modelId=` links redirect to `/assessment/setup`.

## 10. Answer questionnaire items

**Status:** Implemented with limitations  
**Actor:** Respondent

**Preconditions**

- A `DRAFT` and its exact maturity-model version have loaded.

**Steps**

1. Select a practice from hierarchical navigation or use Previous/Next.
2. Answer visible questions.
3. Use help icons where configured.
4. Clear an answer if needed.
5. Add a file or secure HTTPS link, with an optional description, when an
   answered question requires evidence.
6. Continue until all required enabled questions and evidence are complete.
7. Each accepted answer or evidence edit schedules an automatic save.

**Question behavior**

- Boolean: Yes/No.
- Scale: configured point count with optional minimum/maximum endpoint tags.
- Multiple choice: configured labels mapped to internal normalized scores.
- Numeric: whole-number input constrained to curator-defined bounds.
- Percentage: whole-number input constrained to curator-defined bounds.
- Open answer: multiline text.
- Dependent questions enable only after a parent boolean Yes.
- Changing a parent away from Yes removes dependent answers and selected evidence.

**Validation and feedback**

- A red asterisk identifies required questions.
- Practice/dimension navigation shows required-complete and fully-answered states.
- Completion is disabled while required items or required evidence are missing.
- No separate Not Applicable/Skipped answer exists.
- Numeric and Percentage responses must be whole numbers within their configured inclusive bounds in both client and backend validation.

Scale questions are independent of the model maturity scale. Their normalized
0–1 results are converted to maturity scores only at dimension level.

## 11. Autosave and resume assessment progress

**Status:** Implemented  
**Actor:** Respondent

**Preconditions**

- Questionnaire is open.

**Steps**

1. Change an answer, file, link, evidence description, or evidence selection.
2. After one second without another edit, the frontend sends an authoritative
   multipart snapshot to `PUT /api/v1/assessments/drafts/{draftId}`.
3. The navbar announces **Saving…**, then **All changes saved** when the request
   succeeds.
4. Changes made during an in-flight request are coalesced into one trailing
   save; only one save request is in flight at a time.
5. On validation or network failure, the navbar shows
   **Changes not saved · Retry** and never reports a false saved state. The user
   can retry there; the next edit and reconnecting to the network also retry.
6. Select **Continue Later** to flush and await pending changes before returning
   to `/dashboard`.
7. Resume from the dashboard/assessment list or choose continue when starting
   the same active model. Both paths open `/assessment?draftId={id}`.

**Postconditions**

- Response JSON and the complete evidence snapshot are retained.
- Draft timestamp updates.
- A successful upload is reconciled with its returned evidence metadata, so the
  same browser file is not uploaded again by a later save.

**Limitations**

- There is no draft rename, duplicate, archive, or history.
- Only one draft per user and exact maturity-model version is permitted.
- Simultaneous tabs use last-writer-wins behavior.
- Navigation away from a dirty, saving, or failed draft triggers the browser's
  unsaved-change warning.

## 12. Review and submit an assessment

**Status:** Implemented  
**Actor:** Respondent

**Preconditions**

- Required enabled questions are answered.
- Every answered visible question marked `requiresEvidence` has a valid file or
  secure HTTPS link.

**Steps**

1. Select **Complete assessment**.
2. The system flushes and awaits the autosave queue.
3. Review page displays answers, Not applicable dependent questions, and selected filenames.
4. Select **Submit assessment**.
5. Autosave is paused and drained; the frontend posts assessment JSON, the
   authoritative evidence metadata snapshot, and any new files to
   `POST /api/v1/assessments/drafts/{draftId}/submit`.
6. Backend locks and transitions that exact draft row, then calculates results.
7. Auto-evaluated model transitions to `COMPLETED`.
8. Non-auto-evaluated model transitions to `PENDING_REVIEW`.
9. User returns to `/dashboard` with status feedback.

**Errors**

- Backend checks required evidence for answered visible questions.
- Evidence file type/size is validated in browser and backend.
- A repeated or stale submission receives `409 Conflict` and cannot create
  another assessment row.
- Submission errors are shown as a generic review message.

**Authorization and validation**

- Backend independently rejects missing required visible answers and required
  evidence, including for direct API callers.

## 13. Review a pending assessment

**Status:** Implemented with limitations  
**Actor:** CURATOR or ADMIN

**Preconditions**

- Assessment status is `PENDING_REVIEW`.

**Steps**

1. Open `/evaluate`.
2. Select a pending assessment.
3. Review preliminary dimension/overall results.
4. Review each answered open-answer or evidence-based question.
5. Inspect evidence metadata and download files.
6. For each answered Open Answer question, select a maturity level from 1 to the model's maximum level.
7. Optionally add evaluator insight.
8. Submit evaluation.
9. Backend preserves each response and initial score, normalizes Open Answer maturity scores to 0–1, applies manual overrides, recalculates results, and marks the assessment `COMPLETED`.

If no eligible questions exist, the UI uses the completion endpoint without manual scores.

**Limitations**

- Several labels and progress bars assume a five-level scale.
- Initial automated scores and original qualitative responses remain available after manual review.
- No second reviewer, approval chain, conflict resolution, or review audit is implemented.

## 14. Export/import an advisory agent report

**Status:** Implemented as a manual auxiliary flow  
**Actor:** CURATOR or ADMIN

**Steps**

1. From pending assessment review, export assessment context as JSON.
2. Process it outside the platform.
3. Import a JSON report that matches the expected schema and assessment ID.
4. Review warnings, inconsistencies, and next steps.
5. Imported content pre-fills evaluator insight.
6. Curator still assigns all scores and explicitly submits.

**Postconditions**

- Imported agent content exists only in current browser state until included in evaluator insight.

**Not implemented**

- Direct API call to an assessment-analysis agent.
- Server persistence of the imported report as its own entity.
- Agent-controlled scoring or submission.

## 15. View results

**Status:** Implemented  
**Actor:** Assessment owner, CURATOR, or ADMIN

**Preconditions**

- Assessment is completed.

**Steps**

1. Open a completed row in `/dashboard` or `/assessments/all`.
2. Results page fetches assessment, evidence metadata, and model.
3. View overall maturity, overall score, evaluator insight, and dimension results.
4. View/download evidence.

**Permissions**

- USER can view own assessment.
- CURATOR/ADMIN can view any assessment.

**Limitations**

- No comparison over time, benchmark, recommendation engine, practice/module result breakdown, or interactive chart.
- Pending assessments are intentionally not linked to results from the user's list.

## 16. Export results

**Status:** Implemented  
**Actor:** Assessment owner, CURATOR, or ADMIN

**Steps**

1. Open completed results.
2. Choose Download.
3. Select XLSX or PDF.
4. Client generates and downloads the report.

**Export content**

- Owner export: overview and dimension results.
- Cross-user curator/admin export: detailed mode with assessed email, model, practice structure, question-level responses, evidence summaries, and evaluator insight.

**Not implemented**

- CSV result export.
- Persisted report records.
- Server-generated report or email delivery.

## 17. Delete an assessment

**Status:** Implemented  
**Actor:** Owner, CURATOR, or ADMIN

**Steps**

1. Open results or pending review.
2. Confirm deletion.
3. Backend deletes the assessment.

**Postconditions**

- Related dimension results and evidence metadata cascade through JPA.

**Inferred limitation**

- Stored evidence files may remain on disk because bulk assessment deletion does not explicitly invoke file deletion.

## 18. Manage users

**Status:** Partially implemented in UI; broader API exists  
**Actor:** ADMIN

**Implemented UI**

- approve/reject pending users;
- filter approved users by role;
- change role;
- delete another user.

**Backend-only capabilities**

- create an approved user;
- change email;
- change password;
- filter user list by role and approval status query parameters.

**Deletion behavior**

- Self-deletion is blocked.
- The user's assessments are deleted before the user record.

## 19. Manage administrative settings

**Status:** Not implemented

There is no UI for:

- password policy;
- JWT expiry;
- CORS;
- evidence file limits/types;
- assistant endpoint/credentials;
- application branding;
- email notifications;
- feature flags;
- audit logs.

These are source or environment configuration.
