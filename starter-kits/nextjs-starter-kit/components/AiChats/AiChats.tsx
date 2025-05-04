"use client";

import { ClientSideSuspense, useAiChats } from "@liveblocks/react/suspense";
import { AiChat } from "@liveblocks/react-ui";
import { useInitialDocument } from "@/lib/hooks";

export function AiChats() {
  return (
    <ClientSideSuspense fallback={<div>Loading...</div>}>
      <Chats />
    </ClientSideSuspense>
  );
}

function Chats() {
  const { chats } = useAiChats();
  const document = useInitialDocument();

  if (chats.length === 0) {
    return <div>No chats</div>;
  }

  return (
    <div>
      <div>hey</div>
      {chats.map((chat) => (
        <AiChat key={chat.id} chatId={chat.id} />
      ))}
      ok
    </div>
  );
}
