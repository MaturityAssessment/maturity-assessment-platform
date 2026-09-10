"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import apiClient from "@/api/axios";
import type {
  CampaignDetail,
  CampaignSummary,
  CreateCampaignRequest,
  MaturityModelSummary,
} from "@/api/types";
import { Modal, PageLoading, SideNavbar } from "@/components";
import { useAuth } from "@/context";
import { DashboardError } from "../dashboard/components/DashboardStates";
import CampaignsPanel from "./CampaignsPanel";
import CreateCampaignModal from "./CreateCampaignModal";

export default function CampaignsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [models, setModels] = useState<MaturityModelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] =
    useState<CampaignSummary | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<number | null>(
    null
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canManage = user?.role === "CURATOR" || user?.role === "ADMIN";

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignResponse, modelResponse] = await Promise.all([
        apiClient.get<CampaignSummary[]>("/api/v1/campaigns"),
        apiClient.get<MaturityModelSummary[]>("/api/v1/maturity-model"),
      ]);
      setCampaigns(campaignResponse.data);
      setModels(
        modelResponse.data
          .filter((model) => model.isActive)
          .sort((left, right) => left.name.localeCompare(right.name))
      );
      setError(null);
    } catch (loadError: any) {
      console.error("Failed to load campaigns:", loadError);
      setError(
        loadError.response?.data?.message ??
          "Could not load campaigns. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated === null) return;
    if (!isAuthenticated || !canManage) {
      router.replace("/dashboard");
      return;
    }
    loadPage();
  }, [canManage, isAuthenticated, loadPage, router]);

  const createCampaign = async (request: CreateCampaignRequest) => {
    try {
      const response = await apiClient.post<CampaignDetail>(
        "/api/v1/campaigns",
        request
      );
      setIsCreateOpen(false);
      router.push(`/campaigns/${response.data.id}`);
    } catch (creationError: any) {
      throw new Error(
        creationError.response?.data?.message ??
          "Could not create the campaign. Please try again."
      );
    }
  };

  const deleteCampaign = async () => {
    if (!campaignToDelete || deletingCampaignId !== null) return;

    try {
      setDeletingCampaignId(campaignToDelete.id);
      setDeleteError(null);
      await apiClient.delete(`/api/v1/campaigns/${campaignToDelete.id}`);
      setCampaigns((current) =>
        current.filter((campaign) => campaign.id !== campaignToDelete.id)
      );
      setCampaignToDelete(null);
    } catch (deletionError: any) {
      console.error("Failed to delete campaign:", deletionError);
      setDeleteError(
        deletionError.response?.data?.message ??
          "Could not delete the campaign. Please try again."
      );
    } finally {
      setDeletingCampaignId(null);
    }
  };

  const closeDeleteModal = () => {
    if (deletingCampaignId !== null) return;
    setCampaignToDelete(null);
    setDeleteError(null);
  };

  if (loading || isAuthenticated === null) {
    return (
      <div className="flex min-h-screen bg-slate-50 [&>aside]:sticky [&>aside]:top-0">
        <SideNavbar />
        <main className="min-w-0 flex-1">
          <PageLoading message="Loading campaigns..." />
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen bg-slate-50 [&>aside]:sticky [&>aside]:top-0">
        <SideNavbar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Assessment outreach
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Campaigns
                </h1>
                <p className="mt-2 text-sm text-slate-600 sm:text-base">
                  Create assessment campaigns and track participant completion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                disabled={models.length === 0}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                New campaign
              </button>
            </header>

            {models.length === 0 && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Activate a maturity model before creating a campaign.
              </div>
            )}

            {error ? (
              <DashboardError message={error} onRetry={loadPage} />
            ) : (
              <CampaignsPanel
                campaigns={campaigns}
                deletingCampaignId={deletingCampaignId}
                onDelete={(campaign) => {
                  setDeleteError(null);
                  setCampaignToDelete(campaign);
                }}
              />
            )}
          </div>
        </main>
      </div>

      {isCreateOpen && (
        <CreateCampaignModal
          isOpen
          models={models}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={createCampaign}
        />
      )}

      <Modal
        isOpen={campaignToDelete !== null}
        onClose={closeDeleteModal}
        title="Delete campaign"
        maxWidth="md"
        closeButtonDisabled={deletingCampaignId !== null}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={deletingCampaignId !== null}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void deleteCampaign()}
              disabled={deletingCampaignId !== null}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
            >
              {deletingCampaignId !== null ? "Deleting..." : "Delete campaign"}
            </button>
          </div>
        }
      >
        <p className="text-slate-700">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-slate-900">
            {campaignToDelete?.name}
          </span>
          ? This removes the campaign and its invitations and cannot be undone.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Campaigns with participant assessment activity cannot be deleted, so
          their assessment history remains protected.
        </p>
        {deleteError && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {deleteError}
          </p>
        )}
      </Modal>
    </>
  );
}
