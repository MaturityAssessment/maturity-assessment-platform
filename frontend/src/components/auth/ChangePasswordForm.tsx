"use client";

import { useState, type FormEvent } from "react";
import axios from "axios";
import apiClient from "@/api/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ChangePasswordForm({
  required = false,
  onSuccess,
}: {
  required?: boolean;
  onSuccess: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 12 || new TextEncoder().encode(newPassword).length > 72) {
      setError("Use at least 12 characters and at most 72 UTF-8 bytes. Accented characters and emoji may use more than one byte.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a password different from your current password.");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.put("/api/v1/user/me/password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onSuccess();
    } catch (error) {
      setError(
        axios.isAxiosError<{ message?: string }>(error)
          ? error.response?.data?.message || "Your password could not be changed. Please try again."
          : "Your password could not be changed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Change password</h1>
        <p className="mt-2 text-sm text-slate-600">
          {required
            ? "An administrator reset your password. Enter the temporary password from your email and choose a new password to continue."
            : "Confirm your current password and choose a new password."}
        </p>
        <p id="password-guidance" className="mt-2 text-sm text-slate-600">
          Use at least 12 characters. You will be signed out of all sessions after changing your password.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="current-password">Current password</Label>
        <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password"
          required autoFocus value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={submitting} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input id="new-password" name="newPassword" type="password" autoComplete="new-password"
          required minLength={12} maxLength={72} aria-describedby="password-guidance"
          value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={submitting} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password"
          required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={submitting} />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
        {submitting ? "Changing password..." : "Change password"}
      </Button>
    </form>
  );
}
