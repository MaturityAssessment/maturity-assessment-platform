# Logo home navigation

Every navigation logo links to `/dashboard`, the existing sidebar home destination.
`LogoHomeLink` provides the shared link, “Go to home” accessible label and tooltip,
and keyboard focus styling. The two logo assets have no other UI consumers.

## Logo inventory

| Navigation component | Logo | Pages and states covered |
| --- | --- | --- |
| `SideNavbar` | `images/map-logo-big.png` | `/dashboard`, `/evaluate`, `/domains`, `/campaigns`, `/maturity-models`, `/maturity-models/[id]`, `/maturity-models/[id]/versions/[versionId]`, `/admin`, `/admin/users`, `/admin/assessments`; includes loading/error branches that render the sidebar. |
| `TopNavbar` | `images/map-logo-icon.png` | `/campaigns/[id]` including errors; `/assessment/setup` including errors; assessment module, practice, review, and fallback views in `AssessmentFlow`; model editor entry choice and load errors for `/maturity-models/new` and `/maturity-models/[id]/edit`. |
| `TopNavbarWithTabs` | `images/map-logo-icon.png` | Assessment overview/evaluation/review/results tabs in `AssessmentDashboard`; all model editor steps in `EditorChrome`. |

`/evaluate/[id]` redirects into the assessment flow, so it inherits the assessment
logo behavior. Storybook examples inherit the shared navigation changes.

## Other navigation and header components checked

These contain no separate logo: `DashboardHeader`, `ModelRepositoryHeader`,
`ModelVersionHeader`, the campaign detail section header/tabs, `AdminBreadcrumb`,
`AssessmentNavigationMenu`, `AssessmentModuleOverview`, `AssessmentStep`,
`AssessmentFeedbackReviewTab`, `EvaluationNavigation`, `ModelOutline`, `NavButtons`,
and `UserMenu`. Page-specific headings, model structure/overview headers, editor
item headers, and the editor footer also contain no separate logo.

The public landing page, login, registration, and password-change page have no
navigation logo. The PDF export's platform name is document branding.

## Page-specific behavior

- Model editor: the ordinary logo link passes through
  `useUnsavedNavigationGuard`. Dirty edits show the existing leave confirmation;
  cancelling stays in the editor, and confirming retains the browser draft.
- Assessments: both header variants receive `prepareToGoHome`. It waits for
  pending response/evidence and evaluation saves, as applicable, before navigating.
  Failed saves keep the current page and its existing save error. The destination
  is home for campaign and evaluation sessions too. Submission, review preparation,
  and save-and-leave operations block the action while in progress.
- The assessment link declares `data-navigation-guard="page"` so the evaluation
  document click guard defers to the page callback, which can save both responses
  and reviews. Ordinary links still use the evaluation guard.
- Repeated home clicks share one pending operation. Modified clicks retain native
  new-tab/window behavior, leaving the current page and its edits open.

## Verification

`tests/unit/components/navigation/logoHomeNavigation.test.mts` covers rendered
logos in all three shared components, accessible home links, save completion,
failed-save retry, duplicate clicks, native modified clicks, and editor leave
confirmation. `evaluationWorkflow.test.mts` covers failed-save protection for a
home link and delegation to page-managed saving.
