"use client";

import { ClientSideSuspense, useAiChats } from "@liveblocks/react/suspense";
import Link from "next/link";
import { AI_CHAT_URL } from "@/constants";
import { useInitialDocument } from "@/lib/hooks";

export function AiChatsSidebar() {
  return (
    <ClientSideSuspense fallback={<div>Loading...</div>}>
      <Sidebar />
    </ClientSideSuspense>
  );
}

function Sidebar() {
  const { chats } = useAiChats();
  const document = useInitialDocument();

  if (chats.length === 0) {
    return <div>No chats yet</div>;
  }

  return (
    <div>
      <div>hey</div>
      {chats.map((chat) => (
        <Link key={chat.id} href={AI_CHAT_URL(document.id, chat.id)}>
          {chat.name}
        </Link>
      ))}
      ok
    </div>
  );
}
