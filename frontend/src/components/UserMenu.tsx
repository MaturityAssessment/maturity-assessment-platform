"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/context";

interface UserMenuProps {
  variant?: "top" | "sidebar";
}

export default function UserMenu({ variant = "top" }: UserMenuProps) {
  const { user, handleLogout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const displayName = user?.name || user?.email || "User";
  const initial = displayName.charAt(0).toUpperCase();
  const isSidebar = variant === "sidebar";

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const logout = () => {
    setIsOpen(false);
    handleLogout();
  };

  return (
    <div className={`relative ${isSidebar ? "w-full" : ""}`} ref={menuRef}>
      <button
        type="button"
        aria-label="Open user menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
        className={
          isSidebar
            ? `flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                isOpen ? "bg-indigo-50" : ""
              }`
            : `flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isOpen
                  ? "ring-2 ring-blue-300 ring-offset-2"
                  : "hover:scale-105 hover:shadow-md"
              }`
        }
      >
        {isSidebar ? (
          <>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white shadow-sm">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-800">
                {displayName}
              </span>
              <span className="block text-xs capitalize text-slate-500">
                {user?.role?.toLowerCase() || "user"}
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </>
        ) : (
          initial
        )}
      </button>

      {isOpen && (
        <div
          id={menuId}
          className={`absolute z-50 overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black/5 ${
            isSidebar
              ? "bottom-full left-0 mb-2 w-full"
              : "right-0 mt-2 w-64"
          }`}
        >
          <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">
                {user?.email || displayName}
              </p>
              {user?.role && (
                <span className="mt-1 inline-flex rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  {user.role}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="group flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 transition-colors group-hover:bg-red-200">
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </span>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
