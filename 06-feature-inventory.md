# Feature Inventory

**Implementation snapshot:** 25 July 2026

Status terms: **Implemented**, **Partial**, **Deprecated/legacy**, **Not implemented**, and **Uncertain**.

## Authentication and access

| Feature | Description | Role | Status | Relevant files/components | Dependencies | Known issues or uncertainties |
|---|---|---|---|---|---|---|
| Self-registration | Creates a pending USER with name and organization | Public | Implemented | `AuthenticationController`, `RegisterForm.tsx` | PostgreSQL, BCrypt | Minimal backend field/password validation |
| Approval-gated access | Pending users cannot authenticate until approved | ADMIN/USER | Implemented | `User.isEnabled`, `AdminController`, `admin/page.tsx` | Spring Security | Only PENDING/APPROVED states |
| Login | Email/password authentication | All approved users | Implemented | `LoginForm.tsx`, `AuthenticationController` | JWT, BCrypt | Generic error for most failures |
| Access token | 30-minute JWT bearer token by default | All users | Implemented | `JwtUtils`, `JwtAuthFilter` | Hardcoded signing material | Secret must be externalized |
| Refresh token rotation | Database token is revoked and replaced | All users | Implemented | `RefreshTokenService`, `axios.ts` | PostgreSQL | Logout does not revoke server tokens |
| Current user context | Loads ID, email, role, approval status | All users | Implemented | `UserController`, `AuthContext.tsx` | `/user/me` | Name/organization omitted from response population |
| Role hierarchy | ADMIN inherits CURATOR and USER; CURATOR inherits USER | All users | Implemented | `User.getAuthorities`, `RoleUtils` | Spring method security | Hierarchy duplicated in frontend |
| Route-level UI protection | Hides/redirects role-restricted screens | All users | Partial | `AppNavigationMenu`, route pages | `AuthContext` | Model routes/actions are not consistently guarded |
| Access-denied handling | Structured authorization error | All users | Partial | `SecurityConfig`, `GlobalExceptionHandler`, `axios.ts` | HTTP status handling | Backend emits 401 while pages often expect 403 |
| Password reset/email verification/MFA | Account recovery and stronger authentication | All users | Not implemented | — | — | Required for broader production use |

## Domain management

| Feature | Description | Role | Status | Relevant files/components | Dependencies | Known issues or uncertainties |
|---|---|---|---|---|---|---|
| List domains | Includes model count and active-model flag | Public/API; curator UI | Implemented | `DomainController`, `DomainService`, `domains/page.tsx` | Model aggregate query | Public-read intent should be confirmed |
| Create domain | Unique name and optional description | CURATOR, ADMIN | Implemented | `CreateDomainModal`, `DomainService` | Domain repository | Case-sensitive uniqueness depends on database collation |
| Delete domain | Deletes only domains with no models | CURATOR, ADMIN | Implemented | `DeleteConfirmModal`, `DomainService` | Model repository | No rename/edit domain flow |
| Domain edit | Change name/description | CURATOR, ADMIN | Not implemented | — | — | Delete/recreate is the only UI alternative |

## Model management

