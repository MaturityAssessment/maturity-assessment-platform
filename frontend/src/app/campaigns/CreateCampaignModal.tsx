"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components";
import type {
  CreateCampaignRequest,
  MaturityModelSummary,
} from "@/api/types";
import {
  parseParticipantEmails,
  toCampaignEndIso,
  toLocalDateTimeInput,
} from "./campaignForm";

interface CreateCampaignModalProps {
  isOpen: boolean;
  models: MaturityModelSummary[];
  onClose: () => void;
  onSubmit: (request: CreateCampaignRequest) => Promise<void>;
}

export default function CreateCampaignModal({
  isOpen,
  models,
  onClose,
  onSubmit,
}: CreateCampaignModalProps) {
  const defaultEnd = useMemo(
    () => toLocalDateTimeInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000)),
    []
  );
  const [name, setName] = useState("");
  const [endsAt, setEndsAt] = useState(defaultEnd);
  const [maturityModelId, setMaturityModelId] = useState(
    models[0]?.id?.toString() ?? ""
  );
  const [participantInput, setParticipantInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsed = parseParticipantEmails(participantInput);
    const endInstant = toCampaignEndIso(endsAt);
    const selectedModelId = Number(maturityModelId);

    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }
    if (!Number.isInteger(selectedModelId) || selectedModelId <= 0) {
      setError("Select an active maturity model.");
      return;
    }
    if (!endInstant || Date.parse(endInstant) <= Date.now()) {
      setError("Campaign end date must be in the future.");
      return;
    }
    if (parsed.invalidEmails.length > 0) {
      setError(`Invalid email: ${parsed.invalidEmails[0]}`);
      return;
    }
    if (parsed.duplicateEmails.length > 0) {
      setError(`Duplicate email: ${parsed.duplicateEmails[0]}`);
      return;
    }
    if (parsed.emails.length === 0) {
      setError("Add at least one participant email.");
      return;
    }
    if (parsed.emails.length > 1_000) {
      setError("A campaign can contain at most 1,000 participants.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        endsAt: endInstant,
        maturityModelId: selectedModelId,
        participantEmails: parsed.emails,
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not create the campaign."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create campaign"
      maxWidth="xl"
      closeButtonDisabled={submitting}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="campaign-name" className="mb-1 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="campaign-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={150}
            disabled={submitting}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="2026 Security maturity assessment"
          />
        </div>

        <div>
          <label htmlFor="campaign-model" className="mb-1 block text-sm font-medium text-slate-700">
            Maturity model
          </label>
          <select
            id="campaign-model"
            value={maturityModelId}
            onChange={(event) => setMaturityModelId(event.target.value)}
            disabled={submitting || models.length === 0}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {models.length === 0 && <option value="">No active models available</option>}
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} · v{model.version ?? 1}
                {model.domainName ? ` · ${model.domainName}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="campaign-end" className="mb-1 block text-sm font-medium text-slate-700">
            End date and time
          </label>
          <input
            id="campaign-end"
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            min={toLocalDateTimeInput(new Date())}
            disabled={submitting}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div>
          <label htmlFor="campaign-participants" className="mb-1 block text-sm font-medium text-slate-700">
            Participant emails
          </label>
          <textarea
            id="campaign-participants"
            value={participantInput}
            onChange={(event) => setParticipantInput(event.target.value)}
            disabled={submitting}
            rows={7}
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder={"alice@example.com\nbob@example.com"}
          />
          <p className="mt-1 text-xs text-slate-500">
            Enter one address per line, or separate addresses with commas.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || models.length === 0}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create campaign"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
