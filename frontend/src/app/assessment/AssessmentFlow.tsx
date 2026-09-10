"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp } from "lucide-react";
import {
  AssessmentData,
  AssessmentEvidenceInputItem,
  AssessmentResponse,
  CampaignAssessmentSession,
  Dimension,
  MaturityModel,
  Module,
} from "@/api/types";
import apiClient from "@/api/axios";
import { ACCESS_TOKEN_STORAGE_KEY } from "@/config/authStorage";
import { TopNavbar } from "@/components";
import GuidedTour from "@/components/guided-tour/GuidedTour";
import TourInvitation from "@/components/guided-tour/TourInvitation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context";
import AssessmentDashboard from "./AssessmentDashboard";
import type { AssessmentDashboardTab } from "./AssessmentDashboard";
import AssessmentModuleOverview from "./AssessmentModuleOverview";
import AssessmentStep, { AssessmentPracticeStep } from "./AssessmentStep";
import {
  AssessmentNavigationModule,
  AssessmentNavigationPractice,
} from "./AssessmentNavigationMenu";
import ReviewStep from "./ReviewStep";
import {
  findDimensionEntryPractice,
  type AssessmentDimensionSummary,
} from "./assessmentDashboard";
import AssessmentSaveIndicator from "./AssessmentSaveIndicator";
import useAssessmentAutosave from "./useAssessmentAutosave";
import {
  collectQuestionResponses,
  hydrateQuestionResponses,
} from "./assessmentQuestionResponses";
import {
  getAssessmentReviewCounts,
  getPracticeReviewCounts,
  isEditableReviewStatus,
} from "./assessmentReviewFeedback";
import {
  getFieldName,
  getAssessmentPracticeProgress,
  isAnswered,
  isDependentQuestionDisabled,
  isEvidenceOnlyQuestion,
  isPracticeRequiredComplete,
  pruneDisabledQuestionData,
} from "./assessmentFlowUtils";
import {
  AssessmentEvidenceByField,
  buildEvidencePayload,
  hydrateEvidenceByField,
  removeEvidenceFields,
  validateEvidenceForSave,
} from "./assessmentEvidence";
import {
  AssessmentRouteContext,
  buildAssessmentModuleHref,
  buildAssessmentOverviewHref,
  buildAssessmentParentHref,
  buildAssessmentPracticeHref,
  buildPracticeSteps,
  getModuleKey,
  isAssessmentModulePath,
  isAssessmentPracticePath,
  readAssessmentRouteContext,
  replaceAssessmentPathContext,
  resolveAssessmentModuleLocation,
  resolveAssessmentPracticeLocation,
} from "./assessmentRoutes";
import {
  ASSESSMENT_MODULE_TOUR_STEPS,
  ASSESSMENT_TOUR_IDENTITIES,
  buildAssessmentDashboardTourSteps,
  buildAssessmentQuestionTour,
  getAssessmentTourInvitationContent,
  shouldOfferAssessmentTour,
  type AssessmentTourStep,
  type AssessmentTourView,
  type AssessmentTourViewer,
} from "./assessmentTour";

type ReviewOrigin = "dashboard" | "assessment";

type ActiveAssessmentTour = {
  view: AssessmentTourView;
  pathname: string;
  steps: readonly AssessmentTourStep[];
};