| Feature | Description | Role | Status | Relevant files/components | Dependencies | Known issues or uncertainties |
|---|---|---|---|---|---|---|
| Model catalog | Groups versions, searches, filters, sorts, card/row views | CURATOR, ADMIN intended | Implemented | `maturity-models/page.tsx`, `catalog.ts` | Public model/domain APIs | USER can manually access route |
| Model detail | Displays version, hierarchy, question metadata, dependencies | CURATOR, ADMIN intended; API public | Implemented | `[id]/page.tsx` | Model API | Mutation controls shown without role check |
| Manual model creation | Four-step editor | CURATOR, ADMIN | Implemented | `MaturityModelEditorPage`, editor steps | Domain required | No frontend automated tests |
| Model browser draft | Debounced local editor persistence and restore | CURATOR, ADMIN | Implemented | `useEditorDraft.ts` | `localStorage` | Local-only; no cross-device recovery |
| Unsaved-navigation guard | Warns for unload, links, cancel, replacement import | CURATOR, ADMIN | Implemented | `useUnsavedNavigationGuard.ts` | Browser confirm | Programmatic navigation paths may bypass link guard |
| Excel import | Parses supported XLSX workbook into editor | CURATOR, ADMIN | Implemented | `MaturityModelExcelService`, `useMaturityModelEditor` | Apache POI | Template URL includes deployment-specific path in one component |
| Excel export | Exports model to six-sheet XLSX workbook | Public API; curator UI | Implemented | `export.xlsx`, detail page | Apache POI | Existing YAML guide is obsolete |
| YAML import | Create model from YAML | — | Not implemented | — | — | Claimed by old docs only |
| CSV import | Create model from CSV | — | Not implemented as endpoint/UI | `CsvParsingService` is internal row parser | — | Class name is legacy/misleading |
| Version creation | Editing always creates next inactive version | CURATOR, ADMIN | Implemented | `updateMaturityModel`, editor save | `baseModelId`, `version` | No version notes/change summary |
| Version history | Switch between lineage versions | Public API; curator UI | Implemented | `/versions`, detail page | Model lineage | No diff view |
| Activation | Activates the selected version and deactivates any active version in the same lineage; other model lineages in the domain are unchanged | CURATOR, ADMIN | Implemented | `activateMaturityModel` | Model lineage | Database uniqueness permits one active version per lineage |
| Deactivation | Leaves that model lineage without an active version | CURATOR, ADMIN | Implemented | `deactivateMaturityModel` | Model lineage | The domain becomes unavailable only if it has no other active model lineage |
| Model deletion | Deletes version if unused by assessments | CURATOR, ADMIN | Implemented | `deleteMaturityModel` | Assessment lookup | Confirmation uses native browser confirm |
| Model duplicate | Copy into a new lineage | — | Not implemented | — | — | Versioning is not duplication |
| Model archive/retire | Non-deletable historical state | — | Not implemented | — | — | Inactive is the only non-active state |

## Model structure and validation

| Feature | Description | Role | Status | Relevant files/components | Dependencies | Known issues or uncertainties |
|---|---|---|---|---|---|---|
| Custom maturity scale | 2–12 ordered named levels for dimension/overall results | CURATOR, ADMIN | Implemented in editor/backend | `ScaleStep`, `validateMaturityModelLevels` | — | — |
| Hierarchy editing | Dimension → module → practice → question | CURATOR, ADMIN | Implemented | editor structure components | DnD kit | Large models may impose cognitive load |
| Reordering | Move buttons and drag-and-drop for hierarchy/questions | CURATOR, ADMIN | Partial | editor mutations, `QuestionReorderList` | DnD kit | Dimension/module/question order has explicit sort fields; practice order relies on list/insertion order and should be verified after reload |
| Stable public codes | Codes for all model items; locked on version edit | CURATOR, ADMIN | Implemented | `CodeField`, `MaturityModelService` | V5/V6 migrations | Uniqueness is parent-scoped |
| Question dependencies | Same-practice boolean parent, no cycles | CURATOR, ADMIN | Implemented | editor validation, service validation | Stable codes/self-FK | Only “parent Yes” condition is supported |
| Required questions | Marks respondent answer as mandatory and rejects incomplete final snapshots | CURATOR, ADMIN | Implemented | `Question.required`, assessment validation | Questionnaire completion logic | Hidden dependent questions are excluded |
| Required evidence | Requires a file when visible question is answered | CURATOR, ADMIN | Implemented | `Question.requiresEvidence` | Evidence upload | Evidence is not required if optional question is unanswered |
| Boolean questions | Yes/No normalized by curator-selected correct answer | All | Implemented | editor, question card, scoring service | — | — |
| Scale (`likert`) questions | Independent point count, endpoint tags, direction, normalized 0–1 | All | Implemented | editor fields, question card, scoring | — | Internal type remains `likert` for compatibility |
| Multiple-choice questions | Labels map to normalized scores from 0 to 1 | All | Implemented | editor options, scoring | — | Respondents see labels only; duplicate scores are allowed |
| Numeric questions | Bounded integer normalized linearly to 0–1 | All | Implemented | bound editor, scoring | Integer bounds and direction | Fractional and out-of-range responses are rejected |
| Percentage questions | Bounded integer normalized linearly to 0–1 | All | Implemented | bound editor, scoring | Integer bounds and direction | Bounds are curator-configurable |
| Open-answer questions | Free text scored by evaluator on model levels, then normalized 0–1 | All | Implemented | question card, review, scoring | Manual model expected | Curator configuration remains unchanged |
| Legacy question types | `boolean_justification`, `evidence` | — | Deprecated/removed | migrations/old docs | Legacy data | Current model validation rejects them |
| Module weight | Editable module aggregation factor | CURATOR, ADMIN | Partial | model/editor/entity | — | Not used in scoring |
| Practice and question weights | Multiplicative effective weight | CURATOR, ADMIN | Implemented | model/editor/scoring | — | No explanation in respondent/results UI |

