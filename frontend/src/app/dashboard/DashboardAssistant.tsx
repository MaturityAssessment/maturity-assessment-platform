"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import { AgentChatModal } from "@/components";

export default function DashboardAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-help-tour="dashboard-assistant"
        className="fixed bottom-6 right-6 z-40 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/30 ring-1 ring-black/10 transition hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label="Open assessment assistant"
      >
        <Bot className="h-7 w-7" />
      </button>

      <AgentChatModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        context="dashboard"
      />
    </>
  );
}
