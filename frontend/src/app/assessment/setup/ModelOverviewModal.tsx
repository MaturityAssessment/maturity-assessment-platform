"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Boxes,
  CircleHelp,
  ClipboardList,
  Loader2,
  RotateCcw,
} from "lucide-react";
import apiClient from "@/api/axios";
import type { MaturityModel, MaturityModelSummary } from "@/api/types";
import { Button, Modal } from "@/components";
import ModelStructureExplorer from "../../maturity-models/[id]/ModelStructureExplorer";
import { getModelErrorMessage } from "../../maturity-models/[id]/ModelPageState";

type ModelOverviewModalProps = {
  modelSummary: MaturityModelSummary | null;
  primaryLabel: string;
  actionInProgress: boolean;
  onClose: () => void;
  onPrimaryAction: () => void;
};

export default function ModelOverviewModal({
  modelSummary,
  primaryLabel,
  actionInProgress,
  onClose,
  onPrimaryAction,
}: ModelOverviewModalProps) {
  const [model, setModel] = useState<MaturityModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadModel = useCallback(async () => {
    if (!modelSummary) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setModel(null);
    try {
      const response = await apiClient.get<MaturityModel>(
        `/api/v1/maturity-model/${modelSummary.id}`
      );
      if (requestId !== requestIdRef.current) return;
      setModel(response.data);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      console.error("Error loading maturity model overview:", loadError);
      setError(
        getModelErrorMessage(
          loadError,
          "The model structure could not be loaded. You can still start the assessment."
        )
      );
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [modelSummary]);

  useEffect(() => {
    if (modelSummary) void loadModel();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadModel, modelSummary]);

  return (
    <Modal
      isOpen={modelSummary !== null}
      onClose={onClose}
      title={modelSummary?.name ?? "Model overview"}
      maxWidth="4xl"
      closeButtonDisabled={actionInProgress}
      className="flex max-h-[calc(100vh-2rem)] flex-col"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Your answers are saved as you progress through the assessment.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={actionInProgress}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onPrimaryAction}
              disabled={actionInProgress}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {actionInProgress ? "Opening..." : primaryLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div className="min-h-0 overflow-y-auto pr-1">
        {modelSummary && (
          <div className="mb-6 border-b border-slate-200 pb-5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span>{modelSummary.domainName || "General"}</span>
              {modelSummary.version != null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Version {modelSummary.version}</span>
                </>
              )}
            </div>
            {modelSummary.description && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {modelSummary.description}
              </p>
            )}
            <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              <ModelMetric
                icon={<Boxes className="h-3.5 w-3.5" aria-hidden="true" />}
                value={modelSummary.dimensionCount}
                label="dimensions"
              />
              <ModelMetric
                icon={
                  <ClipboardList
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                }
                value={modelSummary.moduleCount}
                label="modules"
              />
              <ModelMetric
                icon={
                  <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                }
                value={modelSummary.totalQuestions}
                label="questions"
              />
            </dl>
          </div>
        )}

        {loading ? (
          <div
            className="flex min-h-64 flex-col items-center justify-center text-sm text-slate-500"
            role="status"
          >
            <Loader2
              className="mb-3 h-6 w-6 animate-spin text-indigo-600"
              aria-hidden="true"
            />
            Loading model structure...
          </div>
        ) : error ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-6 text-center">
            <p className="max-w-lg text-sm leading-6 text-slate-600">{error}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadModel()}
              className="mt-4"
            >
              <RotateCcw aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : model ? (
          <ModelStructureExplorer key={model.id} model={model} />
        ) : null}
      </div>
    </Modal>
  );
}

function ModelMetric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <dt className="text-slate-400">{icon}</dt>
      <dd>
        <span className="font-semibold text-slate-700">{value}</span> {label}
      </dd>
    </div>
  );
}
