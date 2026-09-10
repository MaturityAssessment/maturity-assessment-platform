"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import DraftSelectionModal from "../assessment/DraftSelectionModal";
import ModelCatalogActions from "./ModelCatalogActions";
import { ModelCatalogLoadError } from "./ModelCatalogEmptyState";
import MaturityModelsPanel from "./MaturityModelsPanel";
import useModelAssessmentStart from "./useModelAssessmentStart";
import useMaturityModelCatalog from "./useMaturityModelCatalog";
import { AlertNotification, PageLoading, SideNavbar } from "@/components";

export default function MaturityModelsPage() {
  const router = useRouter();
  const catalog = useMaturityModelCatalog();
  const assessmentStart = useModelAssessmentStart();

  const handleModelClick = (modelId: number) => {
    router.push(`/maturity-models/${modelId}`);
  };

  if (catalog.loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 [&>aside]:sticky [&>aside]:top-0">
        <SideNavbar />
        <main className="min-w-0 flex-1">
          <PageLoading message="Loading maturity models..." />
        </main>
      </div>
    );
  }

  return (
    <>
      <AlertNotification
        payload={
          catalog.notification ??
          (assessmentStart.error && assessmentStart.selection === null
            ? {
                variant: "error",
                title: "Could not start assessment",
                message: assessmentStart.error,
              }
            : null)
        }
        onDismiss={
          catalog.notification
            ? catalog.dismissNotification
            : assessmentStart.closeSelection
        }
      />
      <div className="flex min-h-screen bg-gray-50 [&>aside]:sticky [&>aside]:top-0">
        <SideNavbar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Assessment catalog
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Maturity models
                </h1>
                <p className="mt-2 text-sm text-slate-600 sm:text-base">
                  Choose a model to start an assessment or explore its
                  structure.
                </p>
              </div>
              {catalog.canManage && (
                <ModelCatalogActions
                  canCreate={catalog.canCreate}
                  onCreate={() => router.push("/maturity-models/new")}
                />
              )}
            </header>

            {catalog.canManage &&
              !catalog.domainsLoadFailed &&
              catalog.domains.length === 0 && (
                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                  <p className="font-medium">Create a domain to add models</p>
                  <p className="mt-1 text-sm text-amber-800">
                    Every maturity model must belong to a domain.{" "}
                    <Link
                      href="/domains"
                      className="font-medium underline underline-offset-2 hover:text-amber-950"
                    >
                      Go to Domain Management
                    </Link>
                  </p>
                </div>
              )}

            {catalog.listLoadFailed ? (
              <ModelCatalogLoadError onRetry={catalog.fetchCatalog} />
            ) : (
              <MaturityModelsPanel
                groups={catalog.modelGroups}
                domains={catalog.domains}
                canManage={catalog.canManage}
                checkingModelId={assessmentStart.checkingModelId}
                onOpen={handleModelClick}
                onStart={assessmentStart.startAssessment}
              />
            )}
          </div>
        </main>
      </div>

      <DraftSelectionModal
        isOpen={assessmentStart.selection !== null}
        modelName={assessmentStart.selectedModel?.name ?? "Maturity model"}
        activeVersion={assessmentStart.selectedModel?.version}
        selection={assessmentStart.selection}
        actionInProgress={assessmentStart.actionInProgress}
        error={assessmentStart.error}
        onClose={assessmentStart.closeSelection}
        onContinueDraft={assessmentStart.continueDraft}
        onStartNew={assessmentStart.startNew}
      />
    </>
  );
}
