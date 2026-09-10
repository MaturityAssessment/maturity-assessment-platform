"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal, PageLoading, SideNavbar } from "@/components";
import apiClient from "@/api/axios";
import { useAuth } from "@/context";
import {
  Domain,
  CreateDomainRequest,
  UpdateDomainAppearanceRequest,
} from "@/api/types";
import { DomainIcon } from "@/components/DomainIcon";
import DomainsPanel from "./DomainsPanel";
import {
  DOMAIN_COLOR_KEYS,
  DOMAIN_ICON_KEYS,
  deterministicDomainColor,
  suggestDomainIcon,
} from "@/lib/domainAppearance";

const DomainsPage = () => {
  const router = useRouter();
  const { isAuthenticated, user: currentUser } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null);
  const [domainToEdit, setDomainToEdit] = useState<Domain | null>(null);
  const canManage =
    currentUser?.role === "CURATOR" || currentUser?.role === "ADMIN";

  useEffect(() => {
    if (isAuthenticated === null) return;

    if (isAuthenticated && currentUser) {
      fetchDomains();
    } else {
      router.replace("/dashboard");
    }
  }, [currentUser, isAuthenticated, router]);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/api/v1/domain");
      setDomains(response.data);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching domains:", err);
      if (err.response?.status === 403) {
        const errorMessage =
          err.response?.data?.message ||
          "You do not have access to view domains.";
        setError(errorMessage);
      } else {
        setError("Failed to load domains. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDomainAppearance = async (
    domain: Domain,
    appearance: UpdateDomainAppearanceRequest
  ) => {
    try {
      const response = await apiClient.patch<Domain>(
        `/api/v1/domain/${domain.id}/appearance`,
        appearance
      );
      setDomains((current) =>
        current.map((item) =>
          item.id === domain.id ? { ...item, ...response.data } : item
        )
      );
      setDomainToEdit(null);
      setError(null);
      setSuccessMessage(`Domain "${domain.name}" appearance updated.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error("Error updating domain appearance:", err);
      const message =
        err.response?.data?.message ||
        "Failed to update the domain appearance. Please try again.";
      setError(message);
      throw new Error(message);
    }
  };

  const handleCreateDomain = async (domainData: CreateDomainRequest) => {
    try {
      const response = await apiClient.post("/api/v1/domain", domainData);
      setDomains([...domains, response.data]);
      setIsCreateModalOpen(false);
      setError(null);
      setSuccessMessage(`Domain "${domainData.name}" created successfully.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error("Error creating domain:", err);
      if (err.response?.status === 403) {
        setError(
          err.response?.data?.message ||
            "Access denied. Only CURATOR or ADMIN users can create domains."
        );
      } else if (err.response?.status === 400) {
        const errorMsg =
          err.response?.data?.message ||
          "Invalid data. Domain name might already be in use.";
        setError(errorMsg);
      } else {
        setError("Failed to create domain. Please try again.");
      }
      throw err;
    }
  };

  const handleDeleteDomain = async () => {
    if (!domainToDelete) return;

    try {
      await apiClient.delete(`/api/v1/domain/${domainToDelete.id}`);
      setDomains(domains.filter((d) => d.id !== domainToDelete.id));
      setIsDeleteModalOpen(false);
      setDomainToDelete(null);
      setError(null);
      setSuccessMessage(
        `Domain "${domainToDelete.name}" deleted successfully.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error("Error deleting domain:", err);
      if (err.response?.status === 403) {
        setError(
          err.response?.data?.message ||
            "Access denied. Only CURATOR or ADMIN users can delete domains."
        );
      } else if (err.response?.status === 400) {
        const errorMsg =
          err.response?.data?.message ||
          "Cannot delete domain. It may have associated maturity models.";
        setError(errorMsg);
      } else {
        setError("Failed to delete domain. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 [&>aside]:sticky [&>aside]:top-0">
        <SideNavbar />
        <main className="min-w-0 flex-1">
          <PageLoading message="Loading domains..." />
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
                  Model organization
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Domains
                </h1>
                <p className="mt-2 text-sm text-slate-600 sm:text-base">
                  {canManage
                    ? "Create and manage the domains used to organize maturity models."
                    : "Explore the domains used to organize maturity models."}
                </p>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create domain
                </button>
              )}
            </header>

            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
                {successMessage}
              </div>
            )}

            <DomainsPanel
              domains={domains}
              canManage={canManage}
              onEditAppearance={setDomainToEdit}
              onDelete={(domain) => {
                setDomainToDelete(domain);
                setIsDeleteModalOpen(true);
              }}
            />
          </div>
        </main>
      </div>

      {canManage && (
        <CreateDomainModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setError(null);
          }}
          onSubmit={handleCreateDomain}
        />
      )}

      {canManage && domainToEdit && (
        <EditDomainAppearanceModal
          isOpen
          domain={domainToEdit}
          onClose={() => {
            setDomainToEdit(null);
            setError(null);
          }}
          onSubmit={(appearance) =>
            handleUpdateDomainAppearance(domainToEdit, appearance)
          }
        />
      )}

      {canManage && domainToDelete && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          domain={domainToDelete}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDomainToDelete(null);
            setError(null);
          }}
          onConfirm={handleDeleteDomain}
        />
      )}
    </>
  );
};

// Create Domain Modal Component
const CreateDomainModal = ({
  onClose,
  onSubmit,
  isOpen,
}: {
  onClose: () => void;
  onSubmit: (data: CreateDomainRequest) => void;
  isOpen: boolean;
}) => {
  const [formData, setFormData] = useState<CreateDomainRequest>({
    name: "",
    description: "",
    iconKey: "layers",
    colorKey: deterministicDomainColor(""),
  });
  const iconManuallySelected = useRef(false);
  const colorManuallySelected = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!formData.name.trim()) {
      setError("Domain name is required");
      setSubmitting(false);
      return;
    }

    try {
      await onSubmit({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        iconKey: formData.iconKey,
        colorKey: formData.colorKey,
      });
      // Reset form on success
      setFormData({
        name: "",
        description: "",
        iconKey: "layers",
        colorKey: deterministicDomainColor(""),
      });
      iconManuallySelected.current = false;
      colorManuallySelected.current = false;
    } catch (err) {
      // Error is handled in parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Create Domain"
      maxWidth="md"
      footer={
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-domain-form"
            disabled={submitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating..." : "Create Domain"}
          </button>
        </div>
      }
    >
      <form id="create-domain-form" onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <div className="mb-4">
          <label
            htmlFor="domain-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="domain-name"
            required
            value={formData.name}
            onChange={(e) => {
              const name = e.target.value;
              setFormData({
                ...formData,
                name,
                iconKey: iconManuallySelected.current
                  ? formData.iconKey
                  : suggestDomainIcon(name),
                colorKey: colorManuallySelected.current
                  ? formData.colorKey
                  : deterministicDomainColor(name),
              });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Cybersecurity"
          />
        </div>
        <DomainAppearancePicker
          iconKey={formData.iconKey ?? "layers"}
          colorKey={
            formData.colorKey ?? deterministicDomainColor(formData.name)
          }
          onIconChange={(iconKey) => {
            iconManuallySelected.current = true;
            setFormData({ ...formData, iconKey });
          }}
          onColorChange={(colorKey) => {
            colorManuallySelected.current = true;
            setFormData({ ...formData, colorKey });
          }}
        />
        <div className="mb-6">
          <label
            htmlFor="domain-description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="domain-description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Optional description for this domain"
          />
        </div>
      </form>
    </Modal>
  );
};

const EditDomainAppearanceModal = ({
  domain,
  onClose,
  onSubmit,
  isOpen,
}: {
  domain: Domain;
  onClose: () => void;
  onSubmit: (data: UpdateDomainAppearanceRequest) => Promise<void>;
  isOpen: boolean;
}) => {
  const [appearance, setAppearance] = useState<UpdateDomainAppearanceRequest>({
    iconKey: domain.iconKey ?? suggestDomainIcon(domain.name),
    colorKey: domain.colorKey ?? deterministicDomainColor(domain.name),
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(appearance);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not update the domain appearance."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Edit ${domain.name} appearance`}
      maxWidth="md"
      footer={
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-domain-appearance-form"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save appearance"}
          </button>
        </div>
      }
    >
      <form id="edit-domain-appearance-form" onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}
        <DomainAppearancePicker
          iconKey={appearance.iconKey}
          colorKey={appearance.colorKey}
          onIconChange={(iconKey) =>
            setAppearance((current) => ({ ...current, iconKey }))
          }
          onColorChange={(colorKey) =>
            setAppearance((current) => ({ ...current, colorKey }))
          }
        />
      </form>
    </Modal>
  );
};

