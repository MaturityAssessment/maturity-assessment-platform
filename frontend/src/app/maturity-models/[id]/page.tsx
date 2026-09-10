"use client";

import {
  Check,
  ChevronRight,
  GitBranch,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "@/api/axios";
import type { MaturityModelSummary } from "@/api/types";
import { PageLoading, SideNavbar } from "@/components";
import ModelPageState, {
  getModelErrorMessage,
} from "./ModelPageState";
import ModelRepositoryHeader from "./ModelRepositoryHeader";
import { selectModelIdentity } from "./modelRepository";

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function MaturityModelPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const requestedId = params.id;
  const [versions, setVersions] = useState<MaturityModelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!requestedId) return;
    try {
      setLoading(true);
      const response = await apiClient.get<MaturityModelSummary[]>(
        "/api/v1/maturity-model"
      );
      const requestedNumericId = Number(requestedId);
      const requestedVersion = response.data.find(
        (version) => version.id === requestedNumericId
      );
      const lineageRootId =
        requestedVersion?.baseModelId ??
        requestedVersion?.id ??
        requestedNumericId;
      setVersions(
        response.data.filter(
          (version) => (version.baseModelId ?? version.id) === lineageRootId
        )
      );
      setLoadError(null);
    } catch (error) {
      console.error("Error fetching maturity model versions:", error);
      setLoadError(
        getModelErrorMessage(
          error,
          "Failed to load this maturity model. Please try again later."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [requestedId]);

  useEffect(() => {
    void fetchVersions();
  }, [fetchVersions]);

  const modelRootId = useMemo(() => {
    const firstVersion = versions[0];
    return firstVersion?.baseModelId ?? firstVersion?.id;
  }, [versions]);
  const identity = useMemo(() => selectModelIdentity(versions), [versions]);
  const orderedVersions = useMemo(
    () =>
      [...versions].sort(
        (left, right) => (right.version ?? 0) - (left.version ?? 0)
      ),
    [versions]
  );

  useEffect(() => {
    if (modelRootId != null && String(modelRootId) !== requestedId) {
      router.replace(`/maturity-models/${modelRootId}`);
    }
  }, [modelRootId, requestedId, router]);

  return (
    <div className="flex min-h-screen bg-slate-50 [&>aside]:sticky [&>aside]:top-0">
      <SideNavbar />
      <main className="min-w-0 flex-1">
        {loading ? (
          <PageLoading message="Loading maturity model..." />
        ) : loadError ? (
          <ModelPageState
            title="We could not load this model"
            message={loadError}
            onRetry={() => void fetchVersions()}
          />
        ) : !identity || modelRootId == null ? (
          <ModelPageState
            title="Maturity model not found"
            message="The requested maturity model could not be found or is no longer available."
          />
        ) : (
          <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
            <ModelRepositoryHeader
              model={identity}
              modelRootId={modelRootId}
            />

            <section
              aria-labelledby="model-versions-heading"
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <header className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <div className="flex items-center gap-2">
                    <GitBranch
                      className="h-4 w-4 text-indigo-600"
                      aria-hidden="true"
                    />
                    <h2
                      id="model-versions-heading"
                      className="text-base font-bold text-slate-950"
                    >
                      Versions
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                    Browse the version history and open a revision to inspect it.
                  </p>
                </div>
                <span className="inline-flex w-fit items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                  {orderedVersions.length}{" "}
                  {orderedVersions.length === 1 ? "version" : "versions"}
                </span>
              </header>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] table-fixed border-collapse">
                  <thead className="bg-slate-50/80">
                    <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th scope="col" className="w-72 px-4 py-2.5 sm:px-5">
                        Version
                      </th>
                      <th scope="col" className="w-36 px-3 py-2.5">
                        Status
                      </th>
                      <th scope="col" className="w-20 px-3 py-2.5 text-right">
                        Levels
                      </th>
                      <th scope="col" className="w-24 px-3 py-2.5 text-right">
                        Dimensions
                      </th>
                      <th scope="col" className="w-20 px-3 py-2.5 text-right">
                        Modules
                      </th>
                      <th scope="col" className="w-24 px-3 py-2.5 text-right">
                        Questions
                      </th>
                      <th scope="col" className="w-36 px-3 py-2.5">
                        Created
                      </th>
                      <th scope="col" className="w-12 px-4 py-2.5">
                        <span className="sr-only">Open version</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderedVersions.map((version, versionIndex) => {
                      const isLatest = versionIndex === 0;
                      const href = `/maturity-models/${modelRootId}/versions/${version.id}`;
                      return (
                        <tr
                          key={version.id}
                          className="group relative transition-colors hover:bg-indigo-50/40"
                        >
                          <td className="px-4 py-2.5 sm:px-5">
                            <Link
                              href={href}
                              className="flex min-w-0 items-center gap-2.5 rounded-sm outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-indigo-400"
                              aria-label={`Open version ${version.version ?? "unknown"}`}
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-[11px] font-bold tabular-nums text-slate-600 shadow-sm group-hover:border-indigo-200 group-hover:text-indigo-700">
                                v{version.version ?? "?"}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                                  Version {version.version ?? "?"}
                                </span>
                                <span
                                  className="block truncate text-xs text-slate-500"
                                  title={version.description?.trim() || undefined}
                                >
                                  {version.description?.trim() ||
                                    "No description provided"}
                                </span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {version.isActive ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                                  <Check className="h-3 w-3" aria-hidden="true" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                  Inactive
                                </span>
                              )}
                              {isLatest && (
                                <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/10">
                                  Latest
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-medium tabular-nums text-slate-600">
                            {version.levelCount}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-medium tabular-nums text-slate-600">
                            {version.dimensionCount}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-medium tabular-nums text-slate-600">
                            {version.moduleCount}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-medium tabular-nums text-slate-600">
                            {version.totalQuestions}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">
                            {formatCreatedAt(version.createdAt)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <ChevronRight
                              className="ml-auto h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600"
                              aria-hidden="true"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
