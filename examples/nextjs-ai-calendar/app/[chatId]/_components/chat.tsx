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
      components={{ Empty, Loading: Spinner }}
      layout="compact"
      autoFocus

      // Chat width is set in globals.css with a variable:
      // --lb-ai-chat-container-width
    />
  );
}

// Overriding the empty chat state function
function Empty({ chatId }: AiChatComponentsEmptyProps) {
  const sendMessage = useSendAiMessage(chatId, {
    copilotId: process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID || undefined,
  });

  return (
    <div className="size-full mx-auto max-w-[--inner-app-width] flex items-center justify-center pb-[calc(3*var(--lb-spacing))] px-4">
      <div className="flex flex-col gap-0.5 text-center mt-6">
        <div className="text-[100px] -mb-2.5 opacity-30 hue-rotate-[140deg]">
          🗓️
        </div>
        <div className="text-xl font-semibold text-neutral-600">
          Add calendar events
        </div>
        <div className="text-sm text-neutral-500">
          Use natural language to modify events
        </div>
      </div>
    </div>
  );
}
