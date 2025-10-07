"use client";

import { useSendAiMessage } from "@liveblocks/react";
import { AiChat, AiChatComponentsEmptyProps } from "@liveblocks/react-ui";

import { Spinner } from "@/components/ui/spinner";

export function Chat({ chatId }: { chatId: string }) {
  return (
    <AiChat
      // Each chat is stored permanently and has a unique ID
      chatId={chatId}
      copilotId={process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID || undefined}
      className="grow mx-auto"
      layout="inset"
      components={{ Empty, Loading: Spinner }}
      autoFocus

      // Chat width is set in globals.css with a variable:
      // --lb-ai-chat-container-width
    />
  );
}

const suggestions = ["Build a counter app", "Build a to-do app"];

// Overriding the empty chat state function
function Empty({ chatId }: AiChatComponentsEmptyProps) {
  const sendMessage = useSendAiMessage(chatId, {
    copilotId: process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID || undefined,
  });

  return (
    <div className="size-full mx-auto max-w-[--inner-app-width] flex items-end pb-[calc(3*var(--lb-spacing))] px-4">
      <div className="flex flex-col gap-2">
        <div className="text-sm text-neutral-600">Suggestions</div>
        <div className="flex flex-wrap items-start gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              className="px-2 py-1 transition-colors rounded-md flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
              onClick={() => sendMessage(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
