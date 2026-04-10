"use client";

import { ClientSideSuspense, useAiChat } from "@liveblocks/react/suspense";
import { AiChat, AiChatComponentsEmptyProps } from "@liveblocks/react-ui";
import { ErrorBoundary } from "react-error-boundary";
import { useSendAiMessage } from "@liveblocks/react";
import { use } from "react";

export default function Page({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params);
  return (
    <div className="flex flex-col h-full">
      <ErrorBoundary fallback={<div>Problem loading chat title</div>}>
        <ClientSideSuspense
          fallback={
            // Loading placeholder around title
            <div className="shrink-0 h-14 p-4 relative flex items-center">
              <div className="h-6 rounded-lg w-16 bg-neutral-100 animate-pulse"></div>
            </div>
          }
        >
          <ChatTitle chatId={chatId} />
        </ClientSideSuspense>
      </ErrorBoundary>

      <AiChat
        // Each chat is stored permanently and has a unique ID
        chatId={chatId}
        copilotId={process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID || undefined}
        className="grow mx-auto"
        components={{ Empty }}
        autoFocus

        // Chat width is set in globals.css with a variable:
        // --lb-ai-chat-container-width
      />
    </div>
  );
}

// Title is automatically generated from the first message and reply
function ChatTitle({ chatId }: { chatId: string }) {
  const { chat } = useAiChat(chatId);

  return (
    <div className="shrink-0 h-14 p-4 text-sm">{chat?.title || "Untitled"}</div>
  );
}

// Overriding the empty chat state
function Empty({ chatId }: AiChatComponentsEmptyProps) {
  const sendMessage = useSendAiMessage(chatId);

  return (
    <div className="size-full mx-auto max-w-[--inner-app-width] flex items-end pb-[calc(3*var(--lb-spacing))]">
      <div className="flex flex-col gap-5">
        <h3>How can I help you?</h3>
        <div className="flex flex-wrap items-start gap-2">
          <button
            className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
            onClick={() => sendMessage("Write a story about a brave knight")}
          >
            Write a story
          </button>
          <button
            className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
            onClick={() => sendMessage("Teach me React")}
          >
            Teach me React
          </button>
          <button
            className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
            onClick={() => sendMessage("Explain quantum computing")}
          >
            Explain quantum computing
          </button>
          <button
            className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
            onClick={() => sendMessage("Plan weekly meals")}
          >
            Plan weekly meals
          </button>
        </div>
      </div>
    </div>
  );
}
