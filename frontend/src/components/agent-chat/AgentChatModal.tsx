"use client";

import { Modal } from "../ui/modal";
import AgentChat from "./AgentChat";
import type { AgentChatContext } from "./agentChatContexts";

export interface AgentChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: AgentChatContext;
  contextDetails?: string;
  title?: string;
}

export default function AgentChatModal({
  isOpen,
  onClose,
  context,
  contextDetails,
  title = "Assessment assistant",
}: AgentChatModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="xl"
      className="flex h-[90vh] flex-col"
    >
      <div className="flex h-full flex-col">
        <AgentChat
          context={context}
          contextDetails={contextDetails}
          hideHeader
        />
      </div>
    </Modal>
  );
}
