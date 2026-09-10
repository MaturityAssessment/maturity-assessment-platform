"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BarChart3, LayoutDashboard, Users } from "lucide-react";
import apiClient from "@/api/axios";
import type {
  AssessmentResponse,
  CampaignDetail,
  CampaignInvitationResponse,
  CampaignParticipant,
  CampaignResults,
  MaturityModel,
} from "@/api/types";
import { PageLoading, TopNavbar } from "@/components";
import { useAuth } from "@/context";
import { cn } from "@/lib/utils";
import { buildPracticeSteps } from "../../assessment/assessmentRoutes";
import { buildAssessmentResultsExportData } from "../../assessment/assessmentResultsExport";
import { isCampaignExpired } from "../campaignForm";
import CampaignOverviewTab from "./CampaignOverviewTab";
import CampaignParticipantsTab from "./CampaignParticipantsTab";
import CampaignResultsTab from "./CampaignResultsTab";

type CampaignTab = "overview" | "participants" | "results";
type ExportFormat = "pdf" | "xlsx";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [results, setResults] = useState<CampaignResults | null>(null);
  const [maturityModel, setMaturityModel] = useState<MaturityModel | null>(null);
  const [activeTab, setActiveTab] = useState<CampaignTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [issuingParticipantId, setIssuingParticipantId] = useState<number | null>(null);
  const [copiedParticipantId, setCopiedParticipantId] = useState<number | null>(null);
  const [exportingParticipant, setExportingParticipant] = useState<string | null>(null);
  const [exportingAggregate, setExportingAggregate] = useState(false);
  const canManage = user?.role === "CURATOR" || user?.role === "ADMIN";

  const loadCampaign = useCallback(async () => {
    setLoading(true);
    try {
      const campaignResponse = await apiClient.get<CampaignDetail>(
        `/api/v1/campaigns/${params.id}`
      );
      const campaignData = campaignResponse.data;
      const [resultsResponse, modelResponse] = await Promise.all([
        apiClient.get<CampaignResults>(`/api/v1/campaigns/${params.id}/results`),
        apiClient.get<MaturityModel>(
          `/api/v1/maturity-model/${campaignData.maturityModelId}`
        ),
      ]);
      setCampaign(campaignData);
      setResults(resultsResponse.data);
      setMaturityModel(modelResponse.data);
      setError(null);
    } catch (loadError: any) {
      console.error("Failed to load campaign:", loadError);
      setError(
        loadError.response?.data?.message ?? "Could not load this campaign."
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (isAuthenticated === null) return;
    if (!isAuthenticated || !canManage) {
      router.replace("/dashboard");
      return;
    }
    void loadCampaign();
  }, [canManage, isAuthenticated, loadCampaign, router]);

  const scaleMax = useMemo(
    () =>
      Math.max(
        1,
        maturityModel?.levels?.reduce(
          (maximum, level) => Math.max(maximum, level.number),
          0
        ) || maturityModel?.levels?.length || 5
      ),
    [maturityModel]
  );

  const copyInvitationLink = async (participantId: number) => {
    setIssuingParticipantId(participantId);
    setCopiedParticipantId(null);
    setActionError(null);
    try {
      const response = await apiClient.post<CampaignInvitationResponse>(
        `/api/v1/campaigns/${params.id}/participants/${participantId}/invitation`
      );
      const invitationUrl = new URL("/assessment", window.location.origin);
      invitationUrl.searchParams.set("campaignToken", response.data.invitationToken);
      try {
        await navigator.clipboard.writeText(invitationUrl.toString());
      } catch {
        window.prompt("Copy this campaign assessment link:", invitationUrl.toString());
      }
      setCopiedParticipantId(participantId);
    } catch (invitationError: any) {
      console.error("Failed to issue campaign invitation:", invitationError);
      setActionError(
        invitationError.response?.data?.message ??
          "Could not generate and copy the invitation link."
      );
    } finally {
      setIssuingParticipantId(null);
    }
  };

  const exportParticipantResults = async (
    participant: CampaignParticipant,
    format: ExportFormat
  ) => {
    if (
      !participant.assessmentId ||
      participant.assessmentStatus !== "COMPLETED" ||
      !maturityModel
    ) {
      return;
    }

    const exportKey = `${participant.id}:${format}`;
    setExportingParticipant(exportKey);
    setActionError(null);
    try {
      const assessmentResponse = await apiClient.get<AssessmentResponse>(
        `/api/v1/assessments/${participant.assessmentId}`
      );
      const exportData = buildAssessmentResultsExportData(
        { ...assessmentResponse.data, userEmail: participant.email },
        maturityModel,
        buildPracticeSteps(maturityModel)
      );
      const { exportAssessmentResults } = await import(
        "../../assessment/assessmentResultsExportClient"
      );
      await exportAssessmentResults(exportData, format);
    } catch (exportError) {
      console.error("Failed to export participant results:", exportError);
      setActionError(
        `Could not export results for ${participant.email}. Please try again.`
      );
    } finally {
      setExportingParticipant(null);
    }
  };

  const exportAggregateResults = async () => {
    if (!campaign || !results || results.evaluatedParticipantCount === 0) return;
    setExportingAggregate(true);
    setActionError(null);
    try {
      const { exportCampaignResults } = await import(
        "./campaignResultsExportClient"
      );
      exportCampaignResults(campaign, results, scaleMax);
    } catch (exportError) {
      console.error("Failed to export aggregate campaign results:", exportError);
      setActionError("Could not export the aggregate campaign results. Please try again.");
    } finally {
      setExportingAggregate(false);
    }
  };

  if (loading || isAuthenticated === null) {
    return <PageLoading message="Loading campaign..." />;
  }

  if (error || !campaign || !results || !maturityModel) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNavbar
          title="Campaign"
          subtitle="Campaign workspace"
          backButton={{ href: "/campaigns", label: "Back to campaigns" }}
        />
        <main className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="rounded-xl border border-red-200 bg-white px-6 py-10 font-medium text-red-700 shadow-sm">
            {error || "Could not load this campaign."}
          </p>
          <button
            type="button"
            onClick={() => void loadCampaign()}
            className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Try again
          </button>
        </main>
      </div>
    );
  }

  const ended = isCampaignExpired(campaign.endsAt);

  return (
    <div className="min-h-screen bg-slate-50 pb-14">
      <TopNavbar
        title={campaign.name}
        subtitle={`${campaign.maturityModelName} · Version ${campaign.maturityModelVersion}`}
        backButton={{ href: "/campaigns", label: "Back to campaigns" }}
        rightActions={
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
              ended
                ? "bg-slate-100 text-slate-600"
                : "bg-emerald-50 text-emerald-700"
            )}
          >
            {ended ? "Ended" : "Active"}
          </span>
        }
        sticky
      />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-2 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                Campaign workspace
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Ends {new Date(campaign.endsAt).toLocaleString()} · {campaign.participants.length} participant{campaign.participants.length === 1 ? "" : "s"}
              </p>
            </div>
            <p className="text-xs text-slate-500">Campaign #{campaign.id}</p>
          </div>

          <nav className="flex gap-7 overflow-x-auto" aria-label="Campaign sections" role="tablist">
            <CampaignTabButton tab="overview" label="Overview" icon={LayoutDashboard} activeTab={activeTab} onSelect={setActiveTab} />
            <CampaignTabButton tab="participants" label="Participants" icon={Users} count={campaign.participants.length} activeTab={activeTab} onSelect={setActiveTab} />
            <CampaignTabButton tab="results" label="Results" icon={BarChart3} count={results.evaluatedParticipantCount} activeTab={activeTab} onSelect={setActiveTab} />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 pt-7 sm:px-6 lg:px-10 lg:pt-9">
        {actionError && (
          <div role="alert" className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} className="shrink-0 font-semibold hover:text-red-900">Dismiss</button>
          </div>
        )}

        {activeTab === "overview" ? (
          <CampaignOverviewTab campaign={campaign} results={results} />
        ) : activeTab === "participants" ? (
          <CampaignParticipantsTab
            campaign={campaign}
            issuingParticipantId={issuingParticipantId}
            copiedParticipantId={copiedParticipantId}
            exportingParticipant={exportingParticipant}
            onCopyInvitation={(participantId) => void copyInvitationLink(participantId)}
            onExport={(participant, format) => void exportParticipantResults(participant, format)}
          />
        ) : (
          <CampaignResultsTab
            campaign={campaign}
            results={results}
            scaleMax={scaleMax}
            exporting={exportingAggregate}
            onExport={() => void exportAggregateResults()}
          />
        )}
      </main>
    </div>
  );
}

function CampaignTabButton({
  tab,
  label,
  icon: Icon,
  count,
  activeTab,
  onSelect,
}: {
  tab: CampaignTab;
  label: string;
  icon: typeof Users;
  count?: number;
  activeTab: CampaignTab;
  onSelect: (tab: CampaignTab) => void;
}) {
  const active = activeTab === tab;
  return (
    <button
      type="button"
      role="tab"
      id={`campaign-tab-${tab}`}
      aria-controls={`campaign-panel-${tab}`}
      aria-selected={active}
      onClick={() => onSelect(tab)}
      className={cn(
        "relative inline-flex shrink-0 items-center gap-2 rounded-t-md px-1.5 pb-3 pt-1 text-sm font-semibold transition focus:outline-none focus-visible:bg-indigo-50",
        active
          ? "text-indigo-700 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-indigo-600"
          : "text-slate-500 hover:text-slate-800"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count !== undefined && (
        <span className={cn("inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold", active ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600")}>
          {count}
        </span>
      )}
    </button>
  );
}
