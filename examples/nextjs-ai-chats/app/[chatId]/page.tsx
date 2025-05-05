"use client";

import { AiChat } from "@liveblocks/react-ui";
import { useAiChatMessages } from "@liveblocks/react";
import { CSSProperties } from "react";

// useAiChat is what I looked for
// I want to get metadata, name, etc for the rest of the page

// also the title property needs to be lots more helpful

// a way to edit the title

// a way to delete a chat (e.g. so it's not in useChats)

// a "no messages yet" message?

export default function Page({ params }: { params: { chatId: string } }) {
  // this hook is not useful here
  const { messages } = useAiChatMessages(params.chatId);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">Title</div>
      <AiChat
        chatId={params.chatId}
        className="grow mx-auto"
        // Make a width property?
        style={{ "--lb-ai-chat-container-width": "660px" } as CSSProperties}
      />
    </div>
  );
}
