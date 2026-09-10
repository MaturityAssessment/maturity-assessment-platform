import type { TourPlacement } from "@/components/guided-tour/guidedTourGeometry";

export const ASSESSMENT_TOUR_VERSION = 1;

export const ASSESSMENT_TOUR_KEYS = {
  dashboard: "assessment-dashboard",
  module: "assessment-module",
  questions: "assessment-questions",
} as const;

export type AssessmentTourView = keyof typeof ASSESSMENT_TOUR_KEYS;

export const ASSESSMENT_TOUR_IDENTITIES = {
  dashboard: {
    key: ASSESSMENT_TOUR_KEYS.dashboard,
    version: ASSESSMENT_TOUR_VERSION,
  },
  module: {
    key: ASSESSMENT_TOUR_KEYS.module,
    version: ASSESSMENT_TOUR_VERSION,
  },
  questions: {
    key: ASSESSMENT_TOUR_KEYS.questions,
    version: ASSESSMENT_TOUR_VERSION,
  },
} as const;

export const ASSESSMENT_TOUR_TARGETS = {
  dashboard: {
    dimensions: "assessment-dashboard-dimensions",
    progress: "assessment-dashboard-progress",
    autosave: "assessment-dashboard-autosave",
    journey: "assessment-dashboard-journey",
    leave: "assessment-dashboard-leave",
  },
  module: {
    overview: "assessment-module-overview",
    path: "assessment-module-path",
    navigation: "assessment-navigation",
  },
  questions: {
    question: "assessment-question-card",
    requirements: "assessment-question-requirements",
    actions: "assessment-question-actions",
    guidance: "assessment-question-guidance",
  },
} as const;

export interface AssessmentTourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  placement: TourPlacement;
}

export interface AssessmentDashboardTourOptions {
  isCampaign: boolean;
  completed?: boolean;
  changesRequested?: boolean;
  savingOnLeave?: boolean;
  showAutosave?: boolean;
  showJourney?: boolean;
}

export function buildAssessmentDashboardTourSteps({
  isCampaign,
  completed = false,
  changesRequested = false,
  savingOnLeave = true,
  showAutosave = true,
  showJourney = true,
}: AssessmentDashboardTourOptions): AssessmentTourStep[] {
  const steps: AssessmentTourStep[] = [
    {
      id: "dimensions",
      target: ASSESSMENT_TOUR_TARGETS.dashboard.dimensions,
      title: "Work through each dimension",
      description:
        "Dimensions organize the assessment into its main areas. Open one to continue its modules, practices, and questions, and return here to track what remains.",
      placement: "right",
    },
    {
      id: "progress",
      target: ASSESSMENT_TOUR_TARGETS.dashboard.progress,
      title: "See your overall progress",
      description:
        "This side panel summarizes answered items, remaining work, and any feedback that needs attention across the assessment.",
      placement: "left",
    },
  ];

  if (showAutosave) {
    steps.push({
      id: "autosave",
      target: ASSESSMENT_TOUR_TARGETS.dashboard.autosave,
      title: "Your work saves automatically",
      description:
        "Watch this indicator to confirm that changes are saved. If saving fails, it will show an error and let you retry.",
      placement: "bottom",
    });
  }

  if (showJourney) {
    steps.push({
      id: "journey",
      target: ASSESSMENT_TOUR_TARGETS.dashboard.journey,
      title: "Follow the assessment journey",
      description:
        "Once every required answer and required item of evidence is complete, Review becomes available so you can check your responses before submitting.",
      placement: "top",
    });
  }

  steps.push({
    id: "leave",
    target: ASSESSMENT_TOUR_TARGETS.dashboard.leave,
    title: isCampaign
      ? completed
        ? "You can safely leave"
        : "Leave when your work is saved"
      : completed || changesRequested
        ? "Return to your assessments"
        : "Continue later",
    description: isCampaign
      ? completed
        ? "This evaluation is complete, so you can safely close this tab. Use your campaign invitation link if you need to return to the results."
        : "Wait until the save indicator says all changes are saved, then you can safely close this tab. Use your campaign invitation link to return."
      : completed
        ? "Choose Back to assessments to return to your assessment list. This completed evaluation has no unsaved answers."
        : changesRequested
          ? "Choose Back to assessments when you are finished. The platform saves your latest updates before returning to your assessment list."
          : savingOnLeave
            ? "Choose Continue Later when you want to leave. The platform finishes saving your latest changes before returning you to your assessments."
            : "Choose Continue Later to return to your assessments. This submitted assessment has no unsaved answers.",
    placement: "bottom",
  });

  return steps;
}

