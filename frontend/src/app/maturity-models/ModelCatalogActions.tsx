"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownTrayIcon,
  EllipsisVerticalIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

type ModelCatalogActionsProps = {
  canCreate: boolean;
  onCreate: () => void;
};

export default function ModelCatalogActions({
  canCreate,
  onCreate,
}: ModelCatalogActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const downloadTemplate = () => {
    const basePath =
      window.location.pathname.split("/maturity-models")[0] || "";
    const link = document.createElement("a");
    link.href = `${basePath}/templates/maturity-model-template.xlsx`;
    link.download = "maturity-model-template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMenuOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onCreate}
        disabled={!canCreate}
        title={
          canCreate
            ? "Create a maturity model"
            : "Create a domain before creating a maturity model"
        }
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
      >
        <PlusIcon className="h-5 w-5" aria-hidden="true" />
        Create model
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="More model actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={downloadTemplate}
              className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              <ArrowDownTrayIcon
                className="mt-0.5 h-5 w-5 shrink-0 text-gray-500"
                aria-hidden="true"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">
                  Download Excel template
                </span>
                <span className="mt-0.5 block text-xs leading-4 text-gray-500">
                  Start from the supported model import structure.
                </span>
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
