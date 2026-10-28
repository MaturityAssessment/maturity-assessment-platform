"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, KeyRound, Pencil, Search, Trash2, UserPlus, X } from "lucide-react";
import axios from "axios";
import { Badge, Modal, PageLoading, SideNavbar } from "@/components";
import apiClient from "@/api/axios";
import { useAuth } from "@/context";
import type { CreateUserRequest, UpdateUserRequest, UserDTO } from "@/api/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardPanel } from "@/components/dashboard/DashboardPrimitives";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";

type UserMode = "PENDING" | "APPROVED";

const roleColors: Record<UserDTO["role"], "red" | "violet" | "slate"> = {
  ADMIN: "red",
  CURATOR: "violet",
  USER: "slate",
};

function userInitial(user: UserDTO) {
  return (user.name?.trim() || user.email).charAt(0).toUpperCase();
}

export default function UserManagementPage() {
  const router = useRouter();
  const { user: currentUser, handleLogout } = useAuth();
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<UserMode>("PENDING");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserDTO | null>(null);
  const [userToReset, setUserToReset] = useState<UserDTO | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateUser = async (data: CreateUserRequest) => {
    const response = await apiClient.post<UserDTO>("/api/v1/admin/users", data);
    setUsers((current) => [...current, response.data]);
    setActiveMode("APPROVED");
    clearFilters();
    setError(null);
    setSuccess(`User created. A temporary password has been emailed to ${response.data.email}.`);
    setIsCreateModalOpen(false);
  };

  const handleResetPassword = async () => {
    if (!userToReset) return;
    await apiClient.post(`/api/v1/admin/users/${userToReset.id}/reset-password`);
    setUsers((current) => current.map((user) => user.id === userToReset.id
      ? { ...user, passwordChangeRequired: true } : user));
    setSuccess(`A temporary password has been emailed to ${userToReset.email}.`);
    setError(null);
    setUserToReset(null);
    if (userToReset.id === currentUser?.id) handleLogout("/login");
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<UserDTO[]>("/api/v1/admin/users");
      setUsers(response.data);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      if (err.response?.status === 403) {
        setError(
          err.errorMessage ||
            "Access denied. Only ADMIN users can access this page."
        );
        router.push("/dashboard");
      } else {
        setError("Failed to load users. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const pendingUsers = useMemo(
    () => users.filter((user) => user.approvalStatus === "PENDING"),
    [users]
  );
  const approvedUsers = useMemo(
    () => users.filter((user) => user.approvalStatus === "APPROVED"),
    [users]
  );

  const visibleUsers = useMemo(() => {
    const source = activeMode === "PENDING" ? pendingUsers : approvedUsers;
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

    return source.filter((user) => {
      if (
        activeMode === "APPROVED" &&
        roleFilter !== "ALL" &&
        user.role !== roleFilter
      ) {
        return false;
      }

      return (
        !normalizedQuery ||
        [user.name, user.email, user.organizationName, user.role].some((value) =>
          value?.toLocaleLowerCase().includes(normalizedQuery)
        )
      );
    });
  }, [activeMode, approvedUsers, pendingUsers, roleFilter, searchQuery]);

  const sourceUserCount =
    activeMode === "PENDING" ? pendingUsers.length : approvedUsers.length;
  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    (activeMode === "APPROVED" && roleFilter !== "ALL");

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("ALL");
  };

  const handleUpdateUser = async (
    id: number,
    userData: UpdateUserRequest
  ) => {
    try {
      const response = await apiClient.put<UserDTO>(
        `/api/v1/admin/users/${id}`,
        userData
      );
      setUsers((current) =>
        current.map((user) => (user.id === id ? response.data : user))
      );
      setIsEditModalOpen(false);
      setEditingUser(null);
      setError(null);
    } catch (err: any) {
      console.error("Error updating user:", err);
      if (err.response?.status === 403) {
        setError(
          err.errorMessage || "Access denied. Only ADMIN users can update users."
        );
      } else if (err.response?.status === 400) {
        setError("Invalid data. Email might already be in use.");
      } else {
        setError("Failed to update user. Please try again.");
      }
      throw err;
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await apiClient.delete(`/api/v1/admin/users/${userToDelete.id}`);
      setUsers((current) =>
        current.filter((user) => user.id !== userToDelete.id)
      );
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      setError(null);
    } catch (err: any) {
      console.error("Error deleting user:", err);
      if (err.response?.status === 403) {
        setError(
          err.errorMessage || "Access denied. Only ADMIN users can delete users."
        );
      } else if (err.response?.status === 400) {
        setError("Cannot delete your own account.");
      } else {
        setError("Failed to delete user. Please try again.");
      }
    }
  };

  const handleApproveUser = async (id: number) => {
    try {
      const response = await apiClient.patch<UserDTO>(
        `/api/v1/admin/users/${id}/approve`
      );
      setUsers((current) =>
        current.map((user) => (user.id === id ? response.data : user))
      );
      setError(null);
    } catch (err: any) {
      console.error("Error approving user:", err);
      if (err.response?.status === 403) {
        setError(
          err.errorMessage ||
            "Access denied. Only ADMIN users can approve access requests."
        );
      } else {
        setError("Failed to approve user. Please try again.");
      }
    }
  };

  const handleRejectUser = async (id: number) => {
    try {
      await apiClient.patch(`/api/v1/admin/users/${id}/reject`);
      setUsers((current) => current.filter((user) => user.id !== id));
      setError(null);
    } catch (err: any) {
      console.error("Error rejecting user:", err);
      if (err.response?.status === 403) {
        setError(
          err.errorMessage ||
            "Access denied. Only ADMIN users can reject access requests."
        );
      } else {
        setError("Failed to reject user. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 [&>aside]:sticky [&>aside]:top-0">
        <SideNavbar />
        <main className="min-w-0 flex-1">
          <PageLoading message="Loading users..." />
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
            <header className="mb-8">
              <AdminBreadcrumb current="User management" />
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                User management
              </h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Review access requests and manage user roles and accounts.
              </p>
              <button
                type="button"
                onClick={() => { setSuccess(null); setIsCreateModalOpen(true); }}
                className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Create user
              </button>
            </header>

            {success && (
              <p role="status" className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {success}
              </p>
            )}
            {error && (
              <div
                role="alert"
                className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <DashboardPanel
              id="platform-users"
              title="Platform users"
              description={`${users.length} user${users.length === 1 ? "" : "s"} registered on the platform`}
            >
              <div
                role="tablist"
                aria-label="User approval status"
                className="mb-5 inline-flex w-fit rounded-lg bg-slate-100 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMode === "PENDING"}
                  onClick={() => setActiveMode("PENDING")}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                    activeMode === "PENDING"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Pending
                  <span className="ml-2 tabular-nums text-slate-400">
                    {pendingUsers.length}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMode === "APPROVED"}
                  onClick={() => setActiveMode("APPROVED")}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                    activeMode === "APPROVED"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Approved
                  <span className="ml-2 tabular-nums text-slate-400">
                    {approvedUsers.length}
                  </span>
                </button>
              </div>

              <div
                className={`mb-2 grid gap-3 ${
                  activeMode === "APPROVED"
                    ? "sm:grid-cols-[minmax(0,1fr)_180px]"
                    : ""
                }`}
              >
                <label className="relative block min-w-0">
                  <span className="sr-only">Search users</span>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by name, email, or organization"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </label>

                {activeMode === "APPROVED" && (
                  <label>
                    <span className="sr-only">Filter by role</span>
                    <select
                      value={roleFilter}
                      onChange={(event) => setRoleFilter(event.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="ALL">All roles</option>
                      <option value="ADMIN">Admin</option>
                      <option value="CURATOR">Curator</option>
                      <option value="USER">User</option>
                    </select>
                  </label>
                )}
              </div>

              <div className="mb-2 flex min-h-6 items-center justify-between gap-4 text-xs text-slate-500">
                <span aria-live="polite">
                  Showing {visibleUsers.length} of {sourceUserCount} user
                  {sourceUserCount === 1 ? "" : "s"}
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {visibleUsers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
                  <h3 className="font-semibold text-slate-900">
                    {hasActiveFilters
                      ? "No users match these filters"
                      : activeMode === "PENDING"
                        ? "No pending requests"
                        : "No approved users"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {hasActiveFilters
                      ? "Try adjusting your search or role filter."
                      : activeMode === "PENDING"
                        ? "New access requests will appear here."
                        : "Approved users will appear here."}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="pb-3 pr-5">User</th>
                        {activeMode === "PENDING" ? (
                          <th className="px-5 pb-3">Organization</th>
                        ) : (
                          <>
                            <th className="px-5 pb-3">Role</th>
                            <th className="px-5 pb-3">Organization</th>
                          </>
                        )}
                        <th className="pb-3 pl-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleUsers.map((user) => (
                        <tr key={user.id} className="group">
                          <td className="py-4 pr-5">
                            <div className="flex max-w-sm items-center gap-3">
                              <span
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600"
                                aria-hidden="true"
                              >
                                {userInitial(user)}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-slate-900">
                                  {user.name?.trim() || "Name not provided"}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-slate-500">
                                  {user.email}
                                </span>
                              </span>
                            </div>
                          </td>
                          {activeMode === "APPROVED" && (
                            <td className="px-5 py-4">
                              <Badge color={roleColors[user.role]}>
                                {user.role.charAt(0) +
                                  user.role.slice(1).toLocaleLowerCase()}
                              </Badge>
                            </td>
                          )}
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {user.organizationName?.trim() || "Not provided"}
                          </td>
                          <td className="py-4 pl-5">
                            <div className="flex items-center justify-end gap-1">
                              {activeMode === "PENDING" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void handleApproveUser(user.id)}
                                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                    aria-label={`Approve access for ${user.email}`}
                                  >
                                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleRejectUser(user.id)}
                                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                                    aria-label={`Reject access for ${user.email}`}
                                  >
                                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingUser(user);
                                      setIsEditModalOpen(true);
                                    }}
                                    className="rounded-md p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    aria-label={`Edit ${user.email}`}
                                    title="Edit user role"
                                  >
                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setSuccess(null); setUserToReset(user); }}
                                    className="rounded-md p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                    aria-label={`Reset password for ${user.email}`}
                                    title="Reset password"
                                  >
                                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                  {user.id !== currentUser?.id && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUserToDelete(user);
                                        setIsDeleteModalOpen(true);
                                      }}
                                      className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                                      aria-label={`Delete ${user.email}`}
                                      title="Delete user"
                                    >
                                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DashboardPanel>
          </div>
        </main>
      </div>

      {isCreateModalOpen && (
        <CreateUserModal onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateUser} />
      )}
      {userToReset && (
        <ResetPasswordModal user={userToReset} onClose={() => setUserToReset(null)} onConfirm={handleResetPassword} />
      )}
      {editingUser && (
        <EditUserModal
          isOpen={isEditModalOpen}
          user={editingUser}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingUser(null);
          }}
          onSubmit={(userData) => handleUpdateUser(editingUser.id, userData)}
        />
      )}

      {userToDelete && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          user={userToDelete}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
          }}
          onConfirm={handleDeleteUser}
        />
      )}
    </>
  );
}

function CreateUserModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (data: CreateUserRequest) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError("");
    if (!name.trim() || !email.trim() || !organizationName.trim()) {
      setError("Enter a name, email address, and organization.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), email: email.trim(), organizationName: organizationName.trim() });
    } catch (error) {
      setError(axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message || "The user could not be created. Please try again."
        : "The user could not be created. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Create user" maxWidth="md" closeButtonDisabled={submitting} footer={
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={submitting}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">Cancel</button>
        <button type="submit" form="create-user-form" disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {submitting ? "Creating and sending..." : "Create and email password"}
        </button>
      </div>
    }>
      <form id="create-user-form" onSubmit={submit} className="space-y-5">
        <p className="text-sm leading-6 text-slate-600">
          Create an approved account with the User role. The user will receive a temporary
          password by email, valid for 24 hours, and must change it after signing in.
          You can edit their role after creation.
        </p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="space-y-2">
          <Label htmlFor="create-user-name">Name</Label>
          <Input id="create-user-name" name="name" autoComplete="name" required autoFocus maxLength={255}
            value={name} onChange={(event) => setName(event.target.value)} disabled={submitting} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-user-email">Email</Label>
          <Input id="create-user-email" name="email" type="email" autoComplete="email" required maxLength={255}
            value={email} onChange={(event) => setEmail(event.target.value)} disabled={submitting} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-user-organization">Organization</Label>
          <Input id="create-user-organization" name="organizationName" autoComplete="organization" required maxLength={255}
            value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} disabled={submitting} />
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose, onConfirm }: {
  user: UserDTO;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reset = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onConfirm();
    } catch (error) {
      setError(axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message || "The password could not be reset. Please try again."
        : "The password could not be reset. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Reset password" closeButtonDisabled={submitting} footer={
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={submitting}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">Cancel</button>
        <button type="button" onClick={() => void reset()} disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {submitting ? "Sending..." : "Reset and email password"}
        </button>
      </div>
    }>
      <p className="text-sm leading-6 text-slate-600">
        Generate a temporary password and email it to <strong>{user.email}</strong>?
        Their current password and all sessions will stop working. The temporary password expires
        in 24 hours and must be replaced after signing in.
      </p>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    </Modal>
  );
}

function EditUserModal({
  user,
  onClose,
  onSubmit,
  isOpen,
}: {
  user: UserDTO;
  onClose: () => void;
  onSubmit: (data: UpdateUserRequest) => Promise<void>;
  isOpen: boolean;
}) {
  const [role, setRole] = useState<UserDTO["role"]>(user.role);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (role === user.role) {
      setError("Choose a different role before saving.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ role });
    } catch {
      setError("The role could not be updated. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit user role"
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-user-form"
            disabled={submitting}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="mb-4">
          <label
            htmlFor="edit-email-display"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            Email
          </label>
          <input
            type="email"
            id="edit-email-display"
            value={user.email}
            disabled
            className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
          />
        </div>
        <div>
          <label
            htmlFor="edit-role"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            Role
          </label>
          <select
            id="edit-role"
            required
            value={role}
            onChange={(event) =>
              setRole(event.target.value as UserDTO["role"])
            }
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="USER">User</option>
            <option value="CURATOR">Curator</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}

function DeleteConfirmModal({
  user,
  onClose,
  onConfirm,
  isOpen,
}: {
  user: UserDTO;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isOpen: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete user"
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            Delete user
          </button>
        </div>
      }
    >
      <p className="text-sm leading-6 text-slate-600">
        Are you sure you want to delete{" "}
        <span className="font-semibold text-slate-900">{user.email}</span>? This
        action cannot be undone.
      </p>
    </Modal>
  );
}
