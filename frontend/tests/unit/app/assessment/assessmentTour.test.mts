import test from "node:test";
import assert from "node:assert/strict";
import {
  ASSESSMENT_MODULE_TOUR_STEPS,
  ASSESSMENT_TOUR_IDENTITIES,
  ASSESSMENT_TOUR_KEYS,
  ASSESSMENT_TOUR_TARGETS,
  ASSESSMENT_TOUR_VERSION,
  buildAssessmentDashboardTourSteps,
  buildAssessmentQuestionTour,
  buildAssessmentQuestionTourSteps,
  getAssessmentTourInvitationContent,
  selectAssessmentQuestionTourTargetIndexes,
  shouldOfferAssessmentTour,
  type AssessmentQuestionTourCandidate,
  type AssessmentTourInvitationInput,
} from "../../../../src/app/assessment/assessmentTour.ts";

test("defines stable versioned identities for the three assessment views", () => {
  assert.equal(ASSESSMENT_TOUR_VERSION, 1);
  assert.deepEqual(ASSESSMENT_TOUR_KEYS, {
    dashboard: "assessment-dashboard",
    module: "assessment-module",
    questions: "assessment-questions",
  });
  assert.deepEqual(ASSESSMENT_TOUR_IDENTITIES, {
    dashboard: { key: "assessment-dashboard", version: 1 },
    module: { key: "assessment-module", version: 1 },
    questions: { key: "assessment-questions", version: 1 },
  });
});

test("builds the complete five-step assessment dashboard tour", () => {
  const steps = buildAssessmentDashboardTourSteps({ isCampaign: false });

  assert.deepEqual(
    steps.map((step) => step.id),
    ["dimensions", "progress", "autosave", "journey", "leave"]
  );
  assert.deepEqual(
    steps.map((step) => step.target),
    Object.values(ASSESSMENT_TOUR_TARGETS.dashboard)
  );
  assert.match(steps[3].description, /required/i);
  assert.match(steps[3].description, /review/i);
  assert.match(steps[3].description, /submitting/i);
  assert.match(steps[4].description, /Continue Later/i);
  assertTourContent(steps);
});

test("omits dashboard tips whose controls are not rendered", () => {
  const steps = buildAssessmentDashboardTourSteps({
    isCampaign: false,
    showAutosave: false,
    showJourney: false,
  });

  assert.deepEqual(
    steps.map((step) => step.id),
    ["dimensions", "progress", "leave"]
  );
});

test("uses safe leave instructions for campaign respondents", () => {
  const leaveStep = buildAssessmentDashboardTourSteps({
    isCampaign: true,
  }).at(-1)!;

  assert.match(leaveStep.description, /all changes are saved/i);
  assert.match(leaveStep.description, /close this tab/i);
  assert.match(leaveStep.description, /invitation link/i);
  assert.doesNotMatch(leaveStep.description, /Continue Later/i);
});

test("matches leave guidance to completed and changes-requested dashboards", () => {
  const completedUserLeave = buildAssessmentDashboardTourSteps({
    isCampaign: false,
    completed: true,
    showAutosave: false,
    showJourney: false,
  }).at(-1)!;
  const changesRequestedLeave = buildAssessmentDashboardTourSteps({
    isCampaign: false,
    changesRequested: true,
    showJourney: false,
  }).at(-1)!;
  const completedCampaignLeave = buildAssessmentDashboardTourSteps({
    isCampaign: true,
    completed: true,
    showAutosave: false,
    showJourney: false,
  }).at(-1)!;
  const submittedUserLeave = buildAssessmentDashboardTourSteps({
    isCampaign: false,
    savingOnLeave: false,
    showAutosave: false,
  }).at(-1)!;

  assert.match(completedUserLeave.description, /Back to assessments/i);
  assert.doesNotMatch(completedUserLeave.description, /saving/i);
  assert.match(changesRequestedLeave.description, /Back to assessments/i);
  assert.match(changesRequestedLeave.description, /saves/i);
  assert.match(completedCampaignLeave.description, /complete/i);
  assert.match(completedCampaignLeave.description, /close this tab/i);
  assert.doesNotMatch(completedCampaignLeave.description, /save indicator/i);
  assert.match(submittedUserLeave.description, /Continue Later/i);
  assert.match(submittedUserLeave.description, /no unsaved answers/i);
});