const DomainAppearancePicker = ({
  iconKey,
  colorKey,
  onIconChange,
  onColorChange,
}: {
  iconKey: string;
  colorKey: string;
  onIconChange: (iconKey: string) => void;
  onColorChange: (colorKey: string) => void;
}) => (
  <>
    <div className="mb-4">
      <p className="mb-2 block text-sm font-medium text-gray-700">Icon</p>
      <div className="grid grid-cols-5 gap-2">
        {DOMAIN_ICON_KEYS.map((candidateIconKey) => (
          <button
            key={candidateIconKey}
            type="button"
            aria-label={`Use ${candidateIconKey} icon`}
            aria-pressed={iconKey === candidateIconKey}
            onClick={() => onIconChange(candidateIconKey)}
            className={`flex h-11 items-center justify-center rounded-md border transition ${
              iconKey === candidateIconKey
                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <DomainIcon
              iconKey={candidateIconKey}
              colorKey={colorKey}
              size={17}
              className="!h-8 !w-8 !rounded-md"
            />
          </button>
        ))}
      </div>
    </div>
    <div className="mb-6">
      <p className="mb-2 block text-sm font-medium text-gray-700">Color</p>
      <div className="flex flex-wrap gap-2">
        {DOMAIN_COLOR_KEYS.map((candidateColorKey) => (
          <button
            key={candidateColorKey}
            type="button"
            aria-label={`Use ${candidateColorKey} color`}
            aria-pressed={colorKey === candidateColorKey}
            onClick={() => onColorChange(candidateColorKey)}
            className={`rounded-md p-1 transition ${
              colorKey === candidateColorKey
                ? "ring-2 ring-blue-500 ring-offset-2"
                : "hover:bg-gray-100"
            }`}
          >
            <DomainIcon
              iconKey={iconKey}
              colorKey={candidateColorKey}
              size={14}
              className="!h-7 !w-7 !rounded-md"
            />
          </button>
        ))}
      </div>
    </div>
  </>
);

// Delete Confirmation Modal Component
const DeleteConfirmModal = ({
  domain,
  onClose,
  onConfirm,
  isOpen,
}: {
  domain: Domain;
  onClose: () => void;
  onConfirm: () => void;
  isOpen: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Confirm Delete Domain"
      maxWidth="md"
      footer={
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      }
    >
      <p className="text-gray-700">
        Are you sure you want to delete the domain{" "}
        <span className="font-semibold">{domain.name}</span>? This action cannot
        be undone.
      </p>
      <p className="text-sm text-gray-500 mt-2">
        Note: Domains with associated maturity models cannot be deleted.
      </p>
    </Modal>
  );
};

export default DomainsPage;
