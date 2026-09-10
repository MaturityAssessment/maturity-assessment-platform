"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SideNavbar } from "@/components";
import GuidedTour from "@/components/guided-tour/GuidedTour";
import TourInvitation from "@/components/guided-tour/TourInvitation";
import { useAuth } from "@/context";
import DraftSelectionModal from "../assessment/DraftSelectionModal";
import AllAssessmentsPanel from "./components/AllAssessmentsPanel";
import ContinueDraftsPanel from "./components/ContinueDraftsPanel";
import DashboardHeader from "./components/DashboardHeader";
import {
  DashboardError,
  DashboardLoading,
} from "./components/DashboardStates";
import DraftDeleteModal from "./components/DraftDeleteModal";
import SubmissionStatusPopup, {
  SubmissionStatus,
} from "./components/SubmissionStatusPopup";
import DashboardAssistant from "./DashboardAssistant";
import useDashboardAssessments from "./hooks/useDashboardAssessments";
import useDashboardDraftActions from "./hooks/useDashboardDraftActions";
import {
  DASHBOARD_TOUR_KEY,
  DASHBOARD_TOUR_STEPS,
  DASHBOARD_TOUR_VERSION,
  shouldOfferDashboardTour,
} from "./dashboardTour";

type SubmissionNotice = {
  status: SubmissionStatus;
  assessmentId: string | null;
};

export default function Dashboard() {
  const router = useRouter();
  const { user, completeHelpTour, dismissHelpTourPrompt } = useAuth();
  const [submissionNotice, setSubmissionNotice] =
    useState<SubmissionNotice | null>(null);
  const [submissionStatusChecked, setSubmissionStatusChecked] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourInvitationOpen, setTourInvitationOpen] = useState(false);
  const tourInvitationOfferedRef = useRef(false);
  const {
    modelDetails,
    assessmentViews,
    draftViews,
    draftAssessments,
    loading,
    error,
    retry,
    removeAssessment,
  } = useDashboardAssessments();
  const draftActions = useDashboardDraftActions({
    drafts: draftAssessments,
    modelDetails,
    removeAssessment,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const submitted = params.get("submitted");
    if (submitted === "completed" || submitted === "pending") {
      setSubmissionNotice({
        status: submitted,
        assessmentId: params.get("assessmentId"),
      });
      window.history.replaceState(null, "", "/dashboard");
    }
    setSubmissionStatusChecked(true);
  }, []);

  const dashboardTourCompleted =
    (user?.completedHelpTours?.[DASHBOARD_TOUR_KEY] ?? 0) >=
    DASHBOARD_TOUR_VERSION;
  const dashboardTourPromptDismissed =
    (user?.dismissedHelpTourPrompts?.[DASHBOARD_TOUR_KEY] ?? 0) >=
    DASHBOARD_TOUR_VERSION;

  useEffect(() => {
    if (!submissionStatusChecked || !user) return;

    const shouldOffer = shouldOfferDashboardTour({
      enabled: user.helpBalloonsEnabled !== false,
      completed: dashboardTourCompleted,
      dismissed: dashboardTourPromptDismissed,
      loading,
      error,
      submissionNoticeOpen: submissionNotice !== null,
      alreadyOffered: tourInvitationOfferedRef.current,
    });

    if (shouldOffer) {
      tourInvitationOfferedRef.current = true;
      setTourInvitationOpen(true);
    }
  }, [
    dashboardTourCompleted,
    dashboardTourPromptDismissed,
    error,
    loading,
    submissionNotice,
    submissionStatusChecked,
    user,
  ]);

  const dismissSubmissionNotice = useCallback(
    () => setSubmissionNotice(null),
    []
  );
  const startDashboardTour = useCallback(() => {
    tourInvitationOfferedRef.current = true;
    setTourInvitationOpen(false);
    setTourOpen(true);
  }, []);
  const dismissDashboardTourInvitation = useCallback(() => {
    tourInvitationOfferedRef.current = true;
    setTourInvitationOpen(false);
    void dismissHelpTourPrompt(
      DASHBOARD_TOUR_KEY,
      DASHBOARD_TOUR_VERSION
    ).catch((dismissalError) => {
      console.error(
        "Failed to save dashboard tour invitation preference:",
        dismissalError
      );
    });
  }, [dismissHelpTourPrompt]);
  const exitDashboardTour = useCallback(() => {
    setTourOpen(false);
    void completeHelpTour(
      DASHBOARD_TOUR_KEY,
      DASHBOARD_TOUR_VERSION
    ).catch((completionError) => {
      console.error("Failed to save dashboard tour progress:", completionError);
    });
  }, [completeHelpTour]);
  const firstName = user?.name?.trim().split(/\s+/)[0] || undefined;

  return (
    <div className="flex min-h-screen bg-slate-50 [&>aside]:sticky [&>aside]:top-0">
      <SideNavbar />

      <main className="relative min-w-0 flex-1">
        {submissionNotice && (
          <SubmissionStatusPopup
            status={submissionNotice.status}
            onDismiss={dismissSubmissionNotice}
            onViewResults={
              submissionNotice.status === "completed" &&
              submissionNotice.assessmentId
                ? () =>
                    router.push(
                      `/assessment?draftId=${submissionNotice.assessmentId}`
                    )
                : undefined
            }
          />
        )}

        <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <DashboardHeader
            firstName={firstName}
            onStartTour={startDashboardTour}
            tourDisabled={!user || loading}
          />

          {tourInvitationOpen && (
            <TourInvitation
              title="Welcome—let’s get you oriented"
              description="Would you like a quick tour of where your assessments appear, how to start one, and where to find help?"
              acceptLabel="Take the quick tour"
              dismissLabel="Explore on my own"
              onAccept={startDashboardTour}
              onDismiss={dismissDashboardTourInvitation}
              className="mb-6"
            />
          )}

          {loading ? (
            <DashboardLoading />
          ) : error ? (
            <DashboardError message={error} onRetry={retry} />
          ) : (
            <div className="space-y-6">
              <ContinueDraftsPanel
                drafts={draftViews}
                onContinue={draftActions.openDraft}
              />
              <AllAssessmentsPanel
                assessments={assessmentViews}
                onOpen={draftActions.openAssessment}
                onDeleteDraft={draftActions.requestDraftDeletion}
              />
            </div>
          )}
        </div>

        <DashboardAssistant />
      </main>

      <DraftDeleteModal
        draft={draftActions.draftToDelete}
        modelDetails={modelDetails}
        deletingDraftId={draftActions.deletingDraftId}
        error={draftActions.draftDeleteError}
        onClose={draftActions.closeDraftDeletion}
        onConfirm={draftActions.deleteDraft}
      />

      <DraftSelectionModal
        isOpen={draftActions.draftSelection !== null}
        modelName={draftActions.draftSelectionModel?.name || "Maturity model"}
        activeVersion={
          draftActions.draftSelectionModel?.isActive
            ? draftActions.draftSelectionModel.version
            : undefined
        }
        selection={draftActions.draftSelection}
        actionInProgress={draftActions.draftSelectionAction}
        error={draftActions.draftSelectionError}
        onClose={draftActions.closeDraftSelection}
        onContinueDraft={draftActions.continueSelectedDraft}
        onStartNew={draftActions.startNewFromSelection}
      />

      <GuidedTour
        open={tourOpen}
        steps={DASHBOARD_TOUR_STEPS}
        onExit={exitDashboardTour}
        label="Dashboard tour"
      />
    </div>
  );
}
