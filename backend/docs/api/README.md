# Backend API documentation

Start here to use the Maturity Assessment Platform HTTP API. The reference
covers the application controller endpoints under `/api/v1`. Local base URL:
`http://localhost:8080/api/v1`. Paths below already include `/api/v1`.

## Start here

- [Getting started](getting-started.md): authenticate and make your first request.
- [Authentication and permissions](authentication.md): accounts, bearer tokens,
  roles, ownership, and campaign invitations.
- [Conventions](conventions.md): responses, errors, identifiers, dates, uploads,
  and current implementation quirks.
- [Maintaining this documentation](maintaining.md): where and how to update the
  guide when an endpoint changes, with an endpoint template and review checklist.

## Workflows

| Task | Guide |
|---|---|
| Save, submit, review, and correct responses | [Assessments](workflows/assessments.md) |
| Invite participants and collect campaign responses | [Campaigns](workflows/campaigns.md) |
| Import, create, version, and activate a model | [Model management](workflows/model-management.md) |

Backend installation/configuration lives in the [backend README](../../README.md).
These pages describe the current code, including compatibility operations and
error-format exceptions. All documentation is maintained as Markdown; no extra
runtime dependency or documentation service is required.

## Endpoint index

Each operation links directly to its request, response, and permission details.
The collection draft-save operation supports both JSON and multipart bodies;
these are one method/path with two controller mappings.

### Authentication and users