test("defines the three-step module overview tour", () => {
  assert.deepEqual(
    ASSESSMENT_MODULE_TOUR_STEPS.map((step) => step.id),
    ["module-overview", "assessment-path", "navigation"]
  );
  assert.deepEqual(
    ASSESSMENT_MODULE_TOUR_STEPS.map((step) => step.target),
    [
      "assessment-module-overview",
      "assessment-module-path",
      "assessment-navigation",
    ]
  );
  assertTourContent(ASSESSMENT_MODULE_TOUR_STEPS);
});

test("selects visible enabled questions that best demonstrate each concept", () => {
  const candidates: AssessmentQuestionTourCandidate[] = [
    candidate({
      rendered: false,
      required: true,
      requiresEvidence: true,
      hasGuidance: true,
      canClear: true,
    }),
    candidate({ disabled: true, required: true, hasGuidance: true }),
    candidate(),
    candidate({ required: true, requiresEvidence: true, canClear: true }),
    candidate({ hasGuidance: true }),
  ];

  assert.deepEqual(selectAssessmentQuestionTourTargetIndexes(candidates), {
    question: 2,
    requirements: 3,
    actions: 3,
    guidance: 4,
  });
});

test("falls every question concept back to the primary card when needed", () => {
  assert.deepEqual(
    selectAssessmentQuestionTourTargetIndexes([candidate()]),
    {
      question: 0,
      requirements: 0,
      actions: 0,
      guidance: 0,
    }
  );

  assert.deepEqual(
    selectAssessmentQuestionTourTargetIndexes([
      candidate({ rendered: false }),
    ]),
    {
      question: null,
      requirements: null,
      actions: null,
      guidance: null,
    }
  );
});

test("does not target hidden requirement badges on disabled questions", () => {
  const candidates = [
    candidate(),
    candidate({ disabled: true, required: true, hasGuidance: true }),
  ];

  assert.deepEqual(selectAssessmentQuestionTourTargetIndexes(candidates), {
    question: 0,
    requirements: 0,
    actions: 0,
    guidance: 1,
  });
});

test("groups the question tour into four concise concepts", () => {
  const model = buildAssessmentQuestionTour(
    [candidate({ required: true, requiresEvidence: true, hasGuidance: true })],
    { isCampaign: false }
  );

  assert.deepEqual(
    model.steps.map((step) => step.id),
    ["question", "requirements", "actions", "guidance"]
  );
  assert.deepEqual(
    model.steps.map((step) => step.target),
    Object.values(ASSESSMENT_TOUR_TARGETS.questions)
  );
  assert.match(model.steps[1].description, /Required/i);
  assert.match(model.steps[1].description, /evidence/i);
  assert.match(model.steps[2].description, /assistant/i);
  assert.match(model.steps[2].description, /clear/i);
  assert.match(model.steps[3].description, /hover/i);
  assert.match(model.steps[3].description, /keyboard/i);
  assertTourContent(model.steps);
});

test("does not promise an assistant to campaign respondents", () => {
  const steps = buildAssessmentQuestionTourSteps({ isCampaign: true });
  const actions = steps.find((step) => step.id === "actions")!;

  assert.match(actions.description, /reset control/i);
  assert.match(actions.description, /clear/i);
  assert.doesNotMatch(actions.title, /assistant/i);
  assert.doesNotMatch(actions.description, /assistant/i);
});

test("does not expose a question tour without a rendered question", () => {
  const model = buildAssessmentQuestionTour(
    [candidate({ rendered: false })],
    { isCampaign: false }
  );

  assert.deepEqual(model.steps, []);
});