## Assessment execution

| Feature | Description | Role | Status | Relevant files/components | Dependencies | Known issues or uncertainties |
|---|---|---|---|---|---|---|
| Domain selection | Shows domains with at least one active model and allows any active lineage to be selected | USER+ | Implemented | assessment setup | Domain/model APIs | Multiple model lineages in one domain may be active; each lineage has at most one active version |
| Eager draft creation | Start atomically returns or creates the exact-version draft before questionnaire navigation | USER+ | Implemented | assessment setup, draft ensure endpoint | PostgreSQL unique draft index | An abandoned start remains as a visible 0% draft |
| Assessment target/scope | Select organization/team/project/period | USER+ | Not implemented | — | — | Domain is the only scope choice |
| Instructions | Explains question types, evidence, dependencies, navigation | USER+ | Implemented | `IntroInstructionsStep` | — | Text describes intended behavior; scale caveat omitted |
| Structure preview | Shows dimensions/modules/practices/question counts | USER+ | Implemented | assessment setup | Selected model details | Large model can create a long preview |
| Practice navigation | Hierarchical jump navigation and linear controls | USER+ | Implemented | `AssessmentNavigationMenu`, `AssessmentStep` | Model hierarchy | Completion terminology is dense |
| Conditional questions | Disables and prunes dependents unless parent Yes | USER+ | Implemented | `assessmentFlowUtils` | Valid dependency | No other conditional operators |
| Clear answer | Removes answer, justification, and dependent data | USER+ | Implemented | `AssessmentQuestionCard` | — | Tooltip discoverability on touch should be tested |
| Completion tracking | Required-complete and fully-answered states | USER+ | Implemented | navigation utilities | Question flags/evidence map | Uses visual states that need accessibility review |
| Review before submission | Displays all answers and filenames | USER+ | Implemented | assessment `ReviewStep` | Client state | No direct “edit this answer” link from row |
| Submit auto model | Produces completed results immediately | USER+ | Implemented | assessment controller/service | Scoring | Exact draft and required-answer validation apply |
| Submit manual model | Produces pending-review assessment | USER+ | Implemented | assessment controller/service | Curator review | Preliminary results already exist |

## Response and draft handling

| Feature | Description | Role | Status | Relevant files/components | Dependencies | Known issues or uncertainties |
|---|---|---|---|---|---|---|
| Assessment autosave | One-second debounced, single-flight save of authoritative responses and evidence | USER+ | Implemented | assessment save coordinator and flow | Exact-draft multipart endpoint | Concurrent tabs are last-writer-wins |
| Save-state indicator | Navbar live region shows `Saving…`, `All changes saved`, or `Changes not saved · Retry` | USER+ | Implemented | both assessment headers | Autosave coordinator | Offline recovery should be usability-tested |
| Continue Later | Flushes pending autosave before returning to the assessment hub | USER+ | Implemented | assessment page | Autosave coordinator | Failed changes prevent a false saved state |
| One draft per exact model version | Reuses the same user/model-version draft | USER+ | Implemented | repository + partial unique index | Database index | Ensure endpoint serializes concurrent starts |
| Resume draft | Restores exact model version, responses, and evidence | USER+ | Implemented | assessment page | Model and evidence files must still exist | — |
| Start over | Atomically clears responses and evidence while retaining the draft row and ID | USER+ | Implemented | draft prompt, reset endpoint | Transaction-aware file cleanup | Inactive-version drafts remain unchanged |
| Draft-only routing | Questionnaire and nested routes require `draftId`; old `modelId` links redirect to setup | USER+ | Implemented | assessment route helpers | Existing draft | No fresh-model execution branch |
| Exact-draft submission | Locks and transitions the owned draft ID with an authoritative evidence snapshot | USER+ | Implemented | assessment controller/flow | Draft submit endpoint | Repeated or stale submissions return 409 without creating a row |
| Normalized answer records | One entity per answer | — | Not implemented | — | — | Responses are JSON text |
| N/A/skipped state | Explicit answer disposition | — | Not implemented | — | — | Disabled dependency is presentation-only N/A |
| Answer audit/history | Record revisions and timestamps | — | Not implemented | — | — | Only assessment updated timestamp |

