"use client";

import { useRef, useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Description } from "@headlessui/react";
import { AlertCircle, Check, Loader2, Settings2, X } from "lucide-react";
import apiClient from "@/api/axios";
import type { Domain, MaturityModelSummary } from "@/api/types";
import { Button } from "@/components/ui/button";
import { TEXT_LIMITS } from "@/config/textLimits";
import { useAuth } from "@/context";
import { getModelErrorMessage } from "./ModelPageState";

const fieldClass = "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500";

export default function ModelSettingsAction({ model, onSaved }: {
  model: MaturityModelSummary;
  onSaved: (versions: MaturityModelSummary[]) => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: model.name, description: model.description ?? "", domainId: String(model.domainId ?? "") });
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadDomains = async () => {
    setLoadingDomains(true);
    setDomainError(null);
    try {
      const response = await apiClient.get<Domain[]>("/api/v1/domain");
      setDomains(response.data);
    } catch (error) {
      setDomainError(getModelErrorMessage(error, "Could not load domains. Please try again."));
    } finally {
      setLoadingDomains(false);
    }
  };
  const close = () => { if (!savingRef.current) setOpen(false); };
  const valid = Boolean(draft.name.trim() && draft.description.trim() && domains.some((domain) => String(domain.id) === draft.domainId));

  if (user?.role !== "CURATOR" && user?.role !== "ADMIN") return null;

  return (
    <>
      <Button variant="outline" className="gap-2 border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50" onClick={() => {
        setDraft({ name: model.name, description: model.description ?? "", domainId: String(model.domainId ?? "") });
        setError(null);
        setSaved(false);
        setOpen(true);
        void loadDomains();
      }}><Settings2 className="h-4 w-4" aria-hidden="true" />Settings</Button>
      {saved && <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700"><Check className="h-3.5 w-3.5" aria-hidden="true" />Model settings saved.</p>}

      <Dialog open={open} onClose={close} className="relative z-50">
        <DialogBackdrop transition className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-200 data-[closed]:opacity-0" />
        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6">
          <div className="flex min-h-full items-center justify-center">
            <DialogPanel transition className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-950/5 transition duration-200 data-[closed]:translate-y-2 data-[closed]:opacity-0 motion-reduce:transition-none">
              <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100"><Settings2 className="h-5 w-5" aria-hidden="true" /></div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-lg font-semibold tracking-tight text-slate-950">Model settings</DialogTitle>
                  <Description className="mt-1 text-sm leading-5 text-slate-500">Update the details shared across every version of this model.</Description>
                </div>
                <button type="button" onClick={close} disabled={saving} aria-label="Close model settings" className="-mr-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"><X className="h-5 w-5" aria-hidden="true" /></button>
              </div>

              <form onSubmit={async (event) => {
                event.preventDefault();
                if (savingRef.current || loadingDomains || domainError || !valid) return;
                savingRef.current = true;
                setSaving(true);
                setError(null);
                try {
                  const response = await apiClient.put<MaturityModelSummary[]>(`/api/v1/maturity-model/${model.id}/settings`, {
                    name: draft.name.trim(), description: draft.description.trim(), domainId: Number(draft.domainId),
                  });
                  onSaved(response.data);
                  setOpen(false);
                  setSaved(true);
                } catch (error) {
                  setError(getModelErrorMessage(error, "Could not save model settings. Please try again."));
                } finally {
                  savingRef.current = false;
                  setSaving(false);
                }
              }}>
                <div className="space-y-5 px-5 py-6 sm:px-7">
                  <div>
                    <label htmlFor="settings-model-name" className="text-sm font-medium text-slate-700">Model name <span className="text-indigo-500" aria-hidden="true">*</span></label>
                    <input id="settings-model-name" data-autofocus required maxLength={TEXT_LIMITS.name} disabled={saving} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={fieldClass} />
                  </div>
                  <div>
                    <label htmlFor="settings-model-description" className="text-sm font-medium text-slate-700">Description <span className="text-indigo-500" aria-hidden="true">*</span></label>
                    <textarea id="settings-model-description" required rows={4} maxLength={TEXT_LIMITS.description} disabled={saving} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} aria-describedby="settings-description-count" className={`${fieldClass} resize-y leading-6`} placeholder="Describe the purpose and scope of this model." />
                    <p id="settings-description-count" className="mt-1.5 text-right text-xs tabular-nums text-slate-400">{draft.description.length.toLocaleString()} / {TEXT_LIMITS.description.toLocaleString()}</p>
                  </div>
                  <div>
                    <label htmlFor="settings-model-domain" className="text-sm font-medium text-slate-700">Domain <span className="text-indigo-500" aria-hidden="true">*</span></label>
                    <select id="settings-model-domain" required disabled={saving || loadingDomains || Boolean(domainError)} value={draft.domainId} onChange={(event) => setDraft({ ...draft, domainId: event.target.value })} className={fieldClass} aria-describedby="settings-domain-help">
                      <option value="">{loadingDomains ? "Loading domains..." : "Select a domain"}</option>
                      {domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
                    </select>
                    <p id="settings-domain-help" className="mt-1.5 text-xs text-slate-500">Choose the category where people will find this model.</p>
                    {domainError && <div role="alert" className="mt-2 text-sm text-red-600">{domainError} <button type="button" onClick={() => void loadDomains()} className="font-medium underline underline-offset-2">Try again</button></div>}
                    {!loadingDomains && !domainError && domains.length === 0 && <p role="status" className="mt-2 text-sm text-amber-700">Create a domain before saving model settings.</p>}
                  </div>
                  {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</div>}
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-7">
                  <Button type="button" variant="outline" disabled={saving} onClick={close} className="border-slate-200 bg-white text-slate-700">Cancel</Button>
                  <Button type="submit" disabled={saving || loadingDomains || Boolean(domainError) || !valid} className="min-w-32 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700">{saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{saving ? "Saving..." : "Save changes"}</Button>
                </div>
              </form>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
