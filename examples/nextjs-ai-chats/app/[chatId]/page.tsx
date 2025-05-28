"use client";

import { CSSProperties } from "react";
import { ClientSideSuspense, useAiChat } from "@liveblocks/react/suspense";
import { AiChat } from "@liveblocks/react-ui";

export default function Page({ params }: { params: { chatId: string } }) {
  return (
    <div className="flex flex-col h-full">
      <ClientSideSuspense fallback={null}>
        <ChatTitle chatId={params.chatId} />
      </ClientSideSuspense>

      <AiChat
        chatId={params.chatId}
        className="grow mx-auto"
        // The width is set in globals.css with CSS
        // variable: --lb-ai-chat-container-width
      />
    </div>
  );
}

function ChatTitle({ chatId }: { chatId: string }) {
  const { chat } = useAiChat(chatId);
  return <div className="p-4">{chat?.title || "Untitled"}</div>;
}