export const ASSESSMENT_MODULE_TOUR_STEPS = [
  {
    id: "module-overview",
    target: ASSESSMENT_TOUR_TARGETS.module.overview,
    title: "Understand this module",
    description:
      "The module overview introduces the topic and summarizes its practices, questions, and current progress before you begin.",
    placement: "left",
  },
  {
    id: "assessment-path",
    target: ASSESSMENT_TOUR_TARGETS.module.path,
    title: "Know where you are",
    description:
      "This path shows the assessment, dimension, and module you are viewing. Use its links to move back up the assessment structure.",
    placement: "bottom",
  },
  {
    id: "navigation",
    target: ASSESSMENT_TOUR_TARGETS.module.navigation,
    title: "Move between modules and practices",
    description:
      "Each dimension contains modules. Open a module to see its practices; each practice is a focused set of questions, with progress shown as you work.",
    placement: "right",
  },
] as const satisfies readonly AssessmentTourStep[];

export interface AssessmentQuestionTourCandidate {
  /** False when the card will not be rendered, for example when its question has no ID. */
  rendered?: boolean;
  disabled: boolean;
  required: boolean;
  requiresEvidence: boolean;
  hasGuidance: boolean;
  canClear: boolean;
}

export interface AssessmentQuestionTourTargetIndexes {
  question: number | null;
  requirements: number | null;
  actions: number | null;
  guidance: number | null;
}

export function selectAssessmentQuestionTourTargetIndexes(
  candidates: readonly AssessmentQuestionTourCandidate[]
): AssessmentQuestionTourTargetIndexes {
  const rendered = candidates
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => candidate.rendered !== false);
  const enabled = rendered.filter(({ candidate }) => !candidate.disabled);
  const primary = enabled[0]?.index ?? rendered[0]?.index ?? null;

  if (primary === null) {
    return {
      question: null,
      requirements: null,
      actions: null,
      guidance: null,
    };
  }

  const findIndex = (
    entries: typeof rendered,
    predicate: (candidate: AssessmentQuestionTourCandidate) => boolean
  ) => entries.find(({ candidate }) => predicate(candidate))?.index;

  const requirements =
    findIndex(
      enabled,
      (candidate) => candidate.required && candidate.requiresEvidence
    ) ??
    findIndex(enabled, (candidate) => candidate.required) ??
    findIndex(enabled, (candidate) => candidate.requiresEvidence) ??
    primary;
  const actions =
    findIndex(enabled, (candidate) => candidate.canClear) ?? primary;
  const guidance =
    findIndex(enabled, (candidate) => candidate.hasGuidance) ??
    findIndex(rendered, (candidate) => candidate.hasGuidance) ??
    primary;

  return {
    question: primary,
    requirements,
    actions,
    guidance,
  };
}

export interface AssessmentQuestionTourOptions {
  isCampaign: boolean;
  assistantEnabled?: boolean;
}

export function buildAssessmentQuestionTourSteps({
  isCampaign,
  assistantEnabled = !isCampaign,
}: AssessmentQuestionTourOptions): readonly AssessmentTourStep[] {
  const canUseAssistant = assistantEnabled && !isCampaign;

  return [
    {
      id: "question",
      target: ASSESSMENT_TOUR_TARGETS.questions.question,
      title: "Answer one item at a time",
      description:
        "Each card explains what is being assessed and provides the answer controls for that question.",
      placement: "left",
    },
    {
      id: "requirements",
      target: ASSESSMENT_TOUR_TARGETS.questions.requirements,
      title: "Check what the item requires",
      description:
        "Items marked Required must be completed before review. Some items also require supporting evidence; when they do, an evidence area appears with the question.",
      placement: "right",
    },
    {
      id: "actions",
      target: ASSESSMENT_TOUR_TARGETS.questions.actions,
      title: canUseAssistant ? "Clear an answer or ask for help" : "Clear an answer",
      description: canUseAssistant
        ? "Ask the assistant when you need help understanding an item. After you add an answer or evidence, the reset control lets you clear it and start again."
        : "After you add an answer or evidence, the reset control appears here so you can clear it and start again.",
      placement: "left",
    },
    {
      id: "guidance",
      target: ASSESSMENT_TOUR_TARGETS.questions.guidance,
      title: "Look for question guidance",
      description:
        "When guidance is configured for an item, hover over its guidance icon or focus the icon with your keyboard to read it.",
      placement: "left",
    },
  ];
}

