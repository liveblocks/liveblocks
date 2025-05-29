"use client";

import { ClientSideSuspense, useAiChat } from "@liveblocks/react/suspense";
import { AiChat } from "@liveblocks/react-ui";

export default function Page({ params }: { params: { chatId: string } }) {
  return (
    <div className="flex flex-col h-full">
      <ClientSideSuspense
        fallback={
          // Loading placeholder around title
          <div className="shrink-0 h-14 p-4 relative flex items-center">
            <div className="h-6 rounded-lg w-[240px] bg-stone-100 animate-pulse"></div>
          </div>
        }
      >
        <ChatTitle chatId={params.chatId} />
      </ClientSideSuspense>

      <AiChat
        // Each chat is stored permanently and has a unique ID
        chatId={params.chatId}
        className="grow mx-auto"

        // Chat width is set in globals.css with a variable:
        // --lb-ai-chat-container-width
      />
    </div>
  );
}

// Title is automatically generated from the first message and reply
function ChatTitle({ chatId }: { chatId: string }) {
  const { chat } = useAiChat(chatId);
  return <div className="shrink-0 h-14 p-4">{chat?.title || "Untitled"}</div>;
}
