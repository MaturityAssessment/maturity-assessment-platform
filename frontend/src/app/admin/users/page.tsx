"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Search, Trash2, X } from "lucide-react";
import { Modal, PageLoading, SideNavbar } from "@/components";
import apiClient from "@/api/axios";
import { useAuth } from "@/context";
import type { UpdateUserRequest, UserDTO } from "@/api/types";
import { DashboardPanel } from "../../dashboard/components/DashboardPrimitives";
import AdminBreadcrumb from "../AdminBreadcrumb";

type UserMode = "PENDING" | "APPROVED";

const roleStyles: Record<UserDTO["role"], string> = {
  ADMIN: "bg-red-50 text-red-700",
  CURATOR: "bg-violet-50 text-violet-700",
  USER: "bg-slate-100 text-slate-600",
};

function userInitial(user: UserDTO) {
  return (user.name?.trim() || user.email).charAt(0).toUpperCase();
}

export default function UserManagementPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
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
            </header>

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
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleStyles[user.role]}`}
                              >
                                {user.role.charAt(0) +
                                  user.role.slice(1).toLocaleLowerCase()}
                              </span>
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