export interface AssessmentQuestionTourModel {
  steps: readonly AssessmentTourStep[];
  targetIndexes: AssessmentQuestionTourTargetIndexes;
}

export function buildAssessmentQuestionTour(
  candidates: readonly AssessmentQuestionTourCandidate[],
  options: AssessmentQuestionTourOptions
): AssessmentQuestionTourModel {
  const targetIndexes = selectAssessmentQuestionTourTargetIndexes(candidates);

  return {
    targetIndexes,
    steps:
      targetIndexes.question === null
        ? []
        : buildAssessmentQuestionTourSteps(options),
  };
}

export interface AssessmentTourInvitationContent {
  title: string;
  description: string;
}

export interface AssessmentTourInvitationContentOptions {
  completed?: boolean;
  changesRequested?: boolean;
  assistantEnabled?: boolean;
}

export function getAssessmentTourInvitationContent(
  view: AssessmentTourView,
  {
    completed = false,
    changesRequested = false,
    assistantEnabled = true,
  }: AssessmentTourInvitationContentOptions = {}
): AssessmentTourInvitationContent {
  if (view === "module") {
    return {
      title: "Want a quick tour of this module?",
      description:
        "See how the module overview, assessment path, practices, and question navigation fit together.",
    };
  }

  if (view === "questions") {
    return {
      title: "Want a quick tour of these questions?",
      description: assistantEnabled
        ? "See how answers, required items, evidence, guidance, and assistant help work."
        : "See how answers, required items, evidence, clearing responses, and guidance work.",
    };
  }

  if (completed) {
    return {
      title: "Want a quick tour of this assessment?",
      description:
        "See how to explore its dimensions, understand the final progress, and return to your assessments.",
    };
  }

  if (changesRequested) {
    return {
      title: "Want a quick tour of this assessment?",
      description:
        "See how to find requested updates, follow progress, confirm autosave, and return when you are finished.",
    };
  }

  return {
    title: "Want a quick tour of this assessment?",
    description:
      "See how dimensions, progress, autosave, review, and submitting work.",
  };
}

export type AssessmentTourViewer =
  | {
      kind: "authenticated";
      enabled: boolean;
      completedTours: Readonly<Record<string, number>>;
      dismissedPrompts: Readonly<Record<string, number>>;
    }
  | { kind: "campaign" }
  | null;

export interface AssessmentTourInvitationInput {
  view: AssessmentTourView | null;
  viewer: AssessmentTourViewer;
  loading: boolean;
  error?: string | null;
  viewReady: boolean;
  tourAvailable: boolean;
  obstructionOpen: boolean;
  alreadyOffered: boolean;
}

export function shouldOfferAssessmentTour({
  view,
  viewer,
  loading,
  error,
  viewReady,
  tourAvailable,
  obstructionOpen,
  alreadyOffered,
}: AssessmentTourInvitationInput) {
  if (
    !view ||
    !viewer ||
    loading ||
    Boolean(error) ||
    !viewReady ||
    !tourAvailable ||
    obstructionOpen ||
    alreadyOffered
  ) {
    return false;
  }

  if (viewer.kind === "campaign") return true;

  const identity = ASSESSMENT_TOUR_IDENTITIES[view];
  return (
    viewer.enabled &&
    (viewer.completedTours[identity.key] ?? 0) < identity.version &&
    (viewer.dismissedPrompts[identity.key] ?? 0) < identity.version
  );
}
