"use client";

import { FormEvent, useMemo, useRef } from "react";
import { Bot, Loader2, Send, User } from "lucide-react";
import type { AgentChatContext } from "./agentChatContexts";
import { useAgentChat } from "./useAgentChat";

export interface AgentChatProps {
  context: AgentChatContext;
  contextDetails?: string;
  hideHeader?: boolean;
}

export default function AgentChat({
  context,
  contextDetails,
  hideHeader = false,
}: AgentChatProps) {
  const {
    messages,
    draft,
    setDraft,
    sendMessage,
    isSending,
    error,
    inputPlaceholder,
  } = useAgentChat({ context, contextDetails });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = useMemo(
    () => draft.trim().length > 0 && !isSending,
    [draft, isSending]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) return;

    await sendMessage();
    textareaRef.current?.focus();
  };

  return (
    <section
      className={
        hideHeader
          ? "flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
          : "overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
      }
    >
      {!hideHeader && (
        <div className="flex items-center justify-between gap-4 p-4 pb-0">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Assessment assistant
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Get quick guidance while you work through maturity assessment
              tasks.
            </p>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-lg px-4 py-2 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "user" && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gray-900 text-white">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex gap-3" aria-label="Assistant is responding">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex-none border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex-none border-t border-gray-200 p-4"
        >
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={2}
              className="max-h-32 min-h-11 flex-1 resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder={inputPlaceholder}
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