| Method | Path and reference |
|---|---|
| `POST` | [`/api/v1/auth/register`](reference/authentication-and-users.md#post-apiv1authregister) |
| `POST` | [`/api/v1/auth/login`](reference/authentication-and-users.md#post-apiv1authlogin) |
| `POST` | [`/api/v1/auth/refresh`](reference/authentication-and-users.md#post-apiv1authrefresh) |
| `GET` | [`/api/v1/user/me`](reference/authentication-and-users.md#get-apiv1userme) |
| `PUT` | [`/api/v1/user/me/help-tours/{tourKey}/complete`](reference/authentication-and-users.md#put-apiv1usermehelp-tourstourkeycomplete) |
| `PUT` | [`/api/v1/user/me/help-tours/{tourKey}/dismiss-prompt`](reference/authentication-and-users.md#put-apiv1usermehelp-tourstourkeydismiss-prompt) |

### Administration

| Method | Path and reference |
|---|---|
| `GET` | [`/api/v1/admin/users`](reference/administration.md#get-apiv1adminusers) |
| `POST` | [`/api/v1/admin/users`](reference/administration.md#post-apiv1adminusers) |
| `PUT` | [`/api/v1/admin/users/{id}`](reference/administration.md#put-apiv1adminusersid) |
| `DELETE` | [`/api/v1/admin/users/{id}`](reference/administration.md#delete-apiv1adminusersid) |
| `PATCH` | [`/api/v1/admin/users/{id}/approve`](reference/administration.md#patch-apiv1adminusersidapprove) |
| `PATCH` | [`/api/v1/admin/users/{id}/reject`](reference/administration.md#patch-apiv1adminusersidreject) |

### Domains

| Method | Path and reference |
|---|---|
| `GET` | [`/api/v1/domain`](reference/domains.md#get-apiv1domain) |
| `GET` | [`/api/v1/domain/with-models`](reference/domains.md#get-apiv1domainwith-models) |
| `GET` | [`/api/v1/domain/{id}`](reference/domains.md#get-apiv1domainid) |
| `POST` | [`/api/v1/domain`](reference/domains.md#post-apiv1domain) |
| `PATCH` | [`/api/v1/domain/{id}/appearance`](reference/domains.md#patch-apiv1domainidappearance) |
| `DELETE` | [`/api/v1/domain/{id}`](reference/domains.md#delete-apiv1domainid) |

### Maturity models

| Method | Path and reference |
|---|---|
| `GET` | [`/api/v1/maturity-model`](reference/maturity-models.md#get-apiv1maturity-model) |
| `GET` | [`/api/v1/maturity-model/{id}`](reference/maturity-models.md#get-apiv1maturity-modelid) |
| `GET` | [`/api/v1/maturity-model/{id}/versions`](reference/maturity-models.md#get-apiv1maturity-modelidversions) |
| `GET` | [`/api/v1/maturity-model/{id}/export.xlsx`](reference/maturity-models.md#get-apiv1maturity-modelidexportxlsx) |
| `GET` | [`/api/v1/maturity-model/active`](reference/maturity-models.md#get-apiv1maturity-modelactive) |
| `POST` | [`/api/v1/maturity-model`](reference/maturity-models.md#post-apiv1maturity-model) |
| `GET` | [`/api/v1/maturity-model/{id}/editor`](reference/maturity-models.md#get-apiv1maturity-modelideditor) |
| `POST` | [`/api/v1/maturity-model/editor`](reference/maturity-models.md#post-apiv1maturity-modeleditor) |
| `POST` | [`/api/v1/maturity-model/{id}/versions/editor`](reference/maturity-models.md#post-apiv1maturity-modelidversionseditor) |
| `POST` | [`/api/v1/maturity-model/editor/parse-upload`](reference/maturity-models.md#post-apiv1maturity-modeleditorparse-upload) |
| `DELETE` | [`/api/v1/maturity-model/{id}`](reference/maturity-models.md#delete-apiv1maturity-modelid) |
| `PUT` | [`/api/v1/maturity-model/{id}/activate`](reference/maturity-models.md#put-apiv1maturity-modelidactivate) |
| `PUT` | [`/api/v1/maturity-model/{id}/deactivate`](reference/maturity-models.md#put-apiv1maturity-modeliddeactivate) |
| `PUT` | [`/api/v1/maturity-model/{id}`](reference/maturity-models.md#put-apiv1maturity-modelid) |

### Assessments

| Method | Path and reference |
|---|---|
| `PUT` | [`/api/v1/assessments/drafts/by-model/{maturityModelId}`](reference/assessments.md#put-apiv1assessmentsdraftsby-modelmaturitymodelid) |
| `PUT` | [`/api/v1/assessments/drafts/{draftId}`](reference/assessments.md#put-apiv1assessmentsdraftsdraftid) |
| `POST` | [`/api/v1/assessments/drafts/{draftId}/submit`](reference/assessments.md#post-apiv1assessmentsdraftsdraftidsubmit) |
| `PUT` | [`/api/v1/assessments/drafts/{draftId}/reset`](reference/assessments.md#put-apiv1assessmentsdraftsdraftidreset) |
| `POST` | [`/api/v1/assessments/drafts`](reference/assessments.md#post-apiv1assessmentsdrafts) |
| `POST` | [`/api/v1/assessments`](reference/assessments.md#post-apiv1assessments) |
| `GET` | [`/api/v1/assessments`](reference/assessments.md#get-apiv1assessments) |
| `GET` | [`/api/v1/assessments/drafts`](reference/assessments.md#get-apiv1assessmentsdrafts) |
| `GET` | [`/api/v1/assessments/drafts/by-model/{maturityModelId}`](reference/assessments.md#get-apiv1assessmentsdraftsby-modelmaturitymodelid) |
| `GET` | [`/api/v1/assessments/drafts/by-model-lineage/{maturityModelId}`](reference/assessments.md#get-apiv1assessmentsdraftsby-model-lineagematuritymodelid) |
| `GET` | [`/api/v1/assessments/all`](reference/assessments.md#get-apiv1assessmentsall) |
| `GET` | [`/api/v1/assessments/pending`](reference/assessments.md#get-apiv1assessmentspending) |
| `GET` | [`/api/v1/assessments/{id}`](reference/assessments.md#get-apiv1assessmentsid) |
| `PUT` | [`/api/v1/assessments/{id}/evaluation/reviews`](reference/assessments.md#put-apiv1assessmentsidevaluationreviews) |
| `PUT` | [`/api/v1/assessments/{id}/evaluation/finish`](reference/assessments.md#put-apiv1assessmentsidevaluationfinish) |
| `PUT` | [`/api/v1/assessments/{id}/evaluation/send-back`](reference/assessments.md#put-apiv1assessmentsidevaluationsend-back) |
| `PUT` | [`/api/v1/assessments/{id}/evaluate`](reference/assessments.md#put-apiv1assessmentsidevaluate) |
| `PUT` | [`/api/v1/assessments/{id}/complete`](reference/assessments.md#put-apiv1assessmentsidcomplete) |
| `POST` | [`/api/v1/assessments/{id}/agent-evaluation/draft`](reference/assessments.md#post-apiv1assessmentsidagent-evaluationdraft) |
| `GET` | [`/api/v1/assessments/{id}/open-answers`](reference/assessments.md#get-apiv1assessmentsidopen-answers) |
| `DELETE` | [`/api/v1/assessments/{id}`](reference/assessments.md#delete-apiv1assessmentsid) |

### Campaign management

| Method | Path and reference |
|---|---|
| `GET` | [`/api/v1/campaigns`](reference/campaigns.md#get-apiv1campaigns) |
| `POST` | [`/api/v1/campaigns`](reference/campaigns.md#post-apiv1campaigns) |
| `GET` | [`/api/v1/campaigns/{id}`](reference/campaigns.md#get-apiv1campaignsid) |
| `GET` | [`/api/v1/campaigns/{id}/results`](reference/campaigns.md#get-apiv1campaignsidresults) |
| `DELETE` | [`/api/v1/campaigns/{id}`](reference/campaigns.md#delete-apiv1campaignsid) |
| `POST` | [`/api/v1/campaigns/{campaignId}/participants/{participantId}/invitation`](reference/campaigns.md#post-apiv1campaignscampaignidparticipantsparticipantidinvitation) |

### Campaign responses

| Method | Path and reference |
|---|---|
| `GET` | [`/api/v1/campaign-response`](reference/campaign-responses.md#get-apiv1campaign-response) |
| `PUT` | [`/api/v1/campaign-response`](reference/campaign-responses.md#put-apiv1campaign-response) |
| `POST` | [`/api/v1/campaign-response/submit`](reference/campaign-responses.md#post-apiv1campaign-responsesubmit) |
| `GET` | [`/api/v1/campaign-response/evidence/{evidenceId}/download`](reference/campaign-responses.md#get-apiv1campaign-responseevidenceevidenceiddownload) |

### Evidence

| Method | Path and reference |
|---|---|
| `GET` | [`/api/v1/evidence/assessment/{assessmentId}`](reference/evidence.md#get-apiv1evidenceassessmentassessmentid) |
| `GET` | [`/api/v1/evidence/assessment/{assessmentId}/question/{questionId}`](reference/evidence.md#get-apiv1evidenceassessmentassessmentidquestionquestionid) |
| `GET` | [`/api/v1/evidence/{evidenceId}/download`](reference/evidence.md#get-apiv1evidenceevidenceiddownload) |
| `DELETE` | [`/api/v1/evidence/{evidenceId}`](reference/evidence.md#delete-apiv1evidenceevidenceid) |

### Assistant

| Method | Path and reference |
|---|---|
| `POST` | [`/api/v1/assistant/chat`](reference/assistant.md#post-apiv1assistantchat) |

