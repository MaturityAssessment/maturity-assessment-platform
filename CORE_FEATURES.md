# Maturity Assessment Platform - Core Features

This document describes the platform's current capabilities and user workflows. Start with the [Project Overview](./PROJECT_OVERVIEW.md) for purpose, user roles, architecture, and repository structure. Request formats and endpoint permissions are documented in the [API guide](./backend/docs/api/README.md).

## Table of Contents

- [Accounts and Access](#accounts-and-access)
- [Domain Management](#domain-management)
- [Maturity Model Management](#maturity-model-management)
- [Questionnaire Configuration](#questionnaire-configuration)
- [Assessment Execution](#assessment-execution)
- [Evidence Management](#evidence-management)
- [Evaluation and Corrections](#evaluation-and-corrections)
- [Assessment Campaigns](#assessment-campaigns)
- [Results and Reporting](#results-and-reporting)
- [Assistant Integrations](#assistant-integrations)
- [Related Documentation](#related-documentation)

## Accounts and Access

- Self-registration creates an account pending administrator approval.
- Approved users sign in with email and password. JWT access tokens and rotating refresh tokens support authenticated sessions.
- Users conduct assessments and manage their own campaigns. Curators also manage models and review assessments; administrators additionally manage users and approvals.
- Campaign participants can answer through a personal invitation link without registering.

See [authentication and users](./backend/docs/api/reference/authentication-and-users.md) and [administration](./backend/docs/api/reference/administration.md).

## Domain Management

Curators and administrators organize maturity models into named domains with descriptions, icons, and colors. The platform shows model availability by domain and supports changes to domain appearance. A domain can be deleted only when it contains no models.

See the [domain reference](./backend/docs/api/reference/domains.md).

## Maturity Model Management

- Browse a catalog of models and inspect their structure and version history.
- Create models through the guided editor or API, with a domain, maturity scale, and questionnaire hierarchy.
- Import an Excel (`.xlsx`) workbook into the editor for review before saving, and export existing models as workbooks.
- Preserve unfinished editor work in a browser-local draft and receive unsaved-change prompts.
- Define between 2 and 12 named maturity levels and configure automatic or manual evaluation.
- Edit a model by creating a new inactive version, with a changelog and stable public codes for model items.
- Activate or deactivate versions. Activation replaces the active version within the same lineage; other model lineages in the domain remain available.
- Keep existing assessments and campaigns tied to their original version. Deletion is rejected when assessments use that version.

Typical workflow: select a domain, create or import the structure, review validation, save the model, then activate the version for use.

See the [model management workflow](./backend/docs/api/workflows/model-management.md).

## Questionnaire Configuration

Models use **Dimensions → Modules → Practices → Questions** to organize assessment content.

| Question type | Respondent input |
| --- | --- |
| Boolean | Yes or no. |
| Scale (`likert`) | A point on a configured scale with endpoint labels. |
| Multiple choice | One of the configured answer options. |
| Numeric | An integer within configured bounds. |
| Percentage | An integer percentage within configured bounds. |
| Open answer | Free text for evaluator review. |
| Evidence | Supporting evidence for evaluator review. |

Curators configure required answers, evidence requirements, and applicable scoring settings, including answer direction, bounds, option scores, and weights. Questions can depend on a boolean parent in the same practice; dependent questions become applicable when the parent answer is Yes. Validation checks dependencies and public codes.

See the [model reference](./backend/docs/api/reference/maturity-models.md) for the editor contract and validation rules.

## Assessment Execution

1. Select an active model version and start or resume its saved draft.
2. Read the instructions and navigate the questionnaire by dimension, module, and practice.
3. Enter answers and attach evidence. Completion indicators reflect required content and question applicability.
4. Autosave preserves answers and evidence; save-state feedback shows progress or a retry option. Continue Later saves pending changes before leaving.
5. Review the answers and evidence before submitting.
6. An automatic model produces completed results; a manual model enters the review queue.

Individual assessments reuse one draft per user and exact model version. Start Over clears a draft's answers and evidence while retaining its ID. Submission transitions the same assessment record, and duplicate submission is rejected.

| Status | Meaning |
| --- | --- |
| `DRAFT` | Respondent is preparing answers and evidence. |
| `PENDING_REVIEW` | Submission awaits evaluator decisions. |
| `CHANGES_REQUESTED` | Respondent must address reviewer feedback. |
| `COMPLETED` | Evaluation is finished and results are available. |

See the [assessment workflow](./backend/docs/api/workflows/assessments.md).

## Evidence Management

Respondents can attach files or HTTPS links to questions and add descriptions. Evidence is saved with the assessment so it can be restored when resuming a draft and inspected during review.

- Up to five evidence items per question.
- File uploads are limited to 50 MB per file and 250 MB of new uploads per request.
- Required evidence is checked for applicable answered questions during submission.
- File contents use configured filesystem storage; assessment data stores their metadata.
- Campaign respondents access files through invitation-scoped download endpoints.

See the [evidence reference](./backend/docs/api/reference/evidence.md) for upload, retention, and access rules.

## Evaluation and Corrections

Curators and administrators review manual submissions, inspect answers and evidence, and save question-level decisions:

| Decision | Use |
| --- | --- |
| `ACCEPTED` | Accept the submitted content, supplying a score where required. |
| `ADJUSTED` | Adjust the evaluation with the required score and explanation. |
| `FLAGGED` | Identify content requiring respondent correction and provide a reviewer note. |

Review progress can be saved before the evaluation is finished. Evaluators can add an overall insight, send flagged content back to the respondent, or finish once all required reviews and scores are complete. Finishing recalculates the results.

A returned assessment keeps its ID. The respondent reads the feedback, corrects flagged content while preserving accepted answers, and resubmits it for review. Campaign respondents follow the same correction cycle through their invitation before the campaign deadline.

See [manual review](./backend/docs/api/workflows/assessments.md#review-a-manual-assessment) and [respondent corrections](./backend/docs/api/workflows/assessments.md#correct-a-returned-assessment).

## Assessment Campaigns

Any authenticated user can create a campaign using an active model version, a campaign name, a future deadline, and participant email addresses. Management is restricted to the campaign creator.

- Participants receive individual invitation access and do not need platform accounts.
- Initial invitation emails are queued when mail delivery is configured and enabled.
- Organizers can generate replacement invitation tokens; replacement generation does not itself send email and invalidates the previous token.
- Participants save and submit responses against the campaign's selected version.
- Organizers monitor participant progress and aggregate results. Submission counts include assessments awaiting review; evaluated counts distinguish finished evaluations.
- Curators and administrators review campaign submissions through the assessment review workflow.

Expired or revoked invitations cannot access the response session. Campaign deletion is allowed only before any participant assessment exists; opening an invitation creates a draft.

See the [campaign workflow](./backend/docs/api/workflows/campaigns.md).

## Results and Reporting

Completed assessments present overall maturity and dimension results, with charts and supporting answer information. Users can return to their assessment history, and campaign organizers can view aggregates from completed evaluations.

Assessment reports can be exported as **PDF** or **Excel (`.xlsx`)**, including results and answer summaries. Model workbook export is a separate capability for exchanging model definitions.

Scores depend on the selected model's question settings and evaluation mode. Manual assessments require evaluator review before their results are final.

See the [assessment API reference](./backend/docs/api/reference/assessments.md) and [campaign results reference](./backend/docs/api/reference/campaigns.md).

## Assistant Integrations

The platform provides optional assistance that depends on backend configuration and the availability of the configured services:

- **Contextual chat:** authenticated users can ask the IAedu assistant for help from the dashboard or an assessment question. Public campaign sessions do not expose the authenticated assistant endpoint.
- **Evaluation suggestions:** curators and administrators can request an agent-generated evaluation draft for a pending assessment. Suggestions do not save review decisions or finish an assessment; evaluators apply their decisions through the review workflow.

See the [assistant reference](./backend/docs/api/reference/assistant.md) and [agent evaluation endpoint](./backend/docs/api/reference/assessments.md#post-apiv1assessmentsidagent-evaluationdraft).

## Related Documentation

- [Project Overview](./PROJECT_OVERVIEW.md) — purpose, users, and technical structure.
- [Getting Started](./GETTING_STARTED.md) — setup and optional service configuration.
- [API Documentation](./backend/docs/api/README.md) — contracts, permissions, and integration examples.
- [Architecture](./ARCHITECTURE.md) — implementation structure and technical design.
- [Database Schema](./DATABASE_SCHEMA.md) — persisted entities and relationships.
