"use client";

import { ClientSideSuspense, useAiChat } from "@liveblocks/react/suspense";
import { AiChat } from "@liveblocks/react-ui";
import { ErrorBoundary } from "react-error-boundary";

export default function Page({ params }: { params: { chatId: string } }) {
  return (
    <div className="flex flex-col h-full">
      <ErrorBoundary fallback={<div>Problem loading chat title</div>}>
        <ClientSideSuspense
          fallback={
            // Loading placeholder around title
            <div className="shrink-0 h-14 p-4 relative flex items-center">
              <div className="h-6 rounded-lg w-[240px] bg-neutral-100 animate-pulse"></div>
            </div>
          }
        >
          <ChatTitle chatId={params.chatId} />
        </ClientSideSuspense>
      </ErrorBoundary>

      <AiChat
        // Each chat is stored permanently and has a unique ID
        chatId={params.chatId}
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
function Empty() {
  return (
    <div className="w-full h-full mx-auto max-w-[--inner-app-width] flex items-end pb-12">
      {/* Soon you will be able to add messages to the chat programmatically */}
      {/* <button onClick={() => sendAiMessage("How's the weather in my area?")}>Check weather</button> */}
    </div>
  );
}
