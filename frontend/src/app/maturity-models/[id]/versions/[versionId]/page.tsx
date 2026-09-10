"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  Download,
  Ellipsis,
  Pencil,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "@/api/axios";
import type { MaturityModel, MaturityModelSummary } from "@/api/types";
import {
  AlertNotification,
  Button,
  Modal,
  PageLoading,
  SideNavbar,
  type AlertNotificationPayload,
} from "@/components";
import ModelPageState, {
  getModelErrorMessage,
} from "../../ModelPageState";
import ModelStructureExplorer from "../../ModelStructureExplorer";
import ModelVersionHeader from "../../ModelVersionHeader";
import ModelVersionOverview from "../../ModelVersionOverview";
import { selectModelIdentity } from "../../modelRepository";

type VersionTab = "overview" | "structure";
type ConfirmationAction = "deactivate" | "delete" | null;

function formatCreatedAt(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function MaturityModelVersionPage() {
  const params = useParams<{ id: string; versionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedRootId = params.id;
  const versionId = params.versionId;
  const activeTab: VersionTab =
    searchParams.get("tab") === "structure" ? "structure" : "overview";

  const [model, setModel] = useState<MaturityModel | null>(null);
  const [versions, setVersions] = useState<MaturityModelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<AlertNotificationPayload | null>(null);
  const [confirmationAction, setConfirmationAction] =
    useState<ConfirmationAction>(null);
  const [isLifecycleUpdating, setIsLifecycleUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const dismissNotification = useCallback(() => setNotification(null), []);

  const fetchVersion = useCallback(
    async (showLoading = true) => {
      if (!versionId) return;
      try {
        if (showLoading) setLoading(true);
        const [modelResponse, versionsResponse] = await Promise.all([
          apiClient.get<MaturityModel>(`/api/v1/maturity-model/${versionId}`),
          apiClient.get<MaturityModelSummary[]>(
            `/api/v1/maturity-model/${versionId}/versions`
          ),
        ]);
        setModel(modelResponse.data);
        setVersions(versionsResponse.data);
        setLoadError(null);
      } catch (error) {
        console.error("Error fetching maturity model version:", error);
        setLoadError(
          getModelErrorMessage(
            error,
            "Failed to load this model version. Please try again later."
          )
        );
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [versionId]
  );

  useEffect(() => {
    void fetchVersion();
  }, [fetchVersion]);

  const modelRootId = model?.baseModelId ?? model?.id;
  const identity = useMemo(() => selectModelIdentity(versions), [versions]);
  const currentSummary = useMemo(
    () => versions.find((version) => String(version.id) === versionId),
    [versionId, versions]
  );

  useEffect(() => {
    if (modelRootId != null && String(modelRootId) !== requestedRootId) {
      const tabSuffix = activeTab === "structure" ? "?tab=structure" : "";
      router.replace(
        `/maturity-models/${modelRootId}/versions/${versionId}${tabSuffix}`
      );
    }
  }, [activeTab, modelRootId, requestedRootId, router, versionId]);

  const handleActivate = async () => {
    try {
      setIsLifecycleUpdating(true);
      await apiClient.put(`/api/v1/maturity-model/${versionId}/activate`);
      await fetchVersion(false);
      setNotification({
        variant: "success",
        title: "Version activated",
        message: "This version is now available for new assessments.",
      });
    } catch (error) {
      setNotification({
        variant: "error",
        title: "Activation failed",
        message: getModelErrorMessage(
          error,
          "This version could not be activated. Please try again."
        ),
      });
    } finally {
      setIsLifecycleUpdating(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      setIsLifecycleUpdating(true);
      await apiClient.put(`/api/v1/maturity-model/${versionId}/deactivate`);
      setConfirmationAction(null);
      await fetchVersion(false);
      setNotification({
        variant: "success",
        title: "Version deactivated",
        message: "This model lineage currently has no active version.",
      });
    } catch (error) {
      setConfirmationAction(null);
      setNotification({
        variant: "error",
        title: "Deactivation failed",
        message: getModelErrorMessage(
          error,
          "This version could not be deactivated. Please try again."
        ),
      });
    } finally {
      setIsLifecycleUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (modelRootId == null) return;
    try {
      setIsDeleting(true);
      await apiClient.delete(`/api/v1/maturity-model/${versionId}`);
      setConfirmationAction(null);
      router.push(
        versions.length > 1
          ? `/maturity-models/${modelRootId}`
          : "/maturity-models"
      );
    } catch (error) {
      setConfirmationAction(null);
      setNotification({
        variant: "error",
        title: "Delete failed",
        message: getModelErrorMessage(
          error,
          "This version could not be deleted. It may already be used by an assessment."
        ),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const response = await apiClient.get(
        `/api/v1/maturity-model/${versionId}/export.xlsx`,
        { responseType: "blob" }
      );
      const disposition = response.headers["content-disposition"] as
        | string
        | undefined;
      let filename = `maturity-model-${versionId}.xlsx`;
      if (disposition) {
        const encodedNameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        const plainNameMatch = disposition.match(/filename="?([^";]+)"?/i);
        if (encodedNameMatch?.[1]) {
          filename = decodeURIComponent(encodedNameMatch[1]);
        } else if (plainNameMatch?.[1]) {
          filename = plainNameMatch[1];
        }
      }
      const url = window.URL.createObjectURL(
        new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      let message = getModelErrorMessage(
        error,
        "The Excel file could not be downloaded. Please try again."
      );
      const responseData = (error as { response?: { data?: unknown } })
        ?.response?.data;
      if (responseData instanceof Blob) {
        try {
          const parsed = JSON.parse(await responseData.text()) as {
            message?: string;
            errorDetails?: string;
            error?: string;
          };
          message =
            parsed.message ?? parsed.errorDetails ?? parsed.error ?? message;
        } catch {
          // Keep the fallback message when the response is not JSON.
        }
      }
      setNotification({
        variant: "error",
        title: "Download failed",
        message,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const confirmationIsDelete = confirmationAction === "delete";
  const createdAt = formatCreatedAt(currentSummary?.createdAt);

  return (
    <>
      <AlertNotification
        payload={notification}
        onDismiss={dismissNotification}
      />
      <div className="relative isolate flex min-h-screen bg-slate-50 before:pointer-events-none before:fixed before:inset-0 before:-z-10 before:bg-slate-50 before:content-[''] [&>aside]:fixed [&>aside]:inset-y-0 [&>aside]:left-0 [&>aside]:z-20">
        <SideNavbar />
        <main className="ml-64 min-w-0 flex-1">
          {loading ? (
            <PageLoading message="Loading model version..." />
          ) : loadError ? (
            <ModelPageState
              title="We could not load this version"
              message={loadError}
              onRetry={() => void fetchVersion()}
            />
          ) : !model || !identity || modelRootId == null ? (
            <ModelPageState
              title="Model version not found"
              message="The requested version could not be found or is no longer available."
            />
          ) : (
            <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
              <ModelVersionHeader
                model={currentSummary ?? identity}
                modelRootId={modelRootId}
                versionId={versionId}
                version={model.version}
                isActive={model.isActive}
                createdAt={createdAt}
                activeTab={activeTab}
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const returnHref = `/maturity-models/${modelRootId}/versions/${versionId}${
                          activeTab === "structure" ? "?tab=structure" : ""
                        }`;
                        router.push(
                          `/maturity-models/${versionId}/edit?returnTo=${encodeURIComponent(
                            returnHref
                          )}`
                        );
                      }}
                      className="bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      <Pencil aria-hidden="true" />
                      Edit version
                    </Button>
                    {model.isActive ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmationAction("deactivate")}
                        disabled={isLifecycleUpdating}
                        className="border-amber-200 text-amber-800 hover:bg-amber-50 hover:text-amber-900"
                      >
                        <PowerOff aria-hidden="true" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleActivate()}
                        disabled={isLifecycleUpdating}
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        <Power aria-hidden="true" />
                        {isLifecycleUpdating ? "Activating..." : "Activate"}
                      </Button>
                    )}
                    <Menu as="div" className="relative">
                      <MenuButton
                        className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        aria-label="More version actions"
                      >
                        <Ellipsis className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden sm:inline">More</span>
                      </MenuButton>
                      <MenuItems
                        anchor="bottom end"
                        transition
                        className="z-30 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg outline-none transition duration-100 ease-out [--anchor-gap:0.5rem] data-[closed]:scale-95 data-[closed]:opacity-0"
                      >
                        <MenuItem>
                          <button
                            type="button"
                            onClick={() => void handleDownload()}
                            disabled={isDownloading}
                            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 data-[focus]:bg-slate-100 disabled:opacity-50"
                          >
                            <Download
                              className="h-4 w-4 text-slate-400 group-data-[focus]:text-indigo-600"
                              aria-hidden="true"
                            />
                            {isDownloading
                              ? "Exporting Excel..."
                              : "Export as Excel"}
                          </button>
                        </MenuItem>
                        <div className="my-1 border-t border-slate-100" />
                        <MenuItem>
                          <button
                            type="button"
                            onClick={() => setConfirmationAction("delete")}
                            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-rose-700 data-[focus]:bg-rose-50"
                          >
                            <Trash2
                              className="h-4 w-4 text-rose-500"
                              aria-hidden="true"
                            />
                            Delete this version
                          </button>
                        </MenuItem>
                      </MenuItems>
                    </Menu>
                  </div>
                }
              />

              {activeTab === "overview" ? (
                <ModelVersionOverview
                  model={model}
                  creatorName={currentSummary?.creatorName}
                  createdAt={createdAt}
                />
              ) : (
                <ModelStructureExplorer key={model.id} model={model} />
              )}
            </div>
          )}
        </main>
      </div>

      <Modal
        isOpen={confirmationAction !== null}
        onClose={() => setConfirmationAction(null)}
        title={
          confirmationIsDelete
            ? "Delete this model version?"
            : "Deactivate this model version?"
        }
        maxWidth="md"
        closeButtonDisabled={isDeleting || isLifecycleUpdating}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmationAction(null)}
              disabled={isDeleting || isLifecycleUpdating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmationIsDelete ? "destructive" : "default"}
              onClick={() =>
                confirmationIsDelete
                  ? void handleDelete()
                  : void handleDeactivate()
              }
              disabled={isDeleting || isLifecycleUpdating}
              className={
                confirmationIsDelete
                  ? undefined
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }
            >
              {confirmationIsDelete ? (
                <Trash2 aria-hidden="true" />
              ) : (
                <PowerOff aria-hidden="true" />
              )}
              {confirmationIsDelete
                ? isDeleting
                  ? "Deleting..."
                  : "Delete version"
                : isLifecycleUpdating
                  ? "Deactivating..."
                  : "Deactivate version"}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-slate-700">
          {confirmationIsDelete
            ? "This permanently removes only the selected version. This action cannot be undone."
            : "New assessments will not be able to use this model until another version is activated."}
        </p>
      </Modal>
    </>
  );
}