export default function AssessmentFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, completeHelpTour, dismissHelpTourPrompt } = useAuth();
  const [assessmentStep, setAssessmentStep] = useState<
    "intro" | "dashboard" | "review"
  >("intro");
  const [dashboardTab, setDashboardTab] =
    useState<AssessmentDashboardTab>("overview");
  const [reviewOrigin, setReviewOrigin] =
    useState<ReviewOrigin>("assessment");
  const [reviewReturnStep, setReviewReturnStep] =
    useState<AssessmentPracticeStep | null>(null);
  const [maturityModel, setMaturityModel] = useState<MaturityModel | null>(null);
  const [loadedAssessment, setLoadedAssessment] =
    useState<AssessmentResponse | null>(null);
  const [
    respondentUpdatedResponseKeys,
    setRespondentUpdatedResponseKeys,
  ] = useState<Set<string>>(new Set());
  const [routeContext, setRouteContext] =
    useState<AssessmentRouteContext | null>(null);
  const [formData, setFormData] = useState<AssessmentData>({});
  const [evidenceFiles, setEvidenceFiles] = useState<AssessmentEvidenceByField>(
    new Map()
  );
  const [isPreparingReview, setIsPreparingReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isSavingAndLeaving, setIsSavingAndLeaving] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [draftLoadError, setDraftLoadError] = useState<string | null>(null);
  const [changeRevision, setChangeRevision] = useState(0);
  const [evidenceRevision, setEvidenceRevision] = useState(0);
  const [activeTour, setActiveTour] =
    useState<ActiveAssessmentTour | null>(null);
  const [requestedTour, setRequestedTour] =
    useState<AssessmentTourView | null>(null);
  const [tourInvitationView, setTourInvitationView] =
    useState<AssessmentTourView | null>(null);
  const tourInvitationOfferedRef = useRef(new Set<AssessmentTourView>());

  const practiceSteps = useMemo(
    () => buildPracticeSteps(maturityModel),
    [maturityModel]
  );
  const changesRequested =
    loadedAssessment?.status === "CHANGES_REQUESTED";
  const campaignToken = routeContext?.campaignToken ?? null;
  const campaignPendingReview =
    Boolean(campaignToken) && loadedAssessment?.status === "PENDING_REVIEW";
  const completedAssessment =
    loadedAssessment?.status === "COMPLETED" ||
    Boolean(loadedAssessment?.isCompleted);
  const reviewCounts = useMemo(
    () =>
      getAssessmentReviewCounts(
        loadedAssessment?.questionEvaluations,
        respondentUpdatedResponseKeys
      ),
    [loadedAssessment?.questionEvaluations, respondentUpdatedResponseKeys]
  );
  const acceptedResponseKeys = useMemo(
    () =>
      new Set(
        Object.values(loadedAssessment?.questionEvaluations || {})
          .filter(
            (evaluation) => evaluation.validationStatus === "ACCEPTED"
          )
          .map((evaluation) => evaluation.responseKey)
      ),
    [loadedAssessment?.questionEvaluations]
  );

  const activePracticeLocation = useMemo(
    () =>
      maturityModel
        ? resolveAssessmentPracticeLocation(maturityModel, pathname)
        : null,
    [maturityModel, pathname]
  );
  const activePracticeStep = activePracticeLocation?.step ?? null;
  const activeModuleLocation = useMemo(
    () =>
      maturityModel
        ? resolveAssessmentModuleLocation(maturityModel, pathname)
        : null,
    [maturityModel, pathname]
  );
  const activeDimension =
    activePracticeStep?.dimension ?? activeModuleLocation?.dimension ?? null;
  const activeModule =
    activePracticeStep?.module ?? activeModuleLocation?.module ?? null;
  const activeDimensionIndex =
    activePracticeLocation?.dimensionIndex ??
    activeModuleLocation?.dimensionIndex ??
    -1;
  const activeModuleIndex =
    activePracticeLocation?.moduleIndex ??
    activeModuleLocation?.moduleIndex ??
    -1;
  const activeModuleKey =
    activeModule && activeDimensionIndex >= 0 && activeModuleIndex >= 0
      ? getModuleKey(
          activeDimensionIndex,
          activeModuleIndex,
          activeModule.code
        )
      : "";
  const modulePracticeSteps = useMemo(
    () =>
      activeDimension && activeModule
        ? practiceSteps.filter(
            (step) =>
              step.dimension === activeDimension &&
              step.module === activeModule
          )
        : [],
    [activeDimension, activeModule, practiceSteps]
  );
  const navigationModules = useMemo(
    () =>
      buildDimensionNavigationModules(
        activeDimension,
        activeDimensionIndex,
        practiceSteps,
        formData,
        evidenceFiles,
        loadedAssessment?.questionEvaluations,
        respondentUpdatedResponseKeys
      ),
    [
      activeDimension,
      activeDimensionIndex,
      evidenceFiles,
      formData,
      practiceSteps,
      loadedAssessment?.questionEvaluations,
      respondentUpdatedResponseKeys,
    ]
  );
  const nextModule =
    activeDimension && activeModuleIndex >= 0
      ? activeDimension.modules[activeModuleIndex + 1] ?? null
      : null;

  const isPracticeWorkspace =
    !isLoadingDraft &&
    isAssessmentPracticePath(pathname) &&
    Boolean(activePracticeStep);
  const isModuleWorkspace =
    !isLoadingDraft &&
    isAssessmentModulePath(pathname) &&
    Boolean(activeModuleLocation);
  const isAssessmentWorkspace = isPracticeWorkspace || isModuleWorkspace;
  const isDashboardWorkspace =
    pathname === "/assessment" &&
    assessmentStep === "dashboard" &&
    Boolean(maturityModel && loadedAssessment) &&
    !isLoadingDraft;
  const currentTourView: AssessmentTourView | null = isDashboardWorkspace
    ? "dashboard"
    : isPracticeWorkspace
      ? "questions"
      : isModuleWorkspace
        ? "module"
        : null;

  const allRequiredItemsComplete =
    practiceSteps.length > 0 &&
    practiceSteps.every((step) =>
      isPracticeRequiredComplete(step, formData, evidenceFiles)
    );
  const canReviewAssessment =
    allRequiredItemsComplete &&
    (!changesRequested || reviewCounts.outstandingFlaggedCount === 0);
  const assessmentAutosaveAvailable =
    loadedAssessment?.status === "DRAFT" ||
    loadedAssessment?.status === "CHANGES_REQUESTED";

  const dashboardTourSteps = useMemo(
    () =>
      buildAssessmentDashboardTourSteps({
        isCampaign: Boolean(campaignToken),
        completed: completedAssessment,
        changesRequested,
        savingOnLeave: assessmentAutosaveAvailable,
        showAutosave: assessmentAutosaveAvailable,
        showJourney: !changesRequested && !completedAssessment,
      }),
    [
      assessmentAutosaveAvailable,
      campaignToken,
      changesRequested,
      completedAssessment,
    ]
  );
  const questionTourModel = useMemo(() => {
    const questions = activePracticeStep?.practice.questions ?? [];
    const candidates = questions.map((question) => {
      if (!question.id || !activePracticeStep) {
        return {
          rendered: false,
          disabled: false,
          required: Boolean(question.required),
          requiresEvidence:
            Boolean(question.requiresEvidence) ||
            isEvidenceOnlyQuestion(question),
          hasGuidance: Boolean(question.help?.trim()),
          canClear: false,
        };
      }

      const fieldName = getFieldName(activePracticeStep, question);
      const disabled = isDependentQuestionDisabled(
        activePracticeStep,
        question,
        formData
      );
      const validationStatus =
        loadedAssessment?.questionEvaluations?.[fieldName]
          ?.validationStatus;
      const hasContent =
        isAnswered(formData[fieldName]) ||
        (evidenceFiles.get(fieldName)?.length ?? 0) > 0;

      return {
        rendered: true,
        disabled,
        required: Boolean(question.required),
        requiresEvidence:
          Boolean(question.requiresEvidence) ||
          isEvidenceOnlyQuestion(question),
        hasGuidance: Boolean(question.help?.trim()),
        canClear:
          hasContent &&
          !disabled &&
          validationStatus !== "ACCEPTED" &&
          validationStatus !== "ADJUSTED",
      };
    });

    return buildAssessmentQuestionTour(candidates, {
      isCampaign: Boolean(campaignToken),
      assistantEnabled: !campaignToken,
    });
  }, [
    activePracticeStep,
    campaignToken,
    evidenceFiles,
    formData,
    loadedAssessment?.questionEvaluations,
  ]);
  const tourViewer = useMemo<AssessmentTourViewer>(() => {
    if (campaignToken) return { kind: "campaign" };
    if (!user) return null;

    return {
      kind: "authenticated",
      enabled: user.helpBalloonsEnabled !== false,
      completedTours: user.completedHelpTours ?? {},
      dismissedPrompts: user.dismissedHelpTourPrompts ?? {},
    };
  }, [campaignToken, user]);

  const getTourSteps = useCallback(
    (view: AssessmentTourView): readonly AssessmentTourStep[] => {
      if (view === "dashboard") return dashboardTourSteps;
      if (view === "module") return ASSESSMENT_MODULE_TOUR_STEPS;
      return questionTourModel.steps;
    },
    [dashboardTourSteps, questionTourModel.steps]
  );
  const tourInvitationContent = tourInvitationView
    ? getAssessmentTourInvitationContent(tourInvitationView, {
        completed: completedAssessment,
        changesRequested,
        assistantEnabled: !campaignToken,
      })
    : null;

  const autosave = useAssessmentAutosave({
    enabled:
      !isLoadingDraft &&
      !draftLoadError &&
      !isSubmitting &&
      assessmentAutosaveAvailable &&
      Boolean(maturityModel && routeContext?.draftId),
    draftId: routeContext?.draftId ?? null,
    maturityModelId: maturityModel?.id ?? null,
    revision: changeRevision,
    evidenceRevision,
    formData,
    evidenceFiles,
    respondentUpdatedResponseKeys: Array.from(
      respondentUpdatedResponseKeys
    ),
    campaignToken,
    buildResponses: (currentFormData) =>
      collectQuestionResponses(practiceSteps, currentFormData),
    setEvidenceFiles,
  });

  useEffect(() => {
    const initialContext = readAssessmentRouteContext(
      window.location.search
    );
    if (!initialContext?.draftId && !initialContext?.campaignToken) {
      router.replace("/assessment/setup");
      return;
    }
    setRouteContext(initialContext);

    const loadInitialAssessment = async () => {
      setIsLoadingDraft(true);
      setDraftLoadError(null);

      try {
        const draft = initialContext.campaignToken
          ? (
              await apiClient.get<CampaignAssessmentSession>(
                "/api/v1/campaign-response",
                {
                  headers: {
                    "X-Campaign-Token": initialContext.campaignToken,
                  },
                }
              )
            ).data.assessment
          : (
              await apiClient.get<AssessmentResponse>(
                `/api/v1/assessments/${initialContext.draftId}`
              )
            ).data;

        setRouteContext({ ...initialContext, draftId: draft.id });

        if (
          (draft.status !== "DRAFT" &&
            draft.status !== "CHANGES_REQUESTED" &&
            draft.status !== "PENDING_REVIEW" &&
            draft.status !== "COMPLETED" &&
            !draft.isCompleted) ||
          !draft.maturityModelId
        ) {
          throw new Error(
            "The selected assessment is not available in the respondent workspace."
          );
        }

        const modelResponse = await apiClient.get<MaturityModel>(
          `/api/v1/maturity-model/${draft.maturityModelId}`
        );
        loadDraftIntoAssessment(draft, modelResponse.data);
      } catch (error) {
        console.error("Error loading initial assessment:", error);
        setDraftLoadError(
          initialContext.campaignToken
            ? getApiErrorMessage(
                error,
                "This campaign invitation is invalid or no longer available."
              )
            : "Could not load this draft. Please return to assessments and try again."
        );
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadInitialAssessment();
  }, []);

  useEffect(() => {
    if (isLoadingDraft || !maturityModel || pathname === "/assessment") return;

    if (completedAssessment) {
      router.replace(buildAssessmentOverviewHref(routeContext), {
        scroll: false,
      });
      return;
    }

    const resolvedWorkspaceLocation =
      activePracticeLocation ?? activeModuleLocation;
    const isWorkspacePath =
      isAssessmentPracticePath(pathname) || isAssessmentModulePath(pathname);

    if (!isWorkspacePath || !resolvedWorkspaceLocation) {
      router.replace(buildAssessmentOverviewHref(routeContext), {
        scroll: false,
      });
      return;
    }

    if (resolvedWorkspaceLocation.canonicalPath !== pathname) {
      router.replace(
        replaceAssessmentPathContext(
          resolvedWorkspaceLocation.canonicalPath,
          routeContext
        ),
        { scroll: false }
      );
    }
  }, [
    activeModuleLocation,
    activePracticeLocation,
    completedAssessment,
    isLoadingDraft,
    maturityModel,
    pathname,
    routeContext,
    router,
  ]);

  useEffect(() => {
    if (!maturityModel) return;

    const handleHistoryNavigation = () => {
      const nextPathname = window.location.pathname;
      const nextContext = readAssessmentRouteContext(
        window.location.search
      );
      if (
        (nextPathname === "/assessment" ||
          isAssessmentModulePath(nextPathname) ||
          isAssessmentPracticePath(nextPathname))
      ) {
        if (!nextContext) {
          window.location.replace("/assessment/setup");
          return;
        }
        if (
          !routeContext ||
          nextContext.draftId !== routeContext.draftId
        ) {
          window.location.reload();
          return;
        }

        const contextHref = replaceAssessmentPathContext(
          nextPathname,
          nextContext
        );
        if (`${nextPathname}${window.location.search}` !== contextHref) {
          router.replace(contextHref, { scroll: false });
        }
      }
    };

    window.addEventListener("popstate", handleHistoryNavigation);
    return () => window.removeEventListener("popstate", handleHistoryNavigation);
  }, [maturityModel, routeContext, router]);

  const markReviewedFieldsUpdated = (fields: ReadonlySet<string>) => {
    if (!changesRequested) return;

    setRespondentUpdatedResponseKeys((current) => {
      const next = new Set(current);
      fields.forEach((field) => {
        const evaluation =
          loadedAssessment?.questionEvaluations?.[field];
        if (isEditableReviewStatus(evaluation?.validationStatus)) {
          next.add(field);
        }
      });
      return next.size === current.size ? current : next;
    });
  };

  const handleInputChange = (field: string, value: string | number) => {
    if (acceptedResponseKeys.has(field)) return;

    const { formData: nextFormData, removedFields } = pruneDisabledQuestionData(
      practiceSteps,
      {
        ...formData,
        [field]: value,
      }
    );
    const removedAcceptedField = Array.from(removedFields).find((removed) =>
      acceptedResponseKeys.has(removed)
    );
    if (removedAcceptedField) {
      setReviewError(
        "This change would alter an item already accepted by the evaluator."
      );
      return;
    }

    if (
      hasPopulatedDependentFields(removedFields, formData, evidenceFiles) &&
      !window.confirm(
        dependencyRemovalConfirmation(removedFields, formData, evidenceFiles)
      )
    ) {
      return;
    }

    setReviewError(null);
    markReviewedFieldsUpdated(new Set([field, ...removedFields]));
    setFormData(nextFormData);
    setChangeRevision((current) => current + 1);
    if (removedFields.size > 0) {
      setEvidenceFiles((previousFiles) =>
        removeEvidenceFields(previousFiles, removedFields)
      );
      setEvidenceRevision((current) => current + 1);
    }
  };

  const handleEvidenceItemsChange = (
    field: string,
    items: AssessmentEvidenceInputItem[]
  ) => {
    if (acceptedResponseKeys.has(field)) return;
    setReviewError(null);
    markReviewedFieldsUpdated(new Set([field]));
    setChangeRevision((current) => current + 1);
    setEvidenceRevision((current) => current + 1);
    setEvidenceFiles((prev) => {
      const next = new Map(prev);
      if (items.length > 0) {
        next.set(field, items);
      } else {
        next.delete(field);
      }
      return next;
    });
  };

  const handleClearAnswer = (field: string) => {
    if (acceptedResponseKeys.has(field)) return;
    const next = { ...formData };
    delete next[field];
    delete next[`${field}_justification`];

    const { formData: nextFormData, removedFields } = pruneDisabledQuestionData(
      practiceSteps,
      next
    );
    const removedAcceptedField = Array.from(removedFields).find((removed) =>
      acceptedResponseKeys.has(removed)
    );
    if (removedAcceptedField) {
      setReviewError(
        "This change would alter an item already accepted by the evaluator."
      );
      return;
    }

    if (
      hasPopulatedDependentFields(removedFields, formData, evidenceFiles) &&
      !window.confirm(
        dependencyRemovalConfirmation(removedFields, formData, evidenceFiles)
      )
    ) {
      return;
    }

    setReviewError(null);
    removedFields.add(field);
    markReviewedFieldsUpdated(removedFields);

    setFormData(nextFormData);
    setChangeRevision((current) => current + 1);
    setEvidenceRevision((current) => current + 1);
    setEvidenceFiles((previousFiles) =>
      removeEvidenceFields(previousFiles, removedFields)
    );
  };

  const openPractice = (nextStep: AssessmentPracticeStep) => {
    if (nextStep.key === activePracticeStep?.key) return;

    setReviewError(null);
    router.push(buildAssessmentPracticeHref(nextStep, routeContext), {
      scroll: false,
    });
  };

  const openPracticeByKey = (practiceKey: string) => {
    const nextStep = modulePracticeSteps.find(
      (step) => step.key === practiceKey
    );
    if (nextStep) openPractice(nextStep);
  };

  const openModule = (dimension: Dimension, module: Module) => {
    setReviewError(null);
    router.push(
      buildAssessmentModuleHref(dimension, module, routeContext),
      { scroll: false }
    );
  };

  const openModuleByKey = (moduleKey: string) => {
    if (!activeDimension) return;

    const moduleIndex = activeDimension.modules.findIndex(
      (module, index) =>
        getModuleKey(activeDimensionIndex, index, module.code) === moduleKey
    );
    const maturityModule = activeDimension.modules[moduleIndex];
    if (maturityModule) openModule(activeDimension, maturityModule);
  };

  const openOverview = () => {
    setDashboardTab("overview");
    setAssessmentStep("dashboard");
    router.push(buildAssessmentOverviewHref(routeContext), { scroll: false });
  };

  const openDimension = (dimension: AssessmentDimensionSummary) => {
    if (completedAssessment) return;

    const returnedStep = changesRequested
      ? practiceSteps
          .filter((step) => step.dimension === dimension.dimension)
          .find(
            (step) =>
              getPracticeReviewCounts(
                step,
                loadedAssessment?.questionEvaluations,
                respondentUpdatedResponseKeys
              ).outstandingFlaggedCount > 0
          )
      : null;
    const nextStep =
      returnedStep ??
      findDimensionEntryPractice(
        dimension.dimension,
        practiceSteps,
        formData,
        evidenceFiles
      );

    if (!nextStep) return;

    openModule(nextStep.dimension, nextStep.module);
  };

  const loadDraftIntoAssessment = (
    draft: AssessmentResponse,
    model = maturityModel
  ) => {
    if (!model) return;

    setMaturityModel(model);
    setLoadedAssessment(draft);
    setRespondentUpdatedResponseKeys(
      new Set(
        Object.values(draft.questionEvaluations || {})
          .filter((evaluation) => evaluation.respondentUpdated)
          .map((evaluation) => evaluation.responseKey)
      )
    );
    setFormData(hydrateQuestionResponses(draft.questionEvaluations));
    const restoredEvidence = hydrateEvidenceByField(
      draft.evidence,
      buildPracticeSteps(model)
    );
    setEvidenceFiles(restoredEvidence);
    setDraftLoadError(null);
    setReviewError(null);
    setDashboardTab(
      draft.status === "COMPLETED" || draft.isCompleted
        ? "results"
        : "overview"
    );
    setAssessmentStep("dashboard");
  };

  const handleSaveAndLeave = async () => {
    if (isSavingAndLeaving || isPreparingReview) return;

    if (completedAssessment) {
      router.push(
        campaignToken
          ? buildAssessmentOverviewHref(routeContext)
          : "/dashboard"
      );
      return;
    }

    setIsSavingAndLeaving(true);
    try {
      const saved = await autosave.flush();
      if (saved && !campaignToken) {
        router.push("/dashboard");
      }
    } finally {
      setIsSavingAndLeaving(false);
    }
  };

  const saveDraftBeforeReview = async (origin: ReviewOrigin) => {
    if (
      !canReviewAssessment ||
      isSavingAndLeaving ||
      isPreparingReview
    ) {
      return;
    }

    setIsPreparingReview(true);

    try {
      const saved = await autosave.flush();
      if (!saved || !routeContext) return;
      setReviewOrigin(origin);
      setReviewReturnStep(origin === "assessment" ? activePracticeStep : null);
      setAssessmentStep("review");
      router.push(
        buildAssessmentOverviewHref(routeContext),
        { scroll: false }
      );
    } catch (error) {
      console.error("Error saving draft before review:", error);
      setReviewError("Could not save your draft before review. Please try again.");
    } finally {
      setIsPreparingReview(false);
    }
  };

  const handleBackFromReview = () => {
    setReviewError(null);
    if (reviewOrigin === "dashboard") {
      setDashboardTab("overview");
      setAssessmentStep("dashboard");
      router.push(buildAssessmentOverviewHref(routeContext), { scroll: false });
      return;
    }

    if (reviewReturnStep) {
      router.push(
        buildAssessmentPracticeHref(reviewReturnStep, routeContext),
        { scroll: false }
      );
      return;
    }

    openOverview();
  };

  const submitAssessment = async () => {
    if (!maturityModel || !routeContext) {
      setReviewError("No assessment draft found. Please reload and try again.");
      return;
    }

    setIsSubmitting(true);
    setReviewError(null);

    const saved = await autosave.flush();
    if (!saved) {
      setReviewError(
        autosave.error ||
          "Your latest changes could not be saved. Retry before submitting."
      );
      setIsSubmitting(false);
      return;
    }

    const latestEvidenceFiles = autosave.getEvidenceFiles();
    const evidenceValidationError =
      validateEvidenceForSave(latestEvidenceFiles);
    if (evidenceValidationError) {
      setReviewError(evidenceValidationError);
      setIsSubmitting(false);
      return;
    }

    try {
      const requestData = {
        maturityModelId: maturityModel.id,
        questionResponses: collectQuestionResponses(practiceSteps, formData),
        respondentUpdatedResponseKeys: Array.from(
          respondentUpdatedResponseKeys
        ),
      };

      const formDataToSend = new FormData();
      formDataToSend.append("assessment", JSON.stringify(requestData));

      const { metadata, uploads } =
        buildEvidencePayload(latestEvidenceFiles);
      formDataToSend.append("evidenceMetadata", JSON.stringify(metadata));
      uploads.forEach(({ itemKey, file }) => {
        formDataToSend.append("evidenceFile", file);
        formDataToSend.append("evidenceFileKey", itemKey);
      });

      const response = await apiClient.post<AssessmentResponse>(
        campaignToken
          ? "/api/v1/campaign-response/submit"
          : `/api/v1/assessments/drafts/${routeContext.draftId}/submit`,
        formDataToSend,
        {
          headers: campaignToken
            ? { "X-Campaign-Token": campaignToken }
            : getMultipartAuthHeaders(),
        }
      );

      const result = response.data;
      const submittedStatus =
        result.status === "COMPLETED" || result.isCompleted
          ? "completed"
          : "pending";

      if (campaignToken) {
        setLoadedAssessment(result);
        setDashboardTab(result.status === "COMPLETED" ? "results" : "overview");
        setAssessmentStep("dashboard");
        router.push(buildAssessmentOverviewHref(routeContext), { scroll: false });
      } else {
        router.push(
          `/dashboard?submitted=${submittedStatus}&assessmentId=${result.id}`
        );
      }
    } catch (error) {
      console.error("Error submitting assessment:", error);
      setReviewError(
        getApiErrorMessage(
          error,
          "Could not submit the assessment. Please try again."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const startAssessmentTour = useCallback((view: AssessmentTourView) => {
    tourInvitationOfferedRef.current.add(view);
    setTourInvitationView(null);
    if (view === "dashboard") setDashboardTab("overview");
    setRequestedTour(view);
  }, []);

  useEffect(() => {
    if (
      !currentTourView ||
      activeTour ||
      requestedTour ||
      tourInvitationView
    ) {
      return;
    }

    const steps = getTourSteps(currentTourView);
    const shouldOffer = shouldOfferAssessmentTour({
      view: currentTourView,
      viewer: tourViewer,
      loading: isLoadingDraft,
      error: draftLoadError,
      viewReady: Boolean(maturityModel && loadedAssessment),
      tourAvailable: steps.length > 0,
      obstructionOpen:
        campaignPendingReview ||
        isPreparingReview ||
        isSavingAndLeaving ||
        isSubmitting,
      alreadyOffered:
        tourInvitationOfferedRef.current.has(currentTourView),
    });

    if (shouldOffer) {
      tourInvitationOfferedRef.current.add(currentTourView);
      setTourInvitationView(currentTourView);
    }
  }, [
    activeTour,
    campaignPendingReview,
    currentTourView,
    draftLoadError,
    getTourSteps,
    isLoadingDraft,
    isPreparingReview,
    isSavingAndLeaving,
    isSubmitting,
    loadedAssessment,
    maturityModel,
    requestedTour,
    tourInvitationView,
    tourViewer,
  ]);

  useEffect(() => {
    if (!requestedTour || activeTour) return;
    if (currentTourView !== requestedTour) {
      setRequestedTour(null);
      return;
    }

    const steps = getTourSteps(requestedTour);
    if (steps.length === 0) {
      setRequestedTour(null);
      return;
    }

    let frame = 0;
    let attempts = 0;
    let cancelled = false;
    const openWhenTargetsAreReady = () => {
      if (cancelled) return;

      const targetsReady = steps.every((step) =>
        document.querySelector(`[data-help-tour~="${step.target}"]`)
      );
      if (!targetsReady && attempts < 30) {
        attempts += 1;
        frame = window.requestAnimationFrame(openWhenTargetsAreReady);
        return;
      }
      if (!targetsReady) {
        setRequestedTour(null);
        return;
      }

      setActiveTour({ view: requestedTour, pathname, steps });
      setRequestedTour((current) =>
        current === requestedTour ? null : current
      );
    };

    frame = window.requestAnimationFrame(openWhenTargetsAreReady);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [
    activeTour,
    currentTourView,
    getTourSteps,
    pathname,
    requestedTour,
  ]);

  useEffect(() => {
    if (
      activeTour &&
      (currentTourView !== activeTour.view ||
        pathname !== activeTour.pathname)
    ) {
      setActiveTour(null);
    }
  }, [activeTour, currentTourView, pathname]);

  useEffect(() => {
    if (
      tourInvitationView &&
      currentTourView !== tourInvitationView
    ) {
      setTourInvitationView(null);
    }
  }, [currentTourView, tourInvitationView]);

  const dismissAssessmentTourInvitation = useCallback(() => {
    const dismissedView = tourInvitationView;
    setTourInvitationView(null);

    if (!dismissedView || campaignToken) return;

    const identity = ASSESSMENT_TOUR_IDENTITIES[dismissedView];
    void dismissHelpTourPrompt(identity.key, identity.version).catch(
      (dismissalError) => {
        console.error(
          `Failed to save ${dismissedView} tour invitation preference:`,
          dismissalError
        );
      }
    );
  }, [campaignToken, dismissHelpTourPrompt, tourInvitationView]);

  const exitAssessmentTour = useCallback(() => {
    const finishedTour = activeTour;
    setActiveTour(null);

    if (!finishedTour || campaignToken) return;

    const identity = ASSESSMENT_TOUR_IDENTITIES[finishedTour.view];
    void completeHelpTour(identity.key, identity.version).catch(
      (completionError) => {
        console.error(
          `Failed to save ${finishedTour.view} assessment tour progress:`,
          completionError
        );
      }
    );
  }, [activeTour, campaignToken, completeHelpTour]);

  if (campaignPendingReview && maturityModel && !isLoadingDraft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-xl rounded-xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">
            Assessment submitted
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your responses for {maturityModel.name} were submitted successfully.
            You can safely close this page.
          </p>
        </div>
      </div>
    );
  }

  if (
    pathname === "/assessment" &&
    assessmentStep === "dashboard" &&
    maturityModel &&
    loadedAssessment &&
    !isLoadingDraft
  ) {
    return (
      <>
        <AssessmentDashboard
          model={maturityModel}
          practiceSteps={practiceSteps}
          formData={formData}
          evidenceFiles={evidenceFiles}
          activeTab={dashboardTab}
          isLeaving={isSavingAndLeaving}
          isPreparingReview={isPreparingReview}
          canReview={canReviewAssessment}
          error={reviewError}
          saveStatus={autosave.status}
          saveError={autosave.error}
          changesRequested={
            loadedAssessment?.status === "CHANGES_REQUESTED"
          }
          completed={completedAssessment}
          assessment={loadedAssessment}
          evaluatorInsight={loadedAssessment?.evaluatorInsight}
          questionEvaluations={loadedAssessment?.questionEvaluations}
          respondentUpdatedResponseKeys={respondentUpdatedResponseKeys}
          tourInvitation={
            tourInvitationView === "dashboard"
              ? tourInvitationContent
              : null
          }
          onStartTour={() => startAssessmentTour("dashboard")}
          onDismissTourInvitation={dismissAssessmentTourInvitation}
          onTabChange={setDashboardTab}
          onDimensionSelect={openDimension}
          onLeave={handleSaveAndLeave}
          showLeaveAction={!campaignToken}
          onReview={() => saveDraftBeforeReview("dashboard")}
          onInputChange={handleInputChange}
          onClearAnswer={handleClearAnswer}
          onEvidenceItemsChange={handleEvidenceItemsChange}
          onRetrySave={() => {
            void autosave.retry();
          }}
        />
        <GuidedTour
          open={
            activeTour?.view === "dashboard" &&
            activeTour.pathname === pathname
          }
          steps={activeTour?.steps ?? []}
          onExit={exitAssessmentTour}
          label="Assessment dashboard tour"
        />
      </>
    );
  }

  const assessmentBackHref =
    maturityModel
      ? buildAssessmentParentHref(maturityModel, pathname, routeContext) ??
        "/dashboard"
      : "/dashboard";
  const assessmentBackLabel = isPracticeWorkspace
    ? `Back to ${activePracticeStep?.module.name ?? "module"}`
    : isModuleWorkspace
      ? "Back to assessment overview"
      : "Back to dashboard";

  return (
    <div
      className={
        isAssessmentWorkspace
          ? "flex h-dvh flex-col overflow-hidden bg-gray-50"
          : "min-h-screen bg-gray-50"
      }
    >
      <TopNavbar
        title={maturityModel?.name || "Maturity Assessment Platform"}
        subtitle={
          assessmentStep === "intro"
            ? "Assess your organization's maturity across various domains and dimensions."
            : assessmentStep === "review"
              ? "Review your responses before submitting the assessment."
              : "Answer the questions to evaluate your organization's maturity level."
        }
        backButton={
          isSubmitting
            ? undefined
            : {
                href: assessmentBackHref,
                label: assessmentBackLabel,
              }
        }
        rightActions={
          !isLoadingDraft && maturityModel ? (
            <div className="flex items-center gap-2">
              <AssessmentSaveIndicator
                status={autosave.status}
                error={autosave.error}
                onRetry={() => {
                  void autosave.retry();
                }}
              />
              {(isModuleWorkspace || isPracticeWorkspace) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    startAssessmentTour(
                      isPracticeWorkspace ? "questions" : "module"
                    )
                  }
                  disabled={
                    isPracticeWorkspace &&
                    questionTourModel.steps.length === 0
                  }
                  title={
                    isPracticeWorkspace
                      ? "Show assessment questions tour"
                      : "Show assessment module tour"
                  }
                  aria-label={
                    isPracticeWorkspace
                      ? "Show assessment questions tour"
                      : "Show assessment module tour"
                  }
                  className="text-slate-600"
                >
                  <CircleHelp className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ) : null
        }
        showUserMenu={!campaignToken && assessmentStep === "intro"}
        showNavigationMenu={!campaignToken && assessmentStep === "intro"}
        sticky={
          isAssessmentPracticePath(pathname) ||
          isAssessmentModulePath(pathname)
        }
      />

      {tourInvitationView &&
        tourInvitationView !== "dashboard" &&
        tourInvitationContent && (
          <div className="mx-auto w-full max-w-[1440px] shrink-0 px-4 pt-4 sm:px-6 xl:px-8">
            <TourInvitation
              title={tourInvitationContent.title}
              description={tourInvitationContent.description}
              onAccept={() => startAssessmentTour(tourInvitationView)}
              onDismiss={dismissAssessmentTourInvitation}
              compact
            />
          </div>
        )}

      {isLoadingDraft && (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-700">
              Loading saved assessment...
            </p>
          </div>
        </div>
      )}

      {!isLoadingDraft && draftLoadError && assessmentStep === "intro" && (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
          <div className="rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">
              Assessment could not be opened
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-700">
              {draftLoadError}
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              {campaignToken ? (
                <Button type="button" onClick={() => window.location.reload()}>
                  Try again
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                  >
                    Back to dashboard
                  </Button>
                  <Button
                    type="button"
                    onClick={() => router.push("/assessment/setup")}
                  >
                    Choose a maturity model
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {!isLoadingDraft &&
        isAssessmentModulePath(pathname) &&
        activeModuleLocation &&
        activeDimension &&
        activeModule && (
          <div className="min-h-0 w-full flex-1 overflow-hidden px-4 pb-4 pt-4 sm:px-6 lg:px-6 lg:pb-5 lg:pt-5 xl:px-8">
            <AssessmentModuleOverview
              modelName={maturityModel?.name || "Assessment"}
              dimension={activeDimension}
              module={activeModule}
              moduleNumber={activeModuleIndex + 1}
              moduleCount={activeDimension.modules.length}
              navigationModules={navigationModules}
              activeModuleKey={activeModuleKey}
              onOverview={openOverview}
              onModuleSelect={openModuleByKey}
              onPracticeSelect={openPracticeByKey}
            />
          </div>
        )}

      {!isLoadingDraft &&
        isAssessmentPracticePath(pathname) &&
        activePracticeStep && (
          <div className="min-h-0 w-full flex-1 overflow-hidden px-4 pb-4 pt-4 sm:px-6 lg:px-6 lg:pb-5 lg:pt-5 xl:px-8">
            <AssessmentStep
              modelName={maturityModel?.name || "Assessment"}
              modelMaxLevel={Math.max(2, maturityModel?.levels?.length || 5)}
              dimensionName={activePracticeStep.dimension.name}
              navigationModules={navigationModules}
              activeModuleKey={activeModuleKey}
              practiceSteps={modulePracticeSteps}
              activePracticeKey={activePracticeStep.key}
              formData={formData}
              nextModuleName={nextModule?.name ?? null}
              onModuleSelect={openModuleByKey}
              onModuleOverview={() =>
                openModule(
                  activePracticeStep.dimension,
                  activePracticeStep.module
                )
              }
              onNextModule={
                nextModule && activeDimension
                  ? () => openModule(activeDimension, nextModule)
                  : null
              }
              onPracticeSelect={openPracticeByKey}
              onInputChange={handleInputChange}
              onClearAnswer={handleClearAnswer}
              onEvidenceItemsChange={handleEvidenceItemsChange}
              evidenceFiles={evidenceFiles}
              questionEvaluations={loadedAssessment?.questionEvaluations}
              respondentUpdatedResponseKeys={
                respondentUpdatedResponseKeys
              }
              outstandingFlaggedCount={
                reviewCounts.outstandingFlaggedCount
              }
              assistantEnabled={!campaignToken}
              questionTourTargetIndexes={
                questionTourModel.targetIndexes
              }
              onOverview={openOverview}
            />
          </div>
        )}

      {pathname === "/assessment" &&
        assessmentStep === "review" &&
        maturityModel && (
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
            {reviewError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {reviewError}
              </div>
            )}
            <ReviewStep
              maturityModel={maturityModel}
              practiceSteps={practiceSteps}
              formData={formData}
              evidenceFiles={evidenceFiles}
              questionEvaluations={loadedAssessment?.questionEvaluations}
              respondentUpdatedResponseKeys={
                respondentUpdatedResponseKeys
              }
              changesRequested={changesRequested}
              isSubmitting={isSubmitting}
              backLabel={
                reviewOrigin === "dashboard"
                  ? "Back to overview"
                  : "Back to assessment"
              }
              onBack={handleBackFromReview}
              onSubmit={submitAssessment}
            />
          </div>
        )}

      <GuidedTour
        open={
          activeTour?.pathname === pathname &&
          (activeTour.view === "module" ||
            activeTour.view === "questions")
        }
        steps={activeTour?.steps ?? []}
        onExit={exitAssessmentTour}
        label={
          activeTour?.view === "questions"
            ? "Assessment questions tour"
            : "Assessment module tour"
        }
      />
    </div>
  );
}

function buildDimensionNavigationModules(
  dimension: Dimension | null,
  dimensionIndex: number,
  practiceSteps: AssessmentPracticeStep[],
  formData: AssessmentData,
  evidenceFiles: AssessmentEvidenceByField,
  questionEvaluations: AssessmentResponse["questionEvaluations"],
  respondentUpdatedResponseKeys: ReadonlySet<string>
): AssessmentNavigationModule[] {
  if (!dimension || dimensionIndex < 0) return [];

  return dimension.modules.map((module, moduleIndex) => {
    const moduleSteps = practiceSteps.filter(
      (step) => step.dimension === dimension && step.module === module
    );
    const practices = buildModuleNavigationItems(
      moduleSteps,
      formData,
      evidenceFiles,
      questionEvaluations,
      respondentUpdatedResponseKeys
    );

    return {
      key: getModuleKey(dimensionIndex, moduleIndex, module.code),
      name: module.name,
      number: moduleIndex + 1,
      answeredCount: practices.reduce(
        (count, practice) => count + practice.answeredCount,
        0
      ),
      totalQuestions: practices.reduce(
        (count, practice) => count + practice.totalEnabledQuestions,
        0
      ),
      completedPracticeCount: practices.filter(
        (practice) => practice.isRequiredComplete
      ).length,
      totalPractices: practices.length,
      isRequiredComplete:
        practices.length > 0 &&
        practices.every((practice) => practice.isRequiredComplete),
      isFullyAnswered:
        practices.length > 0 &&
        practices.every((practice) => practice.isFullyAnswered),
      outstandingFlaggedCount: practices.reduce(
        (count, practice) =>
          count + practice.outstandingFlaggedCount,
        0
      ),
      practices,
    };
  });
}

function buildModuleNavigationItems(
  moduleSteps: AssessmentPracticeStep[],
  formData: AssessmentData,
  evidenceFiles: AssessmentEvidenceByField,
  questionEvaluations: AssessmentResponse["questionEvaluations"],
  respondentUpdatedResponseKeys: ReadonlySet<string>
): AssessmentNavigationPractice[] {
  return moduleSteps.map((step, index) => {
    const progress = getAssessmentPracticeProgress(
      step,
      formData,
      evidenceFiles
    );
    const review = getPracticeReviewCounts(
      step,
      questionEvaluations,
      respondentUpdatedResponseKeys
    );

    return {
      key: step.key,
      name: step.practice.name,
      description: step.practice.description,
      order: index,
      ...progress,
      outstandingFlaggedCount: review.outstandingFlaggedCount,
    };
  });
}

function populatedDependentFieldCount(
  removedFields: Set<string>,
  formData: AssessmentData,
  evidenceFiles: AssessmentEvidenceByField
) {
  let count = 0;
  removedFields.forEach((field) => {
    if (
      isAnswered(formData[field]) ||
      isAnswered(formData[`${field}_justification`]) ||
      (evidenceFiles.get(field)?.length ?? 0) > 0
    ) {
      count += 1;
    }
  });
  return count;
}

function hasPopulatedDependentFields(
  removedFields: Set<string>,
  formData: AssessmentData,
  evidenceFiles: AssessmentEvidenceByField
) {
  return populatedDependentFieldCount(removedFields, formData, evidenceFiles) > 0;
}

function dependencyRemovalConfirmation(
  removedFields: Set<string>,
  formData: AssessmentData,
  evidenceFiles: AssessmentEvidenceByField
) {
  const count = populatedDependentFieldCount(
    removedFields,
    formData,
    evidenceFiles
  );
  const affected = count === 1 ? "a dependent question" : `${count} dependent questions`;
  return `This change will disable ${affected} and permanently clear ${
    count === 1 ? "its" : "their"
  } answer and evidence. Continue?`;
}

function getMultipartAuthHeaders() {
  if (typeof window === "undefined") return {};

  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const responseMessage = (
    error as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;
  return typeof responseMessage === "string" && responseMessage.trim()
    ? responseMessage
    : fallback;
}