## Evidence handling

| Feature | Description | Role | Status | Relevant files/components | Dependencies | Known issues or uncertainties |
|---|---|---|---|---|---|---|
| File evidence selection | Browser validation and selected-file display | USER+ | Implemented | `EvidenceUpload` | Browser file API | MIME detection depends on browser-supplied type |
| File evidence storage | Local file storage with metadata | Owner | Implemented | `FileStorageService`, `EvidenceService` | Writable filesystem | No external/object storage |
| Secure-link evidence | Respondent UI validates and stores HTTPS URLs | USER+ | Implemented | `EvidenceUpload`, `EvidenceService` | URL validation | Non-HTTPS links are rejected |
| Evidence descriptions | Optional editable metadata for file or link evidence | USER+ | Implemented | `EvidenceUpload`, `EvidenceService` | — | Saved with the authoritative evidence snapshot |
| Evidence in drafts | Autosaves up to five files/HTTPS links per question across resume | USER+ | Implemented | assessment evidence editor, autosave coordinator, evidence workflow service | PostgreSQL + file storage | 50 MB/file and 250 MB/new uploads per request |
| Evidence reconciliation key | Echoes transient `clientKey` after save so new files are not uploaded twice | USER+ | Implemented | evidence request/response DTOs | Save response reconciliation | Key is not persisted |
| Evidence list | Display evidence on results/review | Owner/curator intended | Partial | evidence endpoints and pages | Evidence metadata | List endpoint lacks authorization check |
| Evidence download | Owner or curator/admin downloads files | USER+ | Implemented | `downloadEvidence` | File exists | Always responds octet-stream |
| Evidence delete | Owner deletes individual item | Owner only | Implemented API | `deleteEvidence` | File storage | No current post-submission delete UI |
| Cleanup on assessment deletion | Remove physical files after successful assessment deletion | Owner/curator/admin | Implemented | evidence workflow service | File storage | Cleanup failures are logged for operational follow-up |
| Evidence review decision | Accept/reject/comment/status | — | Not implemented | — | — | Curator only assigns question score |

## Scoring and results

| Feature | Description | Role | Status | Relevant files/components | Dependencies | Known issues or uncertainties |
|---|---|---|---|---|---|---|
| Question score conversion | Converts configured response types to normalized or legacy score domains | System | Implemented | `AssessmentService` | Model metadata | Invalid values outside request validation are excluded |
| Dimension aggregation | Question×practice weighted average | System | Implemented | `calculateDimensionResults` | Valid scored responses | Module weight ignored |
| Overall aggregation | Mean of dimension averages | System | Implemented | `createAssessment`, `evaluateAssessment` | Dimension results | Missing dimensions excluded |
| Percentage normalization | Maps 1–N to 0–100 | System | Implemented | `MaturityScoringService` | N > 1 | — |
| Level mapping | Equal-width percentage bands | System | Implemented | `MaturityScoringService` | Configured level names | Thresholds are not model-configurable |
| Automatic result | Completes auto-evaluated model | System | Implemented | lifecycle service | — | Open-answer compatibility relies partly on frontend validation |
| Preliminary manual result | Calculates result before curator scoring | System | Implemented | lifecycle service | — | May be misleading on review screen |
| Curator manual scoring | Scores open/evidence questions and recalculates | CURATOR, ADMIN | Implemented | evaluate page/service | Pending assessment | Original response overwritten |
| Evaluator insight | Optional text shown in final results/export | CURATOR, ADMIN | Implemented | evaluate/results | — | No structured recommendations |
| Results screen | Overall and dimension result display | Owner/curator | Implemented | `ResultsContent` | Model/evidence APIs | No module/practice breakdown |
| Historical comparison | Compare assessments over time | — | Not implemented | — | — | Lists only |
| Benchmarking | Compare users/organizations | — | Not implemented | — | — | — |

## Reporting and exporting

