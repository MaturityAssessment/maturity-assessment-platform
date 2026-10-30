"use client";
import { useState } from "react";
import apiClient from "@/api/axios";

export default function CompleteProfileForm({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await apiClient.put("/api/v1/user/me/profile", { name: name.trim(), organizationName: organization.trim() });
      await onSuccess();
    } catch { setError("Could not save your profile. Please try again."); }
    finally { setSaving(false); }
  }}>
    <h1 className="text-xl font-semibold">Complete your profile</h1>
    <p>Enter your name and organization to continue.</p>
    <label className="block">Name<input className="mt-1 w-full rounded border p-2" required maxLength={255} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label>
    <label className="block">Organization<input className="mt-1 w-full rounded border p-2" required maxLength={255} autoComplete="organization" value={organization} onChange={e => setOrganization(e.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <button className="rounded bg-indigo-600 px-4 py-2 text-white" disabled={saving || !name.trim() || !organization.trim()}>{saving ? "Saving..." : "Continue"}</button>
  </form>;
}