test("offers an authenticated invitation only before completion or dismissal", () => {
  const eligible = authenticatedEligibility();

  assert.equal(shouldOfferAssessmentTour(eligible), true);
  assert.equal(
    shouldOfferAssessmentTour({
      ...eligible,
      viewer: {
        kind: "authenticated",
        enabled: true,
        completedTours: { "assessment-dashboard": 1 },
        dismissedPrompts: {},
      },
    }),
    false
  );
  assert.equal(
    shouldOfferAssessmentTour({
      ...eligible,
      viewer: {
        kind: "authenticated",
        enabled: true,
        completedTours: { "assessment-dashboard": 0 },
        dismissedPrompts: {},
      },
    }),
    true
  );
  assert.equal(
    shouldOfferAssessmentTour({
      ...eligible,
      viewer: {
        kind: "authenticated",
        enabled: false,
        completedTours: {},
        dismissedPrompts: {},
      },
    }),
    false
  );
  assert.equal(
    shouldOfferAssessmentTour({
      ...eligible,
      viewer: {
        kind: "authenticated",
        enabled: true,
        completedTours: {},
        dismissedPrompts: { "assessment-dashboard": 1 },
      },
    }),
    false
  );
});

test("checks completion against the active assessment view only", () => {
  const eligible = authenticatedEligibility();

  assert.equal(
    shouldOfferAssessmentTour({
      ...eligible,
      view: "module",
      viewer: {
        kind: "authenticated",
        enabled: true,
        completedTours: { "assessment-dashboard": 1 },
        dismissedPrompts: {},
      },
    }),
    true
  );
  assert.equal(
    shouldOfferAssessmentTour({
      ...eligible,
      view: "module",
      viewer: {
        kind: "authenticated",
        enabled: true,
        completedTours: { "assessment-module": 1 },
        dismissedPrompts: {},
      },
    }),
    false
  );
});

test("campaign respondents remain eligible without persisted user state", () => {
  const eligible: AssessmentTourInvitationInput = {
    ...authenticatedEligibility(),
    viewer: { kind: "campaign" },
  };

  assert.equal(shouldOfferAssessmentTour(eligible), true);
});

test("blocks invitations until every shared readiness gate is clear", () => {
  const eligible = authenticatedEligibility();
  const blocked: AssessmentTourInvitationInput[] = [
    { ...eligible, view: null },
    { ...eligible, viewer: null },
    { ...eligible, loading: true },
    { ...eligible, error: "Assessment unavailable" },
    { ...eligible, viewReady: false },
    { ...eligible, tourAvailable: false },
    { ...eligible, obstructionOpen: true },
    { ...eligible, alreadyOffered: true },
  ];

  blocked.forEach((input) => {
    assert.equal(shouldOfferAssessmentTour(input), false);
  });
});

test("provides concise contextual invitation copy for each assessment view", () => {
  assert.match(
    getAssessmentTourInvitationContent("dashboard").description,
    /autosave/i
  );
  assert.match(
    getAssessmentTourInvitationContent("module").description,
    /practices/i
  );
  assert.match(
    getAssessmentTourInvitationContent("questions", {
      assistantEnabled: true,
    }).description,
    /assistant/i
  );
  assert.doesNotMatch(
    getAssessmentTourInvitationContent("questions", {
      assistantEnabled: false,
    }).description,
    /assistant/i
  );
  assert.match(
    getAssessmentTourInvitationContent("dashboard", {
      completed: true,
    }).description,
    /final progress/i
  );
});

function candidate(
  overrides: Partial<AssessmentQuestionTourCandidate> = {}
): AssessmentQuestionTourCandidate {
  return {
    rendered: true,
    disabled: false,
    required: false,
    requiresEvidence: false,
    hasGuidance: false,
    canClear: false,
    ...overrides,
  };
}

function authenticatedEligibility(): AssessmentTourInvitationInput {
  return {
    view: "dashboard",
    viewer: {
      kind: "authenticated",
      enabled: true,
      completedTours: {},
      dismissedPrompts: {},
    },
    loading: false,
    error: null,
    viewReady: true,
    tourAvailable: true,
    obstructionOpen: false,
    alreadyOffered: false,
  };
}

function assertTourContent(
  steps: readonly {
    id: string;
    target: string;
    title: string;
    description: string;
  }[]
) {
  assert.equal(new Set(steps.map((step) => step.id)).size, steps.length);
  assert.equal(new Set(steps.map((step) => step.target)).size, steps.length);
  steps.forEach((step) => {
    assert.ok(step.title.trim().length > 0);
    assert.ok(step.description.trim().length > 0);
  });
}