| Feature | Description | Role | Status | Relevant files/components | Dependencies | Known issues or uncertainties |
|---|---|---|---|---|---|---|
| Result XLSX | Client-generated workbook | Owner/curator | Implemented | `downloadResultsAsXLSX` | `xlsx-js-style` | Curator gets detail only for another user's assessment |
| Result PDF | Client-generated report | Owner/curator | Implemented | `downloadResultsAsPDF` | jsPDF/autotable | Large detailed exports need manual pagination review |
| Result CSV | CSV download | — | Not implemented | — | — | Old docs claim it |
| Model XLSX | Server-generated model workbook | Public/API; curator UI | Implemented | `MaturityModelExcelService` | Apache POI | — |
| Persisted report | Stored report version/entity | — | Not implemented | — | — | Export is generated on demand |
| Email/share report | Deliver report externally | — | Not implemented | — | — | — |
| Agent context JSON | Download structured external-analysis context | CURATOR, ADMIN | Implemented | evaluate page | Browser download | Includes metadata, not file contents |
| Agent report JSON import | Parse advisory report and prefill insight | CURATOR, ADMIN | Implemented | evaluate page | External process | Not persisted separately |

## Administration

| Feature | Description | Role | Status | Relevant files/components | Dependencies | Known issues or uncertainties |
|---|---|---|---|---|---|---|
| Pending-user review | Approve or reject requests | ADMIN | Implemented | admin page/controller | — | No notification to applicant |
| User role edit | Change role of approved user | ADMIN | Implemented | admin page/controller | — | Admin can self-demote |
| User delete | Deletes user and assessments | ADMIN | Implemented | admin controller | Assessment cascade | Physical evidence cleanup uncertain |
| Admin user creation | Create approved account | ADMIN | Partial | Backend endpoint only | — | No UI |
| Edit email/password | Admin update fields | ADMIN | Partial | Backend endpoint only | — | No UI |
| System settings | Configure limits, security, branding, assistant | ADMIN | Not implemented | properties/env only | Deployment access | — |
| Audit log | Track administrative actions | — | Not implemented | — | — | — |

## Assistant features

| Feature | Description | Role | Status | Relevant files/components | Dependencies | Known issues or uncertainties |
|---|---|---|---|---|---|---|
| Dashboard chat | Initializes a dashboard-aware IAedu thread, then sends user messages | USER+ | Partial | `AgentChat`, `useAgentChat`, `AssistantService` | External IAedu API | External availability and credential/TLS configuration |
| Conversation thread | Browser-generated thread ID initialized and reused in modal session | USER+ | Implemented client behavior | `useAgentChat` | External API | Conversation is not stored locally/server-side |
| Assessment-aware chat | Opens contextual assistant help from an active question without sending the draft answer or evidence | Authenticated respondent | Implemented | `AssessmentStep`, `AgentChatModal`, `assessmentAssistantContext` | External IAedu API | Public campaign sessions do not expose the authenticated assistant endpoint |
| Integrated review agent | Server analyzes pending assessment | — | Not implemented | — | — | JSON exchange is manual |

## Accessibility and usability support

| Feature | Description | Role | Status | Relevant files/components | Dependencies | Known issues or uncertainties |
|---|---|---|---|---|---|---|
| Skip link | Keyboard jump to main content | All | Implemented | `layout.tsx` | — | Verify focus target in browsers |
| Semantic labels/ARIA | Labels, alerts, expanded states, menu/dialog annotations | All | Partial | shared components/pages | — | Coverage is inconsistent |
| Keyboard model-card activation | Enter/Space on card/row | Curator | Implemented | `ModelCard`, `ModelRow` | — | Uses `article role="link"` rather than native link |
| Keyboard question reordering | DnD keyboard sensor | Curator | Implemented | `QuestionReorderList` | DnD kit | Needs screen-reader verification |
| Reduced motion | Navigation drawer disables transitions for reduced motion | All | Partial | `AppNavigationMenu` | CSS media behavior | Other animations do not consistently honor preference |
| Modal keyboard behavior | Escape closes modal | All | Partial | `Modal` | — | No focus trap, initial focus, restore, or dialog semantics |
| Progress semantics | Visual completion bars | All | Partial | `ProgressBar`, assessment/evaluate | — | Missing `role="progressbar"` and value attributes |
| Live feedback | Some alerts/status roles and catalog live count | All | Partial | `Notice`, `AlertNotification` | — | Many async success/error messages lack live regions |
| Responsive layout | Tailwind responsive screens/tables | All | Implemented | frontend | — | Requires device/manual testing |
| Automated accessibility tests | Axe, Lighthouse CI, component tests | — | Not implemented | — | — | No frontend test suite found |

## Verification evidence

- Backend: 56 tests passed.
- Frontend: production build passed for 17 routes.
- No automated end-to-end, frontend unit, visual regression, or accessibility test configuration was found.
