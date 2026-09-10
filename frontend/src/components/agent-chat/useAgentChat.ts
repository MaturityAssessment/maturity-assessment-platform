"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import apiClient from "@/api/axios";
import {
  AGENT_CHAT_CONTEXTS,
  buildAgentContextPrompt,
  type AgentChatContext,
} from "./agentChatContexts";

export type AgentChatRole = "user" | "assistant";

export interface AgentChatMessage {
  role: AgentChatRole;
  content: string;
}

interface AgentChatSession {
  threadId: string;
  systemPrompt: string;
  initialized: boolean;
  initialization?: Promise<void>;
}

export interface UseAgentChatOptions {
  context: AgentChatContext;
  contextDetails?: string;
}

function createThreadId(): string {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);

  return `thread_${Date.now().toString(36)}_${randomPart}`;
}

function getRequestErrorMessage(requestError: unknown): string {
  const error = requestError as {
    errorMessage?: string;
    response?: { data?: { message?: string } };
  };

  return (
    error?.errorMessage ||
    error?.response?.data?.message ||
    "The assistant is not available yet. Check the IAedu API configuration and try again."
  );
}

export function useAgentChat({
  context,
  contextDetails,
}: UseAgentChatOptions) {
  const contextConfig = AGENT_CHAT_CONTEXTS[context];
  const systemPrompt = useMemo(
    () => buildAgentContextPrompt(context, contextDetails),
    [context, contextDetails]
  );
  const session = useMemo<AgentChatSession>(
    () => ({
      threadId: createThreadId(),
      systemPrompt,
      initialized: false,
    }),
    [systemPrompt]
  );
  const activeSessionRef = useRef(session);
  activeSessionRef.current = session;

  const [messages, setMessages] = useState<AgentChatMessage[]>([
    { role: "assistant", content: contextConfig.welcomeMessage },
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeSession = useCallback(
    (targetSession: AgentChatSession): Promise<void> => {
      if (targetSession.initialized) {
        return Promise.resolve();
      }
      if (targetSession.initialization) {
        return targetSession.initialization;
      }

      if (activeSessionRef.current === targetSession) {
        setIsInitializing(true);
      }

      targetSession.initialization = apiClient
        .post("/api/v1/assistant/chat", {
          messages: [{ role: "user", content: targetSession.systemPrompt }],
          threadId: targetSession.threadId,
        })
        .then(() => {
          targetSession.initialized = true;
        })
        .catch((requestError: unknown) => {
          targetSession.initialization = undefined;
          throw requestError;
        })
        .finally(() => {
          if (activeSessionRef.current === targetSession) {
            setIsInitializing(false);
          }
        });

      return targetSession.initialization;
    },
    []
  );

  useEffect(() => {
    setMessages([
      { role: "assistant", content: contextConfig.welcomeMessage },
    ]);
    setDraft("");
    setError(null);
    setIsSending(false);

    initializeSession(session).catch((requestError: unknown) => {
      if (activeSessionRef.current === session) {
        setError(getRequestErrorMessage(requestError));
      }
    });
  }, [contextConfig.welcomeMessage, initializeSession, session]);

  const sendMessage = useCallback(async () => {
    const question = draft.trim();
    if (!question || isSending) return;

    const nextMessages: AgentChatMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];

    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setIsSending(true);

    try {
      await initializeSession(session);

      const response = await apiClient.post<{ answer: string }>(
        "/api/v1/assistant/chat",
        {
          messages: nextMessages.slice(1),
          threadId: session.threadId,
        }
      );

      if (activeSessionRef.current === session) {
        setMessages([
          ...nextMessages,
          { role: "assistant", content: response.data.answer },
        ]);
      }
    } catch (requestError: unknown) {
      if (activeSessionRef.current === session) {
        setError(getRequestErrorMessage(requestError));
        setMessages(nextMessages);
      }
    } finally {
      if (activeSessionRef.current === session) {
        setIsSending(false);
      }
    }
  }, [draft, initializeSession, isSending, messages, session]);

  return {
    messages,
    draft,
    setDraft,
    sendMessage,
    isSending,
    isInitializing,
    error,
    inputPlaceholder: contextConfig.inputPlaceholder,
  };
}
